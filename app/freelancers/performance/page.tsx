"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  Eye,
  Info,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { usePremium } from "@/lib/hooks/usePremium";
import type { ProposalPerformance } from "@/lib/analytics/proposalPerformance";
import type { ProfileAnalysis } from "@/lib/analytics/profileInsights";

type CompetitionInsight = {
  projectId: string;
  totalProposals: number;
  avgBidAmount: number | null;
  myBidAmount: number | null;
  cheaperThanMe: number;
};

type AdvancedProfileInsights = {
  myHourlyRate: number | null;
  marketAverageHourlyRate: number | null;
  sampleSize: number;
};

type PerformanceResponse = {
  proposalPerformance: ProposalPerformance;
  profileAnalysis: ProfileAnalysis;
  competitionInsights: CompetitionInsight[] | null;
  advancedProfileInsights: AdvancedProfileInsights | null;
};

type Recommendation = {
  projectId: string;
  title: string;
  category: string | null;
  role: string;
  score: number;
  reason: string;
  budgetPerPerson: number | null;
  duration: string | null;
  personalizedTag: string | null;
};

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `%${Math.round(value * 100)}`;
}

function formatDays(value: number | null) {
  if (value === null) return "—";
  if (value < 1) return "1 günden az";
  return `${Math.round(value)} gün`;
}

const SEVERITY_STYLES: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  good: { icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50" },
  info: { icon: Info, className: "text-amber-600 bg-amber-50" },
  warning: { icon: XCircle, className: "text-red-600 bg-red-50" },
};

export default function FreelancerPerformancePage() {
  const supabase = useMemo(() => createClient(), []);
  const { can, plan, loading: premiumLoading } = usePremium();
  const hasAccess = can("proposal_performance");
  const hasCompetitionInsights = can("competition_insights");
  const hasAdvancedProfileInsights = can("advanced_profile_insights");

  const [data, setData] = useState<PerformanceResponse | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (premiumLoading || !hasAccess) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [performanceRes, recommendationsRes] = await Promise.all([
          fetch("/api/premium/performance"),
          fetch("/api/premium/recommended-projects"),
        ]);

        const performanceJson = await performanceRes.json();
        const recommendationsJson = await recommendationsRes.json();

        if (!performanceRes.ok) {
          throw new Error(performanceJson?.error || "Performans verileri alınamadı.");
        }

        if (!cancelled) {
          setData(performanceJson);
          setRecommendations(
            recommendationsRes.ok ? recommendationsJson.recommendations ?? [] : []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Bir hata oluştu.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, premiumLoading, supabase]);

  if (premiumLoading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
          Performans verilerin hazırlanıyor...
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Link
          href="/freelancers/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={15} />
          Panele dön
        </Link>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-600)] text-white">
            <BarChart3 size={20} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-gray-900">Kişisel Performans Dashboard&apos;u Plus paketine dahildir</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
            Tekliflerinin hangi kategorilerde ve bütçe aralıklarında daha çok geri dönüş aldığını, profilinin nerede
            geliştirilebileceğini ve sana özel proje önerilerini burada gerçek verilerinle görebilirsin.
          </p>
          <Link
            href="/premium"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--color-primary-600)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
          >
            Plus&apos;u İncele
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
          Performans verilerin hazırlanıyor...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
      </main>
    );
  }

  const performance = data?.proposalPerformance;
  const profile = data?.profileAnalysis;

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <Link
          href="/freelancers/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={15} />
          Panele dön
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">Performans</h1>
          <span className="rounded-full bg-[var(--color-primary-600)] px-2.5 py-0.5 text-xs font-medium text-white">
            {plan === "pro" ? "Pro" : "Plus"}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">Teklif geçmişin ve profilin üzerinden gerçek verilere dayanan analiz.</p>
      </div>

      {/* GENEL BAKIŞ */}
      {performance && !performance.hasData ? (
        <EmptyState
          icon={Send}
          title="Henüz yeterli teklif verin bulunmuyor"
          description="Daha fazla teklif gönderdiğinde burada kişisel performans analizin oluşacak."
        />
      ) : performance ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Genel Bakış</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Send} label="Gönderilen teklif" value={String(performance.allTime.sent)} />
            <StatCard icon={Eye} label="Görüntülenen" value={String(performance.allTime.viewed)} />
            <StatCard icon={CheckCircle2} label="Kabul oranı" value={formatPercent(performance.allTime.acceptanceRate)} />
            <StatCard icon={Clock3} label="Ort. sonuçlanma" value={formatDays(performance.allTime.avgResolutionDays)} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={TrendingUp} label="Geri dönüş oranı" value={formatPercent(performance.allTime.responseRate)} />
            <StatCard icon={XCircle} label="Reddedilen" value={String(performance.allTime.rejected)} />
            <StatCard icon={BarChart3} label="Ort. teklif tutarı" value={formatCurrency(performance.allTime.avgBidAmount)} />
            <StatCard icon={Clock3} label="Bekleyen" value={String(performance.allTime.pending)} />
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm leading-6 text-gray-700">
              Son 30 günde <span className="font-semibold text-gray-900">{performance.last30Days.sent}</span> teklif
              gönderdin.{" "}
              {performance.last30Days.viewed > 0 && (
                <>
                  <span className="font-semibold text-gray-900">{performance.last30Days.viewed}</span> teklif
                  görüntülendi.{" "}
                </>
              )}
              {performance.last30Days.responded > 0 && (
                <>
                  <span className="font-semibold text-gray-900">{performance.last30Days.responded}</span> teklif için
                  geri dönüş aldın.{" "}
                </>
              )}
              {performance.last30Days.accepted > 0 && (
                <>
                  <span className="font-semibold text-gray-900">{performance.last30Days.accepted}</span> teklif kabul
                  edildi.
                </>
              )}
            </p>

            {performance.trend !== "insufficient_data" && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                {performance.trend === "improving" && (
                  <>
                    <TrendingUp size={13} className="text-emerald-600" /> Son dönemde kabul oranın önceki 30 güne göre
                    yükseliyor.
                  </>
                )}
                {performance.trend === "declining" && (
                  <>
                    <TrendingDown size={13} className="text-red-500" /> Son dönemde kabul oranın önceki 30 güne göre
                    düşüyor.
                  </>
                )}
                {performance.trend === "steady" && <>Kabul oranın son iki dönemde benzer seyrediyor.</>}
              </p>
            )}
          </div>
        </section>
      ) : null}

      {/* BAŞVURU ANALİZİ */}
      {performance && performance.hasData && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Başvuru Analizi</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <BreakdownCard title="Kategoriye göre" rows={performance.categoryBreakdown} />
            <BreakdownCard title="Teklif tutarına göre" rows={performance.budgetBreakdown} />
          </div>
        </section>
      )}

      {/* PROFİL */}
      {profile && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Profil</h2>
          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserRound size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Profil tamamlanma</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">%{profile.completionScore}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[var(--color-primary-600)]"
                style={{ width: `${Math.max(0, Math.min(100, profile.completionScore))}%` }}
              />
            </div>

            <div className="mt-5 space-y-3">
              {profile.insights.map((insight, index) => {
                const style = SEVERITY_STYLES[insight.severity];
                const Icon = style.icon;
                return (
                  <div key={index} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.className}`}>
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800">{insight.observation}</p>
                      {insight.suggestion && (
                        <p className="mt-1 text-xs leading-5 text-gray-500">{insight.suggestion}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href="/freelancers/profile"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-[var(--color-text-primary)]"
            >
              Profilde düzenle →
            </Link>
          </div>
        </section>
      )}

      {/* PRO: REKABET İÇGÖRÜLERİ */}
      {hasCompetitionInsights && data?.competitionInsights && data.competitionInsights.length > 0 && (
        <section>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Rekabet İçgörüleri</h2>
            <span className="rounded-full bg-[var(--color-primary-600)] px-2 py-0.5 text-[10px] font-medium text-white">Pro</span>
          </div>
          <div className="mt-3 space-y-2">
            {data.competitionInsights.map((insight) => (
              <div
                key={insight.projectId}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-sm"
              >
                <span className="text-gray-600">
                  Bu proje için toplam <span className="font-semibold text-gray-900">{insight.totalProposals}</span> teklif
                  gönderildi.
                </span>
                {insight.avgBidAmount !== null && insight.myBidAmount !== null && (
                  <span className="text-xs text-gray-400">
                    Ortalama {formatCurrency(insight.avgBidAmount)} · Senin teklifin {formatCurrency(insight.myBidAmount)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PRO: GELİŞMİŞ PROFİL İÇGÖRÜLERİ */}
      {hasAdvancedProfileInsights && data?.advancedProfileInsights && data.advancedProfileInsights.sampleSize > 0 && (
        <section>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Gelişmiş Profil İçgörüleri</h2>
            <span className="rounded-full bg-[var(--color-primary-600)] px-2 py-0.5 text-[10px] font-medium text-white">Pro</span>
          </div>
          <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
            {data.advancedProfileInsights.myHourlyRate !== null &&
            data.advancedProfileInsights.marketAverageHourlyRate !== null ? (
              <p>
                Senin saatlik ücretin{" "}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(data.advancedProfileInsights.myHourlyRate)}
                </span>
                , platformdaki {data.advancedProfileInsights.sampleSize} freelancer&apos;ın ortalaması{" "}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(data.advancedProfileInsights.marketAverageHourlyRate)}
                </span>
                .
              </p>
            ) : (
              <p className="text-gray-400">Karşılaştırma için saatlik ücretini profiline eklemen gerekiyor.</p>
            )}
          </div>
        </section>
      )}

      {/* SANA UYGUN PROJELER */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Sana Uygun Projeler</h2>
        {recommendations.length === 0 ? (
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
            Şu anda profiline güçlü şekilde uygun açık bir proje bulunmuyor. Yeni projeler eklendiğinde burada
            görünecek.
          </div>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {recommendations.map((item) => (
              <Link
                key={item.projectId}
                href={`/freelancers/discover/${item.projectId}`}
                className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-gray-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{item.role}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--color-primary-600)] px-2.5 py-1 text-xs font-semibold text-white">
                    %{Math.round(item.score)}
                  </span>
                </div>

                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <Sparkles size={12} /> Profilinle güçlü eşleşiyor
                </p>

                {item.personalizedTag && (
                  <p className="mt-1 text-xs text-gray-400">{item.personalizedTag}</p>
                )}

                {item.budgetPerPerson && (
                  <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
                    Kişi başı bütçe: <span className="font-medium text-gray-800">{formatCurrency(item.budgetPerPerson)}</span>
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Send;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon size={14} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; sent: number; accepted: number; acceptanceRate: number | null }>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-3 text-sm text-gray-400">Henüz yeterli veri yok.</p>
      </div>
    );
  }

  const maxSent = Math.max(...rows.map((r) => r.sent), 1);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">{row.key}</span>
              <span className="text-gray-400">
                {row.sent} teklif · {formatPercent(row.acceptanceRate)} kabul
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[var(--color-primary-600)]"
                style={{ width: `${(row.sent / maxSent) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Send;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-500">
        <Icon size={18} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-gray-500">{description}</p>
    </div>
  );
}
