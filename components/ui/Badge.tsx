/** CollaCrew Design System — Badge / Pill. */
export type BadgeTone = "neutral" | "primary" | "ai" | "success" | "warning" | "error" | "info";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
  primary: "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]",
  ai: "bg-[var(--color-ai-50)] text-[var(--color-ai-600)]",
  success: "bg-[var(--color-success-50)] text-[var(--color-success-600)]",
  warning: "bg-[var(--color-warning-50)] text-[var(--color-warning-600)]",
  error: "bg-[var(--color-error-50)] text-[var(--color-error-600)]",
  info: "bg-[var(--color-info-50)] text-[var(--color-info-600)]",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--radius-pill)] px-2 py-0.5 font-sans text-xs font-medium leading-[18px]",
        TONE_CLASSES[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
