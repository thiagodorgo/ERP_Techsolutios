import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// CHECKLIST P1 PR-04c (BLOQ 2 do ataque ao plano v1, §8 do plano v2) — A ORDEM EM VOO NO DIA DO DEPLOY.
//
// Esta fatia muda a FORMA da chave de idempotência da execução provisionada pelo despacho: de
// `dispatch:<ordem>:<modelo>` para `dispatch:<ordem>:<modelo>:<fase>`. Toda ordem que já estava em campo no
// momento do deploy — despachada, guincheiro respondendo — tem execução gravada com a chave ANTIGA. Sem o
// fallback, o primeiro `reassign` (caminho normal de recuperação, que roda o provisionamento SEMPRE) daria
// miss na chave nova e criaria uma SEGUNDA execução vazia do mesmo modelo, com `created:true`.
//
// O dano tem duas faces, e nenhuma é hipotética:
//   1. FATURAMENTO: `checklist_runs_count` deduplica por `event.id`; uma emissão nova é uma unidade cobrada
//      nova. O número dobraria na frota inteira de ordens em voo, de uma vez.
//   2. PROVA: duas execuções da mesma fase deixam a busca por fase ambígua, e a tela de comparação do app
//      passa a RECUSAR comparar — o resumo de divergências coleta×entrega é o que vira prova do estado do
//      veículo.
//
// O guard que já existia NÃO pega isto: `checklist-snapshot-dispatch.test.ts` ("dois despachos concorrentes →
// 1 run e 1 unidade FATURADA") cria as duas execuções já com a chave nova, então nunca atravessa a fronteira
// entre os dois formatos.

test("[chave legada] ordem EM VOO + re-despacho e reassign → 0 execuções novas e 0 unidades FATURADAS novas", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const { resetCloudUsageRuntimeForTests, getMemoryCloudUsageRepositoryForTests } = await import(
      "../src/modules/cloud-usage/cloud-usage.service.js"
    );
    const { createMemoryChecklistService } = await import("../src/modules/checklists/checklist.service.js");
    resetCloudUsageRuntimeForTests();

    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Vistoria do Veículo");
    const wo = await createWO(baseUrl, seed, { title: "OS em voo", checklistId: tpl.id });

    // O MUNDO ANTES DESTA FATIA: a execução da ordem em voo, gravada com a chave LEGADA (sem fase) — que é
    // exatamente o que o provisionamento anterior escrevia. O serviço em memória compartilha o repositório
    // singleton com a API, então esta é a MESMA execução que o despacho vai encontrar.
    const checklistService = createMemoryChecklistService();
    const legacyKey = `dispatch:${wo.id}:${tpl.id}`;
    const legacyRun = await checklistService.createRun(
      { tenantId: seed.tenantA.id, userId: seed.managerA.id },
      {
        checklistId: tpl.id,
        clientRunKey: legacyKey,
        relatedEntityType: "work_order",
        relatedEntityId: wo.id,
        answers: [],
      },
    );

    // Linha de base HONESTA: a execução legada já custou a sua unidade quando nasceu, no mundo antigo. O que
    // este teste mede é o DELTA que a troca de chave provoca — e ele tem de ser zero.
    await flushCloudUsage();
    assert.equal(billedRuns(await getMemoryCloudUsageRepositoryForTests().listEvents({ tenantId: seed.tenantA.id })), 1);
    assert.equal((await runsForWorkOrder(baseUrl, seed, wo.id)).body.data.length, 1);

    // O DEPLOY: a ordem em voo atravessa os três caminhos que provisionam execução, todos com o código novo.
    const d1 = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(d1.status, 201);
    const reassign = await req(baseUrl, `/api/v1/operations/dispatches/${d1.body.data.id}/reassign`, {
      method: "PATCH",
      headers: headers(seed, "tenant_admin"),
      body: { operatorUserId: seed.techB.id },
    });
    assert.equal(reassign.status, 200);
    const d2 = await createDispatch(baseUrl, seed, wo.id, seed.techA.id);
    assert.equal(d2.status, 201);

    // NENHUMA unidade FATURADA nova — a asserção de cabeceira, porque é o dano que se multiplica pela frota
    // inteira de ordens em voo: a adoção não publica `checklist_run.created`, porque nenhuma vistoria nasceu.
    // Sem o fallback, seriam 2 (uma por formato de chave).
    await flushCloudUsage();
    assert.equal(billedRuns(await getMemoryCloudUsageRepositoryForTests().listEvents({ tenantId: seed.tenantA.id })), 1);

    // NENHUMA execução nova: a mesma vistoria que o guincheiro já está respondendo continua sendo a única.
    const runs = await runsForWorkOrder(baseUrl, seed, wo.id);
    assert.equal(runs.status, 200);
    assert.equal(runs.body.data.length, 1);
    assert.equal(runs.body.data[0].id, legacyRun.id);

    // A ADOÇÃO em si: a execução em voo ganhou proveniência de fase, sem nascer de novo. A ordem antiga não
    // tem junção, então ela é lida como uma vistoria de fase genérica (a visão sintética do §5.3).
    const adopted = await checklistService.findRunByClientKey({ tenantId: seed.tenantA.id, userId: seed.managerA.id }, legacyKey);
    assert.equal(adopted?.id, legacyRun.id);
    assert.equal(adopted?.role, "generic");
    // A chave durável NÃO foi reescrita: ela é a idempotência do replay offline do app, e mutá-la para
    // "arrumar o formato" trocaria um risco conhecido por um desconhecido.
    assert.equal(adopted?.clientRunKey, legacyKey);
    // E a chave NOVA continua sem dono — é o que prova que ninguém criou a segunda execução por baixo.
    const byNewKey = await checklistService.findRunByClientKey(
      { tenantId: seed.tenantA.id, userId: seed.managerA.id },
      `${legacyKey}:generic`,
    );
    assert.equal(byNewKey, null);

    resetCloudUsageRuntimeForTests();
  });
});

// A adoção é ESTREITA de propósito: só a fase genérica adota a chave legada. A chave legada nasceu num mundo
// sem fase, e a linha primária de uma ordem dessas é sempre a genérica. Deixar uma linha de coleta adotá-la
// carimbaria na execução uma fase que ela nunca teve — proveniência inventada em cima de prova (D-007).
test("[adoção estreita] a chave legada só é adotada pela fase genérica; fase concreta cria a sua própria execução", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const { createMemoryChecklistService } = await import("../src/modules/checklists/checklist.service.js");
    const { buildChecklistRunProvisioner } = await import("../src/modules/field-dispatch/field-dispatch.service.js");

    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Vistoria do Veículo");
    const wo = await createWO(baseUrl, seed, { title: "OS em voo", checklistId: tpl.id });

    const checklistService = createMemoryChecklistService();
    const actorContext = { tenantId: seed.tenantA.id, userId: seed.managerA.id };
    const legacyKey = `dispatch:${wo.id}:${tpl.id}`;
    const legacyRun = await checklistService.createRun(actorContext, {
      checklistId: tpl.id,
      clientRunKey: legacyKey,
      relatedEntityType: "work_order",
      relatedEntityId: wo.id,
      answers: [],
    });

    const provision = buildChecklistRunProvisioner(checklistService);

    // Fase CONCRETA: ignora a chave legada e cria a execução da sua própria fase.
    await provision({
      tenantId: seed.tenantA.id,
      actorUserId: seed.managerA.id,
      workOrderId: wo.id,
      checklistId: tpl.id,
      role: "collection",
    });
    const collection = await checklistService.findRunByClientKey(actorContext, `${legacyKey}:collection`);
    assert.notEqual(collection, null);
    assert.notEqual(collection?.id, legacyRun.id);
    assert.equal(collection?.role, "collection");

    // E a execução legada segue intocada — sem fase carimbada por engano.
    const legacyAfter = await checklistService.findRunByClientKey(actorContext, legacyKey);
    assert.equal(legacyAfter?.id, legacyRun.id);
    assert.equal(legacyAfter?.role, undefined);

    // Fase GENÉRICA: adota, não cria.
    await provision({
      tenantId: seed.tenantA.id,
      actorUserId: seed.managerA.id,
      workOrderId: wo.id,
      checklistId: tpl.id,
      role: "generic",
    });
    assert.equal((await checklistService.findRunByClientKey(actorContext, `${legacyKey}:generic`)), null);
    assert.equal((await checklistService.findRunByClientKey(actorContext, legacyKey))?.role, "generic");
  });
});

// A fase é proveniência de NASCIMENTO: uma execução já carimbada nunca é recarimbada. Reescrever a fase de uma
// vistoria concluída mudaria retroativamente o que já foi assinado — e vistoria concluída é prova imutável
// (D-CHK-P1-RUN-LIFECYCLE).
test("[fase não se reescreve] carimbar fase numa execução que já tem fase não muda nada", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const { createMemoryChecklistService } = await import("../src/modules/checklists/checklist.service.js");

    const tpl = await publishTemplate(baseUrl, headers(seed, "tenant_admin"), "Vistoria");
    const wo = await createWO(baseUrl, seed, { title: "OS", checklistId: tpl.id });

    const checklistService = createMemoryChecklistService();
    const actorContext = { tenantId: seed.tenantA.id, userId: seed.managerA.id };
    const run = await checklistService.createRun(actorContext, {
      checklistId: tpl.id,
      clientRunKey: `dispatch:${wo.id}:${tpl.id}:collection`,
      relatedEntityType: "work_order",
      relatedEntityId: wo.id,
      role: "collection",
      answers: [],
    });

    assert.equal(await checklistService.stampRunRole(actorContext, run.id, "delivery"), false);
    assert.equal((await checklistService.findRunByClientKey(actorContext, `dispatch:${wo.id}:${tpl.id}:collection`))?.role, "collection");

    // Isolamento: outra organização não carimba a execução desta (nem descobre que ela existe).
    assert.equal(await checklistService.stampRunRole({ tenantId: seed.tenantB.id, userId: seed.managerB.id }, run.id, "delivery"), false);
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

function billedRuns(events: readonly { readonly metricKey: string }[]): number {
  return events.filter((event) => event.metricKey === "checklist_runs_count").length;
}

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
  const tenantA = core.createTenant({ name: "T Legacy A", modules });
  const tenantB = core.createTenant({ name: "T Legacy B", modules });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Mgr A", email: "legacy-mgr-a@example.com", roles: ["manager"] });
  const managerB = core.createUser({ tenantId: tenantB.id, name: "Mgr B", email: "legacy-mgr-b@example.com", roles: ["manager"] });
  const techA = core.createUser({ tenantId: tenantA.id, name: "Tec A", email: "legacy-tec-a@example.com", roles: ["field_technician"] });
  const techB = core.createUser({ tenantId: tenantA.id, name: "Tec B", email: "legacy-tec-b@example.com", roles: ["field_technician"] });
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

async function publishTemplate(baseUrl: string, h: Record<string, string>, name: string): Promise<{ id: string }> {
  const create = await req(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: h,
    body: {
      name,
      type: "technical_evidence",
      schema: { source: "chk-p1-pr04c" },
      components: [
        { componentKey: "safety_ok", type: "observation", label: "O local esta seguro?", required: true, config: {}, validationRules: {}, visibilityRules: {} },
      ],
    },
  });
  assert.equal(create.status, 201);
  const publish = await req(baseUrl, `/api/v1/tenant/checklists/${create.body.data.id}/publish`, { method: "POST", headers: h, body: {} });
  assert.equal(publish.status, 200);
  return { id: create.body.data.id as string };
}

async function createWO(baseUrl: string, seed: SeedData, body: Record<string, unknown>): Promise<{ id: string }> {
  const res = await req(baseUrl, "/api/v1/work-orders", { method: "POST", headers: headers(seed, "tenant_admin"), body });
  assert.equal(res.status, 201);
  return { id: res.body.data.id as string };
}

async function createDispatch(baseUrl: string, seed: SeedData, workOrderId: string, operatorUserId: string) {
  return req(baseUrl, "/api/v1/operations/dispatches", {
    method: "POST",
    headers: headers(seed, "tenant_admin"),
    body: { workOrderId, operatorUserId },
  });
}

async function runsForWorkOrder(baseUrl: string, seed: SeedData, workOrderId: string) {
  return req(baseUrl, `/api/v1/mobile/checklist-runs?workOrderId=${workOrderId}`, { headers: headers(seed, "tenant_admin") });
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
