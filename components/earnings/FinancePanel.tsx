import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, CircleCheck, Clock3, Folder, Info, Layers } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import styles from "./Earnings.module.css";

export type FinanceTone = "neutral" | "success" | "warning" | "info" | "danger";

export function financeAmount(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "Veri eksik" : formatCurrency(value);
}

export function FinanceIntro({ title, subtitle, notice, tone = "info" }: {
  title: string; subtitle: string; notice: ReactNode; tone?: FinanceTone;
}) {
  return <>
    <header className={styles.header}><div><h1>{title}</h1><p>{subtitle}</p></div></header>
    <div className={styles.notice} data-tone={tone}><Info size={18} aria-hidden="true" /><div>{notice}</div></div>
  </>;
}

export function FinanceMetrics({ items }: { items: { label: string; value: number | null | undefined; tone: FinanceTone }[] }) {
  const icons = [Layers, Folder, CircleCheck, Clock3];
  return <dl className={styles.summary}>{items.map(({ label, value, tone }, index) => {
    const Icon = icons[index % icons.length];
    return <div key={label} data-tone={tone}>
      <Icon size={21} aria-hidden="true" />
      <div><dt>{label}</dt><dd>{financeAmount(value)}</dd></div>
    </div>;
  })}</dl>;
}

export function FinanceTabs({ movements, onChange, label }: {
  movements: boolean; onChange: (value: boolean) => void; label: string;
}) {
  return <div className={styles.tabs} role="group" aria-label="Finans görünümü">
    <button type="button" aria-pressed={!movements} onClick={() => onChange(false)}>Projelerim</button>
    <button type="button" aria-pressed={movements} onClick={() => onChange(true)}>{label}</button>
  </div>;
}

export function ProjectStatus({ status }: { status: string | null }) {
  const states: Record<string, { label: string; tone: FinanceTone }> = {
    open: { label: "Yayında", tone: "info" },
    ready_to_start: { label: "Ekip hazır", tone: "neutral" },
    in_progress: { label: "Devam ediyor", tone: "info" },
    completed: { label: "Tamamlandı", tone: "success" },
    paused: { label: "Duraklatıldı", tone: "warning" },
    cancelled: { label: "İptal edildi", tone: "danger" },
  };
  const state = status && Object.hasOwn(states, status) ? states[status] : { label: status ?? "Veri eksik", tone: "neutral" };
  return <span className={styles.status} data-tone={state.tone}>{state.label}</span>;
}

export function ProjectFinanceFilters({ query, status, statuses, onQuery, onStatus }: {
  query: string; status: string; statuses: string[]; onQuery: (value: string) => void; onStatus: (value: string) => void;
}) {
  const labels: Record<string, string> = {
    open: "Yayında", ready_to_start: "Ekip hazır", in_progress: "Devam ediyor",
    completed: "Tamamlandı", paused: "Duraklatıldı", cancelled: "İptal edildi",
  };
  return <div className={styles.projectFilters}>
    <input type="search" aria-label="Projelerde ara" placeholder="Projelerde ara…" value={query} onChange={event => onQuery(event.target.value)} />
    <select aria-label="Proje durumu" value={status} onChange={event => onStatus(event.target.value)}>
      <option value="">Tüm durumlar</option>
      {statuses.map(value => <option key={value} value={value}>{Object.hasOwn(labels, value) ? labels[value] : value}</option>)}
    </select>
  </div>;
}

export function FinanceProjectTable({ columns, rows }: {
  columns: string[];
  rows: { id: string; title: string; href: string; cells: ReactNode[]; stages: ReactNode }[];
}) {
  return <table className={styles.projectTable}>
    <caption className="sr-only">Proje finans özeti</caption>
    <thead><tr><th scope="col">Proje</th>{columns.map(label => <th key={label} scope="col">{label}</th>)}<th scope="col">Aşamalar</th></tr></thead>
    <tbody>{rows.map(row => <ProjectFinanceRows key={row.id} row={row} columns={columns} />)}</tbody>
  </table>;
}

function ProjectFinanceRows({ row, columns }: {
  row: { id: string; title: string; href: string; cells: ReactNode[]; stages: ReactNode }; columns: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <><tr>
    <th scope="row"><Link href={row.href} className={styles.projectTitle}>{row.title}</Link></th>
    {row.cells.map((cell, index) => <td key={columns[index]} data-label={columns[index]}>{cell}</td>)}
    <td className={styles.projectDetails}><button type="button" aria-label={`${row.title} aşamaları`} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
      Detay <ChevronRight size={14} aria-hidden="true" />
    </button></td>
  </tr>
  <tr className={styles.stageRow} hidden={!expanded} id={id}><td colSpan={columns.length + 2} className={styles.stageDetails}>{row.stages}</td></tr></>;
}

export function FinanceStages({ stages }: { stages: { id: string; title: string; state: string; value: number | null }[] }) {
  return stages.length > 0 ? <ul className={styles.stageList}>{stages.map(stage => <li key={stage.id}>
    <div><strong>{stage.title}</strong><small>{stage.state}</small></div>
    <span>{financeAmount(stage.value)}</span>
  </li>)}</ul> : <p className={styles.quiet}>Bu projede görüntülenebilir aşama kaydı yok.</p>;
}
