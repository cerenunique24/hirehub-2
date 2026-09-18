"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, Clock3, MessageSquare, Send, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  expertise: string | null;
  skills: string[] | null;
  profile_completion: number | null;
};

type Proposal = {
  id: string;
  project_id: string;
  status: string | null;
  created_at: string;
};

type Project = {
  id: string;
  title: string;
  status: string | null;
};

type DashboardData = {
  profile: Profile | null;
  activeProjects: Project[];
  pendingProposals: number;
  unreadMessages: number;
  recentProposals: Array<Proposal & { project: Project | null }>;
};

export default function FreelancerDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setError("Paneli görüntülemek için giriş yapmanız gerekiyor.");
        return;
      }

      const [profileResult, proposalResult, messageResult, membershipResult] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, avatar_url, expertise, skills, profile_completion").eq("id", user.id).maybeSingle(),
        supabase.from("proposals").select("id, project_id, status, created_at").eq("freelancer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).is("read_at", null),
        supabase.from("project_team_members").select("project_id").eq("freelancer_id", user.id).eq("status", "active"),
      ]);

      if (proposalResult.error) {
        if (active) setError(`Teklifler yüklenemedi: ${proposalResult.error.message}`);
        return;
      }

      const proposals = (proposalResult.data ?? []) as Proposal[];
      const projectIds = [...new Set(proposals.map((proposal) => proposal.project_id))];
      const projectResult = projectIds.length
        ? await supabase.from("projects").select("id, title, status").in("id", projectIds)
        : { data: [], error: null };

      if (projectResult.error) {
        if (active) setError(`Projeler yüklenemedi: ${projectResult.error.message}`);
        return;
      }

      const projectById = new Map(((projectResult.data ?? []) as Project[]).map((project) => [project.id, project]));

      // Ekip üyeliği (project_team_members), hem proposal hem invitation ile
      // katılan freelancer'ları kapsar; "aktif proje" burada gerçekten
      // ekipte olduğun ve tamamlanmamış projeler anlamına gelir.
      const membershipProjectIds = [
        ...new Set((membershipResult.data ?? []).map((row: { project_id: string }) => row.project_id)),
      ];
      const memberProjectsMissing = membershipProjectIds.filter((pid) => !projectById.has(pid));
      const extraProjects = memberProjectsMissing.length
        ? await supabase.from("projects").select("id, title, status").in("id", memberProjectsMissing)
        : { data: [] as Project[] };

      for (const extra of extraProjects.data ?? []) {
        projectById.set(extra.id, extra as Project);
      }

      const activeProjects = membershipProjectIds
        .map((pid) => projectById.get(pid))
        .filter((project): project is Project => project !== undefined && project.status !== "completed");

      if (active) {
        setData({
          profile: (profileResult.data as Profile | null) ?? null,
          activeProjects,
          pendingProposals: proposals.filter((proposal) => proposal.status === "pending").length,
          unreadMessages: messageResult.error ? 0 : messageResult.count ?? 0,
          recentProposals: proposals.slice(0, 5).map((proposal) => ({ ...proposal, project: projectById.get(proposal.project_id) ?? null })),
        });
      }
    }

    void loadDashboard().finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [supabase]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">Panel yükleniyor...</div>;
  if (error) return <div className="m-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;

  const profile = data?.profile;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Freelancer";
  const initials = name.charAt(0).toLocaleUpperCase("tr-TR") || "F";

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={name} className="h-14 w-14 rounded-full object-cover" />
          ) : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-lg font-semibold text-white">{initials}</div>}
          <div><h1 className="text-2xl font-semibold text-gray-900">Hoş geldin, {name}</h1><p className="mt-1 text-sm text-gray-500">Tekliflerini, projelerini ve mesajlarını buradan takip edebilirsin.</p></div>
        </div>
        <Link href="/freelancers/discover" className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800">Proje keşfet</Link>
      </header>

      <section className="grid gap-5 md:grid-cols-3">
        <Metric icon={<Briefcase size={19} />} label="Aktif projeler" value={data?.activeProjects.length ?? 0} detail="Ekibinde olduğun, tamamlanmamış projeler" />
        <Metric icon={<Clock3 size={19} />} label="Bekleyen teklifler" value={data?.pendingProposals ?? 0} detail="Müşteri değerlendirmesini bekliyor" />
        <Metric icon={<MessageSquare size={19} />} label="Okunmamış mesajlar" value={data?.unreadMessages ?? 0} detail="Yeni gelen mesajlar" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-gray-900">Aktif projeler</h2><p className="mt-1 text-sm text-gray-500">Ekibinde olduğun projeler</p></div><Link href="/freelancers/proposals" className="text-sm font-medium text-gray-700 hover:text-black">Tekliflerim</Link></div>{data?.activeProjects.length ? <div className="mt-5 space-y-3">{data.activeProjects.map((project) => <Link key={project.id} href={project.status === "in_progress" ? `/freelancers/projects/${project.id}` : `/freelancers/discover/${project.id}`} className="block rounded-xl border border-gray-100 p-4 hover:bg-gray-50"><p className="font-medium text-gray-900">{project.title}</p><p className="mt-1 text-sm text-gray-500">{statusLabel(project.status)}</p></Link>)}</div> : <Empty text="Henüz ekibinde olduğun bir proje yok." />}</div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-gray-900">Son teklifler</h2><p className="mt-1 text-sm text-gray-500">Gerçek teklif hareketlerin</p></div><Send size={18} className="text-gray-400" /></div>{data?.recentProposals.length ? <div className="mt-5 space-y-3">{data.recentProposals.map((proposal) => <Link key={proposal.id} href={`/freelancers/proposals/${proposal.id}`} className="block rounded-xl border border-gray-100 p-4 hover:bg-gray-50"><div className="flex items-start justify-between gap-3"><p className="font-medium text-gray-900">{proposal.project?.title ?? "Proje bilgisi bulunamadı"}</p><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{statusLabel(proposal.status)}</span></div><p className="mt-2 text-xs text-gray-400">{new Date(proposal.created_at).toLocaleDateString("tr-TR")}</p></Link>)}</div> : <Empty text="Henüz teklif göndermedin." />}</div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-gray-900">Profil özeti</h2><p className="mt-1 text-sm text-gray-500">Profili tamamlamak, keşfet ekranındaki görünürlüğünü iyileştirir.</p></div><Link href="/freelancers/profile" className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black"><UserRound size={16} />Profili düzenle</Link></div><div className="mt-5"><div className="flex justify-between text-sm"><span className="text-gray-500">Profil tamamlanma</span><span className="font-medium text-gray-900">{profile?.profile_completion ?? 0}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-black" style={{ width: `${Math.max(0, Math.min(100, profile?.profile_completion ?? 0))}%` }} /></div>{profile?.expertise && <p className="mt-5 text-sm text-gray-700">{profile.expertise}</p>}{profile?.skills?.length ? <div className="mt-3 flex flex-wrap gap-2">{profile.skills.map((skill) => <span key={skill} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{skill}</span>)}</div> : <p className="mt-4 text-sm text-gray-500">Henüz yetenek eklenmemiş.</p>}</div></section>
    </main>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p><p className="mt-2 text-xs text-gray-400">{detail}</p></div><div className="rounded-xl bg-gray-100 p-3 text-gray-700">{icon}</div></div></div>;
}

function Empty({ text }: { text: string }) { return <p className="mt-5 rounded-xl bg-gray-50 p-5 text-sm text-gray-500">{text}</p>; }

function statusLabel(status: string | null) {
  if (status === "accepted") return "Kabul edildi";
  if (status === "rejected") return "Reddedildi";
  if (status === "in_progress") return "Devam ediyor";
  if (status === "completed") return "Tamamlandı";
  return "İnceleniyor";
}
