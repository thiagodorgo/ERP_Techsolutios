import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω3F-7a — Quilometragem (km) da OS: o app PREENCHE (via sync, source="app"), a base CORRIGE (via PATCH
// /:id/mileage, source="base"). Invariantes cobertos aqui (CORE_SAAS_PERSISTENCE=memory):
//  · MERGE por-campo: o app pode mandar só o inicial e depois só o final; o valor efetivo de cada km é o
//    do corpo se presente, senão o persistido;
//  · 422 invalid_mileage_range quando AMBOS os efetivos existem e o final < inicial (no corpo E via merge);
//  · 400 invalid_mileage para km negativo/NaN/não-número;
//  · source tracking (app → base): a correção da base carimba mileageCorrectedAt e vira source="base";
//  · 404 cross-tenant nas duas portas (base e app);
//  · sync idempotente (replay do client_action_id não duplica o evento) e RBAC: a CORREÇÃO da base exige
//    a permissão dedicada work_orders:mileage_correct (só o escritório a tem; o técnico de campo, que tem
//    :update, NÃO a tem → 403), e o app exige :status (que o campo tem);
//  · o DETAIL DTO expõe os 4 campos (o list omite, payload enxuto).

process.env.CORE_SAAS_PERSISTENCE = "memory";

import {
  createMemoryWorkOrderService,
  resetWorkOrderRuntimeForTests,
} from "../src/modules/work-orders/work-order.service.js";
import { toWorkOrderDto } from "../src/modules/work-orders/work-order.dto.js";
import { WorkOrderError, type WorkOrderActorContext } from "../src/modules/work-orders/work-order.types.js";
import {
  syncMobileWorkOrderActions,
  resetMobileWorkOrderSyncRuntimeForTests,
} from "../src/modules/mobile/mobile-work-order-sync.js";
import type { AuthenticatedActor } from "../src/modules/core-saas/types/core-saas.types.js";

function actor(tenantId = randomUUID()): WorkOrderActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["work_orders:read", "work_orders:create", "work_orders:update", "work_orders:status"],
  };
}

function setup() {
  resetWorkOrderRuntimeForTests();
  resetMobileWorkOrderSyncRuntimeForTests();
  return { workOrders: createMemoryWorkOrderService() };
}

// ---------- service: app preenche (merge por-campo) ----------

test("app preenche a km inicial: source=app, sem carimbo de correção da base", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const wo = await workOrders.create(ctx, { title: "OS km" });

  const updated = await workOrders.setMileage(ctx, wo.id, { mileage_start: 1200.5 }, "app");

  assert.equal(updated.mileageStart, 1200.5);
  assert.equal(updated.mileageEnd, undefined);
  assert.equal(updated.mileageSource, "app");
  assert.equal(updated.mileageCorrectedAt, undefined, "só a base carimba mileageCorrectedAt");
});

test("app preenche o final DEPOIS (merge por-campo): o inicial persiste, o final é adicionado", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const wo = await workOrders.create(ctx, { title: "OS km em duas etapas" });

  await workOrders.setMileage(ctx, wo.id, { mileage_start: 1000 }, "app");
  const updated = await workOrders.setMileage(ctx, wo.id, { mileage_end: 1085.3 }, "app");

  assert.equal(updated.mileageStart, 1000, "o inicial de antes NÃO é apagado ao mandar só o final");
  assert.equal(updated.mileageEnd, 1085.3);
  assert.equal(updated.mileageSource, "app");
});

test("aceita camelCase (mileageStart/mileageEnd) além de snake_case", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const wo = await workOrders.create(ctx, { title: "OS camel" });

  const updated = await workOrders.setMileage(ctx, wo.id, { mileageStart: 50, mileageEnd: 90 }, "app");

  assert.equal(updated.mileageStart, 50);
  assert.equal(updated.mileageEnd, 90);
});

test("km = 0 é valor VÁLIDO e não cai no persistido (merge usa ?? não ||)", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const wo = await workOrders.create(ctx, { title: "OS zero" });

  await workOrders.setMileage(ctx, wo.id, { mileage_start: 10 }, "app");
  const updated = await workOrders.setMileage(ctx, wo.id, { mileage_start: 0, mileage_end: 0 }, "app");

  assert.equal(updated.mileageStart, 0, "0 no corpo sobrescreve o persistido");
  assert.equal(updated.mileageEnd, 0);
});

// ---------- service: base corrige (source tracking) ----------

test("base corrige a km: source=base e mileageCorrectedAt carimbado", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const wo = await workOrders.create(ctx, { title: "OS correção" });

  const antes = Date.now();
  const updated = await workOrders.setMileage(ctx, wo.id, { mileage_start: 500, mileage_end: 640 }, "base");

  assert.equal(updated.mileageStart, 500);
  assert.equal(updated.mileageEnd, 640);
  assert.equal(updated.mileageSource, "base");
  assert.ok(updated.mileageCorrectedAt instanceof Date);
  assert.ok((updated.mileageCorrectedAt as Date).getTime() >= antes);
});

test("source tracking app → base: o app preenche, a base corrige e a origem vira 'base'", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const wo = await workOrders.create(ctx, { title: "OS app depois base" });

  const doApp = await workOrders.setMileage(ctx, wo.id, { mileage_start: 100, mileage_end: 300 }, "app");
  assert.equal(doApp.mileageSource, "app");
  assert.equal(doApp.mileageCorrectedAt, undefined);

  const daBase = await workOrders.setMileage(ctx, wo.id, { mileage_end: 280 }, "base");
  assert.equal(daBase.mileageStart, 100, "o inicial do app persiste");
  assert.equal(daBase.mileageEnd, 280, "a base corrige o final");
  assert.equal(daBase.mileageSource, "base");
  assert.ok(daBase.mileageCorrectedAt instanceof Date);
});

// ---------- service: faixa (422) ----------

test("422 invalid_mileage_range quando o final < inicial (AMBOS no corpo)", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const wo = await workOrders.create(ctx, { title: "OS faixa" });

  await assert.rejects(
    () => workOrders.setMileage(ctx, wo.id, { mileage_start: 900, mileage_end: 800 }, "app"),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 422);
      assert.equal(error.reason, "invalid_mileage_range");
      return true;
    },
  );

  // Nada foi persistido: a OS segue sem km.
  const atual = await workOrders.get(ctx, wo.id);
  assert.equal(atual.mileageStart, undefined);
  assert.equal(atual.mileageEnd, undefined);
});

test("422 invalid_mileage_range via MERGE: inicial persistido + final menor no corpo", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const wo = await workOrders.create(ctx, { title: "OS faixa merge" });

  await workOrders.setMileage(ctx, wo.id, { mileage_start: 1000 }, "app");

  await assert.rejects(
    () => workOrders.setMileage(ctx, wo.id, { mileage_end: 950 }, "app"),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 422);
      assert.equal(error.reason, "invalid_mileage_range");
      return true;
    },
  );

  // O final inválido NÃO foi gravado; o inicial persiste.
  const atual = await workOrders.get(ctx, wo.id);
  assert.equal(atual.mileageStart, 1000);
  assert.equal(atual.mileageEnd, undefined);
});

// ---------- service: valor inválido (400) ----------

test("400 invalid_mileage para km negativo, NaN e tipo não-numérico", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const wo = await workOrders.create(ctx, { title: "OS inválida" });

  for (const body of [
    { mileage_start: -1 },
    { mileage_end: -0.1 },
    { mileage_start: "abc" },
    { mileage_start: true },
    { mileage_end: {} },
  ]) {
    await assert.rejects(
      () => workOrders.setMileage(ctx, wo.id, body, "app"),
      (error: WorkOrderError) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.reason, "invalid_mileage");
        return true;
      },
    );
  }
});

// ---------- service: timeline + isolamento ----------

test("grava o evento work_order_mileage_updated com metadata curada (§2.8)", async () => {
  const { workOrders } = setup();
  const ctx = actor();
  const wo = await workOrders.create(ctx, { title: "OS timeline km" });

  await workOrders.setMileage(ctx, wo.id, { mileage_start: 10, mileage_end: 42 }, "base");

  const timeline = await workOrders.timeline(ctx, wo.id);
  const evento = timeline.find((event) => event.eventType === "work_order_mileage_updated");
  assert.ok(evento, "o evento de km entra na timeline");
  assert.equal(evento.metadata.source, "base");
  assert.equal(evento.metadata.mileageStart, 10);
  assert.equal(evento.metadata.mileageEnd, 42);
  // Allowlist: nada de tenant na metadata.
  assert.equal(evento.metadata.tenantId, undefined);
  assert.equal(evento.metadata.tenant_id, undefined);
});

test("[isolamento] setMileage(base) em OS de outra organização → 404 (nada vaza, nada muda)", async () => {
  const { workOrders } = setup();
  const ctxA = actor();
  const ctxB = actor();
  const wo = await workOrders.create(ctxA, { title: "OS do tenant A" });

  await assert.rejects(
    () => workOrders.setMileage(ctxB, wo.id, { mileage_start: 100 }, "base"),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.reason, "not_found");
      return true;
    },
  );

  const atual = await workOrders.get(ctxA, wo.id);
  assert.equal(atual.mileageStart, undefined);
  assert.equal(atual.mileageSource, undefined);
});

test("[isolamento] setMileage(app) em OS de outra organização → 404", async () => {
  const { workOrders } = setup();
  const ctxA = actor();
  const ctxB = actor();
  const wo = await workOrders.create(ctxA, { title: "OS do tenant A (app)" });

  await assert.rejects(
    () => workOrders.setMileage(ctxB, wo.id, { mileage_start: 100 }, "app"),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.reason, "not_found");
      return true;
    },
  );
});

// ---------- DTO ----------

test("o DETAIL DTO expõe mileageStart/End/Source e mileageCorrectedAt (ISO); null quando ausente", async () => {
  const { workOrders } = setup();
  const ctx = actor();

  const semKm = await workOrders.create(ctx, { title: "OS sem km" });
  const dtoSem = toWorkOrderDto(semKm);
  assert.equal(dtoSem.mileageStart, null);
  assert.equal(dtoSem.mileageEnd, null);
  assert.equal(dtoSem.mileageSource, null);
  assert.equal(dtoSem.mileageCorrectedAt, null);

  const comKm = await workOrders.setMileage(ctx, semKm.id, { mileage_start: 12, mileage_end: 34 }, "base");
  const dtoCom = toWorkOrderDto(comKm);
  assert.equal(dtoCom.mileageStart, 12);
  assert.equal(dtoCom.mileageEnd, 34);
  assert.equal(dtoCom.mileageSource, "base");
  assert.equal(typeof dtoCom.mileageCorrectedAt, "string", "ISO string quando a base corrigiu");
});

// ---------- sync (unit): RBAC sem :status ----------

test("[mobile-sync] work_order.mileage SEM work_orders:status → per-action rejeitado permission_required", async () => {
  const { workOrders } = setup();
  const tenantId = randomUUID();
  // OS criada por um manager do mesmo tenant.
  const owner = actor(tenantId);
  const wo = await workOrders.create(owner, { title: "OS que o ator sem :status não pode preencher" });

  // Ator do envelope: tem work_orders:create (passa o gate do envelope) mas NÃO tem :status — a ação de km
  // é barrada por ação, não pelo envelope. Prova que o gate por-ação é `work_orders:status`.
  const semStatus: AuthenticatedActor = {
    tenantId,
    userId: randomUUID(),
    roles: ["field_dispatcher"],
    permissions: ["work_orders:create"],
    explicitPermissions: true,
  };

  const response = await syncMobileWorkOrderActions(
    semStatus,
    {
      client_batch_id: "km-perm-batch",
      actions: [
        {
          client_action_id: "km-perm-1",
          type: "work_order.mileage",
          payload: { work_order_id: wo.id, mileage_start: 100 },
        },
      ],
    },
    () => Promise.resolve(workOrders),
  );

  assert.equal(response.summary.rejected, 1);
  assert.equal(response.rejected[0].error?.reason, "permission_required");
  // A OS não recebeu km.
  assert.equal((await workOrders.get(owner, wo.id)).mileageStart, undefined);
});

// ---------- HTTP: rota base (PATCH /mileage) + sync do app ----------

test("PATCH /work-orders/:id/mileage (base) → 200, DTO com km, source=base e mileageCorrectedAt", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);

    const patched = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/mileage`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { mileage_start: 1200, mileage_end: 1350.5 },
    });

    assert.equal(patched.status, 200);
    assert.equal(patched.body.data.mileageStart, 1200);
    assert.equal(patched.body.data.mileageEnd, 1350.5);
    assert.equal(patched.body.data.mileageSource, "base");
    assert.ok(patched.body.data.mileageCorrectedAt, "a base carimba a correção");

    // O GET da OS reflete os campos (a aba KM lê do detail).
    const detail = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(detail.body.data.mileageStart, 1200);
    assert.equal(detail.body.data.mileageSource, "base");
  });
});

test("PATCH /mileage: final < inicial → 422 invalid_mileage_range; negativo → 400 invalid_mileage", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);

    const faixa = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/mileage`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { mileage_start: 900, mileage_end: 800 },
    });
    assert.equal(faixa.status, 422);
    assert.equal(faixa.body.error.reason, "invalid_mileage_range");

    const negativo = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/mileage`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { mileage_start: -5 },
    });
    assert.equal(negativo.status, 400);
    assert.equal(negativo.body.error.reason, "invalid_mileage");
  });
});

test("[RBAC] PATCH /mileage sem work_orders:mileage_correct (field_dispatcher) → 403; sem headers → 403", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);

    // field_dispatcher tem create/assign/status mas NÃO :update — corrigir km é uma edição de OS (base).
    const asDispatcher = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/mileage`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.dispatcherA, "field_dispatcher"),
      body: { mileage_start: 100 },
    });
    assert.equal(asDispatcher.status, 403);

    const anon = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/mileage`, {
      method: "PATCH",
      body: { mileage_start: 100 },
    });
    assert.equal(anon.status, 403);

    // Backend é a autoridade: nenhum 403 mexeu na OS.
    const detail = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(detail.body.data.mileageStart, null);
    assert.equal(detail.body.data.mileageSource, null);
  });
});

test("[J-Ω3F-7A furo] field_technician TEM :update mas NÃO :mileage_correct → PATCH /mileage = 403 (não forja base)", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);

    // Este é EXATAMENTE o repro que a junta expôs: o técnico de campo tem work_orders:update, então gatear
    // a correção por :update o deixava carimbar source='base'. Com a permissão dedicada, ele leva 403.
    const asTech = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/mileage`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.technicianA, "field_technician"),
      body: { mileage_start: 100 },
    });
    assert.equal(asTech.status, 403);

    // A base (operator = despacho web) TEM mileage_correct → corrige (200), source='base'.
    const asOperator = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/mileage`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { mileage_start: 100, mileage_end: 250 },
    });
    assert.equal(asOperator.status, 200);
    assert.equal(asOperator.body.data.mileageSource, "base");

    // O técnico NÃO conseguiu forjar: quem carimbou foi a base.
    const detail = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(detail.body.data.mileageStart, 100);
    assert.equal(detail.body.data.mileageSource, "base");
  });
});

test("[J-Ω3F-7A furo 2] PATCH /mileage com corpo SEM km → 400 mileage_required (não flipa source nem carimba)", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    const vazio = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/mileage`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {},
    });
    assert.equal(vazio.status, 400);
    assert.equal(vazio.body.error.reason, "mileage_required");
    // Nada foi mutado: sem source, sem carimbo, sem evento fantasma.
    const detail = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(detail.body.data.mileageSource, null);
    assert.equal(detail.body.data.mileageCorrectedAt, null);
  });
});

test("[J-Ω3F-7A furo 3] km ≥ 1e9 estoura DECIMAL(10,1) → 400 invalid_mileage (não 500)", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    const overflow = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/mileage`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { mileage_start: 1_000_000_000 },
    });
    assert.equal(overflow.status, 400);
    assert.equal(overflow.body.error.reason, "invalid_mileage");
  });
});

test("[isolamento] PATCH /mileage em OS de outra organização → 404", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);

    const cross = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/mileage`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { mileage_start: 100 },
    });

    assert.equal(cross.status, 404);
    assert.equal(cross.body.error.reason, "not_found");
  });
});

test("[mobile-sync] work_order.mileage (app) preenche a km: field_dispatcher tem :status e NÃO :update", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);

    const sync = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.dispatcherA, "field_dispatcher"),
      body: {
        client_batch_id: "km-app-batch",
        actions: [
          {
            client_action_id: "km-app-1",
            type: "work_order.mileage",
            payload: { work_order_id: workOrderId, mileage_start: 4200.5 },
          },
        ],
      },
    });

    assert.equal(sync.status, 200);
    assert.equal(sync.body.data.summary.accepted, 1);
    assert.equal(sync.body.data.accepted[0].server_state.mileageStart, 4200.5);
    assert.equal(sync.body.data.accepted[0].server_state.mileageSource, "app");
    // O app NÃO carimba correção da base.
    assert.equal(sync.body.data.accepted[0].server_state.mileageCorrectedAt, null);
  });
});

test("[mobile-sync] work_order.mileage é idempotente: replay do client_action_id não duplica o evento", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    const action = {
      client_batch_id: "km-idem-batch",
      actions: [
        {
          client_action_id: "km-idem-1",
          type: "work_order.mileage",
          payload: { work_order_id: workOrderId, mileage_start: 700, mileage_end: 900 },
        },
      ],
    };

    const first = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.dispatcherA, "field_dispatcher"),
      body: action,
    });
    const replay = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.dispatcherA, "field_dispatcher"),
      body: action,
    });

    assert.equal(first.body.data.summary.accepted, 1);
    assert.equal(replay.body.data.summary.already_applied, 1, "o replay é dedup pela fila (client_action_id)");

    // O evento de km foi gravado UMA vez (o setMileage não rodou de novo).
    const timeline = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/timeline`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const eventos = (timeline.body.data as Array<{ eventType: string }>).filter(
      (event) => event.eventType === "work_order_mileage_updated",
    );
    assert.equal(eventos.length, 1);
  });
});

test("[mobile-sync] merge por-campo entre syncs: um envia o inicial, outro o final", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);

    await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.dispatcherA, "field_dispatcher"),
      body: {
        actions: [
          {
            client_action_id: "km-merge-start",
            type: "work_order.mileage",
            payload: { work_order_id: workOrderId, mileage_start: 1000 },
          },
        ],
      },
    });
    const segundo = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.dispatcherA, "field_dispatcher"),
      body: {
        actions: [
          {
            client_action_id: "km-merge-end",
            type: "work_order.mileage",
            payload: { work_order_id: workOrderId, mileage_end: 1120 },
          },
        ],
      },
    });

    assert.equal(segundo.body.data.summary.accepted, 1);
    assert.equal(segundo.body.data.accepted[0].server_state.mileageStart, 1000, "o inicial do sync anterior persiste");
    assert.equal(segundo.body.data.accepted[0].server_state.mileageEnd, 1120);
  });
});

// ---------- harness HTTP (espelho de tests/work-order-cancel-duplicate-routes.test.ts) ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly dispatcherA: User;
  readonly technicianA: User;
  readonly operatorA: User;
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
    { resetWorkOrderRuntimeForTests: resetWO },
    { resetMobileWorkOrderSyncRuntimeForTests: resetSync },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const resetAll = () => {
    resetWO();
    resetSync();
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
      body: { title: `OS KM ${randomUUID()}`, serviceAddress: "Rua das Flores, 100", serviceCity: "Curitiba" },
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
  const tenantA = service.createTenant({ name: "Tenant KM A", modules: ["dashboard", "mobile", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant KM B", modules: ["dashboard", "mobile", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "km-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "km-manager-b@example.com", roles: ["manager"] });
  const dispatcherA = service.createUser({
    tenantId: tenantA.id,
    name: "Dispatcher A",
    email: "km-dispatcher-a@example.com",
    roles: ["field_dispatcher"],
  });
  // field_technician TEM work_orders:update mas NÃO work_orders:mileage_correct — o papel que provava o
  // furo J-Ω3F-7A (gatear a correção por :update deixava o técnico de campo forjar source='base').
  const technicianA = service.createUser({
    tenantId: tenantA.id,
    name: "Field Tech A",
    email: "km-tech-a@example.com",
    roles: ["field_technician"],
  });
  // operator (despacho web = BASE) TEM mileage_correct — prova que a base corrige.
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "km-operator-a@example.com", roles: ["operator"] });
  return { tenantA, tenantB, managerA, managerB, dispatcherA, technicianA, operatorA };
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
