import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω3F-6a (D-Ω3F-6) — rotas POST /api/v1/work-orders/:id/cancel e /:id/duplicate.
// Cobre: RBAC (cancel exige work_orders:cancel — a permissão que existia no catálogo SEM nenhuma rota
// consumindo; duplicate exige work_orders:create), contrato de erro (400/409/422/404), decisão
// financeira no DTO e isolamento entre organizações.

test("POST /cancel com decisão keep → 200, decisão no DTO e status cancelled", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    const cancelled = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { reason: "Cliente desistiu no local", financial_decision: "keep" },
    });

    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.status, "cancelled");
    assert.equal(cancelled.body.data.financialCancellationDecision, "keep");
    assert.equal(cancelled.body.data.cancellationReason, "Cliente desistiu no local");
    assert.ok(cancelled.body.data.cancelledAt);
    // DTO público não vaza tenant nem a chave de idempotência interna (§2.8).
    assert.equal(cancelled.body.data.tenantId, undefined);
    assert.equal(cancelled.body.data.tenant_id, undefined);
    assert.equal(cancelled.body.data.clientActionId, undefined);
  });
});

test("POST /cancel com decisão zero → itens financeiros somem e o total agregado vira 0", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    for (const [description, unitAmount] of [["Guincho", 300], ["Pedágio", 25]] as const) {
      const item = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/financial-items`, {
        method: "POST",
        headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
        body: { source: "manual", description, unit_amount: unitAmount },
      });
      assert.equal(item.status, 201);
    }

    const cancelled = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { reason: "Aberta por engano", financial_decision: "zero" },
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.financialCancellationDecision, "zero");

    const financeiro = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/financial-items`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(financeiro.body.items.length, 0);
    assert.equal(financeiro.body.totalAmount, 0);
  });
});

test("POST /cancel: sem motivo → 400; decisão inválida → 422; OS já cancelada → 422", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);

    const semMotivo = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { financial_decision: "keep" },
    });
    assert.equal(semMotivo.status, 400);
    assert.equal(semMotivo.body.error.reason, "cancellation_reason_required");

    const decisaoInvalida = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { reason: "x", financial_decision: "descontar" },
    });
    assert.equal(decisaoInvalida.status, 422);
    assert.equal(decisaoInvalida.body.error.reason, "invalid_financial_decision");

    const semDecisao = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { reason: "x" },
    });
    assert.equal(semDecisao.status, 422);
    assert.equal(semDecisao.body.error.reason, "invalid_financial_decision");

    const ok = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { reason: "Cancelamento válido", financial_decision: "keep" },
    });
    assert.equal(ok.status, 200);

    const replay = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { reason: "Segundo cancelamento", financial_decision: "zero" },
    });
    assert.equal(replay.status, 422);
    assert.equal(replay.body.error.reason, "invalid_status_transition");
  });
});

test("[RBAC] POST /cancel sem work_orders:cancel (operator/dispatcher) → 403; sem headers → 403", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);

    // operator tem work_orders:status (muda status), mas cancelar decide o DESTINO DO DINHEIRO.
    const asOperator = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { reason: "x", financial_decision: "zero" },
    });
    assert.equal(asOperator.status, 403);

    const asDispatcher = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.dispatcherA, "field_dispatcher"),
      body: { reason: "x", financial_decision: "zero" },
    });
    assert.equal(asDispatcher.status, 403);

    const anon = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      body: { reason: "x", financial_decision: "zero" },
    });
    assert.equal(anon.status, 403);

    // Backend é a autoridade: nenhum 403 mexeu na OS.
    const detail = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(detail.body.data.status, "open");
    assert.equal(detail.body.data.financialCancellationDecision, null);
  });
});

test("[isolamento] POST /cancel em OS de outra organização → 404", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    const cross = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { reason: "cross", financial_decision: "zero" },
    });

    assert.equal(cross.status, 404);
    assert.equal(cross.body.error.reason, "not_found");
  });
});

test("POST /duplicate → 201 com novo código, status open e sem itens financeiros da fonte", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    const item = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/financial-items`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { source: "manual", description: "Guincho", unit_amount: 500 },
    });
    assert.equal(item.status, 201);

    const source = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const copy = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/duplicate`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {},
    });

    assert.equal(copy.status, 201);
    assert.equal(copy.body.data.status, "open");
    assert.notEqual(copy.body.data.id, workOrderId);
    assert.notEqual(copy.body.data.code, source.body.data.code);
    assert.equal(copy.body.data.title, source.body.data.title);
    assert.equal(copy.body.data.financialCancellationDecision, null);

    // Invariante Ω3-e: duplicar NÃO herda preço congelado.
    const financeiroCopia = await requestJson(baseUrl, `/api/v1/work-orders/${copy.body.data.id}/financial-items`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(financeiroCopia.body.items.length, 0);
    assert.equal(financeiroCopia.body.totalAmount, 0);
  });
});

test("POST /duplicate: replay do mesmo client_action_id → 409 duplicate_work_order", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    const body = { client_action_id: "dup-rota-1" };

    const first = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/duplicate`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body,
    });
    const replay = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/duplicate`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body,
    });

    assert.equal(first.status, 201);
    assert.equal(replay.status, 409);
    assert.equal(replay.body.error.reason, "duplicate_work_order");

    const list = await requestJson(baseUrl, "/api/v1/work-orders", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(list.body.pagination.total, 2, "fonte + 1 cópia: o replay não gerou uma terceira OS");
  });
});

test("[RBAC] POST /duplicate sem work_orders:create (operator) → 403; dispatcher (tem create) → 201", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);

    const asOperator = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/duplicate`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: {},
    });
    assert.equal(asOperator.status, 403);

    const anon = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/duplicate`, {
      method: "POST",
      body: {},
    });
    assert.equal(anon.status, 403);

    // Duplicar é criar: quem cria OS (field_dispatcher) duplica.
    const asDispatcher = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/duplicate`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.dispatcherA, "field_dispatcher"),
      body: {},
    });
    assert.equal(asDispatcher.status, 201);
  });
});

test("[isolamento] POST /duplicate em OS de outra organização → 404 (nada é criado)", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    const cross = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/duplicate`, {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: {},
    });

    assert.equal(cross.status, 404);
    assert.equal(cross.body.error.reason, "not_found");

    const listB = await requestJson(baseUrl, "/api/v1/work-orders", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    assert.equal(listB.body.pagination.total, 0);
  });
});

// ---------- harness (espelho de tests/work-order-financials-routes.test.ts) ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly operatorA: User;
  readonly dispatcherA: User;
};

type WorkOrderApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly createWorkOrder: (tenant: Tenant, user: User) => Promise<string>;
};

async function withWorkOrderApi(callback: (context: WorkOrderApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderFinancialRuntimeForTests },
    { resetWorkOrderCommentRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { resetTariffRuntimeForTests },
    { resetPriceTableRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-order-financials/index.js"),
    import("../src/modules/work-order-comments/index.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/tariffs/tariff.service.js"),
    import("../src/modules/price-tables/price-table.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const resetAll = () => {
    resetPriceTableRuntimeForTests();
    resetTariffRuntimeForTests();
    resetWorkOrderRuntimeForTests();
    resetWorkOrderFinancialRuntimeForTests();
    resetWorkOrderCommentRuntimeForTests();
  };
  resetAll();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  const createWorkOrder = async (tenant: Tenant, user: User): Promise<string> => {
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(tenant, user, "manager"),
      body: { title: `OS Cancel/Duplicate ${randomUUID()}`, serviceAddress: "Rua das Flores, 100", serviceCity: "Curitiba" },
    });
    assert.equal(created.status, 201);
    return created.body.data.id as string;
  };

  try {
    await callback({ baseUrl, seed, createWorkOrder });
  } finally {
    await closeServer(server);
    resetAll();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Cancel A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Cancel B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "cancel-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "cancel-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "cancel-operator-a@example.com", roles: ["operator"] });
  const dispatcherA = service.createUser({
    tenantId: tenantA.id,
    name: "Dispatcher A",
    email: "cancel-dispatcher-a@example.com",
    roles: ["field_dispatcher"],
  });
  return { tenantA, tenantB, managerA, managerB, operatorA, dispatcherA };
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
