"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FreelancerProfileView, type ProfileExperience } from "@/components/freelancers/FreelancerProfileView";
import { useFreelancerReviews } from "@/components/freelancers/useFreelancerReviews";
import InviteFreelancerPanel from "@/components/client/InviteFreelancerPanel";
import { safeDirectoryReturn } from "@/components/freelancers/directoryPresentation";
type Freelancer = {
    id: string;
    first_name: string | null;
    avatar_url: string | null;
    title: string | null;
    bio: string | null;
    expertise: string | null;
    skills: string[] | null;
    availability_status: string | null;
    experience: string | null;
    hourly_rate: number | null;
    city: string | null;
    work_types: string[] | null;
    languages: string[] | null;
    profile_completion: number | null;
    availability_note: string | null;
    available_from: string | null;
};
type PortfolioItem = {
    id: string;
    title: string;
    category: string | null;
    description: string | null;
    image_url: string | null;
    project_url: string | null;
};
function FreelancerProfileContent() {
    const searchParams = useSearchParams();
    const returnTo = safeDirectoryReturn(searchParams.get("returnTo"));
    const params = useParams();
    const id = typeof params?.username === "string" ? params.username : null;
    const reviewsState=useFreelancerReviews(id);
    const supabase = useMemo(() => createClient(), []);
    const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [experiences, setExperiences] = useState<ProfileExperience[]>([]);
    const [experienceError, setExperienceError] = useState(false);
    const [canInvite, setCanInvite] = useState(false);
    const [messageHref, setMessageHref] = useState<string | null>(null);
    const [portfolioError, setPortfolioError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!id) {
                setError("Freelancer bulunamadı.");
                setLoading(false);
                return;
            }
            setCanInvite(false);
            setMessageHref(null);
            setExperiences([]);
            setExperienceError(false);
            setLoading(true);
            setFreelancer(null);
            setPortfolio([]);
            setPortfolioError(false);
            setError("");
            // Public profile: yalnızca herkese açık, hassas olmayan alanlar
            // seçilir (email/telefon gibi özel bilgiler asla döndürülmez).
            const { data, error: loadError } = await supabase
                .from("profiles")
                .select("id, first_name, avatar_url, title, bio, expertise, skills, role, availability_status, experience, hourly_rate, city, work_types, languages, profile_completion, availability_note, available_from")
                .eq("id", id)
                .maybeSingle();
            if (cancelled)
                return;
            if (loadError || !data || data.role !== "freelancer") {
                setError("Bu freelancer profili bulunamadı.");
                setLoading(false);
                return;
            }
            setFreelancer(data as Freelancer);
            const { data: portfolioRows, error: portfolioLoadError } = await supabase
                .from("portfolio_items")
                .select("id, title, category, description, image_url, project_url")
                .eq("freelancer_id", id);
            if (cancelled)
                return;
            setPortfolioError(Boolean(portfolioLoadError));
            setPortfolio((portfolioRows ?? []) as PortfolioItem[]);
            const { data: experienceRows, error: experienceLoadError } = await supabase.from("experiences").select("id, company_name, position, start_date, end_date, description").eq("freelancer_id", id).order("start_date", { ascending: false });
            if (cancelled)
                return;
            setExperiences((experienceRows ?? []) as ProfileExperience[]);
            setExperienceError(Boolean(experienceLoadError));
            setLoading(false);
            const { data: auth } = await supabase.auth.getUser();
            if (cancelled || !auth.user || auth.user.id === id)
                return;
            const { data: viewer } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
            if (cancelled || viewer?.role !== "client")
                return;
            const [projectsResult, messagesResult] = await Promise.all([
                supabase.from("projects").select("id").eq("client_id", auth.user.id).in("status", ["open", "ready_to_start"]).limit(1),
                supabase.from("messages").select("id").or("and(sender_id.eq." + auth.user.id + ",receiver_id.eq." + id + "),and(sender_id.eq." + id + ",receiver_id.eq." + auth.user.id + ")").is("coalition_id", null).is("proposal_id", null).is("project_id", null).limit(1),
            ]);
            if (cancelled)
                return;
            setCanInvite(!projectsResult.error && Boolean(projectsResult.data?.length));
            if (!messagesResult.error && messagesResult.data?.length)
                setMessageHref("/client/messages?user=" + id);
        }
        void load();
        return () => { cancelled = true; };
    }, [id, supabase]);
    useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);
    if (loading) {
        return (<div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={18} className="animate-spin"/>
          Profil yükleniyor...
        </div>
      </div>);
    }
    if (!freelancer) {
        return (<div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <Link href={returnTo} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16}/>
            Freelancerlara dön
          </Link>
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <UserRound size={18}/>
              </div>
              <p className="text-sm text-red-700">{error || "Profil bulunamadı."}</p>
            </div>
          </div>
        </div>
      </div>);
    }
    return <FreelancerProfileView reviewState={reviewsState} key={freelancer.id} profile={freelancer} portfolio={portfolio} experiences={experiences} portfolioError={portfolioError} experienceError={experienceError} returnTo={returnTo} inviteAction={canInvite ? <InviteFreelancerPanel freelancerId={freelancer.id}/> : undefined} messageHref={messageHref}/>;
}
export default function FreelancerProfilePage() { return <Suspense fallback={<div className="p-6">Profil yükleniyor…</div>}><FreelancerProfileContent /></Suspense>; }
