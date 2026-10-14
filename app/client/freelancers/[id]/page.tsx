"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import InviteFreelancerPanel from "@/components/client/InviteFreelancerPanel";
import RatingSummary from "@/components/shared/RatingSummary";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Languages,
  Loader2,
  MapPin,
  UserRound,
  Wrench,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { publicDisplayName } from "@/lib/utils/displayName";

type Freelancer = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  expertise: string | null;
  skills: string[] | null;
  city: string | null;
  experience: string | null;
  hourly_rate: number | null;
  availability: string | null;
  availability_status: string | null;
  work_types: string[] | null;
  languages: string[] | null;
};

type PortfolioItem = {
  id: string;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  url?: string | null;
  link?: string | null;
  category?: string | null;
};

type Experience = {
  id: string;
  title?: string | null;
  company?: string | null;
  company_name?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
};

const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Müsait",
  limited: "Kısmen müsait",
  unavailable: "Müsait değil",
};

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter(Boolean);
      }
    } catch {
      // Normal metin olarak devam et.
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("tr-TR", {
    month: "short",
    year: "numeric",
  });
}

export default function ClientFreelancerDetailPage() {
  const params = useParams();

  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : null;

  const supabase = useMemo(() => createClient(), []);

  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [activeProjectCount, setActiveProjectCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFreelancer() {
      if (!id) {
        setError("Freelancer ID bulunamadı.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        /*
         * CLIENT TARAFINDA GÖSTERİLEBİLECEK PROFİL ALANLARI
         *
         * phone özellikle burada çekilmiyor.
         */
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, first_name, avatar_url, title, bio, expertise, skills, city, experience, hourly_rate, availability, availability_status, work_types, languages, role"
          )
          .eq("id", id)
          .eq("role", "freelancer")
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          console.error(
            "Freelancer profili yüklenirken Supabase hatası:",
            profileError
          );

          setError(
            profileError.message ||
              "Freelancer profili yüklenemedi."
          );

          setLoading(false);
          return;
        }

        if (!data) {
          setError("Bu freelancer profili bulunamadı.");
          setLoading(false);
          return;
        }

        const freelancerData: Freelancer = {
          id: data.id,
          first_name: data.first_name ?? null,
          avatar_url: data.avatar_url ?? null,
          title: data.title ?? null,
          bio: data.bio ?? null,
          expertise: data.expertise ?? null,
          skills: normalizeStringArray(data.skills),
          city: data.city ?? null,
          experience: data.experience ?? null,
          hourly_rate:
            typeof data.hourly_rate === "number"
              ? data.hourly_rate
              : data.hourly_rate
                ? Number(data.hourly_rate)
                : null,
          availability: data.availability ?? null,
          availability_status:
            data.availability_status ?? null,
          work_types: normalizeStringArray(data.work_types),
          languages: normalizeStringArray(data.languages),
        };

        setFreelancer(freelancerData);

        /*
         * PORTFOLIO
         *
         * Client tarafında sadece görüntüleme yapıyoruz.
         */
        const portfolioResult = await supabase
          .from("portfolio_items")
          .select("*")
          .eq("freelancer_id", data.id)
          .order("created_at", { ascending: false });

        if (!cancelled && !portfolioResult.error) {
          setPortfolio(
            (portfolioResult.data ?? []) as PortfolioItem[]
          );
        }

        /*
         * EXPERIENCE
         */
        const experienceResult = await supabase
          .from("experiences")
          .select("*")
          .eq("freelancer_id", data.id)
          .order("start_date", { ascending: false });

        if (!cancelled && !experienceResult.error) {
          setExperiences(
            (experienceResult.data ?? []) as Experience[]
          );
        }

        /*
         * Aktif projeler:
         *
         * project_team_members.status = active
         * projects.status = in_progress
         */
        const { count } = await supabase
          .from("project_team_members")
          .select("project_id, projects!inner(status)", {
            count: "exact",
            head: true,
          })
          .eq("freelancer_id", data.id)
          .eq("status", "active")
          .eq("projects.status", "in_progress");

        if (!cancelled) {
          setActiveProjectCount(count ?? 0);
          setLoading(false);
        }
      } catch (err) {
        console.error("Beklenmeyen freelancer profil hatası:", err);

        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Profil yüklenirken beklenmeyen bir hata oluştu."
        );

        setLoading(false);
      }
    }

    void loadFreelancer();

    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <Loader2 size={18} className="animate-spin" />
          Profil yükleniyor...
        </div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="w-full">
        <div className="w-full">
          <Link
            href="/client/freelancers"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft size={16} />
            Freelancer Keşfet’e dön
          </Link>

          <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-error-600)]/20 bg-[var(--color-error-50)] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-[var(--color-error-600)]">
                <UserRound size={18} />
              </div>

              <div>
                <h1 className="font-semibold text-red-900">
                  Freelancer profili bulunamadı
                </h1>

                <p className="mt-1 text-sm leading-6 text-[var(--color-error-600)]">
                  {error || "Profil bilgileri alınamadı."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const name = publicDisplayName(freelancer, "Freelancer");

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const skills = freelancer.skills ?? [];
  const workTypes = freelancer.work_types ?? [];
  const languages = freelancer.languages ?? [];

  const availabilityLabel =
    AVAILABILITY_LABEL[
      freelancer.availability_status ?? ""
    ] ?? "Müsaitlik belirtilmemiş";

  return (
    <div className="w-full">
      <div className="w-full">
        {/* BACK */}
        <Link
          href="/client/freelancers"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft size={16} />
          Freelancer Keşfet’e dön
        </Link>

        {/* PROFILE */}
        <main className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white shadow-sm">
          {/* HEADER */}
          <section className="border-b border-[var(--color-border-subtle)] p-7 md:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {freelancer.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={freelancer.avatar_url}
                  alt={name}
                  className="h-24 w-24 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-2xl font-semibold text-[var(--color-text-secondary)]">
                  {initials || "F"}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h1 className="cc-page-title font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
                  {name}
                </h1>

                <p className="mt-1 text-base text-[var(--color-text-secondary)]">
                  {freelancer.title ||
                    freelancer.expertise ||
                    "Freelancer"}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {freelancer.city && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                      <MapPin size={13} />
                      {freelancer.city}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                    <CheckCircle2 size={13} />
                    {availabilityLabel}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                    <BriefcaseBusiness size={13} />
                    {activeProjectCount} aktif proje
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="p-7 md:p-8">
            <InviteFreelancerPanel freelancerId={freelancer.id} />
            <RatingSummary userId={freelancer.id} className="mb-6" />

            {/* ABOUT */}
            <section>
              <h2 className="cc-h2 font-semibold text-[var(--color-text-primary)]">
                Hakkımda
              </h2>

              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--color-text-secondary)]">
                {freelancer.bio ||
                  "Bu freelancer henüz kendisi hakkında bilgi eklememiş."}
              </p>
            </section>

            {/* INFO GRID */}
            <section className="mt-8 grid gap-6 border-t border-[var(--color-border-subtle)] pt-7 md:grid-cols-2">
              <Info
                icon={<Wrench size={17} />}
                title="Uzmanlık alanı"
              >
                {freelancer.expertise ||
                  freelancer.title ||
                  "Henüz belirtilmemiş."}
              </Info>

              <Info
                icon={<Clock3 size={17} />}
                title="Deneyim"
              >
                {freelancer.experience ||
                  "Deneyim bilgisi henüz belirtilmemiş."}
              </Info>

              <Info
                icon={<CalendarDays size={17} />}
                title="Müsaitlik"
              >
                {freelancer.availability ||
                  availabilityLabel ||
                  "Henüz belirtilmemiş."}
              </Info>

              {freelancer.hourly_rate !== null && (
                <Info
                  icon={<BriefcaseBusiness size={17} />}
                  title="Saatlik ücret"
                >
                  ₺{freelancer.hourly_rate.toLocaleString("tr-TR")} / saat
                </Info>
              )}
            </section>

            {/* SKILLS */}
            <section className="mt-8 border-t border-[var(--color-border-subtle)] pt-7">
              <h2 className="flex items-center gap-2 cc-h2 font-semibold text-[var(--color-text-primary)]">
                <Wrench size={18} />
                Yetenekler
              </h2>

              {skills.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  Henüz yetenek eklenmemiş.
                </p>
              )}
            </section>

            {/* WORK TYPES */}
            {workTypes.length > 0 && (
              <section className="mt-8 border-t border-[var(--color-border-subtle)] pt-7">
                <h2 className="cc-h2 font-semibold text-[var(--color-text-primary)]">
                  Çalışma türleri
                </h2>

                <div className="mt-4 flex flex-wrap gap-2">
                  {workTypes.map((type, index) => (
                    <span
                      key={`${type}-${index}`}
                      className="rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)]"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* LANGUAGES */}
            {languages.length > 0 && (
              <section className="mt-8 border-t border-[var(--color-border-subtle)] pt-7">
                <h2 className="flex items-center gap-2 cc-h2 font-semibold text-[var(--color-text-primary)]">
                  <Languages size={18} />
                  Diller
                </h2>

                <div className="mt-4 flex flex-wrap gap-2">
                  {languages.map((language, index) => (
                    <span
                      key={`${language}-${index}`}
                      className="rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)]"
                    >
                      {language}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* PORTFOLIO */}
            <section className="mt-8 border-t border-[var(--color-border-subtle)] pt-7">
              <h2 className="flex items-center gap-2 cc-h2 font-semibold text-[var(--color-text-primary)]">
                <BriefcaseBusiness size={18} />
                Portföy
              </h2>

              {portfolio.length > 0 ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {portfolio.map((item) => {
                    const portfolioUrl = item.url || item.link;

                    return (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white"
                      >
                        {item.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.title || "Portföy çalışması"}
                            className="h-48 w-full object-cover"
                          />
                        )}

                        <div className="p-5">
                          <h3 className="font-semibold text-[var(--color-text-primary)]">
                            {item.title || "Portföy çalışması"}
                          </h3>

                          {item.category && (
                            <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">
                              {item.category}
                            </p>
                          )}

                          {item.description && (
                            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                              {item.description}
                            </p>
                          )}

                          {portfolioUrl && (
                            <a
                              href={portfolioUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)] hover:underline"
                            >
                              Çalışmayı görüntüle
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-[var(--radius-card)] bg-[var(--color-surface-2)] p-5">
                  <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                    Bu freelancer henüz portföy çalışması eklememiş.
                  </p>
                </div>
              )}
            </section>

            {/* EXPERIENCE */}
            <section className="mt-8 border-t border-[var(--color-border-subtle)] pt-7">
              <h2 className="flex items-center gap-2 cc-h2 font-semibold text-[var(--color-text-primary)]">
                <BriefcaseBusiness size={18} />
                Geçmiş Deneyimler
              </h2>

              {experiences.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {experiences.map((experience) => {
                    const company =
                      experience.company ||
                      experience.company_name ||
                      "";

                    const startDate = formatDate(
                      experience.start_date
                    );

                    const endDate = experience.is_current
                      ? "Devam ediyor"
                      : formatDate(experience.end_date);

                    return (
                      <article
                        key={experience.id}
                        className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] p-5"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-[var(--color-text-primary)]">
                              {experience.title ||
                                "Deneyim"}
                            </h3>

                            {company && (
                              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                {company}
                              </p>
                            )}
                          </div>

                          {(startDate || endDate) && (
                            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                              {startDate}
                              {startDate && endDate ? " – " : ""}
                              {endDate}
                            </span>
                          )}
                        </div>

                        {experience.description && (
                          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--color-text-secondary)]">
                            {experience.description}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-[var(--radius-card)] bg-[var(--color-surface-2)] p-5">
                  <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                    Bu freelancer henüz geçmiş deneyim eklememiş.
                  </p>
                </div>
              )}
            </section>

            {/* LOCATION / OTHER */}
            {freelancer.city && (
              <section className="mt-8 border-t border-[var(--color-border-subtle)] pt-7">
                <h2 className="flex items-center gap-2 cc-h2 font-semibold text-[var(--color-text-primary)]">
                  <Globe2 size={18} />
                  Konum
                </h2>

                <p className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <MapPin size={16} />
                  {freelancer.city}
                </p>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Info({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
        <span className="text-[var(--color-text-secondary)]">{icon}</span>
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
        {children}
      </p>
    </div>
  );
}
