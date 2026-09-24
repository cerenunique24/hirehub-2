"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  MessageSquare,
  PlayCircle,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uniqueSkills } from "@/lib/matching";
import {
  getTeamCompletion,
  type TeamCompletion,
} from "@/lib/projects/teamReadiness";
import TeamMessagesPanel from "@/components/coalitions/TeamMessagesPanel";

type Coalition = {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
};

type LinkedProject = {
  id: string;
  title: string;
  status: string | null;
  client_id: string;
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

  const [coalition, setCoalition] = useState<Coalition | null>(null);
  const [project, setProject] = useState<LinkedProject | null>(null);
  const [teamCompletion, setTeamCompletion] = useState<TeamCompletion | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

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
      .select("id, name, description, project_id")
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
        .select("id, title, status, client_id, budget_breakdown")
        .eq("id", coalitionData.project_id)
        .maybeSingle();

      linkedProject = (projectData as LinkedProject | null) ?? null;
      setProject(linkedProject);
    } else {
      setProject(null);
    }

    const {
      data: memberRows,
      error: memberError,
    } = await supabase
      .from("coalition_members")
      .select("id, user_id, role")
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
            "id, first_name, last_name, avatar_url, title, expertise, skills"
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

    if (linkedProject) {
      const { data: teamMemberRows } = await supabase
        .from("project_team_members")
        .select("freelancer_id, role")
        .eq("project_id", linkedProject.id)
        .eq("status", "active");

      activeTeamMembers = (teamMemberRows ?? []).map((row) => ({
        role: row.role,
      }));

      projectRoleByFreelancer = new Map(
        (teamMemberRows ?? []).map((row) => [row.freelancer_id, row.role as string])
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
            "id, first_name, last_name, avatar_url, title, expertise, skills"
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

    const { error: updateError } = await supabase
      .from("projects")
      .update({ status: "in_progress" })
      .eq("id", project.id)
      .eq("status", "ready_to_start");

    if (updateError) {
      console.error("Proje başlatma hatası:", updateError);
      setError("Proje başlatılırken bir hata oluştu.");
      setStarting(false);
      return;
    }

    router.push(`/client/projects/${project.id}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        Koalisyon yükleniyor...
      </div>
    );
  }

  if (!coalition) {
    return (
      <div className="p-6">
        <Link
          href="/client/coalitions"
          className="inline-flex items-center gap-2 text-sm text-gray-500"
        >
          <ArrowLeft size={16} />
          Koalisyonlara dön
        </Link>

        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  const skills = uniqueSkills(
    members.map((member) => member.profile?.skills)
  );

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/client/coalitions"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft size={16} />
          Koalisyonlara dön
        </Link>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-7 shadow-sm">
          <h1 className="text-3xl font-semibold text-neutral-900">
            {coalition.name}
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
            {coalition.description ||
              "Bu koalisyon henüz açıklama eklememiş."}
          </p>

          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="font-semibold text-neutral-900">
                Ekip yetenekleri
              </h2>

              {skills.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-500">
                  Aktif üyelerde yetenek bilgisi yok.
                </p>
              )}
            </div>

            <div>
              <h2 className="font-semibold text-neutral-900">
                Ekip büyüklüğü
              </h2>

              <p className="mt-3 text-sm text-neutral-600">
                {members.length} aktif üye
              </p>
            </div>
          </div>

          {pendingMembers.length > 0 && (
            <section className="mt-8 border-t border-neutral-100 pt-6">
              <div>
                <h2 className="font-semibold text-neutral-900">
                  Bekleyen ekip önerileri
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Freelancerların önerdiği ekip üyelerini
                  onaylayabilir veya reddedebilirsin.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {pendingMembers.map((member) => {
                  const name =
                    [
                      member.profile?.first_name,
                      member.profile?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") || "Profil bilgisi yok";

                  const inviterName =
                    [
                      member.inviter?.first_name,
                      member.inviter?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") || "Bir ekip üyesi";

                  const isProcessing =
                    processingId === member.id;

                  return (
                    <div
                      key={member.id}
                      className="rounded-xl border border-neutral-200 p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          {member.profile?.avatar_url ? (
                            <img
                              src={member.profile.avatar_url}
                              alt=""
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 font-medium text-neutral-600">
                              {name.slice(0, 1)}
                            </div>
                          )}

                          <div>
                            <p className="font-medium text-neutral-900">
                              {name}
                            </p>

                            <p className="text-sm text-neutral-500">
                              {member.profile?.title ||
                                member.profile?.expertise ||
                                "Uzmanlık bilgisi eklenmemiş"}
                            </p>

                            <p className="mt-1 text-xs text-neutral-400">
                              {inviterName} tarafından önerildi
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="mr-2 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                            {member.role || "Üye"}
                          </span>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              void handleReject(member.id)
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <X size={16} />
                            Reddet
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              void handleApprove(member.id)
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Check size={16} />
                            )}
                            Onayla
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-8 border-t border-neutral-100 pt-6">
            <h2 className="flex items-center gap-2 font-semibold text-neutral-900">
              <Users size={18} />
              Üyeler
            </h2>

            <div className="mt-4 space-y-3">
              {members.length ? (
                members.map((member) => {
                  const name =
                    [
                      member.profile?.first_name,
                      member.profile?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") || "Profil bilgisi yok";

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-neutral-100 p-4"
                    >
                      <div className="flex items-center gap-3">
                        {member.profile?.avatar_url ? (
                          <img
                            src={member.profile.avatar_url}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 font-medium text-neutral-600">
                            {name.slice(0, 1)}
                          </div>
                        )}

                        <div>
                          <p className="font-medium text-neutral-900">
                            {name}
                          </p>

                          <p className="text-sm text-neutral-500">
                            {member.role === "owner"
                              ? "Proje Sahibi"
                              : member.profile?.title ||
                                member.profile?.expertise ||
                                "Uzmanlık bilgisi eklenmemiş"}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                        {member.role === "owner"
                          ? "Proje Sahibi"
                          : member.projectRole || "Üye"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-neutral-500">
                  Aktif üye bulunmuyor.
                </p>
              )}
            </div>
          </section>
        </section>

        {teamCompletion && (
          <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Ekip Durumu
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {teamCompletion.ready
                    ? "Tüm ekip üyeleri projeye dahil oldu."
                    : `${teamCompletion.filledRoles} / ${teamCompletion.totalRoles} rol tamamlandı.`}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1.5 text-xs font-medium ${
                  teamCompletion.ready
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {teamCompletion.ready ? "Ekip hazır" : "Ekip oluşturuluyor"}
              </span>
            </div>

            {teamCompletion.roles.length > 0 && (
              <div className="mt-5 space-y-2">
                {teamCompletion.roles.map((role) => (
                  <div
                    key={role.role}
                    className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-2.5 text-sm"
                  >
                    <span className="flex items-center gap-2 text-neutral-800">
                      {role.isFull ? (
                        <Check size={15} className="text-emerald-600" />
                      ) : (
                        <span className="h-3.5 w-3.5 rounded-full border border-neutral-300" />
                      )}
                      {role.role}
                    </span>

                    <span className="text-xs text-neutral-500">
                      {role.filled} / {role.capacity}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {project?.status === "in_progress" ? (
              <p className="mt-5 text-sm font-medium text-emerald-700">
                Proje başlatıldı — ekip artık çalışmaya başlayabilir.
              </p>
            ) : (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {isProjectClient && (
                  <button
                    type="button"
                    disabled={!canStartProject || starting}
                    onClick={() => void handleStartProject()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {starting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <PlayCircle size={16} />
                    )}
                    Projeyi Başlat
                  </button>
                )}

                {!teamCompletion.ready && (
                  <p className="self-center text-xs text-neutral-500">
                    Eksik roller için freelancer aramaya devam edebilirsin.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {currentUserId && (
          <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
              <MessageSquare size={18} />
              Ekip Mesajları
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Proje başlamadan önce ekiple burada hazırlık yapabilirsin.
            </p>

            <div className="mt-4">
              <TeamMessagesPanel
                coalitionId={coalition.id}
                currentUserId={currentUserId}
                memberLabels={members.map((member) => ({
                  id: member.user_id,
                  name:
                    [member.profile?.first_name, member.profile?.last_name]
                      .filter(Boolean)
                      .join(" ") || "Ekip üyesi",
                }))}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}