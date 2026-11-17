import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-GUI-02 (Emenda 2, §1) — A PRIMÁRIA É A COLETA, PELA ETAPA, E NÃO PELA POSIÇÃO.
//
// O defeito medido pelas duas críticas (A1): com a Entrega incluída antes da Coleta, o despacho tomava a 1ª da fila
// como primária. O guincheiro recebia a entrega no lugar da coleta, e a coleta NÃO virava execução — a prova
// operacional da coleta não existia. A regra nova é única e vale nos três lugares que decidem a primária (o
// comparador, o espelho da criação e o `sort` do despacho): a coleta viva de menor posição; sem coleta, a de menor
// posição, como antes. E a coleta não entra depois de um envio que não a tinha (409 `collection_after_dispatch`).
//
// Todos os casos rodam pelo app inteiro, em memória, no molde de `checklist-snapshot-dispatch.test.ts`.

test("T1 · Entrega e depois Coleta (2 PATCH de uma linha) → a primária é a coleta e o despacho cria as 2 execuções", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, seed, "Vistoria de coleta");
    const entrega = await publishTemplate(baseUrl, seed, "Vistoria de entrega");
    const wo = await createWO(baseUrl, seed, { title: "OS guincho — entrega antes" });

    assert.equal((await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: entrega.id, role: "delivery" }] })).status, 200);
    assert.equal((await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: coleta.id, role: "collection" }] })).status, 200);

    const detail = await getWO(baseUrl, seed, wo.id);
    assert.equal(detail.checklistId, coleta.id, "o espelho da OS tem de apontar a coleta");
    assert.deepEqual(
      detail.checklists.map((line: Line) => `${line.role}:${line.checklistId}`),
      [`collection:${coleta.id}`, `delivery:${entrega.id}`],
      "o checklists[] do detalhe começa pela coleta",
    );

    const dispatch = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(dispatch.status, 201, JSON.stringify(dispatch.body));

    assert.deepEqual(await runsByRole(baseUrl, seed, wo.id), { collection: coleta.id, delivery: entrega.id });
  });
});

test("T2 · OS antiga com checklistId (vira geral) + Coleta → a primária é a coleta e a geral fica diferida", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const geral = await publishTemplate(baseUrl, seed, "Vistoria padrão");
    const coleta = await publishTemplate(baseUrl, seed, "Vistoria de coleta");
    const wo = await createWO(baseUrl, seed, { title: "OS antiga", checklistId: geral.id });

    const before = await getWO(baseUrl, seed, wo.id);
    assert.deepEqual(before.checklists.map((line: Line) => `${line.role}:${line.checklistId}`), [`generic:${geral.id}`]);

    assert.equal((await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: coleta.id, role: "collection" }] })).status, 200);
    const detail = await getWO(baseUrl, seed, wo.id);
    assert.equal(detail.checklistId, coleta.id, "a coleta passa à frente da geral antiga");
    assert.deepEqual(
      detail.checklists.map((line: Line) => `${line.role}:${line.checklistId}`),
      [`collection:${coleta.id}`, `generic:${geral.id}`],
    );

    assert.equal((await createDispatch(baseUrl, seed, wo.id, seed.techA.id)).status, 201);
    assert.deepEqual(
      await runsByRole(baseUrl, seed, wo.id),
      { collection: coleta.id },
      "a geral é secundária e fica diferida (sem execução), como toda secundária que não é entrega",
    );
  });
});

test("T3 · criação com [Entrega, Coleta] → o espelho da criação aponta a coleta", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, seed, "Vistoria de coleta");
    const entrega = await publishTemplate(baseUrl, seed, "Vistoria de entrega");
    const wo = await createWO(baseUrl, seed, {
      title: "OS criada com a entrega primeiro",
      checklists: [
        { checklistId: entrega.id, role: "delivery" },
        { checklistId: coleta.id, role: "collection" },
      ],
    });

    assert.equal(wo.checklistId, coleta.id, "a resposta da criação já traz a coleta no espelho");
    const detail = await getWO(baseUrl, seed, wo.id);
    assert.equal(detail.checklistId, coleta.id);
    assert.equal(detail.checklists[0].role, "collection");
  });
});

test("T4 · OS enviada só com entrega + incluir coleta → 409 collection_after_dispatch, sem mudar nada", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, seed, "Vistoria de coleta");
    const entrega = await publishTemplate(baseUrl, seed, "Vistoria de entrega");
    const wo = await createWO(baseUrl, seed, { title: "OS enviada sem coleta" });
    assert.equal((await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: entrega.id, role: "delivery" }] })).status, 200);
    assert.equal((await createDispatch(baseUrl, seed, wo.id, seed.techA.id)).status, 201);

    const before = await getWO(baseUrl, seed, wo.id);
    const linksBefore = await rawLinks(seed, wo.id);

    const refused = await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: coleta.id, role: "collection" }] });
    assert.equal(refused.status, 409, JSON.stringify(refused.body));
    assert.equal(refused.body.error.code, "WORK_ORDER_CONFLICT");
    assert.equal(refused.body.error.reason, "collection_after_dispatch");

    const after = await getWO(baseUrl, seed, wo.id);
    assert.deepEqual(after.checklists, before.checklists, "o conjunto não pode mudar");
    assert.equal(after.checklistId, before.checklistId, "o espelho não pode mudar");
    assert.deepEqual(after.checklistSnapshot, before.checklistSnapshot);
    assert.deepEqual(await rawLinks(seed, wo.id), linksBefore, "nenhuma linha gravada nem retirada");

    // A entrega continua podendo receber outra vistoria que NÃO é coleta (a guarda é só da coleta).
    const outra = await publishTemplate(baseUrl, seed, "Vistoria de entrega 2");
    assert.equal((await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: outra.id, role: "delivery" }] })).status, 200);
  });
});

test("T4b · OS enviada COM coleta + incluir outra coleta → aceita (a guarda vale só para o envio sem coleta)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, seed, "Vistoria de coleta");
    const coleta2 = await publishTemplate(baseUrl, seed, "Vistoria de coleta 2");
    const wo = await createWO(baseUrl, seed, { title: "OS enviada com coleta" });
    assert.equal((await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: coleta.id, role: "collection" }] })).status, 200);
    assert.equal((await createDispatch(baseUrl, seed, wo.id, seed.techA.id)).status, 201);

    const added = await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: coleta2.id, role: "collection" }] });
    assert.equal(added.status, 200, JSON.stringify(added.body));
    const detail = await getWO(baseUrl, seed, wo.id);
    assert.equal(detail.checklistId, coleta.id, "a coleta congelada continua a primária (a nova vai ao fim)");
  });
});

test("T5 · Coleta e depois Entrega (o fluxo de hoje) → o mesmo resultado: as 2 execuções, primária = coleta", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, seed, "Vistoria de coleta");
    const entrega = await publishTemplate(baseUrl, seed, "Vistoria de entrega");
    const wo = await createWO(baseUrl, seed, { title: "OS no fluxo normal" });
    assert.equal((await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: coleta.id, role: "collection" }] })).status, 200);
    assert.equal((await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: entrega.id, role: "delivery" }] })).status, 200);

    const detail = await getWO(baseUrl, seed, wo.id);
    assert.equal(detail.checklistId, coleta.id);
    assert.equal((await createDispatch(baseUrl, seed, wo.id, seed.techA.id)).status, 201);
    assert.deepEqual(await runsByRole(baseUrl, seed, wo.id), { collection: coleta.id, delivery: entrega.id });
  });
});

test("T6 · G1@0, G2@1 e Entrega@2 → a ordem do checklists[] é G1, G2, E (as gerais mantêm a ordem)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const g1 = await publishTemplate(baseUrl, seed, "Geral 1");
    const g2 = await publishTemplate(baseUrl, seed, "Geral 2");
    const entrega = await publishTemplate(baseUrl, seed, "Vistoria de entrega");
    const wo = await createWO(baseUrl, seed, { title: "OS com gerais" });
    for (const body of [
      { add: [{ checklistId: g1.id, role: "generic" }] },
      { add: [{ checklistId: g2.id, role: "generic" }] },
      { add: [{ checklistId: entrega.id, role: "delivery" }] },
    ]) {
      assert.equal((await adjust(baseUrl, seed, wo.id, body)).status, 200);
    }

    const detail = await getWO(baseUrl, seed, wo.id);
    assert.deepEqual(
      detail.checklists.map((line: Line) => line.checklistId),
      [g1.id, g2.id, entrega.id],
    );
    assert.equal(detail.checklistId, g1.id, "sem coleta, a primária continua a de menor posição");
  });
});

test("T7 · o carimbo certo: depois do despacho de Entrega@0 + Coleta@1, cada linha guarda o formulário do SEU modelo", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const coleta = await publishTemplate(baseUrl, seed, "Vistoria de coleta");
    const entrega = await publishTemplate(baseUrl, seed, "Vistoria de entrega");
    const wo = await createWO(baseUrl, seed, { title: "OS carimbo" });
    assert.equal((await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: entrega.id, role: "delivery" }] })).status, 200);
    assert.equal((await adjust(baseUrl, seed, wo.id, { add: [{ checklistId: coleta.id, role: "collection" }] })).status, 200);
    assert.equal((await createDispatch(baseUrl, seed, wo.id, seed.techA.id)).status, 201);

    const links = await rawLinks(seed, wo.id);
    const stamp = (role: string) => links.find((link) => link.role === role)?.snapshotTemplateId;
    assert.equal(stamp("collection"), coleta.id, "a linha da coleta recebeu o formulário de outro modelo");
    assert.equal(stamp("delivery"), entrega.id, "a linha da entrega recebeu o formulário de outro modelo");

    const detail = await getWO(baseUrl, seed, wo.id);
    assert.equal(detail.checklistSnapshot?.template_id, coleta.id, "o espelho congelado é o da coleta");
  });
});

// ---------- harness (molde de tests/checklist-snapshot-dispatch.test.ts) ----------

type Line = { readonly checklistId: string; readonly role: string | null };

type SeedData = {
  readonly tenantA: Tenant;
  readonly managerA: User;
  readonly techA: User;
};

function headers(seed: SeedData, role: string): Record<string, string> {
  return { "x-tenant-id": seed.tenantA.id, "x-user-id": seed.managerA.id, "x-role": role };
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
  const tenantA = core.createTenant({ name: "T GUI02 A", modules });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Mgr A", email: "gui02-mgr-a@example.com", roles: ["manager"] });
  const techA = core.createUser({ tenantId: tenantA.id, name: "Tec A", email: "gui02-tec-a@example.com", roles: ["field_technician"] });
  const seed: SeedData = { tenantA, managerA, techA };

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

async function publishTemplate(baseUrl: string, seed: SeedData, name: string): Promise<{ id: string }> {
  const h = headers(seed, "tenant_admin");
  const create = await req(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: h,
    body: {
      name,
      type: "technical_evidence",
      schema: { source: "bgui02" },
      components: [
        { componentKey: "obs", type: "observation", label: `Observação — ${name}`, required: false, config: {}, validationRules: {}, visibilityRules: {} },
      ],
    },
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  const publish = await req(baseUrl, `/api/v1/tenant/checklists/${create.body.data.id}/publish`, {
    method: "POST",
    headers: h,
    body: { expectedUpdatedAt: create.body.data.updatedAt },
  });
  assert.equal(publish.status, 200, JSON.stringify(publish.body));
  return { id: create.body.data.id as string };
}

async function createWO(baseUrl: string, seed: SeedData, body: Record<string, unknown>): Promise<{ id: string; checklistId?: string }> {
  const res = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: headers(seed, "manager"), body });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { id: res.body.data.id as string, checklistId: res.body.data.checklistId as string | undefined };
}

async function getWO(baseUrl: string, seed: SeedData, workOrderId: string) {
  const res = await req(baseUrl, `/api/v1/work-orders/${workOrderId}`, { headers: headers(seed, "manager") });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.data;
}

async function adjust(baseUrl: string, seed: SeedData, workOrderId: string, body: Record<string, unknown>) {
  return req(baseUrl, `/api/v1/work-orders/${workOrderId}/checklists`, { method: "PATCH", headers: headers(seed, "manager"), body });
}

async function createDispatch(baseUrl: string, seed: SeedData, workOrderId: string, operatorUserId: string) {
  return req(baseUrl, "/api/v1/operations/dispatches", { method: "POST", headers: headers(seed, "manager"), body: { workOrderId, operatorUserId } });
}

/** As execuções da OS, pela porta do app novo: `{ etapa: modelo }`. Uma etapa repetida reprova (seria execução a mais). */
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

/** As linhas cruas da junção (com o carimbo de cada uma), lidas do repositório em memória que o app usa. */
async function rawLinks(seed: SeedData, workOrderId: string) {
  const { getMemoryWorkOrderRepositoryForTests } = await import("../src/modules/work-orders/work-order.service.js");
  const links = await getMemoryWorkOrderRepositoryForTests().listChecklists(seed.tenantA.id, workOrderId);
  return links.map((link) => ({
    checklistId: link.checklistId,
    role: link.role,
    orderIndex: link.orderIndex,
    removed: link.removedAt != null,
    snapshotTemplateId: (link.checklistSnapshot as { template_id?: string } | null | undefined)?.template_id ?? null,
  }));
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
