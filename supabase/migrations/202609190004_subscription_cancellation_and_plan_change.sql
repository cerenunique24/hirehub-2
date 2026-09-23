-- Subscription cancellation / reactivation / plan-change UX.
--
-- Reuses the existing `subscriptions` table. `billing_cycle` already
-- exists (equivalent of "billing_period" — no duplicate added).

alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz;

-- my_subscription_status(): now also returns billing_cycle,
-- cancel_at_period_end, canceled_at and the RAW stored plan (even if
-- expired) so the UI can distinguish "never subscribed" from
-- "subscription expired" and offer to reactivate to the right tier.
drop function if exists public.my_subscription_status();

create or replace function public.my_subscription_status()
returns table(
  plan text,
  raw_plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  trial_used boolean,
  billing_cycle text,
  cancel_at_period_end boolean,
  canceled_at timestamptz
)
language sql
stable security definer
set search_path to 'public'
as $$
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
$$;

-- start_plan_trial: now also records which billing cycle was chosen,
-- and clears any previous cancellation state (fresh start).
create or replace function public.start_plan_trial(target_plan text, target_billing_cycle text default 'monthly')
returns subscriptions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  existing public.subscriptions%rowtype;
  result public.subscriptions%rowtype;
begin
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
$$;

-- change_plan: for a user who ALREADY has an active plus/pro
-- subscription — lets them switch tier and/or billing cycle (ör. Plus
-- Aylık -> Pro Yıllık) without consuming/requiring trial_used. Does
-- NOT touch expires_at (they keep whatever time is left in the
-- current period) — there is no real payment provider to prorate
-- against yet.
create or replace function public.change_plan(target_plan text, target_billing_cycle text default 'monthly')
returns subscriptions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  existing public.subscriptions%rowtype;
  result public.subscriptions%rowtype;
begin
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
$$;

-- cancel_subscription: cancel_at_period_end = true — access continues
-- until expires_at, subscription row is NOT deleted, plan is NOT
-- dropped to free immediately.
create or replace function public.cancel_subscription()
returns subscriptions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  result public.subscriptions%rowtype;
begin
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
$$;

-- reactivate_subscription: undo a pending cancellation, only while
-- still within the paid period.
create or replace function public.reactivate_subscription()
returns subscriptions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  result public.subscriptions%rowtype;
begin
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
$$;

-- start_premium_trial: backward-compatible wrapper, now forwards to
-- the 2-arg start_plan_trial (defaults to monthly).
create or replace function public.start_premium_trial()
returns subscriptions
language sql
security definer
set search_path to 'public'
as $$
  select public.start_plan_trial('pro', 'monthly');
$$;

grant execute on function public.my_subscription_status() to authenticated;
grant execute on function public.start_plan_trial(text, text) to authenticated;
grant execute on function public.change_plan(text, text) to authenticated;
grant execute on function public.cancel_subscription() to authenticated;
grant execute on function public.reactivate_subscription() to authenticated;
grant execute on function public.start_premium_trial() to authenticated;

-- Old 1-arg overload no longer used by the frontend; drop to avoid
-- PostgREST ambiguity between start_plan_trial(text) and
-- start_plan_trial(text, text).
drop function if exists public.start_plan_trial(text);
