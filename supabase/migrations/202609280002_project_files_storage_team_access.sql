-- Bug: an active team-member freelancer gets a Storage RLS violation
-- ("new row violates row-level security policy") when adding a delivery
-- file during the milestone workflow (ProjectFiles.tsx, used from
-- ProjectWorkroom.tsx's delivery tab with canManage=true for the owning
-- team member). The `public.project_files` table's own RLS already
-- grants active team members insert/select (see
-- 202609180001_project_milestones.sql), but the underlying
-- `storage.objects` policies for the `project-files` bucket were never
-- widened past "client only" when team projects were introduced — so the
-- DB-row insert would have succeeded, but the actual file upload to
-- Storage never got that far.
--
-- Fix mirrors the exact pattern already used for `project_files` itself:
-- widen the existing policies (not duplicate them) to also allow an
-- active `project_team_members` row for the acting freelancer, using the
-- same `storage.foldername(name)` folder convention
-- (`{uploaderId}/{projectId}/...`, see components/projects/ProjectFiles.tsx)
-- already relied on by the client-only policy below. No bucket, upload
-- flow, or API layer changes; no change to who can delete.
alter policy "Clients can upload to their own project folder"
  on storage.objects
  with check (
    bucket_id = 'project-files'
    and (
      exists (
        select 1 from public.projects
        where projects.client_id = auth.uid()
          and projects.id::text = (storage.foldername(name))[2]
          and auth.uid()::text = (storage.foldername(name))[1]
      )
      or exists (
        select 1 from public.project_team_members m
        where m.freelancer_id = auth.uid()
          and m.status = 'active'
          and m.project_id::text = (storage.foldername(name))[2]
          and auth.uid()::text = (storage.foldername(name))[1]
      )
    )
  );

-- Same gap on read: without this, an active team member could not fetch
-- a signed URL for a delivery file once the project leaves 'open'
-- (i.e. for the entire in_progress delivery phase this bug report is
-- about), even though they could see the file's metadata row.
alter policy "Authenticated users can read permitted project attachments"
  on storage.objects
  using (
    bucket_id = 'project-files'
    and (
      exists (
        select 1 from public.project_files
        join public.projects on projects.id = project_files.project_id
        where project_files.file_path = storage.objects.name
          and (projects.client_id = auth.uid() or projects.status = 'open')
      )
      or exists (
        select 1 from public.project_files pf
        join public.project_team_members m on m.project_id = pf.project_id
        where pf.file_path = storage.objects.name
          and m.freelancer_id = auth.uid()
          and m.status = 'active'
      )
    )
  );
