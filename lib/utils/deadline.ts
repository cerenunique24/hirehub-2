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
