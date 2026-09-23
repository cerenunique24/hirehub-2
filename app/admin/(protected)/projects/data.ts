import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminProjectListItem = {
  id: string;
  title: string;
  status: string | null;
  budget: number | null;
  createdAt: string;
  clientId: string;
  clientName: string;
};

function fullNameOf(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "İsimsiz kullanıcı";
}

export async function listAdminProjects(
  supabase: SupabaseClient
): Promise<{ items: AdminProjectListItem[]; error: boolean }> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, status, budget, budget_max, created_at, client_id")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[CollaCrew Admin] Proje listesi alınamadı:", error);
    return { items: [], error: true };
  }

  const clientIds = [...new Set(data.map((p) => p.client_id))];
  let namesById = new Map<string, string>();

  if (clientIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", clientIds);

    if (profileError) {
      console.error("[CollaCrew Admin] Proje client isimleri alınamadı:", profileError);
    }

    namesById = new Map((profileRows ?? []).map((p) => [p.id, fullNameOf(p.first_name, p.last_name)]));
  }

  return {
    items: data.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      budget: p.budget_max ?? p.budget ?? null,
      createdAt: p.created_at,
      clientId: p.client_id,
      clientName: namesById.get(p.client_id) ?? "Bilinmeyen client",
    })),
    error: false,
  };
}
