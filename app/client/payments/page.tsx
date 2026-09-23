"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { getClientPaymentsSummary, type ClientPaymentsSummary } from "@/lib/financials";
import {
  calculateClientPricing,
  formatRatePercent,
  getClientCommissionRate,
  getProjectCommissionRate,
} from "@/lib/pricing";

function statusLabel(status: string | null) {
  if (status === "open") return "Yayında";
  if (status === "ready_to_start") return "Ekip hazır";
  if (status === "in_progress") return "Devam ediyor";
  if (status === "completed") return "Tamamlandı";
  if (status === "paused") return "Duraklatıldı";
  if (status === "cancelled") return "İptal edildi";
  return status ?? "Bilinmiyor";
}

export default function ClientPaymentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [summary, setSummary] = useState<ClientPaymentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commissionRate, setCommissionRate] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Ödemeler görünümünü görüntülemek için giriş yapmanız gerekiyor.");
        setLoading(false);
        return;
      }

      const [data, rate] = await Promise.all([
        getClientPaymentsSummary(supabase, user.id),
        getClientCommissionRate(supabase),
      ]);
      setSummary(data);
      setCommissionRate(rate);
      setLoading(false);
    }

    void load();
  }, [supabase]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          Yükleniyor...
        </div>
      </main>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-neutral-900">Ödemeler</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Projelerinin gerçek bütçe ve hakediş özetini buradan takip et.
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
            Ödeme altyapısı henüz aktif değil. Aşağıdaki tutarlar bir ödeme işlemini değil, mevcut proje ve
            aşama verilerinden hesaplanan bütçe/hakediş özetini gösterir.
            {commissionRate !== null && (
              <>
                {" "}
                Yeni oluşturacağın projelerde platform hizmet bedeli planına göre{" "}
                <strong className="font-semibold">{formatRatePercent(commissionRate)}</strong>. Mevcut projeler,
                oluşturuldukları andaki oranı korur.
              </>
            )}
          </p>
        </div>

        {!error && summary && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <p className="text-sm text-neutral-500">Toplam Proje Bütçesi</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{formatCurrency(summary.totalBudget)}</h2>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Wallet size={16} />
                  <p className="text-sm font-medium">Aktif Proje Bütçesi</p>
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-emerald-800">
                  {formatCurrency(summary.activeBudget)}
                </h2>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-center gap-2 text-blue-700">
                  <CheckCircle2 size={16} />
                  <p className="text-sm font-medium">Tamamlanan İşler</p>
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-blue-800">
                  {formatCurrency(summary.completedBudget)}
                </h2>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-medium text-amber-700">Bekleyen Hakediş</p>
                <h2 className="mt-2 text-2xl font-semibold text-amber-800">
                  {formatCurrency(summary.pendingObligation)}
                </h2>
                <p className="mt-1 text-xs text-amber-700">Devam eden, henüz onaylanmamış aşamalar</p>
              </div>
            </div>

            <h2 className="mb-4 text-lg font-semibold text-neutral-900">Proje bazında bütçe / harcama</h2>

            {summary.projects.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
                <p className="text-sm text-neutral-500">Henüz bir projen yok.</p>
                <Link
                  href="/client/projects/new"
                  className="mt-6 inline-flex rounded-lg bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-medium text-white"
                >
                  Yeni Proje Oluştur
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {summary.projects.map((project) => (
                  <Link
                    key={project.projectId}
                    href={`/client/projects/${project.projectId}`}
                    className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 transition hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-neutral-900">{project.title}</h3>
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                          {statusLabel(project.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-6 text-sm">
                        <div>
                          <span className="block text-xs text-neutral-400">Bütçe</span>
                          <span className="font-medium text-neutral-900">
                            {formatCurrency(project.engagementValue)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-neutral-400">Onaylanan aşamalar</span>
                          <span className="font-medium text-emerald-700">
                            {formatCurrency(project.approvedValue)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-neutral-400">Bekleyen</span>
                          <span className="font-medium text-amber-700">{formatCurrency(project.pendingValue)}</span>
                        </div>
                        {project.engagementValue > 0 && (() => {
                          const pricing = calculateClientPricing(
                            project.engagementValue,
                            getProjectCommissionRate({ commission_rate: project.commissionRate })
                          );
                          return (
                            <>
                              <div>
                                <span className="block text-xs text-neutral-400">
                                  Hizmet bedeli ({formatRatePercent(pricing.rate)})
                                </span>
                                <span className="font-medium text-neutral-900">{formatCurrency(pricing.platformFee)}</span>
                              </div>
                              <div>
                                <span className="block text-xs text-neutral-400">Toplam maliyet</span>
                                <span className="font-medium text-neutral-900">{formatCurrency(pricing.clientTotal)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
