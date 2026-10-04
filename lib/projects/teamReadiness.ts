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

/**
 * `projects.budget_breakdown` tek, paylaşılan okuma noktası.
 *
 * Bu sütun artık doğrudan `.select()` ile okunamaz (bkz. supabase/migrations/
 * 202609300006_budget_breakdown_privacy.sql — RLS satır seviyesinde çalıştığı
 * için "open" bir projeyi görebilen herkes çıplak select ile TÜM rollerin
 * bütçesini okuyabiliyordu). Tüm okumalar `get_project_budget_breakdown()`
 * RPC'si üzerinden geçer; RPC çağıranın proje sahibi/admin/aktif ekip
 * üyesi/teklif-davet geçmişi olup olmadığına göre veriyi otomatik filtreler.
 */
export async function fetchBudgetBreakdown(
  supabase: SupabaseClient,
  projectId: string
): Promise<BudgetBreakdownRole[]> {
  const { data, error } = await supabase.rpc("get_project_budget_breakdown", {
    p_project_id: projectId,
  });

  if (error) {
    console.error("[fetchBudgetBreakdown] RPC hatası:", error);
    return [];
  }

  return Array.isArray(data) ? (data as BudgetBreakdownRole[]) : [];
}

type BudgetBreakdownRole = {
  roleId?: string;
  role?: string;
  name?: string;
  memberCount?: number;
};

export function normalizeRoleName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

/**
 * `accept_project_placement` RPC'sinin (bkz. supabase/migrations/
 * 202609200001_team_placement_capacity_rpc.sql) fırlattığı hata mesajlarını
 * kullanıcıya gösterilecek Türkçe metne çevirir. Bu RPC hem davet kabul
 * (app/freelancers/proposals/page.tsx) hem de teklif kabul
 * (app/client/proposals/page.tsx) akışında aynı şekilde kullanılır.
 */
export function describeAcceptPlacementError(message: string): string {
  if (message.includes("role_capacity_full")) {
    return "Bu rol zaten dolu. Bu role başka bir freelancer kabul edilemez.";
  }
  if (message.includes("project_capacity_full")) {
    return "Bu proje zaten bir ekip üyesi kabul etmiş; tek kişilik projelerde ikinci bir üye eklenemez.";
  }
  if (message.includes("already_member")) {
    return "Bu freelancer zaten bu projenin aktif ekip üyesi.";
  }
  if (message.includes("project_not_open")) {
    return "Bu proje artık yeni ekip üyesi kabul etmeye uygun değil.";
  }
  if (
    message.includes("invitation_not_found_or_not_pending") ||
    message.includes("proposal_not_found_or_not_pending")
  ) {
    return "Bu davet/teklif artık bekleyen durumda değil. Sayfayı yenileyip tekrar kontrol edin.";
  }
  if (message.includes("not_authorized") || message.includes("not_authenticated")) {
    return "Bu işlemi yapmaya yetkin yok.";
  }
  return "Ekibe katılırken bir hata oluştu.";
}

export type RoleCompletion = {
  role: string;
  capacity: number;
  filled: number;
  isFull: boolean;
};

export type TeamCompletion = {
  isTeamProject: boolean;
  roles: RoleCompletion[];
  filledRoles: number;
  totalRoles: number;
  ready: boolean;
};

/**
 * Ekip (coalition/proje detay) sayfalarında "2 / 3 rol tamamlandı" gibi bir
 * özet göstermek için tek yer. checkAndUpdateProjectReadiness() ile AYNI
 * kaynaktan (budget_breakdown + project_team_members) hesaplar, ama DB'ye
 * yazmaz — salt okunur bir görünüm üretir.
 */
export function getTeamCompletion(
  budgetBreakdown: BudgetBreakdownRole[] | null | undefined,
  activeMembers: Array<{ role: string | null }>
): TeamCompletion {
  const roles = Array.isArray(budgetBreakdown) ? budgetBreakdown : [];
  const isTeamProject = roles.length > 0;

  if (!isTeamProject) {
    const filled = activeMembers.length > 0 ? 1 : 0;

    return {
      isTeamProject: false,
      roles: [],
      filledRoles: filled,
      totalRoles: 1,
      ready: filled >= 1,
    };
  }

  const roleCompletions: RoleCompletion[] = roles.map((role) => {
    const roleName = role.role ?? role.name ?? "";
    const capacity = getRoleCapacity(roles, roleName);

    const filled = activeMembers.filter(
      (member) => normalizeRoleName(member.role ?? "") === normalizeRoleName(roleName)
    ).length;

    return {
      role: roleName,
      capacity,
      filled: Math.min(filled, capacity),
      isFull: filled >= capacity,
    };
  });

  const filledRoles = roleCompletions.filter((role) => role.isFull).length;

  return {
    isTeamProject: true,
    roles: roleCompletions,
    filledRoles,
    totalRoles: roleCompletions.length,
    ready: filledRoles === roleCompletions.length,
  };
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
    .select("status")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { projectReady: false, error: projectError?.message ?? "Proje bulunamadı." };
  }

  if (project.status !== "open") {
    // ready_to_start / in_progress / completed / cancelled / paused: dokunma.
    return { projectReady: project.status === "ready_to_start" };
  }

  // Bu fonksiyon her zaman proje sahibi veya (davet kabulü sonrası) aktif
  // bir ekip üyesi tarafından çağrılır — RPC bu durumlarda tam veriyi döner.
  const budgetBreakdown = await fetchBudgetBreakdown(supabase, projectId);

  const { data: activeMembers, error: activeMembersError } = await supabase
    .from("project_team_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("status", "active");

  if (activeMembersError) {
    return { projectReady: false, error: activeMembersError.message };
  }

  const budgetRoles = Array.isArray(budgetBreakdown) ? budgetBreakdown : [];

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
