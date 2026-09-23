import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminProposalListItem = {
  id: string;
  freelancerId: string;
  freelancerName: string;
  projectId: string;
  projectTitle: string;
  bidAmount: number;
  status: string;
  createdAt: string;
};

function fullNameOf(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "İsimsiz kullanıcı";
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function listAdminProposals(
  supabase: SupabaseClient
): Promise<{ items: AdminProposalListItem[]; error: boolean }> {
  const { data, error } = await supabase
    .from("proposals")
    .select("id, project_id, freelancer_id, bid_amount, status, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[CollaCrew Admin] Teklif listesi alınamadı:", error);
    return { items: [], error: true };
  }

  const projectIds = [...new Set(data.map((p) => p.project_id))];
  const freelancerIds = [...new Set(data.map((p) => p.freelancer_id))];

  const [{ data: projectRows, error: projectError }, { data: freelancerRows, error: freelancerError }] =
    await Promise.all([
      projectIds.length > 0
        ? supabase.from("projects").select("id, title").in("id", projectIds)
        : Promise.resolve({ data: [] as Array<{ id: string; title: string }>, error: null }),
      freelancerIds.length > 0
        ? supabase.from("profiles").select("id, first_name, last_name").in("id", freelancerIds)
        : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }>, error: null }),
    ]);

  if (projectError) {
    console.error("[CollaCrew Admin] Teklif proje başlıkları alınamadı:", projectError);
  }
  if (freelancerError) {
    console.error("[CollaCrew Admin] Teklif freelancer isimleri alınamadı:", freelancerError);
  }

  const titleByProjectId = new Map((projectRows ?? []).map((p) => [p.id, p.title]));
  const nameByFreelancerId = new Map(
    (freelancerRows ?? []).map((f) => [f.id, fullNameOf(f.first_name, f.last_name)])
  );

  return {
    items: data.map((p) => ({
      id: p.id,
      freelancerId: p.freelancer_id,
      freelancerName: nameByFreelancerId.get(p.freelancer_id) ?? "Bilinmeyen freelancer",
      projectId: p.project_id,
      projectTitle: titleByProjectId.get(p.project_id) ?? "Bilinmeyen proje",
      bidAmount: toNumber(p.bid_amount),
      status: p.status,
      createdAt: p.created_at,
    })),
    error: false,
  };
}
