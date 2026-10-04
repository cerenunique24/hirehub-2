-- Bug: "Ekip Üyesi Öner" (app/freelancers/freelancers/page.tsx handleSuggest)
-- directly inserts into coalition_members with status='pending' and
-- invited_by=<the suggesting freelancer>, user_id=<the SUGGESTED
-- freelancer>. Existing INSERT policies on coalition_members only cover
-- two cases: (1) the coalition OWNER (client, created_by=auth.uid())
-- adding someone, or (2) a freelancer requesting to join for THEMSELVES
-- (user_id=auth.uid()). Neither covers "an active team member suggests a
-- DIFFERENT freelancer" — so every handleSuggest() call was rejected by
-- RLS (confirmed: {} error, RLS violation).
--
-- Product intent (confirmed from existing, already-built code): this is
-- an OWNER-APPROVED SUGGESTION model, not a direct add. Evidence:
-- status is 'pending' (not 'active'), invited_by is tracked, and
-- app/client/coalitions/[id]/page.tsx ALREADY has a full pending-review
-- UI (handleApprove sets status='active', handleReject deletes the row)
-- built against the existing owner-only UPDATE/DELETE policies — the
-- approval side works today. Only the freelancer's initial suggestion
-- INSERT was missing a matching policy.
--
-- Fix: add one narrowly-scoped INSERT policy, not a blanket bypass:
--   - the suggesting user must be an ACTIVE member of that coalition
--   - the new row must be status='pending' (can never self-activate)
--   - invited_by must be the suggesting user themselves (no impersonation)
--   - the suggested user_id must be a real freelancer profile (mirrors
--     the existing self-join policy's same check)
-- The existing UNIQUE(coalition_id, user_id) constraint already prevents
-- duplicate suggestions/memberships — no new duplicate-checking needed.
create policy "Active members can suggest a teammate"
on public.coalition_members
for insert
to authenticated
with check (
  status = 'pending'
  and invited_by = auth.uid()
  and exists (
    select 1
    from public.coalition_members m
    where m.coalition_id = coalition_members.coalition_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  and exists (
    select 1
    from public.profiles pr
    where pr.id = coalition_members.user_id
      and pr.role = 'freelancer'
  )
);
