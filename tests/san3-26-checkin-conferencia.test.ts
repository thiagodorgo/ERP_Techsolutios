import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-SAN3-26 (item 53 do portão) — o "No local" confere a placa do veículo atendido, nas duas portas.
//
// Decisões do dono que este arquivo prova:
//   `D-PORTAO-9-RECOMENDACOES-1011` — só `residencial` é isento sem placa; a base (papel de escritório) marca "No local"
//                                     pelo console sem os dígitos, e a linha do tempo diz "registrada pela base";
//   `D-PORTAO-5-RECOMENDACOES-1111` — a OS sem placa não anda pelo campo: o guincheiro pede à base, e a base registra.
// Plano: `plano-B-SAN3-26-v2.md` (A1–A12, L1), com os ajustes da crítica da rodada 2 (C26R2-01 a 08) como requisito.
//
// VERMELHO-CONTROLE: este arquivo NÃO importa `work-order.checkin.ts` no topo — na base (sem o produto do bloco) ele
// carrega e cada teste falha pelo motivo declarado (200 onde o bloco exige 422, `accepted` onde exige conflito, chave
// ausente na lista). Registro em `docs/revisoes/SAN3/B-SAN3-26-dev.md`.

const PLACA = "ABC1D23";
const DIGITOS_CERTOS = "23";
// Sentinela de dígitos errados: letras que um UUID (hex) e uma data ISO nunca têm, para o teste de sigilo procurar
// a cadeia no JSON inteiro sem falso positivo.
const DIGITOS_ERRADOS = "ZQ";
const LOTE_OS = "/api/v1/mobile/sync/work-order-actions";
const MOTIVOS_RECUSA = ["checkin_confirmation_required", "checkin_confirmation_mismatch", "checkin_reference_missing"];

type Resposta = { status: number; body: any };
type Ctx = {
  readonly seed: { tenantA: Tenant; gestor: User; tecnico: User; outroTecnico: User };
  h(user: User, role: string): Record<string, string>;
  req(caminho: string, opcoes?: { method?: string; headers?: Record<string, string>; body?: unknown }): Promise<Resposta>;
  catalogo(serviceType: string): Promise<string>;
  /** Cria a OS como gestor, despacha ao técnico e a leva a `on_route` pelo técnico. */
  osACaminho(corpo?: Record<string, unknown>): Promise<string>;
  os(id: string): Promise<any>;
  timeline(id: string): Promise<any[]>;
  lote(headers: Record<string, string>, payload: Record<string, unknown>, id?: string): Promise<{ http: number; acao: any; corpo: any }>;
  jobs: unknown[];
};

async function withApi(callback: (ctx: Ctx) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    workOrders,
    fieldDispatch,
    workOrderSync,
    serviceCatalog,
    jobQueueModule,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/service-catalog/service-catalog.service.js"),
    import("../src/infra/jobs/job.queue.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  workOrders.resetWorkOrderRuntimeForTests();
  fieldDispatch.resetFieldDispatchRuntimeForTests();
  workOrderSync.resetMobileWorkOrderSyncRuntimeForTests();
  serviceCatalog.resetServiceCatalogRuntimeForTests();

  // Captura o que o publicador de eventos de domínio enfileira (o A8 procura os dígitos e a placa nele).
  const jobs: unknown[] = [];
  const queue = jobQueueModule.getDefaultJobQueue();
  const enqueueOriginal = queue.enqueue.bind(queue);
  queue.enqueue = (async (...args: Parameters<typeof queue.enqueue>) => {
    jobs.push(args[1]);
    return enqueueOriginal(...args);
  }) as typeof queue.enqueue;

  const modulos = ["work_orders", "field_operations", "tenant_checklist", "checklists", "service_catalog", "registry"];
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "SAN3-26 A", modules: modulos });
  const sufixo = randomUUID().slice(0, 8);
  const usuario = (nome: string, roles: string[]) =>
    core.createUser({ tenantId: tenantA.id, name: nome, email: `${nome}-${sufixo}@san326.example.com`, roles: roles as never });
  const seed = {
    tenantA,
    gestor: usuario("gestor", ["manager"]),
    tecnico: usuario("tecnico", ["field_technician"]),
    outroTecnico: usuario("outro-tecnico", ["field_technician"]),
  };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const h = (user: User, role: string) => ({ "x-tenant-id": tenantA.id, "x-user-id": user.id, "x-role": role });
  const hGestor = h(seed.gestor, "manager");
  const hAdmin = h(seed.gestor, "tenant_admin");
  const hTecnico = h(seed.tecnico, "field_technician");
  const req: Ctx["req"] = async (caminho, opcoes = {}) => {
    const response = await fetch(`${baseUrl}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: { "content-type": "application/json", ...opcoes.headers },
      body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  const catalogos = new Map<string, string>();
  const ctx: Ctx = {
    seed,
    h,
    req,
    jobs,
    async catalogo(serviceType) {
      const existente = catalogos.get(serviceType);
      if (existente) return existente;
      const criado = await req("/api/v1/service-catalog", {
        method: "POST",
        headers: hAdmin,
        body: { name: `Serviço ${serviceType || "sem tipo"} ${randomUUID().slice(0, 4)}`, service_type: serviceType, requires_destination: false },
      });
      assert.equal(criado.status, 201, JSON.stringify(criado.body));
      const id = criado.body.data.id as string;
      catalogos.set(serviceType, id);
      return id;
    },
    async osACaminho(corpo = { service_details: { plate: PLACA } }) {
      const criada = await req("/api/v1/work-orders", { method: "POST", headers: hGestor, body: { title: "OS SAN3-26", ...corpo } });
      assert.equal(criada.status, 201, JSON.stringify(criada.body));
      const id = criada.body.data.id as string;
      const despacho = await req("/api/v1/operations/dispatches", {
        method: "POST",
        headers: hGestor,
        body: { workOrderId: id, operatorUserId: seed.tecnico.id },
      });
      assert.equal(despacho.status, 201, JSON.stringify(despacho.body));
      for (const etapa of ["accepted", "on_route"]) {
        const r = await req(`/api/v1/work-orders/${id}/status`, { method: "PATCH", headers: hTecnico, body: { status: etapa } });
        assert.equal(r.status, 200, `${etapa}: ${JSON.stringify(r.body)}`);
      }
      return id;
    },
    async os(id) {
      const r = await req(`/api/v1/work-orders/${id}`, { headers: hGestor });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.data;
    },
    async timeline(id) {
      const r = await req(`/api/v1/work-orders/${id}/timeline`, { headers: hGestor });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.data as any[];
    },
    async lote(headers, payload, id = randomUUID()) {
      const r = await req(LOTE_OS, {
        method: "POST",
        headers,
        body: { client_batch_id: randomUUID(), actions: [{ client_action_id: id, type: "work_order.status_change", local_created_at: new Date().toISOString(), payload }] },
      });
      const data = r.body?.data ?? {};
      const todas = [...(data.accepted ?? []), ...(data.rejected ?? []), ...(data.conflicts ?? []), ...(data.already_applied ?? [])];
      return { http: r.status, acao: todas.find((a: any) => a.client_action_id === id), corpo: r.body };
    },
  };

  try {
    await callback(ctx);
  } finally {
    queue.enqueue = enqueueOriginal;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function noLocal(corpo: Record<string, unknown> = {}) {
  return { status: "on_site", ...corpo };
}

function confirmacao(digitos: string) {
  return { checkin_confirmation: { last_digits: digitos } };
}

function itensDaLista(body: any): any[] {
  return (body?.items ?? body?.data?.items ?? []) as any[];
}

// ------------------------------------------------------------------------------------------------
// A1 — o campo, pela rota HTTP, sem a conferência: 422, a OS não sai de `on_route` e nada é gravado.
// ------------------------------------------------------------------------------------------------
test("A1 — técnico pela rota HTTP sem os dígitos: 422 checkin_confirmation_required, OS segue on_route, nenhum evento novo", async () => {
  await withApi(async (ctx) => {
    const id = await ctx.osACaminho();
    const eventosAntes = (await ctx.timeline(id)).length;
    const r = await ctx.req(`/api/v1/work-orders/${id}/status`, { method: "PATCH", headers: ctx.h(ctx.seed.tecnico, "field_technician"), body: noLocal() });
    assert.equal(r.status, 422, JSON.stringify(r.body));
    assert.equal(r.body.error.reason, "checkin_confirmation_required");
    assert.equal((await ctx.os(id)).status, "on_route");
    assert.equal((await ctx.timeline(id)).length, eventosAntes, "a recusa gravou evento");
    // A mensagem da recusa não ecoa a placa.
    assert.doesNotMatch(JSON.stringify(r.body), new RegExp(PLACA));
  });
});

test("A1b — a chave é o DESTINO: `on_site → on_site` também exige a conferência", async () => {
  await withApi(async (ctx) => {
    const id = await ctx.osACaminho();
    const hT = ctx.h(ctx.seed.tecnico, "field_technician");
    const primeiro = await ctx.req(`/api/v1/work-orders/${id}/status`, { method: "PATCH", headers: hT, body: noLocal(confirmacao(DIGITOS_CERTOS)) });
    assert.equal(primeiro.status, 200, JSON.stringify(primeiro.body));
    const chegada = (await ctx.os(id)).arrivedAt;
    const repetido = await ctx.req(`/api/v1/work-orders/${id}/status`, { method: "PATCH", headers: hT, body: noLocal() });
    assert.equal(repetido.status, 422, JSON.stringify(repetido.body));
    assert.equal(repetido.body.error.reason, "checkin_confirmation_required");
    assert.equal((await ctx.os(id)).arrivedAt, chegada, "a regravação de on_site mudou a hora de chegada sem conferência");
  });
});

// ------------------------------------------------------------------------------------------------
// A2/A3 — a placa certa passa; o fim do CÓDIGO da OS não passa.
// ------------------------------------------------------------------------------------------------
test("A2 — placa certa aceita (\"23\", \" 2 3 \", \"2-3\"): 200, on_site, arrivedAt preenchido", async () => {
  await withApi(async (ctx) => {
    for (const digitos of ["23", " 2 3 ", "2-3"]) {
      const id = await ctx.osACaminho();
      const os = await ctx.os(id);
      assert.notEqual(String(os.code).slice(-2).toUpperCase(), DIGITOS_CERTOS, "pré-condição: o fim do código não pode ser o fim da placa");
      const r = await ctx.req(`/api/v1/work-orders/${id}/status`, {
        method: "PATCH",
        headers: ctx.h(ctx.seed.tecnico, "field_technician"),
        body: noLocal(confirmacao(digitos)),
      });
      assert.equal(r.status, 200, `${JSON.stringify(digitos)}: ${JSON.stringify(r.body)}`);
      const depois = await ctx.os(id);
      assert.equal(depois.status, "on_site");
      assert.ok(depois.arrivedAt, "arrivedAt não foi preenchido");
    }
  });
});

test("A3 — os 2 últimos caracteres do CÓDIGO da OS são recusados: 422 checkin_confirmation_mismatch", async () => {
  await withApi(async (ctx) => {
    const id = await ctx.osACaminho();
    const fimDoCodigo = String((await ctx.os(id)).code).slice(-2);
    assert.notEqual(fimDoCodigo.toUpperCase(), DIGITOS_CERTOS, "pré-condição: o fim do código não pode ser o fim da placa");
    const r = await ctx.req(`/api/v1/work-orders/${id}/status`, {
      method: "PATCH",
      headers: ctx.h(ctx.seed.tecnico, "field_technician"),
      body: noLocal(confirmacao(fimDoCodigo)),
    });
    assert.equal(r.status, 422, JSON.stringify(r.body));
    assert.equal(r.body.error.reason, "checkin_confirmation_mismatch");
    assert.equal((await ctx.os(id)).status, "on_route");
  });
});

// ------------------------------------------------------------------------------------------------
// A4/A4b — a fila do app exige e repassa; a recusa vira CONFLITO resolvível, nunca `rejected`.
// ------------------------------------------------------------------------------------------------
test("A4 — pela fila, com os dígitos certos: accepted e a OS em on_site", async () => {
  await withApi(async (ctx) => {
    const id = await ctx.osACaminho();
    const { http, acao } = await ctx.lote(ctx.h(ctx.seed.tecnico, "field_technician"), { work_order_id: id, ...noLocal(confirmacao(DIGITOS_CERTOS)) });
    assert.equal(http, 200);
    assert.equal(acao?.status, "accepted", JSON.stringify(acao));
    assert.equal((await ctx.os(id)).status, "on_site");
  });
});

test("A4b — pela fila, a recusa sai em `conflicts` com next_action redo_checkin, nos 3 motivos, sem ecoar dígitos nem placa", async () => {
  await withApi(async (ctx) => {
    const hT = ctx.h(ctx.seed.tecnico, "field_technician");
    const casos: Array<{ motivo: string; corpo?: Record<string, unknown>; payload: Record<string, unknown> }> = [
      { motivo: "checkin_confirmation_required", payload: noLocal() },
      { motivo: "checkin_confirmation_mismatch", payload: noLocal(confirmacao(DIGITOS_ERRADOS)) },
      { motivo: "checkin_reference_missing", corpo: { serviceCatalogId: await ctx.catalogo("reboque") }, payload: noLocal(confirmacao(DIGITOS_ERRADOS)) },
    ];
    for (const caso of casos) {
      const id = await ctx.osACaminho(caso.corpo);
      const { http, acao, corpo } = await ctx.lote(hT, { work_order_id: id, ...caso.payload });
      assert.equal(http, 200);
      assert.equal(acao?.status, "conflict", `${caso.motivo}: ${JSON.stringify(acao)}`);
      assert.equal(acao.conflict.conflict_type, caso.motivo);
      assert.equal(acao.conflict.next_action, "redo_checkin");
      assert.equal(acao.error.reason, caso.motivo);
      assert.equal(corpo.data.rejected.length, 0, "a recusa caiu em rejected");
      const texto = JSON.stringify(corpo);
      assert.doesNotMatch(texto, new RegExp(PLACA), `${caso.motivo}: a placa foi ecoada`);
      assert.doesNotMatch(texto, new RegExp(DIGITOS_ERRADOS), `${caso.motivo}: os dígitos foram ecoados`);
      assert.doesNotMatch(texto, /last_digits|checkin_confirmation"/, `${caso.motivo}: a confirmação foi ecoada`);
      assert.equal((await ctx.os(id)).status, "on_route");
    }
  });
});

// ------------------------------------------------------------------------------------------------
// A5/A6 — default negar; a única isenção é `residencial` SEM placa.
// ------------------------------------------------------------------------------------------------
test("A5 — OS sem placa de reboque, socorro, outro, sem tipo e sem catálogo: 422 checkin_reference_missing", async () => {
  await withApi(async (ctx) => {
    const corpos: Array<[string, Record<string, unknown>]> = [
      ["reboque", { serviceCatalogId: await ctx.catalogo("reboque") }],
      ["socorro", { serviceCatalogId: await ctx.catalogo("socorro") }],
      ["outro", { serviceCatalogId: await ctx.catalogo("outro") }],
      ["sem tipo", { serviceCatalogId: await ctx.catalogo("") }],
      ["sem catálogo", {}],
    ];
    for (const [nome, corpo] of corpos) {
      const id = await ctx.osACaminho(corpo);
      const r = await ctx.req(`/api/v1/work-orders/${id}/status`, {
        method: "PATCH",
        headers: ctx.h(ctx.seed.tecnico, "field_technician"),
        body: noLocal(confirmacao(DIGITOS_CERTOS)),
      });
      assert.equal(r.status, 422, `${nome}: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.error.reason, "checkin_reference_missing", nome);
    }
  });
});

test("A5b — sem o resolver de catálogo (composição incompleta) a OS sem placa NÃO é isenta", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { WorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
  const residencialId = randomUUID();
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {
    resolveServiceCatalog: async () => true,
    // sem resolveServiceCatalogTypeInfo
  });
  const gestor = { tenantId: randomUUID(), userId: randomUUID(), roles: ["manager"], permissions: [] } as never;
  const os = await service.create(gestor, { title: "Residencial sem resolver", serviceCatalogId: residencialId });
  for (const etapa of ["assigned", "accepted", "on_route"]) {
    await service.changeStatus(gestor, os.id, { status: etapa }).catch(() => undefined);
  }
  const atual = await service.get(gestor, os.id);
  assert.equal(atual.status, "on_route", `pré-condição: ${atual.status}`);
  const campo = { tenantId: (gestor as any).tenantId, userId: randomUUID(), roles: ["operator", "field_technician"], permissions: [] } as never;
  await assert.rejects(
    () => service.changeStatus(campo, os.id, { status: "on_site" }),
    (error: any) => error.statusCode === 422 && error.reason === "checkin_reference_missing",
  );
});

test("A6 — residencial sem placa passa sem dígitos (exempt_service_type); com placa exige; `Residencial` fora da lista não isenta", async () => {
  await withApi(async (ctx) => {
    const hT = ctx.h(ctx.seed.tecnico, "field_technician");
    const residencial = await ctx.catalogo("residencial");

    const isenta = await ctx.osACaminho({ serviceCatalogId: residencial });
    const ok = await ctx.req(`/api/v1/work-orders/${isenta}/status`, { method: "PATCH", headers: hT, body: noLocal() });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const evento = (await ctx.timeline(isenta)).find((e) => e.toStatus === "on_site");
    assert.equal(evento?.metadata?.checkin, "exempt_service_type", JSON.stringify(evento));

    const comPlaca = await ctx.osACaminho({ serviceCatalogId: residencial, service_details: { plate: PLACA } });
    const semDigitos = await ctx.req(`/api/v1/work-orders/${comPlaca}/status`, { method: "PATCH", headers: hT, body: noLocal() });
    assert.equal(semDigitos.status, 422, JSON.stringify(semDigitos.body));
    assert.equal(semDigitos.body.error.reason, "checkin_confirmation_required");

    const maiuscula = await ctx.osACaminho({ serviceCatalogId: await ctx.catalogo("Residencial") });
    const fora = await ctx.req(`/api/v1/work-orders/${maiuscula}/status`, { method: "PATCH", headers: hT, body: noLocal() });
    assert.equal(fora.status, 422, JSON.stringify(fora.body));
    assert.equal(fora.body.error.reason, "checkin_reference_missing");
  });
});

// ------------------------------------------------------------------------------------------------
// A7 — quem confere não escreve a referência (C26-06).
// ------------------------------------------------------------------------------------------------
test("A7 — o técnico não troca, omite, anula nem esvazia a placa (403); mudança só cosmética passa; o gestor edita", async () => {
  await withApi(async (ctx) => {
    const hT = ctx.h(ctx.seed.tecnico, "field_technician");
    const id = await ctx.osACaminho();
    const corpos = [
      { service_details: { plate: "XYZ9999" } },
      { service_details: { vehicle: "Gol" } },
      { service_details: { plate: null } },
      { service_details: { plate: "" } },
    ];
    for (const corpo of corpos) {
      const r = await ctx.req(`/api/v1/work-orders/${id}`, { method: "PATCH", headers: hT, body: corpo });
      assert.equal(r.status, 403, `${JSON.stringify(corpo)}: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.error.reason, "checkin_reference_not_editable");
      assert.equal((await ctx.os(id)).serviceDetails?.plate, PLACA, "a placa mudou apesar da recusa");
    }
    const cosmetica = await ctx.req(`/api/v1/work-orders/${id}`, { method: "PATCH", headers: hT, body: { service_details: { plate: "abc-1d23", vehicle: "Gol" } } });
    assert.equal(cosmetica.status, 200, JSON.stringify(cosmetica.body));

    // O técnico também não PÕE placa numa OS que não tinha (isso furaria a recusa por falta de referência).
    const semPlaca = await ctx.osACaminho({ serviceCatalogId: await ctx.catalogo("reboque") });
    const poe = await ctx.req(`/api/v1/work-orders/${semPlaca}`, { method: "PATCH", headers: hT, body: { service_details: { plate: PLACA } } });
    assert.equal(poe.status, 403, JSON.stringify(poe.body));
    assert.equal(poe.body.error.reason, "checkin_reference_not_editable");

    const hG = ctx.h(ctx.seed.gestor, "manager");
    for (const corpo of corpos) {
      const alvo = await ctx.osACaminho();
      const r = await ctx.req(`/api/v1/work-orders/${alvo}`, { method: "PATCH", headers: hG, body: corpo });
      assert.equal(r.status, 200, `gestor ${JSON.stringify(corpo)}: ${JSON.stringify(r.body)}`);
    }
  });
});

// PR534-02 (mutação própria da pré-revisão): a guarda vale para TODO ator que não é só base, não só para o
// `field_technician`. O `technician` tem `work_orders:update` e é papel de campo do check-in; um papel fora das duas
// listas (aqui o `viewer`, chamado direto no serviço) também não troca a placa.
test("A7b — o technician pela rota HTTP e um papel fora das duas listas no serviço não trocam a placa (403)", async () => {
  await withApi(async (ctx) => {
    const hTech = ctx.h(ctx.seed.tecnico, "technician");
    const id = await ctx.osACaminho();
    for (const corpo of [{ service_details: { plate: "XYZ9999" } }, { service_details: { vehicle: "Gol" } }]) {
      const r = await ctx.req(`/api/v1/work-orders/${id}`, { method: "PATCH", headers: hTech, body: corpo });
      assert.equal(r.status, 403, `technician ${JSON.stringify(corpo)}: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.error.reason, "checkin_reference_not_editable");
      assert.equal((await ctx.os(id)).serviceDetails?.plate, PLACA, "a placa mudou apesar da recusa");
    }
    const cosmetica = await ctx.req(`/api/v1/work-orders/${id}`, { method: "PATCH", headers: hTech, body: { service_details: { plate: "abc-1d23" } } });
    assert.equal(cosmetica.status, 200, JSON.stringify(cosmetica.body));
  });

  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { WorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
  const service = new WorkOrderService(new InMemoryWorkOrderRepository());
  const tenantId = randomUUID();
  const gestor = { tenantId, userId: randomUUID(), roles: ["manager"], permissions: [] } as never;
  const os = await service.create(gestor, { title: "Placa e papel fora das listas", service_details: { plate: PLACA } });
  const fora = { tenantId, userId: randomUUID(), roles: ["viewer"], permissions: [] } as never;
  await assert.rejects(
    () => service.update(fora, os.id, { service_details: { plate: "XYZ9999" } }),
    (error: any) => error.statusCode === 403 && error.reason === "checkin_reference_not_editable",
  );
  assert.equal((await service.get(gestor, os.id)).serviceDetails?.plate, PLACA);
  // Controle: o gestor (só base) troca a placa pelo mesmo serviço.
  const trocada = await service.update(gestor, os.id, { service_details: { plate: "XYZ9999" } });
  assert.equal(trocada.serviceDetails?.plate, "XYZ9999");
});

// ------------------------------------------------------------------------------------------------
// A8 — sigilo: os dígitos e a placa não vão para o evento, o domínio publicado nem o conflito.
// ------------------------------------------------------------------------------------------------
test("A8 — os dígitos não vão para o evento nem para o domínio publicado; metadata.checkin = plate_confirmed", async () => {
  await withApi(async (ctx) => {
    const id = await ctx.osACaminho();
    ctx.jobs.length = 0;
    const r = await ctx.req(`/api/v1/work-orders/${id}/status`, {
      method: "PATCH",
      headers: ctx.h(ctx.seed.tecnico, "field_technician"),
      body: noLocal(confirmacao(DIGITOS_CERTOS)),
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const evento = (await ctx.timeline(id)).find((e) => e.toStatus === "on_site");
    assert.ok(evento, "evento de chegada ausente");
    assert.equal(evento.metadata?.checkin, "plate_confirmed");
    const textoEvento = JSON.stringify(evento);
    assert.doesNotMatch(textoEvento, /last_digits|checkin_confirmation|confirmation/, textoEvento);
    assert.doesNotMatch(textoEvento, new RegExp(PLACA));
    assert.ok(ctx.jobs.length > 0, "o domínio não publicou nada (o teste não mediria nada)");
    const textoJobs = JSON.stringify(ctx.jobs);
    assert.doesNotMatch(textoJobs, /last_digits|checkin_confirmation/);
    assert.doesNotMatch(textoJobs, new RegExp(PLACA));
  });
});

test("A8b (C26R2-08) — nenhum conflito da fila ecoa a confirmação: transição inválida e reenvio com outro corpo", async () => {
  await withApi(async (ctx) => {
    const hG = ctx.h(ctx.seed.gestor, "manager");
    // (1) transição inválida (OS em `open`): o 409 vem antes da conferência e cai no ramo genérico de conflito.
    const criada = await ctx.req("/api/v1/work-orders", { method: "POST", headers: hG, body: { title: "OS aberta", service_details: { plate: PLACA } } });
    assert.equal(criada.status, 201, JSON.stringify(criada.body));
    const aberta = criada.body.data.id as string;
    const invalida = await ctx.lote(hG, { work_order_id: aberta, ...noLocal(confirmacao(DIGITOS_ERRADOS)) });
    assert.equal(invalida.acao?.status, "conflict", JSON.stringify(invalida.acao));
    assert.equal(invalida.acao.conflict.conflict_type, "invalid_status_transition");
    assert.equal(invalida.acao.conflict.local?.payload?.checkin_confirmation, undefined, JSON.stringify(invalida.acao.conflict.local));
    assert.doesNotMatch(JSON.stringify(invalida.corpo), new RegExp(DIGITOS_ERRADOS));

    // (2) o mesmo client_action_id, aceito antes, reenviado com outro corpo: idempotency_payload_mismatch.
    const id = await ctx.osACaminho();
    const hT = ctx.h(ctx.seed.tecnico, "field_technician");
    const acaoId = randomUUID();
    const aceita = await ctx.lote(hT, { work_order_id: id, ...noLocal(confirmacao(DIGITOS_CERTOS)) }, acaoId);
    assert.equal(aceita.acao?.status, "accepted", JSON.stringify(aceita.acao));
    const outra = await ctx.lote(hT, { work_order_id: id, ...noLocal(confirmacao(DIGITOS_ERRADOS)) }, acaoId);
    assert.equal(outra.acao?.status, "conflict", JSON.stringify(outra.acao));
    assert.equal(outra.acao.conflict.conflict_type, "idempotency_payload_mismatch");
    assert.equal(outra.acao.conflict.local?.payload?.checkin_confirmation, undefined, JSON.stringify(outra.acao.conflict.local));
    assert.doesNotMatch(JSON.stringify(outra.corpo), new RegExp(DIGITOS_ERRADOS));
  });
});

// ------------------------------------------------------------------------------------------------
// A9 — a porta da base: só a rota HTTP, só quem é SÓ base; a fila exige de todos.
// ------------------------------------------------------------------------------------------------
test("A9a — gestor pela FILA sem dígitos: conflito required; gestor pela rota HTTP: 200 office", async () => {
  await withApi(async (ctx) => {
    const hG = ctx.h(ctx.seed.gestor, "manager");
    const pelaFila = await ctx.osACaminho();
    const { acao } = await ctx.lote(hG, { work_order_id: pelaFila, ...noLocal() });
    assert.equal(acao?.status, "conflict", JSON.stringify(acao));
    assert.equal(acao.conflict.conflict_type, "checkin_confirmation_required");

    const pelaRota = await ctx.osACaminho();
    const r = await ctx.req(`/api/v1/work-orders/${pelaRota}/status`, { method: "PATCH", headers: hG, body: noLocal() });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const evento = (await ctx.timeline(pelaRota)).find((e) => e.toStatus === "on_site");
    assert.equal(evento?.metadata?.checkin, "office");
  });
});

test("A9b — regra de união: um papel de campo basta para exigir os dígitos; só-base passa sem dígitos", async () => {
  await withApi(async (ctx) => {
    for (const papel of ["field_technician,operator", "field_technician,field_dispatcher"]) {
      const id = await ctx.osACaminho();
      const r = await ctx.req(`/api/v1/work-orders/${id}/status`, { method: "PATCH", headers: ctx.h(ctx.seed.tecnico, papel), body: noLocal() });
      assert.equal(r.status, 422, `${papel}: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.error.reason, "checkin_confirmation_required", papel);
    }
    for (const papel of ["operator", "field_dispatcher", "tenant_admin"]) {
      const id = await ctx.osACaminho();
      const r = await ctx.req(`/api/v1/work-orders/${id}/status`, { method: "PATCH", headers: ctx.h(ctx.seed.gestor, papel), body: noLocal() });
      assert.equal(r.status, 200, `${papel}: ${JSON.stringify(r.body)}`);
      const evento = (await ctx.timeline(id)).find((e) => e.toStatus === "on_site");
      assert.equal(evento?.metadata?.checkin, "office", papel);
    }
  });
});

test("A9b-plataforma — platform_admin e super_admin pela porta HTTP do serviço: office (leitura declarada do plano)", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { WorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
  const repository = new InMemoryWorkOrderRepository();
  const service = new WorkOrderService(repository, {});
  const tenantId = randomUUID();
  for (const papel of ["platform_admin", "super_admin"]) {
    const ator = { tenantId, userId: randomUUID(), roles: [papel], permissions: [] } as never;
    const os = await service.create(ator, { title: `OS ${papel}`, service_details: { plate: PLACA } });
    for (const etapa of ["assigned", "accepted", "on_route"]) await service.changeStatus(ator, os.id, { status: etapa });
    const feito = await service.changeStatus(ator, os.id, { status: "on_site" }, { entry: "http_status_route" } as never);
    assert.equal(feito.status, "on_site", papel);
    const eventos = await repository.listTimeline(tenantId, os.id);
    assert.equal(eventos.find((e: any) => e.toStatus === "on_site")?.metadata?.checkin, "office", papel);
  }
});

test("A9c — fail-closed: papel em nenhuma lista ([], viewer, finance) pela porta HTTP do serviço exige os dígitos", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { WorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {});
  const tenantId = randomUUID();
  const gestor = { tenantId, userId: randomUUID(), roles: ["manager"], permissions: [] } as never;
  for (const roles of [[], ["viewer"], ["finance"]]) {
    const os = await service.create(gestor, { title: `OS ${roles.join("+") || "sem papel"}`, service_details: { plate: PLACA } });
    for (const etapa of ["assigned", "accepted", "on_route"]) await service.changeStatus(gestor, os.id, { status: etapa });
    const ator = { tenantId, userId: randomUUID(), roles, permissions: [] } as never;
    await assert.rejects(
      () => service.changeStatus(ator, os.id, { status: "on_site" }, { entry: "http_status_route" } as never),
      (error: any) => error.statusCode === 422 && error.reason === "checkin_confirmation_required",
      `papéis ${JSON.stringify(roles)}`,
    );
  }
});

// ------------------------------------------------------------------------------------------------
// A11/A12 — a saída pela base (C26-01) e a marca visível (C26-05).
// ------------------------------------------------------------------------------------------------
test("A11 — OS de reboque sem placa: o técnico pela fila recebe conflito reference_missing; o operador pela rota registra pela base", async () => {
  await withApi(async (ctx) => {
    const id = await ctx.osACaminho({ serviceCatalogId: await ctx.catalogo("reboque") });
    const { acao } = await ctx.lote(ctx.h(ctx.seed.tecnico, "field_technician"), { work_order_id: id, ...noLocal(confirmacao(DIGITOS_CERTOS)) });
    assert.equal(acao?.status, "conflict", JSON.stringify(acao));
    assert.equal(acao.conflict.conflict_type, "checkin_reference_missing");

    const r = await ctx.req(`/api/v1/work-orders/${id}/status`, { method: "PATCH", headers: ctx.h(ctx.seed.gestor, "operator"), body: noLocal() });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const evento = (await ctx.timeline(id)).find((e) => e.toStatus === "on_site");
    assert.equal(evento?.metadata?.checkin, "office");
    assert.equal(evento?.message, "Chegada ao local registrada pela base.");
  });
});

test("A12 — a mensagem da chegada é do servidor: o técnico não escreve \"pela base\"; o gestor registra pela base", async () => {
  await withApi(async (ctx) => {
    const doCampo = await ctx.osACaminho();
    const r1 = await ctx.req(`/api/v1/work-orders/${doCampo}/status`, {
      method: "PATCH",
      headers: ctx.h(ctx.seed.tecnico, "field_technician"),
      body: noLocal({ message: "Registrado pela base", ...confirmacao(DIGITOS_CERTOS) }),
    });
    assert.equal(r1.status, 200, JSON.stringify(r1.body));
    assert.equal((await ctx.timeline(doCampo)).find((e) => e.toStatus === "on_site")?.message, "Operador chegou ao local, com a placa conferida.");

    const daBase = await ctx.osACaminho();
    const r2 = await ctx.req(`/api/v1/work-orders/${daBase}/status`, { method: "PATCH", headers: ctx.h(ctx.seed.gestor, "manager"), body: noLocal({ message: "qualquer" }) });
    assert.equal(r2.status, 200, JSON.stringify(r2.body));
    assert.equal((await ctx.timeline(daBase)).find((e) => e.toStatus === "on_site")?.message, "Chegada ao local registrada pela base.");
  });
});

// ------------------------------------------------------------------------------------------------
// A12b — C1-A1 (junta do PR #534): a marca da base não é forjada pela mensagem do cliente em NENHUMA transição, nas
// duas portas. A mensagem que a imita é descartada e vale a padrão da transição; outra mensagem continua valendo.
// ------------------------------------------------------------------------------------------------
const MARCA_FORJADA = "Chegada ao local registrada pela base.";

function semMarca(evento: any, contexto: string) {
  assert.ok(evento, `${contexto}: evento ausente`);
  assert.doesNotMatch(String(evento.message), /registrad[ao] pela base/i, `${contexto}: a marca da base foi forjada`);
}

test("A12b — pela rota HTTP e pela fila, on_route e in_progress com a frase da base: a mensagem cai para a padrão", async () => {
  await withApi(async (ctx) => {
    const hT = ctx.h(ctx.seed.tecnico, "field_technician");
    const hG = ctx.h(ctx.seed.gestor, "manager");
    const aceita = async () => {
      const criada = await ctx.req("/api/v1/work-orders", { method: "POST", headers: hG, body: { title: "OS A12b", service_details: { plate: PLACA } } });
      assert.equal(criada.status, 201, JSON.stringify(criada.body));
      const id = criada.body.data.id as string;
      const despacho = await ctx.req("/api/v1/operations/dispatches", { method: "POST", headers: hG, body: { workOrderId: id, operatorUserId: ctx.seed.tecnico.id } });
      assert.equal(despacho.status, 201, JSON.stringify(despacho.body));
      const aceite = await ctx.req(`/api/v1/work-orders/${id}/status`, { method: "PATCH", headers: hT, body: { status: "accepted" } });
      assert.equal(aceite.status, 200, JSON.stringify(aceite.body));
      return id;
    };
    const noLocalConferido = async () => {
      const id = await ctx.osACaminho();
      const r = await ctx.req(`/api/v1/work-orders/${id}/status`, { method: "PATCH", headers: hT, body: noLocal(confirmacao(DIGITOS_CERTOS)) });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return id;
    };
    const ultimo = async (id: string, status: string) => (await ctx.timeline(id)).filter((e) => e.toStatus === status).at(-1);

    // Rota HTTP.
    const httpRota = await aceita();
    const r1 = await ctx.req(`/api/v1/work-orders/${httpRota}/status`, { method: "PATCH", headers: hT, body: { status: "on_route", message: MARCA_FORJADA } });
    assert.equal(r1.status, 200, JSON.stringify(r1.body));
    semMarca(await ultimo(httpRota, "on_route"), "HTTP on_route");
    assert.equal((await ultimo(httpRota, "on_route")).message, "Operador em deslocamento.");

    const httpExec = await noLocalConferido();
    const r2 = await ctx.req(`/api/v1/work-orders/${httpExec}/status`, { method: "PATCH", headers: hT, body: { status: "in_progress", message: MARCA_FORJADA } });
    assert.equal(r2.status, 200, JSON.stringify(r2.body));
    semMarca(await ultimo(httpExec, "in_progress"), "HTTP in_progress");
    assert.equal((await ultimo(httpExec, "in_progress")).message, "Atendimento iniciado.");

    // Fila do app.
    const filaRota = await aceita();
    const l1 = await ctx.lote(hT, { work_order_id: filaRota, status: "on_route", message: MARCA_FORJADA });
    assert.equal(l1.acao?.status, "accepted", JSON.stringify(l1.acao));
    semMarca(await ultimo(filaRota, "on_route"), "fila on_route");

    const filaExec = await noLocalConferido();
    const l2 = await ctx.lote(hT, { work_order_id: filaExec, status: "in_progress", message: MARCA_FORJADA });
    assert.equal(l2.acao?.status, "accepted", JSON.stringify(l2.acao));
    semMarca(await ultimo(filaExec, "in_progress"), "fila in_progress");

    // Controle: outra mensagem do cliente continua valendo.
    const controle = await aceita();
    await ctx.req(`/api/v1/work-orders/${controle}/status`, { method: "PATCH", headers: hT, body: { status: "on_route", message: "Saindo do pátio agora." } });
    assert.equal((await ultimo(controle, "on_route")).message, "Saindo do pátio agora.");
  });
});

test("A12c — a atribuição (rota e fila) e o motivo do despacho também não escrevem a marca da base", async () => {
  await withApi(async (ctx) => {
    const hG = ctx.h(ctx.seed.gestor, "manager");
    const hA = ctx.h(ctx.seed.gestor, "tenant_admin");
    const nova = async () => {
      const criada = await ctx.req("/api/v1/work-orders", { method: "POST", headers: hG, body: { title: "OS A12c", service_details: { plate: PLACA } } });
      assert.equal(criada.status, 201, JSON.stringify(criada.body));
      return criada.body.data.id as string;
    };
    const ultimoAtribuido = async (id: string) => (await ctx.timeline(id)).filter((e) => e.toStatus === "assigned").at(-1);

    const pelaRota = await nova();
    const r = await ctx.req(`/api/v1/work-orders/${pelaRota}/assign`, {
      method: "POST",
      headers: hG,
      // No modo memória o id de usuário não é UUID; a atribuição pede UUID, como nos outros testes de `/assign`.
      body: { operatorId: randomUUID(), message: MARCA_FORJADA },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    semMarca(await ultimoAtribuido(pelaRota), "assign pela rota");

    const pelaFila = await nova();
    const id = randomUUID();
    const lote = await ctx.req(LOTE_OS, {
      method: "POST",
      headers: hG,
      body: {
        client_batch_id: randomUUID(),
        actions: [
          {
            client_action_id: id,
            type: "work_order.assign",
            local_created_at: new Date().toISOString(),
            payload: { work_order_id: pelaFila, operator_id: randomUUID(), message: MARCA_FORJADA },
          },
        ],
      },
    });
    assert.equal(lote.status, 200, JSON.stringify(lote.body));
    assert.equal(lote.body.data.accepted.length, 1, JSON.stringify(lote.body));
    semMarca(await ultimoAtribuido(pelaFila), "assign pela fila");

    const doDespacho = await nova();
    const despacho = await ctx.req("/api/v1/operations/dispatches", { method: "POST", headers: hG, body: { workOrderId: doDespacho, operatorUserId: ctx.seed.tecnico.id } });
    assert.equal(despacho.status, 201, JSON.stringify(despacho.body));
    const reatribui = await ctx.req(`/api/v1/operations/dispatches/${despacho.body.data.id}/reassign`, {
      method: "PATCH",
      headers: hA,
      body: { operatorUserId: ctx.seed.outroTecnico.id, reason: MARCA_FORJADA },
    });
    assert.equal(reatribui.status, 200, JSON.stringify(reatribui.body));
    semMarca(await ultimoAtribuido(doDespacho), "motivo do despacho");
  });
});

// ------------------------------------------------------------------------------------------------
// L1 — a lista leva o MODO do check-in e só os 2 caracteres finais (C26-03, N-01).
// ------------------------------------------------------------------------------------------------
test("L1 — a lista do técnico traz checkinMode e checkinPlateTail, nunca a placa nem o serviceDetails", async () => {
  await withApi(async (ctx) => {
    const comPlaca = await ctx.osACaminho();
    const residencial = await ctx.osACaminho({ serviceCatalogId: await ctx.catalogo("residencial") });
    const reboque = await ctx.osACaminho({ serviceCatalogId: await ctx.catalogo("reboque") });
    const r = await ctx.req("/api/v1/work-orders?scope=assigned&openOnly=true", { headers: ctx.h(ctx.seed.tecnico, "field_technician") });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const itens = itensDaLista(r.body);
    const porId = new Map(itens.map((item) => [item.id, item]));
    assert.deepEqual([porId.get(comPlaca)?.checkinMode, porId.get(comPlaca)?.checkinPlateTail], ["plate", "23"]);
    assert.deepEqual([porId.get(residencial)?.checkinMode, porId.get(residencial)?.checkinPlateTail], ["exempt", null]);
    assert.deepEqual([porId.get(reboque)?.checkinMode, porId.get(reboque)?.checkinPlateTail], ["reference_missing", null]);
    for (const item of itens) assert.equal("serviceDetails" in item, false, "a lista expôs serviceDetails");
    assert.doesNotMatch(JSON.stringify(r.body), new RegExp(PLACA));
  });
});

test("L1b — o tipo do catálogo é resolvido UMA vez por catálogo distinto na página", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { WorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
  const catalogo = randomUUID();
  let chamadas = 0;
  const service = new WorkOrderService(new InMemoryWorkOrderRepository(), {
    resolveServiceCatalog: async () => true,
    resolveServiceCatalogTypeInfo: async () => {
      chamadas += 1;
      return { serviceType: "reboque", requiresDestination: false };
    },
  });
  const ator = { tenantId: randomUUID(), userId: randomUUID(), roles: ["manager"], permissions: [] } as never;
  const itens = [];
  for (let i = 0; i < 3; i += 1) itens.push(await service.create(ator, { title: `OS ${i}`, serviceCatalogId: catalogo }));
  chamadas = 0;
  const modos = await (service as any).describeCheckinForList(ator, itens);
  assert.equal(chamadas, 1, `o resolver foi chamado ${chamadas} vezes`);
  for (const item of itens) assert.deepEqual(modos.get(item.id), { mode: "reference_missing", plateTail: null });
});

// O contrato literal dos motivos, conferido também no teste do app (M5): a mesma lista, em string.
test("contrato — os 3 motivos de recusa do check-in, literais", async () => {
  const { CHECKIN_REFUSAL_REASONS } = await import("../src/modules/work-orders/work-order.checkin.js");
  assert.deepEqual([...CHECKIN_REFUSAL_REASONS], MOTIVOS_RECUSA);
});
