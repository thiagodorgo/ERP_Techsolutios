import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// B-SAN3-13 (#32 `P-MOBILE-MINHAS-OS-SEM-FILTRO`) — A LISTA DE OS DO TÉCNICO É IMPOSTA NO BACKEND.
//
// O defeito medido (plano v3 §1a): `GET /api/v1/work-orders` devolvia a organização inteira a qualquer papel —
// o técnico A via a OS do técnico B e a órfã, e até filtrava pela do colega com `?assignedUserId=<B>`.
//
// A propriedade (plano v3 §2.1 I1): para o ator `actorMutatesAssignedOnly`, a lista devolve EXATAMENTE as OS
// que ele pode mutar — o predicado do guard de mutação (`assigned_operator_id` = user id OU = perfil dele), sem
// o ramo `assigned_user_id`. "Lista = mutáveis" (CA-7).
//
// Espelho: tests/o6r07a-wo-object-scope.test.ts (mesmo harness em memória, mesmos perfis).

// ── B1 (CA-1) — VERMELHO-CONTROLE NO HEAD: o técnico A vê as 5 OS da organização; o certo são 3.
test("B1 (CA-1) — as 4 vias de atribuição: A lista (i)(ii)(iii) e não (iv) nem a órfã; B lista só (iv)", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, service }) => {
    const vias = await criarQuatroVias(baseUrl, seed, service);

    const listaA = await listar(baseUrl, authHeaders(seed.tenantA, seed.tecnicoA, "field_technician"));
    const listaB = await listar(baseUrl, authHeaders(seed.tenantA, seed.tecnicoB, "field_technician"));

    assert.equal(listaA.status, 200, JSON.stringify(listaA.body));
    assert.deepEqual(
      idsOrdenados(listaA.body.items),
      [vias.i, vias.ii, vias.iii].sort(),
      `A deveria ver (i)(ii)(iii); total=${listaA.body.pagination.total}`,
    );
    assert.equal(listaA.body.pagination.total, 3);
    assert.deepEqual(idsOrdenados(listaB.body.items), [vias.iv]);
    assert.equal(listaB.body.pagination.total, 1);
  });
});

// ───────────────────────────── harness ─────────────────────────────

type SeedUser = { readonly id: string };
type SeedProfile = { readonly id: string };
type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: SeedUser;
  readonly managerB: SeedUser;
  readonly tecnicoA: SeedUser;
  readonly tecnicoB: SeedUser;
  readonly perfilA: SeedProfile;
  readonly perfilB: SeedProfile;
};
type Vias = { readonly i: string; readonly ii: string; readonly iii: string; readonly iv: string; readonly orfa: string };
type ServiceLike = {
  assignFromDispatch(
    actor: unknown,
    input: { workOrderId: string; operatorUserId: string; dispatchId: string; source: "field_dispatch" },
  ): Promise<{ assignedUserId?: string; assignedOperatorId?: string }>;
};

// (i) assign `userId` (operator = A) · (ii) assign só perfil (operator = P_A, user = null) · (iii) despacho
// (user = A, operator = P_A) · (iv) via mista (user = A, operator = P_B) · órfã.
async function criarQuatroVias(baseUrl: string, seed: SeedData, service: ServiceLike): Promise<Vias> {
  const i = await criarOs(baseUrl, seed, "Via i");
  await atribuir(baseUrl, seed, i, { userId: seed.tecnicoA.id });
  const ii = await criarOs(baseUrl, seed, "Via ii");
  await atribuir(baseUrl, seed, ii, { operatorId: seed.perfilA.id });
  const iii = await criarOs(baseUrl, seed, "Via iii");
  const despachada = await service.assignFromDispatch(managerActor(seed), {
    workOrderId: iii,
    operatorUserId: seed.tecnicoA.id,
    dispatchId: randomUUID(),
    source: "field_dispatch",
  });
  assert.equal(despachada.assignedUserId, seed.tecnicoA.id);
  assert.equal(despachada.assignedOperatorId, seed.perfilA.id);
  const iv = await criarOs(baseUrl, seed, "Via iv");
  const mista = await atribuir(baseUrl, seed, iv, { operatorId: seed.perfilB.id, userId: seed.tecnicoA.id });
  assert.equal(mista.assignedUserId, seed.tecnicoA.id);
  assert.equal(mista.assignedOperatorId, seed.perfilB.id);
  const orfa = await criarOs(baseUrl, seed, "Orfa");
  return { i, ii, iii, iv, orfa };
}

function managerActor(seed: SeedData) {
  return { tenantId: seed.tenantA.id, userId: seed.managerA.id, roles: ["manager"], permissions: [] } as never;
}

async function criarOs(baseUrl: string, seed: SeedData, title = "OS de teste", tenant?: Tenant, manager?: SeedUser): Promise<string> {
  const criada = await requestJson(baseUrl, "/api/v1/work-orders", {
    method: "POST",
    headers: authHeaders(tenant ?? seed.tenantA, manager ?? seed.managerA, "manager"),
    body: { title, customerName: "Cliente de teste", serviceAddress: "Rua de teste, 1" },
  });
  assert.equal(criada.status, 201, `criação falhou: ${JSON.stringify(criada.body)}`);
  return criada.body.data.id as string;
}

async function atribuir(
  baseUrl: string,
  seed: SeedData,
  workOrderId: string,
  body: Record<string, string>,
): Promise<{ assignedUserId?: string; assignedOperatorId?: string }> {
  const atribuida = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/assign`, {
    method: "POST",
    headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    body,
  });
  assert.equal(atribuida.status, 200, `atribuição falhou: ${JSON.stringify(atribuida.body)}`);
  return atribuida.body.data;
}

async function listar(baseUrl: string, headers: Record<string, string>, query = "") {
  return requestJson(baseUrl, `/api/v1/work-orders${query ? `?${query}` : ""}`, { headers });
}

function idsOrdenados(items: readonly { id: string }[]): string[] {
  return items.map((item) => item.id).sort();
}

async function withWorkOrderApi(
  callback: (context: { readonly baseUrl: string; readonly seed: SeedData; readonly service: ServiceLike }) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    workOrderModule,
    operatorProfileModule,
    approvalModule,
    notificationModule,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/operator-profiles/operator-profile.service.js"),
    import("../src/modules/work-orders/approval.service.js"),
    import("../src/modules/notifications/notification.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  workOrderModule.resetWorkOrderRuntimeForTests();
  operatorProfileModule.resetOperatorProfileRuntimeForTests();
  approvalModule.resetApprovalRuntimeForTests();
  notificationModule.resetNotificationRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "SAN3-13 Lista A", modules: ["work_orders"] });
  const tenantB = core.createTenant({ name: "SAN3-13 Lista B", modules: ["work_orders"] });
  const managerA: SeedUser = { id: randomUUID() };
  const managerB: SeedUser = { id: randomUUID() };
  const tecnicoA: SeedUser = { id: randomUUID() };
  const tecnicoB: SeedUser = { id: randomUUID() };

  const profileService = await operatorProfileModule.createDefaultOperatorProfileService();
  const actorAdmin = { tenantId: tenantA.id, userId: managerA.id, roles: ["tenant_admin"], permissions: [] } as never;
  const perfilA = await profileService.create(actorAdmin, { user_id: tecnicoA.id, full_name: "Tecnico A" });
  const perfilB = await profileService.create(actorAdmin, { user_id: tecnicoB.id, full_name: "Tecnico B" });

  const seed: SeedData = { tenantA, tenantB, managerA, managerB, tecnicoA, tecnicoB, perfilA, perfilB };
  const service = (await workOrderModule.createDefaultWorkOrderService()) as unknown as ServiceLike;
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed, service });
  } finally {
    await closeServer(server);
    workOrderModule.resetWorkOrderRuntimeForTests();
    operatorProfileModule.resetOperatorProfileRuntimeForTests();
    approvalModule.resetApprovalRuntimeForTests();
    notificationModule.resetNotificationRuntimeForTests();
  }
}

function authHeaders(tenant: Tenant, user: SeedUser, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
