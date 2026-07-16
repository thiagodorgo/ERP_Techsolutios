import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω3F-5 (D-Ω3F-5) — comentário como AGREGADO PRÓPRIO em /work-orders/:id/comments (fonte própria; NÃO
// aparece mais na timeline nem no feed do dashboard). Tags do comentário via .../comments/:id/tags/:tag.

test("POST /work-orders/:id/comments → 201 (DTO sem tenantId) e aparece no GET .../comments", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const created = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, {
      method: "POST",
      headers: h(seed.tenantA, seed.managerA, "manager"),
      body: { message: "Confirmar horário com o cliente." },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.message, "Confirmar horário com o cliente.");
    assert.equal(created.body.data.authorUserId, seed.managerA.id);
    assert.deepEqual(created.body.data.tags, []);
    assert.equal(created.body.data.editedAt, null);
    assert.equal(created.body.data.tenantId, undefined); // §2.8

    const list = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].message, "Confirmar horário com o cliente.");
    assert.equal(list.body.items[0].tenantId, undefined);
  });
});

test("POST comment com tag_ids → 201 com tags coloridas; GET reflete", async () => {
  await withApi(async ({ baseUrl, seed, makeTag }) => {
    const wo = await createWo(baseUrl, seed);
    const tag = await makeTag("Urgente", "#ef4444");
    const created = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, {
      method: "POST",
      headers: h(seed.tenantA, seed.managerA, "manager"),
      body: { message: "priorizar", tag_ids: [tag] },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.tags.length, 1);
    assert.equal(created.body.data.tags[0].name, "Urgente");
    assert.equal(created.body.data.tags[0].color, "#ef4444");

    const list = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(list.body.items[0].tags[0].name, "Urgente");
  });
});

test("POST comment com tag inexistente → 422 tag_not_found", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const res = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, {
      method: "POST",
      headers: h(seed.tenantA, seed.managerA, "manager"),
      body: { message: "x", tag_ids: ["11111111-1111-4111-8111-111111111111"] },
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.reason, "tag_not_found");
  });
});

test("POST comment vazio → 400 comment_required", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const res = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: "  " } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.reason, "comment_required");
  });
});

test("[RBAC] POST comment sem work_orders:comment (viewer) → 403; sem headers → 403", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const asViewer = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantA, seed.viewerA, "viewer"), body: { message: "x" } });
    const anon = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", body: { message: "x" } });
    assert.equal(asViewer.status, 403);
    assert.equal(anon.status, 403);
  });
});

test("[RBAC] GET comments exige work_orders:read (viewer lê → 200; anon → 403)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const asViewer = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { headers: h(seed.tenantA, seed.viewerA, "viewer") });
    const anon = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`);
    assert.equal(asViewer.status, 200);
    assert.equal(anon.status, 403);
  });
});

test("[RBAC] operator (tem work_orders:comment) comenta → 201; comment > 4000 → 422", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const asOperator = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantA, seed.operatorA, "operator"), body: { message: "operador comentou" } });
    assert.equal(asOperator.status, 201);
    assert.equal(asOperator.body.data.message, "operador comentou");
    const tooLong = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: "z".repeat(4001) } });
    assert.equal(tooLong.status, 422);
    assert.equal(tooLong.body.error.reason, "comment_too_long");
  });
});

test("[isolamento] comentar / listar em OS de outra organização → 404", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const cross = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantB, seed.managerB, "manager"), body: { message: "invasor" } });
    assert.equal(cross.status, 404);
    const crossList = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { headers: h(seed.tenantB, seed.managerB, "manager") });
    assert.equal(crossList.status, 404);
  });
});

test("PATCH edita a mensagem e carimba editedAt", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const created = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: "antes" } });
    const id = created.body.data.id;
    const edited = await req(baseUrl, `/api/v1/work-orders/${wo}/comments/${id}`, { method: "PATCH", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: "depois" } });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.data.message, "depois");
    assert.notEqual(edited.body.data.editedAt, null);
  });
});

test("PATCH/DELETE: autor SEM update mexe no próprio; NÃO no de outro (403); quem tem update modera", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    // dispatcher tem work_orders:comment mas NÃO work_orders:update.
    const own = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantA, seed.dispatcherA, "field_dispatcher"), body: { message: "do dispatcher" } });
    assert.equal(own.status, 201);
    const foreign = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: "do manager" } });

    // autor edita o próprio → 200
    const editOwn = await req(baseUrl, `/api/v1/work-orders/${wo}/comments/${own.body.data.id}`, { method: "PATCH", headers: h(seed.tenantA, seed.dispatcherA, "field_dispatcher"), body: { message: "editado" } });
    assert.equal(editOwn.status, 200);

    // dispatcher tenta editar o do manager → 403
    const editForeign = await req(baseUrl, `/api/v1/work-orders/${wo}/comments/${foreign.body.data.id}`, { method: "PATCH", headers: h(seed.tenantA, seed.dispatcherA, "field_dispatcher"), body: { message: "hack" } });
    assert.equal(editForeign.status, 403);
    assert.equal(editForeign.body.error.reason, "comment_forbidden");

    // manager (tem update) exclui o do dispatcher → 204
    const del = await req(baseUrl, `/api/v1/work-orders/${wo}/comments/${own.body.data.id}`, { method: "DELETE", headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(del.status, 204);
  });
});

test("DELETE (soft) → 204 e some do GET; re-DELETE → 404", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const created = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: "apagar" } });
    const id = created.body.data.id;
    const del = await req(baseUrl, `/api/v1/work-orders/${wo}/comments/${id}`, { method: "DELETE", headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(del.status, 204);
    const list = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(list.body.items.length, 0);
    const reDel = await req(baseUrl, `/api/v1/work-orders/${wo}/comments/${id}`, { method: "DELETE", headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(reDel.status, 404);
  });
});

test("POST/DELETE tags do comentário: attach → 201, duplicate → 409, detach → 204, detach de novo → 404", async () => {
  await withApi(async ({ baseUrl, seed, makeTag }) => {
    const wo = await createWo(baseUrl, seed);
    const tag = await makeTag("Followup", "#3b82f6");
    const comment = await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: "acompanhar" } });
    const cid = comment.body.data.id;

    const attach = await req(baseUrl, `/api/v1/work-orders/${wo}/comments/${cid}/tags/${tag}`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(attach.status, 201);
    assert.equal(attach.body.data.tags[0].name, "Followup");

    const dup = await req(baseUrl, `/api/v1/work-orders/${wo}/comments/${cid}/tags/${tag}`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.reason, "duplicate_tag_assignment");

    const detach = await req(baseUrl, `/api/v1/work-orders/${wo}/comments/${cid}/tags/${tag}`, { method: "DELETE", headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(detach.status, 204);
    const detachAgain = await req(baseUrl, `/api/v1/work-orders/${wo}/comments/${cid}/tags/${tag}`, { method: "DELETE", headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(detachAgain.status, 404);
  });
});

test("GET /operations/dispatches/:id/timeline → 200 (sem vazar tenantId); cross-tenant 404; viewer 403", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const dispatch = await req(baseUrl, "/api/v1/operations/dispatches", {
      method: "POST",
      headers: h(seed.tenantA, seed.managerA, "manager"),
      body: { workOrderId: wo, operatorUserId: seed.techA.id },
    });
    assert.equal(dispatch.status, 201);
    const id = dispatch.body.data.id;

    const timeline = await req(baseUrl, `/api/v1/operations/dispatches/${id}/timeline`, { headers: h(seed.tenantA, seed.managerA, "manager") });
    assert.equal(timeline.status, 200);
    assert.ok(Array.isArray(timeline.body.data));
    assert.equal(timeline.body.data[0].eventType, "field_dispatch_created");
    assert.equal(timeline.body.data[0].tenantId, undefined);

    const cross = await req(baseUrl, `/api/v1/operations/dispatches/${id}/timeline`, { headers: h(seed.tenantB, seed.managerB, "manager") });
    assert.equal(cross.status, 404);

    const asViewer = await req(baseUrl, `/api/v1/operations/dispatches/${id}/timeline`, { headers: h(seed.tenantA, seed.viewerA, "viewer") });
    assert.equal(asViewer.status, 200);
    const anon = await req(baseUrl, `/api/v1/operations/dispatches/${id}/timeline`);
    assert.equal(anon.status, 403);
  });
});

test("[hardening] POST dispatch para alvo NÃO-field (viewer) → 422 target_not_field_technician", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const res = await req(baseUrl, "/api/v1/operations/dispatches", {
      method: "POST",
      headers: h(seed.tenantA, seed.managerA, "manager"),
      body: { workOrderId: wo, operatorUserId: seed.viewerA.id },
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.reason, "target_not_field_technician");
  });
});

test("[P-034] comentário NÃO aparece no feed recentEvents do dashboard (não gera evento; corpo pode ter PII)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWo(baseUrl, seed);
    const marker = "SEGREDO-CLIENTE-NAO-VAZA";
    await req(baseUrl, `/api/v1/work-orders/${wo}/comments`, { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { message: marker } });
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
  readonly dispatcherA: User;
};

async function createWo(baseUrl: string, seed: SeedData): Promise<string> {
  const wo = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: h(seed.tenantA, seed.managerA, "manager"), body: { title: "OS comentável" } });
  assert.equal(wo.status, 201);
  return wo.body.data.id;
}

async function withApi(cb: (c: { baseUrl: string; seed: SeedData; makeTag: (name: string, color?: string) => Promise<string> }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { resetFieldDispatchRuntimeForTests },
    { resetWorkOrderCommentRuntimeForTests },
    { resetTagAssignmentRuntimeForTests },
    { createMemoryTagService, resetTagRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/work-order-comments/index.js"),
    import("../src/modules/tag-assignments/index.js"),
    import("../src/modules/tags/tag.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const resetAll = () => {
    resetWorkOrderRuntimeForTests();
    resetFieldDispatchRuntimeForTests();
    resetWorkOrderCommentRuntimeForTests();
    resetTagAssignmentRuntimeForTests();
    resetTagRuntimeForTests();
  };
  resetAll();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Tenant WOC A", modules: ["work_orders", "field_operations"] });
  const tenantB = core.createTenant({ name: "Tenant WOC B", modules: ["work_orders", "field_operations"] });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Manager A", email: "woc-manager-a@example.com", roles: ["manager"] });
  const managerB = core.createUser({ tenantId: tenantB.id, name: "Manager B", email: "woc-manager-b@example.com", roles: ["manager"] });
  const viewerA = core.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "woc-viewer-a@example.com", roles: ["viewer"] });
  const techA = core.createUser({ tenantId: tenantA.id, name: "Tec A", email: "woc-tec-a@example.com", roles: ["field_technician"] });
  const operatorA = core.createUser({ tenantId: tenantA.id, name: "Op A", email: "woc-op-a@example.com", roles: ["operator"] });
  const dispatcherA = core.createUser({ tenantId: tenantA.id, name: "Disp A", email: "woc-disp-a@example.com", roles: ["field_dispatcher"] });
  const seed: SeedData = { tenantA, tenantB, managerA, managerB, viewerA, techA, operatorA, dispatcherA };

  // Tags criadas direto no service em memória (singleton compartilhado com a API): evita acoplar o
  // teste às permissões da rota de tags. Tenant-scoped em tenantA.
  const tagService = createMemoryTagService();
  const tagActor = { tenantId: tenantA.id, userId: managerA.id, roles: ["manager"], permissions: ["tags:read", "tags:create"] } as never;
  const makeTag = async (name: string, color?: string): Promise<string> => {
    const tag = await tagService.create(tagActor, color ? { name, color } : { name });
    return tag.id;
  };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await baseUrlOf(server);
  try {
    await cb({ baseUrl, seed, makeTag });
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
