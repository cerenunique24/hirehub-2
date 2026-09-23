-- HIREHUB_AUDIT_CONTEXT.md §6/§27: profiles/experiences SELECT policies
-- were `qual = true` for any authenticated (profiles) or even anonymous
-- (experiences) user, exposing every column (email, phone,
-- notification_preferences, profile_visibility, ...) of every profile.
--
-- Row-level visibility ("any authenticated user can see any profile row")
-- is intentional and stays — it's required by discover/matching/messaging/
-- proposals across the app. The real problem is COLUMN exposure, which RLS
-- (a row-level mechanism) cannot restrict conditionally by row on its own.
-- So this migration uses column-level GRANT/REVOKE (checked by Postgres
-- BEFORE RLS, so it holds even against direct REST calls, not just
-- app-level discipline) to limit what "someone else's row" ever exposes,
-- and adds a SECURITY DEFINER RPC so a user can still read the private
-- columns of their OWN row.

-- 1) Only these "directory" columns of ANY profile remain selectable by
--    authenticated users going forward. This list was derived by auditing
--    every cross-user profiles query in the app (discover, matching,
--    messaging, proposals, coalitions, premium comparison/shortlist) —
--    every column any of them actually reads is included here.
revoke select on public.profiles from authenticated, anon;

grant select (
  id,
  first_name,
  last_name,
  avatar_url,
  role,
  title,
  bio,
  skills,
  expertise,
  experience,
  work_types,
  languages,
  availability,
  availability_status,
  hourly_rate,
  hourly_rate_min,
  hourly_rate_max,
  profile_completion,
  city
) on public.profiles to authenticated;

-- 2) Escape hatch for "read my own full row" (email, phone,
--    notification_preferences, profile_visibility, portfolio_url,
--    country, company_name, website, sector, etc.) — columns intentionally
--    left out of the grant above. SECURITY DEFINER bypasses the caller's
--    own (now-restricted) column privileges; the `where id = auth.uid()`
--    filter is what keeps this scoped to the caller's own row.
create or replace function public.get_my_full_profile()
returns setof public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from public.profiles where id = auth.uid();
$$;

grant execute on function public.get_my_full_profile() to authenticated;

-- 3) experiences: no query anywhere in the app reads another user's
--    experience rows (only the owner's own profile-edit page does) — the
--    "everyone, including anonymous" SELECT policy was pure excess
--    exposure. Restrict to the owning freelancer.
drop policy if exists "Deneyimler herkes tarafından görüntülenebilir" on public.experiences;

create policy "Freelancer kendi deneyimini görüntüleyebilir"
on public.experiences
for select
using (auth.uid() = freelancer_id);

-- portfolio_items: intentionally left unchanged. Verified against
-- app/freelancers/[username]/page.tsx (the public freelancer profile page,
-- reachable while logged out) which reads portfolio_items for display —
-- its columns are freelancer-authored public showcase content, not PII,
-- so the existing public SELECT policy matches actual product intent.
