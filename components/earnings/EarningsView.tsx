"use client";

import { useState } from "react";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { panelRootClass } from "@/components/dashboard/PanelPrimitives";
import { PLATFORM_FEE_MODEL } from "@/lib/pricing";
import type { FreelancerEarningsSummary, FreelancerEarningMovement } from "@/lib/financials";
import { earningsPaymentPresentation, earningWorkLabel } from "@/lib/payments/earningsPresentation";
import {
  FinanceIntro, FinanceMetrics, FinanceProjectTable, FinanceStages, FinanceTabs, ProjectFinanceFilters, ProjectStatus, financeAmount,
} from "./FinancePanel";
import styles from "./Earnings.module.css";

type Filter = "all" | "approved" | "pending" | "problem";
const columns = ["Rol", "Planlanan kazanç", "Onaylanan", "Onay bekleyen", "Durum"];

function dateLabel(value: string | null) {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })
    : "Tarih belirtilmemiş";
}

function projectHref(projectId: string, status: string | null) {
  if (status === "completed") return `/freelancers/earnings/${projectId}`;
  if (status === "in_progress") return `/freelancers/projects/${projectId}`;
  return `/freelancers/discover/${projectId}`;
}

function MovementTable({ rows }: { rows: FreelancerEarningMovement[] }) {
  return <table className={styles.table}>
    <caption className="sr-only">Proje aşamalarına ait kazanç ve ödeme durumu kayıtları</caption>
    <thead><tr><th scope="col">İşlem / Proje</th><th scope="col">Tarih</th><th scope="col">Ödeme durumu</th><th scope="col">Brüt</th><th scope="col">Net hakediş</th></tr></thead>
    <tbody>{rows.map(row => {
      const payment = row.paymentStatus ? earningsPaymentPresentation(row.paymentStatus) : { label: "Veri eksik", tone: "neutral" };
      return <tr key={row.id}>
        <td className={styles.movementTitle}>
          <Link href={projectHref(row.projectId, row.projectStatus)}>{row.title}</Link>
          <p>{row.projectTitle}</p><span>{earningWorkLabel(row.status)}</span>
          <details className={styles.details}><summary>Tutar detayları</summary><dl>
            <div><dt>Brüt hakediş</dt><dd>{financeAmount(row.gross)}</dd></div>
            <div><dt>Freelancer kesintisi</dt><dd>{financeAmount(row.freelancerDeduction)}</dd></div>
            <div><dt>Net hakediş</dt><dd>{financeAmount(row.net)}</dd></div>
            {row.clientPlatformFee !== null && <div><dt>Client hizmet bedeli</dt><dd>{financeAmount(row.clientPlatformFee)} · client tarafından ödenir</dd></div>}
            {row.paymentReference && <div><dt>Ödeme referansı</dt><dd>{row.paymentReference}</dd></div>}
            {row.provider && <div><dt>Sağlayıcı kaydı</dt><dd>{row.provider}</dd></div>}
          </dl></details>
        </td>
        <td data-label="Tarih"><time dateTime={row.approvedAt ?? row.createdAt}>{dateLabel(row.approvedAt ?? row.createdAt)}</time>{row.approvedAt && <small>Onay tarihi</small>}</td>
        <td data-label="Ödeme durumu"><span className={styles.status} data-tone={payment.tone}>{payment.label}</span></td>
        <td data-label="Brüt" className={styles.money}>{financeAmount(row.gross)}</td>
        <td data-label="Net hakediş" className={styles.money}>{financeAmount(row.net)}</td>
      </tr>;
    })}</tbody>
  </table>;
}

export function EarningsView({ summary, loading, error, onRetry }: {
  summary: FreelancerEarningsSummary | null; loading: boolean; error: string; onRetry: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleCount, setVisibleCount] = useState(10);
  const [movementsOpen, setMovementsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const movements = summary?.movements ?? [];
  const filtered = movements.filter(row => filter === "all"
    || filter === "approved" && row.status === "approved"
    || filter === "pending" && ["pending", "payment_initiated"].includes(row.paymentStatus ?? "")
    || filter === "problem" && earningsPaymentPresentation(row.paymentStatus).tone === "danger");
  const projects = summary?.projects ?? [];
  const visibleProjects = projects.filter(project => (!status || status === project.status)
    && project.title.toLocaleLowerCase("tr-TR").includes(query.trim().toLocaleLowerCase("tr-TR")));
  const statuses = [...new Set(projects.flatMap(project => project.status ? [project.status] : []))];
  const empty = Boolean(summary && !summary.incompleteAmounts && projects.length === 0 && movements.length === 0);
  const hasProblem = movements.some(row => earningsPaymentPresentation(row.paymentStatus).tone === "danger");

  return <main className={[panelRootClass, styles.page].join(" ")}>
    <FinanceIntro title="Kazançlarım" subtitle="Hakedişlerini, aşama onaylarını ve ödeme kayıtlarını takip et." tone="warning"
      notice={<p>Ödeme altyapısı henüz aktif değil. Buradaki tutarlar proje hakedişlerini gösterir. Para çekme ve banka aktarımı kullanıma açık değildir.</p>} />
    {loading ? <div className={styles.loading} role="status" aria-busy="true"><span className="sr-only">Kazançlar yükleniyor…</span>{[0, 1, 2, 3].map(i => <div key={i} aria-hidden="true" />)}</div>
      : error ? <div className={styles.error} role="alert"><p>{error}</p><Button variant="secondary" onClick={onRetry}>Tekrar dene</Button></div>
      : summary && <>
        {!empty && <FinanceMetrics items={[
          { label: "Planlanan kazanç", value: summary.incompleteAmounts ? null : summary.totalEngagement, tone: "neutral" },
          { label: "Onay bekleyen", value: summary.incompleteAmounts ? null : summary.pendingEarnings, tone: "warning" },
          { label: "Onaylanan", value: summary.incompleteAmounts ? null : summary.realizedEarnings, tone: "success" },
          { label: "Bu ay onaylanan", value: summary.approvedThisMonth, tone: "info" },
        ]} />}
        {summary.incompleteAmounts && <p className={styles.dataNote}>Bazı proje, anlaşma veya aşama kayıtları eksik. Bu kayıtların tutarları doğrulanamadı.</p>}
        <div className={styles.layout}>
          <div className={styles.history}>
            <FinanceTabs movements={movementsOpen} onChange={setMovementsOpen} label="Hakediş Hareketleri" />
            <section className={styles.projectPanel} aria-labelledby="earnings-projects" hidden={movementsOpen}>
              <div className={styles.panelHeading}>
                <div><h2 id="earnings-projects">Projelerim</h2><p>Kişisel anlaşmalarını ve aşama tutarlarını incele.</p></div>
                {projects.length > 0 && <ProjectFinanceFilters query={query} status={status} statuses={statuses} onQuery={setQuery} onStatus={setStatus} />}
              </div>
              {visibleProjects.length ? <FinanceProjectTable columns={columns} rows={visibleProjects.map(project => ({
                id: project.projectId, title: project.title, href: projectHref(project.projectId, project.status),
                cells: [
                  <span key="role" className={styles.status}>{project.role || "Veri eksik"}</span>,
                  financeAmount(project.budgetMissing ? null : project.engagementValue),
                  <span key="approved" className={styles.approved}>{financeAmount(project.budgetMissing || project.stagesMissing ? null : project.approvedValue)}</span>,
                  <span key="pending" className={styles.pending}>{financeAmount(project.budgetMissing || project.stagesMissing ? null : project.pendingValue)}</span>,
                  <ProjectStatus key="status" status={project.status} />,
                ],
                stages: <FinanceStages stages={movements.filter(stage => stage.projectId === project.projectId).map(stage => ({
                  id: stage.id, title: stage.title, state: earningWorkLabel(stage.status), value: stage.net,
                }))} />,
              }))} /> : <div className={styles.panelEmpty}>
                {empty ? <><strong>Henüz kazancın yok</strong><p>Kabul edilen anlaşmaların ve aşama hakedişlerin burada görünür.</p><Link href="/freelancers/discover">Projeleri keşfet</Link></>
                  : projects.length ? "Bu filtreyle eşleşen proje yok." : "Proje kayıtları doğrulanamadı."}
              </div>}
            </section>
            <section className={styles.projectPanel} hidden={!movementsOpen} aria-labelledby="earnings-history-title">
              <div className={styles.panelHeading}><div><h2 id="earnings-history-title">Hakediş Hareketleri</h2><p>Aşama bazında hakediş ve kayıtlı ödeme durumu.</p></div></div>
              {PLATFORM_FEE_MODEL.feePayer === "client" && <p className={styles.commissionNote}>Platform hizmet bedeli client&apos;a eklenir. Freelancer tutarı ve varsa kesintisi hareket detayında ayrı gösterilir.</p>}
              {movements.length > 0 ? <>
                <div className={styles.filters} role="group" aria-label="Kazanç hareketlerini filtrele">
                  {([{ id: "all", label: "Tümü" }, { id: "approved", label: "Onaylanan" }, { id: "pending", label: "Ödeme bekleyen" }, ...(hasProblem ? [{ id: "problem", label: "Sorunlu" }] : [])] as { id: Filter; label: string }[]).map(item =>
                    <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setVisibleCount(10); }}>{item.label}</button>)}
                </div>
                {filtered.length ? <MovementTable rows={filtered.slice(0, visibleCount)} /> : <p className={styles.panelEmpty}>Bu filtrede kazanç hareketi bulunmuyor.</p>}
                {filtered.length > visibleCount && <button className={styles.more} type="button" onClick={() => setVisibleCount(count => count + 10)}>Daha fazla hareket göster</button>}
              </> : <p className={styles.panelEmpty}>Henüz aşama bazında hakediş hareketi yok.</p>}
            </section>
          </div>
          <aside className={styles.withdrawal} aria-labelledby="withdrawal-title">
            <h2 id="withdrawal-title">Para çekme</h2>
            <div className={styles.withdrawalStatus}><Landmark size={20} aria-hidden="true" /><div><strong>Henüz kullanıma açık değil</strong><p>Ödeme hesabı altyapısı henüz bağlı değil. Para çekme talepleri oluşturulamıyor.</p></div></div>
            <dl className={styles.balance}>
              <div><dt>Kullanılabilir bakiye</dt><dd>Henüz hesaplanamıyor</dd></div>
              <div><dt>Toplam onaylanan kazanç</dt><dd>{financeAmount(summary.incompleteAmounts ? null : summary.realizedEarnings)}</dd></div>
            </dl>
            <Button disabled size="sm">Para Çek</Button>
          </aside>
        </div>
      </>}
  </main>;
}
