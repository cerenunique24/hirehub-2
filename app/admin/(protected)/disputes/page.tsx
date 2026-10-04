import { AlertTriangle, Scale } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import DisputesManager, { type AdminDispute } from "./DisputesManager";

function nameOf(first: string | null, last: string | null) {
  return [first, last].filter(Boolean).join(" ").trim() || "İsimsiz kullanıcı";
}

export default async function AdminDisputesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("disputes")
    .select(
      "id, project_id, milestone_id, opened_by, opener_role, against_user, reason, description, status, resolution, resolution_outcome, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    console.error("[CollaCrew Admin] Uyuşmazlıklar alınamadı:", error);
    return (
      <div className="space-y-8">
        <PageHeader title="Uyuşmazlıklar" description="Client ve freelancer arasındaki uyuşmazlıkları yönet." />
        <EmptyState
          icon={AlertTriangle}
          tone="error"
          title="Veriler yüklenirken bir hata oluştu."
          description="Uyuşmazlık kayıtları alınamadı. Sunucu loglarında ayrıntı mevcut."
        />
      </div>
    );
  }

  const projectIds = [...new Set(data.map((d) => d.project_id))];
  const userIds = [
    ...new Set(data.flatMap((d) => [d.opened_by, d.against_user]).filter((id): id is string => Boolean(id))),
  ];

  const [{ data: projects }, { data: profiles }] = await Promise.all([
    projectIds.length > 0
      ? supabase.from("projects").select("id, title").in("id", projectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    userIds.length > 0
      ? supabase.rpc("admin_get_profile_names", { p_ids: userIds })
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> }),
  ]);

  const projectTitles = new Map((projects ?? []).map((p) => [p.id, p.title]));
  const names = new Map(((profiles ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null }>).map((p) => [p.id, nameOf(p.first_name, p.last_name)]));

  const disputes: AdminDispute[] = data.map((d) => ({
    id: d.id,
    projectId: d.project_id,
    projectTitle: projectTitles.get(d.project_id) ?? "Proje",
    openedByName: names.get(d.opened_by) ?? "Bilinmeyen kullanıcı",
    openerRole: d.opener_role as "client" | "freelancer",
    againstName: d.against_user ? (names.get(d.against_user) ?? "Bilinmeyen kullanıcı") : "—",
    reason: d.reason,
    description: d.description,
    status: d.status,
    resolution: d.resolution,
    resolutionOutcome: d.resolution_outcome,
    createdAt: d.created_at,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Uyuşmazlıklar"
        description="Client ve freelancer arasındaki uyuşmazlıkları incele; proje, teslim, aşama ve mesaj geçmişini görüntüle ve çözümle. Mesaj geçmişine erişim denetim kaydına yazılır."
      />

      {disputes.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Açık uyuşmazlık yok."
          description="Kullanıcılar bir proje için uyuşmazlık açtığında burada listelenecek."
        />
      ) : (
        <DisputesManager disputes={disputes} />
      )}
    </div>
  );
}
