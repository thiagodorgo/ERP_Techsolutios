import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { InMemoryCommissionRepository } from "../src/modules/commissions/commission.repository.js";
import type { OperatorProfileService } from "../src/modules/operator-profiles/operator-profile.service.js";
import type { InMemoryProfessionalStatementRepository } from "../src/modules/professional-statements/professional-statement.repository.js";
import type { ProfessionalStatementService } from "../src/modules/professional-statements/professional-statement.service.js";
import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω4C PR-10 (Remunerações) — conferência + LIQUIDAÇÃO EM LOTE das linhas `CommissionCalculation` já existentes.
// PARADA HONESTA (D-Ω4C-REM-COMPUTE-DEFER): PR-10 NÃO computa/fabrica percentual — o valor de cada linha É
// `calc.amount` (via `seedCalculationForTests`, o compute é test-only), NUNCA a tarifa de venda. A liquidação
// REUSA o rail do extrato do PR-07 (`createForSource` — remuneration/credit/remuneration, idempotente por
// origem) e mapeia payee(User) → operator_profile pela unique (tenant_id, user_id). Dupla-guarda de dedupe:
// source-idempotency do extrato + marcador `settled_at` (liquidar 2× NÃO duplica o crédito).

// ---------- REM-02 / REM-06: liquidação → crédito no extrato (amount = calc.amount) ----------

test("[REM-02] liquidar N calculations → N créditos no extrato (amount=calc.amount; único por calculation)", async () => {
  await withSettlementApi(async (context) => {
    const { operatorProfileId, payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calcA = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 100 });
    const calcB = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 50 });

    const response = await settle(context, context.tenantA.id, { calculationIds: [calcA.id, calcB.id], settlementDate: "2026-07-10" });
    const body = await readJson(response);

    assert.equal(response.status, 200);
    assert.equal(dataOf(body).settledCount, 2);
    assert.equal(dataOf(body).settledTotal, 150);
    const lines = linesOf(body);
    assert.equal(lines.length, 2);
    assert.ok(lines.every((line) => line.outcome === "settled"));
    assert.ok(lines.every((line) => line.operatorProfileId === operatorProfileId));

    const creditsA = await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calcA.id);
    const creditsB = await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calcB.id);
    assert.equal(creditsA.length, 1);
    assert.equal(creditsB.length, 1);
    assert.equal(creditsA[0]?.entryType, "remuneration");
    assert.equal(creditsA[0]?.direction, "credit");
    assert.equal(creditsA[0]?.installmentTotal, 1);
    assert.equal(creditsA[0]?.amount, 100, "crédito = calc.amount (nunca a tarifa de venda)");
    assert.equal(creditsB[0]?.amount, 50);
    assert.notEqual(creditsA[0]?.groupId, creditsB[0]?.groupId, "um lançamento (group_id) por calculation");
  });
});

test("[REM-06] o valor do crédito é o calc.amount REAL (não acopla tarifa de venda); marcador settled_at fica no calculation", async () => {
  await withSettlementApi(async (context) => {
    const { payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 123.45 });

    const response = await settle(context, context.tenantA.id, { calculationIds: [calc.id] });
    const body = await readJson(response);
    assert.equal(response.status, 200);

    const credits = await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calc.id);
    assert.equal(credits.length, 1);
    assert.equal(credits[0]?.amount, 123.45, "amount = commission calculation, não preço de venda");

    // O marcador vive no calculation (settled_at) + link ao extrato (settlement_ref = group_id).
    const marked = (await context.commissionRepo.findCalculationsByIds(context.tenantA.id, [calc.id]))[0];
    assert.ok(marked?.settledAt instanceof Date);
    assert.equal(marked?.settlementRef, credits[0]?.groupId);
  });
});

// ---------- REM-03: idempotência — liquidar 2× NÃO duplica o crédito ----------

test("[REM-03] liquidar 2× a MESMA calculation NÃO duplica o crédito (marcador settled_at → already_settled)", async () => {
  await withSettlementApi(async (context) => {
    const { payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 200 });

    const first = await readJson(await settle(context, context.tenantA.id, { calculationIds: [calc.id] }));
    assert.equal(linesOf(first)[0]?.outcome, "settled");
    const groupId = linesOf(first)[0]?.statementGroupId;

    const second = await readJson(await settle(context, context.tenantA.id, { calculationIds: [calc.id] }));
    assert.equal(dataOf(second).settledCount, 0, "2ª liquidação não conta nada de novo");
    assert.equal(linesOf(second)[0]?.outcome, "already_settled");
    assert.equal(linesOf(second)[0]?.statementGroupId, groupId, "aponta o crédito já existente");

    const credits = await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calc.id);
    assert.equal(credits.length, 1, "1 crédito, nunca duplicado");
  });
});

test("[REM-03] dupla-guarda: crédito de origem PRÉ-existente (settled_at ainda nulo) não duplica ao liquidar", async () => {
  await withSettlementApi(async (context) => {
    const { operatorProfileId, payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 90 });

    // Simula um settle parcial (crédito postado, mas o markSettled não pegou): o extrato já tem a origem.
    await context.statementService.createForSource(actorFor(context.tenantA.id), {
      operatorProfileId,
      entryType: "remuneration",
      direction: "credit",
      sourceType: "remuneration",
      sourceId: calc.id,
      amount: 90,
      installmentTotal: 1,
      firstDueDate: new Date("2026-07-01"),
      description: "crédito pré-existente",
    });
    assert.equal((await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calc.id)).length, 1);

    // Liquidar agora: createForSource devolve o grupo existente (source-idempotency) → NÃO duplica.
    const body = await readJson(await settle(context, context.tenantA.id, { calculationIds: [calc.id] }));
    assert.equal(linesOf(body)[0]?.outcome, "settled");

    const credits = await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calc.id);
    assert.equal(credits.length, 1, "source-idempotency do extrato impede o 2º crédito");
  });
});

test("[REM-03] calculation semeada JÁ liquidada → already_settled, sem novo crédito", async () => {
  await withSettlementApi(async (context) => {
    const { payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calc = context.commissionRepo.seedCalculationForTests({
      tenantId: context.tenantA.id,
      payeeId: payeeUserId,
      amount: 300,
      settledAt: new Date("2026-06-01T00:00:00.000Z"),
      settlementRef: randomUUID(),
    });

    const body = await readJson(await settle(context, context.tenantA.id, { calculationIds: [calc.id] }));
    assert.equal(linesOf(body)[0]?.outcome, "already_settled");
    assert.equal((await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calc.id)).length, 0);
  });
});

// ---------- REM-04: payee(User) → operator_profile ----------

test("[REM-04] payee SEM operator_profile → 422 payee_not_a_professional (não credita folha inexistente)", async () => {
  await withSettlementApi(async (context) => {
    // payee é um usuário QUALQUER, sem perfil profissional.
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: randomUUID(), amount: 100 });

    const response = await settle(context, context.tenantA.id, { calculationIds: [calc.id] });
    assert.equal(response.status, 422);
    assert.match(await response.text(), /payee_not_a_professional/);
    assert.equal((await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calc.id)).length, 0);
  });
});

test("[REM-04] calculation sem payee_id → 422 payee_not_a_professional", async () => {
  await withSettlementApi(async (context) => {
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, amount: 100 });
    const response = await settle(context, context.tenantA.id, { calculationIds: [calc.id] });
    assert.equal(response.status, 422);
    assert.match(await response.text(), /payee_not_a_professional/);
  });
});

// ---------- REM-10: multi-tenant (cross-tenant 404) ----------

test("[REM-10] liquidar calculation de OUTRO tenant → 404 calculation_not_found (nunca credita cross-tenant)", async () => {
  await withSettlementApi(async (context) => {
    const { payeeUserId } = await seedProfessional(context, context.tenantB.id);
    const calcB = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantB.id, payeeId: payeeUserId, amount: 100 });

    const response = await settle(context, context.tenantA.id, { calculationIds: [calcB.id] });
    assert.equal(response.status, 404);
    assert.match(await response.text(), /calculation_not_found/);
    assert.equal((await context.statementRepo.findActiveBySource(context.tenantB.id, "remuneration", calcB.id)).length, 0);
  });
});

// ---------- REM-05: não-amplificador ----------

test("[REM-05] ator com commissions:settle mas SEM professional_statements:create grava só o crédito constrangido", async () => {
  await withSettlementApi(async (context) => {
    const { operatorProfileId, payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 80 });

    // x-role finance ∩ x-permissions {commissions:settle} → efetivo = SÓ commissions:settle
    // (NÃO tem professional_statements:create). O crédito é escrito mesmo assim (efeito service→service).
    const response = await fetch(`${context.baseUrl}/api/v1/commissions/settlements`, {
      method: "POST",
      headers: {
        ...authHeaders(context.tenantA.id, randomUUID(), "finance"),
        "x-permissions": "commissions:settle",
        "content-type": "application/json",
      },
      body: JSON.stringify({ calculationIds: [calc.id] }),
    });
    assert.equal(response.status, 200);

    const credits = await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calc.id);
    assert.equal(credits.length, 1, "crédito lançado sem exigir professional_statements:create do ator");
    assert.equal(credits[0]?.operatorProfileId, operatorProfileId);
    assert.equal(credits[0]?.entryType, "remuneration");
    assert.equal(credits[0]?.direction, "credit");
  });
});

// ---------- REM-01: grid de conferência (bolinha derivada de settledAt) ----------

test("[REM-01] GET calculations expõe settledAt/settlementRef após liquidar (a bolinha)", async () => {
  await withSettlementApi(async (context) => {
    const { payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 42 });

    // Antes: bolinha vermelha (settledAt null).
    const before = await readJson(await listCalculations(context, context.tenantA.id, payeeUserId));
    assert.equal(itemsOf(before)[0]?.settledAt, null);
    assert.equal(itemsOf(before)[0]?.settlementRef, null);

    const settleBody = await readJson(await settle(context, context.tenantA.id, { calculationIds: [calc.id] }));
    const groupId = linesOf(settleBody)[0]?.statementGroupId;

    // Depois: bolinha verde (settledAt setado) + deep-link (settlementRef = group_id do extrato).
    const after = await readJson(await listCalculations(context, context.tenantA.id, payeeUserId));
    const row = itemsOf(after)[0];
    assert.ok(typeof row?.settledAt === "string", "settledAt agora é uma data ISO");
    assert.equal(row?.settlementRef, groupId);
  });
});

// ---------- REM-11: RBAC reusada (sem permissão nova) ----------

test("[REM-11] settle exige commissions:settle — operator/manager → 403; anônimo → 403; finance → 200", async () => {
  await withSettlementApi(async (context) => {
    const { payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 10 });
    const payload = JSON.stringify({ calculationIds: [calc.id] });

    const operator = await fetch(`${context.baseUrl}/api/v1/commissions/settlements`, {
      method: "POST",
      headers: { ...authHeaders(context.tenantA.id, randomUUID(), "operator"), "content-type": "application/json" },
      body: payload,
    });
    const manager = await fetch(`${context.baseUrl}/api/v1/commissions/settlements`, {
      method: "POST",
      headers: { ...authHeaders(context.tenantA.id, randomUUID(), "manager"), "content-type": "application/json" },
      body: payload,
    });
    const anon = await fetch(`${context.baseUrl}/api/v1/commissions/settlements`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });

    assert.equal(operator.status, 403);
    assert.equal(manager.status, 403);
    assert.match(await manager.text(), /commissions:settle|permission_required/);
    assert.equal(anon.status, 403);
    // finance (tem commissions:settle) → 200.
    const finance = await settle(context, context.tenantA.id, { calculationIds: [calc.id] });
    assert.equal(finance.status, 200);
  });
});

// ---------- REM-09: §2.8 / LGPD ----------

test("[REM-09] §2.8 — resposta do settle e DTO da calculation nunca vazam tenant_id/CNH", async () => {
  await withSettlementApi(async (context) => {
    const { payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 77 });

    const settleResponse = await settle(context, context.tenantA.id, { calculationIds: [calc.id] });
    const settleText = await settleResponse.text();
    assert.equal(settleResponse.status, 200);
    assert.equal(settleText.includes(context.tenantA.id), false, "tenant_id NUNCA no corpo do settle (§2.8)");
    assert.equal(/cnh/i.test(settleText), false, "sem CNH no settle (§2.8/LGPD)");

    const listText = await (await listCalculations(context, context.tenantA.id, payeeUserId)).text();
    assert.equal(listText.includes(context.tenantA.id), false, "tenant_id NUNCA no DTO da calculation");
    assert.equal(/cnh/i.test(listText), false, "sem CNH no grid");
  });
});

// ---------- REM-02: skip de valor zero ----------

test("[REM] amount ≤ 0 → skipped_zero (não cria crédito vazio)", async () => {
  await withSettlementApi(async (context) => {
    const { payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 0 });

    const body = await readJson(await settle(context, context.tenantA.id, { calculationIds: [calc.id] }));
    assert.equal(linesOf(body)[0]?.outcome, "skipped_zero");
    assert.equal(dataOf(body).settledCount, 0);
    assert.equal((await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calc.id)).length, 0);
  });
});

// ---------- validação de entrada (422) ----------

test("[REM] calculationIds vazio → 422; uuid inválido → 422; ids duplicados são deduplicados", async () => {
  await withSettlementApi(async (context) => {
    const empty = await settle(context, context.tenantA.id, { calculationIds: [] });
    assert.equal(empty.status, 422);
    assert.match(await empty.text(), /invalid_calculation_ids/);

    const badUuid = await settle(context, context.tenantA.id, { calculationIds: ["not-a-uuid"] });
    assert.equal(badUuid.status, 422);
    assert.match(await badUuid.text(), /invalid_calculation_id/);

    // Dedupe: [id, id] liquida uma única vez.
    const { payeeUserId } = await seedProfessional(context, context.tenantA.id);
    const calc = context.commissionRepo.seedCalculationForTests({ tenantId: context.tenantA.id, payeeId: payeeUserId, amount: 60 });
    const body = await readJson(await settle(context, context.tenantA.id, { calculationIds: [calc.id, calc.id] }));
    assert.equal(linesOf(body).length, 1, "id duplicado é deduplicado → 1 linha");
    assert.equal((await context.statementRepo.findActiveBySource(context.tenantA.id, "remuneration", calc.id)).length, 1);
  });
});

// ---------- infra do teste ----------

type SettlementApiContext = {
  readonly baseUrl: string;
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly commissionRepo: InMemoryCommissionRepository;
  readonly statementRepo: InMemoryProfessionalStatementRepository;
  readonly operatorProfileService: OperatorProfileService;
  readonly statementService: ProfessionalStatementService;
};

async function withSettlementApi(callback: (context: SettlementApiContext) => Promise<void>): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { resetCommissionRuntimeForTests, getMemoryCommissionRepositoryForTests },
    { createMemoryOperatorProfileService, resetOperatorProfileRuntimeForTests },
    { createMemoryProfessionalStatementService, getMemoryProfessionalStatementRepositoryForTests, resetProfessionalStatementRuntimeForTests },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/commissions/index.js"),
    import("../src/modules/operator-profiles/operator-profile.service.js"),
    import("../src/modules/professional-statements/professional-statement.service.js"),
  ]);

  resetCommissionRuntimeForTests();
  resetOperatorProfileRuntimeForTests();
  resetProfessionalStatementRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Remuneracoes A", modules: ["dashboard", "commissions"] });
  const tenantB = core.createTenant({ name: "Remuneracoes B", modules: ["dashboard", "commissions"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      tenantA,
      tenantB,
      commissionRepo: getMemoryCommissionRepositoryForTests(),
      statementRepo: getMemoryProfessionalStatementRepositoryForTests(),
      operatorProfileService: createMemoryOperatorProfileService(),
      statementService: createMemoryProfessionalStatementService(),
    });
  } finally {
    resetCommissionRuntimeForTests();
    resetOperatorProfileRuntimeForTests();
    resetProfessionalStatementRuntimeForTests();
    await closeServer(server);
  }
}

// Cria um operator_profile (a folha) para um payee(User) → devolve o par payeeUserId/operatorProfileId.
async function seedProfessional(
  context: SettlementApiContext,
  tenantId: string,
): Promise<{ operatorProfileId: string; payeeUserId: string }> {
  const payeeUserId = randomUUID();
  const profile = await context.operatorProfileService.create(actorFor(tenantId), {
    user_id: payeeUserId,
    full_name: "Profissional Remuneracao",
  });
  return { operatorProfileId: profile.id, payeeUserId };
}

function actorFor(tenantId: string) {
  return { tenantId, userId: randomUUID(), roles: ["manager" as const], permissions: [] };
}

function settle(context: SettlementApiContext, tenantId: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${context.baseUrl}/api/v1/commissions/settlements`, {
    method: "POST",
    headers: { ...authHeaders(tenantId, randomUUID(), "finance"), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function listCalculations(context: SettlementApiContext, tenantId: string, payeeId: string): Promise<Response> {
  return fetch(`${context.baseUrl}/api/v1/commissions/calculations?payee_id=${payeeId}`, {
    headers: authHeaders(tenantId, randomUUID(), "finance"),
  });
}

function authHeaders(tenantId: string, userId: string, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": role,
  };
}

type SettlementLine = {
  readonly calculationId: string;
  readonly outcome: string;
  readonly statementGroupId: string | null;
  readonly operatorProfileId: string | null;
};

async function readJson(response: Response): Promise<{ readonly data?: Record<string, unknown>; readonly items?: unknown[] }> {
  return (await response.json()) as { readonly data?: Record<string, unknown>; readonly items?: unknown[] };
}

function dataOf(body: { readonly data?: Record<string, unknown> }): Record<string, unknown> {
  return body.data ?? {};
}

function linesOf(body: { readonly data?: Record<string, unknown> }): SettlementLine[] {
  return (dataOf(body).lines as SettlementLine[] | undefined) ?? [];
}

function itemsOf(body: { readonly items?: unknown[] }): Array<Record<string, unknown>> {
  return (body.items as Array<Record<string, unknown>> | undefined) ?? [];
}

async function getBaseUrl(server: Server): Promise<string> {
  const address = await new Promise<AddressInfo>((resolve) => {
    server.once("listening", () => resolve(server.address() as AddressInfo));
  });

  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
