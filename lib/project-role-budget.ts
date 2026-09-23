import type { ProjectBudgetRole } from "@/types/project";

export function calculateRoleTotal(role: Pick<ProjectBudgetRole, "quantity" | "client_budget">) {
  const quantity = Math.max(1, Math.floor(Number(role.quantity) || 1));
  const clientBudget = Math.max(0, Math.round(Number(role.client_budget) || 0));
  return quantity * clientBudget;
}

export function calculateProjectTotal(roles: readonly ProjectBudgetRole[]) {
  return roles.reduce((total, role) => total + calculateRoleTotal(role), 0);
}

export function visibleRoleBudget(role: ProjectBudgetRole) {
  if (role.budget_visibility !== "visible" || role.client_budget === null) {
    return null;
  }

  return role.client_budget;
}
