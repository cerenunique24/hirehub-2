"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Users,
  Scale,
  X,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PremiumGate from "@/components/premium/PremiumGate";
import { SKILLS } from "@/lib/constants/skills";
import { FreelancerCard } from "@/components/freelancers/FreelancerCard";

/* -------------------------------------------------------------------------- */
/* Sabitler                                                                    */
/* -------------------------------------------------------------------------- */

/*
 * Bu değerler uydurulmadı — app/freelancers/profile/page.tsx'teki profil
 * düzenleme formunun kullandığı GERÇEK seçenek listeleriyle birebir aynı
 * (deneyim/çalışma türü alanları bu sabit listelerden doldurulduğu için
 * veritabanındaki gerçek değerler de bunlardır — canlı veride de
 * doğrulandı: `select distinct experience, availability_status from
 * profiles` sorgusuyla kontrol edildi).
 */
const EXPERIENCE_OPTIONS = ["Yeni başlayan", "1-2 yıl", "3-5 yıl", "5-8 yıl", "8+ yıl"];
const WORK_TYPE_OPTIONS = ["Uzaktan", "Hibrit", "Ofisten"];

/* availability_status — freelancer dashboard'daki AvailabilityCard'ın yazdığı
 * gerçek enum değerleri (bkz. components/freelancers/AvailabilityCard.tsx). */
const AVAILABILITY_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "available", label: "Müsait" },
  { value: "limited", label: "Kısmen Müsait" },
  { value: "unavailable", label: "Müsait Değil" },
];

type SortOption = "recommended" | "rate_asc" | "rate_desc" | "newest";

const SORT_LABEL: Record<SortOption, string> = {
  recommended: "Önerilen",
  rate_asc: "Ücret: düşük → yüksek",
  rate_desc: "Ücret: yüksek → düşük",
  newest: "Yeni profiller",
};

const PAGE_SIZE = 24;

const LIST_SELECT =
  "id, first_name, last_name, avatar_url, title, bio, expertise, skills, experience, city, hourly_rate, availability_status";

/* -------------------------------------------------------------------------- */
/* Tipler                                                                      */
/* -------------------------------------------------------------------------- */

type Freelancer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  expertise: string | null;
  skills: string[] | null;
  experience: string | null;
  city: string | null;
  hourly_rate: number | null;
  availability_status: string | null;
};

/*
 * Sadece 6 ANA filtre: Uzmanlık, Skill, Deneyim, Ücret, Uygunluk, Çalışma
 * Şekli. Language/City gibi ikincil kriterler bilinçli olarak ilk
 * seviyede gösterilmiyor (daha fazla filtre = daha iyi değil).
 */
type Filters = {
  expertise: string[];
  skills: string[];
  experience: string[];
  availabilityStatus: string[];
  workTypes: string[];
  rateMin: string;
  rateMax: string;
};

const EMPTY_FILTERS: Filters = {
  expertise: [],
  skills: [],
  experience: [],
  availabilityStatus: [],
  workTypes: [],
  rateMin: "",
  rateMax: "",
};

type FilterKey = "expertise" | "skills" | "experience" | "rate" | "availability" | "workType";

type ComparisonRow = {
  id: string;
  name: string;
  title: string | null;
  expertise: string | null;
  skills: string[];
  experience: string | null;
  hourlyRate: number | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  availabilityStatus: string | null;
  profileCompletion: number | null;
  proposalsSent: number;
  acceptanceRate: number | null;
};

function formatRate(row: ComparisonRow) {
  if (row.hourlyRate) {
    return `₺${row.hourlyRate}/sa`;
  }

  if (row.hourlyRateMin && row.hourlyRateMax) {
    return `₺${row.hourlyRateMin}–₺${row.hourlyRateMax}/sa`;
  }

  return "Belirtilmemiş";
}

/** `%`, `,`, `{`, `}`, `(`, `)` PostgREST'in .ilike()/.or()/dizi literal
 * sözdizimini bozabileceği için arama teriminden temizlenir. */
function sanitizeSearchTerm(value: string) {
  return value.replace(/[%,{}()]/g, "").trim();
}

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export default function ClientFreelancersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const [sort, setSort] = useState<SortOption>("recommended");

  const [expertiseOptions, setExpertiseOptions] = useState<string[]>([]);

  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonRow[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

  /* Arama debounce — her tuş vuruşunda query atmamak için 350ms bekletilir. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(sanitizeSearchTerm(searchInput));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  /* Açık dropdown'ın dışına tıklanınca kapat. */
  useEffect(() => {
    if (!openFilter) return;

    function handleClickOutside(event: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openFilter]);

  /*
   * Uzmanlık facet seçenekleri — sadece TEK kolon çekilen, hafif ve bir
   * kere çalışan bir sorgu. Listing sorgusundan tamamen ayrı: binlerce
   * satırlık tam kart verisini değil, sadece bu tek kolonu getirir.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadFacets() {
      const { data, error: facetError } = await supabase
        .from("profiles")
        .select("expertise")
        .eq("role", "freelancer")
        .not("expertise", "is", null)
        .limit(5000);

      if (cancelled || facetError) return;

      const values = (data ?? [])
        .map((row) => row.expertise?.trim())
        .filter((value): value is string => Boolean(value));

      setExpertiseOptions(
        Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "tr"))
      );
    }

    void loadFacets();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  /*
   * Ana listing sorgusu — search/filters/sort değiştiğinde baştan
   * (page 0) yüklenir. Tüm filtreler Supabase query seviyesinde
   * uygulanır; hiçbir zaman "tüm freelancerları çekip JS'te filtrele"
   * yapılmaz.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadFreelancers() {
      setLoading(true);
      setError("");

      const query = buildQuery();
      const { data, error: loadError, count } = await query.range(0, PAGE_SIZE - 1);

      if (cancelled) return;

      if (loadError) {
        console.error("Freelancerlar yüklenirken hata:", loadError);
        setError(
          "Freelancer profilleri yüklenemedi. Yetkilendirme ayarlarını kontrol edin."
        );
        setFreelancers([]);
        setTotalCount(0);
      } else {
        setFreelancers(normalizeRows(data));
        setTotalCount(count ?? 0);
      }

      setLoading(false);
    }

    void loadFreelancers();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, search, filters, sort]);

  function normalizeRows(data: unknown[] | null): Freelancer[] {
    return ((data ?? []) as Freelancer[]).map((row) => ({
      ...row,
      hourly_rate:
        typeof row.hourly_rate === "number"
          ? row.hourly_rate
          : row.hourly_rate
            ? Number(row.hourly_rate)
            : null,
    }));
  }

  function buildQuery() {
    let query = supabase
      .from("profiles")
      .select(LIST_SELECT, { count: "exact" })
      .eq("role", "freelancer");

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,title.ilike.%${search}%,expertise.ilike.%${search}%,skills.cs.{${search}}`
      );
    }

    if (filters.expertise.length > 0) {
      query = query.in("expertise", filters.expertise);
    }

    if (filters.skills.length > 0) {
      query = query.overlaps("skills", filters.skills);
    }

    if (filters.experience.length > 0) {
      query = query.in("experience", filters.experience);
    }

    if (filters.availabilityStatus.length > 0) {
      query = query.in("availability_status", filters.availabilityStatus);
    }

    if (filters.workTypes.length > 0) {
      query = query.overlaps("work_types", filters.workTypes);
    }

    const rateMin = Number(filters.rateMin);
    if (filters.rateMin && Number.isFinite(rateMin)) {
      query = query.gte("hourly_rate", rateMin);
    }

    const rateMax = Number(filters.rateMax);
    if (filters.rateMax && Number.isFinite(rateMax)) {
      query = query.lte("hourly_rate", rateMax);
    }

    switch (sort) {
      case "rate_asc":
        query = query.order("hourly_rate", { ascending: true, nullsFirst: false });
        break;
      case "rate_desc":
        query = query.order("hourly_rate", { ascending: false, nullsFirst: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      default:
        /*
         * "Önerilen" — subjektif bir "en iyi freelancer" skoru
         * uydurulmadı. Bu, app/freelancers/freelancers/page.tsx'in
         * (referans ekran) ZATEN kullandığı gerçek, sistemde var olan
         * varsayılan sıralamayla birebir aynı: profile_completion.
         */
        query = query.order("profile_completion", {
          ascending: false,
          nullsFirst: false,
        });
    }

    return query;
  }

  async function loadMore() {
    if (loadingMore || freelancers.length >= totalCount) return;

    setLoadingMore(true);

    const from = freelancers.length;
    const query = buildQuery();
    const { data, error: loadError } = await query.range(from, from + PAGE_SIZE - 1);

    if (loadError) {
      console.error("Daha fazla freelancer yüklenirken hata:", loadError);
      setError("Freelancerlar yüklenirken bir hata oluştu.");
    } else {
      setFreelancers((current) => [...current, ...normalizeRows(data)]);
    }

    setLoadingMore(false);
  }

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearAllFilters() {
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setSearch("");
  }

  const activeFilterCount =
    filters.expertise.length +
    filters.skills.length +
    filters.experience.length +
    filters.availabilityStatus.length +
    filters.workTypes.length +
    (filters.rateMin ? 1 : 0) +
    (filters.rateMax ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0 || search.length > 0;

  function toggleSelected(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 4
          ? [...current, id]
          : current
    );
  }

  async function runComparison() {
    if (selected.length < 2) {
      return;
    }

    setComparing(true);
    setCompareError("");
    setComparison(null);

    try {
      const res = await fetch("/api/premium/client/freelancer-comparison", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          freelancerIds: selected,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCompareError(data?.error || "Karşılaştırma yapılamadı.");
        return;
      }

      setComparison(data.comparison ?? []);
    } catch (err) {
      console.error(err);
      setCompareError("Karşılaştırma sırasında bir hata oluştu.");
    } finally {
      setComparing(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.01em] text-neutral-900">
              Freelancerlar
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Projeniz için uygun uzmanları keşfedin.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setCompareMode((current) => !current);
              setSelected([]);
              setComparison(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
          >
            <Scale size={15} />
            {compareMode ? "Karşılaştırmayı Kapat" : "Karşılaştır"}
          </button>
        </header>

        {/* SEARCH */}
        <div className="relative mb-3">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
          />

          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Freelancer, skill veya uzmanlık ara..."
            className="h-11 w-full rounded-lg border border-neutral-200 bg-white pl-11 pr-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[var(--color-primary-600)]"
          />
        </div>

        {/* FILTERS + SORT (compact dropdown toolbar) */}
        <div ref={toolbarRef} className="mb-4 flex flex-wrap items-center gap-2">
          <FilterDropdown
            label="Uzmanlık"
            count={filters.expertise.length}
            isOpen={openFilter === "expertise"}
            onToggle={() => setOpenFilter((k) => (k === "expertise" ? null : "expertise"))}
          >
            <OptionList
              options={expertiseOptions}
              selected={filters.expertise}
              onToggle={(value) => setFilter("expertise", toggleInArray(filters.expertise, value))}
            />
          </FilterDropdown>

          <FilterDropdown
            label="Skill"
            count={filters.skills.length}
            isOpen={openFilter === "skills"}
            onToggle={() => setOpenFilter((k) => (k === "skills" ? null : "skills"))}
          >
            <OptionList
              options={SKILLS}
              selected={filters.skills}
              onToggle={(value) => setFilter("skills", toggleInArray(filters.skills, value))}
            />
          </FilterDropdown>

          <FilterDropdown
            label="Deneyim"
            count={filters.experience.length}
            isOpen={openFilter === "experience"}
            onToggle={() => setOpenFilter((k) => (k === "experience" ? null : "experience"))}
          >
            <OptionList
              options={EXPERIENCE_OPTIONS}
              selected={filters.experience}
              onToggle={(value) =>
                setFilter("experience", toggleInArray(filters.experience, value))
              }
            />
          </FilterDropdown>

          <FilterDropdown
            label="Ücret"
            count={(filters.rateMin ? 1 : 0) + (filters.rateMax ? 1 : 0)}
            isOpen={openFilter === "rate"}
            onToggle={() => setOpenFilter((k) => (k === "rate" ? null : "rate"))}
          >
            <div className="flex items-center gap-2 p-1">
              <input
                type="number"
                min={0}
                value={filters.rateMin}
                onChange={(event) => setFilter("rateMin", event.target.value)}
                placeholder="Min ₺"
                className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-600)]"
              />
              <span className="text-neutral-400">–</span>
              <input
                type="number"
                min={0}
                value={filters.rateMax}
                onChange={(event) => setFilter("rateMax", event.target.value)}
                placeholder="Maks ₺"
                className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-600)]"
              />
            </div>
          </FilterDropdown>

          <FilterDropdown
            label="Uygunluk"
            count={filters.availabilityStatus.length}
            isOpen={openFilter === "availability"}
            onToggle={() => setOpenFilter((k) => (k === "availability" ? null : "availability"))}
          >
            <OptionList
              options={AVAILABILITY_STATUS_OPTIONS.map((option) => option.label)}
              selected={filters.availabilityStatus.map(
                (value) =>
                  AVAILABILITY_STATUS_OPTIONS.find((option) => option.value === value)?.label ??
                  value
              )}
              onToggle={(label) => {
                const value =
                  AVAILABILITY_STATUS_OPTIONS.find((option) => option.label === label)?.value ??
                  label;
                setFilter("availabilityStatus", toggleInArray(filters.availabilityStatus, value));
              }}
            />
          </FilterDropdown>

          <FilterDropdown
            label="Çalışma Şekli"
            count={filters.workTypes.length}
            isOpen={openFilter === "workType"}
            onToggle={() => setOpenFilter((k) => (k === "workType" ? null : "workType"))}
          >
            <OptionList
              options={WORK_TYPE_OPTIONS}
              selected={filters.workTypes}
              onToggle={(value) => setFilter("workTypes", toggleInArray(filters.workTypes, value))}
            />
          </FilterDropdown>

          <div className="relative">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="h-10 appearance-none rounded-lg border border-neutral-200 bg-white py-0 pl-3 pr-9 text-sm text-neutral-700 outline-none transition focus:border-[var(--color-primary-600)]"
            >
              {(Object.keys(SORT_LABEL) as SortOption[]).map((option) => (
                <option key={option} value={option}>
                  {SORT_LABEL[option]}
                </option>
              ))}
            </select>

            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
            >
              Tümünü temizle
            </button>
          )}
        </div>

        {/* ACTIVE FILTER CHIPS */}
        {hasActiveFilters && (
          <div className="mb-5 flex flex-wrap gap-2">
            {search && (
              <FilterChip
                label={`"${search}"`}
                onRemove={() => {
                  setSearchInput("");
                  setSearch("");
                }}
              />
            )}

            {filters.expertise.map((value) => (
              <FilterChip
                key={`expertise-${value}`}
                label={value}
                onRemove={() =>
                  setFilter("expertise", filters.expertise.filter((v) => v !== value))
                }
              />
            ))}

            {filters.skills.map((value) => (
              <FilterChip
                key={`skill-${value}`}
                label={value}
                onRemove={() => setFilter("skills", filters.skills.filter((v) => v !== value))}
              />
            ))}

            {filters.experience.map((value) => (
              <FilterChip
                key={`experience-${value}`}
                label={value}
                onRemove={() =>
                  setFilter("experience", filters.experience.filter((v) => v !== value))
                }
              />
            ))}

            {filters.availabilityStatus.map((value) => (
              <FilterChip
                key={`availability-${value}`}
                label={
                  AVAILABILITY_STATUS_OPTIONS.find((option) => option.value === value)?.label ??
                  value
                }
                onRemove={() =>
                  setFilter(
                    "availabilityStatus",
                    filters.availabilityStatus.filter((v) => v !== value)
                  )
                }
              />
            ))}

            {filters.workTypes.map((value) => (
              <FilterChip
                key={`worktype-${value}`}
                label={value}
                onRemove={() =>
                  setFilter("workTypes", filters.workTypes.filter((v) => v !== value))
                }
              />
            ))}

            {(filters.rateMin || filters.rateMax) && (
              <FilterChip
                label={`₺${filters.rateMin || "0"}–₺${filters.rateMax || "∞"}/sa`}
                onRemove={() => {
                  setFilter("rateMin", "");
                  setFilter("rateMax", "");
                }}
              />
            )}
          </div>
        )}

        {/* RESULT COUNT */}
        {!loading && !error && (
          <p className="mb-5 text-sm text-neutral-500">{totalCount} freelancer bulundu</p>
        )}

        {/* COMPARISON */}
        {compareMode && (
          <div className="mb-8">
            <PremiumGate
              feature="freelancer_comparison"
              title="Freelancer Comparison"
              description="Seçtiğin freelancer'ları beceri, deneyim, saatlik ücret ve kabul oranı bazında yan yana karşılaştır."
              dismissible
            >
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <p className="text-sm text-neutral-600">
                  Karşılaştırmak için 2-4 freelancer seç ({selected.length}/4 seçili).
                </p>

                {compareError && (
                  <p className="mt-2 text-sm text-red-600">{compareError}</p>
                )}

                <button
                  type="button"
                  onClick={() => void runComparison()}
                  disabled={selected.length < 2 || comparing}
                  className="mt-3 rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {comparing ? "Karşılaştırılıyor..." : "Karşılaştır"}
                </button>

                {comparison && comparison.length > 0 && (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
                          <th className="pb-2 pr-4">Freelancer</th>
                          <th className="pb-2 pr-4">Deneyim</th>
                          <th className="pb-2 pr-4">Saatlik ücret</th>
                          <th className="pb-2 pr-4">Müsaitlik</th>
                          <th className="pb-2 pr-4">Profil</th>
                          <th className="pb-2">Kabul oranı</th>
                        </tr>
                      </thead>

                      <tbody>
                        {comparison.map((row) => (
                          <tr key={row.id} className="border-b border-neutral-50">
                            <td className="py-2.5 pr-4 font-medium text-neutral-900">
                              {row.name}
                            </td>

                            <td className="py-2.5 pr-4 text-neutral-600">
                              {row.experience || "—"}
                            </td>

                            <td className="py-2.5 pr-4 text-neutral-600">
                              {formatRate(row)}
                            </td>

                            <td className="py-2.5 pr-4 text-neutral-600">
                              {row.availabilityStatus ?? "—"}
                            </td>

                            <td className="py-2.5 pr-4 text-neutral-600">
                              %{row.profileCompletion ?? 0}
                            </td>

                            <td className="py-2.5 text-neutral-600">
                              {row.acceptanceRate !== null
                                ? `%${Math.round(row.acceptanceRate * 100)}`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </PremiumGate>
          </div>
        )}

        {/* CONTENT */}
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-neutral-500">
            <Loader2 size={18} className="animate-spin" />
            Freelancerlar yükleniyor...
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : freelancers.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
            <Users className="mx-auto text-neutral-400" />

            <h2 className="mt-4 text-lg font-semibold text-neutral-900">
              Freelancer bulunamadı
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Arama veya filtre kriterlerini değiştirerek tekrar deneyin.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {freelancers.map((freelancer) => {
                const isSelected = selected.includes(freelancer.id);

                return (
                  <div key={freelancer.id} className="relative">
                    {/* COMPARISON SELECT */}
                    {compareMode && (
                      <button
                        type="button"
                        onClick={() => toggleSelected(freelancer.id)}
                        className={`absolute right-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-white transition ${
                          isSelected
                            ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)]"
                            : "border-neutral-300 bg-white"
                        }`}
                        aria-label={isSelected ? "Seçimi kaldır" : "Karşılaştırmaya ekle"}
                      >
                        {isSelected && <X size={13} />}
                      </button>
                    )}

                    <FreelancerCard
                      freelancer={freelancer}
                      viewerRole="client"
                      className={isSelected ? "border-[var(--color-primary-600)]" : ""}
                    />
                  </div>
                );
              })}
            </div>

            {/* LOAD MORE */}
            {freelancers.length < totalCount && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore && <Loader2 size={15} className="animate-spin" />}
                  {loadingMore
                    ? "Yükleniyor..."
                    : `Daha fazla yükle (${freelancers.length}/${totalCount})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-50)] py-1.5 pl-3 pr-2 text-xs font-medium text-[var(--color-primary-700)]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-[var(--color-primary-600)] transition hover:bg-white/60"
        aria-label={`${label} filtresini kaldır`}
      >
        <X size={12} />
      </button>
    </span>
  );
}

/**
 * Kompakt filtre dropdown butonu — spec'in istediği
 * "[ Uzmanlık ] [ Skill ] [ Deneyim ] [ Ücret ] [ Uygunluk ] [ Çalışma Şekli ]"
 * toolbar yapısı. Her biri kendi küçük panelini (checkbox listesi ya da
 * range input) açar; tüm sayfayı kaplayan bir drawer DEĞİLDİR.
 */
function FilterDropdown({
  label,
  count,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const active = count > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
          active
            ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
        }`}
      >
        {label}
        {active && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary-600)] px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
        <ChevronDown size={14} className={isOpen ? "rotate-180 transition" : "transition"} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

function OptionList({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) {
    return <p className="p-1 text-sm text-neutral-400">Henüz seçenek yok.</p>;
  }

  return (
    <div className="max-h-56 space-y-0.5 overflow-y-auto">
      {options.map((option) => {
        const isSelected = selected.includes(option);

        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                isSelected
                  ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)]"
                  : "border-neutral-300"
              }`}
            >
              {isSelected && <Check size={11} className="text-white" />}
            </span>
            <span className="truncate">{option}</span>
          </button>
        );
      })}
    </div>
  );
}
