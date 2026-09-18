"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Bir Premium özelliğin etrafını sarar. Premium kullanıcıda children
 * doğrudan render edilir. Free kullanıcıda özellik tamamen
 * gizlenmez — ne işe yaradığını anlatan sakin bir kart gösterilir
 * ("agresif popup" değil, inline bir açıklama). Kullanıcı isterse
 * "Şimdilik devam et" diyip children'ı yine de görebilir (ör. salt
 * okunur bir önizleme), isterse "Premium'u İncele"ye tıklar.
 */
export default function PremiumGate({
  title,
  description,
  children,
  dismissible = true,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  dismissible?: boolean;
}) {
  const { isPremium, loading } = usePremium();
  const [dismissed, setDismissed] = useState(false);

  if (loading) return null;
  if (isPremium || dismissed) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-white">
          <Sparkles size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">CollaCrew Premium</p>
          <h3 className="mt-1 font-semibold text-gray-900">{title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-gray-600">{description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/premium"
              className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Premium&apos;u İncele
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
