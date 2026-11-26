"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { panelRootClass } from "@/components/dashboard/PanelPrimitives";
import { Button, buttonClasses } from "@/components/ui/Button";
import {
  FinanceIntro, FinanceMetrics, FinanceProjectTable, FinanceStages, FinanceTabs,
  ProjectFinanceFilters, ProjectStatus, financeAmount,
} from "@/components/earnings/FinancePanel";
import styles from "@/components/earnings/Earnings.module.css";
import { createClient } from "@/lib/supabase/client";
import { getClientPaymentsSummary, type ClientPaymentsSummary } from "@/lib/financials";
import { calculateClientPricing, formatRatePercent } from "@/lib/pricing";
import { earningWorkLabel, earningsPaymentPresentation } from "@/lib/payments/earningsPresentation";

const columns = ["Bütçe", "Onaylanan aşamalar", "Bekleyen tutar", "Platform hizmet bedeli", "Toplam maliyet", "Durum"];

export default function ClientPaymentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [summary, setSummary] = useState<ClientPaymentsSummary | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [movements, setMovements] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Bütçeleri görüntülemek için giriş yapmanız gerekiyor.");
        const data = await getClientPaymentsSummary(supabase, user.id);
        if (active) setSummary(data);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Bütçeler yüklenemedi.");
      }
    }
    void load();
    return () => { active = false; };
  }, [supabase, reload]);

  const projects = summary?.projects ?? [];
  const statuses = [...new Set(projects.flatMap(project => project.status ? [project.status] : []))];
  const visible = projects.filter(project => (!status || project.status === status) &&
    project.title.toLocaleLowerCase("tr-TR").includes(query.trim().toLocaleLowerCase("tr-TR")));
  const activeProjects = projects.filter(project => project.status === "in_progress");
  const completedProjects = projects.filter(project => project.status === "completed");

  return <main className={[panelRootClass, styles.page].join(" ")}>
    <FinanceIntro title="Bütçe ve Ödemeler" subtitle="Projelerinizin bütçesini, hakedişlerini ve ödeme kayıtlarını takip edin."
      notice={<><strong>Ödeme altyapımız hazırlanıyor.</strong><p>Buradaki tutarlar proje bütçelerini ve aşama kayıtlarını gösterir. CollaCrew üzerinden ödeme henüz yapılamaz.</p></>} />
    {error ? <div className={styles.error} role="alert"><p>{error}</p><Button variant="secondary" onClick={() => { setError(""); setReload(value => value + 1); }}>Tekrar dene</Button></div>
      : !summary ? <p className={styles.quiet} role="status" aria-busy="true">Bütçeler yükleniyor…</p>
      : <>
        <FinanceMetrics items={[
          { label: "Toplam proje bütçesi", value: projects.some(project => project.budgetMissing) ? null : summary.totalBudget, tone: "neutral" },
          { label: "Aktif proje bütçesi", value: activeProjects.some(project => project.budgetMissing) ? null : summary.activeBudget, tone: "success" },
          { label: "Tamamlanan işler", value: completedProjects.some(project => project.budgetMissing) ? null : summary.completedBudget, tone: "info" },
          { label: "Bekleyen hakediş", value: activeProjects.some(project => project.budgetMissing || project.stagesMissing) ? null : summary.pendingObligation, tone: "warning" },
        ]} />
        <FinanceTabs movements={movements} onChange={setMovements} label="Aşama Tutarları" />
        {movements ? <section className={styles.projectPanel} aria-labelledby="payment-movements">
          <div className={styles.panelHeading}><div><h2 id="payment-movements">Aşama Tutarları</h2><p>Proje ve aşama bazında bütçe ve hizmet bedeli. Doğrulanmış tahsilat kaydı yok.</p></div></div>
          {summary.movements.length ? <ul className={styles.stageList}>{summary.movements.map(stage => {
            const payment = earningsPaymentPresentation(stage.paymentStatus);
            return <li key={stage.id}>
              <div><strong>{stage.title}</strong><small>{stage.projectTitle} · {earningWorkLabel(stage.status)}</small></div>
              <div><span className={styles.status} data-tone={payment.tone}>{payment.label}</span>
                <small>Hakediş {financeAmount(stage.budget)} · Hizmet bedeli {financeAmount(stage.platformFee)}</small>
                <small>Planlanan toplam</small><strong>{financeAmount(stage.total)}</strong></div>
            </li>;
          })}</ul> : <p className={styles.panelEmpty}>Görüntülenebilir aşama kaydı yok.</p>}
        </section> : <section className={styles.projectPanel} aria-labelledby="payment-projects">
          <div className={styles.panelHeading}>
            <div><h2 id="payment-projects">Projelerim</h2><p>Bütçeleri, onaylanan işleri ve bekleyen tutarları inceleyin.</p></div>
            {projects.length > 0 && <ProjectFinanceFilters query={query} status={status} statuses={statuses} onQuery={setQuery} onStatus={setStatus} />}
          </div>
          {visible.length ? <FinanceProjectTable columns={columns} rows={visible.map(project => {
            const rate = project.commissionRate;
            const pricing = !project.budgetMissing && rate != null && Number.isFinite(rate) && rate >= 0 && rate < 1
              ? calculateClientPricing(project.engagementValue, rate) : null;
            return {
              id: project.projectId, title: project.title, href: `/client/projects/${project.projectId}`,
              cells: [
                financeAmount(project.budgetMissing ? null : project.engagementValue),
                <span key="approved" className={styles.approved}>{financeAmount(project.stagesMissing ? null : project.approvedValue)}</span>,
                <span key="pending" className={styles.pending}>{financeAmount(project.status === "in_progress" && (project.budgetMissing || project.stagesMissing) ? null : project.pendingValue)}</span>,
                <div key="fee">{financeAmount(pricing?.platformFee)}{pricing && <small>{formatRatePercent(pricing.rate)}</small>}</div>,
                <strong key="total">{financeAmount(pricing?.clientTotal)}</strong>,
                <ProjectStatus key="status" status={project.status} />,
              ],
              stages: <FinanceStages stages={summary.movements.filter(stage => stage.projectId === project.projectId).map(stage => ({
                id: stage.id, title: stage.title, state: earningWorkLabel(stage.status), value: stage.budget,
              }))} />,
            };
          })} /> : <div className={styles.panelEmpty}>
            {projects.length > 0 ? "Bu filtreyle eşleşen proje yok." : <><p>Henüz bir projen yok.</p><Link href="/client/create-project" className={buttonClasses({ variant: "primary", size: "sm" })}>Yeni Proje Oluştur</Link></>}
          </div>}
        </section>}
      </>}
  </main>;
}
