import { NextResponse } from "next/server";

import { buildClientWorkspace } from "@/lib/ai/workspace";
import { requireFeatureAccess } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ai/client-workspace?projectId=...
 *
 * Client CollaCrew AI. Basic project insight + role-based matching is Free
 * (client_basic_matching); richer sections are added server-side only when
 * the real subscription allows them (see lib/ai/workspace.ts).
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const access = await requireFeatureAccess(supabase, "client_basic_matching");

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.context.userId === null
              ? "CollaCrew AI için giriş yapmalısınız."
              : "Bu sayfa yalnızca client hesapları için kullanılabilir.",
        },
        { status: access.context.userId === null ? 401 : 403 }
      );
    }

    const projectId = new URL(request.url).searchParams.get("projectId");
    const workspace = await buildClientWorkspace(supabase, access.context, projectId);

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("[Client AI workspace] error:", error);
    return NextResponse.json({ error: "CollaCrew AI verileri hazırlanamadı." }, { status: 500 });
  }
}
