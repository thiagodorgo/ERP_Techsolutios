import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-DEMO-C (aceite e status do despacho no app, com envio imediato) — a ação `field_dispatch.status_change` do lote
// `POST /api/v1/mobile/sync/work-order-actions`. O app manda o status do PRÓPRIO despacho; o servidor resolve o
// despacho do ator, nunca à frente da OS, só para a frente, e com as travas do serviço de despacho.
//
// Plano: `planos/DEMO-C-plano.md` §3.3 e a Emenda E1 (R1, R4–R8, R13–R15, R17). Os critérios B1–B12 são do §5.1.
//
// VERMELHO-CONTROLE: cada teste foi executado contra o head anterior da fatia (sem o produto) e contra a mutação
// da linha dele no §5.1/E1; a tabela está no diário do dev (`agent-orchestration/omega/juntas/votos/B-DEMO-C/00-dev.md`).

const LOTE_OS = "/api/v1/mobile/sync/work-order-actions";
const TIPO = "field_dispatch.status_change";
const CONFLITO_TROCA = "assignment_changed_pending_review";

// ------------------------------------------------------------------------------------------------
// S1 — passos 1 a 3: permissão, lista fechada, porta da OS (`getForMutation`)
// ------------------------------------------------------------------------------------------------

test("B6 · lista fechada — cancelled, failed, reassigned, assigned, draft e xyz são recusados com invalid_status, sem efeito", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoA);
    await ctx.osAceita(s, seed.tecnicoA);
    const antes = await ctx.despacho(s.dispatchId);
    const hA = ctx.h(seed.tecnicoA, "field_technician");

    for (const status of ["cancelled", "failed", "reassigned", "assigned", "draft", "xyz"]) {
      const r = await ctx.acao(hA, TIPO, { work_order_id: s.workOrderId, status });
      assert.equal(r.status, "rejected", `${status}: ${r.status} ${r.error?.reason}`);
      assert.equal(r.error?.reason, "invalid_status", `${status}: reason ${r.error?.reason}`);
    }
    // Status ausente ou de outro tipo também.
    for (const status of [undefined, 3, null]) {
      const r = await ctx.acao(hA, TIPO, { work_order_id: s.workOrderId, status });
      assert.equal(r.error?.reason, "invalid_status", `${String(status)}: reason ${r.error?.reason}`);
    }

    const depois = await ctx.despacho(s.dispatchId);
    assert.equal(depois.status, "assigned");
    assert.equal(depois.failedAt, null, "a lista fechada deixou gravar failed_at");
    assert.equal(depois.cancelledAt, null);
    assert.equal(depois.acceptedAt, null);
    assert.equal(depois.timeline.length, antes.timeline.length, "a recusa gravou evento de despacho");
  });
});

test("B7 · permissão — technician (sem field_dispatch:update) é recusado com permission_required, despacho intacto", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;
    const s = await ctx.semente(seed.tecnicoStd);
    await ctx.osAceita(s, seed.tecnicoStd, "technician");
    const antes = await ctx.despacho(s.dispatchId);

    const r = await ctx.acao(ctx.h(seed.tecnicoStd, "technician"), TIPO, { work_order_id: s.workOrderId, status: "accepted" });
    assert.equal(r.status, "rejected", `${r.status} ${r.error?.reason}`);
    assert.equal(r.error?.reason, "permission_required");

    const depois = await ctx.despacho(s.dispatchId);
    assert.equal(depois.status, "assigned", "o despacho andou sem field_dispatch:update");
    assert.equal(depois.acceptedAt, null);
    assert.equal(depois.timeline.length, antes.timeline.length);
  });
});

test("B8 · porta da OS — quem nunca foi da OS: rejected not_assigned_to_actor; ex-técnico: conflito de troca; outra organização: rejected 404", async () => {
  await withApi(async (ctx) => {
    const { seed } = ctx;

    // Técnico B nunca foi técnico da OS de A.
    const s1 = await ctx.semente(seed.tecnicoA);
    await ctx.osAceita(s1, seed.tecnicoA);
    const neg = await ctx.acao(ctx.h(seed.tecnicoB, "field_technician"), TIPO, { work_order_id: s1.workOrderId, status: "accepted" });
    assert.equal(neg.status, "rejected", `G-NEG: ${neg.status} ${neg.error?.reason}`);
    assert.equal(neg.error?.reason, "not_assigned_to_actor");
    assert.equal((await ctx.despacho(s1.dispatchId)).status, "assigned");

    // Ex-técnico A: o despacho passou a C (a OS foi junto).
    const s2 = await ctx.semente(seed.tecnicoA);
    await ctx.osAceita(s2, seed.tecnicoA);
    await ctx.reatribuir(s2.dispatchId, seed.tecnicoC);
    const ex = await ctx.acao(ctx.h(seed.tecnicoA, "field_technician"), TIPO, { work_order_id: s2.workOrderId, status: "accepted" });
    assert.equal(ex.status, "conflict", `G-EX: ${ex.status} ${ex.error?.reason}`);
    assert.equal(ex.conflict?.conflict_type, CONFLITO_TROCA);
    assert.equal(ex.error?.reason, "not_assigned_to_actor");

    // Outra organização: o técnico X (organização B) não enxerga a OS da organização A.
    const s3 = await ctx.semente(seed.tecnicoA);
    await ctx.osAceita(s3, seed.tecnicoA);
    const outra = await ctx.acao(ctx.h(seed.tecnicoX, "field_technician", seed.tenantB), TIPO, { work_order_id: s3.workOrderId, status: "accepted" });
    assert.equal(outra.status, "rejected", `outra organização: ${outra.status} ${outra.error?.reason}`);
    assert.equal(outra.error?.code, "WORK_ORDER_NOT_FOUND");
    assert.equal(outra.error?.reason, "not_found");
    assert.equal((await ctx.despacho(s3.dispatchId)).status, "assigned");
  });
});

// ------------------------------------------------------------------------------------------------
// Arnês: o app inteiro em memória, por HTTP, com os cabeçalhos legados de desenvolvimento.
// ------------------------------------------------------------------------------------------------

type Semente = { workOrderId: string; dispatchId: string };

type Seed = {
  tenantA: Tenant;
  tenantB: Tenant;
  gestorA: User;
  tecnicoA: User;
  tecnicoB: User;
  tecnicoC: User;
  tecnicoStd: User;
  tecnicoX: User;
};

type Resultado = {
  client_action_id: string;
  type?: string;
  status: string;
  work_order_id?: string;
  dispatch?: { id: string | null; status: string | null; effect: string; reason?: string };
  error?: { code: string; reason: string; message: string };
  conflict?: { conflict_type: string; next_action: string };
  [chave: string]: unknown;
};

type Acao = { client_action_id?: string; type: string; payload: Record<string, unknown> };

type Ctx = {
  seed: Seed;
  h(user: User, role: string, tenant?: Tenant): Record<string, string>;
  req(caminho: string, opcoes?: { method?: string; headers?: Record<string, string>; body?: unknown }): Promise<{ status: number; body: any }>;
  lote(headers: Record<string, string>, acoes: readonly Acao[]): Promise<{ status: number; data: any; resultados: Resultado[] }>;
  acao(headers: Record<string, string>, tipo: string, payload: Record<string, unknown>, id?: string): Promise<Resultado>;
  criarOs(): Promise<string>;
  despachar(workOrderId: string, tecnico: User): Promise<string>;
  reatribuir(dispatchId: string, tecnico: User): Promise<void>;
  semente(tecnico: User): Promise<Semente>;
  osAceita(s: Semente, tecnico: User, papel?: string): Promise<void>;
  os(workOrderId: string): Promise<any>;
  despacho(dispatchId: string): Promise<any>;
  reiniciarLotes(): void;
};

async function withApi(callback: (ctx: Ctx) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    workOrders,
    fieldDispatch,
    workOrderSync,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  const resetAll = () => {
    workOrders.resetWorkOrderRuntimeForTests();
    fieldDispatch.resetFieldDispatchRuntimeForTests();
    workOrderSync.resetMobileWorkOrderSyncRuntimeForTests();
  };
  resetAll();

  const modulos = ["work_orders", "field_operations"];
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "DemoC A", modules: modulos });
  const tenantB = core.createTenant({ name: "DemoC B", modules: modulos });
  const sufixo = randomUUID().slice(0, 8);
  const usuario = (tenant: Tenant, nome: string, roles: string[]) =>
    core.createUser({ tenantId: tenant.id, name: nome, email: `${nome}-${sufixo}@democ.example.com`, roles: roles as never });
  const seed: Seed = {
    tenantA,
    tenantB,
    gestorA: usuario(tenantA, "gestor", ["manager"]),
    tecnicoA: usuario(tenantA, "tecnico-a", ["field_technician"]),
    tecnicoB: usuario(tenantA, "tecnico-b", ["field_technician"]),
    tecnicoC: usuario(tenantA, "tecnico-c", ["field_technician"]),
    tecnicoStd: usuario(tenantA, "tecnico-std", ["technician"]),
    tecnicoX: usuario(tenantB, "tecnico-x", ["field_technician"]),
  };

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  const h = (user: User, role: string, tenant: Tenant = tenantA) => ({ "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role });
  const hGestor = h(seed.gestorA, "manager");
  const req: Ctx["req"] = async (caminho, opcoes = {}) => {
    const response = await fetch(`${baseUrl}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: { "content-type": "application/json", ...opcoes.headers },
      body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const lote: Ctx["lote"] = async (headers, acoes) => {
    const r = await req(LOTE_OS, {
      method: "POST",
      headers,
      body: {
        client_batch_id: randomUUID(),
        actions: acoes.map((a) => ({
          client_action_id: a.client_action_id ?? randomUUID(),
          type: a.type,
          local_created_at: new Date().toISOString(),
          payload: a.payload,
        })),
      },
    });
    assert.equal(r.status, 200, `o lote não respondeu 200: ${JSON.stringify(r.body)}`);
    const data = r.body.data;
    const resultados = [...data.accepted, ...data.rejected, ...data.conflicts, ...data.already_applied] as Resultado[];
    return { status: r.status, data, resultados };
  };
  const criarOs = async () => {
    const criada = await req("/api/v1/work-orders", { method: "POST", headers: hGestor, body: { title: "OS DemoC" } });
    assert.equal(criada.status, 201, JSON.stringify(criada.body));
    return criada.body.data.id as string;
  };
  const despachar = async (workOrderId: string, tecnico: User) => {
    const d = await req("/api/v1/operations/dispatches", { method: "POST", headers: hGestor, body: { workOrderId, operatorUserId: tecnico.id } });
    assert.equal(d.status, 201, `despacho falhou: ${JSON.stringify(d.body)}`);
    return d.body.data.id as string;
  };

  const ctx: Ctx = {
    seed,
    h,
    req,
    lote,
    async acao(headers, tipo, payload, id = randomUUID()) {
      const { resultados } = await lote(headers, [{ client_action_id: id, type: tipo, payload }]);
      const r = resultados.find((x) => x.client_action_id === id);
      assert.ok(r, `a ação ${id} não voltou no lote`);
      return r;
    },
    criarOs,
    despachar,
    async reatribuir(dispatchId, tecnico) {
      const r = await req(`/api/v1/operations/dispatches/${dispatchId}/reassign`, {
        method: "PATCH",
        headers: hGestor,
        body: { operatorUserId: tecnico.id },
      });
      assert.equal(r.status, 200, `reatribuição falhou: ${JSON.stringify(r.body)}`);
    },
    async semente(tecnico) {
      const workOrderId = await criarOs();
      const dispatchId = await despachar(workOrderId, tecnico);
      return { workOrderId, dispatchId };
    },
    async osAceita(s, tecnico, papel = "field_technician") {
      const r = await ctx.acao(h(tecnico, papel), "work_order.status_change", { work_order_id: s.workOrderId, status: "accepted" });
      assert.equal(r.status, "accepted", `a OS não foi aceita: ${JSON.stringify(r)}`);
    },
    async os(workOrderId) {
      const r = await req(`/api/v1/work-orders/${workOrderId}`, { headers: hGestor });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.data;
    },
    async despacho(dispatchId) {
      const r = await req(`/api/v1/operations/dispatches/${dispatchId}`, { headers: hGestor });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.data;
    },
    reiniciarLotes() {
      workOrderSync.resetMobileWorkOrderSyncRuntimeForTests();
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
