/**
 * CollaCrew Design System — PageHeader.
 * Shared title/description/primary-action block for panel pages.
 */

export function PageHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex flex-wrap items-start justify-between gap-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0">
        <h1 className="cc-page-title text-[var(--color-text-primary)]">
          {title}
        </h1>

        {description && (
          <p className="cc-body-sm mt-[var(--rhythm-title-gap)] text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
