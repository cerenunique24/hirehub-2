"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import AnalyzingState from "@/components/ai/AnalyzingState";
import type { ProjectAnalysis } from "@/types/ai";
import { SKILLS } from "@/lib/constants/skills";
import { usePremium } from "@/lib/hooks/usePremium";
import PremiumGate from "@/components/premium/PremiumGate";
import type {
  PlusProjectAnalysis,
  ProProjectAnalysis,
} from "@/lib/ai/projectAnalysisEnrichment";

const SKILL_OPTIONS: string[] = [...SKILLS];

/**
 * Ana kategori: geniş iş alanı (Bionluk'taki üst kategori mantığı
 * referans alınmıştır). AI eşleştirme rol/beceri/açıklama üzerinden
 * çalışır — bu liste yalnızca projenin genel iş alanını sınıflandırır,
 * spesifik hizmet/rol seçimini daraltmaz.
 */
const CATEGORIES = [
  "Tasarım",
  "Yazılım & Teknoloji",
  "Pazarlama",
  "İçerik & Çeviri",
  "Video & Animasyon",
  "Ses & Müzik",
  "Fotoğraf",
  "İş & Yönetim",
  "Senaryo & Hikâye",
  "Diğer",
];

/**
 * Uzmanlık alanları: projede aranan spesifik rol/beceri alanı
 * ("Ekip İhtiyaçları" adımı). Ana kategoriden bağımsız, kasıtlı olarak
 * daha granüler — AI bu listeden projeye uygun rolleri türetir.
 */
const EXPERTISE_OPTIONS = [
  "Web Tasarım",
  "Web Geliştirme",
  "Mobil Uygulama",
  "UI/UX Tasarım",
  "Marka Tasarımı",
  "Grafik Tasarım",
  "E-Ticaret",
  "Yazılım Geliştirme",
  "Veri Bilimi & Yapay Zeka",
  "Dijital Pazarlama",
  "İçerik Üretimi",
  "Metin & Çeviri",
  "3D Tasarım & Animasyon",
  "Video & Ses Prodüksiyon",
  "Mimari & İç Mekân",
  "Mühendislik",
  "Proje & Ürün Yönetimi",
  "Finans & Hukuk",
  "İK & Satış",
  "Eğitim & Danışmanlık",
];

const DELIVERY_FORMATS = [
  "Figma dosyası",
  "PSD",
  "AI (Illustrator)",
  "PDF",
  "Kaynak kod",
  "Video",
  "Sunum",
  "DWG / DXF",
  "RVT (Revit)",
  "SKP (SketchUp)",
  "3D Model",
  "Excel / Tablo",
  "Word Belgesi",
  "Ses Dosyası",
  "Diğer",
];

const BUDGET_PRESETS = [
  { label: "₺5.000 – ₺10.000", value: 7500 },
  { label: "₺10.000 – ₺25.000", value: 17500 },
  { label: "₺25.000 – ₺50.000", value: 37500 },
  { label: "₺50.000 – ₺100.000", value: 75000 },
  { label: "₺100.000 – ₺250.000", value: 175000 },
  { label: "₺250.000+", value: 250000 },
];

const DURATION_OPTIONS = [
  {
    label: "1 haftadan az",
    days: 5,
  },
  {
    label: "1–2 hafta",
    days: 14,
  },
  {
    label: "2–4 hafta",
    days: 28,
  },
  {
    label: "1–3 ay",
    days: 90,
  },
  {
    label: "3–6 ay",
    days: 180,
  },
  {
    label: "6 ay+",
    days: 365,
  },
];

const CONTAINER = "mx-auto w-full max-w-[1240px] px-6";

const CARD =
  "rounded-[var(--radius-card)] border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]";

const EYEBROW =
  "text-xs font-semibold uppercase tracking-[0.14em] text-gray-400";

const HEADING =
  "mt-2 text-[32px] leading-10 font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]";

const SUBTEXT =
  "mt-2 max-w-2xl text-sm leading-6 text-gray-500";

const INPUT =
  "h-[38px] w-full rounded-[var(--radius-input)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary-600)] focus:ring-2 focus:ring-[var(--color-primary-50)]";

const LABEL =
  "mb-1.5 block text-xs font-medium text-[var(--color-text-primary)]";

const BTN_PRIMARY =
  "inline-flex h-[38px] items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-primary-600)] px-4 text-[13px] font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-40";

const BTN_SECONDARY =
  "inline-flex h-[38px] items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-4 text-[13px] font-medium text-[var(--color-text-primary)] transition hover:border-[var(--color-primary-600)] hover:text-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-40";

const BTN_GHOST =
  "inline-flex h-[34px] items-center gap-2 rounded-[var(--radius-button)] px-3 text-[13px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-[#222] disabled:cursor-not-allowed disabled:opacity-40";

const TAG =
  "inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-[#222]";

type Step = "project" | "needs" | "analysis" | "budget";

type SelectionMode = "team" | "freelancer" | "none";

type Brief = {
  title: string;
  category: string;
  description: string;
  skills: string[];
  expertiseAreas: string[];
  deliveryFormats: string[];
};

type Role = {
  id: string;
  name: string;
  memberCount: number;
  budgetPerPerson: number;
  budget: number;
  duration: string;
  reason?: string;
  responsibilities: string[];
  skills: string[];
  preferredSkills: string[];
};

type Talent = {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
  role: string;
  score: number;
  skills: string[];
  availability?: string;
  reason?: string;
  isEligibleForRole: boolean;
};

type RoleMatchGroup = {
  role: string;
  freelancers: Talent[];
};

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value);
}

function formatTL(value: number) {
  return new Intl.NumberFormat("tr-TR").format(
    Math.max(0, Math.round(value))
  );
}

function parseTL(value: string) {
  const cleaned = value.replace(/[^\d]/g, "");
  return Number(cleaned || 0);
}

function calculateRoleTotal(
  memberCount: number,
  budgetPerPerson: number
) {
  const count = Math.max(1, Math.floor(memberCount || 1));
  const perPerson = Math.max(
    0,
    Math.round(budgetPerPerson || 0)
  );

  return count * perPerson;
}

function durationToDays(duration: string) {
  const option = DURATION_OPTIONS.find(
    (item) => item.label === duration
  );

  return option?.days ?? 30;
}

function parseDurationToDate(duration: string) {
  const date = new Date();
  date.setDate(date.getDate() + durationToDays(duration));
  return date.toISOString();
}

function getLongestDuration(roles: Role[]) {
  if (roles.length === 0) return "";

  let longest = roles[0].duration;
  let longestDays = durationToDays(longest);

  roles.forEach((role) => {
    const days = durationToDays(role.duration);

    if (days > longestDays) {
      longest = role.duration;
      longestDays = days;
    }
  });

  return longest;
}

function normalizeMatchingResult(
  data: unknown
): RoleMatchGroup[] {
  if (!data || typeof data !== "object") return [];

  const response = data as Record<string, unknown>;

  const matching = Array.isArray(response.matching)
    ? response.matching
    : [];

  return matching
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    )
    .map((item) => {
      const freelancers = Array.isArray(item.freelancers)
        ? item.freelancers
        : [];

      return {
        role:
          typeof item.role === "string"
            ? item.role
            : "",
        freelancers: freelancers
          .filter(
            (
              candidate
            ): candidate is Record<string, unknown> =>
              typeof candidate === "object" &&
              candidate !== null
          )
          .map((candidate) => ({
            id:
              typeof candidate.id === "string"
                ? candidate.id
                : "",
            name:
              typeof candidate.name === "string"
                ? candidate.name
                : "Freelancer",
            title:
              typeof candidate.title === "string"
                ? candidate.title
                : undefined,
            avatar:
              typeof candidate.avatar === "string"
                ? candidate.avatar
                : undefined,
            role:
              typeof item.role === "string"
                ? item.role
                : "",
            score:
              typeof candidate.score === "number"
                ? candidate.score
                : 0,
            skills: asStringArray(candidate.skills),
            availability:
              typeof candidate.availability === "string"
                ? candidate.availability
                : undefined,
            reason:
              typeof candidate.reason === "string"
                ? candidate.reason
                : undefined,
            isEligibleForRole:
              candidate.isEligibleForRole === true,
          }))
          .filter((talent) => talent.id),
      };
    })
    .filter((group) => group.role);
}

export default function CreateProjectPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] =
    useState<Step>("project");

  const [error, setError] = useState("");

  const [brief, setBrief] = useState<Brief>({
    title: "",
    category: "",
    description: "",
    skills: [],
    expertiseAreas: [],
    deliveryFormats: [],
  });

  const [files, setFiles] = useState<File[]>([]);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [analyzingPhase, setAnalyzingPhase] =
    useState<"analysis" | "matching">("analysis");

  /**
   * Analiz durumu:
   * - idle/loading: `analyzing`
   * - success: `analysis` dolu, `analysisFailed` false
   * - temporary_error: AI geçici olarak yoğun (503) — tekrar denenebilir
   * - permanent_error: kalıcı/yapılandırma hatası — yine de tekrar denenebilir
   *   ama kullanıcıya farklı bir ton ile gösterilir
   *
   * Girilen proje bilgileri (brief/files) bu state'lerden bağımsız,
   * hata durumunda sıfırlanmaz.
   */
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [analysisRetryable, setAnalysisRetryable] = useState(true);

  const [analysis, setAnalysis] =
    useState<ProjectAnalysis | null>(null);

  /*
   * Plus/Pro zenginleştirme — additive alanlar. Free kullanıcıda
   * ikisi de null gelir, `analysis` (temel akış) hiç etkilenmez.
   */
  const [advancedAnalysis, setAdvancedAnalysis] =
    useState<PlusProjectAnalysis | null>(null);
  const [proAnalysis, setProAnalysis] =
    useState<ProProjectAnalysis | null>(null);
  const [aiUsage, setAiUsage] =
    useState<{ count: number; monthlyLimit: number; limitReached: boolean } | null>(null);

  const { can: canUseAiFeature } = usePremium();

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [matching, setMatching] =
    useState<RoleMatchGroup[]>([]);

  const [selectionMode, setSelectionMode] =
    useState<SelectionMode>("none");

  const [selectedTeamMatches, setSelectedTeamMatches] =
    useState<Record<string, Talent[]>>({});

  const [selectedFreelancer, setSelectedFreelancer] =
    useState<Talent | null>(null);

  const [generalBudget, setGeneralBudget] =
    useState("");

  const [generalBudgetMode, setGeneralBudgetMode] =
    useState<"preset" | "custom">("preset");

  const [generalBudgetPreset, setGeneralBudgetPreset] =
    useState("");

  const [projectDuration, setProjectDuration] =
    useState("");

  const [publishing, setPublishing] =
    useState(false);

  function updateBrief<K extends keyof Brief>(
    key: K,
    value: Brief[K]
  ) {
    setBrief((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateRole(
    id: string,
    updates: Partial<Role>
  ) {
    setRoles((current) =>
      current.map((role) => {
        if (role.id !== id) return role;

        const memberCount = Math.max(
          1,
          Math.floor(
            updates.memberCount ??
              role.memberCount ??
              1
          )
        );

        const budgetPerPerson = Math.max(
          0,
          Math.round(
            updates.budgetPerPerson ??
              role.budgetPerPerson ??
              0
          )
        );

        return {
          ...role,
          ...updates,
          memberCount,
          budgetPerPerson,
          budget: calculateRoleTotal(
            memberCount,
            budgetPerPerson
          ),
        };
      })
    );
  }

  const teamTotalBudget = roles.reduce(
    (sum, role) =>
      sum +
      calculateRoleTotal(
        role.memberCount,
        role.budgetPerPerson
      ),
    0
  );

  const totalBudget =
    selectionMode === "team"
      ? teamTotalBudget
      : parseTL(generalBudget);

  const teamBudgetReady =
    roles.length > 0 &&
    roles.every(
      (role) =>
        role.memberCount > 0 &&
        role.budgetPerPerson > 0 &&
        role.duration.trim().length > 0
    );

  const budgetIsReady =
    selectionMode === "team"
      ? teamBudgetReady
      : totalBudget > 0 &&
        projectDuration.trim().length > 0;

  function continueToNeeds() {
    setError("");

    if (!brief.title.trim()) {
      setError("Proje başlığını girin.");
      return;
    }

    if (!brief.category) {
      setError("Bir kategori seçin.");
      return;
    }

    if (!brief.description.trim()) {
      setError("Proje açıklamasını girin.");
      return;
    }

    setStep("needs");
  }

  function continueToAnalysis() {
    setError("");

    if (
      brief.skills.length === 0 &&
      brief.expertiseAreas.length === 0
    ) {
      setError(
        "En az bir beceri veya uzmanlık alanı seçin."
      );
      return;
    }

    setStep("analysis");
  }

  async function runAnalysis() {
    setError("");
    setAnalysisFailed(false);
    setAnalyzing(true);
    setAnalyzingPhase("analysis");

    try {
      const requirementLines = [
        brief.deliveryFormats.length > 0
          ? `Teslim formatı: ${brief.deliveryFormats.join(
              ", "
            )}`
          : undefined,

        files.length > 0
          ? `Eklenen dosyalar: ${files
              .map((file) => file.name)
              .join(", ")}`
          : undefined,
      ].filter(
        (line): line is string =>
          typeof line === "string"
      );

      const analyzeResponse = await fetch(
        "/api/ai/analyze-project",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: brief.title.trim(),
            description: brief.description.trim(),
            context: `Proje kategorisi: ${brief.category}`,
            requirements:
              requirementLines.length > 0
                ? requirementLines.join("\n")
                : undefined,
            expertise: brief.expertiseAreas,
            skills: brief.skills,
          }),
        }
      );

      const analyzeData =
        await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        setAnalysisRetryable(
          analyzeResponse.status === 503 || analyzeData?.retryable === true
        );

        throw new Error(
          analyzeData?.error ||
            "Proje analizi sırasında bir hata oluştu."
        );
      }

      const nextAnalysis =
        (analyzeData?.analysis ||
          analyzeData) as ProjectAnalysis;

      setAnalysis(nextAnalysis);

      setAdvancedAnalysis(
        (analyzeData?.advancedAnalysis as PlusProjectAnalysis | null) ?? null
      );
      setProAnalysis(
        (analyzeData?.proAnalysis as ProProjectAnalysis | null) ?? null
      );
      setAiUsage(
        analyzeData?.aiUsage ?? null
      );

      const roleDetails = Array.isArray(
        nextAnalysis?.roleDetails
      )
        ? nextAnalysis.roleDetails
        : [];

      const normalizedRoles: Role[] =
        roleDetails
          .map((detail, index): Role | null => {
            const item =
              detail as unknown as Record<
                string,
                unknown
              >;

            const name =
              typeof item.role === "string"
                ? item.role.trim()
                : "";

            if (!name) return null;

            return {
              id: `role-${Date.now()}-${index}`,
              name,
              memberCount: 1,
              budgetPerPerson: 0,
              budget: 0,
              duration: "",
              reason:
                typeof item.reason === "string"
                  ? item.reason
                  : undefined,
              responsibilities:
                asStringArray(
                  item.responsibilities
                ),
              skills: asStringArray(
                item.requiredSkills
              ),
              preferredSkills:
                asStringArray(
                  item.preferredSkills
                ),
            };
          })
          .filter(
            (role): role is Role =>
              role !== null
          );

      setRoles(normalizedRoles);

      if (normalizedRoles.length === 0) {
        setMatching([]);
        return;
      }

      setAnalyzingPhase("matching");

      const matchResponse = await fetch(
        "/api/ai/match-talent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            analysis: nextAnalysis,
            roles: normalizedRoles.map(
              (role) => ({
                name: role.name,
                memberCount:
                  role.memberCount,
                responsibilities:
                  role.responsibilities,
                skills: role.skills,
                preferredSkills:
                  role.preferredSkills,
                reason: role.reason,
              })
            ),
          }),
        }
      );

      const matchData =
        await matchResponse.json();

      if (!matchResponse.ok) {
        console.error(
          "Freelancer eşleştirme hatası:",
          matchData?.error
        );

        setMatching([]);
        return;
      }

      setMatching(
        normalizeMatchingResult(matchData)
      );
    } catch (err) {
      console.error(
        "Proje analiz hatası:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Proje analizi tamamlanamadı."
      );

      setAnalysisFailed(true);
      // Kullanıcı "analysis" ekranında kalır; girdiği proje bilgileri
      // (brief/files) korunur, baştan yazmak zorunda kalmaz.
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => {
    if (
      step === "analysis" &&
      !analysis &&
      !analyzing
    ) {
      void runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const teamAverageScore =
    roles.length > 0
      ? Math.round(
          roles.reduce(
            (sum, role) => {
              const group =
                matching.find(
                  (item) =>
                    item.role === role.name
                );

              const top =
                group?.freelancers[0]?.score ??
                0;

              return sum + top;
            },
            0
          ) / roles.length
        )
      : 0;

  const bestOverallFreelancer: Talent | null =
    matching
      .flatMap(
        (group) => group.freelancers
      )
      .sort((a, b) => {
        if (
          a.isEligibleForRole !==
          b.isEligibleForRole
        ) {
          return a.isEligibleForRole
            ? -1
            : 1;
        }

        return b.score - a.score;
      })[0] ?? null;

  function chooseTeam() {
    setError("");
    setSelectionMode("team");
    setSelectedFreelancer(null);

    /*
     * Burada freelancerları otomatik olarak
     * seçmiyoruz.
     *
     * AI önerileri ProjectMatches olarak kalır.
     * Client isterse tek tek seçebilir.
     */
    setSelectedTeamMatches({});
  }

  function chooseFreelancer() {
    setError("");
    setSelectionMode("freelancer");
    setSelectedTeamMatches({});
    setSelectedFreelancer(
      bestOverallFreelancer
    );
  }

  function chooseNone() {
    setError("");
    setSelectionMode("none");
    setSelectedTeamMatches({});
    setSelectedFreelancer(null);
  }

  function toggleRoleCandidate(
    role: Role,
    talent: Talent
  ) {
    setSelectedTeamMatches((current) => {
      const existing =
        current[role.id] ?? [];

      const alreadySelected =
        existing.some(
          (item) => item.id === talent.id
        );

      if (alreadySelected) {
        return {
          ...current,
          [role.id]: existing.filter(
            (item) =>
              item.id !== talent.id
          ),
        };
      }

      if (
        existing.length >=
        role.memberCount
      ) {
        return current;
      }

      return {
        ...current,
        [role.id]: [
          ...existing,
          talent,
        ],
      };
    });
  }

  function continueToBudget() {
    setError("");

    if (
      selectionMode === "team" &&
      roles.length === 0
    ) {
      setError(
        "AI ekip önerisi oluşturamadı. Freelancer veya seçim yapmadan devam edebilirsiniz."
      );
      return;
    }

    setStep("budget");
  }

  function handleGeneralBudgetPreset(
    value: string
  ) {
    setGeneralBudgetPreset(value);
    setGeneralBudgetMode("preset");

    const numericValue = Number(value);

    if (numericValue > 0) {
      setGeneralBudget(
        String(numericValue)
      );
    }
  }

  function handleGeneralBudgetCustom(
    value: string
  ) {
    setGeneralBudgetMode("custom");
    setGeneralBudgetPreset("");
    setGeneralBudget(value);
  }

  async function publishProject() {
    setError("");

    if (!budgetIsReady) {
      setError(
        selectionMode === "team"
          ? "Her rol için kişi sayısı, bütçe ve süreyi tamamlayın."
          : "Geçerli bir bütçe ve proje süresi girin."
      );
      return;
    }

    setPublishing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Proje oluşturmak için giriş yapmalısınız."
        );
      }

      const budgetBreakdown =
        selectionMode === "team"
          ? roles.map((role) => ({
              roleId: role.id,
              role: role.name.trim(),
              memberCount:
                role.memberCount,
              budgetPerPerson:
                role.budgetPerPerson,
              budget: role.budget,
              duration: role.duration,
              responsibilities:
                role.responsibilities,
              requiredSkills:
                role.skills,
              preferredSkills:
                role.preferredSkills,
            }))
          : [];

      const estimatedDuration =
        selectionMode === "team"
          ? getLongestDuration(roles)
          : projectDuration;

      const requirementLines = [
        brief.expertiseAreas.length > 0
          ? `Aranan uzmanlık alanları: ${brief.expertiseAreas.join(
              ", "
            )}`
          : undefined,

        brief.deliveryFormats.length > 0
          ? `Teslim formatı: ${brief.deliveryFormats.join(
              ", "
            )}`
          : undefined,

        files.length > 0
          ? `Eklenen dosyalar: ${files
              .map((file) => file.name)
              .join(", ")}`
          : undefined,
      ].filter(
        (line): line is string =>
          typeof line === "string"
      );

      /*
       * ÖNEMLİ:
       * project_mode kullanılmıyor.
       *
       * projects tablosunda olmayan:
       * - project_mode
       * - roles
       * - selected_talents
       *
       * insert edilmiyor.
       *
       * AI önerileri gerçek Project Team değildir.
       */

      const projectPayload = {
        client_id: user.id,
        title: brief.title.trim(),
        description:
          brief.description.trim(),
        status: "open",
        category: brief.category,

        budget: totalBudget,

        budget_breakdown:
          budgetBreakdown,

        team_required:
          selectionMode === "team",

        team_size:
          selectionMode === "team"
            ? roles.reduce(
                (sum, role) =>
                  sum + role.memberCount,
                0
              )
            : 1,

        estimated_duration:
          estimatedDuration,

          requirements: requirementLines,

        deadline:
          parseDurationToDate(
            estimatedDuration
          ),

        skills: uniqueStrings([
          ...brief.skills,
          ...(selectionMode === "team"
            ? roles.flatMap(
                (role) => role.skills
              )
            : []),
        ]),
      };

      const {
        data: project,
        error: projectError,
      } = await supabase
        .from("projects")
        .insert(projectPayload)
        .select("id")
        .single();

      if (projectError || !project) {
        throw new Error(
          projectError?.message ||
            "Proje oluşturulamadı."
        );
      }

      router.push("/client/projects");
    } catch (err) {
      console.error(
        "Proje yayınlama hatası:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Proje yayınlanamadı."
      );
    } finally {
      setPublishing(false);
    }
  }

  function goBack() {
    setError("");

    if (step === "project") {
      router.push("/client/projects");
      return;
    }

    if (step === "needs") {
      setStep("project");
      return;
    }

    if (step === "analysis") {
      setStep("needs");
      return;
    }

    if (step === "budget") {
      setStep("analysis");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)]">
      <PageHeader
        title="Yeni Proje"
        onBack={goBack}
      />

      <StepIndicator step={step} />

      <div
        className={`${CONTAINER} pb-20`}
      >
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "project" && (
          <ProjectStep
            brief={brief}
            files={files}
            setFiles={setFiles}
            updateBrief={updateBrief}
            onContinue={
              continueToNeeds
            }
          />
        )}

        {step === "needs" && (
          <NeedsStep
            brief={brief}
            updateBrief={updateBrief}
            onBack={goBack}
            onContinue={
              continueToAnalysis
            }
          />
        )}

        {step === "analysis" && (
          <AnalysisStep
            analyzing={analyzing}
            analyzingPhase={
              analyzingPhase
            }
            analysis={analysis}
            advancedAnalysis={advancedAnalysis}
            proAnalysis={proAnalysis}
            aiUsage={aiUsage}
            canUseDeepAnalysis={canUseAiFeature("advanced_matching_client")}
            analysisFailed={analysisFailed}
            analysisRetryable={analysisRetryable}
            analysisError={error}
            onRetryAnalysis={() => void runAnalysis()}
            roles={roles}
            matching={matching}
            teamAverageScore={
              teamAverageScore
            }
            bestOverallFreelancer={
              bestOverallFreelancer
            }
            selectionMode={
              selectionMode
            }
            selectedTeamMatches={
              selectedTeamMatches
            }
            onChooseTeam={
              chooseTeam
            }
            onChooseFreelancer={
              chooseFreelancer
            }
            onChooseNone={
              chooseNone
            }
            onToggleRoleCandidate={
              toggleRoleCandidate
            }
            onBack={goBack}
            onContinue={
              continueToBudget
            }
          />
        )}

        {step === "budget" && (
          <BudgetPublishStep
            brief={brief}
            selectionMode={
              selectionMode
            }
            roles={roles}
            updateRole={updateRole}
            selectedFreelancer={
              selectedFreelancer
            }
            generalBudget={
              generalBudget
            }
            generalBudgetMode={
              generalBudgetMode
            }
            generalBudgetPreset={
              generalBudgetPreset
            }
            setGeneralBudget={
              setGeneralBudget
            }
            setGeneralBudgetMode={
              setGeneralBudgetMode
            }
            setGeneralBudgetPreset={
              setGeneralBudgetPreset
            }
            handleGeneralBudgetPreset={
              handleGeneralBudgetPreset
            }
            handleGeneralBudgetCustom={
              handleGeneralBudgetCustom
            }
            projectDuration={
              projectDuration
            }
            setProjectDuration={
              setProjectDuration
            }
            totalBudget={totalBudget}
            budgetIsReady={
              budgetIsReady
            }
            publishing={publishing}
            onBack={goBack}
            onPublish={
              publishProject
            }
          />
        )}
      </div>
    </main>
  );
}

function ProjectStep({
  brief,
  files,
  setFiles,
  updateBrief,
  onContinue,
}: {
  brief: Brief;
  files: File[];
  setFiles: React.Dispatch<
    React.SetStateAction<File[]>
  >;
  updateBrief: <
    K extends keyof Brief
  >(
    key: K,
    value: Brief[K]
  ) => void;
  onContinue: () => void;
}) {
  function handleFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected = Array.from(
      event.target.files || []
    );

    setFiles((current) =>
      [...current, ...selected].slice(
        0,
        10
      )
    );

    event.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  return (
    <section className="pt-10">
      <div className="mb-10">
        <p className={EYEBROW}>
          01 / Proje
        </p>

        <h1 className={HEADING}>
          Projenizi anlatın
        </h1>

        <p className={SUBTEXT}>
          Projenizi ne kadar net
          anlatırsanız, AI analizi ve
          freelancer eşleşmeleri o kadar
          doğru olur.
        </p>
      </div>

      <div
        className={`${CARD} space-y-6 p-6 sm:p-8`}
      >
        <Field label="Proje başlığı">
          <input
            value={brief.title}
            onChange={(event) =>
              updateBrief(
                "title",
                event.target.value
              )
            }
            placeholder="Örn. Yeni e-ticaret sitesi tasarımı"
            className={INPUT}
          />
        </Field>

        <Field label="Kategori">
          <Select
            value={brief.category}
            onChange={(value) =>
              updateBrief(
                "category",
                value
              )
            }
            options={CATEGORIES}
            placeholder="Kategori seçin"
          />
        </Field>

        <TextArea
          label="Proje açıklaması"
          value={brief.description}
          onChange={(value) =>
            updateBrief(
              "description",
              value
            )
          }
          placeholder="Ne yapmak istediğinizi, mevcut durumu ve beklentilerinizi anlatın..."
          rows={8}
        />

        <div>
          <label className={LABEL}>
            Proje dökümanları
          </label>

          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-10 transition hover:border-gray-400 hover:bg-gray-50">
            <div className="text-center">
              <Upload className="mx-auto h-5 w-5 text-gray-400" />

              <p className="mt-3 text-sm font-medium text-[#222]">
                Dosya seç
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Brief, PDF, görsel veya
                referans dosyaları · en fazla
                10 dosya
              </p>
            </div>

            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
          </label>

          {files.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {files.map(
                (file, index) => (
                  <FileThumbnail
                    key={`${file.name}-${index}`}
                    file={file}
                    onRemove={() =>
                      removeFile(index)
                    }
                  />
                )
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={onContinue}
            className={BTN_PRIMARY}
          >
            Devam et
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function NeedsStep({
  brief,
  updateBrief,
  onBack,
  onContinue,
}: {
  brief: Brief;
  updateBrief: <
    K extends keyof Brief
  >(
    key: K,
    value: Brief[K]
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="pt-10">
      <div className="mb-10">
        <p className={EYEBROW}>
          02 / İhtiyaçlar
        </p>

        <h1 className={HEADING}>
          Projenizde neye ihtiyacınız var?
        </h1>

        <p className={SUBTEXT}>
          Gerekli beceri ve uzmanlık
          alanlarını, teslim formatını
          belirtin. AI bunları projenizin
          açıklamasıyla birlikte
          değerlendirecek.
        </p>
      </div>

      <div
        className={`${CARD} space-y-8 p-6 sm:p-8`}
      >
        <MultiSelect
          label="Projede gerekli beceriler"
          values={brief.skills}
          options={SKILL_OPTIONS}
          onChange={(values) =>
            updateBrief(
              "skills",
              values
            )
          }
          placeholder="Beceri ekle"
          searchPlaceholder="Beceri ara..."
        />

        <MultiSelect
          label="Projede gerekli uzmanlıklar"
          values={
            brief.expertiseAreas
          }
          options={
            EXPERTISE_OPTIONS
          }
          onChange={(values) =>
            updateBrief(
              "expertiseAreas",
              values
            )
          }
          placeholder="Uzmanlık alanı ekle"
          searchPlaceholder="Uzmanlık ara..."
        />

        <MultiSelect
          label="Proje teslim formatı"
          values={
            brief.deliveryFormats
          }
          options={
            DELIVERY_FORMATS
          }
          onChange={(values) =>
            updateBrief(
              "deliveryFormats",
              values
            )
          }
          placeholder="Teslim formatı ekle"
          searchPlaceholder="Format ara..."
        />

        <div className="flex items-center justify-between border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={onBack}
            className={BTN_GHOST}
          >
            <ChevronLeft className="h-4 w-4" />
            Geri
          </button>

          <button
            type="button"
            onClick={onContinue}
            className={BTN_PRIMARY}
          >
            <Sparkles className="h-4 w-4" />
            Projeyi analiz et
          </button>
        </div>
      </div>
    </section>
  );
}

function AnalysisStep({
  analyzing,
  analyzingPhase,
  analysis,
  advancedAnalysis,
  proAnalysis,
  aiUsage,
  canUseDeepAnalysis,
  analysisFailed,
  analysisRetryable,
  analysisError,
  onRetryAnalysis,
  roles,
  matching,
  teamAverageScore,
  bestOverallFreelancer,
  selectionMode,
  selectedTeamMatches,
  onChooseTeam,
  onChooseFreelancer,
  onChooseNone,
  onToggleRoleCandidate,
  onBack,
  onContinue,
}: {
  analyzing: boolean;
  analyzingPhase:
    | "analysis"
    | "matching";
  analysis:
    | ProjectAnalysis
    | null;
  advancedAnalysis: PlusProjectAnalysis | null;
  proAnalysis: ProProjectAnalysis | null;
  aiUsage: { count: number; monthlyLimit: number; limitReached: boolean } | null;
  canUseDeepAnalysis: boolean;
  analysisFailed: boolean;
  analysisRetryable: boolean;
  analysisError: string;
  onRetryAnalysis: () => void;
  roles: Role[];
  matching: RoleMatchGroup[];
  teamAverageScore: number;
  bestOverallFreelancer:
    | Talent
    | null;
  selectionMode:
    | SelectionMode;
  selectedTeamMatches:
    Record<
      string,
      Talent[]
    >;
  onChooseTeam: () => void;
  onChooseFreelancer: () => void;
  onChooseNone: () => void;
  onToggleRoleCandidate: (
    role: Role,
    talent: Talent
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="pt-10">
      <div className="mb-10">
        <p className={EYEBROW}>
          03 / AI analizi & eşleşme
        </p>

        <h1 className={HEADING}>
          {analyzing
            ? "Projenizi analiz ediyoruz..."
            : "Projeniz için önerilerimiz"}
        </h1>

        {!analyzing &&
          analysis?.summary && (
            <p className={SUBTEXT}>
              {analysis.summary}
            </p>
          )}
      </div>

      {analyzing ? (
        <div
          className={`${CARD} p-10 text-center`}
        >
          <AnalyzingState />

          <p className="mt-4 text-sm text-gray-500">
            {analyzingPhase ===
            "analysis"
              ? "Proje ihtiyaçlarınız değerlendiriliyor..."
              : "Uygun ekip ve freelancerlar aranıyor..."}
          </p>
        </div>
      ) : analysisFailed ? (
        <div className={`${CARD} p-10 text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle size={22} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {analysisRetryable
              ? "AI analizi şu anda kullanılamıyor"
              : "Proje analizi tamamlanamadı"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            {analysisError ||
              (analysisRetryable
                ? "AI servisi geçici olarak yoğun. Lütfen birkaç dakika sonra tekrar deneyin."
                : "Analiz sırasında bir sorun oluştu.")}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-gray-400">
            Girdiğin proje bilgileri ve dosyalar korunuyor, baştan yazmana gerek yok.
          </p>
          <button
            type="button"
            onClick={onRetryAnalysis}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
          >
            <RotateCcw size={16} />
            Tekrar Dene
          </button>
        </div>
      ) : (
        <>
          {analysis && (
            <AdvancedAnalysisSection
              advancedAnalysis={advancedAnalysis}
              proAnalysis={proAnalysis}
              aiUsage={aiUsage}
              canUseDeepAnalysis={canUseDeepAnalysis}
            />
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <MatchOptionCard
              eyebrow="AI önerisi"
              title="Önerilen ekip"
              selected={
                selectionMode === "team"
              }
              onSelect={
                onChooseTeam
              }
              disabled={
                roles.length === 0
              }
            >
              <div className="mt-4 flex items-center justify-between">
                <MatchBadge
                  score={
                    teamAverageScore
                  }
                />

                <span className="text-xs text-gray-500">
                  {roles.length} rol
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {roles.map((role) => {
                  const group =
                    matching.find(
                      (item) =>
                        item.role ===
                        role.name
                    );

                  const top =
                    group
                      ?.freelancers[0];

                  return (
                    <div
                      key={role.id}
                      className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#222]">
                          {role.name}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {role.memberCount}{" "}
                          kişi
                        </p>
                      </div>

                      <span className="text-xs font-semibold text-[#222]">
                        {top
                          ? `%${Math.round(
                              top.score
                            )}`
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectionMode ===
                "team" && (
                <div className="mt-6 space-y-5 border-t border-gray-100 pt-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Ekip üyelerini seç
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Seçtiğiniz kişiler
                      henüz proje ekibine
                      eklenmez. Proje
                      yayınlandıktan sonra
                      teklif ve kabul süreci
                      devam eder.
                    </p>
                  </div>

                  {roles.map((role) => {
                    const candidates = (
                      matching.find(
                        (group) =>
                          group.role ===
                          role.name
                      )?.freelancers ?? []
                    ).slice(0, 3);

                    if (
                      candidates.length ===
                      0
                    ) {
                      return null;
                    }

                    return (
                      <div
                        key={role.id}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#222]">
                            {role.name}
                          </p>

                          <span className="text-xs text-gray-400">
                            {(
                              selectedTeamMatches[
                                role.id
                              ] ?? []
                            ).length}
                            /
                            {
                              role.memberCount
                            }
                          </span>
                        </div>

                        <div className="mt-2 space-y-2">
                          {candidates.map(
                            (candidate) => {
                              const picked =
                                (
                                  selectedTeamMatches[
                                    role.id
                                  ] ?? []
                                ).some(
                                  (item) =>
                                    item.id ===
                                    candidate.id
                                );

                              const disabled =
                                !picked &&
                                (
                                  selectedTeamMatches[
                                    role.id
                                  ] ?? []
                                ).length >=
                                  role.memberCount;

                              return (
                                <button
                                  key={
                                    candidate.id
                                  }
                                  type="button"
                                  onClick={(
                                    event
                                  ) => {
                                    event.stopPropagation();

                                    if (
                                      disabled
                                    ) {
                                      return;
                                    }

                                    onToggleRoleCandidate(
                                      role,
                                      candidate
                                    );
                                  }}
                                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                    picked
                                      ? "border-[#222] bg-gray-50"
                                      : "border-gray-200 bg-white hover:border-gray-300"
                                  } ${
                                    disabled
                                      ? "cursor-not-allowed opacity-40"
                                      : ""
                                  }`}
                                >
                                  <span className="flex min-w-0 items-center gap-3">
                                    <RadioDot
                                      checked={
                                        picked
                                      }
                                    />

                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-medium text-[#222]">
                                        {
                                          candidate.name
                                        }
                                      </span>

                                      {candidate.title && (
                                        <span className="block truncate text-xs text-gray-500">
                                          {
                                            candidate.title
                                          }
                                        </span>
                                      )}
                                    </span>
                                  </span>

                                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                                    <span className="text-xs font-semibold text-[#222]">
                                      %
                                      {Math.round(
                                        candidate.score
                                      )}
                                    </span>

                                    {!candidate.isEligibleForRole && (
                                      <span className="text-xs font-medium text-gray-400">
                                        Rolle uyumlu değil
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </MatchOptionCard>

            <MatchOptionCard
              eyebrow="AI önerisi"
              title="Önerilen freelancer"
              selected={
                selectionMode ===
                "freelancer"
              }
              onSelect={
                onChooseFreelancer
              }
              disabled={
                !bestOverallFreelancer
              }
            >
              {bestOverallFreelancer ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <MatchBadge
                      score={
                        bestOverallFreelancer.score
                      }
                    />
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <UserRound className="h-5 w-5 text-gray-500" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#222]">
                        {
                          bestOverallFreelancer.name
                        }
                      </p>

                      {bestOverallFreelancer.title && (
                        <p className="truncate text-xs text-gray-500">
                          {
                            bestOverallFreelancer.title
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {bestOverallFreelancer.reason && (
                    <p className="mt-4 text-sm leading-6 text-gray-500">
                      {
                        bestOverallFreelancer.reason
                      }
                    </p>
                  )}

                  {bestOverallFreelancer
                    .skills
                    .length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {bestOverallFreelancer.skills
                        .slice(0, 6)
                        .map(
                          (skill) => (
                            <span
                              key={skill}
                              className={TAG}
                            >
                              {skill}
                            </span>
                          )
                        )}
                    </div>
                  )}

                  <div className="mt-6 rounded-xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500">
                    Bu seçim freelancerı
                    doğrudan proje ekibine
                    eklemez. Proje
                    yayınlandıktan sonra
                    teklif ve kabul süreci
                    devam eder.
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-gray-500">
                  Şu anda uygun bir
                  freelancer bulunamadı.
                  Yine de seçim yapmadan
                  devam edebilirsiniz.
                </p>
              )}
            </MatchOptionCard>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onChooseNone}
              className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                selectionMode === "none"
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-[#222]"
              }`}
            >
              {selectionMode ===
              "none"
                ? "Seçim yapılmadı"
                : "Şimdilik ekip veya freelancer seçmeden devam et"}
            </button>
          </div>
        </>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
        <button
          type="button"
          onClick={onBack}
          className={BTN_GHOST}
        >
          <ChevronLeft className="h-4 w-4" />
          Geri
        </button>

        <button
          type="button"
          disabled={
            analyzing || !analysis
          }
          onClick={onContinue}
          className={BTN_PRIMARY}
        >
          Bütçe ve yayına geç
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function AdvancedAnalysisSection({
  advancedAnalysis,
  proAnalysis,
  aiUsage,
  canUseDeepAnalysis,
}: {
  advancedAnalysis: PlusProjectAnalysis | null;
  proAnalysis: ProProjectAnalysis | null;
  aiUsage: { count: number; monthlyLimit: number; limitReached: boolean } | null;
  canUseDeepAnalysis: boolean;
}) {
  return (
    <div className="mb-5">
      <PremiumGate
        feature="advanced_project_analysis"
        title="Daha kapsamlı proje analizi"
        description="Rol/skill boşluklarını, bütçe-süre değerlendirmesini ve daha detaylı rol analizini gör."
        dismissible
      >
        {advancedAnalysis ? (
          <div className={`${CARD} p-6`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Kapsamlı Analiz</h3>
              <span className="rounded-full bg-[var(--color-primary-600)] px-2.5 py-0.5 text-xs font-medium text-white">
                {canUseDeepAnalysis ? "Pro" : "Plus"}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {advancedAnalysis.detailedRoleAnalysis.map((item) => (
                <p key={item.role} className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{item.role}:</span> {item.insight}
                </p>
              ))}
            </div>

            {advancedAnalysis.skillGapInsights.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Beceri İçgörüleri</p>
                <ul className="mt-2 space-y-1">
                  {advancedAnalysis.skillGapInsights.map((insight, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bütçe ve Süre Değerlendirmesi</p>
              <p className="mt-2 text-sm text-gray-600">{advancedAnalysis.budgetDurationAssessment.insight}</p>
              {advancedAnalysis.budgetDurationAssessment.flags.map((flag, index) => (
                <p key={index} className="mt-1 text-sm text-amber-700">
                  ⚠ {flag}
                </p>
              ))}
            </div>

            {proAnalysis && (
              <div className="mt-5 border-t border-gray-100 pt-5">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">Gelişmiş Pro Analizi</h4>
                  <span className="rounded-full bg-[var(--color-primary-600)] px-2 py-0.5 text-[10px] font-medium text-white">Pro</span>
                </div>

                <p className="mt-3 text-sm text-gray-600">{proAnalysis.teamCompositionInsight}</p>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Risk Analizi</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Risk seviyesi:{" "}
                    <span
                      className={`font-medium ${
                        proAnalysis.riskAnalysis.level === "high"
                          ? "text-red-600"
                          : proAnalysis.riskAnalysis.level === "medium"
                            ? "text-amber-600"
                            : "text-emerald-700"
                      }`}
                    >
                      {proAnalysis.riskAnalysis.level === "high"
                        ? "Yüksek"
                        : proAnalysis.riskAnalysis.level === "medium"
                          ? "Orta"
                          : "Düşük"}
                    </span>
                  </p>
                  <ul className="mt-1 space-y-1">
                    {proAnalysis.riskAnalysis.risks.map((risk, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {risk}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Alternatif Rol Önerileri</p>
                  <ul className="mt-1 space-y-1">
                    {proAnalysis.alternativeRoleSuggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Gelişmiş Bütçe İçgörüsü</p>
                  <p className="mt-1 text-sm text-gray-600">{proAnalysis.advancedBudgetInsight}</p>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Gelişmiş Öneriler</p>
                  <ul className="mt-1 space-y-1">
                    {proAnalysis.advancedRecommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {aiUsage && (
              <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
                Bu ay {aiUsage.count}/{aiUsage.monthlyLimit} ek analiz kullanıldı.
              </p>
            )}
          </div>
        ) : aiUsage?.limitReached ? (
          <div className={`${CARD} p-6 text-sm text-gray-500`}>
            Bu ay için ek analiz hakkın doldu ({aiUsage.count}/{aiUsage.monthlyLimit}). Gelecek ay otomatik olarak
            yenilenecek{canUseDeepAnalysis ? "" : " — daha yüksek limit için Pro'ya geçebilirsin"}.
          </div>
        ) : null}
      </PremiumGate>
    </div>
  );
}

function MatchOptionCard({
  eyebrow,
  title,
  selected,
  onSelect,
  disabled,
  children,
}: {
  eyebrow: string;
  title: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onSelect();
        }
      }}
      onKeyDown={(event) => {
        if (
          !disabled &&
          (event.key === "Enter" ||
            event.key === " ")
        ) {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`rounded-[var(--radius-card)] border bg-white p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-gray-300"
      } ${
        selected
          ? "border-[#222] ring-1 ring-[#222]"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-lg font-semibold text-[#222]">
            {title}
          </h2>
        </div>

        <RadioDot
          checked={selected}
          large
        />
      </div>

      {children}
    </div>
  );
}

function RadioDot({
  checked,
  large,
}: {
  checked: boolean;
  large?: boolean;
}) {
  const size = large
    ? "h-5 w-5"
    : "h-4 w-4";

  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full border transition ${
        checked
          ? "border-[#222] bg-[var(--color-primary-600)]"
          : "border-gray-300 bg-white"
      }`}
    >
      {checked && (
        <Check className="h-3 w-3 text-white" />
      )}
    </span>
  );
}

function MatchBadge({
  score,
}: {
  score: number;
}) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-full bg-gray-100 px-3 py-1.5">
      <span className="text-sm font-semibold text-[#222]">
        %{Math.round(score)}
      </span>

      <span className="text-xs text-gray-500">
        Match
      </span>
    </span>
  );
}

function BudgetPublishStep({
  brief,
  selectionMode,
  roles,
  updateRole,
  selectedFreelancer,
  generalBudget,
  generalBudgetMode,
  generalBudgetPreset,
  setGeneralBudget,
  setGeneralBudgetMode,
  setGeneralBudgetPreset,
  handleGeneralBudgetPreset,
  handleGeneralBudgetCustom,
  projectDuration,
  setProjectDuration,
  totalBudget,
  budgetIsReady,
  publishing,
  onBack,
  onPublish,
}: {
  brief: Brief;
  selectionMode: SelectionMode;
  roles: Role[];
  updateRole: (
    id: string,
    updates: Partial<Role>
  ) => void;
  selectedFreelancer:
    | Talent
    | null;
  generalBudget: string;
  generalBudgetMode:
    | "preset"
    | "custom";
  generalBudgetPreset: string;
  setGeneralBudget: (
    value: string
  ) => void;
  setGeneralBudgetMode: (
    value: "preset" | "custom"
  ) => void;
  setGeneralBudgetPreset: (
    value: string
  ) => void;
  handleGeneralBudgetPreset: (
    value: string
  ) => void;
  handleGeneralBudgetCustom: (
    value: string
  ) => void;
  projectDuration: string;
  setProjectDuration: (
    value: string
  ) => void;
  totalBudget: number;
  budgetIsReady: boolean;
  publishing: boolean;
  onBack: () => void;
  onPublish: () => void;
}) {
  const longestDuration =
    selectionMode === "team"
      ? getLongestDuration(roles)
      : projectDuration;

  return (
    <section className="pt-10">
      <div className="mb-10">
        <p className={EYEBROW}>
          04 / Bütçe & yayınla
        </p>

        <h1 className={HEADING}>
          {selectionMode === "team"
            ? "Ekibiniz için bütçeyi belirleyin"
            : "Proje bütçenizi belirleyin"}
        </h1>

        <p className={SUBTEXT}>
          {selectionMode === "team"
            ? "Her rol için kişi sayısını, kişi başı bütçeyi ve çalışma süresini belirleyin. Toplam bütçe otomatik hesaplanır."
            : "Projeniz için uygun bir bütçe ve teslim süresi belirleyin. Freelancerlar yayınlanan projeye teklif gönderebilir."}
        </p>
      </div>

      {selectionMode === "team" ? (
        <div className="space-y-4">
          {roles.map((role) => (
            <RoleBudgetCard
              key={role.id}
              role={role}
              onUpdate={(updates) =>
                updateRole(
                  role.id,
                  updates
                )
              }
            />
          ))}

          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <div
              className={`${CARD} p-6`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                Toplam bütçe
              </p>

              <p className="mt-2 text-3xl font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
                ₺{formatTL(totalBudget)}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Tüm rollerin toplamı
              </p>
            </div>

            <div
              className={`${CARD} p-6`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                Proje süresi
              </p>

              <p className="mt-2 text-lg font-semibold text-[#222]">
                {longestDuration ||
                  "Rol süreleri girilmedi"}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                En uzun rol süresine göre
                belirlenir
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${CARD} p-6 sm:p-8`}>
          {selectionMode ===
            "freelancer" &&
            selectedFreelancer && (
              <div className="mb-8 flex items-center gap-3 border-b border-gray-100 pb-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <UserRound className="h-5 w-5 text-gray-500" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#222]">
                    {
                      selectedFreelancer.name
                    }
                  </p>

                  {selectedFreelancer.title && (
                    <p className="truncate text-xs text-gray-500">
                      {
                        selectedFreelancer.title
                      }
                    </p>
                  )}
                </div>

                <div className="ml-auto">
                  <MatchBadge
                    score={
                      selectedFreelancer.score
                    }
                  />
                </div>
              </div>
            )}

          <div className="grid gap-8 md:grid-cols-2">
            <BudgetSelector
              label="Proje bütçesi"
              value={generalBudget}
              presetValue={
                generalBudgetPreset
              }
              mode={
                generalBudgetMode
              }
              onPresetChange={
                handleGeneralBudgetPreset
              }
              onCustomChange={
                handleGeneralBudgetCustom
              }
            />

            <DurationSelector
              label="Proje süresi"
              value={projectDuration}
              onChange={
                setProjectDuration
              }
            />
          </div>
        </div>
      )}

      <div
        className={`${CARD} mt-8 overflow-hidden`}
      >
        <div className="border-b border-gray-100 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
            Proje özeti
          </p>

          <h2 className="mt-2 text-lg font-semibold text-[#222]">
            {brief.title ||
              "Başlıksız proje"}
          </h2>
        </div>

        <div className="grid gap-px bg-gray-100 sm:grid-cols-2">
          <SummaryRow
            label="Kategori"
            value={
              brief.category || "—"
            }
          />

          <SummaryRow
            label="Teslim formatı"
            value={
              brief.deliveryFormats
                .length > 0
                ? brief.deliveryFormats.join(
                    ", "
                  )
                : "—"
            }
          />

          <SummaryRow
            label="Beceriler"
            value={
              brief.skills.length > 0
                ? brief.skills.join(
                    ", "
                  )
                : "—"
            }
          />

          <SummaryRow
            label="Uzmanlıklar"
            value={
              brief.expertiseAreas
                .length > 0
                ? brief.expertiseAreas.join(
                    ", "
                  )
                : "—"
            }
          />

          <SummaryRow
            label="Bütçe"
            value={
              totalBudget > 0
                ? `₺${formatTL(
                    totalBudget
                  )}`
                : "—"
            }
            strong
          />

          <SummaryRow
            label="Süre"
            value={
              longestDuration || "—"
            }
            strong
          />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={publishing}
          className={BTN_GHOST}
        >
          <ChevronLeft className="h-4 w-4" />
          Geri
        </button>

        <button
          type="button"
          disabled={
            publishing ||
            !budgetIsReady
          }
          onClick={onPublish}
          className={BTN_PRIMARY}
        >
          {publishing
            ? "Yayınlanıyor..."
            : "Projeyi Yayınla"}

          {!publishing && (
            <Check className="h-4 w-4" />
          )}
        </button>
      </div>
    </section>
  );
}

function RoleBudgetCard({
  role,
  onUpdate,
}: {
  role: Role;
  onUpdate: (
    updates: Partial<Role>
  ) => void;
}) {
  const [budgetMode, setBudgetMode] =
    useState<"preset" | "custom">(
      role.budgetPerPerson > 0
        ? "custom"
        : "preset"
    );

  const [presetValue, setPresetValue] =
    useState("");

  function handlePreset(
    value: string
  ) {
    setBudgetMode("preset");
    setPresetValue(value);

    const numericValue =
      Number(value);

    if (numericValue > 0) {
      onUpdate({
        budgetPerPerson:
          numericValue,
      });
    }
  }

  function handleCustom(
    value: string
  ) {
    setBudgetMode("custom");
    setPresetValue("");

    onUpdate({
      budgetPerPerson:
        parseTL(value),
    });
  }

  return (
    <div
      className={`${CARD} p-5 sm:p-6`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold text-[#222]">
            {role.name}
          </p>

          {role.reason && (
            <p className="mt-1 max-w-xl text-xs leading-5 text-gray-500">
              {role.reason}
            </p>
          )}
        </div>

        <div className="shrink-0">
          <p className="text-xs text-gray-400">
            Rol toplamı
          </p>

          <p className="mt-0.5 text-lg font-semibold text-[#222]">
            ₺{formatTL(role.budget)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <Field label="Kişi sayısı">
          <Select
            value={String(
              role.memberCount
            )}
            onChange={(value) =>
              onUpdate({
                memberCount:
                  Number(value),
              })
            }
            options={["1", "2", "3", "4", "5", "6", "7", "8"]}
            placeholder="Kişi sayısı"
          />
        </Field>

        <BudgetSelector
          label="Kişi başı bütçe"
          value={
            role.budgetPerPerson
              ? String(
                  role.budgetPerPerson
                )
              : ""
          }
          presetValue={presetValue}
          mode={budgetMode}
          compact
          onPresetChange={
            handlePreset
          }
          onCustomChange={
            handleCustom
          }
        />

        <DurationSelector
          label="Rol süresi"
          value={role.duration}
          onChange={(value) =>
            onUpdate({
              duration: value,
            })
          }
          compact
        />
      </div>

      {role.memberCount > 0 &&
        role.budgetPerPerson > 0 && (
          <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <span className="text-xs text-gray-500">
              {role.memberCount} kişi × ₺
              {formatTL(
                role.budgetPerPerson
              )}
            </span>

            <span className="text-sm font-semibold text-[#222]">
              ₺{formatTL(role.budget)}
            </span>
          </div>
        )}
    </div>
  );
}

function BudgetSelector({
  label,
  value,
  presetValue,
  mode,
  onPresetChange,
  onCustomChange,
  compact = false,
}: {
  label: string;
  value: string;
  presetValue: string;
  mode: "preset" | "custom";
  onPresetChange: (
    value: string
  ) => void;
  onCustomChange: (
    value: string
  ) => void;
  compact?: boolean;
}) {
  return (
    <div>
      <label className={LABEL}>
        {label}
      </label>

      {mode === "preset" ? (
        <div className="relative">
          <select
            value={presetValue}
            onChange={(event) => {
              if (
                event.target.value ===
                "custom"
              ) {
                onCustomChange("");
              } else {
                onPresetChange(
                  event.target.value
                );
              }
            }}
            className={`${INPUT} appearance-none pr-10 ${
              compact
                ? "h-11"
                : ""
            }`}
          >
            <option value="">
              Bütçe aralığı seçin
            </option>

            {BUDGET_PRESETS.map(
              (preset) => (
                <option
                  key={preset.label}
                  value={String(
                    preset.value
                  )}
                >
                  {preset.label}
                </option>
              )
            )}

            <option value="custom">
              Kendim belirlemek istiyorum
            </option>
          </select>

          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={
                value
                  ? formatTL(
                      parseTL(value)
                    )
                  : ""
              }
              onChange={(event) =>
                onCustomChange(
                  event.target.value
                )
              }
              placeholder="Örn. 37.500"
              className={`${INPUT} pr-12 ${
                compact
                  ? "h-11"
                  : ""
              }`}
            />

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
              TL
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              onPresetChange("")
            }
            className="shrink-0 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-500 transition hover:border-gray-300 hover:text-[#222]"
          >
            Aralık
          </button>
        </div>
      )}

      {mode === "custom" && (
        <p className="mt-1.5 text-xs text-gray-400">
          Bütçeyi istediğiniz rakam
          olarak belirleyebilirsiniz.
        </p>
      )}
    </div>
  );
}

function DurationSelector({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  compact?: boolean;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className={`${INPUT} appearance-none pr-10 ${
            compact
              ? "h-11"
              : ""
          }`}
        >
          <option value="">
            Süre seçin
          </option>

          {DURATION_OPTIONS.map(
            (option) => (
              <option
                key={option.label}
                value={option.label}
              >
                {option.label}
              </option>
            )
          )}
        </select>

        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </Field>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="bg-gray-50 p-4">
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 ${
          strong
            ? "text-base font-semibold"
            : "text-sm font-medium"
        } text-[#222]`}
      >
        {value}
      </p>
    </div>
  );
}

function PageHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div
        className={`${CONTAINER} flex items-center gap-4 py-5`}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-gray-400 transition hover:bg-gray-100 hover:text-[#222]"
          aria-label="Geri"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {title}
        </h1>
      </div>
    </header>
  );
}

function StepIndicator({
  step,
}: {
  step: Step;
}) {
  const steps: {
    id: Step;
    label: string;
  }[] = [
    {
      id: "project",
      label: "Proje",
    },
    {
      id: "needs",
      label: "İhtiyaçlar",
    },
    {
      id: "analysis",
      label: "AI & Eşleşme",
    },
    {
      id: "budget",
      label: "Bütçe & Yayınla",
    },
  ];

  const currentIndex =
    steps.findIndex(
      (item) => item.id === step
    );

  return (
    <div
      className={`${CONTAINER} pt-6`}
    >
      <div className="hidden items-center rounded-[var(--radius-card)] border border-gray-200 bg-white px-6 py-4 sm:flex">
        {steps.map(
          (item, index) => {
            const done =
              index < currentIndex;

            const current =
              index ===
              currentIndex;

            return (
              <React.Fragment
                key={item.id}
              >
                <div className="flex shrink-0 items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      done || current
                        ? "bg-[var(--color-primary-600)] text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )
                    )}
                  </div>

                  <p
                    className={`text-[13px] font-medium ${
                      done || current
                        ? "text-[#222]"
                        : "text-gray-400"
                    }`}
                  >
                    {item.label}
                  </p>
                </div>

                {index <
                  steps.length -
                    1 && (
                  <div
                    className={`mx-4 h-px min-w-8 flex-1 ${
                      index <
                      currentIndex
                        ? "bg-[var(--color-primary-600)]"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          }
        )}
      </div>

      <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-gray-200 bg-white px-4 py-3 sm:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Adım{" "}
            {currentIndex + 1} /{" "}
            {steps.length}
          </p>

          <p className="mt-0.5 text-[13px] font-medium text-[#222]">
            {
              steps[currentIndex]
                ?.label
            }
          </p>
        </div>

        <div className="flex gap-1">
          {steps.map(
            (item, index) => (
              <span
                key={item.id}
                className={`h-1.5 rounded-full transition-all ${
                  index ===
                  currentIndex
                    ? "w-6 bg-[var(--color-primary-600)]"
                    : index <
                        currentIndex
                      ? "w-3 bg-gray-400"
                      : "w-3 bg-gray-200"
                }`}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={LABEL}>
        {label}
      </label>

      {children}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 6,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        rows={rows}
        className={`${INPUT} h-auto resize-none leading-6`}
      />
    </Field>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (
    value: string
  ) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className={`${INPUT} appearance-none pr-10`}
      >
        <option value="">
          {placeholder}
        </option>

        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          )
        )}
      </select>

      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function MultiSelect({
  label,
  values,
  options,
  onChange,
  placeholder = "Ekle",
  searchPlaceholder = "Ara...",
  allowCustom = true,
}: {
  label?: string;
  values: string[];
  options: string[];
  onChange: (
    values: string[]
  ) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean;
}) {
  const [open, setOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const containerRef =
    useRef<HTMLDivElement>(
      null
    );

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  const filteredOptions =
    options.filter(
      (option) =>
        !values.includes(option) &&
        option
          .toLowerCase()
          .includes(
            search
              .trim()
              .toLowerCase()
          )
    );

  function add(option: string) {
    if (values.includes(option))
      return;

    onChange([
      ...values,
      option,
    ]);

    setSearch("");
  }

  function remove(
    option: string
  ) {
    onChange(
      values.filter(
        (value) =>
          value !== option
      )
    );
  }

  return (
    <div>
      {label && (
        <label className={LABEL}>
          {label}
        </label>
      )}

      <div
        ref={containerRef}
        className="relative"
      >
        <button
          type="button"
          onClick={() =>
            setOpen(
              (current) =>
                !current
            )
          }
          className={`${INPUT} flex items-center justify-between text-left`}
        >
          <span
            className={
              values.length > 0
                ? "text-[#222]"
                : "text-gray-400"
            }
          >
            {placeholder}
          </span>

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition ${
              open
                ? "rotate-180"
                : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
            <div className="border-b border-gray-100 p-2">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder={
                  searchPlaceholder
                }
                className="h-10 w-full rounded-lg bg-gray-50 px-3 text-sm text-[#222] outline-none placeholder:text-gray-400 focus:bg-gray-100"
              />
            </div>

            <div className="max-h-60 overflow-y-auto p-1.5">
              {filteredOptions.length ===
              0 ? (
                allowCustom &&
                search.trim() &&
                !values.some(
                  (value) =>
                    value.toLowerCase() ===
                    search.trim().toLowerCase()
                ) ? (
                  <button
                    type="button"
                    onClick={() =>
                      add(search.trim())
                    }
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    <span className="text-gray-400">Ekle:</span>
                    <span className="font-medium text-[#222]">
                      {search.trim()}
                    </span>
                  </button>
                ) : (
                  <div className="px-3 py-6 text-center text-xs text-gray-400">
                    Sonuç bulunamadı.
                  </div>
                )
              ) : (
                filteredOptions.map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        add(
                          option
                        )
                      }
                      className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      {option}
                    </button>
                  )
                )
              )}
            </div>
          </div>
        )}
      </div>

      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {values.map(
            (value) => (
              <span
                key={value}
                className={TAG}
              >
                {value}

                <button
                  type="button"
                  onClick={() =>
                    remove(
                      value
                    )
                  }
                  className="text-gray-400 transition hover:text-gray-700"
                  aria-label={`${value} kaldır`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}

function FileThumbnail({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const isImage =
    file.type.startsWith(
      "image/"
    );

  return (
    <div className="group relative">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-xs text-gray-500">
        {isImage ? (
          <FilePreview
            file={file}
          />
        ) : (
          <span className="px-1 text-center">
            {file.name
              .split(".")
              .pop()
              ?.toUpperCase()}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 opacity-0 shadow-sm transition hover:text-gray-800 group-hover:opacity-100"
        title="Dosyayı kaldır"
        aria-label="Dosyayı kaldır"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function FilePreview({
  file,
}: {
  file: File;
}) {
  const [url] = useState(() =>
    URL.createObjectURL(file)
  );

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(
        url
      );
    };
  }, [url]);

  return (
    <img
      src={url}
      alt={file.name}
      className="h-full w-full object-cover"
    />
  );
}