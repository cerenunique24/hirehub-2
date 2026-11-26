"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, pageHeaderClass } from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import styles from "./Earnings.module.css";

export type FinanceMovement = {
  id: string;
  project: string;
  stage: string;
  amount: number | null;
  status: { label: string; tone: BadgeTone | "danger" };
  href: string;
  details: { label: string; value: string }[];
};

export function financeAmount(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "Tutar belirtilmemiş" : formatCurrency(value);
}

export function FinanceIntro({ title, notice, withdrawal }: {
  title: string;
  notice: string;
  withdrawal?: boolean;
}) {
  return <>
    <PageHeader title={title} className={pageHeaderClass} />
    <div className={styles.notice}>
      <div>
        {withdrawal && <h2 className="font-semibold">Çekilebilir bakiye</h2>}
        <p className="cc-body-sm text-[var(--color-text-secondary)]">{notice}</p>
      </div>
      {withdrawal && <Button disabled size="sm">Para çek</Button>}
    </div>
  </>;
}

export function FinanceMovements({ rows, title, amountLabel, empty }: {
  rows: FinanceMovement[];
  title: string;
  amountLabel: string;
  empty: string;
}) {
  const [selected, setSelected] = useState<FinanceMovement | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const dialogId = useId();

  return <section aria-labelledby={headingId}>
    <h2 id={headingId} className="cc-h2 mb-3">{title}</h2>
    {rows.length ? <ul className={styles.list}>
      {rows.slice(0, visibleCount).map(row => <li key={row.id}>
        <button type="button" className={styles.row} aria-haspopup="dialog" onClick={() => {
          setSelected(row);
          dialog.current?.showModal();
        }}>
          <span className={styles.project}>
            <strong>{row.project}</strong>
            <small>{row.stage}</small>
          </span>
          <Badge tone={row.status.tone === "danger" ? "error" : row.status.tone}>{row.status.label}</Badge>
          <span className={styles.amount}>{financeAmount(row.amount)}</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </li>)}
    </ul> : <p className={styles.empty}>{empty}</p>}
    {rows.length > visibleCount && <div className="mt-3">
      <Button variant="secondary" size="sm" onClick={() => setVisibleCount(count => count + 10)}>Daha fazla göster</Button>
    </div>}
    <dialog ref={dialog} className={styles.drawer} aria-labelledby={dialogId}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={dialogId} className="cc-h2">İşlem detayı</h2>
        <button type="button" className={styles.close} aria-label="İşlem detayını kapat" onClick={() => dialog.current?.close()}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {selected && <>
        <p className="font-semibold">{selected.project}</p>
        <p className="cc-body-sm text-[var(--color-text-secondary)]">{selected.stage}</p>
        <dl className={styles.details}>
          <div><dt>{amountLabel}</dt><dd>{financeAmount(selected.amount)}</dd></div>
          <div><dt>Durum</dt><dd>{selected.status.label}</dd></div>
          {selected.details.map(detail => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
        </dl>
        <Link className={styles.projectLink} href={selected.href} onClick={() => dialog.current?.close()}>Projeyi görüntüle</Link>
      </>}
    </dialog>
  </section>;
}
