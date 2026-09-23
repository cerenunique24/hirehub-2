"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CreditCard, Check, ShieldCheck, Clock3, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchSubscriptionStatus,
  startPlanTrial,
  changePlan,
  getSubscriptionUiState,
  PLAN_RANK,
  type SubscriptionStatus,
  type PlanTier,
  type BillingCycle,
} from "@/lib/premium";
import { getPlanDefinition, getPlanPrice } from "@/lib/plans";

function formatCurrency(value: number) {
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

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const requestedPlan = searchParams.get("plan");
  const requestedCycle = searchParams.get("cycle");
  const isChangeMode = searchParams.get("mode") === "change";

  const targetPlan: Exclude<PlanTier, "free"> = requestedPlan === "pro" ? "pro" : "plus";
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    requestedCycle === "yearly" ? "yearly" : "monthly"
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"client" | "freelancer" | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const [{ data: profile }, subscription] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        fetchSubscriptionStatus(supabase),
      ]);

      setRole((profile?.role as "client" | "freelancer") ?? null);
      setStatus(subscription);
      setLoading(false);
    }

    void load();
  }, [supabase]);

  const planDef = getPlanDefinition(role, targetPlan);
  const price = getPlanPrice(planDef, billingCycle);
  const currentPlan: PlanTier = status?.plan ?? "free";
  const uiState = status ? getSubscriptionUiState(status) : "free";
  const alreadyHasAccess =
    PLAN_RANK[currentPlan] >= PLAN_RANK[targetPlan] &&
    !(currentPlan === targetPlan && status?.billing_cycle !== billingCycle);

  /*
   * "Planı Değiştir" akışı: kullanıcının zaten aktif bir plus/pro
   * aboneliği var — bu durumda start_plan_trial (tek seferlik, yeni
   * kullanıcı) yerine change_plan (mevcut aboneliği güncelleme)
   * çağrılır. trial_used'a dokunmaz.
   */
  const canChangePlan =
    isChangeMode && currentPlan !== "free" && (uiState === "active" || uiState === "trial");

  async function handleConfirm() {
    setStarting(true);
    setError("");

    const { error: actionError } = canChangePlan
      ? await changePlan(supabase, targetPlan, billingCycle)
      : await startPlanTrial(supabase, targetPlan, billingCycle);

    if (actionError) {
      setError(actionError.message || "İşlem tamamlanamadı.");
      setStarting(false);
      return;
    }

    setSuccess(true);
    setStarting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Yükleniyor...</div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-gray-600">Checkout&apos;a devam etmek için giriş yapmalısın.</p>
        <Link href="/login" className="rounded-xl bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-medium text-white">
          Giriş Yap
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5 sm:px-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/premium" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft size={15} />
            Paketlere dön
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 sm:px-10">
        <h1 className="text-2xl font-bold text-gray-900">Satın Alma Özeti</h1>

        {/* MEVCUT ABONELİK BAĞLAMI — plan değiştirme akışında */}
        {currentPlan !== "free" && status && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <Clock3 size={15} className="shrink-0 text-gray-400" />
            Mevcut aboneliğin:{" "}
            <span className="font-medium text-gray-900">
              {getPlanDefinition(role, status.raw_plan === "free" ? "plus" : status.raw_plan).name}{" "}
              {status.billing_cycle ? BILLING_LABEL[status.billing_cycle] : ""}
            </span>
            {status.expires_at && <> — {formatDate(status.expires_at)} tarihine kadar aktif</>}
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
          {/* SUMMARY */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {role === "client" ? "Client" : "Freelancer"} paketi {canChangePlan && "— Planı Değiştir"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">{planDef.name}</h2>
              </div>
              <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                    billingCycle === "monthly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  Aylık
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                    billingCycle === "yearly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  Yıllık
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
              <span className="text-gray-500">
                {planDef.name} — {billingCycle === "monthly" ? "aylık" : "yıllık"}
              </span>
              <span className="font-medium text-gray-900">{formatCurrency(price)}</span>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="font-semibold text-gray-900">Toplam</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(price)}
                <span className="text-sm font-normal text-gray-400">{billingCycle === "monthly" ? "/ay" : "/yıl"}</span>
              </span>
            </div>

            {/* PAYMENT METHOD — no provider connected */}
            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <CreditCard size={16} />
                Ödeme yöntemi
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Bu ortamda kart ile ödemeyi işleyecek bir ödeme sağlayıcısı (ör. Stripe, iyzico) henüz bağlı değil.
                Kart bilgilerin hiçbir zaman bu sistemde saklanmaz — bağlandığında ödeme sağlayıcının kendi güvenli
                checkout ekranına yönlendirileceksin.
              </p>
              <button
                type="button"
                disabled
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-200 px-4 py-3 text-sm font-medium text-gray-500"
              >
                Kart ile Öde — Şu anda kullanılamıyor
              </button>
            </div>

            {/* TRIAL / PLAN CHANGE — the only real, working path today */}
            <div className="mt-4 rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Clock3 size={16} />
                {canChangePlan ? "Planı Değiştir" : "7 Gün Ücretsiz Dene"}
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {canChangePlan
                  ? `Ödeme altyapısı hazır olana kadar, mevcut aboneliğini değiştirmen ücretsizdir. Dönemin kalan süresi (${
                      formatDate(status?.expires_at ?? null) ?? "mevcut bitiş tarihi"
                    }) korunur.`
                  : `Ödeme altyapısı hazır olana kadar ${planDef.name} paketini 7 gün ücretsiz deneyebilirsin. Deneme sonunda otomatik ücretlendirme yapılmaz, kart bilgisi istenmez.`}
              </p>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">İşlem tamamlanamadı</p>
                    <p className="mt-0.5 text-xs text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {success ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <Check size={16} />
                  {canChangePlan
                    ? `Paketin ${planDef.name} (${BILLING_LABEL[billingCycle]}) olarak güncellendi.`
                    : `7 günlük ${planDef.name} denemen başladı.`}
                </div>
              ) : canChangePlan ? (
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={starting}
                  className="mt-4 w-full rounded-xl bg-[var(--color-primary-600)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:opacity-50"
                >
                  {starting ? "Güncelleniyor..." : `${planDef.name} (${BILLING_LABEL[billingCycle]}) olarak değiştir`}
                </button>
              ) : alreadyHasAccess ? (
                <p className="mt-4 text-sm text-gray-500">Zaten bu paketin özelliklerine sahipsin.</p>
              ) : status?.trial_used ? (
                <p className="mt-4 text-sm text-gray-500">Deneme hakkın daha önce kullanılmış.</p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={starting}
                  className="mt-4 w-full rounded-xl bg-[var(--color-primary-600)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:opacity-50"
                >
                  {starting ? "Başlatılıyor..." : `7 Gün Ücretsiz ${planDef.name} Dene`}
                </button>
              )}
            </div>
          </div>

          {/* TRUST / INFO SIDEBAR */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <ShieldCheck size={16} />
                Güvenlik
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Kart bilgileri hiçbir zaman kendi veritabanımızda saklanmaz. Ödeme yalnızca bağlandığında, PCI
                uyumlu bir sağlayıcının kendi checkout ekranı üzerinden alınır.
              </p>
            </div>
            {success && (
              <button
                type="button"
                onClick={() => router.push("/premium")}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400"
              >
                Paketime dön
              </button>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function PremiumCheckoutPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Yükleniyor...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
