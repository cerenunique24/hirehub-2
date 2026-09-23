-- MVP kuralı: freelancer, bir teklif göndermeden client'a mesaj
-- gönderemez; Pro paketin pre_proposal_messaging entitlement'ı varsa
-- istisna. Bu kural daha önce (bkz. app/api/messages/send/route.ts)
-- sadece UYGULAMA KATMANINDA uygulanıyordu. Ama messages tablosunun
-- INSERT RLS politikası hâlâ salt `sender_id = auth.uid()` idi — yani
-- bu kural, sadece o ÖZEL API route'unu kullanan çağrılar için geçerliydi.
-- app/client/messages/page.tsx (client mesajlaşması) gibi tarayıcıdan
-- doğrudan `.from("messages").insert(...)` yapan HERHANGİ bir kod yolu,
-- ya da PostgREST'e doğrudan yapılan bir çağrı, bu kısıtlamayı tamamen
-- atlayabiliyordu — çünkü gerçek yetkilendirme sınırı hiçbir zaman
-- veritabanı seviyesinde değildi.
--
-- Bu migration, kuralı INSERT RLS politikasının içine taşıyarak asıl,
-- atlanamaz sınır hâline getirir. Client (freelancer olmayan) gönderen
-- için hiçbir kısıtlama yok — kural sadece freelancer gönderenler için
-- geçerli. Uygulama katmanındaki (/api/messages/send) kontrol KALDIRILMAZ:
-- o, kullanıcıya net bir hata mesajı göstermek için hâlâ gerekli, ama
-- artık asıl güvenlik sınırı burada.
drop policy if exists "Users can send messages" on public.messages;

create policy "Users can send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (
    -- Gönderen freelancer değilse (client) kısıtlama yok.
    not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'freelancer'
    )
    -- Freelancer: gerçekten kendine ait, alıcının projesine bağlı bir
    -- teklif üzerinden mesaj gönderiyorsa izinli (proposal'ın durumu
    -- önemli değil — var olması ve sahiplik/proje eşleşmesi yeterli,
    -- app/api/messages/send/route.ts'teki kuralla birebir aynı).
    or (
      proposal_id is not null
      and exists (
        select 1
        from public.proposals pr
        join public.projects proj on proj.id = pr.project_id
        where pr.id = messages.proposal_id
          and pr.freelancer_id = auth.uid()
          and proj.client_id = messages.receiver_id
      )
    )
    -- Pro freelancer: teklif öncesi mesajlaşma entitlement'ı.
    or exists (
      select 1 from public.subscriptions s
      where s.user_id = auth.uid()
        and s.plan = 'pro'
        and s.status in ('active', 'trial')
        and (s.expires_at is null or s.expires_at > now())
    )
  )
);
