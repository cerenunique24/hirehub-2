-- P1: Bildirim sistemi sistematik 42501 (RLS) hatası.
--
-- Kök neden #1: notifications INSERT politikası, gönderenin alıcıyla
-- "meşru bir ilişkisi" olup olmadığını 4 ayrı EXISTS dalıyla (ekip üyeliği,
-- teklif, davet, mesaj) kontrol ediyordu. Yeni bir bildirim senaryosu bu
-- dallardan birine tam uymadığında (ör. aynı ekibin iki freelancer'ı
-- birbirine, ya da ilişki henüz oluşmamışken) INSERT RLS'i sessizce
-- reddediyordu — kullanıcıya üstü kapalı "Bildirim(ler) oluşturulamadı"
-- logu dışında hiçbir iz bırakmadan.
--
-- Kök neden #2 (daha kritik): `notifyUsers()` birden fazla alıcıya TEK bir
-- çok-satırlı INSERT ile yazıyor (ör. tüm ekibe "proje tamamlandı"). Postgres
-- RLS, WITH CHECK'i her satır için ayrı ayrı değerlendirir ama satırlardan
-- BİRİ reddedilirse TÜM INSERT ifadesi (dolayısıyla batch'teki diğer tüm
-- alıcılar için bildirim) geri alınır. Yani tek bir "ilişkisi tam
-- eşleşmeyen" alıcı, o olayı dinleyen HERKESİN bildirimini engelliyordu.
--
-- Çözüm: Tüm bildirim yazmaları artık `notify_users()` RPC'si üzerinden
-- geçer. RPC her alıcıyı TEK TEK, kendi alt-transaction'ında değerlendirir
-- (bir alıcı reddedilirse sadece o satır atlanır, diğerleri etkilenmez) ve
-- ilişki kontrolünü SECURITY DEFINER içinde (mevcut RLS dallarıyla AYNI
-- kurallar + ekip-içi freelancer-freelancer ilişkisi) uygular. Doğrudan
-- tablo INSERT politikaları DEĞİŞTİRİLMEDİ (savunma derinliği olarak
-- kalır) — bu sadece normal yazma yolunu RPC'ye taşır.
create or replace function private.has_notification_relation(p_sender uuid, p_recipient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_sender = p_recipient
    or private.is_admin()
    or exists (
      select 1 from project_team_members m
      join projects p on p.id = m.project_id
      where m.status = 'active'
        and ((p.client_id = p_sender and m.freelancer_id = p_recipient)
          or (m.freelancer_id = p_sender and p.client_id = p_recipient))
    )
    or exists (
      -- Aynı projenin iki aktif ekip üyesi (freelancer-freelancer).
      select 1 from project_team_members m1
      join project_team_members m2 on m2.project_id = m1.project_id
      where m1.status = 'active' and m2.status = 'active'
        and m1.freelancer_id = p_sender and m2.freelancer_id = p_recipient
    )
    or exists (
      select 1 from proposals pr
      join projects p on p.id = pr.project_id
      where (pr.freelancer_id = p_sender and p.client_id = p_recipient)
         or (p.client_id = p_sender and pr.freelancer_id = p_recipient)
    )
    or exists (
      select 1 from project_team_invitations inv
      where (inv.freelancer_id = p_sender and inv.client_id = p_recipient)
         or (inv.client_id = p_sender and inv.freelancer_id = p_recipient)
    )
    or exists (
      select 1 from messages msg
      where (msg.sender_id = p_sender and msg.receiver_id = p_recipient)
         or (msg.receiver_id = p_sender and msg.sender_id = p_recipient)
    )
    or exists (
      -- Aynı coalition'ın iki aktif üyesi.
      select 1 from coalition_members a
      join coalition_members b on b.coalition_id = a.coalition_id
      where a.status = 'active' and b.status = 'active'
        and a.user_id = p_sender and b.user_id = p_recipient
    );
$$;

revoke execute on function private.has_notification_relation(uuid, uuid) from public, anon, authenticated;

create or replace function public.notify_users(p_notifications jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_item jsonb;
  v_user_id uuid;
  v_inserted integer := 0;
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  if p_notifications is null or jsonb_typeof(p_notifications) <> 'array' then
    return 0;
  end if;

  for v_item in select * from jsonb_array_elements(p_notifications)
  loop
    begin
      v_user_id := (v_item->>'userId')::uuid;

      if v_user_id is null then
        continue;
      end if;

      if not (private.is_admin() or private.has_notification_relation(v_caller, v_user_id)) then
        -- Bu alıcı için ilişki kurulamadı: SADECE bu satır atlanır, batch'teki
        -- diğer alıcılar etkilenmez (eski çok-satırlı INSERT'in aksine).
        raise warning 'notify_users: % -> % için ilişki bulunamadı, atlandı.', v_caller, v_user_id;
        continue;
      end if;

      insert into notifications (user_id, type, title, message, link, dedupe_key)
      values (
        v_user_id,
        v_item->>'type',
        v_item->>'title',
        v_item->>'message',
        v_item->>'link',
        v_item->>'dedupeKey'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

      v_inserted := v_inserted + 1;
    exception when others then
      raise warning 'notify_users: % alıcısı için bildirim yazılamadı: %', v_user_id, sqlerrm;
    end;
  end loop;

  return v_inserted;
end;
$$;

revoke execute on function public.notify_users(jsonb) from public, anon;
grant execute on function public.notify_users(jsonb) to authenticated;
