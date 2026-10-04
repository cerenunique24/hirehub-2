-- Freelancers can save ("favorite") projects they discover and see them
-- again later in "Favorilerim". `target_type`/`target_id` leaves room to
-- favorite other entities later without a schema change, but only
-- 'project' is supported today (client -> freelancer favorites are a
-- separate, not-yet-built feature and are intentionally out of scope).
--
-- `target_id` references `public.projects` directly (not a generic
-- polymorphic FK) since 'project' is the only allowed target_type right
-- now — this gives us a real, enforced ON DELETE CASCADE instead of an
-- orphaned-row cleanup job. A future target_type would need its own
-- migration to relax this.
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('project')),
  target_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists favorites_user_target_idx
  on public.favorites (user_id, target_type, created_at desc);

alter table public.favorites enable row level security;

-- Favorites are a private "did I save this?" list — no one (including
-- other authenticated users) can read another user's favorites, and a
-- favorite count is never exposed publicly by this policy.
drop policy if exists "Users can view their own favorites" on public.favorites;
create policy "Users can view their own favorites"
on public.favorites for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can add their own favorites" on public.favorites;
create policy "Users can add their own favorites"
on public.favorites for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can remove their own favorites" on public.favorites;
create policy "Users can remove their own favorites"
on public.favorites for delete
to authenticated
using (user_id = auth.uid());
