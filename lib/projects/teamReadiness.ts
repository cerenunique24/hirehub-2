import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * project_roles / project_members KESİNLİKLE kullanılmıyor.
 *
 * Roller projects.budget_breakdown JSONB içinde tutuluyor; gerçek ekip
 * üyeliği project_team_members tablosunda. Bir rolün kaç kişi alabileceğini
 * (memberCount) budget_breakdown içinden, ada göre (case-insensitive)
 * buluyoruz. Rol bulunamazsa (ör. tek freelancer / breakdown'suz proje)
 * varsayılan 1 kişi.
 *
 * Bu mantık hem proposal kabul akışında (app/client/proposals/page.tsx) hem
 * de davet kabul akışında (app/freelancers/proposals/page.tsx) aynı şekilde
 * uygulanmalı, bu yüzden tek yerde toplanmıştır.
 */

type BudgetBreakdownRole = {
  roleId?: string;
  role?: string;
  name?: string;
  memberCount?: number;
};

export function normalizeRoleName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export function getRoleCapacity(
  budgetBreakdown: BudgetBreakdownRole[] | null | undefined,
  roleName: string
): number {
  const roles = budgetBreakdown;

  if (!Array.isArray(roles) || roles.length === 0) {
    return 1;
  }

  const match = roles.find((role) => {
    const name = role.role ?? role.name ?? "";
    return normalizeRoleName(name) === normalizeRoleName(roleName);
  });

  if (match && typeof match.memberCount === "number" && match.memberCount > 0) {
    return Math.floor(match.memberCount);
  }

  return 1;
}

/**
 * Bir proje için tüm rollerin dolup dolmadığını kontrol eder ve doluysa
 * projeyi `ready_to_start` durumuna geçirir. Zaten `ready_to_start` veya
 * daha ileri bir durumdaysa hiçbir şey yapmaz.
 */
export async function checkAndUpdateProjectReadiness(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ projectReady: boolean; error?: string }> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("status, budget_breakdown")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { projectReady: false, error: projectError?.message ?? "Proje bulunamadı." };
  }

  if (project.status !== "open") {
    // ready_to_start / in_progress / completed / cancelled / paused: dokunma.
    return { projectReady: project.status === "ready_to_start" };
  }

  const { data: activeMembers, error: activeMembersError } = await supabase
    .from("project_team_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("status", "active");

  if (activeMembersError) {
    return { projectReady: false, error: activeMembersError.message };
  }

  const budgetRoles = Array.isArray(project.budget_breakdown) ? project.budget_breakdown : [];

  let projectReady: boolean;

  if (budgetRoles.length > 0) {
    projectReady = budgetRoles.every((role: BudgetBreakdownRole) => {
      const roleName = role.role ?? role.name ?? "";
      const capacity = getRoleCapacity(budgetRoles, roleName);
      const filledCount = (activeMembers ?? []).filter(
        (member) => normalizeRoleName(member.role ?? "") === normalizeRoleName(roleName)
      ).length;
      return filledCount >= capacity;
    });
  } else {
    // Tek freelancer / breakdown'suz proje: 1 aktif üye yeterli.
    projectReady = (activeMembers ?? []).length >= 1;
  }

  if (projectReady) {
    const { error: updateError } = await supabase
      .from("projects")
      .update({ status: "ready_to_start" })
      .eq("id", projectId)
      .eq("status", "open");

    if (updateError) {
      return { projectReady: false, error: updateError.message };
    }
  }

  return { projectReady };
}
