import type { SupabaseClient } from "@supabase/supabase-js";
import { canUseFeature, type AccessContext } from "@/lib/premium";
import { AI_CAPABILITIES, minimumAIPlan, type AIOptions } from "./assistantContracts";

/** Read-only bootstrap. Does not run matching or contact an AI provider. */
export async function buildAssistantOptions(supabase: SupabaseClient, access: AccessContext): Promise<AIOptions> {
  const [projects, proposals, profile] = await Promise.all([
    supabase.from("projects").select("id,title").in("status", ["open", "ready_to_start"]).order("created_at", { ascending: false }).limit(100),
    supabase.from("proposals").select("id", { count: "exact", head: true }).eq("freelancer_id", access.userId!),
    supabase.from("profiles").select("profile_completion").eq("id", access.userId!).single(),
  ]);
  if (projects.error || proposals.error || profile.error) throw new Error("AI çalışma alanı verileri yüklenemedi.");
  return {
    plan: access.plan,
    capabilities: AI_CAPABILITIES.map(item => ({ id: item.id, requiredPlan: minimumAIPlan(item.id), allowed: canUseFeature(access, item.feature) })),
    projects: projects.data ?? [],
    briefing: { proposalCount: proposals.count ?? 0, profileCompletion: typeof profile.data?.profile_completion === "number" ? profile.data.profile_completion : null },
  };
}
