/** CollaCrew Design System — Divider. */
export default function Divider({ label = "veya" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
    </div>
  );
}