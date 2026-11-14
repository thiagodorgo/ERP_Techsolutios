import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-SAN3-15b (P7, itens 35 e 36 do portão) — o servidor diz ao app se a OS é de guincho ou de prestador.
//
// Plano: `plano-B-SAN3-15-v2.md` §3.3 (T-K1, igual ao v1) e a Emenda 5 (abertura) §3.3 (T-K1d) e §4. Regra da
// Pergunta 1 (a) do dono: catálogo `reboque` → `tow`; `socorro`, `residencial` e `outro` → `provider`; OS sem
// catálogo, catálogo sem tipo, tipo fora da lista ("Remoção") ou catálogo de outra organização → `unknown`
// (fail-closed: o app não abre porta especializada). O CRIT-08 (iii) da crítica da Emenda 5 pede que o detalhe
// repita os mesmos casos da lista, inclusive o de outra organização.
//
// VERMELHO-CONTROLE (F0b, `main` d2737339): o campo `serviceKind` não existe na lista nem no detalhe; cada caso
// falha pela asserção do valor (`undefined` onde o bloco exige `tow`, `provider` ou `unknown`).

type Resposta = { status: number; body: any };

type Ctx = {
  readonly tenantA: Tenant;
  readonly gestor: User;
  readonly tecnico: User;
  req(caminho: string, opcoes?: { method?: string; headers?: Record<string, string>; body?: unknown }): Promise<Resposta>;
  hGestor: Record<string, string>;
  hTecnico: Record<string, string>;
  /** Cria um catálogo na organização A (ou na B) e devolve o id. `null` = sem `service_type`. */
  catalogo(serviceType: string | null, organizacao?: "A" | "B"): Promise<string>;
  /** Cria a OS como gestor da A. */
  criarOs(corpo?: Record<string, unknown>): Promise<string>;
  /** Grava na OS da A um catálogo de outra organização, direto no repositório (a rota recusa a referência). */
  apontarCatalogoDeOutraOrganizacao(workOrderId: string, catalogoB: string): Promise<void>;
};

async function withApi(callback: (ctx: Ctx) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    workOrders,
    fieldDispatch,
    serviceCatalog,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/service-catalog/service-catalog.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  workOrders.resetWorkOrderRuntimeForTests();
  fieldDispatch.resetFieldDispatchRuntimeForTests();
  serviceCatalog.resetServiceCatalogRuntimeForTests();

  const modulos = ["work_orders", "field_operations", "tenant_checklist", "checklists", "service_catalog", "registry"];
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "BSAN315 tipo A", modules: modulos });
  const tenantB = core.createTenant({ name: "BSAN315 tipo B", modules: modulos });
  const sufixo = randomUUID().slice(0, 8);
  const usuario = (tenant: Tenant, nome: string, roles: string[]) =>
    core.createUser({ tenantId: tenant.id, name: nome, email: `${nome}-${sufixo}@bsan315.example.com`, roles: roles as never });
  const gestor = usuario(tenantA, "gestor-a", ["manager"]);
  const tecnico = usuario(tenantA, "tecnico-a", ["field_technician"]);
  const adminB = usuario(tenantB, "admin-b", ["tenant_admin"]);

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const hGestor = { "x-tenant-id": tenantA.id, "x-user-id": gestor.id, "x-role": "manager" };
  const hAdminA = { "x-tenant-id": tenantA.id, "x-user-id": gestor.id, "x-role": "tenant_admin" };
  const hAdminB = { "x-tenant-id": tenantB.id, "x-user-id": adminB.id, "x-role": "tenant_admin" };
  const hTecnico = { "x-tenant-id": tenantA.id, "x-user-id": tecnico.id, "x-role": "field_technician" };

  const req: Ctx["req"] = async (caminho, opcoes = {}) => {
    const response = await fetch(`${baseUrl}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: { "content-type": "application/json", ...opcoes.headers },
      body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  const ctx: Ctx = {
    tenantA,
    gestor,
    tecnico,
    req,
    hGestor,
    hTecnico,
    async catalogo(serviceType, organizacao = "A") {
      const corpo: Record<string, unknown> = {
        name: `Serviço ${serviceType ?? "sem tipo"} ${randomUUID().slice(0, 6)}`,
        requires_destination: false,
      };
      if (serviceType !== null) corpo.service_type = serviceType;
      const criado = await req("/api/v1/service-catalog", {
        method: "POST",
        headers: organizacao === "A" ? hAdminA : hAdminB,
        body: corpo,
      });
      assert.equal(criado.status, 201, JSON.stringify(criado.body));
      return criado.body.data.id as string;
    },
    async criarOs(corpo = {}) {
      const criada = await req("/api/v1/work-orders", {
        method: "POST",
        headers: hGestor,
        body: { title: `OS BSAN315 ${randomUUID().slice(0, 6)}`, ...corpo },
      });
      assert.equal(criada.status, 201, JSON.stringify(criada.body));
      return criada.body.data.id as string;
    },
    async apontarCatalogoDeOutraOrganizacao(workOrderId, catalogoB) {
      const repositorio = workOrders.getMemoryWorkOrderRepositoryForTests();
      const atualizada = await repositorio.update({ tenantId: tenantA.id, workOrderId, serviceCatalogId: catalogoB } as never);
      assert.ok(atualizada, "a OS da organização A não foi encontrada no repositório de memória");
      assert.equal((atualizada as { serviceCatalogId?: string }).serviceCatalogId, catalogoB);
    },
  };

  try {
    await callback(ctx);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function itensDaLista(body: any): any[] {
  return (body?.items ?? body?.data?.items ?? []) as any[];
}

type Caso = { readonly nome: string; readonly esperado: "tow" | "provider" | "unknown"; readonly id: string };

/** Uma OS por caso da regra (Pergunta 1 (a)), todas na organização A. */
async function montarCasos(ctx: Ctx): Promise<Caso[]> {
  const casos: Caso[] = [];
  casos.push({ nome: "catálogo reboque", esperado: "tow", id: await ctx.criarOs({ serviceCatalogId: await ctx.catalogo("reboque") }) });
  for (const tipo of ["socorro", "residencial", "outro"]) {
    casos.push({ nome: `catálogo ${tipo}`, esperado: "provider", id: await ctx.criarOs({ serviceCatalogId: await ctx.catalogo(tipo) }) });
  }
  casos.push({ nome: "OS sem catálogo", esperado: "unknown", id: await ctx.criarOs() });
  casos.push({ nome: "catálogo sem tipo", esperado: "unknown", id: await ctx.criarOs({ serviceCatalogId: await ctx.catalogo(null) }) });
  casos.push({ nome: 'tipo fora da lista ("Remoção")', esperado: "unknown", id: await ctx.criarOs({ serviceCatalogId: await ctx.catalogo("Remoção") }) });
  const outraOrganizacao = await ctx.criarOs();
  await ctx.apontarCatalogoDeOutraOrganizacao(outraOrganizacao, await ctx.catalogo("reboque", "B"));
  casos.push({ nome: "catálogo de outra organização (reboque na B)", esperado: "unknown", id: outraOrganizacao });
  return casos;
}

// ------------------------------------------------------------------------------------------------
// T-K1 — a lista traz `serviceKind` pela regra da Pergunta 1 (a).
// ------------------------------------------------------------------------------------------------
test("T-K1 — a lista de OS traz serviceKind: reboque → tow; socorro, residencial e outro → provider; o resto → unknown", async () => {
  await withApi(async (ctx) => {
    const casos = await montarCasos(ctx);
    const r = await ctx.req("/api/v1/work-orders?limit=100", { headers: ctx.hGestor });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const porId = new Map(itensDaLista(r.body).map((item) => [item.id, item]));
    for (const caso of casos) {
      const item = porId.get(caso.id);
      assert.ok(item, `${caso.nome}: a OS não veio na lista`);
      assert.equal(item.serviceKind, caso.esperado, `${caso.nome}: serviceKind = ${JSON.stringify(item.serviceKind)}`);
    }
    // Toda linha da lista leva a chave, com um dos três valores.
    for (const item of itensDaLista(r.body)) {
      assert.ok(["tow", "provider", "unknown"].includes(item.serviceKind), `item ${item.id}: serviceKind = ${JSON.stringify(item.serviceKind)}`);
    }
  });
});

test("T-K1 — a lista do app (scope=assigned&paginate=cursor) do técnico traz o mesmo serviceKind", async () => {
  await withApi(async (ctx) => {
    const reboque = await ctx.criarOs({ serviceCatalogId: await ctx.catalogo("reboque") });
    const residencial = await ctx.criarOs({ serviceCatalogId: await ctx.catalogo("residencial") });
    const semCatalogo = await ctx.criarOs();
    for (const workOrderId of [reboque, residencial, semCatalogo]) {
      const despacho = await ctx.req("/api/v1/operations/dispatches", {
        method: "POST",
        headers: ctx.hGestor,
        body: { workOrderId, operatorUserId: ctx.tecnico.id },
      });
      assert.equal(despacho.status, 201, JSON.stringify(despacho.body));
    }
    const r = await ctx.req("/api/v1/work-orders?scope=assigned&paginate=cursor&limit=50", { headers: ctx.hTecnico });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const porId = new Map(itensDaLista(r.body).map((item) => [item.id, item]));
    assert.deepEqual(
      [porId.get(reboque)?.serviceKind, porId.get(residencial)?.serviceKind, porId.get(semCatalogo)?.serviceKind],
      ["tow", "provider", "unknown"],
    );
  });
});

// ------------------------------------------------------------------------------------------------
// T-K1d — o detalhe da OS traz serviceKind pela MESMA regra da lista (Emenda 5, achado A1; CRIT-08 (iii)).
// ------------------------------------------------------------------------------------------------
test("T-K1d — o detalhe da OS traz serviceKind pela mesma regra da lista, nos mesmos casos (inclusive outra organização)", async () => {
  await withApi(async (ctx) => {
    const casos = await montarCasos(ctx);
    for (const caso of casos) {
      const r = await ctx.req(`/api/v1/work-orders/${caso.id}`, { headers: ctx.hGestor });
      assert.equal(r.status, 200, `${caso.nome}: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.data.serviceKind, caso.esperado, `${caso.nome}: serviceKind = ${JSON.stringify(r.body.data.serviceKind)}`);
    }
  });
});

// Emenda 5 §4: a chave só nasce na lista e no handler `get`. As outras respostas de OS (aqui, o `create` e a
// mudança de situação) não a ganham, porque o `server_state` do lote do app sai de outra serialização, que é
// PROIBIDA neste bloco, e um "unknown" ali poderia apagar o tipo no aparelho (achado A2).
test("T-K1d — a chave serviceKind não aparece no create nem na mudança de situação", async () => {
  await withApi(async (ctx) => {
    const criada = await ctx.req("/api/v1/work-orders", {
      method: "POST",
      headers: ctx.hGestor,
      body: { title: "OS BSAN315 create", serviceCatalogId: await ctx.catalogo("socorro") },
    });
    assert.equal(criada.status, 201, JSON.stringify(criada.body));
    assert.equal("serviceKind" in criada.body.data, false, "o create expôs serviceKind");
    const despacho = await ctx.req("/api/v1/operations/dispatches", {
      method: "POST",
      headers: ctx.hGestor,
      body: { workOrderId: criada.body.data.id, operatorUserId: ctx.tecnico.id },
    });
    assert.equal(despacho.status, 201, JSON.stringify(despacho.body));
    const status = await ctx.req(`/api/v1/work-orders/${criada.body.data.id}/status`, {
      method: "PATCH",
      headers: ctx.hTecnico,
      body: { status: "accepted" },
    });
    assert.equal(status.status, 200, JSON.stringify(status.body));
    assert.equal("serviceKind" in (status.body.data ?? {}), false, "a mudança de situação expôs serviceKind");
  });
});
