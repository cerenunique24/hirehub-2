-- CollaCrew AI module: matchFreelancerToProjectRoles() calls Gemini
-- (reviewMatchPairs, lib/ai/semanticMatch.ts) for any role whose
-- deterministic score falls in the "ambiguous" band. That call had no
-- cache at all — reopening/refreshing the AI page (or the discover
-- detail page) re-ran the same Gemini call for the same freelancer+
-- project pair every time. This adds a small read-through cache,
-- keyed by (freelancer_id, project_id), storing the whole per-role
-- verdict map from the last Gemini batch call. TTL is enforced by the
-- caller (lib/ai/match-talent.ts), currently 24h.
--
-- The table itself grants NO policies to authenticated/anon — it is
-- pure internal cache, not user-facing data, and is only reachable
-- through the two SECURITY DEFINER functions below, which each check
-- that the caller is either the freelancer being matched or the
-- client who owns the project (the only two legitimate callers of
-- matchFreelancerToProjectRoles today). This mirrors the existing
-- SECURITY DEFINER pattern already used in this project (e.g.
-- get_my_full_profile(), accept_project_placement()).
create table if not exists public.ai_match_semantic_cache (
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  verdicts jsonb not null,
  computed_at timestamptz not null default now(),
  primary key (freelancer_id, project_id)
);

alter table public.ai_match_semantic_cache enable row level security;

create or replace function public.get_ai_match_semantic_cache(
  p_freelancer_id uuid,
  p_project_id uuid,
  p_max_age_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_verdicts jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;

  if auth.uid() <> p_freelancer_id
     and not exists (
       select 1 from public.projects
       where id = p_project_id and client_id = auth.uid()
     )
  then
    return null;
  end if;

  select verdicts into v_verdicts
  from public.ai_match_semantic_cache
  where freelancer_id = p_freelancer_id
    and project_id = p_project_id
    and computed_at > now() - make_interval(secs => p_max_age_seconds);

  return v_verdicts;
end;
$$;

grant execute on function public.get_ai_match_semantic_cache(uuid, uuid, integer) to authenticated;

create or replace function public.set_ai_match_semantic_cache(
  p_freelancer_id uuid,
  p_project_id uuid,
  p_verdicts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if auth.uid() <> p_freelancer_id
     and not exists (
       select 1 from public.projects
       where id = p_project_id and client_id = auth.uid()
     )
  then
    return;
  end if;

  insert into public.ai_match_semantic_cache (freelancer_id, project_id, verdicts, computed_at)
  values (p_freelancer_id, p_project_id, p_verdicts, now())
  on conflict (freelancer_id, project_id)
  do update set verdicts = excluded.verdicts, computed_at = excluded.computed_at;
end;
$$;

grant execute on function public.set_ai_match_semantic_cache(uuid, uuid, jsonb) to authenticated;
