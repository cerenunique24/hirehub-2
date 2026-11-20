-- TASLAK. Hedef katalog ve mevcut proje-ekip baglari incelenmeden uygulamayin.
-- Teklif/davet kabul RPC'leri, varsa RLS'yi asan sahipleriyle ayrica dogrulanmalidir.
begin;

alter policy "Users can create coalitions"
on public.coalitions
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    project_id is null
    or exists (
      select 1
      from public.projects as project
      where project.id = coalitions.project_id
        and project.client_id = (select auth.uid())
    )
  )
);

alter policy "Users can update coalitions they created"
on public.coalitions
to authenticated
using (created_by = (select auth.uid()))
with check (
  created_by = (select auth.uid())
  and (
    project_id is null
    or exists (
      select 1
      from public.projects as project
      where project.id = coalitions.project_id
        and project.client_id = (select auth.uid())
    )
  )
);

create function private.reject_coalition_project_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $function$
begin
  raise exception 'Ekibin proje baglantisi olusturulduktan sonra degistirilemez.'
    using errcode = '23514';
end;
$function$;

revoke all on function private.reject_coalition_project_change()
  from public, anon, authenticated;

create trigger coalitions_reject_project_change
before update on public.coalitions
for each row
when (old.project_id is distinct from new.project_id)
execute function private.reject_coalition_project_change();

commit;
