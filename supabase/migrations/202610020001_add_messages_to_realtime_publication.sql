-- Kök neden (Faz 2, madde 5): mesaj realtime'ı hiç çalışmıyordu çünkü
-- `messages` tablosu `supabase_realtime` publication'ına hiç eklenmemişti.
-- Navbar/mesajlaşma sayfalarındaki postgres_changes aboneliği (filter,
-- cleanup, vs.) kod tarafında zaten doğruydu — Postgres bu tablo için
-- hiç değişiklik olayı yayınlamadığından events hiçbir zaman gelmiyordu.
-- `notifications` tablosu zaten publication'daydı (bu yüzden bildirim
-- realtime'ı çalışıyordu, mesaj realtime'ı çalışmıyordu).
alter publication supabase_realtime add table public.messages;
