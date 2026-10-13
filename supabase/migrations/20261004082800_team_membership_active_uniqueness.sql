-- Kök neden: project_team_members(project_id, freelancer_id) benzersizliği
-- removed/ayrılmış kayıtları da kapsıyordu. Bir freelancer ekipten çıkarılıp
-- aynı projeye yeniden davet edildiğinde accept_project_placement, eski
-- kaydın yerine yeni satır eklerken 23505 alıyor ve UI bunu genel bir
-- hataya çeviriyordu. Benzersizlik yalnızca aktif üyelik için geçerli
-- olmalı. Aynı şekilde project_team_invitations(project_id, freelancer_id)
-- benzersizliği, yanıtlanmış (rejected/accepted) bir davetten sonra yeni
-- davet göndermeyi engelliyordu; bekleyen davetler için zaten ayrı bir
-- (project_id, freelancer_id, role) partial unique index var.

alter table public.project_team_members
  drop constraint if exists project_team_members_unique_freelancer;

create unique index if not exists project_team_members_active_unique_freelancer
  on public.project_team_members (project_id, freelancer_id)
  where status = 'active';

alter table public.project_team_invitations
  drop constraint if exists project_team_invitations_unique_freelancer;
