import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminDashboardMetrics = {
  totalUsers: number | null;
  freelancerCount: number | null;
  clientCount: number | null;
  totalProjects: number | null;
  activeProjects: number | null;
  pendingProposals: number | null;
  openSupportTickets: number | null;
  adminCount: number | null;
};

export type RecentSupportTicket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  requesterName: string;
};

export type RecentProject = {
  id: string;
  title: string;
  status: string | null;
  createdAt: string;
  clientName: string;
};

export type AdminDashboardData = {
  metrics: AdminDashboardMetrics;
  recentSupportTickets: RecentSupportTicket[];
  recentProjects: RecentProject[];
  hasError: boolean;
};

type CountFilter = { column: string; op: "eq" | "not_in"; value: string | string[] };

/**
 * Supabase/PostgREST hata objesi bazı durumlarda (özellikle kolon
 * yetkisi reddi) `console.error` ile düz yazdırıldığında `{}` gibi boş
 * görünebilir — `message`/`code`/`details`/`hint` alanları enumerable
 * olmayabiliyor. Bunları geliştirme ortamında açıkça logla; production'da
 * (kullanıcıya hiçbir şey dönmüyor zaten, bu sadece server log'u) yine de
 * tam detay — hassas olan DB şeması değil, sadece hata mesajı.
 */
function logSupabaseError(context: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) {
    console.error(context, "(hata objesi boş/null)");
    return;
  }

  console.error(context, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

async function countRows(
  supabase: SupabaseClient,
  table: string,
  filter?: CountFilter
): Promise<{ count: number | null; error: boolean }> {
  const base = supabase.from(table).select("*", { count: "exact", head: true });

  const query =
    filter?.op === "eq"
      ? base.eq(filter.column, filter.value)
      : filter?.op === "not_in"
        ? base.not(filter.column, "in", `(${(filter.value as string[]).join(",")})`)
        : base;

  const { count, error } = await query;

  if (error) {
    logSupabaseError(`[CollaCrew Admin] "${table}" sayımı alınamadı:`, error);
    return { count: null, error: true };
  }

  return { count, error: false };
}

/**
 * `profiles` tablosu, PII koruması nedeniyle `authenticated` rolüne
 * sadece dar bir kolon listesi için SELECT veriyor (bkz.
 * 202609200002_restrict_profile_pii_exposure.sql). `select("*")` tabanlı
 * `countRows()` bu yüzden `profiles` için HER ZAMAN "permission denied for
 * column ..." ile başarısız olur — kısıtlı kolonları da örtük istiyor.
 * `admin_list_profiles()` ile aynı desendeki `admin_count_profiles()`
 * RPC'si (SECURITY DEFINER + private.is_admin()) kullanılır; hiçbir PII
 * kolonu döndürmez, sadece toplam/freelancer/client sayısı.
 */
async function countProfiles(supabase: SupabaseClient): Promise<{
  total: { count: number | null; error: boolean };
  freelancer: { count: number | null; error: boolean };
  client: { count: number | null; error: boolean };
}> {
  const { data, error } = await supabase.rpc("admin_count_profiles").maybeSingle();

  if (error || !data) {
    logSupabaseError('[CollaCrew Admin] "profiles" sayımı alınamadı (admin_count_profiles):', error);
    const failed = { count: null, error: true };
    return { total: failed, freelancer: failed, client: failed };
  }

  const row = data as unknown as { total_count: number; freelancer_count: number; client_count: number };

  return {
    total: { count: row.total_count, error: false },
    freelancer: { count: row.freelancer_count, error: false },
    client: { count: row.client_count, error: false },
  };
}

function fullNameOf(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "İsimsiz kullanıcı";
}

/**
 * `/admin` dashboard'u için tüm metrikleri gerçek Supabase verisinden
 * hesaplar. `payments` diye bir tablo yok — bu yüzden burada hiçbir
 * ödeme/komisyon rakamı üretilmiyor (bkz. lib/financials.ts, kullanıcı
 * bazında zaten dürüst bir finansal özet sunuyor).
 *
 * Bir metrik hesaplanamazsa (sorgu hata verirse) o alan `null` döner ve
 * sayfa bunu "--" olarak gösterir — asla tahmini bir sayı üretilmez.
 */
export async function getAdminDashboardData(supabase: SupabaseClient): Promise<AdminDashboardData> {
  const [profileCounts, totalProjects, activeProjects, pendingProposals, openSupportTickets, adminCount] =
    await Promise.all([
      countProfiles(supabase),
      countRows(supabase, "projects"),
      countRows(supabase, "projects", { column: "status", op: "eq", value: "in_progress" }),
      countRows(supabase, "proposals", { column: "status", op: "eq", value: "pending" }),
      countRows(supabase, "support_tickets", { column: "status", op: "not_in", value: ["resolved", "closed"] }),
      countRows(supabase, "admin_users"),
    ]);

  const totalUsers = profileCounts.total;
  const freelancerCount = profileCounts.freelancer;
  const clientCount = profileCounts.client;

  const hasCountError = [
    totalUsers,
    freelancerCount,
    clientCount,
    totalProjects,
    activeProjects,
    pendingProposals,
    openSupportTickets,
    adminCount,
  ].some((r) => r.error);

  const [{ data: ticketRows, error: ticketError }, { data: projectRows, error: projectError }] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("id, subject, status, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("projects")
      .select("id, title, status, created_at, client_id")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (ticketError) {
    console.error("[CollaCrew Admin] Son destek talepleri alınamadı:", ticketError);
  }
  if (projectError) {
    console.error("[CollaCrew Admin] Son projeler alınamadı:", projectError);
  }

  const userIds = [
    ...new Set([
      ...(ticketRows ?? []).map((t) => t.user_id),
      ...(projectRows ?? []).map((p) => p.client_id),
    ]),
  ];

  let namesById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    namesById = new Map((profileRows ?? []).map((p) => [p.id, fullNameOf(p.first_name, p.last_name)]));
  }

  const recentSupportTickets: RecentSupportTicket[] = (ticketRows ?? []).map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    createdAt: t.created_at,
    requesterName: namesById.get(t.user_id) ?? "Bilinmeyen kullanıcı",
  }));

  const recentProjects: RecentProject[] = (projectRows ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    createdAt: p.created_at,
    clientName: namesById.get(p.client_id) ?? "Bilinmeyen client",
  }));

  return {
    metrics: {
      totalUsers: totalUsers.count,
      freelancerCount: freelancerCount.count,
      clientCount: clientCount.count,
      totalProjects: totalProjects.count,
      activeProjects: activeProjects.count,
      pendingProposals: pendingProposals.count,
      openSupportTickets: openSupportTickets.count,
      adminCount: adminCount.count,
    },
    recentSupportTickets,
    recentProjects,
    hasError: hasCountError || Boolean(ticketError) || Boolean(projectError),
  };
}
