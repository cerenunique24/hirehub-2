-- Pro client commission (12%) + per-project commission snapshot.
--
-- Rates (private.client_commission_rate — the single source of truth):
--   Free → 15% (standard) · Plus → 12% (existing) · Pro → 12%
-- A plan only counts while its subscription is effective: plan in
-- (plus, pro), status in (active, trial) and not past expires_at. A
-- cancel_at_period_end subscription keeps its rate until expires_at — the
-- same rule my_subscription_status() uses for feature access.
--
-- projects.commission_rate freezes the rate that applied when the project
-- was created. Later plan changes (Pro → Free, Free → Pro) never re-price an
-- existing project; milestone pricing reads this snapshot.

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
        and s.plan in ('plus', 'pro')
        and s.status in ('active', 'trial')
        and (s.expires_at is null or s.expires_at > now())
    ) then 0.12
    else 0.15
  end::numeric;
$$;

revoke all on function private.client_commission_rate(uuid) from public, anon, authenticated;

alter table public.projects
  add column if not exists commission_rate numeric(5, 4);

-- Existing projects were created before plan-based pricing existed: they keep
-- the standard rate that applied at the time.
update public.projects set commission_rate = 0.15 where commission_rate is null;

alter table public.projects
  alter column commission_rate set not null;

alter table public.projects
  drop constraint if exists projects_commission_rate_check;
alter table public.projects
  add constraint projects_commission_rate_check check (commission_rate > 0 and commission_rate < 1);

comment on column public.projects.commission_rate is
  'Client commission rate frozen at project creation (private.client_commission_rate). Never changes afterwards.';

create or replace function private.snapshot_project_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- Always derived server-side from the owner's effective subscription;
    -- a client-supplied value is ignored.
    new.commission_rate := private.client_commission_rate(new.client_id);
  else
    new.commission_rate := old.commission_rate;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_snapshot_commission on public.projects;
create trigger projects_snapshot_commission
  before insert or update on public.projects
  for each row execute function private.snapshot_project_commission();

-- Milestones are priced with their project's snapshot rate.
create or replace function private.apply_milestone_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
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

  select coalesce(p.commission_rate, private.client_commission_rate(p.client_id))
    into v_rate
  from public.projects p
  where p.id = new.project_id;

  new.freelancer_payout_amount := round(new.budget, 2);
  new.platform_fee_amount := round(new.budget * v_rate, 2);
  new.client_total_amount := round(new.budget, 2) + round(new.budget * v_rate, 2);
  return new;
end;
$$;
