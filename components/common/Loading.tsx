import { Loader2 } from "lucide-react";

/** CollaCrew Design System — inline loading state for a section/panel. */
export function Loading({ label = "Yükleniyor…", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={["flex flex-col items-center justify-center gap-3 py-16 text-center", className].join(" ")}>
      <Loader2 size={22} className="animate-spin text-[var(--color-primary-600)]" strokeWidth={1.7} />
      <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}

export default Loading;
