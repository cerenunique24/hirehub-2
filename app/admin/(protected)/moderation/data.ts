import type { SupabaseClient } from "@supabase/supabase-js";

export type ModerationFlagStatus = "new" | "reviewed" | "actioned" | "closed";

export type AdminModerationFlag = {
  id: string;
  userId: string | null;
  userName: string;
  sourceTable: string;
  sourceColumn: string;
  sourceRowId: string | null;
  snippet: string;
  riskReason: string | null;
  status: ModerationFlagStatus;
  createdAt: string;
};

function fullNameOf(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "İsimsiz kullanıcı";
}

export async function listModerationFlags(
  supabase: SupabaseClient
): Promise<{ items: AdminModerationFlag[]; error: boolean }> {
  const { data, error } = await supabase
    .from("moderation_flags")
    .select("id, user_id, source_table, source_column, source_row_id, snippet, risk_reason, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    console.error("[CollaCrew Admin] Moderasyon kayıtları alınamadı:", error);
    return { items: [], error: true };
  }

  const userIds = [...new Set(data.map((row) => row.user_id).filter((id): id is string => Boolean(id)))];
  let namesById = new Map<string, string>();

  if (userIds.length > 0) {
    // `moderation_flags.user_id` görüldüğü kadarıyla farklı kullanıcılara
    // ait olabilir — email gerekmediği için burada dar-kapsamlı
    // (id/first_name/last_name) genel grant yeterli, admin RPC'sine
    // gerek yok.
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    namesById = new Map((profileRows ?? []).map((p) => [p.id, fullNameOf(p.first_name, p.last_name)]));
  }

  return {
    items: data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_id ? (namesById.get(row.user_id) ?? "Bilinmeyen kullanıcı") : "Sistem",
      sourceTable: row.source_table,
      sourceColumn: row.source_column,
      sourceRowId: row.source_row_id,
      snippet: row.snippet,
      riskReason: row.risk_reason,
      status: row.status as ModerationFlagStatus,
      createdAt: row.created_at,
    })),
    error: false,
  };
}

export async function updateModerationFlagStatus(
  supabase: SupabaseClient,
  id: string,
  status: ModerationFlagStatus,
  reviewedBy: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("moderation_flags")
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy })
    .eq("id", id);

  if (error) {
    console.error("[CollaCrew Admin] Moderasyon durumu güncellenemedi:", error);
    return { error: true };
  }

  return { error: false };
}
