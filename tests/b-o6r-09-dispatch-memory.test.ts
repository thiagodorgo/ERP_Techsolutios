import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { WorkOrderChecklistSetPort } from "../src/modules/field-dispatch/field-dispatch.service.js";

// B-O6R-09 (item 7 do portão) — o contrato do despacho no modo MEMÓRIA, o mesmo do Prisma:
//   [P3 · domínio] (T10)  a repetição pela mesma chave responde 200 com o mesmo despacho e NÃO publica
//                         `field_dispatch.created` de novo;
//   [A3] (T16)            transição para o status atual é no-op: 200, 0 evento, carimbo intocado;
//   [R2-03] (T16b)        o mesmo status COM observação ou motivo é recusado (422), nunca 200 que descarta o texto;
//   [T17 · memória/Prisma] `createEvent` recusa os 4 tipos obrigatórios (eles só nascem na transação do estado);
//   [R2-11] (T7m)         2 POST simultâneos com a mesma chave → 1 despacho e 1 atribuição da OS.
// Sem banco: o Prisma do T17 recebe um cliente falso, porque a guarda dispara antes de qualquer acesso.

const TRANSITION_EVENT_TYPES = [
  "field_dispatch_created",
  "field_dispatch_status_changed",
  "field_dispatch_cancelled",
  "field_dispatch_reassigned",
] as const;

test("[P3 · domínio] repetição não publica field_dispatch.created e responde 200", async () => {
  await withDispatchApi(async ({ baseUrl, seed, broker }) => {
    const published: string[] = [];
    const unsubscribe = broker.subscribe(seed.tenantA.id, (event) => {
      if (event.name === "field_dispatch.created") published.push(String(event.payload.entity_id));
    });
    try {
      const idempotencyKey = `b-o6r-09-${randomUUID()}`;
      const body = { workOrderId: seed.workOrderId, operatorUserId: seed.operatorA.id, idempotencyKey };
      const first = await requestJson(baseUrl, "/api/v1/operations/dispatches", { method: "POST", headers: managerHeaders(seed), body });
      const second = await requestJson(baseUrl, "/api/v1/operations/dispatches", { method: "POST", headers: managerHeaders(seed), body });

      assert.equal(first.status, 201, JSON.stringify(first.body));
      assert.equal(second.status, 200, `a repetição tem de responder 200, respondeu ${second.status}`);
      assert.equal(second.body.data.id, first.body.data.id, "a repetição devolveu outro despacho");
      assert.deepEqual(published, [first.body.data.id], "a repetição publicou field_dispatch.created de novo");
      const listed = await requestJson(baseUrl, `/api/v1/operations/dispatches?workOrderId=${seed.workOrderId}`, { headers: managerHeaders(seed) });
      assert.equal(listed.body.pagination.total, 1, "nasceu um 2º despacho");
      assert.equal(JSON.stringify(second.body).includes(idempotencyKey), false, "a chave não sai na resposta");
    } finally {
      unsubscribe();
    }
  });
});

test("[A3] accepted→accepted: 200, 0 evento novo, accepted_at igual; cancelled→cancelled idem", async () => {
  await withMemoryServices(async (m) => {
    const os = await m.workOrders.create(m.manager, { title: "OS no-op" });
    const dispatch = await m.dispatches.create(m.manager, { workOrderId: os.id, operatorUserId: m.techA });
    const accepted = await m.dispatches.changeStatus(m.manager, dispatch.id, { status: "accepted" });
    const eventsBefore = (await m.dispatches.timeline(m.manager, dispatch.id)).length;

    const again = await m.dispatches.changeStatus(m.manager, dispatch.id, { status: "accepted" });
    assert.equal(again.status, "accepted");
    assert.equal(again.acceptedAt?.getTime(), accepted.acceptedAt?.getTime(), "accepted_at foi reescrito");
    assert.equal((await m.dispatches.timeline(m.manager, dispatch.id)).length, eventsBefore, "a transição X→X gravou evento");

    const cancelled = await m.dispatches.changeStatus(m.manager, dispatch.id, { status: "cancelled", reason: "Cliente desistiu." });
    const afterCancel = (await m.dispatches.timeline(m.manager, dispatch.id)).length;
    const cancelledAgain = await m.dispatches.changeStatus(m.manager, dispatch.id, { status: "cancelled" });
    assert.equal(cancelledAgain.cancelledAt?.getTime(), cancelled.cancelledAt?.getTime(), "cancelled_at foi reescrito");
    assert.equal((await m.dispatches.timeline(m.manager, dispatch.id)).length, afterCancel, "cancelled→cancelled gravou evento");
  });
});

test("[R2-03] accepted→accepted com observação → 422, 0 evento; sem observação → 200 no-op", async () => {
  await withMemoryServices(async (m) => {
    const os = await m.workOrders.create(m.manager, { title: "OS mesmo status com texto" });
    const dispatch = await m.dispatches.create(m.manager, { workOrderId: os.id, operatorUserId: m.techA });
    await m.dispatches.changeStatus(m.manager, dispatch.id, { status: "accepted" });
    const eventsBefore = (await m.dispatches.timeline(m.manager, dispatch.id)).length;

    await assert.rejects(
      m.dispatches.changeStatus(m.manager, dispatch.id, { status: "accepted", observation: "Status atualizado pela operação." }),
      (error: any) => error.statusCode === 422 && error.code === "FIELD_DISPATCH_STATUS_UNCHANGED",
    );
    await assert.rejects(
      m.dispatches.changeStatus(m.manager, dispatch.id, { status: "accepted", reason: "motivo qualquer" }),
      (error: any) => error.statusCode === 422 && error.code === "FIELD_DISPATCH_STATUS_UNCHANGED",
    );
    assert.equal((await m.dispatches.timeline(m.manager, dispatch.id)).length, eventsBefore, "o 422 gravou evento");
    const current = await m.dispatches.get(m.manager, dispatch.id);
    assert.equal(current.observation, undefined, "o 422 gravou a observação");

    const noop = await m.dispatches.changeStatus(m.manager, dispatch.id, { status: "accepted" });
    assert.equal(noop.status, "accepted");
    assert.equal((await m.dispatches.timeline(m.manager, dispatch.id)).length, eventsBefore);
  });
});

test("[T17 · memória] createEvent recusa field_dispatch_created/status_changed/cancelled/reassigned; aceita checklist_run_failed", async () => {
  const { InMemoryFieldDispatchRepository } = await import("../src/modules/field-dispatch/field-dispatch.repository.js");
  const repository = new InMemoryFieldDispatchRepository();
  const base = { tenantId: randomUUID(), dispatchId: randomUUID(), workOrderId: randomUUID(), message: "x" };
  for (const eventType of TRANSITION_EVENT_TYPES) {
    await assert.rejects(
      async () => repository.createEvent({ ...base, eventType }),
      (error: any) => error.code === "FIELD_DISPATCH_EVENT_TYPE_RESERVED",
      `memória aceitou ${eventType} fora da transação`,
    );
  }
  const event = await repository.createEvent({ ...base, eventType: "field_dispatch_checklist_run_failed" });
  assert.equal(event.eventType, "field_dispatch_checklist_run_failed");
});

test("[T17 · Prisma] createEvent recusa field_dispatch_created/status_changed/cancelled/reassigned; aceita checklist_run_failed", async () => {
  const { PrismaFieldDispatchRepository } = await import("../src/modules/field-dispatch/field-dispatch-prisma.repository.js");
  const writes: string[] = [];
  const fakeClient = {
    fieldDispatchEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        writes.push(String(data.event_type));
        return { id: randomUUID(), created_at: new Date(), from_status: null, to_status: null, actor_user_id: null, ...data };
      },
    },
  };
  const repository = new PrismaFieldDispatchRepository(fakeClient as never);
  const base = { tenantId: randomUUID(), dispatchId: randomUUID(), workOrderId: randomUUID(), message: "x" };
  for (const eventType of TRANSITION_EVENT_TYPES) {
    await assert.rejects(
      async () => repository.createEvent({ ...base, eventType }),
      (error: any) => error.code === "FIELD_DISPATCH_EVENT_TYPE_RESERVED",
      `Prisma aceitou ${eventType} fora da transação`,
    );
  }
  assert.deepEqual(writes, [], "a guarda tem de disparar antes de qualquer escrita");
  const event = await repository.createEvent({ ...base, eventType: "field_dispatch_checklist_run_failed" });
  assert.equal(event.eventType, "field_dispatch_checklist_run_failed");
  assert.deepEqual(writes, ["field_dispatch_checklist_run_failed"]);
});

test("[R2-11 · T7m] 2 POST simultâneos com a mesma chave na memória → 1 despacho, 1 atribuição da OS", async () => {
  await withMemoryServices(async (m) => {
    const os = await m.workOrders.create(m.manager, { title: "OS corrida na memória" });
    const body = { workOrderId: os.id, operatorUserId: m.techA, idempotencyKey: `b-o6r-09-${randomUUID()}` };
    const [first, second] = await Promise.all([m.dispatches.create(m.manager, body), m.dispatches.create(m.manager, body)]);

    assert.equal(first.id, second.id, "as duas respostas trazem despachos diferentes");
    const listed = await m.dispatches.list(m.manager, { workOrderId: os.id });
    assert.equal(listed.total, 1, "nasceram dois despachos para a mesma chave");
    const assigned = (await m.workOrders.timeline(m.manager, os.id)).filter((event) => event.eventType === "work_order_assigned");
    assert.equal(assigned.length, 1, "a OS foi atribuída duas vezes");
  });
});

// ---------------------------------------------------------------------------------------------------------------------

async function withMemoryServices(
  callback: (m: {
    readonly dispatches: any;
    readonly workOrders: any;
    readonly manager: any;
    readonly techA: string;
  }) => Promise<void>,
): Promise<void> {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createMemoryFieldDispatchService, resetFieldDispatchRuntimeForTests },
    { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  resetFieldDispatchRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: `B-O6R-09 ${randomUUID()}`, modules: ["work_orders", "field_operations"] });
  const manager = core.createUser({ tenantId: tenant.id, name: "Gestor", email: `b-o6r-09-mgr-${randomUUID()}@example.com`, roles: ["manager"] });
  const techA = core.createUser({ tenantId: tenant.id, name: "Tecnico A", email: `b-o6r-09-a-${randomUUID()}@example.com`, roles: ["field_technician"] });
  try {
    await callback({
      dispatches: createMemoryFieldDispatchService(new MemoryCoreSaasAdapter(core), inertChecklistSetPort()),
      workOrders: createMemoryWorkOrderService(),
      manager: managerActor(tenant.id, manager.id),
      techA: techA.id,
    });
  } finally {
    resetFieldDispatchRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  }
}

async function withDispatchApi(
  callback: (context: { readonly baseUrl: string; readonly seed: any; readonly broker: any }) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    { resetFieldDispatchRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { fieldOpsRealtimeBroker },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/field-ops-realtime/index.js"),
  ]);
  resetFieldDispatchRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Tenant B-O6R-09", modules: ["dashboard", "work_orders", "field_operations"] });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Gestor", email: `b-o6r-09-http-mgr-${randomUUID()}@example.com`, roles: ["manager"] });
  const operatorA = core.createUser({ tenantId: tenantA.id, name: "Tecnico", email: `b-o6r-09-http-tec-${randomUUID()}@example.com`, roles: ["field_technician"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const seed = { tenantA, managerA, operatorA, workOrderId: "" };
    const createdWorkOrder = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: managerHeaders(seed),
      body: { title: "OS para despacho idempotente" },
    });
    assert.equal(createdWorkOrder.status, 201);
    await callback({ baseUrl, seed: { ...seed, workOrderId: createdWorkOrder.body.data.id }, broker: fieldOpsRealtimeBroker });
  } finally {
    await closeServer(server);
    resetFieldDispatchRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  }
}

function managerHeaders(seed: { readonly tenantA: { id: string }; readonly managerA: { id: string } }): Record<string, string> {
  return { "x-tenant-id": seed.tenantA.id, "x-user-id": seed.managerA.id, "x-role": "manager" };
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

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

function inertChecklistSetPort(): WorkOrderChecklistSetPort {
  return { load: async () => [], freeze: async () => {}, recordDeferred: async () => {}, recordMissingAtDispatch: async () => {} };
}

function managerActor(tenantId: string, userId: string) {
  return {
    tenantId,
    userId,
    roles: ["manager"],
    permissions: ["field_dispatch:read", "field_dispatch:create", "field_dispatch:update", "field_dispatch:cancel", "field_dispatch:reassign"],
  } as never;
}
