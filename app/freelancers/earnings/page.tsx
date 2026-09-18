"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { getFreelancerEarningsSummary, type FreelancerEarningsSummary } from "@/lib/financials";

function statusLabel(status: string | null) {
  if (status === "in_progress") return "Devam ediyor";
  if (status === "completed") return "Tamamlandı";
  if (status === "ready_to_start") return "Başlamayı bekliyor";
  if (status === "paused") return "Duraklatıldı";
  if (status === "cancelled") return "İptal edildi";
  return status ?? "Bilinmiyor";
}

export default function EarningsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [summary, setSummary] = useState<FreelancerEarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Kazançlarını görüntülemek için giriş yapmanız gerekiyor.");
        setLoading(false);
        return;
      }

      const data = await getFreelancerEarningsSummary(supabase, user.id);
      setSummary(data);
      setLoading(false);
    }

    void load();
  }, [supabase]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          Kazançlar yükleniyor...
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Kazançlarım</h1>
        <p className="mt-2 text-sm text-gray-500">
          Projelerinden hesaplanan gerçek kazanç özetin — Supabase verilerinden dinamik hesaplanır.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <p>
          CollaCrew&apos;da henüz bir ödeme altyapısı aktif değil. Aşağıdaki tutarlar gerçek proje ve aşama
          verilerinden hesaplanan bir özet niteliğindedir; bir ödemenin gerçekleştiğini göstermez.
        </p>
      </div>

      {!error && summary && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm text-gray-500">Toplam Proje Bütçesi / Hakediş</p>
              <h2 className="mt-2 text-2xl font-semibold text-black">
                {formatCurrency(summary.totalEngagement)}
              </h2>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-2 text-emerald-700">
                <TrendingUp size={16} />
                <p className="text-sm font-medium">Gerçekleşen Kazanç</p>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-emerald-800">
                {formatCurrency(summary.realizedEarnings)}
              </h2>
              <p className="mt-1 text-xs text-emerald-700">Onaylanmış aşamalar / tamamlanmış projeler</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-center gap-2 text-amber-700">
                <Wallet size={16} />
                <p className="text-sm font-medium">Bekleyen Hakediş</p>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-amber-800">
                {formatCurrency(summary.pendingEarnings)}
              </h2>
              <p className="mt-1 text-xs text-amber-700">Devam eden, henüz onaylanmamış işler</p>
            </div>
          </div>

          <h2 className="mb-4 text-lg font-semibold text-gray-900">Proje bazında özet</h2>

          {summary.projects.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
              <p className="text-sm text-gray-500">
                Henüz aktif bir proje ekibinde değilsin. Bir teklifin kabul edildiğinde burada görünecek.
              </p>
              <Link
                href="/freelancers/discover"
                className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
              >
                Projeleri keşfet
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {summary.projects.map((project) => (
                <div
                  key={project.projectId}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{project.title}</h3>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        {statusLabel(project.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-6 text-sm">
                      <div>
                        <span className="block text-xs text-gray-400">Toplam Değer</span>
                        <span className="font-medium text-gray-900">{formatCurrency(project.engagementValue)}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-400">Gerçekleşen</span>
                        <span className="font-medium text-emerald-700">{formatCurrency(project.approvedValue)}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-400">Bekleyen</span>
                        <span className="font-medium text-amber-700">{formatCurrency(project.pendingValue)}</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={
                      project.status === "in_progress" || project.status === "completed"
                        ? `/freelancers/projects/${project.projectId}`
                        : `/freelancers/discover/${project.projectId}`
                    }
                    className="shrink-0 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                  >
                    Detay
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
