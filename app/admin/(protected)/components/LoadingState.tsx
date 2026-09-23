import { Loader2 } from "lucide-react";

export default function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 border border-[#e5e7eb] bg-white px-6 py-16 text-sm text-[#6b7280]">
      <Loader2 size={16} className="animate-spin" strokeWidth={1.8} />
      Yükleniyor...
    </div>
  );
}
