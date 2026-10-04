-- Kök neden: proje bağlı bir coalition'da "active" bir coalition_members
-- satırının her zaman o projede karşılık gelen aktif bir
-- project_team_members (= gerçek proje rolü) satırı olacağı hiçbir yerde
-- garanti edilmiyordu. accept_project_placement() (davet/teklif kabulü)
-- bunu doğru sırayla yapıyor, ama iki ayrı kod yolu bunu atlıyordu:
--   1) app/freelancers/coalitions/page.tsx -> requestToJoin(): freelancer
--      coalition_members'a doğrudan {role: 'member', status: 'pending'}
--      insert ediyordu — proje rolü/kapasite hiç kontrol edilmiyordu.
--   2) app/client/coalitions/[id]/page.tsx -> handleApprove(): bu pending
--      satırı sadece status='active' yapıyordu — project_team_members'a
--      hiç dokunmuyordu.
-- Sonuç: coalition ekranında rolü olmayan "Üye" (fallback) üyeler.
-- (1) frontend'de kaldırıldı (freelancer artık mevcut, doğru rol+kapasite
-- kontrollü teklif akışını kullanıyor). Bu migration veri bütünlüğünü
-- DB seviyesinde garanti eder: hangi kod yolu denerse denesin, proje
-- rolü olmayan bir "active" coalition üyesi oluşturulamaz.

/* -------------------------------------------------------------------------- */
/* 1) Mevcut bozuk veriyi düzelt: rolü olmayan "active" üyeleri temizle       */
/* -------------------------------------------------------------------------- */

delete from coalition_members cm
using coalitions c
where cm.coalition_id = c.id
  and c.project_id is not null
  and cm.role = 'member'
  and cm.status = 'active'
  and not exists (
    select 1 from project_team_members m
    where m.project_id = c.project_id
      and m.freelancer_id = cm.user_id
      and m.status = 'active'
  );

/* -------------------------------------------------------------------------- */
/* 2) Bundan sonra aynı durumun oluşmasını DB seviyesinde engelle             */
/* -------------------------------------------------------------------------- */

create or replace function private.enforce_coalition_member_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_has_role boolean;
begin
  -- Sadece proje rolü gerektiren durum: üye aktifleşiyor ve "owner" değil.
  if new.status <> 'active' or new.role = 'owner' then
    return new;
  end if;

  select c.project_id into v_project_id
  from coalitions c
  where c.id = new.coalition_id;

  -- project_id NULL olan serbest ("team-up") koalisyonlar bu kuralın dışında;
  -- onlarda proje rolü kavramı yok.
  if v_project_id is null then
    return new;
  end if;

  select exists (
    select 1 from project_team_members m
    where m.project_id = v_project_id
      and m.freelancer_id = new.user_id
      and m.status = 'active'
  ) into v_has_role;

  if not v_has_role then
    raise exception 'Bu kullanıcı için projede atanmış aktif bir rol yok. Önce davet veya teklifin kabul edilmesi gerekiyor.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists coalition_members_enforce_role_assignment on public.coalition_members;
create trigger coalition_members_enforce_role_assignment
  before insert or update on public.coalition_members
  for each row execute function private.enforce_coalition_member_role_assignment();
