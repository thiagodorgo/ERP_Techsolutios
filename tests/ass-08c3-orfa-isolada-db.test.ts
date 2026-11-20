import assert from "node:assert/strict";
import test, { after } from "node:test";

import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { OUTBOX_MAX_ATTEMPTS, OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { ProviderListIncompleteError } from "../src/modules/subscription-billing/providers/payment/payment-errors.js";
import { NOW, TENANT_A, enqueue, memoryOutbox, paymentPort, source } from "./helpers/ass-08c3-test-kit.js";
import { openPrismaKit, type PrismaKit } from "./helpers/ass-08c3-prisma-kit.js";

async function orphan(repo: ReturnType<typeof memoryOutbox>, attempts = 1) {
  const row = await enqueue(repo);
  const first = await repo.claimNext({ enabledProviders: ["asaas"], now: NOW, claimedBy: "crash", orphanMs: OUTBOX_ORPHAN_MS, verdict: () => ({ kind: "eligible" }) });
  assert.equal(first?.kind, "claimed");
  let current = first!.row;
  for (let i = 1; i < attempts; i += 1) {
    const lease = { claimedBy: current.claimedBy!, attemptStartedAt: current.attemptStartedAt! };
    await repo.deferOrphan(TENANT_A, row.id, "provider_unavailable", new Date(NOW.getTime() + i * OUTBOX_ORPHAN_MS), lease);
    const next = await repo.claimNext({ enabledProviders: ["asaas"], now: new Date(NOW.getTime() + (i + 1) * OUTBOX_ORPHAN_MS), claimedBy: "crash", orphanMs: OUTBOX_ORPHAN_MS, verdict: () => ({ kind: "eligible" }) });
    assert.equal(next?.kind, "claimed");
    current = next!.row;
  }
  return row;
}

test("OR1: falha de uma órfã não rejeita a rodada e a próxima organização é processada", async () => {
  const repo = memoryOutbox();
  await orphan(repo);
  await enqueue(repo, { tenantId: "00000000-0000-4000-8000-0000000000b2", statementId: "20000000-0000-4000-8000-000000000002", seq: 2 });
  const { port, calls } = paymentPort({ listChargesByExternalReference: async () => { calls.list += 1; if (calls.list === 1) throw Object.assign(new Error("fora"), { code: "provider_unavailable" }); return []; } });
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + OUTBOX_ORPHAN_MS) });
  assert.equal(result.outcomes.retry, 1);
  assert.equal(result.outcomes.sent, 1);
  assert.equal(calls.create, 1);
});

test("OR2: órfã falha permanece PROCESSING, é reconsultada e nunca cria", async () => {
  const repo = memoryOutbox();
  const row = await orphan(repo);
  const { port, calls } = paymentPort({ listChargesByExternalReference: async () => { calls.list += 1; throw Object.assign(new Error("fora"), { code: "provider_unavailable" }); } });
  for (let n = 1; n <= 4; n += 1) {
    await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + n * OUTBOX_ORPHAN_MS) });
    const current = await repo.findById(TENANT_A, row.id);
    assert.equal(current?.status, "PROCESSING");
    assert.equal(current?.lastError, "provider_unavailable");
  }
  assert.equal(calls.create, 0);
});

test("OR3: no teto a órfã vai a NEEDS_REVIEW e não é tocada de novo", async () => {
  const repo = memoryOutbox();
  const row = await orphan(repo, OUTBOX_MAX_ATTEMPTS);
  const { port, calls } = paymentPort({ listChargesByExternalReference: async () => { calls.list += 1; throw Object.assign(new Error("fora"), { code: "provider_unavailable" }); } });
  await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + (OUTBOX_MAX_ATTEMPTS + 1) * OUTBOX_ORPHAN_MS) });
  assert.equal((await repo.findById(TENANT_A, row.id))?.status, "NEEDS_REVIEW");
  assert.match((await repo.findById(TENANT_A, row.id))?.lastError ?? "", /^orphan_recovery_failed:/);
  const before = calls.list;
  await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + 20 * OUTBOX_ORPHAN_MS) });
  assert.equal(calls.list, before);
});

test("OR4: falha cessa antes do teto e a cobrança listada é adotada sem POST", async () => {
  const repo = memoryOutbox();
  const row = await orphan(repo);
  const { port, calls } = paymentPort({
    listChargesByExternalReference: async () => [{ chargeId: "pay_existing", status: "pending", amountCents: 10_000, createdAt: NOW.toISOString() }],
    getCharge: async () => ({ status: "pending", amountCents: 10_000 }),
  });
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + OUTBOX_ORPHAN_MS) });
  assert.equal(result.outcomes.recovered, 1);
  assert.equal((await repo.findById(TENANT_A, row.id))?.externalId, "pay_existing");
  assert.equal(calls.create, 0);
});

test("mutações M-OR1/M-OR2/M-OR3 têm uma única âncora literal", () => {
  const text = source("src/modules/subscription-billing/outbox/outbox.dispatcher.ts");
  for (const marker of ["[ORFA-TRY]", "[ORFA-DEFER]", "[ORFA-CAP]"]) assert.equal(text.split(marker).length - 1, 1, marker);
});


// Conserto único do #608 (fix-608b-cl), A-4: `return await settleFoundCharge(...)` no `[ORFA-TRY]`. A falha de BANCO dentro da
// adoção (o `markNeedsReview` da órfã achada estornada lança P1001) cai no `catch` da órfã — adiada, nunca criada — e a rodada
// segue: a `charge_create` da outra organização é atendida (1 POST). Antes do conserto, a rejeição escapava e derrubava a rodada.
test("OR-A4 (A-4): falha de banco dentro da adoção de UMA órfã não derruba a rodada; a outra organização é atendida", async () => {
  const repo = memoryOutbox();
  const row = await orphan(repo);
  await enqueue(repo, { tenantId: "00000000-0000-4000-8000-0000000000b2", statementId: "20000000-0000-4000-8000-000000000002", seq: 2 });
  repo.markNeedsReview = async () => {
    throw Object.assign(new Error("db fora"), { code: "P1001" });
  };
  const { port, calls } = paymentPort({
    // Só a órfã (o demonstrativo dela) tem cobrança no provedor; a linha nova da outra organização não tem nenhuma.
    listChargesByExternalReference: async (statementId: string) => (statementId === row.statementId ? [{ chargeId: "pay_existing", status: "pending", amountCents: 10_000, createdAt: NOW.toISOString() }] : []),
    getCharge: async () => ({ status: "refunded", amountCents: 10_000 }),
  });
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + OUTBOX_ORPHAN_MS) });
  assert.equal(calls.create, 1, "a charge_create da outra organização foi atendida");
  assert.equal(result.outcomes.retry, 1, "a órfã foi adiada pelo catch dela");
  const current = await repo.findById(TENANT_A, row.id);
  assert.equal(current?.status, "PROCESSING", "a órfã nunca volta a PENDING");
});

// Conserto da junta do #608 (fix-608c-cl), o OR1 na letra do plano §6 (o critério da `P-ASS08C-ORFA-RECONSULTA-ABORTA-RODADA`):
// 10 órfãs de `charge_create` em 10 organizações, cuja lista falha (5 com 500 e 5 com a lista incompleta), e 1 `charge_create`
// PENDING de uma 11ª organização → a 1ª rodada resolve (não rejeita) e faz 1 POST, o da 11ª.
test("OR1-10: 10 órfãs falhando em 10 organizações não seguram a 11ª — a 1ª rodada resolve e faz 1 POST", async () => {
  const repo = memoryOutbox();
  const orphans: { tenantId: string; statementId: string; id: string; failure: "provider_unavailable" | "provider_list_incomplete" }[] = [];
  for (let i = 0; i < 10; i += 1) {
    const n = String(i + 1).padStart(2, "0");
    const tenantId = `00000000-0000-4000-8000-0000000001${n}`;
    const statementId = `30000000-0000-4000-8000-0000000001${n}`;
    const row = await enqueue(repo, { tenantId, statementId });
    orphans.push({ tenantId, statementId, id: row.id, failure: i < 5 ? "provider_unavailable" : "provider_list_incomplete" });
  }
  for (let i = 0; i < 10; i += 1) {
    const claimed = await repo.claimNext({ enabledProviders: ["asaas"], now: NOW, claimedBy: "crash", orphanMs: OUTBOX_ORPHAN_MS, verdict: () => ({ kind: "eligible" }) });
    assert.equal(claimed?.kind, "claimed");
  }
  const eleventh = await enqueue(repo, { tenantId: "00000000-0000-4000-8000-000000000111", statementId: "30000000-0000-4000-8000-000000000111" });
  const byStatement = new Map(orphans.map((o) => [o.statementId, o.failure]));
  const { port, calls } = paymentPort({
    listChargesByExternalReference: async (statementId: string) => {
      calls.list += 1;
      const failure = byStatement.get(statementId);
      if (failure === "provider_unavailable") throw Object.assign(new Error("500"), { code: "provider_unavailable" });
      if (failure === "provider_list_incomplete") throw new ProviderListIncompleteError();
      return [];
    },
  });
  const result = await runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus" }), now: () => new Date(NOW.getTime() + OUTBOX_ORPHAN_MS) });
  assert.equal(calls.create, 1, "1 POST, o da 11ª organização");
  assert.equal(result.outcomes.sent, 1);
  assert.equal(result.outcomes.retry, 10, "as 10 órfãs foram adiadas, cada uma no catch dela");
  assert.equal((await repo.findById("00000000-0000-4000-8000-000000000111", eleventh.id))?.status, "SENT");
  for (const orphan of orphans) {
    const current = await repo.findById(orphan.tenantId, orphan.id);
    assert.equal(current?.status, "PROCESSING", "a órfã nunca volta a PENDING");
    assert.equal(current?.lastError, orphan.failure);
    assert.equal(current?.externalId ?? null, null, "a órfã nunca cria");
  }
});

// Conserto da junta do #608 (fix-608c-cl, C2-N2): o `deferOrphan` (e toda escrita do despacho pelo `#mutate`) filtra a
// organização no predicado, além da RLS. Prova no Prisma com o cliente do DONO (ignora a RLS) e escopo só de C: a linha de D,
// com a posse dela, não muda; a de C muda. Sem o `[MUTATE-TENANT]`, a de D muda (vermelho).
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  test("OR-TENANT-db exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let kit: PrismaKit;
  let Repo: any;
  after(async () => {
    await kit?.close();
  });

  test("setup -db: base própria, papel NOSUPERUSER NOBYPASSRLS", async () => {
    kit = await openPrismaKit(connectionString, "c08c3_or");
    Repo = (await import("../src/modules/subscription-billing/outbox/outbox.prisma.js")).PrismaOutboxRepository;
  });

  test("OR-TENANT-db (C2-N2): com um cliente que ignora a RLS e escopo só de C, o deferOrphan não move a órfã de D", async () => {
    const started = new Date("2026-11-20T11:00:00.000Z");
    const later = new Date("2026-11-20T12:00:00.000Z");
    const c = await kit.seedTenant("ortc");
    const d = await kit.seedTenant("ortd");
    const lease = { claimedBy: "crash", attemptStartedAt: started };
    const rowC = await kit.seedRow(c, { kind: "charge_create", status: "PROCESSING", attempts: 1, claimedBy: lease.claimedBy, attemptStartedAt: started });
    const rowD = await kit.seedRow(d, { kind: "charge_create", status: "PROCESSING", attempts: 1, claimedBy: lease.claimedBy, attemptStartedAt: started });
    const bypass = await kit.one(`SELECT rolsuper OR rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user`);
    assert.equal(bypass.bypass, true, "o cliente do dono ignora a RLS (é a prova de que a defesa não é só a RLS)");
    const repo = new Repo(kit.owner, { tenantIds: [c.tenantId] });
    const read = async (id: string) => kit.one(`SELECT status, last_error, attempt_started_at FROM billing_outbox WHERE id = $1::uuid`, id);

    assert.equal(await repo.deferOrphan(c.tenantId, rowD, "provider_unavailable", later, lease), false, "a órfã de D não é de C");
    const afterD = await read(rowD);
    assert.equal(afterD.last_error, null, "a linha de D não muda");
    assert.equal(new Date(afterD.attempt_started_at).getTime(), started.getTime());

    assert.equal(await repo.deferOrphan(c.tenantId, rowC, "provider_unavailable", later, lease), true);
    const afterC = await read(rowC);
    assert.deepEqual({ status: afterC.status, lastError: afterC.last_error }, { status: "PROCESSING", lastError: "provider_unavailable" });
    assert.equal(new Date(afterC.attempt_started_at).getTime(), later.getTime());
  });
}
