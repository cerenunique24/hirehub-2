"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import EarlyAccessBanner from "@/components/premium/EarlyAccessBanner";
import type { FreelancerRoleMatch } from "@/lib/ai/match-talent";
import { getDaysRemaining } from "@/lib/utils/deadline";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/Button";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Project = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  category: string | null;
  location: string | null;
  created_at: string;
  deadline: string | null;
  skills: string[] | null;
  team_required: boolean | null;
  team_size: number | null;
  estimated_duration: string | null;
  matchingSkills: string[];
  matchPercentage: number;
  matchedRole: string | null;
  memberCount: number | null;
  budgetPerPerson: number | null;
  roleDuration: string | null;
  hasSubmittedProposal: boolean;
};

type SortOption =
  | "recommended"
  | "newest"
  | "budget_high"
  | "deadline";

type BudgetFilter =
  | "all"
  | "0-10000"
  | "10000-25000"
  | "25000-50000"
  | "50000+";

type DurationFilter =
  | "all"
  | "less_than_week"
  | "1_2_weeks"
  | "2_4_weeks"
  | "1_3_months"
  | "3_6_months"
  | "6_plus_months";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const DURATION_OPTIONS: {
  value: DurationFilter;
  label: string;
}[] = [
  { value: "all", label: "Tüm süreler" },
  { value: "less_than_week", label: "1 haftadan az" },
  { value: "1_2_weeks", label: "1–2 hafta" },
  { value: "2_4_weeks", label: "2–4 hafta" },
  { value: "1_3_months", label: "1–3 ay" },
  { value: "3_6_months", label: "3–6 ay" },
  { value: "6_plus_months", label: "6 aydan uzun" },
];

const BUDGET_OPTIONS: {
  value: BudgetFilter;
  label: string;
}[] = [
  { value: "all", label: "Tüm bütçeler" },
  { value: "0-10000", label: "₺10.000 altı" },
  { value: "10000-25000", label: "₺10.000 – ₺25.000" },
  { value: "25000-50000", label: "₺25.000 – ₺50.000" },
  { value: "50000+", label: "₺50.000+" },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = normalizeText(value);

    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") return null;

  const cleaned = value
    .replace(/[₺\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatBudget(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "Belirtilmemiş";
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Belirtilmemiş";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Belirtilmemiş";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function normalizeDuration(
  value: string | null | undefined
): DurationFilter {
  if (!value) return "all";

  const normalized = normalizeText(value);

  if (
    normalized.includes("1 haftadan az") ||
    normalized.includes("1 haftadan kisa")
  ) {
    return "less_than_week";
  }

  if (
    normalized.includes("1-2 hafta") ||
    normalized.includes("1–2 hafta") ||
    normalized.includes("1 2 hafta")
  ) {
    return "1_2_weeks";
  }

  if (
    normalized.includes("2-4 hafta") ||
    normalized.includes("2–4 hafta") ||
    normalized.includes("2 4 hafta")
  ) {
    return "2_4_weeks";
  }

  if (
    normalized.includes("1-3 ay") ||
    normalized.includes("1–3 ay") ||
    normalized.includes("1 3 ay")
  ) {
    return "1_3_months";
  }

  if (
    normalized.includes("3-6 ay") ||
    normalized.includes("3–6 ay") ||
    normalized.includes("3 6 ay")
  ) {
    return "3_6_months";
  }

  if (
    normalized.includes("6 aydan uzun") ||
    normalized.includes("6+ ay") ||
    normalized.includes("6 ay ve uzeri")
  ) {
    return "6_plus_months";
  }

  return "all";
}

function budgetMatchesFilter(
  budget: number | null,
  filter: BudgetFilter
): boolean {
  if (filter === "all") return true;

  if (budget === null) return false;

  switch (filter) {
    case "0-10000":
      return budget < 10000;

    case "10000-25000":
      return budget >= 10000 && budget < 25000;

    case "25000-50000":
      return budget >= 25000 && budget < 50000;

    case "50000+":
      return budget >= 50000;

    default:
      return true;
  }
}

function durationMatchesFilter(
  duration: string | null,
  deadline: string | null,
  filter: DurationFilter
): boolean {
  if (filter === "all") return true;

  if (duration) {
    const normalizedDuration = normalizeDuration(duration);

    if (normalizedDuration !== "all") {
      return normalizedDuration === filter;
    }
  }

  const days = getDaysRemaining(deadline);

  if (days === null) return false;

  switch (filter) {
    case "less_than_week":
      return days < 7;

    case "1_2_weeks":
      return days >= 7 && days <= 14;

    case "2_4_weeks":
      return days > 14 && days <= 28;

    case "1_3_months":
      return days > 28 && days <= 90;

    case "3_6_months":
      return days > 90 && days <= 180;

    case "6_plus_months":
      return days > 180;

    default:
      return true;
  }
}

/* -------------------------------------------------------------------------- */
/* Skill / role matching                                                      */
/* -------------------------------------------------------------------------- */

/*
 * Eşleşme skoru artık burada YENİDEN hesaplanmıyor. Liste ve proje
 * detay sayfası (dolayısıyla teklif formu) aynı sayıyı göstersin
 * diye ikisi de aynı sunucu tarafı fonksiyonu (matchFreelancerToProjectRoles)
 * kullanıyor. Böylece "listede %40, detayda %44" gibi tutarsızlıklar
 * yapısal olarak imkansız hale geliyor.
 *
 * FreelancerRoleMatch yalnızca insan-okunur bir `reason` metni
 * döndürüyor (ör. "... Eşleşen yetenekler: Adobe Photoshop, Adobe
 * Illustrator."); kart üzerindeki etiketler için bu metinden
 * ilgili bölümü ayıklıyoruz.
 */
function extractMatchingSkillsFromReason(
  reason: string | undefined
): string[] {
  if (!reason) return [];

  const match = reason.match(
    /Eşleşen yetenekler:\s*([^.]+)\./
  );

  if (!match) return [];

  return uniqueStrings(
    match[1].split(",").map((skill) => skill.trim())
  );
}

/* -------------------------------------------------------------------------- */
/* FilterSelect                                                               */
/* -------------------------------------------------------------------------- */

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="cc-filter-text h-[var(--control-height-md)] w-full appearance-none rounded-[var(--radius-select)] border border-[var(--color-border-subtle)] bg-white pl-3 pr-8 font-sans text-[var(--color-text-primary)] outline-none transition hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary-600)] focus:ring-2 focus:ring-[var(--color-primary-50)]"
      >
        {children}
      </select>

      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function DiscoverPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [sortBy, setSortBy] =
    useState<SortOption>("recommended");

  const [budgetFilter, setBudgetFilter] =
    useState<BudgetFilter>("all");

  const [durationFilter, setDurationFilter] =
    useState<DurationFilter>("all");

  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [locationFilter, setLocationFilter] =
    useState("all");

  const [showFilters, setShowFilters] =
    useState(false);

  const [favorites, setFavorites] = useState<Set<string>>(
    new Set()
  );

  /* ---------------------------------------------------------------------- */
  /* Load projects                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          if (!cancelled) {
            setProjects([]);
          }

          return;
        }

        /* ---------------------------------------------------------------- */
        /* Freelancer profile                                                */
        /* ---------------------------------------------------------------- */

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("skills, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (
          profile?.role &&
          normalizeText(profile.role) !== "freelancer"
        ) {
          if (!cancelled) {
            setProjects([]);
          }

          return;
        }

        /* ---------------------------------------------------------------- */
        /* Existing proposals                                                */
        /* ---------------------------------------------------------------- */

        const {
          data: proposals,
          error: proposalsError,
        } = await supabase
          .from("proposals")
          .select("project_id")
          .eq("freelancer_id", user.id);

        if (proposalsError) {
          throw proposalsError;
        }

        const proposalProjectIds = new Set(
          (proposals ?? [])
            .map((proposal) => proposal.project_id)
            .filter(Boolean)
        );

        /* ---------------------------------------------------------------- */
        /* Open projects                                                     */
        /* ---------------------------------------------------------------- */

        const {
          data: projectRows,
          error: projectsError,
        } = await supabase
          .from("projects")
          .select(
            `
              id,
              title,
              description,
              budget,
              category,
              location,
              created_at,
              deadline,
              skills,
              team_required,
              team_size,
              estimated_duration
            `
          )
          .eq("status", "open")
          .order("created_at", {
            ascending: false,
          });

        if (projectsError) {
          throw projectsError;
        }

        /*
         * Her proje için EŞLEŞME hesabı, proje detay sayfasıyla
         * (ve dolayısıyla teklif formuyla) birebir aynı sonucu
         * versin diye aynı sunucu tarafı fonksiyonuna delege
         * ediliyor. Bu fonksiyon sadece skoru >=40 olan rolleri
         * döndürür; hiçbir rol eşiği geçmiyorsa dizi boş döner ve
         * kart "sana uygun rol" göstermez (yanlış/anlamsız bir rol
         * adını %0 ile göstermek yerine).
         *
         * ÖNEMLİ: bu hesaplama artık TARAYICIDA (browser Supabase
         * client'ıyla) DEĞİL, /api/ai/match-talent server route'unda
         * çalışıyor. matchFreelancerToProjectRoles() projects.budget_
         * breakdown'ın TAMAMINI (tüm rollerin bütçesi) okuyor — bu
         * daha önce burada doğrudan çağrıldığı için, kartta sadece
         * en iyi rol gösterilse bile, HER açık projenin TÜM rollerinin
         * bütçesi network response'unda tarayıcıya gidiyordu. Artık
         * server sadece narrow'lanmış (en iyi rol + eligible roller)
         * sonucu döndürüyor; budget_breakdown hiçbir zaman tarayıcıya
         * ulaşmıyor.
         */
        const matchingByProject: Record<string, FreelancerRoleMatch[]> = {};

        if ((projectRows ?? []).length > 0) {
          try {
            const matchResponse = await fetch(
              "/api/ai/match-talent",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  projectIds: (projectRows ?? []).map((row) => row.id),
                }),
              }
            );

            if (matchResponse.ok) {
              const matchData = (await matchResponse.json()) as {
                matching?: Record<string, FreelancerRoleMatch[]>;
              };

              Object.assign(
                matchingByProject,
                matchData.matching ?? {}
              );
            } else {
              console.error(
                "Toplu proje eşleşmesi alınamadı:",
                await matchResponse.text()
              );
            }
          } catch (matchError) {
            console.error(
              "Toplu proje eşleşmesi hesaplanamadı:",
              matchError
            );
          }
        }

        const mappedProjects: Project[] = (projectRows ?? []).map((row) => {
            const projectSkills = normalizeArray(row.skills);

            /*
             * Kart, gerçekten proposal gönderilebilecek (eligible)
             * bir rol varsa onu öne çıkarır; hiçbiri eligible
             * değilse en yüksek skorlu rol yine bilgi amaçlı
             * gösterilir (ama bütçe/süre API tarafından zaten
             * döndürülmez).
             */
            const matches = matchingByProject[row.id] ?? [];

            const bestMatch =
              matches.find(
                (match) => match.isEligibleForRole
              ) ??
              matches[0] ??
              null;

            const memberCount =
              typeof bestMatch?.memberCount === "number"
                ? bestMatch.memberCount
                : null;

            const roleBudget =
              typeof bestMatch?.budgetPerPerson === "number" &&
              bestMatch.budgetPerPerson > 0
                ? bestMatch.budgetPerPerson
                : null;

            const totalRoleBudget =
              typeof bestMatch?.budget === "number" &&
              bestMatch.budget > 0
                ? bestMatch.budget
                : null;

            const budgetPerPerson =
              roleBudget ??
              (totalRoleBudget !== null &&
              memberCount &&
              memberCount > 0
                ? totalRoleBudget / memberCount
                : null);

            return {
              id: row.id,
              title: row.title,
              description: row.description,
              budget: parseNumber(row.budget),
              category: row.category,
              location: row.location,
              created_at: row.created_at,
              deadline: row.deadline,
              skills: projectSkills,
              team_required: row.team_required,
              team_size: row.team_size,
              estimated_duration: row.estimated_duration,
              matchingSkills: extractMatchingSkillsFromReason(
                bestMatch?.reason
              ),
              matchPercentage: bestMatch?.score ?? 0,
              matchedRole: bestMatch?.role ?? null,
              memberCount,
              budgetPerPerson,
              roleDuration:
                row.estimated_duration ?? null,
              hasSubmittedProposal: proposalProjectIds.has(
                row.id
              ),
            };
          });

        if (!cancelled) {
          setProjects(mappedProjects);
        }
      } catch (err) {
        console.error(
          "Discover projects error:",
          err
        );

        if (!cancelled) {
          setError(
            "Projeler yüklenirken bir sorun oluştu. Lütfen tekrar deneyin."
          );
          setProjects([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  /* ---------------------------------------------------------------------- */
  /* Filter options                                                          */
  /* ---------------------------------------------------------------------- */

  const categories = useMemo(() => {
    const values = projects
      .map((project) => project.category)
      .filter(
        (value): value is string =>
          Boolean(value)
      );

    return Array.from(new Set(values));
  }, [projects]);

  const locations = useMemo(() => {
    const values = projects
      .map((project) => project.location)
      .filter(
        (value): value is string =>
          Boolean(value)
      );

    return Array.from(new Set(values));
  }, [projects]);

  /* ---------------------------------------------------------------------- */
  /* Filtered list                                                           */
  /* ---------------------------------------------------------------------- */

  const filteredProjects = useMemo(() => {
    const normalizedSearch =
      normalizeText(search);

    const result = projects.filter((project) => {
      if (normalizedSearch) {
        const searchable = normalizeText(
          [
            project.title,
            project.description ?? "",
            project.category ?? "",
            project.location ?? "",
            project.matchedRole ?? "",
            ...(project.skills ?? []),
          ].join(" ")
        );

        if (
          !searchable.includes(normalizedSearch)
        ) {
          return false;
        }
      }

      if (
        categoryFilter !== "all" &&
        project.category !== categoryFilter
      ) {
        return false;
      }

      if (
        locationFilter !== "all" &&
        project.location !== locationFilter
      ) {
        return false;
      }

      if (
        !budgetMatchesFilter(
          project.budgetPerPerson,
          budgetFilter
        )
      ) {
        return false;
      }

      if (
        !durationMatchesFilter(
          project.roleDuration,
          project.deadline,
          durationFilter
        )
      ) {
        return false;
      }

      return true;
    });

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );

        case "budget_high":
          return (
            (b.budgetPerPerson ?? 0) -
            (a.budgetPerPerson ?? 0)
          );

        case "deadline": {
          const aDate = a.deadline
            ? new Date(a.deadline).getTime()
            : Number.MAX_SAFE_INTEGER;

          const bDate = b.deadline
            ? new Date(b.deadline).getTime()
            : Number.MAX_SAFE_INTEGER;

          return aDate - bDate;
        }

        case "recommended":
        default:
          return (
            b.matchPercentage -
            a.matchPercentage
          );
      }
    });
  }, [
    projects,
    search,
    sortBy,
    budgetFilter,
    durationFilter,
    categoryFilter,
    locationFilter,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Favorites                                                               */
  /* ---------------------------------------------------------------------- */

  function toggleFavorite(projectId: string) {
    setFavorites((previous) => {
      const next = new Set(previous);

      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }

      return next;
    });
  }

  function clearFilters() {
    setSearch("");
    setBudgetFilter("all");
    setDurationFilter("all");
    setCategoryFilter("all");
    setLocationFilter("all");
    setSortBy("recommended");
  }

  const hasActiveFilters =
    search.trim().length > 0 ||
    budgetFilter !== "all" ||
    durationFilter !== "all" ||
    categoryFilter !== "all" ||
    locationFilter !== "all";

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div>
      <PageHeader
        title="Projeleri Keşfet"
        description="Yeteneklerine uygun açık projeleri keşfet, sana uygun rollere teklif gönder."
        action={
          <Badge tone="neutral" className="gap-1.5 px-3 py-1.5 text-[13px]">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            {loading ? "Projeler aranıyor..." : `${filteredProjects.length} proje`}
          </Badge>
        }
      />

      <div className="mt-[var(--rhythm-header-gap)]">
        <EarlyAccessBanner />

        {/* ---------------------------------------------------------------- */}
        {/* Search / sort / filters                                          */}
        {/* ---------------------------------------------------------------- */}

        <section className="mb-[var(--space-6)] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            {/* Search */}

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Proje, kategori, rol veya yetenek ara..."
                className="h-[var(--input-height)] w-full rounded-[var(--radius-input)] border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] pl-9 pr-3 font-sans text-[length:var(--font-size-body)] leading-5 text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary-600)] focus:bg-white focus:ring-2 focus:ring-[var(--color-primary-50)]"
              />
            </div>

            {/* Actions */}

            <div className="flex gap-2">
              <div className="w-full sm:w-44">
                <FilterSelect
                  value={sortBy}
                  onChange={(value) =>
                    setSortBy(
                      value as SortOption
                    )
                  }
                >
                  <option value="recommended">
                    En uygun
                  </option>

                  <option value="newest">
                    En yeni
                  </option>

                  <option value="budget_high">
                    Bütçesi yüksek
                  </option>

                  <option value="deadline">
                    Son teslim tarihi
                  </option>
                </FilterSelect>
              </div>

              <Button
                variant={showFilters || hasActiveFilters ? "primary" : "secondary"}
                aria-expanded={showFilters}
                onClick={() =>
                  setShowFilters(
                    (previous) => !previous
                  )
                }
                className="shrink-0"
              >
                <SlidersHorizontal className="h-4 w-4" />

                <span>Filtreler</span>

                {hasActiveFilters && (
                  <span
                    aria-label="Aktif filtre var"
                    className="h-1.5 w-1.5 rounded-[var(--radius-pill)] bg-current"
                  />
                )}
              </Button>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Filters                                                         */}
          {/* -------------------------------------------------------------- */}

          {showFilters && (
            <div className="mt-3 border-t border-[var(--color-border-subtle)] px-1 pb-1 pt-4">
              <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Category */}

                <div>
                  <label className="cc-label mb-[var(--rhythm-label-gap)] block text-[var(--color-text-secondary)]">
                    Kategori
                  </label>

                  <FilterSelect
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                  >
                    <option value="all">
                      Tüm kategoriler
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      )
                    )}
                  </FilterSelect>
                </div>

                {/* Budget */}

                <div>
                  <label className="cc-label mb-[var(--rhythm-label-gap)] block text-[var(--color-text-secondary)]">
                    Bütçe / Rol
                  </label>

                  <FilterSelect
                    value={budgetFilter}
                    onChange={(value) =>
                      setBudgetFilter(
                        value as BudgetFilter
                      )
                    }
                  >
                    {BUDGET_OPTIONS.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      )
                    )}
                  </FilterSelect>
                </div>

                {/* Duration */}

                <div>
                  <label className="cc-label mb-[var(--rhythm-label-gap)] block text-[var(--color-text-secondary)]">
                    Süre
                  </label>

                  <FilterSelect
                    value={durationFilter}
                    onChange={(value) =>
                      setDurationFilter(
                        value as DurationFilter
                      )
                    }
                  >
                    {DURATION_OPTIONS.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      )
                    )}
                  </FilterSelect>
                </div>

                {/* Location */}

                <div>
                  <label className="cc-label mb-[var(--rhythm-label-gap)] block text-[var(--color-text-secondary)]">
                    Konum
                  </label>

                  <FilterSelect
                    value={locationFilter}
                    onChange={setLocationFilter}
                  >
                    <option value="all">
                      Tüm konumlar
                    </option>

                    {locations.map(
                      (location) => (
                        <option
                          key={location}
                          value={location}
                        >
                          {location}
                        </option>
                      )
                    )}
                  </FilterSelect>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-3">
                  <p className="cc-body-sm text-[var(--color-text-secondary)]">
                    Aktif filtreler sonuçları
                    daraltıyor.
                  </p>

                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5" />
                    Filtreleri temizle
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Error                                                             */}
        {/* ---------------------------------------------------------------- */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-2)]">
              <X className="h-4 w-4 text-[var(--color-text-primary)]" />
            </div>

            <div>
              <p className="cc-h3 text-[var(--color-text-primary)]">
                Projeler yüklenemedi
              </p>

              <p className="cc-body-sm mt-1 text-[var(--color-text-secondary)]">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Loading                                                           */}
        {/* ---------------------------------------------------------------- */}

        {loading && (
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-5"
              >
                <div className="mb-5 h-5 w-2/3 rounded bg-[var(--color-surface-2)]" />

                <div className="mb-2 h-4 w-full rounded bg-[var(--color-surface-2)]" />

                <div className="mb-5 h-4 w-4/5 rounded bg-[var(--color-surface-2)]" />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="h-12 rounded-[var(--radius-md)] bg-[var(--color-surface-2)]" />
                  <div className="h-12 rounded-[var(--radius-md)] bg-[var(--color-surface-2)]" />
                  <div className="h-12 rounded-[var(--radius-md)] bg-[var(--color-surface-2)]" />
                  <div className="h-12 rounded-[var(--radius-md)] bg-[var(--color-surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Empty                                                             */}
        {/* ---------------------------------------------------------------- */}

        {!loading &&
          !error &&
          filteredProjects.length === 0 && (
            <EmptyState
              icon={Search}
              title={
                projects.length === 0
                  ? "Henüz açık proje bulunamadı"
                  : "Filtrelere uygun proje bulunamadı"
              }
              description={
                projects.length === 0
                  ? "Şu anda yayınlanmış açık proje bulunmuyor. Yeni projeler yayınlandığında burada görünecek."
                  : "Filtreleri değiştirerek veya aramayı temizleyerek daha fazla proje görebilirsin."
              }
              action={
                projects.length > 0 &&
                hasActiveFilters && (
                  <Button size="sm" onClick={clearFilters}>
                    Filtreleri temizle
                  </Button>
                )
              }
            />
          )}

        {/* ---------------------------------------------------------------- */}
        {/* Project count                                                     */}
        {/* ---------------------------------------------------------------- */}

        {!loading &&
          !error &&
          filteredProjects.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="cc-body-sm text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--color-text-primary)]">
                  {filteredProjects.length}
                </span>{" "}
                proje listeleniyor
              </p>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Filtreleri temizle
                </Button>
              )}
            </div>
          )}

        {/* ---------------------------------------------------------------- */}
        {/* Project cards                                                     */}
        {/* ---------------------------------------------------------------- */}

        {!loading &&
          !error &&
          filteredProjects.length > 0 && (
            <div className="flex flex-col gap-4">
              {filteredProjects.map((project) => {
                const daysLeft = getDaysRemaining(project.deadline);
                const isFavorite = favorites.has(project.id);

                return (
                  <article
                    key={project.id}
                    className="group flex flex-col gap-5 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-5 transition hover:border-[var(--color-border-strong)] hover:shadow-sm sm:flex-row"
                  >
                    {/* Main content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-1.5">
                            {project.category && <Badge tone="neutral">{project.category}</Badge>}
                            <Badge tone="ai" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              %{project.matchPercentage} eşleşme
                            </Badge>
                          </div>

                          <Link href={`/freelancers/discover/${project.id}`} className="block">
                            <h2 className="truncate text-base font-medium leading-6 text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary-700)]">
                              {project.title}
                            </h2>
                          </Link>

                          {project.matchedRole && (
                            <p className="cc-body-sm mt-[var(--rhythm-card-secondary-gap)] flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                              <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0" />
                              Sana uygun rol:{" "}
                              <span className="font-medium text-[var(--color-text-primary)]">
                                {project.matchedRole}
                              </span>
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleFavorite(project.id)}
                          aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                        >
                          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current text-[var(--color-text-primary)]" : ""}`} />
                        </button>
                      </div>

                      {project.description && (
                        <p className="cc-body mt-[var(--rhythm-description-gap)] line-clamp-2 text-[var(--color-text-secondary)]">
                          {project.description}
                        </p>
                      )}

                      {project.matchingSkills.length > 0 && (
                        <div className="mt-[var(--rhythm-meta-gap)] flex flex-wrap gap-1.5">
                          {project.matchingSkills.slice(0, 6).map((skill) => (
                            <Badge key={skill} tone="neutral">
                              {skill}
                            </Badge>
                          ))}
                          {project.matchingSkills.length > 6 && (
                            <Badge tone="neutral">+{project.matchingSkills.length - 6}</Badge>
                          )}
                        </div>
                      )}

                      <div className="cc-body-sm mt-[var(--rhythm-meta-group-gap)] flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--color-text-secondary)] empty:hidden">
                        {project.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {project.location}
                          </span>
                        )}
                        {project.team_required && (
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Ekip projesi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics + action */}
                    <div className="flex shrink-0 flex-col gap-[var(--rhythm-meta-gap)] border-t border-[var(--color-border-subtle)] pt-4 sm:w-[224px] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-[var(--rhythm-meta-group-gap)]">
                        <div>
                          <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                            <Wallet className="h-3 w-3" /> Rol bütçesi
                          </p>
                          <p className="mt-1 text-sm font-medium leading-5 text-[var(--color-text-primary)]">
                            {formatBudget(project.budgetPerPerson)}
                          </p>
                        </div>

                        <div>
                          <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                            <Users className="h-3 w-3" /> Kişi
                          </p>
                          <p className="mt-1 text-sm font-medium leading-5 text-[var(--color-text-primary)]">
                            {project.memberCount ?? 1}
                          </p>
                        </div>

                        <div>
                          <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                            <Clock3 className="h-3 w-3" /> Süre
                          </p>
                          <p className="mt-1 truncate text-sm font-medium leading-5 text-[var(--color-text-primary)]">
                            {project.roleDuration ?? project.estimated_duration ?? "Belirtilmemiş"}
                          </p>
                        </div>

                        <div>
                          <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                            <CalendarDays className="h-3 w-3" /> Son tarih
                          </p>
                          <p className="mt-1 truncate text-sm font-medium leading-5 text-[var(--color-text-primary)]">
                            {daysLeft !== null
                              ? daysLeft < 0
                                ? "Süresi doldu"
                                : `${daysLeft} gün`
                              : formatDate(project.deadline)}
                          </p>
                        </div>
                      </div>

                      {project.hasSubmittedProposal && (
                        <Badge tone="success" className="w-fit">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Teklif verdin
                        </Badge>
                      )}

                      <Link
                        href={`/freelancers/discover/${project.id}`}
                        className="mt-auto inline-flex h-[var(--button-height-sm)] w-full items-center justify-center gap-[var(--button-gap)] rounded-[var(--radius-button)] bg-[var(--color-primary-600)] px-[var(--button-padding-sm)] font-sans text-[length:var(--font-size-button)] font-medium leading-[var(--line-height-button)] text-white transition-colors hover:bg-[var(--color-primary-700)]"
                      >
                        Detayları gör
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}
