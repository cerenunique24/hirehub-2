-- CollaCrew marketplace security hardening (audit remediation).
--
-- Kapatılan açıklar (hepsi doğrudan PostgREST üzerinden, uygulama arayüzü
-- atlanarak sömürülebiliyordu):
--   1. profiles.role kullanıcı tarafından değiştirilebiliyordu (freelancer -> client).
--   2. project_team_members: herhangi bir ekip üyesi kendi satırının project_id'sini
--      değiştirip başka bir projenin "aktif üyesi" olabiliyordu; kaldırılan üye
--      status'unu tekrar 'active' yapabiliyordu.
--   3. project_team_invitations: freelancer davetin bütçe/rol/proje alanlarını
--      değiştirebiliyordu.
--   4. project_milestones: (a) freelancer kendi eklediği aşamayı 'approved' + ödeme
--      alanlarıyla oluşturabiliyordu, (b) client teslim olmadan aşamayı doğrudan
--      'approved' yapabiliyordu, (c) onaylı aşama düzenlenebiliyor, iptal/tamamlanan
--      projede teslim gönderilebiliyordu.
--   5. projects: 'completed' / 'cancelled' durumları serbestçe atlanabiliyordu.
--   6. proposals: RLS yalnızca freelancer_id kontrol ediyordu (kapalı projeye,
--      keyfi status ile teklif eklenebiliyordu); durum geçişleri denetlenmiyordu.
--   7. messages: alıcı, kendisine gelen mesajın içeriğini değiştirebiliyordu.
--   8. log_audit_event(): herhangi bir kullanıcı denetim kaydına sahte olay yazabiliyordu.

-- ---------------------------------------------------------------------------
-- 0) Şema eklemeleri (aşağıdaki fonksiyonlar bu kolonlara başvuruyor)
-- ---------------------------------------------------------------------------
alter table public.project_milestones
  add column if not exists reviewed_at timestamptz,
  add column if not exists revision_requested_at timestamptz,
  add column if not exists revision_count integer not null default 0;

alter table public.projects
  add column if not exists requirements_confirmed_at timestamptz,
  add column if not exists requirements_note text;

alter table public.project_team_members
  add column if not exists agreed_amount numeric,
  add column if not exists agreed_delivery_days integer,
  add column if not exists accepted_at timestamptz;

alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_user_dedupe_key_idx
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

-- Var olan işlemde/ilerlemede olan projeler için gereksinim onayı geriye dönük dolar.
update public.projects
  set requirements_confirmed_at = coalesce(requirements_confirmed_at, updated_at, created_at)
  where status in ('in_progress', 'completed') and requirements_confirmed_at is null;

-- ---------------------------------------------------------------------------
-- 1) profiles.role değiştirilemez
-- ---------------------------------------------------------------------------
create or replace function private.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.role is not null
    and new.role is distinct from old.role
    and auth.uid() is not null
    and not private.is_admin() then
    raise exception 'Hesap rolü değiştirilemez.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function private.protect_profile_role();

-- ---------------------------------------------------------------------------
-- 2) project_team_members: yazmalar yalnızca accept_project_placement() RPC'si ile
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.project_team_members from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 3) project_team_invitations: alan bazlı korumalı güncelleme
-- ---------------------------------------------------------------------------
create or replace function private.enforce_invitation_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.project_id is distinct from old.project_id
    or new.client_id is distinct from old.client_id
    or new.freelancer_id is distinct from old.freelancer_id
    or new.role is distinct from old.role
    or new.budget_per_person is distinct from old.budget_per_person
    or new.duration is distinct from old.duration
    or new.message is distinct from old.message
    or new.created_at is distinct from old.created_at then
    raise exception 'Davet şartları sonradan değiştirilemez.' using errcode = 'P0001';
  end if;

  if new.status is distinct from old.status then
    if old.status <> 'pending' then
      raise exception 'Yanıtlanmış davet tekrar değiştirilemez.' using errcode = 'P0001';
    end if;

    if auth.uid() = old.freelancer_id then
      if new.status not in ('accepted', 'rejected') then
        raise exception 'Geçersiz davet durumu.' using errcode = 'P0001';
      end if;
    elsif auth.uid() = old.client_id then
      if new.status <> 'cancelled' then
        raise exception 'Geçersiz davet durumu.' using errcode = 'P0001';
      end if;
    else
      raise exception 'Bu daveti güncelleme yetkiniz yok.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists project_team_invitations_enforce_update on public.project_team_invitations;
create trigger project_team_invitations_enforce_update
  before update on public.project_team_invitations
  for each row execute function private.enforce_invitation_update();

-- ---------------------------------------------------------------------------
-- 4) project_milestones: insert normalizasyonu + geçiş kuralları
-- ---------------------------------------------------------------------------
create or replace function private.normalize_milestone_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_status text;
  v_is_client boolean;
begin
  if auth.uid() is null or coalesce(current_setting('collacrew.system_write', true), '') = 'on' then
    return new;
  end if;

  select p.status, (p.client_id = auth.uid())
    into v_project_status, v_is_client
  from public.projects p
  where p.id = new.project_id;

  if v_project_status is null then
    raise exception 'Proje bulunamadı.' using errcode = 'P0001';
  end if;

  if v_project_status in ('completed', 'cancelled') then
    raise exception 'Tamamlanan veya iptal edilen projeye aşama eklenemez.' using errcode = 'P0001';
  end if;

  -- Ödeme/teslim/inceleme alanları yalnızca sunucu tarafı akışlarla ilerler;
  -- kullanıcı bunları hazır değerlerle oluşturamaz.
  new.payment_status := 'pending';
  new.dispute_status := 'none';
  new.payment_provider := null;
  new.provider_payment_id := null;
  new.provider_transaction_id := null;
  new.deliverable_description := null;
  new.submitted_at := null;
  new.approved_at := null;
  new.reviewed_at := null;
  new.revision_requested_at := null;
  new.revision_notes := null;
  new.revision_count := 0;

  if new.status not in ('pending', 'active') then
    new.status := 'pending';
  end if;

  if not v_is_client then
    new.freelancer_id := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists project_milestones_normalize_insert on public.project_milestones;
create trigger project_milestones_normalize_insert
  before insert on public.project_milestones
  for each row execute function private.normalize_milestone_insert();

create or replace function public.enforce_milestone_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_client boolean;
  v_is_team_member boolean;
  v_project_status text;
begin
  new.updated_at := now();

  -- Sunucu tarafı (service role / RPC) yazmaları kendi doğrulamasını yapar.
  if auth.uid() is null or coalesce(current_setting('collacrew.system_write', true), '') = 'on' then
    return new;
  end if;

  select p.status, (p.client_id = auth.uid())
    into v_project_status, v_is_client
  from public.projects p
  where p.id = new.project_id;

  if v_project_status in ('cancelled', 'completed') then
    raise exception 'Tamamlanan veya iptal edilen projede aşama güncellenemez.' using errcode = 'P0001';
  end if;

  if old.status = 'approved' then
    raise exception 'Onaylanmış aşama değiştirilemez.' using errcode = 'P0001';
  end if;

  if v_is_client then
    -- Teslim/onay alanları client tarafından doğrudan yazılamaz.
    new.deliverable_description := old.deliverable_description;
    new.submitted_at := old.submitted_at;
    new.approved_at := old.approved_at;
    new.reviewed_at := old.reviewed_at;
    new.revision_requested_at := old.revision_requested_at;
    new.revision_count := old.revision_count;

    if new.status is distinct from old.status then
      if v_project_status <> 'in_progress' then
        raise exception 'Proje başlatılmadan aşama durumu değiştirilemez.' using errcode = 'P0001';
      end if;

      if not (
        (old.status = 'pending' and new.status = 'active')
        or (old.status in ('submitted', 'in_review') and new.status in ('approved', 'revision'))
      ) then
        raise exception 'Geçersiz aşama durumu geçişi.' using errcode = 'P0001';
      end if;

      if new.status = 'approved' then
        new.approved_at := now();
        new.reviewed_at := now();
      elsif new.status = 'revision' then
        new.revision_requested_at := now();
        new.reviewed_at := now();
        new.revision_count := coalesce(old.revision_count, 0) + 1;
      end if;
    end if;

    return new;
  end if;

  select exists (
    select 1 from public.project_team_members m
    where m.project_id = new.project_id
      and m.freelancer_id = auth.uid()
      and m.status = 'active'
  ) into v_is_team_member;

  if not v_is_team_member then
    raise exception 'Bu aşamayı güncelleme yetkiniz yok.' using errcode = 'P0001';
  end if;

  if v_project_status <> 'in_progress' then
    raise exception 'Proje başlatılmadan teslim gönderilemez.' using errcode = 'P0001';
  end if;

  if new.freelancer_id is not null and new.freelancer_id <> auth.uid() then
    raise exception 'Bu aşama başka bir ekip üyesinin rolüne ait.' using errcode = 'P0001';
  end if;

  if old.status = 'active' and new.status <> 'submitted' then
    raise exception 'Bu aşama yalnızca teslim edilerek güncellenebilir.' using errcode = 'P0001';
  elsif old.status = 'revision' and new.status <> 'in_review' then
    raise exception 'Revizyon istenen aşama yalnızca yeniden teslim edilerek güncellenebilir.' using errcode = 'P0001';
  elsif old.status not in ('active', 'revision') then
    raise exception 'Bu aşama şu anda teslim alınamaz.' using errcode = 'P0001';
  end if;

  if new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.due_date is distinct from old.due_date
    or new.budget is distinct from old.budget
    or new.sort_order is distinct from old.sort_order
    or new.project_id is distinct from old.project_id
    or new.freelancer_id is distinct from old.freelancer_id
    or new.revision_notes is distinct from old.revision_notes then
    raise exception 'Freelancer yalnızca teslim bilgilerini güncelleyebilir.' using errcode = 'P0001';
  end if;

  new.submitted_at := now();
  new.approved_at := old.approved_at;
  new.reviewed_at := old.reviewed_at;
  new.revision_requested_at := old.revision_requested_at;
  new.revision_count := old.revision_count;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) projects: durum geçişi koruması
-- ---------------------------------------------------------------------------
create or replace function private.enforce_project_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
    or coalesce(current_setting('collacrew.system_write', true), '') = 'on'
    or new.status is not distinct from old.status then
    return new;
  end if;

  if old.status in ('completed', 'cancelled') then
    raise exception 'Tamamlanan veya iptal edilen projenin durumu değiştirilemez.' using errcode = 'P0001';
  end if;

  if new.status = 'completed' then
    if old.status <> 'in_progress'
      or not exists (select 1 from public.project_milestones m where m.project_id = new.id)
      or exists (select 1 from public.project_milestones m where m.project_id = new.id and m.status <> 'approved') then
      raise exception 'Proje yalnızca tüm aşamalar onaylandığında tamamlanabilir.' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'in_progress' and new.requirements_confirmed_at is null then
    raise exception 'Projeyi başlatmadan önce gereksinimlerin hazır olduğunu onaylamalısın.' using errcode = 'P0001';
  end if;

  if new.status = 'cancelled' and old.status = 'in_progress' then
    raise exception 'Devam eden proje yalnızca iptal talebiyle iptal edilebilir.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists projects_enforce_status_transition on public.projects;
create trigger projects_enforce_status_transition
  before update on public.projects
  for each row execute function private.enforce_project_status_transition();

-- ---------------------------------------------------------------------------
-- 6) proposals: RLS sıkılaştırma + formal durum makinesi
-- ---------------------------------------------------------------------------
alter table public.proposals drop constraint if exists proposals_status_check;
alter table public.proposals
  add constraint proposals_status_check
  check (status in ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'expired'));

drop policy if exists "Freelancers can create own proposals" on public.proposals;
create policy "Freelancers can create own proposals"
  on public.proposals for insert
  to authenticated
  with check (
    freelancer_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'freelancer'
    )
    and exists (
      select 1 from public.projects p
      where p.id = proposals.project_id
        and p.status in ('open', 'ready_to_start')
        and p.client_id <> auth.uid()
    )
  );

drop policy if exists "Freelancers can withdraw own proposals" on public.proposals;
create policy "Freelancers can withdraw own proposals"
  on public.proposals for update
  to authenticated
  using (freelancer_id = auth.uid() and status in ('pending', 'shortlisted'))
  with check (freelancer_id = auth.uid() and status = 'withdrawn');

drop policy if exists "Freelancers can delete own proposals" on public.proposals;
create policy "Freelancers can delete own proposals"
  on public.proposals for delete
  to authenticated
  using (freelancer_id = auth.uid() and status <> 'accepted');

create or replace function private.enforce_proposal_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or new.status is not distinct from old.status then
    return new;
  end if;

  if not (
    (old.status = 'pending' and new.status in ('shortlisted', 'accepted', 'rejected', 'withdrawn', 'expired'))
    or (old.status = 'shortlisted' and new.status in ('pending', 'accepted', 'rejected', 'withdrawn', 'expired'))
  ) then
    raise exception 'Geçersiz teklif durumu geçişi: % -> %', old.status, new.status using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists proposals_enforce_status_transition on public.proposals;
create trigger proposals_enforce_status_transition
  before update on public.proposals
  for each row execute function private.enforce_proposal_status_transition();

-- accept_project_placement: 'shortlisted' teklifler de kabul edilebilir ve
-- kabul anındaki şartlar (tutar/süre) ekip kaydına dondurulur (sözleşme özeti).
create or replace function public.accept_project_placement(p_source text, p_source_id uuid)
returns table(member_id uuid, placement_project_id uuid, role text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caller uuid := auth.uid();
  v_project_id uuid;
  v_freelancer_id uuid;
  v_role text;
  v_amount numeric;
  v_days integer;
  v_client_id uuid;
  v_project_title text;
  v_status text;
  v_breakdown jsonb;
  v_is_team boolean;
  v_capacity int;
  v_current_count int;
  v_duplicate_count int;
  v_new_member_id uuid;
  v_coalition_id uuid;
  v_coalition_name text;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if p_source not in ('invitation', 'proposal') then
    raise exception 'invalid_source';
  end if;

  if p_source = 'invitation' then
    select i.project_id, i.freelancer_id, i.role, i.budget_per_person
      into v_project_id, v_freelancer_id, v_role, v_amount
    from project_team_invitations i
    where i.id = p_source_id
      and i.freelancer_id = v_caller
      and i.status = 'pending'
    for update of i;

    if not found then
      raise exception 'invitation_not_found_or_not_pending';
    end if;
  else
    select p.project_id, p.freelancer_id, p.role, p.bid_amount, p.delivery_days
      into v_project_id, v_freelancer_id, v_role, v_amount, v_days
    from proposals p
    where p.id = p_source_id
      and p.status in ('pending', 'shortlisted')
    for update of p;

    if not found then
      raise exception 'proposal_not_found_or_not_pending';
    end if;

    if v_role is null then
      raise exception 'proposal_missing_role';
    end if;
  end if;

  select pr.client_id, pr.status, pr.budget_breakdown, pr.title
    into v_client_id, v_status, v_breakdown, v_project_title
  from projects pr
  where pr.id = v_project_id
  for update;

  if not found then
    raise exception 'project_not_found';
  end if;

  if p_source = 'proposal' and v_client_id <> v_caller then
    raise exception 'not_authorized';
  end if;

  if v_status not in ('open', 'ready_to_start') then
    raise exception 'project_not_open';
  end if;

  v_is_team := v_breakdown is not null
    and jsonb_typeof(v_breakdown) = 'array'
    and jsonb_array_length(v_breakdown) > 0;

  if v_is_team then
    select coalesce((elem->>'memberCount')::int, 1)
      into v_capacity
    from jsonb_array_elements(v_breakdown) elem
    where lower(trim(coalesce(elem->>'role', elem->>'name', ''))) = lower(trim(coalesce(v_role, '')))
    limit 1;

    if v_capacity is null or v_capacity < 1 then
      v_capacity := 1;
    end if;

    select count(*) into v_current_count
    from project_team_members m
    where m.project_id = v_project_id
      and m.status = 'active'
      and lower(trim(m.role)) = lower(trim(coalesce(v_role, '')));

    if v_current_count >= v_capacity then
      raise exception 'role_capacity_full';
    end if;
  else
    v_capacity := 1;

    select count(*) into v_current_count
    from project_team_members m
    where m.project_id = v_project_id
      and m.status = 'active';

    if v_current_count >= v_capacity then
      raise exception 'project_capacity_full';
    end if;
  end if;

  select count(*) into v_duplicate_count
  from project_team_members m
  where m.project_id = v_project_id
    and m.freelancer_id = v_freelancer_id
    and m.status = 'active';

  if v_duplicate_count > 0 then
    raise exception 'already_member';
  end if;

  insert into project_team_members (
    project_id, freelancer_id, role, invitation_id, proposal_id, joined_via, status,
    agreed_amount, agreed_delivery_days, accepted_at
  ) values (
    v_project_id,
    v_freelancer_id,
    v_role,
    case when p_source = 'invitation' then p_source_id else null end,
    case when p_source = 'proposal' then p_source_id else null end,
    p_source,
    'active',
    v_amount,
    v_days,
    now()
  )
  returning id into v_new_member_id;

  if p_source = 'invitation' then
    update project_team_invitations
      set status = 'accepted', responded_at = now()
      where id = p_source_id;
  else
    update proposals
      set status = 'accepted'
      where id = p_source_id;
  end if;

  if v_is_team then
    v_coalition_name := coalesce(v_project_title, 'Proje') || ' Ekibi';

    insert into coalitions (name, description, status, created_by, project_id)
    values (
      v_coalition_name,
      'Bu ekip "' || coalesce(v_project_title, 'proje') || '" projesi için otomatik oluşturuldu.',
      'active',
      v_client_id,
      v_project_id
    )
    on conflict (project_id) where project_id is not null do nothing
    returning id into v_coalition_id;

    if v_coalition_id is null then
      select id into v_coalition_id
      from coalitions
      where project_id = v_project_id;
    end if;

    insert into coalition_members (coalition_id, user_id, role, status)
    values (v_coalition_id, v_client_id, 'owner', 'active')
    on conflict (coalition_id, user_id) do nothing;

    insert into coalition_members (coalition_id, user_id, role, status)
    values (v_coalition_id, v_freelancer_id, 'member', 'active')
    on conflict (coalition_id, user_id) do nothing;

    insert into notifications (user_id, type, title, message, link, dedupe_key)
    values
      (
        v_freelancer_id,
        'coalition_member_added',
        'Ekibe dahil oldun',
        '"' || coalesce(v_project_title, 'Proje') || '" ekip projesine dahil edildin.',
        '/freelancers/coalitions/' || v_coalition_id,
        'coalition_member_added:' || v_coalition_id || ':' || v_freelancer_id
      ),
      (
        v_client_id,
        'coalition_member_added',
        'Ekip güncellendi',
        'Bir freelancer "' || coalesce(v_project_title, 'proje') || '" ekibine katıldı.',
        '/client/coalitions/' || v_coalition_id,
        'coalition_member_added:' || v_coalition_id || ':' || v_freelancer_id || ':client'
      )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return query select v_new_member_id, v_project_id, v_role;
end;
$function$;

revoke execute on function public.accept_project_placement(text, uuid) from public, anon;
grant execute on function public.accept_project_placement(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) messages: alıcı yalnızca okundu bilgisini güncelleyebilir
-- ---------------------------------------------------------------------------
revoke update on public.messages from authenticated, anon;
grant update (is_read, read_at) on public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Denetim kaydı yalnızca admin tarafından yazılabilir
-- ---------------------------------------------------------------------------
create or replace function public.log_audit_event(
  p_event_type text,
  p_target_table text default null,
  p_target_id uuid default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'Denetim kaydı yalnızca yöneticiler tarafından yazılabilir.' using errcode = '42501';
  end if;

  insert into public.audit_log (event_type, actor_id, target_table, target_id, metadata)
  values (p_event_type, auth.uid(), p_target_table, p_target_id, p_metadata);
end;
$$;

revoke execute on function public.log_audit_event(text, text, uuid, jsonb) from public, anon;
grant execute on function public.log_audit_event(text, text, uuid, jsonb) to authenticated;
