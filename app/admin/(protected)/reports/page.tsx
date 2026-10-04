import { AlertTriangle, Flag } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import ReportsManager, { type AdminReport } from "./ReportsManager";

function nameOf(first: string | null, last: string | null) {
  return [first, last].filter(Boolean).join(" ").trim() || "İsimsiz kullanıcı";
}

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_reports")
    .select("id, reporter_id, target_type, target_id, reported_user_id, reason, details, status, admin_note, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    console.error("[CollaCrew Admin] Şikayetler alınamadı:", error);
    return (
      <div className="space-y-8">
        <PageHeader title="Şikayetler" description="Kullanıcı, proje ve mesaj şikayetlerini incele." />
        <EmptyState
          icon={AlertTriangle}
          tone="error"
          title="Veriler yüklenirken bir hata oluştu."
          description="Şikayet kayıtları alınamadı. Sunucu loglarında ayrıntı mevcut."
        />
      </div>
    );
  }

  const userIds = [
    ...new Set(data.flatMap((r) => [r.reporter_id, r.reported_user_id]).filter((id): id is string => Boolean(id))),
  ];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.rpc("admin_get_profile_names", { p_ids: userIds })
      : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> };

  const names = new Map(((profiles ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null }>).map((p) => [p.id, nameOf(p.first_name, p.last_name)]));

  const reports: AdminReport[] = data.map((r) => ({
    id: r.id,
    reporterName: names.get(r.reporter_id) ?? "Bilinmeyen kullanıcı",
    reportedName: r.reported_user_id ? (names.get(r.reported_user_id) ?? "Bilinmeyen kullanıcı") : "—",
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    adminNote: r.admin_note,
    createdAt: r.created_at,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Şikayetler"
        description="Kullanıcıların bildirdiği kullanıcı, proje ve mesaj şikayetleri. Her durum değişikliği denetim kaydına yazılır."
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="Şikayet bulunmuyor."
          description="Bir kullanıcı içerik veya kullanıcı şikayet ettiğinde burada listelenecek."
        />
      ) : (
        <ReportsManager reports={reports} />
      )}
    </div>
  );
}
