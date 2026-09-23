"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchSubscriptionStatus,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionUiState,
  PLAN_RANK,
  type SubscriptionStatus,
  type PlanTier,
  type BillingCycle,
} from "@/lib/premium";
import { getPlansForRole, getPlanDefinition, getPlanPrice, yearlySavingsPercent } from "@/lib/plans";

function formatCurrency(value: number) {
  if (value === 0) return "₺0";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

const BILLING_LABEL: Record<BillingCycle, string> = { monthly: "Aylık", yearly: "Yıllık" };

export default function PremiumPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"client" | "freelancer" | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  async function fetchAccountData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const [{ data: profile }, subscription] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      fetchSubscriptionStatus(supabase),
    ]);

    return {
      userId: user.id,
      role: (profile?.role as "client" | "freelancer") ?? null,
      subscription,
    };
  }

  function applyAccountData(data: Awaited<ReturnType<typeof fetchAccountData>>) {
    if (!data) return;

    setUserId(data.userId);
    setRole(data.role);
    setStatus(data.subscription);

    /*
     * Sayfa açıldığında toggle'ı kullanıcının GERÇEK fatura
     * periyoduna hizala — böylece "Mevcut Plan" ilk bakışta doğru
     * kartta görünür.
     */
    if (data.subscription.billing_cycle) {
      setBillingCycle(data.subscription.billing_cycle);
    }
  }

  /** Cancel/reactivate sonrası abonelik durumunu tazelemek için. */
  async function loadSubscription() {
    applyAccountData(await fetchAccountData());
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await fetchAccountData();
      if (!cancelled) {
        applyAccountData(data);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const currentPlan: PlanTier = status?.plan ?? "free";
  const uiState = status ? getSubscriptionUiState(status) : "free";
  const dashboardHref = role === "freelancer" ? "/freelancers/dashboard" : "/client/dashboard";
  const hasSubscriptionHistory = status ? status.raw_plan !== "free" : false;

  async function handleCancel() {
    setActionLoading(true);
    setActionError("");

    const { error } = await cancelSubscription(supabase);

    if (error) {
      setActionError(error.message || "Abonelik iptal edilemedi.");
      setActionLoading(false);
      return;
    }

    setShowCancelConfirm(false);
    setActionLoading(false);
    await loadSubscription();
  }

  async function handleReactivate() {
    setActionLoading(true);
    setActionError("");

    const { error } = await reactivateSubscription(supabase);

    if (error) {
      setActionError(error.message || "Abonelik yeniden aktifleştirilemedi.");
      setActionLoading(false);
      return;
    }

    setActionLoading(false);
    await loadSubscription();
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            CollaCrew
          </Link>
          {userId ? (
            <Link href={dashboardHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
              <ArrowLeft size={15} />
              Panele dön
            </Link>
          ) : (
            <Link href="/login" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
              Giriş Yap
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">Paketler</h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            Temel özellikler herkese açık. Plus ve Pro, çalışma verilerini anlamana ve gelişmene yardımcı olan bir
            içgörü katmanıdır — projeye erişim satmaz.
          </p>
        </div>

        {/* ABONELİK YÖNETİMİ — sadece hiç ücretli pakete geçmiş kullanıcıda */}
        {!loading && userId && status && hasSubscriptionHistory && (
          <SubscriptionManagement
            role={role}
            status={status}
            uiState={uiState}
            actionError={actionError}
            actionLoading={actionLoading}
            onCancelClick={() => setShowCancelConfirm(true)}
            onReactivateClick={() => void handleReactivate()}
          />
        )}

        {!loading && userId && !hasSubscriptionHistory && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600">
              Mevcut paketin: <span className="font-semibold text-gray-900">Free</span>
            </p>
          </div>
        )}

        {!loading && userId && !role && (
          <p className="mt-4 text-center text-sm text-gray-400">Paketleri görmek için profilinde rol bilgisi gerekiyor.</p>
        )}

        {(role || !userId) && (
          <>
            {/* BILLING TOGGLE */}
            <div className="mt-10 flex items-center justify-center gap-2">
              <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    billingCycle === "monthly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  Aylık
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    billingCycle === "yearly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  Yıllık
                </button>
              </div>
            </div>

            {/* PLAN GRID */}
            <div id="plan-grid" className="mt-8 grid gap-6 md:grid-cols-3">
              {getPlansForRole(role).map((plan) => {
                const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
                const savings = yearlySavingsPercent(plan.priceMonthly, plan.priceYearly);

                /*
                 * "Mevcut Plan" SADECE plan VE fatura periyodu birebir
                 * eşleştiğinde gösterilir. Free'de periyot yok, sadece
                 * plan eşleşmesi yeterli.
                 */
                const isCurrent =
                  Boolean(userId && role) &&
                  plan.id === currentPlan &&
                  (plan.id === "free" || billingCycle === status?.billing_cycle);

                const isUpgrade = PLAN_RANK[plan.id] > PLAN_RANK[currentPlan];
                const isPaidPlanChange =
                  plan.id !== "free" &&
                  currentPlan !== "free" &&
                  !isCurrent &&
                  uiState !== "expired";

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border p-6 ${
                      isCurrent ? "border-[#222] bg-white" : "border-gray-200 bg-white"
                    }`}
                  >
                    {plan.recommended && (
                      <span className="absolute -top-3 left-6 rounded-full bg-[var(--color-primary-600)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                        Önerilen
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
                      {isCurrent && (
                        <span className="rounded-full bg-[var(--color-primary-600)] px-2.5 py-0.5 text-xs font-medium text-white">
                          Mevcut Plan
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <span className="text-3xl font-bold text-gray-900">{formatCurrency(price)}</span>
                      <span className="text-sm text-gray-400">
                        {plan.id === "free" ? "" : billingCycle === "monthly" ? " /ay" : " /yıl"}
                      </span>
                    </div>

                    {billingCycle === "yearly" && savings > 0 && (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Aylık plana göre %{savings} avantajlı
                      </p>
                    )}

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {plan.id === "free" ? "Özellikler" : "Ek olarak"}
                    </p>

                    <ul className="mt-3 flex-1 space-y-2.5">
                      {plan.addedFeatures.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6">
                      {!userId ? (
                        <Link
                          href="/register"
                          className="block rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-800 transition hover:border-gray-400"
                        >
                          Hesap oluştur
                        </Link>
                      ) : isCurrent ? (
                        <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-center text-sm font-medium text-gray-400">
                          Mevcut planın
                        </div>
                      ) : plan.id === "free" ? (
                        currentPlan === "free" ? (
                          <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-center text-sm text-gray-400">
                            Mevcut planın
                          </div>
                        ) : (
                          <p className="px-1 text-center text-xs text-gray-400">
                            Free&apos;ye dönmek için aboneliğini iptal edebilirsin.
                          </p>
                        )
                      ) : isPaidPlanChange ? (
                        <Link
                          href={`/premium/checkout?plan=${plan.id}&cycle=${billingCycle}&mode=change`}
                          className="block w-full rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
                        >
                          Planı Değiştir
                        </Link>
                      ) : isUpgrade ? (
                        <Link
                          href={`/premium/checkout?plan=${plan.id}&cycle=${billingCycle}`}
                          className="block w-full rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
                        >
                          {plan.id === "pro" ? "Pro'ya Geç" : `${plan.name}'a Geç`}
                        </Link>
                      ) : (
                        <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-center text-sm text-gray-400">
                          Zaten bu özelliklere sahipsin
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-center text-xs text-gray-400">
              Ödeme altyapısı henüz aktif değil. Bugün için tek yol 7 günlük ücretsiz deneme — deneme sonunda otomatik
              ücretlendirme yapılmaz.
            </p>
          </>
        )}
      </main>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Aboneliğinizi iptal etmek istediğinize emin misiniz?</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {status?.expires_at
                ? `Aboneliğiniz ${formatDate(status.expires_at)} tarihinde sona erecek. Bu tarihe kadar ${
                    status.raw_plan === "pro" ? "Pro" : "Plus"
                  } özelliklerini kullanmaya devam edebilirsiniz.`
                : "Bu tarihe kadar mevcut özelliklerini kullanmaya devam edebilirsin."}
            </p>
            {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={actionLoading}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={actionLoading}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "İptal ediliyor..." : "Evet, İptal Et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionManagement({
  role,
  status,
  uiState,
  actionError,
  actionLoading,
  onCancelClick,
  onReactivateClick,
}: {
  role: "client" | "freelancer" | null;
  status: SubscriptionStatus;
  uiState: ReturnType<typeof getSubscriptionUiState>;
  actionError: string;
  actionLoading: boolean;
  onCancelClick: () => void;
  onReactivateClick: () => void;
}) {
  const planDef = getPlanDefinition(role, status.raw_plan === "free" ? "plus" : status.raw_plan);
  const cycle: BillingCycle = status.billing_cycle ?? "monthly";
  const price = getPlanPrice(planDef, cycle);

  const STATE_LABEL: Record<typeof uiState, string> = {
    free: "Free",
    active: "Aktif",
    trial: "Aktif (deneme)",
    canceled_pending: "İptal edildi",
    expired: "Süresi doldu",
  };

  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Abonelik Yönetimi</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            uiState === "expired"
              ? "bg-gray-100 text-gray-500"
              : uiState === "canceled_pending"
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {STATE_LABEL[uiState]}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Mevcut paket" value={uiState === "expired" ? "Free (süresi doldu)" : planDef.name} />
        <Field label="Fatura periyodu" value={status.billing_cycle ? BILLING_LABEL[status.billing_cycle] : "—"} />
        <Field label="Ödeme tutarı" value={uiState === "expired" ? "—" : `${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(price)}${cycle === "monthly" ? "/ay" : "/yıl"}`} />
        <Field label="Abonelik başlangıcı" value={formatDate(status.started_at) ?? "—"} />
        <Field
          label={uiState === "canceled_pending" ? "Sona erme tarihi" : "Sonraki yenileme tarihi"}
          value={formatDate(status.expires_at) ?? "—"}
        />
      </div>

      {uiState === "canceled_pending" && status.expires_at && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          İptal edildi — {formatDate(status.expires_at)} tarihinde sona eriyor. Bu tarihe kadar{" "}
          {status.raw_plan === "pro" ? "Pro" : "Plus"} özelliklerini kullanmaya devam edebilirsin.
        </p>
      )}

      {uiState === "expired" && (
        <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Aboneliğinin süresi doldu, hesabın otomatik olarak Free plana geçti. Geçmiş verilerin (teklifler, analizler,
          profil, projeler, mesajlar) korunuyor.
        </p>
      )}

      {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
        {uiState === "active" || uiState === "trial" ? (
          <>
            <button
              type="button"
              onClick={onCancelClick}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:text-red-600"
            >
              Aboneliği İptal Et
            </button>
            <a
              href="#plan-grid"
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-400"
            >
              Planı Değiştir
            </a>
          </>
        ) : uiState === "canceled_pending" ? (
          <button
            type="button"
            onClick={onReactivateClick}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:opacity-50"
          >
            <Sparkles size={14} />
            {actionLoading ? "İşleniyor..." : "Aboneliği Yeniden Aktifleştir"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
