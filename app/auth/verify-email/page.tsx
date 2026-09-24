"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/common/Logo";
import { Button, buttonClasses } from "@/components/ui/Button";

/**
 * `/auth/verify-email` — shared, role-agnostic "confirm your email" gate.
 *
 * Reached from two places:
 *  - `proxy.ts` redirects here when a signed-in user without a confirmed
 *    email tries to open a protected `/client/*` or `/freelancers/*` route.
 *  - `LoginForm` redirects here when sign-in succeeds but the account's
 *    email isn't confirmed yet.
 *
 * The `email` query param is display-only (avoids a loading flash before
 * the real session loads). Every verification decision here reads the
 * live Supabase Auth user (`auth.getUser()` → `email_confirmed_at`) —
 * never the query string, localStorage, or any other client-editable
 * value. There is no local "verified" flag to flip.
 *
 * This does not replace the two signup-flow verify pages
 * (`/register/client/verify`, `/register/freelancer/verify`), which cover
 * the immediately-after-signup UX inside each register flow's own
 * stepper/branding. This page covers the *returning, already-registered*
 * case: someone lands on a protected page or logs in before confirming.
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

  const [email, setEmail] = useState(emailFromQuery);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const redirectToDashboard = useCallback(
    async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.role === "freelancer") {
        router.replace("/freelancers/dashboard");
      } else if (profile?.role === "client") {
        router.replace("/client/dashboard");
      } else {
        // Role not resolvable yet — safest is to send back to login rather
        // than guess a panel the account may not belong to.
        router.replace("/login");
      }
    },
    [router, supabase]
  );

  // On load: if the session is already confirmed (e.g. user verified in
  // another tab, then came back here), skip straight to their dashboard.
  useEffect(() => {
    let active = true;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (user?.email) setEmail(user.email);

      if (user?.email_confirmed_at) {
        void redirectToDashboard(user.id);
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase, redirectToDashboard]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleCheckVerification() {
    setChecking(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Oturum bulunamadı. Lütfen tekrar giriş yap.");
        return;
      }

      if (!user.email_confirmed_at) {
        setError("E-posta adresin henüz doğrulanmamış. Önce e-postandaki bağlantıyı kullan.");
        return;
      }

      setMessage("E-posta adresin doğrulandı. Yönlendiriliyorsun...");
      await redirectToDashboard(user.id);
    } catch (err) {
      console.error("[verify-email] check error:", err);
      setError("Doğrulama kontrol edilirken bir sorun oluştu. Lütfen tekrar dene.");
    } finally {
      setChecking(false);
    }
  }

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
        setError("Doğrulama maili gönderilemedi. Lütfen birkaç dakika sonra tekrar deneyin.");
        return;
      }

      setMessage("Doğrulama maili tekrar gönderildi.");
      setCooldown(30);
    } catch (err) {
      console.error("[verify-email] resend unexpected error:", err);
      setError("Doğrulama maili gönderilemedi. Lütfen birkaç dakika sonra tekrar deneyin.");
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
          CollaCrew hesabını kullanmaya devam etmek için e-posta adresini doğrulaman gerekiyor.
        </p>

        {email && (
          <p className="mt-4 text-sm font-medium text-[var(--color-text-primary)]" data-testid="verify-email-address">
            {email}
          </p>
        )}

        <p className="cc-body-sm mt-5 text-[var(--color-text-muted)]">
          Mail kutunu kontrol et. Doğrulama bağlantısını bulamazsan spam klasörünü de kontrol et.
        </p>

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
          <Button type="button" size="lg" loading={checking} onClick={() => void handleCheckVerification()}>
            {checking ? "Kontrol ediliyor..." : "Kontrol ettim"}
          </Button>

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
                Tekrar gönder ({cooldown})
              </>
            ) : (
              <>
                <RefreshCw size={15} />
                Doğrulama mailini tekrar gönder
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
