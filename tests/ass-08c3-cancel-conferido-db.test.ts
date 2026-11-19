import assert from "node:assert/strict";
import test from "node:test";

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

