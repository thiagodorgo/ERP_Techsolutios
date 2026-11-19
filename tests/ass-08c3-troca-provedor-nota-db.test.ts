import assert from "node:assert/strict";
import test from "node:test";

import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { NOW, TENANT_A, enqueue, memoryOutbox, source } from "./helpers/ass-08c3-test-kit.js";

function invoiceHandler(providers: string[]) {
  const calls: string[] = [];
  return {
    calls,
    handler: {
      providers,
      async issue(row: { provider: string }) { calls.push(row.provider); return { kind: "sent", externalId: "nf_1" } as const; },
      async cancel() { calls.push("cancel"); return { kind: "sent", externalId: "nf_1" } as const; },
    },
  };
}

test("TP1: invoice_issue nunca tentada é retargetada para o único provedor ligado e despachada", async () => {
  const repo = memoryOutbox();
  const row = await enqueue(repo, { kind: "invoice_issue", provider: "nfeio", payload: { seq: 1 } });
  const invoices = invoiceHandler(["focusnfe"]);
  const result = await runDispatchOutbox({ repo, ports: {}, invoices: invoices.handler as never, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => NOW });
  assert.equal(result.outcomes.sent, 1);
  assert.deepEqual(invoices.calls, ["focusnfe"]);
  assert.equal((await repo.findById(TENANT_A, row.id))?.provider, "focusnfe");
});

test("TP2: tentada, com external_id, reclamada e invoice_cancel não mudam de provedor", async () => {
  const repo = memoryOutbox();
  const attempted = await enqueue(repo, { kind: "invoice_issue", provider: "nfeio", seq: 1, payload: { seq: 1 } });
  const claimed = await repo.claimNext({ enabledProviders: ["nfeio"], now: NOW, claimedBy: "old", orphanMs: 1, verdict: () => ({ kind: "eligible" }) });
  assert.equal(claimed?.kind, "claimed");
  const cancel = await enqueue(repo, { kind: "invoice_cancel", provider: "nfeio", seq: 2, payload: { seq: 2 } });
  const moved = await repo.retargetUntriedInvoiceIssues("focusnfe", NOW);
  assert.equal(moved, 0);
  assert.equal((await repo.findById(TENANT_A, attempted.id))?.provider, "nfeio");
  assert.equal((await repo.findById(TENANT_A, cancel.id))?.provider, "nfeio");
});

test("TP3: sem provedor de nota ligado a rodada não retargeta", async () => {
  const repo = memoryOutbox();
  const row = await enqueue(repo, { kind: "invoice_issue", provider: "nfeio", payload: { seq: 1 } });
  await runDispatchOutbox({ repo, ports: {}, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => NOW });
  assert.equal((await repo.findById(TENANT_A, row.id))?.provider, "nfeio");
});

test("M26/M26b/M26c: SQL e chamada preservam os predicados literais", () => {
  const prisma = source("src/modules/subscription-billing/outbox/outbox.prisma.ts");
  const dispatcher = source("src/modules/subscription-billing/outbox/outbox.dispatcher.ts");
  assert.match(prisma, /kind = 'invoice_issue'[\s\S]*attempts = 0[\s\S]*\[RETARGET-01\]/);
  assert.match(dispatcher, /retargetUntriedInvoiceIssues\(deps\.invoices\.providers\[0\]!/);
});

