"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, FolderPlus, Loader2, Users } from "lucide-react";
import StatCard from "../components/StatCard";
import QuickActions from "../components/QuickActions";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";

type ClientProject = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  budget: number | string | null;
  budget_max: number | string | null;
  budget_breakdown: Array<{ role?: string; name?: string }> | null;
  created_at: string;
  updated_at: string | null;
};

type ActiveProjectCard = ClientProject & {
  teamCount: number;
  approvedMilestones: number;
  totalMilestones: number;
};

type OpenProjectCard = ClientProject & {
  proposalCount: number;
};

type ActivityItem = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  created_at: string;
};

type DashboardData = {
  projectCount: number;
  activeCount: number;
  openCount: number;
  completedCount: number;
  activeProjects: ActiveProjectCard[];
  openProjects: OpenProjectCard[];
  activities: ActivityItem[];
};

function formatDate(value: string | null) {
  if (!value) return "Bilinmiyor";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(
    new Date(value)
  );
}

function roleNamesFromBreakdown(breakdown: ClientProject["budget_breakdown"]) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return [];
  return breakdown.map((r) => r.role ?? r.name ?? "").filter(Boolean);
}

export default function ClientDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (active) {
          setError("Paneli görüntülemek için giriş yapmanız gerekiyor.");
          setLoading(false);
        }
        return;
      }

      const { data: projectRows, error: projectError } = await supabase
        .from("projects")
        .select("id, title, description, status, budget, budget_max, budget_breakdown, created_at, updated_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (projectError) {
        if (active) {
          setError("Projeleriniz yüklenirken bir sorun oluştu.");
          setLoading(false);
        }
        return;
      }

      const projects = (projectRows ?? []) as ClientProject[];
      const activeBase = projects.filter((p) => p.status === "in_progress");
      const openBase = projects.filter((p) => p.status === "open");
      const activeIds = activeBase.map((p) => p.id);
      const openIds = openBase.map((p) => p.id);

      const [teamResult, milestoneResult, proposalResult, activityResult] = await Promise.all([
        activeIds.length > 0
          ? supabase.from("project_team_members").select("project_id").in("project_id", activeIds).eq("status", "active")
          : Promise.resolve({ data: [] as Array<{ project_id: string }> }),
        activeIds.length > 0
          ? supabase.from("project_milestones").select("project_id, status").in("project_id", activeIds)
          : Promise.resolve({ data: [] as Array<{ project_id: string; status: string }> }),
        openIds.length > 0
          ? supabase.from("proposals").select("project_id").in("project_id", openIds)
          : Promise.resolve({ data: [] as Array<{ project_id: string }> }),
        supabase
          .from("notifications")
          .select("id, title, message, link, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const teamCountByProject = new Map<string, number>();
      for (const row of teamResult.data ?? []) {
        teamCountByProject.set(row.project_id, (teamCountByProject.get(row.project_id) ?? 0) + 1);
      }

      const milestonesByProject = new Map<string, { approved: number; total: number }>();
      for (const row of milestoneResult.data ?? []) {
        const current = milestonesByProject.get(row.project_id) ?? { approved: 0, total: 0 };
        current.total += 1;
        if (row.status === "approved") current.approved += 1;
        milestonesByProject.set(row.project_id, current);
      }

      const proposalCountByProject = new Map<string, number>();
      for (const row of proposalResult.data ?? []) {
        proposalCountByProject.set(row.project_id, (proposalCountByProject.get(row.project_id) ?? 0) + 1);
      }

      const activeProjects: ActiveProjectCard[] = activeBase.map((p) => ({
        ...p,
        teamCount: teamCountByProject.get(p.id) ?? 0,
        approvedMilestones: milestonesByProject.get(p.id)?.approved ?? 0,
        totalMilestones: milestonesByProject.get(p.id)?.total ?? 0,
      }));

      const openProjects: OpenProjectCard[] = openBase.map((p) => ({
        ...p,
        proposalCount: proposalCountByProject.get(p.id) ?? 0,
      }));

      if (active) {
        setData({
          projectCount: projects.length,
          activeCount: activeBase.length,
          openCount: openBase.length,
          completedCount: projects.filter((p) => p.status === "completed").length,
          activeProjects,
          openProjects,
          activities: (activityResult.data ?? []) as ActivityItem[],
        });
        setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [supabase]);

  if (loading) return <DashboardLoading />;

  if (error) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data || data.projectCount === 0) return <EmptyDashboard />;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Panel</h1>
            <p className="mt-1 text-sm text-neutral-500">Projelerinizin güncel durumunu buradan takip edin.</p>
          </div>
          <QuickActions />
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Toplam Proje" value={data.projectCount} subtitle="Tüm projeleriniz" />
          <StatCard title="Aktif Proje" value={data.activeCount} subtitle="Devam ediyor" />
          <StatCard title="Yayındaki Proje" value={data.openCount} subtitle="Teklif bekliyor" />
          <StatCard title="Tamamlanan" value={data.completedCount} subtitle="Teslim edildi" />
        </div>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Aktif Projeler</h2>
            <Link href="/client/projects" className="text-sm font-medium text-neutral-600 hover:text-black">
              Tümünü gör
            </Link>
          </div>

          {data.activeProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
              Şu anda üzerinde çalışılan bir projeniz yok.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.activeProjects.map((project) => {
                const roles = roleNamesFromBreakdown(project.budget_breakdown);
                const progress =
                  project.totalMilestones > 0
                    ? Math.round((project.approvedMilestones / project.totalMilestones) * 100)
                    : 0;
                const activeBudget = Number(project.budget_max ?? project.budget ?? 0);

                return (
                  <Link
                    key={project.id}
                    href={`/client/projects/${project.id}`}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 transition hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-neutral-900">{project.title}</h3>
                        {roles.length > 0 && (
                          <p className="mt-1 text-xs text-neutral-500">{roles.slice(0, 3).join(", ")}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        Devam ediyor
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} /> {project.teamCount} ekip üyesi
                      </span>
                      <span>{formatCurrency(activeBudget)}</span>
                      <span>Son güncelleme: {formatDate(project.updated_at)}</span>
                    </div>

                    {project.totalMilestones > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-neutral-500">
                          <span>Aşama ilerlemesi</span>
                          <span>
                            {project.approvedMilestones}/{project.totalMilestones}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}

                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                      Workroom&apos;a git <ArrowRight size={14} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Yayındaki Projeler</h2>
            <Link href="/client/projects" className="text-sm font-medium text-neutral-600 hover:text-black">
              Tümünü gör
            </Link>
          </div>

          {data.openProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
              Şu anda yayında bir projeniz yok.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.openProjects.map((project) => {
                const roles = roleNamesFromBreakdown(project.budget_breakdown);
                return (
                  <Link
                    key={project.id}
                    href={`/client/projects/${project.id}`}
                    className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-neutral-900">{project.title}</h3>
                      <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                        Yayında
                      </span>
                    </div>
                    {roles.length > 0 && <p className="mt-1 text-xs text-neutral-500">{roles.slice(0, 3).join(", ")}</p>}
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                      <span>{project.proposalCount} teklif</span>
                      <span>{formatCurrency(Number(project.budget_max ?? project.budget ?? 0))}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell size={16} className="text-neutral-500" />
            <h2 className="text-lg font-semibold text-neutral-900">Son Aktiviteler</h2>
          </div>

          {data.activities.length === 0 ? (
            <p className="text-sm text-neutral-500">Henüz bir aktivite yok.</p>
          ) : (
            <div className="space-y-3">
              {data.activities.map((activity) => {
                const content = (
                  <div className="rounded-xl border border-neutral-100 p-4 transition hover:bg-neutral-50">
                    <p className="text-sm font-medium text-neutral-900">{activity.title}</p>
                    {activity.message && <p className="mt-1 text-sm text-neutral-500">{activity.message}</p>}
                    <p className="mt-1 text-xs text-neutral-400">{formatDate(activity.created_at)}</p>
                  </div>
                );
                return activity.link ? (
                  <Link key={activity.id} href={activity.link}>
                    {content}
                  </Link>
                ) : (
                  <div key={activity.id}>{content}</div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="p-8">
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <div>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100"><FolderPlus size={25} /></div>
          <h1 className="mt-6 text-3xl font-bold text-neutral-900">Henüz bir projen yok</h1>
          <p className="mx-auto mt-3 max-w-md leading-7 text-neutral-500">İlk projenizi oluşturarak doğru freelancer ve ekiplerle çalışmaya başlayabilirsiniz.</p>
          <Link href="/client/projects/new" className="mt-7 inline-flex items-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800">Yeni Proje Oluştur</Link>
        </div>
      </div>
    </div>
  );
}

function DashboardLoading() {
  return <div className="flex min-h-[60vh] items-center justify-center"><div className="flex items-center gap-3 text-sm text-neutral-500"><Loader2 size={20} className="animate-spin" />Panel yükleniyor...</div></div>;
}
