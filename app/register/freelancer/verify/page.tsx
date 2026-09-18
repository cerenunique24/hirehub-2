"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function VerifyAccount() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedEmail = localStorage.getItem(
      "collacrew_signup_email"
    );

    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function checkVerification() {
    setChecking(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          "Henüz doğrulanmış bir oturum bulunamadı. E-postandaki doğrulama bağlantısına tıkladığından emin ol."
        );
        return;
      }

      if (!user.email_confirmed_at) {
        setError(
          "E-posta adresin henüz doğrulanmamış. Önce e-postandaki doğrulama bağlantısını kullan."
        );
        return;
      }

      setMessage(
        "E-posta adresin doğrulandı. Profilini oluşturmaya geçiyoruz."
      );

      window.setTimeout(() => {
        router.push("/register/freelancer/setup");
      }, 700);
    } catch {
      setError(
        "Doğrulama kontrol edilirken bir sorun oluştu. Lütfen tekrar dene."
      );
    } finally {
      setChecking(false);
    }
  }

  async function resendEmail() {
    if (!email) {
      setError(
        "Kayıt sırasında kullandığın e-posta adresi bulunamadı."
      );
      return;
    }

    if (cooldown > 0 || resending) {
      return;
    }

    setResending(true);
    setError("");
    setMessage("");

    try {
      const { error: resendError } =
        await supabase.auth.resend({
          type: "signup",
          email,
          options: {
            emailRedirectTo:
              `${window.location.origin}/auth/callback?next=/register/freelancer/setup`,
          },
        });

      if (resendError) {
        setError(
          "Doğrulama e-postası tekrar gönderilemedi. " +
            resendError.message
        );
        return;
      }

      setMessage(
        "Doğrulama e-postası tekrar gönderildi. Gelen kutunu kontrol et."
      );

      setCooldown(30);
    } catch {
      setError(
        "E-posta gönderilirken bir sorun oluştu. Lütfen tekrar dene."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center sm:min-h-[calc(100vh-5rem)]">
        <div className="w-full overflow-hidden rounded-[28px] bg-white shadow-[0_20px_70px_rgba(0,0,0,0.08)] sm:rounded-[32px]">

          {/* ÜST BÖLÜM */}
          <div className="p-6 sm:p-10 lg:p-12">

            {/* LOGO + ADIM */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-sm font-bold text-white">
                C
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                  Adım 2 / 3
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  E-posta doğrulama
                </p>
              </div>
            </div>

            {/* PROGRESS */}
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full w-2/3 rounded-full bg-black transition-all" />
            </div>

            {/* İKON */}
            <div className="mt-10 flex justify-center">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-gray-100">
                <Mail
                  size={38}
                  strokeWidth={1.7}
                  className="text-gray-900"
                />

                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-black text-white">
                  <Check size={14} strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* BAŞLIK */}
            <div className="mt-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-[34px]">
                E-postanı doğrula
              </h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-500">
                Hesabını aktifleştirmek için doğrulama
                bağlantısını e-posta adresine gönderdik.
              </p>
            </div>

            {/* E-POSTA */}
            <div className="mx-auto mt-7 max-w-md rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                Doğrulama gönderilen adres
              </p>

              <p className="mt-2 break-all text-center text-sm font-semibold text-gray-900">
                {email || "E-posta adresin"}
              </p>
            </div>

            {/* MESAJ */}
            {message && (
              <div className="mx-auto mt-5 flex max-w-md items-start gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-left">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <p className="text-sm leading-5 text-green-700">
                  {message}
                </p>
              </div>
            )}

            {/* HATA */}
            {error && (
              <div className="mx-auto mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-600">
                {error}
              </div>
            )}

            {/* ANA BUTON */}
            <button
              type="button"
              onClick={checkVerification}
              disabled={checking}
              className="mx-auto mt-7 flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-black px-6 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checking ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Kontrol ediliyor...
                </>
              ) : (
                <>
                  Doğrulamayı kontrol et
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            {/* TEKRAR GÖNDER */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={resendEmail}
                disabled={
                  resending ||
                  cooldown > 0 ||
                  !email
                }
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {resending ? (
                  <>
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                    E-posta gönderiliyor...
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <RefreshCw size={15} />
                    Tekrar göndermek için {cooldown} sn
                  </>
                ) : (
                  <>
                    <RefreshCw size={15} />
                    Doğrulama e-postasını tekrar gönder
                  </>
                )}
              </button>
            </div>

            {/* BİLGİ */}
            <div className="mx-auto mt-8 max-w-md border-t border-gray-100 pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Mail size={14} className="text-gray-600" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-800">
                    E-posta gelmedi mi?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Gelen kutunun yanı sıra Spam veya Gereksiz
                    klasörünü de kontrol et. E-postanın gelmesi
                    birkaç dakika sürebilir.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* ALT BİLGİ */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center sm:px-10">
            <p className="text-xs text-gray-400">
              E-posta adresini doğruladıktan sonra profesyonel
              profilini oluşturabileceksin.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}