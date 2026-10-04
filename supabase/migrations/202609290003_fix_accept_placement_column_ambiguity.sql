-- Bug: accept_project_placement() has ALWAYS failed for TEAM projects
-- (budget_breakdown populated, multiple roles) since it was extended by
-- 202609240002_team_coalition_and_messaging.sql to also create/extend a
-- coalition. Reproduced directly against a real pending team-project
-- proposal:
--
--   ERROR: 42702: column reference "project_id" is ambiguous
--   DETAIL: It could refer to either a PL/pgSQL variable or a table column.
--   QUERY: insert into coalitions (..., project_id) values (...)
--     on conflict (project_id) where project_id is not null do nothing
--
-- Root cause: `RETURNS TABLE(member_id uuid, project_id uuid, role text)`
-- implicitly declares `project_id` as an OUT parameter/plpgsql variable
-- in the function's scope. That collides with the `coalitions.project_id`
-- column referenced inside the `ON CONFLICT (project_id) WHERE project_id
-- IS NOT NULL` clause specifically (Postgres's ambiguity check there is
-- stricter than for a plain INSERT target-column list, where it wasn't
-- flagged). This only ever triggered on the coalition-forming branch,
-- i.e. only for team/multi-role projects — single-freelancer acceptances
-- never hit this code path and kept working, which is why it went
-- unnoticed.
--
-- Fix: rename ONLY the colliding OUT column (project_id -> placement_
-- project_id). Nothing else changes — same body, same logic, same
-- locking, same inserts/updates, same notifications. Confirmed safe:
-- neither JS caller (app/client/proposals/page.tsx,
-- app/freelancers/proposals/page.tsx) reads the RPC's returned columns,
-- both only check `{ error }`. `return query select v_new_member_id,
-- v_project_id, v_role;` still matches positionally regardless of the
-- OUT column's name, so the function body is otherwise untouched.
create or replace function public.accept_project_placement(p_source text, p_source_id uuid)
returns table(member_id uuid, placement_project_id uuid, role text)
language plpgsql
security definer
set search_path to 'public'
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
