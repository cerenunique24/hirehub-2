import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * CollaCrew'da henüz gerçek bir ödeme altyapısı (payment gateway) yok.
 * Bu yüzden bu modül kesinlikle "ödendi" / "transfer edildi" gibi bir
 * transaction ÜRETMEZ — yalnızca mevcut proje/proposal/milestone
 * verisinden üç net, dürüst rakam hesaplar:
 *
 *  - engagementValue: bir projedeki toplam iş değeri (freelancer'ın kabul
 *    edilen teklif tutarı, ya da proje bütçesi).
 *  - realized: gerçekten tamamlanmış/onaylanmış kısım ("Gerçekleşen Kazanç"
 *    / freelancer tarafında, "Tamamlanan İşler" client tarafında).
 *  - pending: henüz onaylanmamış/tamamlanmamış kısım ("Bekleyen Hakediş").
 *
 * Ödeme durumu diye bir alan YOKTUR — UI bunu ayrı ve açık şekilde
 * "ödeme altyapısı henüz aktif değil" olarak göstermelidir.
 */

export type ProjectFinancialLine = {
  projectId: string;
  title: string;
  status: string | null;
  engagementValue: number;
  approvedValue: number;
  pendingValue: number;
  /** Client commission rate frozen on the project (projects.commission_rate). */
  commissionRate?: number | null;
};

export type FreelancerEarningsSummary = {
  totalEngagement: number;
  realizedEarnings: number;
  pendingEarnings: number;
  projects: ProjectFinancialLine[];
};

export type ClientPaymentsSummary = {
  totalBudget: number;
  activeBudget: number;
  completedBudget: number;
  approvedMilestoneTotal: number;
  pendingObligation: number;
  projects: ProjectFinancialLine[];
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getFreelancerEarningsSummary(
  supabase: SupabaseClient,
  freelancerId: string
): Promise<FreelancerEarningsSummary> {
  const { data: memberships } = await supabase
    .from("project_team_members")
    .select("project_id, proposal_id")
    .eq("freelancer_id", freelancerId)
    .eq("status", "active");

  const rows = memberships ?? [];
  if (rows.length === 0) {
    return { totalEngagement: 0, realizedEarnings: 0, pendingEarnings: 0, projects: [] };
  }

  const projectIds = [...new Set(rows.map((r) => r.project_id))];
  const proposalIds = rows.map((r) => r.proposal_id).filter((id): id is string => Boolean(id));

  const [{ data: projects }, { data: proposals }, { data: milestones }] = await Promise.all([
    supabase.from("projects").select("id, title, status, budget, budget_max").in("id", projectIds),
    proposalIds.length > 0
      ? supabase.from("proposals").select("id, bid_amount").in("id", proposalIds)
      : Promise.resolve({ data: [] as Array<{ id: string; bid_amount: number }> }),
    supabase.from("project_milestones").select("project_id, budget, status").in("project_id", projectIds),
  ]);

  const bidByProposalId = new Map((proposals ?? []).map((p) => [p.id, toNumber(p.bid_amount)]));
  const proposalIdByProjectId = new Map(rows.map((r) => [r.project_id, r.proposal_id]));

  const lines: ProjectFinancialLine[] = (projects ?? []).map((project) => {
    const proposalId = proposalIdByProjectId.get(project.id);
    const bidAmount = proposalId ? bidByProposalId.get(proposalId) : undefined;
    const engagementValue = bidAmount ?? toNumber(project.budget_max ?? project.budget ?? 0);

    const projectMilestones = (milestones ?? []).filter((m) => m.project_id === project.id);
    const approvedFromMilestones = projectMilestones
      .filter((m) => m.status === "approved")
      .reduce((sum, m) => sum + toNumber(m.budget), 0);

    const isCompleted = project.status === "completed";
    const approvedValue = isCompleted ? engagementValue : Math.min(approvedFromMilestones, engagementValue);
    const pendingValue = isCompleted ? 0 : Math.max(engagementValue - approvedValue, 0);

    return {
      projectId: project.id,
      title: project.title,
      status: project.status,
      engagementValue,
      approvedValue,
      pendingValue,
    };
  });

  return {
    totalEngagement: lines.reduce((sum, l) => sum + l.engagementValue, 0),
    realizedEarnings: lines.reduce((sum, l) => sum + l.approvedValue, 0),
    pendingEarnings: lines.reduce((sum, l) => sum + l.pendingValue, 0),
    projects: lines,
  };
}

export async function getClientPaymentsSummary(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientPaymentsSummary> {
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, budget, budget_max, commission_rate")
    .eq("client_id", clientId);

  const projectRows = projects ?? [];
  if (projectRows.length === 0) {
    return {
      totalBudget: 0,
      activeBudget: 0,
      completedBudget: 0,
      approvedMilestoneTotal: 0,
      pendingObligation: 0,
      projects: [],
    };
  }

  const projectIds = projectRows.map((p) => p.id);
  const { data: milestones } = await supabase
    .from("project_milestones")
    .select("project_id, budget, status")
    .in("project_id", projectIds);

  const lines: ProjectFinancialLine[] = projectRows.map((project) => {
    const engagementValue = toNumber(project.budget_max ?? project.budget ?? 0);
    const projectMilestones = (milestones ?? []).filter((m) => m.project_id === project.id);
    const approvedFromMilestones = projectMilestones
      .filter((m) => m.status === "approved")
      .reduce((sum, m) => sum + toNumber(m.budget), 0);

    const isCompleted = project.status === "completed";
    const approvedValue = isCompleted ? engagementValue : Math.min(approvedFromMilestones, engagementValue);
    const pendingValue = project.status === "in_progress" ? Math.max(engagementValue - approvedValue, 0) : 0;

    return {
      projectId: project.id,
      title: project.title,
      status: project.status,
      engagementValue,
      approvedValue,
      pendingValue,
      commissionRate: project.commission_rate === null || project.commission_rate === undefined
        ? null
        : Number(project.commission_rate),
    };
  });

  return {
    totalBudget: lines.reduce((sum, l) => sum + l.engagementValue, 0),
    activeBudget: lines.filter((l) => l.status === "in_progress").reduce((sum, l) => sum + l.engagementValue, 0),
    completedBudget: lines.filter((l) => l.status === "completed").reduce((sum, l) => sum + l.engagementValue, 0),
    approvedMilestoneTotal: lines.reduce((sum, l) => sum + l.approvedValue, 0),
    pendingObligation: lines.reduce((sum, l) => sum + l.pendingValue, 0),
    projects: lines,
  };
}
