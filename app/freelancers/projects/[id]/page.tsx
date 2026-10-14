"use client";

import { ProjectDetailSurface, ProjectDetailState } from "@/components/projects/ProjectDetailSurface";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import ProjectWorkroom, { type WorkroomTeamMember } from "@/components/projects/ProjectWorkroom";

type Project = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  budget: number | null;
  status: string | null;
  deadline: string | null;
  team_required: boolean | null;
  skills: string[] | null;
  project_type: string | null;
  created_at: string | null;
  team_size: number | null;
  requirements_confirmed_at: string | null;
  requirements_note: string | null;
};

function FreelancerWorkroomContent() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();

  const cameFromMessages = searchParams.get("ref") === "messages";
  const backToMessagesUser = searchParams.get("user");
  const backToMessagesProposal = searchParams.get("proposal");

  const [personalRole, setPersonalRole] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<WorkroomTeamMember[]>([]);
  const [coalitionId, setCoalitionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
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
        setError("Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.");
        setLoading(false);
        return;
      }

      // Erişim kontrolü: kullanıcı bu projenin aktif ekip üyesi mi?
      const { data: membership, error: membershipError } = await supabase
        .from("project_team_members")
        .select("id, role")
        .eq("project_id", id)
        .eq("freelancer_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError || !membership) {
        setError("Bu projenin çalışma alanına erişim yetkiniz yok.");
        setLoading(false);
        return;
      }

      setPersonalRole(membership.role ?? null);

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, client_id, title, description, budget, status, deadline, team_required, skills, project_type, created_at, team_size, requirements_confirmed_at, requirements_note")
        .eq("id", id)
        .single();

      if (projectError || !projectData) {
        setError("Proje bilgileri alınamadı.");
        setLoading(false);
        return;
      }

      setProject(projectData as Project);

      const { data: members, error: membersError } = await supabase
        .from("project_team_members")
        .select("id, freelancer_id, role, proposal_id, status")
        .eq("project_id", id)
        .eq("status", "active");

      if (!membersError && members && members.length > 0) {
        const freelancerIds = members.map((member) => member.freelancer_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, avatar_url")
          .in("id", freelancerIds);

        const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

        const formatted: WorkroomTeamMember[] = members
          .map((member) => {
            const profile = profileMap.get(member.freelancer_id);
            if (!profile) return null;
            return {
              teamMemberId: member.id,
              id: profile.id,
              first_name: profile.first_name,
              avatar_url: profile.avatar_url,
              memberRole: member.role,
              proposalId: member.proposal_id,
            };
          })
          .filter((member): member is WorkroomTeamMember => member !== null);

        setTeamMembers(formatted);
      }

      if ((projectData as Project).team_required) {
        const { data: coalitionData } = await supabase
          .from("coalitions")
          .select("id")
          .eq("project_id", id)
          .maybeSingle();

        setCoalitionId(coalitionData?.id ?? null);
      }

      setLoading(false);
    }

    void load();
  }, [id, reloadKey]);

  if (loading) return <ProjectDetailState backHref="/freelancers/projects" loading/>;
  if (error || !project) return <ProjectDetailState backHref="/freelancers/projects" error={error}/>;
  const messageHref = cameFromMessages && backToMessagesUser
    ? `/freelancers/messages?user=${encodeURIComponent(backToMessagesUser)}${backToMessagesProposal?"&proposal="+encodeURIComponent(backToMessagesProposal):""}` : undefined;
  return <ProjectDetailSurface role="freelancer" project={project} backHref="/freelancers/projects" messageHref={messageHref} memberCount={teamMembers.length} personalRole={personalRole} coalitionId={coalitionId}>
    <ProjectWorkroom identityShownAbove
      key={searchParams.get("tab")==="milestones"?"milestones":"overview"}
      initialTab={searchParams.get("tab")==="milestones"?"milestones":"overview"}
      project={project} teamMembers={teamMembers} viewerRole="freelancer"
      onProjectChanged={()=>setReloadKey(key=>key+1)}
      messagesBasePath="/freelancers/messages" isTeamProject={Boolean(project.team_required)} coalitionId={coalitionId}
    />
  </ProjectDetailSurface>;
}

export default function FreelancerWorkroomPage() {
  return (
    <Suspense
      fallback={<ProjectDetailState backHref="/freelancers/projects" loading/>}
    >
      <FreelancerWorkroomContent />
    </Suspense>
  );
}
