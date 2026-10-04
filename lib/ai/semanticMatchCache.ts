import type { SupabaseClient } from "@supabase/supabase-js";

import type { SemanticVerdict } from "@/lib/ai/semanticMatch";

/**
 * matchFreelancerToProjectRoles()'un tek bir freelancer + tek bir proje
 * için ürettiği semantic (Gemini) verdict'lerinin 24 saatlik read-through
 * cache'i. Anahtar: (freelancer_id, project_id). Değer: rol adına göre
 * verdict map'i (bir projede birden fazla kararsız-bölge rolü olabilir).
 *
 * Erişim iki SECURITY DEFINER RPC üzerinden (bkz.
 * supabase/migrations/202609290002_ai_match_semantic_cache.sql) — tablo
 * doğrudan REST/RLS ile erişilebilir değil, sadece bu iki fonksiyon
 * üzerinden ve sadece ilgili freelancer/client tarafından okunabilir/
 * yazılabilir.
 */

const CACHE_TTL_SECONDS = 24 * 60 * 60;

export async function getCachedSemanticVerdicts(
  supabase: SupabaseClient,
  freelancerId: string,
  projectId: string
): Promise<Map<string, SemanticVerdict> | null> {
  const { data, error } = await supabase.rpc(
    "get_ai_match_semantic_cache",
    {
      p_freelancer_id: freelancerId,
      p_project_id: projectId,
      p_max_age_seconds: CACHE_TTL_SECONDS,
    }
  );

  if (error) {
    console.error(
      "[CollaCrew AI] Semantic match cache okunamadı, Gemini'ye devam ediliyor:",
      error.message
    );
    return null;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  try {
    const entries = Object.entries(data as Record<string, unknown>);
    const map = new Map<string, SemanticVerdict>();

    for (const [roleName, value] of entries) {
      if (
        value &&
        typeof value === "object" &&
        typeof (value as SemanticVerdict).isMatch === "boolean" &&
        typeof (value as SemanticVerdict).score === "number" &&
        typeof (value as SemanticVerdict).reason === "string"
      ) {
        map.set(roleName, value as SemanticVerdict);
      }
    }

    return map.size > 0 ? map : null;
  } catch {
    return null;
  }
}

export async function setCachedSemanticVerdicts(
  supabase: SupabaseClient,
  freelancerId: string,
  projectId: string,
  verdictsByRole: Map<string, SemanticVerdict>
): Promise<void> {
  const verdicts: Record<string, SemanticVerdict> = {};

  for (const [roleName, verdict] of verdictsByRole) {
    verdicts[roleName] = verdict;
  }

  const { error } = await supabase.rpc("set_ai_match_semantic_cache", {
    p_freelancer_id: freelancerId,
    p_project_id: projectId,
    p_verdicts: verdicts,
  });

  if (error) {
    // Cache yazımı başarısız olsa bile eşleştirme sonucu zaten hesaplandı —
    // bir sonraki çağrı sadece Gemini'yi tekrar çalıştırır, akış kırılmaz.
    console.error(
      "[CollaCrew AI] Semantic match cache yazılamadı:",
      error.message
    );
  }
}
