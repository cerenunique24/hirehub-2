-- Reconciliation: canlı DB'de var olup yerel migration dosyalarında tanımı
-- bulunmayan kritik objeler. Canlı DB source of truth'tur; bu migration
-- canlıdaki çalışan nesneleri YENİDEN YAZMAZ. Her obje yalnızca yoksa
-- oluşturulur (IF NOT EXISTS / to_regprocedure kontrolü). Böylece:
--   * canlıda: hiçbir şey değişmez (no-op)
--   * temiz bir clone'da: admin/moderasyon/contact-info/ödeme çekirdeği kurulur
-- Mevcut migration dosyaları değiştirilmedi.

/* -------------------------------------------------------------------------- */
/* 1) admin yetkisi kaynağı                                                    */
/* -------------------------------------------------------------------------- */

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_users'
      and policyname = 'Admins can view own admin record'
  ) then
    create policy "Admins can view own admin record"
      on public.admin_users for select
      using (user_id = (select auth.uid()));
  end if;
end
$policy$;

/* -------------------------------------------------------------------------- */
/* 2) moderasyon kayıtları (contact-info ihlal logu)                           */
/* -------------------------------------------------------------------------- */

create table if not exists public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  source_table text not null,
  source_column text not null,
  source_row_id uuid,
  snippet text not null,
  risk_reason text,
  status text not null default 'new',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint moderation_flags_status_check
    check (status = any (array['new'::text, 'reviewed'::text, 'actioned'::text, 'closed'::text]))
);

alter table public.moderation_flags enable row level security;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'moderation_flags'
      and policyname = 'Admins can view moderation flags'
  ) then
    create policy "Admins can view moderation flags"
      on public.moderation_flags for select
      using ((select private.is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'moderation_flags'
      and policyname = 'Admins can update moderation flags'
  ) then
    create policy "Admins can update moderation flags"
      on public.moderation_flags for update
      using ((select private.is_admin()))
      with check ((select private.is_admin()));
  end if;
end
$policy$;

/* -------------------------------------------------------------------------- */
/* 3) contact-info filtre fonksiyonları (yoksa oluştur)                        */
/* -------------------------------------------------------------------------- */

do $fn$
begin
  if to_regprocedure('private.contains_contact_info(text)') is null then
    execute $body$
create function private.contains_contact_info(input text)
returns boolean
language plpgsql
immutable
set search_path = public
as $function$
declare
  normalized text;
  candidate text;
  digits text;
begin
  if input is null or length(trim(input)) = 0 then
    return false;
  end if;

  normalized := lower(input);

  if normalized ~ '(whatsapp|\ywa[''’]?(dan|tan)\y|telegram|\ysignal\y|\ydiscord\y|\yskype\y|\yiban\y|\yeft\y|\yhavale\y|\ypapara\y|\ywise\y|\yrevolut\y|kripto\s*(cüzdan|para)|crypto\s*wallet|\yinstagram\y|\yfacebook\y|\ylinkedin\y|mailden\s*ulaş|mail\s*adresim|e[\s-]?posta(m|mı)?\s*(profil|adres)|özelden\s*(at|yaz|gönder)|numaramı|numara(nı|yı)?\s*(bırak|paylaş|at|ver)|\ycep\s*telefon)' then
    return true;
  end if;

  if normalized ~ '[a-z0-9._%+-]+\s*(@|\(\s*at\s*\)|\[\s*at\s*\])\s*[a-z0-9.-]+\s*(\.|\(\s*dot\s*\)|\s+nokta\s+)\s*[a-z]{2,}' then
    return true;
  end if;

  if normalized ~ '(https?://)?(www\.)?(wa\.me|t\.me|api\.whatsapp\.com|chat\.whatsapp\.com|discord\.gg|paypal\.me|payp\.al|buymeacoffee\.com|ko-fi\.com|streamelements\.com/tip)' then
    return true;
  end if;

  for candidate in
    select unnest(regexp_matches(normalized, 'tr[0-9 .\-]{20,32}', 'g'))
  loop
    digits := regexp_replace(candidate, '[^0-9]', '', 'g');
    if length(digits) >= 24 then
      return true;
    end if;
  end loop;

  for candidate in
    select unnest(regexp_matches(normalized, '[0-9][0-9 .\-]{7,28}[0-9]', 'g'))
  loop
    digits := regexp_replace(candidate, '[^0-9]', '', 'g');
    if (length(digits) in (10, 11) and (left(digits, 1) in ('0', '5')))
       or (length(digits) in (11, 12) and left(digits, 2) = '90') then
      return true;
    end if;
  end loop;

  return false;
end;
$function$
    $body$;
  end if;
end
$fn$;

do $fn$
begin
  if to_regprocedure('private.contact_info_category(text)') is null then
    execute $body$
create function private.contact_info_category(input text)
returns text
language plpgsql
immutable
set search_path = public
as $function$
declare
  normalized text;
  candidate text;
  digits text;
begin
  if input is null then
    return 'bilinmiyor';
  end if;

  normalized := lower(input);

  if normalized ~ '(whatsapp|\ywa[''’]?(dan|tan)\y|telegram|\ysignal\y|\ydiscord\y|\yskype\y|wa\.me|t\.me|discord\.gg)' then
    return 'mesajlaşma_uygulaması';
  end if;

  if normalized ~ '(\yiban\y|\yeft\y|\yhavale\y|\ypapara\y|\ywise\y|\yrevolut\y|kripto\s*(cüzdan|para)|crypto\s*wallet|paypal\.me|payp\.al)' then
    return 'ödeme_yönlendirmesi';
  end if;

  if normalized ~ '(\yinstagram\y|\yfacebook\y|\ylinkedin\y)' then
    return 'sosyal_medya';
  end if;

  if normalized ~ '[a-z0-9._%+-]+\s*(@|\(\s*at\s*\)|\[\s*at\s*\])\s*[a-z0-9.-]+\s*(\.|\(\s*dot\s*\)|\s+nokta\s+)\s*[a-z]{2,}'
     or normalized ~ 'mailden\s*ulaş|mail\s*adresim|e[\s-]?posta(m|mı)?\s*(profil|adres)' then
    return 'e-posta';
  end if;

  for candidate in select unnest(regexp_matches(normalized, 'tr[0-9 .\-]{20,32}', 'g')) loop
    digits := regexp_replace(candidate, '[^0-9]', '', 'g');
    if length(digits) >= 24 then
      return 'iban';
    end if;
  end loop;

  for candidate in select unnest(regexp_matches(normalized, '[0-9][0-9 .\-]{7,28}[0-9]', 'g')) loop
    digits := regexp_replace(candidate, '[^0-9]', '', 'g');
    if (length(digits) in (10, 11) and (left(digits, 1) in ('0', '5')))
       or (length(digits) in (11, 12) and left(digits, 2) = '90') then
      return 'telefon';
    end if;
  end loop;

  return 'diğer';
end;
$function$
    $body$;
  end if;
end
$fn$;

/* -------------------------------------------------------------------------- */
/* 4) ödeme geçiş kuralları (yoksa oluştur)                                    */
/* -------------------------------------------------------------------------- */

do $fn$
begin
  if to_regprocedure('private.is_valid_payment_transition(text,text)') is null then
    execute $body$
create function private.is_valid_payment_transition(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = public
as $function$
  select (p_from, p_to) in (
    ('pending', 'payment_initiated'),
    ('pending', 'cancelled'),
    ('payment_initiated', 'paid'),
    ('payment_initiated', 'payment_failed'),
    ('payment_initiated', 'cancelled'),
    ('paid', 'held'),
    ('payment_failed', 'payment_initiated'),
    ('payment_failed', 'cancelled'),
    ('held', 'payout_pending'),
    ('held', 'refund_pending'),
    ('held', 'cancelled'),
    ('payout_pending', 'paid_out'),
    ('payout_pending', 'held'),
    ('refund_pending', 'refunded'),
    ('refund_pending', 'partially_refunded'),
    ('refund_pending', 'held'),
    ('partially_refunded', 'refund_pending')
  );
$function$
    $body$;
  end if;
end
$fn$;

do $fn$
begin
  if to_regprocedure('private.enforce_payment_status_transition()') is null then
    execute $body$
create function private.enforce_payment_status_transition()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if TG_OP = 'UPDATE' and NEW.payment_status is distinct from OLD.payment_status then
    if not private.is_valid_payment_transition(OLD.payment_status, NEW.payment_status) then
      raise exception 'Geçersiz ödeme durumu geçişi: % -> %', OLD.payment_status, NEW.payment_status
        using errcode = 'P0001';
    end if;
  end if;
  return NEW;
end;
$function$
    $body$;
  end if;
end
$fn$;

drop trigger if exists milestones_payment_status_transition on public.project_milestones;
create trigger milestones_payment_status_transition
  before update on public.project_milestones
  for each row execute function private.enforce_payment_status_transition();

/* -------------------------------------------------------------------------- */
/* 5) admin RPC'leri (yoksa oluştur)                                           */
/* -------------------------------------------------------------------------- */

do $fn$
begin
  if to_regprocedure('public.admin_count_profiles()') is null then
    execute $body$
create function public.admin_count_profiles()
returns table(total_count bigint, freelancer_count bigint, client_count bigint)
language sql
stable
security definer
set search_path = public
as $function$
  select
    count(*),
    count(*) filter (where role = 'freelancer'),
    count(*) filter (where role = 'client')
  from public.profiles
  where private.is_admin();
$function$
    $body$;
  end if;

  if to_regprocedure('public.admin_list_profiles()') is null then
    execute $body$
create function public.admin_list_profiles()
returns setof profiles
language sql
stable
security definer
set search_path = public
as $function$
  select * from public.profiles where private.is_admin();
$function$
    $body$;
  end if;
end
$fn$;

revoke execute on function public.admin_count_profiles() from public, anon;
revoke execute on function public.admin_list_profiles() from public, anon;
