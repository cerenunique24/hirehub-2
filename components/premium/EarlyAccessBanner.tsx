"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock3, X } from "lucide-react";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Discover listesinin üstünde, free kullanıcıya "48 saat erken erişim"
 * Premium özelliğinin farkındalığını sağlayan sakin, kapatılabilir bir
 * bilgi şeridi. Agresif bir popup değil — sayfa akışının bir parçası.
 */
export default function EarlyAccessBanner() {
  const { isPremium, loading } = usePremium();
  const [dismissed, setDismissed] = useState(false);

  if (loading || isPremium || dismissed) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-2.5 text-sm text-gray-700">
        <Clock3 size={15} className="shrink-0 text-gray-500" />
        <span>
          <Link href="/premium" className="font-medium text-gray-900 underline-offset-2 hover:underline">
            Premium
          </Link>{" "}
          ile yeni projeleri 48 saat önce gör.
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Kapat"
        className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <X size={15} />
      </button>
    </div>
  );
}
