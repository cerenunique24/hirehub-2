/** CollaCrew Design System — Skeleton loading placeholder. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={["animate-pulse rounded-md bg-[var(--color-surface-soft)]", className].join(" ")}
      aria-hidden="true"
    />
  );
}

export default Skeleton;
