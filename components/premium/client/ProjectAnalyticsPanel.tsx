"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import PremiumGate from "@/components/premium/PremiumGate";
import type { ProposalPerformance } from "@/lib/analytics/proposalPerformance";

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `%${Math.round(value * 100)}`;
}

/**
 * Client "Project Analytics" (Plus) — client'ın TÜM projelerine gelen
 * tekliflerin gerçek verilerden özeti. Tek bir proje sayfasında
 * gösterilse de veri client'ın bütün projelerini kapsar (bkz.
 * /api/premium/client/project-analytics).
 */
export default function ProjectAnalyticsPanel() {
  const [data, setData] = useState<{ projectAnalytics: ProposalPerformance; projectCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/premium/client/project-analytics");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <PremiumGate
        feature="project_analytics"
        title="Project Analytics"
        description="Tüm projelerine gelen tekliflerin geri dönüş ve kabul oranlarını gerçek verilerle gör."
        dismissible
      >
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-700" />
            <h2 className="font-semibold text-gray-900">Project Analytics</h2>
          </div>

          {loading ? (
            <p className="mt-3 text-sm text-gray-400">Yükleniyor...</p>
          ) : !data || !data.projectAnalytics.hasData ? (
            <p className="mt-3 text-sm text-gray-500">
              Henüz projelerine yeterli teklif gelmedi. Teklifler geldikçe burada gerçek performans özetin oluşacak.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-lg font-semibold text-gray-900">{data.projectAnalytics.allTime.sent}</p>
                <p className="text-xs text-gray-500">Alınan teklif</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{data.projectAnalytics.allTime.viewed}</p>
                <p className="text-xs text-gray-500">Görüntülenen</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatPercent(data.projectAnalytics.allTime.responseRate)}
                </p>
                <p className="text-xs text-gray-500">Geri dönüş oranı</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatPercent(data.projectAnalytics.allTime.acceptanceRate)}
                </p>
                <p className="text-xs text-gray-500">Kabul oranı</p>
              </div>
            </div>
          )}
        </div>
      </PremiumGate>
    </section>
  );
}
