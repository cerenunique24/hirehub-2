/**
 * Freelancer teklif performans analitiği — Premium "Teklif Performans
 * Analizi" ve "Kişisel Performans Dashboard'u" için ortak hesaplama.
 *
 * Tüm sayılar gerçek `proposals` satırlarından hesaplanır. Mock/sabit
 * istatistik YOK — veri yoksa alanlar `null`/boş dizi döner ve
 * çağıran taraf bunu "yeterli veri yok" empty state'i olarak gösterir.
 */

export type ProposalForAnalytics = {
  id: string;
  status: string;
  bid_amount: number | null;
  created_at: string;
  responded_at: string | null;
  viewed_at: string | null;
  project_category: string | null;
  project_budget: number | null;
};

export type PeriodStats = {
  sent: number;
  viewed: number;
  responded: number;
  accepted: number;
  rejected: number;
  pending: number;
  responseRate: number | null;
  acceptanceRate: number | null;
  avgBidAmount: number | null;
  avgResolutionDays: number | null;
};

export type BreakdownRow = {
  key: string;
  sent: number;
  responded: number;
  accepted: number;
  responseRate: number | null;
  acceptanceRate: number | null;
};

export type ProposalPerformance = {
  hasData: boolean;
  totalSent: number;
  allTime: PeriodStats;
  last30Days: PeriodStats;
  previous30Days: PeriodStats;
  trend: "improving" | "declining" | "steady" | "insufficient_data";
  categoryBreakdown: BreakdownRow[];
  budgetBreakdown: BreakdownRow[];
};

const BUDGET_BUCKETS: Array<{ key: string; min: number; max: number }> = [
  { key: "₺0 – ₺10.000", min: 0, max: 10000 },
  { key: "₺10.000 – ₺25.000", min: 10000, max: 25000 },
  { key: "₺25.000 – ₺50.000", min: 25000, max: 50000 },
  { key: "₺50.000+", min: 50000, max: Infinity },
];

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function computePeriodStats(proposals: ProposalForAnalytics[]): PeriodStats {
  const sent = proposals.length;
  const viewed = proposals.filter((p) => p.viewed_at !== null).length;
  const responded = proposals.filter((p) => p.responded_at !== null).length;
  const accepted = proposals.filter((p) => p.status === "accepted").length;
  const rejected = proposals.filter((p) => p.status === "rejected").length;
  const pending = proposals.filter((p) => p.status === "pending").length;

  const bidAmounts = proposals
    .map((p) => p.bid_amount)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);

  const resolutionDays = proposals
    .filter((p) => p.responded_at !== null)
    .map((p) => daysBetween(p.created_at, p.responded_at as string))
    .filter((v) => Number.isFinite(v) && v >= 0);

  return {
    sent,
    viewed,
    responded,
    accepted,
    rejected,
    pending,
    responseRate: ratio(responded, sent),
    acceptanceRate: ratio(accepted, sent),
    avgBidAmount: average(bidAmounts),
    avgResolutionDays: average(resolutionDays),
  };
}

function computeBreakdown(
  proposals: ProposalForAnalytics[],
  keyOf: (p: ProposalForAnalytics) => string | null
): BreakdownRow[] {
  const groups = new Map<string, ProposalForAnalytics[]>();

  for (const proposal of proposals) {
    const key = keyOf(proposal);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(proposal);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const sent = group.length;
      const responded = group.filter((p) => p.responded_at !== null).length;
      const accepted = group.filter((p) => p.status === "accepted").length;

      return {
        key,
        sent,
        responded,
        accepted,
        responseRate: ratio(responded, sent),
        acceptanceRate: ratio(accepted, sent),
      };
    })
    .sort((a, b) => b.sent - a.sent);
}

export function computeProposalPerformance(
  proposals: ProposalForAnalytics[]
): ProposalPerformance {
  const now = new Date();
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const cutoff60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const last30Days = proposals.filter(
    (p) => new Date(p.created_at) >= cutoff30
  );
  const previous30Days = proposals.filter(
    (p) => new Date(p.created_at) >= cutoff60 && new Date(p.created_at) < cutoff30
  );

  const last30Stats = computePeriodStats(last30Days);
  const previous30Stats = computePeriodStats(previous30Days);

  let trend: ProposalPerformance["trend"] = "insufficient_data";

  if (last30Days.length >= 3 && previous30Days.length >= 3) {
    const currentRate = last30Stats.acceptanceRate ?? 0;
    const previousRate = previous30Stats.acceptanceRate ?? 0;
    const delta = currentRate - previousRate;

    if (Math.abs(delta) < 0.05) {
      trend = "steady";
    } else if (delta > 0) {
      trend = "improving";
    } else {
      trend = "declining";
    }
  }

  return {
    hasData: proposals.length > 0,
    totalSent: proposals.length,
    allTime: computePeriodStats(proposals),
    last30Days: last30Stats,
    previous30Days: previous30Stats,
    trend,
    categoryBreakdown: computeBreakdown(proposals, (p) => p.project_category),
    budgetBreakdown: computeBreakdown(proposals, (p) => {
      if (typeof p.bid_amount !== "number" || !Number.isFinite(p.bid_amount)) {
        return null;
      }
      const bucket = BUDGET_BUCKETS.find(
        (b) => p.bid_amount! >= b.min && p.bid_amount! < b.max
      );
      return bucket?.key ?? null;
    }),
  };
}
