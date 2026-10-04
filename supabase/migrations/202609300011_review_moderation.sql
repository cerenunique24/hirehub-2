-- P1: review moderation. Reviews zaten RLS ile değiştirilemez/silinemez
-- (sadece SELECT politikası var, UPDATE/DELETE yok — ne sahibi ne başka
-- bir kullanıcı bir review'u düzenleyebilir). Eksik olan: (1) bir review'u
-- şikayet etme yolu, (2) admin'in gizleme/gösterme + neden + denetim kaydı.
alter table public.reviews
  add column if not exists moderation_reason text,
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;

alter table public.user_reports drop constraint if exists user_reports_target_type_check;
alter table public.user_reports
  add constraint user_reports_target_type_check
  check (target_type in ('user', 'project', 'message', 'review'));

create or replace function public.report_target(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_reported uuid;
  v_report_id uuid;
begin
  if v_caller is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  if p_target_type = 'user' then
    select id into v_reported from profiles where id = p_target_id;
  elsif p_target_type = 'project' then
    select client_id into v_reported from projects p
    where p.id = p_target_id
      and (
        p.status = 'open' or p.client_id = v_caller
        or exists (select 1 from project_team_members m where m.project_id = p.id and m.freelancer_id = v_caller)
        or exists (select 1 from proposals pr where pr.project_id = p.id and pr.freelancer_id = v_caller)
      );
  elsif p_target_type = 'message' then
    select case when m.sender_id = v_caller then m.receiver_id else m.sender_id end into v_reported
    from messages m
    where m.id = p_target_id
      and (
        m.sender_id = v_caller or m.receiver_id = v_caller
        or (m.coalition_id is not null and exists (
          select 1 from coalition_members cm
          where cm.coalition_id = m.coalition_id and cm.user_id = v_caller and cm.status = 'active'
        ))
      );
  elsif p_target_type = 'review' then
    select reviewer_id into v_reported from reviews where id = p_target_id and not is_hidden;
  else
    raise exception 'Geçersiz şikayet türü.' using errcode = 'P0001';
  end if;

  if not found then
    raise exception 'Şikayet edilen içerik bulunamadı.' using errcode = 'P0001';
  end if;

  if p_target_type = 'user' and p_target_id = v_caller then
    raise exception 'Kendini şikayet edemezsin.' using errcode = 'P0001';
  end if;

  if p_target_type = 'review' and v_reported = v_caller then
    raise exception 'Kendi değerlendirmeni şikayet edemezsin.' using errcode = 'P0001';
  end if;

  insert into user_reports (reporter_id, target_type, target_id, reported_user_id, reason, details)
  values (v_caller, p_target_type, p_target_id, v_reported, p_reason, nullif(trim(coalesce(p_details, '')), ''))
  on conflict (reporter_id, target_type, target_id) do nothing
  returning id into v_report_id;

  if v_report_id is null then
    raise exception 'Bu içeriği zaten şikayet ettin.' using errcode = 'P0001';
  end if;

  return v_report_id;
end;
$$;

revoke execute on function public.report_target(text, uuid, text, text) from public, anon;
grant execute on function public.report_target(text, uuid, text, text) to authenticated;

create or replace function public.admin_set_review_visibility(
  p_review_id uuid,
  p_hidden boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'Bu işlem yalnızca yöneticiler içindir.' using errcode = '42501';
  end if;

  if p_hidden and char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Gizleme nedeni gerekli.' using errcode = 'P0001';
  end if;

  update reviews
    set is_hidden = p_hidden,
        moderation_reason = case when p_hidden then trim(p_reason) else null end,
        moderated_by = auth.uid(),
        moderated_at = now()
    where id = p_review_id;

  if not found then
    raise exception 'Değerlendirme bulunamadı.' using errcode = 'P0001';
  end if;

  perform public.log_audit_event(
    case when p_hidden then 'review_hidden' else 'review_unhidden' end,
    'reviews', p_review_id, jsonb_build_object('reason', p_reason)
  );
end;
$$;

revoke execute on function public.admin_set_review_visibility(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_review_visibility(uuid, boolean, text) to authenticated;
