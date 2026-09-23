-- Freelancer availability status.
--
-- profiles.availability already existed as a free-text field (Turkish
-- labels like "Tamamen müsait"), which the matching engine only
-- half-parsed. This migration adds a canonical enum column that the
-- system-workload UI and matching sort logic can rely on, while
-- keeping the legacy `availability` column untouched for backward
-- compatibility.

alter table public.profiles
  add column if not exists availability_status text
    check (availability_status in ('available', 'limited', 'unavailable')),
  add column if not exists available_from date,
  add column if not exists availability_note text,
  add column if not exists availability_updated_at timestamptz;

-- Backfill from the legacy free-text `availability` column for
-- freelancers only, so existing selections are preserved.
update public.profiles
set availability_status = case
  when availability ilike '%kısmen%' or availability ilike '%kismen%' or availability ilike '%partially%' then 'limited'
  when availability ilike '%kapalı%' or availability ilike '%kapali%' or availability ilike '%meşgul%' or availability ilike '%mesgul%' or availability ilike '%unavailable%' or availability ilike '%busy%' then 'unavailable'
  else 'available'
end
where role = 'freelancer' and availability_status is null;

alter table public.profiles
  alter column availability_status set default 'available';
