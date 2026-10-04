-- Coalition/ekip mantığı audit: "Ekipten Çıkarma" (client) ve "Ekipten
-- Ayrılma" (freelancer) akışları UI'da "Yakında" olarak stub'lanmıştı,
-- backend'de hiç karşılığı yoktu. project_team_members üzerinde
-- insert/update/delete zaten authenticated/anon'dan revoke edilmiş
-- (bkz. 202609300001_marketplace_security_hardening.sql, bölüm 2) —
-- bu yüzden tek yazma yolu accept_project_placement() gibi SECURITY
-- DEFINER bir RPC olmak zorunda. Bu migration o RPC'yi ekler ve ayrıca
-- davet oluşturma anında (accept anında değil) rol kapasitesi kontrolü
-- ekler (defense-in-depth: direkt API çağrısıyla dolu role davet
-- oluşturulamasın).

/* -------------------------------------------------------------------------- */
/* 1) Ekipten ayrılma (freelancer) / çıkarma (client)                         */
/* -------------------------------------------------------------------------- */

create or replace function public.leave_or_remove_team_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_project_id uuid;
  v_freelancer_id uuid;
  v_client_id uuid;
  v_project_title text;
  v_project_status text;
  v_coalition_id uuid;
  v_is_self boolean;
begin
  if v_caller is null then
    raise exception 'Bu işlemi yapmak için giriş yapmalısın.' using errcode = 'P0001';
  end if;

  select m.project_id, m.freelancer_id, p.client_id, p.title, p.status
    into v_project_id, v_freelancer_id, v_client_id, v_project_title, v_project_status
  from project_team_members m
  join projects p on p.id = m.project_id
  where m.id = p_member_id
    and m.status = 'active'
  for update of m;

  if not found then
    raise exception 'Bu ekip üyeliği bulunamadı veya zaten aktif değil.' using errcode = 'P0001';
  end if;

  if v_caller <> v_freelancer_id and v_caller <> v_client_id then
    raise exception 'Bu işlemi yapmaya yetkin yok.' using errcode = 'P0001';
  end if;

  if v_project_status in ('completed', 'cancelled') then
    raise exception 'Tamamlanmış veya iptal edilmiş bir projede ekip üyeliği değiştirilemez.' using errcode = 'P0001';
  end if;

  v_is_self := v_caller = v_freelancer_id;

  update project_team_members
    set status = 'removed'
    where id = p_member_id;

  select c.id into v_coalition_id
  from coalitions c
  where c.project_id = v_project_id;

  if v_coalition_id is not null then
    delete from coalition_members
    where coalition_id = v_coalition_id
      and user_id = v_freelancer_id;
  end if;

  insert into notifications (user_id, type, title, message, link, dedupe_key)
  values
    (
      v_client_id,
      'coalition_member_removed',
      case when v_is_self then 'Ekip üyesi ayrıldı' else 'Ekip üyesi çıkarıldı' end,
      case
        when v_is_self then 'Bir freelancer "' || coalesce(v_project_title, 'proje') || '" ekibinden ayrıldı. Boşalan rol için yeniden davet gönderebilirsin.'
        else 'Ekipten bir üye çıkardın.'
      end,
      case when v_coalition_id is not null then '/client/coalitions/' || v_coalition_id else '/client/coalitions' end,
      'team_member_removed:' || p_member_id || ':client'
    ),
    (
      v_freelancer_id,
      'coalition_member_removed',
      case when v_is_self then 'Ekipten ayrıldın' else 'Ekipten çıkarıldın' end,
      '"' || coalesce(v_project_title, 'proje') || '" projesindeki ekip üyeliğin sona erdi.',
      '/freelancers/coalitions',
      'team_member_removed:' || p_member_id || ':freelancer'
    )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end;
$$;

revoke execute on function public.leave_or_remove_team_member(uuid) from public, anon;
grant execute on function public.leave_or_remove_team_member(uuid) to authenticated;

/* -------------------------------------------------------------------------- */
/* 2) Davet oluşturma anında rol kapasitesi (defense-in-depth)                */
/* -------------------------------------------------------------------------- */

create or replace function private.enforce_invitation_role_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_breakdown jsonb;
  v_is_team boolean;
  v_capacity int;
  v_current_count int;
begin
  select pr.budget_breakdown into v_breakdown
  from projects pr
  where pr.id = new.project_id;

  v_is_team := v_breakdown is not null
    and jsonb_typeof(v_breakdown) = 'array'
    and jsonb_array_length(v_breakdown) > 0;

  if v_is_team then
    select coalesce((elem->>'memberCount')::int, 1)
      into v_capacity
    from jsonb_array_elements(v_breakdown) elem
    where lower(trim(coalesce(elem->>'role', elem->>'name', ''))) = lower(trim(coalesce(new.role, '')))
    limit 1;

    if v_capacity is null or v_capacity < 1 then
      v_capacity := 1;
    end if;
  else
    v_capacity := 1;
  end if;

  select count(*) into v_current_count
  from project_team_members m
  where m.project_id = new.project_id
    and m.status = 'active'
    and (
      (v_is_team and lower(trim(m.role)) = lower(trim(coalesce(new.role, ''))))
      or not v_is_team
    );

  if v_current_count >= v_capacity then
    raise exception 'Bu rol için kontenjan dolu.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists project_team_invitations_role_capacity on public.project_team_invitations;
create trigger project_team_invitations_role_capacity
  before insert on public.project_team_invitations
  for each row execute function private.enforce_invitation_role_capacity();
