-- Proposal response/view tracking for Premium "Teklif Performans Analizi".
--
-- proposals.updated_at existed but nothing ever bumped it, and code in
-- app/client/proposals/page.tsx and app/freelancers/proposals/page.tsx
-- already tried to write a `responded_at` column that never actually
-- existed in the live schema (those writes were silently failing).
-- This migration adds the missing columns and makes `responded_at` /
-- `updated_at` reliable via a trigger, so response-time analytics can
-- be computed from real data without touching every existing mutation
-- call site (accept/reject/cancel flows keep working unchanged).

alter table public.proposals
  add column if not exists viewed_at timestamptz,
  add column if not exists responded_at timestamptz;

create or replace function public.set_proposals_response_metadata()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status = 'pending' and old.status <> 'pending' then
    new.responded_at = null;
  elsif old.status = 'pending' and new.status <> 'pending' and new.responded_at is null then
    new.responded_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists proposals_set_response_metadata on public.proposals;

create trigger proposals_set_response_metadata
before update on public.proposals
for each row
execute function public.set_proposals_response_metadata();
