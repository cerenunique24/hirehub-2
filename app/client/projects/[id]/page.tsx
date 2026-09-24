"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  PlayCircle,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ProjectFiles from "@/components/projects/ProjectFiles";
import ProjectWorkroom from "@/components/projects/ProjectWorkroom";
import ProjectAnalyticsPanel from "@/components/premium/client/ProjectAnalyticsPanel";
import AiShortlistPanel from "@/components/premium/client/AiShortlistPanel";
import { notifyUsers } from "@/lib/notifications";

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

function getStatusLabel(status: string | null) {
  switch (status) {
    case "open":
      return "Yayında";
    case "ready_to_start":
      return "Ekip hazır";
    case "in_progress":
      return "Devam ediyor";
    case "completed":
      return "Tamamlandı";
    case "cancelled":
      return "İptal edildi";
    default:
      return status || "Bilinmiyor";
  }
}

function getStatusClass(status: string | null) {
  switch (status) {
    case "open":
      return "border-green-200 bg-green-50 text-green-700";
    case "ready_to_start":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "in_progress":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "completed":
      return "border-[var(--color-border-strong)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]";
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) {
    return "Belirtilmedi";
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

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

function getFullName(member: TeamMember) {
  const name = [member.first_name, member.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Freelancer";
}

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
        "id, client_id, title, description, budget, status, project_type, skills, deadline, created_at, team_required, team_size"
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
        .select("id, first_name, last_name, avatar_url, role, title, hourly_rate")
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
              last_name: profile.last_name,
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

    const { error: startError } = await supabase
      .from("projects")
      .update({ status: "in_progress" })
      .eq("id", project.id)
      .eq("status", "ready_to_start");

    if (startError) {
      console.error("Proje başlatılamadı:", startError);
      setError("Proje başlatılırken bir hata oluştu.");
      setStarting(false);
      return;
    }

    if (teamMembers.length > 0) {
      await notifyUsers(
        supabase,
        teamMembers.map((member) => ({
          userId: member.id,
          type: "project_started",
          title: "Proje başladı",
          message: `"${project.title}" projesi başladı. Çalışma alanına gidebilirsin.`,
          link: `/freelancers/projects/${project.id}`,
        }))
      );
    }

    setProject((current) =>
      current ? { ...current, status: "in_progress" } : current
    );
    setStarting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-5 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Proje yükleniyor...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 p-5 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/client/projects"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Projelere dön
          </Link>

          <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">
              Proje görüntülenemedi
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {error || "Aradığınız proje bulunamadı."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isStarted =
    project.status === "in_progress" ||
    project.status === "completed";

  const canStart = project.status === "ready_to_start";

  return (
    <div className="min-h-screen bg-gray-50 p-5 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/client/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Projelere dön
          </Link>

          {cameFromMessages && backToMessagesUser && (
            <Link
              href={`/client/messages?user=${encodeURIComponent(
                backToMessagesUser
              )}${
                backToMessagesProposal
                  ? `&proposal=${encodeURIComponent(
                      backToMessagesProposal
                    )}`
                  : ""
              }`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300"
            >
              <ArrowLeft size={16} />
              Mesaja dön
            </Link>
          )}
        </div>

        <div className="space-y-5">
          {/* HEADER */}
          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "rounded-full border px-3 py-1 text-xs font-medium " +
                      getStatusClass(project.status)
                    }
                  >
                    {getStatusLabel(project.status)}
                  </span>

                  {project.project_type && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                      {project.project_type}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-semibold tracking-[-0.01em] text-gray-900">
                  {project.title}
                </h1>

                <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-gray-600">
                  {project.description}
                </p>
              </div>

              <div className="shrink-0 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
                <p className="text-xs font-medium text-gray-500">
                  Bütçe
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {formatCurrency(project.budget)}
                </p>
              </div>
            </div>
          </section>

          {isStarted ? (
            <ProjectWorkroom
              project={{
                id: project.id,
                client_id: project.client_id,
                title: project.title,
                budget: project.budget,
                status: project.status,
                deadline: project.deadline,
              }}
              teamMembers={teamMembers}
              viewerRole="client"
              messagesBasePath="/client/messages"
              isTeamProject={Boolean(project.team_required)}
              onProjectCompleted={() =>
                setProject((current) => (current ? { ...current, status: "completed" } : current))
              }
            />
          ) : (
            <>
          {/* ACTIVE PROJECT TEAM — proje daha başlamadan önce ekibin kim
              olduğu, özet kartlardan daha üstte, hemen görünür olsun. */}
          {teamMembers.length > 0 && (
            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Proje ekibi
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Bu projede çalışan freelancerlar
                  </p>
                </div>

                <span className="text-sm font-medium text-gray-500">
                  {teamMembers.length} kişi
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.teamMemberId}
                    className="flex flex-col gap-4 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={getFullName(member)}
                          className="h-12 w-12 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                          {getFullName(member)
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">
                          {getFullName(member)}
                        </p>

                        <p className="mt-0.5 text-sm text-gray-500">
                          {member.memberRole ||
                            member.title ||
                            "Freelancer"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-5 sm:justify-end">
                      <Link
                        href={`/client/messages?user=${encodeURIComponent(
                          member.id
                        )}${
                          member.proposalId
                            ? `&proposal=${encodeURIComponent(
                                member.proposalId
                              )}`
                            : ""
                        }`}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
                      >
                        <MessageCircle size={16} />
                        Mesaj Gönder
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* PROJECT SUMMARY */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <Wallet size={18} className="text-gray-700" />
              </div>

              <p className="text-xs font-medium text-gray-500">
                Bütçe
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {formatCurrency(project.budget)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <CalendarDays
                  size={18}
                  className="text-gray-700"
                />
              </div>

              <p className="text-xs font-medium text-gray-500">
                Teslim tarihi
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {formatDate(project.deadline)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <Users size={18} className="text-gray-700" />
              </div>

              <p className="text-xs font-medium text-gray-500">
                Ekip
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {isStarted
                  ? `${teamMembers.length} freelancer`
                  : project.team_required
                    ? `${project.team_size || 1} kişi`
                    : "Tek freelancer"}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <Clock3 size={18} className="text-gray-700" />
              </div>

              <p className="text-xs font-medium text-gray-500">
                Oluşturulma
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {formatDate(project.created_at)}
              </p>
            </div>
          </section>

          {/* PROJECT INFO */}
          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-gray-700" />

              <h2 className="text-lg font-semibold text-gray-900">
                Proje bilgileri
              </h2>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium text-gray-500">
                Proje tipi
              </p>

              <p className="mt-2 text-sm text-gray-800">
                {project.project_type || "Belirtilmedi"}
              </p>
            </div>
          </section>

          {/* SKILLS */}
          {project.skills && project.skills.length > 0 && (
            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900">
                Gerekli yetenekler
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {project.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* FILES */}
          <ProjectFiles
            projectId={project.id}
            canManage
          />

          {/* PREMIUM: PROJECT ANALYTICS + AI SHORTLIST */}
          <ProjectAnalyticsPanel />
          <AiShortlistPanel projectId={project.id} />

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-3">
            {canStart && (
              <button
                type="button"
                onClick={() => void handleStartProject()}
                disabled={starting}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayCircle size={16} />
                {starting ? "Başlatılıyor..." : "Projeyi Başlat"}
              </button>
            )}

            {!isStarted && !canStart && (
              <>
                <Link
                  href={`/client/projects/${project.id}/edit`}
                  className="rounded-xl bg-[var(--color-primary-600)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
                >
                  Projeyi düzenle
                </Link>

                <Link
                  href="/client/proposals"
                  className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Teklifleri görüntüle ({proposalCount})
                </Link>
              </>
            )}

            {coalitionId && (
              <Link
                href={`/client/coalitions/${coalitionId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Users size={16} />
                Ekip Mesajları
              </Link>
            )}

            {teamMembers.length > 0 && (
              <Link
                href={`/client/messages?user=${encodeURIComponent(
                  teamMembers[0].id
                )}${
                  teamMembers[0].proposalId
                    ? `&proposal=${encodeURIComponent(
                        teamMembers[0].proposalId
                      )}`
                    : ""
                }`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <MessageCircle size={16} />
                Mesajlara git
              </Link>
            )}

            <Link
              href="/client/projects"
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Projelere dön
            </Link>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Proje yükleniyor...</p>
        </div>
      }
    >
      <ClientProjectDetailContent />
    </Suspense>
  );
}