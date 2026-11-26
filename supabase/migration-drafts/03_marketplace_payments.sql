-- DESIGN DRAFT. Validate on an isolated database before promoting to migrations.
-- The runtime has no repository/route binding to these tables.
begin;

create schema marketplace_finance;
revoke all on schema marketplace_finance from public, anon, authenticated;
grant usage on schema marketplace_finance to service_role;

create table marketplace_finance.allocations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  milestone_id uuid not null unique references public.project_milestones(id),
  client_id uuid not null references public.profiles(id),
  freelancer_id uuid not null references public.profiles(id),
  currency text not null check (currency = 'TRY'),
  principal_minor bigint not null check (principal_minor > 0),
  fee_minor bigint not null check (fee_minor >= 0),
  rate_bps integer not null check (rate_bps between 1 and 9999),
  created_at timestamptz not null default now(),
  check (fee_minor = round(principal_minor::numeric * rate_bps / 10000)),
  check (principal_minor::numeric + fee_minor <= 9007199254740991)
);

create table marketplace_finance.operations (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references marketplace_finance.allocations(id),
  parent_charge_id uuid,
  kind text not null check (kind in ('charge', 'refund', 'payout')),
  status text not null default 'created'
    check (status in ('created', 'pending', 'succeeded', 'failed', 'cancelled')),
  provider text not null check (provider <> ''),
  provider_reference text,
  request_key text not null check (request_key <> ''),
  principal_minor bigint not null check (principal_minor >= 0),
  fee_minor bigint not null check (fee_minor >= 0),
  amount_minor bigint generated always as (principal_minor + fee_minor) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (allocation_id, kind, request_key),
  unique (allocation_id, id),
  unique (provider, kind, provider_reference),
  foreign key (allocation_id, parent_charge_id)
    references marketplace_finance.operations(allocation_id, id),
  check ((kind = 'charge') = (parent_charge_id is null)),
  check (kind <> 'payout' or fee_minor = 0),
  check (principal_minor::numeric + fee_minor between 1 and 9007199254740991)
);

create unique index one_charge_per_allocation
  on marketplace_finance.operations(allocation_id)
  where kind = 'charge' and status in ('created', 'pending', 'succeeded');

create table marketplace_finance.provider_events (
  provider text not null,
  event_id text not null,
  operation_id uuid not null references marketplace_finance.operations(id) deferrable initially deferred,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table marketplace_finance.ledger_entries (
  operation_id uuid not null references marketplace_finance.operations(id),
  account text not null check (account in ('provider_clearing', 'freelancer_payable', 'platform_fee')),
  delta_minor bigint not null check (delta_minor <> 0),
  created_at timestamptz not null default now(),
  primary key (operation_id, account)
);

alter table marketplace_finance.allocations enable row level security;
alter table marketplace_finance.operations enable row level security;
alter table marketplace_finance.provider_events enable row level security;
alter table marketplace_finance.ledger_entries enable row level security;
revoke all on all tables in schema marketplace_finance from public, anon, authenticated, service_role;
grant select, insert on all tables in schema marketplace_finance to service_role;
grant update (status, provider_reference, updated_at) on marketplace_finance.operations to service_role;

-- Repository contract: obtain locks through a narrowly scoped transaction
-- role or RPC. In Postgres, SELECT FOR UPDATE needs UPDATE privilege on at
-- least one column. Do not grant browser roles write or lock access.
-- Confirm parent kind/status, ownership, eligibility and reservation caps in
-- the reservation transaction under an allocation lock. See design document.
commit;
