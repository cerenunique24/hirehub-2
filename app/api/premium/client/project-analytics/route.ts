import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireFeatureAccess, canUseFeature } from "@/lib/premium";
import {
  computeProposalPerformance,
  type ProposalForAnalytics,
} from "@/lib/analytics/proposalPerformance";

/**
 * GET /api/premium/client/project-analytics
 *
 * Client "Project Analytics" (Plus) / "Gelişmiş Project Analytics"
 * (Pro) — client'ın KENDİ projelerine gelen tekliflerin gerçek
 * verilerden analizi. Aynı deterministic hesaplama
 * (lib/analytics/proposalPerformance.ts) freelancer tarafındaki
 * "Proposal Performance" ile ortak — burada bakış açısı client'ın
 * "gönderdiği" değil "aldığı" teklifler.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const access = await requireFeatureAccess(supabase, "project_analytics");

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

    const clientId = access.context.userId!;

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, category")
      .eq("client_id", clientId);

    if (projectsError) {
      console.error("[Client project analytics] projects fetch error:", projectsError);
      return NextResponse.json({ error: "Projeler alınamadı." }, { status: 500 });
    }

    const projectIds = (projects ?? []).map((p) => p.id);
    const categoryByProjectId = new Map((projects ?? []).map((p) => [p.id, p.category]));

    const { data: proposalRows, error: proposalsError } =
      projectIds.length > 0
        ? await supabase
            .from("proposals")
            .select("id, project_id, status, bid_amount, created_at, responded_at, viewed_at")
            .in("project_id", projectIds)
        : { data: [] as never[], error: null };

    if (proposalsError) {
      console.error("[Client project analytics] proposals fetch error:", proposalsError);
      return NextResponse.json({ error: "Teklifler alınamadı." }, { status: 500 });
    }

    const proposalsForAnalytics: ProposalForAnalytics[] = (proposalRows ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      bid_amount: typeof row.bid_amount === "number" ? row.bid_amount : Number(row.bid_amount) || null,
      created_at: row.created_at,
      responded_at: row.responded_at,
      viewed_at: row.viewed_at,
      project_category: categoryByProjectId.get(row.project_id) ?? null,
      project_budget: null,
    }));

    const projectAnalytics = computeProposalPerformance(proposalsForAnalytics);

    return NextResponse.json({
      projectAnalytics,
      projectCount: projectIds.length,
      isAdvanced: canUseFeature(access.context, "advanced_project_analytics"),
    });
  } catch (error) {
    console.error("[Client project analytics] unexpected error:", error);
    return NextResponse.json(
      { error: "Analiz hesaplanırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
