/**
 * Sunucuya özel imza sırrı — Supabase service_role anahtarı DEĞİLDİR.
 *
 * Sadece `get_project_budget_breakdown()` RPC'sinin "bu çağrı bizim kendi
 * Next.js sunucumuzdan geliyor" ayrımını yapabilmesi için var (bkz.
 * supabase/migrations/202609300006_budget_breakdown_privacy.sql). Değeri
 * yalnızca `.env.local`'da durur, asla `NEXT_PUBLIC_*` olarak tanımlanmaz,
 * dolayısıyla tarayıcıya hiçbir şekilde ulaşmaz. Bu dosya SADECE sunucu
 * tarafı kod (route handler / server component / lib içindeki sunucu
 * fonksiyonları) içinden import edilmelidir — bir "use client" bileşeninden
 * import edilirse build zaten `process.env` değerini `undefined` bırakır.
 */
export function getServerSigningSecret(): string | undefined {
  return process.env.COLLACREW_SERVER_SIGNING_SECRET;
}
