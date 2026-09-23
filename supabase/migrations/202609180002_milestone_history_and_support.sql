-- 1) Milestone revision/delivery history — an automatic audit trail so
--    resubmissions never overwrite what happened before. Populated by a
--    trigger (not app code), so it can never be forgotten/skipped.
create table public.project_milestone_events (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.project_milestones(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('client', 'freelancer')),
  event_type text not null check (event_type in ('submitted', 'revision_requested', 'resubmitted', 'approved')),
  note text,
  created_at timestamptz not null default now()
);

create index project_milestone_events_milestone_id_idx on public.project_milestone_events (milestone_id, created_at);

alter table public.project_milestone_events enable row level security;

create policy "Milestone events are visible to owners and active team members"
  on public.project_milestone_events for select
  using (
    exists (
      select 1
      from public.project_milestones m
      join public.projects p on p.id = m.project_id
      where m.id = project_milestone_events.milestone_id
        and (
          p.client_id = auth.uid()
          or exists (
            select 1 from public.project_team_members tm
            where tm.project_id = p.id
              and tm.freelancer_id = auth.uid()
              and tm.status = 'active'
          )
        )
    )
  );

-- No INSERT/UPDATE/DELETE policy for authenticated/anon: rows are written
-- exclusively by the security-definer trigger below, never directly by users.

create or replace function public.log_milestone_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_client boolean;
  event_type text;
  event_note text;
begin
  if new.status = old.status then
    return new;
  end if;

  select exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.client_id = auth.uid()
  ) into is_client;

  if old.status = 'active' and new.status = 'submitted' then
    event_type := 'submitted';
    event_note := new.deliverable_description;
  elsif old.status = 'revision' and new.status = 'in_review' then
    event_type := 'resubmitted';
    event_note := new.deliverable_description;
  elsif old.status in ('submitted', 'in_review') and new.status = 'revision' then
    event_type := 'revision_requested';
    event_note := new.revision_notes;
  elsif old.status in ('submitted', 'in_review') and new.status = 'approved' then
    event_type := 'approved';
    event_note := null;
  else
    return new;
  end if;

  insert into public.project_milestone_events (milestone_id, actor_id, actor_role, event_type, note)
  values (new.id, auth.uid(), case when is_client then 'client' else 'freelancer' end, event_type, event_note);

  return new;
end;
$$;

revoke execute on function public.log_milestone_event() from public, anon, authenticated;

create trigger project_milestones_log_event
  after update on public.project_milestones
  for each row execute function public.log_milestone_event();

-- 2) Support tickets — real, minimal, no admin UI yet so status/response are
--    not user-editable after creation (only insert + read own + add a
--    follow-up message).
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  category text,
  description text not null,
  related_project_id uuid references public.projects(id) on delete set null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_user_id_idx on public.support_tickets (user_id, created_at);

alter table public.support_tickets enable row level security;

create policy "Users can view own support tickets"
  on public.support_tickets for select
  using (user_id = auth.uid());

create policy "Users can create own support tickets"
  on public.support_tickets for insert
  with check (user_id = auth.uid());

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  message text not null,
  created_at timestamptz not null default now()
);

create index support_ticket_messages_ticket_id_idx on public.support_ticket_messages (ticket_id, created_at);

alter table public.support_ticket_messages enable row level security;

create policy "Ticket owners can view their messages"
  on public.support_ticket_messages for select
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid()
    )
  );

create policy "Ticket owners can add messages"
  on public.support_ticket_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid()
    )
  );

-- 3) Help articles — DB-backed FAQ content instead of hardcoded arrays in
--    components. No admin UI exists yet, so writes are not exposed to any
--    authenticated role (content is seeded here; RLS only grants SELECT).
create table public.help_articles (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('client', 'freelancer', 'all')),
  category text not null,
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.help_articles enable row level security;

create policy "Help articles are visible to authenticated users"
  on public.help_articles for select
  to authenticated
  using (true);

insert into public.help_articles (audience, category, question, answer, sort_order) values
  ('all', 'Başlangıç', 'CollaCrew nasıl çalışır?', 'Client bir proje oluşturur, gerekli roller ve bütçe belirlenir, freelancerlar teklif verir veya davet edilir, ekip oluştuğunda proje başlatılır ve Workroom üzerinden aşama aşama tamamlanır.', 1),
  ('all', 'Hesap', 'Şifremi nasıl değiştiririm?', 'Ayarlar sayfasından "Şifre Değiştir" bölümünü kullanarak yeni bir şifre belirleyebilirsin.', 2),
  ('client', 'Proje Yönetimi', 'Projemi nasıl başlatırım?', 'Ekip tamamlandığında proje "Ekip hazır" durumuna geçer; proje detay sayfasındaki "Projeyi Başlat" butonuna tıklayarak Workroom''u açabilirsin.', 3),
  ('client', 'Ödeme', 'Ödeme nasıl işliyor?', 'CollaCrew şu anda bir ödeme altyapısı sunmuyor; bütçe ve hakediş tutarları bilgilendirme amaçlı gösterilir. Ödemeler taraflar arasında platform dışında yürütülür.', 4),
  ('freelancer', 'Teklifler', 'Düşük eşleşme yüzdesiyle teklif verebilir miyim?', 'Evet. Eşleşme yüzdesi yalnızca bilgilendirme amaçlıdır, teklif göndermeni engellemez.', 5),
  ('freelancer', 'Kazanç', 'Kazançlarım nasıl hesaplanıyor?', 'Onaylanan aşamaların bütçeleri "gerçekleşen kazanç", devam eden projelerin henüz onaylanmamış kısımları "bekleyen hakediş" olarak gösterilir. Gerçek bir ödeme altyapısı bulunmadığı için bu tutarlar bir ödeme garantisi değildir.', 6),
  ('freelancer', 'Workroom', 'Aşama nasıl teslim ederim?', 'Aktif veya revizyon istenen bir aşamada Workroom > Aşamalar sekmesinden "Teslim Et" ile açıklama ve dosyalarını gönderebilirsin.', 7);
