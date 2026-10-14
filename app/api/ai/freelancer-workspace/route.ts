import { NextResponse } from "next/server";
import { buildFreelancerWorkspace } from "@/lib/ai/workspace";
import { requireFeatureAccess } from "@/lib/premium";
import { buildAssistantOptions } from "@/lib/ai/assistantOptions";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

/** Default GET is metadata only; matching requires an explicit tool request. */
export async function GET(request: Request) {
  try {
    const tool = new URL(request.url).searchParams.get("tool");
    if (tool && !["matching", "advanced-matching"].includes(tool)) return NextResponse.json({ error: "Geçersiz AI aracı." }, { status: 400 });
    const supabase = await createClient();
    const feature = tool === "advanced-matching" ? "advanced_matching" : tool === "matching" ? "matching_explanation" : "project_discovery";
    const access = await requireFeatureAccess(supabase, feature);
    if (!access.ok) return NextResponse.json({ error: access.context.userId === null ? "CollaCrew AI için giriş yapmalısınız." : "Bu araç için uygun freelancer planı gereklidir." }, { status: access.context.userId === null ? 401 : 403 });
    if (!tool) return NextResponse.json(await buildAssistantOptions(supabase, access.context), { headers: { "Cache-Control": "private, no-store" } });
    const limit = await checkRateLimit(supabase, rateLimitKey("ai_workspace_matching", access.context.userId!), 10, 600);
    if (!limit.ok) return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    return NextResponse.json(await buildFreelancerWorkspace(supabase, access.context), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[Freelancer AI workspace]", error);
    return NextResponse.json({ error: "CollaCrew AI verileri hazırlanamadı." }, { status: 500 });
  }
}
