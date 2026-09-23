"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Send,
  Sparkles,
  Wallet,
  Users,
  User,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ProjectFiles from "@/components/projects/ProjectFiles";
import { notifyUsers } from "@/lib/notifications";
import PremiumGate from "@/components/premium/PremiumGate";

type Project = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  project_type: string | null;
  team_required: boolean | null;
  team_size?: number | null;
  skills: string[] | null;
  status: string | null;
  estimated_duration: string | null;
  deadline: string | null;
  created_at: string;
  requirements?: unknown;
};

type Profile = {
  id: string;
  title: string | null;
  skills: string[] | null;
  expertise: string[] | null;
  work_types: string[] | null;
  experience: string | null;
};

type MatchedRole = {
  roleId: string;
  role: string;
  score: number;
  reason: string;

  // matchScore ile isEligibleForRole ayrı kavramlardır: yüksek skor
  // tek başına teklif gönderme izni vermez.
  isEligibleForRole: boolean;

  // API yalnızca isEligibleForRole === true olan rol için bu alanları
  // döndürür. budget_breakdown'ın tamamı frontend'e gelmez.
  budgetPerPerson?: number | null;
  budget?: number | null;
  memberCount?: number | null;
  duration?: string | null;
  matchingSkills?: string[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function getSafeRoleBudget(role: MatchedRole | null) {
  if (!role) {
    return 0;
  }

  const perPersonBudget = Number(role.budgetPerPerson);

  if (
    Number.isFinite(perPersonBudget) &&
    perPersonBudget > 0
  ) {
    return Math.floor(perPersonBudget);
  }

  const budget = Number(role.budget);

  if (
    Number.isFinite(budget) &&
    budget > 0
  ) {
    const memberCount = Number(role.memberCount);

    if (
      Number.isFinite(memberCount) &&
      memberCount > 1
    ) {
      return Math.floor(budget / memberCount);
    }

    return Math.floor(budget);
  }

  return 0;
}

function getRoleTotalBudget(role: MatchedRole | null) {
  if (!role) {
    return 0;
  }

  const budget = Number(role.budget);

  if (
    Number.isFinite(budget) &&
    budget > 0
  ) {
    return Math.floor(budget);
  }

  const perPersonBudget = Number(role.budgetPerPerson);
  const memberCount = Number(role.memberCount);

  if (
    Number.isFinite(perPersonBudget) &&
    perPersonBudget > 0 &&
    Number.isFinite(memberCount) &&
    memberCount > 0
  ) {
    return Math.floor(
      perPersonBudget * memberCount
    );
  }

  return 0;
}

function getMemberCount(role: MatchedRole | null) {
  if (!role) {
    return 1;
  }

  const count = Number(role.memberCount);

  return Number.isFinite(count) && count > 0
    ? Math.floor(count)
    : 1;
}

function parseAiMatches(data: unknown): MatchedRole[] {
  if (
    typeof data !== "object" ||
    data === null
  ) {
    return [];
  }

  const response =
    data as Record<string, unknown>;

  /*
   * /api/ai/match-talent freelancer dalı (matchFreelancerToProjectRoles)
   * `{ matching: FreelancerRoleMatch[] }` döndürür — yani `matching`
   * doğrudan bir dizi, `{ roleMatches: [...] }` şeklinde bir obje değil.
   * Eskiden burada `response.matching.roleMatches` okunuyordu; bu hiçbir
   * zaman var olmayan bir alan olduğu için matchedRoles her zaman boş
   * kalıyor, dolayısıyla eşleşme skoru ne olursa olsun teklif formu
   * hiç açılmıyordu.
   */
  const roleMatches = Array.isArray(response.matching)
    ? response.matching
    : Array.isArray(
          (response.matching as Record<string, unknown> | undefined)
            ?.roleMatches
        )
      ? (response.matching as Record<string, unknown>).roleMatches
      : null;

  if (!Array.isArray(roleMatches)) {
    return [];
  }

  return roleMatches
    .filter(
      (
        role
      ): role is Record<string, unknown> =>
        typeof role === "object" &&
        role !== null
    )
    .map((role) => {
      const roleId =
        typeof role.roleId === "string"
          ? role.roleId
          : typeof role.id === "string"
            ? role.id
            : "";

      const roleName =
        typeof role.role === "string"
          ? role.role.trim()
          : typeof role.name === "string"
            ? role.name.trim()
            : "";

      const score =
        typeof role.score === "number"
          ? role.score
          : Number(role.score);

      const reason =
        typeof role.reason === "string" &&
        role.reason.trim()
          ? role.reason
          : "Profilindeki bilgiler bu rolle eşleşiyor.";

      const budgetPerPersonRaw =
        role.budgetPerPerson;

      const budgetRaw =
        role.budget;

      const memberCountRaw =
        role.memberCount;

      const budgetPerPerson =
        Number(budgetPerPersonRaw);

      const budget =
        Number(budgetRaw);

      const memberCount =
        Number(memberCountRaw);

      const isEligibleForRole =
        role.isEligibleForRole === true;

      const duration =
        typeof role.duration === "string" &&
        role.duration.trim()
          ? role.duration.trim()
          : null;

      return {
        roleId,
        role: roleName,
        score: Number.isFinite(score)
          ? score
          : 0,
        reason,
        isEligibleForRole,
        budgetPerPerson:
          Number.isFinite(budgetPerPerson) &&
          budgetPerPerson > 0
            ? budgetPerPerson
            : null,
        budget:
          Number.isFinite(budget) &&
          budget > 0
            ? budget
            : null,
        memberCount:
          Number.isFinite(memberCount) &&
          memberCount > 0
            ? memberCount
            : null,
        duration,
        matchingSkills: Array.isArray(role.matchingSkills)
          ? role.matchingSkills.filter(
              (skill): skill is string => typeof skill === "string" && skill.trim().length > 0
            )
          : undefined,
      };
    })
    .filter(
      (role) =>
        role.roleId &&
        role.role &&
        role.score > 0
    );
}

function formatDeadline(
  deadline: string | null
) {
  if (!deadline) {
    return null;
  }

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return deadline;
  }

  return date.toLocaleDateString(
    "tr-TR",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function FreelancerProjectDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const searchParams = useSearchParams();

  const cameFromMessages =
    searchParams.get("ref") === "messages";
  const backToMessagesUser = searchParams.get("user");
  const backToMessagesProposal = searchParams.get("proposal");

  const [project, setProject] =
    useState<Project | null>(null);

  const [matchedRoles, setMatchedRoles] =
    useState<MatchedRole[]>([]);

  const [selectedRoleId, setSelectedRoleId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [matching, setMatching] =
    useState(true);

  const [bidAmount, setBidAmount] =
    useState("");

  const [deliveryDays, setDeliveryDays] =
    useState("");

  const [coverLetter, setCoverLetter] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [submitMessage, setSubmitMessage] =
    useState("");

  const [submitted, setSubmitted] =
    useState(false);

  const [alreadySubmitted, setAlreadySubmitted] =
    useState(false);

  /*
   * team_required = true
   * → ekip projesi
   *
   * team_required = false / null
   * → tek freelancer
   */
  const isSingleProject =
    project?.team_required !== true;

  const selectedMatchedRole =
    matchedRoles.find(
      (role) =>
        role.roleId === selectedRoleId
    ) ?? null;

  /*
   * Bu değer yalnızca API'nin eşleşen rol için
   * döndürdüğü güvenli bütçe bilgisinden hesaplanır.
   *
   * projects.budget_breakdown frontend'e hiç gelmez.
   */
  const selectedRoleBudget =
    getSafeRoleBudget(
      selectedMatchedRole
    );

  const selectedRoleTotalBudget =
    getRoleTotalBudget(
      selectedMatchedRole
    );

  const selectedRoleMemberCount =
    getMemberCount(
      selectedMatchedRole
    );

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      try {
        setLoading(true);
        setMatching(true);
        setSubmitMessage("");
        setAlreadySubmitted(false);
        setSubmitted(false);

        const { id } = await params;

        if (!id) {
          if (!cancelled) {
            setSubmitMessage(
              "Geçersiz proje bağlantısı."
            );
          }
          return;
        }

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setSubmitMessage(
              "Teklif göndermek için giriş yapmalısınız."
            );
          }
          return;
        }

        /*
         * ----------------------------------------------------
         * PROJEYİ YÜKLE
         * ----------------------------------------------------
         *
         * ÖNEMLİ:
         * budget_breakdown BURADA YOK.
         *
         * Freelancer browser'ı projects tablosundan
         * bütün rol bütçelerini alamaz.
         */
        const {
          data: projectData,
          error: projectError,
        } = await supabase
          .from("projects")
          .select(
            `
              id,
              client_id,
              title,
              description,
              project_type,
              team_required,
              team_size,
              skills,
              status,
              estimated_duration,
              deadline,
              created_at,
              requirements
            `
          )
          .eq("id", id)
          .maybeSingle();

        if (projectError) {
          console.error(
            "Proje yüklenemedi:",
            projectError
          );

          if (!cancelled) {
            setSubmitMessage(
              projectError.message ||
                "Proje yüklenirken bir hata oluştu."
            );
          }

          return;
        }

        if (!projectData) {
          if (!cancelled) {
            setSubmitMessage(
              "Proje bulunamadı."
            );
          }

          return;
        }

        const loadedProject =
          projectData as Project;

        if (!cancelled) {
          setProject(loadedProject);
        }

        /*
         * ----------------------------------------------------
         * FREELANCER PROFİLİ
         * ----------------------------------------------------
         */
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id,title,skills,expertise,work_types,experience"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Freelancer profili yüklenemedi:",
            profileError
          );
        }

        /*
         * Profil yüklenemese bile AI endpoint'i
         * kendi güvenli server-side eşleşmesini yapabilir.
         */
        const profile =
          (profileData ?? {
            id: user.id,
            title: null,
            skills: [],
            expertise: [],
            work_types: [],
            experience: null,
          }) as Profile;

        /*
         * ----------------------------------------------------
         * DAHA ÖNCE TEKLİF VERİLDİ Mİ?
         * ----------------------------------------------------
         */
        const {
          data: existingProposal,
          error: proposalCheckError,
        } = await supabase
          .from("proposals")
          .select("id,status")
          .eq(
            "project_id",
            loadedProject.id
          )
          .eq(
            "freelancer_id",
            user.id
          )
          .maybeSingle();

        if (proposalCheckError) {
          console.error(
            "Teklif kontrolü başarısız:",
            proposalCheckError
          );
        }

        if (
          !cancelled &&
          existingProposal
        ) {
          setAlreadySubmitted(true);
        }

        /*
         * ----------------------------------------------------
         * GÜVENLİ EŞLEŞME API'Sİ
         * ----------------------------------------------------
         *
         * Rol + eşleşme + yalnızca ilgili rolün
         * güvenli bütçe bilgisi API tarafından döndürülür.
         *
         * Frontend burada budget_breakdown istemez.
         */
        try {
          const response =
            await fetch(
              "/api/ai/match-talent",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  projectId: id,
                }),
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            console.error(
              "AI eşleşme hatası:",
              data
            );
          } else {
            const aiRoles =
              parseAiMatches(data);

            /*
             * API'den gelen roller zaten
             * freelancer için uygun roller.
             *
             * Burada projects.budget_breakdown'a
             * tekrar erişilmiyor.
             */
            const uniqueRoles =
              Array.from(
                new Map(
                  aiRoles.map(
                    (role) => [
                      role.roleId,
                      role,
                    ]
                  )
                ).values()
              );

            if (!cancelled) {
              setMatchedRoles(
                uniqueRoles
              );

              /*
               * Varsayılan seçim yalnızca gerçekten eligible
               * bir rol olabilir — eligible olmayan bir rol
               * otomatik seçilip teklif formunu açmamalı.
               */
              const defaultRole =
                uniqueRoles.find(
                  (role) => role.isEligibleForRole
                ) ?? null;

              if (defaultRole) {
                setSelectedRoleId(
                  defaultRole.roleId
                );

                /*
                 * Artık bütçeyi teklif inputuna
                 * otomatik yazmıyoruz.
                 *
                 * Freelancer kendi istediği
                 * pozitif tutarı girecek.
                 */
                setBidAmount("");
              }
            }
          }
        } catch (error) {
          console.error(
            "AI eşleşme isteği başarısız:",
            error
          );

          if (!cancelled) {
            setMatchedRoles([]);
          }
        }

        /*
         * profile değişkeninin burada kullanılmaması
         * sorun yaratmasın diye tutuluyor.
         * Eşleşme artık güvenli API üzerinden yapılıyor.
         */
        void profile;
      } catch (error) {
        console.error(
          "Proje detay yükleme hatası:",
          error
        );

        if (!cancelled) {
          setSubmitMessage(
            error instanceof Error
              ? error.message
              : "Proje yüklenirken bir hata oluştu."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setMatching(false);
        }
      }
    }

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [params, supabase]);

  function handleRoleSelect(
    role: MatchedRole
  ) {
    if (!role.isEligibleForRole) {
      return;
    }

    setSelectedRoleId(
      role.roleId
    );

    setSubmitMessage("");

    /*
     * Rol değiştiğinde teklif tutarını
     * yeniden bütçeyle doldurmuyoruz.
     *
     * Freelancer kendi teklifini belirler.
     */
    setBidAmount("");
  }

  async function handleSubmitProposal(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!project) {
      setSubmitMessage(
        "Proje bilgisi bulunamadı."
      );
      return;
    }

    if (alreadySubmitted) {
      setSubmitMessage(
        "Bu projeye daha önce teklif gönderdiniz."
      );
      return;
    }

    if (!selectedRoleId) {
      setSubmitMessage(
        "Önce sana uygun bir rol seçmelisin."
      );
      return;
    }

    const selectedRole =
      matchedRoles.find(
        (role) =>
          role.roleId ===
          selectedRoleId
      );

    if (!selectedRole) {
      setSubmitMessage(
        "Seçilen rol bulunamadı."
      );
      return;
    }

    if (!selectedRole.isEligibleForRole) {
      setSubmitMessage(
        "Bu rol profilinizle yeterince uyumlu değil."
      );
      return;
    }

    /*
     * ----------------------------------------------------
     * TEKLİF TUTARI
     * ----------------------------------------------------
     *
     * Burada artık client bütçesiyle
     * hiçbir karşılaştırma yapılmıyor.
     *
     * Freelancer istediği herhangi bir
     * POZİTİF tutarı teklif edebilir.
     */
    const numericBid =
      Number(bidAmount);

    const numericDeliveryDays =
      Number(deliveryDays);

    if (
      !Number.isFinite(numericBid) ||
      numericBid <= 0
    ) {
      setSubmitMessage(
        "Geçerli bir teklif tutarı gir."
      );
      return;
    }

    if (
      !Number.isFinite(
        numericDeliveryDays
      ) ||
      numericDeliveryDays <= 0
    ) {
      setSubmitMessage(
        "Geçerli bir teslim süresi gir."
      );
      return;
    }

    if (!coverLetter.trim()) {
      setSubmitMessage(
        "Lütfen kısa bir teklif mesajı yaz."
      );
      return;
    }

    try {
      setSubmitting(true);
      setSubmitMessage("");

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setSubmitMessage(
          "Teklif göndermek için giriş yapmalısınız."
        );
        return;
      }

      /*
       * Proposal server-side oluşturulur: role eligibility
       * client'ın gönderdiği değerlere değil, server'ın kendi
       * hesapladığı sonuca göre YENİDEN doğrulanır.
       */
      const response =
        await fetch(
          "/api/proposals",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              projectId:
                project.id,
              roleId:
                selectedRole.roleId,
              role:
                selectedRole.role,
              bidAmount:
                numericBid,
              deliveryDays:
                numericDeliveryDays,
              coverLetter:
                coverLetter.trim(),
            }),
          }
        );

      const responseData =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        console.error(
          "Teklif gönderme hatası:",
          responseData
        );

        if (response.status === 409) {
          setAlreadySubmitted(
            true
          );
        }

        setSubmitMessage(
          (responseData as { error?: string })
            .error ||
            "Teklif gönderilirken bir hata oluştu."
        );

        return;
      }

      setSubmitted(true);
      setAlreadySubmitted(true);

      setSubmitMessage(
        "Teklifin başarıyla gönderildi."
      );

      await notifyUsers(supabase, [
        {
          userId: project.client_id,
          type: "proposal_received",
          title: "Yeni teklif aldın",
          message: `"${project.title}" projesine yeni bir teklif geldi.`,
          link: "/client/proposals",
        },
      ]);

      setTimeout(() => {
        window.location.href =
          "/freelancers/proposals";
      }, 1500);
    } catch (error) {
      console.error(
        "Teklif gönderme hatası:",
        error
      );

      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "Teklif gönderilirken bir hata oluştu."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ----------------------------------------------------
   * LOADING
   * ----------------------------------------------------
   */
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="animate-pulse">
            <div className="mb-8 h-5 w-32 rounded bg-gray-100" />

            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
              <div>
                <div className="mb-4 h-10 w-3/4 rounded bg-gray-100" />
                <div className="mb-8 h-5 w-48 rounded bg-gray-100" />

                <div className="space-y-3">
                  <div className="h-4 w-full rounded bg-gray-100" />
                  <div className="h-4 w-full rounded bg-gray-100" />
                  <div className="h-4 w-4/5 rounded bg-gray-100" />
                </div>
              </div>

              <div className="h-96 rounded-2xl bg-gray-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ----------------------------------------------------
   * PROJECT NOT FOUND
   * ----------------------------------------------------
   */
  if (!project) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <Link
            href="/freelancers/discover"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Projeleri Keşfet
          </Link>

          <div className="mt-12 rounded-xl border border-gray-200 p-6">
            <h1 className="text-xl font-semibold text-gray-900">
              Proje bulunamadı
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {submitMessage ||
                "Bu proje artık mevcut olmayabilir."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const formattedDate =
    new Date(
      project.created_at
    ).toLocaleDateString(
      "tr-TR",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

  const formattedDeadline =
    formatDeadline(
      project.deadline
    );

  /*
   * ----------------------------------------------------
   * PAGE
   * ----------------------------------------------------
   */
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/freelancers/discover"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Projeleri Keşfet
          </Link>

          {cameFromMessages && backToMessagesUser && (
            <Link
              href={`/freelancers/messages?user=${encodeURIComponent(
                backToMessagesUser
              )}${
                backToMessagesProposal
                  ? `&proposal=${encodeURIComponent(
                      backToMessagesProposal
                    )}`
                  : ""
              }`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Mesaja dön
            </Link>
          )}
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <section className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              {project.project_type && (
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                  <Briefcase className="h-3.5 w-3.5" />
                  {project.project_type}
                </span>
              )}

              <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                {isSingleProject ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Users className="h-3.5 w-3.5" />
                )}

                {isSingleProject
                  ? "Tek Freelancer"
                  : "Ekip Projesi"}
              </span>

              {project.status && (
                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                  {project.status ===
                  "open"
                    ? "Açık"
                    : project.status}
                </span>
              )}
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.01em] text-gray-950 md:text-4xl">
              {project.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-gray-500">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {formattedDate}
              </span>

              {project.estimated_duration && (
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {project.estimated_duration}
                </span>
              )}

              {formattedDeadline && (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Son tarih:{" "}
                  {formattedDeadline}
                </span>
              )}
            </div>

            <div className="mt-10">
              <h2 className="text-lg font-semibold text-gray-950">
                Proje hakkında
              </h2>

              <div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-gray-600">
                {project.description ||
                  "Proje açıklaması eklenmemiş."}
              </div>
            </div>

            {Array.isArray(
              project.skills
            ) &&
              project.skills.length >
                0 && (
                <div className="mt-10">
                  <h2 className="text-lg font-semibold text-gray-950">
                    Aranan yetenekler
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.skills.map(
                      (skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700"
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

            {project.team_required ===
              true &&
              project.team_size &&
              project.team_size > 0 && (
                <div className="mt-10 rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-700" />

                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Ekip büyüklüğü
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Bu projede toplam{" "}
                        <span className="font-medium text-gray-700">
                          {
                            project.team_size
                          }
                        </span>{" "}
                        freelancer görev alacak.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            <div className="mt-10">
              <ProjectFiles
                projectId={
                  project.id
                }
                canManage={false}
              />
            </div>
          </section>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 p-5">
                <h2 className="text-lg font-semibold text-gray-950">
                  {alreadySubmitted
                    ? "Teklif Durumu"
                    : "Teklif Ver"}
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  {alreadySubmitted
                    ? "Bu projeye daha önce teklif gönderdin."
                    : isSingleProject
                      ? "Bu projede tek freelancer olarak tüm projeyi üstlenmek için teklif gönder."
                      : "Projeye uygunluğuna göre eşleştiğin rol üzerinden teklif gönder."}
                </p>
              </div>

              <form
                onSubmit={
                  handleSubmitProposal
                }
                className="p-5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-red-600" />

                    <label className="text-sm font-semibold text-gray-900">
                      {isSingleProject
                        ? "Proje uygunluğu"
                        : "Sana uygun roller"}
                    </label>
                  </div>

                  {matching ? (
                    <div className="mt-4 rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-black" />

                        <span className="text-sm text-gray-500">
                          Profilin proje için analiz ediliyor...
                        </span>
                      </div>
                    </div>
                  ) : matchedRoles.length ===
                    0 ? (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm font-medium text-gray-900">
                        Bu proje için uygun bir eşleşme bulunamadı.
                      </p>

                      <p className="mt-2 text-xs leading-5 text-gray-500">
                        Profilindeki yetenek,
                        uzmanlık ve deneyim
                        bilgilerini güncellediğinde
                        daha fazla projeyle
                        eşleşebilirsin.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {matchedRoles.map(
                        (role) => {
                          const selected =
                            selectedRoleId ===
                            role.roleId;

                          const roleBudget =
                            getSafeRoleBudget(
                              role
                            );

                          const memberCount =
                            getMemberCount(
                              role
                            );

                          const eligible =
                            role.isEligibleForRole;

                          return (
                            <button
                              key={
                                role.roleId
                              }
                              type="button"
                              onClick={() =>
                                handleRoleSelect(
                                  role
                                )
                              }
                              disabled={
                                alreadySubmitted ||
                                submitting ||
                                !eligible
                              }
                              className={
                                "w-full rounded-xl border p-4 text-left transition " +
                                (!eligible
                                  ? "border-gray-100 bg-gray-50"
                                  : selected
                                    ? "border-[var(--color-primary-600)] bg-gray-50"
                                    : "border-gray-200 bg-white hover:border-gray-400") +
                                " disabled:cursor-not-allowed" +
                                (eligible
                                  ? " disabled:opacity-70"
                                  : "")
                              }
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {selected &&
                                      eligible && (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-text-primary)]" />
                                      )}

                                    <span
                                      className={
                                        "text-sm font-semibold " +
                                        (eligible
                                          ? "text-gray-900"
                                          : "text-gray-400")
                                      }
                                    >
                                      {
                                        role.role
                                      }
                                    </span>
                                  </div>

                                  {eligible ? (
                                    <p className="mt-2 text-xs leading-5 text-gray-500">
                                      {
                                        role.reason
                                      }
                                    </p>
                                  ) : (
                                    <p className="mt-2 text-xs font-medium leading-5 text-gray-400">
                                      Bu rol profilinizle uyumlu değil
                                    </p>
                                  )}

                                  {/*
                                   * Bütçe / süre yalnızca eligible
                                   * rol için, sadece API'nin bu rol
                                   * için gönderdiği güvenli değerle
                                   * gösterilir.
                                   */}
                                  {!isSingleProject &&
                                    eligible &&
                                    roleBudget >
                                      0 && (
                                      <div className="mt-3 border-t border-gray-200 pt-3">
                                        <div className="flex items-center gap-2">
                                          <Wallet className="h-3.5 w-3.5 text-gray-500" />

                                          <span className="text-xs text-gray-500">
                                            Kişi başı bütçe:
                                          </span>

                                          <span className="text-xs font-semibold text-gray-900">
                                            {formatCurrency(
                                              roleBudget
                                            )}
                                          </span>
                                        </div>

                                        {role.duration && (
                                          <div className="mt-1 flex items-center gap-2">
                                            <Clock3 className="h-3.5 w-3.5 text-gray-500" />

                                            <span className="text-xs text-gray-500">
                                              Süre:{" "}
                                              <span className="font-semibold text-gray-900">
                                                {role.duration}
                                              </span>
                                            </span>
                                          </div>
                                        )}

                                        {memberCount >
                                          1 && (
                                          <p className="mt-1 text-xs text-gray-400">
                                            Bu rol için{" "}
                                            {
                                              memberCount
                                            }{" "}
                                            freelancer alınacak.
                                          </p>
                                        )}
                                      </div>
                                    )}
                                </div>

                                <span
                                  className={
                                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold " +
                                    (eligible
                                      ? "bg-[var(--color-primary-600)] text-white"
                                      : "bg-gray-200 text-gray-500")
                                  }
                                >
                                  %
                                  {Math.round(
                                    role.score
                                  )}{" "}
                                  Match
                                </span>
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>

                {/*
                 * ------------------------------------------------
                 * EŞLEŞEN ROLÜN BÜTÇESİ
                 * ------------------------------------------------
                 *
                 * Bütçe yoksa hiçbir şey gösterilmez.
                 *
                 * Buradaki değer sadece API'den gelen
                 * selectedMatchedRole'a aittir.
                 */}
                {selectedMatchedRole &&
                  selectedRoleBudget >
                    0 && (
                    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-gray-700" />

                        <span className="text-xs font-medium text-gray-500">
                          {isSingleProject
                            ? "Proje bütçesi"
                            : `${selectedMatchedRole.role} kişi başı bütçesi`}
                        </span>
                      </div>

                      <div className="mt-1 text-xl font-semibold text-gray-950">
                        {formatCurrency(
                          selectedRoleBudget
                        )}
                      </div>

                      {!isSingleProject &&
                        selectedMatchedRole && (
                          <div className="mt-2 space-y-1">
                            {selectedRoleTotalBudget >
                              0 && (
                              <p className="text-xs text-gray-500">
                                Rol toplam bütçesi:{" "}
                                <span className="font-medium text-gray-700">
                                  {formatCurrency(
                                    selectedRoleTotalBudget
                                  )}
                                </span>
                              </p>
                            )}

                            <p className="text-xs text-gray-500">
                              Gerekli kişi sayısı:{" "}
                              <span className="font-medium text-gray-700">
                                {
                                  selectedRoleMemberCount
                                }
                              </span>
                            </p>
                          </div>
                        )}

                      {isSingleProject && (
                        <p className="mt-1 text-xs text-gray-500">
                          Projenin tamamı tek freelancer tarafından yürütülecek.
                        </p>
                      )}
                    </div>
                  )}

                {/*
                 * PREMIUM: "Bu proje neden eşleşiyor?"
                 * ------------------------------------------------
                 * Normal matching FREE kullanıcı için zaten tam
                 * çalışıyor (score, reason, proposal gönderme hepsi
                 * serbest). Bu panel sadece ekstra bir içgörü katmanı
                 * — matchingSkills API'nin zaten hesapladığı gerçek
                 * veridir, uydurma değildir.
                 */}
                {selectedMatchedRole?.isEligibleForRole && (
                  <MatchExplainer role={selectedMatchedRole} />
                )}

                {/*
                 * PRO: "Client'a Mesaj Gönder"
                 * ------------------------------------------------
                 * Free/Plus freelancer role uyumsuzken bu projeye
                 * teklif gönderemez ve mesaj da gönderemez. Pro
                 * freelancer İSE role uyumu olmasa bile mesaj
                 * gönderebilir (proposal göndermesi şart değil) —
                 * bu yüzden bu panel selectedMatchedRole'un
                 * eligibility'sine BAĞLI DEĞİLDİR, sadece geçerli bir
                 * projenin yüklenmiş ve henüz teklif gönderilmemiş
                 * olmasına bağlıdır. PremiumGate içeride gerçek
                 * yetkiyi (plan === pro) ayrıca kontrol eder; nihai
                 * yetkilendirme /api/messages/pre-proposal'da
                 * server-side yapılır.
                 */}
                {!alreadySubmitted && project && (
                  <PreProposalMessage
                    projectId={project.id}
                  />
                )}

                <div className="mt-6">
                  <label
                    htmlFor="bidAmount"
                    className="text-sm font-medium text-gray-900"
                  >
                    Teklif tutarın
                  </label>

                  <div className="relative mt-2">
                    <input
                      id="bidAmount"
                      type="number"
                      min="1"
                      value={bidAmount}
                      onChange={(
                        event
                      ) =>
                        setBidAmount(
                          event.target
                            .value
                        )
                      }
                      placeholder={
                        isSingleProject
                          ? "75000"
                          : "25000"
                      }
                      disabled={
                        matching ||
                        matchedRoles.length ===
                          0 ||
                        submitting ||
                        alreadySubmitted
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-16 text-sm outline-none transition focus:border-[var(--color-primary-600)] disabled:bg-gray-50"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      TL
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="deliveryDays"
                    className="text-sm font-medium text-gray-900"
                  >
                    Teslim süresi
                  </label>

                  <div className="relative mt-2">
                    <input
                      id="deliveryDays"
                      type="number"
                      min="1"
                      value={
                        deliveryDays
                      }
                      onChange={(
                        event
                      ) =>
                        setDeliveryDays(
                          event.target
                            .value
                        )
                      }
                      placeholder="14"
                      disabled={
                        matching ||
                        matchedRoles.length ===
                          0 ||
                        submitting ||
                        alreadySubmitted
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-16 text-sm outline-none transition focus:border-[var(--color-primary-600)] disabled:bg-gray-50"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      gün
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="coverLetter"
                    className="text-sm font-medium text-gray-900"
                  >
                    Teklif mesajın
                  </label>

                  <textarea
                    id="coverLetter"
                    value={
                      coverLetter
                    }
                    onChange={(
                      event
                    ) =>
                      setCoverLetter(
                        event.target
                          .value
                      )
                    }
                    placeholder="Bu projede neden uygun olduğunu ve nasıl çalışacağını kısaca anlat..."
                    rows={6}
                    disabled={
                      matching ||
                      matchedRoles.length ===
                        0 ||
                      submitting ||
                      alreadySubmitted
                    }
                    className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--color-primary-600)] disabled:bg-gray-50"
                  />

                  {!alreadySubmitted && matchedRoles.length > 0 && (
                    <AiProposalAssistant
                      projectId={project?.id ?? null}
                      roleId={selectedRoleId || null}
                      hasDraft={coverLetter.trim().length > 0}
                      onApply={setCoverLetter}
                    />
                  )}
                </div>

                {submitMessage && (
                  <div
                    className={
                      "mt-5 rounded-xl border p-4 text-sm " +
                      (submitted
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700")
                    }
                  >
                    {submitMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    matching ||
                    matchedRoles.length ===
                      0 ||
                    !selectedRoleId ||
                    !selectedMatchedRole?.isEligibleForRole ||
                    alreadySubmitted
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Teklif gönderiliyor...
                    </>
                  ) : alreadySubmitted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Teklif Gönderildi
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Teklif Gönder
                    </>
                  )}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function MatchExplainer({ role }: { role: MatchedRole }) {
  return (
    <div className="mt-6">
      <PremiumGate
        feature="matching_explanation"
        title="Bu proje neden eşleşiyor?"
        description="Profilinle bu rol arasındaki somut kriterleri (beceri ve portfolyo örtüşümü) gör."
        dismissible
      >
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gray-700" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Bu proje neden eşleşiyor?
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-gray-600">{role.reason}</p>

          {role.matchingSkills && role.matchingSkills.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {role.matchingSkills.map((skill) => (
                <li key={skill} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {skill}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-5 text-gray-400">
            Başvurmadan önce: proje açıklamasını ve teslim sürelerini dikkatle incele — eşleşme oranı yüksek olsa da
            kapsamı sana uygun olup olmadığına sen karar verirsin.
          </p>
        </div>
      </PremiumGate>
    </div>
  );
}

/**
 * AI Proposal Assistant (Plus+). Oluştur → Düzenle → Teklif Ver:
 * the server drafts a cover letter from the real project/role/profile data
 * (lib/ai/improve-proposal.ts); the freelancer reviews it, applies it to the
 * cover-letter field, edits it there and submits through the normal form.
 */
function AiProposalAssistant({
  projectId,
  roleId,
  hasDraft,
  onApply,
}: {
  projectId: string | null;
  roleId: string | null;
  hasDraft: boolean;
  onApply: (nextCoverLetter: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    draft: string;
    source: "ai" | "profile_template";
    facts: { role: string; matchingSkills: string[]; experience: string | null; portfolioTitles: string[] };
  } | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!projectId || !roleId) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/ai/improve-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, roleId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || "Taslak hazırlanamadı.");
        return;
      }

      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <PremiumGate
        feature="proposal_ai"
        title="AI Proposal Assistant"
        description="Projeye, seçtiğin role ve kendi profiline dayanarak teklif taslağı hazırla; düzenleyip gönder."
        dismissible
      >
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!projectId || !roleId || loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-2.5 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-primary-600)] hover:text-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? "Taslak hazırlanıyor..." : "AI ile teklifini hazırla"}
        </button>

        {!roleId && <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">Önce teklif vereceğin rolü seç.</p>}
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

        {result && (
          <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/40 p-3">
            <p className="text-xs text-[var(--color-text-muted)]">
              {result.source === "ai" ? "AI taslağı" : "Profil verinden hazırlanan taslak"} · {result.facts.role}
              {result.facts.matchingSkills.length > 0 && <> · Kullanılan beceriler: {result.facts.matchingSkills.slice(0, 4).join(", ")}</>}
            </p>

            <p className="mt-2 whitespace-pre-line text-[13px] leading-5 text-[var(--color-text-primary)]">{result.draft}</p>

            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Taslak yalnızca profilindeki bilgileri kullanır. Göndermeden önce gözden geçir ve düzenle.
            </p>

            <button
              type="button"
              onClick={() => {
                if (hasDraft && !window.confirm("Mevcut teklif mesajının yerine bu taslak yazılsın mı?")) return;
                onApply(result.draft);
              }}
              className="mt-2 inline-flex h-8 items-center rounded-[var(--radius-button)] bg-[var(--color-primary-600)] px-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-primary-700)]"
            >
              Taslağı kullan ve düzenle
            </button>
          </div>
        )}
      </PremiumGate>
    </div>
  );
}

function PreProposalMessage({ projectId }: { projectId: string }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!content.trim() || sending) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/messages/pre-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content: content.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || "Mesaj gönderilemedi.");
        return;
      }

      setSent(true);
      setContent("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-6">
      <PremiumGate
        feature="pre_proposal_messaging"
        title="Teklif göndermeden önce client'a mesaj gönder"
        description="Sorularını sorup projeyi netleştirdikten sonra teklif verebilmen için Pro'ya özel bir avantaj."
        dismissible
      >
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-gray-700" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Client&apos;a teklif öncesi mesaj gönder
            </span>
          </div>

          {sent ? (
            <p className="mt-2 text-sm text-emerald-700">Mesajın gönderildi.</p>
          ) : (
            <>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={3}
                placeholder="Projeyle ilgili sormak istediğin bir şey var mı?"
                className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-600)]"
              />
              {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!content.trim() || sending}
                className="mt-2 rounded-lg bg-[var(--color-primary-600)] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Gönderiliyor..." : "Mesaj Gönder"}
              </button>
            </>
          )}
        </div>
      </PremiumGate>
    </div>
  );
}

export default function FreelancerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-sm text-gray-400">
            Proje yükleniyor...
          </div>
        </main>
      }
    >
      <FreelancerProjectDetailContent params={params} />
    </React.Suspense>
  );
}

