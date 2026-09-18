-- Project milestones: real "aşama" (stage) tracking for in_progress projects.
-- Adds one new table and extends project_files with an optional milestone link.
-- No changes to project_roles / project_team_members / proposals shapes.

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  budget numeric,
  sort_order integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'submitted', 'in_review', 'revision', 'approved')),
  deliverable_description text,
  submitted_at timestamptz,
  approved_at timestamptz,
  revision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_milestones_project_id_idx on public.project_milestones (project_id, sort_order);

alter table public.project_files
  add column if not exists milestone_id uuid references public.project_milestones(id) on delete set null;

create index if not exists project_files_milestone_id_idx on public.project_files (milestone_id);

alter table public.project_milestones enable row level security;

create policy "Project milestones are visible to owners and active team members"
  on public.project_milestones for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_milestones.project_id and p.client_id = auth.uid()
    )
    or exists (
      select 1 from public.project_team_members m
      where m.project_id = project_milestones.project_id
        and m.freelancer_id = auth.uid()
        and m.status = 'active'
    )
  );

create policy "Clients can create milestones for their own projects"
  on public.project_milestones for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_milestones.project_id and p.client_id = auth.uid()
    )
  );

create policy "Clients can delete milestones for their own projects"
  on public.project_milestones for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_milestones.project_id and p.client_id = auth.uid()
    )
  );

create policy "Clients or active team members can update milestones"
  on public.project_milestones for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_milestones.project_id and p.client_id = auth.uid()
    )
    or exists (
      select 1 from public.project_team_members m
      where m.project_id = project_milestones.project_id
        and m.freelancer_id = auth.uid()
        and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_milestones.project_id and p.client_id = auth.uid()
    )
    or exists (
      select 1 from public.project_team_members m
      where m.project_id = project_milestones.project_id
        and m.freelancer_id = auth.uid()
        and m.status = 'active'
    )
  );

-- Defense-in-depth on top of the broad UPDATE policy above: a non-client caller
-- (an active team member) may only move a milestone through the delivery
-- sub-flow (active -> submitted, revision -> in_review) and may only touch the
-- delivery fields, never the client-authored fields (title/description/due
-- date/budget/order) or jump straight to "approved".
create or replace function public.enforce_milestone_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_client boolean;
  is_team_member boolean;
begin
  select exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.client_id = auth.uid()
  ) into is_client;

  new.updated_at := now();

  if is_client then
    if new.status = 'approved' and old.status <> 'approved' then
      new.approved_at := now();
    end if;
    return new;
  end if;

  select exists (
    select 1 from public.project_team_members m
    where m.project_id = new.project_id
      and m.freelancer_id = auth.uid()
      and m.status = 'active'
  ) into is_team_member;

  if not is_team_member then
    raise exception 'Bu aşamayı güncelleme yetkiniz yok.';
  end if;

  if old.status = 'active' and new.status <> 'submitted' then
    raise exception 'Bu aşama yalnızca teslim edilerek güncellenebilir.';
  elsif old.status = 'revision' and new.status <> 'in_review' then
    raise exception 'Revizyon istenen aşama yalnızca yeniden teslim edilerek güncellenebilir.';
  elsif old.status not in ('active', 'revision') then
    raise exception 'Bu aşama şu anda teslim alınamaz.';
  end if;

  if new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.due_date is distinct from old.due_date
    or new.budget is distinct from old.budget
    or new.sort_order is distinct from old.sort_order
    or new.project_id is distinct from old.project_id then
    raise exception 'Freelancer yalnızca teslim bilgilerini güncelleyebilir.';
  end if;

  new.submitted_at := now();
  return new;
end;
$$;

create trigger project_milestones_enforce_transition
  before update on public.project_milestones
  for each row execute function public.enforce_milestone_transition();

-- Widen project_files visibility/upload rights: an in_progress project's active
-- team members need to see and add workroom files, not just the client.
alter policy "Project files are visible to owners and authenticated open-proj"
  on public.project_files
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_files.project_id
        and (projects.client_id = auth.uid() or projects.status = 'open')
    )
    or exists (
      select 1 from public.project_team_members m
      where m.project_id = project_files.project_id
        and m.freelancer_id = auth.uid()
        and m.status = 'active'
    )
  );

alter policy "Clients can add files to their own projects"
  on public.project_files
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_files.project_id and projects.client_id = auth.uid()
    )
    or exists (
      select 1 from public.project_team_members m
      where m.project_id = project_files.project_id
        and m.freelancer_id = auth.uid()
        and m.status = 'active'
    )
  );
