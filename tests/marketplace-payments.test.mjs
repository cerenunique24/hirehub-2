import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, filename) => module._compile(
  ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  filename,
);
const { quoteMilestone, validateReservation, processPaymentWebhook, operationEntries,
  paymentCapabilities, startOperation } = load("../lib/payments/marketplace.ts");

const snapshot = { budget: "50.10", freelancerAmount: "50.10", platformFee: "7.52", clientTotal: "57.62", frozenRate: null };
const quote = quoteMilestone(snapshot);
const charge = { ...quote, id: "op", provider: "sandbox", providerReference: null,
  kind: "charge", status: "created", amount: quote.total };

test("pricing rounds in kuruş, preserves historical rates and rejects mismatch", () => {
  assert.equal(quote.total, 5762n);
  assert.equal(quoteMilestone({ ...snapshot, frozenRate: "0.12", platformFee: "6.01", clientTotal: "56.11" }).total, 5611n);
  assert.throws(() => quoteMilestone(snapshot, { total: 5761n, currency: "TRY" }), /Requested amount/);
  assert.throws(() => quoteMilestone({ ...snapshot, freelancerAmount: "50.09" }), /snapshot mismatch/);
});

test("flags block provider calls without explicit activation and configuration", async () => {
  const calls = [];
  const adapter = { id: "sandbox", start: async input => calls.push(input.idempotencyKey) };
  const env = { MARKETPLACE_CHARGES_ENABLED: "true" };
  await assert.rejects(startOperation(adapter, paymentCapabilities(env, false), { operation: charge }));
  await assert.rejects(startOperation(adapter, paymentCapabilities({}, true), { operation: charge }));
  await startOperation(adapter, paymentCapabilities(env, true), { operation: charge });
  assert.deepEqual(calls, ["op"]);
  assert.equal(paymentCapabilities(env, true).payout, false);
});

test("refund and payout reserve the same principal and reverse separate fee entries", () => {
  const settled = { ...charge, status: "succeeded" };
  const refund = { ...charge, id: "refund", kind: "refund", principal: 1000n, platformFee: 150n, amount: 1150n };
  const payout = { ...charge, id: "payout", kind: "payout", principal: 4010n, platformFee: 0n, amount: 4010n };
  validateReservation(quote, refund, [settled]);
  validateReservation(quote, payout, [settled, refund]);
  assert.throws(() => validateReservation(quote, refund, [settled, refund, payout]), /unreserved/);
  assert.deepEqual(operationEntries(refund).map(row => row.delta), [-1150n, 1000n, 150n]);
  assert.deepEqual(operationEntries(payout).map(row => row.delta), [4010n, -4010n]);
});

test("webhook rejects amount mismatch atomically and journals verified success once", async () => {
  let events = new Set(), operation = charge, entries = [];
  const base = { id: "event", operationId: charge.id, reference: "ref", kind: "charge", status: "succeeded", amount: quote.total, currency: "TRY" };
  const store = { async transaction(work) {
    const snapshot = { events: new Set(events), operation, entries: [...entries] };
    try {
      return await work({
        async claimEvent(_, event) {
          if (events.has(event.id)) return false;
          events.add(event.id);
          return true;
        },
        async lockOperation() { return operation; },
        async updateOperation(_, status, providerReference) { operation = { ...operation, status, providerReference }; },
        async appendEntries(_, rows) { entries.push(...rows); },
      });
    } catch (error) {
      ({ events, operation, entries } = snapshot);
      throw error;
    }
  } };
  const apply = event => processPaymentWebhook({ id: "sandbox", verifyWebhook: async () => event }, store,
    new Uint8Array(), new Headers());
  await assert.rejects(apply({ ...base, amount: 1n }), /match/);
  assert.equal(await apply(base), "applied");
  assert.equal(await apply(base), "duplicate");
  assert.equal(await apply({ ...base, id: "second" }), "unchanged");
  assert.equal(await apply({ ...base, id: "late", status: "pending" }), "stale");
  await assert.rejects(apply({ ...base, id: "conflict", status: "failed" }), /Conflicting/);
  assert.equal(entries.length, 3);
  assert.equal(entries.reduce((sum, row) => sum + row.delta, 0n), 0n);
});
