"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import RememberSection from "./RememberSection";
import SocialLogin from "./SocialLogin";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        /*
         * Supabase Auth, e-postası doğrulanmamış bir hesapla giriş
         * denendiğinde kendi tarafında `email_not_confirmed` hatasıyla
         * sign-in'i zaten reddediyor (session hiç oluşturulmuyor). Bu,
         * ham İngilizce bir hata metni olarak kullanıcıya gösterilmemeli —
         * bunun yerine aynı doğrulama ekranına yönlendiriyoruz.
         */
        const code = (loginError as { code?: string }).code;
        const isUnconfirmed =
          code === "email_not_confirmed" || /not confirmed/i.test(loginError.message);

        if (isUnconfirmed) {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`);
          return;
        }

        setError(
          loginError.message === "Invalid login credentials"
            ? "E-posta veya şifre hatalı."
            : "Giriş yapılamadı. Lütfen tekrar dene."
        );
        return;
      }

      if (!data.user) {
        setError("Giriş yapılamadı. Lütfen tekrar dene.");
        return;
      }

      if (remember) {
        localStorage.setItem("remember_login", "true");
      } else {
        localStorage.removeItem("remember_login");
      }

      // Supabase Auth'un kendi, sunucu tarafında doğrulanan alanı — sahte
      // bir "verified" bayrağı değil. Doğrulanmamışsa hesabın rolüne bakmadan
      // önce burada durur.
      if (!data.user.email_confirmed_at) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.user.email ?? email.trim())}`);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("Kullanıcı profili bulunamadı.");
        return;
      }

      const next = searchParams.get("next");

      if (profile.role === "freelancer") {
        router.push(next && next.startsWith("/freelancers") ? next : "/freelancers/dashboard");
      } else if (profile.role === "client") {
        router.push(next && next.startsWith("/client") ? next : "/client/dashboard");
      } else {
        setError("Kullanıcı rolü tanımlanamıyor.");
      }
    } catch {
      setError("Giriş sırasında beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">E-posta</label>

        <Input
          type="email"
          placeholder="mail@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">Şifre</label>

        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />

          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <RememberSection checked={remember} setChecked={setRemember} />

      {error && <p className="text-sm text-[var(--color-error-600)]">{error}</p>}

      <Button type="submit" size="lg" disabled={loading} className="w-full">
        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
      </Button>

      <SocialLogin />
    </form>
  );
}
