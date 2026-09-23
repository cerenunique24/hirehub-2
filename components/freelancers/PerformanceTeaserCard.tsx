"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";

import { usePremium } from "@/lib/hooks/usePremium";
import type { ProposalPerformance } from "@/lib/analytics/proposalPerformance";

/**
 * Freelancer Dashboard'daki "Performans" alanı.
 *
 * Free kullanıcı: küçük, sakin bir contextual upgrade kartı ("Premium
 * ile performansını daha yakından takip et") — popup değil, sayfa
 * akışının parçası.
 *
 * Premium kullanıcı: gerçek verilerden kısa bir özet + tam Performans
 * sayfasına link.
 */
export default function PerformanceTeaserCard() {
  const { can, loading: premiumLoading } = usePremium();
  const hasAccess = can("proposal_performance");
  const [performance, setPerformance] = useState<ProposalPerformance | null>(null);

  useEffect(() => {
    if (premiumLoading || !hasAccess) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/premium/performance");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setPerformance(json.proposalPerformance ?? null);
      } catch {
        // Sessizce yut — dashboard'da bir teaser, kritik bir akış değil.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, premiumLoading]);

  if (premiumLoading) return null;

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-600)] text-white">
            <BarChart3 size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Performans</p>
            <h3 className="mt-1 font-semibold text-gray-900">Plus ile performansını daha yakından takip et</h3>
            <p className="mt-1.5 text-sm leading-6 text-gray-500">
              Tekliflerinin hangi projelerde daha fazla geri dönüş aldığını analiz et.
            </p>
            <Link
              href="/premium"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:underline"
            >
              Plus&apos;u İncele <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Performans</h2>
          <p className="mt-1 text-sm text-gray-500">Teklif geçmişin ve profilin</p>
        </div>
        <span className="rounded-full bg-[var(--color-primary-600)] px-2.5 py-0.5 text-xs font-medium text-white">Plus</span>
      </div>

      {performance && performance.hasData ? (
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-900">{performance.allTime.sent}</p>
            <p className="text-xs text-gray-500">Teklif</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {performance.allTime.acceptanceRate !== null
                ? `%${Math.round(performance.allTime.acceptanceRate * 100)}`
                : "—"}
            </p>
            <p className="text-xs text-gray-500">Kabul oranı</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{performance.allTime.accepted}</p>
            <p className="text-xs text-gray-500">Kabul edilen</p>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-gray-500">
          Henüz yeterli teklif verin bulunmuyor. Daha fazla teklif gönderdiğinde burada özet görünecek.
        </p>
      )}

      <Link
        href="/freelancers/performance"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-[var(--color-text-primary)]"
      >
        Tam analiz <ArrowRight size={14} />
      </Link>
    </div>
  );
}
