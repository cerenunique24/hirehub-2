import { AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ProposalsTable from "./ProposalsTable";
import { listAdminProposals } from "./data";

export default async function AdminProposalsPage() {
  const supabase = await createClient();
  const { items: proposals, error } = await listAdminProposals(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Teklifler"
        description="Platformdaki tüm freelancer tekliflerini buradan izleyin."
      />

      {error ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Veriler yüklenirken bir hata oluştu."
            description="Teklif listesi Supabase'den alınamadı. Sunucu loglarında ayrıntı mevcut."
          />
        </div>
      ) : (
        <ProposalsTable proposals={proposals} />
      )}
    </div>
  );
}
