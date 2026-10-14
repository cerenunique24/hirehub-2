"use client";

import { CoalitionWorkspace, CoalitionWorkspaceState, WorkspaceMemberRow } from "@/components/coalitions/CoalitionWorkspace";
import { coalitionActivity, type CoalitionStage } from "@/components/coalitions/coalitionPresentation";
import { coalitionUpdatedDate } from "@/components/coalitions/clientCoalitionPresentation";
import { resolveProjectWorkflowState } from "@/lib/projects/workflow-state";
import { PanelAction } from "@/components/dashboard/PanelPrimitives";
import styles from "@/components/coalitions/Coalitions.module.css";
import { buttonClasses } from "@/components/ui/Button";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  PlayCircle,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uniqueSkills } from "@/lib/matching";
import {
  fetchBudgetBreakdown,
  getTeamCompletion,
  type TeamCompletion,
} from "@/lib/projects/teamReadiness";

import RequirementsConfirmation from "@/components/projects/RequirementsConfirmation";
import { publicDisplayName } from "@/lib/utils/displayName";

type Coalition = {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
  status: string;
  created_at: string;
};

type LinkedProject = {
  id: string;
  title: string;
  status: string | null;
  client_id: string;
  deadline: string | null;
  team_required: boolean | null;
  budget_breakdown: { role?: string; name?: string; memberCount?: number }[] | null;
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  title: string | null;
  expertise: string | null;
  skills: string[] | null;
};

type Member = {
  id: string;
  user_id: string;
  role: string | null;
  projectRole: string | null;
  teamMemberId: string | null;
  joined_at: string;
  profile: Profile | null;
};

type PendingMember = {
  id: string;
  user_id: string;
  role: string | null;
  invited_by: string | null;
  profile: Profile | null;
  inviter: Profile | null;
};

export default function ClientCoalitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [stages, setStages] = useState<CoalitionStage[] | null>(null);
  const [coalition, setCoalition] = useState<Coalition | null>(null);
  const [project, setProject] = useState<LinkedProject | null>(null);
  const [teamCompletion, setTeamCompletion] = useState<TeamCompletion | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [requirementsReady, setRequirementsReady] = useState(false);
  const [requirementsNote, setRequirementsNote] = useState("");
  const [error, setError] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const loadCoalition = async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUserId(user?.id ?? null);

    const {
      data: coalitionData,
      error: coalitionError,
    } = await supabase
      .from("coalitions")
      .select("id, name, description, project_id, status, created_at")
      .eq("id", id)
      .eq("status", "active")
      .single();

    if (coalitionError || !coalitionData) {
      setError("Koalisyon bulunamadı veya görüntüleme izniniz yok.");
      setLoading(false);
      return;
    }

    setCoalition(coalitionData as Coalition);

    let linkedProject: LinkedProject | null = null;

    if (coalitionData.project_id) {
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, title, status, client_id, deadline, team_required")
        .eq("id", coalitionData.project_id)
        .maybeSingle();

      if (projectData) {
        // budget_breakdown artık doğrudan sütun olarak okunamaz (bkz.
        // supabase/migrations/202609300006_budget_breakdown_privacy.sql).
        const budgetBreakdown = await fetchBudgetBreakdown(supabase, projectData.id);
        linkedProject = { ...projectData, budget_breakdown: budgetBreakdown } as LinkedProject;
      }
      setProject(linkedProject);
    } else {
      setProject(null);
    }

    if (linkedProject) {
      const result = await supabase.from("project_milestones")
        .select("id, project_id, title, status, freelancer_id, due_date, sort_order, submitted_at, approved_at, revision_requested_at")
        .eq("project_id", linkedProject.id).order("sort_order", {ascending:true});
      setStages(result.error ? null : result.data as CoalitionStage[]);
    } else setStages(null);

    const {
      data: memberRows,
      error: memberError,
    } = await supabase
      .from("coalition_members")
      .select("id, user_id, role, joined_at")
      .eq("coalition_id", id)
      .eq("status", "active")
      .order("joined_at");

    if (memberError) {
      setError("Koalisyon üyeleri yüklenemedi.");
      setLoading(false);
      return;
    }

    const activeUserIds = (memberRows ?? []).map(
      (member) => member.user_id
    );

    const {
      data: activeProfiles,
    } = activeUserIds.length
      ? await supabase
          .from("profiles")
          .select(
            "id, first_name, avatar_url, title, expertise, skills"
          )
          .in("id", activeUserIds)
      : { data: [] };

    const activeProfileById = new Map(
      ((activeProfiles ?? []) as Profile[]).map((profile) => [
        profile.id,
        profile,
      ])
    );

    let activeTeamMembers: { role: string | null }[] = [];
    let projectRoleByFreelancer = new Map<string, string>();
    let teamMemberIdByFreelancer = new Map<string, string>();

    if (linkedProject) {
      const { data: teamMemberRows } = await supabase
        .from("project_team_members")
        .select("id, freelancer_id, role")
        .eq("project_id", linkedProject.id)
        .eq("status", "active");

      activeTeamMembers = (teamMemberRows ?? []).map((row) => ({
        role: row.role,
      }));

      projectRoleByFreelancer = new Map(
        (teamMemberRows ?? []).map((row) => [row.freelancer_id, row.role as string])
      );

      teamMemberIdByFreelancer = new Map(
        (teamMemberRows ?? []).map((row) => [row.freelancer_id, row.id as string])
      );

      setTeamCompletion(
        getTeamCompletion(linkedProject.budget_breakdown, activeTeamMembers)
      );
    } else {
      setTeamCompletion(null);
    }

    setMembers(
      (memberRows ?? []).map((member) => ({
        ...member,
        projectRole: projectRoleByFreelancer.get(member.user_id) ?? null,
        teamMemberId: teamMemberIdByFreelancer.get(member.user_id) ?? null,
        profile:
          activeProfileById.get(member.user_id) ?? null,
      })) as Member[]
    );

    const {
      data: pendingRows,
      error: pendingError,
    } = await supabase
      .from("coalition_members")
      .select(
        "id, user_id, role, invited_by"
      )
      .eq("coalition_id", id)
      .eq("status", "pending")
      .order("joined_at", {
        ascending: false,
      });

    if (pendingError) {
      console.error(
        "Bekleyen ekip önerileri yüklenirken hata:",
        pendingError
      );
      setPendingMembers([]);
      setLoading(false);
      return;
    }

    const pendingUserIds = (pendingRows ?? []).map(
      (member) => member.user_id
    );

    const inviterIds = (pendingRows ?? [])
      .map((member) => member.invited_by)
      .filter((value): value is string => Boolean(value));

    const allProfileIds = Array.from(
      new Set([...pendingUserIds, ...inviterIds])
    );

    const {
      data: pendingProfiles,
    } = allProfileIds.length
      ? await supabase
          .from("profiles")
          .select(
            "id, first_name, avatar_url, title, expertise, skills"
          )
          .in("id", allProfileIds)
      : { data: [] };

    const pendingProfileById = new Map(
      ((pendingProfiles ?? []) as Profile[]).map((profile) => [
        profile.id,
        profile,
      ])
    );

    setPendingMembers(
      (pendingRows ?? []).map((member) => ({
        ...member,
        profile:
          pendingProfileById.get(member.user_id) ?? null,
        inviter: member.invited_by
          ? pendingProfileById.get(member.invited_by) ?? null
          : null,
      })) as PendingMember[]
    );

    setLoading(false);
  };

  useEffect(() => {
    void loadCoalition();
  }, [id, supabase]);

  useEffect(() => {
    if (loading || error || window.location.hash !== "#team-messages") return;
    const frame = requestAnimationFrame(() => {
      document.getElementById("team-messages")?.scrollIntoView({block:"start"});
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, error]);

  const handleApprove = async (memberId: string) => {
    setProcessingId(memberId);
    setError("");

    const { error: updateError } = await supabase
      .from("coalition_members")
      .update({
        status: "active",
        joined_at: new Date().toISOString(),
      })
      .eq("id", memberId)
      .eq("coalition_id", id)
      .eq("status", "pending");

    if (updateError) {
      console.error(
        "Ekip üyesi onaylanırken hata:",
        updateError
      );
      setError(
        "Ekip üyesi onaylanırken bir hata oluştu."
      );
      setProcessingId(null);
      return;
    }

    await loadCoalition();
    setProcessingId(null);
  };

  const handleReject = async (memberId: string) => {
    setProcessingId(memberId);
    setError("");

    const { error: deleteError } = await supabase
      .from("coalition_members")
      .delete()
      .eq("id", memberId)
      .eq("coalition_id", id)
      .eq("status", "pending");

    if (deleteError) {
      console.error(
        "Ekip üyesi önerisi reddedilirken hata:",
        deleteError
      );
      setError(
        "Ekip üyesi önerisi reddedilirken bir hata oluştu."
      );
      setProcessingId(null);
      return;
    }

    await loadCoalition();
    setProcessingId(null);
  };

  const handleRemoveMember = async (teamMemberId: string) => {
    if (!window.confirm("Bu ekip üyesini projeden çıkarmak istediğine emin misin?")) {
      return;
    }

    setRemovingMemberId(teamMemberId);
    setError("");

    const { error: rpcError } = await supabase.rpc("leave_or_remove_team_member", {
      p_member_id: teamMemberId,
    });

    if (rpcError) {
      console.error("Ekip üyesi çıkarma hatası:", rpcError);
      setError(
        rpcError.code === "P0001" ? rpcError.message : "Ekip üyesi çıkarılırken bir hata oluştu."
      );
      setRemovingMemberId(null);
      return;
    }

    await loadCoalition();
    setRemovingMemberId(null);
  };

  const isProjectClient =
    !!project && !!currentUserId && project.client_id === currentUserId;

  const canStartProject =
    isProjectClient &&
    project?.status === "ready_to_start" &&
    teamCompletion?.ready === true;

  const handleStartProject = async () => {
    if (!project || !canStartProject) return;

    setStarting(true);
    setError("");

    if (!requirementsReady) {
      setError("Projeyi başlatmadan önce gereksinimlerin hazır olduğunu onaylamalısın.");
      setStarting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        status: "in_progress",
        requirements_confirmed_at: new Date().toISOString(),
        requirements_note: requirementsNote.trim() || null,
      })
      .eq("id", project.id)
      .eq("status", "ready_to_start");

    if (updateError) {
      console.error("Proje başlatma hatası:", updateError);
      setError(
        updateError.code === "P0001"
          ? updateError.message
          : "Proje başlatılırken bir hata oluştu."
      );
      setStarting(false);
      return;
    }

    router.push(`/client/projects/${project.id}`);
  };

  if (loading) return <CoalitionWorkspaceState backHref="/client/coalitions" loading/>;
  if (!coalition) return <CoalitionWorkspaceState backHref="/client/coalitions" error={error}/>;

  const skills = uniqueSkills(members.map(member => member.profile?.skills));
  const work = project?.status === "in_progress" && stages === null
    ? {state:"Aşama bilgileri alınamadı",nextStep:"Sıradaki adımı bağlı proje alanından kontrol et.",actionOwner:"Doğrulanamadı",currentUserMustAct:false}
    : resolveProjectWorkflowState({projectStatus:project?.status ?? null,viewerRole:"client",isTeamProject:project?.team_required!==false,milestones:stages??[],currentUserId,teamMemberIds:members.map(member=>member.user_id)});
  const needsApproval = isProjectClient && pendingMembers.length > 0;
  const mustAct = isProjectClient && (needsApproval || work.currentUserMustAct);
  const currentStage = stages?.find(stage=>stage.status==="submitted" || stage.status==="in_review") ?? stages?.find(stage=>stage.status!=="approved");
  const events = coalitionActivity(coalition.created_at,members.map(member=>({id:member.id,joined_at:member.joined_at,name:publicDisplayName(member.profile,"Ekip üyesi")})),stages);
  const stagesHref = project ? "/client/projects/"+project.id+"?tab=milestones" : "";
  return <CoalitionWorkspace backHref="/client/coalitions" name={coalition.name} coalitionStatus={coalition.status}
    project={project ? {title:project.title,status:project.status ?? ""} : null}
    headerContext={teamCompletion&&project?.budget_breakdown?.length ? teamCompletion.filledRoles+" / "+teamCompletion.totalRoles+" rol dolu" : "Rol kontenjanı doğrulanamadı"}
    error={error}
    members={members.map(member=>({id:member.id,userId:member.user_id,name:publicDisplayName(member.profile,"Ekip üyesi"),avatarUrl:member.profile?.avatar_url || null,projectRole:member.projectRole || member.profile?.title || member.profile?.expertise || null,owner:member.role==="owner",self:member.user_id===currentUserId,
      actions:isProjectClient&&member.role!=="owner"&&member.teamMemberId?<button type="button" disabled={removingMemberId===member.teamMemberId} onClick={()=>void handleRemoveMember(member.teamMemberId!)} className={buttonClasses({variant:"secondary",size:"sm"})}>{removingMemberId===member.teamMemberId&&<Loader2 size={13} className="animate-spin"/>}Ekipten Çıkar</button>:null}))}
    team={teamCompletion} roleCapacityKnown={Boolean(project?.budget_breakdown?.length)}
    status={{headline:needsApproval?pendingMembers.length+" ekip önerisi onay bekliyor":work.state,state:work.state,tone:mustAct?"info":"neutral",nextStep:needsApproval?"Bekleyen ekip önerilerini yönetim bölümünden değerlendir.":project?work.nextStep:"Proje bağlantısını kontrol et.",mustAct,
      facts:[{label:"Aksiyon sahibi",value:mustAct?"Sen":work.actionOwner},{label:"Mevcut aşama",value:stages===null?"Doğrulanamadı":currentStage?.title || (stages.length?"Aşamalar onaylandı":"Henüz aşama yok")},{label:"Deadline",value:currentStage?.due_date?coalitionUpdatedDate(currentStage.due_date):coalitionUpdatedDate(project?.deadline ?? null)}],
      action:needsApproval?<PanelAction href="#workspace-management" variant="primary">Önerileri değerlendir</PanelAction>:isProjectClient&&canStartProject?<PanelAction href="#workspace-management" variant="primary">Başlatma adımına git</PanelAction>:project&&isProjectClient&&work.currentUserMustAct?<PanelAction href={stagesHref} variant="primary">Aşamaları Yönet</PanelAction>:null}}
    stages={stages} stagesHref={stagesHref} events={events} formatDate={coalitionUpdatedDate} coalitionId={coalition.id} currentUserId={currentUserId}
    description={coalition.description} skills={skills}
    management={isProjectClient&&(pendingMembers.length>0||(teamCompletion&&project?.status!=="in_progress"))?<div id="workspace-management">
      {pendingMembers.length>0&&<><h3>Bekleyen ekip önerileri</h3>{pendingMembers.map(member=><WorkspaceMemberRow key={member.id} status="Onay bekliyor" detail={<p className={styles.metaLabel}>{publicDisplayName(member.inviter,"Ekip üyesi")} tarafından önerildi</p>} member={{id:member.id,userId:member.user_id,name:publicDisplayName(member.profile,"Ekip üyesi"),avatarUrl:member.profile?.avatar_url || null,projectRole:member.profile?.title || member.profile?.expertise || member.role,owner:false,self:false,actions:<>
        <button type="button" disabled={processingId===member.id} onClick={()=>void handleReject(member.id)} className={buttonClasses({variant:"secondary",size:"sm"})}><X size={16}/>Reddet</button>
        <button type="button" disabled={processingId===member.id} onClick={()=>void handleApprove(member.id)} className={buttonClasses({variant:"primary",size:"sm"})}>{processingId===member.id?<Loader2 size={16} className="animate-spin"/>:<Check size={16}/>}Onayla</button>
      </>}}/>)}</>}
      {teamCompletion&&project?.status!=="in_progress"&&<><div className={styles.section}>
        {canStartProject&&<RequirementsConfirmation ready={requirementsReady} note={requirementsNote} onReadyChange={setRequirementsReady} onNoteChange={setRequirementsNote}/>}
        <button type="button" disabled={!canStartProject||starting||!requirementsReady} onClick={()=>void handleStartProject()} className={buttonClasses({variant:"primary"})}>{starting?<Loader2 size={16} className="animate-spin"/>:<PlayCircle size={16}/>}Projeyi Başlat</button>
        {!teamCompletion.ready&&<p className={styles.secondary}>Eksik roller için freelancer aramaya devam edebilirsin.</p>}
      </div></>}
    </div>:null}
  />;
}
