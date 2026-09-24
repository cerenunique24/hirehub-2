-- Fix: "Koalisyonlar yüklenemedi" — the coalition_members SELECT policy
-- added in 202609240002 checks active membership by subquerying
-- coalition_members FROM WITHIN its own policy ("self" alias). Postgres
-- detects that as a cycle on the same relation+policy and raises
-- `42P17: infinite recursion detected in policy for relation
-- "coalition_members"` for ANY query that touches coalitions or
-- coalition_members (including plain "my own coalitions" lookups),
-- not just the active-member branch — reproduced directly against this
-- project's data.
--
-- Fix: move the active-membership check into a SECURITY DEFINER function.
-- Such a function runs as its owner and is exempt from the RLS it would
-- otherwise trigger on coalition_members, so calling it from the policy
-- no longer re-enters the same policy. Nothing else changes: same three
-- visibility cases as before (own row, owner of the coalition, project's
-- client, or active member elsewhere in the same coalition).

create or replace function private.is_active_coalition_member(
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
    select 1 from coalition_members
    where coalition_id = p_coalition_id
      and user_id = p_user_id
      and status = 'active'
  );
$$;

drop policy if exists "Authenticated users can view active coalition members" on public.coalition_members;

create policy "Authenticated users can view active coalition members"
on public.coalition_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.coalitions c
    where c.id = coalition_members.coalition_id
      and (
        c.created_by = auth.uid()
        or (c.project_id is null and c.status = 'active')
        or (
          c.project_id is not null
          and exists (
            select 1 from public.projects p
            where p.id = c.project_id
              and p.client_id = auth.uid()
          )
        )
      )
  )
  or private.is_active_coalition_member(coalition_members.coalition_id, auth.uid())
);
