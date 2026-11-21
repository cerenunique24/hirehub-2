import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

const statusColors = new Map([
  ["pending", "bg-amber-50 text-amber-700"],
  ["shortlisted", "bg-blue-50 text-blue-700"],
  ["accepted", "bg-green-50 text-green-700"],
  ["rejected", "bg-red-50 text-red-700"],
]);

export function ProposalCard({
  title, titleHref, subtitle, projectHref, status, statusLabel, metrics, actions, detailsId, expanded, onToggle, metadata, message, children,
}: {
  title: string;
  titleHref?: string;
  subtitle: string;
  projectHref?: string;
  status: string | null;
  statusLabel: string;
  metrics: { label: string; value: string }[];
  actions: ReactNode;
  detailsId: string;
  expanded: boolean;
  onToggle: () => void;
  metadata?: ReactNode;
  message?: { label: string; text: string };
  children?: ReactNode;
}) {
  const badgeStyle = statusColors.get(status?.toLowerCase() ?? "") ?? "bg-gray-100 text-gray-600";
  const titleStyle = "min-w-0 line-clamp-2 wrap-anywhere text-base font-semibold text-[var(--color-text-primary)]";

  return (
    <article className="@container rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] shadow-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-5 @min-[46rem]:grid @min-[46rem]:min-h-[114px] @min-[46rem]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_24rem]">
        <div className="min-w-0 flex-[1_1_12rem]">
          <div className="grid grid-cols-[minmax(0,auto)_auto] items-center justify-start gap-2">
            {titleHref ? (
              <Link href={titleHref} title={title} className={`${titleStyle} hover:underline`}>
                {title}
              </Link>
            ) : (
              <h2 title={title} className={titleStyle}>{title}</h2>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyle}`}>{statusLabel}</span>
          </div>
          <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]" title={subtitle}>
            {subtitle}
          </p>
        </div>

        <dl className="grid min-w-0 flex-[1_1_12rem] grid-cols-2 gap-3">
          {metrics.map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-[var(--color-text-secondary)]">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums wrap-anywhere text-[var(--color-text-primary)]">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid min-w-0 flex-[1_1_100%] grid-cols-2 items-center gap-2 @min-[46rem]:flex @min-[46rem]:justify-end">
          <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle}
            className={buttonClasses({ variant: "secondary", size: "sm", className: "@min-[46rem]:w-20" })}>
            Detay
            <ChevronDown size={14} aria-hidden="true" className={`size-3.5! ${expanded ? "rotate-180" : ""}`} />
          </button>
          {actions}
        </div>
      </div>

      <div id={detailsId} hidden={!expanded} className="space-y-2.5 border-t border-[var(--color-border-subtle)] px-4 py-3 text-sm sm:px-5">
        {metadata && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">{metadata}</div>
        )}
        {message && (
          <div>
            <h3 className="font-medium text-[var(--color-text-primary)]">{message.label}</h3>
            <p className="mt-0.5 whitespace-pre-wrap wrap-anywhere leading-5 text-[var(--color-text-secondary)]">{message.text}</p>
          </div>
        )}
        {children}
        {projectHref && (
          <div className="flex justify-end border-t border-[var(--color-border-subtle)] pt-2">
            <Link href={projectHref}
              className="inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-[var(--color-primary-600)] underline-offset-2 transition-colors hover:text-[var(--color-primary-700)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-600)]">
              <ExternalLink size={14} className="size-3.5!" aria-hidden="true" />
              Projeyi Görüntüle
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
