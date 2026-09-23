import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** "error" gerçek bir Supabase/sunucu hatasını yansıtır — kırmızı sadece burada kullanılır. */
  tone?: "empty" | "error";
};

export default function EmptyState({ icon: Icon, title, description, tone = "empty" }: EmptyStateProps) {
  const isError = tone === "error";
  const DisplayIcon = isError ? AlertTriangle : Icon;

  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-[#e5e7eb] bg-white px-6 py-16 text-center">
      <div
        className={[
          "flex h-12 w-12 items-center justify-center",
          isError ? "bg-[#FEF2F2] text-[#DC2626]" : "bg-[#F7F7F8] text-[#9ca3af]",
        ].join(" ")}
      >
        <DisplayIcon size={22} strokeWidth={1.6} />
      </div>
      <p className="mt-4 text-sm font-medium text-[#111111]">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-[#6b7280]">{description}</p>
    </div>
  );
}
