"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileText, Loader2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchDeliveryFiles, fetchMilestoneDeliveries, type DeliveryFile } from "@/lib/projects/milestones";
import { paymentStatusLabel } from "@/lib/payments/status";

type Project = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
};

type Membership = {
  role: string | null;
  agreed_amount: number | null;
  accepted_at: string | null;
};

type Milestone = {
  id: string;
  title: string;
  status: string;
  payment_status: string | null;
  budget: number | null;
  freelancer_payout_amount: number | null;
  sort_order: number;
};

type Review = {
  rating: number;
  comment: string | null;
};

const MILESTONE_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  active: "Aktif",
  submitted: "Teslim edildi",
  in_review: "İnceleniyor",
  revision: "Revizyon",
  approved: "Onaylandı",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default function CompletedProjectSummaryPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deliveryCounts, setDeliveryCounts] = useState<Record<string, number>>({});
  const [files, setFiles] = useState<(DeliveryFile & { url?: string })[]>([]);
  const [review, setReview] = useState<Review | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setError("Bu sayfayı görmek için giriş yapmalısın.");
          setLoading(false);
        }
        return;
      }

      const { data: membershipRow } = await supabase
        .from("project_team_members")
        .select("role, agreed_amount, accepted_at")
        .eq("project_id", projectId)
        .eq("freelancer_id", user.id)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: projectRow } = await supabase
        .from("projects")
        .select("id, title, status, updated_at")
        .eq("id", projectId)
        .maybeSingle();

      if (!active) return;

      if (!membershipRow || !projectRow || projectRow.status !== "completed") {
        setError("Bu tamamlanmış projenin çalışma sonucuna erişim yetkin yok.");
        setLoading(false);
        return;
      }

      const { data: milestoneRows } = await supabase
        .from("project_milestones")
        .select("id, title, status, payment_status, budget, freelancer_payout_amount, sort_order, freelancer_id")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      const ownMilestones: Milestone[] = (milestoneRows ?? [])
        .filter((m) => m.freelancer_id === null || m.freelancer_id === user.id)
        .map((m) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          payment_status: m.payment_status,
          budget: m.budget,
          freelancer_payout_amount: m.freelancer_payout_amount,
          sort_order: m.sort_order,
        }));

      const { data: deliveries } = await fetchMilestoneDeliveries(supabase, projectId);
      const ownMilestoneIds = new Set(ownMilestones.map((m) => m.id));
      const ownDeliveries = (deliveries ?? []).filter((d) => ownMilestoneIds.has(d.milestone_id));

      const counts: Record<string, number> = {};
      for (const d of ownDeliveries) {
        counts[d.milestone_id] = (counts[d.milestone_id] ?? 0) + 1;
      }

      const { data: fileRows } = await fetchDeliveryFiles(
        supabase,
        ownDeliveries.map((d) => d.id)
      );

      let signedByPath = new Map<string, string>();
      if (fileRows && fileRows.length > 0) {
        const { data: signed } = await supabase.storage
          .from("project-files")
          .createSignedUrls(
            fileRows.map((f) => f.file_path),
            60 * 60
          );
        signedByPath = new Map(
          (signed ?? [])
            .filter((entry) => !entry.error && entry.signedUrl)
            .map((entry) => [entry.path ?? "", entry.signedUrl as string])
        );
      }

      const { data: reviewRow } = await supabase
        .from("reviews")
        .select("rating, comment")
        .eq("project_id", projectId)
        .eq("reviewee_id", user.id)
        .eq("reviewer_role", "client")
        .maybeSingle();

      if (!active) return;

      setProject(projectRow as Project);
      setMembership(membershipRow as Membership);
      setMilestones(ownMilestones);
      setDeliveryCounts(counts);
      setFiles(
        (fileRows ?? []).map((f) => ({ ...f, url: signedByPath.get(f.file_path) }))
      );
      setReview((reviewRow as Review | null) ?? null);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [projectId, supabase]);

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center gap-2 p-6 text-sm text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        Çalışma sonucu yükleniyor...
      </main>
    );
  }

  if (error || !project || !membership) {
    return (
      <main className="p-6">
        <Link href="/freelancers/earnings" className="inline-flex items-center gap-2 text-sm text-gray-500">
          <ArrowLeft size={16} />
          Kazançlarım
        </Link>
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error || "Proje bulunamadı."}</p>
      </main>
    );
  }

  const net = milestones.reduce((sum, m) => {
    const amount = m.freelancer_payout_amount ?? m.budget ?? 0;
    return m.payment_status === "cancelled" || m.payment_status === "refunded" ? sum : sum + Number(amount);
  }, 0);
  const approvedCount = milestones.filter((m) => m.status === "approved").length;

  return (
    <main className="w-full p-6">
      <Link href="/freelancers/earnings" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Kazançlarım
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{project.title}</h1>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Tamamlandı</span>
            </div>
            {membership.role && <p className="mt-2 text-sm text-gray-500">Rolün: {membership.role}</p>}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Aşamalar</h2>
            <p className="mt-1 text-sm text-gray-500">
              {approvedCount}/{milestones.length} aşama onaylandı
            </p>
            <ul className="mt-4 divide-y divide-gray-100">
              {milestones.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.title}</p>
                    <p className="text-xs text-gray-500">
                      {MILESTONE_LABEL[m.status] ?? m.status} · {deliveryCounts[m.id] ?? 0} teslim
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{formatCurrency(Number(m.freelancer_payout_amount ?? m.budget ?? 0))}</p>
                    <p className="text-xs text-gray-500">{paymentStatusLabel(m.payment_status)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Teslim dosyaları</h2>
            {files.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Bu projede teslim edilmiş dosya yok.</p>
            ) : (
              <ul className="mt-4 divide-y divide-gray-100">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex items-center gap-2 text-sm text-gray-800">
                      <FileText size={16} className="text-gray-400" />
                      {f.file_name}
                    </span>
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--color-primary-600)] hover:underline">
                        Görüntüle
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Bağlantı oluşturulamadı</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Net kazanç</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{formatCurrency(net)}</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Kabul tarihi</dt>
                <dd className="text-gray-900">{formatDate(membership.accepted_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Proje durumu</dt>
                <dd className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 size={14} /> Tamamlandı
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">Değerlendirme</h2>
            {review ? (
              <div className="mt-3">
                <p className="flex items-center gap-1 text-sm text-amber-600">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < review.rating ? "fill-current" : "text-gray-300"} />
                  ))}
                </p>
                {review.comment && <p className="mt-2 text-sm text-gray-600">{review.comment}</p>}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Henüz değerlendirme yapılmadı.</p>
            )}
            <Link href={`/freelancers/projects/${project.id}`} className="mt-4 inline-flex text-sm font-medium text-[var(--color-primary-600)] hover:underline">
              Proje çalışma alanını aç
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
