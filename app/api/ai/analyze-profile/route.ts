import { NextResponse } from "next/server";
import { analyzeProfile } from "@/lib/ai/analyze-profile";
import { createClient } from "@/lib/supabase/server";
import { requireFeatureAccess } from "@/lib/premium";

/**
 * CollaCrew AI (Freelancer Intelligence) alt özelliği — Plus ve üzeri.
 * Bu uç `/freelancers/ai` (artık `/freelancers/performance`'a
 * yönlendiriyor) tarafından kullanılıyordu; asıl akış artık
 * `/api/premium/performance`'ı kullanıyor. Doğrudan URL/istek ile
 * erişimi engellemek için burada da aynı entitlement kontrolü yapılır.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const access = await requireFeatureAccess(supabase, "profile_analytics");

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.context.userId === null
              ? "Profil analizi için giriş yapmalısınız."
              : "Bu özellik Plus ve üzeri paketlere özeldir.",
          requiredPlan: "plus",
        },
        { status: access.context.userId === null ? 401 : 403 }
      );
    }

    const body = await request.json();
    const analysis = await analyzeProfile(body);

    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze profile." },
      { status: 500 }
    );
  }
}
