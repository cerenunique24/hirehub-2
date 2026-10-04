-- P1: check_rate_limit() hem anon hem authenticated tarafından doğrudan
-- çağrılabiliyordu, `p_key` serbest metin olduğundan herhangi biri başka
-- bir kullanıcının anahtarını (ör. "proposals_create:<victim-id>") tahmin
-- edip doldurarak o kullanıcıyı meşru isteklerinde kilitleyebiliyordu
-- (rate-limit DoS). Tüm çağıranlar zaten sadece Next.js route handler'ları
-- (lib/rateLimit.ts) — hiçbir tarayıcı bileşeni bu RPC'yi doğrudan
-- çağırmıyor. Bu yüzden aynı sunucuya-özel imza mekanizmasıyla
-- (private.check_server_secret, bkz. 202609300006) korunuyor: EXECUTE hâlâ
-- authenticated/anon'a açık (anonim careers/apply akışı bunu gerektiriyor;
-- PostgREST RPC yönlendirmesi için gerekli) ama doğru imza olmadan
-- fonksiyon hiçbir şey yapmadan hata fırlatır.
drop function if exists public.check_rate_limit(text, integer, integer);

create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer,
  p_server_secret text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'private', 'extensions'
as $$
declare
  v_count int;
begin
  if not private.check_server_secret('rate_limit', p_server_secret) then
    raise exception 'Bu işlem yalnızca sunucu tarafından yapılabilir.' using errcode = '42501';
  end if;

  delete from private.rate_limit_hits
  where rl_key = p_key and created_at < now() - (p_window_seconds || ' seconds')::interval;

  select count(*) into v_count
  from private.rate_limit_hits
  where rl_key = p_key and created_at >= now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max then
    return false;
  end if;

  insert into private.rate_limit_hits (rl_key) values (p_key);
  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer, text) to authenticated, anon;
