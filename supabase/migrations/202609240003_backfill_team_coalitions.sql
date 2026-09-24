-- One-time backfill: team projects that already had accepted team members
-- (via project_team_members) BEFORE accept_project_placement() started
-- forming coalitions (see 202609240002) never got one. Idempotent — safe
-- to re-run, and a no-op for every project that already has a coalition
-- (project_id is unique on coalitions) or has no active team members yet.
do $$
declare
  proj record;
  v_coalition_id uuid;
begin
  for proj in
    select p.id as project_id, p.client_id, p.title
    from projects p
    where p.budget_breakdown is not null
      and jsonb_typeof(p.budget_breakdown) = 'array'
      and jsonb_array_length(p.budget_breakdown) > 0
      and not exists (select 1 from coalitions c where c.project_id = p.id)
      and exists (
        select 1 from project_team_members m
        where m.project_id = p.id and m.status = 'active'
      )
  loop
    insert into coalitions (name, description, status, created_by, project_id)
    values (
      coalesce(proj.title, 'Proje') || ' Ekibi',
      'Bu ekip "' || coalesce(proj.title, 'proje') || '" projesi için otomatik oluşturuldu.',
      'active',
      proj.client_id,
      proj.project_id
    )
    on conflict (project_id) where project_id is not null do nothing
    returning id into v_coalition_id;

    if v_coalition_id is null then
      select id into v_coalition_id from coalitions where project_id = proj.project_id;
    end if;

    insert into coalition_members (coalition_id, user_id, role, status)
    values (v_coalition_id, proj.client_id, 'owner', 'active')
    on conflict (coalition_id, user_id) do nothing;

    insert into coalition_members (coalition_id, user_id, role, status)
    select v_coalition_id, m.freelancer_id, 'member', 'active'
    from project_team_members m
    where m.project_id = proj.project_id
      and m.status = 'active'
    on conflict (coalition_id, user_id) do nothing;
  end loop;
end;
$$;
