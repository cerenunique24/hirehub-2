import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getClientPaymentsSummary,
  getFreelancerEarningsSummary,
} from "@/lib/financials";

export type AdminUserRole = "freelancer" | "client";

export type ProfileStatusTone = "complete" | "partial" | "incomplete";

export type AdminUserListItem = {
  id: string;
  fullName: string;
  email: string | null;
  role: AdminUserRole | null;
  createdAt: string;
  profileCompletion: number;
  avatarUrl: string | null;
};

export type AdminUserProfile = AdminUserListItem & {
  title: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  accountType: string | null;
  companyName: string | null;
};

/**
 * `admin_list_profiles()` RPC'sinin satır şekli — `public.profiles`'ın
 * `authenticated` rolüne kısıtlanmış kolonlarını (email, phone, vb.)
 * SECURITY DEFINER ile aşan tek yer burasıdır (bkz. migration
 * restore_profile_pii_restriction_and_admin_rpc). Projede generate edilmiş
 * Database tipi olmadığı için supabase-js `.rpc()` çıktısı `{}` olarak
 * çıkarımlanıyor — bu tip, admin veri katmanının ihtiyaç duyduğu ham
 * satır alanlarını açıkça belirtir.
 */
type AdminProfileRpcRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
  profile_completion: number | null;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  account_type: string | null;
  company_name: string | null;
};

export type AdminActivityProject = {
  id: string;
  title: string;
  status: string | null;
  createdAt: string;
  budget: number | null;
};

export type AdminActivityProposal = {
  id: string;
  projectId: string;
  projectTitle: string;
  status: string;
  bidAmount: number;
  createdAt: string;
};

export type AdminActivitySupportTicket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
};

export type AdminFinancialSummary = {
  totalLabel: string;
  total: number;
  realizedLabel: string;
  realized: number;
  pendingLabel: string;
  pending: number;
};

export type AdminUserActivity = {
  projects: AdminActivityProject[];
  proposals: AdminActivityProposal[];
  supportTickets: AdminActivitySupportTicket[];
  financials: AdminFinancialSummary | null;
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRole(role: unknown): AdminUserRole | null {
  return role === "freelancer" || role === "client" ? role : null;
}

function fullNameOf(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "İsimsiz kullanıcı";
}

/**
 * Profil tamamlanma oranından okunabilir bir durum etiketi türetir.
 * `profiles` tablosunda ayrı bir hesap durumu (aktif/askıya alınmış vb.)
 * alanı yok — bu yüzden gerçekten var olan `profile_completion`
 * kolonundan dürüst bir sınıflandırma üretiyoruz, uydurma bir alan
 * eklemiyoruz.
 */
export function profileStatus(completion: number): { label: string; tone: ProfileStatusTone } {
  if (completion >= 80) return { label: "Tamamlandı", tone: "complete" };
  if (completion >= 30) return { label: "Kısmi", tone: "partial" };
  return { label: "Eksik", tone: "incomplete" };
}

export async function listAdminUsers(
  supabase: SupabaseClient
): Promise<{ items: AdminUserListItem[]; error: boolean }> {
  // `profiles`'ta email/created_at gibi kolonlar `authenticated` rolüne
  // artık kısıtlı (bkz. 202609200002_restrict_profile_pii_exposure.sql) —
  // admin bu kolonlara yalnızca `admin_list_profiles()` RPC'si üzerinden
  // erişir (SECURITY DEFINER, sadece admin_users üyeleri için tüm satırlar).
  const { data, error } = await supabase
    .rpc("admin_list_profiles")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[CollaCrew Admin] Kullanıcı listesi alınamadı:", error);
    return { items: [], error: true };
  }

  const rows = data as unknown as AdminProfileRpcRow[];

  return {
    items: rows.map((row) => ({
      id: row.id,
      fullName: fullNameOf(row.first_name, row.last_name),
      email: row.email,
      role: normalizeRole(row.role),
      createdAt: row.created_at,
      profileCompletion: row.profile_completion ?? 0,
      avatarUrl: row.avatar_url,
    })),
    error: false,
  };
}

export async function getAdminUserProfile(
  supabase: SupabaseClient,
  id: string
): Promise<AdminUserProfile | null> {
  const { data: rawData, error } = await supabase
    .rpc("admin_list_profiles")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[CollaCrew Admin] Kullanıcı profili alınamadı:", error);
    return null;
  }

  if (!rawData) {
    return null;
  }

  const data = rawData as unknown as AdminProfileRpcRow;

  return {
    id: data.id,
    fullName: fullNameOf(data.first_name, data.last_name),
    email: data.email,
    role: normalizeRole(data.role),
    createdAt: data.created_at,
    profileCompletion: data.profile_completion ?? 0,
    avatarUrl: data.avatar_url,
    title: data.title,
    bio: data.bio,
    phone: data.phone,
    city: data.city,
    country: data.country,
    accountType: data.account_type,
    companyName: data.company_name,
  };
}

async function getClientProjectsAndProposals(
  supabase: SupabaseClient,
  clientId: string
): Promise<{ projects: AdminActivityProject[]; proposals: AdminActivityProposal[] }> {
  const { data: projectRows } = await supabase
    .from("projects")
    .select("id, title, status, created_at, budget, budget_max")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const projects = (projectRows ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    createdAt: p.created_at,
    budget: p.budget_max ?? p.budget ?? null,
  }));

  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) {
    return { projects, proposals: [] };
  }

  const { data: proposalRows } = await supabase
    .from("proposals")
    .select("id, project_id, status, bid_amount, created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  const titleByProjectId = new Map(projects.map((p) => [p.id, p.title]));

  const proposals = (proposalRows ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectTitle: titleByProjectId.get(row.project_id) ?? "Bilinmeyen proje",
    status: row.status,
    bidAmount: toNumber(row.bid_amount),
    createdAt: row.created_at,
  }));

  return { projects, proposals };
}

async function getFreelancerProjectsAndProposals(
  supabase: SupabaseClient,
  freelancerId: string
): Promise<{ projects: AdminActivityProject[]; proposals: AdminActivityProposal[] }> {
  const [{ data: memberships }, { data: proposalRows }] = await Promise.all([
    supabase
      .from("project_team_members")
      .select("project_id, created_at")
      .eq("freelancer_id", freelancerId)
      .eq("status", "active"),
    supabase
      .from("proposals")
      .select("id, project_id, status, bid_amount, created_at")
      .eq("freelancer_id", freelancerId)
      .order("created_at", { ascending: false }),
  ]);

  const projectIds = [
    ...new Set([
      ...(memberships ?? []).map((m) => m.project_id),
      ...(proposalRows ?? []).map((p) => p.project_id),
    ]),
  ];

  let projectsById = new Map<string, { title: string; status: string | null; createdAt: string; budget: number | null }>();

  if (projectIds.length > 0) {
    const { data: projectRows } = await supabase
      .from("projects")
      .select("id, title, status, created_at, budget, budget_max")
      .in("id", projectIds);

    projectsById = new Map(
      (projectRows ?? []).map((p) => [
        p.id,
        { title: p.title, status: p.status, createdAt: p.created_at, budget: p.budget_max ?? p.budget ?? null },
      ])
    );
  }

  const projects = (memberships ?? [])
    .map((m) => {
      const project = projectsById.get(m.project_id);
      if (!project) return null;
      return {
        id: m.project_id,
        title: project.title,
        status: project.status,
        createdAt: project.createdAt,
        budget: project.budget,
      };
    })
    .filter((p): p is AdminActivityProject => p !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const proposals = (proposalRows ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectTitle: projectsById.get(row.project_id)?.title ?? "Bilinmeyen proje",
    status: row.status,
    bidAmount: toNumber(row.bid_amount),
    createdAt: row.created_at,
  }));

  return { projects, proposals };
}

async function getSupportTickets(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminActivitySupportTicket[]> {
  const { data } = await supabase
    .from("support_tickets")
    .select("id, subject, status, priority, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
  }));
}

/**
 * CollaCrew'da henüz gerçek bir ödeme altyapısı yok (bkz. lib/financials.ts).
 * Bu yüzden "Ödemeler" aktivitesi, freelancer/client'a göre gerçek proje ve
 * milestone verisinden hesaplanan iş değeri / gerçekleşen / bekleyen
 * tutarları gösterir — hiçbir "ödendi" kaydı üretmez.
 */
async function getFinancialSummary(
  supabase: SupabaseClient,
  userId: string,
  role: AdminUserRole | null
): Promise<AdminFinancialSummary | null> {
  if (role === "freelancer") {
    const summary = await getFreelancerEarningsSummary(supabase, userId);
    return {
      totalLabel: "Toplam İş Değeri",
      total: summary.totalEngagement,
      realizedLabel: "Gerçekleşen Kazanç",
      realized: summary.realizedEarnings,
      pendingLabel: "Bekleyen Hakediş",
      pending: summary.pendingEarnings,
    };
  }

  if (role === "client") {
    const summary = await getClientPaymentsSummary(supabase, userId);
    return {
      totalLabel: "Toplam Bütçe",
      total: summary.totalBudget,
      realizedLabel: "Onaylanan Milestone Tutarı",
      realized: summary.approvedMilestoneTotal,
      pendingLabel: "Bekleyen Yükümlülük",
      pending: summary.pendingObligation,
    };
  }

  return null;
}

export async function getAdminUserActivity(
  supabase: SupabaseClient,
  userId: string,
  role: AdminUserRole | null
): Promise<AdminUserActivity> {
  const [{ projects, proposals }, supportTickets, financials] = await Promise.all([
    role === "client"
      ? getClientProjectsAndProposals(supabase, userId)
      : role === "freelancer"
        ? getFreelancerProjectsAndProposals(supabase, userId)
        : Promise.resolve({ projects: [], proposals: [] }),
    getSupportTickets(supabase, userId),
    getFinancialSummary(supabase, userId, role),
  ]);

  return { projects, proposals, supportTickets, financials };
}
