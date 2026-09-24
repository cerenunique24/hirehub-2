-- Team projects: let each accepted freelancer own an independent set of
-- stages ("aşamalar") instead of one shared project-wide list. Additive
-- only — a nullable freelancer_id on the EXISTING project_milestones
-- table (no new table). NULL keeps the single-freelancer behavior exactly
-- as it was: only the client creates/deletes, any active team member
-- (there's only ever one) submits.

alter table public.project_milestones
  add column freelancer_id uuid references public.profiles(id) on delete cascade;

create index project_milestones_freelancer_id_idx
  on public.project_milestones (project_id, freelancer_id);

-- A team member may create a milestone scoped to their OWN role, for a
-- project they're actually an active member of. Additive to (does not
-- replace) the existing client-only insert policy.
create policy "Active team members can create their own role milestones"
on public.project_milestones
for insert
to authenticated
with check (
  freelancer_id = auth.uid()
  and exists (
    select 1 from public.project_team_members m
    where m.project_id = project_milestones.project_id
      and m.freelancer_id = auth.uid()
      and m.status = 'active'
  )
);

-- A freelancer's own not-yet-active milestone is theirs to remove/redo
-- (their equivalent of "edit" before the client has accepted it).
-- Additive to (does not replace) the existing client-only delete policy.
create policy "Freelancers can delete their own pending role milestones"
on public.project_milestones
for delete
to authenticated
using (
  freelancer_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.project_team_members m
    where m.project_id = project_milestones.project_id
      and m.freelancer_id = auth.uid()
      and m.status = 'active'
  )
);

-- Defense-in-depth: once a milestone is scoped to a specific freelancer,
-- only THAT freelancer (not just "any active team member") may drive its
-- delivery sub-flow. A milestone with freelancer_id IS NULL (every
-- existing single-freelancer-project row, and any pre-existing team
-- milestone from before this migration) keeps the exact old behavior.
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

  if new.freelancer_id is not null and new.freelancer_id <> auth.uid() then
    raise exception 'Bu aşama başka bir ekip üyesinin rolüne ait.';
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
    or new.project_id is distinct from old.project_id
    or new.freelancer_id is distinct from old.freelancer_id then
    raise exception 'Freelancer yalnızca teslim bilgilerini güncelleyebilir.';
  end if;

  new.submitted_at := now();
  return new;
end;
$$;
