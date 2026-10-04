import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanTier } from "@/lib/premium";

/**
 * CollaCrew — client platform service fee (commission).
 *
 * The authoritative rate is decided in the database by
 * `private.client_commission_rate()` (see
 * supabase/migrations/202609230002_plan_based_client_commission.sql), which
 * also prices every `project_milestones` row via a trigger. The app never
 * decides a client's rate on its own: it reads it with
 * `getClientCommissionRate()` and uses `calculateClientPricing()` for the
 * arithmetic, so no page hard-codes a percentage.
 *
 *   Free → 15% (standard) · Plus → 12% · Pro → 12%
 *
 * The rate is frozen per project (projects.commission_rate) when the project
 * is created, so later plan changes never re-price an existing project. Use
 * `getProjectCommissionRate()` for anything tied to a project and
 * `getClientCommissionRate()` only to preview a *new* project.
 *
 * The fee is charged to the client on top of the freelancer amount; the
 * freelancer receives the full amount. No payment provider is connected, so
 * these are calculations, not completed payments.
 */
export const COMMISSION_RATE_BY_PLAN: Record<PlanTier, number> = {
  free: 0.15,
  plus: 0.12,
  pro: 0.12,
};

/** Standard (Free) rate — used only as a fallback when the RPC is unavailable. */
export const STANDARD_COMMISSION_RATE = COMMISSION_RATE_BY_PLAN.free;

/** @deprecated kept for existing imports — use getClientCommissionRate(). */
export const PLATFORM_FEE_RATE = STANDARD_COMMISSION_RATE;

/**
 * The signed-in client's current commission rate, resolved server-side from
 * their effective (non-expired) subscription.
 */
export async function getClientCommissionRate(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("my_commission_rate");
  const rate = Number(data);

  if (error || !Number.isFinite(rate) || rate <= 0) {
    return STANDARD_COMMISSION_RATE;
  }

  return rate;
}

/** A project's frozen rate (snapshot), falling back to the standard rate. */
export function getProjectCommissionRate(project: { commission_rate?: number | string | null } | null | undefined): number {
  const rate = Number(project?.commission_rate);
  return Number.isFinite(rate) && rate > 0 && rate < 1 ? rate : STANDARD_COMMISSION_RATE;
}

/**
 * Komisyon MODELİ (tek doğruluk kaynağı). Mevcut iş kararı: platform ücreti
 * yalnızca CLIENT'a, proje bedelinin ÜZERİNE eklenir; freelancer kesinti
 * ödemez ve teklif ettiği/aşama bütçesindeki tutarın tamamını alır. Oranı
 * değiştirmeden model burada isimlendirilmiştir; ileride freelancer tarafı
 * ücret eklenirse yalnızca `freelancerFeeRate` ve `calculateFreelancerNet`
 * değişir.
 */
export const PLATFORM_FEE_MODEL = {
  feePayer: "client",
  freelancerFeeRate: 0,
} as const;

/** Freelancer'ın eline geçecek net tutar (mevcut modelde kesinti yok). */
export function calculateFreelancerNet(baseAmount: number): number {
  const amount = Number.isFinite(baseAmount) && baseAmount > 0 ? baseAmount : 0;
  return Math.round(amount * (1 - PLATFORM_FEE_MODEL.freelancerFeeRate) * 100) / 100;
}

/**
 * Marketplace tutar sözlüğü — sayfalar bu dört adı kullanır:
 *   BASE_AMOUNT     proje/aşama bütçesi (client'ın belirlediği tutar)
 *   PLATFORM_FEE    CollaCrew hizmet bedeli
 *   CLIENT_TOTAL    client'ın toplam ödeyeceği tutar
 *   FREELANCER_NET  freelancer'ın net kazancı
 */
export type MarketplaceAmounts = {
  BASE_AMOUNT: number;
  PLATFORM_FEE: number;
  CLIENT_TOTAL: number;
  FREELANCER_NET: number;
  RATE: number;
};

export type ClientPricing = {
  freelancerAmount: number;
  platformFee: number;
  clientTotal: number;
  rate: number;
};

/** Same rounding as the database: fee rounded to 2 decimals, total = amount + fee. */
export function calculateClientPricing(freelancerAmount: number, rate: number): ClientPricing {
  const amount = Number.isFinite(freelancerAmount) && freelancerAmount > 0 ? freelancerAmount : 0;
  const platformFee = Math.round(amount * rate * 100) / 100;

  return {
    freelancerAmount: amount,
    platformFee,
    clientTotal: amount + platformFee,
    rate,
  };
}

export function calculateMarketplaceAmounts(baseAmount: number, rate: number): MarketplaceAmounts {
  const pricing = calculateClientPricing(baseAmount, rate);

  return {
    BASE_AMOUNT: pricing.freelancerAmount,
    PLATFORM_FEE: pricing.platformFee,
    CLIENT_TOTAL: pricing.clientTotal,
    FREELANCER_NET: calculateFreelancerNet(pricing.freelancerAmount),
    RATE: pricing.rate,
  };
}

export function formatRatePercent(rate: number): string {
  return `%${Math.round(rate * 100)}`;
}

/** @deprecated use formatRatePercent(await getClientCommissionRate(supabase)). */
export function formatFeeRatePercent(): string {
  return formatRatePercent(STANDARD_COMMISSION_RATE);
}
