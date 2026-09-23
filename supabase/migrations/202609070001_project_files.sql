-- Project attachments for clients and authenticated freelancers who can view open projects.
create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_type text not null,
  file_size bigint not null check (file_size >= 0),
  created_at timestamptz not null default now()
);

alter table public.project_files enable row level security;

create policy "Project files are visible to owners and authenticated open-project viewers"
on public.project_files for select to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_files.project_id
      and (projects.client_id = auth.uid() or projects.status = 'open')
  )
);

create policy "Clients can add files to their own projects"
on public.project_files for insert to authenticated
with check (
  exists (
    select 1 from public.projects
    where projects.id = project_files.project_id
      and projects.client_id = auth.uid()
  )
);

create policy "Clients can delete files from their own projects"
on public.project_files for delete to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_files.project_id
      and projects.client_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 26214400)
on conflict (id) do nothing;

create policy "Authenticated users can read permitted project attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-files'
  and exists (
    select 1 from public.project_files
    join public.projects on projects.id = project_files.project_id
    where project_files.file_path = storage.objects.name
      and (projects.client_id = auth.uid() or projects.status = 'open')
  )
);

create policy "Clients can upload to their own project folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-files'
  and exists (
    select 1 from public.projects
    where projects.client_id = auth.uid()
      and projects.id::text = (storage.foldername(name))[2]
      and auth.uid()::text = (storage.foldername(name))[1]
  )
);

create policy "Clients can delete their own project attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-files'
  and exists (
    select 1 from public.projects
    where projects.client_id = auth.uid()
      and projects.id::text = (storage.foldername(name))[2]
      and auth.uid()::text = (storage.foldername(name))[1]
  )
);
