"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FolderKanban,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string | null;
};

type TeamMembership = {
  id: string;
  project_id: string;
  role: string | null;
};

type MyProject = Project & {
  membership: TeamMembership;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusLabel(status: string | null) {
  switch (status) {
    case "in_progress":
      return "Devam Ediyor";
    case "completed":
      return "Tamamlandı";
    case "cancelled":
      return "İptal Edildi";
    case "paused":
      return "Duraklatıldı";
    case "ready_to_start":
      return "Başlamayı Bekliyor";
    default:
      return "Aktif";
  }
}

function getStatusClass(status: string | null) {
  switch (status) {
    case "in_progress":
      return "bg-green-100 text-green-700";
    case "completed":
      return "bg-blue-100 text-blue-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function ProjectsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [projects, setProjects] = useState<MyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<"all" | "active">("all");

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Projelerinizi görüntülemek için giriş yapmanız gerekiyor.");
          return;
        }

        // Gerçek ekip üyeliği project_team_members tablosundan okunur;
        // hem proposal hem de invitation ile katılanları kapsar.
        const { data: memberships, error: membershipsError } = await supabase
          .from("project_team_members")
          .select("id, project_id, role")
          .eq("freelancer_id", user.id)
          .eq("status", "active");

        if (membershipsError) {
          setError(`Projeler yüklenemedi: ${membershipsError.message}`);
          return;
        }

        const teamMemberships = (memberships ?? []) as TeamMembership[];

        if (teamMemberships.length === 0) {
          setProjects([]);
          return;
        }

        const projectIds = teamMemberships.map((membership) => membership.project_id);

        const { data: projectData, error: projectsError } = await supabase
          .from("projects")
          .select("id, title, description, deadline, status")
          .in("id", projectIds);

        if (projectsError) {
          setError(`Projeler yüklenemedi: ${projectsError.message}`);
          return;
        }

        const membershipByProjectId = new Map(
          teamMemberships.map((membership) => [membership.project_id, membership])
        );

        const myProjects: MyProject[] = (projectData ?? [])
          .map((project) => {
            const membership = membershipByProjectId.get(project.id);
            if (!membership) return null;
            return { ...(project as Project), membership };
          })
          .filter((project): project is MyProject => project !== null);

        setProjects(myProjects);
      } catch (loadException) {
        console.error("BEKLENMEYEN PROJE HATASI:", loadException);
        setError("Projeler yüklenirken beklenmeyen bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();
  }, [supabase]);

  const activeCount = projects.filter((project) => project.status === "in_progress").length;
  const visibleProjects = tab === "active" ? projects.filter((project) => project.status === "in_progress") : projects;

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          Projeler yükleniyor...
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Projelerim</h1>
        <p className="mt-2 text-sm text-gray-500">
          Ekibine dahil olduğun ve üzerinde çalıştığın projeleri buradan yönetebilirsin.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mb-8 flex gap-2 rounded-xl bg-gray-100 p-1.5 w-fit">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            tab === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Tüm Projeler ({projects.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            tab === "active" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Aktif Projeler ({activeCount})
        </button>
      </div>

      {!error && visibleProjects.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <FolderKanban size={36} className="mx-auto text-gray-400" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            {tab === "active" ? "Henüz aktif bir projen yok" : "Henüz bir projen yok"}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {tab === "active"
              ? "Bir proje başlatıldığında burada görünecek."
              : "Gönderdiğin bir teklif kabul edildiğinde proje burada görünecek."}
          </p>
          <Link
            href="/freelancers/discover"
            className="mt-6 inline-flex rounded-xl bg-[var(--color-primary-600)] px-5 py-3 text-sm font-medium text-white"
          >
            Projeleri keşfet
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visibleProjects.map((project) => {
          const href =
            project.status === "in_progress" || project.status === "completed"
              ? `/freelancers/projects/${project.id}`
              : `/freelancers/discover/${project.id}`;

          return (
            <Link
              key={project.id}
              href={href}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <h2 className="font-semibold text-gray-900">{project.title}</h2>
                <span className={`rounded-full px-3 py-1 text-xs ${getStatusClass(project.status)}`}>
                  {getStatusLabel(project.status)}
                </span>
              </div>

              <p className="mb-5 line-clamp-2 text-sm text-gray-500">
                {project.description || "Proje açıklaması bulunmuyor."}
              </p>

              {project.membership.role && (
                <div className="mb-4 rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users size={15} />
                    <span>Projede Rolün</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{project.membership.role}</p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
                <span className="flex items-center gap-2 text-gray-500">
                  <CalendarDays size={16} />
                  Teslim tarihi
                </span>
                <span className="font-medium text-gray-900">{formatDate(project.deadline)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
