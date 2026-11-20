-- INSERT ... RETURNING checks SELECT policies against the new row.
-- The STABLE helper re-queries projects using the statement snapshot and cannot
-- see that newly inserted row. Evaluate the existing owner rule on the row itself.
-- Keep all existing non-owner visibility checks and INSERT ownership constraints.
alter policy "Authenticated users can view relevant projects"
  on public.projects
  using (client_id = (select auth.uid()) or private.can_view_project(id));
