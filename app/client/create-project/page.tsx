"use client";
import { roleBudgetPlan, roleBudgetMoney } from "@/lib/projects/budgetAllocation";

import React, { useEffect, useRef, useState } from "react";
import { Input, Textarea, inputClasses } from "@/components/ui/Input";
import SharedSelect from "@/components/ui/Select";
import { Button, buttonClasses } from "@/components/ui/Button";
import { cardSurfaceClass } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/components/ui/FormField";
import { ProjectCreationHero, ProjectCreationStepper } from "@/components/projects/creation/ProjectCreationHeader";
import creationStyles from "@/components/projects/creation/ProjectCreation.module.css";
import needsStyles from "@/components/projects/creation/ProjectNeedsVisual.module.css";
import matchStyles from "@/components/projects/creation/ProjectMatchesVisual.module.css";
import { ProjectAnalysisLoading } from "@/components/projects/creation/ProjectAnalysisLoading";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { ProjectAnalysis } from "@/types/ai";
import { usePremium } from "@/lib/hooks/usePremium";
import { ProjectAnalysisSummary } from "@/components/projects/creation/ProjectAnalysisSummary";
import type {
  PlusProjectAnalysis,
  ProProjectAnalysis,
} from "@/lib/ai/projectAnalysisEnrichment";
import { CATEGORIES } from "@/lib/categories";
import {Avatar} from "@/components/ui/Avatar";
import {saveProjectCreationDraft, readProjectCreationDraft, clearProjectCreationDraft} from "@/lib/projects/creationDraft";
import { STANDARD_COMMISSION_RATE } from "@/lib/pricing";

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

const CONTAINER = "w-full";

const CARD = cardSurfaceClass;

const EYEBROW = "cc-caption text-[var(--color-text-secondary)]";

const HEADING = "cc-h2 mt-[var(--rhythm-title-gap)] text-[var(--color-text-primary)]";

const SUBTEXT =
  "mt-2 max-w-2xl text-sm leading-6 text-gray-500";

const INPUT = inputClasses();

const LABEL = "cc-label mb-[var(--rhythm-label-gap)] block text-[var(--color-text-primary)]";

const BTN_PRIMARY = buttonClasses({variant:"primary"});




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
  bio?: string;
  experience?: string;
};

type RoleMatchGroup = {
  role: string;
  freelancers: Talent[];
  /** Candidate pool değil — gerçekten eşiği geçen toplam aday sayısı. */
  totalEligibleCount: number;
};

type CreationCheckpoint = {
  budgetModel?: "project-total" | "role-based";
  step: Step; brief: Brief; files: File[]; analysis: ProjectAnalysis | null;
  advancedAnalysis: PlusProjectAnalysis | null; proAnalysis: ProProjectAnalysis | null;
  aiUsage: {count: number; monthlyLimit: number; limitReached: boolean} | null;
  roles: Role[]; matching: RoleMatchGroup[]; canViewMatchCandidates: boolean;
  selectionMode: SelectionMode; selectedTeamMatches: Record<string, Talent[]>;
  selectedFreelancer: Talent | null; generalBudget: string; projectDuration: string;
  inspectingRoleId: string | null; analysisFailed: boolean; analysisRetryable: boolean;
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

/**
 * Rol kartında "AI rapor yazmamalı" kuralı: reason gibi AI metinleri
 * varsayılan olarak tek kısa cümleye indirilir. Ham veri (role.reason)
 * hiçbir zaman değiştirilmez — sadece GÖSTERİM kısaltılır.
 */
function truncateToSentence(
  text: string,
  maxLength = 140
): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const sentenceEndMatch = trimmed.match(/^.*?[.!?](\s|$)/);
  let sentence = sentenceEndMatch
    ? sentenceEndMatch[0].trim()
    : trimmed;

  if (sentence.length > maxLength) {
    sentence = `${sentence.slice(0, maxLength - 1).trimEnd()}…`;
  }

  return sentence;
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
): { groups: RoleMatchGroup[]; canViewCandidates: boolean } {
  if (!data || typeof data !== "object") {
    return { groups: [], canViewCandidates: true };
  }

  const response = data as Record<string, unknown>;

  const matching = Array.isArray(response.matching)
    ? response.matching
    : [];

  const canViewCandidates = response.canViewCandidates !== false;

  const groups = matching
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
            bio:
              typeof candidate.bio === "string"
                ? candidate.bio
                : undefined,
            experience:
              typeof candidate.experience === "string"
                ? candidate.experience
                : undefined,
          }))
          .filter((talent) => talent.id),
        totalEligibleCount:
          typeof item.totalEligibleCount === "number"
            ? item.totalEligibleCount
            : 0,
      };
    })
    .filter((group) => group.role);

  return { groups, canViewCandidates };
}

export default function CreateProjectPage() {
  const router = useRouter();
  const supabase = createClient();
  const publishInFlight = useRef(false);

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

  const [matchingInProgress, setMatchingInProgress] =
    useState(false);

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

  /**
   * Server'ın gerçek erişim kararı (lib/premium.ts →
   * view_match_candidates). `usePremium().can(...)` sadece UI'da CTA
   * metnini önceden doğru göstermek için kullanılır — asıl gizleme
   * server tarafında zaten yapılmış olur (freelancers[] boş gelir).
   */
  const [canViewMatchCandidates, setCanViewMatchCandidates] =
    useState(true);

  const [selectionMode, setSelectionMode] =
    useState<SelectionMode>("none");

  const [selectedTeamMatches, setSelectedTeamMatches] =
    useState<Record<string, Talent[]>>({});

  const [selectedFreelancer, setSelectedFreelancer] =
    useState<Talent | null>(null);

  const [generalBudget, setGeneralBudget] =
    useState("");

  const [projectDuration, setProjectDuration] =
    useState("");

  const [publishing, setPublishing] =
    useState(false);

  const [resumeRoleId, setResumeRoleId] = useState<string | null>(null);
  const [restoringDraft, setRestoringDraft] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  useEffect(() => {
    let active = true;
    async function restore() {
      if (new URLSearchParams(window.location.search).get("resume") !== "1") return;
      const {data: {user}} = await createClient().auth.getUser();
      if (!user) throw new Error("Taslağa dönmek için giriş yapmalısın.");
      const draft = await readProjectCreationDraft<CreationCheckpoint>(user.id);
      if (!active) return;
      if (!draft || !["project", "needs", "analysis", "budget"].includes(draft.step) || !Array.isArray(draft.roles)) throw new Error("Kaydedilmiş proje taslağı bulunamadı.");
      setBrief(draft.brief); setFiles(draft.files); setAnalysis(draft.analysis);
      setAdvancedAnalysis(draft.advancedAnalysis); setProAnalysis(draft.proAnalysis); setAiUsage(draft.aiUsage);
      setRoles(draft.roles); setMatching(draft.matching); setCanViewMatchCandidates(draft.canViewMatchCandidates);
      setSelectionMode(draft.selectionMode); setSelectedTeamMatches(draft.selectedTeamMatches);
      setSelectedFreelancer(draft.selectedFreelancer); setGeneralBudget(draft.generalBudget || (!draft.budgetModel && draft.selectionMode === "team" ? String(draft.roles.reduce((sum,role)=>sum+calculateRoleTotal(role.memberCount,role.budgetPerPerson),0)||"") : "")); setProjectDuration(draft.projectDuration || (!draft.budgetModel && draft.selectionMode === "team" ? getLongestDuration(draft.roles) : ""));
      setAnalysisFailed(draft.analysisFailed); setAnalysisRetryable(draft.analysisRetryable);
      setResumeRoleId(draft.inspectingRoleId); setStep(draft.step);
      window.history.replaceState(null, "", window.location.pathname);
    }
    void restore().catch(error => { if (active) setError(error instanceof Error ? error.message : "Taslak yüklenemedi."); }).finally(() => { if (active) setRestoringDraft(false); });
    return () => { active = false; };
  }, []);

  async function preserveUpgrade(event: React.MouseEvent<HTMLElement>) {
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href="/premium"]');
    if (!anchor) return;
    event.preventDefault();
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      const {data: {user}} = await supabase.auth.getUser();
      if (!user) throw new Error("Taslağı korumak için giriş yapmalısın.");
      const inspectingRoleId = document.querySelector<HTMLElement>("[data-inspecting-role]")?.dataset.inspectingRole || null;
      await saveProjectCreationDraft<CreationCheckpoint>(user.id, {budgetModel:"role-based",step, brief, files, analysis, advancedAnalysis, proAnalysis, aiUsage, roles, matching, canViewMatchCandidates, selectionMode, selectedTeamMatches, selectedFreelancer, generalBudget, projectDuration, inspectingRoleId, analysisFailed, analysisRetryable});
      window.location.assign("/premium");
    } catch (error) { setError(error instanceof Error ? error.message : "Taslak kaydedilemedi; proje açık tutuldu."); setSavingDraft(false); }
  }

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

  function addRole(preset?: {name:string;reason?:string}) {
    setRoles((current) => preset && current.some(role=>role.name.trim().toLocaleLowerCase("tr-TR")===preset.name.trim().toLocaleLowerCase("tr-TR")) ? current : [
      ...current,
      {
        id: `role-${Date.now()}-${current.length}`,
        name: preset?.name ?? "",
        reason: preset?.reason,
        memberCount: 1,
        budgetPerPerson: 0,
        budget: 0,
        duration: "",
        responsibilities: [],
        skills: [],
        preferredSkills: [],
      },
    ]);
  }

  function removeRole(id: string) {
    const removed = roles.find(role => role.id === id);
    setRoles(current => current.filter(role => role.id !== id));
    setSelectedTeamMatches(current => { const next = {...current}; delete next[id]; return next; });
    if (removed && selectedFreelancer?.role === removed.name) { setSelectedFreelancer(null); setSelectionMode("none"); }
  }

  function addRoleListItem(
    id: string,
    field: "skills" | "preferredSkills" | "responsibilities",
    value: string
  ) {
    const trimmed = value.trim();
    if (!trimmed) return;

    setRoles((current) =>
      current.map((role) => {
        if (role.id !== id) return role;

        const exists = role[field].some(
          (item) =>
            item.toLocaleLowerCase("tr-TR") ===
            trimmed.toLocaleLowerCase("tr-TR")
        );

        if (exists) return role;

        return {
          ...role,
          [field]: [...role[field], trimmed],
        };
      })
    );
  }

  function removeRoleListItem(
    id: string,
    field: "skills" | "preferredSkills" | "responsibilities",
    index: number
  ) {
    setRoles((current) =>
      current.map((role) =>
        role.id === id
          ? {
              ...role,
              [field]: role[field].filter(
                (_, i) => i !== index
              ),
            }
          : role
      )
    );
  }

  const budgetPlan = roleBudgetPlan(roles, selectionMode === "team");
  const totalBudget = budgetPlan.total;
  const budgetIsReady = budgetPlan.ready;

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

  /**
   * "İhtiyaçlar" adımına geçmeden önce ek bir zorunluluk yok — AI
   * analizi yalnızca başlık/açıklama/kategoriye dayanır (bkz.
   * runAiAnalysis). Beceri/uzmanlık artık client'ın AI'dan ÖNCE
   * seçtiği bir şey değil; AI'nın önerdiği ve client'ın "İhtiyaçlar"
   * adımında düzenlediği bir çıktı.
   */
  function continueToAnalysis() {
    setError("");

    if (roles.length === 0) {
      setError(
        "Devam etmeden önce en az bir rol olmalı."
      );
      return;
    }

    if (roles.some((role) => !role.name.trim())) {
      setError(
        "Her rolün bir adı olmalı."
      );
      return;
    }

    setStep("analysis");
    void runMatching();
  }

  /**
   * ADIM 1 → 2: AI, proje başlığı/açıklaması/kategorisinden yola
   * çıkarak gerekli rolleri ve her rolün ihtiyaçlarını çıkarır. Bu,
   * client'ın düzenleyeceği İLK öneridir — kesinleşmiş bir sonuç
   * değildir (bkz. NeedsStep).
   */
  async function runAiAnalysis() {
    setError("");
    setAnalysisFailed(false);
    setAnalyzing(true);

    try {
      const requirementLines = [
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
      // Kullanıcı "needs" ekranında kalır; girdiği proje bilgileri
      // (brief/files) korunur, baştan yazmak zorunda kalmaz.
    } finally {
      setAnalyzing(false);
    }
  }

  /**
   * ADIM 2 → 3: Matching, client'ın "İhtiyaçlar" adımında düzenlediği
   * SON `roles` durumunu kullanır — AI'nın ilk önerisini değil. Her
   * "İhtiyaçlar" adımına dönüp tekrar devam edildiğinde, o anki
   * (güncel) roller ile yeniden eşleştirme yapılır.
   */
  async function runMatching() {
    setError("");
    setMatchingInProgress(true);

    try {
      if (roles.length === 0 || !analysis) {
        setMatching([]);
        return;
      }

      const matchResponse = await fetch(
        "/api/ai/match-talent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            analysis,
            roles: roles.map(
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

      const { groups, canViewCandidates } =
        normalizeMatchingResult(matchData);

      setMatching(groups);
      setCanViewMatchCandidates(canViewCandidates);
    } catch (err) {
      console.error(
        "Freelancer eşleştirme hatası:",
        err
      );

      setMatching([]);
    } finally {
      setMatchingInProgress(false);
    }
  }

  useEffect(() => {
    if (
      step === "needs" &&
      !analysis &&
      !analysisFailed &&
      !analyzing
    ) {
      void runAiAnalysis();
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

    setResumeRoleId(null);
    setStep("budget");
  }

  async function publishProject() {
    if (publishInFlight.current) return;
    setError("");

    if (!budgetIsReady) {
      setError(
        "Her rol için geçerli bir bütçe ve çalışma süresi belirleyin."
      );
      return;
    }

    publishInFlight.current = true;
    setPublishing(true);
    let projectCreated = false;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Proje oluşturmak için giriş yapmalısınız."
        );
      }

      // Existing JSONB role identities and skills survive even when allocation is unknown.
      const moneyByRole = new Map(roleBudgetMoney(roles,totalBudget,selectionMode === "team").map(row=>[row.roleId,row]));
      const budgetBreakdown = roles.filter(role=>role.name.trim()).map(role=>({
        ...moneyByRole.get(role.id),
        roleId:role.id, role:role.name.trim(),
        duration:role.duration,
        responsibilities:role.responsibilities, requiredSkills:role.skills, preferredSkills:role.preferredSkills,
      }));
      const estimatedDuration = getLongestDuration(roles);

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
          // roles her zaman AI analizinden (ve client düzenlemesinden) gelir —
          // selectionMode (team/freelancer/none) sadece kimin işe alınacağını
          // belirler, projenin gerekli becerilerini değil.
          ...roles.flatMap(
            (role) => role.skills
          ),
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

      if (projectError || !project?.id) {
        if (projectError) {
          console.error("PROJECT CREATE ERROR", {
            stage: "projects.insert_returning",
            message: projectError.message,
            details: projectError.details,
            hint: projectError.hint,
            code: projectError.code,
            error: projectError,
          });
        }

        throw new Error("Proje oluşturulamadı. Lütfen tekrar deneyin.");
      }

      projectCreated = true;
      void clearProjectCreationDraft(user.id).catch(() => { /* Publication succeeded; local cleanup must not block navigation. */ });
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
      // Keep the successful publication locked until navigation unmounts the page.
      // A failed request remains retryable with the existing form state.
      if (!projectCreated) publishInFlight.current = false;
      setPublishing(projectCreated);
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
      setResumeRoleId(null);
      setStep("needs");
      return;
    }

    if (step === "budget") {
      setStep("analysis");
    }
  }

  return (
    <main className={creationStyles.page} onClickCapture={preserveUpgrade}>
      {savingDraft && <p role="status" className="mb-4 text-sm text-[var(--color-text-secondary)]">Proje taslağın korunuyor…</p>}
      <ProjectCreationHero onBack={goBack} disabled={publishing}/>

      <ProjectCreationStepper step={step}/>

      <div
        className={`${CONTAINER} pb-20`}
      >
        {error && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-error-600)]/20 bg-[var(--color-error-50)] px-4 py-3 text-sm text-[var(--color-error-600)]">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {restoringDraft ? <p role="status" className="py-6 text-sm text-[var(--color-text-secondary)]">Proje çalışma alanı hazırlanıyor…</p> : step === "project" && (
          <ProjectStep
            brief={brief}
            error={error}
            onBack={goBack}
            files={files}
            setFiles={setFiles}
            updateBrief={updateBrief}
            onContinue={
              continueToNeeds
            }
          />
        )}

        {!restoringDraft && step === "needs" && (
          <NeedsStep
            brief={brief}
            updateBrief={updateBrief}
            analyzing={analyzing}
            analysis={analysis}
            advancedAnalysis={advancedAnalysis}
            proAnalysis={proAnalysis}
            aiUsage={aiUsage}
            canUseDeepAnalysis={canUseAiFeature("advanced_matching_client")}
            analysisFailed={analysisFailed}
            analysisRetryable={analysisRetryable}
            analysisError={error}
            onRetryAnalysis={() => void runAiAnalysis()}
            roles={roles}
            onAddRole={addRole}
            onRemoveRole={removeRole}
            onUpdateRole={updateRole}
            onAddRoleListItem={addRoleListItem}
            onRemoveRoleListItem={removeRoleListItem}
            onBack={goBack}
            onContinue={
              continueToAnalysis
            }
          />
        )}

        {!restoringDraft && step === "analysis" && (
          <AnalysisStep
            initialInspectingRoleId={resumeRoleId}
            onRefreshMatches={() => void runMatching()}
            canRefreshMatches={canUseAiFeature("view_match_candidates")}
            projectTitle={brief.title}
            matchingInProgress={matchingInProgress}
            roles={roles}
            matching={matching}
            canViewMatchCandidates={
              canViewMatchCandidates && canUseAiFeature("view_match_candidates")
            }
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

        {!restoringDraft && step === "budget" && (
          <BudgetPublishStep
            brief={brief}
            selectionMode={
              selectionMode
            }
            roles={roles}
            updateRole={updateRole}
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
  error,
  onBack,
  files,
  setFiles,
  updateBrief,
  onContinue,
}: {
  brief: Brief;
  error: string;
  onBack: () => void;
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
    <section className="pt-[var(--space-2)]">
      <div className="mb-[var(--space-5)]">
        <p className={EYEBROW}>
          01 / Proje
        </p>

        <h2 className={HEADING}>
          Projenizi anlatın
        </h2>

        <p className={SUBTEXT}>
          Projenizi ne kadar net
          anlatırsanız, AI analizi ve
          freelancer eşleşmeleri o kadar
          doğru olur.
        </p>
      </div>

      <div
        className="space-y-[var(--space-5)]"
      >
        <div className={creationStyles.shortFields}>
        <Field label="Proje başlığı" error={error==="Proje başlığını girin."?error:undefined}>
          <Input
            value={brief.title}
            onChange={(event) =>
              updateBrief(
                "title",
                event.target.value
              )
            }
            placeholder="Örn. Yeni e-ticaret sitesi tasarımı"
          />
        </Field>

        <Field label="Kategori" error={error==="Bir kategori seçin."?error:undefined}>
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

        </div>
        <div className={creationStyles.formGroup}>
        <TextArea
          label="Proje açıklaması"
          error={error==="Proje açıklamasını girin."?error:undefined}
          value={brief.description}
          onChange={(value) =>
            updateBrief(
              "description",
              value
            )
          }
          placeholder="Ne yapmak istediğinizi, mevcut durumu ve beklentilerinizi anlatın..."
          rows={6}
        />
        </div>

        <div className={creationStyles.formGroup}>
          <label className={LABEL}>
            Proje dökümanları
          </label>

          <label className="flex cursor-pointer items-center justify-center rounded-[var(--radius-card)] border border-dashed border-gray-300 bg-[var(--color-surface-2)]/50 px-[var(--space-5)] py-[var(--space-6)] transition hover:border-gray-400 hover:bg-[var(--color-surface-2)]">
            <div className="text-center">
              <Upload className="mx-auto h-5 w-5 text-[var(--color-text-muted)]" />

              <p className="mt-3 text-sm font-medium text-[var(--color-text-primary)]">
                Dosya seç
              </p>

              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Brief, PDF, görsel veya
                referans dosyaları · en fazla
                10 dosya
              </p>
            </div>

            <Input
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

        <div className={creationStyles.navigation}>
          <Button type="button" variant="secondary" onClick={onBack}><ArrowLeft size={16}/>Geri</Button>
          <Button
            type="button"
            onClick={onContinue}
            variant="primary"
          >
            Devam et
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function NeedsStep({
  brief,
  updateBrief,
  analyzing,
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
  onAddRole,
  onRemoveRole,
  onUpdateRole,
  onAddRoleListItem,
  onRemoveRoleListItem,
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
  analyzing: boolean;
  analysis: ProjectAnalysis | null;
  advancedAnalysis: PlusProjectAnalysis | null;
  proAnalysis: ProProjectAnalysis | null;
  aiUsage: { count: number; monthlyLimit: number; limitReached: boolean } | null;
  canUseDeepAnalysis: boolean;
  analysisFailed: boolean;
  analysisRetryable: boolean;
  analysisError: string;
  onRetryAnalysis: () => void;
  roles: Role[];
  onAddRole: (preset?: {name:string;reason?:string}) => void;
  onRemoveRole: (id: string) => void;
  onUpdateRole: (id: string, updates: Partial<Role>) => void;
  onAddRoleListItem: (
    id: string,
    field: "skills" | "preferredSkills" | "responsibilities",
    value: string
  ) => void;
  onRemoveRoleListItem: (
    id: string,
    field: "skills" | "preferredSkills" | "responsibilities",
    index: number
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const roleConfiguration = useRef<HTMLHeadingElement>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const roleRecommendations = <section className={needsStyles.roleRecommendations} aria-label={roles.length === 1 ? "Önerilen rol" : "Önerilen ekip"}>
          <h3 ref={roleConfiguration} tabIndex={-1} className="cc-h2 mb-[var(--space-2)]">{roles.length === 1 ? "Önerilen rol" : "Önerilen ekip"}</h3>
          {roles.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">Devam etmek için en az bir rol ekle.</p>}
          <div className={needsStyles.roleGrid}>
            {roles.map((role) => (
              <RoleNeedsCard
                key={role.id}
                role={role}
                expanded={expandedRoleId === role.id}
                onToggleExpanded={() => setExpandedRoleId(current => current === role.id ? null : role.id)}
                validationError={analysisError==="Her rolün bir adı olmalı."&&!role.name.trim()?analysisError:undefined}
                onUpdate={(updates) =>
                  onUpdateRole(role.id, updates)
                }
                onRemove={() => onRemoveRole(role.id)}
                onAddListItem={(field, value) =>
                  onAddRoleListItem(role.id, field, value)
                }
                onRemoveListItem={(field, index) =>
                  onRemoveRoleListItem(role.id, field, index)
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={()=>onAddRole()}
            className={needsStyles.addRoleAction}
          >
            <Plus className="h-4 w-4" />
            Rol ekle
          </button>

  </section>;
  return (
    <section className="relative pt-[var(--space-2)]">
      <div hidden={analyzing} className="mb-[var(--space-5)]">
        <p className={EYEBROW}>
          02 / İhtiyaçlar
        </p>

        <h2 className={HEADING}>
          {analyzing
            ? "Colla AI projenin yapısını çıkarıyor"
            : "Ekip ihtiyaçlarınız"}
        </h2>

        <p className={SUBTEXT}>
          {analyzing
            ? "AI, proje açıklamanızı okuyarak hangi uzmanlıklara ihtiyacınız olduğunu çıkarıyor."
            : "AI önerilerini incele; rol ihtiyaçlarını projen için düzenle."}
        </p>
      </div>

      <ProjectAnalysisLoading active={analyzing} />
      {analyzing ? null : analysisFailed ? (
        <div className={`${CARD} p-10 text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] bg-[var(--color-warning-50)] text-amber-600">
            <AlertTriangle size={22} />
          </div>
          <h3 className="mt-4 cc-h3 font-semibold text-[var(--color-text-primary)]">
            {analysisRetryable
              ? "AI analizi şu anda kullanılamıyor"
              : "Proje analizi tamamlanamadı"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
            {analysisError ||
              (analysisRetryable
                ? "AI servisi geçici olarak yoğun. Lütfen birkaç dakika sonra tekrar deneyin."
                : "Analiz sırasında bir sorun oluştu.")}
          </p>
          <button
            type="button"
            onClick={onRetryAnalysis}
            className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-primary-600)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
          >
            <RotateCcw size={16} />
            Tekrar Dene
          </button>
        </div>
      ) : (
        <div className={needsStyles.analysisResultEnter}>
          {analysis && (
            <ProjectAnalysisSummary
              analysis={analysis}
              roles={roles}
              advancedAnalysis={advancedAnalysis}
              proAnalysis={proAnalysis}
              aiUsage={aiUsage}
              canUseDeepAnalysis={canUseDeepAnalysis}
              onReviewRoles={() => roleConfiguration.current?.focus()}
              onAssignSkill={(skill,roleId)=>onAddRoleListItem(roleId,"skills",skill)}
              onAddOptionalRole={suggestion=>onAddRole(suggestion)}
              recommendations={roleRecommendations}
            />
          )}

          {!analysis && roleRecommendations}

          <div
            className="mt-6 border-t border-[var(--color-border-subtle)] pt-[var(--space-5)]"
          >
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
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              type="button"
              onClick={onBack}
              variant="ghost"
            >
              <ChevronLeft className="h-4 w-4" />
              Geri
            </Button>

            <Button
              type="button"
              onClick={onContinue}
              variant="primary"
            >
              Devam et
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function RoleNeedsCard({
  role,
  validationError,
  expanded,
  onToggleExpanded,
  onUpdate,
  onRemove,
  onAddListItem,
  onRemoveListItem,
}: {
  role: Role;
  validationError?: string;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onUpdate: (updates: Partial<Role>) => void;
  onRemove: () => void;
  onAddListItem: (
    field: "skills" | "preferredSkills" | "responsibilities",
    value: string
  ) => void;
  onRemoveListItem: (
    field: "skills" | "preferredSkills" | "responsibilities",
    index: number
  ) => void;
}) {
  const roleNameId=React.useId();
  const [editing, setEditing] = useState(() => !role.name.trim() || Boolean(validationError));
  const showEditor = editing || Boolean(validationError) || !role.name.trim();
  const [skillDraft, setSkillDraft] = useState("");
  const [preferredDraft, setPreferredDraft] = useState("");
  const [responsibilityDraft, setResponsibilityDraft] = useState("");

  /**
   * Rol kartı ilk bakışta rapor gibi görünmemeli: her liste varsayılan
   * olarak kısıtlı sayıda madde gösterir, "+N daha" ile tamamı
   * (düzenleme dahil) açılır. Bu sadece GÖRÜNÜM sınırı — role.skills
   * / preferredSkills / responsibilities verisi hiç kısaltılmaz.
   */
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAllPreferred, setShowAllPreferred] = useState(false);
  const [showAllResponsibilities, setShowAllResponsibilities] =
    useState(false);

  const MAX_SKILLS = 5;
  const MAX_PREFERRED = 3;
  const MAX_RESPONSIBILITIES = 4;

  const visibleSkills = showAllSkills
    ? role.skills
    : role.skills.slice(0, MAX_SKILLS);

  const visiblePreferred = showAllPreferred
    ? role.preferredSkills
    : role.preferredSkills.slice(0, MAX_PREFERRED);

  const visibleResponsibilities = showAllResponsibilities
    ? role.responsibilities
    : role.responsibilities.slice(0, MAX_RESPONSIBILITIES);

  const [locallyExpanded, setLocallyExpanded] = useState(false);
  const isExpanded = expanded ?? locallyExpanded;
  const toggleExpanded = onToggleExpanded ?? (() => setLocallyExpanded(current => !current));
  const detailsId = roleNameId + "-details";

  return (
    <div className={needsStyles.roleEditor} data-expanded={isExpanded || showEditor}>
      {!showEditor ? <>
        <div className={needsStyles.recommendationHeader}>
          <h4 className={needsStyles.recommendationTitle}>{role.name}</h4>
          <span className={needsStyles.roleSkillCount}>{role.skills.length} beceri</span>
        </div>
        {role.responsibilities[0] && <p className={needsStyles.roleDescription}>{truncateToSentence(role.responsibilities[0])}</p>}
        {!isExpanded && <div className={needsStyles.skillPreview}>{role.skills.slice(0,3).map(skill => <Badge key={skill} tone="primary" className={needsStyles.skillChip}>{skill}</Badge>)}{role.skills.length > 3 && <Badge className={needsStyles.skillChip}>+{role.skills.length-3}</Badge>}</div>}
        <div id={detailsId} hidden={!isExpanded} className={needsStyles.roleDetails}>
          {isExpanded && <>
            <div className={needsStyles.recommendationSkills}>
              <div><h5 className={needsStyles.skillLabel}>Gerekli beceriler</h5><div className={needsStyles.skillList}>{role.skills.length ? role.skills.map(skill => <Badge key={skill} tone="primary" className={needsStyles.skillChip}>{skill}</Badge>) : <p className={needsStyles.roleDescription}>Henüz temel beceri eklenmedi.</p>}</div></div>
              {role.preferredSkills.length > 0 && <div><h5 className={needsStyles.skillLabel}>Tercih edilen</h5><div className={needsStyles.skillList}>{role.preferredSkills.map(skill => <Badge key={skill} className={needsStyles.skillChip}>{skill}</Badge>)}</div></div>}
            </div>
            {role.reason && <RoleReasonPreview reason={role.reason}/>}
            {role.responsibilities.length > 0 && <details className={needsStyles.recommendationResponsibilities}><summary><span>Sorumluluklar <span className={needsStyles.responsibilityCount}>· {role.responsibilities.length}</span></span><ChevronDown size={16} aria-hidden="true"/></summary><ul>{role.responsibilities.map(item => <li key={item}>{item}</li>)}</ul></details>}
          </>}
        </div>
        <div className={needsStyles.compactRoleFooter}>
          <button type="button" aria-expanded={isExpanded} aria-controls={detailsId} onClick={toggleExpanded} className={needsStyles.roleExpand}>{isExpanded ? "Detayları gizle" : "Detayları gör"}<ChevronDown size={16} aria-hidden="true"/></button>
          <div><Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>Rolü düzenle</Button><button type="button" onClick={onRemove} aria-label={role.name + " rolünü sil"} className="rounded-[var(--radius-button)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-600)]"><Trash2 size={16}/></button></div>
        </div>
      </> : <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className={needsStyles.roleIdentity}>
        <label htmlFor={roleNameId} className={needsStyles.roleEditLabel}>Rolü düzenle</label>
        <Input
          id={roleNameId}
          aria-label="Rol adı"
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError?roleNameId+"-error":undefined}
          hasError={Boolean(validationError)}
          value={role.name}
          onChange={(event) =>
            onUpdate({ name: event.target.value })
          }
          placeholder="Rol adı (ör. UI/UX Designer)"
          className={`${needsStyles.roleTitle} max-w-sm`}
        />
        </div>
        {role.reason && <span className={needsStyles.roleSource}>AI önerisi</span>}

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-600)]"
          aria-label="Rolü sil"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {validationError&&<p id={roleNameId+"-error"} className="cc-body-sm mt-[var(--space-2)] text-[var(--color-error-600)]">{validationError}</p>}

      {role.reason && (
        <details className={needsStyles.roleReason}><summary>Neden bu rol?<span className={needsStyles.roleReasonPreview}>{truncateToSentence(role.reason)}</span></summary><p>{role.reason}</p></details>
      )}

      <div className={needsStyles.roleSkills}>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Gerekli beceriler
          </p>
          <p className={needsStyles.skillHelp}>Bu rolün temel gereksinimi olarak önerilen beceriler.</p>

          <div className="flex flex-wrap items-center gap-2">
            {visibleSkills.map((skill, index) => (
              <Badge key={skill} tone="primary" className={needsStyles.skillChip}>
                {skill}
                <button
                  type="button"
                  onClick={() =>
                    onRemoveListItem("skills", index)
                  }
                  aria-label={`${skill} becerisini kaldır`}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {!showAllSkills &&
              role.skills.length > MAX_SKILLS && (
                <button
                  type="button"
                  onClick={() => setShowAllSkills(true)}
                  className="text-xs font-medium text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
                >
                  + {role.skills.length - MAX_SKILLS} daha
                </button>
              )}
          </div>

          <div className="mt-2 flex gap-2">
            <Input
              value={skillDraft}
              onChange={(event) =>
                setSkillDraft(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddListItem("skills", skillDraft);
                  setSkillDraft("");
                  setShowAllSkills(true);
                }
              }}
              placeholder="Beceri ekle..."
              className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] px-2.5 text-sm outline-none focus:border-gray-400"
            />
            <button
              type="button"
              onClick={() => {
                onAddListItem("skills", skillDraft);
                setSkillDraft("");
                setShowAllSkills(true);
              }}
              className="rounded-lg border border-[var(--color-border-subtle)] px-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
            >
              Ekle
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Tercih edilen
          </p>
          <p className={needsStyles.skillHelp}>Rolü destekleyen, avantaj sağlayabilecek tamamlayıcı beceriler.</p>

          <div className="flex flex-wrap items-center gap-2">
            {visiblePreferred.map((skill, index) => (
              <Badge key={skill} >
                {skill}
                <button
                  type="button"
                  onClick={() =>
                    onRemoveListItem("preferredSkills", index)
                  }
                  aria-label={`${skill} becerisini kaldır`}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {!showAllPreferred &&
              role.preferredSkills.length > MAX_PREFERRED && (
                <button
                  type="button"
                  onClick={() => setShowAllPreferred(true)}
                  className="text-xs font-medium text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
                >
                  +{" "}
                  {role.preferredSkills.length - MAX_PREFERRED}{" "}
                  daha
                </button>
              )}
          </div>

          <div className="mt-2 flex gap-2">
            <Input
              value={preferredDraft}
              onChange={(event) =>
                setPreferredDraft(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddListItem("preferredSkills", preferredDraft);
                  setPreferredDraft("");
                  setShowAllPreferred(true);
                }
              }}
              placeholder="Beceri ekle..."
              className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] px-2.5 text-sm outline-none focus:border-gray-400"
            />
            <button
              type="button"
              onClick={() => {
                onAddListItem("preferredSkills", preferredDraft);
                setPreferredDraft("");
                setShowAllPreferred(true);
              }}
              className="rounded-lg border border-[var(--color-border-subtle)] px-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
            >
              Ekle
            </button>
          </div>
        </div>
      </div>

      <aside className={needsStyles.market} aria-label="Piyasa görünümü">
        <p className="cc-label">Piyasa görünümü <span>· CollaCrew verileri</span></p>
        <p>Bu rol için henüz güvenilir bir piyasa karşılaştırması sunulamıyor.</p>
      </aside>

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Sorumluluklar
        </p>
        <p className={needsStyles.skillHelp}>Bu rol için önerilen temel sorumluluklar.</p>

        <ul className="space-y-2">
          {visibleResponsibilities.map((item, index) => (
            <li
              key={item}
              className={needsStyles.responsibility}
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() =>
                  onRemoveListItem("responsibilities", index)
                }
                aria-label="Sorumluluğu kaldır"
                className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>

        {!showAllResponsibilities &&
          role.responsibilities.length >
            MAX_RESPONSIBILITIES && (
            <button
              type="button"
              onClick={() =>
                setShowAllResponsibilities(true)
              }
              className="mt-2 text-xs font-medium text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
            >
              +{" "}
              {role.responsibilities.length -
                MAX_RESPONSIBILITIES}{" "}
              daha
            </button>
          )}

        <div className="mt-2 flex gap-2">
          <Input
            value={responsibilityDraft}
            onChange={(event) =>
              setResponsibilityDraft(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddListItem(
                  "responsibilities",
                  responsibilityDraft
                );
                setResponsibilityDraft("");
                setShowAllResponsibilities(true);
              }
            }}
            placeholder="Sorumluluk ekle..."
            className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] px-3 text-sm outline-none focus:border-gray-400"
          />
          <button
            type="button"
            onClick={() => {
              onAddListItem(
                "responsibilities",
                responsibilityDraft
              );
              setResponsibilityDraft("");
              setShowAllResponsibilities(true);
            }}
            className="rounded-lg border border-[var(--color-border-subtle)] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
          >
            Ekle
          </button>
        </div>
      </div>
      <div className={needsStyles.roleActions}><Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>Düzenlemeyi bitir</Button></div>
      </>}
    </div>
  );
}

function RoleReasonPreview({ reason }: { reason: string }) {
  const contentId = React.useId();
  const content = React.useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [truncated, setTruncated] = React.useState(false);
  React.useEffect(() => {
    const element = content.current;
    if (!element || expanded) return;
    const observer = new ResizeObserver(() => {
      setTruncated(element.scrollHeight > element.clientHeight + 1);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reason, expanded]);
  return <div className={needsStyles.recommendationReason}>
    <h5>Neden bu rol?</h5>
    <p ref={content} id={contentId} className={expanded ? needsStyles.reasonExpanded : needsStyles.reasonPreview}>{reason}</p>
    {(truncated || expanded) && <Button type="button" variant="link" size="sm" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)}>{expanded ? "Daha az göster" : "Devamını gör"}</Button>}
  </div>;
}

function AnalysisStep({
  initialInspectingRoleId,
  onRefreshMatches,
  canRefreshMatches,
  projectTitle,
  matchingInProgress,
  roles,
  matching,
  canViewMatchCandidates,
  bestOverallFreelancer,
  selectionMode,
  selectedTeamMatches,
  onChooseTeam,
  onChooseNone,
  onToggleRoleCandidate,
  onBack,
  onContinue,
}: {
  initialInspectingRoleId?: string | null;
  onRefreshMatches?: () => void;
  canRefreshMatches?: boolean;
  projectTitle?: string;
  matchingInProgress: boolean;
  roles: Role[];
  matching: RoleMatchGroup[];
  canViewMatchCandidates: boolean;
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
  const [inspectingRoleId, setInspectingRoleId] = useState<string | null>(initialInspectingRoleId ?? null);
  const viewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { viewHeading.current?.focus(); }, [inspectingRoleId, matchingInProgress]);
  const roleMatches = roles.map(role => {
    const group = matching.find(item => item.role === role.name);
    const eligible = (group?.freelancers ?? []).filter(candidate => candidate.isEligibleForRole);
    const strongest = eligible.reduce<Talent | null>((best, candidate) => !best || candidate.score > best.score ? candidate : best, null);
    return { role, group, eligible, strongest, count: typeof group?.totalEligibleCount === "number" && Number.isFinite(group.totalEligibleCount) ? group.totalEligibleCount : null };
  });
  const hasMatches = roleMatches.some(item => (item.count ?? 0) > 0);
  const allMatched = roles.length > 0 && roleMatches.every(item => (item.count ?? 0) > 0);
  const total = roleMatches.every(item => item.count !== null) ? roleMatches.reduce((sum, item) => sum + (item.count ?? 0), 0) : null;
  const strongest = roleMatches.reduce<Talent | null>((best, item) => item.strongest && (!best || item.strongest.score > best.score) ? item.strongest : best, null);
  const inspecting = roleMatches.find(item => item.role.id === inspectingRoleId);
  const selectedFor = (role: Role) => selectionMode === "team" ? (selectedTeamMatches[role.id] ?? []).length : selectionMode === "freelancer" && bestOverallFreelancer?.role === role.name ? 1 : 0;
  return <section className={matchStyles.root}>
    <ProjectAnalysisLoading active={matchingInProgress} kind="matching"/>
    {!matchingInProgress && (inspecting ? <div className={matchStyles.discovery} data-inspecting-role={inspecting.role.id}>
      <Button type="button" variant="ghost" size="sm" onClick={() => setInspectingRoleId(null)}><ChevronLeft size={16} aria-hidden="true"/> Proje oluşturmaya dön</Button>
      <header className={matchStyles.discoveryHeader}><p className={matchStyles.context}>{projectTitle?.trim() || "Proje taslağı"}</p><h2 ref={viewHeading} tabIndex={-1}>{inspecting.role.name} için eşleşmeler</h2><p>Seçim isteğe bağlıdır. Hiçbir rolü doldurmak zorunda değilsin; taslağın bu çalışma alanında korunur.</p></header>
      {!canViewMatchCandidates ? canRefreshMatches && onRefreshMatches ? <div className={matchStyles.optional}><p>Mevcut planınla eşleşen profilleri inceleyebilirsin.</p><Button type="button" variant="secondary" onClick={onRefreshMatches}>Eşleşmeleri güncel planımla yenile</Button></div> : <MatchPaywallCard matching={inspecting.group ? [inspecting.group] : []}/> : <>
        <p className={matchStyles.discoveryNote}>Buradaki seçimler davet veya ekip üyeliği oluşturmaz. Teklif ve kabul süreci proje yayınlandıktan sonra devam eder.</p>
        <RoleCandidatePicker key={inspecting.role.id} role={inspecting.role} freelancers={inspecting.eligible} selected={selectionMode === "team" ? selectedTeamMatches[inspecting.role.id] ?? [] : []} onToggle={candidate => { if (selectionMode !== "team") onChooseTeam(); onToggleRoleCandidate(inspecting.role, candidate); }}/>
        {selectionMode !== "none" && <Button type="button" variant="link" size="sm" onClick={onChooseNone}>Tüm seçimleri temizle</Button>}
      </>}
    </div> : <>
      <aside className={matchStyles.optional}><p>Ekibini şimdi oluşturmak zorunda değilsin.</p><p>Projeyi yayınladıktan sonra freelancerları davet edebilir veya gelen teklifleri değerlendirebilirsin.</p></aside>
      <header className={matchStyles.header}>
        <p className={matchStyles.eyebrow}><Sparkles size={16} aria-hidden="true"/> Colla AI eşleştirmesi</p>
        <h2 ref={viewHeading} tabIndex={-1}>{hasMatches ? "Projen için uygun yetenekler bulundu." : "Rol ihtiyaçların için eşleşmeleri değerlendirdik."}</h2>
        <p>{hasMatches ? "Önerilen roller için proje ihtiyaçlarına uygun freelancer eşleşmelerini belirledik." : "Şu anda güçlü eşleşme görünmeyen rollerle de projenin yayın sürecine devam edebilirsin."}</p>
      </header>
      <ul className={matchStyles.metrics} aria-label="Eşleşme özeti">
        <li><strong>{roles.length}</strong><span>Önerilen rol</span></li>
        <li><strong>{total ?? "—"}</strong><span>{roles.length === 1 ? "Uygun freelancer" : "Rol bazında eşleşme"}</span></li>
        <li><strong>{strongest ? "%" + Math.round(strongest.score) : "—"}</strong><span>En güçlü eşleşme</span></li>
      </ul>
      {allMatched && <p className={matchStyles.success}><Check size={16} aria-hidden="true"/> Tüm roller için uygun eşleşmeler bulundu</p>}
      <div className={matchStyles.roles}>
        {roleMatches.map(({ role, count, strongest: top }) => <section key={role.id} className={matchStyles.role} aria-label={role.name + " eşleşmeleri"}>
          <div className={matchStyles.roleHeading}><h3>{role.name}</h3>{selectedFor(role) > 0 && <span className={matchStyles.selection}><Check size={14} aria-hidden="true"/> {selectedFor(role)} freelancer seçildi</span>}</div>
          {role.skills.length > 0 && <div className={matchStyles.skills}><h4>Gerekli beceriler</h4><div>{role.skills.map(skill => <Badge key={skill} tone="primary" className={matchStyles.chip}>{skill}</Badge>)}</div></div>}
          <div className={matchStyles.matchInfo}>
            <p className={matchStyles.found}>{count !== null && count > 0 && <span className={matchStyles.statusDot} aria-hidden="true"/>}{count === null ? "Bu rol için eşleşme sayısı mevcut değil" : count + " uygun freelancer bulundu"}</p>
            {top && <div className={matchStyles.score}><div><span>En güçlü eşleşme</span><strong>%{Math.round(top.score)}</strong></div><meter min={0} max={100} value={top.score} aria-label={role.name + " için en güçlü freelancer eşleşmesi"}/></div>}
          {count !== null && count > 0 && <Button type="button" variant="link" size="sm" onClick={() => setInspectingRoleId(role.id)}>Eşleşmeleri incele <ArrowRight size={16} aria-hidden="true"/></Button>}
          </div>
          {(roles.length === 1 || count === 0 || count === null) && <p className={matchStyles.roleNote}>{count === 0 ? "Bu rol için şu anda güçlü bir eşleşme bulunamadı. Eşleşme kriterlerini daha sonra tekrar değerlendirebilirsin." : count === null ? "Eşleşme bilgisini daha sonra tekrar değerlendirebilirsin." : "Proje ihtiyaçları ve rol becerilerine göre uygun eşleşmeler bulundu."}</p>}
        </section>)}
        {roles.length === 0 && <p className={matchStyles.roleNote}>Henüz rol tanımlanmadı. İhtiyaçlar adımından rol ekleyebilir veya yayın sürecine devam edebilirsin.</p>}
      </div>
    </>)}
    <div className={matchStyles.footer}>
      <Button type="button" onClick={inspecting && !matchingInProgress ? () => setInspectingRoleId(null) : onBack} variant="ghost"><ChevronLeft size={16} aria-hidden="true"/> Geri</Button>
      {inspecting ? <Button type="button" variant="primary" onClick={() => setInspectingRoleId(null)}>{selectedFor(inspecting.role) > 0 ? "Seçimi tamamla" : "Seçmeden devam et"}<ArrowRight size={16} aria-hidden="true"/></Button> : <Button type="button" disabled={matchingInProgress} onClick={onContinue} variant="primary">Bütçe ve yayına geç <ArrowRight size={16} aria-hidden="true"/></Button>}
    </div>
  </section>;
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



/**
 * Free plan client için: eşleşme çalıştı ve gerçek aday sayısı gerçek
 * (uydurma değil, matchTalent()'ın totalEligibleCount'undan gelir) —
 * ama isim/profil kartları Plus'a özel. Spec: "cezalandırıcı" bir
 * boş ekran yerine, çalıştığını gösteren + net CTA'lı bir kart.
 */
function MatchPaywallCard({
  matching,
}: {
  matching: RoleMatchGroup[];
}) {
  const rolesWithMatches = matching.filter(
    (group) => group.totalEligibleCount > 0
  );

  if (rolesWithMatches.length === 0) {
    return (
      <div className={`${CARD} p-8 text-center`}>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Bu proje için henüz uygun freelancer bulamadık.
        </p>
      </div>
    );
  }

  return (
    <div className={`${CARD} p-8`}>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        Eşleşmeler hazır
      </p>

      <div className="mt-3 space-y-1.5">
        {rolesWithMatches.map((group) => (
          <p
            key={group.role}
            className="text-sm text-[var(--color-text-secondary)]"
          >
            <span className="font-medium text-[var(--color-text-primary)]">
              {group.role}
            </span>{" "}
            için {group.totalEligibleCount} uygun
            freelancer bulduk.
          </p>
        ))}
      </div>

      <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
        Uygun freelancerları görmek için Plus&apos;a
        geçin.
      </p>

      <a
        href="/premium"
        className={`${BTN_PRIMARY} mt-4 inline-flex`}
      >
        Plus&apos;ı keşfet
      </a>
    </div>
  );
}

/**
 * Bir rol için aday listesi. Sunucu zaten en fazla 20 uygun aday
 * gönderir (bkz. MAX_RETURNED_CANDIDATES_PER_ROLE, lib/ai/match-talent.ts)
 * — burada da ilk bakışta sadece ilk 3 gösterilir, "Tümünü gör" ile
 * geri kalanı (aynı, zaten çekilmiş listeden) açılır. Ayrı bir
 * pagination isteği YOK; ölçek büyüdükçe bu sınır API tarafında
 * korunur.
 */
function RoleCandidatePicker({
  role,
  freelancers,
  selected,
  onToggle,
}: {
  role: Role;
  freelancers: Talent[];
  selected: Talent[];
  onToggle: (talent: Talent) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const DEFAULT_VISIBLE = 3;

  if (freelancers.length === 0) {
    return null;
  }

  const visible = showAll
    ? freelancers
    : freelancers.slice(0, DEFAULT_VISIBLE);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {role.name}
        </p>

        <span className="text-xs text-[var(--color-text-muted)]">
          {selected.length}/{role.memberCount}
        </span>
      </div>

      <div className="mt-2 space-y-2">
        {visible.map((candidate) => {
          const picked = selected.some(
            (item) => item.id === candidate.id
          );

          const disabled =
            !picked && selected.length >= role.memberCount;

          return (
            <div key={candidate.id} className={matchStyles.candidate}>
              <FreelancerHoverCard talent={candidate}/>
              <button type="button" aria-label={candidate.name + (picked ? " seçimini kaldır" : " seç")} aria-pressed={picked} disabled={disabled} onClick={() => onToggle(candidate)} className={matchStyles.pick}>
                <RadioDot checked={picked}/><span>{picked ? "Seçildi" : "Seç"}</span>
              </button>
            </div>
          );
        })}
      </div>

      {!showAll && freelancers.length > DEFAULT_VISIBLE && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowAll(true);
          }}
          className="mt-2 text-xs font-medium text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
        >
          Tümünü gör ({freelancers.length})
        </button>
      )}
    </div>
  );
}

/** Click disclosure uses only the fields returned by the entitled matching endpoint. */
function FreelancerHoverCard({talent}: {talent: Talent}) {
  return <details className={matchStyles.profilePreview}>
    <summary><Avatar src={talent.avatar} name={talent.name} size="md"/><span className={matchStyles.previewIdentity}><strong>{talent.name}</strong>{talent.title && <span>{talent.title}</span>}</span><span className={matchStyles.previewScore}>%{Math.round(talent.score)} uyum</span><ChevronDown size={16}/></summary>
    <div className={matchStyles.previewBody}>
      <dl>{talent.experience && <div><dt>Deneyim</dt><dd>{talent.experience}</dd></div>}{talent.availability && <div><dt>Müsaitlik</dt><dd>{talent.availability}</dd></div>}</dl>
      {talent.bio && <p>{talent.bio}</p>}
      {talent.skills.length > 0 && <div className={matchStyles.previewSkills}>{talent.skills.slice(0, 5).map(skill => <Badge key={skill}>{skill}</Badge>)}</div>}
      {talent.reason && <p><strong>Proje uyumu:</strong> {talent.reason}</p>}
      <a href={`/client/freelancers/${encodeURIComponent(talent.id)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary-600)]">Profili görüntüle <ArrowRight size={14}/><span className="sr-only">(yeni sekmede)</span></a>
    </div>
  </details>;
}

function BudgetPublishStep({
  brief,
  selectionMode,
  roles,
  updateRole,
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
  totalBudget: number;
  budgetIsReady: boolean;
  publishing: boolean;
  onBack: () => void;
  onPublish: () => void;
}) {
  /**
   * Platform hizmet bedeli oranı hard-code edilmez — mevcut, merkezi
   * plan-bazlı komisyon sisteminden (bkz. supabase/migrations/
   * 202609230002_plan_based_client_commission.sql:
   * private.client_commission_rate() / public.my_commission_rate())
   * okunur. RPC'ye erişilemezse (ör. geçici ağ hatası) mevcut sistemin
   * halihazırdaki standart oranı olan %15 varsayılan olarak kullanılır —
   * bu, oranı burada SABİTLEMEK değil, tek seferlik bir düşüş (fallback)
   * güvenliğidir.
   */
  const [commissionRate, setCommissionRate] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const supabase = createClient();

    supabase
      .rpc("my_commission_rate")
      .then(({ data, error }) => {
        if (!active || error) return;

        // PostgREST bir `numeric` skaler dönüşünü JSON number ya da
        // (hassasiyeti korumak için) string olarak döndürebilir —
        // ikisini de kabul et.
        const rate = Number(data);

        if (Number.isFinite(rate) && rate > 0 && rate < 1) {
          setCommissionRate(rate);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const effectiveCommissionRate = commissionRate ?? STANDARD_COMMISSION_RATE;
  const platformFee = Math.round(totalBudget * effectiveCommissionRate);
  const totalWithFee = totalBudget + platformFee;

  const roleSkillSummary = uniqueStrings(
    roles.flatMap((role) => [...role.skills, ...role.preferredSkills])
  );

  return (
    <section className="pt-[var(--space-2)]">
      <div className="mb-[var(--space-5)]">
        <p className={EYEBROW}>
          04 / Bütçe & yayınla
        </p>

        <h2 className={HEADING}>
          Projeyi bütçelendir
        </h2>

        <p className={SUBTEXT}>
          Her rol için çalışma bütçesini ve beklenen süreyi belirleyin. Toplam bütçe otomatik hesaplanır.
        </p>
      </div>

      <BudgetProjectSummary brief={brief} roles={roles} skills={roleSkillSummary}/>
      <section className={needsStyles.roleBudgetSection} aria-label="Rol bütçesi ve süreleri">
        <h3>Rol bütçesi ve süreleri</h3>
        <p>Her rol için çalışma bütçesini ve beklenen süreyi belirleyin.</p>
        <div className={needsStyles.roleBudgetList}>{roles.map(role=><RoleBudgetCard key={role.id} role={{...role,memberCount:selectionMode === "team" ? role.memberCount : 1}} disabled={publishing} onUpdate={updates=>updateRole(role.id,updates)}/>)}</div>
      </section>

      {totalBudget > 0 && (
        <div
          className={`${CARD} mt-6 overflow-hidden`}
        >
          <div className="border-b border-[var(--color-border-subtle)] px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Yayınlamadan önce ödeme özetini kontrol et
            </p>
          </div>

          <div className="space-y-3 px-6 py-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">
                Rol bütçeleri toplamı
              </span>
              <span className="font-medium text-[var(--color-text-primary)]">
                ₺{formatTL(totalBudget)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">
                CollaCrew hizmet bedeli (%
                {Math.round(
                  effectiveCommissionRate * 100
                )}
                )
              </span>
              <span className="font-medium text-[var(--color-text-primary)]">
                +₺{formatTL(platformFee)}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                Tahmini toplam ödeme
              </span>
              <span className="text-xl font-semibold text-[var(--color-primary-600)]">
                ₺{formatTL(totalWithFee)}
              </span>
            </div>

            <p className="text-xs leading-5 text-[var(--color-text-muted)]">
              Bu bir tahsilat değildir. CollaCrew&apos;da ödeme
              altyapısı devreye girdiğinde gerçek tahsilat ayrı
              bir adımda onayınıza sunulacaktır.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-6">
        <Button
          type="button"
          onClick={onBack}
          disabled={publishing}
          variant="ghost"
        >
          <ChevronLeft className="h-4 w-4" />
          Geri
        </Button>

        <Button
          type="button"
          disabled={
            publishing ||
            !budgetIsReady
          }
          onClick={onPublish}
          variant="primary"
        >
          {publishing
            ? "Yayınlanıyor..."
            : "Projeyi Yayınla"}

          {!publishing && (
            <Check className="h-4 w-4" />
          )}
        </Button>
      </div>
    </section>
  );
}

function BudgetProjectSummary({brief,roles,skills}:{brief:Brief;roles:Role[];skills:string[]}) {
  const [expanded,setExpanded]=useState(false);
  const detailsId=React.useId();
  return <section className={needsStyles.budgetSummary} aria-label="Proje özeti">
    <header><h3>Proje özeti</h3><button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setExpanded(value=>!value)}>{expanded?"Detayları gizle":"Detayları görüntüle"}<ChevronDown size={16}/></button></header>
    <div className={needsStyles.budgetSummaryColumns}>
      <div><p className={needsStyles.budgetLabel}>Proje açıklaması</p><h4>{brief.title || "Başlıksız proje"}</h4>{brief.description&&<p className={expanded?needsStyles.budgetDescription:needsStyles.budgetDescriptionClamped}>{brief.description}</p>}</div>
      <div><p className={needsStyles.budgetLabel}>Proje kapsamı</p><p className={needsStyles.budgetLabel}>Roller</p><ul>{roles.map(role=><li key={role.id}>{role.name}</li>)}</ul>{skills.length>0&&<><p className={needsStyles.budgetLabel}>Beceriler</p><div className={needsStyles.budgetSkillPreview}>{skills.slice(0,5).map(skill=><Badge key={skill} className={needsStyles.skillChip}>{skill}</Badge>)}{skills.length>5&&<button type="button" aria-expanded={expanded} aria-controls={detailsId} aria-label="Tüm becerileri görüntüle" onClick={()=>setExpanded(value=>!value)}>+{skills.length-5}</button>}</div></>}</div>
    </div>
    <div id={detailsId} hidden={!expanded} className={needsStyles.budgetDetails}>{expanded&&<>{skills.length>5&&<div><p className={needsStyles.budgetLabel}>Tüm beceriler</p><div className={needsStyles.budgetSkillPreview}>{skills.map(skill=><Badge key={skill} className={needsStyles.skillChip}>{skill}</Badge>)}</div></div>}{brief.deliveryFormats.length>0&&<div><p className={needsStyles.budgetLabel}>Teslim formatı</p><p>{brief.deliveryFormats.join(", ")}</p></div>}</>}</div>
  </section>;
}

/** Reuses the existing per-person role amount and duration fields. */
function RoleBudgetCard({role,onUpdate,disabled}:{role:Role;onUpdate:(updates:Partial<Role>)=>void;disabled:boolean}) {
  return <fieldset disabled={disabled} className={needsStyles.roleBudgetCard}>
    <legend className="sr-only">{role.name} bütçesi ve süresi</legend>
    <div><h4>{role.name}</h4>{role.responsibilities[0]&&<p>{truncateToSentence(role.responsibilities[0])}</p>}</div>
    <div className={needsStyles.roleBudgetInputs}>
      <BudgetSelector label={role.memberCount>1?"Rol bütçesi (kişi başı)":"Rol bütçesi"} value={role.budgetPerPerson>0?String(role.budgetPerPerson):""} onChange={value=>onUpdate({budgetPerPerson:parseTL(value)})}/>
      <DurationSelector label="Çalışma süresi" value={role.duration} onChange={value=>onUpdate({duration:value})}/>
    </div>
    {role.memberCount>1&&<p>{role.memberCount} kişi × ₺{formatTL(role.budgetPerPerson)} · Rol toplamı ₺{formatTL(calculateRoleTotal(role.memberCount,role.budgetPerPerson))}</p>}
  </fieldset>;
}

/**
 * Client'ın gerçek proje/rol bütçesini elle girdiği alan.
 *
 * ÖNEMLİ: Bilinçli olarak bir "bütçe bandı" (₺5.000-₺10.000 gibi)
 * dropdown'u DEĞİLDİR — bant, gerçek bütçe yerine yaklaşık bir aralık
 * ima eder ve source-of-truth olamaz. Client burada tam TL rakamını
 * girer; toplam bütçe bu rakamdan hesaplanır, AI hiçbir bütçe alanını
 * belirlemez/değiştirmez.
 */
function BudgetSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  compact?: boolean;
}) {
  const fieldId=React.useId();
  return (
    <div>
      <label htmlFor={fieldId} className={LABEL}>
        {label}
      </label>

      <div className="relative">
        <Input
          id={fieldId}
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
            onChange(
              event.target.value
            )
          }
          placeholder="Örn. 37.500"
          className="pr-12"
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-text-muted)]">
          TL
        </span>
      </div>
    </div>
  );
}

function DurationSelector({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void;compact?:boolean}) {
  return <Field label={label}><SharedSelect value={value} onChange={event=>onChange(event.target.value)} options={[{value:"",label:"Süre seçin"},...DURATION_OPTIONS.map(option=>({value:option.label,label:option.label}))]}/></Field>;
}



function Field({label,error,children}:{label:string;error?:string;children:React.ReactElement}) {
  return <FormField label={label} error={error}>{props=>React.cloneElement(children as React.ReactElement<Record<string,unknown>>,{...props,...(children.type===Input||children.type===Textarea?{hasError:Boolean(error)}:{})})}</FormField>;
}
function TextArea({label,error,value,onChange,placeholder,rows=6}:{label:string;error?:string;value:string;onChange:(value:string)=>void;placeholder?:string;rows?:number}) {
  return <Field label={label} error={error}><Textarea value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder} rows={rows}/></Field>;
}
function Select({value,onChange,options,placeholder,...fieldProps}:{value:string;onChange:(value:string)=>void;options:string[];placeholder:string;id?:string;"aria-invalid"?:boolean;"aria-describedby"?:string}) {
  return <SharedSelect {...fieldProps} value={value} onChange={event=>onChange(event.target.value)} options={[{value:"",label:placeholder},...options.map(option=>({value:option,label:option}))]}/>;
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
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-muted)]"
            }
          >
            {placeholder}
          </span>

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition ${
              open
                ? "rotate-180"
                : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
            <div className="border-b border-[var(--color-border-subtle)] p-2">
              <Input
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
                className="h-10 w-full rounded-lg bg-[var(--color-surface-2)] px-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:bg-[var(--color-surface-2)]"
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
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)]"
                  >
                    <span className="text-[var(--color-text-muted)]">Ekle:</span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {search.trim()}
                    </span>
                  </button>
                ) : (
                  <div className="px-3 py-6 text-center text-xs text-[var(--color-text-muted)]">
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
                      className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)]"
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
              <Badge
                key={value}

              >
                {value}

                <button
                  type="button"
                  onClick={() =>
                    remove(
                      value
                    )
                  }
                  className="text-[var(--color-text-muted)] transition hover:text-[var(--color-text-secondary)]"
                  aria-label={`${value} kaldır`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
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
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-2)] text-xs text-[var(--color-text-secondary)]">
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
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] opacity-0 shadow-sm transition hover:text-[var(--color-text-primary)] group-hover:opacity-100"
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
