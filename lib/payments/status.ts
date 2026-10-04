/**
 * Milestone ödeme durumları (project_milestones.payment_status) için tek,
 * merkezi Türkçe etiket/sınıflandırma kaynağı.
 *
 * Gerçek bir ödeme sağlayıcısı henüz bağlı değil: bu durumlar veri modelinin
 * hazır olduğunu gösterir; hiçbiri gerçek para hareketi anlamına gelmez.
 * Kullanıcı dilindeki karşılıkları:
 *   pending            → Ödeme bekleniyor
 *   payment_initiated  → Ödeme başlatıldı
 *   paid               → Fonlandı (havuzda)
 *   held               → Güvenli havuzda tutuluyor
 *   payout_pending     → Serbest bırakılıyor
 *   paid_out           → Freelancer'a aktarıldı
 *   refund_pending / refunded / partially_refunded → iade akışı
 *   payment_failed / cancelled → başarısız / iptal
 */
export type MilestonePaymentStatus =
  | "pending"
  | "payment_initiated"
  | "paid"
  | "held"
  | "payout_pending"
  | "paid_out"
  | "refund_pending"
  | "refunded"
  | "partially_refunded"
  | "cancelled"
  | "payment_failed";

export const PAYMENT_STATUS_LABEL: Record<MilestonePaymentStatus, string> = {
  pending: "Ödeme bekleniyor",
  payment_initiated: "Ödeme başlatıldı",
  paid: "Fonlandı",
  held: "Güvenli havuzda",
  payout_pending: "Serbest bırakılıyor",
  paid_out: "Aktarıldı",
  refund_pending: "İade bekleniyor",
  refunded: "İade edildi",
  partially_refunded: "Kısmen iade edildi",
  cancelled: "İptal edildi",
  payment_failed: "Ödeme başarısız",
};

export function paymentStatusLabel(status: string | null | undefined): string {
  return PAYMENT_STATUS_LABEL[(status ?? "pending") as MilestonePaymentStatus] ?? "Ödeme bekleniyor";
}

/** Freelancer kazanç gruplaması: bekleyen / kullanılabilir / ödenen. */
export type EarningsBucket = "pending" | "available" | "paid";

export function earningsBucketFor(input: {
  milestoneStatus: string | null;
  paymentStatus: string | null;
}): EarningsBucket | null {
  const payment = input.paymentStatus ?? "pending";

  if (payment === "paid_out") return "paid";
  if (payment === "cancelled" || payment === "refunded") return null;

  // Onaylanmış ve serbest bırakılabilir durumdaki tutar "kullanılabilir".
  if (input.milestoneStatus === "approved" && (payment === "held" || payment === "payout_pending")) {
    return "available";
  }

  return "pending";
}
