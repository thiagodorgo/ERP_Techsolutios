import assert from "node:assert/strict";
import { test } from "node:test";

import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CUTOFF = new Date("2026-11-19T12:00:00.000Z");

async function paidCandidate(paidAt: Date) {
  const statements = new InMemoryStatementRepository(() => CUTOFF);
  const outbox = new InMemoryOutboxRepository({ readStatement: async () => undefined, clock: () => CUTOFF });
  statements.attachChannelStores({ outbox, invoices: { findLive: async () => undefined } });
  const statement = await statements.transaction(TENANT, async (tx) => {
    const { statement: fresh } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: "2026-11" });
    return tx.saveStatement({ ...fresh, status: "paid", totalCents: 12345, paidAt });
  });
  return { statements, statement };
}

test("VM1 · listInvoiceIntentCandidates: pago 1 ms antes do corte não é candidato; pago no corte é ([ML6-b])", async () => {
  const before = await paidCandidate(new Date(CUTOFF.getTime() - 1));
  const at = await paidCandidate(CUTOFF);
  assert.deepEqual(await before.statements.listInvoiceIntentCandidates(TENANT, CUTOFF), []);
  assert.deepEqual(await at.statements.listInvoiceIntentCandidates(TENANT, CUTOFF), [at.statement.id]);
});