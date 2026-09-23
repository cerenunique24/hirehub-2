import { NextResponse } from "next/server";
import { draftProposal, ProposalDraftError } from "@/lib/ai/improve-proposal";
import { createClient } from "@/lib/supabase/server";
import { requireFeatureAccess } from "@/lib/premium";

/**
 * POST /api/ai/improve-proposal — "AI Proposal Assistant" (Plus ve üzeri).
 *
 * Body: { projectId, roleId }. Taslak; projenin, seçilen rolün ve
 * freelancer'ın GERÇEK profil verisinden üretilir (bkz.
 * lib/ai/improve-proposal.ts). Rol, sunucuda yeniden eşleşme kontrolünden
 * geçer — uygun olmayan bir role taslak üretilmez. Plan kontrolü sunucuda
 * gerçek abonelik durumuyla yapılır.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const access = await requireFeatureAccess(supabase, "proposal_ai");

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.context.userId === null
              ? "Bu özelliği kullanmak için giriş yapmalısınız."
              : access.context.role !== "freelancer"
                ? "Bu özellik yalnızca freelancer hesapları için kullanılabilir."
                : "AI Proposal Assistant Plus ve üzeri paketlere özeldir.",
          requiredPlan: "plus",
        },
        { status: access.context.userId === null ? 401 : 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { projectId?: string; roleId?: string };

    if (!body.projectId || !body.roleId) {
      return NextResponse.json({ error: "Proje ve rol seçimi zorunludur." }, { status: 400 });
    }

    const result = await draftProposal(supabase, {
      projectId: body.projectId,
      roleId: body.roleId,
      freelancerId: access.context.userId!,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProposalDraftError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[AI proposal draft] unexpected error:", error);
    return NextResponse.json({ error: "Taslak hazırlanamadı." }, { status: 500 });
  }
}
