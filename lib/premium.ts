import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * HireHub / CollaCrew plan sistemi.
 *
 * ÖNEMLİ ÜRÜN KURALI: Free kullanıcı için proje keşfi, temel AI/proje
 * eşleşmesi, eşleşme yüzdesi, eşleştiği rolün bütçe/süresi, teklif
 * gönderme ve teklif SONRASI mesajlaşma her zaman çalışır — bunlar
 * asla bir plan kontrolünün arkasına gizlenmez (bkz. FEATURE_MATRIX
 * altındaki "free" girişleri, sadece dokümantasyon/test amaçlı
 * mevcuttur, gerçek bir kısıtlama uygulamazlar).
 *
 * Bu dosya TEK merkezi erişim kontrolüdür. Dashboard, API route,
 * server action, AI/analytics endpoint — hepsi buradaki
 * `canUseFeature()` / `getUserAccessContext()` fonksiyonlarını
 * kullanmalı. Her sayfada/route'ta ayrı ayrı "plan === X" kontrolü
 * YAZILMAZ.
 */

export type PlanTier = "free" | "plus" | "pro";
export type UserRole = "freelancer" | "client";

export type BillingCycle = "monthly" | "yearly";

export type SubscriptionStatus = {
  /** Efektif plan — süresi dolmuşsa veya hiç abonelik yoksa her zaman "free". */
  plan: PlanTier;
  /** DB'de saklanan ham plan (süresi dolmuş olsa bile) — "yeniden aktifleştir" gibi akışlarda hangi pakete döneceğini bilmek için. */
  raw_plan: PlanTier;
  status: "active" | "trial" | "canceled" | "expired";
  started_at: string | null;
  expires_at: string | null;
  trial_used: boolean;
  billing_cycle: BillingCycle | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
};

const DEFAULT_STATUS: SubscriptionStatus = {
  plan: "free",
  raw_plan: "free",
  status: "active",
  started_at: null,
  expires_at: null,
  trial_used: false,
  billing_cycle: null,
  cancel_at_period_end: false,
  canceled_at: null,
};

/**
 * Kullanıcının gerçek plan durumunu Supabase'ten okur (RPC:
 * my_subscription_status — expiry kontrolü DB tarafında yapılır,
 * frontend'de asla "hangi plan" tahmin edilmez). Hem browser hem
 * server Supabase client'ıyla aynı şekilde çalışır.
 */
export async function fetchSubscriptionStatus(supabase: SupabaseClient): Promise<SubscriptionStatus> {
  const { data, error } = await supabase.rpc("my_subscription_status").single();

  if (error || !data) {
    return DEFAULT_STATUS;
  }

  return data as SubscriptionStatus;
}

/**
 * Abonelik ekranı için UI durumu — "Mevcut Plan" / "İptal edildi" /
 * "Süresi doldu" gibi metinleri tek bir yerden, tutarlı şekilde
 * türetmek içindir. Asla erişim kararı vermez (o `canUseFeature`'ın
 * işi) — sadece nasıl GÖSTERİLECEĞİNİ belirler.
 */
export type SubscriptionUiState =
  | "free"
  | "active"
  | "trial"
  | "canceled_pending"
  | "expired";

export function getSubscriptionUiState(status: SubscriptionStatus): SubscriptionUiState {
  const hasExpired =
    status.raw_plan !== "free" &&
    status.expires_at !== null &&
    new Date(status.expires_at).getTime() <= Date.now();

  if (hasExpired) return "expired";
  if (status.plan === "free") return "free";
  if (status.cancel_at_period_end) return "canceled_pending";
  if (status.status === "trial") return "trial";
  return "active";
}

export async function startPlanTrial(
  supabase: SupabaseClient,
  targetPlan: Exclude<PlanTier, "free">,
  billingCycle: BillingCycle = "monthly"
) {
  return supabase
    .rpc("start_plan_trial", { target_plan: targetPlan, target_billing_cycle: billingCycle })
    .single();
}

/**
 * Zaten aktif bir plus/pro aboneliği olan kullanıcının paketini
 * ve/veya fatura periyodunu değiştirmesi için (ör. Plus Aylık -> Pro
 * Yıllık). Gerçek bir ödeme provider'ı bağlandığında bu, o
 * provider'ın subscription update mekanizmasına devredilmelidir.
 */
export async function changePlan(
  supabase: SupabaseClient,
  targetPlan: Exclude<PlanTier, "free">,
  billingCycle: BillingCycle = "monthly"
) {
  return supabase
    .rpc("change_plan", { target_plan: targetPlan, target_billing_cycle: billingCycle })
    .single();
}

/**
 * Aboneliği hemen silmez / plan'ı hemen free'ye düşürmez —
 * `cancel_at_period_end = true` işaretler. Kullanıcı mevcut ücretli
 * dönem sonuna (`expires_at`) kadar erişimini korur.
 */
export async function cancelSubscription(supabase: SupabaseClient) {
  return supabase.rpc("cancel_subscription").single();
}

/** Bekleyen bir iptali geri alır (dönem bitmeden önce). */
export async function reactivateSubscription(supabase: SupabaseClient) {
  return supabase.rpc("reactivate_subscription").single();
}

/** @deprecated use startPlanTrial(supabase, "pro") — kept for any old caller. */
export async function startPremiumTrial(supabase: SupabaseClient) {
  return supabase.rpc("start_premium_trial").single();
}

export type AiExtraAnalysisUsage = {
  count: number;
  limit_reached: boolean;
  monthly_limit: number;
};

/**
 * Plus "Aylık sınırlı ek AI analiz hakkı" / Pro "Daha yüksek AI analiz
 * kullanım limiti" — SADECE gelişmiş (Plus/Pro'ya özel) proje
 * analizi zenginleştirmesi için sayılır. Free'nin temel AI analizi bu
 * sayaçtan tamamen bağımsızdır ve asla etkilenmez.
 */
export async function incrementAiExtraAnalysisUsage(supabase: SupabaseClient) {
  return supabase.rpc("increment_ai_extra_analysis_usage").single<AiExtraAnalysisUsage>();
}

/* -------------------------------------------------------------------------- */
/* Feature matrix                                                             */
/* -------------------------------------------------------------------------- */

export type FeatureKey =
  // Freelancer — Free (asla kısıtlanmaz, sadece dokümantasyon/test amaçlı)
  | "project_discovery"
  | "basic_matching"
  | "role_budget_visibility"
  | "basic_proposals"
  | "post_proposal_messaging"
  // Freelancer — Plus
  | "matching_explanation"
  | "proposal_ai"
  | "proposal_performance"
  | "profile_analytics"
  | "smart_project_alerts"
  // Freelancer — Pro
  | "advanced_matching"
  | "competition_insights"
  | "advanced_profile_insights"
  | "premium_visibility"
  | "priority_ranking"
  | "pre_proposal_messaging"
  // Client — Free (asla kısıtlanmaz, sadece dokümantasyon/test amaçlı)
  | "client_project_creation"
  | "client_basic_matching"
  | "client_proposal_management"
  | "basic_project_analysis"
  // Client — Plus
  | "ai_freelancer_shortlist"
  | "freelancer_comparison"
  | "budget_compatibility_analysis"
  | "talent_alerts"
  | "project_analytics"
  | "advanced_project_analysis"
  | "ai_analysis_extra_quota"
  // Client — Pro
  | "advanced_ai_shortlist"
  | "backup_talent_suggestions"
  | "team_insights"
  | "advanced_matching_client"
  | "talent_pool"
  | "advanced_project_analytics"
  | "deep_talent_analysis"
  | "ai_high_usage_limit";

type FeatureRule = {
  role: UserRole | "both";
  minPlan: PlanTier;
  /** Kısa Türkçe etiket — upgrade CTA'larında kullanılır. */
  label: string;
};

export const PLAN_RANK: Record<PlanTier, number> = { free: 0, plus: 1, pro: 2 };

export const FEATURE_MATRIX: Record<FeatureKey, FeatureRule> = {
  project_discovery: { role: "freelancer", minPlan: "free", label: "Proje keşfi" },
  basic_matching: { role: "both", minPlan: "free", label: "Temel eşleşme" },
  role_budget_visibility: { role: "freelancer", minPlan: "free", label: "Rol bütçesi/süresi" },
  basic_proposals: { role: "freelancer", minPlan: "free", label: "Teklif gönderme" },
  post_proposal_messaging: { role: "both", minPlan: "free", label: "Teklif sonrası mesajlaşma" },

  matching_explanation: { role: "freelancer", minPlan: "plus", label: "Eşleşme nedenleri" },
  proposal_ai: { role: "freelancer", minPlan: "plus", label: "AI Proposal Assistant" },
  proposal_performance: { role: "freelancer", minPlan: "plus", label: "Proposal Performance" },
  profile_analytics: { role: "freelancer", minPlan: "plus", label: "Profil Analytics" },
  smart_project_alerts: { role: "freelancer", minPlan: "plus", label: "Smart Project Alerts" },

  advanced_matching: { role: "freelancer", minPlan: "pro", label: "Gelişmiş AI Matching" },
  competition_insights: { role: "freelancer", minPlan: "pro", label: "Rekabet İçgörüleri" },
  advanced_profile_insights: { role: "freelancer", minPlan: "pro", label: "Gelişmiş Profil İçgörüleri" },
  premium_visibility: { role: "freelancer", minPlan: "pro", label: "Premium Görünürlük" },
  priority_ranking: { role: "freelancer", minPlan: "pro", label: "Öncelikli Eşleşme" },
  pre_proposal_messaging: { role: "freelancer", minPlan: "pro", label: "Teklif Öncesi Mesajlaşma" },

  client_project_creation: { role: "client", minPlan: "free", label: "Proje oluşturma" },
  client_basic_matching: { role: "client", minPlan: "free", label: "Temel freelancer eşleşmeleri" },
  client_proposal_management: { role: "client", minPlan: "free", label: "Proposal yönetimi" },
  /**
   * Free kullanıcının mevcut CollaCrew AI proje analizi (özet, roller,
   * temel skill/proje analizi) — asla kısıtlanmaz. Bkz.
   * app/api/ai/analyze-project/route.ts.
   */
  basic_project_analysis: { role: "client", minPlan: "free", label: "Temel Proje Analizi" },

  ai_freelancer_shortlist: { role: "client", minPlan: "plus", label: "AI Freelancer Shortlist" },
  freelancer_comparison: { role: "client", minPlan: "plus", label: "Freelancer Comparison" },
  budget_compatibility_analysis: { role: "client", minPlan: "plus", label: "Budget Compatibility Analysis" },
  talent_alerts: { role: "client", minPlan: "plus", label: "Talent Alerts" },
  project_analytics: { role: "client", minPlan: "plus", label: "Project Analytics" },
  advanced_project_analysis: { role: "client", minPlan: "plus", label: "Kapsamlı Proje/Rol/Skill Analizi" },
  ai_analysis_extra_quota: { role: "client", minPlan: "plus", label: "Aylık Ek AI Analiz Hakkı" },

  advanced_ai_shortlist: { role: "client", minPlan: "pro", label: "Gelişmiş AI Shortlist" },
  backup_talent_suggestions: { role: "client", minPlan: "pro", label: "Backup Talent Suggestions" },
  team_insights: { role: "client", minPlan: "pro", label: "Team Insights" },
  advanced_matching_client: { role: "client", minPlan: "pro", label: "Gelişmiş AI Matching" },
  talent_pool: { role: "client", minPlan: "pro", label: "Talent Pool" },
  advanced_project_analytics: { role: "client", minPlan: "pro", label: "Gelişmiş Project Analytics" },
  deep_talent_analysis: { role: "client", minPlan: "pro", label: "Derin Freelancer/Yetenek Analizi" },
  ai_high_usage_limit: { role: "client", minPlan: "pro", label: "Yüksek AI Kullanım Limiti" },
};

export type AccessContext = {
  userId: string | null;
  role: UserRole | null;
  plan: PlanTier;
  subscription: SubscriptionStatus;
};

/**
 * Verilen (role, plan) kombinasyonu bir özelliği kullanabilir mi?
 *
 * Saf fonksiyon — hem client hem server'da, hem de test dosyalarında
 * kullanılabilir. Feature role'e özelse ve context'in role'ü
 * uymuyorsa false döner (ör. bir client "pre_proposal_messaging"
 * kontrolü yaparsa hep false — bu bir freelancer özelliği).
 */
export function canUseFeature(
  context: { role: UserRole | null; plan: PlanTier },
  feature: FeatureKey
): boolean {
  const rule = FEATURE_MATRIX[feature];
  if (!rule) return false;
  if (rule.role !== "both" && context.role !== rule.role) return false;
  return PLAN_RANK[context.plan] >= PLAN_RANK[rule.minPlan];
}

/** Bu özelliği açan minimum plan — upgrade CTA metni için. */
export function requiredPlanFor(feature: FeatureKey): PlanTier {
  return FEATURE_MATRIX[feature]?.minPlan ?? "pro";
}

/**
 * Auth + role + plan'ı TEK seferde çözer. Server route'ları ve server
 * component'ler bunu kullanmalı — client (browser) tarafında ise
 * `usePremium()` hook'u aynı veriyi sağlar.
 */
export async function getUserAccessContext(supabase: SupabaseClient): Promise<AccessContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, role: null, plan: "free", subscription: DEFAULT_STATUS };
  }

  const [{ data: profile }, subscription] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    fetchSubscriptionStatus(supabase),
  ]);

  const role = profile?.role === "freelancer" || profile?.role === "client" ? profile.role : null;

  return { userId: user.id, role, plan: subscription.plan, subscription };
}

/**
 * Server route'larda kullanılacak tek satırlık gate. Erişim yoksa
 * `null` döner (çağıran taraf 403 üretir); erişim varsa context'i
 * döner.
 */
export async function requireFeatureAccess(
  supabase: SupabaseClient,
  feature: FeatureKey
): Promise<{ ok: true; context: AccessContext } | { ok: false; context: AccessContext }> {
  const context = await getUserAccessContext(supabase);
  const ok = context.userId !== null && canUseFeature(context, feature);
  return ok ? { ok: true, context } : { ok: false, context };
}
