"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Clock3,
  Filter,
  Heart,
  MessageCircle,
  Radar,
  Sparkles,
  UserSearch,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchSubscriptionStatus, startPremiumTrial, type SubscriptionStatus } from "@/lib/premium";

const FREELANCER_FEATURES = [
  { icon: Clock3, text: "Yeni projeleri 48 saat erken gör" },
  { icon: MessageCircle, text: "Teklif göndermeden önce client'a mesaj at" },
  { icon: Radar, text: "Gelişmiş proje eşleşmeleri" },
  { icon: Sparkles, text: "\"Neden bu projeyle eşleştim?\" AI açıklaması" },
  { icon: UserSearch, text: "Profil AI analizi ve geliştirme önerileri" },
  { icon: Filter, text: "Gelişmiş proje/freelancer filtreleri" },
  { icon: Heart, text: "Favoriler" },
  { icon: BarChart3, text: "Teklif ve performans analizleri" },
];

const CLIENT_FEATURES = [
  { icon: Sparkles, text: "Daha detaylı AI proje analizi" },
  { icon: Radar, text: "Daha detaylı rol ve uzmanlık analizi" },
  { icon: Users, text: "AI destekli ekip oluşturma önerileri" },
  { icon: UserSearch, text: "Gelişmiş freelancer matching" },
  { icon: MessageCircle, text: "Teklif öncesi freelancer'larla iletişim" },
  { icon: BarChart3, text: "Gelişmiş freelancer karşılaştırma" },
  { icon: Filter, text: "Gelişmiş filtreleme ve proje analiz geçmişi" },
  { icon: Clock3, text: "Daha fazla aktif proje ve öncelikli destek" },
];

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export default function PremiumPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"client" | "freelancer" | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  async function handleStartTrial() {
    if (!userId) return;
    setStarting(true);
    setError("");
    setMessage("");

    const { error: trialError } = await startPremiumTrial(supabase);

    if (trialError) {
      setError(trialError.message || "Deneme başlatılamadı.");
      setStarting(false);
      return;
    }

    const refreshed = await fetchSubscriptionStatus(supabase);
    setStatus(refreshed);
    setMessage("7 günlük ücretsiz Premium denemen başladı.");
    setStarting(false);
  }

  const isPremium = status?.plan === "premium";
  const dashboardHref = role === "freelancer" ? "/freelancers/dashboard" : "/client/dashboard";

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5 sm:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
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

      <main className="mx-auto max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
            <Sparkles size={20} />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-gray-900 sm:text-4xl">CollaCrew Premium</h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            Projeleri daha iyi anlamak, doğru insanlara daha hızlı ulaşmak ve CollaCrew&apos;un gelişmiş araçlarından
            yararlanmak için.
          </p>
        </div>

        {/* STATUS (authenticated) */}
        {!loading && userId && (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center">
            {isPremium ? (
              <>
                <p className="text-sm font-semibold text-emerald-700">
                  Premium {status?.status === "trial" ? "deneme sürümün" : "üyeliğin"} aktif
                </p>
                {status?.expires_at && (
                  <p className="mt-1 text-xs text-gray-500">{formatDate(status.expires_at)} tarihine kadar geçerli.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-600">Şu anda Ücretsiz plandasın.</p>
            )}
          </div>
        )}

        {/* FEATURE GRID */}
        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Freelancer için</h2>
            <ul className="mt-4 space-y-3">
              {FREELANCER_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <Icon size={13} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Client için</h2>
            <ul className="mt-4 space-y-3">
              {CLIENT_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <Icon size={13} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* PRICING */}
        <div className="mt-16 rounded-3xl border border-gray-200 p-8 text-center sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tek Plan</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">CollaCrew Premium</h2>
          <p className="mt-2 text-4xl font-bold text-gray-900">
            ₺149<span className="text-base font-medium text-gray-400"> /ay</span>
          </p>
          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <Check size={15} className="text-emerald-600" /> Rolüne özel tüm Premium özellikler
            </li>
            <li className="flex items-center gap-2">
              <Check size={15} className="text-emerald-600" /> Gelişmiş AI analiz ve eşleşme
            </li>
            <li className="flex items-center gap-2">
              <Check size={15} className="text-emerald-600" /> Öncelikli destek
            </li>
          </ul>

          <div className="mt-8">
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            {message && <p className="mb-3 text-sm text-emerald-700">{message}</p>}

            {!userId ? (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Kullanmak için önce hesap oluştur
                </Link>
                <p className="mt-3 text-xs text-gray-400">Hesap oluşturduktan sonra 7 gün ücretsiz deneyebilirsin.</p>
              </>
            ) : isPremium ? (
              <p className="text-sm text-gray-500">Zaten Premium&apos;dasın — teşekkürler!</p>
            ) : status?.trial_used ? (
              <p className="text-sm text-gray-500">
                Deneme hakkın kullanıldı. Ödeme altyapısı hazır olduğunda buradan yeniden abone olabileceksin.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleStartTrial()}
                  disabled={starting}
                  className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
                >
                  {starting ? "Başlatılıyor..." : "7 Gün Ücretsiz Dene"}
                </button>
                <p className="mt-3 text-xs text-gray-400">
                  Ödeme altyapısı henüz aktif değil — deneme süresi sonunda otomatik ücretlendirme yapılmaz.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
