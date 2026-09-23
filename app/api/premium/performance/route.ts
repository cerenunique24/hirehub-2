import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireFeatureAccess, canUseFeature } from "@/lib/premium";
import {
  computeProposalPerformance,
  type ProposalForAnalytics,
} from "@/lib/analytics/proposalPerformance";
import { analyzeProfile, type ProfileForInsights } from "@/lib/analytics/profileInsights";

/**
 * GET /api/premium/performance
 *
 * Premium "Kişisel Performans Dashboard'u" + "Teklif Performans
 * Analizi" + "Profil Gelişim Analizi" için tek endpoint.
 *
 * Premium kontrolü SADECE frontend'de yapılmaz — burada da
 * doğrulanır (lib/premium.ts::fetchSubscriptionStatus, RPC ile
 * server-side, expiry DB'de kontrol edilir).
 *
 * Tüm sayılar gerçek Supabase verisinden hesaplanır (bkz.
 * lib/analytics/*). Mock/sabit istatistik yok.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const access = await requireFeatureAccess(supabase, "proposal_performance");

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
          subscription: access.context.subscription,
        },
        { status: access.context.userId === null ? 401 : 403 }
      );
    }

    const user = { id: access.context.userId! };

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, role, title, bio, expertise, skills, work_types, languages, experience, hourly_rate, availability_status, profile_completion"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profileRow) {
      return NextResponse.json(
        { error: "Profil bulunamadı." },
        { status: 404 }
      );
    }

    const subscription = access.context.subscription;

    const [{ data: proposalRows, error: proposalsError }, { count: portfolioCount }] =
      await Promise.all([
        supabase
          .from("proposals")
          .select(
            "id, status, bid_amount, created_at, responded_at, viewed_at, projects(category, budget)"
          )
          .eq("freelancer_id", user.id),

        supabase
          .from("portfolio_items")
          .select("id", { count: "exact", head: true })
          .eq("freelancer_id", user.id),
      ]);

    if (proposalsError) {
      console.error("[Premium performance] proposals fetch error:", proposalsError);
      return NextResponse.json(
        { error: "Teklif verileri alınamadı." },
        { status: 500 }
      );
    }

    const proposalsForAnalytics: ProposalForAnalytics[] = (proposalRows ?? []).map(
      (row) => {
        const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;

        return {
          id: row.id,
          status: row.status,
          bid_amount:
            typeof row.bid_amount === "number"
              ? row.bid_amount
              : Number(row.bid_amount) || null,
          created_at: row.created_at,
          responded_at: row.responded_at,
          viewed_at: row.viewed_at,
          project_category: project?.category ?? null,
          project_budget:
            typeof project?.budget === "number" ? project.budget : null,
        };
      }
    );

    const proposalPerformance = computeProposalPerformance(proposalsForAnalytics);

    const profileForInsights: ProfileForInsights = {
      title: profileRow.title,
      bio: profileRow.bio,
      expertise: profileRow.expertise,
      skills: Array.isArray(profileRow.skills) ? profileRow.skills : [],
      workTypes: Array.isArray(profileRow.work_types) ? profileRow.work_types : [],
      languages: Array.isArray(profileRow.languages) ? profileRow.languages : [],
      experience: profileRow.experience,
      hourlyRate:
        typeof profileRow.hourly_rate === "number" ? profileRow.hourly_rate : null,
      availabilityStatus: profileRow.availability_status,
      profileCompletion: profileRow.profile_completion,
      portfolioCount: portfolioCount ?? 0,
    };

    const profileAnalysis = analyzeProfile(profileForInsights);

    /*
     * PRO-ONLY EK ALANLAR
     * ----------------------------------------------------
     * Plus'ta bu alanlar null döner — frontend canUseFeature() ile
     * zaten göstermeyecek, ama server de kendi kontrolünü yapar:
     * yetkisi olmayan bir kullanıcıya bu veriler hiç hesaplanıp
     * gönderilmez.
     */
    let competitionInsights: unknown = null;
    let advancedProfileInsights: unknown = null;

    if (canUseFeature(access.context, "competition_insights")) {
      const { data: competitionRows } = await supabase.rpc(
        "my_proposal_competition_stats"
      );

      type CompetitionRow = {
        project_id: string;
        total_proposals: number;
        avg_bid_amount: number | null;
        my_bid_amount: number | null;
        cheaper_than_me: number;
      };

      competitionInsights = ((competitionRows ?? []) as CompetitionRow[]).map((row) => ({
        projectId: row.project_id,
        totalProposals: row.total_proposals,
        avgBidAmount: row.avg_bid_amount,
        myBidAmount: row.my_bid_amount,
        cheaperThanMe: row.cheaper_than_me,
      }));
    }

    if (canUseFeature(access.context, "advanced_profile_insights")) {
      const { data: marketRows } = await supabase
        .from("profiles")
        .select("hourly_rate")
        .eq("role", "freelancer")
        .not("hourly_rate", "is", null);

      const marketRates = (marketRows ?? [])
        .map((row) => row.hourly_rate)
        .filter((v): v is number => typeof v === "number" && v > 0);

      const marketAverage =
        marketRates.length > 0
          ? marketRates.reduce((sum, v) => sum + v, 0) / marketRates.length
          : null;

      advancedProfileInsights = {
        myHourlyRate: profileForInsights.hourlyRate,
        marketAverageHourlyRate: marketAverage,
        sampleSize: marketRates.length,
      };
    }

    return NextResponse.json({
      subscription,
      proposalPerformance,
      profileAnalysis,
      competitionInsights,
      advancedProfileInsights,
    });
  } catch (error) {
    console.error("[Premium performance] unexpected error:", error);
    return NextResponse.json(
      { error: "Performans verileri hesaplanırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
