-- Keep structured location and duration data alongside the legacy `location`
-- and `requirements` fields so existing projects and UI remain compatible.
alter table public.projects
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists estimated_duration text;

comment on column public.projects.country is 'Project location country selected by the client.';
comment on column public.projects.city is 'Project location city selected by the client.';
comment on column public.projects.estimated_duration is 'Client-selected estimated project duration label.';
