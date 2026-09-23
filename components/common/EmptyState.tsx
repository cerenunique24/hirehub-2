import type { LucideIcon } from "lucide-react";

/** CollaCrew Design System — EmptyState. Shared "nothing here yet" state for lists and panels. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-6 py-12 text-center",
        className,
      ].join(" ")}
    >
      {Icon && (
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
          <Icon size={20} strokeWidth={1.8} />
        </span>
      )}

      <p className="cc-h3 text-[var(--color-text-primary)]">{title}</p>

      {description && (
        <p className="cc-body-sm mt-[var(--rhythm-title-gap)] max-w-sm text-[var(--color-text-secondary)]">{description}</p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default EmptyState;
