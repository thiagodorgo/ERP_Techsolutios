import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-O6R-11d (P2-bis, Q1 = A, `D-DONO-TODAS-RECOMENDACOES-1111`) — o envio atrasado de viatura/equipe pelo app nunca
// troca o técnico de uma OS cujo técnico mudou depois de a ação nascer.
//
// A ação `work_order.assign` que o app enfileira para gravar viatura/equipe carrega o técnico que o aparelho
// conhecia QUANDO a enfileirou. Antes de "No local", a trava do 07c deixa qualquer atribuição trocar o técnico na
// hora (`D-07CB1-TRAVA-ATE-B2`); por isso, sem pré-condição, um envio atrasado devolvia a OS ao técnico antigo
// (CL11D-01). Agora o app declara `expected_technician_id` e o servidor responde CONFLITO
// (`technician_changed_since_action`) quando o técnico da OS é outro, sem gravar nada. Sem a chave, nada muda
// (web, testes do 07c, apps antigos).
//
// N7 e N8 são CARACTERIZAÇÕES (verdes): documentam dois fatos do servidor que ficam com dono fora do bloco
// (`P-WO-ASSIGN-SEM-USERID-APAGA-USUARIO`, `P-O6R-11D-REGISTRY-ASSIGN-REABRE-STATUS`).

const FIXTURE = JSON.parse(
  readFileSync(
    new URL("../mobile/flutter_app/test/features/work_orders/bo6r11d_work_order_contract.json", import.meta.url),
    "utf8",
  ),
) as { readonly sync_assign_payload: Record<string, unknown> };

const tecnicoU = FIXTURE.sync_assign_payload.operator_id as string;
const tecnicoV = randomUUID();

type Ctx = {
  readonly baseUrl: string;
  readonly h: Record<string, string>;
  readonly viaturaId: string;
};

type Lote = {
  readonly status: number;
  readonly acao: string;
  readonly conflictType?: string;
  readonly reason?: string;
  readonly body: Record<string, unknown>;
};

test("[B-O6R-11d N5] a gestão troca o técnico de U para V; o envio atrasado do app (esperado U) vira conflito e a OS fica com V", async () => {
  await withApi(async (ctx) => {
    const osId = await novaOs(ctx, "OS do N5");
    assert.equal((await assignRest(ctx, osId, { operatorId: tecnicoU, userId: tecnicoU })).status, 200);
    const troca = await assignRest(ctx, osId, { operatorId: tecnicoV, userId: tecnicoV });
    assert.equal(troca.status, 200, JSON.stringify(troca.body));
    const eventosAntes = await eventos(ctx, osId);

    const lote = await enviarLote(ctx, "n5-atrasado", payloadDoApp(ctx, osId));

    assert.equal(lote.status, 200);
    assert.equal(lote.acao, "conflict", JSON.stringify(lote.body));
    assert.equal(lote.conflictType, "technician_changed_since_action");
    assert.equal(lote.reason, "technician_changed_since_action");
    const os = await lerOs(ctx, osId);
    assert.equal(os.assignedUserId, tecnicoV);
    assert.equal(os.assignedOperatorId, tecnicoV);
    assert.equal(os.vehicleId, null, "a viatura da ação recusada foi gravada");
    assert.equal((await eventos(ctx, osId)).length, eventosAntes.length, "evento novo apesar do conflito");
  });
});

test("[B-O6R-11d N6] OS com U só em assignedOperatorId: o lote do app é aceito e REPARA assignedUserId = U", async () => {
  await withApi(async (ctx) => {
    const osId = await novaOs(ctx, "OS do N6");
    const semente = await assignRest(ctx, osId, { operatorId: tecnicoU });
    assert.equal(semente.status, 200);
    assert.equal(semente.body.data.assignedUserId ?? null, null);

    const lote = await enviarLote(ctx, "n6-reparo", payloadDoApp(ctx, osId));

    assert.equal(lote.acao, "accepted", JSON.stringify(lote.body));
    const os = await lerOs(ctx, osId);
    assert.equal(os.assignedUserId, tecnicoU);
    assert.equal(os.assignedOperatorId, tecnicoU);
    assert.equal(os.vehicleId, ctx.viaturaId);
  });
});

test("[B-O6R-11d N11] OS despachada com operator (perfil) != user: o envio atrasado e conferido contra o tecnico certo (assignedUserId) e e aceito", async () => {
  await withApi(async (ctx) => {
    const osId = await novaOs(ctx, "OS do N11");
    // Estado normal de OS despachada: assignedOperatorId e o PERFIL de campo, assignedUserId e o usuario.
    const despacho = await assignRest(ctx, osId, { operatorId: tecnicoV, userId: tecnicoU });
    assert.equal(despacho.status, 200, JSON.stringify(despacho.body));

    const lote = await enviarLote(ctx, "n11-tecnico-certo", payloadDoApp(ctx, osId));

    assert.equal(lote.acao, "accepted", JSON.stringify(lote.body));
    const os = await lerOs(ctx, osId);
    assert.equal(os.assignedUserId, tecnicoU);
    assert.equal(os.vehicleId, ctx.viaturaId);
  });
});

test("[B-O6R-11d N12] OS legada com operador U e usuário trocado para V: o envio atrasado que declara U é recusado e não grava nada", async () => {
  await withApi(async (ctx) => {
    const osId = await novaOs(ctx, "OS do N12");
    // OS legada: o perfil de campo (operator) é U e não há usuário ainda.
    assert.equal((await assignRest(ctx, osId, { operatorId: tecnicoU })).status, 200);
    // O usuário é trocado para V, mas o perfil de campo segue U.
    const troca = await assignRest(ctx, osId, { operatorId: tecnicoU, userId: tecnicoV });
    assert.equal(troca.status, 200, JSON.stringify(troca.body));
    const eventosAntes = await eventos(ctx, osId);

    const lote = await enviarLote(ctx, "n12-atrasado", payloadDoApp(ctx, osId));

    assert.equal(lote.acao, "conflict", JSON.stringify(lote.body));
    assert.equal(lote.conflictType, "technician_changed_since_action");
    assert.equal(lote.reason, "technician_changed_since_action");
    const os = await lerOs(ctx, osId);
    assert.equal(os.assignedUserId, tecnicoV, "a ação recusada devolveu o usuário para U");
    assert.equal(os.assignedOperatorId, tecnicoU, "o perfil de campo segue U");
    assert.equal(os.vehicleId, null, "a viatura da ação recusada foi gravada");
    assert.equal((await eventos(ctx, osId)).length, eventosAntes.length, "evento novo apesar do conflito");
  });
});

test("[B-O6R-11d N9] fail-closed: expected_technician_id null ou vazio → conflito; sem a chave → o comportamento de hoje", async () => {
  await withApi(async (ctx) => {
    for (const [rotulo, valor] of [
      ["null", null],
      ["vazio", ""],
      ["número", 7],
      ["outro técnico", tecnicoV],
    ] as const) {
      const osId = await novaOs(ctx, `OS do N9 ${rotulo}`);
      assert.equal((await assignRest(ctx, osId, { operatorId: tecnicoU, userId: tecnicoU })).status, 200);
      const lote = await enviarLote(ctx, `n9-${rotulo}`, { ...payloadDoApp(ctx, osId), expected_technician_id: valor });
      assert.equal(lote.acao, "conflict", `${rotulo}: ${JSON.stringify(lote.body)}`);
      assert.equal(lote.conflictType, "technician_changed_since_action", rotulo);
      assert.equal((await lerOs(ctx, osId)).vehicleId, null, `${rotulo}: gravou a viatura`);
    }

    // OS sem técnico no servidor e chave presente → conflito.
    const semTecnico = await novaOs(ctx, "OS do N9 sem técnico");
    const loteSemTecnico = await enviarLote(ctx, "n9-sem-tecnico", payloadDoApp(ctx, semTecnico));
    assert.equal(loteSemTecnico.acao, "conflict", JSON.stringify(loteSemTecnico.body));
    assert.equal(loteSemTecnico.conflictType, "technician_changed_since_action");

    // Sem a chave (web, app antigo, testes do 07c): igual a hoje — a troca antes de No local vale na hora.
    const osLegado = await novaOs(ctx, "OS do N9 legado");
    assert.equal((await assignRest(ctx, osLegado, { operatorId: tecnicoU, userId: tecnicoU })).status, 200);
    const { expected_technician_id: _semChave, ...legado } = payloadDoApp(ctx, osLegado);
    const loteLegado = await enviarLote(ctx, "n9-legado", { ...legado, operator_id: tecnicoV, user_id: tecnicoV });
    assert.equal(loteLegado.acao, "accepted", JSON.stringify(loteLegado.body));
    assert.equal((await lerOs(ctx, osLegado)).assignedUserId, tecnicoV);
  });
});

test("[B-O6R-11d N7] caracterização: POST /assign só com operatorId grava assignedUserId = null (P-WO-ASSIGN-SEM-USERID-APAGA-USUARIO)", async () => {
  await withApi(async (ctx) => {
    const osId = await novaOs(ctx, "OS do N7");
    const semUsuario = await assignRest(ctx, osId, { operatorId: tecnicoU });
    assert.equal(semUsuario.status, 200, JSON.stringify(semUsuario.body));
    assert.equal(semUsuario.body.data.assignedOperatorId, tecnicoU);
    assert.equal(semUsuario.body.data.assignedUserId ?? null, null);
    assert.equal((await lerOs(ctx, osId)).assignedUserId ?? null, null);
  });
});

test("[B-O6R-11d N8] caracterização: com a OS em accepted, o lote de viatura/equipe dá conflito invalid_status_transition (P-O6R-11D-REGISTRY-ASSIGN-REABRE-STATUS)", async () => {
  await withApi(async (ctx) => {
    const osId = await novaOs(ctx, "OS do N8");
    assert.equal((await assignRest(ctx, osId, { operatorId: tecnicoU, userId: tecnicoU })).status, 200);
    await setStatus(ctx, osId, { status: "accepted" });

    const lote = await enviarLote(ctx, "n8-accepted", payloadDoApp(ctx, osId));

    assert.equal(lote.acao, "conflict", JSON.stringify(lote.body));
    assert.equal(lote.conflictType, "invalid_status_transition");
    const os = await lerOs(ctx, osId);
    assert.equal(os.status, "accepted");
    assert.equal(os.vehicleId, null);
  });
});

/** O payload que o app manda (a seção da fixture), com as duas chaves do cenário trocadas (CR2-11D-08). */
function payloadDoApp(ctx: Ctx, osId: string): Record<string, unknown> {
  return { ...FIXTURE.sync_assign_payload, work_order_id: osId, vehicle_id: ctx.viaturaId };
}

async function novaOs(ctx: Ctx, title: string): Promise<string> {
  const os = await requestJson(ctx.baseUrl, "/api/v1/work-orders", { method: "POST", headers: ctx.h, body: { title } });
  assert.equal(os.status, 201, JSON.stringify(os.body));
  return os.body.data.id as string;
}

async function assignRest(ctx: Ctx, osId: string, body: Record<string, unknown>) {
  return requestJson(ctx.baseUrl, `/api/v1/work-orders/${osId}/assign`, { method: "POST", headers: ctx.h, body });
}

async function setStatus(ctx: Ctx, osId: string, body: Record<string, unknown>): Promise<void> {
  const r = await requestJson(ctx.baseUrl, `/api/v1/work-orders/${osId}/status`, { method: "PATCH", headers: ctx.h, body });
  assert.equal(r.status, 200, JSON.stringify(r.body));
}

async function lerOs(ctx: Ctx, osId: string) {
  const r = await requestJson(ctx.baseUrl, `/api/v1/work-orders/${osId}`, { headers: ctx.h });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.data as Record<string, unknown>;
}

async function eventos(ctx: Ctx, osId: string): Promise<readonly unknown[]> {
  const r = await requestJson(ctx.baseUrl, `/api/v1/work-orders/${osId}/timeline`, { headers: ctx.h });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.data as readonly unknown[];
}

async function enviarLote(ctx: Ctx, clientActionId: string, payload: Record<string, unknown>): Promise<Lote> {
  const r = await requestJson(ctx.baseUrl, "/api/v1/mobile/sync/work-order-actions", {
    method: "POST",
    headers: ctx.h,
    body: {
      client_batch_id: `lote-${clientActionId}`,
      actions: [{ client_action_id: clientActionId, type: "work_order.assign", payload }],
    },
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const data = r.body.data as Record<string, readonly Record<string, unknown>[]>;
  for (const balde of ["accepted", "already_applied", "rejected", "conflicts"] as const) {
    const item = (data[balde] ?? []).find((resultado) => resultado.client_action_id === clientActionId);
    if (!item) continue;
    const conflict = item.conflict as { conflict_type?: string } | undefined;
    const error = item.error as { reason?: string } | undefined;
    return {
      status: r.status,
      acao: balde === "conflicts" ? "conflict" : balde,
      conflictType: conflict?.conflict_type,
      reason: error?.reason,
      body: item,
    };
  }
  assert.fail(`ação ${clientActionId} sem resultado: ${JSON.stringify(r.body)}`);
}

async function withApi(callback: (ctx: Ctx) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetTeamRuntimeForTests },
    { resetMobileWorkOrderSyncRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/teams/index.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const resetAll = () => {
    resetWorkOrderRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetTeamRuntimeForTests();
    resetMobileWorkOrderSyncRuntimeForTests();
  };

  resetAll();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant: Tenant = core.createTenant({ name: "Organização 11d lote", modules: ["dashboard", "mobile", "work_orders"] });
  const gestor: User = core.createUser({
    tenantId: tenant.id,
    name: "Gestor 11d",
    email: "gestor-11d-lote@example.com",
    roles: ["manager"],
  });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);
  const h = { "x-tenant-id": tenant.id, "x-user-id": gestor.id, "x-role": "manager" };

  try {
    const viatura = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: h,
      body: { plate: "ZXC9V87", model: "Guincho" },
    });
    assert.equal(viatura.status, 201, JSON.stringify(viatura.body));
    await callback({ baseUrl, h, viaturaId: viatura.body.data.id as string });
  } finally {
    await closeServer(server);
    resetAll();
  }
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
  } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
