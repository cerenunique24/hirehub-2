import { NextResponse } from "next/server";

import {
  matchTalent,
  matchFreelancerToProjectRoles,
  type RoleMatchInput,
} from "@/lib/ai/match-talent";

import type { ProjectAnalysis } from "@/types/ai";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      analysis?: ProjectAnalysis;
      roles?: RoleMatchInput[];
      projectId?: string;
      projectIds?: string[];
    };

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Freelancer eşleştirmek için giriş yapmalısınız.",
        },
        { status: 401 }
      );
    }

    const { ok: withinLimit } = await checkRateLimit(
      supabase,
      rateLimitKey("ai_match_talent", user.id),
      30,
      600
    );

    if (!withinLimit) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    /*
     * ----------------------------------------------------
     * FREELANCER PROJE MATCHING
     * ----------------------------------------------------
     *
     * Freelancer proje detay sayfasından projectId gönderir.
     *
     * Server:
     * - freelancerı auth üzerinden belirler
     * - proje rollerini getirir
     * - freelancer profilini getirir
     * - freelancer portfolyosunu getirir
     * - uygun rolleri hesaplar
     *
     * Bütçe matching skorunu belirlemek için kullanılmaz.
     * Ancak rolün kişi sayısı ve kişi başı bütçesi
     * frontend'e gösterilmek üzere matching sonucunda
     * taşınabilir.
     */

    if (body.projectId || body.projectIds) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(
          "Freelancer profile lookup error:",
          profileError
        );

        return NextResponse.json(
          {
            error: "Freelancer profili alınamadı.",
          },
          { status: 500 }
        );
      }

      if (!profile || profile.role !== "freelancer") {
        return NextResponse.json(
          {
            error:
              "Bu işlem yalnızca freelancer hesapları için kullanılabilir.",
          },
          { status: 403 }
        );
      }

      if (body.projectId) {
        const matching = await matchFreelancerToProjectRoles(
          supabase,
          body.projectId,
          user.id
        );

        return NextResponse.json({
          matching,
        });
      }

      /*
       * ----------------------------------------------------
       * TOPLU (BATCH) FREELANCER PROJE MATCHING
       * ----------------------------------------------------
       *
       * Discover LİSTE sayfası, her açık proje kartı için bir
       * eşleşme özeti (en iyi rol/skor/uygun bütçe) gösterir.
       * Bu hesaplama projects.budget_breakdown'ın TAMAMINI okur
       * (tüm rollerin bütçeleri) — bu yüzden SADECE burada,
       * server-side, kullanıcının kendi tarayıcısına hiç
       * gitmeyecek şekilde çalıştırılır. Liste sayfası artık
       * matchFreelancerToProjectRoles()'u kendi (browser)
       * Supabase client'ıyla DOĞRUDAN çağırmaz — aksi halde her
       * açık projenin TÜM rollerinin bütçesi, sadece en iyi rol
       * render edilse bile, network response'unda tarayıcıya
       * gönderilirdi (bkz. HIREHUB_AUDIT_CONTEXT.md — "budget
       * breakdown UI'da gizleniyor ama response'ta hâlâ mevcut").
       */
      const projectIds = Array.isArray(body.projectIds)
        ? body.projectIds.filter(
            (id): id is string => typeof id === "string" && id.trim().length > 0
          )
        : [];

      const matchingByProject: Record<string, Awaited<ReturnType<typeof matchFreelancerToProjectRoles>>> = {};

      await Promise.all(
        projectIds.map(async (projectId) => {
          try {
            matchingByProject[projectId] = await matchFreelancerToProjectRoles(
              supabase,
              projectId,
              user.id
            );
          } catch (matchError) {
            console.error(
              "Proje eşleşmesi hesaplanamadı:",
              projectId,
              matchError
            );

            matchingByProject[projectId] = [];
          }
        })
      );

      return NextResponse.json({
        matching: matchingByProject,
      });
    }

    /*
     * ----------------------------------------------------
     * CLIENT MATCHING
     * ----------------------------------------------------
     *
     * Client proje oluştururken:
     * - proje analizi
     * - roller
     * - kişi sayısı
     * - kişi başı bütçe
     * - rol toplam bütçesi
     *
     * bilgileri gönderilir.
     *
     * Asıl matching işlemi matchTalent() içerisinde yapılır.
     */

    if (!body.analysis) {
      return NextResponse.json(
        {
          error: "Proje analizi zorunludur.",
        },
        { status: 400 }
      );
    }

    const matching = await matchTalent(
      supabase,
      body.analysis,
      body.roles
    );

    return NextResponse.json({
      matching,
    });
  } catch (error) {
    console.error("Freelancer eşleştirme hatası:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: `Freelancer eşleştirme sırasında hata oluştu: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Freelancer eşleştirme tamamlanamadı.",
      },
      { status: 500 }
    );
  }
}
