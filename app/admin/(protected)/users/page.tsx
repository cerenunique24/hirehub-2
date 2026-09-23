import { AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import UsersTable from "./UsersTable";
import { listAdminUsers } from "./data";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { items: users, error } = await listAdminUsers(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kullanıcılar"
        description="Platformdaki tüm client ve freelancer hesaplarını buradan yönetin."
      />

      {error ? (
        <div className="border border-[#e5e7eb] bg-white">
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Veriler yüklenirken bir hata oluştu."
            description="Kullanıcı listesi Supabase'den alınamadı. Sunucu loglarında ayrıntı mevcut."
          />
        </div>
      ) : (
        <UsersTable users={users} />
      )}
    </div>
  );
}
