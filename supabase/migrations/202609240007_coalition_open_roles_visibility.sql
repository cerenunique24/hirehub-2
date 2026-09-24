-- Coalition "open roles" discovery for freelancers (spec item 8): a
-- freelancer should be able to see OTHER active, project-linked
-- coalitions that are still recruiting, and self-request to join. Only
-- while the underlying project is still `open` (exactly the same
-- recruiting-phase visibility the project itself already has on
-- Discover) — once a project moves past `open`, its coalition goes back
-- to being private to its own members/client, matching the earlier
-- privacy fix.

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
            or exists (
              select 1 from projects p
              where p.id = c.project_id
                and p.status = 'open'
            )
          )
        )
      )
  );
$$;

-- A freelancer can request to join (status = 'pending', same review flow
-- as the existing "Ekip Üyesi Öner" proposal) a coalition whose project
-- is still recruiting. The existing UNIQUE(coalition_id, user_id)
-- constraint already blocks a second request/membership outright.
create policy "Freelancers can request to join an open coalition"
on public.coalition_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.coalitions c
    join public.projects p on p.id = c.project_id
    where c.id = coalition_members.coalition_id
      and p.status = 'open'
  )
  and exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.role = 'freelancer'
  )
);
