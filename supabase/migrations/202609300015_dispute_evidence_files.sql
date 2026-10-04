-- P1: Uyuşmazlık kanıt/dosya ekleme. Önceden add_dispute_evidence() sadece
-- VAR OLAN bir project_files satırına referans verebiliyordu — doğrudan
-- dosya/görsel yükleme yolu yoktu. Artık ayrı, özel bir Storage bucket'ı
-- (dispute-evidence) ve dispute_evidence üzerinde dosya metadata'sı var.
--
-- Erişim: SADECE uyuşmazlığın tarafları (açan + karşı taraf) ve admin.
-- Diğer proje ekip üyeleri veya genel "proje dosyaları" erişimiyle hiç
-- ilişkisi yoktur — bilerek project_files'tan ayrı tutulur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dispute-evidence',
  'dispute-evidence',
  false,
  10485760, -- 10 MB
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public = false;

alter table public.dispute_evidence
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_type text,
  add column if not exists file_size bigint;

alter table public.dispute_evidence drop constraint if exists dispute_evidence_note_check;
alter table public.dispute_evidence
  add constraint dispute_evidence_note_or_file check (
    char_length(trim(note)) > 0 or file_path is not null
  );

-- Yükleme yolu: <dispute_id>/<uuid>-<dosya_adı>. Taraf olup olmadığı
-- `private.is_dispute_party()` ile kontrol edilir (dispute_evidence
-- RLS'iyle aynı kural, storage.objects için yeniden kullanılır).
-- `p_dispute_id_text` güvenle uuid'e çevrilemiyorsa (bozuk/alakasız yol)
-- hata fırlatmak yerine false döner — bu fonksiyon storage.objects RLS'i
-- içinde TÜM bucket'lardaki satırlar için değerlendirilebileceğinden
-- (AND'in soldan sağa kısa devre yapması garanti değildir), cast hatası
-- ilgisiz bir bucket'ın normal bir sorgusunu kıramaz.
create or replace function private.is_dispute_party(p_dispute_id_text text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dispute_id uuid;
begin
  begin
    v_dispute_id := p_dispute_id_text::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1 from disputes d
    join projects p on p.id = d.project_id
    where d.id = v_dispute_id
      and (d.opened_by = auth.uid() or d.against_user = auth.uid() or p.client_id = auth.uid())
  );
end;
$$;

-- `private` şemasına normalde `authenticated` erişemez (tüm iç yardımcılar
-- sadece public RPC'ler İÇİNDEN çağrılır) — ama storage.objects RLS, bu
-- fonksiyonu querying ROLE olarak (authenticated) çağırır, bu yüzden hem
-- şema USAGE'ı hem de SADECE bu fonksiyona EXECUTE gerekir.
grant usage on schema private to authenticated;
revoke execute on function private.is_dispute_party(text) from public, anon;
grant execute on function private.is_dispute_party(text) to authenticated;

create policy "Dispute parties can upload evidence files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dispute-evidence'
    and private.is_dispute_party((storage.foldername(name))[1])
  );

create policy "Dispute parties and admins can read evidence files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dispute-evidence'
    and (private.is_dispute_party((storage.foldername(name))[1]) or private.is_admin())
  );

create or replace function public.add_dispute_evidence(
  p_dispute_id uuid,
  p_note text,
  p_project_file_id uuid default null,
  p_file_path text default null,
  p_file_name text default null,
  p_file_type text default null,
  p_file_size bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_d disputes%rowtype;
  v_client_id uuid;
  v_evidence_id uuid;
  v_note text := trim(coalesce(p_note, ''));
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  select * into v_d from disputes where id = p_dispute_id;
  if not found then
    raise exception 'Uyuşmazlık bulunamadı.' using errcode = 'P0001';
  end if;

  select client_id into v_client_id from projects where id = v_d.project_id;

  if v_caller not in (v_d.opened_by, coalesce(v_d.against_user, v_d.opened_by), v_client_id) then
    raise exception 'Bu uyuşmazlığa kanıt ekleme yetkin yok.' using errcode = 'P0001';
  end if;

  if v_d.status not in ('open', 'under_review') then
    raise exception 'Kapanmış uyuşmazlığa kanıt eklenemez.' using errcode = 'P0001';
  end if;

  if p_project_file_id is not null and not exists (
    select 1 from project_files f where f.id = p_project_file_id and f.project_id = v_d.project_id
  ) then
    raise exception 'Dosya bu projeye ait değil.' using errcode = 'P0001';
  end if;

  if p_file_path is not null and (storage.foldername(p_file_path))[1] <> p_dispute_id::text then
    raise exception 'Dosya yolu bu uyuşmazlığa ait değil.' using errcode = 'P0001';
  end if;

  if char_length(v_note) = 0 and p_file_path is null then
    raise exception 'Bir not yaz veya dosya ekle.' using errcode = 'P0001';
  end if;

  insert into dispute_evidence (
    dispute_id, submitted_by, note, project_file_id, file_path, file_name, file_type, file_size
  )
  values (
    p_dispute_id, v_caller, coalesce(v_note, ''), p_project_file_id,
    p_file_path, p_file_name, p_file_type, p_file_size
  )
  returning id into v_evidence_id;

  return v_evidence_id;
end;
$$;

revoke execute on function public.add_dispute_evidence(uuid, text, uuid, text, text, text, bigint) from public, anon;
grant execute on function public.add_dispute_evidence(uuid, text, uuid, text, text, text, bigint) to authenticated;

drop function if exists public.add_dispute_evidence(uuid, text, uuid);

-- admin_dispute_case() kanıt listesine dosya meta verisini de ekler.
create or replace function public.admin_dispute_case(p_dispute_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d disputes%rowtype;
  v_parties uuid[];
  v_result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Bu işlem yalnızca yöneticiler içindir.' using errcode = '42501';
  end if;

  select * into v_d from disputes where id = p_dispute_id;
  if not found then
    raise exception 'Uyuşmazlık bulunamadı.' using errcode = 'P0001';
  end if;

  select array_agg(distinct u) into v_parties from (
    select v_d.opened_by u
    union select v_d.against_user
    union select client_id from projects where id = v_d.project_id
  ) t where u is not null;

  select jsonb_build_object(
    'dispute', to_jsonb(v_d),
    'project', (select to_jsonb(p) from (
      select id, title, status, budget, deadline, client_id, commission_rate from projects where id = v_d.project_id
    ) p),
    'team', coalesce((select jsonb_agg(to_jsonb(m)) from (
      select freelancer_id, role, status, agreed_amount, agreed_delivery_days, accepted_at
      from project_team_members where project_id = v_d.project_id
    ) m), '[]'::jsonb),
    'milestones', coalesce((select jsonb_agg(to_jsonb(ms) order by ms.sort_order) from (
      select id, title, status, budget, due_date, payment_status, dispute_status, revision_count,
             submitted_at, approved_at, freelancer_id, sort_order
      from project_milestones where project_id = v_d.project_id
    ) ms), '[]'::jsonb),
    'deliveries', coalesce((select jsonb_agg(to_jsonb(dl) order by dl.submitted_at) from (
      select id, milestone_id, attempt_no, message, status, submitted_at, reviewed_at, review_feedback
      from project_milestone_deliveries where project_id = v_d.project_id
    ) dl), '[]'::jsonb),
    'evidence', coalesce((select jsonb_agg(to_jsonb(ev) order by ev.created_at) from (
      select id, submitted_by, note, project_file_id, file_path, file_name, file_type, file_size, created_at
      from dispute_evidence where dispute_id = p_dispute_id
    ) ev), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(to_jsonb(msg) order by msg.created_at) from (
      select id, sender_id, receiver_id, content, created_at
      from messages
      where sender_id = any(v_parties) and (receiver_id = any(v_parties) or coalition_id in (
        select id from coalitions where project_id = v_d.project_id
      ))
      order by created_at desc
      limit 200
    ) msg), '[]'::jsonb)
  ) into v_result;

  perform public.log_audit_event('dispute_case_viewed', 'disputes', p_dispute_id, null);

  return v_result;
end;
$$;
