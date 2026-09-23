import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireFeatureAccess, canUseFeature } from "@/lib/premium";
import { matchFreelancerToProjectRoles } from "@/lib/ai/match-talent";

/**
 * GET /api/premium/client/ai-shortlist?projectId=...
 *
 * Client "AI Freelancer Shortlist" (Plus) / "Gelişmiş AI Shortlist"
 * (Pro) — client'ın kendi projesi için, TÜM freelancer havuzunu aynı
 * deterministic role-eligibility motoruyla (matchFreelancerToProjectRoles
 * — Discover/proposal ile birebir aynı fonksiyon) puanlayıp gerçekten
 * uygun (isEligibleForRole) adayları sıralar. Free'deki "temel
 * freelancer eşleşmeleri" (proje oluşturma akışındaki ilk öneriler)
 * bunun yerine geçmez — bu, o listeyi daha geniş bir havuzla ve daha
 * fazla sonuçla (Pro'da) tekrar sunan ek bir görünümdür.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId zorunludur." }, { status: 400 });
    }

    const supabase = await createClient();

    const access = await requireFeatureAccess(supabase, "ai_freelancer_shortlist");

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.context.userId === null
              ? "Bu bilgileri görmek için giriş yapmalısınız."
              : access.context.role !== "client"
                ? "Bu özellik yalnızca client hesapları için kullanılabilir."
                : "Bu özellik Plus ve üzeri paketlere özeldir.",
          requiredPlan: "plus",
        },
        { status: access.context.userId === null ? 401 : 403 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, client_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project || project.client_id !== access.context.userId) {
      return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });
    }

    const { data: freelancers, error: freelancersError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, title, avatar_url")
      .eq("role", "freelancer");

    if (freelancersError) {
      console.error("[AI shortlist] freelancers fetch error:", freelancersError);
      return NextResponse.json({ error: "Freelancer havuzu alınamadı." }, { status: 500 });
    }

    const resultLimit = canUseFeature(access.context, "advanced_ai_shortlist") ? 10 : 5;

    const scored = await Promise.all(
      (freelancers ?? []).map(async (freelancer) => {
        try {
          const matches = await matchFreelancerToProjectRoles(supabase, projectId, freelancer.id);
          const best = matches.find((m) => m.isEligibleForRole) ?? null;

          if (!best) return null;

          return {
            freelancerId: freelancer.id,
            name: [freelancer.first_name, freelancer.last_name].filter(Boolean).join(" ") || "Freelancer",
            title: freelancer.title,
            avatarUrl: freelancer.avatar_url,
            role: best.role,
            score: best.score,
            reason: best.reason,
          };
        } catch (error) {
          console.error(`[AI shortlist] match error for freelancer ${freelancer.id}:`, error);
          return null;
        }
      })
    );

    const shortlist = scored
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, resultLimit);

    return NextResponse.json({ shortlist });
  } catch (error) {
    console.error("[AI shortlist] unexpected error:", error);
    return NextResponse.json(
      { error: "Shortlist hesaplanırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
