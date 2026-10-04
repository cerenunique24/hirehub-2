-- P1: projects.budget_breakdown money-leak kapatma.
--
-- Sorun: RLS yalnızca SATIR seviyesinde çalışır. "open" bir projenin satırını
-- görebilen (yani herhangi bir authenticated kullanıcı) PostgREST üzerinden
-- doğrudan `select=budget_breakdown` isteyip TÜM rollerin bütçesini
-- okuyabiliyordu — uygulama kodu bunu hiç filtrelemeden, çünkü filtre
-- sadece API response'unda (app kodunda) uygulanıyordu, sütun/erişim
-- seviyesinde değil.
--
-- Çözüm: `budget_breakdown` sütununun genel SELECT erişimi kapatılır.
-- Tüm okumalar `get_project_budget_breakdown()` RPC'si üzerinden geçer:
--   - Proje sahibi / admin / aktif ekip üyesi  -> tam veri.
--   - Projeye teklif/davet geçmişi olan freelancer -> SADECE kendi rolü
--     dolu, diğer rollerin bütçesi temizlenmiş (role/skills/memberCount kalır).
--   - Diğer herkes (ör. henüz hiç etkileşmemiş, sadece gezen freelancer)
--     -> TÜM rollerin bütçesi temizlenmiş.
--   - Sunucu tarafı eşleştirme kodu (lib/ai/match-talent.ts vb., her zaman
--     Next.js route handler'larında çalışır) ayrıca sunucuya özel bir
--     imza (COLLACREW_SERVER_SIGNING_SECRET, .env.local — tarayıcıya asla
--     gönderilmez) ile tam veriyi okur; bu, mevcut eşleştirme/eligibility
--     mantığını DEĞİŞTİRMEDEN (sadece ham satır okuma noktasını RPC'ye
--     taşıyarak) "uygun role için bütçe göster" özelliğini bozmadan sürdürür.
--
-- Not: Bu bir Supabase service_role anahtarı DEĞİLDİR — yalnızca bu tek RPC
-- için üretilmiş, hash'i DB'de saklanan, rotasyonu mümkün ayrı bir sır.

create table if not exists private.server_secrets (
  name text primary key,
  secret_hash text not null,
  rotated_at timestamptz not null default now()
);

revoke all on private.server_secrets from public, anon, authenticated;

create or replace function private.rotate_server_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text := encode(gen_random_bytes(32), 'hex');
begin
  insert into private.server_secrets (name, secret_hash, rotated_at)
  values (p_name, crypt(v_secret, gen_salt('bf')), now())
  on conflict (name) do update set secret_hash = excluded.secret_hash, rotated_at = now();

  return v_secret;
end;
$$;

-- Kasıtlı: authenticated/anon'a EXECUTE verilmez. Bu fonksiyon yalnızca
-- Supabase SQL editöründen / MCP execute_sql'den bir kerelik çağrılır;
-- PostgREST üzerinden normal bir kullanıcı tarafından asla çağrılamaz.
revoke execute on function private.rotate_server_secret(text) from public, anon, authenticated;

create or replace function private.check_server_secret(p_name text, p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from private.server_secrets s
    where s.name = p_name
      and p_secret is not null
      and s.secret_hash = crypt(p_secret, s.secret_hash)
  );
$$;

revoke execute on function private.check_server_secret(text, text) from public, anon, authenticated;

create or replace function public.get_project_budget_breakdown(
  p_project_id uuid,
  p_server_secret text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_caller uuid := auth.uid();
  v_client_id uuid;
  v_status text;
  v_breakdown jsonb;
  v_is_team_member boolean := false;
  v_has_relation boolean := false;
  v_own_role text;
begin
  select client_id, status, budget_breakdown into v_client_id, v_status, v_breakdown
  from projects where id = p_project_id;

  if v_breakdown is null or jsonb_typeof(v_breakdown) <> 'array' then
    return '[]'::jsonb;
  end if;

  -- Sunucu tarafı, güvenilir eşleştirme kodu: tam veri.
  if private.check_server_secret('budget_matching', p_server_secret) then
    return v_breakdown;
  end if;

  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if v_client_id = v_caller or private.is_admin() then
    return v_breakdown;
  end if;

  select exists (
    select 1 from project_team_members m
    where m.project_id = p_project_id and m.freelancer_id = v_caller and m.status = 'active'
  ) into v_is_team_member;

  if v_is_team_member then
    return v_breakdown;
  end if;

  select pr.role into v_own_role
  from proposals pr
  where pr.project_id = p_project_id and pr.freelancer_id = v_caller
  order by pr.created_at desc
  limit 1;

  if v_own_role is null then
    select i.role into v_own_role
    from project_team_invitations i
    where i.project_id = p_project_id and i.freelancer_id = v_caller
    order by i.created_at desc
    limit 1;
  end if;

  v_has_relation := v_own_role is not null;

  -- `projects` SELECT RLS'inin bugün izin verdiği görünürlükle aynı sınır:
  -- open proje / sahip / admin / ekip üyesi / teklif-davet geçmişi dışında
  -- kalan biri bu projenin rol YAPISINI (adı/sayısı) bile görmemeli —
  -- aksi halde henüz yayınlanmamış bir projenin varlığı sızar.
  if v_status <> 'open' and not v_has_relation then
    return '[]'::jsonb;
  end if;

  return (
    select coalesce(jsonb_agg(
      case
        when v_own_role is not null
          and lower(trim(coalesce(elem->>'role', elem->>'name', ''))) = lower(trim(v_own_role))
          then elem
        else (elem - 'budget' - 'budgetPerPerson')
      end
    ), '[]'::jsonb)
    from jsonb_array_elements(v_breakdown) elem
  );
end;
$$;

revoke execute on function public.get_project_budget_breakdown(uuid, text) from public, anon;
grant execute on function public.get_project_budget_breakdown(uuid, text) to authenticated;

-- Genel sütun erişimini kapat — tüm okuma artık RPC üzerinden.
revoke select (budget_breakdown) on public.projects from authenticated, anon;
