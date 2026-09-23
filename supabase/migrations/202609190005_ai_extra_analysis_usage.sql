-- Plus "Aylık sınırlı ek AI analiz hakkı" / Pro "Daha yüksek AI analiz
-- kullanım limiti" — monthly usage counter for the ADVANCED (Plus/Pro
-- only) project-analysis enrichment. The FREE base analysis is never
-- affected by this counter.

alter table public.subscriptions
  add column if not exists ai_extra_analysis_count integer not null default 0,
  add column if not exists ai_extra_analysis_reset_at timestamptz;

create or replace function public.increment_ai_extra_analysis_usage()
returns table(count integer, limit_reached boolean, monthly_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  sub record;
  current_month text := to_char(now(), 'YYYY-MM');
  stored_month text;
  new_count integer;
  cap integer;
begin
  select * into sub from public.subscriptions where user_id = auth.uid();

  if sub.id is null or sub.plan not in ('plus', 'pro') or sub.status not in ('active', 'trial')
     or (sub.expires_at is not null and sub.expires_at <= now()) then
    raise exception 'Bu özellik için aktif bir Plus/Pro aboneliğin yok.';
  end if;

  cap := case when sub.plan = 'pro' then 100 else 10 end;

  stored_month := to_char(coalesce(sub.ai_extra_analysis_reset_at, 'epoch'::timestamptz), 'YYYY-MM');

  if stored_month <> current_month then
    new_count := 1;
  else
    new_count := coalesce(sub.ai_extra_analysis_count, 0) + 1;
  end if;

  if new_count > cap then
    return query select coalesce(sub.ai_extra_analysis_count, 0), true, cap;
    return;
  end if;

  update public.subscriptions
  set ai_extra_analysis_count = new_count, ai_extra_analysis_reset_at = now(), updated_at = now()
  where user_id = auth.uid();

  return query select new_count, false, cap;
end;
$$;

grant execute on function public.increment_ai_extra_analysis_usage() to authenticated;
