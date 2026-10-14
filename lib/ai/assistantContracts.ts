import { FEATURE_MATRIX, type FeatureKey, type PlanTier } from "@/lib/premium";

export const AI_CAPABILITIES = [
  { id: "matching", label: "Eşleşme Analizi", feature: "matching_explanation", description: "Profilinle açık proje rollerinin neden eşleştiğini gör.", cta: "Analizi başlat" },
  { id: "proposal", label: "Teklif Asistanı", feature: "proposal_ai", description: "Seçtiğin projenin rol ve kapsamına uygun teklifini mevcut AI asistanıyla geliştir.", cta: "Teklifini geliştir" },
  { id: "profile", label: "Profil Koçu", feature: "profile_analytics", description: "Profilindeki eksikleri ve geliştirebileceğin alanları keşfet.", cta: "Profilini analiz et" },
  { id: "project", label: "Proje Değerlendirme", feature: "matching_explanation", description: "Bir projedeki rol uyumunu ve başvuru uygunluğunu değerlendir.", cta: "Projeyi değerlendir" },
  { id: "performance", label: "Teklif Performansı", feature: "proposal_performance", description: "Gönderilen, yanıtlanan ve kabul edilen tekliflerini incele.", cta: "Performansını incele" },
  { id: "alerts", label: "Smart Project Alerts", feature: "smart_project_alerts", description: "Profilin ve başvuru geçmişinle ilgili açık fırsatları bul.", cta: "Fırsatları bul" },
  { id: "advanced-matching", label: "Advanced AI Matching", feature: "advanced_matching", description: "Daha geniş öneri havuzunu ve yakın eşleşmeleri değerlendir.", cta: "Gelişmiş analizi başlat" },
  { id: "competition", label: "Rekabet İçgörüleri", feature: "competition_insights", description: "Mevcut tekliflerinin rekabet verilerini incele.", cta: "Rekabeti incele" },
  { id: "advanced-profile", label: "Advanced Profile Insights", feature: "advanced_profile_insights", description: "Profil ve ücret bilgilerini mevcut pazar verileriyle değerlendir.", cta: "Gelişmiş içgörüleri incele" },
] as const satisfies readonly { id: string; label: string; feature: FeatureKey; description: string; cta: string }[];
export type AIIntent = typeof AI_CAPABILITIES[number]["id"];
export type AIOptions = {
  plan: PlanTier;
  capabilities: { id: AIIntent; requiredPlan: PlanTier; allowed: boolean }[];
  projects: { id: string; title: string }[];
  briefing: { proposalCount: number; profileCompletion: number | null };
};
export function capabilityFor(value: unknown) { return AI_CAPABILITIES.find(item => item.id === value) ?? null; }
export function minimumAIPlan(intent: AIIntent) { return FEATURE_MATRIX[capabilityFor(intent)!.feature].minPlan; }
