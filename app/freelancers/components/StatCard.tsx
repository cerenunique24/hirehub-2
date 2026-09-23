import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export default function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5 transition hover:border-[var(--color-border-strong)] hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">{title}</p>

          <h3 className="mt-3 text-3xl font-semibold text-[var(--color-text-primary)]">{value}</h3>

          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{description}</p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
          <Icon size={20} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}
