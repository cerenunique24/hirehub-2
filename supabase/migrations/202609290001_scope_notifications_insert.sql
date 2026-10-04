-- Bug: the ONLY insert policy on public.notifications was
-- "Admins can create notifications" (with_check = private.is_admin()).
-- lib/notifications.ts's notifyUsers() — the single shared helper called
-- from every regular (non-admin) flow: milestone submit/revision/approval/
-- completed, proposal received/accepted/rejected, invitation accepted/
-- rejected, coalition_ready, project_started, message_received — inserts
-- as the ACTING user, not an admin, so every one of those inserts was
-- silently rejected by RLS. Confirmed live: public.notifications had ZERO
-- rows despite real submit/message activity. Callers never checked the
-- returned `{ error }`, so this failed completely silently.
--
-- Fix: add a second, scoped INSERT policy — NOT a blanket "any
-- authenticated user can insert for anyone" policy. Each branch requires
-- a real, pre-existing relationship row between the acting user
-- (auth.uid()) and the notified user (notifications.user_id), mirroring
-- every notifyUsers() call site found in the app:
--   1) active project team membership <-> that project's client
--   2) a proposal on a project <-> that project's client (covers
--      accepted AND rejected — the proposal row exists regardless of
--      outcome)
--   3) a project_team_invitations row <-> its client/freelancer (same
--      reasoning: accepted AND rejected)
--   4) an existing message between the two users
-- The pre-existing admin-only policy is untouched — admin-authored
-- notifications (support ticket replies/status updates) keep working
-- exactly as before, via private.is_admin().
create policy "Users can notify their project/proposal/message counterparts"
on public.notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.project_team_members m
    join public.projects p on p.id = m.project_id
    where m.status = 'active'
      and (
        (p.client_id = auth.uid() and m.freelancer_id = notifications.user_id)
        or (m.freelancer_id = auth.uid() and p.client_id = notifications.user_id)
      )
  )
  or exists (
    select 1
    from public.proposals pr
    join public.projects p on p.id = pr.project_id
    where (pr.freelancer_id = auth.uid() and p.client_id = notifications.user_id)
       or (p.client_id = auth.uid() and pr.freelancer_id = notifications.user_id)
  )
  or exists (
    select 1
    from public.project_team_invitations inv
    where (inv.freelancer_id = auth.uid() and inv.client_id = notifications.user_id)
       or (inv.client_id = auth.uid() and inv.freelancer_id = notifications.user_id)
  )
  or exists (
    select 1
    from public.messages msg
    where (msg.sender_id = auth.uid() and msg.receiver_id = notifications.user_id)
       or (msg.receiver_id = auth.uid() and msg.sender_id = notifications.user_id)
  )
);
