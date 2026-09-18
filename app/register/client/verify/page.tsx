"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ClientVerifyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const storedEmail = localStorage.getItem(
      "collacrew_client_signup_email"
    );

    if (storedEmail) {
      setEmail(storedEmail);
    }

    checkVerification();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  async function checkVerification() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email_confirmed_at) {
      router.replace("/client/dashboard");
      return;
    }

    setLoading(false);
  }

  async function resendEmail() {
    if (!email || resending || cooldown > 0) return;

    setResending(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/client/dashboard`,
      },
    });

    if (error) {
      setErrorMessage(
        "Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin."
      );
    } else {
      setMessage(
        "Doğrulama e-postası tekrar gönderildi."
      );
      setCooldown(30);
    }

    setResending(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <div className="min-h-screen grid lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden lg:flex bg-black text-white p-12 xl:p-16 flex-col justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">
              CollaCrew
            </div>

            <div className="mt-24 max-w-md">
              <p className="text-sm text-white/50 mb-5">
                Müşteri hesabı
              </p>

              <h1 className="text-5xl xl:text-6xl font-semibold tracking-tight leading-[1.02]">
                Bir adım daha.
              </h1>

              <p className="mt-7 text-white/60 text-base leading-7 max-w-sm">
                E-posta adresini doğrula ve CollaCrew
                hesabını oluşturmaya devam et.
              </p>
            </div>
          </div>

          <div className="text-sm text-white/40">
            © {new Date().getFullYear()} CollaCrew
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="flex items-center gap-2 text-xs font-medium text-black/40 mb-5">
                <span>01</span>
                <span>/</span>
                <span className="text-black">03</span>
                <span className="ml-2">
                  E-posta doğrulama
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-black/5 p-8 sm:p-10 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-black/[0.04] flex items-center justify-center">
                <Mail size={25} />
              </div>

              <h2 className="mt-7 text-3xl font-semibold tracking-tight">
                E-postanı doğrula
              </h2>

              <p className="mt-3 text-black/50 leading-6">
                {email ? (
                  <>
                    <span className="text-black font-medium">
                      {email}
                    </span>{" "}
                    adresine bir doğrulama bağlantısı
                    gönderdik.
                  </>
                ) : (
                  "E-posta adresine bir doğrulama bağlantısı gönderdik."
                )}
              </p>

              <div className="mt-8 rounded-2xl bg-black/[0.03] p-4">
                <div className="flex gap-3">
                  <CheckCircle2
                    size={20}
                    className="shrink-0 mt-0.5"
                  />

                  <div>
                    <p className="text-sm font-medium">
                      Gelen kutunu kontrol et
                    </p>

                    <p className="mt-1 text-xs text-black/45 leading-5">
                      E-postadaki doğrulama bağlantısına
                      tıklayarak hesabını aktifleştirebilirsin.
                    </p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-black/50">
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Doğrulama kontrol ediliyor...
                </div>
              ) : (
                <button
                  type="button"
                  onClick={checkVerification}
                  className="mt-8 w-full h-12 rounded-xl bg-black text-white font-medium flex items-center justify-center gap-2 hover:bg-black/90 transition"
                >
                  Doğrulamayı kontrol et
                </button>
              )}

              <button
                type="button"
                onClick={resendEmail}
                disabled={
                  !email ||
                  resending ||
                  cooldown > 0
                }
                className="mt-4 w-full h-12 rounded-xl border border-black/10 bg-white font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/[0.02] transition"
              >
                {resending ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Gönderiliyor...
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <RefreshCw size={17} />
                    Tekrar gönder ({cooldown})
                  </>
                ) : (
                  <>
                    <RefreshCw size={17} />
                    Doğrulama e-postasını tekrar gönder
                  </>
                )}
              </button>

              {message && (
                <p className="mt-4 text-sm text-green-600 text-center">
                  {message}
                </p>
              )}

              {errorMessage && (
                <p className="mt-4 text-sm text-red-500 text-center">
                  {errorMessage}
                </p>
              )}

              <p className="mt-7 text-xs text-black/35 text-center leading-5">
                E-postayı göremiyorsan spam veya gereksiz
                klasörünü kontrol et.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
