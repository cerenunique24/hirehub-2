"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, X } from "lucide-react";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Discover listesinin üstünde, free kullanıcıya Premium'un analytics
 * katmanının farkındalığını sağlayan sakin, kapatılabilir bir bilgi
 * şeridi. Agresif bir popup değil — sayfa akışının bir parçası.
 *
 * ÖNEMLİ: Discover/matching/teklif gönderme herkes için zaten tam
 * kapasiteyle çalışıyor — bu banner erişimi kısıtlayan bir özelliği
 * değil, isteğe bağlı bir analiz katmanını tanıtır.
 */
export default function EarlyAccessBanner() {
  const { can, loading } = usePremium();
  const [dismissed, setDismissed] = useState(false);

  if (loading || can("proposal_performance") || dismissed) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/50 px-4 py-2.5">
      <div className="flex items-center gap-2.5 text-sm text-gray-700">
        <BarChart3 size={15} className="shrink-0 text-gray-500" />
        <span>
          <Link href="/premium" className="font-medium text-gray-900 underline-offset-2 hover:underline">
            Plus
          </Link>{" "}
          ile tekliflerinin performansını analiz et.
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Kapat"
        className="shrink-0 rounded-[var(--radius-button)] p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <X size={15} />
      </button>
    </div>
  );
}
