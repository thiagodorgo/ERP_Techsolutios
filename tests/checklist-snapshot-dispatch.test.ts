import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω3-c — congela o snapshot do checklist na OS NO DESPACHO (FieldDispatch.create); entrega aditiva no
// payload da OS. NÃO toca /available nem createRun (Req A do crítico). Imutabilidade B1/Ω3-a.

test("[congela no despacho] dispatch de OS com template publicado → checklistSnapshot na OS", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Inspeção");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tpl.id });
    // antes do despacho: null
    const before = await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin") });
    assert.equal(before.body.data.checklistSnapshot, null);

    const dispatch = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(dispatch.status, 201);

    const after = await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin") });
    const snap = after.body.data.checklistSnapshot;
    assert.ok(snap, "snapshot deve existir após o despacho");
    assert.equal(snap.template_id, tpl.id);
    assert.equal(snap.template_status, "published");
    assert.equal(typeof snap.template_version, "number");
    assert.equal(snap.contract, "checklist_snapshot@2026-07-31.omega3c");
    assert.ok(Array.isArray(snap.template.items));
    assert.equal(snap.template.items[0].label, "O local esta seguro?");
  });
});

test("[imutável pós-edição] editar/republicar o template após o despacho NÃO muda o snapshot", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Original");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tpl.id });
    await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    const v1 = (await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin") })).body.data.checklistSnapshot;

    // edita o nome do template e republica (nova versão)
    await req(baseUrl, `/api/v1/tenant/checklists/${tpl.id}`, { method: "PATCH", headers: headers(seed, "tenant_admin"), body: { name: "RENOMEADO" } });
    await req(baseUrl, `/api/v1/tenant/checklists/${tpl.id}/publish`, { method: "POST", headers: headers(seed, "tenant_admin"), body: {} });

    const after = (await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin") })).body.data.checklistSnapshot;
    assert.deepEqual(after, v1, "o snapshot congelado não pode reagir à edição do template");
    assert.notEqual(after.template.name, "RENOMEADO");
  });
});

test("[OS sem checklist → null] dispatch de OS sem checklist_id → snapshot null; despacho 201", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed, { title: "OS sem checklist" });
    const dispatch = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(dispatch.status, 201);
    const after = await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin") });
    assert.equal(after.body.data.checklistSnapshot, null);
  });
});

test("[template não publicado → null] dispatch de OS com checklist DRAFT → snapshot null", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const draft = await createTemplate(baseUrl, headers(seed, "tenant_admin"), "Rascunho");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: draft.id });
    await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    const after = await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin") });
    assert.equal(after.body.data.checklistSnapshot, null);
  });
});

test("[reassign mantém o original] reassign do despacho NÃO re-congela o snapshot", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Molde");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tpl.id });
    const dispatch = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    const v1 = (await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin") })).body.data.checklistSnapshot;
    // edita o template no meio, depois reassign — o reassign não deve tocar o snapshot
    await req(baseUrl, `/api/v1/tenant/checklists/${tpl.id}`, { method: "PATCH", headers: headers(seed, "tenant_admin"), body: { name: "OUTRO" } });
    await req(baseUrl, `/api/v1/operations/dispatches/${dispatch.body.data.id}/reassign`, { method: "PATCH", headers: headers(seed, "tenant_admin"), body: { operatorUserId: seed.techB.id } });
    const after = (await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin") })).body.data.checklistSnapshot;
    assert.deepEqual(after, v1);
  });
});

test("[gatilho exato] WorkOrder.assign (sem FieldDispatch.create) NÃO congela snapshot", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Molde");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tpl.id });
    // assign da OS (não é despacho) — não deve congelar
    await req(baseUrl, `/api/v1/work-orders/${wo.id}/assign`, { method: "POST", headers: headers(seed, "tenant_admin"), body: { operatorId: seed.techA.id } });
    const after = await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin") });
    assert.equal(after.body.data.checklistSnapshot, null);
  });
});

test("[§2.8 allowlist] o snapshot NÃO carrega tenant_id (nem no template)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Molde");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tpl.id });
    await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    const after = await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin") });
    const raw = JSON.stringify(after.body.data.checklistSnapshot);
    assert.equal(raw.includes(seed.tenantA.id), false, "tenant_id não pode vazar no snapshot");
    assert.equal("tenant_id" in after.body.data.checklistSnapshot.template, false);
  });
});

test("[payload enxuto] o list DTO de OS NÃO carrega checklistSnapshot", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Molde");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tpl.id });
    await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    const list = await req(baseUrl, "/api/v1/work-orders", { headers: headers(seed, "tenant_admin") });
    assert.equal(list.status, 200);
    const item = list.body.items.find((w: { id: string }) => w.id === wo.id);
    assert.ok(item);
    assert.equal("checklistSnapshot" in item, false);
  });
});

test("[isolamento] snapshot da OS de A não é lido pela org B (404)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Molde");
    const wo = await createWO(baseUrl, seed, { title: "OS A", checklistId: tpl.id });
    await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    const cross = await req(baseUrl, `/api/v1/work-orders/${wo.id}`, { headers: headers(seed, "tenant_admin", "B") });
    assert.equal(cross.status, 404);
  });
});

// D-CHK-DISPATCH-CREATE — o despacho CRIA a run do checklist (efeito de domínio); o guincheiro só a baixa/responde.

test("[despacho cria run] dispatch de OS com template publicado → run ligada à OS (GET run-por-OS)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Coleta");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tpl.id });

    // antes do despacho: nenhuma run
    const before = await runsForWorkOrder(baseUrl, seed, wo.id);
    assert.equal(before.status, 200);
    assert.equal(before.body.data.length, 0);

    const dispatch = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(dispatch.status, 201);

    const after = await runsForWorkOrder(baseUrl, seed, wo.id);
    assert.equal(after.status, 200);
    assert.equal(after.body.data.length, 1);
    const run = after.body.data[0];
    assert.equal(run.relatedEntityType, "work_order");
    assert.equal(run.relatedEntityId, wo.id);
    assert.equal(run.templateId, tpl.id);
    assert.equal(run.status, "in_progress");
    // a chave determinística interna NÃO vaza no DTO público.
    assert.equal("clientRunKey" in run, false);
    // §2.8 — a resposta não vaza o tenant.
    assert.equal(JSON.stringify(after.body).includes(seed.tenantB.id), false);
  });
});

test("[despacho sem checklist] OS sem checklist_id → despacho 201 SEM run", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const wo = await createWO(baseUrl, seed, { title: "OS sem checklist" });
    const dispatch = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(dispatch.status, 201);

    const runs = await runsForWorkOrder(baseUrl, seed, wo.id);
    assert.equal(runs.status, 200);
    assert.equal(runs.body.data.length, 0);
  });
});

test("[idempotência] re-despacho e reassign da mesma OS NÃO duplicam a run", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Molde");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tpl.id });

    const d1 = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(d1.status, 201);
    // 2º despacho da MESMA OS (re-despacho) → chave determinística dispatch:<wo>:<tpl> → NÃO cria run nova.
    const d2 = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(d2.status, 201);
    // reassign não provisiona run.
    await req(baseUrl, `/api/v1/operations/dispatches/${d1.body.data.id}/reassign`, {
      method: "PATCH",
      headers: headers(seed, "tenant_admin"),
      body: { operatorUserId: seed.techB.id },
    });

    const runs = await runsForWorkOrder(baseUrl, seed, wo.id);
    assert.equal(runs.status, 200);
    assert.equal(runs.body.data.length, 1);
  });
});

test("[GET run-por-OS] cross-tenant → 200 vazio; sem workOrderId → 422; sem checklist_runs:read → 403", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Molde");
    const wo = await createWO(baseUrl, seed, { title: "OS A", checklistId: tpl.id });
    await createDispatch(baseUrl, seed, wo.id, seed.techA.id);

    // org B consulta a OS de A → 200 lista vazia (isolamento; nunca vaza existência, não 404).
    const cross = await req(baseUrl, `/api/v1/mobile/checklist-runs?workOrderId=${wo.id}`, {
      headers: headers(seed, "tenant_admin", "B"),
    });
    assert.equal(cross.status, 200);
    assert.equal(cross.body.data.length, 0);

    // sem workOrderId → 422.
    const missing = await req(baseUrl, "/api/v1/mobile/checklist-runs", { headers: headers(seed, "tenant_admin") });
    assert.equal(missing.status, 422);
    assert.equal(missing.body.error.reason, "work_order_id_required");

    // ator sem checklist_runs:read (finance) → 403.
    const forbidden = await req(baseUrl, `/api/v1/mobile/checklist-runs?workOrderId=${wo.id}`, {
      headers: headers(seed, "finance"),
    });
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.error.reason, "permission_required");
  });
});

// D-CHK-DISPATCH-CREATE (achado MÉDIA do crítico, item 2) — não SUPER-CONTAR a métrica FATURADA: dois despachos
// concorrentes da mesma OS provisionam a MESMA run (idempotente) → só 1 emissão de checklist_run.created.

test("[nao super-conta] dois despachos concorrentes da mesma OS → 1 run e 1 unidade FATURADA (checklist_runs_count)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const { resetCloudUsageRuntimeForTests, getMemoryCloudUsageRepositoryForTests } = await import(
      "../src/modules/cloud-usage/cloud-usage.service.js"
    );
    resetCloudUsageRuntimeForTests();

    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Coleta");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tpl.id });

    // dois despachos CONCORRENTES da MESMA OS → mesma client_run_key determinística dispatch:<wo>:<tpl>.
    const [d1, d2] = await Promise.all([
      createDispatch(baseUrl, seed, wo.id, seed.techA.id),
      createDispatch(baseUrl, seed, wo.id, seed.techA.id),
    ]);
    assert.equal(d1.status, 201);
    assert.equal(d2.status, 201);

    // exatamente 1 run provisionada (a 2ª createRun devolveu created:false).
    const runs = await runsForWorkOrder(baseUrl, seed, wo.id);
    assert.equal(runs.status, 200);
    assert.equal(runs.body.data.length, 1);

    // exatamente 1 unidade FATURADA: o serviço só emite checklist_run.created quando created===true. Sem o
    // conserto, as 2 emissões teriam event.id distintos → 2 registros checklist_runs_count (super-contagem).
    await flushCloudUsage();
    const billed = (await getMemoryCloudUsageRepositoryForTests().listEvents({ tenantId: seed.tenantA.id })).filter(
      (event) => event.metricKey === "checklist_runs_count",
    );
    assert.equal(billed.length, 1);

    resetCloudUsageRuntimeForTests();
  });
});

// D-CHK-DISPATCH-CREATE (achado BAIXO do crítico, item 5) — se a OS troca de checklist entre despachos, o GET
// run-por-OS lista >1 run; o filtro opcional ?checklistId= desambigua a run do checklist vigente.

test("[desambiguacao] OS que troca de checklist entre despachos → GET lista 2 runs; ?checklistId filtra a vigente", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const tplA = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Checklist A");
    const tplB = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Checklist B");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tplA.id });

    const d1 = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(d1.status, 201);

    // troca o checklist VIGENTE da OS e re-despacha → 2ª run (chave determinística diferente).
    const patch = await updateWOChecklist(baseUrl, seed, wo.id, tplB.id);
    assert.equal(patch.status, 200);
    const d2 = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(d2.status, 201);

    // sem filtro: as 2 runs (a lista pode ter >1), ordenadas por created_at desc.
    const all = await runsForWorkOrder(baseUrl, seed, wo.id);
    assert.equal(all.status, 200);
    assert.equal(all.body.data.length, 2);

    // filtra pelo checklist VIGENTE (B) → só a run de B.
    const onlyB = await req(baseUrl, `/api/v1/mobile/checklist-runs?workOrderId=${wo.id}&checklistId=${tplB.id}`, {
      headers: headers(seed, "tenant_admin"),
    });
    assert.equal(onlyB.status, 200);
    assert.equal(onlyB.body.data.length, 1);
    assert.equal(onlyB.body.data[0].templateId, tplB.id);

    // filtra por A → só a run de A (re-despacho com o MESMO checklist seria idempotente = 1 run).
    const onlyA = await req(baseUrl, `/api/v1/mobile/checklist-runs?workOrderId=${wo.id}&checklistId=${tplA.id}`, {
      headers: headers(seed, "tenant_admin"),
    });
    assert.equal(onlyA.status, 200);
    assert.equal(onlyA.body.data.length, 1);
    assert.equal(onlyA.body.data[0].templateId, tplA.id);
  });
});

// ---------- harness ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly techA: User;
  readonly techB: User;
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
  const tenantA = core.createTenant({ name: "T CS A", modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"] });
  const tenantB = core.createTenant({ name: "T CS B", modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"] });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Mgr A", email: "cs-mgr-a@example.com", roles: ["manager"] });
  const managerB = core.createUser({ tenantId: tenantB.id, name: "Mgr B", email: "cs-mgr-b@example.com", roles: ["manager"] });
  const techA = core.createUser({ tenantId: tenantA.id, name: "Tec A", email: "cs-tec-a@example.com", roles: ["field_technician"] });
  const techB = core.createUser({ tenantId: tenantA.id, name: "Tec B", email: "cs-tec-b@example.com", roles: ["field_technician"] });
  const seed: SeedData = { tenantA, tenantB, managerA, managerB, techA, techB };

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

async function createTemplate(baseUrl: string, h: Record<string, string>, name: string): Promise<{ id: string }> {
  const create = await req(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: h,
    body: {
      name,
      type: "technical_evidence",
      schema: { source: "omega3c" },
      components: [
        { componentKey: "safety_ok", type: "observation", label: "O local esta seguro?", required: true, config: {}, validationRules: {}, visibilityRules: {} },
      ],
    },
  });
  assert.equal(create.status, 201);
  return { id: create.body.data.id as string };
}

async function publishTemplate(baseUrl: string, h: Record<string, string>, name: string): Promise<{ id: string }> {
  const created = await createTemplate(baseUrl, h, name);
  const publish = await req(baseUrl, `/api/v1/tenant/checklists/${created.id}/publish`, { method: "POST", headers: h, body: {} });
  assert.equal(publish.status, 200);
  return created;
}

async function createWO(baseUrl: string, seed: SeedData, body: Record<string, unknown>): Promise<{ id: string }> {
  const res = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: headers(seed, "tenant_admin"), body });
  assert.equal(res.status, 201);
  return { id: res.body.data.id as string };
}

async function createDispatch(baseUrl: string, seed: SeedData, workOrderId: string, operatorUserId: string) {
  return req(baseUrl, "/api/v1/operations/dispatches", { method: "POST", headers: headers(seed, "tenant_admin"), body: { workOrderId, operatorUserId } });
}

async function runsForWorkOrder(baseUrl: string, seed: SeedData, workOrderId: string) {
  return req(baseUrl, `/api/v1/mobile/checklist-runs?workOrderId=${workOrderId}`, { headers: headers(seed, "tenant_admin") });
}

async function updateWOChecklist(baseUrl: string, seed: SeedData, workOrderId: string, checklistId: string) {
  return req(baseUrl, `/api/v1/work-orders/${workOrderId}`, {
    method: "PATCH",
    headers: headers(seed, "tenant_admin"),
    body: { checklistId },
  });
}

// recordCloudUsageBestEffort é fire-and-forget (async, não-aguardado); drena os microtasks/macrotask antes de
// inspecionar a métrica FATURADA.
async function flushCloudUsage(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
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
