-- Kök neden (Faz 2, madde 7): contact-info filtresi (telefon/email/IBAN)
-- `messages.content` için SADECE frontend'de (containsContactInfo()) ve
-- SADECE freelancer tarafında (app/api/messages/send/route.ts) uygulanıyordu.
-- app/client/messages/page.tsx hiç içe aktarmıyordu (az önce eklendi) ve
-- hiçbir DB-seviyesi trigger yoktu — projects.requirements_note,
-- project_team_invitations.message, reviews.comment, dispute_evidence.note
-- için zaten var olan private.enforce_no_contact_info() deseni messages'a
-- hiç uygulanmamıştı. Bu, client tarafının filtreyi tamamen atlayabildiği
-- asimetrik bir açıktı.
drop trigger if exists messages_no_contact_info on public.messages;
create trigger messages_no_contact_info
  before insert or update on public.messages
  for each row execute function private.enforce_no_contact_info('content');
