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
import { matchFreelancerToProjectRoles } from "@/lib/ai/match-talent";

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

function getDaysUntil(value: string | null): number | null {
  if (!value) return null;

  const deadline = new Date(value);

  if (Number.isNaN(deadline.getTime())) {
    return null;
  }

  const now = new Date();

  return Math.ceil(
    (deadline.getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24)
  );
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

  const days = getDaysUntil(deadline);

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
        className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm font-medium text-gray-700 outline-none transition hover:border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      >
        {children}
      </select>

      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
         */
        const mappedProjects: Project[] = await Promise.all(
          (projectRows ?? []).map(async (row) => {
            const projectSkills = normalizeArray(row.skills);

            let bestMatch: Awaited<
              ReturnType<typeof matchFreelancerToProjectRoles>
            >[number] | null = null;

            try {
              const matches = await matchFreelancerToProjectRoles(
                supabase,
                row.id,
                user.id
              );

              bestMatch = matches[0] ?? null;
            } catch (matchError) {
              console.error(
                "Proje eşleşmesi hesaplanamadı:",
                row.id,
                matchError
              );
            }

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
          })
        );

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
    <div className="min-h-screen bg-gray-50">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-gray-700" />

                  <span className="text-xs font-semibold text-gray-600">
                    Freelancer
                  </span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
                  Projeleri Keşfet
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                  Yeteneklerine uygun açık projeleri
                  keşfet, sana uygun rollere teklif
                  gönder.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                <BriefcaseBusiness className="h-4 w-4 text-gray-500" />

                <span className="text-sm font-semibold text-gray-700">
                  {loading
                    ? "Projeler aranıyor..."
                    : `${filteredProjects.length} proje`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Content                                                            */}
      {/* ------------------------------------------------------------------ */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <EarlyAccessBanner />

        {/* ---------------------------------------------------------------- */}
        {/* Search / sort / filters                                          */}
        {/* ---------------------------------------------------------------- */}

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}

            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Proje, kategori, rol veya yetenek ara..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100"
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

              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    (previous) => !previous
                  )
                }
                className={`flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                  showFilters || hasActiveFilters
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />

                <span>Filtreler</span>

                {hasActiveFilters && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-gray-900">
                    !
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Filters                                                         */}
          {/* -------------------------------------------------------------- */}

          {showFilters && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Category */}

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-500">
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
                  <label className="mb-2 block text-xs font-semibold text-gray-500">
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
                  <label className="mb-2 block text-xs font-semibold text-gray-500">
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
                  <label className="mb-2 block text-xs font-semibold text-gray-500">
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
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500">
                    Aktif filtreler sonuçları
                    daraltıyor.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 transition hover:text-gray-950"
                  >
                    <X className="h-3.5 w-3.5" />
                    Filtreleri temizle
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Error                                                             */}
        {/* ---------------------------------------------------------------- */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <X className="h-4 w-4 text-gray-700" />
            </div>

            <div>
              <p className="font-semibold text-gray-900">
                Projeler yüklenemedi
              </p>

              <p className="mt-1 text-sm text-gray-500">
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
                className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6"
              >
                <div className="mb-5 h-5 w-2/3 rounded bg-gray-100" />

                <div className="mb-2 h-4 w-full rounded bg-gray-100" />

                <div className="mb-5 h-4 w-4/5 rounded bg-gray-100" />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="h-16 rounded-xl bg-gray-100" />
                  <div className="h-16 rounded-xl bg-gray-100" />
                  <div className="h-16 rounded-xl bg-gray-100" />
                  <div className="h-16 rounded-xl bg-gray-100" />
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
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Search className="h-6 w-6 text-gray-500" />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-gray-900">
                {projects.length === 0
                  ? "Henüz açık proje bulunamadı"
                  : "Filtrelere uygun proje bulunamadı"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                {projects.length === 0
                  ? "Şu anda yayınlanmış açık proje bulunmuyor. Yeni projeler yayınlandığında burada görünecek."
                  : "Filtreleri değiştirerek veya aramayı temizleyerek daha fazla proje görebilirsin."}
              </p>

              {projects.length > 0 &&
                hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    Filtreleri temizle
                  </button>
                )}
            </div>
          )}

        {/* ---------------------------------------------------------------- */}
        {/* Project count                                                     */}
        {/* ---------------------------------------------------------------- */}

        {!loading &&
          !error &&
          filteredProjects.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">
                  {filteredProjects.length}
                </span>{" "}
                proje listeleniyor
              </p>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
                >
                  Filtreleri temizle
                </button>
              )}
            </div>
          )}

        {/* ---------------------------------------------------------------- */}
        {/* Project cards                                                     */}
        {/* ---------------------------------------------------------------- */}

        {!loading &&
          !error &&
          filteredProjects.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredProjects.map(
                (project) => {
                  const daysLeft =
                    getDaysUntil(
                      project.deadline
                    );

                  const isFavorite =
                    favorites.has(project.id);

                  return (
                    <article
                      key={project.id}
                      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-sm"
                    >
                      <div className="p-6">
                        {/* ------------------------------------------------ */}
                        {/* Top                                              */}
                        {/* ------------------------------------------------ */}

                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {project.category && (
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                  {project.category}
                                </span>
                              )}

                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                                <Sparkles className="h-3 w-3" />
                                %{project.matchPercentage}{" "}
                                eşleşme
                              </span>
                            </div>

                            <Link
                              href={`/freelancers/discover/${project.id}`}
                              className="block"
                            >
                              <h2 className="line-clamp-2 text-lg font-bold leading-7 text-gray-950 transition group-hover:text-gray-700">
                                {project.title}
                              </h2>
                            </Link>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              toggleFavorite(
                                project.id
                              )
                            }
                            aria-label={
                              isFavorite
                                ? "Favorilerden çıkar"
                                : "Favorilere ekle"
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900"
                          >
                            <Heart
                              className={`h-4 w-4 ${
                                isFavorite
                                  ? "fill-current text-gray-900"
                                  : ""
                              }`}
                            />
                          </button>
                        </div>

                        {/* ------------------------------------------------ */}
                        {/* Matched role                                     */}
                        {/* ------------------------------------------------ */}

                        {project.matchedRole && (
                          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                                <BriefcaseBusiness className="h-4 w-4 text-gray-700" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                  Sana uygun rol
                                </p>

                                <p className="truncate text-sm font-semibold text-gray-900">
                                  {project.matchedRole}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ------------------------------------------------ */}
                        {/* Description                                      */}
                        {/* ------------------------------------------------ */}

                        {project.description && (
                          <p className="mb-5 line-clamp-3 text-sm leading-6 text-gray-500">
                            {project.description}
                          </p>
                        )}

                        {/* ------------------------------------------------ */}
                        {/* Info                                             */}
                        {/* ------------------------------------------------ */}

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-gray-400">
                              <Wallet className="h-3.5 w-3.5" />

                              <span className="text-[11px] font-medium">
                                Rol bütçesi
                              </span>
                            </div>

                            <p className="text-sm font-bold text-gray-900">
                              {formatBudget(
                                project.budgetPerPerson
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-gray-400">
                              <Users className="h-3.5 w-3.5" />

                              <span className="text-[11px] font-medium">
                                Kişi
                              </span>
                            </div>

                            <p className="text-sm font-bold text-gray-900">
                              {project.memberCount ??
                                1}
                            </p>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-gray-400">
                              <Clock3 className="h-3.5 w-3.5" />

                              <span className="text-[11px] font-medium">
                                Süre
                              </span>
                            </div>

                            <p className="truncate text-sm font-bold text-gray-900">
                              {project.roleDuration ??
                                project.estimated_duration ??
                                "Belirtilmemiş"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-gray-400">
                              <CalendarDays className="h-3.5 w-3.5" />

                              <span className="text-[11px] font-medium">
                                Son tarih
                              </span>
                            </div>

                            <p className="truncate text-sm font-bold text-gray-900">
                              {daysLeft !== null
                                ? daysLeft < 0
                                  ? "Süresi doldu"
                                  : `${daysLeft} gün`
                                : formatDate(
                                    project.deadline
                                  )}
                            </p>
                          </div>
                        </div>

                        {/* ------------------------------------------------ */}
                        {/* Skills                                           */}
                        {/* ------------------------------------------------ */}

                        {project.matchingSkills
                          .length > 0 && (
                          <div className="mt-5">
                            <p className="mb-2 text-xs font-semibold text-gray-500">
                              Eşleşen yeteneklerin
                            </p>

                            <div className="flex flex-wrap gap-2">
                              {project.matchingSkills
                                .slice(0, 6)
                                .map(
                                  (skill) => (
                                    <span
                                      key={skill}
                                      className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600"
                                    >
                                      {skill}
                                    </span>
                                  )
                                )}

                              {project.matchingSkills
                                .length > 6 && (
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                                  +
                                  {project
                                    .matchingSkills
                                    .length -
                                    6}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ------------------------------------------------ */}
                        {/* Bottom                                           */}
                        {/* ------------------------------------------------ */}

                        <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
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

                          <div className="flex items-center gap-2">
                            {project.hasSubmittedProposal && (
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Teklif verdin
                              </span>
                            )}

                            <Link
                              href={`/freelancers/discover/${project.id}`}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                            >
                              Detayları gör
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
      </main>
    </div>
  );
}
