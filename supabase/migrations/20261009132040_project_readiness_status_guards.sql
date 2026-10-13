-- Enforce the project readiness and completion invariants at the database boundary.
-- UI checks are useful guidance, but must not be the only protection for status changes.
create or replace function private.enforce_project_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_members integer;
  v_role jsonb;
  v_role_name text;
  v_capacity integer;
  v_filled integer;
  v_required_members integer := 0;
  v_is_team boolean := false;
  v_has_role_breakdown boolean := false;
begin
  if auth.uid() is null
    or coalesce(current_setting('collacrew.system_write', true), '') = 'on'
    or new.status is not distinct from old.status then
    return new;
  end if;

  if old.status in ('completed', 'cancelled') then
    raise exception 'Tamamlanan veya iptal edilen projenin durumu değiştirilemez.' using errcode = 'P0001';
  end if;

  if new.status = 'ready_to_start' and old.status <> 'open' then
    raise exception 'Ekip hazır durumu yalnızca açık projede oluşturulabilir.' using errcode = 'P0001';
  end if;

  -- Check both when marking ready and immediately before work starts. A member
  -- may leave after the project was marked ready, so ready_to_start alone is stale.
  if new.status in ('ready_to_start', 'in_progress') then
    select count(*) into v_active_members
    from public.project_team_members m
    where m.project_id = new.id and m.status = 'active';

    v_has_role_breakdown := case
      when jsonb_typeof(new.budget_breakdown) = 'array' then jsonb_array_length(new.budget_breakdown) > 0
      else false
    end;
    v_is_team := coalesce(new.team_required, false) or v_has_role_breakdown;

    if v_has_role_breakdown then
      for v_role in select value from jsonb_array_elements(new.budget_breakdown)
      loop
        v_role_name := lower(trim(coalesce(v_role->>'role', v_role->>'name', '')));
        v_capacity := case
          when coalesce(v_role->>'memberCount', '') ~ '^[0-9]+$'
            then greatest((v_role->>'memberCount')::integer, 1)
          else 1
        end;

        select count(*) into v_filled
        from public.project_team_members m
        where m.project_id = new.id
          and m.status = 'active'
          and lower(trim(coalesce(m.role, ''))) = v_role_name;

        v_required_members := v_required_members + v_capacity;
        if v_role_name = '' or v_filled <> v_capacity then
          raise exception 'Tüm rol kontenjanları dolmadan proje başlatılamaz.' using errcode = 'P0001';
        end if;
      end loop;
      if v_active_members <> v_required_members then
        raise exception 'Aktif ekip üyeleri rol kontenjanlarıyla eşleşmiyor.' using errcode = 'P0001';
      end if;
    elsif coalesce(new.team_required, false) then
      if v_active_members <> greatest(coalesce(new.team_size, 1), 1) then
        raise exception 'Ekip üyesi sayısı proje için gereken kişi sayısıyla eşleşmiyor.' using errcode = 'P0001';
      end if;
    elsif v_active_members < 1 then
      raise exception 'Proje başlatılmadan önce bir freelancer kabul edilmelidir.' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'in_progress' then
    if old.status <> 'ready_to_start' then
      raise exception 'Proje yalnızca ekip hazır olduğunda başlatılabilir.' using errcode = 'P0001';
    end if;
    if new.requirements_confirmed_at is null then
      raise exception 'Projeyi başlatmadan önce gereksinimlerin hazır olduğunu onaylamalısın.' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'completed' then
    if old.status <> 'in_progress'
      or not exists (select 1 from public.project_milestones m where m.project_id = new.id)
      or exists (select 1 from public.project_milestones m where m.project_id = new.id and m.status <> 'approved') then
      raise exception 'Proje yalnızca tüm aşamalar onaylandığında tamamlanabilir.' using errcode = 'P0001';
    end if;

    v_is_team := coalesce(new.team_required, false) or case
      when jsonb_typeof(new.budget_breakdown) = 'array' then jsonb_array_length(new.budget_breakdown) > 0
      else false
    end;
    if v_is_team and exists (
      select 1
      from public.project_team_members member
      where member.project_id = new.id
        and member.status = 'active'
        and not exists (
          select 1 from public.project_milestones milestone
          where milestone.project_id = new.id
            and milestone.freelancer_id = member.freelancer_id
        )
    ) then
      raise exception 'Her aktif ekip üyesinin en az bir onaylı aşaması olmalıdır.' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'cancelled' and old.status = 'in_progress' then
    raise exception 'Devam eden proje yalnızca iptal talebiyle iptal edilebilir.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;
-- A ready team can become incomplete if a member leaves or the client removes them.
-- Reopen it transactionally before work starts; once work has started, membership
-- changes must go through the cancellation/dispute workflow so work cannot be orphaned.
create or replace function private.guard_team_member_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_status text;
begin
  if old.status = 'active' and new.status <> 'active' then
    -- Serialize membership removal against the project's start transition.
    select p.status into v_project_status
    from public.projects p
    where p.id = old.project_id
    for update of p;

    if v_project_status = 'in_progress' then
      raise exception 'Devam eden projede ekip üyeliği değiştirilemez; önce proje işlemleri üzerinden talep oluştur.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.reopen_project_after_member_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'active' and new.status <> 'active' then
    update public.projects
    set status = 'open'
    where id = new.project_id and status = 'ready_to_start';
  end if;
  return new;
end;
$$;

drop trigger if exists project_team_members_guard_removal on public.project_team_members;
create trigger project_team_members_guard_removal
  before update of status on public.project_team_members
  for each row execute function private.guard_team_member_removal();

drop trigger if exists project_team_members_reopen_if_incomplete on public.project_team_members;
create trigger project_team_members_reopen_if_incomplete
  after update of status on public.project_team_members
  for each row execute function private.reopen_project_after_member_removal();
