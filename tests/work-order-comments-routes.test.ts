import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("POST /work-orders/:id/comments → 201 e aparece no GET .../timeline", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { title: "OS comentável" } });
    const created = await req(baseUrl, `/api/v1/work-orders/${wo.body.data.id}/comments`, {
      method: "POST",
      headers: h(seed.tenantA, seed.managerA, "manager"),
      body: { message: "Confirmar horário com o cliente." },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.eventType, "work_order_comment");
    assert.equal(created.body.data.message, "Confirmar horário com o cliente.");
    assert.equal(created.body.data.tenantId, undefined);

    const tl = await req(baseUrl, `/api/v1/work-orders/${wo.body.data.id}/timeline`, { headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(tl.status, 200);
    const comments = tl.body.data.filter((e: { eventType: string }) => e.eventType === "work_order_comment");
    assert.equal(comments.length, 1);
    assert.equal(comments[0].message, "Confirmar horário com o cliente.");
  });
});

test("POST comment vazio → 400 comment_required", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { title: "OS" } });
    const res = await req(baseUrl, `/api/v1/work-orders/${wo.body.data.id}/comments`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: "  " } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.reason, "comment_required");
  });
});

test("[RBAC] POST comment sem work_orders:comment (viewer) → 403; sem headers → 403", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { title: "OS" } });
    const asViewer = await req(baseUrl, `/api/v1/work-orders/${wo.body.data.id}/comments`, { method: "POST", headers: h(seed.tenantA, seed.viewerA, "viewer"), body: { message: "x" } });
    const anon = await req(baseUrl, `/api/v1/work-orders/${wo.body.data.id}/comments`, { method: "POST", body: { message: "x" } });
    assert.equal(asViewer.status, 403);
    assert.equal(anon.status, 403);
  });
});

test("[RBAC] operator (tem work_orders:comment) comenta → 201; comment > 4000 → 422", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { title: "OS" } });
    const asOperator = await req(baseUrl, `/api/v1/work-orders/${wo.body.data.id}/comments`, { method: "POST", headers: h(seed.tenantA, seed.operatorA, "operator"), body: { message: "operador comentou" } });
    assert.equal(asOperator.status, 201);
    assert.equal(asOperator.body.data.message, "operador comentou");
    const tooLong = await req(baseUrl, `/api/v1/work-orders/${wo.body.data.id}/comments`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: "z".repeat(4001) } });
    assert.equal(tooLong.status, 422);
    assert.equal(tooLong.body.error.reason, "comment_too_long");
  });
});

test("[isolamento] comentar em OS de outra organização → 404", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { title: "OS A" } });
    const cross = await req(baseUrl, `/api/v1/work-orders/${wo.body.data.id}/comments`, { method: "POST", headers: h(seed.tenantB, seed.managerB, "manager"), body: { message: "invasor" } });
    assert.equal(cross.status, 404);
    assert.equal(cross.body.error.reason, "not_found");
  });
});

test("GET /operations/dispatches/:id/timeline → 200 (sem vazar tenantId); cross-tenant 404; viewer 403", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { title: "OS despacho" } });
    const dispatch = await req(baseUrl, "/api/v1/operations/dispatches", {
      method: "POST",
      headers: h(seed.tenantA, seed.managerA, "manager"),
      body: { workOrderId: wo.body.data.id, operatorUserId: seed.techA.id },
    });
    assert.equal(dispatch.status, 201);
    const id = dispatch.body.data.id;

    const timeline = await req(baseUrl, `/api/v1/operations/dispatches/${id}/timeline`, { headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(timeline.status, 200);
    assert.ok(Array.isArray(timeline.body.data));
    assert.equal(timeline.body.data[0].eventType, "field_dispatch_created");
    assert.equal(timeline.body.data[0].tenantId, undefined); // DTO não vaza tenant

    const cross = await req(baseUrl, `/api/v1/operations/dispatches/${id}/timeline`, { headers: h(seed.tenantB, seed.managerB, "manager") });
    assert.equal(cross.status, 404);

    // viewer LÊ despachos (field_dispatch:read) → 200; sem auth → 403.
    const asViewer = await req(baseUrl, `/api/v1/operations/dispatches/${id}/timeline`, { headers: h(seed.tenantA, seed.viewerA, "viewer") });
    assert.equal(asViewer.status, 200);
    const anon = await req(baseUrl, `/api/v1/operations/dispatches/${id}/timeline`);
    assert.equal(anon.status, 403);
  });
});

test("[hardening] POST dispatch para alvo NÃO-field (viewer) → 422 target_not_field_technician", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { title: "OS" } });
    const res = await req(baseUrl, "/api/v1/operations/dispatches", {
      method: "POST",
      headers: h(seed.tenantA, seed.managerA, "manager"),
      body: { workOrderId: wo.body.data.id, operatorUserId: seed.viewerA.id },
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.reason, "target_not_field_technician");
  });
});

test("[P-034] comentário NÃO aparece no feed recentEvents do dashboard (corpo pode ter PII)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { title: "OS dash" } });
    const marker = "SEGREDO-CLIENTE-NAO-VAZA";
    await req(baseUrl, `/api/v1/work-orders/${wo.body.data.id}/comments`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: marker } });
    const summary = await req(baseUrl, "/api/v1/dashboard/summary", { headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(summary.status, 200);
    const events = summary.body.data.recentEvents ?? [];
    assert.equal(events.some((e: { eventType?: string }) => e.eventType === "work_order_comment"), false);
    assert.equal(JSON.stringify(summary.body).includes(marker), false);
  });
});

// ---------- harness ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly viewerA: User;
  readonly techA: User;
  readonly operatorA: User;
};

async function withApi(cb: (c: { baseUrl: string; seed: SeedData }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { resetFieldDispatchRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetWorkOrderRuntimeForTests();
  resetFieldDispatchRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Tenant WOC A", modules: ["work_orders", "field_operations"] });
  const tenantB = core.createTenant({ name: "Tenant WOC B", modules: ["work_orders", "field_operations"] });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Manager A", email: "woc-manager-a@example.com", roles: ["manager"] });
  const managerB = core.createUser({ tenantId: tenantB.id, name: "Manager B", email: "woc-manager-b@example.com", roles: ["manager"] });
  const viewerA = core.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "woc-viewer-a@example.com", roles: ["viewer"] });
  const techA = core.createUser({ tenantId: tenantA.id, name: "Tec A", email: "woc-tec-a@example.com", roles: ["field_technician"] });
  const operatorA = core.createUser({ tenantId: tenantA.id, name: "Op A", email: "woc-op-a@example.com", roles: ["operator"] });
  const seed: SeedData = { tenantA, tenantB, managerA, managerB, viewerA, techA, operatorA };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await baseUrlOf(server);
  try {
    await cb({ baseUrl, seed });
  } finally {
    await close(server);
    resetWorkOrderRuntimeForTests();
    resetFieldDispatchRuntimeForTests();
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
