import { NextResponse } from "next/server";

import {
  matchTalent,
  matchFreelancerToProjectRoles,
  type RoleMatchInput,
} from "@/lib/ai/match-talent";

import type { ProjectAnalysis } from "@/types/ai";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";
import { getUserAccessContext, canUseFeature } from "@/lib/premium";

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

    /*
     * FREE / PLUS / PRO ERİŞİMİ
     * ----------------------------------------------------
     * Free client eşleşmenin gerçekten çalıştığını ve gerçek uygun
     * aday sayısını (totalEligibleCount) her zaman görür — sadece
     * aday isim/profil detayları (freelancers[]) Plus/Pro'ya özeldir.
     * Free kullanıcıya gereksiz freelancer detayı göndermemek için
     * (performans + gizlilik) freelancers burada, response
     * oluşturulmadan önce sunucu tarafında boşaltılır.
     */
    const access = await getUserAccessContext(supabase);
    const canViewCandidates = canUseFeature(
      access,
      "view_match_candidates"
    );

    const responseMatching = matching.map((roleMatching) => ({
      role: roleMatching.role,
      totalEligibleCount: roleMatching.totalEligibleCount,
      memberCount: roleMatching.memberCount,
      budgetPerPerson: roleMatching.budgetPerPerson,
      budget: roleMatching.budget,
      freelancers: canViewCandidates ? roleMatching.freelancers : [],
    }));

    return NextResponse.json({
      matching: responseMatching,
      canViewCandidates,
    });
  } catch (error) {
    /*
     * Güvenli, tanı koyulabilir sunucu logu:
     * - Error instance'ıysa name/message/stack (ilk birkaç satır).
     * - Değilse (ör. throw ile atılan plain bir değer — normalde
     *   olmamalı ama "Freelancer eşleştirme tamamlanamadı." generic
     *   mesajının döndüğü TEK durum budur) tipini ve string halini
     *   logla ki kök neden görünür olsun.
     *
     * ASLA loglanmaz: GEMINI_API_KEY, Supabase service role key,
     * şifre, komple profile/proje nesnesi. `error.message` Supabase/
     * Gemini hata mesajlarını içerebilir ama bunlar hiçbir zaman
     * secret/PII taşımaz (bkz. lib/ai/gemini.ts, lib/ai/match-talent.ts
     * içindeki hata sınıflandırması).
     */
    if (error instanceof Error) {
      console.error(
        "[CollaCrew AI] /api/ai/match-talent hata:",
        `${error.name}: ${error.message}`,
        error.stack?.split("\n").slice(0, 3).join(" | ")
      );
    } else {
      console.error(
        "[CollaCrew AI] /api/ai/match-talent beklenmeyen (Error olmayan) " +
          "bir değer fırlattı:",
        `type=${typeof error}`,
        `value=${String(error)}`
      );
    }

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
