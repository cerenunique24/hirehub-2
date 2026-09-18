-- CollaCrew Premium — minimal subscription state model.
-- No payment gateway exists yet, so this table only tracks STATE
-- (free/trial/active/canceled/expired), never a fabricated "paid"
-- transaction. Real payment integration can later just update this
-- same table from a webhook, keeping the rest of the app unchanged.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'active' check (status in ('active', 'trial', 'canceled', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  trial_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE policy: all writes go through the
-- security-definer functions below (or, later, a payment-webhook
-- service role), never a raw client-side table write.

create or replace function public.my_subscription_status()
returns table (plan text, status text, expires_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select
    case
      when s.plan = 'premium' and s.status in ('active', 'trial')
        and (s.expires_at is null or s.expires_at > now())
      then 'premium'
      else 'free'
    end as plan,
    coalesce(s.status, 'active') as status,
    s.expires_at
  from (select auth.uid() as id) u
  left join public.subscriptions s on s.user_id = u.id;
$$;

grant execute on function public.my_subscription_status() to authenticated;

-- Self-serve 7 gunluk deneme: gercek bir odeme degil, ama gercek,
-- tek seferlik, durumu kalici sekilde degistiren bir islemdir.
create or replace function public.start_premium_trial()
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.subscriptions%rowtype;
  result public.subscriptions%rowtype;
begin
  select * into existing from public.subscriptions where user_id = auth.uid();

  if existing.id is not null and existing.trial_used then
    raise exception 'Deneme süresi zaten kullanılmış.';
  end if;

  if existing.id is not null and existing.plan = 'premium' and existing.status in ('active', 'trial')
    and (existing.expires_at is null or existing.expires_at > now()) then
    raise exception 'Zaten Premium üyeliğin var.';
  end if;

  if existing.id is null then
    insert into public.subscriptions (user_id, plan, status, started_at, expires_at, trial_used)
    values (auth.uid(), 'premium', 'trial', now(), now() + interval '7 days', true)
    returning * into result;
  else
    update public.subscriptions
    set plan = 'premium', status = 'trial', started_at = now(), expires_at = now() + interval '7 days', trial_used = true, updated_at = now()
    where user_id = auth.uid()
    returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function public.start_premium_trial() to authenticated;
