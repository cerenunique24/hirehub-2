import { AlertTriangle, Star } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import ReviewsManager, { type AdminReview } from "./ReviewsManager";

function nameOf(first: string | null, last: string | null) {
  return [first, last].filter(Boolean).join(" ").trim() || "İsimsiz kullanıcı";
}

export default async function AdminReviewsPage() {
  const supabase = await createClient();

  const [{ data: reviews, error }, { data: reportedRows }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, project_id, reviewer_id, reviewee_id, rating, comment, is_hidden, moderation_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("user_reports")
      .select("target_id")
      .eq("target_type", "review")
      .in("status", ["new", "reviewing"]),
  ]);

  if (error || !reviews) {
    console.error("[CollaCrew Admin] Değerlendirmeler alınamadı:", error);
    return (
      <div className="space-y-8">
        <PageHeader title="Değerlendirmeler" description="Kullanıcı değerlendirmelerini yönet." />
        <EmptyState
          icon={AlertTriangle}
          tone="error"
          title="Veriler yüklenirken bir hata oluştu."
          description="Değerlendirme kayıtları alınamadı. Sunucu loglarında ayrıntı mevcut."
        />
      </div>
    );
  }

  const reportedReviewIds = new Set((reportedRows ?? []).map((r) => r.target_id));
  const userIds = [...new Set(reviews.flatMap((r) => [r.reviewer_id, r.reviewee_id]))];
  const projectIds = [...new Set(reviews.map((r) => r.project_id))];

  const [{ data: profiles }, { data: projects }] = await Promise.all([
    userIds.length > 0
      ? supabase.rpc("admin_get_profile_names", { p_ids: userIds })
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> }),
    projectIds.length > 0
      ? supabase.from("projects").select("id, title").in("id", projectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
  ]);

  const names = new Map(((profiles ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null }>).map((p) => [p.id, nameOf(p.first_name, p.last_name)]));
  const projectTitles = new Map((projects ?? []).map((p) => [p.id, p.title]));

  const items: AdminReview[] = reviews.map((r) => ({
    id: r.id,
    projectTitle: projectTitles.get(r.project_id) ?? "Proje",
    reviewerName: names.get(r.reviewer_id) ?? "Bilinmeyen kullanıcı",
    revieweeName: names.get(r.reviewee_id) ?? "Bilinmeyen kullanıcı",
    rating: r.rating,
    comment: r.comment,
    isHidden: r.is_hidden,
    moderationReason: r.moderation_reason,
    createdAt: r.created_at,
    isReported: reportedReviewIds.has(r.id),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Değerlendirmeler"
        description="Kullanıcıların birbirine verdiği değerlendirmeleri incele; şikayet edilenleri önce gör, gerekirse bir nedenle gizle. Değerlendirme içeriği düzenlenemez — sadece gizlenebilir/gösterilebilir."
      />

      {items.length === 0 ? (
        <EmptyState icon={Star} title="Henüz değerlendirme yok." description="Projeler tamamlandığında burada listelenecek." />
      ) : (
        <ReviewsManager reviews={items} />
      )}
    </div>
  );
}
