/**
 * Platform-dışı iletişim/ödeme bilgisi tespiti — API route'lar için.
 *
 * Bu, `private.contains_contact_info()` (Postgres, bkz. migration
 * contact_info_leak_prevention) ile AYNI kuralların JS karşılığıdır.
 * Nihai/otoriter kontrol veritabanı trigger'ındadır (messages.content,
 * proposals.cover_letter, profiles.bio, projects.description,
 * project_milestones.deliverable_description/revision_notes,
 * support_ticket_messages.message üzerinde) — o katman, bu dosyanın
 * kapsamadığı doğrudan client-side insert/update yollarını da kapsar.
 *
 * Bu dosya sadece daha iyi bir kullanıcı deneyimi için var: DB'ye hiç
 * gitmeden, API route içinde erken ve temiz bir Türkçe hata döndürmek.
 * Regex'ler DB tarafındakiyle kasıtlı olarak birebir aynı tutulmalı —
 * biri değişirse diğeri de güncellenmeli.
 */

const KEYWORD_PATTERN =
  /(whatsapp|\bwa['’]?(dan|tan)\b|telegram|\bsignal\b|\bdiscord\b|\bskype\b|\biban\b|\beft\b|\bhavale\b|\bpapara\b|\bwise\b|\brevolut\b|kripto\s*(cüzdan|para)|crypto\s*wallet|\binstagram\b|\bfacebook\b|\blinkedin\b|mailden\s*ulaş|mail\s*adresim|e[\s-]?posta(m|mı)?\s*(profil|adres)|özelden\s*(at|yaz|gönder)|numaramı|numara(nı|yı)?\s*(bırak|paylaş|at|ver)|\bcep\s*telefon)/i;

const EMAIL_PATTERN =
  /[a-z0-9._%+-]+\s*(@|\(\s*at\s*\)|\[\s*at\s*\])\s*[a-z0-9.-]+\s*(\.|\(\s*dot\s*\)|\s+nokta\s+)\s*[a-z]{2,}/i;

const IBAN_CANDIDATE_PATTERN = /tr[0-9 .-]{20,32}/gi;
const PHONE_CANDIDATE_PATTERN = /[0-9][0-9 .-]{7,28}[0-9]/g;

// Genel URL yasağı yok (meşru teslim linklerini kırar) — sadece
// bilinen platform-dışı iletişim/ödeme yönlendirme domain'leri.
const OFF_PLATFORM_URL_PATTERN =
  /(https?:\/\/)?(www\.)?(wa\.me|t\.me|api\.whatsapp\.com|chat\.whatsapp\.com|discord\.gg|paypal\.me|payp\.al|buymeacoffee\.com|ko-fi\.com|streamelements\.com\/tip)/i;

export const CONTACT_INFO_MESSAGE =
  "Bu bilgi CollaCrew üzerinden paylaşılmaz. Telefon, e-posta, IBAN veya platform dışı iletişim/ödeme bilgisi paylaşımı desteklenmez.";

export function containsContactInfo(input: string | null | undefined): boolean {
  if (!input || !input.trim()) return false;

  const normalized = input.toLowerCase();

  if (KEYWORD_PATTERN.test(normalized)) return true;
  if (EMAIL_PATTERN.test(normalized)) return true;
  if (OFF_PLATFORM_URL_PATTERN.test(normalized)) return true;

  for (const match of normalized.matchAll(IBAN_CANDIDATE_PATTERN)) {
    const digits = match[0].replace(/[^0-9]/g, "");
    if (digits.length >= 24) return true;
  }

  for (const match of normalized.matchAll(PHONE_CANDIDATE_PATTERN)) {
    const digits = match[0].replace(/[^0-9]/g, "");
    const isLocal = (digits.length === 10 || digits.length === 11) && (digits[0] === "0" || digits[0] === "5");
    const isIntl = (digits.length === 11 || digits.length === 12) && digits.startsWith("90");
    if (isLocal || isIntl) return true;
  }

  return false;
}
