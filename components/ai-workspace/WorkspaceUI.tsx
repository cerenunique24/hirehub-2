import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Shared, editorial building blocks for the CollaCrew AI workspaces.
 * Sections are separated by whitespace and hairlines, not wrapped in cards.
 */

export type PlanTierLabel = "free" | "plus" | "pro";

const PLAN_LABEL: Record<PlanTierLabel, string> = { free: "Free", plus: "Plus", pro: "Pro" };

export function WorkspaceHeader({
  description,
  plan,
  action,
}: {
  description: string;
  plan: PlanTierLabel;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-primary-600)]">
          <Sparkles size={14} />
          CollaCrew AI
          <span className="rounded-[var(--radius-pill)] border border-[var(--color-border-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
            {PLAN_LABEL[plan]}
          </span>
        </p>
        <h1 className="cc-page-title mt-2 text-[var(--color-text-primary)]">CollaCrew AI</h1>
        <p className="cc-body mt-[var(--rhythm-title-gap)] max-w-2xl text-[var(--color-text-secondary)]">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function SummaryStats({ items }: { items: { value: number; label: string }[] }) {
  return (
    <dl className="grid grid-cols-3 divide-x divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)] py-5">
      {items.map((item) => (
        <div key={item.label} className="px-4 first:pl-0 sm:px-8">
          <dd className="text-[28px] font-semibold leading-9 tracking-[-0.02em] tabular-nums text-[var(--color-text-primary)] sm:text-[32px]">
            {item.value}
          </dd>
          <dt className="mt-1 text-[13px] text-[var(--color-text-secondary)]">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function SectionHeading({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="mb-[var(--rhythm-section-title-gap)] flex items-baseline justify-between gap-3">
      <h2 className="cc-h2 text-[var(--color-text-primary)]">{title}</h2>
      {hint && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
    </div>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const strong = score >= 75;
  return (
    <span
      className={`shrink-0 rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium tabular-nums ${
        strong
          ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
      }`}
    >
      %{score} eşleşme
    </span>
  );
}

export function PlanBadge({ plan }: { plan: PlanTierLabel }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--color-text-primary)] px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-white">
      <Lock size={10} />
      {PLAN_LABEL[plan]}
    </span>
  );
}

export function SkillChips({ skills, tone = "neutral" }: { skills: string[]; tone?: "neutral" | "primary" | "warning" }) {
  const toneClass =
    tone === "primary"
      ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
      : tone === "warning"
        ? "bg-[var(--color-warning-50)] text-[var(--color-warning-600)]"
        : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]";

  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((skill) => (
        <span key={skill} className={`rounded-[var(--radius-xs)] px-1.5 py-0.5 text-xs ${toneClass}`}>
          {skill}
        </span>
      ))}
    </div>
  );
}

/** Locked section: the data was never sent by the server — this only explains what the plan unlocks. */
export function LockedNotice({
  title,
  description,
  plan,
}: {
  title: string;
  description: string;
  plan: PlanTierLabel;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-strong)] px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
        <PlanBadge plan={plan} />
      </div>
      <p className="mt-1 text-[13px] leading-5 text-[var(--color-text-secondary)]">{description}</p>
      <Link href="/premium" className={buttonClasses({ variant: "link", className: "mt-2 text-[13px]" })}>
        Planları incele
      </Link>
    </div>
  );
}

export function LockedFeatureList({ items }: { items: { key: string; label: string; requiredPlan: PlanTierLabel }[] }) {
  if (items.length === 0) return null;

  return (
    <section className="border-t border-[var(--color-border-subtle)] pt-8">
      <SectionHeading title="Planınla açılacak AI özellikleri" />
      <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-3">
            <span className="text-sm text-[var(--color-text-secondary)]">{item.label}</span>
            <PlanBadge plan={item.requiredPlan} />
          </li>
        ))}
      </ul>
      <Link href="/premium" className={buttonClasses({ variant: "secondary", size: "sm", className: "mt-5" })}>
        Planları incele
      </Link>
    </section>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-16 w-2/3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)]" />
      <div className="h-20 rounded-[var(--radius-md)] bg-[var(--color-surface-2)]" />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="h-64 rounded-[var(--radius-md)] bg-[var(--color-surface-2)]" />
        <div className="h-64 rounded-[var(--radius-md)] bg-[var(--color-surface-2)]" />
      </div>
    </div>
  );
}
