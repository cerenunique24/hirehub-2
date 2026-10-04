-- CollaCrew marketplace operations: teslim geçmişi, değerlendirme, iptal,
-- süre uzatma, uyuşmazlık, şikayet/engelleme, hesap silme talebi ve
-- termin bildirimleri. Mevcut tabloların yerine yenisi AÇILMAZ; yalnızca
-- eksik olan operasyonel yapılar eklenir.
--
-- Ortak kural: kullanıcı verisi yazan durum geçişleri SECURITY DEFINER RPC'ler
-- üzerinden yapılır; tablolarda doğrudan INSERT/UPDATE politikası yoktur.

-- ---------------------------------------------------------------------------
-- 1) Teslimler (deliveries) — normal proje dosyalarından ayrı
-- ---------------------------------------------------------------------------
create table if not exists public.project_milestone_deliveries (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.project_milestones(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  attempt_no integer not null,
  message text not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'revision_requested', 'approved')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_feedback text,
  unique (milestone_id, attempt_no)
);

create index if not exists project_milestone_deliveries_project_idx
  on public.project_milestone_deliveries (project_id, submitted_at);

alter table public.project_milestone_deliveries enable row level security;

create policy "Delivery history is visible to project participants"
  on public.project_milestone_deliveries for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_milestone_deliveries.project_id and p.client_id = auth.uid()
    )
    or exists (
      select 1 from public.project_team_members m
      where m.project_id = project_milestone_deliveries.project_id
        and m.freelancer_id = auth.uid()
        and m.status = 'active'
    )
    or (select private.is_admin())
  );

-- Dosyalar bir teslimle ilişkilendirilebilir; delivery_id yalnızca sunucu
-- tarafındaki trigger tarafından atanır (kullanıcı sahte teslim bağlantısı yazamaz).
alter table public.project_files
  add column if not exists delivery_id uuid references public.project_milestone_deliveries(id) on delete set null;

create index if not exists project_files_delivery_id_idx on public.project_files (delivery_id);

create or replace function private.clear_project_file_delivery_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.delivery_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists project_files_clear_delivery on public.project_files;
create trigger project_files_clear_delivery
  before insert on public.project_files
  for each row execute function private.clear_project_file_delivery_link();

create or replace function private.record_milestone_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery_id uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if (old.status = 'active' and new.status = 'submitted')
    or (old.status = 'revision' and new.status = 'in_review') then
    insert into public.project_milestone_deliveries (
      milestone_id, project_id, submitted_by, attempt_no, message, status, submitted_at
    )
    select
      new.id,
      new.project_id,
      coalesce(auth.uid(), new.freelancer_id),
      coalesce(max(d.attempt_no), 0) + 1,
      coalesce(new.deliverable_description, ''),
      'submitted',
      coalesce(new.submitted_at, now())
    from public.project_milestone_deliveries d
    where d.milestone_id = new.id
    returning id into v_delivery_id;

    -- Teslimi gönderen kişinin bu aşamaya yüklediği, henüz bir teslime
    -- bağlanmamış dosyalar bu teslimin eki olur.
    update public.project_files f
      set delivery_id = v_delivery_id
      where f.milestone_id = new.id
        and f.delivery_id is null
        and (auth.uid() is null or f.file_path like auth.uid()::text || '/%');
  elsif old.status in ('submitted', 'in_review') and new.status = 'revision' then
    update public.project_milestone_deliveries d
      set status = 'revision_requested',
          reviewed_at = now(),
          reviewed_by = auth.uid(),
          review_feedback = new.revision_notes
      where d.id = (
        select id from public.project_milestone_deliveries
        where milestone_id = new.id
        order by attempt_no desc
        limit 1
      );
  elsif old.status in ('submitted', 'in_review') and new.status = 'approved' then
    update public.project_milestone_deliveries d
      set status = 'approved',
          reviewed_at = now(),
          reviewed_by = auth.uid()
      where d.id = (
        select id from public.project_milestone_deliveries
        where milestone_id = new.id
        order by attempt_no desc
        limit 1
      );
  end if;

  return new;
end;
$$;

drop trigger if exists project_milestones_record_delivery on public.project_milestones;
create trigger project_milestones_record_delivery
  after update on public.project_milestones
  for each row execute function private.record_milestone_delivery();

-- Geçmiş teslimleri, mevcut olay kayıtlarından (project_milestone_events) geri doldur.
with submissions as (
  select
    e.milestone_id,
    e.actor_id,
    e.note,
    e.created_at,
    row_number() over (partition by e.milestone_id order by e.created_at) as attempt_no,
    lead(e.created_at) over (partition by e.milestone_id order by e.created_at) as next_submission_at
  from public.project_milestone_events e
  where e.event_type in ('submitted', 'resubmitted')
)
insert into public.project_milestone_deliveries (
  milestone_id, project_id, submitted_by, attempt_no, message, status, submitted_at, reviewed_at, review_feedback
)
select
  s.milestone_id,
  m.project_id,
  s.actor_id,
  s.attempt_no,
  coalesce(s.note, ''),
  case
    when rev.created_at is not null then 'revision_requested'
    when apr.created_at is not null then 'approved'
    else 'submitted'
  end,
  s.created_at,
  coalesce(rev.created_at, apr.created_at),
  rev.note
from submissions s
join public.project_milestones m on m.id = s.milestone_id
left join lateral (
  select e.created_at, e.note from public.project_milestone_events e
  where e.milestone_id = s.milestone_id and e.event_type = 'revision_requested'
    and e.created_at > s.created_at
    and (s.next_submission_at is null or e.created_at < s.next_submission_at)
  order by e.created_at limit 1
) rev on true
left join lateral (
  select e.created_at from public.project_milestone_events e
  where e.milestone_id = s.milestone_id and e.event_type = 'approved'
    and e.created_at > s.created_at
    and (s.next_submission_at is null or e.created_at < s.next_submission_at)
  order by e.created_at limit 1
) apr on true
on conflict (milestone_id, attempt_no) do nothing;

update public.project_milestones m
  set revision_count = coalesce((
    select count(*) from public.project_milestone_events e
    where e.milestone_id = m.id and e.event_type = 'revision_requested'
  ), 0)
  where m.revision_count = 0;

-- ---------------------------------------------------------------------------
-- 2) Değerlendirmeler (reviews)
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('client', 'freelancer')),
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);

alter table public.reviews enable row level security;

create policy "Reviews are visible to authenticated users"
  on public.reviews for select
  to authenticated
  using (not is_hidden or reviewer_id = auth.uid() or reviewee_id = auth.uid() or (select private.is_admin()));

drop trigger if exists reviews_no_contact_info on public.reviews;
create trigger reviews_no_contact_info
  before insert or update on public.reviews
  for each row execute function private.enforce_no_contact_info('comment');

create or replace function public.submit_review(
  p_project_id uuid,
  p_reviewee_id uuid,
  p_rating integer,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_client_id uuid;
  v_status text;
  v_title text;
  v_role text;
  v_review_id uuid;
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Puan 1 ile 5 arasında olmalı.' using errcode = 'P0001';
  end if;

  select client_id, status, title into v_client_id, v_status, v_title
  from projects where id = p_project_id;

  if v_client_id is null then
    raise exception 'Proje bulunamadı.' using errcode = 'P0001';
  end if;

  if v_status <> 'completed' then
    raise exception 'Yalnızca tamamlanan projeler değerlendirilebilir.' using errcode = 'P0001';
  end if;

  if v_caller = v_client_id then
    if not exists (
      select 1 from project_team_members m
      where m.project_id = p_project_id and m.freelancer_id = p_reviewee_id and m.status = 'active'
    ) then
      raise exception 'Bu kullanıcı projenin ekibinde değil.' using errcode = 'P0001';
    end if;
    v_role := 'client';
  elsif exists (
    select 1 from project_team_members m
    where m.project_id = p_project_id and m.freelancer_id = v_caller and m.status = 'active'
  ) then
    if p_reviewee_id <> v_client_id then
      raise exception 'Freelancer yalnızca proje sahibini değerlendirebilir.' using errcode = 'P0001';
    end if;
    v_role := 'freelancer';
  else
    raise exception 'Bu projeyi değerlendirme yetkin yok.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from reviews r
    where r.project_id = p_project_id and r.reviewer_id = v_caller and r.reviewee_id = p_reviewee_id
  ) then
    raise exception 'Bu proje için zaten değerlendirme yaptın.' using errcode = 'P0001';
  end if;

  insert into reviews (project_id, reviewer_id, reviewee_id, reviewer_role, rating, comment)
  values (p_project_id, v_caller, p_reviewee_id, v_role, p_rating, nullif(trim(coalesce(p_comment, '')), ''))
  returning id into v_review_id;

  insert into notifications (user_id, type, title, message, link, dedupe_key)
  values (
    p_reviewee_id,
    'review_received',
    'Yeni değerlendirme aldın',
    '"' || coalesce(v_title, 'Proje') || '" projesi için bir değerlendirme aldın.',
    case when v_role = 'client' then '/freelancers/projects/' else '/client/projects/' end || p_project_id,
    'review_received:' || p_project_id || ':' || v_caller
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  return v_review_id;
end;
$$;

revoke execute on function public.submit_review(uuid, uuid, integer, text) from public, anon;
grant execute on function public.submit_review(uuid, uuid, integer, text) to authenticated;

create or replace function public.get_rating_summary(p_user_id uuid)
returns table(rating_avg numeric, rating_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select round(avg(r.rating)::numeric, 2), count(*)::integer
  from reviews r
  where r.reviewee_id = p_user_id and not r.is_hidden;
$$;

revoke execute on function public.get_rating_summary(uuid) from public, anon;
grant execute on function public.get_rating_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) İptal talepleri
-- ---------------------------------------------------------------------------
create table if not exists public.project_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  requester_role text not null check (requester_role in ('client', 'freelancer')),
  reason text not null check (char_length(reason) between 10 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  responded_by uuid references public.profiles(id),
  response_note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists project_cancellation_one_pending_idx
  on public.project_cancellation_requests (project_id)
  where status = 'pending';

alter table public.project_cancellation_requests enable row level security;

create policy "Cancellation requests are visible to project participants"
  on public.project_cancellation_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_cancellation_requests.project_id and p.client_id = auth.uid()
    )
    or exists (
      select 1 from public.project_team_members m
      where m.project_id = project_cancellation_requests.project_id
        and m.freelancer_id = auth.uid()
        and m.status in ('active', 'removed')
    )
    or (select private.is_admin())
  );

drop trigger if exists cancellation_reason_no_contact_info on public.project_cancellation_requests;
create trigger cancellation_reason_no_contact_info
  before insert or update on public.project_cancellation_requests
  for each row execute function private.enforce_no_contact_info('reason');

create or replace function private.cancel_project_internal(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('collacrew.system_write', 'on', true);

  update projects set status = 'cancelled' where id = p_project_id;

  -- Henüz ödemesi tamamlanmamış / bekleyen aşamaların ödeme durumu iptal olur.
  -- Gerçekleşmiş bir ödeme (paid/paid_out) burada DEĞİŞTİRİLMEZ: iade süreci
  -- ödeme sağlayıcısı entegrasyonuyla birlikte ayrıca işlenecek.
  update project_milestones
    set payment_status = 'cancelled'
    where project_id = p_project_id
      and status <> 'approved'
      and payment_status in ('pending', 'payment_initiated', 'payment_failed', 'held');

  update project_cancellation_requests
    set status = 'withdrawn', responded_at = now()
    where project_id = p_project_id and status = 'pending';

  perform set_config('collacrew.system_write', 'off', true);
end;
$$;

revoke execute on function private.cancel_project_internal(uuid) from public, anon, authenticated;

create or replace function public.request_project_cancellation(p_project_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_client_id uuid;
  v_status text;
  v_title text;
  v_is_client boolean;
  v_request_id uuid;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  if char_length(v_reason) < 10 then
    raise exception 'İptal nedenini en az 10 karakterle açıkla.' using errcode = 'P0001';
  end if;

  select client_id, status, title into v_client_id, v_status, v_title
  from projects where id = p_project_id;

  if v_client_id is null then
    raise exception 'Proje bulunamadı.' using errcode = 'P0001';
  end if;

  v_is_client := v_caller = v_client_id;

  if not v_is_client and not exists (
    select 1 from project_team_members m
    where m.project_id = p_project_id and m.freelancer_id = v_caller and m.status = 'active'
  ) then
    raise exception 'Bu proje için iptal talebi oluşturma yetkin yok.' using errcode = 'P0001';
  end if;

  if v_status = 'completed' then
    raise exception 'Tamamlanan proje iptal edilemez.' using errcode = 'P0001';
  end if;

  if v_status = 'cancelled' then
    raise exception 'Proje zaten iptal edilmiş.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from project_cancellation_requests
    where project_id = p_project_id and status = 'pending'
  ) then
    raise exception 'Bu proje için bekleyen bir iptal talebi zaten var.' using errcode = 'P0001';
  end if;

  -- Ekip henüz kurulmamış / iş başlamamış projeyi client tek başına kapatabilir.
  if v_is_client and (
    v_status = 'open'
    or not exists (select 1 from project_team_members m where m.project_id = p_project_id and m.status = 'active')
  ) then
    insert into project_cancellation_requests (
      project_id, requested_by, requester_role, reason, status, responded_by, responded_at
    ) values (p_project_id, v_caller, 'client', v_reason, 'accepted', v_caller, now())
    returning id into v_request_id;

    perform private.cancel_project_internal(p_project_id);
    return v_request_id;
  end if;

  insert into project_cancellation_requests (project_id, requested_by, requester_role, reason)
  values (p_project_id, v_caller, case when v_is_client then 'client' else 'freelancer' end, v_reason)
  returning id into v_request_id;

  insert into notifications (user_id, type, title, message, link, dedupe_key)
  select
    x.user_id,
    'cancellation_requested',
    'Proje iptal talebi',
    '"' || coalesce(v_title, 'Proje') || '" projesi için iptal talebi oluşturuldu.',
    case when x.is_client_side then '/client/projects/' else '/freelancers/projects/' end || p_project_id,
    'cancellation_requested:' || v_request_id || ':' || x.user_id
  from (
    select v_client_id as user_id, true as is_client_side
    where not v_is_client
    union all
    select m.freelancer_id, false
    from project_team_members m
    where m.project_id = p_project_id and m.status = 'active' and m.freelancer_id <> v_caller
      and v_is_client
  ) x
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  return v_request_id;
end;
$$;

revoke execute on function public.request_project_cancellation(uuid, text) from public, anon;
grant execute on function public.request_project_cancellation(uuid, text) to authenticated;

create or replace function public.respond_project_cancellation(
  p_request_id uuid,
  p_accept boolean,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_req project_cancellation_requests%rowtype;
  v_client_id uuid;
  v_title text;
  v_active_members integer;
  v_result text;
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  select * into v_req from project_cancellation_requests where id = p_request_id for update;
  if not found or v_req.status <> 'pending' then
    raise exception 'Bekleyen iptal talebi bulunamadı.' using errcode = 'P0001';
  end if;

  select client_id, title into v_client_id, v_title from projects where id = v_req.project_id;

  if v_req.requested_by = v_caller then
    raise exception 'Kendi iptal talebine yanıt veremezsin.' using errcode = 'P0001';
  end if;

  if v_req.requester_role = 'client' then
    if not exists (
      select 1 from project_team_members m
      where m.project_id = v_req.project_id and m.freelancer_id = v_caller and m.status = 'active'
    ) then
      raise exception 'Bu talebe yanıt verme yetkin yok.' using errcode = 'P0001';
    end if;
  elsif v_caller <> v_client_id then
    raise exception 'Bu talebe yanıt verme yetkin yok.' using errcode = 'P0001';
  end if;

  update project_cancellation_requests
    set status = case when p_accept then 'accepted' else 'rejected' end,
        responded_by = v_caller,
        response_note = nullif(trim(coalesce(p_note, '')), ''),
        responded_at = now()
    where id = p_request_id;

  if p_accept then
    select count(*) into v_active_members
    from project_team_members where project_id = v_req.project_id and status = 'active';

    if v_req.requester_role = 'freelancer' and v_active_members > 1 then
      -- Ekip projesinde yalnızca ayrılmak isteyen üye çıkarılır, proje sürer.
      perform set_config('collacrew.system_write', 'on', true);
      update project_team_members
        set status = 'removed', updated_at = now()
        where project_id = v_req.project_id and freelancer_id = v_req.requested_by and status = 'active';
      perform set_config('collacrew.system_write', 'off', true);
      v_result := 'member_removed';
    else
      perform private.cancel_project_internal(v_req.project_id);
      v_result := 'project_cancelled';
    end if;
  else
    v_result := 'rejected';
  end if;

  insert into notifications (user_id, type, title, message, link, dedupe_key)
  values (
    v_req.requested_by,
    'cancellation_responded',
    case when p_accept then 'İptal talebin kabul edildi' else 'İptal talebin reddedildi' end,
    '"' || coalesce(v_title, 'Proje') || '" projesi için iptal talebine yanıt verildi.',
    case when v_req.requester_role = 'client' then '/client/projects/' else '/freelancers/projects/' end || v_req.project_id,
    'cancellation_responded:' || p_request_id
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  return v_result;
end;
$$;

revoke execute on function public.respond_project_cancellation(uuid, boolean, text) from public, anon;
grant execute on function public.respond_project_cancellation(uuid, boolean, text) to authenticated;

create or replace function public.withdraw_project_cancellation(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update project_cancellation_requests
    set status = 'withdrawn', responded_at = now()
    where id = p_request_id and requested_by = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Geri çekilecek bekleyen talep bulunamadı.' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.withdraw_project_cancellation(uuid) from public, anon;
grant execute on function public.withdraw_project_cancellation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Süre uzatma talepleri
-- ---------------------------------------------------------------------------
create table if not exists public.milestone_extension_requests (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.project_milestones(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  previous_due_date date,
  requested_due_date date not null,
  reason text not null check (char_length(reason) between 5 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  responded_by uuid references public.profiles(id),
  response_note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists milestone_extension_one_pending_idx
  on public.milestone_extension_requests (milestone_id)
  where status = 'pending';

alter table public.milestone_extension_requests enable row level security;

create policy "Extension requests are visible to project participants"
  on public.milestone_extension_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestone_extension_requests.project_id and p.client_id = auth.uid()
    )
    or exists (
      select 1 from public.project_team_members m
      where m.project_id = milestone_extension_requests.project_id
        and m.freelancer_id = auth.uid()
        and m.status = 'active'
    )
    or (select private.is_admin())
  );

drop trigger if exists extension_reason_no_contact_info on public.milestone_extension_requests;
create trigger extension_reason_no_contact_info
  before insert or update on public.milestone_extension_requests
  for each row execute function private.enforce_no_contact_info('reason');

create or replace function public.request_milestone_extension(
  p_milestone_id uuid,
  p_new_due_date date,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_m project_milestones%rowtype;
  v_client_id uuid;
  v_project_status text;
  v_title text;
  v_request_id uuid;
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  select * into v_m from project_milestones where id = p_milestone_id;
  if not found then
    raise exception 'Aşama bulunamadı.' using errcode = 'P0001';
  end if;

  select client_id, status, title into v_client_id, v_project_status, v_title
  from projects where id = v_m.project_id;

  if v_project_status <> 'in_progress' then
    raise exception 'Süre uzatma yalnızca devam eden projelerde istenebilir.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from project_team_members m
    where m.project_id = v_m.project_id and m.freelancer_id = v_caller and m.status = 'active'
  ) or (v_m.freelancer_id is not null and v_m.freelancer_id <> v_caller) then
    raise exception 'Bu aşama için süre uzatma isteme yetkin yok.' using errcode = 'P0001';
  end if;

  if v_m.status not in ('active', 'revision') then
    raise exception 'Bu aşama için şu anda süre uzatma istenemez.' using errcode = 'P0001';
  end if;

  if p_new_due_date is null or p_new_due_date <= coalesce(v_m.due_date, current_date) then
    raise exception 'Yeni tarih mevcut teslim tarihinden sonra olmalı.' using errcode = 'P0001';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Süre uzatma nedenini yaz.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from milestone_extension_requests
    where milestone_id = p_milestone_id and status = 'pending'
  ) then
    raise exception 'Bu aşama için bekleyen bir süre uzatma talebi zaten var.' using errcode = 'P0001';
  end if;

  insert into milestone_extension_requests (
    milestone_id, project_id, requested_by, previous_due_date, requested_due_date, reason
  ) values (
    p_milestone_id, v_m.project_id, v_caller, v_m.due_date, p_new_due_date, trim(p_reason)
  ) returning id into v_request_id;

  insert into notifications (user_id, type, title, message, link, dedupe_key)
  values (
    v_client_id,
    'extension_requested',
    'Süre uzatma talebi',
    '"' || v_m.title || '" aşaması için süre uzatma talep edildi.',
    '/client/projects/' || v_m.project_id,
    'extension_requested:' || v_request_id
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  return v_request_id;
end;
$$;

revoke execute on function public.request_milestone_extension(uuid, date, text) from public, anon;
grant execute on function public.request_milestone_extension(uuid, date, text) to authenticated;

create or replace function public.respond_milestone_extension(
  p_request_id uuid,
  p_accept boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_req milestone_extension_requests%rowtype;
  v_client_id uuid;
  v_title text;
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  select * into v_req from milestone_extension_requests where id = p_request_id for update;
  if not found or v_req.status <> 'pending' then
    raise exception 'Bekleyen süre uzatma talebi bulunamadı.' using errcode = 'P0001';
  end if;

  select p.client_id into v_client_id from projects p where p.id = v_req.project_id;
  if v_client_id is distinct from v_caller then
    raise exception 'Yalnızca proje sahibi süre uzatma talebine yanıt verebilir.' using errcode = 'P0001';
  end if;

  update milestone_extension_requests
    set status = case when p_accept then 'accepted' else 'rejected' end,
        responded_by = v_caller,
        response_note = nullif(trim(coalesce(p_note, '')), ''),
        responded_at = now()
    where id = p_request_id;

  select title into v_title from project_milestones where id = v_req.milestone_id;

  if p_accept then
    perform set_config('collacrew.system_write', 'on', true);
    update project_milestones set due_date = v_req.requested_due_date where id = v_req.milestone_id;
    perform set_config('collacrew.system_write', 'off', true);
  end if;

  insert into notifications (user_id, type, title, message, link, dedupe_key)
  values (
    v_req.requested_by,
    'extension_responded',
    case when p_accept then 'Süre uzatma kabul edildi' else 'Süre uzatma reddedildi' end,
    '"' || coalesce(v_title, 'Aşama') || '" aşaması için süre uzatma talebine yanıt verildi.',
    '/freelancers/projects/' || v_req.project_id,
    'extension_responded:' || p_request_id
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end;
$$;

revoke execute on function public.respond_milestone_extension(uuid, boolean, text) from public, anon;
grant execute on function public.respond_milestone_extension(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Uyuşmazlık (dispute / resolution center)
-- ---------------------------------------------------------------------------
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.project_milestones(id) on delete set null,
  opened_by uuid not null references public.profiles(id) on delete cascade,
  opener_role text not null check (opener_role in ('client', 'freelancer')),
  against_user uuid references public.profiles(id) on delete set null,
  reason text not null
    check (reason in ('non_delivery', 'quality', 'deadline', 'payment', 'communication', 'off_platform', 'other')),
  description text not null check (char_length(description) between 20 and 4000),
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved', 'closed')),
  resolution text,
  resolution_outcome text
    check (resolution_outcome is null or resolution_outcome in ('client_favored', 'freelancer_favored', 'split', 'withdrawn', 'no_action')),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists disputes_one_active_per_opener_idx
  on public.disputes (project_id, opened_by)
  where status in ('open', 'under_review');

create table if not exists public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 4000),
  project_file_id uuid references public.project_files(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.disputes enable row level security;
alter table public.dispute_evidence enable row level security;

create policy "Dispute parties and admins can view disputes"
  on public.disputes for select
  to authenticated
  using (
    opened_by = auth.uid()
    or against_user = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = disputes.project_id and p.client_id = auth.uid()
    )
    or (select private.is_admin())
  );

create policy "Dispute parties and admins can view evidence"
  on public.dispute_evidence for select
  to authenticated
  using (
    exists (
      select 1 from public.disputes d
      where d.id = dispute_evidence.dispute_id
        and (
          d.opened_by = auth.uid()
          or d.against_user = auth.uid()
          or exists (select 1 from public.projects p where p.id = d.project_id and p.client_id = auth.uid())
        )
    )
    or (select private.is_admin())
  );

drop trigger if exists disputes_description_no_contact_info on public.disputes;
create trigger disputes_description_no_contact_info
  before insert or update on public.disputes
  for each row execute function private.enforce_no_contact_info('description');

drop trigger if exists dispute_evidence_no_contact_info on public.dispute_evidence;
create trigger dispute_evidence_no_contact_info
  before insert or update on public.dispute_evidence
  for each row execute function private.enforce_no_contact_info('note');

create or replace function public.open_dispute(
  p_project_id uuid,
  p_milestone_id uuid,
  p_reason text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_client_id uuid;
  v_status text;
  v_title text;
  v_is_client boolean;
  v_against uuid;
  v_milestone_owner uuid;
  v_dispute_id uuid;
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  select client_id, status, title into v_client_id, v_status, v_title
  from projects where id = p_project_id;

  if v_client_id is null then
    raise exception 'Proje bulunamadı.' using errcode = 'P0001';
  end if;

  v_is_client := v_caller = v_client_id;

  if not v_is_client and not exists (
    select 1 from project_team_members m
    where m.project_id = p_project_id and m.freelancer_id = v_caller and m.status in ('active', 'removed')
  ) then
    raise exception 'Bu proje için uyuşmazlık açma yetkin yok.' using errcode = 'P0001';
  end if;

  if v_status = 'open' then
    raise exception 'Henüz başlamamış proje için uyuşmazlık açılamaz.' using errcode = 'P0001';
  end if;

  if p_milestone_id is not null then
    select freelancer_id into v_milestone_owner
    from project_milestones where id = p_milestone_id and project_id = p_project_id;
    if not found then
      raise exception 'Aşama bu projeye ait değil.' using errcode = 'P0001';
    end if;
  end if;

  if v_is_client then
    v_against := v_milestone_owner;
    if v_against is null then
      select m.freelancer_id into v_against
      from project_team_members m
      where m.project_id = p_project_id and m.status = 'active'
      order by m.created_at limit 1;
    end if;
  else
    v_against := v_client_id;
  end if;

  if exists (
    select 1 from disputes
    where project_id = p_project_id and opened_by = v_caller and status in ('open', 'under_review')
  ) then
    raise exception 'Bu proje için zaten açık bir uyuşmazlığın var.' using errcode = 'P0001';
  end if;

  insert into disputes (project_id, milestone_id, opened_by, opener_role, against_user, reason, description)
  values (
    p_project_id, p_milestone_id, v_caller,
    case when v_is_client then 'client' else 'freelancer' end,
    v_against, p_reason, trim(p_description)
  )
  returning id into v_dispute_id;

  if p_milestone_id is not null then
    perform set_config('collacrew.system_write', 'on', true);
    update project_milestones set dispute_status = 'open' where id = p_milestone_id;
    perform set_config('collacrew.system_write', 'off', true);
  end if;

  if v_against is not null then
    insert into notifications (user_id, type, title, message, link, dedupe_key)
    values (
      v_against,
      'dispute_opened',
      'Uyuşmazlık bildirimi',
      '"' || coalesce(v_title, 'Proje') || '" projesi için bir uyuşmazlık açıldı.',
      case when v_is_client then '/freelancers/projects/' else '/client/projects/' end || p_project_id,
      'dispute_opened:' || v_dispute_id
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return v_dispute_id;
end;
$$;

revoke execute on function public.open_dispute(uuid, uuid, text, text) from public, anon;
grant execute on function public.open_dispute(uuid, uuid, text, text) to authenticated;

create or replace function public.add_dispute_evidence(
  p_dispute_id uuid,
  p_note text,
  p_project_file_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_d disputes%rowtype;
  v_client_id uuid;
  v_evidence_id uuid;
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  select * into v_d from disputes where id = p_dispute_id;
  if not found then
    raise exception 'Uyuşmazlık bulunamadı.' using errcode = 'P0001';
  end if;

  select client_id into v_client_id from projects where id = v_d.project_id;

  if v_caller not in (v_d.opened_by, coalesce(v_d.against_user, v_d.opened_by), v_client_id) then
    raise exception 'Bu uyuşmazlığa kanıt ekleme yetkin yok.' using errcode = 'P0001';
  end if;

  if v_d.status not in ('open', 'under_review') then
    raise exception 'Kapanmış uyuşmazlığa kanıt eklenemez.' using errcode = 'P0001';
  end if;

  if p_project_file_id is not null and not exists (
    select 1 from project_files f where f.id = p_project_file_id and f.project_id = v_d.project_id
  ) then
    raise exception 'Dosya bu projeye ait değil.' using errcode = 'P0001';
  end if;

  insert into dispute_evidence (dispute_id, submitted_by, note, project_file_id)
  values (p_dispute_id, v_caller, trim(p_note), p_project_file_id)
  returning id into v_evidence_id;

  return v_evidence_id;
end;
$$;

revoke execute on function public.add_dispute_evidence(uuid, text, uuid) from public, anon;
grant execute on function public.add_dispute_evidence(uuid, text, uuid) to authenticated;

create or replace function public.admin_update_dispute(
  p_dispute_id uuid,
  p_status text,
  p_resolution text default null,
  p_outcome text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d disputes%rowtype;
  v_title text;
  v_final boolean := p_status in ('resolved', 'closed');
begin
  if not private.is_admin() then
    raise exception 'Bu işlem yalnızca yöneticiler içindir.' using errcode = '42501';
  end if;

  if p_status not in ('under_review', 'resolved', 'closed') then
    raise exception 'Geçersiz uyuşmazlık durumu.' using errcode = 'P0001';
  end if;

  select * into v_d from disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'Uyuşmazlık bulunamadı.' using errcode = 'P0001';
  end if;

  if v_final and char_length(trim(coalesce(p_resolution, ''))) < 5 then
    raise exception 'Çözüm açıklaması gerekli.' using errcode = 'P0001';
  end if;

  update disputes
    set status = p_status,
        resolution = case when v_final then trim(p_resolution) else resolution end,
        resolution_outcome = case when v_final then p_outcome else resolution_outcome end,
        resolved_by = case when v_final then auth.uid() else resolved_by end,
        resolved_at = case when v_final then now() else resolved_at end,
        updated_at = now()
    where id = p_dispute_id;

  if v_d.milestone_id is not null then
    perform set_config('collacrew.system_write', 'on', true);
    update project_milestones
      set dispute_status = case when v_final then 'resolved' else 'under_review' end
      where id = v_d.milestone_id;
    perform set_config('collacrew.system_write', 'off', true);
  end if;

  select title into v_title from projects where id = v_d.project_id;

  insert into notifications (user_id, type, title, message, link, dedupe_key)
  select u.user_id, 'dispute_updated', 'Uyuşmazlık güncellendi',
    '"' || coalesce(v_title, 'Proje') || '" projesindeki uyuşmazlığın durumu güncellendi.',
    u.link, 'dispute_updated:' || p_dispute_id || ':' || p_status || ':' || u.user_id
  from (
    select v_d.opened_by as user_id,
      case when v_d.opener_role = 'client' then '/client/projects/' else '/freelancers/projects/' end || v_d.project_id as link
    union
    select v_d.against_user,
      case when v_d.opener_role = 'client' then '/freelancers/projects/' else '/client/projects/' end || v_d.project_id
    where v_d.against_user is not null
  ) u
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  perform public.log_audit_event(
    'dispute_' || p_status, 'disputes', p_dispute_id,
    jsonb_build_object('outcome', p_outcome)
  );
end;
$$;

revoke execute on function public.admin_update_dispute(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_dispute(uuid, text, text, text) to authenticated;

-- Admin: tarafların proje/mesaj/teslim/aşama geçmişini tek çağrıda görür.
-- Mesajlar hassas olduğu için erişim denetim kaydına yazılır.
create or replace function public.admin_dispute_case(p_dispute_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d disputes%rowtype;
  v_parties uuid[];
  v_result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Bu işlem yalnızca yöneticiler içindir.' using errcode = '42501';
  end if;

  select * into v_d from disputes where id = p_dispute_id;
  if not found then
    raise exception 'Uyuşmazlık bulunamadı.' using errcode = 'P0001';
  end if;

  select array_agg(distinct u) into v_parties from (
    select v_d.opened_by u
    union select v_d.against_user
    union select client_id from projects where id = v_d.project_id
  ) t where u is not null;

  select jsonb_build_object(
    'dispute', to_jsonb(v_d),
    'project', (select to_jsonb(p) from (
      select id, title, status, budget, deadline, client_id, commission_rate from projects where id = v_d.project_id
    ) p),
    'team', coalesce((select jsonb_agg(to_jsonb(m)) from (
      select freelancer_id, role, status, agreed_amount, agreed_delivery_days, accepted_at
      from project_team_members where project_id = v_d.project_id
    ) m), '[]'::jsonb),
    'milestones', coalesce((select jsonb_agg(to_jsonb(ms) order by ms.sort_order) from (
      select id, title, status, budget, due_date, payment_status, dispute_status, revision_count,
             submitted_at, approved_at, freelancer_id, sort_order
      from project_milestones where project_id = v_d.project_id
    ) ms), '[]'::jsonb),
    'deliveries', coalesce((select jsonb_agg(to_jsonb(dl) order by dl.submitted_at) from (
      select id, milestone_id, attempt_no, message, status, submitted_at, reviewed_at, review_feedback
      from project_milestone_deliveries where project_id = v_d.project_id
    ) dl), '[]'::jsonb),
    'evidence', coalesce((select jsonb_agg(to_jsonb(ev) order by ev.created_at) from (
      select id, submitted_by, note, project_file_id, created_at
      from dispute_evidence where dispute_id = p_dispute_id
    ) ev), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(to_jsonb(msg) order by msg.created_at) from (
      select id, sender_id, receiver_id, content, created_at
      from messages
      where sender_id = any(v_parties) and (receiver_id = any(v_parties) or coalition_id in (
        select id from coalitions where project_id = v_d.project_id
      ))
      order by created_at desc
      limit 200
    ) msg), '[]'::jsonb)
  ) into v_result;

  perform public.log_audit_event('dispute_case_viewed', 'disputes', p_dispute_id, null);

  return v_result;
end;
$$;

revoke execute on function public.admin_dispute_case(uuid) from public, anon;
grant execute on function public.admin_dispute_case(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Şikayet (report) ve engelleme (block)
-- ---------------------------------------------------------------------------
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'project', 'message')),
  target_id uuid not null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason text not null
    check (reason in ('spam', 'harassment', 'off_platform_contact', 'fraud', 'inappropriate', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'actioned', 'dismissed')),
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_reports enable row level security;
alter table public.user_blocks enable row level security;

create policy "Reporters and admins can view reports"
  on public.user_reports for select
  to authenticated
  using (reporter_id = auth.uid() or (select private.is_admin()));

create policy "Users can view own blocks"
  on public.user_blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "Users can block others"
  on public.user_blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "Users can unblock"
  on public.user_blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

revoke update on public.user_blocks from authenticated, anon;

create or replace function public.report_target(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_reported uuid;
  v_report_id uuid;
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  if p_target_type = 'user' then
    select id into v_reported from profiles where id = p_target_id;
  elsif p_target_type = 'project' then
    select client_id into v_reported from projects p
    where p.id = p_target_id
      and (
        p.status = 'open' or p.client_id = v_caller
        or exists (select 1 from project_team_members m where m.project_id = p.id and m.freelancer_id = v_caller)
        or exists (select 1 from proposals pr where pr.project_id = p.id and pr.freelancer_id = v_caller)
      );
  elsif p_target_type = 'message' then
    select case when m.sender_id = v_caller then m.receiver_id else m.sender_id end into v_reported
    from messages m
    where m.id = p_target_id
      and (
        m.sender_id = v_caller or m.receiver_id = v_caller
        or (m.coalition_id is not null and exists (
          select 1 from coalition_members cm
          where cm.coalition_id = m.coalition_id and cm.user_id = v_caller and cm.status = 'active'
        ))
      );
  else
    raise exception 'Geçersiz şikayet türü.' using errcode = 'P0001';
  end if;

  if v_reported is null and p_target_type <> 'message' then
    raise exception 'Şikayet edilen içerik bulunamadı.' using errcode = 'P0001';
  end if;

  if not found then
    raise exception 'Şikayet edilen içerik bulunamadı.' using errcode = 'P0001';
  end if;

  if p_target_type = 'user' and p_target_id = v_caller then
    raise exception 'Kendini şikayet edemezsin.' using errcode = 'P0001';
  end if;

  insert into user_reports (reporter_id, target_type, target_id, reported_user_id, reason, details)
  values (v_caller, p_target_type, p_target_id, v_reported, p_reason, nullif(trim(coalesce(p_details, '')), ''))
  on conflict (reporter_id, target_type, target_id) do nothing
  returning id into v_report_id;

  if v_report_id is null then
    raise exception 'Bu içeriği zaten şikayet ettin.' using errcode = 'P0001';
  end if;

  return v_report_id;
end;
$$;

revoke execute on function public.report_target(text, uuid, text, text) from public, anon;
grant execute on function public.report_target(text, uuid, text, text) to authenticated;

create or replace function public.admin_update_report(
  p_report_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'Bu işlem yalnızca yöneticiler içindir.' using errcode = '42501';
  end if;

  if p_status not in ('reviewing', 'actioned', 'dismissed') then
    raise exception 'Geçersiz şikayet durumu.' using errcode = 'P0001';
  end if;

  update user_reports
    set status = p_status,
        admin_note = nullif(trim(coalesce(p_note, '')), ''),
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = p_report_id;

  if not found then
    raise exception 'Şikayet bulunamadı.' using errcode = 'P0001';
  end if;

  perform public.log_audit_event('report_' || p_status, 'user_reports', p_report_id, null);
end;
$$;

revoke execute on function public.admin_update_report(uuid, text, text) from public, anon;
grant execute on function public.admin_update_report(uuid, text, text) to authenticated;

-- Engellenen kullanıcılar arasında mesaj gönderimi RLS seviyesinde reddedilir
-- (mevcut "Users can send messages" politikasına ek, kısıtlayıcı bir katman).
drop policy if exists "Blocked users cannot exchange messages" on public.messages;
create policy "Blocked users cannot exchange messages"
  on public.messages as restrictive for insert
  to authenticated
  with check (
    receiver_id is null
    or not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = messages.receiver_id and b.blocked_id = auth.uid())
         or (b.blocker_id = auth.uid() and b.blocked_id = messages.receiver_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 7) Hesap silme talebi (KVKK)
-- ---------------------------------------------------------------------------
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists account_deletion_one_pending_idx
  on public.account_deletion_requests (user_id)
  where status in ('pending', 'processing');

alter table public.account_deletion_requests enable row level security;

create policy "Users and admins can view deletion requests"
  on public.account_deletion_requests for select
  to authenticated
  using (user_id = auth.uid() or (select private.is_admin()));

create policy "Users can request own account deletion"
  on public.account_deletion_requests for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy "Users can cancel own pending deletion request"
  on public.account_deletion_requests for update
  to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'cancelled');

revoke update on public.account_deletion_requests from authenticated, anon;
grant update (status) on public.account_deletion_requests to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Termin bildirimleri (yaklaşıyor / gecikti) — mükerrer üretmez
-- ---------------------------------------------------------------------------
create or replace function public.sync_deadline_notifications(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_client_id uuid;
  v_status text;
  v_count integer := 0;
  v_row record;
begin
  if v_caller is null then
    return 0;
  end if;

  select client_id, status into v_client_id, v_status from projects where id = p_project_id;
  if v_client_id is null or v_status <> 'in_progress' then
    return 0;
  end if;

  if v_caller <> v_client_id and not exists (
    select 1 from project_team_members m
    where m.project_id = p_project_id and m.freelancer_id = v_caller and m.status = 'active'
  ) then
    return 0;
  end if;

  for v_row in
    select m.id, m.title, m.due_date, m.freelancer_id,
           case when m.due_date < current_date then 'overdue' else 'due_soon' end as kind
    from project_milestones m
    where m.project_id = p_project_id
      and m.status in ('active', 'revision')
      and m.due_date is not null
      and m.due_date <= current_date + 2
  loop
    insert into notifications (user_id, type, title, message, link, dedupe_key)
    select
      t.user_id,
      case when v_row.kind = 'overdue' then 'milestone_overdue' else 'milestone_due_soon' end,
      case when v_row.kind = 'overdue' then 'Aşama gecikti' else 'Teslim tarihi yaklaşıyor' end,
      '"' || v_row.title || '" aşamasının teslim tarihi ' ||
        case when v_row.kind = 'overdue' then 'geçti.' else 'yaklaşıyor.' end,
      t.link,
      v_row.kind || ':' || v_row.id || ':' || v_row.due_date || ':' || t.user_id
    from (
      select v_client_id as user_id, '/client/projects/' || p_project_id as link
      union
      select m.freelancer_id, '/freelancers/projects/' || p_project_id
      from project_team_members m
      where m.project_id = p_project_id and m.status = 'active'
        and (v_row.freelancer_id is null or v_row.freelancer_id = m.freelancer_id)
    ) t
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.sync_deadline_notifications(uuid) from public, anon;
grant execute on function public.sync_deadline_notifications(uuid) to authenticated;
