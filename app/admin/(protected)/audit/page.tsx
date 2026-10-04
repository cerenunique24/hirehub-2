import { AlertTriangle, ScrollText } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";

const EVENT_LABEL: Record<string, string> = {
  moderation_status_changed: "Moderasyon durumu değiştirildi",
  support_ticket_status_changed: "Destek talebi durumu değiştirildi",
  dispute_under_review: "Uyuşmazlık incelemeye alındı",
  dispute_resolved: "Uyuşmazlık çözüldü",
  dispute_closed: "Uyuşmazlık kapatıldı",
  dispute_case_viewed: "Uyuşmazlık dosyası görüntülendi",
  report_reviewing: "Şikayet incelemeye alındı",
  report_actioned: "Şikayet için işlem yapıldı",
  report_dismissed: "Şikayet reddedildi",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminAuditLogPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_log")
    .select("id, event_type, actor_id, target_table, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    console.error("[CollaCrew Admin] Denetim kaydı alınamadı:", error);
    return (
      <div className="space-y-8">
        <PageHeader title="Denetim Kaydı" description="Yönetici işlemlerinin kaydı." />
        <EmptyState
          icon={AlertTriangle}
          tone="error"
          title="Veriler yüklenirken bir hata oluştu."
          description="Denetim kayıtları alınamadı. Sunucu loglarında ayrıntı mevcut."
        />
      </div>
    );
  }

  const actorIds = [...new Set(data.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: profiles } =
    actorIds.length > 0
      ? await supabase.rpc("admin_get_profile_names", { p_ids: actorIds })
      : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> };

  const names = new Map(
    ((profiles ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null }>).map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "Yönetici"])
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Denetim Kaydı"
        description="Yöneticilerin moderasyon, destek, şikayet ve uyuşmazlık işlemleri burada kaydedilir. Kayıtlar değiştirilemez."
      />

      {data.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Henüz kayıt yok."
          description="Yönetici bir işlem yaptığında burada listelenecek."
        />
      ) : (
        <div className="overflow-x-auto border border-[#e5e7eb] bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-xs uppercase tracking-wide text-[#9ca3af]">
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Yönetici</th>
                <th className="px-4 py-3 font-medium">İşlem</th>
                <th className="px-4 py-3 font-medium">Hedef</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-[#f0f0f0] last:border-b-0">
                  <td className="px-4 py-3 text-[#4B5563]">{formatDateTime(row.created_at)}</td>
                  <td className="px-4 py-3 text-[#111111]">{row.actor_id ? (names.get(row.actor_id) ?? "Yönetici") : "Sistem"}</td>
                  <td className="px-4 py-3 text-[#4B5563]">{EVENT_LABEL[row.event_type] ?? row.event_type}</td>
                  <td className="px-4 py-3 text-[#6b7280]">
                    {row.target_table ?? "—"}
                    {row.target_id ? ` · ${String(row.target_id).slice(0, 8)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
