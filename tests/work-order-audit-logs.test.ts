import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω3F-8a — LEITURA da auditoria (AuditLog) filtrada por OS ("aba Logs da OS"). Módulo próprio
// (work-order-audit-logs) montado no app.ts, reusando WorkOrderService.get para o guard 404 cross-tenant.
// Só leitura: GET /work-orders/:id/audit-logs (work_orders:read). §2.8: DTO sem tenant_id.

// ---------- service-level (memory) ----------

async function harness() {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createMemoryWorkOrderAuditLogService, getMemoryWorkOrderAuditLogRepositoryForTests, resetWorkOrderAuditLogRuntimeForTests },
    { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests },
  ] = await Promise.all([
    import("../src/modules/work-order-audit-logs/index.js"),
    import("../src/modules/work-orders/index.js"),
  ]);

  const reset = () => {
    resetWorkOrderAuditLogRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  };
  reset();

  return {
    audit: createMemoryWorkOrderAuditLogService(),
    workOrders: createMemoryWorkOrderService(),
    repo: getMemoryWorkOrderAuditLogRepositoryForTests(),
    reset,
  };
}

function actor(overrides: Partial<{ tenantId: string; userId: string; permissions: string[] }> = {}) {
  return {
    tenantId: overrides.tenantId ?? randomUUID(),
    userId: overrides.userId ?? randomUUID(),
    roles: ["manager"],
    permissions: overrides.permissions ?? ["work_orders:read", "work_orders:create"],
  } as never;
}

async function reason(fn: () => Promise<unknown>): Promise<{ statusCode?: number; reason?: string }> {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (error) {
    return error as { statusCode?: number; reason?: string };
  }
}

test("lista só os logs DESTA OS (filtra por entity + entity_id), mais recentes primeiro", async () => {
  const { audit, workOrders, repo, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS auditada" });
    const other = await workOrders.create(ctx, { title: "Outra OS" });

    repo.seed({ tenantId: ctx.tenantId, entity: "work_order", entityId: wo.id, action: "work_order.created", actorUserId: ctx.userId, createdAt: new Date("2026-07-01T10:00:00.000Z") });
    repo.seed({ tenantId: ctx.tenantId, entity: "work_order", entityId: wo.id, action: "work_order.cancelled", actorUserId: ctx.userId, createdAt: new Date("2026-07-03T10:00:00.000Z") });
    // Ruído: outra OS, e outra ENTIDADE com o mesmo id — não podem aparecer.
    repo.seed({ tenantId: ctx.tenantId, entity: "work_order", entityId: other.id, action: "work_order.created", createdAt: new Date("2026-07-02T10:00:00.000Z") });
    repo.seed({ tenantId: ctx.tenantId, entity: "customer", entityId: wo.id, action: "customer.updated", createdAt: new Date("2026-07-04T10:00:00.000Z") });

    const logs = await audit.listWorkOrderAuditLogs(ctx, wo.id);
    assert.equal(logs.length, 2);
    // Ordem desc por created_at.
    assert.deepEqual(logs.map((l) => l.action), ["work_order.cancelled", "work_order.created"]);
    for (const log of logs) {
      assert.equal(log.entity, "work_order");
      assert.equal(log.entityId, wo.id);
    }
  } finally {
    reset();
  }
});

test("OS sem eventos → lista vazia", async () => {
  const { audit, workOrders, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS sem logs" });
    assert.deepEqual(await audit.listWorkOrderAuditLogs(ctx, wo.id), []);
  } finally {
    reset();
  }
});

test("isolamento: listar logs de OS de outra organização → 404 (não vaza existência)", async () => {
  const { audit, workOrders, repo, reset } = await harness();
  try {
    const owner = actor();
    const wo = await workOrders.create(owner, { title: "OS do tenant A" });
    repo.seed({ tenantId: owner.tenantId, entity: "work_order", entityId: wo.id, action: "work_order.created" });
    const err = await reason(() => audit.listWorkOrderAuditLogs(actor(), wo.id));
    assert.equal(err.statusCode, 404);
  } finally {
    reset();
  }
});

test("logs de OUTRO tenant com o mesmo entity_id nunca vazam (defesa no repositório)", async () => {
  const { audit, workOrders, repo, reset } = await harness();
  try {
    const tenantId = randomUUID();
    const owner = actor({ tenantId });
    const wo = await workOrders.create(owner, { title: "OS" });
    // Log legítimo do dono + um log FORJADO de outro tenant com o mesmo entityId.
    repo.seed({ tenantId, entity: "work_order", entityId: wo.id, action: "work_order.created" });
    repo.seed({ tenantId: randomUUID(), entity: "work_order", entityId: wo.id, action: "work_order.hacked" });
    const logs = await audit.listWorkOrderAuditLogs(owner, wo.id);
    assert.equal(logs.length, 1);
    assert.equal(logs[0]!.action, "work_order.created");
  } finally {
    reset();
  }
});

test("limite: respeita o teto de 200 e clampa valores inválidos", async () => {
  const { audit, workOrders, repo, reset } = await harness();
  try {
    const ctx = actor();
    const wo = await workOrders.create(ctx, { title: "OS" });
    for (let i = 0; i < 5; i += 1) {
      repo.seed({ tenantId: ctx.tenantId, entity: "work_order", entityId: wo.id, action: `evt.${i}`, createdAt: new Date(2026, 6, i + 1) });
    }
    assert.equal((await audit.listWorkOrderAuditLogs(ctx, wo.id, 2)).length, 2);
    assert.equal((await audit.listWorkOrderAuditLogs(ctx, wo.id, 0)).length, 5); // 0 → default (não 0 registros)
    assert.equal((await audit.listWorkOrderAuditLogs(ctx, wo.id, -3)).length, 5);
  } finally {
    reset();
  }
});

// ---------- route-level (API) ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly viewerA: User;
  readonly financeA: User;
};

test("GET audit-logs: 200 com DTO sem tenant_id; actorName resolvido; actorUserId null → actorName null", async () => {
  await withApi(async ({ baseUrl, seed, repo }) => {
    const wo = await createWo(baseUrl, seed);
    repo.seed({ tenantId: seed.tenantA.id, entity: "work_order", entityId: wo, action: "work_order.mileage_updated", actorUserId: seed.managerA.id, metadata: { odometer: 1200, tenant_id: seed.tenantA.id, storage_key: "s3://bucket/x", path: "/secret" }, createdAt: new Date("2026-07-05T09:00:00.000Z") });
    repo.seed({ tenantId: seed.tenantA.id, entity: "work_order", entityId: wo, action: "work_order.created", actorUserId: null, createdAt: new Date("2026-07-04T09:00:00.000Z") });

    const res = await req(baseUrl, `/api/v1/work-orders/${wo}/audit-logs`, { headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 2);

    const [first, second] = res.body.items;
    assert.equal(first.action, "work_order.mileage_updated");
    assert.equal(first.actorName, "Manager A"); // resolvido via UserNameResolver
    assert.equal(first.entityId, wo);
    // §2.8 — nenhum tenant_id no DTO nem chaves proibidas no metadata.
    assert.equal(first.tenantId, undefined);
    assert.equal(first.metadata.odometer, 1200);
    assert.equal(first.metadata.tenant_id, undefined);
    assert.equal(first.metadata.storage_key, undefined);
    assert.equal(first.metadata.path, undefined);
    assert.equal(JSON.stringify(res.body).includes(seed.tenantA.id), false);

    // actor nulo → actorName null (o front cai em "Sistema").
    assert.equal(second.action, "work_order.created");
    assert.equal(second.actorName, null);
  });
});

test("[RBAC] GET audit-logs exige work_orders:read (viewer lê → 200; anon → 403)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const asViewer = await req(baseUrl, `/api/v1/work-orders/${wo}/audit-logs`, { headers: h(seed.tenantA, seed.viewerA, "viewer") });
    const anon = await req(baseUrl, `/api/v1/work-orders/${wo}/audit-logs`);
    assert.equal(asViewer.status, 200);
    assert.equal(anon.status, 403);
    // coordenador J-Ω3F-8A: ator AUTENTICADO sem work_orders:read (finance) → 403 (ramo permission_required,
    // não só o tenant_required do anônimo) — o backend é a autoridade, não a UI.
    const asFinance = await req(baseUrl, `/api/v1/work-orders/${wo}/audit-logs`, { headers: h(seed.tenantA, seed.financeA, "finance") });
    assert.equal(asFinance.status, 403);
  });
});

test("[isolamento] GET audit-logs de OS de outra organização → 404", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const cross = await req(baseUrl, `/api/v1/work-orders/${wo}/audit-logs`, { headers: h(seed.tenantB, seed.managerB, "manager") });
    assert.equal(cross.status, 404);
  });
});

// ---------- harness (API) ----------

async function createWo(baseUrl: string, seed: SeedData): Promise<string> {
  const wo = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { title: "OS auditável" } });
  assert.equal(wo.status, 201);
  return wo.body.data.id;
}

async function withApi(
  cb: (c: { baseUrl: string; seed: SeedData; repo: { seed: (i: Record<string, unknown>) => unknown } }) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { getMemoryWorkOrderAuditLogRepositoryForTests, resetWorkOrderAuditLogRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/work-order-audit-logs/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const resetAll = () => {
    resetWorkOrderRuntimeForTests();
    resetWorkOrderAuditLogRuntimeForTests();
  };
  resetAll();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Tenant WOAL A", modules: ["work_orders", "field_operations"] });
  const tenantB = core.createTenant({ name: "Tenant WOAL B", modules: ["work_orders", "field_operations"] });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Manager A", email: "woal-manager-a@example.com", roles: ["manager"] });
  const managerB = core.createUser({ tenantId: tenantB.id, name: "Manager B", email: "woal-manager-b@example.com", roles: ["manager"] });
  const viewerA = core.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "woal-viewer-a@example.com", roles: ["viewer"] });
  // finance NÃO tem work_orders:read — usuário AUTENTICADO sem a permissão (ramo permission_required, não tenant_required).
  const financeA = core.createUser({ tenantId: tenantA.id, name: "Finance A", email: "woal-finance-a@example.com", roles: ["finance"] });
  const seed: SeedData = { tenantA, tenantB, managerA, managerB, viewerA, financeA };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await baseUrlOf(server);
  try {
    await cb({ baseUrl, seed, repo: getMemoryWorkOrderAuditLogRepositoryForTests() });
  } finally {
    await close(server);
    resetAll();
  }
}

function h(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function req(baseUrl: string, path: string, options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function baseUrlOf(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
}
