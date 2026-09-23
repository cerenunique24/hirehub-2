-- Free / Plus / Pro tiered plans.
--
-- Reuses the existing `subscriptions` table (no new table created) —
-- only widens `plan` from the old binary free/premium to a real
-- three-tier free/plus/pro model, and adds `billing_cycle` for the
-- monthly/yearly pricing toggle.

alter table public.subscriptions drop constraint if exists subscriptions_plan_check;

-- Existing 'premium' testers keep full access, mapped to 'pro'.
update public.subscriptions set plan = 'pro' where plan = 'premium';

alter table public.subscriptions add constraint subscriptions_plan_check
  check (plan in ('free', 'plus', 'pro'));

alter table public.subscriptions alter column plan set default 'free';

alter table public.subscriptions
  add column if not exists billing_cycle text
    check (billing_cycle in ('monthly', 'yearly'));

-- my_subscription_status(): returns the real tier (free/plus/pro)
-- directly instead of collapsing everything into a boolean "premium".
-- Expiry is still checked in the database, never on the frontend.
drop function if exists public.my_subscription_status();

create or replace function public.my_subscription_status()
returns table(plan text, status text, expires_at timestamptz, trial_used boolean, billing_cycle text)
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
    coalesce(s.status, 'active') as status,
    s.expires_at,
    coalesce(s.trial_used, false) as trial_used,
    s.billing_cycle
  from (select auth.uid() as id) u
  left join public.subscriptions s on s.user_id = u.id;
$$;

-- start_plan_trial(target_plan): generalized trial starter for
-- either 'plus' or 'pro' (7 days). No real payment infra exists yet —
-- this is the only way to reach a paid tier today.
create or replace function public.start_plan_trial(target_plan text)
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

  select * into existing from public.subscriptions where user_id = auth.uid();

  if existing.id is not null and existing.trial_used then
    raise exception 'Deneme süresi zaten kullanılmış.';
  end if;

  if existing.id is not null and existing.plan in ('plus', 'pro') and existing.status in ('active', 'trial')
    and (existing.expires_at is null or existing.expires_at > now()) then
    raise exception 'Zaten aktif bir paketin var.';
  end if;

  if existing.id is null then
    insert into public.subscriptions (user_id, plan, status, started_at, expires_at, trial_used)
    values (auth.uid(), target_plan, 'trial', now(), now() + interval '7 days', true)
    returning * into result;
  else
    update public.subscriptions
    set plan = target_plan, status = 'trial', started_at = now(), expires_at = now() + interval '7 days',
        trial_used = true, updated_at = now()
    where user_id = auth.uid()
    returning * into result;
  end if;

  return result;
end;
$$;

-- Backward-compatible wrapper — anything still calling
-- start_premium_trial() keeps working (defaults to 'pro').
create or replace function public.start_premium_trial()
returns subscriptions
language sql
security definer
set search_path to 'public'
as $$
  select public.start_plan_trial('pro');
$$;

grant execute on function public.start_plan_trial(text) to authenticated;
grant execute on function public.my_subscription_status() to authenticated;
grant execute on function public.start_premium_trial() to authenticated;
