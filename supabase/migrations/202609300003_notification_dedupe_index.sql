-- PostgREST upsert (`onConflict: "user_id,dedupe_key"`) kısmi (partial) unique
-- index'e çözülemez. NULL değerler unique index'te birbirinden farklı sayıldığı
-- için dedupe_key'i olmayan bildirimler bu index'ten etkilenmez; kısmi olmayan
-- index hem RPC'lerdeki `on conflict (user_id, dedupe_key) where dedupe_key is
-- not null` hem de istemci upsert'i için geçerlidir.
drop index if exists public.notifications_user_dedupe_key_idx;
create unique index notifications_user_dedupe_key_idx
  on public.notifications (user_id, dedupe_key);
