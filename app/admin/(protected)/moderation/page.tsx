import { AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ModerationTable from "./ModerationTable";
import { listModerationFlags } from "./data";

export default async function AdminModerationPage() {
  const supabase = await createClient();
  const { items: flags, error } = await listModerationFlags(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Moderasyon"
        description="Platform dışı iletişim/ödeme bilgisi paylaşma denemeleri buradan izlenir."
      />

      {error ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Veriler yüklenirken bir hata oluştu."
            description="Moderasyon kayıtları Supabase'den alınamadı. Sunucu loglarında ayrıntı mevcut."
          />
        </div>
      ) : (
        <ModerationTable flags={flags} />
      )}
    </div>
  );
}
