"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Heart,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatRemainingTime } from "@/lib/utils/deadline";
import { PageHeader, pageHeaderClass } from "@/components/ui/PageHeader";
import { DashboardMascot } from "@/components/dashboard/DashboardMascot";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/common/EmptyState";

type SavedProject = {
  favoriteId: string;
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  category: string | null;
  location: string | null;
  deadline: string | null;
  status: string | null;
  team_required: boolean | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  open: "Açık",
  published: "Açık",
  in_progress: "Devam ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

function statusLabel(status: string | null): string {
  if (!status) return "Belirtilmemiş";
  return STATUS_LABEL[status] ?? status;
}

export default function SavedProjectsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function loadSavedProjects() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          if (!cancelled) setProjects([]);
          return;
        }

        const { data: favoriteRows, error: favoritesError } = await supabase
          .from("favorites")
          .select("id, target_id, created_at")
          .eq("user_id", user.id)
          .eq("target_type", "project")
          .order("created_at", { ascending: false });

        if (favoritesError) throw favoritesError;

        const projectIds = (favoriteRows ?? []).map((row) => row.target_id);

        if (projectIds.length === 0) {
          if (!cancelled) setProjects([]);
          return;
        }

        const { data: projectRows, error: projectsError } = await supabase
          .from("projects")
          .select(
            "id, title, description, budget, category, location, deadline, status, team_required"
          )
          .in("id", projectIds);

        if (projectsError) throw projectsError;

        const projectById = new Map(
          (projectRows ?? []).map((project) => [project.id, project])
        );

        const merged = (favoriteRows ?? [])
          .map((favorite) => {
            const project = projectById.get(favorite.target_id);

            if (!project) return null;

            return {
              favoriteId: favorite.id,
              id: project.id,
              title: project.title,
              description: project.description,
              budget:
                typeof project.budget === "number"
                  ? project.budget
                  : project.budget
                    ? Number(project.budget)
                    : null,
              category: project.category,
              location: project.location,
              deadline: project.deadline,
              status: project.status,
              team_required: project.team_required,
            } as SavedProject;
          })
          .filter((project): project is SavedProject => project !== null);

        if (!cancelled) setProjects(merged);
      } catch (err) {
        console.error("Favori projeler yüklenemedi:", err);

        if (!cancelled) {
          setError("Favori projeler yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.");
          setProjects([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSavedProjects();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function removeFavorite(favoriteId: string) {
    if (removingIds.has(favoriteId)) return;

    setRemovingIds((previous) => new Set(previous).add(favoriteId));

    const previousProjects = projects;
    setProjects((current) => current.filter((project) => project.favoriteId !== favoriteId));

    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("id", favoriteId);

    if (deleteError) {
      console.error("Favori kaldırılamadı:", deleteError);
      setProjects(previousProjects);
      setError("Favori kaldırılamadı. Lütfen tekrar deneyin.");
    }

    setRemovingIds((previous) => {
      const next = new Set(previous);
      next.delete(favoriteId);
      return next;
    });
  }

  return (
    <div>
      <PageHeader className={pageHeaderClass}
        title="Favorilerim"
        description="Kaydettiğin projeleri buradan takip edebilirsin."
        action={
          <div className="flex items-center gap-3"><DashboardMascot pose="heart" size={64} className="h-10 w-10 sm:h-16 sm:w-16" eager />          <Badge tone="neutral" className="gap-1.5 px-3 py-1.5 text-[13px]">
            <Heart className="h-3.5 w-3.5" />
            {loading ? "Yükleniyor..." : `${projects.length} favori`}
          </Badge></div>
        }
      />

      <div className="mt-[var(--rhythm-header-gap)]">
        {error && (
          <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-5">
            <p className="cc-body-sm text-[var(--color-text-secondary)]">{error}</p>
          </div>
        )}

        {loading && (
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-5"
              >
                <div className="mb-5 h-5 w-2/3 rounded bg-[var(--color-surface-2)]" />
                <div className="mb-2 h-4 w-full rounded bg-[var(--color-surface-2)]" />
                <div className="h-4 w-4/5 rounded bg-[var(--color-surface-2)]" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <EmptyState
            icon={Heart}
            title="Henüz favorilediğiniz proje yok."
            description="Projeleri Keşfet sayfasında beğendiğin projeleri favorilere ekleyerek burada takip edebilirsin."
            action={
              <Link href="/freelancers/discover">
                <Button size="sm">Projeleri Keşfet</Button>
              </Link>
            }
          />
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="flex flex-col gap-4">
            {projects.map((project) => {
              const remaining = formatRemainingTime(project.deadline);
              const isRemoving = removingIds.has(project.favoriteId);

              return (
                <article
                  key={project.favoriteId}
                  className="group flex flex-col gap-5 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-5 transition hover:border-[var(--color-border-strong)] hover:shadow-sm sm:flex-row"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-1.5">
                          {project.category && <Badge tone="neutral">{project.category}</Badge>}
                          <Badge tone="neutral">{statusLabel(project.status)}</Badge>
                        </div>

                        <Link href={`/freelancers/discover/${project.id}`} className="block">
                          <h2 className="truncate text-base font-medium leading-6 text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary-700)]">
                            {project.title}
                          </h2>
                        </Link>
                      </div>

                      <button
                        type="button"
                        onClick={() => void removeFavorite(project.favoriteId)}
                        disabled={isRemoving}
                        aria-label="Favorilerden çıkar"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                      >
                        <Heart className="h-4 w-4 fill-current text-[var(--color-text-primary)]" />
                      </button>
                    </div>

                    {project.description && (
                      <p className="cc-body mt-[var(--rhythm-description-gap)] line-clamp-2 text-[var(--color-text-secondary)]">
                        {project.description}
                      </p>
                    )}

                    <div className="cc-body-sm mt-[var(--rhythm-meta-group-gap)] flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--color-text-secondary)] empty:hidden">
                      {project.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {project.location}
                        </span>
                      )}
                      {project.team_required && (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Ekip projesi
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-[var(--rhythm-meta-gap)] border-t border-[var(--color-border-subtle)] pt-4 sm:w-[200px] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <Wallet className="h-3 w-3" /> Bütçe
                      </p>
                      <p className="mt-1 text-sm font-medium leading-5 text-[var(--color-text-primary)]">
                        {project.budget !== null ? formatCurrency(project.budget) : "Belirtilmemiş"}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <CalendarDays className="h-3 w-3" /> Son tarih
                      </p>
                      <p className="mt-1 truncate text-sm font-medium leading-5 text-[var(--color-text-primary)]">
                        {remaining.label}
                      </p>
                    </div>

                    <Link
                      href={`/freelancers/discover/${project.id}`}
                      className="mt-auto inline-flex h-[var(--button-height-sm)] w-full items-center justify-center gap-[var(--button-gap)] rounded-[var(--radius-button)] bg-[var(--color-primary-600)] px-[var(--button-padding-sm)] font-sans text-[length:var(--font-size-button)] font-medium leading-[var(--line-height-button)] text-white transition-colors hover:bg-[var(--color-primary-700)]"
                    >
                      <BriefcaseBusiness className="h-3.5 w-3.5" />
                      Detayları gör
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
