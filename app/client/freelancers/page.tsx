"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Freelancer = { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null; title: string | null; expertise: string | null; skills: string[] | null };

export default function ClientFreelancersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { async function loadFreelancers() {
    const { data, error: loadError } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url, title, expertise, skills").eq("role", "freelancer").order("first_name");
    if (loadError) setError("Freelancer profilleri yüklenemedi. Yetkilendirme ayarlarını kontrol edin.");
    else setFreelancers((data ?? []) as Freelancer[]);
    setLoading(false);
  } void loadFreelancers(); }, [supabase]);

  return <div className="p-8"><div className="mx-auto max-w-7xl"><header className="mb-8"><h1 className="text-3xl font-bold text-neutral-900">Freelancerları keşfet</h1><p className="mt-1 text-sm text-neutral-500">Profil ve yetenek bilgilerine göre uygun uzmanları inceleyin.</p></header>
    {loading ? <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-neutral-500"><Loader2 size={18} className="animate-spin" />Freelancerlar yükleniyor...</div> : error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : freelancers.length === 0 ? <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center"><Users className="mx-auto text-neutral-400" /><h2 className="mt-4 text-lg font-semibold">Henüz görüntülenecek freelancer yok</h2><p className="mt-2 text-sm text-neutral-500">Freelancer profilleri tamamlandığında burada görünür.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{freelancers.map((freelancer) => <Link key={freelancer.id} href={`/client/freelancers/${freelancer.id}`} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md"><div className="flex items-center gap-4">{freelancer.avatar_url ? <img src={freelancer.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-lg font-semibold text-neutral-600">{(freelancer.first_name || "F").slice(0, 1).toUpperCase()}</div>}<div className="min-w-0"><h2 className="truncate font-semibold text-neutral-900">{[freelancer.first_name, freelancer.last_name].filter(Boolean).join(" ") || "Freelancer"}</h2><p className="truncate text-sm text-neutral-500">{freelancer.title || freelancer.expertise || "Uzmanlık bilgisi eklenmemiş"}</p></div></div>{freelancer.skills?.length ? <div className="mt-5 flex flex-wrap gap-2">{freelancer.skills.slice(0, 5).map((skill) => <span key={skill} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">{skill}</span>)}</div> : <p className="mt-5 text-sm text-neutral-500">Henüz yetenek eklenmemiş.</p>}</Link>)}</div>}
  </div></div>;
}
