import assert from "node:assert/strict";
import test, { after } from "node:test";

import { openPrismaKit, type PrismaKit } from "./helpers/ass-08c3-prisma-kit.js";

import { NOW, TENANT_A, TENANT_B, enqueue, memoryOutbox, source } from "./helpers/ass-08c3-test-kit.js";

async function review(code: "charge_not_listed" | "charge_state_unknown" | "charge_already_paid" = "charge_not_listed") {
  const repo = memoryOutbox();
  const row = await enqueue(repo, { kind: "charge_cancel", payload: { chargeId: "pay_X", chargeCreateId: "create_X" } });
  const claim = await repo.claimNext({ enabledProviders: ["asaas"], now: NOW, claimedBy: "seed", orphanMs: 1, verdict: () => ({ kind: "eligible" }) });
  assert.equal(claim?.kind, "claimed");
  await repo.markNeedsReview(TENANT_A, row.id, code, NOW, { claimedBy: claim!.row.claimedBy!, attemptStartedAt: claim!.row.attemptStartedAt! });
  return { repo, row };
}

test("CF1: charge_not_listed é confirmado, fica SENT e grava trilha sem rede", async () => {
  const { repo, row } = await review("charge_not_listed");
  const result = await repo.confirmCancelledByOperator(TENANT_A, row.id, { chargeId: "pay_X", reason: "conferido no painel", actorId: "usr_platform", now: NOW });
  assert.equal(result.kind, "confirmed");
  assert.equal(result.row.status, "SENT");
  assert.equal(result.row.externalId, "pay_X");
  assert.equal(repo.audits.at(-1)?.action, "billing_outbox.cancel_confirmed_by_operator");
});

test("CF2: charge_state_unknown também é confirmável", async () => {
  const { repo, row } = await review("charge_state_unknown");
  assert.equal((await repo.confirmCancelledByOperator(TENANT_A, row.id, { chargeId: "pay_X", reason: "conferido", actorId: null, now: NOW })).kind, "confirmed");
});

test("CF3: status, código e kind fora da allowlist são recusados sem mutação", async () => {
  const repo = memoryOutbox();
  const pending = await enqueue(repo, { kind: "charge_cancel", payload: { chargeId: "pay_X" } });
  assert.equal((await repo.confirmCancelledByOperator(TENANT_A, pending.id, { chargeId: "pay_X", reason: "x", actorId: null, now: NOW })).kind, "not_allowed");
  const disallowed = await review("charge_already_paid");
  assert.equal((await disallowed.repo.confirmCancelledByOperator(TENANT_A, disallowed.row.id, { chargeId: "pay_X", reason: "x", actorId: null, now: NOW })).kind, "not_allowed");
});

test("CF4: chargeId divergente é mismatch; a rota exige reason", async () => {
  const { repo, row } = await review();
  assert.equal((await repo.confirmCancelledByOperator(TENANT_A, row.id, { chargeId: "pay_Y", reason: "x", actorId: null, now: NOW })).kind, "mismatch");
  assert.match(source("src/modules/subscription-billing/statements/statements.platform.routes.ts"), /confirm-cancelled[\s\S]*requireOperatorReason\(input\.reason\)/);
});

test("CF5: linha de outra organização é indistinguível de inexistente", async () => {
  const { repo, row } = await review();
  assert.equal((await repo.confirmCancelledByOperator(TENANT_B, row.id, { chargeId: "pay_X", reason: "x", actorId: null, now: NOW })).kind, "not_found");
  assert.equal((await repo.findById(TENANT_A, row.id))?.status, "NEEDS_REVIEW");
});

test("CF6: após confirmar não resta cancelamento em revisão e a visão pode seguir", async () => {
  const { repo, row } = await review();
  await repo.confirmCancelledByOperator(TENANT_A, row.id, { chargeId: "pay_X", reason: "x", actorId: null, now: NOW });
  assert.equal((await repo.listForTenant(TENANT_A, { status: "NEEDS_REVIEW" })).length, 0);
});

test("CF7 e CF-T1: middleware de plataforma é o primeiro da rota", () => {
  const routes = source("src/modules/subscription-billing/statements/statements.platform.routes.ts");
  assert.match(routes, /router\.post\(\s*"\/outbox\/:id\/confirm-cancelled",\s*requirePlatformPermission\("platform:billing:settle"\)/);
  assert.match(routes, /R-PLAT-TENANT-CORPO/);
});

test("CF8: a confirmação não cria nova charge_create", async () => {
  const { repo, row } = await review();
  const before = (await repo.listByStatus()).filter((x) => x.kind === "charge_create").length;
  await repo.confirmCancelledByOperator(TENANT_A, row.id, { chargeId: "pay_X", reason: "x", actorId: null, now: NOW });
  assert.equal((await repo.listByStatus()).filter((x) => x.kind === "charge_create").length, before);
});

test("CF9: Prisma trava demonstrativo antes de escrever outbox e cobranças", () => {
  const prisma = source("src/modules/subscription-billing/outbox/outbox.prisma.ts");
  const start = prisma.indexOf("async confirmCancelledByOperator");
  const body = prisma.slice(start, prisma.indexOf("async listForTenant", start));
  assert.ok(body.indexOf("[CONFIRM-LOCK]") < body.indexOf("UPDATE billing_outbox"));
  assert.ok(body.indexOf("subscription_statements") < body.indexOf("subscription_statement_charges"));
});

test("mutações M-CF1/M-CF2/M-CF3/M-CFT1/M-CFT2 têm forma observável", () => {
  const prisma = source("src/modules/subscription-billing/outbox/outbox.prisma.ts");
  const routes = source("src/modules/subscription-billing/statements/statements.platform.routes.ts");
  const routeStart = routes.indexOf('"/outbox/:id/confirm-cancelled"');
  const routeBody = routes.slice(routeStart, routes.indexOf("router.post(", routeStart + 1));
  assert.equal(prisma.split("[CONFIRM-CODES]").length - 1, 1);
  assert.match(prisma, /owner\.status !== "NEEDS_REVIEW" \|\| !\["charge_not_listed", "charge_state_unknown"\]\.includes\(owner\.last_error \?\? ""\)/);
  assert.equal(prisma.split("[CONFIRM-LOCK]").length - 1, 1);
  assert.match(routeBody, /const tenantId = requireTenantId\(input\.tenantId\)/);
  assert.doesNotMatch(routeBody, /forEachTenantRls|listByStatus|tenantContext\?\.tenantId/);
});


// ---------------------------------------------------------------------------------------------------------------------------
// Conserto único do #608 (fix-608b-cl): o `confirmCancelledByOperator` no PRISMA, sob papel NOSUPERUSER NOBYPASSRLS.
//   CF-A1 (A-1, grave): a cobrança da tabela JÁ PAGA, estornada ou contestada não vira `cancelled` pela confirmação do operador
//         (o MESMO efeito do `[CANCEL-TX]`, cuja instrução é a mesma, byte a byte); a `pending` vira.
//   CF-A6 (A-6): a trilha leva como `code` o `last_error` de ANTES.
//   CF9-db (M-CF2s): a confirmação ESPERA a trava do demonstrativo (`FOR NO KEY UPDATE OF s`), barreira por `pg_stat_activity`.
// ---------------------------------------------------------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;
const PNOW = new Date("2026-11-20T12:00:00.000Z");
if (!connectionString) {
  test("CF-A1/CF-A6/CF9-db exigem DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let kit: PrismaKit;
  let Repo: any;
  after(async () => {
    await kit?.close();
  });

  async function scene(tag: string, chargeStatus: string, lastError = "charge_state_unknown") {
    const f = await kit.seedTenant(tag);
    const chargeId = `pay_${tag}`;
    const create = await kit.seedRow(f, { kind: "charge_create", status: "SENT", externalId: chargeId, attempts: 1 });
    await kit.seedCharge(f, chargeId, chargeStatus);
    const cancel = await kit.seedRow(f, { kind: "charge_cancel", status: "NEEDS_REVIEW", lastError, attempts: 1, payload: { chargeId, chargeCreateId: create } });
    return { f, chargeId, create, cancel, repo: new Repo(kit.role.client, { tenantIds: [f.tenantId] }) };
  }

  test("setup -db: base própria, papel NOSUPERUSER NOBYPASSRLS", async () => {
    kit = await openPrismaKit(connectionString, "c08c3_cf");
    Repo = (await import("../src/modules/subscription-billing/outbox/outbox.prisma.js")).PrismaOutboxRepository;
  });

  test("CF-A1 (A-1): a confirmação do operador não cancela na tabela a cobrança paga, estornada ou contestada; a pendente, sim", async () => {
    for (const status of ["confirmed", "refunded", "partially_refunded", "charged_back", "chargeback_disputed", "pending"]) {
      const s = await scene(`a1${status.slice(0, 6)}${status.length}`, status);
      const out = await s.repo.confirmCancelledByOperator(s.f.tenantId, s.cancel, { chargeId: s.chargeId, reason: "conferido no painel", actorId: null, now: PNOW });
      assert.equal(out.kind, "confirmed", status);
      const charge = await kit.one(`SELECT status, cancelled_at FROM subscription_statement_charges WHERE external_charge_id = $1`, s.chargeId);
      // O MESMO efeito do registro do cancelamento confirmado pelo provedor: só `cancelTarget` vira `cancelled`.
      assert.equal(charge.status, status === "pending" ? "cancelled" : status, `cobrança ${status} depois da confirmação`);
      assert.equal(charge.cancelled_at === null, status !== "pending", `cancelled_at da cobrança ${status}`);
      const line = await kit.one(`SELECT status, external_id FROM billing_outbox WHERE id = $1::uuid`, s.cancel);
      assert.deepEqual(line, { status: "SENT", external_id: s.chargeId });
    }
  });

  test("CF-A1 (forma): a instrução da cobrança na confirmação é a MESMA do [CANCEL-TX-CHG], byte a byte", async () => {
    const text = source("src/modules/subscription-billing/outbox/outbox.prisma.ts");
    const sqlAfter = (marker: string) => {
      const at = text.indexOf(marker);
      assert.ok(at > 0, marker);
      const start = text.indexOf("`", at);
      return text.slice(start, text.indexOf("`", start + 1) + 1);
    };
    const cancelTx = sqlAfter("[CANCEL-TX-CHG]");
    assert.match(cancelTx, /status IN \(\$\{sqlStatusList\("cancelTarget"\)\}\)/);
    assert.equal(sqlAfter("[CONFIRM-CHG]"), cancelTx);
  });

  test("CF-A6 (A-6): a trilha cancel_confirmed_by_operator leva o last_error de antes como code", async () => {
    for (const code of ["charge_not_listed", "charge_state_unknown"]) {
      const s = await scene(`a6${code.slice(7, 11)}`, "pending", code);
      await s.repo.confirmCancelledByOperator(s.f.tenantId, s.cancel, { chargeId: s.chargeId, reason: "conferido", actorId: null, now: PNOW });
      const audit = await kit.rows(`SELECT metadata FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'billing_outbox.cancel_confirmed_by_operator'`, s.f.tenantId);
      assert.equal(audit.length, 1);
      assert.equal(audit[0].metadata.code, code);
      assert.equal(audit[0].metadata.reason, "conferido");
    }
  });

  test("CF9-db (M-CF2s): a confirmação espera a trava do demonstrativo antes de escrever", async () => {
    const s = await scene("cf9db", "pending", "charge_not_listed");
    const held = await kit.hold("subscription_statements", [s.f.statementId], "FOR NO KEY UPDATE");
    let settled = false;
    const confirming = s.repo
      .confirmCancelledByOperator(s.f.tenantId, s.cancel, { chargeId: s.chargeId, reason: "conferido", actorId: null, now: PNOW })
      .finally(() => {
        settled = true;
      });
    const waited = await kit.waitLockWaiters(1, 8_000);
    const settledWhileHeld = settled;
    const lineWhileHeld = await kit.one(`SELECT status FROM billing_outbox WHERE id = $1::uuid`, s.cancel);
    held.release();
    await held.done;
    const out = await confirming;
    assert.equal(waited, true, "a confirmação tem de esperar a trava do demonstrativo (FOR NO KEY UPDATE OF s)");
    assert.equal(settledWhileHeld, false, "a confirmação terminou com o demonstrativo travado por outra transação");
    assert.equal(lineWhileHeld.status, "NEEDS_REVIEW", "nada escrito antes da trava");
    assert.equal(out.kind, "confirmed");
  });
}
