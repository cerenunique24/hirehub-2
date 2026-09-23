import { LifeBuoy, FolderKanban } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import PageHeader from "./components/PageHeader";
import StatCard from "./components/StatCard";
import EmptyState from "./components/EmptyState";
import Badge from "./components/Badge";
import { getAdminDashboardData } from "./dashboard-data";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function metricValue(value: number | null): string {
  return value === null ? "--" : String(value);
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { metrics, recentSupportTickets, recentProjects, hasError } = await getAdminDashboardData(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="CollaCrew platformunun genel durumuna hızlı bakış."
      />

      {hasError && (
        <div className="border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          Bazı metrikler yüklenirken bir hata oluştu — eksik veriler &quot;--&quot; olarak gösteriliyor. Sunucu
          loglarında ayrıntı mevcut.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Toplam Kullanıcı" value={metricValue(metrics.totalUsers)} />
        <StatCard title="Freelancer" value={metricValue(metrics.freelancerCount)} />
        <StatCard title="Client" value={metricValue(metrics.clientCount)} />
        <StatCard title="Admin" value={metricValue(metrics.adminCount)} />
        <StatCard title="Toplam Proje" value={metricValue(metrics.totalProjects)} />
        <StatCard title="Aktif Projeler" value={metricValue(metrics.activeProjects)} subtitle="Durum: in_progress" />
        <StatCard title="Bekleyen Teklifler" value={metricValue(metrics.pendingProposals)} />
        <StatCard
          title="Açık Destek Talepleri"
          value={metricValue(metrics.openSupportTickets)}
          subtitle="Çözülmemiş / kapatılmamış"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#e5e7eb] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#111111]">Son Destek Talepleri</h2>
          </div>

          {recentSupportTickets.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="Henüz kayıt bulunmuyor."
              description="Yeni bir destek talebi oluşturulduğunda burada listelenecek."
            />
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {recentSupportTickets.map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#111111]">{ticket.subject}</p>
                    <p className="truncate text-xs text-[#6b7280]">{ticket.requesterName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={ticket.status === "open" ? "warning" : "neutral"}>{ticket.status}</Badge>
                    <span className="text-xs text-[#9ca3af]">{formatDate(ticket.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#e5e7eb] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#111111]">Son Projeler</h2>
          </div>

          {recentProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Henüz kayıt bulunmuyor."
              description="Yeni bir proje oluşturulduğunda burada listelenecek."
            />
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {recentProjects.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#111111]">{project.title}</p>
                    <p className="truncate text-xs text-[#6b7280]">{project.clientName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={project.status === "in_progress" ? "info" : "neutral"}>
                      {project.status ?? "—"}
                    </Badge>
                    <span className="text-xs text-[#9ca3af]">{formatDate(project.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
