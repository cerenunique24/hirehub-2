import { AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ProjectsTable from "./ProjectsTable";
import { listAdminProjects } from "./data";

export default async function AdminProjectsPage() {
  const supabase = await createClient();
  const { items: projects, error } = await listAdminProjects(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projeler"
        description="Platformda oluşturulan tüm projeleri buradan izleyin."
      />

      {error ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Veriler yüklenirken bir hata oluştu."
            description="Proje listesi Supabase'den alınamadı. Sunucu loglarında ayrıntı mevcut."
          />
        </div>
      ) : (
        <ProjectsTable projects={projects} />
      )}
    </div>
  );
}
