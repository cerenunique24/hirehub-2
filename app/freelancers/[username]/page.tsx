"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Loader2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Freelancer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  expertise: string | null;
  skills: string[] | null;
};

type PortfolioItem = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
};

export default function FreelancerProfilePage() {
  const params = useParams();
  const id = typeof params?.username === "string" ? params.username : null;
  const supabase = useMemo(() => createClient(), []);

  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!id) {
        setError("Freelancer bulunamadı.");
        setLoading(false);
        return;
      }

      // Public profile: yalnızca herkese açık, hassas olmayan alanlar
      // seçilir (email/telefon gibi özel bilgiler asla döndürülmez).
      const { data, error: loadError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, title, bio, expertise, skills, role")
        .eq("id", id)
        .maybeSingle();

      if (loadError || !data || data.role !== "freelancer") {
        setError("Bu freelancer profili bulunamadı.");
        setLoading(false);
        return;
      }

      setFreelancer(data as Freelancer);

      const { data: portfolioRows } = await supabase
        .from("portfolio_items")
        .select("id, title, category, description, image_url, project_url")
        .eq("freelancer_id", id);

      setPortfolio((portfolioRows ?? []) as PortfolioItem[]);
      setLoading(false);
    }

    void load();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          Profil yükleniyor...
        </div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <Link href="/freelancers/freelancers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} />
            Freelancerlara dön
          </Link>
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <UserRound size={18} />
              </div>
              <p className="text-sm text-red-700">{error || "Profil bulunamadı."}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const name = [freelancer.first_name, freelancer.last_name].filter(Boolean).join(" ").trim() || "Freelancer";
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/freelancers/freelancers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={16} />
          Freelancerlara dön
        </Link>

        <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-6 border-b border-gray-100 p-6">
            {freelancer.avatar_url ? (
              <img src={freelancer.avatar_url} alt={name} className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-3xl font-semibold text-gray-600">
                {initials || "F"}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">{name}</h1>
              <p className="mt-1 text-gray-500">{freelancer.title || freelancer.expertise || "Uzmanlık bilgisi eklenmemiş"}</p>
              {freelancer.skills && freelancer.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {freelancer.skills.slice(0, 6).map((skill) => (
                    <span key={skill} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {freelancer.bio && (
              <div className="mb-8">
                <h2 className="font-semibold text-gray-900">Hakkında</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">{freelancer.bio}</p>
              </div>
            )}

            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <BriefcaseBusiness size={18} />
              Portföy ve geçmiş çalışmalar
            </h2>

            {portfolio.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-gray-50 p-5">
                <p className="text-sm leading-6 text-gray-500">Portföy bilgisi henüz sisteme eklenmemiş.</p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {portfolio.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-gray-100 p-4">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.title} className="mb-3 h-32 w-full rounded-xl object-cover" />
                    )}
                    <p className="font-medium text-gray-900">{item.title}</p>
                    {item.category && <p className="text-xs text-gray-500">{item.category}</p>}
                    {item.description && <p className="mt-2 text-sm text-gray-600">{item.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
