"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FinanceIntro, FinanceMovements, type FinanceMovement } from "@/components/earnings/FinancePanel";
import styles from "@/components/earnings/Earnings.module.css";
import { createClient } from "@/lib/supabase/client";
import { getClientPaymentsSummary, type ClientPaymentsSummary, type ClientPaymentStage } from "@/lib/financials";
import { earningWorkLabel, earningsPaymentPresentation } from "@/lib/payments/earningsPresentation";

function toMovement(stage: ClientPaymentStage): FinanceMovement {
  const status = stage.paymentStatus && ["paid", "held", "payout_pending", "paid_out"].includes(stage.paymentStatus)
    ? { label: "Ödendi", tone: "success" as const }
    : stage.paymentStatus ? earningsPaymentPresentation(stage.paymentStatus)
      : { label: "Ödeme durumu bilinmiyor", tone: "neutral" as const };

  return {
    id: stage.id,
    project: stage.projectTitle,
    stage: stage.title,
    amount: stage.total,
    status,
    href: `/client/projects/${stage.projectId}`,
    details: [{ label: "Aşama durumu", value: earningWorkLabel(stage.status) }],
  };
}

export default function ClientPaymentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [summary, setSummary] = useState<ClientPaymentsSummary | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Ödemelerini görüntülemek için giriş yapman gerekiyor.");
        const data = await getClientPaymentsSummary(supabase, user.id);
        if (active) setSummary(data);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Ödemeler yüklenemedi.");
      }
    }
    void load();
    return () => { active = false; };
  }, [supabase, reload]);

  return <main className={styles.page}>
    <FinanceIntro title="Ödemeler" notice="CollaCrew üzerinden ödeme henüz kullanıma açık değil." />
    {error ? <div className={styles.error} role="alert">
      <p>{error}</p>
      <Button variant="secondary" size="sm" onClick={() => { setError(""); setReload(value => value + 1); }}>
        Tekrar dene
      </Button>
    </div> : !summary ? <p role="status">Ödeme hareketleri yükleniyor…</p>
      : <FinanceMovements
        title="Ödeme hareketleri"
        amountLabel="Toplam tutar"
        rows={summary.movements.map(toMovement)}
        empty="Henüz ödeme hareketin yok."
      />}
  </main>;
}
