import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("[R21/M25] POST /commissions/policies recusa scope = engine ou ruleType engine_* com 422 reserved_scope", async () => {
  await withCommissionApi(async ({ baseUrl, seed }) => {
    const scopeRes = await fetch(`${baseUrl}/api/v1/commissions/policies`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      body: JSON.stringify({
        name: "Política tentando usar scope engine",
        scope: "  ENGINE ",
        vertical: "field_services",
        rules: [],
      }),
    });
    const scopeBody = await readJson(scopeRes);
    assert.equal(scopeRes.status, 422);
    assert.equal((scopeBody.error as Record<string, unknown> | undefined)?.reason, "reserved_scope");

    const ruleRes = await fetch(`${baseUrl}/api/v1/commissions/policies`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      body: JSON.stringify({
        name: "Política tentando usar ruleType engine_payee",
        scope: "tenant",
        vertical: "field_services",
        rules: [
          {
            ruleType: " Engine_Payee ",
            basisType: "work_order_total",
            rateType: "percent",
            rateValue: 10,
            conditions: { payeeUserId: seed.operatorA.id },
          },
        ],
      }),
    });
    const ruleBody = await readJson(ruleRes);
    assert.equal(ruleRes.status, 422);
    assert.equal((ruleBody.error as Record<string, unknown> | undefined)?.reason, "reserved_scope");
  });
});

test("[R21] POST /commissions/basis-events recusa idempotencyKey engine:* ou sourceEventName engine.* com 422 reserved_key", async () => {
  await withCommissionApi(async ({ baseUrl, seed }) => {
    const keyRes = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify({
        sourceType: "work_order",
        sourceId: randomUUID(),
        sourceEventName: "work_order.completed",
        idempotencyKey: " engine:wo:123:v1 ",
        payload: {},
      }),
    });
    const keyBody = await readJson(keyRes);
    assert.equal(keyRes.status, 422);
    assert.equal((keyBody.error as Record<string, unknown> | undefined)?.reason, "reserved_key");

    const eventRes = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify({
        sourceType: "work_order",
        sourceId: randomUUID(),
        sourceEventName: " ENGINE.work_order.completed ",
        idempotencyKey: "manual-key-1",
        payload: {},
      }),
    });
    const eventBody = await readJson(eventRes);
    assert.equal(eventRes.status, 422);
    assert.equal((eventBody.error as Record<string, unknown> | undefined)?.reason, "reserved_key");
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
  readonly managerA: User;
  readonly financeA: User;
  readonly operatorA: User;
  readonly viewerA: User;
  readonly userIdsA: {
    readonly admin: string;
    readonly manager: string;
    readonly finance: string;
    readonly operator: string;
    readonly viewer: string;
  };
  readonly userIdsB: {
    readonly admin: string;
  };
};

type CommissionApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withCommissionApi(callback: (context: CommissionApiContext) => Promise<void>): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { resetCommissionRuntimeForTests, getMemoryCommissionRepositoryForTests },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/commissions/index.js"),
  ]);

  resetCommissionRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const repo = getMemoryCommissionRepositoryForTests();
  for (const id of Object.values(seed.userIdsA)) {
    repo.registerTenantUserForTests(seed.tenantA.id, id);
  }
  for (const id of Object.values(seed.userIdsB)) {
    repo.registerTenantUserForTests(seed.tenantB.id, id);
  }
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    resetCommissionRuntimeForTests();
    await closeServer(server);
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Motor Comissoes A",
    modules: ["dashboard", "commissions", "finance"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Motor Comissoes B",
    modules: ["dashboard", "commissions", "finance"],
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "motor-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Admin B",
    email: "motor-admin-b@example.com",
    roles: ["tenant_admin"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "motor-manager-a@example.com",
    roles: ["manager"],
  });
  const financeA = service.createUser({
    tenantId: tenantA.id,
    name: "Finance A",
    email: "motor-finance-a@example.com",
    roles: ["finance"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "motor-operator-a@example.com",
    roles: ["operator"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "motor-viewer-a@example.com",
    roles: ["viewer"],
  });

  return {
    tenantA,
    tenantB,
    adminA,
    adminB,
    managerA,
    financeA,
    operatorA,
    viewerA,
    userIdsA: {
      admin: randomUUID(),
      manager: randomUUID(),
      finance: randomUUID(),
      operator: randomUUID(),
      viewer: randomUUID(),
    },
    userIdsB: {
      admin: randomUUID(),
    },
  };
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
  };
}

function jsonHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    ...authHeaders(tenant, user, role),
    "content-type": "application/json",
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
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

test("[R11/R16] PUT /commissions/rates/payees/:userId valida rateType, rateValue, reason e exige commissions:manage_policy", async () => {
  await withCommissionApi(async ({ baseUrl, seed }) => {
    const targetId = seed.userIdsA.operator;
    // 403 sem permissão (finance não tem commissions:manage_policy)
    const forbidden = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${targetId}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, seed.userIdsA.finance, "finance"),
      body: JSON.stringify({
        rateType: "percent",
        rateValue: "10",
        reason: "Definindo taxa inicial",
        expectedRuleId: null,
      }),
    });
    assert.equal(forbidden.status, 403);

    // 422 invalid_rate_type
    const badType = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${targetId}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, seed.userIdsA.admin, "tenant_admin"),
      body: JSON.stringify({
        rateType: "tiered",
        rateValue: "10",
        reason: "Definindo taxa inicial",
        expectedRuleId: null,
      }),
    });
    assert.equal(badType.status, 422);
    assert.equal(((await readJson(badType)).error as Record<string, unknown>)?.reason, "invalid_rate_type");

    // 422 invalid_rate_value (número JSON em vez de texto decimal, ou fora de faixa)
    const badValNum = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${targetId}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, seed.userIdsA.admin, "tenant_admin"),
      body: JSON.stringify({
        rateType: "percent",
        rateValue: 10,
        reason: "Definindo taxa inicial",
        expectedRuleId: null,
      }),
    });
    assert.equal(badValNum.status, 422);
    assert.equal(((await readJson(badValNum)).error as Record<string, unknown>)?.reason, "invalid_rate_value");

    const badValRange = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${targetId}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, seed.userIdsA.admin, "tenant_admin"),
      body: JSON.stringify({
        rateType: "percent",
        rateValue: "100.01",
        reason: "Definindo taxa inicial",
        expectedRuleId: null,
      }),
    });
    assert.equal(badValRange.status, 422);
    assert.equal(((await readJson(badValRange)).error as Record<string, unknown>)?.reason, "invalid_rate_value");

    // 422 reason_required (< 5 chars)
    const badReason = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${targetId}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, seed.userIdsA.admin, "tenant_admin"),
      body: JSON.stringify({
        rateType: "percent",
        rateValue: "12.5",
        reason: "abc",
        expectedRuleId: null,
      }),
    });
    assert.equal(badReason.status, 422);
    assert.equal(((await readJson(badReason)).error as Record<string, unknown>)?.reason, "reason_required");
  });
});

test("[R11/M11/M32/M33] trava da própria comissão (P3): perfil com permissão mas sem papel da exceção -> 403 self_rate_forbidden; gestor/admin -> 200 selfChange: true", async () => {
  await withCommissionApi(async ({ baseUrl, seed }) => {
    const [{ CommissionService }, { getMemoryCommissionRepositoryForTests }] = await Promise.all([
      import("../src/modules/commissions/commission.service.js"),
      import("../src/modules/commissions/index.js"),
    ]);
    const service = new CommissionService(getMemoryCommissionRepositoryForTests());

    // Perfil futuro com a permissão commissions:manage_policy mas sem papel da exceção (ex.: role "finance" ou "operator")
    await assert.rejects(
      service.upsertPayeeRate(
        {
          tenantId: seed.tenantA.id,
          userId: seed.userIdsA.operator,
          roles: ["operator"],
          permissions: ["commissions:manage_policy"],
        },
        seed.userIdsA.operator,
        {
          rateType: "percent",
          rateValue: "15",
          reason: "Tentando definir a própria comissão",
          expectedRuleId: null,
        },
      ),
      (err: unknown) => {
        const e = err as { statusCode?: number; reason?: string };
        assert.equal(e.statusCode, 403);
        assert.equal(e.reason, "self_rate_forbidden");
        return true;
      },
    );

    // Gestor (manager) definindo a própria pela rota HTTP -> 200, selfChange: true
    const managerSelf = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${seed.userIdsA.manager}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, seed.userIdsA.manager, "manager"),
      body: JSON.stringify({
        rateType: "fixed",
        rateValue: "95.00",
        reason: "Gestor definindo própria comissão fixa",
        expectedRuleId: null,
      }),
    });
    const managerSelfBody = await readJson(managerSelf);
    assert.equal(managerSelf.status, 200);
    const data = managerSelfBody.data as Record<string, unknown>;
    assert.equal(data?.payeeUserId, seed.userIdsA.manager);
    assert.equal(data?.rateType, "fixed");
    assert.equal(data?.rateValue, "95.00");
    assert.equal(data?.rateValueCents, "9500");
    assert.equal(data?.selfChange, true);
  });
});

test("[R11/M9/M12/C-CENTS] ciclo de regra por pessoa: criar, idempotência de valor igual, 409 expectedRuleId, 404 cross-tenant, GET /rates, /history e /rates/mine", async () => {
  await withCommissionApi(async ({ baseUrl, seed }) => {
    const opId = seed.userIdsA.operator;
    const adminId = seed.userIdsA.admin;
    const crossId = seed.userIdsB.admin;

    // 404 para usuário de outra organização
    const crossPut = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${crossId}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, adminId, "tenant_admin"),
      body: JSON.stringify({
        rateType: "percent",
        rateValue: "10",
        reason: "Tentativa em usuário de outra org",
        expectedRuleId: null,
      }),
    });
    assert.equal(crossPut.status, 404);
    assert.equal(((await readJson(crossPut)).error as Record<string, unknown>)?.reason, "payee_not_found");

    // 1ª definição para operatorA
    const put1 = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${opId}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, adminId, "tenant_admin"),
      body: JSON.stringify({
        rateType: "percent",
        rateValue: "12.5",
        reason: "Comissão inicial acordada",
        expectedRuleId: null,
      }),
    });
    assert.equal(put1.status, 200);
    const rule1 = (await readJson(put1)).data as Record<string, unknown>;
    const rule1Id = rule1.ruleId as string;
    assert.ok(rule1Id);
    assert.equal(rule1.rateType, "percent");
    assert.equal(rule1.rateValue, "12.5");
    assert.equal(rule1.selfChange, false);

    // Idempotência: mesmo rateType e rateValue com expectedRuleId = rule1Id não cria regra nova
    const putSame = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${opId}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, adminId, "tenant_admin"),
      body: JSON.stringify({
        rateType: "percent",
        rateValue: "12.5000",
        reason: "Reenvio com mesmo valor",
        expectedRuleId: rule1Id,
      }),
    });
    assert.equal(putSame.status, 200);
    const ruleSame = (await readJson(putSame)).data as Record<string, unknown>;
    assert.equal(ruleSame.ruleId, rule1Id);

    // 409 rate_changed_meanwhile quando expectedRuleId está errado (null quando já existe regra vigente)
    const putConflict = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${opId}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, adminId, "tenant_admin"),
      body: JSON.stringify({
        rateType: "fixed",
        rateValue: "80.00",
        reason: "Mudança com expectedRuleId defasado",
        expectedRuleId: null,
      }),
    });
    assert.equal(putConflict.status, 409);
    assert.equal(((await readJson(putConflict)).error as Record<string, unknown>)?.reason, "rate_changed_meanwhile");

    // 2ª definição válida (troca para fixo R$ 80,00)
    const put2 = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${opId}`, {
      method: "PUT",
      headers: jsonHeadersId(seed.tenantA.id, adminId, "tenant_admin"),
      body: JSON.stringify({
        rateType: "fixed",
        rateValue: "80.00",
        reason: "Passou para valor fixo por atendimento",
        expectedRuleId: rule1Id,
      }),
    });
    assert.equal(put2.status, 200);
    const rule2 = (await readJson(put2)).data as Record<string, unknown>;
    assert.notEqual(rule2.ruleId, rule1Id);
    assert.equal(rule2.rateType, "fixed");
    assert.equal(rule2.rateValue, "80.00");
    assert.equal(rule2.rateValueCents, "8000");

    // GET /commissions/rates
    const listRates = await fetch(`${baseUrl}/api/v1/commissions/rates`, {
      headers: authHeadersId(seed.tenantA.id, adminId, "tenant_admin"),
    });
    assert.equal(listRates.status, 200);
    const listRatesBody = await readJson(listRates);
    const ratesItems = (listRatesBody.items ?? (listRatesBody.data as any)?.items) as Array<Record<string, unknown>>;
    assert.equal(ratesItems.length, 1);
    assert.equal(ratesItems[0]?.ruleId, rule2.ruleId);
    assert.equal(ratesItems[0]?.rateValueCents, "8000");

    // GET /commissions/rates/payees/:userId/history
    const historyRes = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${opId}/history`, {
      headers: authHeadersId(seed.tenantA.id, adminId, "tenant_admin"),
    });
    assert.equal(historyRes.status, 200);
    const historyBody = await readJson(historyRes);
    const historyItems = (historyBody.items ?? (historyBody.data as any)?.items) as Array<Record<string, unknown>>;
    assert.equal(historyItems.length, 2);
    assert.equal(historyItems[0]?.ruleId, rule2.ruleId);
    assert.equal(historyItems[0]?.active, true);
    assert.equal(historyItems[1]?.ruleId, rule1Id);
    assert.equal(historyItems[1]?.active, false);

    // GET /commissions/rates/mine (o próprio guincheiro lê a vigente sem reason nem changedBy)
    const mineRes = await fetch(`${baseUrl}/api/v1/commissions/rates/mine`, {
      headers: authHeadersId(seed.tenantA.id, opId, "operator"),
    });
    assert.equal(mineRes.status, 200);
    const mineData = (await readJson(mineRes)).data as Record<string, unknown>;
    assert.equal(mineData.ruleId, rule2.ruleId);
    assert.equal(mineData.rateValue, "80.00");
    assert.equal(mineData.rateValueCents, "8000");
    assert.equal("reason" in mineData, false);
    assert.equal("changedBy" in mineData, false);
  });
});

function authHeadersId(tenantId: string, userId: string, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": role,
  };
}

function jsonHeadersId(tenantId: string, userId: string, role: string): Record<string, string> {
  return {
    ...authHeadersId(tenantId, userId, role),
    "content-type": "application/json",
  };
}
