"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  UserPlus,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchBudgetBreakdown, getTeamCompletion, type TeamCompletion } from "@/lib/projects/teamReadiness";
import TeamMessagesPanel from "@/components/coalitions/TeamMessagesPanel";
import { panelRootClass, PanelBadge, PanelAction, PanelSection } from "@/components/dashboard/PanelPrimitives";
import { Button } from "@/components/ui/Button";
import { coalitionDetailSummary, coalitionActivity, coalitionWork, coalitionProjectLabel, coalitionProjectHref, coalitionStageLabel, type CoalitionStage } from "@/components/coalitions/coalitionPresentation";
import styles from "@/components/coalitions/Coalitions.module.css";
import { publicDisplayName } from "@/lib/utils/displayName";

type Coalition = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "completed";
  created_by: string;
  created_at: string;
  project_id: string | null;
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  deadline: string | null;
  estimated_duration: string | null;
  team_required: boolean | null;
  budget_breakdown: { role?: string; name?: string; memberCount?: number }[] | null;
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
  projectRole: string | null;
  profile: Profile | null;
};

type SelfMembership = {
  id: string; // project_team_members.id — leave_or_remove_team_member RPC bunu bekliyor.
};

export default function CoalitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const overviewRef=useRef<HTMLElement | null>(null);
  const [coalition, setCoalition] = useState<Coalition | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [teamCompletion, setTeamCompletion] = useState<TeamCompletion | null>(null);
  const [members, setMembers] = useState<CoalitionMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selfMembership, setSelfMembership] = useState<SelfMembership | null>(null);
  const [stages, setStages] = useState<CoalitionStage[] | null>(null);
  const [projectMemberIds, setProjectMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  useEffect(() => {
    const loadCoalition = async () => {
      const supabase = createClient();

      setLoading(true);
      setErrorMessage("");

      try {
        const { id } = await params;

        // --------------------------------------------------
        // 1. Kullanıcı kontrolü
        // --------------------------------------------------

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setErrorMessage("Bu sayfayı görmek için giriş yapmalısın.");
          return;
        }

        setCurrentUserId(user.id);

        // --------------------------------------------------
        // 2. Koalisyonu getir
        // --------------------------------------------------

        const {
          data: coalitionData,
          error: coalitionError,
        } = await supabase
          .from("coalitions")
          .select(
            "id, name, description, status, created_by, created_at, project_id"
          )
          .eq("id", id)
          .single();

        if (coalitionError || !coalitionData) {
          console.error("Coalition detail error:", coalitionError);

          setErrorMessage("Koalisyon bulunamadı.");
          return;
        }

        setCoalition(coalitionData);

        // --------------------------------------------------
        // 3. Mevcut kullanıcının aktif üyeliğini kontrol et
        // --------------------------------------------------

        const {
          data: currentMembership,
          error: currentMembershipError,
        } = await supabase
          .from("coalition_members")
          .select("id, status")
          .eq("coalition_id", id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (currentMembershipError) {
          console.error(
            "Current membership error:",
            currentMembershipError
          );

          setErrorMessage(
            "Koalisyon üyeliğin kontrol edilirken bir hata oluştu."
          );

          return;
        }

        if (!currentMembership) {
          setErrorMessage("Bu koalisyonun aktif bir üyesi değilsin.");
          return;
        }

        // --------------------------------------------------
        // 4. Bağlı projeyi getir
        // --------------------------------------------------

        let projectRoleByFreelancer = new Map<string, string>();

        if (coalitionData.project_id) {
          const {
            data: projectData,
            error: projectError,
          } = await supabase
            .from("projects")
            .select(
              "id, title, description, status, created_at, deadline, estimated_duration, team_required"
            )
            .eq("id", coalitionData.project_id)
            .maybeSingle();

          if (projectError) {
            console.error("Project detail error:", projectError);

            setErrorMessage(
              "Koalisyona bağlı proje bilgileri alınamadı."
            );

            return;
          }

          // budget_breakdown artık doğrudan sütun olarak okunamaz (bkz.
          // supabase/migrations/202609300006_budget_breakdown_privacy.sql).
          const budgetBreakdown = projectData
            ? await fetchBudgetBreakdown(supabase, projectData.id)
            : [];

          setProject(projectData ? { ...projectData, budget_breakdown: budgetBreakdown } : null);

          if (projectData) {
            const { data: teamMemberRows, error: teamMemberError } = await supabase
              .from("project_team_members")
              .select("freelancer_id, role")
              .eq("project_id", projectData.id)
              .eq("status", "active");

            if (teamMemberError) {
              setErrorMessage("Ekip rolleri yüklenemedi. Lütfen sayfayı yenile.");
              return;
            }

            setTeamCompletion(
              budgetBreakdown.length ? getTeamCompletion(
                budgetBreakdown,
                (teamMemberRows ?? []).map((row) => ({ role: row.role }))
              ) : null
            );

            setProjectMemberIds((teamMemberRows ?? []).map(row=>row.freelancer_id));

            projectRoleByFreelancer = new Map(
              (teamMemberRows ?? []).map((row) => [row.freelancer_id, row.role as string])
            );

            const { data: selfRow } = await supabase
              .from("project_team_members")
              .select("id")
              .eq("project_id", projectData.id)
              .eq("freelancer_id", user.id)
              .eq("status", "active")
              .maybeSingle();

            setSelfMembership(selfRow ? { id: selfRow.id } : null);
          }
        } else {
          setProject(null);
          setTeamCompletion(null);
          setSelfMembership(null);
        }

        // --------------------------------------------------
        // 5. Koalisyon üyelerini getir
        // --------------------------------------------------

        const {
          data: memberData,
          error: memberError,
        } = await supabase
          .from("coalition_members")
          .select(
            "id, coalition_id, user_id, role, status, joined_at"
          )
          .eq("coalition_id", id)
          .eq("status", "active")
          .order("joined_at", {
            ascending: true,
          });

        if (memberError) {
          console.error("Coalition members error:", memberError);

          setErrorMessage("Koalisyon üyeleri yüklenemedi.");
          return;
        }

        // --------------------------------------------------
        // 6. Üye ID'lerini oluştur
        // --------------------------------------------------

        const memberUserIds = [
          ...new Set(
            (memberData ?? []).map((member) => member.user_id)
          ),
        ];

        // --------------------------------------------------
        // 7. Profilleri getir
        // --------------------------------------------------

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
            console.error("Profiles error:", profileError);

            setErrorMessage(
              `Profil bilgileri alınamadı: ${
                profileError.message ||
                "Bilinmeyen Supabase hatası"
              }`
            );

            return;
          }

          profileData = profiles ?? [];
        }

        // --------------------------------------------------
        // 8. Üyeler + profilleri birleştir
        // --------------------------------------------------

        const normalizedMembers: CoalitionMember[] =
          (memberData ?? []).map((member) => {
            const profile =
              profileData.find(
                (item) => item.id === member.user_id
              ) ?? null;

            return {
              id: member.id,
              coalition_id: member.coalition_id,
              user_id: member.user_id,
              role: member.role,
              status: member.status,
              joined_at: member.joined_at,
              projectRole: projectRoleByFreelancer.get(member.user_id) ?? null,
              profile,
            };
          });

        setMembers(normalizedMembers);
        if(coalitionData.project_id) {
          const result = await supabase.from("project_milestones")
            .select("id, project_id, title, status, freelancer_id, due_date, sort_order, submitted_at, approved_at, revision_requested_at")
            .eq("project_id",coalitionData.project_id).order("sort_order",{ascending:true});
          if(result.error) console.error("Coalition milestones could not be loaded",result.error);
          setStages(result.error ? null : result.data as CoalitionStage[]);
        } else setStages([]);

      } catch (error) {
        console.error(
          "Coalition detail page error:",
          error
        );

        setErrorMessage(
          "Koalisyon yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadCoalition();
  }, [params]);

  useEffect(() => {
    if (loading || errorMessage) return;
    const frame=requestAnimationFrame(() => {
      if(window.location.hash==="#team-messages") document.getElementById("team-messages")?.scrollIntoView({block:"start"});
      else overviewRef.current?.scrollIntoView({block:"start"});
    });
    return () => cancelAnimationFrame(frame);
  }, [loading,errorMessage]);

  const handleLeave = async () => {
    if (!selfMembership) return;

    setLeaving(true);
    setLeaveError("");

    const supabase = createClient();
    const { error } = await supabase.rpc("leave_or_remove_team_member", {
      p_member_id: selfMembership.id,
    });

    if (error) {
      console.error("Ekipten ayrılma hatası:", error);
      setLeaveError(
        error.code === "P0001" ? error.message : "Ekipten ayrılırken bir hata oluştu."
      );
      setLeaving(false);
      return;
    }

    router.push("/freelancers/coalitions?left=1");
  };

  // --------------------------------------------------
  // Yardımcı fonksiyonlar
  // --------------------------------------------------

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getMemberName = (member: CoalitionMember) => {
    return publicDisplayName(member.profile, "Kullanıcı");
  };

  const isProjectOwner = (member: CoalitionMember) =>
    member.role === "owner" ||
    (coalition !== null && member.user_id === coalition.created_by);

  const getInitial = (member: CoalitionMember) => {
    return getMemberName(member)
      .charAt(0)
      .toLocaleUpperCase("tr-TR");
  };

  const isCurrentUser = (member: CoalitionMember) => {
    return member.user_id === currentUserId;
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <main className={[panelRootClass, styles.page].join(" ")}>
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Loader2
            size={24}
            className="mx-auto animate-spin text-gray-400"
          />

          <p className="mt-4 text-sm text-gray-500">
            Koalisyon yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  if (errorMessage || !coalition) {
    return (
      <main className={[panelRootClass, styles.page].join(" ")}>
        <Link
          href="/freelancers/coalitions"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Koalisyonlarım
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-800">
            Koalisyon yüklenemedi
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {errorMessage}
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Main
  // --------------------------------------------------

  const work=coalitionWork(project,stages,currentUserId,projectMemberIds);
  const statusSummary=coalitionDetailSummary(work,project,stages);
  const stagesHref=project ? coalitionProjectHref(project)+"?tab=milestones" : "";
  const ownMember=members.find(member=>isCurrentUser(member));
  const roleCapacityKnown=Boolean(project?.budget_breakdown?.length);
  const events=coalitionActivity(coalition.created_at,members.map(member=>({id:member.id,joined_at:member.joined_at,name:getMemberName(member)})),stages);

  return (
    <main ref={overviewRef} className={[panelRootClass,styles.page].join(" ")}>
      <Link href="/freelancers/coalitions" className={styles.back}><ArrowLeft size={16} />Koalisyonların</Link>
      {leaveError && <div className={styles.error} role="alert">{leaveError}</div>}
      <header className={styles.detailHeader}>
        <div>
          <span className={styles.eyebrow}>Ekip koordinasyon alanı</span>
          <div className={styles.cardHeading}><h1>{coalition.name}</h1><div className={styles.labeledBadge}><span>Koalisyon</span><PanelBadge>{coalition.status==="active"?"Aktif":"Tamamlandı"}</PanelBadge></div></div>
          <p className={styles.projectName}>{project?.title || (coalition.project_id ? "Proje bilgileri alınamadı" : "Proje bağlantısı bulunmuyor")}</p>
          <p className={styles.secondary}>Senin rolün: {ownMember?.projectRole || "Proje rolü belirtilmedi"} · {members.length} ekip üyesi</p>
          {project && <div className={styles.statusLine}><span>Proje</span><PanelBadge>{coalitionProjectLabel(project.status)}</PanelBadge></div>}
        </div>
        <div className={styles.actions}>
          {currentUserId && <PanelAction href="#team-messages"><MessageSquare size={16} />Mesajlara git</PanelAction>}
          {project && <PanelAction href={coalitionProjectHref(project)}>Bağlı projeyi gör</PanelAction>}
        </div>
      </header>
      <section className={styles.coordinationSummary} data-action-required={work.currentUserMustAct} aria-labelledby="workflow-heading">
        <div className={styles.workflowTop}>
          <div><p className={styles.eyebrow}>Şu anki durum</p><h2 id="workflow-heading">{statusSummary.headline}</h2></div>
          <PanelBadge tone={statusSummary.tone}>{work.state}</PanelBadge>
        </div>
        <p className={styles.nextStep}>{work.nextStep}</p>
        <dl className={styles.coordinationFacts}>
          <div><dt>Aksiyon sahibi</dt><dd>{work.currentUserMustAct ? "Sen" : work.actionOwner}</dd></div>
          <div><dt>Senin aşaman</dt><dd>{stages===null ? "Doğrulanamadı" : work.currentStage?.title || (work.total>0 && work.approved===work.total ? "Aşamalar onaylandı" : "Sana atanmış açık aşama yok")}</dd></div>
          <div><dt>Deadline</dt><dd>{work.currentStage?.due_date ? formatDate(work.currentStage.due_date) : project?.deadline ? formatDate(project.deadline) : "Belirtilmedi"}</dd></div>
        </dl>
        {project && work.currentUserMustAct && <PanelAction href={stagesHref} variant="primary">{work.currentStage?.status==="revision" ? "Revizyonu Aç" : "Aşamaları Yönet"}</PanelAction>}
      </section>
      <PanelSection title="Ekip ve rol dağılımı" className={styles.section}>
        <div className={styles.sectionBody}>
          <div className={styles.statusLine}><span>{members.length} aktif koalisyon üyesi</span>
            {teamCompletion && roleCapacityKnown ? <PanelBadge tone="warning">{teamCompletion.ready ? "Tüm roller dolu" : teamCompletion.filledRoles+" / "+teamCompletion.totalRoles+" rol dolu"}</PanelBadge> : <span>Rol kontenjanı bilgisi bulunmuyor</span>}
          </div>
          {members.length===0 ? <p className={styles.secondary}>Henüz aktif ekip üyesi yok.</p> : members.map(member=><div key={member.id} className={isCurrentUser(member)?styles.selfRow:styles.memberRow}>
            <div className={styles.memberIdentity}>
              {member.profile?.avatar_url ? <Image unoptimized src={member.profile.avatar_url} width={32} height={32} alt="" className={styles.avatar} /> : <span className={styles.avatar}>{getInitial(member)}</span>}
              <div><div className={styles.statusLine}><strong>{getMemberName(member)}</strong>{isCurrentUser(member)&&<PanelBadge tone="info">Sen</PanelBadge>}</div>
                <p>{member.projectRole || "Proje rolü belirtilmedi"}</p>
                {isProjectOwner(member)&&<span className={styles.metaLabel}>Koalisyon yöneticisi</span>}
              </div>
            </div><PanelBadge>Aktif</PanelBadge>
          </div>)}
          {teamCompletion && roleCapacityKnown && <div className={styles.roleCapacity}><h3>Rol kontenjanları</h3>{teamCompletion.roles.map(role=><div key={role.role} className={styles.roleRow}><span>{role.role}</span><span>{role.filled} / {role.capacity} kişi</span></div>)}</div>}
        </div>
      </PanelSection>
        <PanelSection title="Proje ilerlemesi" className={styles.section}>
          <div className={styles.sectionBody}>
            {stages===null ? <p className={styles.secondary}>Aşama bilgileri alınamadı. Çalışma alanını kontrol edebilirsin.</p> : stages.length===0 ? <p className={styles.secondary}>Henüz proje aşaması tanımlanmadı.</p> : <>
              <div className={styles.progressLabel}><span>{work.approved} / {work.total} aşama onaylandı</span><span>{Math.round(work.approved/work.total*100)}%</span></div>
              <progress className={styles.progress} max={work.total} value={work.approved} aria-label="Onaylanan ekip aşamaları" />
              {stages.slice(0,3).map(stage=><div key={stage.id} className={styles.stageRow}><div><strong>{stage.title}</strong><p className={styles.secondary}>{stage.freelancer_id ? (members.find(member=>member.user_id===stage.freelancer_id) ? getMemberName(members.find(member=>member.user_id===stage.freelancer_id)!) : "Sorumlu üye bilgisi görünmüyor") : "Sorumlu atanmadı"}{stage.due_date && " · "+formatDate(stage.due_date)}</p></div><PanelBadge>{coalitionStageLabel(stage.status)}</PanelBadge></div>)}
            </>}
            {project && <Link href={stagesHref} className={styles.projectLink}>Tüm aşamaları projede gör{stages && stages.length>3 ? " · "+stages.length+" aşama" : ""}</Link>}
          </div>
        </PanelSection>
        <PanelSection title="Son hareketler" className={styles.section}><ol className={styles.activity}>{events.map(event=><li key={event.id}><p>{event.text}</p><time dateTime={event.date}>{formatDate(event.date)}</time></li>)}</ol>{stages===null && <p className={styles.sectionBody}>Teslim ve revizyon hareketleri alınamadı.</p>}</PanelSection>
      {currentUserId && <PanelSection title="Ekip iletişimi" className={styles.section}><div id="team-messages" className={styles.sectionBody}><p className={styles.secondary}>Rol paylaşımı ve proje koordinasyonunu ekibinle burada konuş.</p><div className={styles.messageBody}><TeamMessagesPanel coalitionId={coalition.id} currentUserId={currentUserId} memberLabels={members.map(member=>({id:member.user_id,name:getMemberName(member)}))} /></div></div></PanelSection>}
      {coalition.status==="active" && <section className={styles.management} aria-label="Koalisyon yönetimi">
        <div><h2>Koalisyon yönetimi</h2><p className={styles.secondary}>Üye önerilerini ve ekipten ayrılma işlemini buradan yönet.</p></div>
        <div className={styles.actions}>
          <PanelAction href={"/freelancers/freelancers?coalitionId="+coalition.id}><UserPlus size={16} />Ekip üyesi öner</PanelAction>
          {selfMembership && <Button size="sm" variant="secondary" disabled={leaving} onClick={()=>{if(window.confirm("Bu ekipten ayrılmak istediğine emin misin?")) void handleLeave();}}>{leaving?<Loader2 size={16} className="animate-spin" />:<LogOut size={16} />}Ekipten ayrıl</Button>}
        </div>
      </section>}
    </main>
  );
}
