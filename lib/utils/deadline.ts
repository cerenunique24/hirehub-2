/**
 * Ortak deadline / kalan süre helper'ı.
 *
 * Client ve freelancer tarafında AYNI hesaplama kullanılmalı — bu
 * yüzden burada tek bir yerde tanımlanır (app/freelancers/discover'daki
 * eski inline getDaysUntil() kaldırıldı, bunun yerine bu dosya kullanılır).
 */

/**
 * `deadline` tarihine kalan gün sayısı. Geçmişse negatif döner.
 * Geçersiz/boş tarih için null döner.
 */
export function getDaysRemaining(
  deadline: string | null | undefined
): number | null {
  if (!deadline) {
    return null;
  }

  const target = new Date(deadline);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );

  const diffMs = startOfTarget.getTime() - startOfToday.getTime();

  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export type RemainingTimeInfo = {
  days: number | null;
  overdue: boolean;
  label: string;
};

/**
 * Kullanıcıya gösterilecek Türkçe "kalan süre" metni.
 *
 * Negatif gün sayısı ASLA doğrudan gösterilmez — "Süre geçti · N gün"
 * biçiminde, mutlak değer olarak gösterilir.
 */
export function formatRemainingTime(
  deadline: string | null | undefined
): RemainingTimeInfo {
  const days = getDaysRemaining(deadline);

  if (days === null) {
    return {
      days: null,
      overdue: false,
      label: "Teslim tarihi belirtilmemiş",
    };
  }

  if (days < 0) {
    return {
      days,
      overdue: true,
      label: `Süre geçti · ${Math.abs(days)} gün`,
    };
  }

  if (days === 0) {
    return {
      days,
      overdue: false,
      label: "Bugün son gün",
    };
  }

  return {
    days,
    overdue: false,
    label: `${days} gün kaldı`,
  };
}

export function formatDeadlineDate(
  deadline: string | null | undefined
): string | null {
  if (!deadline) {
    return null;
  }

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Teslim durumu: on_track (zamanında), due_soon (2 gün veya daha az kaldı),
 * overdue (süre geçti). Bu, veritabanında saklanan bir durum DEĞİL; her
 * gösterimde `due_date` ve aşamanın güncel durumundan hesaplanır, böylece
 * hiçbir zaman eskimiş bir "gecikti" bilgisi kalmaz.
 */
export type DeadlineStatus = "on_track" | "due_soon" | "overdue";

export const DUE_SOON_THRESHOLD_DAYS = 2;

/** Teslim beklenmeyen (onaylanmış / henüz başlamamış) aşamalar için null döner. */
export function getDeadlineStatus(input: {
  dueDate: string | null | undefined;
  status: string;
}): DeadlineStatus | null {
  if (input.status === "approved" || input.status === "pending") return null;

  const days = getDaysRemaining(input.dueDate);
  if (days === null) return null;
  if (days < 0) return "overdue";
  if (days <= DUE_SOON_THRESHOLD_DAYS) return "due_soon";
  return "on_track";
}

export const DEADLINE_STATUS_LABEL: Record<DeadlineStatus, string> = {
  on_track: "Zamanında",
  due_soon: "Teslim yaklaşıyor",
  overdue: "Gecikti",
};
