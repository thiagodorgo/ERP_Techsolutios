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

/// ── B2 — a órfã e a do colega ficam fora; pedir pelo perfil do colega não abre nada.
test("B2 — técnico não vê a órfã nem a do colega; ?assignedOperatorId=<perfil do colega> → 200 vazio", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, service }) => {
    const vias = await criarQuatroVias(baseUrl, seed, service);
    const headersA = authHeaders(seed.tenantA, seed.tecnicoA, "field_technician");

    const tudo = await listar(baseUrl, headersA);
    assert.equal(tudo.status, 200);
    assert.equal(idsOrdenados(tudo.body.items).includes(vias.orfa), false, "a órfã não é de ninguém");
    assert.equal(idsOrdenados(tudo.body.items).includes(vias.iv), false, "a mista é do dono do perfil (B)");

    const pedidoAlheio = await listar(baseUrl, headersA, `assignedOperatorId=${seed.perfilB.id}`);
    assert.equal(pedidoAlheio.status, 200);
    assert.deepEqual(pedidoAlheio.body.items, []);
    assert.equal(pedidoAlheio.body.pagination.total, 0);
  });
});

// ── B3 (CA-2) — os filtros do chamador INTERSECTAM o escopo (nunca o substituem).
test("B3 (CA-2) — ?assignedUserId=<B> → 200/[]/0; ?status= e ?search= restringem dentro das de A", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, service }) => {
    const vias = await criarQuatroVias(baseUrl, seed, service);
    const daB = await criarOs(baseUrl, seed, "Exclusiva do colega B");
    await atribuir(baseUrl, seed, daB, { userId: seed.tecnicoB.id });
    const headersA = authHeaders(seed.tenantA, seed.tecnicoA, "field_technician");

    const doColega = await listar(baseUrl, headersA, `assignedUserId=${seed.tecnicoB.id}`);
    assert.equal(doColega.status, 200);
    assert.deepEqual(doColega.body.items, []);
    assert.equal(doColega.body.pagination.total, 0);

    const porStatus = await listar(baseUrl, headersA, "status=assigned");
    assert.deepEqual(idsOrdenados(porStatus.body.items), [vias.i, vias.ii, vias.iii].sort());
    const porStatusOpen = await listar(baseUrl, headersA, "status=open");
    assert.deepEqual(porStatusOpen.body.items, [], "a órfã (open) não entra pela porta do status");

    const buscaAlheia = await listar(baseUrl, headersA, `search=${encodeURIComponent("Exclusiva do colega")}`);
    assert.equal(buscaAlheia.status, 200);
    assert.deepEqual(buscaAlheia.body.items, [], "o search não devolve a OS do colega");
    const buscaPropria = await listar(baseUrl, headersA, `search=${encodeURIComponent("Via iii")}`);
    assert.deepEqual(idsOrdenados(buscaPropria.body.items), [vias.iii]);
  });
});

// ── B4 (CA-3) — parâmetro inválido é 400, nunca "ignorado".
test("B4 (CA-3) — scope=xyz → 400 invalid_scope; openOnly=sim → 400 invalid_open_only", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.managerA, "manager");
    for (const [query, reason] of [
      ["scope=xyz", "invalid_scope"],
      ["scope=ASSIGNED", "invalid_scope"],
      ["openOnly=sim", "invalid_open_only"],
      ["openOnly=1", "invalid_open_only"],
    ] as const) {
      const resposta = await listar(baseUrl, headers, query);
      assert.equal(resposta.status, 400, `${query}: ${JSON.stringify(resposta.body)}`);
      assert.equal(resposta.body.error.code, "WORK_ORDER_FILTER_INVALID");
      assert.equal(resposta.body.error.reason, reason, query);
    }
  });
});

// ── B5 (CA-4) — papéis: a gestão segue tenant-wide; `scope=assigned` recorta a qualquer um; dois papéis = união.
test("B5 (CA-4) — manager: tudo; manager+scope=assigned: só as dele; manager+field_technician: tudo", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, service }) => {
    const vias = await criarQuatroVias(baseUrl, seed, service);
    const doGestor = await criarOs(baseUrl, seed, "Do gestor");
    await atribuir(baseUrl, seed, doGestor, { userId: seed.managerA.id });
    const todas = [vias.i, vias.ii, vias.iii, vias.iv, vias.orfa, doGestor].sort();

    const gestor = await listar(baseUrl, authHeaders(seed.tenantA, seed.managerA, "manager"));
    assert.deepEqual(idsOrdenados(gestor.body.items), todas);

    const gestorEscopado = await listar(baseUrl, authHeaders(seed.tenantA, seed.managerA, "manager"), "scope=assigned");
    assert.deepEqual(idsOrdenados(gestorEscopado.body.items), [doGestor]);

    const doisPapeis = await listar(baseUrl, authHeaders(seed.tenantA, seed.managerA, "manager,field_technician"));
    assert.deepEqual(idsOrdenados(doisPapeis.body.items), todas, "a união vence: quem tem gestão não cai no escopo");

    const tecnicoComScope = await listar(baseUrl, authHeaders(seed.tenantA, seed.tecnicoA, "technician"), "scope=assigned");
    assert.deepEqual(idsOrdenados(tecnicoComScope.body.items), [vias.i, vias.ii, vias.iii].sort(), "`technician` também");
  });
});

// ── B6 (CA-7) — LISTA = MUTÁVEIS: para cada OS, estar na lista de A ⇔ A não recebe 403 no PATCH /status.
test("B6 (CA-7) — para as 4 vias + a órfã: ∈ lista de A ⇔ PATCH /status por A ≠ 403", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed, service }) => {
    const vias = await criarQuatroVias(baseUrl, seed, service);
    const headersA = authHeaders(seed.tenantA, seed.tecnicoA, "field_technician");
    const naLista = new Set(idsOrdenados((await listar(baseUrl, headersA)).body.items));

    for (const [nome, id] of Object.entries(vias)) {
      const patch = await requestJson(baseUrl, `/api/v1/work-orders/${id}/status`, {
        method: "PATCH",
        headers: headersA,
        body: { status: "accepted" },
      });
      assert.equal(naLista.has(id), patch.status !== 403, `${nome}: lista=${naLista.has(id)} patch=${patch.status}`);
    }
  });
});

// ── B7 (CA-5) — `offset`: total e páginas do escopo, nenhuma do colega.
test("B7 (CA-5) — 25 de A + 10 de B: offset → total 25, páginas 20+5, nenhuma de B", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const deA = new Set<string>();
    for (let index = 0; index < 25; index += 1) {
      const id = await criarOs(baseUrl, seed, `A-${index}`);
      await atribuir(baseUrl, seed, id, { userId: seed.tecnicoA.id });
      deA.add(id);
    }
    for (let index = 0; index < 10; index += 1) {
      const id = await criarOs(baseUrl, seed, `B-${index}`);
      await atribuir(baseUrl, seed, id, { userId: seed.tecnicoB.id });
    }
    const headersA = authHeaders(seed.tenantA, seed.tecnicoA, "field_technician");

    const pagina1 = await listar(baseUrl, headersA, "limit=20&offset=0");
    const pagina2 = await listar(baseUrl, headersA, "limit=20&offset=20");
    assert.equal(pagina1.body.pagination.total, 25);
    assert.equal(pagina1.body.items.length, 20);
    assert.equal(pagina2.body.items.length, 5);
    const vistas = [...pagina1.body.items, ...pagina2.body.items].map((item: { id: string }) => item.id);
    assert.equal(new Set(vistas).size, 25);
    assert.equal(vistas.every((id: string) => deA.has(id)), true, "nenhuma OS de B");
  });
});

// ── B8 — cross-tenant: o escopo vive dentro da organização ativa.
test("B8 — o mesmo user id atribuído em OUTRA organização não aparece na lista da organização A", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const deA = await criarOs(baseUrl, seed, "Em A");
    await atribuir(baseUrl, seed, deA, { userId: seed.tecnicoA.id });
    const emB = await criarOs(baseUrl, seed, "Em B", seed.tenantB, seed.managerB);
    const atribuidaEmB = await requestJson(baseUrl, `/api/v1/work-orders/${emB}/assign`, {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { userId: seed.tecnicoA.id },
    });
    assert.equal(atribuidaEmB.status, 200);

    const naA = await listar(baseUrl, authHeaders(seed.tenantA, seed.tecnicoA, "field_technician"));
    const naB = await listar(baseUrl, authHeaders(seed.tenantB, seed.tecnicoA, "field_technician"));
    assert.deepEqual(idsOrdenados(naA.body.items), [deA]);
    assert.deepEqual(idsOrdenados(naB.body.items), [emB]);
  });
});

// ── B9 (CA-8) — resolver ESTRITO: falha nunca vira 200 com menos OS.
test("B9 (CA-8) — resolver ausente → 503 unavailable; lança → 503 failed; undefined → só user id; sub não-UUID → 200", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ WorkOrderService }, { InMemoryWorkOrderRepository }] = await Promise.all([
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/work-orders/work-order.repository.js"),
  ]);
  const tenantId = randomUUID();
  const tecnico = randomUUID();
  const perfil = randomUUID();
  const repository = new InMemoryWorkOrderRepository();
  const pelaPessoa = await repository.create({
    tenantId, code: "OS-B9-1", title: "pelo user id", priority: "medium", status: "assigned", assignedOperatorId: tecnico,
  } as never);
  await repository.create({
    tenantId, code: "OS-B9-2", title: "pelo perfil", priority: "medium", status: "assigned", assignedOperatorId: perfil,
  } as never);
  const ator = { tenantId, userId: tecnico, roles: ["field_technician"], permissions: [] } as never;

  const semResolver = new WorkOrderService(repository, {});
  await assert.rejects(() => semResolver.list(ator, {}), (error: { statusCode: number; code: string; reason: string }) => {
    assert.equal(error.statusCode, 503);
    assert.equal(error.code, "WORK_ORDER_SCOPE_UNAVAILABLE");
    assert.equal(error.reason, "scope_resolver_unavailable");
    return true;
  });

  const lancando = new WorkOrderService(repository, {
    resolveActorOperatorProfileIdStrict: async () => {
      throw new Error("leitura de perfil caiu");
    },
  });
  await assert.rejects(() => lancando.list(ator, {}), (error: { statusCode: number; reason: string }) => {
    assert.equal(error.statusCode, 503);
    assert.equal(error.reason, "scope_resolution_failed");
    return true;
  });

  const semPerfil = new WorkOrderService(repository, { resolveActorOperatorProfileIdStrict: async () => undefined });
  const lista = await semPerfil.list(ator, {});
  assert.deepEqual(lista.items.map((item) => item.id), [pelaPessoa.id], "sem perfil: só o ramo user id");

  const comPerfil = new WorkOrderService(repository, { resolveActorOperatorProfileIdStrict: async () => perfil });
  assert.equal((await comPerfil.list(ator, {})).total, 2, "com perfil: os dois ramos");

  // `sub` de bancada (não-UUID): nenhum perfil pode existir — 200 determinístico, nem 503, nem chamada ao resolver.
  const naoUuid = { tenantId, userId: "tecnico.demo", roles: ["field_technician"], permissions: [] } as never;
  const resultado = await lancando.list(naoUuid, {});
  assert.equal(resultado.total, 0);

  // O resolver antigo (o do guard, que engole erro) NÃO é consultado pela lista.
  let antigoChamado = false;
  const soAntigo = new WorkOrderService(repository, {
    resolveActorOperatorProfileId: async () => {
      antigoChamado = true;
      return perfil;
    },
  });
  await assert.rejects(() => soAntigo.list(ator, {}), /lista das suas ordens/);
  assert.equal(antigoChamado, false);
});

// ── B11 (CA-10) — E1 do dono ("Só as abertas"): `openOnly=true` e o `status` do chamador convivem.
test("B11 (CA-10) — openOnly exclui completed/cancelled/rejected, mantém as 7 abertas; status=completed&openOnly=true → []", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ WorkOrderService }, { InMemoryWorkOrderRepository }, { WORK_ORDER_TERMINAL_STATUSES }] = await Promise.all([
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/work-orders/work-order.repository.js"),
    import("../src/modules/work-orders/work-order.validators.js"),
  ]);
  assert.deepEqual([...WORK_ORDER_TERMINAL_STATUSES].sort(), ["cancelled", "completed", "rejected"]);

  const tenantId = randomUUID();
  const tecnico = randomUUID();
  const repository = new InMemoryWorkOrderRepository();
  const abertas = ["open", "assigned", "accepted", "on_route", "on_site", "in_progress", "paused"];
  const terminais = ["completed", "cancelled", "rejected"];
  for (const status of [...abertas, ...terminais]) {
    await repository.create({
      tenantId, code: `OS-${status}`, title: status, priority: "medium", status, assignedOperatorId: tecnico,
    } as never);
  }
  const service = new WorkOrderService(repository, { resolveActorOperatorProfileIdStrict: async () => undefined });
  const ator = { tenantId, userId: tecnico, roles: ["field_technician"], permissions: [] } as never;
  const gestor = { tenantId, userId: randomUUID(), roles: ["manager"], permissions: [] } as never;

  const soAbertas = await service.list(ator, { openOnly: "true", limit: "100" });
  assert.deepEqual(soAbertas.items.map((item) => item.status).sort(), [...abertas].sort());
  assert.equal(soAbertas.total, 7);

  assert.deepEqual((await service.list(ator, { status: "completed", openOnly: "true" })).items, []);
  assert.deepEqual(
    (await service.list(ator, { status: "in_progress", openOnly: "true" })).items.map((item) => item.status),
    ["in_progress"],
    "o status do chamador continua valendo junto do openOnly",
  );
  assert.equal((await service.list(gestor, { limit: "100" })).total, 10, "sem openOnly → tudo (a web segue igual)");
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
