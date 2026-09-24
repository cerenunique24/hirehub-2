-- 202609240004 fixed coalition_members' self-referencing subquery, but
-- coalitions.SELECT and coalition_members.SELECT still cross-reference
-- each other (coalitions' policy subqueries coalition_members, whose
-- policy subqueries coalitions back) — Postgres treats that mutual cycle
-- the same way as direct self-reference:
-- `42P17: infinite recursion detected in policy for relation "coalitions"`
-- (reproduced directly against this project's data after 202609240004).
--
-- Fix: move the whole "can this user see this coalition" check into one
-- SECURITY DEFINER function. Such a function is exempt from the RLS it
-- would otherwise trigger on coalitions/coalition_members/projects, so
-- calling it from either policy no longer re-enters the other's policy.
-- Same three visibility rules as before, unchanged:
--   - the coalition's creator
--   - anyone, for a freelancer-initiated (project_id IS NULL) active coalition
--   - the linked project's client, or an active member of the coalition,
--     for a project-linked coalition

create or replace function private.can_view_coalition(
  p_coalition_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from coalitions c
    where c.id = p_coalition_id
      and (
        c.created_by = p_user_id
        or (c.project_id is null and c.status = 'active')
        or (
          c.project_id is not null
          and (
            exists (
              select 1 from projects p
              where p.id = c.project_id
                and p.client_id = p_user_id
            )
            or exists (
              select 1 from coalition_members cm
              where cm.coalition_id = c.id
                and cm.user_id = p_user_id
                and cm.status = 'active'
            )
          )
        )
      )
  );
$$;

drop policy if exists "Authenticated users can view active coalitions" on public.coalitions;

create policy "Authenticated users can view active coalitions"
on public.coalitions
for select
to authenticated
using (private.can_view_coalition(coalitions.id, auth.uid()));

drop policy if exists "Authenticated users can view active coalition members" on public.coalition_members;

create policy "Authenticated users can view active coalition members"
on public.coalition_members
for select
to authenticated
using (
  user_id = auth.uid()
  or private.can_view_coalition(coalition_members.coalition_id, auth.uid())
);
