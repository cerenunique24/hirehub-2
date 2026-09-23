-- career_applications: public "join the CollaCrew team" applications (not
-- freelancer marketplace signups). Anyone (anon) can insert; only admins can
-- read/update.
create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  expertise text not null,
  introduction text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.career_applications
  add constraint career_applications_status_check
  check (status in ('new','reviewing','contacted','rejected','hired'));

alter table public.career_applications
  add constraint career_applications_email_check
  check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');

alter table public.career_applications enable row level security;

create policy "Anyone can submit a career application"
  on public.career_applications for insert
  to anon, authenticated
  with check (true);

create policy "Admins can view career applications"
  on public.career_applications for select
  to authenticated
  using (private.is_admin());

create policy "Admins can update career applications"
  on public.career_applications for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- career_application_files: attachments (CV/portfolio) per application.
create table if not exists public.career_application_files (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.career_applications(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_size bigint not null,
  file_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists career_application_files_application_id_idx
  on public.career_application_files(application_id);

alter table public.career_application_files enable row level security;

create policy "Anyone can attach a file to a career application"
  on public.career_application_files for insert
  to anon, authenticated
  with check (file_size > 0);

create policy "Admins can view career application files"
  on public.career_application_files for select
  to authenticated
  using (private.is_admin());

create policy "Admins can delete career application files"
  on public.career_application_files for delete
  to authenticated
  using (private.is_admin());

-- Backend backstop: total attached bytes per application can never exceed
-- 3 GB, enforced regardless of what the client claims/checks beforehand.
-- SECURITY DEFINER so the aggregate query isn't blocked by this same
-- table's own RLS (anon has no SELECT policy on this table).
create or replace function private.enforce_career_application_files_size_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  if new.file_size <= 0 then
    raise exception 'Geçersiz dosya boyutu.' using errcode = 'P0001';
  end if;

  select coalesce(sum(file_size), 0) into v_total
  from public.career_application_files
  where application_id = new.application_id;

  if (v_total + new.file_size) > 3221225472 then
    raise exception 'Başvuru başına toplam dosya boyutu 3 GB sınırını aşamaz.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists career_application_files_enforce_size_limit on public.career_application_files;
create trigger career_application_files_enforce_size_limit
  before insert on public.career_application_files
  for each row execute function private.enforce_career_application_files_size_limit();

-- Used inside the storage.objects INSERT policy below: lets an anon upload
-- be authorized for a given application folder without granting anon a
-- direct SELECT policy on career_applications (which would make every
-- application id enumerable/readable).
create or replace function private.career_application_exists(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.career_applications where id = p_id);
$$;

grant execute on function private.career_application_exists(uuid) to anon, authenticated;

-- Public RPC so the client can check the running total for an application
-- before requesting another signed upload URL (keeps uploads under the 3 GB
-- cap without needing a SELECT grant on career_application_files).
create or replace function public.career_application_uploaded_bytes(p_application_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(file_size), 0)::bigint
  from public.career_application_files
  where application_id = p_application_id;
$$;

revoke all on function public.career_application_uploaded_bytes(uuid) from public;
grant execute on function public.career_application_uploaded_bytes(uuid) to anon, authenticated;

-- Private bucket for CV/portfolio uploads. Per-object ceiling mirrors the
-- 3 GB per-application cap (the trigger above enforces the cumulative rule);
-- MIME allowlist mirrors the existing project-files bucket's document/image
-- types (CVs, portfolios, zipped work samples).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'career-applications',
  'career-applications',
  false,
  3221225472,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects RLS for the 'career-applications' bucket.
create policy "Anyone can upload into a valid career application folder"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'career-applications'
    and private.career_application_exists(((storage.foldername(name))[1])::uuid)
  );

create policy "Admins can read career application files from storage"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'career-applications' and private.is_admin());

create policy "Admins can delete career application files from storage"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'career-applications' and private.is_admin());
