"use client";

/** CollaCrew Design System — Tabs. Controlled tab bar shared by both panels. */
export type TabItem = {
  value: string;
  label: string;
  count?: number;
};

export function Tabs({
  items,
  value,
  onChange,
  className = "",
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={["flex items-center gap-1 border-b border-[var(--color-border-subtle)]", className].join(" ")}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={[
              "cc-tab-text relative flex h-[var(--control-height-md)] items-center gap-1.5 rounded-t-[var(--radius-tab)] px-[var(--button-padding-sm)] font-sans transition-colors focus-visible:outline-none",
              active
                ? "text-[var(--color-primary-700)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            ].join(" ")}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={[
                  "flex h-5 min-w-5 items-center justify-center rounded-[var(--radius-pill)] px-1.5 text-xs font-medium leading-none",
                  active
                    ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
                ].join(" ")}
              >
                {item.count > 99 ? "99+" : item.count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--color-primary-600)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
