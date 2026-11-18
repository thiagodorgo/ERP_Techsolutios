import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import {
  CANARIOS,
  CLASSE_AGREGADO,
  CLASSE_LISTA,
  CLASSE_OS,
  CLASSES_DO_BLOCO,
  cabecalhosDeMemoria,
  criarHttp,
  cumpreMarcador,
  lerInstantaneoLeitura,
  mesmoModuloEco,
  nomesDeParametro,
  R_ROTAS,
  semear,
  urlNatural,
  type Http,
  type Resp,
  type Semente,
} from "./helpers/wo-leitura-census.js";

// B-WO-LEITURA-TECNICO (item 71 do portão; `P-WO-LEITURAS-TENANT-WIDE-TECNICO`) — O TÉCNICO DE CAMPO SÓ LÊ O QUE É DELE.
//
// A regra (plano §3, Emenda 1 §1): quem alcança a OS só por papel de campo (`actorReadsAssignedOnly`: todo papel do ator é
// `assigned_only` — presença: pelo menos um papel de campo e nenhum `tenant_wide`) lê só a OS cuja atribuição casa com ele
// (`matchesAssignedToActor`, o casamento duplo do 07a e da lista do B-SAN3-13). A OS alheia responde EXATAMENTE o que a
// rota dá a um id inexistente; a lista filtra no servidor; o painel conta só as OS dele.
//
// O LAÇO L é lido do instantâneo (`tests/fixtures/wo-leitura-classificacao.json`, nunca digitado): uma entrada por rota
// das 3 classes do bloco, com o `marcador` positivo dela. O nome de cada subteste é `<CASO> · <papel> · R<n>` (Emenda 2
// §3.1), para que o conjunto de `not ok` do TAP se compare com o declarado nas mutações.
//
// Em memória o id do usuário do core é `usr_…`, não UUID: o despacho atribui a OS pelo USER ID (a forma do app). O ramo do
// PERFIL é exercido no nível do serviço (L-POS-PERFIL, abaixo) e na `-db` (usuários UUID, perfis reais).
//
// VERMELHO-CONTROLE (plano §5.5): sobre o `src/` da base do ramo (`60c0704a`), o L-NEG, o L-EX, o S-W1, o S-W3, o S-W6 e o
// S-W7 ficam vermelhos; L-POS, L-WIDE, L-UNIAO, L-XT, S-W2, S-W4, S-W5 e S-W8 ficam verdes. A lista exata, com N, está no
// diário do dev (`erp-pausa-2026-10-03/revisoes/wo-leitura/dev-wo-leitura-cl.md`, F0).

const DIR_ANEXOS = fs.mkdtempSync(path.join(os.tmpdir(), "wo-leitura-anexos-"));
process.env.CHECKLIST_STORAGE_LOCAL_DIR = DIR_ANEXOS;
after(() => fs.rmSync(DIR_ANEXOS, { recursive: true, force: true }));

const INSTANTANEO = lerInstantaneoLeitura();
type Entrada = { readonly r: string; readonly chave: string; readonly query: string; readonly classe: string; readonly marcador: string };
const ENTRADAS: Entrada[] = R_ROTAS.filter((x) => CLASSES_DO_BLOCO.includes(INSTANTANEO[x.chave]?.classe ?? "")).map((x) => ({
  ...x,
  classe: INSTANTANEO[x.chave].classe,
  marcador: INSTANTANEO[x.chave].marcador ?? "",
}));
const DESPACHO = new Set(["R13", "R14", "R15"]);

type Papel = { readonly nome: string; readonly roles: string };
const FT: Papel = { nome: "ft", roles: "field_technician" };
const TEC: Papel = { nome: "tec", roles: "technician" };
const UNIOES: Papel[] = [
  ...["viewer", "finance", "inventory", "auditor", "support"].flatMap((g) => [
    { nome: `${g}+ft`, roles: `${g},field_technician` },
    { nome: `${g}+tec`, roles: `${g},technician` },
  ]),
  { nome: "manager+tec", roles: "manager,technician" },
];

let permissoesDe: (roles: readonly string[]) => readonly string[] = () => [];
/** O papel alcança a rota? As de despacho exigem `field_dispatch:read` (o `technician` não tem); as outras, as do campo. */
const alcanca = (p: Papel, e: Entrada) => !DESPACHO.has(e.r) || permissoesDe(p.roles.split(",")).includes("field_dispatch:read");

test("laço L — o instantâneo tem entradas nas 3 classes do bloco, e toda entrada delas tem número R", () => {
  for (const classe of CLASSES_DO_BLOCO) assert.ok(ENTRADAS.some((e) => e.classe === classe), `nenhuma entrada ${classe} no laço`);
  const semNumero = Object.entries(INSTANTANEO)
    .filter(([k, v]) => CLASSES_DO_BLOCO.includes(v.classe) && !R_ROTAS.some((x) => x.chave === k))
    .map(([k]) => k);
  assert.deepEqual(semNumero, [], "entrada do bloco sem número R (a Emenda 2 §3.1 numera as 18)");
});

// ------------------------------------------------------------------------------------------------
// O arnês — app real em memória, usuários REAIS do core, a semente da Emenda 2 §2.2.
// ------------------------------------------------------------------------------------------------
type Ctx = {
  readonly http: Http;
  readonly h: ReturnType<typeof cabecalhosDeMemoria>;
  readonly hXt: ReturnType<typeof cabecalhosDeMemoria>;
  readonly s: Semente;
  readonly u: { gestor: string; M: string; A: string; B: string; XT: string };
  readonly osB: string;
  readonly baseUrl: string;
  readonly tenantId: string;
};

async function withApi(callback: (ctx: Ctx) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ createApp }, wo, ck, fd, ap, nt, ax, cm, fi, al, sy, op, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }, cat] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/work-orders/work-order.service.js"),
      import("../src/modules/checklists/checklist.service.js"),
      import("../src/modules/field-dispatch/field-dispatch.service.js"),
      import("../src/modules/work-orders/approval.service.js"),
      import("../src/modules/notifications/notification.service.js"),
      import("../src/modules/work-orders/work-order-attachment.service.js"),
      import("../src/modules/work-order-comments/work-order-comment.service.js"),
      import("../src/modules/work-order-financials/work-order-financial.service.js"),
      import("../src/modules/work-order-audit-logs/work-order-audit-log.service.js"),
      import("../src/modules/mobile/mobile-work-order-sync.js"),
      import("../src/modules/operator-profiles/operator-profile.service.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
      import("../src/modules/core-saas/permissions/catalog.js"),
    ]);
  permissoesDe = (roles) => cat.resolvePermissionsForRoles(roles as never);
  const resetAll = () => {
    wo.resetWorkOrderRuntimeForTests();
    ck.resetChecklistRuntimeForTests();
    fd.resetFieldDispatchRuntimeForTests();
    ap.resetApprovalRuntimeForTests();
    nt.resetNotificationRuntimeForTests();
    ax.resetWorkOrderAttachmentRuntimeForTests();
    cm.resetWorkOrderCommentRuntimeForTests();
    fi.resetWorkOrderFinancialRuntimeForTests();
    al.resetWorkOrderAuditLogRuntimeForTests();
    sy.resetMobileWorkOrderSyncRuntimeForTests();
    op.resetOperatorProfileRuntimeForTests();
  };
  resetAll();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const modules = ["work_orders", "field_operations", "tenant_checklist", "checklists"];
  const t = core.createTenant({ name: "WO leitura", modules });
  const t2 = core.createTenant({ name: "WO leitura outra", modules });
  const sufixo = randomUUID().slice(0, 8);
  const novo = (tenantId: string, nome: string, roles: string[]) =>
    core.createUser({ tenantId, name: nome, email: `wol-${nome}-${sufixo}@example.com`, roles }).id as string;
  const u = {
    gestor: novo(t.id, "gestor", ["tenant_admin"]),
    M: novo(t.id, "manager", ["manager"]),
    A: novo(t.id, "tec-a", ["field_technician", "technician"]),
    B: novo(t.id, "tec-b", ["field_technician", "technician"]),
    XT: novo(t2.id, "tec-xt", ["field_technician", "technician"]),
  };
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", () => r()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const http = criarHttp(baseUrl);
  const h = cabecalhosDeMemoria(t.id);
  const hXt = cabecalhosDeMemoria(t2.id);
  try {
    const s = await semear(http, h, { gestor: u.gestor, A: u.A, B: u.B, C: u.B });
    // A OS de B (a contagem do painel de B é 1 onde a organização tem 2).
    const osB = (await http("POST", "/api/v1/work-orders", h(u.gestor, "tenant_admin"), { title: "OS de B" })).j.data.id as string;
    // Em memória o id do core não é UUID, e o `assign` exige UUID: a OS de B chega a ele pelo despacho (que atribui pelo user id).
    const atrib = await http("POST", "/api/v1/operations/dispatches", h(u.gestor, "tenant_admin"), { workOrderId: osB, operatorUserId: u.B });
    assert.equal(atrib.s, 201, `semente: despacho da OS de B ${atrib.text}`);
    await callback({ http, h, hXt, s, u, osB, baseUrl, tenantId: t.id });
  } finally {
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
    resetAll();
  }
}

const aleatoria = (chave: string, query: string, s: Semente) => {
  const caminho = chave.slice(chave.indexOf(" ") + 1);
  const R = randomUUID();
  let i = 0;
  const ids = nomesDeParametro(caminho).map(() => randomUUID());
  return caminho.replace(/:([A-Za-z0-9_]+)/g, () => ids[i++]) + query.replaceAll("{X}", R).replaceAll("{T}", s.checklistId);
};
const temDadoDaOsX = (r: Resp, s: Semente) =>
  CANARIOS.some((c) => r.text.includes(c)) || [s.osX, s.runX, s.dispA, s.aprA].some((id) => r.text.includes(id)) || r.text.includes(s.codeX);

/** A leitura negada: OS ≡ inexistente; lista sem a OS-X e com o filtro ≡ aleatório (módulo o eco); painel sem a OS-X. */
async function assertNegado(ctx: Ctx, e: Entrada, H: Record<string, string>, contagemEsperada: number | undefined, rotulo: string): Promise<void> {
  const { http, s } = ctx;
  const method = e.chave.slice(0, e.chave.indexOf(" "));
  const url = urlNatural(e.chave, e.query, s)!;
  const r = await http(method, url, H);
  if (e.classe === CLASSE_OS) {
    const rAle = await http(method, aleatoria(e.chave, "", s), H);
    assert.equal(r.k, rAle.k, `${rotulo}: a OS-X responde ${r.k}, o inexistente ${rAle.k}`);
    return;
  }
  assert.ok(r.s >= 200 && r.s < 300, `${rotulo}: a lista/painel respondeu ${r.k}`);
  if (e.classe === CLASSE_LISTA) {
    if (e.query.includes("{X}")) {
      const R = randomUUID();
      const rR = await http(method, urlNatural(e.chave, e.query, { ...s, osX: R })!, H);
      assert.equal(r.k, rR.k, `${rotulo}: filtro da OS-X ${r.k} × aleatório ${rR.k}`);
      assert.ok(mesmoModuloEco(r, rR, s.osX, R), `${rotulo}: o filtro da OS-X responde diferente do aleatório`);
    } else {
      assert.equal(temDadoDaOsX(r, s), false, `${rotulo}: a lista trouxe a OS-X ${r.text.slice(0, 300)}`);
      const R = randomUUID();
      const fX = await http(method, `${url}?workOrderId=${s.osX}`, H);
      const fR = await http(method, `${url}?workOrderId=${R}`, H);
      assert.equal(fX.k, fR.k, `${rotulo}: ?workOrderId da OS-X ${fX.k} × aleatório ${fR.k}`);
      assert.ok(mesmoModuloEco(fX, fR, s.osX, R), `${rotulo}: ?workOrderId da OS-X responde diferente do aleatório`);
    }
    return;
  }
  // AGREGADO — o painel.
  assert.equal(temDadoDaOsX(r, s), false, `${rotulo}: o painel trouxe a OS-X ${r.text.slice(0, 300)}`);
  if (contagemEsperada !== undefined) assert.equal(r.j?.data?.workOrders?.total, contagemEsperada, `${rotulo}: contagem de OS`);
}

async function assertLe(ctx: Ctx, e: Entrada, H: Record<string, string>, rotulo: string): Promise<void> {
  const { http, s, h, u } = ctx;
  const method = e.chave.slice(0, e.chave.indexOf(" "));
  const url = urlNatural(e.chave, e.query, s)!;
  const r = await http(method, url, H);
  assert.notEqual(r.j?.error?.reason, "permission_required", `${rotulo}: caiu em permission_required — não provou nada`);
  const g = await http(method, url, h(u.gestor, "tenant_admin"));
  assert.ok(cumpreMarcador(e.marcador, r, s, g), `${rotulo}: ${r.k} não cumpre ${e.marcador} — ${r.text.slice(0, 200)}`);
  if (e.r === "R18") assert.ok((r.j?.data?.workOrders?.total ?? 0) >= 1, `${rotulo}: o painel não conta a OS-X`);
}

// ------------------------------------------------------------------------------------------------
// O laço.
// ------------------------------------------------------------------------------------------------
test("L-POS — A, o atribuído, lê a OS-X em toda rota do bloco, nos dois papéis de campo", async (t) => {
  await withApi(async (ctx) => {
    for (const p of [FT, TEC]) for (const e of ENTRADAS) {
      if (!alcanca(p, e)) continue;
      await t.test(`L-POS · ${p.nome} · ${e.r}`, () => assertLe(ctx, e, ctx.h(ctx.u.A, p.roles), `L-POS ${p.nome} ${e.r}`));
    }
  });
});

test("L-NEG — B, do mesmo papel e não atribuído, recebe a resposta do inexistente (OS), a lista sem a OS-X, o painel só dele", async (t) => {
  await withApi(async (ctx) => {
    for (const p of [FT, TEC]) for (const e of ENTRADAS) {
      if (!alcanca(p, e)) continue;
      await t.test(`L-NEG · ${p.nome} · ${e.r}`, () => assertNegado(ctx, e, ctx.h(ctx.u.B, p.roles), 1, `L-NEG ${p.nome} ${e.r}`));
    }
  });
});

test("L-WIDE — o manager (organização inteira) lê a OS-X em toda rota do bloco", async (t) => {
  await withApi(async (ctx) => {
    for (const e of ENTRADAS) await t.test(`L-WIDE · manager · ${e.r}`, () => assertLe(ctx, e, ctx.h(ctx.u.M, "manager"), `L-WIDE ${e.r}`));
  });
});

test("L-UNIAO — quem acumula um papel de organização inteira com o de campo lê a OS-X (regra de presença)", async (t) => {
  await withApi(async (ctx) => {
    for (const p of UNIOES) for (const e of ENTRADAS) {
      if (!alcanca(p, e)) continue;
      await t.test(`L-UNIAO · ${p.nome} · ${e.r}`, () => assertLe(ctx, e, ctx.h(ctx.u.B, p.roles), `L-UNIAO ${p.nome} ${e.r}`));
    }
  });
});

test("L-XT — a outra organização recebe o mesmo de hoje (o inexistente; a lista sem a OS-X)", async (t) => {
  await withApi(async (ctx) => {
    for (const p of [FT, TEC]) for (const e of ENTRADAS) {
      if (!alcanca(p, e) || e.classe === CLASSE_AGREGADO) continue;
      await t.test(`L-XT · ${p.nome} · ${e.r}`, async () => {
        const H = ctx.hXt(ctx.u.XT, p.roles);
        const method = e.chave.slice(0, e.chave.indexOf(" "));
        const r = await ctx.http(method, urlNatural(e.chave, e.query, ctx.s)!, H);
        if (e.classe === CLASSE_OS) {
          const rAle = await ctx.http(method, aleatoria(e.chave, "", ctx.s), H);
          assert.equal(r.k, rAle.k, `L-XT ${p.nome} ${e.r}: ${r.k} × ${rAle.k}`);
        } else {
          assert.equal(temDadoDaOsX(r, ctx.s), false, `L-XT ${p.nome} ${e.r}: a outra organização viu a OS-X`);
        }
      });
    }
  });
});

test("L-EX — A, depois do re-despacho da OS-X para B, recebe o que o inexistente recebe (D-WO-LEITURA-EX-TECNICO)", async (t) => {
  await withApi(async (ctx) => {
    const re = await ctx.http("POST", "/api/v1/operations/dispatches", ctx.h(ctx.u.gestor, "tenant_admin"), { workOrderId: ctx.s.osX, operatorUserId: ctx.u.B });
    assert.equal(re.s, 201, `re-despacho para B: ${re.text}`);
    for (const p of [FT, TEC]) for (const e of ENTRADAS) {
      if (!alcanca(p, e)) continue;
      await t.test(`L-EX · ${p.nome} · ${e.r}`, () => assertNegado(ctx, e, ctx.h(ctx.u.A, p.roles), 0, `L-EX ${p.nome} ${e.r}`));
    }
  });
});

test("L-EX-CONTROLE — depois do re-despacho, B (o técnico atual) lê o despacho novo e a OS-X", async () => {
  await withApi(async (ctx) => {
    const re = await ctx.http("POST", "/api/v1/operations/dispatches", ctx.h(ctx.u.gestor, "tenant_admin"), { workOrderId: ctx.s.osX, operatorUserId: ctx.u.B });
    assert.equal(re.s, 201, re.text);
    const disp = await ctx.http("GET", `/api/v1/operations/dispatches/${re.j.data.id}`, ctx.h(ctx.u.B, "field_technician"));
    assert.equal(disp.s, 200, disp.text);
    const osx = await ctx.http("GET", `/api/v1/work-orders/${ctx.s.osX}`, ctx.h(ctx.u.B, "field_technician"));
    assert.equal(osx.s, 200, osx.text);
    assert.ok(osx.text.includes("TITCANX"));
  });
});

test("o technician não alcança as 3 de despacho (sem field_dispatch:read): 403 permission_required", async () => {
  await withApi(async (ctx) => {
    for (const e of ENTRADAS.filter((x) => DESPACHO.has(x.r))) {
      const method = e.chave.slice(0, e.chave.indexOf(" "));
      const r = await ctx.http(method, urlNatural(e.chave, e.query, ctx.s)!, ctx.h(ctx.u.A, "technician"));
      assert.equal(r.s, 403, `${e.r}: ${r.k}`);
    }
  });
});

// ------------------------------------------------------------------------------------------------
// L-POS-PERFIL — o ramo do PERFIL, no nível do serviço (em memória o usuário do core não é UUID e não tem perfil).
// ------------------------------------------------------------------------------------------------
test("L-POS-PERFIL — a OS atribuída pelo PERFIL e a atribuída pelo USER ID são do ator (o casamento duplo, no serviço)", async () => {
  const { WorkOrderService } = await import("../src/modules/work-orders/work-order.service.js");
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
  const repository = new InMemoryWorkOrderRepository();
  const tenantId = randomUUID();
  const tecnico = randomUUID();
  const perfil = randomUUID();
  const mk = (code: string, assignedOperatorId: string) =>
    repository.create({ tenantId, code, title: code, priority: "medium", status: "assigned", assignedOperatorId } as never);
  const pelaPessoa = await mk("OS-USER", tecnico);
  const peloPerfil = await mk("OS-PERFIL", perfil);
  const service = new WorkOrderService(repository, { resolveActorOperatorProfileIdStrict: async () => perfil });
  const ator = { tenantId, userId: tecnico, roles: ["field_technician"], permissions: [] } as never;
  const porta = (service as unknown as { getForRead?: (a: unknown, id: string) => Promise<{ id: string }> }).getForRead;
  assert.equal(typeof porta, "function", "a porta de leitura `getForRead` não existe");
  // Só o controle POSITIVO: a negação (a OS alheia ≡ o inexistente) é do L-NEG, rota a rota.
  assert.equal((await porta!.call(service, ator, pelaPessoa.id)).id, pelaPessoa.id);
  assert.equal((await porta!.call(service, ator, peloPerfil.id)).id, peloPerfil.id);
});

// ------------------------------------------------------------------------------------------------
// SEMÂNTICOS
// ------------------------------------------------------------------------------------------------
test("S-W1 — a cadeia da crítica está fechada: a lista de despachos de B não traz OS alheia, e o detalhe alheio é o inexistente", async () => {
  await withApi(async (ctx) => {
    const H = ctx.h(ctx.u.B, "field_technician");
    const lista = await ctx.http("GET", "/api/v1/operations/dispatches", H);
    assert.equal(lista.s, 200, lista.text);
    const ids = ((lista.j?.data?.items ?? lista.j?.data ?? []) as Array<{ workOrderId: string }>).map((d) => d.workOrderId);
    assert.deepEqual(ids.filter((id) => id !== ctx.osB), [], "a lista de despachos de B trouxe OS que não é dele");
    for (const [rota, alheia] of [
      ["/api/v1/work-orders/", ctx.s.osX],
      ["/api/v1/operations/dispatches/", ctx.s.dispA],
    ] as const) {
      const r = await ctx.http("GET", rota + alheia, H);
      const rAle = await ctx.http("GET", rota + randomUUID(), H);
      assert.equal(r.k, rAle.k, `S-W1 ${rota}: ${r.k} × ${rAle.k}`);
    }
  });
});

test("S-W2 — a escrita segue 403 not_assigned_to_actor (D-WO-LEITURA-404-ESCRITA-403; regressão do 07a)", async () => {
  await withApi(async (ctx) => {
    const r = await ctx.http("PATCH", `/api/v1/work-orders/${ctx.s.osX}`, ctx.h(ctx.u.B, "field_technician"), { title: "alheia" });
    assert.equal(r.k, "403:WORK_ORDER_NOT_ASSIGNED:not_assigned_to_actor");
  });
});

test("S-W3 — resolvedor de perfil lançando: toda leitura por objeto (R2–R18) dá 503 scope_resolution_failed, para a OS-X e para o aleatório", async (t) => {
  const wo = await import("../src/modules/work-orders/work-order.service.js");
  const { InMemoryWorkOrderRepository } = await import("../src/modules/work-orders/work-order.repository.js");
  const ck = await import("../src/modules/checklists/checklist.service.js");
  const { InMemoryChecklistRepository } = await import("../src/modules/checklists/checklist.repository.js");
  const fdm = await import("../src/modules/field-dispatch/field-dispatch.service.js");
  const { InMemoryFieldDispatchRepository } = await import("../src/modules/field-dispatch/field-dispatch.repository.js");
  const apm = (await import("../src/modules/work-orders/approval.service.js")) as Record<string, any>;
  const { getMemoryApprovalRepository } = await import("../src/modules/work-orders/approval.repository.js");
  const dbm = (await import("../src/modules/dashboard/dashboard.service.js")) as Record<string, any>;
  const { InMemoryDashboardRepository } = await import("../src/modules/dashboard/dashboard.repository.js");
  const ax = await import("../src/modules/work-orders/work-order-attachment.service.js");
  const cm = await import("../src/modules/work-order-comments/work-order-comment.service.js");
  const fi = await import("../src/modules/work-order-financials/work-order-financial.service.js");
  const al = await import("../src/modules/work-order-audit-logs/work-order-audit-log.service.js");
  const { InMemoryWorkOrderAttachmentRepository } = await import("../src/modules/work-orders/work-order-attachment.repository.js");
  const { InMemoryWorkOrderCommentRepository } = await import("../src/modules/work-order-comments/work-order-comment.repository.js");
  const { InMemoryWorkOrderAuditLogRepository } = await import("../src/modules/work-order-audit-logs/work-order-audit-log.repository.js");
  const { createMemoryTagAssignmentService } = await import("../src/modules/tag-assignments/tag-assignment.service.js");

  const repository = new InMemoryWorkOrderRepository();
  const tenantId = randomUUID();
  const tecnicoA = randomUUID();
  const osX = await repository.create({ tenantId, code: "OS-SW3", title: "SW3", priority: "medium", status: "assigned", assignedOperatorId: tecnicoA } as never);
  const service = new wo.WorkOrderService(repository, {
    resolveActorOperatorProfileIdStrict: async () => {
      throw new Error("leitura de perfil caiu");
    },
  });
  const checklist = new ck.ChecklistService(new InMemoryChecklistRepository(), async () => service);
  const despacho = new fdm.FieldDispatchService(new InMemoryFieldDispatchRepository(), service, {} as never, undefined, undefined, undefined, {} as never, (async () => false) as never);
  const aprovacao = new apm.ApprovalService(getMemoryApprovalRepository(), undefined, apm.createWorkOrderReadScope?.(service));
  const painel = new dbm.DashboardService(new InMemoryDashboardRepository(), (a: unknown) => (service as any).readScopeFor(a));
  const anexos = new ax.WorkOrderAttachmentService(new InMemoryWorkOrderAttachmentRepository(), service);
  const comentarios = new cm.WorkOrderCommentService(new InMemoryWorkOrderCommentRepository(), service, createMemoryTagAssignmentService());
  const financeiro = new fi.WorkOrderFinancialService({ listByWorkOrder: async () => [] } as never, service, (async () => null) as never);
  const auditoria = new al.WorkOrderAuditLogService(new InMemoryWorkOrderAuditLogRepository(), service);

  const leituras: Array<[string, (id: string) => Promise<unknown>]> = [
    ["R2", (id) => service.getWithLinks(ator(), id)],
    ["R3", (id) => service.timeline(ator(), id)],
    ["R4", (id) => anexos.listAttachments(ator(), id)],
    ["R5", (id) => anexos.getAttachmentDownload(ator(), id, randomUUID())],
    ["R6", (id) => service.listMapStartPoints(ator(), id)],
    ["R7", (id) => financeiro.list(ator(), id)],
    ["R8", (id) => comentarios.listComments(ator(), id)],
    ["R9", (id) => auditoria.listWorkOrderAuditLogs(ator(), id)],
    ["R10a", (id) => (checklist as any).listRunsForWorkOrderForRead(ator(), id)],
    ["R10b", (id) => (checklist as any).listRunsForWorkOrderForRead(ator(), id, randomUUID(), { roleAware: true })],
    ["R11", (id) => checklist.getComparison(ator(), id)],
    ["R12", (id) => checklist.getAttachmentDownload(ator(), id, randomUUID())],
    ["R13", (id) => despacho.list(ator(), { workOrderId: id })],
    ["R14", (id) => (despacho as any).getForRead(ator(), id)],
    ["R15", (id) => (despacho as any).getForRead(ator(), id)],
    ["R16", (id) => aprovacao.listPending(ator(), { workOrderId: id })],
    ["R17", (id) => aprovacao.get(ator(), id)],
    ["R18", () => painel.getSummary(ator())],
  ];
  function ator() {
    return { tenantId, userId: tecnicoA, roles: ["field_technician"], permissions: [] } as never;
  }
  for (const [r, ler] of leituras) {
    await t.test(`S-W3 · ft · ${r}`, async () => {
      for (const id of [osX.id, randomUUID()]) {
        const k = await ler(id).then(
          () => "200",
          (e: { statusCode?: number; code?: string; reason?: string; message?: string }) => `${e.statusCode}:${e.code}:${e.reason}`,
        );
        assert.equal(k, "503:WORK_ORDER_SCOPE_UNAVAILABLE:scope_resolution_failed", `${r} (${id === osX.id ? "OS-X" : "aleatório"})`);
      }
    });
  }
});

test("S-W3 (HTTP) — o 503 atravessa o conversor de erro (R2 e R17)", async () => {
  const op = await import("../src/modules/operator-profiles/operator-profile.service.js");
  const servico = await op.createDefaultOperatorProfileService();
  const proto = Object.getPrototypeOf(servico) as { findByUserId: (...a: unknown[]) => Promise<unknown> };
  const original = proto.findByUserId;
  await withApi(async (ctx) => {
    // Ator de campo com id UUID (o resolvedor só é chamado para UUID): o perfil "cai".
    const H = ctx.h(randomUUID(), "field_technician");
    proto.findByUserId = async () => {
      throw new Error("leitura de perfil caiu");
    };
    try {
      for (const url of [`/api/v1/work-orders/${ctx.s.osX}`, `/api/v1/work-orders/${randomUUID()}`, `/api/v1/approvals/${ctx.s.aprA}`, `/api/v1/approvals/${randomUUID()}`]) {
        const r = await ctx.http("GET", url, H);
        assert.equal(r.k, "503:WORK_ORDER_SCOPE_UNAVAILABLE:scope_resolution_failed", url);
      }
    } finally {
      proto.findByUserId = original;
    }
  });
});

test("S-W4 — /mobile/checklist-runs?workOrderId=<malformado> responde igual para B e para A (200 [])", async () => {
  await withApi(async (ctx) => {
    for (const q of ["?workOrderId=nao-e-uuid", "?workOrderId=nao-e-uuid&roleAware=1"]) {
      const b = await ctx.http("GET", `/api/v1/mobile/checklist-runs${q}`, ctx.h(ctx.u.B, "field_technician"));
      const a = await ctx.http("GET", `/api/v1/mobile/checklist-runs${q}`, ctx.h(ctx.u.A, "field_technician"));
      assert.equal(b.k, a.k);
      assert.equal(b.text, a.text);
      assert.equal(b.s, 200);
      assert.deepEqual(b.j?.data, []);
    }
  });
});

test("S-W5 — as leituras internas não mudaram: a lista interna de vistorias e o despacho de A seguem lendo a OS", async () => {
  await withApi(async (ctx) => {
    const ck = await import("../src/modules/checklists/checklist.service.js");
    const svc = ck.createMemoryChecklistService();
    // `listRunsForWorkOrder` é a leitura INTERNA (a trava da conclusão, `work-order.service.ts`): não passa pela porta.
    const internas = await svc.listRunsForWorkOrder({ tenantId: ctx.tenantId, userId: ctx.u.B, roles: ["field_technician"] } as never, ctx.s.osX, undefined, { roleAware: true });
    assert.ok(internas.some((r) => r.id === ctx.s.runX), "a leitura interna deixou de ver a vistoria");
    // O despacho de A lê a OS por dentro (`field-dispatch.service.ts`, `workOrderService.get`) ao transicionar.
    const r = await ctx.http("PATCH", `/api/v1/operations/dispatches/${ctx.s.dispA}/status`, ctx.h(ctx.u.A, "field_technician"), { status: "on_route" });
    assert.equal(r.s, 200, r.text);
  });
});

test("S-W6 — os mapas de leitura e de mutação são independentes: auditor+ft lê, mas a escrita dele na OS alheia segue 403", async () => {
  // Emenda 1 §1.4: o predicado de MUTAÇÃO segue escopando auditor+ft, e a escrita dele na OS alheia segue 403. A leitura
  // larga desse ator é provada pelo L-UNIAO (rota a rota), não aqui — assim a MR16 e a MR17 deixam o S-W6 verde.
  const tipos = (await import("../src/modules/work-orders/work-order.types.js")) as Record<string, any>;
  assert.equal(tipos.actorMutatesAssignedOnly({ roles: ["auditor", "field_technician"] }), true);
  await withApi(async (ctx) => {
    const r = await ctx.http("PATCH", `/api/v1/work-orders/${ctx.s.osX}`, ctx.h(ctx.u.B, "auditor,field_technician"), { title: "alheia" });
    assert.equal(r.k, "403:WORK_ORDER_NOT_ASSIGNED:not_assigned_to_actor");
  });
});

test("S-W7 — o PATCH de status do despacho antigo pelo ex-técnico segue 200 e devolve o despacho inteiro (P-DESPACHO-EX-TECNICO-MUTACAO); o GET dá 404", async () => {
  await withApi(async (ctx) => {
    const re = await ctx.http("POST", "/api/v1/operations/dispatches", ctx.h(ctx.u.gestor, "tenant_admin"), { workOrderId: ctx.s.osX, operatorUserId: ctx.u.B });
    assert.equal(re.s, 201, re.text);
    const H = ctx.h(ctx.u.A, "field_technician");
    const r = await ctx.http("PATCH", `/api/v1/operations/dispatches/${ctx.s.dispA}/status`, H, { status: "on_route", observation: "OBSCANX2" });
    assert.equal(r.s, 200, r.text);
    assert.equal(r.j.data.workOrderId, ctx.s.osX);
    assert.equal(r.j.data.observation, "OBSCANX2");
    assert.deepEqual(Object.keys(r.j.data), [
      "id", "workOrderId", "operatorUserId", "status", "observation", "acceptedAt", "onRouteAt", "arrivedAt", "inServiceAt",
      "completedAt", "cancelledAt", "failedAt", "createdBy", "updatedBy", "createdAt", "updatedAt",
    ]);
    const g = await ctx.http("GET", `/api/v1/operations/dispatches/${ctx.s.dispA}`, H);
    assert.equal(g.k, "404:FIELD_DISPATCH_NOT_FOUND:not_found");
  });
});

test("S-W8 — /mobile/checklist-runs sem workOrderId dá 422 para B e para o manager, igual (o 422 vem antes da porta)", async () => {
  await withApi(async (ctx) => {
    const b = await ctx.http("GET", "/api/v1/mobile/checklist-runs", ctx.h(ctx.u.B, "field_technician"));
    const m = await ctx.http("GET", "/api/v1/mobile/checklist-runs", ctx.h(ctx.u.M, "manager"));
    assert.equal(b.k, "422:CHECKLIST_RUN_QUERY_INVALID:work_order_id_required");
    assert.equal(m.k, b.k);
  });
});
