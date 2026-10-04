-- Davet akışı ve gereksinim notu için ek korumalar:
--  * Aynı freelancer'a aynı proje + rol için birden fazla BEKLEYEN davet gönderilemez.
--  * Davet mesajı ve proje gereksinim notu, platform dışı iletişim/ödeme
--    bilgisi filtresinden (private.enforce_no_contact_info) geçer.
create unique index if not exists project_team_invitations_one_pending_idx
  on public.project_team_invitations (project_id, freelancer_id, role)
  where status = 'pending';

drop trigger if exists invitations_message_no_contact_info on public.project_team_invitations;
create trigger invitations_message_no_contact_info
  before insert or update on public.project_team_invitations
  for each row execute function private.enforce_no_contact_info('message');

drop trigger if exists projects_requirements_note_no_contact_info on public.projects;
create trigger projects_requirements_note_no_contact_info
  before insert or update on public.projects
  for each row execute function private.enforce_no_contact_info('requirements_note');
