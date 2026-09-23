import { NextResponse } from "next/server";

import { matchFreelancerToProjectRoles } from "@/lib/ai/match-talent";
import { createClient } from "@/lib/supabase/server";
import { getRoleCapacity, normalizeRoleName } from "@/lib/projects/teamReadiness";
import { containsContactInfo, CONTACT_INFO_MESSAGE } from "@/lib/moderation/contactInfoFilter";
import { checkRateLimit, rateLimitKey, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

/**
 * Bir projenin yeni teklif kabul etmeye uygun sayıldığı durumlar.
 * "ready_to_start" da dahildir çünkü checkAndUpdateProjectReadiness()
 * bir rol daha sonra removed olup boşaldığında projeyi otomatik olarak
 * "open"a geri döndürmez — bu yüzden kabul akışı (app/client/proposals/
 * page.tsx) da aynı iki durumu kabul ediyor; teklif gönderme ile kabul
 * etme arasında tutarlılık burada da korunuyor.
 */
const PROPOSAL_ACCEPTING_PROJECT_STATUSES = new Set(["open", "ready_to_start"]);

/**
 * PROPOSAL CREATION — server-side role eligibility validation.
 *
 * Client'tan gelen `role` / `matchScore` gibi değerler güvenilir kabul
 * edilmez. Server:
 * 1) freelancerın profile/skills/title/expertise verisini alır
 * 2) project role bilgisini (projects.budget_breakdown) alır
 * 3) matchFreelancerToProjectRoles ile role eligibility'yi YENİDEN hesaplar
 * 4) uygun değilse proposal INSERT edilmez
 *
 * Bu, Discover/detay sayfalarının kullandığı AYNI deterministic
 * eşleşme fonksiyonunu kullanır — böylece hangi sayfadan teklif
 * gönderilirse gönderilsin aynı eligibility sonucu geçerli olur.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      roleId?: string;
      role?: string;
      bidAmount?: number;
      deliveryDays?: number;
      coverLetter?: string;
    };

    const { projectId, roleId, bidAmount, deliveryDays, coverLetter } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Proje bilgisi eksik." },
        { status: 400 }
      );
    }

    const numericBid = Number(bidAmount);
    const numericDeliveryDays = Number(deliveryDays);
    const trimmedCoverLetter = (coverLetter ?? "").trim();

    if (!Number.isFinite(numericBid) || numericBid <= 0) {
      return NextResponse.json(
        { error: "Geçerli bir teklif tutarı gir." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(numericDeliveryDays) || numericDeliveryDays <= 0) {
      return NextResponse.json(
        { error: "Geçerli bir teslim süresi gir." },
        { status: 400 }
      );
    }

    if (!trimmedCoverLetter) {
      return NextResponse.json(
        { error: "Lütfen kısa bir teklif mesajı yaz." },
        { status: 400 }
      );
    }

    if (containsContactInfo(trimmedCoverLetter)) {
      return NextResponse.json({ error: CONTACT_INFO_MESSAGE }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Teklif göndermek için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "freelancer") {
      return NextResponse.json(
        { error: "Bu işlem yalnızca freelancer hesapları için kullanılabilir." },
        { status: 403 }
      );
    }

    const { ok: withinLimit } = await checkRateLimit(
      supabase,
      rateLimitKey("proposals_create", user.id),
      15,
      600
    );

    if (!withinLimit) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    const { data: existingProposal } = await supabase
      .from("proposals")
      .select("id")
      .eq("project_id", projectId)
      .eq("freelancer_id", user.id)
      .maybeSingle();

    if (existingProposal) {
      return NextResponse.json(
        { error: "Bu projeye daha önce teklif gönderdin." },
        { status: 409 }
      );
    }

    /*
     * Proje durumu — client'ın "projeyi görebiliyor olması" onun için
     * hâlâ teklif kabul ettiği anlamına gelmez. Kapatılmış/tamamlanmış/
     * iptal edilmiş bir projeye, ya da zaten devam etmekte olan bir
     * projeye (in_progress) doğrudan API çağrısıyla teklif gönderilmesi
     * daha önce hiç engellenmiyordu.
     */
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, status, budget_breakdown")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Proje bulunamadı." },
        { status: 404 }
      );
    }

    if (!PROPOSAL_ACCEPTING_PROJECT_STATUSES.has(project.status ?? "")) {
      return NextResponse.json(
        { error: "Bu proje artık yeni teklif kabul etmiyor." },
        { status: 409 }
      );
    }

    /*
     * Deterministic eligibility — client'ın gönderdiği role/matchScore
     * değil, server'ın kendi hesapladığı sonuç geçerlidir.
     */
    const matches = await matchFreelancerToProjectRoles(
      supabase,
      projectId,
      user.id
    );

    /*
     * Çok rollü projede teklif mutlaka belirli bir role (roleId) verilir —
     * rol adıyla tahmin yapılmaz, böylece teklif yanlış role bağlanamaz.
     */
    if (!roleId && matches.length > 1) {
      return NextResponse.json(
        { error: "Teklif vereceğin rolü seç." },
        { status: 400 }
      );
    }

    const matchedRole = roleId
      ? matches.find((match) => match.roleId === roleId)
      : matches.find(
          (match) =>
            match.role.trim().toLowerCase() ===
            (body.role ?? "").trim().toLowerCase()
        );

    if (!matchedRole) {
      return NextResponse.json(
        { error: "Seçilen rol bu projede bulunamadı." },
        { status: 400 }
      );
    }

    if (!matchedRole.isEligibleForRole) {
      return NextResponse.json(
        { error: "Bu rol profilinizle yeterince uyumlu değil." },
        { status: 403 }
      );
    }

    /*
     * Rol kapasitesi — kabul akışıyla (app/client/proposals/page.tsx,
     * accept_project_placement RPC) AYNI kaynaktan (budget_breakdown +
     * project_team_members) hesaplanır. Rol zaten aktif üyelerle
     * doluysa, yeni bir teklif göndermek anlamsızdır ve reddedilir.
     */
    const { data: activeMembers, error: membersError } = await supabase
      .from("project_team_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("status", "active");

    if (membersError) {
      console.error("Active team members lookup error:", membersError);

      return NextResponse.json(
        { error: "Mevcut ekip kontrol edilemedi." },
        { status: 500 }
      );
    }

    const roleCapacity = getRoleCapacity(
      Array.isArray(project.budget_breakdown) ? project.budget_breakdown : null,
      matchedRole.role
    );

    const activeRoleMemberCount = (activeMembers ?? []).filter(
      (member) => normalizeRoleName(member.role ?? "") === normalizeRoleName(matchedRole.role)
    ).length;

    if (activeRoleMemberCount >= roleCapacity) {
      return NextResponse.json(
        { error: `"${matchedRole.role}" rolü için kontenjan dolu.` },
        { status: 409 }
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("proposals")
      .insert({
        project_id: projectId,
        freelancer_id: user.id,
        role: matchedRole.role,
        // budget_breakdown roleId — the exact role this proposal targets.
        role_key: matchedRole.roleId,
        bid_amount: numericBid,
        delivery_days: numericDeliveryDays,
        cover_letter: trimmedCoverLetter,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Bu projeye daha önce teklif gönderdin." },
          { status: 409 }
        );
      }

      console.error("Proposal insert error:", insertError);

      return NextResponse.json(
        { error: "Teklif gönderilirken bir hata oluştu." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: inserted?.id });
  } catch (error) {
    console.error("Proposal creation error:", error);

    return NextResponse.json(
      { error: "Teklif gönderilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
