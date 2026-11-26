"use client";

import { Button } from "@/components/ui/Button";
import type { FreelancerEarningsSummary, FreelancerEarningMovement } from "@/lib/financials";
import { earningWorkLabel, earningsPaymentPresentation } from "@/lib/payments/earningsPresentation";
import { FinanceIntro, FinanceMovements, type FinanceMovement } from "./FinancePanel";
import styles from "./Earnings.module.css";

function toMovement(row: FreelancerEarningMovement): FinanceMovement {
  const approvalDate = row.approvedAt && Number.isFinite(Date.parse(row.approvedAt))
    ? new Date(row.approvedAt).toLocaleDateString("tr-TR")
    : null;
  const projectPath = row.projectStatus === "completed" ? "earnings"
    : row.projectStatus === "in_progress" ? "projects" : "discover";

  return {
    id: row.id,
    project: row.projectTitle,
    stage: row.title,
    amount: row.net,
    status: row.paymentStatus ? earningsPaymentPresentation(row.paymentStatus)
      : { label: "Ödeme durumu bilinmiyor", tone: "neutral" },
    href: `/freelancers/${projectPath}/${row.projectId}`,
    details: [
      { label: "Aşama durumu", value: earningWorkLabel(row.status) },
      ...(approvalDate ? [{ label: "Onay tarihi", value: approvalDate }] : []),
      ...(row.paymentReference ? [{ label: "Ödeme referansı", value: row.paymentReference }] : []),
    ],
  };
}

export function EarningsView({ summary, loading, error, onRetry }: {
  summary: FreelancerEarningsSummary | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  return <main className={styles.page}>
    <FinanceIntro title="Kazançlarım" notice="Para çekme henüz kullanıma açık değil." withdrawal />
    {loading ? <p role="status">Kazanç hareketleri yükleniyor…</p>
      : error ? <div className={styles.error} role="alert">
        <p>{error}</p><Button variant="secondary" size="sm" onClick={onRetry}>Tekrar dene</Button>
      </div>
      : summary && <>
        {summary.incompleteAmounts && <p className="cc-body-sm text-[var(--color-text-secondary)]">Bazı proje veya tutar bilgileri eksik.</p>}
        <FinanceMovements
          title="Kazanç hareketleri"
          amountLabel="Net hakediş"
          rows={(summary.movements ?? []).map(toMovement)}
          empty="Henüz kazanç hareketin yok."
        />
      </>}
  </main>;
}
