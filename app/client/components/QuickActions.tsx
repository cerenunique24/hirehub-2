import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

export default function QuickActions() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/client/projects/new"
        className="inline-flex h-[var(--button-height-md)] items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 text-sm font-medium leading-5 text-white transition-colors hover:bg-[var(--color-primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-50)] focus-visible:ring-offset-1"
      >
        <Plus size={16} strokeWidth={1.7} />
        Yeni Proje Oluştur
      </Link>

      <Link
        href="/client/ai"
        className="inline-flex h-[var(--button-height-md)] items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-4 text-sm font-medium leading-5 text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-primary-600)] hover:text-[var(--color-primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-50)] focus-visible:ring-offset-1"
      >
        <Sparkles size={16} strokeWidth={1.7} />
        CollaCrew
      </Link>
    </div>
  );
}

