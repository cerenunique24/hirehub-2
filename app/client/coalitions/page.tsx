"use client";

import { CoalitionCard } from "@/components/coalitions/CoalitionCard";
import { clientCoalitionNextStep, coalitionUpdatedDate } from "@/components/coalitions/clientCoalitionPresentation";
import { coalitionProjectLabel } from "@/components/coalitions/coalitionPresentation";
import { panelRootClass, PanelBadge, PanelAction } from "@/components/dashboard/PanelPrimitives";
import type { TeamCompletion } from "@/lib/projects/teamReadiness";
import styles from "@/components/coalitions/Coalitions.module.css";
import { Input } from "@/components/ui/Input";
import { buttonClasses } from "@/components/ui/Button";
import { pageHeaderClass } from "@/components/ui/PageHeader";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FolderPlus,
  Loader2,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/common/EmptyState";
import { fetchBudgetBreakdown, getTeamCompletion } from "@/lib/projects/teamReadiness";
import { publicDisplayName } from "@/lib/utils/displayName";

type Coalition = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  project_id: string | null;
};

type Member = {
  coalition_id: string;
  user_id: string;
  role: "owner" | "member";
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

type Project = {
  id: string;
  title: string;
  status: string;
  updated_at?: string | null;
  budget_breakdown: { role?: string; name?: string; memberCount?: number }[] | null;
};

type CoalitionCardData = Coalition & {
  members: Array<Member & { profile: Profile | null }>;
  project: Project | null;
  openRoles: string[];
  team: TeamCompletion | null;
};

export default function ClientCoalitionsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [coalitions, setCoalitions] = useState<CoalitionCardData[]>([]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [coalitionName, setCoalitionName] = useState("");
  const [coalitionDescription, setCoalitionDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    async function loadCoalitions() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Koalisyonları görmek için giriş yapmalısınız.");
        setLoading(false);
        return;
      }

      const { data: rows, error: coalitionError } = await supabase
        .from("coalitions")
        .select("id, name, description, status, project_id")
        .eq("status", "active")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (coalitionError) {
        setError(
          "Koalisyonlar yüklenemedi. Yetkilendirme ayarlarını kontrol edin."
        );
        setLoading(false);
        return;
      }

      const base = (rows ?? []) as Coalition[];

      if (!base.length) {
        setCoalitions([]);
        setLoading(false);
        return;
      }

      const { data: memberRows, error: memberError } = await supabase
        .from("coalition_members")
        .select("coalition_id, user_id, role")
        .in(
          "coalition_id",
          base.map((coalition) => coalition.id)
        )
        .eq("status", "active");

      if (memberError) {
        setError("Koalisyon üyeleri yüklenemedi.");
        setLoading(false);
        return;
      }

      const members = (memberRows ?? []) as Member[];

      const userIds = [
        ...new Set(members.map((member) => member.user_id)),
      ];

      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, first_name, avatar_url")
            .in("id", userIds)
        : { data: [] };

      const profileById = new Map(
        ((profiles ?? []) as Profile[]).map((profile) => [
          profile.id,
          profile,
        ])
      );

      const projectIds = [
        ...new Set(
          base
            .map((coalition) => coalition.project_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const { data: projectRows } = projectIds.length
        ? await supabase
            .from("projects")
            .select("id, title, status, updated_at")
            .in("id", projectIds)
        : { data: [] };

      // budget_breakdown artık doğrudan sütun olarak okunamaz (bkz.
      // supabase/migrations/202609300006_budget_breakdown_privacy.sql).
      const budgetByProjectId = new Map(
        await Promise.all(
          projectIds.map(
            async (id) => [id, await fetchBudgetBreakdown(supabase, id)] as const
          )
        )
      );

      const projectById = new Map(
        ((projectRows ?? []) as Omit<Project, "budget_breakdown">[]).map((project) => [
          project.id,
          { ...project, budget_breakdown: budgetByProjectId.get(project.id) ?? [] } as Project,
        ])
      );

      const { data: teamMemberRows, error: teamMemberError } = projectIds.length
        ? await supabase
            .from("project_team_members")
            .select("project_id, role")
            .in("project_id", projectIds)
            .eq("status", "active")
        : { data: [], error: null };

      setCoalitions(
        base.map((coalition) => {
          const activeMembers = members
            .filter((member) => member.coalition_id === coalition.id)
            .map((member) => ({
              ...member,
              profile: profileById.get(member.user_id) ?? null,
            }));

          const project = coalition.project_id
            ? projectById.get(coalition.project_id) ?? null
            : null;

          const projectActiveMembers = (teamMemberRows ?? []).filter(
            (row) => row.project_id === coalition.project_id
          );

          // An empty/unavailable role breakdown cannot prove that the team is ready.
          const team = project?.budget_breakdown?.length && !teamMemberError
            ? getTeamCompletion(project.budget_breakdown, projectActiveMembers)
            : null;
          const openRoles = team?.roles.filter(role => !role.isFull).map(role => role.role) ?? [];

          return {
            ...coalition,
            members: activeMembers,
            project,
            openRoles,
            team,
          };
        })
      );

      setLoading(false);
    }

    void loadCoalitions();
  }, [supabase]);

  const openCreateModal = async () => {
    setCreateError("");
    setCoalitionName("");
    setCoalitionDescription("");
    setSelectedProjectId("");
    setShowCreateModal(true);
    setLoadingProjects(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCreateError("Koalisyon oluşturmak için giriş yapmalısınız.");
      setLoadingProjects(false);
      return;
    }

    const { data, error: projectError } = await supabase
      .from("projects")
      .select("id, title, status")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (projectError) {
      setCreateError("Projeleriniz yüklenemedi.");
      setLoadingProjects(false);
      return;
    }

    setProjects((data ?? []) as Project[]);
    setLoadingProjects(false);
  };

  const closeCreateModal = () => {
    if (creating) return;

    setShowCreateModal(false);
    setCreateError("");
    setCoalitionName("");
    setCoalitionDescription("");
    setSelectedProjectId("");
  };

  const createCoalition = async () => {
    setCreateError("");

    if (!selectedProjectId) {
      setCreateError("Lütfen bir proje seçin.");
      return;
    }

    if (!coalitionName.trim()) {
      setCreateError("Koalisyon adı girin.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCreateError("Koalisyon oluşturmak için giriş yapmalısınız.");
      return;
    }

    const selectedProject = projects.find(
      (project) => project.id === selectedProjectId
    );

    if (!selectedProject) {
      setCreateError("Seçilen proje bulunamadı.");
      return;
    }

    setCreating(true);

    const { data, error: insertError } = await supabase
      .from("coalitions")
      .insert({
        project_id: selectedProject.id,
        created_by: user.id,
        name: coalitionName.trim(),
        description: coalitionDescription.trim() || null,
        status: "active",
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setCreateError(
        insertError?.message ||
          "Koalisyon oluşturulurken bir hata oluştu."
      );
      setCreating(false);
      return;
    }

    window.location.href = `/client/coalitions/${data.id}`;
  };

  return (
    <div className={[panelRootClass, styles.page, "w-full"].join(" ")}>
      <div className="w-full">
        <header className={pageHeaderClass}>
          <div>
            <h1 className="cc-page-title font-semibold text-[var(--color-text-primary)]">
              Koalisyonlarım
            </h1>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Projeleriniz için oluşturduğunuz ekipleri yönetin.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void openCreateModal()}
            className={buttonClasses({variant:"primary"})}
          >
            <Plus size={17} />
            Koalisyon Oluştur
          </button>
        </header>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Loader2 size={18} className="animate-spin" />
            Koalisyonlar yükleniyor...
          </div>
        ) : error ? (
          <p className="rounded-[var(--radius-card)] bg-[var(--color-error-50)] p-4 text-sm text-[var(--color-error-600)]">
            {error}
          </p>
        ) : coalitions.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Henüz bir koalisyon oluşturmadınız"
            description="Bir projeniz için ekip oluşturarak freelancer önerilerini yönetmeye başlayabilirsiniz."
          />
        ) : (
          <div className={styles.list}>
            {coalitions.map(coalition => <CoalitionCard key={coalition.id}
              name={coalition.name}
              projectTitle={coalition.project?.title || (coalition.project_id ? "Proje bilgileri alınamadı" : "Proje bağlantısı bulunmuyor")}
              status={coalition.status}
              members={coalition.members.map(member => ({id:member.user_id,name:publicDisplayName(member.profile,"Ekip üyesi"),avatarUrl:member.profile?.avatar_url || null}))}
              metadata={[
                {label:"Roller",value:coalition.team ? coalition.team.filledRoles+" / "+coalition.team.totalRoles+" rol dolu" : "Doğrulanamadı"},
                ...(coalition.team ? [{label:"Açık roller",value:coalition.openRoles.length ? coalition.openRoles.length+" · "+coalition.openRoles.join(", ") : "Açık rol yok"}] : []),
                ...(coalition.project?.updated_at ? [{label:"Proje güncellendi",value:coalitionUpdatedDate(coalition.project.updated_at)}] : []),
              ]}
              statusContent={coalition.project ? <><span>Proje</span><PanelBadge>{coalitionProjectLabel(coalition.project.status)}</PanelBadge></> : <span>Proje durumu doğrulanamadı</span>}
              nextStep={clientCoalitionNextStep(coalition.project,coalition.team)}
              actions={<>
                <PanelAction href={"/client/coalitions/"+coalition.id} variant="primary">Ekip Alanını Aç</PanelAction>
                <PanelAction href={"/client/coalitions/"+coalition.id+"#team-messages"}>Mesajlar</PanelAction>
                {coalition.project && <Link href={"/client/projects/"+coalition.project.id} className={styles.projectLink}>Bağlı projeyi gör</Link>}
              </>}
            />)}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-6 py-5">
              <div>
                <h2 className="cc-h2 font-semibold text-[var(--color-text-primary)]">
                  Koalisyon Oluştur
                </h2>

                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Koalisyonu bir projenize bağlayın.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                aria-label="Pencereyi kapat"
                className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              {loadingProjects ? (
                <div className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] p-5 text-sm text-[var(--color-text-secondary)]">
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Projeleriniz yükleniyor...
                </div>
              ) : projects.length === 0 ? (
                <EmptyState
                  icon={FolderPlus}
                  title="Henüz bir projeniz yok"
                  description="Önce bir proje oluşturmanız gerekiyor."
                  action={
                    <Link
                      href="/client/create-project"
                      onClick={closeCreateModal}
                      className={buttonClasses({variant:"primary"})}
                    >
                      Proje Oluştur
                    </Link>
                  }
                />
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-primary)]">
                      Proje
                    </label>

                    <select
                      value={selectedProjectId}
                      onChange={(event) =>
                        setSelectedProjectId(event.target.value)
                      }
                      className="mt-2 w-full rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-neutral-400"
                    >
                      <option value="">
                        Proje seçin
                      </option>

                      {projects.map((project) => (
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-primary)]">
                      Koalisyon adı
                    </label>

                    <Input
                      type="text"
                      value={coalitionName}
                      onChange={(event) =>
                        setCoalitionName(event.target.value)
                      }
                      placeholder="Örn. Mobil Uygulama Ekibi"
                      className="mt-2 w-full rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-primary)]">
                      Açıklama
                    </label>

                    <textarea
                      value={coalitionDescription}
                      onChange={(event) =>
                        setCoalitionDescription(event.target.value)
                      }
                      rows={4}
                      placeholder="Bu koalisyonun amacı ve ekip yapısı hakkında kısa bilgi..."
                      className="mt-2 w-full resize-none rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-4 py-3 text-sm leading-6 text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-neutral-400"
                    />
                  </div>
                </>
              )}

              {createError && (
                <div className="rounded-[var(--radius-card)] bg-[var(--color-error-50)] p-3 text-sm text-[var(--color-error-600)]">
                  {createError}
                </div>
              )}
            </div>

            {projects.length > 0 && !loadingProjects && (
              <div className="flex justify-end gap-3 border-t border-[var(--color-border-subtle)] px-6 py-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-[var(--radius-card)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  onClick={() => void createCoalition()}
                  disabled={creating}
                  className={buttonClasses({variant:"primary"})}
                >
                  {creating && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}
                  {creating
                    ? "Oluşturuluyor..."
                    : "Koalisyonu Oluştur"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
