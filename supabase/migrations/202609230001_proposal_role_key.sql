-- Proposals ↔ project role link.
--
-- Project roles live in projects.budget_breakdown (JSONB, each role has a
-- string `roleId`). The legacy proposals.project_role_id column is a uuid FK
-- to the unused project_roles table, so it cannot reference those roles.
-- role_key stores the budget_breakdown roleId the proposal targets
-- ("fallback-single-role" for single-freelancer projects). It is written only
-- by POST /api/proposals after server-side eligibility validation; clients
-- cannot update it (proposals UPDATE is column-restricted).

alter table public.proposals
  add column if not exists role_key text;

comment on column public.proposals.role_key is
  'roleId of the projects.budget_breakdown role this proposal targets (fallback-single-role for single-freelancer projects).';

create index if not exists proposals_project_role_key_idx
  on public.proposals (project_id, role_key);
