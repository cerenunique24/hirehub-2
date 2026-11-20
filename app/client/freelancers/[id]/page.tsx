"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import InviteFreelancerPanel from "@/components/client/InviteFreelancerPanel";
import PublicFreelancerProfile from "@/components/freelancers/PublicFreelancerProfile";
import { useFreelancerReviews } from "@/components/freelancers/useFreelancerReviews";
import { safeClientProfileReturn } from "@/components/client/clientProfilePresentation";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase/client";


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
  project_url?: string | null;
  skills?: string[] | null;
};

type Experience = {
  id: string;
  position?: string | null;
  title?: string | null;
  company?: string | null;
  company_name?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
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

function ClientFreelancerDetailContent() {
  const params = useParams();

  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : null;

  const searchParams = useSearchParams();
  const returnTo = safeClientProfileReturn(searchParams.get("returnTo"));
  const reviewsState = useFreelancerReviews(id);

  const supabase = useMemo(() => createClient(), []);

  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [activeProjectCount, setActiveProjectCount] = useState<number | null>(null);
  const [portfolioError, setPortfolioError] = useState(false);
  const [experienceError, setExperienceError] = useState(false);
  const [messageHref, setMessageHref] = useState<string | null>(null);

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
      setFreelancer(null);
      setPortfolio([]);
      setExperiences([]);
      setPortfolioError(false);
      setExperienceError(false);
      setActiveProjectCount(null);
      setMessageHref(null);

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

        if (!cancelled) setPortfolioError(Boolean(portfolioResult.error));
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

        if (!cancelled) setExperienceError(Boolean(experienceResult.error));
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
        const { count, error: countError } = await supabase
          .from("project_team_members")
          .select("project_id, projects!inner(status)", {
            count: "exact",
            head: true,
          })
          .eq("freelancer_id", data.id)
          .eq("status", "active")
          .eq("projects.status", "in_progress");

        if (!cancelled) {
          setActiveProjectCount(countError ? null : count);
          setLoading(false);
        }
        // Reuse only a persisted one-to-one conversation; new outreach still
        // follows the existing proposal/project permissions in the message API.
        const { data: auth } = await supabase.auth.getUser();
        if (!cancelled && auth.user && auth.user.id !== data.id) {
          const { data: conversations, error: conversationError } = await supabase.from("messages")
            .select("proposal_id, project_id")
            .or("and(sender_id.eq." + auth.user.id + ",receiver_id.eq." + data.id + "),and(sender_id.eq." + data.id + ",receiver_id.eq." + auth.user.id + ")")
            .is("coalition_id", null).order("created_at", { ascending: false }).limit(1);
          const conversation = conversations?.[0];
          if (!cancelled && !conversationError && conversation) {
            const context = new URLSearchParams({user:data.id});
            if (conversation.proposal_id) context.set("proposal", conversation.proposal_id);
            else if (conversation.project_id) context.set("project", conversation.project_id);
            setMessageHref("/client/messages?" + context.toString());
          }
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
            href={returnTo}
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

  return <PublicFreelancerProfile
    key={freelancer.id}
    viewerRole="client"
    profile={freelancer}
    portfolio={portfolio.map(item=>({id:item.id,title:item.title || "Portfolyo çalışması",category:item.category ?? null,description:item.description ?? null,image_url:item.image_url ?? null,project_url:item.project_url || item.url || item.link || null,skills:normalizeStringArray(item.skills)}))}
    experiences={experiences.map(item=>({id:item.id,position:item.position || item.title || null,company_name:item.company_name || item.company || null,start_date:item.start_date ?? null,end_date:item.end_date ?? null,is_current:item.is_current,description:item.description ?? null}))}
    portfolioError={portfolioError}
    experienceError={experienceError}
    returnTo={returnTo}
    backLabel="Freelancer Keşfet’e dön"
    reviewState={reviewsState}
    activeProjectCount={activeProjectCount}
    inviteAction={<InviteFreelancerPanel compact freelancerId={freelancer.id}/>}
    messageHref={messageHref}
  />;
}

export default function ClientFreelancerDetailPage() {
  return <Suspense fallback={<div role="status">Profil yükleniyor…</div>}><ClientFreelancerDetailContent/></Suspense>;
}
