import { AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import SupportTable from "./SupportTable";
import { listAdminSupportTickets } from "./data";

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const { items: tickets, error } = await listAdminSupportTickets(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Destek Talepleri"
        description="Client ve freelancer'lardan gelen destek taleplerini buradan yönetin."
      />

      {error ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Veriler yüklenirken bir hata oluştu."
            description="Destek talebi listesi Supabase'den alınamadı. Sunucu loglarında ayrıntı mevcut."
          />
        </div>
      ) : (
        <SupportTable tickets={tickets} />
      )}
    </div>
  );
}
