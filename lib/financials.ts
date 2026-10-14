import type { SupabaseClient } from "@supabase/supabase-js";

import { earningsBucketFor } from "@/lib/payments/status";
import { calculateFreelancerNet } from "@/lib/pricing";
import {financialAmount,approvedInMonth} from "@/lib/payments/earningsPresentation";

/**
 * CollaCrew'da henüz gerçek bir ödeme altyapısı (payment gateway) yok.
 * Bu yüzden bu modül kesinlikle "ödendi" / "transfer edildi" gibi bir
 * transaction ÜRETMEZ — yalnızca mevcut proje/proposal/milestone
 * verisinden üç net, dürüst rakam hesaplar:
 *
 *  - engagementValue: bir projedeki toplam iş değeri (freelancer'ın
 *    anlaşma tutarı; client tarafında proje bütçesi).
 *  - realized: gerçekten tamamlanmış/onaylanmış kısım ("Gerçekleşen Kazanç"
 *    / freelancer tarafında, "Tamamlanan İşler" client tarafında).
 *  - pending: henüz onaylanmamış/tamamlanmamış kısım ("Bekleyen Hakediş").
 *
 * Milestone ödeme durumları mevcut; bunlar bir çekilebilir cüzdan bakiyesi
 * veya withdrawal kaydı değildir. Sağlayıcı bağlantısı ayrıca gerekir.
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

export type FreelancerEarningMovement = {
  id:string;projectId:string;projectTitle:string;projectStatus:string|null;
  title:string;status:string|null;paymentStatus:string|null;
  createdAt:string;approvedAt:string|null;gross:number|null;net:number|null;
  freelancerDeduction:number|null;clientPlatformFee:number|null;
  provider:string|null;paymentReference:string|null;
};

export type FreelancerEarningsSummary = {
  totalEngagement: number;
  realizedEarnings: number;
  pendingEarnings: number;
  /** Milestone state totals; release-eligible is not a withdrawable wallet balance. */
  paymentPending: number;
  availableEarnings: number;
  paidEarnings: number;
  projects: ProjectFinancialLine[];
  movements?:FreelancerEarningMovement[];
  approvedThisMonth?:number|null;
  incompleteAmounts?:boolean;
};

export type ClientPaymentsSummary = {
  /** Client'ın ödeyeceği toplam (bütçe + platform ücreti) — aşamalardaki client_total_amount toplamı. */
  totalDueWithFee: number;
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
  const { data: memberships, error: membershipError } = await supabase
    .from("project_team_members")
    .select("project_id, proposal_id, agreed_amount")
    .eq("freelancer_id", freelancerId)
    .eq("status", "active");

  if(membershipError)throw new Error("Anlaşma kayıtları yüklenemedi.");
  const rows = memberships ?? [];
  if (rows.length === 0) {
    return {
      totalEngagement: 0,
      realizedEarnings: 0,
      pendingEarnings: 0,
      paymentPending: 0,
      availableEarnings: 0,
      paidEarnings: 0,
      projects: [],movements:[],approvedThisMonth:0,incompleteAmounts:false,
    };
  }

  const projectIds = [...new Set(rows.map((r) => r.project_id))];
  const proposalIds = rows.map((r) => r.proposal_id).filter((id): id is string => Boolean(id));

  const [{ data: projects, error: projectError }, { data: proposals, error: proposalError }, { data: milestones, error: milestoneError }] = await Promise.all([
    supabase.from("projects").select("id, title, status, team_required").in("id", projectIds),
    proposalIds.length > 0
      ? supabase.from("proposals").select("id, bid_amount").in("id", proposalIds)
      : Promise.resolve({ data: [] as Array<{ id: string; bid_amount: number }>, error:null }),
    supabase
      .from("project_milestones")
      .select("id, project_id, title, budget, status, payment_status, freelancer_id, freelancer_payout_amount, platform_fee_amount, payment_provider, provider_payment_id, approved_at, created_at")
      .in("project_id", projectIds),
  ]);

  if(projectError||proposalError||milestoneError)throw new Error("Kazanç kayıtları yüklenemedi.");

  // Team projelerinde diğer üyelerin aşamaları bu freelancer'ın kazancına sayılmaz.
  const ownMilestones = (milestones ?? []).filter(
    (m) => m.freelancer_id === freelancerId || (m.freelancer_id === null && projects?.find(p=>p.id===m.project_id)?.team_required === false)
  );

  let paymentPending = 0;
  let availableEarnings = 0;
  let paidEarnings = 0;

  for (const m of ownMilestones) {
    const amount = toNumber(m.freelancer_payout_amount ?? calculateFreelancerNet(toNumber(m.budget)));
    const bucket = earningsBucketFor({ milestoneStatus: m.status, paymentStatus: m.payment_status });
    if (bucket === "paid") paidEarnings += amount;
    else if (bucket === "available") availableEarnings += amount;
    else if (bucket === "pending") paymentPending += amount;
  }

  const bidByProposalId = new Map((proposals ?? []).map((p) => [p.id, toNumber(p.bid_amount)]));
  const membershipByProjectId = new Map(rows.map((r) => [r.project_id, r]));

  const lines: ProjectFinancialLine[] = (projects ?? []).map((project) => {
    const membership = membershipByProjectId.get(project.id);
    const proposalId = membership?.proposal_id;
    const bidAmount = proposalId ? bidByProposalId.get(proposalId) : undefined;
    // Eski üyeliklerde anlaşma tutarı yoksa teklif tutarını kullan.
    // Projenin toplam bütçesi tek bir freelancer'ın hakedişi değildir.
    const engagementValue = toNumber(membership?.agreed_amount ?? bidAmount ?? 0);

    const projectMilestones = ownMilestones.filter((m) => m.project_id === project.id);
    const approvedFromMilestones = projectMilestones
      .filter((m) => m.status === "approved")
      .reduce((sum, m) => sum + toNumber(m.freelancer_payout_amount ?? calculateFreelancerNet(toNumber(m.budget))), 0);
    const stagedGross=projectMilestones.reduce((sum,m)=>sum+toNumber(m.budget),0);
    const pendingFromMilestones=projectMilestones.filter(m=>m.status!=="approved"&&!['cancelled','refunded'].includes(m.payment_status??'pending')).reduce((sum,m)=>sum+toNumber(m.freelancer_payout_amount??calculateFreelancerNet(toNumber(m.budget))),0);
    const isCompleted = project.status === "completed";
    const approvedValue = isCompleted&&projectMilestones.length===0 ? calculateFreelancerNet(engagementValue) : Math.min(approvedFromMilestones, calculateFreelancerNet(engagementValue));
    const pendingValue = isCompleted||project.status==='cancelled' ? 0 : Math.min(calculateFreelancerNet(engagementValue),pendingFromMilestones+calculateFreelancerNet(Math.max(engagementValue-stagedGross,0)));

    return {
      projectId: project.id,
      title: project.title,
      status: project.status,
      engagementValue,
      approvedValue,
      pendingValue,
    };
  });

  const movements:FreelancerEarningMovement[]=ownMilestones.map(m=>{
    const project=projects?.find(p=>p.id===m.project_id);
    const gross=financialAmount(m.budget),net=financialAmount(m.freelancer_payout_amount)??(gross===null?null:calculateFreelancerNet(gross));
    return {id:m.id,projectId:m.project_id,projectTitle:project?.title??"Proje bilgisi görünmüyor",projectStatus:project?.status??null,title:m.title,status:m.status,paymentStatus:m.payment_status,createdAt:m.created_at,approvedAt:m.approved_at,gross,net,freelancerDeduction:gross!==null&&net!==null&&net<=gross?Math.round((gross-net)*100)/100:null,clientPlatformFee:financialAmount(m.platform_fee_amount),provider:m.payment_provider,paymentReference:m.provider_payment_id};
  }).sort((a,b)=>Date.parse(b.approvedAt??b.createdAt)-Date.parse(a.approvedAt??a.createdAt));
  const incompleteAmounts=rows.some(row=>financialAmount(row.agreed_amount)===null&&financialAmount(proposals?.find(p=>p.id===row.proposal_id)?.bid_amount)===null)||movements.some(m=>m.net===null||m.gross===null)||rows.some(row=>!projects?.some(p=>p.id===row.project_id));
  return {
    movements,approvedThisMonth:approvedInMonth(movements),incompleteAmounts,
    totalEngagement: lines.reduce((sum, l) => sum + l.engagementValue, 0),
    realizedEarnings: lines.reduce((sum, l) => sum + l.approvedValue, 0),
    pendingEarnings: lines.reduce((sum, l) => sum + l.pendingValue, 0),
    paymentPending,
    availableEarnings,
    paidEarnings,
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
      totalDueWithFee: 0,
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
    .select("project_id, budget, status, client_total_amount")
    .in("project_id", projectIds);

  const totalDueWithFee = (milestones ?? []).reduce(
    (sum, m) => sum + toNumber(m.client_total_amount ?? m.budget),
    0
  );

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
    totalDueWithFee,
    totalBudget: lines.reduce((sum, l) => sum + l.engagementValue, 0),
    activeBudget: lines.filter((l) => l.status === "in_progress").reduce((sum, l) => sum + l.engagementValue, 0),
    completedBudget: lines.filter((l) => l.status === "completed").reduce((sum, l) => sum + l.engagementValue, 0),
    approvedMilestoneTotal: lines.reduce((sum, l) => sum + l.approvedValue, 0),
    pendingObligation: lines.reduce((sum, l) => sum + l.pendingValue, 0),
    projects: lines,
  };
}
