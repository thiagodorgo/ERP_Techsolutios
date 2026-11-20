import assert from "node:assert/strict";
import test, { after } from "node:test";

import { openPrismaKit, type PrismaKit } from "./helpers/ass-08c3-prisma-kit.js";

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


// ---------------------------------------------------------------------------------------------------------------------------
// Conserto único do #608 (fix-608b-cl), A-7: o SQL do `[RETARGET-01]` filtra `tenant_id` além da RLS. Prova: um cliente que
// IGNORA a RLS (o dono da base, superusuário) com escopo só da organização C não muda a linha da organização D.
// ---------------------------------------------------------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;
const PNOW = new Date("2026-11-20T12:00:00.000Z");
if (!connectionString) {
  test("TP-A7 exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let kit: PrismaKit;
  let Repo: any;
  after(async () => {
    await kit?.close();
  });

  test("setup -db: base própria, papel NOSUPERUSER NOBYPASSRLS", async () => {
    kit = await openPrismaKit(connectionString, "c08c3_tp");
    Repo = (await import("../src/modules/subscription-billing/outbox/outbox.prisma.js")).PrismaOutboxRepository;
  });

  test("TP-A7 (A-7): com um cliente que ignora a RLS e escopo só de C, a linha de D não muda de provedor", async () => {
    const c = await kit.seedTenant("tpa7c");
    const d = await kit.seedTenant("tpa7d");
    const rowC = await kit.seedRow(c, { kind: "invoice_issue", status: "PENDING", provider: "nfeio" });
    const rowD = await kit.seedRow(d, { kind: "invoice_issue", status: "PENDING", provider: "nfeio" });
    const bypass = await kit.one(`SELECT rolsuper OR rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user`);
    assert.equal(bypass.bypass, true, "o cliente do dono ignora a RLS (é a prova de que a defesa não é só a RLS)");
    const moved = await new Repo(kit.owner, { tenantIds: [c.tenantId] }).retargetUntriedInvoiceIssues("focusnfe", PNOW);
    const provider = async (id: string) => (await kit.one(`SELECT provider FROM billing_outbox WHERE id = $1::uuid`, id)).provider;
    assert.equal(await provider(rowD), "nfeio", "a linha da organização fora do escopo não muda");
    assert.equal(await provider(rowC), "focusnfe");
    assert.equal(moved, 1);
  });
}
