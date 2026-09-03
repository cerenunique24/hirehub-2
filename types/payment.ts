export type PaymentStatus =
  | "pending"
  | "held"
  | "released"
  | "refunded";

export interface Payment {
  id: string;

  projectId: string;

  amount: number;

  status: PaymentStatus;

  createdAt: Date;
}