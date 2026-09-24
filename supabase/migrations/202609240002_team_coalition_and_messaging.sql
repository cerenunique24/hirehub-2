-- Connects the existing team-formation pipeline (projects.budget_breakdown +
-- project_team_members + accept_project_placement RPC) to the existing
-- coalitions / coalition_members / messages / notifications tables, so a
-- team ("team_required"/budget_breakdown) project gets a real coalition,
-- accepted freelancers become coalition members, and the client + accepted
-- freelancers share one pre-project team conversation.
--
-- No new tables. Reuses:
--   coalitions (already has project_id)
--   coalition_members (already has UNIQUE(coalition_id, user_id))
--   messages (extended with a nullable coalition_id for group broadcast)
--   notifications (existing notifyUsers()-style insert)

/* -------------------------------------------------------------------------- */
/* 1) messages: support a "team" message alongside the existing 1:1 model     */
/* -------------------------------------------------------------------------- */

alter table public.messages
  alter column receiver_id drop not null;

alter table public.messages
  add column coalition_id uuid references public.coalitions(id) on delete cascade;

-- A message is either a direct 1:1 message (receiver_id) or a team broadcast
-- (coalition_id) — never neither, never both.
alter table public.messages
  add constraint messages_receiver_or_coalition_check
  check (
    (receiver_id is not null and coalition_id is null)
    or (receiver_id is null and coalition_id is not null)
  );

create index if not exists messages_coalition_id_idx
  on public.messages (coalition_id, created_at);

-- Team broadcast: sender must be an ACTIVE participant of the coalition
-- (an active coalition_members row, or the project's client). Additive
-- policy — the existing 1:1 "Users can send messages" policy is untouched
-- and still governs receiver_id messages.
create policy "Coalition participants can send team messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and coalition_id is not null
  and receiver_id is null
  and exists (
    select 1 from public.coalitions c
    where c.id = messages.coalition_id
      and (
        exists (
          select 1 from public.coalition_members cm
          where cm.coalition_id = c.id
            and cm.user_id = auth.uid()
            and cm.status = 'active'
        )
        or exists (
          select 1 from public.projects p
          where p.id = c.project_id
            and p.client_id = auth.uid()
        )
      )
  )
);

create policy "Coalition participants can view team messages"
on public.messages
for select
to authenticated
using (
  coalition_id is not null
  and exists (
    select 1 from public.coalitions c
    where c.id = messages.coalition_id
      and (
        exists (
          select 1 from public.coalition_members cm
          where cm.coalition_id = c.id
            and cm.user_id = auth.uid()
            and cm.status = 'active'
        )
        or exists (
          select 1 from public.projects p
          where p.id = c.project_id
            and p.client_id = auth.uid()
        )
      )
  )
);

/* -------------------------------------------------------------------------- */
/* 2) coalitions / coalition_members: project-linked coalitions are private   */
/* -------------------------------------------------------------------------- */

-- Existing policies made every "active" coalition (and its members) visible
-- to ANY authenticated user — fine for the freelancer-initiated, project_id
-- IS NULL "team-up" coalitions this was built for (unchanged below), but a
-- project-linked coalition must stay scoped to the client + its own members
-- (item 16 of the request: "başka bir projenin coalition'ını görememeli").
drop policy if exists "Authenticated users can view active coalitions" on public.coalitions;

create policy "Authenticated users can view active coalitions"
on public.coalitions
for select
to authenticated
using (
  created_by = auth.uid()
  or (
    project_id is null
    and status = 'active'
  )
  or (
    project_id is not null
    and (
      exists (
        select 1 from public.projects p
        where p.id = coalitions.project_id
          and p.client_id = auth.uid()
      )
      or exists (
        select 1 from public.coalition_members cm
        where cm.coalition_id = coalitions.id
          and cm.user_id = auth.uid()
          and cm.status = 'active'
      )
    )
  )
);

drop policy if exists "Authenticated users can view active coalition members" on public.coalition_members;

create policy "Authenticated users can view active coalition members"
on public.coalition_members
for select
to authenticated
using (
  exists (
    select 1 from public.coalitions c
    where c.id = coalition_members.coalition_id
      and (
        c.created_by = auth.uid()
        or (c.project_id is null and c.status = 'active')
        or (
          c.project_id is not null
          and (
            exists (
              select 1 from public.projects p
              where p.id = c.project_id
                and p.client_id = auth.uid()
            )
            or exists (
              select 1 from public.coalition_members self
              where self.coalition_id = c.id
                and self.user_id = auth.uid()
                and self.status = 'active'
            )
          )
        )
      )
  )
);

-- One coalition per project — accept_project_placement() finds-or-creates
-- by project_id, this is the DB-level guarantee against a race producing
-- two coalitions for the same project.
create unique index if not exists coalitions_project_id_unique
  on public.coalitions (project_id)
  where project_id is not null;

/* -------------------------------------------------------------------------- */
/* 3) accept_project_placement: also form/extend the project's coalition      */
/* -------------------------------------------------------------------------- */

create or replace function public.accept_project_placement(
  p_source text,
  p_source_id uuid
)
returns table (member_id uuid, project_id uuid, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_project_id uuid;
  v_freelancer_id uuid;
  v_role text;
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
    select i.project_id, i.freelancer_id, i.role
      into v_project_id, v_freelancer_id, v_role
    from project_team_invitations i
    where i.id = p_source_id
      and i.freelancer_id = v_caller
      and i.status = 'pending'
    for update of i;

    if not found then
      raise exception 'invitation_not_found_or_not_pending';
    end if;
  else
    select p.project_id, p.freelancer_id, p.role
      into v_project_id, v_freelancer_id, v_role
    from proposals p
    where p.id = p_source_id
      and p.status = 'pending'
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
    project_id, freelancer_id, role, invitation_id, proposal_id, joined_via, status
  ) values (
    v_project_id,
    v_freelancer_id,
    v_role,
    case when p_source = 'invitation' then p_source_id else null end,
    case when p_source = 'proposal' then p_source_id else null end,
    p_source,
    'active'
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

  /*
   * Team project -> coalition + team conversation.
   *
   * Find-or-create is race-safe: coalitions_project_id_unique + ON CONFLICT
   * means a concurrent acceptance for the same project (e.g. two roles
   * accepted at once) never produces two coalitions — the loser of the
   * race just re-selects the winner's row.
   */
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

    -- Always ensure the client is a member row too (idempotent), whether
    -- the coalition was just created here or already existed (e.g. the
    -- client pre-created it manually from /client/coalitions).
    insert into coalition_members (coalition_id, user_id, role, status)
    values (v_coalition_id, v_client_id, 'owner', 'active')
    on conflict (coalition_id, user_id) do nothing;

    insert into coalition_members (coalition_id, user_id, role, status)
    values (v_coalition_id, v_freelancer_id, 'member', 'active')
    on conflict (coalition_id, user_id) do nothing;

    insert into notifications (user_id, type, title, message, link)
    values
      (
        v_freelancer_id,
        'coalition_member_added',
        'Ekibe dahil oldun',
        '"' || coalesce(v_project_title, 'Proje') || '" ekip projesine dahil edildin.',
        '/freelancers/coalitions/' || v_coalition_id
      ),
      (
        v_client_id,
        'coalition_member_added',
        'Ekip güncellendi',
        'Bir freelancer "' || coalesce(v_project_title, 'proje') || '" ekibine katıldı.',
        '/client/coalitions/' || v_coalition_id
      );
  end if;

  return query select v_new_member_id, v_project_id, v_role;
end;
$$;

grant execute on function public.accept_project_placement(text, uuid) to authenticated;
