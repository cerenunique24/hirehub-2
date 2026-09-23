"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchSubscriptionStatus,
  canUseFeature,
  type SubscriptionStatus,
  type PlanTier,
  type UserRole,
  type FeatureKey,
} from "@/lib/premium";

/**
 * Client (browser) tarafındaki TEK plan/erişim hook'u.
 *
 * `can(feature)` — asıl kullanılması gereken API: feature-bazlı,
 * role-farkında kontrol. `isPremium` sadece geriye dönük uyumluluk
 * için tutulur ("free değil" anlamına gelir, hangi plan/feature
 * olduğunu ayırt etmez).
 *
 * ÖNEMLİ: Bu hook sadece UI'ı şekillendirir. Gerçek yetkilendirme
 * HER ZAMAN server-side'da (lib/premium.ts::requireFeatureAccess)
 * tekrar kontrol edilir — buradaki değerlere güvenilerek API
 * çağrısı atlanmaz.
 */
export function usePremium() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setStatus({
            plan: "free",
            raw_plan: "free",
            status: "active",
            started_at: null,
            expires_at: null,
            trial_used: false,
            billing_cycle: null,
            cancel_at_period_end: false,
            canceled_at: null,
          });
          setRole(null);
          setLoading(false);
        }
        return;
      }

      const [{ data: profile }, subscription] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        fetchSubscriptionStatus(supabase),
      ]);

      if (active) {
        setRole(profile?.role === "freelancer" || profile?.role === "client" ? profile.role : null);
        setStatus(subscription);
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [supabase]);

  const plan: PlanTier = status?.plan ?? "free";

  return {
    plan,
    role,
    status,
    loading,
    /** Geriye dönük uyumluluk: "free değil" — hangi plan/feature olduğunu ayırt etmez. */
    isPremium: plan !== "free",
    can: (feature: FeatureKey) => canUseFeature({ role, plan }, feature),
  };
}
