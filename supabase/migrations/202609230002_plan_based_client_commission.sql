-- Plan-based client commission (platform service fee).
--
-- Single source of truth for the rate: private.client_commission_rate().
--   Plus client (active/trial, not expired) → 12%
--   Free client                              → 15% (existing standard rate)
--   Pro client                               → 15% — no Pro rate has been
--     defined as a product decision, so the existing behaviour is kept.
--
-- The fee is charged to the client on top of the freelancer amount:
--   platform_fee   = amount × rate
--   client_total   = amount + platform_fee
--   freelancer_payout = amount
--
-- No payment provider is connected: payment_status stays 'pending'; these
-- columns are calculations only, not a record of a completed payment.

create or replace function private.client_commission_rate(p_client_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.subscriptions s
      where s.user_id = p_client_id
        and s.plan = 'plus'
        and s.status in ('active', 'trial')
        and (s.expires_at is null or s.expires_at > now())
    ) then 0.12
    else 0.15
  end::numeric;
$$;

revoke all on function private.client_commission_rate(uuid) from public, anon, authenticated;

-- The signed-in client's own rate (for UI previews). Never exposes another
-- user's subscription tier.
create or replace function public.my_commission_rate()
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş yapmalısınız.';
  end if;

  return private.client_commission_rate(auth.uid());
end;
$$;

revoke all on function public.my_commission_rate() from public, anon;
grant execute on function public.my_commission_rate() to authenticated;

-- Existing pricing RPC now uses the caller's plan-based rate instead of a
-- hard-coded 0.15. Signature and validation are unchanged.
create or replace function public.calculate_engagement_pricing(p_freelancer_amount numeric)
returns table(freelancer_amount numeric, platform_fee_amount numeric, client_total_amount numeric, fee_rate numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rate numeric := private.client_commission_rate(auth.uid());
begin
  if p_freelancer_amount is null or p_freelancer_amount <= 0 then
    raise exception 'Geçersiz tutar: tutar sıfırdan büyük olmalı.' using errcode = 'P0001';
  end if;

  if p_freelancer_amount > 10000000 then
    raise exception 'Geçersiz tutar: izin verilen üst sınırı aşıyor.' using errcode = 'P0001';
  end if;

  return query
  select
    p_freelancer_amount,
    round(p_freelancer_amount * v_rate, 2),
    p_freelancer_amount + round(p_freelancer_amount * v_rate, 2),
    v_rate;
end;
$$;

revoke all on function public.calculate_engagement_pricing(numeric) from public, anon;
grant execute on function public.calculate_engagement_pricing(numeric) to authenticated;

-- Milestone pricing is always computed server-side from the project owner's
-- plan. Client-supplied fee values on INSERT are overwritten; once a payment
-- has started (payment_status <> 'pending') the snapshot is never changed.
create or replace function private.apply_milestone_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_rate numeric;
begin
  if tg_op = 'UPDATE' and coalesce(old.payment_status, 'pending') <> 'pending' then
    new.platform_fee_amount := old.platform_fee_amount;
    new.freelancer_payout_amount := old.freelancer_payout_amount;
    new.client_total_amount := old.client_total_amount;
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.budget is not distinct from old.budget
    and old.platform_fee_amount is not null then
    -- Budget unchanged: keep the existing snapshot.
    new.platform_fee_amount := old.platform_fee_amount;
    new.freelancer_payout_amount := old.freelancer_payout_amount;
    new.client_total_amount := old.client_total_amount;
    return new;
  end if;

  if new.budget is null or new.budget <= 0 then
    new.platform_fee_amount := null;
    new.freelancer_payout_amount := null;
    new.client_total_amount := null;
    return new;
  end if;

  select p.client_id into v_client from public.projects p where p.id = new.project_id;
  v_rate := private.client_commission_rate(v_client);

  new.freelancer_payout_amount := round(new.budget, 2);
  new.platform_fee_amount := round(new.budget * v_rate, 2);
  new.client_total_amount := round(new.budget, 2) + round(new.budget * v_rate, 2);
  return new;
end;
$$;

drop trigger if exists project_milestones_apply_pricing on public.project_milestones;
create trigger project_milestones_apply_pricing
  before insert or update on public.project_milestones
  for each row execute function private.apply_milestone_pricing();

-- Backfill existing pending milestones. User triggers are bypassed only for
-- this statement (the milestone transition trigger requires an auth.uid()).
set local session_replication_role = replica;

update public.project_milestones m
set
  freelancer_payout_amount = round(m.budget, 2),
  platform_fee_amount = round(m.budget * private.client_commission_rate(p.client_id), 2),
  client_total_amount = round(m.budget, 2) + round(m.budget * private.client_commission_rate(p.client_id), 2)
from public.projects p
where p.id = m.project_id
  and m.budget > 0
  and coalesce(m.payment_status, 'pending') = 'pending'
  and m.platform_fee_amount is null;

set local session_replication_role = origin;
