import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireFeatureAccess } from "@/lib/premium";

/**
 * POST /api/premium/client/freelancer-comparison
 *
 * Client "Freelancer Comparison" (Plus) — client'ın seçtiği 2-4
 * freelancer'ı yan yana karşılaştırır. Gerçek profil verisi
 * kullanılır (uydurma skor yok).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { freelancerIds?: string[] };
    const freelancerIds = Array.isArray(body.freelancerIds)
      ? body.freelancerIds.filter((id): id is string => typeof id === "string").slice(0, 4)
      : [];

    if (freelancerIds.length < 2) {
      return NextResponse.json(
        { error: "Karşılaştırmak için en az 2 freelancer seçmelisin." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const access = await requireFeatureAccess(supabase, "freelancer_comparison");

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

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, title, expertise, skills, experience, hourly_rate, hourly_rate_min, hourly_rate_max, availability_status, profile_completion"
      )
      .in("id", freelancerIds)
      .eq("role", "freelancer");

    if (profilesError) {
      console.error("[Freelancer comparison] profiles fetch error:", profilesError);
      return NextResponse.json({ error: "Freelancer bilgileri alınamadı." }, { status: 500 });
    }

    const { data: proposalRows } = await supabase
      .from("proposals")
      .select("freelancer_id, status")
      .in("freelancer_id", freelancerIds);

    const statsByFreelancer = new Map<string, { sent: number; accepted: number }>();
    for (const row of proposalRows ?? []) {
      const current = statsByFreelancer.get(row.freelancer_id) ?? { sent: 0, accepted: 0 };
      current.sent += 1;
      if (row.status === "accepted") current.accepted += 1;
      statsByFreelancer.set(row.freelancer_id, current);
    }

    const comparison = (profiles ?? []).map((profile) => {
      const stats = statsByFreelancer.get(profile.id) ?? { sent: 0, accepted: 0 };

      return {
        id: profile.id,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Freelancer",
        title: profile.title,
        expertise: profile.expertise,
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        experience: profile.experience,
        hourlyRate: profile.hourly_rate,
        hourlyRateMin: profile.hourly_rate_min,
        hourlyRateMax: profile.hourly_rate_max,
        availabilityStatus: profile.availability_status,
        profileCompletion: profile.profile_completion,
        proposalsSent: stats.sent,
        acceptanceRate: stats.sent > 0 ? stats.accepted / stats.sent : null,
      };
    });

    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("[Freelancer comparison] unexpected error:", error);
    return NextResponse.json(
      { error: "Karşılaştırma hesaplanırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
