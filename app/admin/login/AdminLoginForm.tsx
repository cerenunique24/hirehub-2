"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function AdminLoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      if (loginError || !data.user) {
        setError(
          loginError?.message === "Invalid login credentials"
            ? "E-posta veya şifre hatalı."
            : loginError?.message || "Giriş yapılamadı."
        );
        return;
      }

      // Admin yetkisinin TEK doğruluk kaynağı `admin_users` tablosudur.
      // RLS "Admins can view own admin record" politikası bu sorgunun
      // sadece kullanıcının kendi satırını görmesine izin verir.
      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!adminRow) {
        // Bu kullanıcı geçerli bir Supabase Auth hesabına sahip olabilir
        // (ör. bir freelancer/client) ama admin değildir — admin login
        // formu üzerinden açılmış bu oturumu burada bırakmıyoruz.
        await supabase.auth.signOut();
        setError("Admin yetkiniz bulunmuyor.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Giriş sırasında beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#111111]">E-posta</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@collacrew.com"
          className="h-10 w-full border border-[#e5e7eb] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#111111]">Şifre</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="h-10 w-full border border-[#e5e7eb] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#2563EB]"
        />
      </div>

      {error && <p className="text-sm text-[#DC2626]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="h-10 w-full bg-[#111111] text-sm font-medium text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}
