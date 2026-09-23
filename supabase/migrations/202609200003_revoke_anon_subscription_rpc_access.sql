-- HIREHUB_AUDIT_CONTEXT.md §6/§27: several SECURITY DEFINER subscription/
-- entitlement RPCs were granted EXECUTE to `anon`, not just `authenticated`.
-- None of them trust a caller-supplied user id (they all key off auth.uid()),
-- but for an anonymous caller auth.uid() is NULL, and NULL is not rejected
-- by any of them explicitly:
--   - cancel_subscription / change_plan / reactivate_subscription /
--     increment_ai_extra_analysis_usage: `where user_id = auth.uid()` with
--     auth.uid() = null matches no row, so they just raise a generic
--     "no active subscription" exception today — not a data leak, but
--     anon has no legitimate reason to call an account-mutation RPC.
--   - my_subscription_status: returns a harmless default ('free'/'active')
--     for a null user — not a leak, but still has no legitimate anon caller.
--   - start_plan_trial: this one is an ACTUAL bug, not just excess
--     exposure. `subscriptions.user_id` is UNIQUE with a FK to profiles(id),
--     but both UNIQUE and FK constraints in Postgres allow an unlimited
--     number of NULL values. An anonymous caller reaches the
--     `existing.id is null` branch (no subscription row has user_id IS
--     NULL... until the first anon call creates one) and INSERTs a real
--     `subscriptions` row with `user_id = NULL, plan = 'pro' or 'plus',
--     status = 'trial', trial_used = true`. Repeated anonymous calls can
--     insert unlimited garbage trial rows with no rate limit.
--
-- Fix: revoke anon EXECUTE on all of these (authenticated keeps it,
-- unchanged), AND add an explicit `auth.uid() is null` guard inside each
-- function body as defense-in-depth — so even if a grant is loosened again
-- by mistake in the future, the function itself still refuses to act
-- without a real session, instead of silently matching zero rows or (worse)
-- inserting a nulled-out row. Business rules (trial length, caps, plan
-- values, price logic) are unchanged.

-- NOTE: these functions' actual anon-execute path was a grant to PUBLIC
-- (the empty-role `=X` ACL entry), which `anon` inherits from like every
-- other role — revoking from `anon` specifically is not enough. Revoking
-- from PUBLIC also revokes `authenticated`'s inherited access, which is
-- why `authenticated` is explicitly re-granted at the end of this file.
revoke execute on function public.cancel_subscription() from public;
revoke execute on function public.change_plan(text, text) from public;
revoke execute on function public.my_subscription_status() from public;
revoke execute on function public.reactivate_subscription() from public;
revoke execute on function public.start_plan_trial(text, text) from public;
revoke execute on function public.increment_ai_extra_analysis_usage() from public;

create or replace function public.cancel_subscription()
returns subscriptions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  result public.subscriptions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş yapmalısınız.';
  end if;

  update public.subscriptions
  set cancel_at_period_end = true, canceled_at = now(), updated_at = now()
  where user_id = auth.uid()
    and plan in ('plus', 'pro')
    and status in ('active', 'trial')
    and (expires_at is null or expires_at > now())
  returning * into result;

  if result.id is null then
    raise exception 'İptal edilecek aktif bir aboneliğin bulunamadı.';
  end if;

  return result;
end;
$function$;

create or replace function public.change_plan(target_plan text, target_billing_cycle text default 'monthly'::text)
returns subscriptions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  existing public.subscriptions%rowtype;
  result public.subscriptions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş yapmalısınız.';
  end if;

  if target_plan not in ('plus', 'pro') then
    raise exception 'Geçersiz paket: %', target_plan;
  end if;

  if target_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'Geçersiz fatura periyodu: %', target_billing_cycle;
  end if;

  select * into existing from public.subscriptions where user_id = auth.uid();

  if existing.id is null or existing.plan not in ('plus', 'pro') or existing.status not in ('active', 'trial')
    or (existing.expires_at is not null and existing.expires_at <= now()) then
    raise exception 'Aktif bir aboneliğin yok — önce bir paket seçmelisin.';
  end if;

  update public.subscriptions
  set plan = target_plan, billing_cycle = target_billing_cycle, cancel_at_period_end = false, canceled_at = null,
      updated_at = now()
  where user_id = auth.uid()
  returning * into result;

  return result;
end;
$function$;

create or replace function public.reactivate_subscription()
returns subscriptions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  result public.subscriptions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş yapmalısınız.';
  end if;

  update public.subscriptions
  set cancel_at_period_end = false, canceled_at = null, updated_at = now()
  where user_id = auth.uid()
    and cancel_at_period_end = true
    and (expires_at is null or expires_at > now())
  returning * into result;

  if result.id is null then
    raise exception 'Yeniden aktifleştirilecek bir iptal işlemi bulunamadı.';
  end if;

  return result;
end;
$function$;

create or replace function public.start_plan_trial(target_plan text, target_billing_cycle text default 'monthly'::text)
returns subscriptions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  existing public.subscriptions%rowtype;
  result public.subscriptions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş yapmalısınız.';
  end if;

  if target_plan not in ('plus', 'pro') then
    raise exception 'Geçersiz paket: %', target_plan;
  end if;

  if target_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'Geçersiz fatura periyodu: %', target_billing_cycle;
  end if;

  select * into existing from public.subscriptions where user_id = auth.uid();

  if existing.id is not null and existing.trial_used then
    raise exception 'Deneme süresi zaten kullanılmış.';
  end if;

  if existing.id is not null and existing.plan in ('plus', 'pro') and existing.status in ('active', 'trial')
    and (existing.expires_at is null or existing.expires_at > now()) then
    raise exception 'Zaten aktif bir paketin var.';
  end if;

  if existing.id is null then
    insert into public.subscriptions (user_id, plan, status, started_at, expires_at, trial_used, billing_cycle, cancel_at_period_end, canceled_at)
    values (auth.uid(), target_plan, 'trial', now(), now() + interval '7 days', true, target_billing_cycle, false, null)
    returning * into result;
  else
    update public.subscriptions
    set plan = target_plan, status = 'trial', started_at = now(), expires_at = now() + interval '7 days',
        trial_used = true, billing_cycle = target_billing_cycle, cancel_at_period_end = false, canceled_at = null,
        updated_at = now()
    where user_id = auth.uid()
    returning * into result;
  end if;

  return result;
end;
$function$;

create or replace function public.increment_ai_extra_analysis_usage()
returns table(count integer, limit_reached boolean, monthly_limit integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  sub record;
  current_month text := to_char(now(), 'YYYY-MM');
  stored_month text;
  new_count integer;
  cap integer;
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş yapmalısınız.';
  end if;

  select * into sub from public.subscriptions where user_id = auth.uid();

  if sub.id is null or sub.plan not in ('plus', 'pro') or sub.status not in ('active', 'trial')
     or (sub.expires_at is not null and sub.expires_at <= now()) then
    raise exception 'Bu özellik için aktif bir Plus/Pro aboneliğin yok.';
  end if;

  cap := case when sub.plan = 'pro' then 100 else 10 end;

  stored_month := to_char(coalesce(sub.ai_extra_analysis_reset_at, 'epoch'::timestamptz), 'YYYY-MM');

  if stored_month <> current_month then
    new_count := 1;
  else
    new_count := coalesce(sub.ai_extra_analysis_count, 0) + 1;
  end if;

  if new_count > cap then
    return query select coalesce(sub.ai_extra_analysis_count, 0), true, cap;
    return;
  end if;

  update public.subscriptions
  set ai_extra_analysis_count = new_count, ai_extra_analysis_reset_at = now(), updated_at = now()
  where user_id = auth.uid();

  return query select new_count, false, cap;
end;
$function$;

create or replace function public.my_subscription_status()
returns table(plan text, raw_plan text, status text, started_at timestamp with time zone, expires_at timestamp with time zone, trial_used boolean, billing_cycle text, cancel_at_period_end boolean, canceled_at timestamp with time zone)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş yapmalısınız.';
  end if;

  return query
  select
    case
      when s.plan in ('plus', 'pro') and s.status in ('active', 'trial')
        and (s.expires_at is null or s.expires_at > now())
      then s.plan
      else 'free'
    end as plan,
    coalesce(s.plan, 'free') as raw_plan,
    coalesce(s.status, 'active') as status,
    s.started_at,
    s.expires_at,
    coalesce(s.trial_used, false) as trial_used,
    s.billing_cycle,
    coalesce(s.cancel_at_period_end, false) as cancel_at_period_end,
    s.canceled_at
  from (select auth.uid() as id) u
  left join public.subscriptions s on s.user_id = u.id;
end;
$function$;

-- Re-affirm authenticated (and only authenticated) keeps EXECUTE on all six
-- — CREATE OR REPLACE preserves existing grants, this is just explicit.
grant execute on function public.cancel_subscription() to authenticated;
grant execute on function public.change_plan(text, text) to authenticated;
grant execute on function public.reactivate_subscription() to authenticated;
grant execute on function public.start_plan_trial(text, text) to authenticated;
grant execute on function public.increment_ai_extra_analysis_usage() to authenticated;
grant execute on function public.my_subscription_status() to authenticated;
