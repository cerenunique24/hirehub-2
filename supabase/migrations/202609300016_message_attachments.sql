-- P1: Mesaj composer'ındaki ataç (attachment) ikonu hiç bağlı değildi
-- (onClick yoktu) — messages.attachment_url/attachment_name/attachment_type
-- her zaman null yazılıyordu. Gerçek yükleme/okuma akışı burada kurulur.
--
-- Yükleme: `<gönderenin auth.uid()>/<uuid>-<dosya_adı>` yoluna, sadece o
-- kullanıcı kendi klasörüne yazabilir (avatars bucket'ındaki ile aynı
-- desen). Okuma: yalnızca o mesajın gönderen/alıcısı (ya da coalition
-- mesajıysa aktif coalition üyesi) — `messages.attachment_url = objects.name`
-- join'iyle (project-files bucket'ındaki ile aynı desen).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public = false;

create policy "Users can upload their own message attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-attachments'
    and name like (auth.uid())::text || '/%'
  );

create policy "Message participants can read message attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and (
      -- Yükleyen kendi dosyasını her zaman görebilir (mesaj henüz
      -- gönderilmemiş olsa bile — ör. gönderim başarısız olduysa).
      name like (auth.uid())::text || '/%'
      or exists (
        select 1 from messages m
        where m.attachment_url = objects.name
          and (
            m.sender_id = auth.uid()
            or m.receiver_id = auth.uid()
            or (m.coalition_id is not null and exists (
              select 1 from coalition_members cm
              where cm.coalition_id = m.coalition_id
                and cm.user_id = auth.uid()
                and cm.status = 'active'
            ))
          )
      )
    )
  );

create policy "Users can delete their own unattached message upload"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and name like (auth.uid())::text || '/%'
    and not exists (select 1 from messages m where m.attachment_url = objects.name)
  );

-- Ek güvenlik: bir mesajın attachment_url'i, o mesajı gönderenin KENDİ
-- yükleme klasörüne ait olmalı — aksi halde biri başka bir kullanıcının
-- (ör. farklı bir konuşmaya ait) dosya yolunu attachment_url olarak
-- göndererek, o mesajın alıcısına (SELECT politikası "mesajın alıcısı"
-- olmayı yeterli bulduğu için) başkasının dosyasını açtırabilirdi.
create or replace function private.enforce_message_attachment_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.attachment_url is not null
    and (storage.foldername(new.attachment_url))[1] <> new.sender_id::text then
    raise exception 'Ek dosya göndericiye ait değil.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_enforce_attachment_ownership on public.messages;
create trigger messages_enforce_attachment_ownership
  before insert or update on public.messages
  for each row execute function private.enforce_message_attachment_ownership();
