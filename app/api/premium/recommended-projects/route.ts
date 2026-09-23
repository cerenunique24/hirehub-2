import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireFeatureAccess, canUseFeature } from "@/lib/premium";
import { matchFreelancerToProjectRoles } from "@/lib/ai/match-talent";

/**
 * GET /api/premium/recommended-projects
 *
 * Plus "Smart Project Alerts" / kişiselleştirilmiş proje akışı —
 * NORMAL matching sisteminin YERİNE geçmez (Discover/proje detay
 * herkes için aynı deterministic matchFreelancerToProjectRoles
 * fonksiyonunu kullanmaya devam eder). Bu endpoint sadece Plus+
 * freelancer için, gerçek geçmiş başvuru davranışını (hangi
 * kategorilere daha çok başvurmuş) ikinci bir sıralama sinyali olarak
 * ekleyip daha kişiselleştirilmiş bir liste sunar. Pro kullanıcılar
 * "advanced_matching" ile daha geniş bir aday havuzu görür.
 *
 * "Kesin kazanırsın" gibi ifadeler kullanılmaz — yalnızca açıklayıcı
 * etiketler ("Profilinle güçlü eşleşiyor") döner.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const access = await requireFeatureAccess(supabase, "smart_project_alerts");

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.context.userId === null
              ? "Bu bilgileri görmek için giriş yapmalısınız."
              : access.context.role !== "freelancer"
                ? "Bu özellik yalnızca freelancer hesapları için kullanılabilir."
                : "Bu özellik Plus ve üzeri paketlere özeldir.",
          requiredPlan: "plus",
        },
        { status: access.context.userId === null ? 401 : 403 }
      );
    }

    const user = { id: access.context.userId! };
    const resultLimit = canUseFeature(access.context, "advanced_matching") ? 12 : 6;

    const [{ data: openProjects, error: projectsError }, { data: pastProposals }] =
      await Promise.all([
        supabase
          .from("projects")
          .select("id, title, category, status")
          .eq("status", "open"),

        supabase
          .from("proposals")
          .select("status, projects(category)")
          .eq("freelancer_id", user.id),
      ]);

    if (projectsError) {
      console.error("[Premium recommendations] projects fetch error:", projectsError);
      return NextResponse.json(
        { error: "Projeler alınamadı." },
        { status: 500 }
      );
    }

    /*
     * Kategori affinity: geçmişte kabul edilen tekliflerin kategorisi
     * en güçlü sinyal, gönderilen (ama henüz sonuçlanmamış/reddedilen)
     * teklifler daha zayıf bir sinyal olarak sayılır. Gerçek veri
     * yoksa affinity haritası boş kalır ve sıralama sadece match
     * skoruna göre yapılır.
     */
    const categoryAffinity = new Map<string, number>();

    for (const row of pastProposals ?? []) {
      const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      const category = project?.category;
      if (!category) continue;

      const weight = row.status === "accepted" ? 2 : 1;
      categoryAffinity.set(category, (categoryAffinity.get(category) ?? 0) + weight);
    }

    const results = await Promise.all(
      (openProjects ?? []).map(async (project) => {
        try {
          const matches = await matchFreelancerToProjectRoles(
            supabase,
            project.id,
            user.id
          );

          const bestEligible = matches.find((m) => m.isEligibleForRole);
          if (!bestEligible) return null;

          const affinity = project.category
            ? categoryAffinity.get(project.category) ?? 0
            : 0;

          return {
            projectId: project.id,
            title: project.title,
            category: project.category,
            role: bestEligible.role,
            score: bestEligible.score,
            reason: bestEligible.reason,
            budgetPerPerson: bestEligible.budgetPerPerson ?? null,
            duration: bestEligible.duration ?? null,
            personalizedTag:
              affinity >= 2
                ? "Geçmişte bu kategoride başarılı oldun"
                : affinity >= 1
                  ? "Geçmişte bu kategoriye başvurdun"
                  : null,
            affinity,
          };
        } catch (error) {
          console.error(
            `[Premium recommendations] match error for project ${project.id}:`,
            error
          );
          return null;
        }
      })
    );

    const recommendations = results
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        if (b.affinity !== a.affinity) return b.affinity - a.affinity;
        return b.score - a.score;
      })
      .slice(0, resultLimit)
      .map(({ affinity: _affinity, ...rest }) => rest);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("[Premium recommendations] unexpected error:", error);
    return NextResponse.json(
      { error: "Öneriler hesaplanırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
