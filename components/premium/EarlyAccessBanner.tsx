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
    <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-primary-600)]/15 bg-[var(--color-primary-50)]/60 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-white text-[var(--color-primary-600)]">
          <BarChart3 size={15} />
        </span>

        <p className="cc-body-sm min-w-0 text-[var(--color-text-primary)]">
          <span className="font-semibold text-[var(--color-primary-700)]">Plus</span>{" "}
          ile tekliflerinin performansını analiz et.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/premium"
          className="rounded-[var(--radius-button)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-700)] transition hover:bg-white"
        >
          İncele
        </Link>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Kapat"
          className="rounded-[var(--radius-button)] p-1 text-[var(--color-primary-600)]/60 hover:bg-white hover:text-[var(--color-primary-700)]"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
