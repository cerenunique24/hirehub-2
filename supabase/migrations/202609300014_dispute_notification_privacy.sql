-- P1: Uyuşmazlık bildirimleri normal bildirim akışından ayrılır ve karşı
-- tarafa gereksiz kimlik/proje bilgisi ifşa etmez.
--
-- Önceki metin: '"<proje adı>" projesi için bir uyuşmazlık açıldı.' — proje
-- adını açıkça veriyordu. Kim açtığı zaten hiç verilmiyordu (korundu).
-- Artık:
--   - Mesaj tamamen jenerik ("CollaCrew incelemesi başlatıldı..."), proje
--     adı veya kim açtığı metinde YOKTUR.
--   - type = 'dispute_system' / 'dispute_system_update' — frontend bunu
--     normal olaylardan (teklif/mesaj/ödeme) ayrı, "Sistem" kategorisinde
--     gösterir (bkz. app/freelancers/notifications/page.tsx).
--   - link kasıtlı olarak genel bir sayfaya (proje listesi) gider; belirli
--     bir projeye değil — böylece bildirim tek başına "hangi projeden
--     geldiği" bilgisini sızdırmaz. Taraf, zaten erişimi olan "Yönetim"
--     sekmesinden ilgili projenin uyuşmazlığını görür.
create or replace function public.open_dispute(
  p_project_id uuid,
  p_milestone_id uuid,
  p_reason text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_client_id uuid;
  v_status text;
  v_title text;
  v_is_client boolean;
  v_against uuid;
  v_milestone_owner uuid;
  v_dispute_id uuid;
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  select client_id, status, title into v_client_id, v_status, v_title
  from projects where id = p_project_id;

  if v_client_id is null then
    raise exception 'Proje bulunamadı.' using errcode = 'P0001';
  end if;

  v_is_client := v_caller = v_client_id;

  if not v_is_client and not exists (
    select 1 from project_team_members m
    where m.project_id = p_project_id and m.freelancer_id = v_caller and m.status in ('active', 'removed')
  ) then
    raise exception 'Bu proje için uyuşmazlık açma yetkin yok.' using errcode = 'P0001';
  end if;

  if v_status = 'open' then
    raise exception 'Henüz başlamamış proje için uyuşmazlık açılamaz.' using errcode = 'P0001';
  end if;

  if p_milestone_id is not null then
    select freelancer_id into v_milestone_owner
    from project_milestones where id = p_milestone_id and project_id = p_project_id;
    if not found then
      raise exception 'Aşama bu projeye ait değil.' using errcode = 'P0001';
    end if;
  end if;

  if v_is_client then
    v_against := v_milestone_owner;
    if v_against is null then
      select m.freelancer_id into v_against
      from project_team_members m
      where m.project_id = p_project_id and m.status = 'active'
      order by m.created_at limit 1;
    end if;
  else
    v_against := v_client_id;
  end if;

  if exists (
    select 1 from disputes
    where project_id = p_project_id and opened_by = v_caller and status in ('open', 'under_review')
  ) then
    raise exception 'Bu proje için zaten açık bir uyuşmazlığın var.' using errcode = 'P0001';
  end if;

  insert into disputes (project_id, milestone_id, opened_by, opener_role, against_user, reason, description)
  values (
    p_project_id, p_milestone_id, v_caller,
    case when v_is_client then 'client' else 'freelancer' end,
    v_against, p_reason, trim(p_description)
  )
  returning id into v_dispute_id;

  if p_milestone_id is not null then
    perform set_config('collacrew.system_write', 'on', true);
    update project_milestones set dispute_status = 'open' where id = p_milestone_id;
    perform set_config('collacrew.system_write', 'off', true);
  end if;

  if v_against is not null then
    insert into notifications (user_id, type, title, message, link, dedupe_key)
    values (
      v_against,
      'dispute_system',
      'CollaCrew incelemesi başlatıldı',
      'Projelerinden biriyle ilgili bir konu CollaCrew ekibi tarafından incelenmektedir. Süreç sonuçlandığında bilgilendirileceksin.',
      case when v_is_client then '/freelancers/projects' else '/client/projects' end,
      'dispute_opened:' || v_dispute_id
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return v_dispute_id;
end;
$$;

create or replace function public.admin_update_dispute(
  p_dispute_id uuid,
  p_status text,
  p_resolution text default null,
  p_outcome text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d disputes%rowtype;
  v_final boolean := p_status in ('resolved', 'closed');
begin
  if not private.is_admin() then
    raise exception 'Bu işlem yalnızca yöneticiler içindir.' using errcode = '42501';
  end if;

  if p_status not in ('under_review', 'resolved', 'closed') then
    raise exception 'Geçersiz uyuşmazlık durumu.' using errcode = 'P0001';
  end if;

  select * into v_d from disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'Uyuşmazlık bulunamadı.' using errcode = 'P0001';
  end if;

  if v_final and char_length(trim(coalesce(p_resolution, ''))) < 5 then
    raise exception 'Çözüm açıklaması gerekli.' using errcode = 'P0001';
  end if;

  update disputes
    set status = p_status,
        resolution = case when v_final then trim(p_resolution) else resolution end,
        resolution_outcome = case when v_final then p_outcome else resolution_outcome end,
        resolved_by = case when v_final then auth.uid() else resolved_by end,
        resolved_at = case when v_final then now() else resolved_at end,
        updated_at = now()
    where id = p_dispute_id;

  if v_d.milestone_id is not null then
    perform set_config('collacrew.system_write', 'on', true);
    update project_milestones
      set dispute_status = case when v_final then 'resolved' else 'under_review' end
      where id = v_d.milestone_id;
    perform set_config('collacrew.system_write', 'off', true);
  end if;

  -- Bildirim metni ve link'i jenerik tutulur: hangi proje/kim olduğu
  -- metinden anlaşılmaz; taraf "Yönetim" sekmesinden kendi uyuşmazlığını görür.
  insert into notifications (user_id, type, title, message, link, dedupe_key)
  select u.user_id, 'dispute_system_update',
    case
      when p_status = 'resolved' then 'Uyuşmazlık çözüldü'
      when p_status = 'closed' then 'Uyuşmazlık kapatıldı'
      else 'Uyuşmazlık inceleniyor'
    end,
    'CollaCrew ekibi, incelemekte olduğu bir konuyu güncelledi. Ayrıntılar için projenin Yönetim sekmesine bakabilirsin.',
    u.link,
    'dispute_updated:' || p_dispute_id || ':' || p_status || ':' || u.user_id
  from (
    select v_d.opened_by as user_id,
      case when v_d.opener_role = 'client' then '/client/projects' else '/freelancers/projects' end as link
    union
    select v_d.against_user,
      case when v_d.opener_role = 'client' then '/freelancers/projects' else '/client/projects' end
    where v_d.against_user is not null
  ) u
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  perform public.log_audit_event(
    'dispute_' || p_status, 'disputes', p_dispute_id,
    jsonb_build_object('outcome', p_outcome)
  );
end;
$$;
