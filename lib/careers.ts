/**
 * CollaCrew Careers — "join the CollaCrew team" applications.
 *
 * Not to be confused with the freelancer marketplace signup
 * (`/register/freelancer`). This is a small, public application form for
 * people who want to work at/with CollaCrew itself (open roles, or a
 * general application). Single source of truth for constants shared by the
 * public form, the API routes and the admin views — mirrors the pattern in
 * `lib/pricing.ts` / `lib/premium.ts`.
 */

export const CAREER_APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "contacted",
  "rejected",
  "hired",
] as const;

export type CareerApplicationStatus = (typeof CAREER_APPLICATION_STATUSES)[number];

export const CAREER_APPLICATION_STATUS_LABEL: Record<CareerApplicationStatus, string> = {
  new: "Yeni",
  reviewing: "İnceleniyor",
  contacted: "İletişime Geçildi",
  rejected: "Reddedildi",
  hired: "İşe Alındı",
};

/** Per-application cumulative cap across every attached file — enforced client-side, at signed-URL issuance, and as a DB trigger backstop. */
export const CAREER_FILES_MAX_TOTAL_BYTES = 3 * 1024 * 1024 * 1024; // 3 GB

/** Mirrors the `career-applications` Storage bucket's own `allowed_mime_types` (see supabase/migrations/202609230004_career_applications.sql). */
export const CAREER_FILES_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
] as const;

export const CAREER_FILES_ACCEPT_ATTR =
  ".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed,image/jpeg,image/png";

export const CAREER_FILES_FORMATS_LABEL = "PDF, DOC, DOCX, ZIP, JPG, PNG";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);

  return `${exponent === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[exponent]}`;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidCareerEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
