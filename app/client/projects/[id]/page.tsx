"use client";

import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PlayCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ProjectDetailSurface, ProjectDetailState } from "@/components/projects/ProjectDetailSurface";

import ProjectWorkroom from "@/components/projects/ProjectWorkroom";
import ProjectAnalyticsPanel from "@/components/premium/client/ProjectAnalyticsPanel";
import AiShortlistPanel from "@/components/premium/client/AiShortlistPanel";
import { notifyProjectStarted } from "@/lib/notifications";
import RequirementsConfirmation from "@/components/projects/RequirementsConfirmation";

type Project = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  budget: number | null;
  status: string | null;
  project_type: string | null;
  skills: string[] | null;
  deadline: string | null;
  created_at: string;
  team_required: boolean | null;
  team_size: number | null;
  requirements_confirmed_at: string | null;
  requirements_note: string | null;
};

type TeamMember = {
  teamMemberId: string;
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string | null;
  title: string | null;
  hourly_rate: number | null;
  memberRole: string;
  proposalId: string | null;
};

function ClientProjectDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();

  const cameFromMessages = searchParams.get("ref") === "messages";
  const backToMessagesUser = searchParams.get("user");
  const backToMessagesProposal = searchParams.get("proposal");

  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [coalitionId, setCoalitionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proposalCount, setProposalCount] = useState(0);
  const [starting, setStarting] = useState(false);
  const [requirementsReady, setRequirementsReady] = useState(false);
  const [requirementsNote, setRequirementsNote] = useState("");

  async function loadProject() {
    if (!id) {
      setError("Proje bulunamadı.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Projeyi görüntülemek için giriş yapmanız gerekiyor.");
      setLoading(false);
      return;
    }

    const { data, error: projectError } = await supabase
      .from("projects")
      .select(
        "id, client_id, title, description, budget, status, project_type, skills, deadline, created_at, team_required, team_size, requirements_confirmed_at, requirements_note"
      )
      .eq("id", id)
      .eq("client_id", user.id)
      .single();

    if (projectError) {
      console.error("PROJECT DETAIL ERROR:", projectError);
      setError("Proje bilgileri alınamadı.");
      setLoading(false);
      return;
    }

    const projectData = data as Project;
    setProject(projectData);

    const { count, error: proposalError } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id);

    if (proposalError) {
      console.error("Proje teklif sayısı alınamadı:", {
        message: proposalError.message,
        details: proposalError.details,
        hint: proposalError.hint,
        code: proposalError.code,
      });
    } else {
      setProposalCount(count ?? 0);
    }

    /*
     * Gerçek ekip project_team_members tablosundan okunur.
     * Bir üye ya kabul edilen bir proposal'dan (joined_via:
     * 'proposal') ya da kabul edilen bir davetten (joined_via:
     * 'invitation') gelmiş olabilir; ikisi de burada gösterilir.
     */
    const { data: members, error: membersError } = await supabase
      .from("project_team_members")
      .select("id, freelancer_id, role, proposal_id, status")
      .eq("project_id", id)
      .eq("status", "active");

    if (membersError) {
      console.error("Ekip üyeleri alınamadı:", {
        message: membersError.message,
        details: membersError.details,
        hint: membersError.hint,
        code: membersError.code,
      });
    } else if (members && members.length > 0) {
      const freelancerIds = members.map((member) => member.freelancer_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, role, title, hourly_rate")
        .in("id", freelancerIds);

      if (profilesError) {
        console.error("Ekip profilleri alınamadı:", {
          message: profilesError.message,
          details: profilesError.details,
          hint: profilesError.hint,
          code: profilesError.code,
        });
      } else {
        const profileMap = new Map(
          (profiles ?? []).map((profile) => [profile.id, profile])
        );

        const formattedMembers: TeamMember[] = members
          .map((member) => {
            const profile = profileMap.get(member.freelancer_id);

            if (!profile) {
              return null;
            }

            return {
              teamMemberId: member.id,
              id: profile.id,
              first_name: profile.first_name,
              avatar_url: profile.avatar_url,
              role: profile.role,
              title: profile.title,
              hourly_rate: profile.hourly_rate,
              memberRole: member.role,
              proposalId: member.proposal_id,
            };
          })
          .filter(Boolean) as TeamMember[];

        setTeamMembers(formattedMembers);
      }
    } else {
      setTeamMembers([]);
    }

    if (projectData.team_required) {
      const { data: coalitionData } = await supabase
        .from("coalitions")
        .select("id")
        .eq("project_id", id)
        .maybeSingle();

      setCoalitionId(coalitionData?.id ?? null);
    } else {
      setCoalitionId(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStartProject() {
    if (!project) return;

    setStarting(true);
    setError("");

    const supabase = createClient();

    if (!requirementsReady) {
      setError("Projeyi başlatmadan önce gereksinimlerin hazır olduğunu onaylamalısın.");
      setStarting(false);
      return;
    }

    const confirmedAt = new Date().toISOString();
    const note = requirementsNote.trim();

    const { data: startedProject, error: startError } = await supabase
      .from("projects")
      .update({
        status: "in_progress",
        requirements_confirmed_at: confirmedAt,
        requirements_note: note || null,
      })
      .eq("id", project.id)
      .eq("status", "ready_to_start")
      .select("id")
      .maybeSingle();

    if (startError) {
      console.error("Proje başlatılamadı:", startError);
      setError(
        startError.code === "P0001"
          ? startError.message
          : "Proje başlatılırken bir hata oluştu."
      );
      setStarting(false);
      return;
    }

    if (!startedProject) {
      await loadProject();
      setError("Proje başka bir sekmede güncellendi; son durumu yeniledik.");
      setStarting(false);
      return;
    }

    if (teamMembers.length > 0) {
      await notifyProjectStarted(supabase, {
        freelancerIds: teamMembers.map((member) => member.id),
        projectId: project.id,
        projectTitle: project.title,
      });
    }

    setProject((current) =>
      current
        ? {
            ...current,
            status: "in_progress",
            requirements_confirmed_at: confirmedAt,
            requirements_note: note || null,
          }
        : current
    );
    setStarting(false);
  }

  if (loading) return <ProjectDetailState backHref="/client/projects" loading/>;
  if (error || !project) return <ProjectDetailState backHref="/client/projects" error={error}/>;
  const isStarted = project.status === "in_progress" || project.status === "completed";
  const canStart = project.status === "ready_to_start";
  const messageHref = cameFromMessages && backToMessagesUser
    ? `/client/messages?user=${encodeURIComponent(backToMessagesUser)}${backToMessagesProposal?"&proposal="+encodeURIComponent(backToMessagesProposal):""}` : undefined;
  return <ProjectDetailSurface role="client" project={project} backHref="/client/projects" messageHref={messageHref} memberCount={teamMembers.length} coalitionId={coalitionId}
    actions={!isStarted?<>
            {canStart && (
              <button
                type="button"
                onClick={() => void handleStartProject()}
                disabled={starting || !requirementsReady}
                className={buttonClasses({variant:"primary"})}
              >
                <PlayCircle size={16} />
                {starting ? "Başlatılıyor..." : "Projeyi Başlat"}
              </button>
            )}

            {!isStarted && !canStart && (
              <>
                <Link
                  href={`/client/projects/${project.id}/edit`}
                  className={buttonClasses({variant:"primary"})}
                >
                  Projeyi düzenle
                </Link>

                <Link
                  href="/client/proposals"
                  className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white px-5 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)]"
                >
                  Teklifleri görüntüle ({proposalCount})
                </Link>
              </>
            )}

    </>:null}>
    {canStart&&<RequirementsConfirmation ready={requirementsReady} note={requirementsNote} onReadyChange={setRequirementsReady} onNoteChange={setRequirementsNote}/>}
    <ProjectWorkroom
      identityShownAbove
      key={searchParams.get("tab")==="milestones"?"milestones":"overview"}
      initialTab={searchParams.get("tab")==="milestones"?"milestones":"overview"}
      project={project}
      onProjectChanged={()=>void loadProject()}
      teamMembers={teamMembers}
      viewerRole="client"
      messagesBasePath="/client/messages"
      isTeamProject={Boolean(project.team_required)}
      coalitionId={coalitionId}
      onProjectCompleted={()=>setProject(current=>current?{...current,status:"completed"}:current)}
    />
    {!isStarted&&<><ProjectAnalyticsPanel/><AiShortlistPanel projectId={project.id}/></>}
  </ProjectDetailSurface>;
}

export default function ClientProjectDetailPage() {
  return (
    <Suspense
      fallback={<ProjectDetailState backHref="/client/projects" loading/>}
    >
      <ClientProjectDetailContent />
    </Suspense>
  );
}
