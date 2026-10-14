"use client";

import Link from "next/link";
import { CoalitionCard } from "@/components/coalitions/CoalitionCard";
import { useEffect, useMemo, useState } from "react";
import { Search, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchBudgetBreakdown, getTeamCompletion } from "@/lib/projects/teamReadiness";
import { panelRootClass, PanelBadge, PanelAction } from "@/components/dashboard/PanelPrimitives";
import { buttonClasses } from "@/components/ui/Button";
import { coalitionActionSummary, coalitionWork, coalitionProjectLabel, coalitionProjectHref, type CoalitionProject, type CoalitionStage } from "@/components/coalitions/coalitionPresentation";
import type { TeamCompletion } from "@/lib/projects/teamReadiness";
import styles from "@/components/coalitions/Coalitions.module.css";
import { publicDisplayName } from "@/lib/utils/displayName";

type OpenCoalition = {
  id: string;
  name: string;
  projectId: string;
  projectTitle: string;
  openRoles: string[];
};

type Coalition = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "completed";
  created_by: string;
  created_at: string;
  project_id: string | null;
};

type Profile = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  title: string | null;
};

type CoalitionMember = {
  id: string;
  coalition_id: string;
  user_id: string;
  role: "owner" | "member";
  status: "active" | "pending";
  joined_at: string;
  profile: Profile | null;
};

type CoalitionWithMembers = Coalition & {
  members: CoalitionMember[];
  project?: CoalitionProject | null;
  myProjectRole?: string | null;
  stages?: CoalitionStage[] | null;
  team?: TeamCompletion | null;
  teamMemberIds?: string[];
};

type FilterType = "all" | "active" | "completed";

export default function CoalitionsPage() {
  const [coalitions, setCoalitions] = useState<
    CoalitionWithMembers[]
  >([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<FilterType>("active");

  const loadCoalitions = async () => {
    const supabase = createClient();

    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "Koalisyonlarını görmek için giriş yapmalısın."
        );
        setCoalitions([]);
        return;
      }

      setCurrentUserId(user.id);

      /*
       * Önce freelancerın üyesi olduğu koalisyonları buluyoruz.
       *
       * Böylece platformdaki tüm koalisyonlar yerine
       * yalnızca bu freelancerın dahil olduğu koalisyonlar
       * gösterilir.
       */
      const {
        data: membershipData,
        error: membershipError,
      } = await supabase
        .from("coalition_members")
        .select(
          "id, coalition_id, user_id, role, status, joined_at"
        )
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("joined_at", {
          ascending: false,
        });

      if (membershipError) {
        console.error(
          "Coalition membership load error:",
          membershipError
        );

        setErrorMessage(
          "Koalisyonların yüklenmesi sırasında bir hata oluştu."
        );
        setCoalitions([]);
        return;
      }

      if (
        !membershipData ||
        membershipData.length === 0
      ) {
        setCoalitions([]);
        return;
      }

      const coalitionIds = [
        ...new Set(
          membershipData.map(
            (member) => member.coalition_id
          )
        ),
      ];

      /*
       * Sadece freelancerın üyesi olduğu koalisyonları getir.
       */
      const {
        data: coalitionData,
        error: coalitionError,
      } = await supabase
        .from("coalitions")
        .select(
          "id, name, description, status, created_by, created_at, project_id"
        )
        .in("id", coalitionIds)
        .order("created_at", {
          ascending: false,
        });

      if (coalitionError) {
        console.error(
          "Coalitions load error:",
          coalitionError
        );

        setErrorMessage(
          "Koalisyonların yüklenmesi sırasında bir hata oluştu."
        );
        setCoalitions([]);
        return;
      }

      if (
        !coalitionData ||
        coalitionData.length === 0
      ) {
        setCoalitions([]);
        return;
      }

      /*
       * Koalisyonlardaki aktif tüm üyeleri getiriyoruz.
       * Böylece kartlarda ekip üyelerini gösterebiliriz.
       */
      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from("coalition_members")
        .select(
          "id, coalition_id, user_id, role, status, joined_at"
        )
        .in("coalition_id", coalitionIds)
        .eq("status", "active")
        .order("joined_at", {
          ascending: true,
        });

      if (memberError) {
        console.error(
          "Coalition members load error:",
          memberError
        );

        setErrorMessage(
          "Ekip üyeleri yüklenirken bir hata oluştu."
        );
        setCoalitions([]);
        return;
      }

      const memberUserIds = [
        ...new Set(
          (memberData ?? []).map(
            (member) => member.user_id
          )
        ),
      ];

      let profileData: Profile[] = [];

      if (memberUserIds.length > 0) {
        const {
          data: profiles,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, first_name, avatar_url, title"
          )
          .in("id", memberUserIds);

        if (profileError) {
          console.error(
            "Profiles load error:",
            profileError
          );
        } else {
          profileData = profiles ?? [];
        }
      }

      const normalizedMembers: CoalitionMember[] =
        (memberData ?? []).map((member) => {
          const profile =
            profileData.find(
              (item) =>
                item.id === member.user_id
            ) ?? null;

          return {
            id: member.id,
            coalition_id: member.coalition_id,
            user_id: member.user_id,
            role: member.role,
            status: member.status,
            joined_at: member.joined_at,
            profile,
          };
        });

      const combined: CoalitionWithMembers[] =
        coalitionData.map((coalition) => ({
          ...coalition,
          members:
            normalizedMembers.filter(
              (member) =>
                member.coalition_id ===
                coalition.id
            ),
        }));

      // Display-only project context, scoped to the coalition IDs already visible to this member.
      const projectIds = [...new Set(combined.map(item=>item.project_id).filter((id): id is string=>Boolean(id)))];
      if(projectIds.length) {
        const [projectsResult, stagesResult, teamResult] = await Promise.all([
          supabase.from("projects").select("id, title, status, deadline, team_required, updated_at").in("id",projectIds),
          supabase.from("project_milestones").select("id, project_id, title, status, freelancer_id, due_date, sort_order").in("project_id",projectIds).order("sort_order",{ascending:true}),
          supabase.from("project_team_members").select("project_id, freelancer_id, role").in("project_id",projectIds).eq("status","active"),
        ]);
        if(projectsResult.error || stagesResult.error || teamResult.error) console.error("Coalition context could not be fully loaded",projectsResult.error,stagesResult.error,teamResult.error);
        await Promise.all(combined.map(async item=>{
          const project = (projectsResult.data??[]).find(row=>row.id===item.project_id);
          item.project = project??null;
          item.stages = stagesResult.error ? null : ((stagesResult.data??[]).filter(row=>row.project_id===item.project_id) as CoalitionStage[]);
          const team = (teamResult.data??[]).filter(row=>row.project_id===item.project_id);
          item.myProjectRole = team.find(row=>row.freelancer_id===user.id)?.role??null;
          item.teamMemberIds = team.map(row=>row.freelancer_id);
          const roles = project && !teamResult.error ? await fetchBudgetBreakdown(supabase,project.id) : [];
          item.team = roles.length ? getTeamCompletion(roles,team) : null;
        }));
      }
      setCoalitions(combined);
    } catch (error) {
      console.error(
        "Coalitions page error:",
        error
      );

      setErrorMessage(
        "Koalisyonlar yüklenirken beklenmeyen bir hata oluştu."
      );

      setCoalitions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCoalitions();
  }, []);

  const [openCoalitions, setOpenCoalitions] = useState<OpenCoalition[]>([]);
  const [loadingOpen, setLoadingOpen] = useState(true);

  const loadOpenCoalitions = async () => {
    const supabase = createClient();
    setLoadingOpen(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoadingOpen(false);
      return;
    }

    // RLS zaten sadece: kendi üyesi olduğu VEYA projesi hâlâ "open" olan
    // coalition'ları döndürür (bkz. private.can_view_coalition).
    const { data: rows, error } = await supabase
      .from("coalitions")
      .select(
        "id, name, project_id, projects(id, title, status)"
      )
      .eq("status", "active")
      .not("project_id", "is", null);

    if (error) {
      console.error("Açık koalisyonlar yüklenemedi:", error);
      setLoadingOpen(false);
      return;
    }

    // Zaten aktif üye olduğum coalition'ları dışarıda bırak.
    const { data: myMemberships } = await supabase
      .from("coalition_members")
      .select("coalition_id, status")
      .eq("user_id", user.id);

    const myMembershipByCoalition = new Map(
      (myMemberships ?? []).map((row) => [row.coalition_id, row.status])
    );

    const candidates = (rows ?? []).filter((row) => {
      const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      return project && project.status === "open" && myMembershipByCoalition.get(row.id) !== "active";
    });

    if (candidates.length === 0) {
      setOpenCoalitions([]);
      setLoadingOpen(false);
      return;
    }

    const projectIds = candidates
      .map((row) => {
        const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
        return project?.id;
      })
      .filter((id): id is string => Boolean(id));

    const { data: teamMemberRows } = await supabase
      .from("project_team_members")
      .select("project_id, role")
      .in("project_id", projectIds)
      .eq("status", "active");

    // budget_breakdown artık doğrudan sütun olarak okunamaz (bkz.
    // supabase/migrations/202609300006_budget_breakdown_privacy.sql). Bu
    // liste henüz üye olunmamış açık projeleri de gösterdiği için RPC
    // sunucu imzasız çağrılır — ilgisiz roller için para alanı döndürülmez.
    const budgetByProjectId = new Map(
      await Promise.all(
        projectIds.map(async (id) => [id, await fetchBudgetBreakdown(supabase, id)] as const)
      )
    );

    setOpenCoalitions(
      candidates.map((row) => {
        const project = (Array.isArray(row.projects) ? row.projects[0] : row.projects)!;

        const projectActiveMembers = (teamMemberRows ?? []).filter(
          (member) => member.project_id === project.id
        );

        const openRoles = getTeamCompletion(budgetByProjectId.get(project.id) ?? [], projectActiveMembers)
          .roles.filter((role) => !role.isFull)
          .map((role) => role.role);

        return {
          id: row.id,
          name: row.name,
          projectId: project.id,
          projectTitle: project.title,
          openRoles,
        };
      })
    );

    setLoadingOpen(false);
  };

  useEffect(() => {
    void loadOpenCoalitions();
  }, []);

  const filteredCoalitions = useMemo(() => {
    const normalizedSearch =
      search.trim().toLocaleLowerCase("tr-TR");

    return coalitions.filter((coalition) => {
      const matchesFilter =
        activeFilter === "all" ||
        coalition.status === activeFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        coalition.name,
        coalition.description ?? "",
        coalition.project?.title ?? "",
        coalition.myProjectRole ?? "",
        ...coalition.members.map(
          (member) =>
            member.profile?.first_name ?? ""
        ),
        ...coalition.members.map(
          (member) =>
            member.profile?.title ?? ""
        ),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(
        normalizedSearch
      );
    });
  }, [
    coalitions,
    activeFilter,
    search,
  ]);

  const activeCount = coalitions.filter(
    (coalition) =>
      coalition.status === "active"
  ).length;

  const completedCount = coalitions.filter(
    (coalition) =>
      coalition.status === "completed"
  ).length;

  const formatDate = (date: string) => {
    return new Date(
      date
    ).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getMemberName = (member: CoalitionMember) => publicDisplayName(member.profile, "Kullanıcı");

  const getAvatar = (
    member: CoalitionMember
  ) => {
    return (
      member.profile?.avatar_url || null
    );
  };

  return (
    <main className={[panelRootClass, styles.page].join(" ")}>
      <header className={styles.header}>
        <div><h1>Koalisyonlarım</h1>
        <p>Birlikte çalıştığın ekipleri, rol dağılımını ve sıradaki adımları buradan takip et.</p></div>
      </header>
      {/* Search + Filters */}
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            aria-label="Koalisyon, proje veya ekip üyesi ara"
            placeholder="Koalisyon, proje veya ekip üyesi ara..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-gray-400"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            aria-pressed={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              activeFilter === "all"
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tümü ({coalitions.length})
          </button>

          <button
            type="button"
            aria-pressed={activeFilter === "active"}
            onClick={() => setActiveFilter("active")}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              activeFilter === "active"
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Aktif ({activeCount})
          </button>

          <button
            type="button"
            aria-pressed={activeFilter === "completed"}
            onClick={() => setActiveFilter("completed")}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              activeFilter === "completed"
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tamamlanan ({completedCount})
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Koalisyonların yükleniyor...
        </div>
      )}

      {/* Error */}
      {!loading && errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
          <h2 className="font-medium text-red-800">
            Koalisyonlar yüklenemedi
          </h2>
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadCoalitions()}
            className="mt-5 rounded-xl bg-[var(--color-primary-600)] px-5 py-2.5 text-sm text-white transition hover:bg-[var(--color-primary-700)]"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading &&
        !errorMessage &&
        filteredCoalitions.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {search
                ? "Aradığın koalisyon bulunamadı"
                : activeFilter === "completed"
                  ? "Tamamlanan koalisyonun yok"
                  : "Henüz bir koalisyona dahil değilsin"}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {search
                ? "Farklı bir koalisyon adı veya ekip üyesi deneyebilirsin."
                : "Ekip projelerine katıldığında burada birlikte çalıştığın koalisyonları görebilirsin."}
            </p>
            {!search && coalitions.length === 0 && <div className={styles.emptyActions}><PanelAction href="/freelancers/discover" variant="primary">Projeleri keşfet</PanelAction><PanelAction href="/freelancers/proposals">Teklif ve davetleri gör</PanelAction></div>}
          </div>
        )}

      {!loading && !errorMessage && filteredCoalitions.length > 0 && <div className={styles.list}>
        {filteredCoalitions.map(coalition=>{
          const work=coalitionWork(coalition.project??null,coalition.stages??null,currentUserId,coalition.teamMemberIds??[]);
          const myMembership=coalition.members.find(member=>member.user_id===currentUserId);
          return <CoalitionCard key={coalition.id}
            name={coalition.name}
            projectTitle={coalition.project?.title || (coalition.project_id ? "Proje bilgileri alınamadı" : "Proje bağlantısı bulunmuyor")}
            status={coalition.status}
            members={coalition.members.map(member=>({id:member.id,name:getMemberName(member),avatarUrl:getAvatar(member)}))}
            leadingMetadata={[{label:"Projede rolün",value:coalition.myProjectRole || "Belirtilmedi"},{label:"Koalisyon görevin",value:myMembership?.role==="owner"?"Koalisyon yöneticisi":"Ekip üyesi"}]}
            metadata={[{label:coalition.project?.updated_at?"Proje güncellendi":"Koalisyon oluşturuldu",value:formatDate(coalition.project?.updated_at || coalition.created_at)}]}
            statusContent={<>
              {coalition.project && <><span>Proje</span><PanelBadge>{coalitionProjectLabel(coalition.project.status)}</PanelBadge></>}
              {!coalition.team && <span>Rol kontenjanı doğrulanamadı</span>}
              {coalition.team && <span>{coalition.team.ready ? "Tüm roller dolu" : coalition.team.filledRoles+" / "+coalition.team.totalRoles+" rol dolu"}</span>}
              {work.currentStage && <span>Aşaman: {work.currentStage.title}</span>}
            </>}
            nextStep={coalitionActionSummary(work,coalition.project??null,coalition.stages??null)}
            actionBadge={work.currentUserMustAct && <PanelBadge tone="revision">Senden aksiyon bekleniyor</PanelBadge>}
            actions={<>
              <PanelAction href={"/freelancers/coalitions/"+coalition.id} variant="primary">Ekip Alanını Aç</PanelAction>
              <PanelAction href={"/freelancers/coalitions/"+coalition.id+"#team-messages"}>Mesajlar</PanelAction>
              {coalition.project && <Link href={coalitionProjectHref(coalition.project)} className={styles.projectLink}>Bağlı projeyi gör</Link>}
            </>}
          />;
        })}
      </div>}

      {/* Diğer Aktif Koalisyonlar — henüz üyesi olmadığın, hâlâ açık
          (proje status="open") rolleri olan coalition'lar. */}
      <div className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Açık rolü olan ekipler
          </h2>
        </div>

        {loadingOpen ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Yükleniyor...
          </div>
        ) : openCoalitions.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Şu anda açık rolü olan başka bir koalisyon yok.
          </div>
        ) : (
          <div className={styles.list}>
            {openCoalitions.map((coalition) => (
              <div
                key={coalition.id}
                className={[styles.card,styles.openCard].join(" ")}
              >
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">
                    {coalition.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {coalition.projectTitle}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {coalition.openRoles.length > 0 ? (
                      coalition.openRoles.map((role) => (
                        <span
                          key={role}
                          className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                        >
                          Eksik: {role}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        Açık Rol Yok
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/freelancers/discover/${coalition.projectId}`}
                    className={buttonClasses({variant:"secondary",size:"sm"})}
                  >
                    <Send size={15} />
                    Teklif Gönder
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
