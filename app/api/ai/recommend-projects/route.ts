import { NextResponse } from "next/server";
import { recommendProjects } from "@/lib/ai/recommend-projects";
import { createClient } from "@/lib/supabase/server";
import { requireFeatureAccess } from "@/lib/premium";

/**
 * CollaCrew AI (Freelancer Intelligence) alt özelliği — Plus ve üzeri.
 * Asıl akış artık `/api/premium/recommended-projects`'i kullanıyor;
 * bu uç doğrudan URL/istek ile çağrılırsa aynı entitlement kontrolü
 * burada da uygulanır.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const access = await requireFeatureAccess(supabase, "smart_project_alerts");

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.context.userId === null
              ? "Proje önerisi için giriş yapmalısınız."
              : "Bu özellik Plus ve üzeri paketlere özeldir.",
          requiredPlan: "plus",
        },
        { status: access.context.userId === null ? 401 : 403 }
      );
    }

    const body = await request.json();
    const recommendations = await recommendProjects(supabase, body);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Recommend projects error:", error);

    return NextResponse.json(
      { error: "Failed to recommend projects." },
      { status: 500 }
    );
  }
}
