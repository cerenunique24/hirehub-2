"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { usePremium } from "@/lib/hooks/usePremium";
import { requiredPlanFor, type FeatureKey } from "@/lib/premium";

const PLAN_LABEL: Record<string, string> = {
  plus: "Plus",
  pro: "Pro",
};

/**
 * Bir Plus/Pro özelliğin etrafını sarar. Erişimi olan kullanıcıda
 * children doğrudan render edilir. Erişimi olmayan kullanıcıda özellik
 * tamamen gizlenmez — hangi pakette olduğunu ve ne işe yaradığını
 * anlatan sakin bir kart gösterilir ("agresif popup" değil, inline bir
 * açıklama). Kullanıcı isterse "Şimdilik devam et" diyip children'ı
 * yine de görebilir (ör. salt okunur bir önizleme), isterse "Planı
 * İncele"ye tıklar.
 *
 * `feature` verilirse erişim `canUseFeature()` ile (role + plan bazlı)
 * kontrol edilir ve gereken paket adı otomatik gösterilir. Verilmezse
 * eski davranışa (sadece "free değil mi") düşer.
 */
export default function PremiumGate({
  title,
  description,
  children,
  dismissible = true,
  feature,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  dismissible?: boolean;
  feature?: FeatureKey;
}) {
  const { isPremium, loading, can } = usePremium();
  const [dismissed, setDismissed] = useState(false);

  if (loading) return null;

  const hasAccess = feature ? can(feature) : isPremium;

  if (hasAccess || dismissed) return <>{children}</>;

  const requiredPlan = feature ? PLAN_LABEL[requiredPlanFor(feature)] ?? "Plus" : "Premium";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-600)] text-white">
          <Sparkles size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {requiredPlan} özelliği
          </p>
          <h3 className="mt-1 font-semibold text-gray-900">{title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-gray-600">{description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/premium"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
            >
              {requiredPlan} Planını İncele
            </Link>
            {dismissible && (
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                Şimdilik devam et
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
