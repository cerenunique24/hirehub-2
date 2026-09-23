# HireHub / CollaCrew — Technical Audit Context

**Purpose**: a factual snapshot of the current implementation, for another developer/AI to read before making changes. Read-only audit — no application code was modified to produce this document. Severity tags used throughout: **CRITICAL / HIGH / MEDIUM / LOW / INCOMPLETE / INCONSISTENT**.

Repo root: `C:\Users\mcere\Desktop\hirehub-2`. Supabase project id: `vaxxlohxshquwihtwyxx` (id kept here only as a non-secret reference — no keys/credentials are included anywhere in this document).

---

## 1. Project Architecture

- Next.js (App Router, v16), TypeScript, Tailwind. No `tailwind.config.*`; styling via Tailwind v4 `@import` + `@theme inline` in `app/globals.css` and per-page inline literal classes (`text-[#222]` etc.) — there is no shared design-system/component-token file.
- Supabase for auth, Postgres (with RLS), and Storage. Two Supabase client factories: `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server, cookie-based session via `@supabase/ssr`).
- **No `middleware.ts` anywhere in the repo.** All route/auth protection is ad hoc, implemented per-page or per-API-route. [HIGH — see §7, §27]
- Almost all pages are `"use client"` components that fetch their own data in a `useEffect` via the browser Supabase client, rather than server components. This is a consistent (if not idiomatic-Next.js) pattern across the whole app.
- AI: Gemini via `lib/ai/gemini.ts` (`generateJson`, retry/fallback/quota handling). Despite living under `lib/ai/`, the **matching engine itself (`lib/ai/match-talent.ts`) is 100% deterministic/rule-based — no LLM call**. Only project-analysis (`analyze-project`) and two small helper endpoints (`improve-proposal`, `analyze-profile`, `generate-freelancer-title`, `recommend-crew`) call Gemini.
- Subscriptions: single `subscriptions` table + a set of `SECURITY DEFINER` Postgres RPCs, orchestrated through one central module `lib/premium.ts`. No real payment provider is integrated anywhere (see §8).
- `lib/auth/index.ts`, `lib/auth/permissions.ts`, `lib/auth/roles.ts`, `lib/auth/session.ts` are **all 0-byte empty files** — dead/abandoned scaffolding for a centralized auth module that was never built; the real "resolve user+role+plan" logic lives in `lib/premium.ts::getUserAccessContext()` instead. [MEDIUM — misleading dead code, §25]

---

## 2. Routes / Pages (non-exhaustive, high-signal subset)

### Active, real, linked
- `/` (`app/page.tsx`), `/login`, `/register`, `/register/freelancer/**` (signup funnel: setup → onboarding → verify → complete), `/register/client/**` (individual/company variants), `/auth/callback` (route handler).
- `/premium`, `/premium/checkout` — pricing/checkout, real subscription data.
- Client area (`app/client/*`, own layout+sidebar): `dashboard`, `create-project`, `projects`, `projects/[id]`, `projects/[id]/edit`, `freelancers`, `freelancers/[id]`, `proposals`, `coalitions`, `coalitions/[id]`, `messages`, `notifications`, `payments`, `settings`, `profile`, `ai`, `help`, `help/tickets/[id]`.
- Freelancer area (`app/freelancers/*`, own layout+sidebar): `dashboard`, `discover`, `discover/[id]`, `projects`, `projects/[id]`, `proposals`, `proposals/[id]`, `coalitions(+[id]/new)`, `freelancers` (peer directory), `earnings`, `performance`, `messages`, `notifications`, `settings`, `profile`, `ai`, `help(+tickets/[id])`, `[username]` (public profile).

### Orphaned / dead / duplicate — **[MEDIUM, §25]**
- `app/register/freelancer/dashboard/page.tsx` — hardcoded mock stats, not linked, superseded by `app/freelancers/dashboard`.
- `app/client/register/page.tsx` — static placeholder, no form logic, no inbound links; superseded by `app/register/client/*`.
- `app/jobs/page.tsx` — fully hardcoded mock job listings, zero Supabase usage, zero inbound links.
- `app/saved/page.tsx` — stub placeholder ("Your saved items will appear here"), no logic.
- `app/projects/page.tsx`, `app/projects/[id]/page.tsx` — stub duplicates of the real client/freelancer project pages.
- `app/notifications/page.tsx` — functional (real Supabase-backed) but **unreachable**; superseded by role-scoped `/client/notifications` and `/freelancers/notifications`.
- `app/client/invitations/page.tsx` — not linked from any sidebar; only referenced by an otherwise-unused `ROUTES.CLIENT.INVITATIONS` constant.
- `app/auth/role-selection/page.tsx` — never actually reached by `app/auth/callback/route.ts`'s redirect logic (which only ever targets `/register/freelancer/setup` or `/client/dashboard`).
- `app/register/client/setup/page.tsx` + `setup/details/page.tsx` — likely superseded by the `individual/setup` / `company/setup` variants (not confirmed linked).
- Ambiguous: `app/client/page.tsx` and `app/freelancers/page.tsx` (index pages) — purpose vs. their respective `/dashboard` unclear, not verified whether they redirect.

---

## 3. API Routes (`app/api/**/route.ts`)

| Route | Auth | Role check | Plan check | Notes |
|---|---|---|---|---|
| `POST /api/ai/analyze-profile` | **None** | — | — | Fully open Gemini proxy. |
| `POST /api/ai/generate-freelancer-title` | **None** | — | — | Fully open Gemini proxy. |
| `POST /api/ai/recommend-crew` | **None** | — | — | Fully open Gemini proxy. |
| `POST /api/ai/recommend-projects` | **None** | — | — | Creates a Supabase client but never calls `.auth.getUser()`; trusts raw body. |
| `POST /api/ai/analyze-project` | Base analysis intentionally open (documented); enrichment gated | client (enrichment only) | Plus/Pro (enrichment only) | Base `analysis` shape never changes by plan — see §18. |
| `POST /api/ai/match-talent` | Yes (401) | freelancer (403 else) | — | |
| `POST /api/ai/improve-proposal` | Yes via `requireFeatureAccess` | freelancer | Plus+ | Comment notes it previously had **no** gating at all. |
| `POST /api/messages/pre-proposal` | Yes via `requireFeatureAccess` | freelancer | Pro | Also checks project/client existence + blocks if a proposal already exists. Well-built — but see §17 for why it doesn't actually close the loophole. |
| `GET /api/premium/client/ai-shortlist` | Yes | client | Plus+ | |
| `POST /api/premium/client/freelancer-comparison` | Yes | client | Plus+ | |
| `GET /api/premium/client/project-analytics` | Yes | client | Plus+ | Returns unused `isAdvanced` boolean (see §25). |
| `GET /api/premium/performance` | Yes | freelancer | Plus+ | |
| `GET /api/premium/recommended-projects` | Yes | freelancer | Plus+ | |
| `POST /api/proposals` | Yes | freelancer | — (free-tier by design) | **The only** `.from("proposals").insert(` call site in the repo. Re-validates eligibility server-side via `matchFreelancerToProjectRoles`, ignores client-submitted role/score. |
| `GET/POST /api/ai/analyze-project` etc. | see above | | | |

**[HIGH]** Four Gemini-backed routes (`analyze-profile`, `generate-freelancer-title`, `recommend-crew`, `recommend-projects`) have **zero authentication** — open to anonymous abuse/cost exposure (no rate limiting visible anywhere either).

---

## 4. Database Tables & Relationships

21 tables in `public`, all with RLS **enabled** (`relrowsecurity = true` on every one).

| Table | Rows (at audit time) | Key relationships |
|---|---|---|
| `profiles` | 7 | PK = `id` (FK → `auth.users`). `role` check(freelancer/client). |
| `projects` | 3 | `client_id`→profiles. **`budget_breakdown` jsonb, nullable** — see §12. |
| `proposals` | 1 | `project_id`→projects, `freelancer_id`→profiles, `role_id`+`project_role_id`→`project_roles` (both always NULL in practice — dead columns, §25). |
| `project_roles` | 2 | **Legacy/dead** — see §25. |
| `project_members` | 0 | **Legacy/dead** — see §25. |
| `project_team_members` | 1 | `project_id`, `freelancer_id`→profiles, `role` (free text), `proposal_id`/`invitation_id`, `joined_via`. No `CREATE TABLE` migration exists for this table (base-schema gap, §5). |
| `project_team_invitations` | 0 | `project_id`, `client_id`→profiles, `freelancer_id`→profiles. |
| `subscriptions` | 6 (all `plan='pro', status='trial'` currently) | `user_id` **unique**→profiles. See §8. |
| `messages` | 2 | `sender_id`/`receiver_id`→profiles, `proposal_id`→proposals (nullable). |
| `support_tickets` | 1 | `user_id`→profiles, `related_project_id`→projects. |
| `support_ticket_messages` | 0 | `ticket_id`→support_tickets, `sender_id`→profiles. |
| `help_articles` | 7 | No FKs. `audience` check(client/freelancer/all). |
| `portfolio_items` | 1 | `freelancer_id`→profiles. |
| `experiences` | 1 | `freelancer_id`→profiles. |
| `notifications` | 0 | `user_id`→profiles. Doubles as the client dashboard's "activity feed" (§21). |
| `project_milestones` | 1 | `project_id`→projects. 6-state status enum. |
| `project_milestone_events` | 4 | `milestone_id`→project_milestones, `actor_id`→profiles. Append-only audit log. |
| `project_files` | 0 | `project_id`→projects, `milestone_id` nullable, `file_path` unique. |
| `user_consents` | 8 | `user_id`→`auth.users`. KVKK/terms tracking. |
| `coalitions` | 0 | `created_by`→profiles, `project_id` nullable→projects. |
| `coalition_members` | 0 | `coalition_id`→coalitions, `user_id`→profiles. |

---

## 5. Supabase Migrations

- **Local files** (`supabase/migrations/*.sql`, 11 total): `202609070001_project_files`, `202609070002_project_location_and_duration`, `202609180001_project_milestones`, `202609180002_milestone_history_and_support`, `202609180003_subscriptions`, `202609180004_freelancer_availability_status`, `202609190001_proposal_response_tracking`, `202609190002_tiered_subscription_plans`, `202609190003_proposal_competition_stats_rpc`, `202609190004_subscription_cancellation_and_plan_change`, `202609190005_ai_extra_analysis_usage`.
- **Remote applied migrations**: 13 total — includes two with **no local file**: `lock_down_milestone_trigger_fn` and `subscription_status_trial_used_v2`. **[HIGH]** Migration drift — the remote DB has been modified directly (or via a session without committing the SQL back to the repo) in at least two cases.
- **[HIGH] Base schema has zero migration history.** `profiles`, `projects`, `proposals`, `project_team_members`, `project_team_invitations`, `project_roles`, `project_members`, `messages`, `notifications`, `portfolio_items`, `experiences`, `user_consents`, `coalitions`, `coalition_members` all exist live with **no corresponding SQL anywhere in the repo**. Anyone trying to stand up a fresh environment from the migrations folder alone cannot reproduce the schema.

---

## 6. RLS Policies

RLS is ON for all 21 tables; no table found with RLS fully disabled.

**Correctly scoped** (spot-checked, not exhaustive): `subscriptions` (SELECT-only, `user_id = auth.uid()`, zero write policies — all writes forced through RPCs), `proposals` (freelancer sees own; client sees own-project's), `projects` (`status='open' OR client_id=auth.uid() OR freelancer_has_project_proposal(id)`), `project_files`/`project_milestones`/`project_team_members`/`project_team_invitations` (scoped to client-owner or active team member), `messages`/`notifications`/`support_tickets`/`user_consents`/`coalitions` (owner-scoped).

**Flagged — broad `qual = true` SELECT policies exposing PII:** **[MEDIUM]**
- `profiles` — `"Authenticated users can view profiles"`, `qual = true`. Any authenticated user (freelancer or client) can read **every column of every profile**, including `email`, `phone`, `hourly_rate`, `company_name`, `notification_preferences` — not scoped to actual counterparties (e.g. two freelancers who have never interacted can see each other's contact info and financial fields). RLS is row-level only; it cannot hide specific columns — a narrower view/RPC would be needed to truly restrict PII exposure at the column level.
- `experiences` — `"Deneyimler herkes tarafından görüntülenebilir"`, `qual = true`.
- `portfolio_items` — `"Portfolio herkes tarafından görüntülenebilir"`, `qual = true`.
- `help_articles` — `qual = true` (lower risk — non-sensitive content).

**Flagged — RPC grants broader than needed:** **[MEDIUM]**
`cancel_subscription()`, `change_plan()`, `reactivate_subscription()`, `start_plan_trial()`, `increment_ai_extra_analysis_usage()`, `my_subscription_status()`, `my_proposal_competition_stats()` are all granted to **`anon`**, not just `authenticated`. Since `subscriptions` has zero direct write RLS policies, correctness currently depends entirely on each function internally checking `auth.uid()` (not independently verified by reading `pg_proc.prosrc` in this audit — flagged as **unconfirmed**, not assumed-safe). The grants themselves should be tightened to `authenticated` only regardless.

**Database functions (`SECURITY DEFINER`)** — full list: `cancel_subscription()`, `change_plan(text,text)`, `reactivate_subscription()`, `start_plan_trial(text,text)`, `start_premium_trial()` (legacy wrapper), `increment_ai_extra_analysis_usage()`, `my_subscription_status()`, `my_proposal_competition_stats()`, `freelancer_has_project_proposal(uuid)` (used inside `projects` RLS), `handle_new_user()` / `handle_new_user_consents()` (auth.users triggers — create profile/consent rows on signup).

**Triggers**: `project_milestones_enforce_transition` (BEFORE UPDATE on `project_milestones`, calls `enforce_milestone_transition()`), `project_milestones_log_event` (AFTER UPDATE, calls `log_milestone_event()`), `project_team_members_updated_at`, `proposals_set_response_metadata` (BEFORE UPDATE on `proposals` — auto-stamps `updated_at`/`responded_at`, added this cycle because prior app code already tried writing `responded_at` before the column existed). Exact enforced state-machine rules inside `enforce_milestone_transition()`/`log_milestone_event()` were **not verified** (function source not read) — flagged as unconfirmed detail, not to be assumed.

---

## 7. Authentication & Authorization

- Standard `@supabase/ssr` browser/server client split. Role (`freelancer`/`client`) stored on `profiles.role`, set during the registration funnel — **not** by the OAuth callback.
- **[HIGH] No `middleware.ts` exists.** Every page/route re-implements its own "is there a user" check.
- **[MEDIUM] Inconsistent unauthenticated handling**: `app/freelancers/components/Sidebar.tsx` explicitly `router.replace("/login")` when no user; `app/client/components/Sidebar.tsx`'s equivalent effect **silently returns** with no redirect — an unauthenticated visitor can land on `/client/*` pages and see the shell render (with a placeholder name) instead of being bounced to login. Dashboards themselves do guard against `user=null` with an inline error message, but this is reimplemented per-page, not centrally guaranteed.
- `app/auth/callback/route.ts` uses an allow-listed `next` redirect target (good — avoids open-redirect), but as noted in §2, `role-selection` is dead code relative to this flow.

---

## 8. Subscription / Payment Logic

Table: `subscriptions` (see §4). Central module: `lib/premium.ts`. All mutations go through `SECURITY DEFINER` RPCs; no direct client writes are possible (no write RLS policy exists).

- `my_subscription_status()` — computes the **effective** `plan` (falls back to `'free'` if `expires_at` has passed even if the stored `plan` says otherwise), plus returns `raw_plan`, `billing_cycle`, `cancel_at_period_end`, `canceled_at`, `trial_used`.
- `start_plan_trial(plan, cycle)` — one-time only (`trial_used` guard), 7-day `expires_at`.
- `change_plan(plan, cycle)` — lets an **already active** plus/pro subscriber switch tier/cycle; does not touch `expires_at` (no proration, since there's no real payment to prorate against).
- `cancel_subscription()` — sets `cancel_at_period_end=true`; does **not** touch `plan`/`expires_at`/delete the row — access continues until period end (correct per intended product rule).
- `reactivate_subscription()` — undoes cancellation while still within the period.
- `increment_ai_extra_analysis_usage()` — monthly counter, cap 10 (plus) / 100 (pro), used only by the Plus/Pro AI-analysis enrichment (§18).

**[CRITICAL — by design, must be disclosed to any developer/stakeholder] No real payment provider is integrated anywhere.** Grep for `stripe`/`iyzico`/`paytr`/`paddle`/`lemonsqueezy` returns zero hits. The **only** way to reach `plus`/`pro` today is the self-service trial (`start_plan_trial`) or `change_plan` (switching between non-free tiers you already "have" via trial). `app/premium/checkout/page.tsx` renders a full checkout UI (plan/cycle/price/total) but its "Kart ile Öde" button is `disabled`, with copy stating payment isn't connected — this is **honestly disclosed in the UI**, not hidden, but it means: **`plan='plus'`/`'pro'` never corresponds to an actual charge in this system today.** Confirmed live: all 6 `subscriptions` rows in the DB are `plan='pro', status='trial'` — zero real "purchases" exist.

---

## 9. Free / Plus / Pro Feature Access

Central: `lib/premium.ts` — `FEATURE_MATRIX: Record<FeatureKey, {role, minPlan, label}>`, `canUseFeature(context, feature)` (pure, role-aware), `getUserAccessContext(supabase)` (server), `requireFeatureAccess(supabase, feature)` (one-line route gate), `usePremium()` hook (client) + `PremiumGate` component.

Enforcement confirmed **server-side** (not just UI-hidden) in every premium API route listed in §3.

**[INCOMPLETE] Feature keys registered in the matrix with zero actual implementation anywhere** (confirmed via repo-wide grep — appear only inside `lib/premium.ts` itself, never referenced by any route/component):
- Freelancer Pro: `premium_visibility`, `priority_ranking`.
- Client Plus: `budget_compatibility_analysis`, `talent_alerts`.
- Client Pro: `backup_talent_suggestions`, `team_insights`, `talent_pool`.
- `deep_talent_analysis`, `ai_analysis_extra_quota` — registered but never independently checked anywhere (the quota mechanic exists and works, but isn't gated by the `ai_analysis_extra_quota` key itself — it's driven directly by the `increment_ai_extra_analysis_usage` RPC call inside the `advanced_project_analysis` branch).
- `advanced_project_analytics` — the API (`/api/premium/client/project-analytics`) computes and returns an `isAdvanced` boolean for this, but the frontend (`components/premium/client/ProjectAnalyticsPanel.tsx`) **never reads it** — dead field, no UI differentiation between Plus and Pro project analytics exists despite the plan/pricing page claiming "Gelişmiş Project Analytics" as a Pro perk.

These are marketing claims (visible on `/premium`'s plan cards) with no backing implementation — a real gap between promised and delivered functionality per plan tier.

---

## 10–11. Freelancer / Client Flows (high-level)

- **Freelancer loop**: `/freelancers/discover` → `/freelancers/discover/[id]` (detail + proposal form + Plus "why matched" panel + Pro "message client before proposal" panel + Plus "AI proposal assistant") → `/freelancers/proposals` → on acceptance, appears in `/freelancers/dashboard` ("Aktif Projeler", filtered to `project_team_members` + `projects.status='in_progress'`) and `/freelancers/projects/[id]`.
- **Client loop**: `/client/create-project` (multi-step, AI-assisted) → `/client/projects`/`[id]` (manage, accept proposals via `/client/proposals`, Plus panels for Project Analytics/AI Shortlist) → team forms via acceptance (§16).
- Both dashboards (`app/freelancers/dashboard/page.tsx`, `app/client/dashboard/page.tsx`) are fully real-Supabase-data-driven — no mock/hardcoded values found in either.

---

## 12. Project Creation Flow — `app/client/create-project/page.tsx`

- `publishProject()` builds `budget_breakdown`: team mode → array of `{roleId, role, memberCount, budgetPerPerson, budget, duration, responsibilities, requiredSkills, preferredSkills}` (note: **no `skills` key, no `reason` key** — only `requiredSkills` is written). Single-freelancer mode → `budget_breakdown: []` (**empty array, not `null`**).
- `team_required` = boolean directly from `selectionMode === "team"` — unambiguous.
- **Field-name consistency verified against `lib/ai/match-talent.ts`**: no mismatch. The reader (`match-talent.ts`) merges `roleData.skills ?? []` with `roleData.requiredSkills ?? []`, so writing only `requiredSkills` is safely read; `budgetPerPerson`/`budget`/`duration`/`memberCount`/`role`/`roleId` names match exactly on both sides. **Confirms the product-rule concern ("matching scores should not show 0% due to field mismatch") is NOT currently manifesting from this particular writer/reader pair.**
- The `[]` vs `null` distinction for single-freelancer mode is harmless — both `teamReadiness.ts` and `match-talent.ts` treat empty-array and null/missing identically.

---

## 13. Project / Team Flow

State machine (`lib/projects/teamReadiness.ts` + `app/client/projects/[id]/page.tsx` + `components/projects/ProjectWorkroom.tsx`):
`open` → (`teamReadiness.ts`, once every budget-breakdown role's active `project_team_members` count meets its `memberCount` capacity) → `ready_to_start` → (client clicks "Projeyi Başlat" in `app/client/projects/[id]/page.tsx`) → `in_progress` → (all milestones approved, `ProjectWorkroom.tsx:317`) → `completed`.

This is **consistent** with `app/freelancers/dashboard/page.tsx`'s "active projects" filter (`status === 'in_progress'`) — no mismatch found here.

**No persisted "ProjectMatches" table/concept exists.** AI matching results are always computed on-demand (`matchFreelancerToProjectRoles`/`matchTalent`) and never written anywhere — confirmed via repo-wide grep for `project_matches`/`ProjectMatch`. This satisfies the product rule "ProjectMatches should remain separate from the actual accepted team" trivially, because matches are never persisted at all, so there's no risk of them being confused with `project_team_members` in storage (though it does mean there's no historical record of "who matched to what" over time, only "who was actually accepted").

---

## 14. Matching Flow — `lib/ai/match-talent.ts` + `lib/matching/roleEligibility.ts`

Two entry points, both fully deterministic (no LLM call):
1. `matchTalent()` — client→freelancer direction, used only during project creation (before a `projects` row exists). Now also computes `isEligibleForRole` per candidate and sorts eligible-first.
2. `matchFreelancerToProjectRoles(supabase, projectId, freelancerId)` — freelancer→project direction. Used by Discover list/detail, `POST /api/proposals` (re-validation), and `GET /api/premium/client/ai-shortlist`. Reads roles from `projects.budget_breakdown` JSONB exclusively — **`project_roles` is never read** (confirmed dead, §25).

Eligibility: `isEligibleForRole = familyCompatible(role, freelancer) && matchScore >= 40`. ~20 role families via keyword matching (architecture, design, marketing, development, data_science, 3 engineering sub-families, writing, project_management, video_photo, animation_3d, finance_accounting, legal, translation, voice_audio, hr_recruitment, sales_business, customer_support, education_training). If either side's text doesn't match any known family, the family gate is skipped (falls back to score-only) — a deliberate "don't unfairly block novel professions" tradeoff, but means truly unmapped/unusual role names always pass the family check regardless of actual relevance.

Budget/duration/matchingSkills fields are **omitted** (not zeroed) from the API response unless `isEligibleForRole === true` — confirmed the full `budget_breakdown` array is never sent to the client.

**Single-freelancer fallback**: when `budget_breakdown` is empty, a synthetic `{roleId: "fallback-single-role", role: "Tek Freelancer", ...}` role is injected and flows through the same scoring pipeline (with role-family-text comparison skipped in favor of general project-skill matching). Verified consistent end-to-end through Discover UI and the proposals API (both use the same `roleId`).

---

## 15–16. Proposal Flow & Acceptance / Team Assignment

**Submission** (`POST /api/proposals`, `app/api/proposals/route.ts`, the **only** `.from("proposals").insert(` call site in the entire repo): auth → `profiles.role === 'freelancer'` check → duplicate-proposal check → re-runs `matchFreelancerToProjectRoles()` server-side and only trusts its own computed `isEligibleForRole`/`role` (client-submitted score/role values are never trusted for the actual gating decision) → 403 if ineligible → insert. `bid_amount > 0` required, no upper bound tied to client budget (documented intentional decision). Table has `UNIQUE(project_id, freelancer_id)` as a DB-level backstop.

**Acceptance (proposal path)** — `app/client/proposals/page.tsx`, client-side (not an API route): checks project status open/ready_to_start → computes role capacity via `teamReadiness.ts::getRoleCapacity()` → queries existing active `project_team_members` for that role → blocks if full or if freelancer already an active member → updates proposal to 'accepted' (conditioned on still-'pending', race-safe against a *single* concurrent update) → inserts into `project_team_members` → reverts proposal on insert failure → rejects other pending proposals for the same role → calls `checkAndUpdateProjectReadiness()`.

**[CRITICAL] Race condition**: the capacity check-then-insert (SELECT then INSERT, two separate round trips, no transaction, no DB-level capacity constraint found in migrations) is vulnerable to a TOCTOU race — two near-simultaneous acceptances for the same single-capacity role could both pass the SELECT check before either INSERT lands, producing 2 team members where only 1 should exist.

**[CRITICAL] Acceptance (invitation path) skips the capacity check entirely** — `app/freelancers/proposals/page.tsx`'s `respondToInvitation()` accept branch inserts directly into `project_team_members` with **zero query of existing active members and no `getRoleCapacity()` call**, unlike the parallel proposal-acceptance code. If a client invites multiple freelancers to the same single-capacity role (or to a single-freelancer project) and more than one accepts, the project can end up over-filled. This is a genuine inconsistency between two code paths that should share one capacity-enforcing function and currently don't.

**[HIGH]** Both acceptance flows are client-side Supabase calls (not server API routes) relying entirely on RLS + application logic — no server-side transactional guarantee exists for either.

---

## 17. Messaging Permissions

Four `.from("messages").insert(` call sites in the repo:
1. `app/api/messages/pre-proposal/route.ts` — the dedicated, correctly-gated (Pro-only, `requireFeatureAccess`) pre-proposal route. Also checks project/client existence and blocks if a proposal already exists.
2. `components/proposals/ProposalMessages.tsx` — requires an existing `proposalId` prop; legitimate post-proposal messaging.
3. `app/client/messages/page.tsx` — client-side raw insert for clients messaging freelancers (not subject to the freelancer Pro restriction; lower risk by design).
4. **`app/freelancers/messages/page.tsx` (`sendMessage()`) — raw client-side insert.**

**[CRITICAL — genuine security/business-rule bypass, not merely a UI inconsistency]** `app/freelancers/messages/page.tsx` reads `selectedUserId`/`selectedProposalId` **directly and unconditionally from URL query params** (`?user=`, `?proposal=`) with no validation, then calls `sendMessage()` which inserts straight into `messages` client-side. The `messages` table's INSERT RLS policy is permissive (`sender_id = auth.uid()` only — no check tying the message to an existing proposal or checking the sender's plan). The code comment inside `pre-proposal/route.ts` itself acknowledges this exact risk ("the raw messages insert must NOT be used for the pre-proposal scenario") but **`app/freelancers/messages/page.tsx` was never updated to enforce it**. Net effect: **any authenticated freelancer, on any plan including Free, can navigate to `/freelancers/messages?user=<any-client-id>` and message that client with no prior proposal**, completely bypassing both the Pro paywall (`pre_proposal_messaging`) and the stated MVP restriction ("freelancer-to-client messaging before submitting a proposal is restricted"). **This directly contradicts an explicitly-stated intended product rule.**

---

## 18. AI Analysis Flow (Project Creation)

`app/client/create-project/page.tsx` → `POST /api/ai/analyze-project`. Base analysis has **always been callable unauthenticated** (pre-existing, documented, unchanged) — `buildPrompt()` asks Gemini only for `requiredRoles`, `requiredSkills`, `roleDetails[]`.

**[INCONSISTENT]** `types/ai.ts`'s `ProjectAnalysis` interface declares many more fields as non-optional (`summary`, `category`, `complexity`, `goals`, `keyRequirements`, `deliverables`, `estimatedTimeline`, `estimatedBudget`, `recommendedTeamSize`, `insights`, `recommendations`, `considerations`, `workingModels`) than the prompt actually requests or `validateProjectAnalysis()` actually enforces — these fields are `undefined` at runtime unless Gemini spontaneously includes them. The type overstates the guaranteed shape; consuming code must use optional chaining (the create-project page does: `analysis?.summary`).

**Plan-tiered enrichment** (`lib/ai/projectAnalysisEnrichment.ts`) is **purely deterministic post-processing** of the already-returned `analysis` — makes **no additional Gemini call**, so zero extra quota risk, and derives all figures from real AI output + the client's own brief (never fabricates numbers). Response shape is additive-only: `{analysis, advancedAnalysis, proAnalysis, aiUsage}` — `analysis` itself is byte-for-byte identical regardless of plan (live-verified across free/plus/pro in a prior session on this same codebase). Usage quota only increments when enrichment actually runs (Plus/Pro), never for Free.

**[MEDIUM — real infra constraint, not a code bug]** The configured Gemini API key is on a free tier with a hard **20 requests/day/model** cap — the base analysis has been observed to 503 intermittently for **all** users regardless of plan when this cap is hit. This is disclosed via `toSafeAiResponse`'s retryable-503 path, not silently swallowed, but it is a real availability risk for the core Free feature.

---

## 19. AI Matching Flow

See §14 — same file/logic (`lib/ai/match-talent.ts`), documented there in full to avoid duplication.

---

## 20. Profile Flows

`app/freelancers/profile/page.tsx` — had a live production bug this cycle: `profileForm.expertise.map is not a function`. **Root cause**: `profiles.expertise` is a plain `text` column (confirmed via DB audit — unlike `skills`/`work_types`/`languages` which really are Postgres `text[]`), but the save path previously sent a raw JS array directly to this `text` column, and at least one live row was found corrupted into a JSON-stringified character array. **Fix applied this cycle**: `lib/utils/normalizeStringArray.ts` defensively parses on every read (handles real arrays, JSON-stringified arrays, corrupted char-arrays, comma strings, null, single strings, objects) and `stringArrayToTextColumn()` always joins to a plain string on write. One corrupted row was manually repaired via a one-off SQL UPDATE (not a migration, since it was data-only). **[LOW — resolved, documented for awareness]**

Avatar upload (public bucket `avatars`), portfolio image upload (public bucket `portfolio-images`): both client-side-only validated (file type/size checks are JS, trivially bypassable by calling the Storage REST API directly with a valid session token — no server-side validation exists for either). **[MEDIUM, §23]**

---

## 21. Dashboard Flows

Both `app/freelancers/dashboard/page.tsx` and `app/client/dashboard/page.tsx` are fully real-data-driven (verified — no hardcoded numbers found in either). Client dashboard's "Son Aktiviteler" (recent activity) section directly queries the `notifications` table — **[LOW/INCONSISTENT]** `notifications` is doing double duty as both a notification inbox and a general activity feed; no separate activity-log table exists.

---

## 22. Support Flow

`lib/support.ts` (data helpers) + `components/support/HelpAndSupport.tsx` (FAQ + ticket list + create form) + `components/support/TicketDetail.tsx` (thread view + reply). End-to-end works for the **requesting user**: create → list → view → reply.

**[INCOMPLETE]** There is **no admin/staff interface anywhere in the codebase** (confirmed: zero matches for "admin" across `app/`, `components/`, `lib/`). `TicketDetail.tsx` shows no sender-role distinction (no staff badge/avatar). No UI writes `support_tickets.status` — status changes would have to happen directly against the database. The support flow is fundamentally one-sided: users can file and reply to their own tickets, but nothing in the product lets anyone respond as support staff.

A prior fix in `HelpAndSupport.tsx`'s `handleCreateTicket()` (re-checks `auth.getUser()` at submit time rather than trusting possibly-stale `userId` state) addresses a specific "ticket submission silently does nothing" failure mode — evidence this area was previously fragile, now hardened for that one case.

---

## 23. File / Upload Handling

Three Storage buckets: `project-files`, `avatars`, `portfolio-images`.
- `components/projects/ProjectFiles.tsx`: `project-files` bucket, path `${userId}/${projectId}/${uuid}-${filename}`, **signed URLs** (1hr expiry) for reads — good. Client-side-only 25MB size check, **no file-type allowlist at all**. Rolls back the storage object if the DB insert fails (good defensive pattern). `console.log` of upload metadata including `userId`/`projectId` — minor info leakage into browser console.
- Avatar/portfolio uploads (`app/freelancers/profile/page.tsx`): **public URLs** (appropriate for public-facing images). Client-side-only type/size checks (5MB avatar limit). Old-file cleanup on replace via fragile string-matching on the storage URL prefix.
- **[MEDIUM]** No server-side validation exists for ANY of the three upload paths — all enforcement is client-side JavaScript, bypassable by anyone calling the Storage REST API directly with a valid session token. Real enforcement would require Storage bucket policies (not present in this repo's tracked migrations — Storage policies, if any, live outside the reviewed SQL) or a server-side upload proxy.

---

## 24. Known Errors (fixed this development cycle, documented for traceability)

- `profileForm.expertise.map is not a function` — §20, root-caused and fixed.
- `profiles.expertise` data corruption (one row, JSON-stringified char-array) — manually repaired.
- `support_tickets` creation appearing to silently fail when `userId` state hadn't resolved yet — hardened in `HelpAndSupport.tsx`.
- `proposals.responded_at` was being written by app code before the column existed (silently failing) — column added + trigger (`proposals_set_response_metadata`) now makes it reliable regardless of which code path updates a proposal's status.
- Gemini 429/503 quota-exceeded errors previously triggered a full exponential-backoff retry cycle even for hard daily-quota exhaustion (which retrying cannot fix) — `lib/ai/gemini.ts` now fast-fails on the specific "quota"+"billing" error signature instead of wasting ~7s per request.

---

## 25. Suspicious or Incomplete Logic

- **`project_roles` / `project_members` are confirmed 100% dead** — 2 and 0 rows respectively, zero live code references (only explicit comments disclaiming use), `proposals.role_id`/`project_role_id` always NULL. Real role/budget data lives exclusively in `projects.budget_breakdown` JSONB. These tables (with their RLS policies and FKs) should either be dropped or clearly marked deprecated — currently they're just confusing dead weight in the schema.
- `lib/auth/{index,permissions,roles,session}.ts` — four 0-byte files (§1).
- Feature-matrix keys with zero implementation (§9): `premium_visibility`, `priority_ranking`, `budget_compatibility_analysis`, `talent_alerts`, `backup_talent_suggestions`, `team_insights`, `talent_pool`.
- `advanced_project_analytics`'s `isAdvanced` API field is computed but never consumed by the frontend (§9).
- Orphaned pages (§2) — several with real mock data that could confuse a future developer into thinking they're live.
- `app/client/create-project/page.tsx` writes `budget_breakdown` roles without a `skills` or `reason` key even though the type/reader code supports them — harmless today (reader merges `requiredSkills` correctly) but a latent trap if a future reader assumes `skills` is populated.
- `notifications` table double-duty as activity feed (§21).

---

## 26. TODOs

**Zero literal `TODO`/`FIXME`/`HACK`/`XXX` comments exist anywywhere in the codebase** (confirmed via full-repo grep). All "incomplete" items in this document were identified by comparing marketed/declared functionality (pricing page copy, feature-matrix keys, type declarations) against actual implementation — not from explicit developer markers.

---

## 27. Security / RLS Concerns

Ranked:
1. **CRITICAL** — `app/freelancers/messages/page.tsx` messaging bypass (§17). Directly defeats a paid feature gate and an explicit product rule via unauthenticated-parameter-driven direct table insert.
2. **CRITICAL** — `respondToInvitation()` missing capacity check (§16) — can corrupt team composition.
3. **HIGH** — No `middleware.ts`; auth enforcement is 100% ad hoc and already observed to be inconsistent between the client and freelancer sidebars (§7).
4. **HIGH** — Four unauthenticated Gemini-backed API routes (§3) — cost/abuse exposure, no rate limiting found anywhere in the app.
5. **HIGH** — Race condition in proposal-acceptance capacity check (§16) — no transaction, no DB constraint.
6. **MEDIUM** — `profiles`/`experiences`/`portfolio_items` RLS SELECT policies are `qual = true` for all authenticated users — broad PII exposure (email, phone, hourly rate) beyond actual counterparties (§6).
7. **MEDIUM** — Several `SECURITY DEFINER` subscription RPCs granted to `anon`, not just `authenticated` (§6) — likely neutralized by internal `auth.uid()` checks, but not verified in this audit and grants should be tightened regardless.
8. **MEDIUM** — No server-side file-type/size validation on any Storage upload path (§23).
9. **MEDIUM** — Migration drift: 2 remote-applied migrations have no local file; entire base schema was never captured in any migration (§5) — makes environment reproducibility and future schema review harder, and is itself a security-review blind spot (nobody can diff the "real" base schema against source control).
10. **LOW** — `console.log` of `userId`/`projectId` in `ProjectFiles.tsx` upload handler (§23).

---

## 28. Frontend / Backend Disagreements

- **Auth redirect behavior**: freelancer sidebar redirects unauthenticated users to `/login`; client sidebar does not (§7).
- **Messaging enforcement**: the backend correctly builds one dedicated, gated pre-proposal-messaging route, but a separate frontend page (`app/freelancers/messages/page.tsx`) has its own raw insert that ignores that gate entirely — the "backend" rule exists but is not universally wired to every frontend entry point that can trigger the same underlying table write (§17).
- **Team-capacity enforcement**: implemented in one client-invoked flow (`app/client/proposals/page.tsx`) but not in the parallel one (`app/freelancers/proposals/page.tsx`'s invitation acceptance) — both ultimately hit the same `project_team_members` table with the same business rule that should apply, but only one path enforces it (§16).
- **Plan/price marketing vs. delivered features**: `/premium`'s plan cards advertise several Plus/Pro features (§9 list) that have no corresponding backend or frontend implementation at all — a user paying for (trialing) Pro today literally cannot use `talent_pool`, `team_insights`, `backup_talent_suggestions`, `priority_ranking`, `premium_visibility`, `budget_compatibility_analysis`, or `talent_alerts`, because none of them exist beyond a label string in `lib/premium.ts` and `lib/plans.ts`.
- **`ProjectAnalysis` type vs. actual runtime shape** (§18) — the type is broader than what the route reliably produces.

---

## 29. Contradictions With Explicitly Stated Intended Product Rules

Going through the rules listed in the audit request, one by one:

| Rule | Status |
|---|---|
| Freelancers should only see projects/roles they're eligible for | **Mostly upheld.** Server-side `isEligibleForRole` gates proposal submission (§14/§15). Discover UI shows ineligible roles too (informational, no propose button) — consistent with product decisions made earlier in this project's history. |
| Freelancer matched to a role sees only that role's budget/duration | **Upheld** — confirmed field-level, not just UI-level (§14). |
| Freelancers must not receive the full `budget_breakdown` | **Upheld** — confirmed the array is never sent whole; only the per-eligible-role subset. |
| `project_roles` should not be assumed to exist; `budget_breakdown` JSONB is used instead | **Confirmed true** — `project_roles`/`project_members` are dead (§25). |
| `Proposal.role` determines the freelancer's matched role | **Upheld** — server re-derives the authoritative `matchedRole.role`/`roleId` itself rather than trusting the client's submission (§15). |
| Freelancer-to-client messaging before a proposal is restricted | **VIOLATED** — see §17 CRITICAL finding. The restriction exists in one code path and is bypassable via another. |
| Accepted proposals create/add the freelancer to the team respecting role/member limits | **PARTIALLY VIOLATED** — upheld on the proposal-acceptance path, **not upheld** on the invitation-acceptance path (§16 CRITICAL). |
| ProjectMatches should remain separate from the actual team | **Trivially upheld** — no such persisted concept exists at all (§13). |
| Team vs single-freelancer logic must be consistent frontend/backend | **Upheld** for the paths audited (creation → matching → proposal submission, §12/§14) — the acceptance-side team-size violation (§16) is a different kind of inconsistency (capacity enforcement gap, not a single/team mismatch per se). |
| Matching scores should not show 0% from field mismatch | **No mismatch found** between `create-project/page.tsx`'s writer and `match-talent.ts`'s reader (§12) — this specific concern does not currently manifest. |
| Freelancer should not submit a proposal for an unrelated role | **Upheld** — server-side family+score eligibility gate (§14/§15). |
| Client project creation should correctly handle single vs team | **Upheld** — `team_required` is unambiguous, `budget_breakdown` shape differs correctly by mode (§12). |
| AI project analysis compatible with Free/Plus/Pro | **Upheld** — additive-only response, Free path byte-identical regardless of plan (§18). |
| Existing Free functionality should not be removed for Premium | **Upheld** for AI analysis specifically (verified live, §18) — no evidence found elsewhere of a regression removing previously-free functionality. |
| Plus/Pro provide more comprehensive AI analysis / advanced functionality | **Partially upheld** — the AI-analysis enrichment genuinely is more comprehensive; several *other* advertised Plus/Pro features (§9) do not exist at all, which is a different kind of gap (marketing vs. reality, not "downgraded Free"). |
| Premium users should not bypass fundamental role/matching/security restrictions unless explicit | **VIOLATED indirectly** — the messaging bypass (§17) is reachable by **any** freelancer regardless of plan (it's actually a bypass available to Free users too, which is arguably worse: not even a Pro-only accidental over-grant, but a hole open to everyone). |
| Project detail pages must not expose unauthorized info | **Upheld** for budget/role data (§14) — RLS/API-level column exposure on `profiles` (§6) is a separate, broader concern not specific to project detail pages. |
| Frontend/backend mismatches in subscription entitlement checks | **None found** — every premium route uses the same `requireFeatureAccess`/`canUseFeature` pattern consistently (§9). |
| Is payment actually implemented or only UI? | **Only UI — confirmed no real payment provider integration exists anywhere** (§8). This should be treated as the single most important fact in this document for anyone evaluating the product's monetization readiness. |

---

## 30. Important Duplicated or Conflicting Logic

- **Team-capacity enforcement logic** exists once, correctly, in `lib/projects/teamReadiness.ts`, but is only *called* from one of the two acceptance flows (`app/client/proposals/page.tsx`) — not duplicated exactly, but **inconsistently applied**, which is arguably worse than duplication since a future fix to one path won't automatically fix the other (§16).
- **Multiple overlapping "new project" entry points**: `app/client/create-project/page.tsx` and `app/client/projects/new/page.tsx` (+`/details`) both appear to be project-creation flows reachable from different UI triggers (sidebar vs. empty-dashboard CTA) — not confirmed whether these are two genuinely different flows or one superseding the other; worth a follow-up read before assuming either is dead.
- **Duplicate registration/dashboard pages** for both roles (§2) — several fully-built-but-unreachable pages exist alongside the real, linked ones, which is a maintenance hazard (a future edit could target the wrong copy).
- **Plan/pricing definitions** are correctly centralized in `lib/plans.ts` (single source for `/premium` and `/premium/checkout`) — **not** a duplication problem, called out here as a positive contrast to the issues above.
- **`normalizeStringArray`** (`lib/utils/normalizeStringArray.ts`) vs. a separate, simpler, file-local `normalizeStringArray()` defined inside `app/api/ai/analyze-project/route.ts` — two functions with the same name and similar purpose but different implementations, in different scopes (no runtime collision since one is module-scoped, but confusing for a reader grepping the codebase and worth consolidating).

---

*End of audit. Compiled by static analysis of the repository and read-only Supabase queries (schema, RLS policies, function definitions, small-limit data spot-checks) on 2026-09-20. No secrets, API keys, or credential values are included above. No application code, database rows, or schema were modified in the course of producing this document.*
