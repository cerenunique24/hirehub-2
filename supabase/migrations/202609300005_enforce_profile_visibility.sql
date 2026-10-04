-- "Gizlilik" ayarındaki "Sadece ilgili taraflar" seçeneği yalnızca arayüzde
-- vardı: profiles SELECT politikası `true` olduğundan gizli profil doğrudan
-- API'den okunabiliyordu. Görünürlük artık RLS seviyesinde uygulanır.
--
-- Bir profili şunlar görebilir: sahibi, admin, profili herkese açık olanlar
-- ve "ilgili taraflar" (teklif, davet, ekip üyeliği, mesajlaşma veya ortak
-- koalisyon ilişkisi olanlar).
create or replace function private.can_view_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_id = auth.uid()
    or coalesce((select p.profile_visibility from public.profiles p where p.id = p_id), 'public') <> 'private'
    or private.is_admin()
    or exists (
      select 1 from public.proposals pr
      join public.projects pj on pj.id = pr.project_id
      where (pr.freelancer_id = p_id and pj.client_id = auth.uid())
         or (pr.freelancer_id = auth.uid() and pj.client_id = p_id)
    )
    or exists (
      select 1 from public.project_team_invitations i
      where (i.freelancer_id = p_id and i.client_id = auth.uid())
         or (i.freelancer_id = auth.uid() and i.client_id = p_id)
    )
    or exists (
      select 1 from public.project_team_members m
      join public.projects pj on pj.id = m.project_id
      where (m.freelancer_id = p_id and pj.client_id = auth.uid())
         or (m.freelancer_id = auth.uid() and pj.client_id = p_id)
         or (m.freelancer_id = p_id and exists (
              select 1 from public.project_team_members me
              where me.project_id = m.project_id and me.freelancer_id = auth.uid()))
    )
    or exists (
      select 1 from public.messages msg
      where (msg.sender_id = p_id and msg.receiver_id = auth.uid())
         or (msg.sender_id = auth.uid() and msg.receiver_id = p_id)
    )
    or exists (
      select 1 from public.coalition_members a
      join public.coalition_members b on b.coalition_id = a.coalition_id
      where a.user_id = p_id and b.user_id = auth.uid()
    );
$$;

revoke execute on function private.can_view_profile(uuid) from public, anon;
grant execute on function private.can_view_profile(uuid) to authenticated;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view visible profiles"
  on public.profiles for select
  to authenticated
  using (private.can_view_profile(id));
