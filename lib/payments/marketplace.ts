import { STANDARD_COMMISSION_RATE } from "../pricing";

const rateScale = BigInt(10_000);

function decimalUnits(value: string, places: number): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match || (match[2]?.length ?? 0) > places) throw new Error("Invalid decimal");
  return BigInt(match[1] + (match[2] ?? "").padEnd(places, "0"));
}

export type PaymentQuote = {
  currency: "TRY";
  principal: bigint;
  platformFee: bigint;
  total: bigint;
  rateBps: bigint;
};

/** Inputs come from the locked milestone and project rows, as decimal strings. */
export function quoteMilestone(input: {
  budget: string;
  frozenRate: string | null;
  freelancerAmount: string;
  platformFee: string;
  clientTotal: string;
}, requested?: { total: bigint; currency: string }): PaymentQuote {
  const principal = decimalUnits(input.budget, 2);
  const rateBps = decimalUnits(input.frozenRate ?? String(STANDARD_COMMISSION_RATE), 4);
  if (principal <= BigInt(0) || rateBps <= BigInt(0) || rateBps >= rateScale) throw new Error("Invalid milestone pricing");
  const platformFee = (principal * rateBps + rateScale / BigInt(2)) / rateScale;
  const total = principal + platformFee;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)
    || decimalUnits(input.freelancerAmount, 2) !== principal
    || decimalUnits(input.platformFee, 2) !== platformFee
    || decimalUnits(input.clientTotal, 2) !== total) throw new Error("Milestone snapshot mismatch");
  if (requested && (requested.total !== total || requested.currency !== "TRY")) throw new Error("Requested amount mismatch");
  return { currency: "TRY", principal, platformFee, total, rateBps };
}

export type OperationKind = "charge" | "refund" | "payout";
export type OperationStatus = "created" | "pending" | "succeeded" | "failed" | "cancelled";
export type PaymentOperation = {
  id: string;
  provider: string;
  providerReference: string | null;
  kind: OperationKind;
  status: OperationStatus;
  currency: "TRY";
  amount: bigint;
  principal: bigint;
  platformFee: bigint;
};

export type ProviderEvent = {
  id: string;
  operationId: string;
  reference: string;
  kind: OperationKind;
  status: Exclude<OperationStatus, "created">;
  amount: bigint;
  currency: string;
};

export interface MarketplaceAdapter {
  readonly id: string;
  start(input: {
    operation: PaymentOperation;
    idempotencyKey: string;
    parentReference?: string;
    recipientReference?: string;
  }): Promise<{ reference: string; checkoutUrl?: string }>;
  /** Verify signature and replay window against raw bytes before normalization. */
  verifyWebhook(body: Uint8Array, headers: Headers): Promise<ProviderEvent | null>;
}

export function paymentCapabilities(
  env: Readonly<Record<string, string | undefined>>,
  configured: boolean,
) {
  return {
    charge: configured && env.MARKETPLACE_CHARGES_ENABLED === "true",
    refund: configured && env.MARKETPLACE_REFUNDS_ENABLED === "true",
    payout: configured && env.MARKETPLACE_PAYOUTS_ENABLED === "true",
  };
}

export async function startOperation(
  adapter: MarketplaceAdapter,
  capabilities: ReturnType<typeof paymentCapabilities>,
  input: Omit<Parameters<MarketplaceAdapter["start"]>[0], "idempotencyKey">,
) {
  const { operation } = input;
  if (!capabilities[operation.kind] || operation.provider !== adapter.id
    || !["created", "pending"].includes(operation.status)) throw new Error("Payment operation unavailable");
  return adapter.start({ ...input, idempotencyKey: operation.id });
}

export type LedgerEntry = {
  account: "provider_clearing" | "freelancer_payable" | "platform_fee";
  delta: bigint;
};

export function operationEntries(operation: PaymentOperation): LedgerEntry[] {
  const { kind, principal, platformFee, amount } = operation;
  if (amount <= BigInt(0) || principal < BigInt(0) || platformFee < BigInt(0)
    || principal + platformFee !== amount || (kind === "payout" && platformFee !== BigInt(0))) {
    throw new Error("Invalid operation split");
  }
  if (kind === "payout") return [
    { account: "freelancer_payable", delta: principal },
    { account: "provider_clearing", delta: -principal },
  ];
  const sign = kind === "charge" ? BigInt(1) : -BigInt(1);
  return ([
    { account: "provider_clearing", delta: sign * amount },
    { account: "freelancer_payable", delta: -sign * principal },
    { account: "platform_fee", delta: -sign * platformFee },
  ] satisfies LedgerEntry[]).filter(entry => entry.delta !== BigInt(0));
}

/** Call while holding the allocation lock, before inserting a reservation. */
export function validateReservation(
  quote: PaymentQuote,
  candidate: PaymentOperation,
  existing: readonly PaymentOperation[],
) {
  operationEntries(candidate);
  if (candidate.status !== "created" || candidate.currency !== quote.currency) {
    throw new Error("Invalid reservation");
  }
  const reserved = existing.filter(operation => !["failed", "cancelled"].includes(operation.status));
  const charge = reserved.find(operation => operation.kind === "charge");
  if (candidate.kind === "charge") {
    if (charge || candidate.principal !== quote.principal || candidate.platformFee !== quote.platformFee) {
      throw new Error("Charge does not match allocation");
    }
    return;
  }
  if (charge?.status !== "succeeded" || charge.provider !== candidate.provider) {
    throw new Error("A confirmed charge is required");
  }
  const debits = reserved.filter(operation => operation.kind !== "charge");
  const principal = debits.reduce((sum, operation) => sum + operation.principal, candidate.principal);
  const fees = debits.reduce((sum, operation) => sum + operation.platformFee, candidate.platformFee);
  if (principal > charge.principal || fees > charge.platformFee) throw new Error("Insufficient unreserved funds");
}

export interface PaymentTransaction {
  claimEvent(provider: string, event: ProviderEvent): Promise<boolean>;
  lockOperation(id: string): Promise<PaymentOperation | null>;
  updateOperation(id: string, status: ProviderEvent["status"], reference: string): Promise<void>;
  appendEntries(operationId: string, entries: LedgerEntry[]): Promise<void>;
}

export interface PaymentStore {
  /** Every claim, lock, update and append must commit or roll back together. */
  transaction<T>(work: (tx: PaymentTransaction) => Promise<T>): Promise<T>;
}

export async function processPaymentWebhook(
  adapter: MarketplaceAdapter, store: PaymentStore, body: Uint8Array, headers: Headers,
) {
  const event = await adapter.verifyWebhook(body, headers);
  if (!event) return "ignored";
  if (!event.id || !event.reference || !event.operationId) throw new Error("Incomplete provider event");

  return store.transaction(async tx => {
    if (!await tx.claimEvent(adapter.id, event)) return "duplicate";
    const operation = await tx.lockOperation(event.operationId);
    if (!operation || operation.provider !== adapter.id || operation.kind !== event.kind
      || operation.amount !== event.amount || operation.currency !== event.currency
      || (operation.providerReference !== null && operation.providerReference !== event.reference)) {
      throw new Error("Provider event does not match operation");
    }
    if (operation.status === event.status) return "unchanged";
    if (["succeeded", "failed", "cancelled"].includes(operation.status)) {
      if (event.status === "pending") return "stale";
      throw new Error("Conflicting terminal payment status");
    }
    await tx.updateOperation(operation.id, event.status, event.reference);
    if (event.status === "succeeded") await tx.appendEntries(operation.id, operationEntries(operation));
    return "applied";
  });
}
