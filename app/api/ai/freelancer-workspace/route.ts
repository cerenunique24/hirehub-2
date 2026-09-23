import { NextResponse } from "next/server";

import { buildFreelancerWorkspace } from "@/lib/ai/workspace";
import { requireFeatureAccess } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ai/freelancer-workspace
 *
 * Freelancer CollaCrew AI. Project recommendations with match score/reason
 * are Free (project_discovery); explanations, profile suggestions, skill gap
 * and advanced insights are added server-side only for the plans that include
 * them (see lib/ai/workspace.ts).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const access = await requireFeatureAccess(supabase, "project_discovery");

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.context.userId === null
              ? "CollaCrew AI için giriş yapmalısınız."
              : "Bu sayfa yalnızca freelancer hesapları için kullanılabilir.",
        },
        { status: access.context.userId === null ? 401 : 403 }
      );
    }

    const workspace = await buildFreelancerWorkspace(supabase, access.context);
    return NextResponse.json(workspace);
  } catch (error) {
    console.error("[Freelancer AI workspace] error:", error);
    return NextResponse.json({ error: "CollaCrew AI verileri hazırlanamadı." }, { status: 500 });
  }
}
