"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/common/Logo";
import { Button, buttonClasses } from "@/components/ui/Button";
import { OtpInput } from "@/components/auth/OtpInput";

const RESEND_COOLDOWN_SECONDS = 45;
const OTP_LENGTH = 6;

/**
 * `/auth/verify-email` — shared, role-agnostic "confirm your email" gate.
 *
 * Reached from three places:
 *  - `proxy.ts` redirects here when a signed-in user without a confirmed
 *    email tries to open a protected `/client/*` or `/freelancers/*` route.
 *  - `LoginForm` redirects here when sign-in succeeds but the account's
 *    email isn't confirmed yet.
 *  - `app/register/client/page.tsx` and `app/register/freelancer/page.tsx`
 *    redirect here right after `signUp()`, replacing the old separate
 *    `/register/client/verify` and `/register/freelancer/verify` link-based
 *    pages (both now just redirect here for compatibility).
 *
 * Verification uses a 6-digit OTP (`supabase.auth.verifyOtp({ email, token,
 * type: "email" })` — this is the type Supabase's own current JS reference
 * uses for "Verify Signup One-Time Password (OTP)"; `resend()`'s own type
 * enum is separate and still correctly uses "signup") instead of the old
 * confirmation-link flow. The
 * `email` query param is display-only (avoids a loading flash before the
 * real session loads, and lets a not-yet-signed-in visitor see which
 * address the code was sent to). Every verification decision reads the
 * live Supabase Auth user (`auth.getUser()` → `email_confirmed_at`) or the
 * result of `verifyOtp()` itself — never the query string, localStorage, or
 * any other client-editable value. There is no local "verified" flag to
 * flip.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const emailFromQuery = searchParams.get("email") ?? "";

  // E-posta önce query param'dan (refresh sonrası da çalışır, kullanıcıya
  // bağımlı bir tarayıcı state'i değildir), yoksa kayıt akışından kalan
  // localStorage anahtarlarından okunur — bir effect'e gerek kalmadan,
  // lazy initializer ile ilk render'da.
  const [email, setEmail] = useState(() => {
    if (emailFromQuery) return emailFromQuery;

    if (typeof window === "undefined") return "";

    return (
      window.localStorage.getItem("collacrew_signup_email") ||
      window.localStorage.getItem("collacrew_client_signup_email") ||
      ""
    );
  });
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const redirectByRole = useCallback(
    async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.role === "freelancer") {
        router.replace("/register/freelancer/setup");
      } else if (profile?.role === "client") {
        router.replace("/client/dashboard");
      } else {
        // Rol henüz belirlenemiyor — en güvenli seçenek login'e dönmek,
        // bir paneli tahmin etmemek.
        router.replace("/login");
      }
    },
    [router, supabase]
  );

  // Sayfa açılışında: oturum zaten doğrulanmışsa (ör. kod başka bir
  // sekmede/aracıyla zaten doğrulandıysa) doğrudan hedef sayfaya geç.
  useEffect(() => {
    let active = true;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (user?.email) setEmail((current) => current || user.email!);

      if (user?.email_confirmed_at) {
        void redirectByRole(user.id);
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase, redirectByRole]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const runVerification = useCallback(
    async (otpCode: string) => {
      if (!email) {
        setError("E-posta adresi bulunamadı. Lütfen kayıt sayfasına dönüp tekrar dene.");
        return;
      }

      if (otpCode.length !== OTP_LENGTH || verifying) return;

      setVerifying(true);
      setError("");
      setMessage("");

      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          // NOT "signup" — Supabase'in güncel JS referans dokümanı, parola
          // tabanlı signup'ın OTP ile doğrulanması için açıkça "email"
          // kullanıyor ("Verify Signup One-Time Password (OTP)" örneği).
          // "signup", verifyOtp'nin değil, resend()'in kendi (farklı) type
          // enum'unun bir değeri.
          type: "email",
        });

        if (verifyError || !data.user) {
          setError("Doğrulama kodu geçersiz veya süresi dolmuş.");
          setCode("");
          return;
        }

        if (!data.user.email_confirmed_at) {
          // Beklenmez ama savunma amaçlı: verifyOtp başarılı döndü ama
          // e-posta hâlâ onaysız görünüyorsa gerçek durumu göster.
          setError("Doğrulama kodu geçersiz veya süresi dolmuş.");
          setCode("");
          return;
        }

        setMessage("E-posta adresin doğrulandı.");
        await redirectByRole(data.user.id);
      } catch (err) {
        console.error("[verify-email] verifyOtp error:", err);
        setError("Doğrulama kodu geçersiz veya süresi dolmuş.");
        setCode("");
      } finally {
        setVerifying(false);
      }
    },
    [email, supabase, verifying, redirectByRole]
  );

  async function handleResend() {
    if (!email || resending || cooldown > 0) return;

    setResending(true);
    setError("");
    setMessage("");

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (resendError) {
        console.error("[verify-email] resend error:", resendError);
        setError("Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.");
        return;
      }

      setCode("");
      setMessage("Yeni doğrulama kodunu gönderdik.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error("[verify-email] resend unexpected error:", err);
      setError("Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[var(--color-border-subtle)] px-6 py-5 sm:px-10">
        <div className="mx-auto max-w-xl">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-16 text-center sm:px-0">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
          <Mail size={22} />
        </span>

        <h1 className="cc-page-title mt-5 text-[var(--color-text-primary)]">E-postanı doğrula</h1>

        <p className="cc-body mt-3 text-[var(--color-text-secondary)]">
          6 haneli doğrulama kodunu e-posta adresine gönderdik.
        </p>

        {email && (
          <p className="mt-4 text-sm font-medium text-[var(--color-text-primary)]" data-testid="verify-email-address">
            {email}
          </p>
        )}

        <div className="mt-7">
          <OtpInput
            length={OTP_LENGTH}
            value={code}
            onChange={setCode}
            onComplete={(value) => void runVerification(value)}
            disabled={verifying}
          />
        </div>

        {message && (
          <div className="mx-auto mt-5 flex max-w-sm items-start gap-2.5 rounded-[var(--radius-input)] border border-[var(--color-success-600)]/20 bg-[var(--color-success-50)] px-4 py-3 text-left">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-success-600)]" />
            <p className="text-sm leading-5 text-[var(--color-success-600)]">{message}</p>
          </div>
        )}

        {error && (
          <div className="mx-auto mt-5 max-w-sm rounded-[var(--radius-input)] border border-red-200 bg-[var(--color-error-50)] px-4 py-3 text-sm leading-5 text-[var(--color-error-600)]">
            {error}
          </div>
        )}

        <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3">
          <Button
            type="button"
            size="lg"
            loading={verifying}
            disabled={code.length !== OTP_LENGTH}
            onClick={() => void runVerification(code)}
          >
            {verifying ? "Doğrulanıyor..." : "Doğrula"}
          </Button>

          <p className="text-sm text-[var(--color-text-secondary)]">Kodu almadın mı?</p>

          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resending || cooldown > 0 || !email}
            className={buttonClasses({ variant: "secondary", size: "lg" })}
          >
            {resending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Gönderiliyor...
              </>
            ) : cooldown > 0 ? (
              <>
                <RefreshCw size={15} />
                {`${cooldown} saniye sonra tekrar gönderebilirsin.`}
              </>
            ) : (
              <>
                <RefreshCw size={15} />
                Tekrar gönder
              </>
            )}
          </button>

          <Link href="/login" className={buttonClasses({ variant: "ghost", size: "lg" })}>
            Giriş sayfasına dön
          </Link>
        </div>
      </main>
    </div>
  );
}
