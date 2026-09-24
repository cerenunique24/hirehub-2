"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FolderPlus, Loader2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  budget: number | null;
  budget_max: number | null;
  skills: string[] | null;
  created_at: string;
};

type Tab = "all" | "active" | "open" | "completed";

function statusLabel(status: string | null) {
  return status === "open"
    ? "Yayında"
    : status === "ready_to_start"
      ? "Ekip hazır"
      : status === "paused"
        ? "Duraklatıldı"
        : status === "in_progress"
          ? "Devam ediyor"
          : status === "completed"
            ? "Tamamlandı"
            : status === "cancelled"
              ? "İptal edildi"
              : (status ?? "Bilinmiyor");
}

export default function ClientProjectsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    async function loadProjects() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Projelerinizi görüntülemek için giriş yapmanız gerekiyor.");
        setLoading(false);
        return;
      }
      const { data, error: loadError } = await supabase
        .from("projects")
        .select("id, title, description, status, budget, budget_max, skills, created_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      if (loadError) setError("Projeleriniz yüklenemedi.");
      else setProjects((data ?? []) as Project[]);
      setLoading(false);
    }
    void loadProjects();
  }, [supabase]);

  const activeProjects = projects.filter((project) => project.status === "in_progress");
  const openProjects = projects.filter(
    (project) => project.status === "open" || project.status === "ready_to_start"
  );
  const completedProjects = projects.filter((project) => project.status === "completed");
  const activeBudget = activeProjects.reduce((total, project) => {
    const budget = Number(project.budget_max ?? project.budget ?? 0);
    return total + (Number.isFinite(budget) ? budget : 0);
  }, 0);

  const visibleProjects =
    tab === "active"
      ? activeProjects
      : tab === "open"
        ? openProjects
        : tab === "completed"
          ? completedProjects
          : projects;

  const emptyCopy: Record<Tab, { title: string; body: string }> = {
    active: {
      title: "Henüz aktif bir projen yok",
      body: "Bir proje başlatıldığında burada görünecek.",
    },
    open: {
      title: "Yayında bir proje yok",
      body: "Yeni bir proje yayınlayarak freelancer teklifleri almaya başlayabilirsin.",
    },
    completed: {
      title: "Henüz tamamlanan bir projen yok",
      body: "Bir proje tamamlandığında burada görünecek.",
    },
    all: {
      title: "Henüz bir projen yok",
      body: "İlk projenizi oluşturarak yeteneklerle eşleşmeye başlayabilirsiniz.",
    },
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900">Projeler</h1>
            <p className="mt-1 text-sm text-neutral-500">Taslak, yayındaki ve devam eden projelerinizi yönetin.</p>
          </div>
          <Link href="/client/projects/new" className="rounded-lg bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-medium text-white">
            Yeni Proje Oluştur
          </Link>
        </header>

        {activeProjects.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-700">Aktif Bütçe</p>
              <p className="text-lg font-semibold text-emerald-900">{formatCurrency(activeBudget)}</p>
            </div>
            <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              {activeProjects.length} aktif proje
            </span>
          </div>
        )}

        <div className="mb-6 flex w-fit gap-1 rounded-lg bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${tab === "all" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
          >
            Tüm Projeler ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${tab === "active" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
          >
            Aktif ({activeProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("open")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${tab === "open" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
          >
            Yayında ({openProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("completed")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${tab === "completed" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
          >
            Tamamlanan ({completedProjects.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 size={18} className="animate-spin" />
            Projeler yükleniyor...
          </div>
        ) : error ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>
        ) : visibleProjects.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <FolderPlus className="mx-auto text-neutral-400" />
            <h2 className="mt-4 text-xl font-semibold">{emptyCopy[tab].title}</h2>
            <p className="mt-2 text-sm text-neutral-500">{emptyCopy[tab].body}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleProjects.map((project) => {
              const isActive = project.status === "in_progress";
              return (
                <Link
                  key={project.id}
                  href={`/client/projects/${project.id}`}
                  className={`flex flex-col gap-3 rounded-xl border p-5 transition hover:shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                    isActive ? "border-emerald-200 bg-emerald-50/40" : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 sm:justify-start">
                      <h2 className="truncate text-[15px] font-medium text-neutral-900">{project.title}</h2>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium sm:hidden ${
                          isActive ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {statusLabel(project.status)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-neutral-500">{project.description}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {(project.skills ?? []).slice(0, 3).map((skill) => (
                        <span key={skill} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                    <span
                      className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${
                        isActive ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {statusLabel(project.status)}
                    </span>

                    <span className="text-sm font-medium text-neutral-900">
                      {formatCurrency(Number(project.budget_max ?? project.budget ?? 0))}
                    </span>

                    {isActive && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                        Workroom&apos;a git
                        <ArrowRight size={13} />
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
