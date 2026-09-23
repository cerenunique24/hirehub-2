-- project_roles / project_members tabloları KESİNLİKLE oluşturulmuyor.
-- Rol kapasitesi projects.budget_breakdown JSONB içinde tutulan mevcut
-- yapıdan okunuyor; gerçek ekip üyeliği project_team_members'ta.
--
-- Bu fonksiyon, davet kabul (freelancer) ve teklif kabul (client) akışlarının
-- ikisi tarafından da çağrılan TEK, atomik kapasite kontrolü + insert
-- noktasıdır. SECURITY DEFINER ile RLS'yi bypass eder ama içeride kendi
-- yetkilendirmesini (auth.uid() kontrolü) yapar; bu yüzden ne client'tan
-- gelen userId/projectId/role değerlerine ne de frontend kontrolüne güvenir.
--
-- Race-condition koruması: projects satırı FOR UPDATE ile kilitlenir, böylece
-- aynı proje için eşzamanlı iki kabul işlemi birbirini bekler ve ikinci
-- işlem, birincinin eklediği üyeyi görerek kapasiteyi yeniden değerlendirir.
-- Ayrıca project_team_members(project_id, freelancer_id) üzerindeki mevcut
-- UNIQUE kısıtı, aynı freelancer'ın aynı projeye iki kez eklenmesine karşı
-- ikinci bir güvenlik katmanı olarak zaten var.
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
  v_status text;
  v_breakdown jsonb;
  v_is_team boolean;
  v_capacity int;
  v_current_count int;
  v_duplicate_count int;
  v_new_member_id uuid;
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

  select pr.client_id, pr.status, pr.budget_breakdown
    into v_client_id, v_status, v_breakdown
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

  return query select v_new_member_id, v_project_id, v_role;
end;
$$;

grant execute on function public.accept_project_placement(text, uuid) to authenticated;
