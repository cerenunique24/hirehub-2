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

// Legacy fields are workflow hints only.
export function paymentStatusLabel(status: string | null | undefined): string {
  if (status === "pending") return "Ödeme planlanıyor";
  if (status == null) return "Ödeme kaydı yok";
  return "Ödeme doğrulanmadı";
}
