import type { PlanTier } from "@/lib/premium";

/**
 * Tek kaynak: paket fiyatları, özellik listeleri ve "Önerilen" etiketi.
 * `/premium` ve `/premium/checkout` bu dosyayı kullanır — fiyat/özellik
 * listesi iki yerde ayrı ayrı tutulmaz.
 *
 * "Önerilen" etiketi kodda sabit bir görsel metin değil, her paketin
 * `recommended` alanıyla yönetilir — ileride Pro'yu önerilen yapmak
 * için sadece burada `recommended: true`'yu taşımak yeterli.
 */
export type PlanDefinition = {
  id: PlanTier;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  /** Bu pakette YENİ eklenen özellikler (alt pakete ek olarak). */
  addedFeatures: string[];
  recommended?: boolean;
};

export const FREELANCER_PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    addedFeatures: [
      "Proje keşfi",
      "Temel AI/proje eşleşmesi",
      "Eşleşme yüzdesi",
      "Eşleştiğin rolün bütçesini ve süresini görme",
      "Teklif gönderme",
      "Teklif sonrası client ile mesajlaşma",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthly: 149,
    priceYearly: 1490,
    recommended: true,
    addedFeatures: [
      "Eşleşme nedenleri (matching explanation)",
      "AI Proposal Assistant",
      "Proposal Performance",
      "Profil Analytics",
      "Smart Project Alerts",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 299,
    priceYearly: 2990,
    addedFeatures: [
      "Gelişmiş AI Matching",
      "Rekabet / başvuru içgörüleri",
      "Gelişmiş profil içgörüleri",
      "Premium görünürlük",
      "Öncelikli önerilme / eşleşme",
      "Teklif göndermeden önce client'a mesaj gönderme",
    ],
  },
];

export const CLIENT_PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    addedFeatures: [
      "Proje oluşturma",
      "Temel freelancer eşleşmeleri",
      "Proposal yönetimi",
      "Temel matching",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthly: 399,
    priceYearly: 3990,
    recommended: true,
    addedFeatures: [
      "%12 platform hizmet bedeli (Free: %15) — yeni projelerde",
      "AI Freelancer Shortlist",
      "Freelancer Comparison",
      "Budget Compatibility Analysis",
      "Talent Alerts",
      "Project Analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 799,
    priceYearly: 7990,
    addedFeatures: [
      "%12 platform hizmet bedeli — yeni projelerde",
      "Gelişmiş AI Shortlist",
      "Backup Talent Suggestions",
      "Team Insights",
      "Gelişmiş Matching",
      "Talent Pool",
      "Gelişmiş Project Analytics",
    ],
  },
];

export function getPlansForRole(role: "client" | "freelancer" | null): PlanDefinition[] {
  return role === "client" ? CLIENT_PLANS : FREELANCER_PLANS;
}

export function getPlanDefinition(
  role: "client" | "freelancer" | null,
  planId: PlanTier
): PlanDefinition {
  const plans = getPlansForRole(role);
  return plans.find((p) => p.id === planId) ?? plans[0];
}

export function getPlanPrice(plan: PlanDefinition, cycle: "monthly" | "yearly"): number {
  return cycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
}

export function yearlySavingsPercent(monthly: number, yearly: number): number {
  if (monthly === 0) return 0;
  const fullPrice = monthly * 12;
  if (fullPrice === 0) return 0;
  return Math.round((1 - yearly / fullPrice) * 100);
}
