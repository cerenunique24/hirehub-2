-- Faz 5, madde 4: contact-info filtresi messages.content için vardı
-- (bkz. 202610020002_messages_contact_info_guard.sql) ama attachment
-- dosya adı (messages.attachment_name) hiç kontrol edilmiyordu — bir
-- kullanıcı "ara-0555-123-4567.pdf" gibi bir dosya adıyla, mesaj metni
-- hiç yazmadan, filtreyi tamamen atlayabiliyordu. Aynı, zaten var olan
-- private.enforce_no_contact_info() fonksiyonu attachment_name için de
-- kullanılıyor (yeni bir mekanizma değil).
drop trigger if exists messages_attachment_name_no_contact_info on public.messages;
create trigger messages_attachment_name_no_contact_info
  before insert or update on public.messages
  for each row execute function private.enforce_no_contact_info('attachment_name');
