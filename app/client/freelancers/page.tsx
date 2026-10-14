"use client";

import Image from "next/image";
import { Pagination } from "@/components/ui/Pagination";
import { useProjectDiscoveryContext } from "@/components/client/useProjectDiscoveryContext";
import { ProjectMatchContext } from "@/components/client/ProjectMatchContext";
import { rankProjectResults } from "@/components/client/projectDiscoveryPresentation";
import { Input } from "@/components/ui/Input";
import { Button,buttonClasses } from "@/components/ui/Button";
import {DiscoveryHero} from "@/components/discovery/DiscoveryHero";
import {DiscoveryToolbar} from "@/components/discovery/DiscoveryToolbar";
import discoveryStyles from "@/components/discovery/Discovery.module.css";
import {panelRootClass} from "@/components/dashboard/PanelPrimitives";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Users,
  Scale,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PremiumGate from "@/components/premium/PremiumGate";
import { SKILLS } from "@/lib/constants/skills";
import { CATEGORIES } from "@/lib/categories";
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

type SortOption = "match" | "recommended" | "rate_asc" | "rate_desc" | "newest";

const SORT_LABEL: Record<SortOption, string> = {
  match: "En uygun · proje önerileri",
  recommended: "Önerilen",
  rate_asc: "Ücret: düşük → yüksek",
  rate_desc: "Ücret: yüksek → düşük",
  newest: "Yeni profiller",
};

const PAGE_SIZE = 20;

const LIST_SELECT =
  "id, first_name, avatar_url, title, bio, expertise, project_types, skills, experience, city, hourly_rate, availability_status";

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
  project_types: string[] | null;
  skills: string[] | null;
  experience: string | null;
  city: string | null;
  hourly_rate: number | null;
  availability_status: string | null;
};

/*
 * Sadece 6 ANA filtre: Kategori, Skill, Deneyim, Ücret, Uygunluk, Çalışma
 * Şekli. Language/City gibi ikincil kriterler bilinçli olarak ilk
 * seviyede gösterilmiyor (daha fazla filtre = daha iyi değil).
 *
 * "Kategori" filtresi profiles.project_types (freelancer'ın kayıt
 * sırasında seçtiği merkezi kategori) üzerinden çalışır — profiles.expertise
 * DEĞİL. expertise, serbest uzmanlık/özgeçmiş metni olarak arama
 * kutusunda taranır ama bir sınıflandırma/filtre değildir (bkz.
 * lib/categories.ts).
 */
type Filters = {
  category: string[];
  skills: string[];
  experience: string[];
  availabilityStatus: string[];
  workTypes: string[];
  rateMin: string;
  rateMax: string;
};

const EMPTY_FILTERS: Filters = {
  category: [],
  skills: [],
  experience: [],
  availabilityStatus: [],
  workTypes: [],
  rateMin: "",
  rateMax: "",
};

type FilterKey = "category" | "skills" | "experience" | "rate" | "availability" | "workType";

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
  const [page,setPage]=useState(1);
  const [showFilters,setShowFilters]=useState(false);
  const context=useProjectDiscoveryContext();
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const [sort, setSort] = useState<SortOption>("recommended");
  const matchingSet=sort==="match" ? context.matches : null;

  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonRow[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

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
      // `last_name` artık genel SELECT grant'inden çıkarıldı (bkz.
      // 202609300012_surname_privacy.sql); filtrede referans vermek de
      // SELECT ayrıcalığı gerektirdiğinden soyisimle arama kaldırıldı —
      // bu zaten soyismin ifşa edilmemesi hedefiyle tutarlı.
      query = query.or(
        `first_name.ilike.%${search}%,title.ilike.%${search}%,expertise.ilike.%${search}%,skills.cs.{${search}}`
      );
    }

    if (filters.category.length > 0) {
      query = query.overlaps("project_types", filters.category);
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


  /* Arama debounce — her tuş vuruşunda query atmamak için 350ms bekletilir. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);setSearch(sanitizeSearchTerm(searchInput));
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
      const ids=Object.keys(context.matches);
      const {data,error:loadError,count}=sort==="match" ? (ids.length ? await query.in("id",ids).range(0,ids.length-1) : {data:[],error:null,count:0}) : await query.range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);

      if (cancelled) return;

      if (loadError) {
        console.error("Freelancerlar yüklenirken hata:", loadError);
        setError(
          "Freelancer profilleri yüklenemedi. Yetkilendirme ayarlarını kontrol edin."
        );
        setFreelancers([]);
        setTotalCount(0);
      } else {
        const rows=normalizeRows(data);
        setFreelancers(sort==="match" ? rankProjectResults(rows,context.matches).slice((page-1)*PAGE_SIZE,page*PAGE_SIZE) : rows);
        const lastPage=Math.max(1,Math.ceil((count??0)/PAGE_SIZE));if(page>lastPage)setPage(lastPage);
        setTotalCount(count ?? 0);
      }

      setLoading(false);
    }

    void loadFreelancers();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, search, filters, sort, page, context.projectId, matchingSet]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setPage(1);setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearAllFilters() {
    setPage(1);setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setSearch("");
  }

  const activeFilterCount =
    filters.category.length +
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
    <div className={[panelRootClass,discoveryStyles.page].join(" ")}>
      <div className="w-full">
        {/* HEADER */}
        <DiscoveryHero title="Projelerine uygun freelancerları keşfet" description="Proje gereksinimlerine, rollere ve uzmanlık bilgilerine uygun kişileri keşfet." illustration={<Image src="/images/mascots/client-discovery-search.png" alt="" width={240} height={240} sizes="(max-width: 639px) 80px, (max-width: 1023px) 190px, 240px" loading="eager" className={discoveryStyles.mascot} />} note={null} />

        <ProjectMatchContext projects={context.projects} projectId={context.projectId} onChange={id=>{setPage(1);context.setProjectId(id);}} loadingProjects={context.loadingProjects} projectError={context.projectError} loadingMatches={context.loadingMatches} matchError={context.matchError} onRetry={context.retryMatches} />

        <DiscoveryToolbar label="Freelancer arama ve filtreleme">
          <div className={discoveryStyles.toolbarRow}>        {/* SEARCH */}
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />

          <Input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="Freelancer, uzmanlık veya yetenek ara"
            placeholder="Freelancer, uzmanlık veya yetenek ara..."
            className="h-[var(--input-height)] w-full rounded-[var(--radius-input)] border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] pl-9 pr-3 focus:bg-white"
          />
        </div>

<div className="flex flex-wrap gap-2">          <div className="relative">
            <select
              aria-label="Freelancerları sırala"
              value={sort}
              onChange={(event) => {setPage(1);setSort(event.target.value as SortOption);}}
              className="h-[var(--input-height)] appearance-none rounded-[var(--radius-select)] border border-[var(--color-border-subtle)] bg-white py-0 pl-3 pr-9 text-sm text-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-primary-600)]"
            >
              {(Object.keys(SORT_LABEL) as SortOption[]).filter(option=>option!=="match"||Boolean(context.projectId)).map((option) => (
                <option key={option} value={option}>
                  {SORT_LABEL[option]}
                </option>
              ))}
            </select>

            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
          </div>
<Button variant={showFilters||hasActiveFilters?"primary":"secondary"} aria-expanded={showFilters} aria-controls="client-discovery-filters" onClick={()=>{setShowFilters(value=>!value);setOpenFilter(null);}}><SlidersHorizontal size={16}/>Filtreler{activeFilterCount>0&&<span>{activeFilterCount}</span>}</Button>          <button
            type="button"
            onClick={() => {
              setCompareMode((current) => !current);
              setSelected([]);
              setComparison(null);
            }}
            className={buttonClasses({variant:"secondary"})}
          >
            <Scale size={15} />
            {compareMode ? "Karşılaştırmayı Kapat" : "Karşılaştır"}
          </button></div>
          </div>
          {showFilters && <>        {/* FILTERS + SORT (compact dropdown toolbar) */}
        <div ref={toolbarRef} id="client-discovery-filters" className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-border-subtle)] pt-4">
          <FilterDropdown
            label="Kategori"
            count={filters.category.length}
            isOpen={openFilter === "category"}
            onToggle={() => setOpenFilter((k) => (k === "category" ? null : "category"))}
          >
            <OptionList
              options={CATEGORIES}
              selected={filters.category}
              onToggle={(value) => setFilter("category", toggleInArray(filters.category, value))}
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
              <Input
                type="number"
                min={0}
                value={filters.rateMin}
                onChange={(event) => setFilter("rateMin", event.target.value)}
                placeholder="Min ₺"
                className="w-24 rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-600)]"
              />
              <span className="text-[var(--color-text-muted)]">–</span>
              <Input
                type="number"
                min={0}
                value={filters.rateMax}
                onChange={(event) => setFilter("rateMax", event.target.value)}
                placeholder="Maks ₺"
                className="w-24 rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-600)]"
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


          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              Tümünü temizle
            </button>
          )}
        </div>

</>}
        </DiscoveryToolbar>

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

            {filters.category.map((value) => (
              <FilterChip
                key={`category-${value}`}
                label={value}
                onRemove={() =>
                  setFilter("category", filters.category.filter((v) => v !== value))
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
          <p className="mb-5 text-sm text-[var(--color-text-secondary)]">{totalCount} {sort==="match"?"doğrulanmış proje önerisi":"freelancer"} bulundu</p>
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
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-5">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Karşılaştırmak için 2-4 freelancer seç ({selected.length}/4 seçili).
                </p>

                {compareError && (
                  <p className="mt-2 text-sm text-[var(--color-error-600)]">{compareError}</p>
                )}

                <button
                  type="button"
                  onClick={() => void runComparison()}
                  disabled={selected.length < 2 || comparing}
                  className={buttonClasses({variant:"primary"})}
                >
                  {comparing ? "Karşılaştırılıyor..." : "Karşılaştır"}
                </button>

                {comparison && comparison.length > 0 && (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border-subtle)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
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
                            <td className="py-2.5 pr-4 font-medium text-[var(--color-text-primary)]">
                              {row.name}
                            </td>

                            <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">
                              {row.experience || "—"}
                            </td>

                            <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">
                              {formatRate(row)}
                            </td>

                            <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">
                              {row.availabilityStatus ?? "—"}
                            </td>

                            <td className="py-2.5 pr-4 text-[var(--color-text-secondary)]">
                              %{row.profileCompletion ?? 0}
                            </td>

                            <td className="py-2.5 text-[var(--color-text-secondary)]">
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
        {loading || (sort==="match"&&context.loadingMatches) ? (
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Loader2 size={18} className="animate-spin" />
            Freelancerlar yükleniyor...
          </div>
        ) : error ? (
          <p className="rounded-lg bg-[var(--color-error-50)] p-4 text-sm text-[var(--color-error-600)]">{error}</p>
        ) : freelancers.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-10 text-center">
            <Users className="mx-auto text-[var(--color-text-muted)]" />

            <h2 className="mt-4 cc-h2 font-semibold text-[var(--color-text-primary)]">
              {sort==="match"?"Bu filtrelerle doğrulanmış proje önerisi yok":"Freelancer bulunamadı"}
            </h2>

            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
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
                      matchScore={context.matches[freelancer.id]?.score}
                      matchContext={context.matches[freelancer.id] ? context.matches[freelancer.id].projectTitle+" · "+context.matches[freelancer.id].role : undefined}
                      matchReason={context.matches[freelancer.id]?.reason}
                      className={isSelected ? "border-[var(--color-primary-600)]" : ""}
                    />
                  </div>
                );
              })}
            </div>

            <Pagination page={page} totalPages={Math.ceil(totalCount/PAGE_SIZE)} label="Freelancer sonuç sayfaları" onChange={next=>{setPage(next);document.querySelector<HTMLElement>("[data-app-viewport]")?.scrollTo({top:0});}} />
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
 * "[ Kategori ] [ Skill ] [ Deneyim ] [ Ücret ] [ Uygunluk ] [ Çalışma Şekli ]"
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
            : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:border-neutral-400"
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
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-3 shadow-lg">
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
    return <p className="p-1 text-sm text-[var(--color-text-muted)]">Henüz seçenek yok.</p>;
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
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)]"
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
