"use client";

import { buttonClasses } from "@/components/ui/Button";
import { pageHeaderClass } from "@/components/ui/PageHeader";
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
        <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
          <Loader2 size={20} className="animate-spin" />
          Yükleniyor...
        </div>
      </main>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full">
        <div className={pageHeaderClass}>
          <h1 className="cc-page-title font-semibold text-[var(--color-text-primary)]">Ödemeler</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Projelerinin gerçek bütçe ve hakediş özetini buradan takip et.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex gap-3 rounded-[var(--radius-card)] bg-[var(--color-error-50)] p-4 text-sm text-[var(--color-error-600)]">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mb-6 flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-warning-600)]/20 bg-[var(--color-warning-50)] p-4 text-sm text-[var(--color-warning-600)]">
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
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-5">
                <p className="text-sm text-[var(--color-text-secondary)]">Toplam Proje Bütçesi</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{formatCurrency(summary.totalBudget)}</h2>
              </div>
              <div className="rounded-[var(--radius-card)] border border-[var(--color-success-600)]/20 bg-[var(--color-success-50)] p-5">
                <div className="flex items-center gap-2 text-[var(--color-success-600)]">
                  <Wallet size={16} />
                  <p className="text-sm font-medium">Aktif Proje Bütçesi</p>
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-success-600)]">
                  {formatCurrency(summary.activeBudget)}
                </h2>
              </div>
              <div className="rounded-[var(--radius-card)] border border-[var(--color-info-600)]/20 bg-[var(--color-info-50)] p-5">
                <div className="flex items-center gap-2 text-[var(--color-info-600)]">
                  <CheckCircle2 size={16} />
                  <p className="text-sm font-medium">Tamamlanan İşler</p>
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-info-600)]">
                  {formatCurrency(summary.completedBudget)}
                </h2>
              </div>
              <div className="rounded-[var(--radius-card)] border border-[var(--color-warning-600)]/20 bg-[var(--color-warning-50)] p-5">
                <p className="text-sm font-medium text-[var(--color-warning-600)]">Bekleyen Hakediş</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-warning-600)]">
                  {formatCurrency(summary.pendingObligation)}
                </h2>
                <p className="mt-1 text-xs text-[var(--color-warning-600)]">Devam eden, henüz onaylanmamış aşamalar</p>
              </div>
            </div>

            {summary.totalDueWithFee > 0 && (
              <p className="mb-8 -mt-4 text-sm text-[var(--color-text-secondary)]">
                Aşama bütçelerin ve platform hizmet bedeli dahil toplam ödeme tutarın:{" "}
                <strong className="font-semibold text-[var(--color-text-primary)]">{formatCurrency(summary.totalDueWithFee)}</strong>.
                Proje bütçesi, platform ücreti ve toplam ödeme her aşama kartında ayrı ayrı gösterilir.
              </p>
            )}

            <h2 className="mb-4 cc-h2 font-semibold text-[var(--color-text-primary)]">Proje bazında bütçe / harcama</h2>

            {summary.projects.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-[var(--space-6)] text-center">
                <p className="text-sm text-[var(--color-text-secondary)]">Henüz bir projen yok.</p>
                <Link
                  href="/client/projects/new"
                  className={buttonClasses({variant:"primary"})}
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
                    className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-5 transition hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-[var(--color-text-primary)]">{project.title}</h3>
                        <span className="rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                          {statusLabel(project.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-6 text-sm">
                        <div>
                          <span className="block text-xs text-[var(--color-text-muted)]">Bütçe</span>
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {formatCurrency(project.engagementValue)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-[var(--color-text-muted)]">Onaylanan aşamalar</span>
                          <span className="font-medium text-[var(--color-success-600)]">
                            {formatCurrency(project.approvedValue)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-[var(--color-text-muted)]">Bekleyen</span>
                          <span className="font-medium text-[var(--color-warning-600)]">{formatCurrency(project.pendingValue)}</span>
                        </div>
                        {project.engagementValue > 0 && (() => {
                          const pricing = calculateClientPricing(
                            project.engagementValue,
                            getProjectCommissionRate({ commission_rate: project.commissionRate })
                          );
                          return (
                            <>
                              <div>
                                <span className="block text-xs text-[var(--color-text-muted)]">
                                  Hizmet bedeli ({formatRatePercent(pricing.rate)})
                                </span>
                                <span className="font-medium text-[var(--color-text-primary)]">{formatCurrency(pricing.platformFee)}</span>
                              </div>
                              <div>
                                <span className="block text-xs text-[var(--color-text-muted)]">Toplam maliyet</span>
                                <span className="font-medium text-[var(--color-text-primary)]">{formatCurrency(pricing.clientTotal)}</span>
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
