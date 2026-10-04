-- P1: Soyisim gizliliği. Marketplace'te kullanıcılar birbirine ilk ad +
-- soyisimle gösteriliyordu; bu karşı tarafın gerçek kimliğini (ve dolayısıyla
-- platform dışı sosyal medya/arama ile bulunmasını) kolaylaştırıyordu.
-- Kural: backend'de gerçek ad+soyad tutulur, ama karşı tarafa SADECE ilk ad
-- gösterilir. Admin ve kullanıcının kendisi tam adı görür.
--
-- last_name sütunu artık genel SELECT grant'inden çıkarılır — bu salt UI
-- gizleme değil, PostgREST üzerinden doğrudan `select=last_name` ile de
-- okunamaz. İki güvenli okuma yolu kalır:
--   1. get_my_full_profile() — zaten var, çağıranın KENDİ satırını (tüm
--      kolonlarla) döner.
--   2. admin_get_profile_names(uuid[]) — bu migration'da eklenir, SADECE
--      admin için, verilen id listesindeki kullanıcıların ad/soyadını döner.
revoke select (last_name) on public.profiles from authenticated, anon;

create or replace function public.admin_get_profile_names(p_ids uuid[])
returns table(id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.first_name, p.last_name
  from public.profiles p
  where private.is_admin() and p.id = any(p_ids);
$$;

revoke execute on function public.admin_get_profile_names(uuid[]) from public, anon;
grant execute on function public.admin_get_profile_names(uuid[]) to authenticated;
