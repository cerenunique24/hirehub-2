"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
};

function FreelancerWorkroomContent() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();

  const cameFromMessages = searchParams.get("ref") === "messages";
  const backToMessagesUser = searchParams.get("user");
  const backToMessagesProposal = searchParams.get("proposal");

  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<WorkroomTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        .select("id")
        .eq("project_id", id)
        .eq("freelancer_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError || !membership) {
        setError("Bu projenin çalışma alanına erişim yetkiniz yok.");
        setLoading(false);
        return;
      }

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, client_id, title, description, budget, status, deadline")
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
          .select("id, first_name, last_name, avatar_url")
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
              last_name: profile.last_name,
              avatar_url: profile.avatar_url,
              memberRole: member.role,
              proposalId: member.proposal_id,
            };
          })
          .filter((member): member is WorkroomTeamMember => member !== null);

        setTeamMembers(formatted);
      }

      setLoading(false);
    }

    void load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <p className="text-sm text-gray-500">Çalışma alanı yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/freelancers/projects"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Projelere dön
          </Link>
          <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">Çalışma alanı görüntülenemedi</h1>
            <p className="mt-2 text-sm text-gray-500">{error || "Aradığınız proje bulunamadı."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/freelancers/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Projelere dön
          </Link>

          {cameFromMessages && backToMessagesUser && (
            <Link
              href={`/freelancers/messages?user=${encodeURIComponent(backToMessagesUser)}${
                backToMessagesProposal ? `&proposal=${encodeURIComponent(backToMessagesProposal)}` : ""
              }`}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300"
            >
              <ArrowLeft size={16} />
              Mesajlara dön
            </Link>
          )}
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{project.title}</h1>
          {project.description && (
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-gray-600">
              {project.description}
            </p>
          )}
        </section>

        <ProjectWorkroom
          project={project}
          teamMembers={teamMembers}
          viewerRole="freelancer"
          messagesBasePath="/freelancers/messages"
        />
      </div>
    </div>
  );
}

export default function FreelancerWorkroomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        </div>
      }
    >
      <FreelancerWorkroomContent />
    </Suspense>
  );
}
