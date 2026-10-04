-- P1: Teklif rol uygunluğu şu ana kadar yalnızca app/api/proposals/route.ts
-- (API route) seviyesinde kontrol ediliyordu. Deterministic eşleştirme
-- motorunu (title/skill/portfolio ağırlıklı skorlama) veritabanı
-- seviyesinde yeniden yazmak bu turun kapsamı dışında — ama DB seviyesinde
-- GERÇEKTEN kontrol edilebilecek iki kural (rol projede var mı, kapasite
-- dolu mu) hiç korunmuyordu: bir freelancer RLS'i atlamadan, doğrudan
-- `proposals` tablosuna var olmayan bir rol adıyla veya zaten dolu bir rol
-- için teklif ekleyebiliyordu.
--
-- Bu trigger mevcut eşleştirme/skorlama mantığını DEĞİŞTİRMEZ; sadece
-- `accept_project_placement()` RPC'sinin kabul anında zaten uyguladığı
-- AYNI rol-varlığı + kapasite kuralını teklif OLUŞTURMA anında da uygular.
create or replace function private.enforce_proposal_role_validity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_breakdown jsonb;
  v_capacity int;
  v_active_count int;
  v_role text := trim(coalesce(new.role, ''));
begin
  if auth.uid() is null then
    return new;
  end if;

  select budget_breakdown into v_breakdown from projects where id = new.project_id;

  if v_breakdown is null or jsonb_typeof(v_breakdown) <> 'array' or jsonb_array_length(v_breakdown) = 0 then
    -- Tek freelancer / breakdown'suz proje: tek bir aktif üye sınırı.
    select count(*) into v_active_count
    from project_team_members
    where project_id = new.project_id and status = 'active';

    if v_active_count >= 1 then
      raise exception 'Bu proje zaten bir ekip üyesi kabul etti.' using errcode = 'P0001';
    end if;

    return new;
  end if;

  select coalesce((elem->>'memberCount')::int, 1) into v_capacity
  from jsonb_array_elements(v_breakdown) elem
  where lower(trim(coalesce(elem->>'role', elem->>'name', ''))) = lower(v_role)
  limit 1;

  if v_capacity is null then
    raise exception 'Seçilen rol bu projede bulunamadı.' using errcode = 'P0001';
  end if;

  select count(*) into v_active_count
  from project_team_members
  where project_id = new.project_id
    and status = 'active'
    and lower(trim(role)) = lower(v_role);

  if v_active_count >= v_capacity then
    raise exception 'Bu rol için kontenjan dolu.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists proposals_enforce_role_validity on public.proposals;
create trigger proposals_enforce_role_validity
  before insert on public.proposals
  for each row execute function private.enforce_proposal_role_validity();
