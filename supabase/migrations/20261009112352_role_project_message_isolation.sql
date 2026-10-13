-- Additive, non-destructive isolation fixes. Existing message rows stay unchanged.

alter table public.messages
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists messages_project_id_created_at_idx
  on public.messages (project_id, created_at)
  where project_id is not null;

create or replace function private.can_view_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        p.client_id = auth.uid()
        or p.status = 'open'
        or exists (
          select 1 from public.proposals pr
          where pr.project_id = p.id and pr.freelancer_id = auth.uid()
        )
        or exists (
          select 1 from public.project_team_members tm
          where tm.project_id = p.id
            and tm.freelancer_id = auth.uid()
            and tm.status = 'active'
        )
      )
  );
$$;

revoke all on function private.can_view_project(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_view_project(uuid) to authenticated;

drop policy if exists "Authenticated users can view relevant projects" on public.projects;
create policy "Authenticated users can view relevant projects"
  on public.projects for select to authenticated
  using (private.can_view_project(id));

create or replace function private.can_send_direct_message(
  p_receiver_id uuid,
  p_proposal_id uuid,
  p_project_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
stable
as $$
declare
  v_sender_id uuid := auth.uid();
  v_sender_role text;
  v_receiver_role text;
  v_project_client_id uuid;
  v_project_status text;
  v_proposal_project_id uuid;
begin
  if v_sender_id is null or p_receiver_id is null or p_receiver_id = v_sender_id then
    return false;
  end if;

  select role into v_sender_role from public.profiles where id = v_sender_id;
  select role into v_receiver_role from public.profiles where id = p_receiver_id;

  if not ((v_sender_role = 'client' and v_receiver_role = 'freelancer')
       or (v_sender_role = 'freelancer' and v_receiver_role = 'client')) then
    return false;
  end if;

  if p_proposal_id is not null then
    select pr.project_id into v_proposal_project_id
    from public.proposals pr
    join public.projects p on p.id = pr.project_id
    where pr.id = p_proposal_id
      and (
        (v_sender_role = 'freelancer' and pr.freelancer_id = v_sender_id and p.client_id = p_receiver_id)
        or (v_sender_role = 'client' and p.client_id = v_sender_id and pr.freelancer_id = p_receiver_id)
      );

    return v_proposal_project_id is not null
      and (p_project_id is null or p_project_id = v_proposal_project_id);
  end if;

  if p_project_id is not null then
    select client_id, status into v_project_client_id, v_project_status
    from public.projects where id = p_project_id;

    if not found then return false; end if;

    if v_sender_role = 'freelancer' then
      return v_project_client_id = p_receiver_id
        and v_project_status = 'open'
        and exists (
          select 1 from public.subscriptions s
          where s.user_id = v_sender_id
            and s.plan = 'pro'
            and s.status in ('active', 'trial')
            and (s.expires_at is null or s.expires_at > now())
        )
        and not exists (
          select 1 from public.proposals pr
          where pr.project_id = p_project_id and pr.freelancer_id = v_sender_id
        );
    end if;

    return v_project_client_id = v_sender_id
      and exists (
        select 1 from public.proposals pr
        where pr.project_id = p_project_id and pr.freelancer_id = p_receiver_id
      )
      or (
        v_project_client_id = v_sender_id
        and (
          exists (
            select 1 from public.project_team_members tm
            where tm.project_id = p_project_id
              and tm.freelancer_id = p_receiver_id and tm.status = 'active'
          )
          or exists (
            select 1 from public.project_team_invitations i
            where i.project_id = p_project_id
              and i.freelancer_id = p_receiver_id
              and i.status in ('pending', 'accepted')
          )
        )
      );
  end if;

  -- Existing legacy direct conversations may continue without guessed project links.
  return exists (
    select 1 from public.messages m
    where m.coalition_id is null
      and m.project_id is null
      and m.proposal_id is null
      and ((m.sender_id = v_sender_id and m.receiver_id = p_receiver_id)
        or (m.sender_id = p_receiver_id and m.receiver_id = v_sender_id))
  );
end;
$$;

revoke all on function private.can_send_direct_message(uuid, uuid, uuid) from public, anon;
grant execute on function private.can_send_direct_message(uuid, uuid, uuid) to authenticated;

drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and receiver_id is not null
    and coalition_id is null
    and private.can_send_direct_message(receiver_id, proposal_id, project_id)
  );
