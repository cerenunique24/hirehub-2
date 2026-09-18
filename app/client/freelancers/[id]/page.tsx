"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Loader2,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Freelancer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  title: string | null;
  expertise: string | null;
  skills: string[] | null;
};

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

      console.log("=================================");
      console.log("FREELANCER PROFILE PAGE");
      console.log("ID:", id);
      console.log("=================================");

      try {
        /*
         * Önce profili sadece ID ile buluyoruz.
         *
         * Burada role filtresini özellikle kullanmıyoruz.
         * Böylece profil gerçekten bulunuyor mu,
         * yoksa role filtresi yüzünden mi kayboluyor
         * net şekilde anlayabiliyoruz.
         */
        const { data, error: loadError } = await supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, avatar_url, title, expertise, skills, role"
          )
          .eq("id", id)
          .maybeSingle();

        console.log("PROFILE ID:", id);
        console.log("PROFILE DATA:", data);
        console.log("PROFILE ERROR:", loadError);

        if (cancelled) {
          return;
        }

        if (loadError) {
          console.error(
            "Freelancer profili yüklenirken Supabase hatası:",
            loadError
          );

          setError(
            `Profil yüklenemedi: ${
              loadError.message || "Supabase sorgusu başarısız."
            }`
          );

          setFreelancer(null);
          setLoading(false);
          return;
        }

        if (!data) {
          console.error("Profil bulunamadı. ID:", id);

          setError(
            "Bu ID ile eşleşen freelancer profili bulunamadı."
          );

          setFreelancer(null);
          setLoading(false);
          return;
        }

        /*
         * Profil bulundu ama freelancer değilse
         * bunu ayrıca belirtiyoruz.
         */
        if (data.role !== "freelancer") {
          console.error(
            "Profil bulundu ancak freelancer değil:",
            data.role
          );

          setError(
            `Bu kullanıcı freelancer değil. Kullanıcı rolü: ${
              data.role || "belirtilmemiş"
            }`
          );

          setFreelancer(null);
          setLoading(false);
          return;
        }

        const freelancerData: Freelancer = {
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          avatar_url: data.avatar_url,
          title: data.title,
          expertise: data.expertise,
          skills: Array.isArray(data.skills) ? data.skills : null,
        };

        console.log("FREELANCER DATA:", freelancerData);

        setFreelancer(freelancerData);
        setLoading(false);
      } catch (err) {
        console.error("Beklenmeyen profil hatası:", err);

        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Profil yüklenirken beklenmeyen bir hata oluştu."
        );

        setFreelancer(null);
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 size={18} className="animate-spin" />
          Profil yükleniyor...
        </div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/client/freelancers"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-900"
          >
            <ArrowLeft size={16} />
            Freelancerlara dön
          </Link>

          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <UserRound size={18} />
              </div>

              <div>
                <h1 className="font-semibold text-red-900">
                  Freelancer profili bulunamadı
                </h1>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error || "Profil bilgileri alınamadı."}
                </p>

                {id && (
                  <p className="mt-3 break-all font-mono text-xs text-red-600">
                    ID: {id}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const name =
    [freelancer.first_name, freelancer.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Freelancer";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/client/freelancers"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-900"
        >
          <ArrowLeft size={16} />
          Freelancerlara dön
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          {/* HEADER */}
          <div className="border-b border-neutral-100 p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {freelancer.avatar_url ? (
                <img
                  src={freelancer.avatar_url}
                  alt={name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl font-semibold text-neutral-600">
                  {initials || "F"}
                </div>
              )}

              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                  {name}
                </h1>

                <p className="mt-1 text-sm text-neutral-500">
                  {freelancer.title ||
                    freelancer.expertise ||
                    "Uzmanlık bilgisi eklenmemiş"}
                </p>
              </div>
            </div>
          </div>

          {/* PROFILE INFO */}
          <div className="p-7">
            <div className="grid gap-6 md:grid-cols-2">
              <Info title="Uzmanlık alanı">
                {freelancer.expertise ||
                  freelancer.title ||
                  "Henüz belirtilmemiş."}
              </Info>

              <Info title="Profil">
                {freelancer.title ||
                  "Freelancer profilinde henüz detaylı bilgi bulunmuyor."}
              </Info>
            </div>

            {/* SKILLS */}
            <section className="mt-8 border-t border-neutral-100 pt-6">
              <h2 className="font-semibold text-neutral-900">
                Yetenekler
              </h2>

              {freelancer.skills && freelancer.skills.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {freelancer.skills.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-500">
                  Henüz yetenek eklenmemiş.
                </p>
              )}
            </section>

            {/* PORTFOLIO */}
            <section className="mt-8 border-t border-neutral-100 pt-6">
              <h2 className="flex items-center gap-2 font-semibold text-neutral-900">
                <BriefcaseBusiness size={18} />
                Portföy ve geçmiş çalışmalar
              </h2>

              <div className="mt-4 rounded-2xl bg-neutral-50 p-5">
                <p className="text-sm leading-6 text-neutral-500">
                  Portföy bilgisi henüz sisteme eklenmemiş.
                </p>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-neutral-600">
        {children}
      </p>
    </div>
  );
}