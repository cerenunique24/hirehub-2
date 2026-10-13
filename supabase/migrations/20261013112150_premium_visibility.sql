
-- Business values are intentionally unset. Activation fails closed until configured.
create table public.premium_visibility_settings (
 kind text primary key check(kind in ('profile','project')),
 enabled boolean not null default false,
 monthly_quota integer check(monthly_quota>0),
 duration_seconds integer check(duration_seconds>0),
 max_active integer check(max_active>0),
 check(not enabled or (monthly_quota is not null and duration_seconds is not null and max_active is not null))
);
insert into public.premium_visibility_settings(kind) values ('profile'),('project');
create table public.premium_visibility_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null references public.premium_visibility_settings(kind), item_id uuid not null,
 plan text not null check(plan='pro'), started_at timestamptz not null default now(),
 ends_at timestamptz not null, active boolean not null default true, created_at timestamptz not null default now(),
 check(ends_at>started_at)
);
create index premium_visibility_owner_idx on public.premium_visibility_events(user_id,kind,created_at);
create unique index premium_visibility_one_active_idx on public.premium_visibility_events(kind,item_id) where active;
alter table public.premium_visibility_settings enable row level security;
alter table public.premium_visibility_events enable row level security;
revoke all on public.premium_visibility_settings,public.premium_visibility_events from anon,authenticated;
grant select on public.premium_visibility_settings,public.premium_visibility_events to authenticated;
create policy visibility_settings_read on public.premium_visibility_settings for select to authenticated using(true);

-- A boolean visibility predicate needs to check other owners' subscription state,
-- without exposing subscription rows or bypassing the discovered item's own RLS.
create function private.premium_visibility_active(p_kind text,p_item uuid,p_owner uuid,p_start timestamptz,p_end timestamptz,p_active boolean)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and p_active and p_start<=now() and p_end>now()
 and exists(select 1 from public.premium_visibility_settings c where c.kind=p_kind and c.enabled)
 and exists(select 1 from public.subscriptions s where s.user_id=p_owner and s.plan='pro' and s.status in ('active','trial') and (s.expires_at is null or s.expires_at>now()))
 and case when p_kind='profile' then exists(select 1 from public.profiles p where p.id=p_item and p.id=p_owner and p.role='freelancer' and coalesce(p.profile_visibility,'public')='public')
 when p_kind='project' then exists(select 1 from public.projects p where p.id=p_item and p.client_id=p_owner and p.status='open') else false end;
$$;
revoke all on function private.premium_visibility_active(text,uuid,uuid,timestamptz,timestamptz,boolean) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.premium_visibility_active(text,uuid,uuid,timestamptz,timestamptz,boolean) to authenticated;
create policy visibility_events_read on public.premium_visibility_events for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()) or private.premium_visibility_active(kind,item_id,user_id,started_at,ends_at,active));

create function public.active_featured_items() returns table(kind text,item_id uuid,ends_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select e.kind,e.item_id,e.ends_at from public.premium_visibility_events e where private.premium_visibility_active(e.kind,e.item_id,e.user_id,e.started_at,e.ends_at,e.active) order by e.started_at desc,e.id;
$$;
revoke all on function public.active_featured_items() from public,anon;
grant execute on function public.active_featured_items() to authenticated;

-- Deliberate, narrowly-scoped privileged write: direct table mutations are forbidden.
-- Owner subscription row serializes all quota/duplicate checks for this owner.
create function public.activate_premium_visibility(p_kind text,p_item_id uuid) returns public.premium_visibility_events
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_role text; v_config public.premium_visibility_settings%rowtype; v_sub public.subscriptions%rowtype; v_result public.premium_visibility_events%rowtype; v_used integer; v_count integer; v_end timestamptz;
begin
 if v_user is null then raise exception 'authentication_required'; end if;
 select role into v_role from public.profiles where id=v_user;
 if p_kind='profile' then
  if v_role<>'freelancer' or p_item_id<>v_user then raise exception 'visibility_owner_required'; end if;
  if not exists(select 1 from public.profiles where id=v_user and coalesce(profile_visibility,'public')='public') then raise exception 'visibility_public_profile_required'; end if;
 elsif p_kind='project' then
  if v_role<>'client' or not exists(select 1 from public.projects where id=p_item_id and client_id=v_user and status='open') then raise exception 'visibility_open_own_project_required'; end if;
 else raise exception 'invalid_visibility_kind'; end if;
 select * into v_sub from public.subscriptions where user_id=v_user for update;
 if v_sub.id is null or v_sub.plan<>'pro' or v_sub.status not in ('active','trial') or (v_sub.expires_at is not null and v_sub.expires_at<=now()) then raise exception 'visibility_pro_required'; end if;
 select * into v_config from public.premium_visibility_settings where kind=p_kind for share;
 if not found or not v_config.enabled or v_config.monthly_quota is null or v_config.duration_seconds is null or v_config.max_active is null then raise exception 'visibility_not_configured'; end if;
 if exists(select 1 from public.premium_visibility_events where user_id=v_user and kind=p_kind and item_id=p_item_id and active and ends_at>now()) then raise exception 'visibility_already_active'; end if;
 select count(*) into v_used from public.premium_visibility_events where user_id=v_user and kind=p_kind and created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
 if v_used>=v_config.monthly_quota then raise exception 'visibility_quota_exhausted'; end if;
 select count(*) into v_count from public.premium_visibility_events where user_id=v_user and kind=p_kind and active and ends_at>now();
 if v_count>=v_config.max_active then raise exception 'visibility_active_limit'; end if;
 v_end:=now()+make_interval(secs=>v_config.duration_seconds);
 if v_sub.expires_at is not null then v_end:=least(v_end,v_sub.expires_at); end if;
 update public.premium_visibility_events set active=false where user_id=v_user and kind=p_kind and item_id=p_item_id and active;
 insert into public.premium_visibility_events(user_id,kind,item_id,plan,ends_at) values(v_user,p_kind,p_item_id,'pro',v_end) returning * into v_result;
 return v_result;
end; $$;
revoke all on function public.activate_premium_visibility(text,uuid) from public,anon;
grant execute on function public.activate_premium_visibility(text,uuid) to authenticated;
create function public.deactivate_premium_visibility(p_event_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 update public.premium_visibility_events set active=false where id=p_event_id and user_id=auth.uid();
 if not found then raise exception 'visibility_owner_required'; end if;
end; $$;
revoke all on function public.deactivate_premium_visibility(uuid) from public,anon;
grant execute on function public.deactivate_premium_visibility(uuid) to authenticated;
