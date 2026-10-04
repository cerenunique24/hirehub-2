/**
 * Marketplace'te kullanıcılar birbirine SADECE ilk adla gösterilir —
 * soyisim hiçbir karşı-taraf ekranında (kartlar, mesajlaşma, bildirimler,
 * ekip/coalition, uyuşmazlık, değerlendirme, admin dışı listeler) görünmez.
 * Bu, kullanıcıların birbirini platform dışında (Google/LinkedIn/Instagram)
 * bulmasını zorlaştırmak içindir.
 *
 * Gerçek ad+soyad backend'de saklanır; `profiles.last_name` sütununun genel
 * SELECT erişimi veritabanı seviyesinde de kapatılmıştır (bkz.
 * supabase/migrations/202609300012_surname_privacy.sql) — bu yalnızca bir
 * UI kuralı değildir. Kullanıcının KENDİ profili (get_my_full_profile) ve
 * admin (admin_get_profile_names / admin_list_profiles) tam adı görebilir.
 */
export function publicDisplayName(
  profile: { first_name?: string | null; last_name?: string | null } | null | undefined,
  fallback = "Kullanıcı"
): string {
  const first = profile?.first_name?.trim();
  return first || fallback;
}

/** Admin ekranları veya kullanıcının kendi profili için tam ad. */
export function fullDisplayName(
  profile: { first_name?: string | null; last_name?: string | null } | null | undefined,
  fallback = "Kullanıcı"
): string {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  return name || fallback;
}

/** Yalnızca ilk harf — avatar baş harfi gibi kullanımlar için. */
export function displayInitial(
  profile: { first_name?: string | null } | null | undefined
): string {
  return (profile?.first_name?.trim()?.[0] ?? "?").toUpperCase();
}
