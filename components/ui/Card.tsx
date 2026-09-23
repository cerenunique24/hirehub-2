/**
 * CollaCrew Design System — Card.
 *
 * Ortak kart temeli: beyaz zemin, subtle border, --radius-card (10px), 20px
 * padding. Border-based — shadow yalnızca hover'da hafif elevation için
 * kullanılır. Freelancer/project/profile/membership/stat/proposal/message
 * kartlarının hepsi bu temelden türer; içerik hiyerarşisi serbesttir.
 */
export function Card({
  children,
  className = "",
  hoverable = false,
  density = "normal",
}: {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  /** "compact" = 16px padding (dense lists/metadata); "normal" = 20px (default). */
  density?: "normal" | "compact";
}) {
  return (
    <div
      className={[
        "rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]",
        density === "compact" ? "p-4" : "p-5",
        hoverable ? "transition hover:border-[var(--color-border-strong)] hover:shadow-sm" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
