import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { buildChecklistAdjustmentBody, type ChecklistChange } from "../frontend/src/modules/work-orders/work-order-checklists.model.js";
import type { WorkOrderChecklistLink } from "../frontend/src/modules/work-orders/work-orders.types.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-GUI-02 — o caminho inteiro, no servidor, com o corpo que a TELA monta (o `buildChecklistAdjustmentBody` real do front,
// como `b-san3-25-corpo-do-faturamento.test.ts` faz com o corpo do faturamento). App inteiro em memória
// (`CORE_SAAS_PERSISTENCE=memory`), no molde de `checklist-snapshot-dispatch.test.ts`.
//
//   W4  Coleta (1 chamada) → Entrega (1 chamada) → despacho → as execuções `collection` e `delivery`; a OS aponta a coleta;
//   W4b Entrega e DEPOIS Coleta, pelo construtor, contra o servidor com o conserto da Emenda 2 → a primária é a coleta e as
//       2 execuções nascem (o mesmo fato do T1 de `bgui02-ordem-por-etapa`, agora pelo corpo da tela);
//   W4c os códigos reais que a tela mapeia (400, 409, 404, 403, e o despachante que grava mas não lê os modelos);
//   W4d a preservação no servidor real: cada ação muda só o par escolhido.

test("W4 · Coleta e depois Entrega pelo corpo da tela → despacho → execuções collection e delivery; a OS aponta a coleta", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, seed, "Coleta padrão");
    const entrega = await publishTemplate(baseUrl, seed, "Entrega padrão");
    const wo = await createWO(baseUrl, seed);

    await sendChange(baseUrl, seed, wo.id, { kind: "include", checklistId: coleta, role: "collection" });
    await sendChange(baseUrl, seed, wo.id, { kind: "include", checklistId: entrega, role: "delivery" });

    const detail = await getWO(baseUrl, seed, wo.id);
    assert.equal(detail.checklistId, coleta);
    assert.equal((await createDispatch(baseUrl, seed, wo.id)).status, 201);
    assert.deepEqual(await runsByRole(baseUrl, seed, wo.id), { collection: coleta, delivery: entrega });
  });
});

test("W4b · Entrega e DEPOIS Coleta pelo construtor real → a primária é a coleta e as 2 execuções nascem", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, seed, "Coleta padrão");
    const entrega = await publishTemplate(baseUrl, seed, "Entrega padrão");
    const wo = await createWO(baseUrl, seed);

    await sendChange(baseUrl, seed, wo.id, { kind: "include", checklistId: entrega, role: "delivery" });
    await sendChange(baseUrl, seed, wo.id, { kind: "include", checklistId: coleta, role: "collection" });

    const detail = await getWO(baseUrl, seed, wo.id);
    assert.equal(detail.checklistId, coleta, "o servidor escolhe a coleta pela etapa, não pela posição");
    assert.equal(detail.checklists[0].role, "collection");
    assert.equal((await createDispatch(baseUrl, seed, wo.id)).status, 201);
    assert.deepEqual(await runsByRole(baseUrl, seed, wo.id), { collection: coleta, delivery: entrega });
  });
});

test("W4c · os códigos reais que a tela mapeia pelo reason", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, seed, "Coleta padrão");
    const rascunho = await createTemplate(baseUrl, seed, "Rascunho");

    // Modelo em rascunho → 400 checklist_not_published.
    const wo = await createWO(baseUrl, seed);
    const draft = await adjust(baseUrl, seed, wo.id, bodyOf([], { kind: "include", checklistId: rascunho, role: "collection" }));
    assert.deepEqual([draft.status, draft.body.error.reason], [400, "checklist_not_published"]);

    // A mesma etapa e o mesmo modelo, montados à mão (a tela recusa localmente antes) → 409 duplicate_checklist_phase.
    await sendChange(baseUrl, seed, wo.id, { kind: "include", checklistId: coleta, role: "collection" });
    const dup = await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: coleta, role: "collection" }] });
    assert.deepEqual([dup.status, dup.body.error.reason], [409, "duplicate_checklist_phase"]);

    // OS da organização B → 404 not_found.
    const cross = await adjust(baseUrl, seed, wo.id, bodyOf([], { kind: "include", checklistId: coleta, role: "delivery" }), "manager", "B");
    assert.deepEqual([cross.status, cross.body.error.reason], [404, "not_found"]);

    // Técnico de campo → 403 permission_required.
    const tech = await adjust(baseUrl, seed, wo.id, bodyOf([], { kind: "include", checklistId: coleta, role: "delivery" }), "field_technician");
    assert.deepEqual([tech.status, tech.body.error.reason], [403, "permission_required"]);

    // Despachante: grava (200) mas não lê os modelos (403) — o achado 1, executado.
    const dispatcherPatch = await adjust(baseUrl, seed, wo.id, bodyOf([], { kind: "include", checklistId: coleta, role: "delivery" }), "field_dispatcher");
    assert.equal(dispatcherPatch.status, 200, JSON.stringify(dispatcherPatch.body));
    const dispatcherList = await req(baseUrl, "/api/v1/tenant/checklists", { headers: headers(seed, "field_dispatcher") });
    assert.deepEqual([dispatcherList.status, dispatcherList.body.error.reason], [403, "permission_required"]);

    // OS cancelada → 409 work_order_terminal.
    const cancelada = await createWO(baseUrl, seed);
    const cancel = await req(baseUrl, `/api/v1/work-orders/${cancelada.id}/cancel`, {
      method: "POST",
      headers: headers(seed, "tenant_admin"),
      body: { reason: "Cliente desistiu", financial_decision: "zero" },
    });
    assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
    const terminal = await adjust(baseUrl, seed, cancelada.id, bodyOf([], { kind: "include", checklistId: coleta, role: "collection" }));
    assert.deepEqual([terminal.status, terminal.body.error.reason], [409, "work_order_terminal"]);

    // Enviada só com a entrega → a coleta não entra depois do envio (409 collection_after_dispatch, Emenda 2).
    const semColeta = await createWO(baseUrl, seed);
    const entrega = await publishTemplate(baseUrl, seed, "Entrega padrão");
    await sendChange(baseUrl, seed, semColeta.id, { kind: "include", checklistId: entrega, role: "delivery" });
    assert.equal((await createDispatch(baseUrl, seed, semColeta.id)).status, 201);
    const depois = await adjust(baseUrl, seed, semColeta.id, bodyOf([], { kind: "include", checklistId: coleta, role: "collection" }));
    assert.deepEqual([depois.status, depois.body.error.reason], [409, "collection_after_dispatch"]);
  });
});

test("W4d · a preservação no servidor real: cada ação muda só o par escolhido", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, seed, "Coleta padrão");
    const entrega = await publishTemplate(baseUrl, seed, "Entrega padrão");
    const geral = await publishTemplate(baseUrl, seed, "Geral");
    const quarto = await publishTemplate(baseUrl, seed, "Quarto modelo");

    const actions: Array<{ readonly label: string; readonly change: (live: readonly WorkOrderChecklistLink[]) => ChecklistChange; readonly x?: string; readonly y?: string }> = [
      { label: "incluir um 4º par", change: () => ({ kind: "include", checklistId: quarto, role: "delivery" }), x: `${quarto}:delivery` },
      { label: "retirar a geral", change: (live) => retire(live, geral, "generic"), y: `${geral}:generic` },
      { label: "retirar a entrega", change: (live) => retire(live, entrega, "delivery"), y: `${entrega}:delivery` },
    ];
    let measured = 0;
    for (const action of actions) {
      // Uma OS nova por ação, com as 3 linhas vivas (coleta, entrega e geral; pares conhecidos).
      const wo = await createWO(baseUrl, seed);
      for (const body of [
        { add: [{ checklistId: coleta, role: "collection" }] },
        { add: [{ checklistId: entrega, role: "delivery" }] },
        { add: [{ checklistId: geral, role: "generic" }] },
      ]) {
        assert.equal((await adjust(baseUrl, seed, wo.id, body)).status, 200);
      }
      const before = await getWO(baseUrl, seed, wo.id);
      const beforePairs = pairsOf(before.checklists);
      assert.equal(beforePairs.size, 3);

      const body = bodyOf(before.checklists, action.change(before.checklists));
      const res = await adjust(baseUrl, seed, wo.id, body);
      assert.equal(res.status, 200, `${action.label}: ${JSON.stringify(res.body)}`);

      const expected = new Set(beforePairs);
      if (action.y) expected.delete(action.y);
      if (action.x) expected.add(action.x);
      assert.deepEqual([...pairsOf((await getWO(baseUrl, seed, wo.id)).checklists)].sort(), [...expected].sort(), action.label);
      measured++;
    }
    assert.equal(measured, actions.length);
    assert.ok(measured > 0, `ações medidas: ${measured}`);
  });
});

// ---------- o corpo da tela ----------

function bodyOf(live: readonly WorkOrderChecklistLink[], change: ChecklistChange) {
  const result = buildChecklistAdjustmentBody(live, change);
  assert.equal(result.kind, "body", `o construtor recusou: ${JSON.stringify(result)}`);
  return result.kind === "body" ? result.body : {};
}

function retire(live: readonly WorkOrderChecklistLink[], checklistId: string, role: "collection" | "delivery" | "generic"): ChecklistChange {
  const found = live.find((item) => item.checklistId === checklistId && item.role === role);
  assert.ok(found, `linha ${checklistId}:${role} viva`);
  return { kind: "retire", line: { checklistId, role, orderIndex: found.orderIndex }, reason: "Motivo do operador na tela" };
}

function pairsOf(lines: ReadonlyArray<{ checklistId: string; role: string | null }>): Set<string> {
  return new Set(lines.map((item) => `${item.checklistId}:${item.role}`));
}

async function sendChange(baseUrl: string, seed: SeedData, workOrderId: string, change: ChecklistChange): Promise<void> {
  const detail = await getWO(baseUrl, seed, workOrderId);
  const res = await adjust(baseUrl, seed, workOrderId, bodyOf(detail.checklists, change));
  assert.equal(res.status, 200, JSON.stringify(res.body));
}

// ---------- harness (molde de tests/checklist-snapshot-dispatch.test.ts) ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly techA: User;
};

function headers(seed: SeedData, role: string, org: "A" | "B" = "A"): Record<string, string> {
  const tenant = org === "A" ? seed.tenantA : seed.tenantB;
  const user = org === "A" ? seed.managerA : seed.managerB;
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function withApi(cb: (c: { baseUrl: string; seed: SeedData }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { resetFieldDispatchRuntimeForTests },
    { resetChecklistRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/checklists/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetWorkOrderRuntimeForTests();
  resetFieldDispatchRuntimeForTests();
  resetChecklistRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const modules = ["work_orders", "field_operations", "tenant_checklist", "checklists"];
  const tenantA = core.createTenant({ name: "T GUI02 fluxo A", modules });
  const tenantB = core.createTenant({ name: "T GUI02 fluxo B", modules });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Mgr A", email: "gui02-fluxo-a@example.com", roles: ["manager"] });
  const managerB = core.createUser({ tenantId: tenantB.id, name: "Mgr B", email: "gui02-fluxo-b@example.com", roles: ["manager"] });
  const techA = core.createUser({ tenantId: tenantA.id, name: "Tec A", email: "gui02-fluxo-tec@example.com", roles: ["field_technician"] });
  const seed: SeedData = { tenantA, tenantB, managerA, managerB, techA };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await baseUrlOf(server);
  try {
    await cb({ baseUrl, seed });
  } finally {
    await close(server);
    resetWorkOrderRuntimeForTests();
    resetFieldDispatchRuntimeForTests();
    resetChecklistRuntimeForTests();
  }
}

async function createTemplate(baseUrl: string, seed: SeedData, name: string): Promise<string> {
  const create = await req(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: headers(seed, "tenant_admin"),
    body: {
      name,
      type: "technical_evidence",
      schema: { source: "bgui02-fluxo" },
      components: [{ componentKey: "obs", type: "observation", label: `Observação — ${name}`, required: false, config: {}, validationRules: {}, visibilityRules: {} }],
    },
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  return create.body.data.id as string;
}

async function publishTemplate(baseUrl: string, seed: SeedData, name: string): Promise<string> {
  const id = await createTemplate(baseUrl, seed, name);
  const current = await req(baseUrl, `/api/v1/tenant/checklists/${id}`, { headers: headers(seed, "tenant_admin") });
  const publish = await req(baseUrl, `/api/v1/tenant/checklists/${id}/publish`, {
    method: "POST",
    headers: headers(seed, "tenant_admin"),
    body: { expectedUpdatedAt: current.body.data.updatedAt },
  });
  assert.equal(publish.status, 200, JSON.stringify(publish.body));
  return id;
}

async function createWO(baseUrl: string, seed: SeedData): Promise<{ id: string }> {
  const res = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: headers(seed, "manager"), body: { title: "OS de guincho (tela de vistorias)" } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { id: res.body.data.id as string };
}

async function getWO(baseUrl: string, seed: SeedData, workOrderId: string) {
  const res = await req(baseUrl, `/api/v1/work-orders/${workOrderId}`, { headers: headers(seed, "manager") });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.data;
}

async function adjust(baseUrl: string, seed: SeedData, workOrderId: string, body: unknown, role = "manager", org: "A" | "B" = "A") {
  return req(baseUrl, `/api/v1/work-orders/${workOrderId}/checklists`, { method: "PATCH", headers: headers(seed, role, org), body });
}

async function createDispatch(baseUrl: string, seed: SeedData, workOrderId: string) {
  return req(baseUrl, "/api/v1/operations/dispatches", { method: "POST", headers: headers(seed, "manager"), body: { workOrderId, operatorUserId: seed.techA.id } });
}

async function runsByRole(baseUrl: string, seed: SeedData, workOrderId: string): Promise<Record<string, string>> {
  const res = await req(baseUrl, `/api/v1/mobile/checklist-runs?workOrderId=${workOrderId}&roleAware=1`, { headers: headers(seed, "manager") });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const byRole: Record<string, string> = {};
  for (const run of res.body.data as Array<{ role: string | null; templateId: string }>) {
    const key = String(run.role);
    assert.equal(key in byRole, false, `duas execuções na etapa ${key}`);
    byRole[key] = run.templateId;
  }
  return byRole;
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
