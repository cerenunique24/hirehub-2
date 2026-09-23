import { AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import CareersTable from "./CareersTable";
import { listCareerApplications } from "./data";

export default async function AdminCareersPage() {
  const supabase = await createClient();
  const { items: applications, error } = await listCareerApplications(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kariyer Başvuruları"
        description="CollaCrew ekibine katılmak için gelen genel başvuruları buradan yönetin."
      />

      {error ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Veriler yüklenirken bir hata oluştu."
            description="Başvuru listesi Supabase'den alınamadı. Sunucu loglarında ayrıntı mevcut."
          />
        </div>
      ) : (
        <CareersTable applications={applications} />
      )}
    </div>
  );
}
