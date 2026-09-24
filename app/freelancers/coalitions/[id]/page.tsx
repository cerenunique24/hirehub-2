"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  MessageSquare,
  Users,
  UserPlus,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTeamCompletion, type TeamCompletion } from "@/lib/projects/teamReadiness";
import TeamMessagesPanel from "@/components/coalitions/TeamMessagesPanel";

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
  budget_breakdown: { role?: string; name?: string; memberCount?: number }[] | null;
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
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

export default function CoalitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [coalition, setCoalition] = useState<Coalition | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [teamCompletion, setTeamCompletion] = useState<TeamCompletion | null>(null);
  const [members, setMembers] = useState<CoalitionMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
              "id, title, description, status, created_at, deadline, estimated_duration, budget_breakdown"
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

          setProject(projectData ?? null);

          if (projectData) {
            const { data: teamMemberRows } = await supabase
              .from("project_team_members")
              .select("freelancer_id, role")
              .eq("project_id", projectData.id)
              .eq("status", "active");

            setTeamCompletion(
              getTeamCompletion(
                projectData.budget_breakdown,
                (teamMemberRows ?? []).map((row) => ({ role: row.role }))
              )
            );

            projectRoleByFreelancer = new Map(
              (teamMemberRows ?? []).map((row) => [row.freelancer_id, row.role as string])
            );
          }
        } else {
          setProject(null);
          setTeamCompletion(null);
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
              "id, first_name, last_name, avatar_url, title"
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
    const firstName = member.profile?.first_name ?? "";
    const lastName = member.profile?.last_name ?? "";

    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || "Kullanıcı";
  };

  const getMemberTitle = (member: CoalitionMember) => {
    return member.profile?.title || "Freelancer";
  };

  const getInitial = (member: CoalitionMember) => {
    return getMemberName(member)
      .charAt(0)
      .toLocaleUpperCase("tr-TR");
  };

  const isCurrentUser = (member: CoalitionMember) => {
    return member.user_id === currentUserId;
  };

  const getProjectStatusLabel = (status: string) => {
    switch (status) {
      case "open":
        return "Açık";

      case "in_progress":
        return "Devam ediyor";

      case "completed":
        return "Tamamlandı";

      case "cancelled":
        return "İptal edildi";

      default:
        return status;
    }
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="w-full p-6">
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
      <main className="w-full p-6">
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

  return (
    <main className="w-full p-6">
      {/* Back */}

      <div className="mb-8">
        <Link
          href="/freelancers/coalitions"
          className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Koalisyonlarım
        </Link>
      </div>

      {/* Coalition Header */}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                {coalition.name}
              </h1>

              <span
                className={
                  coalition.status === "active"
                    ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                    : "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                }
              >
                {coalition.status === "active"
                  ? "Aktif"
                  : "Tamamlandı"}
              </span>
            </div>

            {coalition.description && (
              <p className="max-w-3xl text-sm leading-6 text-gray-500">
                {coalition.description}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} />

                <span>
                  {formatDate(coalition.created_at)} tarihinde
                  oluşturuldu
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Users size={16} />

                <span>
                  {members.length} ekip üyesi
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}

          {coalition.status === "active" && (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href={`/freelancers/freelancers?coalitionId=${coalition.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
              >
                <UserPlus size={17} />
                Ekip Üyesi Öner
              </Link>

              <button
                type="button"
                disabled
                title="Ayrılma talebi yakında aktif olacak."
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-400"
              >
                <LogOut size={17} />
                Ayrılma Talebi
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Project */}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Proje
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Bu koalisyon bir proje kapsamında çalışır.
          </p>
        </div>

        {project ? (
          <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">
                  {project.title}
                </h3>

                {project.description && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                    {project.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600">
                    {getProjectStatusLabel(project.status)}
                  </span>

                  {project.estimated_duration && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500">
                      {project.estimated_duration}
                    </span>
                  )}

                  {project.deadline && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500">
                      Son tarih: {formatDate(project.deadline)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
                <BriefcaseIcon />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl bg-gray-50 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <BriefcaseIcon />
              </div>

              <h3 className="mt-4 text-sm font-medium text-gray-900">
                Proje bağlantısı bulunmuyor
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                Bu koalisyon henüz bir projeye bağlanmamış.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Team Status */}

      {teamCompletion && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Ekip Durumu
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {teamCompletion.ready
                  ? "Tüm ekip üyeleri projeye dahil oldu."
                  : `${teamCompletion.filledRoles} / ${teamCompletion.totalRoles} rol tamamlandı.`}
              </p>
            </div>

            <span
              className={
                teamCompletion.ready
                  ? "w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
                  : "w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700"
              }
            >
              {teamCompletion.ready ? "Ekip hazır" : "Ekip oluşturuluyor"}
            </span>
          </div>

          {teamCompletion.roles.length > 0 && (
            <div className="mt-5 space-y-2">
              {teamCompletion.roles.map((role) => (
                <div
                  key={role.role}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-700"
                >
                  <span>{role.role}</span>
                  <span className="text-xs text-gray-500">
                    {role.filled} / {role.capacity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Team Messages */}

      {currentUserId && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <MessageSquare size={18} />
            Ekip Mesajları
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Proje başlamadan önce ekiple burada hazırlık yapabilirsin.
          </p>

          <div className="mt-4">
            <TeamMessagesPanel
              coalitionId={coalition.id}
              currentUserId={currentUserId}
              memberLabels={members.map((member) => ({
                id: member.user_id,
                name: getMemberName(member),
              }))}
            />
          </div>
        </section>
      )}

      {/* Team Members */}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Ekip Üyeleri
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Bu projede aktif olarak birlikte çalışan
              freelancerlar.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users size={17} />
            {members.length} kişi
          </div>
        </div>

        {members.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-6 text-center">
            <Users
              size={24}
              className="mx-auto text-gray-400"
            />

            <p className="mt-3 text-sm text-gray-500">
              Henüz aktif ekip üyesi yok.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-4 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  {member.profile?.avatar_url ? (
                    <img
                      src={member.profile.avatar_url}
                      alt={getMemberName(member)}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                      {getInitial(member)}
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {getMemberName(member)}
                      </p>

                      {isCurrentUser(member) && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                          Siz
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      {getMemberTitle(member)}
                    </p>
                  </div>
                </div>

                <span className="w-fit rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500">
                  {member.projectRole || "Ekip Üyesi"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Team Rules / Future Actions */}

      {coalition.status === "active" && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Koalisyon Yönetimi
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Ekip değişiklikleri proje ve müşteri onayı
              üzerinden yürütülür. Bir ekip üyesinin
              ayrılması veya yeni bir freelancerın eklenmesi
              tek taraflı olarak gerçekleşmez.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                  <UserPlus
                    size={17}
                    className="text-gray-700"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Ekip Üyesi Öner
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    İhtiyaç duyulan bir rol için platformdaki
                    başka bir freelancerı önerebilirsin.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                  <LogOut
                    size={17}
                    className="text-gray-700"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Projeden Ayrılma
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Projeden ayrılmak istediğinde müşteriye
                    ayrılma talebi gönderebilirsin.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function BriefcaseIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-500"
      aria-hidden="true"
    >
      <path
        d="M9 7V6C9 4.89543 9.89543 4 11 4H13C14.1046 4 15 4.89543 15 6V7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M5 7H19C20.1046 7 21 7.89543 21 9V18C21 19.1046 20.1046 20H5C3.89543 20 3 19.1046 3 18V9C3 7.89543 3.89543 7 5 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M3 12H21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}