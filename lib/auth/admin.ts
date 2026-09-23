import { redirect } from "next/navigation";

import { requireSession, type AuthedSession } from "./session";

/**
 * Server Component / layout guard — admin alanı.
 *
 * `requireSession()` ile aynı oturum kontrolünü yapar, ardından
 * `public.admin_users` tablosuna karşı ek bir kontrol ekler. Bu tablo
 * ve buna dayanan `private.is_admin()` fonksiyonu zaten Supabase'de
 * mevcuttu (bkz. support_tickets RLS politikaları) — burada sadece
 * uygulama tarafında da aynı kontrol uygulanıyor.
 *
 * Admin olmayan (ama oturumu geçerli) bir kullanıcı `/admin` altına
 * gelirse kendi paneline yönlendirilir.
 */
export async function requireAdminSession(): Promise<AuthedSession> {
  const session = await requireSession();

  const { data: adminRow } = await session.supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!adminRow) {
    redirect(session.role === "freelancer" ? "/freelancers/dashboard" : "/client/dashboard");
  }

  return session;
}
