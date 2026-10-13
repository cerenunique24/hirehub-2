"use client";

import { useState } from "react";
import { CheckCircle2, Circle, FileText, Loader2, MessageSquare } from "lucide-react";
import { useInView } from "./Reveal";
import styles from "./LandingJourney.module.css";

/**
 * Client project workspace — the panel rises into place on scroll, then the
 * user can switch between views; each view cross-fades like the real panel.
 */

type View = "milestones" | "budget" | "activity";

const VIEWS: { value: View; label: string }[] = [
  { value: "milestones", label: "Aşamalar" },
  { value: "budget", label: "Bütçe" },
  { value: "activity", label: "Aktivite" },
];

/**
 * SYNTHETIC DEMO DATA ONLY — never read from `profiles` or any real record.
 * Candidates are shown by role/title, not by a person's name, so nothing on
 * the landing page can identify a real user.
 */
const MILESTONES = [
  { title: "Tasarım ve prototip", owner: "UI/UX Designer", amount: "₺18.000", status: "done" },
  { title: "Frontend geliştirme", owner: "Frontend Developer", amount: "₺28.000", status: "progress" },
  { title: "Ödeme entegrasyonu", owner: "Backend Developer", amount: "₺24.000", status: "todo" },
  { title: "Test ve yayın", owner: "Ekip", amount: "₺15.000", status: "todo" },
] as const;

export default function WorkspacePanel() {
  const { ref, inView } = useInView<HTMLDivElement>(0.25);
  const [view, setView] = useState<View>("milestones");

  return (
    <div
      ref={ref}
      className={`cc-reveal ${styles.proof} ${styles.workspace}`}
      data-variant="panel"
      data-visible={inView ? "true" : "false"}
    >
      <div>
        {/* Header */}
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-5 py-4 ${styles.workspaceHeader}`}>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">E-ticaret mobil uygulaması</p>
            <p className="text-xs text-[var(--color-text-muted)]">3 kişilik ekip · 6 hafta</p>
          </div>
          <span className={styles.badge} data-tone="primary">
            Devam ediyor
          </span>
        </div>

        {/* Tabs — same proportions as the panel Tabs component */}
        <div role="tablist" className="flex items-center gap-1 border-b border-[var(--color-border-subtle)] px-2">
          {VIEWS.map((item) => {
            const active = item.value === view;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(item.value)}
                className={`cc-tab-text relative flex h-[var(--control-height-md)] items-center px-[var(--button-padding-sm)] transition-colors ${
                  active
                    ? "text-[var(--color-primary-700)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {item.label}
                {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--color-primary-600)]" />}
              </button>
            );
          })}
        </div>

        {/* Views */}
        <div className="grid p-4 [&>*]:col-start-1 [&>*]:row-start-1">
          <ViewPane active={view === "milestones"}>
            <ul className={styles.workspaceRows}>
              {MILESTONES.map((milestone, index) => (
                <li
                  key={milestone.title}
                  data-status={milestone.status}
                  className={`cc-reveal ${styles.workspaceRow}`}
                  data-variant="up"
                  data-visible={inView ? "true" : "false"}
                  style={{ "--reveal-delay": `${300 + index * 90}ms` } as React.CSSProperties}
                >
                  {milestone.status === "done" ? (
                    <CheckCircle2 size={16} className="shrink-0 text-[var(--color-success-600)]" />
                  ) : milestone.status === "progress" ? (
                    <Loader2 size={16} className="shrink-0 text-[var(--color-primary-600)]" />
                  ) : (
                    <Circle size={16} className="shrink-0 text-[var(--color-border-strong)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${styles.itemTitle}`}>
                      {milestone.title}
                    </p>
                    <p className={`truncate ${styles.metadata}`}>{milestone.owner}</p>
                  </div>
                  <div className={styles.workspaceStatus}>
                    <span className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">{milestone.amount}</span>
                    <span className={styles.badge} data-tone={milestone.status === "done" ? "success" : milestone.status === "progress" ? "primary" : "neutral"}>
                      {milestone.status === "done" ? "Tamamlandı" : milestone.status === "progress" ? "Devam ediyor" : "Sırada"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </ViewPane>

          <ViewPane active={view === "budget"}>
            <div className={styles.budgetGrid}>
              {[
                ["Toplam bütçe", "₺85.000"],
                ["Onaylanan", "₺18.000"],
                ["Bekleyen", "₺28.000"],
              ].map(([label, value]) => (
                <div key={label} className={styles.budgetStat}>
                  <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>İlerleme</span>
                <span>%21 onaylandı</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-surface-2)]">
                <div className="h-full w-[21%] rounded-[var(--radius-pill)] bg-[var(--color-primary-600)]" />
              </div>
            </div>
            <p className="mt-4 text-xs leading-[18px] text-[var(--color-text-muted)]">
              Tutarlar proje ve aşama verilerinden hesaplanan bütçe / hakediş özetidir.
            </p>
          </ViewPane>

          <ViewPane active={view === "activity"}>
            <ul className="space-y-3">
              {[
                { icon: CheckCircle2, text: "UI/UX Designer “Tasarım ve prototip” aşamasını tamamladı", time: "2 sa önce" },
                { icon: FileText, text: "Frontend Developer 3 dosya yükledi", time: "5 sa önce" },
                { icon: MessageSquare, text: "Backend Developer ödeme API’si için soru sordu", time: "Dün" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-50)] text-[var(--color-text-secondary)]">
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] leading-5 text-[var(--color-text-primary)]">{item.text}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{item.time}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ViewPane>
        </div>
      </div>
    </div>
  );
}

function ViewPane({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-hidden={!active}
      className={`transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
        active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
