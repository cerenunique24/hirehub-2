import { NextResponse } from "next/server";

import {
  matchTalent,
  matchFreelancerToProjectRoles,
  type RoleMatchInput,
} from "@/lib/ai/match-talent";

import type { ProjectAnalysis } from "@/types/ai";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      analysis?: ProjectAnalysis;
      roles?: RoleMatchInput[];
      projectId?: string;
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

    if (body.projectId) {
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
