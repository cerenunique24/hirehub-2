import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

export default function QuickActions() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/client/projects/new"
        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        <Plus size={16} />
        Yeni Proje Oluştur
      </Link>
      <Link
        href="/client/ai"
        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
      >
        <Sparkles size={16} />
        CollaCrew
      </Link>
    </div>
  );
}
