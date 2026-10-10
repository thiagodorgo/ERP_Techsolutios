import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// B-O6R-07c-a (07c-a.1/07c-a.4 do plano v3) — ESCOPO POR OBJETO NOS SUBRECURSOS DA OS.
//
// O achado (`P-O6R-SUBRECURSO-OBJECT-SCOPE`, pendencias.md): o 07a guardou a OS (PATCH, status), mas os
// SUBRECURSOS dela — anexo, comentário, tag de comentário, geocode e a km pela fila do app — passavam só por
// `WorkOrderService.get` (tenant + id). Um técnico de campo com `work_orders:update`/`:comment`/`:status` escrevia
// na OS do colega: apagava anexo, comentava, editava o comentário alheio, geocodificava, lançava km.
//
// A propriedade (P-07c, plano C.1): nenhum ator cujo único acesso à OS é por papel de campo (`field_technician`,
// `technician`, os `assigned_only` do 07a) ESCREVE em subrecurso de uma OS que não lhe cabe. "Lhe cabe" é o
// predicado do 07a, SEM MUDANÇA (`assertMutationObjectScope`: perfil OU user id do ator). Recusa: 403
// `not_assigned_to_actor` no REST; `rejected` `not_assigned_to_actor` POR AÇÃO, dentro do lote 200, no sync.
// 404 segue sendo do cross-tenant.
//
// VERMELHO-CONTROLE: no head-base (`c1cfdabe`) o G-NEG das 10 vias do 07c-a e os semânticos S-ANX, S-KM,
// S-KM-RESTART, S-COM, S-GEO e S-ORDEM ficam vermelhos; os positivos (S-MOD, S-XT, S-DUAL, S-ROLES) e as 3
// entradas do 07a ficam verdes (controle). Registro em docs/revisoes/SAN3/B-O6R-07c-a-DEV-relatorio.md.

// Os blobs do anexo vão para um diretório temporário deste arquivo, nunca para `storage/` do repositório (§C5).
// A variável é lida quando `src/config/env.ts` carrega — o que só acontece no primeiro import dinâmico abaixo.
const DIR_ANEXOS = fs.mkdtempSync(path.join(os.tmpdir(), "o6r07c-anexos-"));
process.env.CHECKLIST_STORAGE_LOCAL_DIR = DIR_ANEXOS;
after(() => fs.rmSync(DIR_ANEXOS, { recursive: true, force: true }));

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const LOTE_OS = "/api/v1/mobile/sync/work-order-actions";

// ------------------------------------------------------------------------------------------------
// LAÇO G — uma entrada por via do instantâneo de classes `OS·07a` e `OS·07c-a`, LIDAS DO INSTANTÂNEO (não
// digitadas). A requisição sai da receita genérica: parâmetros do caminho pela semente, corpo `{}`; par de lote
// com `payload: { work_order_id }`. Parâmetro sem semente FALHA — o laço nunca pula uma entrada (B3 da r2).
// ------------------------------------------------------------------------------------------------
const INSTANTANEO: Record<string, { classe: string; n: number }> = JSON.parse(
  fs.readFileSync(new URL("./fixtures/o6r07c-classificacao-vias.json", import.meta.url), "utf8"),
);
const ENTRADAS_G = Object.entries(INSTANTANEO)
  .filter(([, v]) => v.classe === "OS·07a" || v.classe === "OS·07c-a")
  .map(([chave, v]) => ({ chave, classe: v.classe }))
  .sort((a, b) => a.chave.localeCompare(b.chave));

test("laço G — o instantâneo tem entradas OS·07a e OS·07c-a para o laço (nunca vazio)", () => {
  assert.ok(ENTRADAS_G.some((e) => e.classe === "OS·07a"), "nenhuma entrada OS·07a no instantâneo");
  assert.ok(ENTRADAS_G.some((e) => e.classe === "OS·07c-a"), "nenhuma entrada OS·07c-a no instantâneo");
});

for (const entrada of ENTRADAS_G) {
  test(`laço G [${entrada.classe}] ${entrada.chave} — G-NEG 403, G-POS e G-WIDE passam`, async () => {
    await withApi(async (ctx) => {
      // G-NEG: o técnico B (mesmo papel, NÃO atribuído) é recusado com `not_assigned_to_actor`.
      const sementeNeg = await semear(ctx);
      const neg = await executarEntrada(ctx, entrada.chave, ctx.h(ctx.seed.tecnicoB, "field_technician"), sementeNeg);
      if (neg.lote) {
        assert.equal(neg.status, 200, `G-NEG ${entrada.chave}: o lote tem de responder 200 (recusa é POR AÇÃO)`);
        assert.equal(neg.acao, "rejected", `G-NEG ${entrada.chave}: ação ${neg.acao} ${neg.reason}`);
      } else {
        assert.equal(neg.status, 403, `G-NEG ${entrada.chave}: status ${neg.status} ${neg.reason}`);
      }
      assert.equal(neg.reason, "not_assigned_to_actor", `G-NEG ${entrada.chave}: reason ${neg.reason}`);

      // G-POS: o técnico A (atribuído pelo perfil) não é recusado por escopo.
      const sementePos = await semear(ctx);
      const pos = await executarEntrada(ctx, entrada.chave, ctx.h(ctx.seed.tecnicoA, "field_technician"), sementePos);
      assert.notEqual(pos.reason, "not_assigned_to_actor", `G-POS ${entrada.chave}: o atribuído foi recusado`);

      // G-WIDE: um papel `tenant_wide` que ALCANÇA a via (o manager — catalog: read, comment, create, update,
      // status) não cai no escopo. Se cair em `permission_required`, o teste não provou nada: falha.
      const sementeWide = await semear(ctx);
      const wide = await executarEntrada(ctx, entrada.chave, ctx.h(ctx.seed.managerA, "manager"), sementeWide);
      assert.notEqual(wide.reason, "permission_required", "G-WIDE vazio — escolha um papel tenant_wide que alcance a via");
      assert.notEqual(wide.reason, "not_assigned_to_actor", `G-WIDE ${entrada.chave}: o tenant_wide caiu no escopo`);
    });
  });
}

// ------------------------------------------------------------------------------------------------
// SEMÂNTICOS (07c-a.4)
// ------------------------------------------------------------------------------------------------

test("S-ANX — técnico B não apaga anexo da OS do técnico A; o anexo segue baixável", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const osA = await ctx.criarOsAtribuida(seed.perfilA.id);
    const anexo = await ctx.upload(osA, ctx.h(seed.managerA, "manager"));
    assert.equal(anexo.status, 201, JSON.stringify(anexo.body));

    const apagar = await ctx.req(`/api/v1/work-orders/${osA}/attachments/${anexo.body.data.id}`, {
      method: "DELETE",
      headers: ctx.h(seed.tecnicoB, "field_technician"),
    });
    assert.equal(apagar.status, 403, `DELETE do anexo alheio veio ${apagar.status}`);
    assert.equal(apagar.body.error.reason, "not_assigned_to_actor");

    const baixar = await fetch(`${ctx.baseUrl}/api/v1/work-orders/${osA}/attachments/${anexo.body.data.id}/download`, {
      headers: ctx.h(seed.managerA, "manager"),
    });
    assert.equal(baixar.status, 200, "o anexo sumiu depois da recusa");
    assert.deepEqual(Buffer.from(await baixar.arrayBuffer()), PNG);
  });
});

test("S-KM — técnico B não lança km na OS do técnico A pelo sync (rejected por ação, lote 200)", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const osA = await ctx.criarOsAtribuida(seed.perfilA.id);
    const r = await ctx.sync(ctx.h(seed.tecnicoB, "field_technician"), "work_order.mileage", {
      work_order_id: osA,
      mileage_start: 111111,
    });
    assert.equal(r.status, 200);
    assert.equal(r.acao, "rejected", `ação ${r.acao}`);
    assert.equal(r.reason, "not_assigned_to_actor");

    const depois = await ctx.req(`/api/v1/work-orders/${osA}`, { headers: ctx.h(seed.managerA, "manager") });
    assert.equal(depois.body.data.mileageStart ?? null, null, "a km foi gravada apesar da recusa");
  });
});

test("S-KM-RESTART — recibo antes do escopo no mesmo processo; depois de reinício, a redistribuição recusa", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const osA = await ctx.criarOsAtribuida(seed.perfilA.id);
    const acao = randomUUID();
    const headersA = ctx.h(seed.tecnicoA, "field_technician");

    const primeira = await ctx.sync(headersA, "work_order.mileage", { work_order_id: osA, mileage_start: 500 }, acao);
    assert.equal(primeira.acao, "accepted", `a km do atribuído veio ${primeira.acao} ${primeira.reason}`);

    // A OS vai para outro técnico.
    const redistribuida = await ctx.req(`/api/v1/work-orders/${osA}/assign`, {
      method: "POST",
      headers: ctx.h(seed.managerA, "manager"),
      body: { operatorId: seed.perfilB.id },
    });
    assert.equal(redistribuida.status, 200);

    // Reenvio no MESMO processo: o recibo (Map em memória) é consultado ANTES do escopo → already_applied.
    const reenvio = await ctx.sync(headersA, "work_order.mileage", { work_order_id: osA, mileage_start: 500 }, acao);
    assert.equal(reenvio.acao, "already_applied", `1º reenvio veio ${reenvio.acao} ${reenvio.reason}`);

    // Reinício do servidor (o recibo é por processo): o reenvio cai no escopo e é recusado.
    ctx.reiniciarSync();
    const aposReinicio = await ctx.sync(headersA, "work_order.mileage", { work_order_id: osA, mileage_start: 500 }, acao);
    assert.equal(aposReinicio.acao, "rejected", `2º reenvio veio ${aposReinicio.acao} ${aposReinicio.reason}`);
    assert.equal(aposReinicio.reason, "not_assigned_to_actor");

    // Nada se perdeu: o valor aplicado está no banco.
    const depois = await ctx.req(`/api/v1/work-orders/${osA}`, { headers: ctx.h(seed.managerA, "manager") });
    assert.equal(depois.body.data.mileageStart, 500);
  });
});

test("S-COM — técnico B não comenta, não edita, não apaga e não (des)taggeia na OS do técnico A", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const osA = await ctx.criarOsAtribuida(seed.perfilA.id);
    const tag = await ctx.criarTag("Urgente");
    const doA = await ctx.req(`/api/v1/work-orders/${osA}/comments`, {
      method: "POST",
      headers: ctx.h(seed.tecnicoA, "field_technician"),
      body: { message: "comentario do A" },
    });
    assert.equal(doA.status, 201, JSON.stringify(doA.body));
    const cid = doA.body.data.id as string;
    const hB = ctx.h(seed.tecnicoB, "field_technician");

    const tentativas = {
      comentar: await ctx.req(`/api/v1/work-orders/${osA}/comments`, { method: "POST", headers: hB, body: { message: "intruso" } }),
      editar: await ctx.req(`/api/v1/work-orders/${osA}/comments/${cid}`, { method: "PATCH", headers: hB, body: { message: "editado pelo B" } }),
      taggear: await ctx.req(`/api/v1/work-orders/${osA}/comments/${cid}/tags/${tag}`, { method: "POST", headers: hB }),
      destaggear: await ctx.req(`/api/v1/work-orders/${osA}/comments/${cid}/tags/${tag}`, { method: "DELETE", headers: hB }),
      apagar: await ctx.req(`/api/v1/work-orders/${osA}/comments/${cid}`, { method: "DELETE", headers: hB }),
    };
    for (const [nome, r] of Object.entries(tentativas)) {
      assert.equal(r.status, 403, `${nome} veio ${r.status}`);
      assert.equal(r.body.error.reason, "not_assigned_to_actor", `${nome}: reason ${r.body?.error?.reason}`);
    }

    const lista = await ctx.req(`/api/v1/work-orders/${osA}/comments`, { headers: ctx.h(seed.managerA, "manager") });
    assert.equal(lista.body.items.length, 1, "o B conseguiu criar ou apagar comentário");
    assert.equal(lista.body.items[0].message, "comentario do A");
    assert.deepEqual(lista.body.items[0].tags, []);
  });
});

test("S-MOD — moderação intacta: gestão edita e apaga o comentário do técnico; o atribuído edita o da gestão", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const osA = await ctx.criarOsAtribuida(seed.perfilA.id);
    const hA = ctx.h(seed.tecnicoA, "field_technician");
    const hM = ctx.h(seed.managerA, "manager");
    const doA = await ctx.req(`/api/v1/work-orders/${osA}/comments`, { method: "POST", headers: hA, body: { message: "do tecnico" } });
    const doM = await ctx.req(`/api/v1/work-orders/${osA}/comments`, { method: "POST", headers: hM, body: { message: "da gestao" } });
    assert.equal(doA.status, 201);
    assert.equal(doM.status, 201);

    const gestaoEdita = await ctx.req(`/api/v1/work-orders/${osA}/comments/${doA.body.data.id}`, { method: "PATCH", headers: hM, body: { message: "moderado" } });
    assert.equal(gestaoEdita.status, 200, `gestão editando comentário do técnico veio ${gestaoEdita.status}`);
    const tecnicoEdita = await ctx.req(`/api/v1/work-orders/${osA}/comments/${doM.body.data.id}`, { method: "PATCH", headers: hA, body: { message: "ajustado pelo atribuido" } });
    assert.equal(tecnicoEdita.status, 200, `atribuído editando comentário da gestão veio ${tecnicoEdita.status}`);
    const gestaoApaga = await ctx.req(`/api/v1/work-orders/${osA}/comments/${doA.body.data.id}`, { method: "DELETE", headers: hM });
    assert.ok(gestaoApaga.status >= 200 && gestaoApaga.status < 300, `gestão apagando comentário do técnico veio ${gestaoApaga.status}`);
  });
});

test("S-GEO — técnico B não geocodifica origem nem destino da OS do técnico A (escopo antes do 409/422)", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    // OS com coordenada (o geocode daria 409 already_geocoded) e sem endereço de destino (daria 422).
    const osA = await ctx.criarOsAtribuida(seed.perfilA.id, {
      serviceAddress: "Rua A, 1",
      serviceLatitude: -23.55,
      serviceLongitude: -46.63,
    });
    const hB = ctx.h(seed.tecnicoB, "field_technician");
    const origem = await ctx.req(`/api/v1/work-orders/${osA}/geocode`, { method: "POST", headers: hB, body: {} });
    const destino = await ctx.req(`/api/v1/work-orders/${osA}/geocode-destination`, { method: "POST", headers: hB, body: {} });
    for (const [nome, r] of Object.entries({ origem, destino })) {
      assert.equal(r.status, 403, `${nome} veio ${r.status} ${r.body?.error?.reason}`);
      assert.equal(r.body.error.reason, "not_assigned_to_actor");
    }
  });
});

test("S-ORDEM — o escopo vem antes do multipart: técnico B sem multipart recebe 403, não 400", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const osA = await ctx.criarOsAtribuida(seed.perfilA.id);
    const r = await ctx.req(`/api/v1/work-orders/${osA}/attachments`, {
      method: "POST",
      headers: ctx.h(seed.tecnicoB, "field_technician"),
      body: { nada: true },
    });
    assert.equal(r.status, 403, `veio ${r.status} ${r.body?.error?.reason}`);
    assert.equal(r.body.error.reason, "not_assigned_to_actor");
  });
});

test("S-XT — cross-tenant segue 404 em anexo, comentário e km (o 403 novo não o substituiu)", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const osA = await ctx.criarOsAtribuida(seed.perfilA.id);
    const anexo = await ctx.upload(osA, ctx.h(seed.managerA, "manager"));
    assert.equal(anexo.status, 201);
    const hX = ctx.h(seed.tecnicoB2, "field_technician", seed.tenantB);

    const subir = await ctx.upload(osA, hX);
    assert.equal(subir.status, 404, `upload cross-tenant veio ${subir.status}`);
    const apagar = await ctx.req(`/api/v1/work-orders/${osA}/attachments/${anexo.body.data.id}`, { method: "DELETE", headers: hX });
    assert.equal(apagar.status, 404, `delete de anexo cross-tenant veio ${apagar.status}`);
    const comentar = await ctx.req(`/api/v1/work-orders/${osA}/comments`, { method: "POST", headers: hX, body: { message: "de fora" } });
    assert.equal(comentar.status, 404, `comentário cross-tenant veio ${comentar.status}`);
    const km = await ctx.sync(hX, "work_order.mileage", { work_order_id: osA, mileage_start: 7 });
    assert.equal(km.acao, "rejected");
    assert.equal(km.code, "WORK_ORDER_NOT_FOUND", `km cross-tenant veio ${km.code} ${km.reason}`);
  });
});

test("S-DUAL — OS atribuída por USER ID (a forma do app): o técnico anexa, comenta e lança km", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const osU = await ctx.criarOsAtribuidaPorUserId(seed.tecnicoA.id);
    const hA = ctx.h(seed.tecnicoA, "field_technician");
    const anexo = await ctx.upload(osU, hA);
    assert.equal(anexo.status, 201, `anexo veio ${anexo.status} ${anexo.body?.error?.reason}`);
    const comentario = await ctx.req(`/api/v1/work-orders/${osU}/comments`, { method: "POST", headers: hA, body: { message: "do nomeado" } });
    assert.equal(comentario.status, 201, `comentário veio ${comentario.status}`);
    const km = await ctx.sync(hA, "work_order.mileage", { work_order_id: osU, mileage_start: 42 });
    assert.equal(km.acao, "accepted", `km veio ${km.acao} ${km.reason}`);
  });
});

test("S-ROLES — ator técnico E gestor na OS alheia: a união vence, anexo e comentário passam", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const osDoB = await ctx.criarOsAtribuida(seed.perfilB.id);
    const duplo = ctx.h(seed.tecnicoA, "field_technician,manager");
    const anexo = await ctx.upload(osDoB, duplo);
    assert.notEqual(anexo.status, 403, `anexo do papel misto veio ${anexo.status}`);
    assert.equal(anexo.status, 201);
    const comentario = await ctx.req(`/api/v1/work-orders/${osDoB}/comments`, { method: "POST", headers: duplo, body: { message: "papel misto" } });
    assert.notEqual(comentario.status, 403, `comentário do papel misto veio ${comentario.status}`);
    assert.equal(comentario.status, 201);
  });
});

// ------------------------------------------------------------------------------------------------
// ARNÊS
// ------------------------------------------------------------------------------------------------
// Usuários são UUIDs crus (o formato de produção), como no arnês do 07a: o contexto do ator vem do header.
type SeedUser = { readonly id: string };
type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: SeedUser;
  readonly tecnicoA: SeedUser;
  readonly tecnicoB: SeedUser;
  readonly tecnicoB2: SeedUser;
  readonly perfilA: { readonly id: string };
  readonly perfilB: { readonly id: string };
};
type Resposta = { readonly status: number; readonly body: any };
type Execucao = { readonly lote: boolean; readonly status: number; readonly acao?: string; readonly reason?: string; readonly code?: string };
type Ctx = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  h(user: SeedUser, role: string, tenant?: Tenant): Record<string, string>;
  req(caminho: string, opcoes?: { method?: string; headers?: Record<string, string>; body?: unknown }): Promise<Resposta>;
  upload(workOrderId: string, headers: Record<string, string>): Promise<Resposta>;
  sync(headers: Record<string, string>, tipo: string, payload: Record<string, unknown>, clientActionId?: string): Promise<Execucao>;
  criarOsAtribuida(operatorProfileId: string, extra?: Record<string, unknown>): Promise<string>;
  criarOsAtribuidaPorUserId(userId: string): Promise<string>;
  criarTag(nome: string): Promise<string>;
  reiniciarSync(): void;
};

// A semente do laço G: OS atribuída ao PERFIL do técnico A, com um anexo, um comentário do técnico A e uma tag.
async function semear(ctx: Ctx): Promise<Record<string, string>> {
  const workOrderId = await ctx.criarOsAtribuida(ctx.seed.perfilA.id);
  const anexo = await ctx.upload(workOrderId, ctx.h(ctx.seed.managerA, "manager"));
  assert.equal(anexo.status, 201, `semente: anexo ${JSON.stringify(anexo.body)}`);
  const comentario = await ctx.req(`/api/v1/work-orders/${workOrderId}/comments`, {
    method: "POST",
    headers: ctx.h(ctx.seed.tecnicoA, "field_technician"),
    body: { message: "semente" },
  });
  assert.equal(comentario.status, 201, `semente: comentário ${JSON.stringify(comentario.body)}`);
  const tagId = await ctx.criarTag(`Semente ${randomUUID().slice(0, 8)}`);
  return { workOrderId, attachmentId: anexo.body.data.id, commentId: comentario.body.data.id, tagId };
}

async function executarEntrada(ctx: Ctx, chave: string, headers: Record<string, string>, semente: Record<string, string>): Promise<Execucao> {
  if (chave.startsWith("ROTA ")) {
    const [, metodo, caminho] = chave.split(" ");
    const url = caminho.replace(/:([A-Za-z0-9_]+)/g, (_, nome: string) => {
      const valor = semente[nome];
      if (!valor) throw new Error(`laço G: parâmetro :${nome} sem semente em "${chave}" — o laço nunca pula uma entrada`);
      return valor;
    });
    const r = await ctx.req(url, { method: metodo, headers, body: {} });
    return { lote: false, status: r.status, reason: r.body?.error?.reason, code: r.body?.error?.code };
  }
  if (chave.startsWith("PAR ")) {
    const [lote, tipo] = chave.slice("PAR ".length).split(" · ");
    if (lote !== LOTE_OS) throw new Error(`laço G: lote sem receita em "${chave}" — o laço nunca pula uma entrada`);
    return ctx.sync(headers, tipo, { work_order_id: semente.workOrderId });
  }
  throw new Error(`laço G: chave sem receita "${chave}" — o laço nunca pula uma entrada`);
}

async function withApi(callback: (ctx: Ctx) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    workOrderModule,
    operatorProfileModule,
    approvalModule,
    notificationModule,
    attachmentModule,
    commentModule,
    tagAssignmentModule,
    tagModule,
    syncModule,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/operator-profiles/operator-profile.service.js"),
    import("../src/modules/work-orders/approval.service.js"),
    import("../src/modules/notifications/notification.service.js"),
    import("../src/modules/work-orders/work-order-attachment.service.js"),
    import("../src/modules/work-order-comments/work-order-comment.service.js"),
    import("../src/modules/tag-assignments/index.js"),
    import("../src/modules/tags/tag.service.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  const resetAll = () => {
    workOrderModule.resetWorkOrderRuntimeForTests();
    operatorProfileModule.resetOperatorProfileRuntimeForTests();
    approvalModule.resetApprovalRuntimeForTests();
    notificationModule.resetNotificationRuntimeForTests();
    attachmentModule.resetWorkOrderAttachmentRuntimeForTests();
    commentModule.resetWorkOrderCommentRuntimeForTests();
    tagAssignmentModule.resetTagAssignmentRuntimeForTests();
    tagModule.resetTagRuntimeForTests();
    syncModule.resetMobileWorkOrderSyncRuntimeForTests();
  };
  resetAll();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "O6R07c Scope A", modules: ["work_orders"] });
  const tenantB = core.createTenant({ name: "O6R07c Scope B", modules: ["work_orders"] });
  const managerA: SeedUser = { id: randomUUID() };
  const tecnicoA: SeedUser = { id: randomUUID() };
  const tecnicoB: SeedUser = { id: randomUUID() };
  const tecnicoB2: SeedUser = { id: randomUUID() };
  const profileService = await operatorProfileModule.createDefaultOperatorProfileService();
  const actorAdmin = { tenantId: tenantA.id, userId: managerA.id, roles: ["tenant_admin"], permissions: [] } as never;
  const perfilA = await profileService.create(actorAdmin, { user_id: tecnicoA.id, full_name: "Tecnico A" });
  const perfilB = await profileService.create(actorAdmin, { user_id: tecnicoB.id, full_name: "Tecnico B" });
  const seed: SeedData = { tenantA, tenantB, managerA, tecnicoA, tecnicoB, tecnicoB2, perfilA, perfilB };

  const tagService = tagModule.createMemoryTagService();
  const tagActor = { tenantId: tenantA.id, userId: managerA.id, roles: ["manager"], permissions: ["tags:read", "tags:create"] } as never;

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  const h = (user: SeedUser, role: string, tenant: Tenant = tenantA) => ({ "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role });
  const req = async (caminho: string, opcoes: { method?: string; headers?: Record<string, string>; body?: unknown } = {}): Promise<Resposta> => {
    const response = await fetch(`${baseUrl}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: { "content-type": "application/json", ...opcoes.headers },
      body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const upload = async (workOrderId: string, headers: Record<string, string>): Promise<Resposta> => {
    const form = new FormData();
    form.set("file", new Blob([PNG], { type: "image/png" }), "foto.png");
    const response = await fetch(`${baseUrl}/api/v1/work-orders/${workOrderId}/attachments`, { method: "POST", headers, body: form });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const sync = async (headers: Record<string, string>, tipo: string, payload: Record<string, unknown>, clientActionId = randomUUID()): Promise<Execucao> => {
    const r = await req(LOTE_OS, {
      method: "POST",
      headers,
      body: { client_batch_id: randomUUID(), actions: [{ client_action_id: clientActionId, type: tipo, payload }] },
    });
    const data = r.body?.data ?? {};
    const todas = [...(data.accepted ?? []), ...(data.rejected ?? []), ...(data.conflicts ?? []), ...(data.already_applied ?? [])];
    const acao = todas.find((a: any) => a.client_action_id === clientActionId);
    return { lote: true, status: r.status, acao: acao?.status, reason: acao?.error?.reason ?? r.body?.error?.reason, code: acao?.error?.code ?? r.body?.error?.code };
  };
  const criarOs = async (extra: Record<string, unknown> = {}): Promise<string> => {
    const criada = await req("/api/v1/work-orders", { method: "POST", headers: h(managerA, "manager"), body: { title: "OS 07c", ...extra } });
    assert.equal(criada.status, 201, `criação de OS falhou: ${JSON.stringify(criada.body)}`);
    return criada.body.data.id as string;
  };
  const ctx: Ctx = {
    baseUrl,
    seed,
    h,
    req,
    upload,
    sync,
    async criarOsAtribuida(operatorProfileId, extra = {}) {
      const id = await criarOs(extra);
      const r = await req(`/api/v1/work-orders/${id}/assign`, { method: "POST", headers: h(managerA, "manager"), body: { operatorId: operatorProfileId } });
      assert.equal(r.status, 200, `atribuição falhou: ${JSON.stringify(r.body)}`);
      return id;
    },
    async criarOsAtribuidaPorUserId(userId) {
      const id = await criarOs();
      const r = await req(`/api/v1/work-orders/${id}/assign`, { method: "POST", headers: h(managerA, "manager"), body: { userId } });
      assert.equal(r.status, 200, `atribuição por user id falhou: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.data.assignedOperatorId, userId);
      return id;
    },
    async criarTag(nome) {
      const tag = await tagService.create(tagActor, { name: nome });
      return tag.id as string;
    },
    reiniciarSync() {
      syncModule.resetMobileWorkOrderSyncRuntimeForTests();
    },
  };

  try {
    await callback(ctx);
  } finally {
    await closeServer(server);
    resetAll();
  }
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
