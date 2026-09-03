import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// B-O6R-07a · D3 (§3.3 do plano) — ESCOPO POR OBJETO NO CAMINHO DO TÉCNICO.
//
// O achado Ω6R-SEC-002: `work-order.service.ts` filtrava tenant + id + estado e mais nada. Um
// técnico de campo com `work_orders:update`/`:status` mutava QUALQUER ordem da organização — a do
// colega inclusive. A permissão dizia "pode editar ordem"; nunca disse "pode editar a ordem DE QUEM".
//
// VERMELHO-CONTROLE (§4, linha 3): no head-base o técnico A muta a OS do técnico B com 200. Registro
// em agent-orchestration/omega/juntas/votos/O6R-07a/dev-d1-d3-autorizacao.md.
//
// 403 `WORK_ORDER_NOT_ASSIGNED`, NÃO 404: a ordem existe na organização do ator e ele PODE lê-la
// (`work_orders:read` é tenant-wide e a lista do app depende disso). 404 segue reservado ao
// cross-tenant — contrato vigente que este bloco preserva e testa.

test("D3 — técnico só muta a ordem atribuída a ele (update e status)", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const osDoTecnicoA = await criarOsAtribuida(baseUrl, seed, seed.perfilA.id);
    const osDoTecnicoB = await criarOsAtribuida(baseUrl, seed, seed.perfilB.id);
    const osSemAtribuicao = await criarOs(baseUrl, seed);

    const headersA = authHeaders(seed.tenantA, seed.tecnicoA, "field_technician");

    // ── NEGATIVO 1: a ordem do COLEGA. É o caso do achado.
    const alheiaUpdate = await requestJson(baseUrl, `/api/v1/work-orders/${osDoTecnicoB}`, {
      method: "PATCH",
      headers: headersA,
      body: { title: "Sequestrada pelo tecnico A" },
    });
    const alheiaStatus = await requestJson(baseUrl, `/api/v1/work-orders/${osDoTecnicoB}/status`, {
      method: "PATCH",
      headers: headersA,
      body: { status: "accepted" },
    });

    // ── NEGATIVO 2: ordem SEM atribuição nenhuma. "Ninguém é dono" não pode significar "todos são".
    const orfaUpdate = await requestJson(baseUrl, `/api/v1/work-orders/${osSemAtribuicao}`, {
      method: "PATCH",
      headers: headersA,
      body: { title: "Ordem de ninguem" },
    });
    const orfaStatus = await requestJson(baseUrl, `/api/v1/work-orders/${osSemAtribuicao}/status`, {
      method: "PATCH",
      headers: headersA,
      body: { status: "accepted" },
    });

    for (const [nome, resposta] of Object.entries({ alheiaUpdate, alheiaStatus, orfaUpdate, orfaStatus })) {
      assert.equal(resposta.status, 403, `${nome} deveria ser 403 e veio ${resposta.status}`);
      assert.equal(resposta.body.error.code, "WORK_ORDER_NOT_ASSIGNED", `${nome}: code inesperado`);
      assert.equal(resposta.body.error.reason, "not_assigned_to_actor", `${nome}: reason inesperado`);
    }

    // A recusa não pode ter deixado efeito: o título da OS do colega segue o original.
    const alheiaDepois = await requestJson(baseUrl, `/api/v1/work-orders/${osDoTecnicoB}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(alheiaDepois.body.data.title, "OS de teste");

    // ── POSITIVO: a PRÓPRIA ordem. Sem ele o guard poderia ser "técnico não muta nada", que travaria
    // o app de campo inteiro e passaria nos negativos acima.
    const propriaUpdate = await requestJson(baseUrl, `/api/v1/work-orders/${osDoTecnicoA}`, {
      method: "PATCH",
      headers: headersA,
      body: { title: "Atualizada pelo dono" },
    });
    const propriaStatus = await requestJson(baseUrl, `/api/v1/work-orders/${osDoTecnicoA}/status`, {
      method: "PATCH",
      headers: headersA,
      body: { status: "accepted" },
    });

    assert.equal(propriaUpdate.status, 200);
    assert.equal(propriaUpdate.body.data.title, "Atualizada pelo dono");
    assert.equal(propriaStatus.status, 200);
    assert.equal(propriaStatus.body.data.status, "accepted");
  });
});

test("D3 — gestão segue tenant-wide: manager muta a ordem de qualquer técnico", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const osDoTecnicoB = await criarOsAtribuida(baseUrl, seed, seed.perfilB.id);

    // O manager não tem perfil de operador nenhum — e é exatamente por isso que o teste importa: um
    // guard que exigisse perfil de TODO MUNDO travaria o despacho, que é quem redistribui trabalho.
    const resposta = await requestJson(baseUrl, `/api/v1/work-orders/${osDoTecnicoB}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "Reorganizada pela gestao" },
    });

    assert.equal(resposta.status, 200);
    assert.equal(resposta.body.data.title, "Reorganizada pela gestao");
  });
});

test("D3 — ator com DOIS papéis: a união vence e quem tem gestão não cai no guard", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const osDoTecnicoB = await criarOsAtribuida(baseUrl, seed, seed.perfilB.id);

    // `x-role` aceita lista (parseHeaderList em authenticated-actor.middleware). O ator é técnico E
    // gestor — o risco nomeado no §7.2 do plano é o guard esconder ordem legítima de papel misto.
    // A resolução de permissão da casa é por UNIÃO; o escopo tem de seguir a mesma regra.
    const duplo = await requestJson(baseUrl, `/api/v1/work-orders/${osDoTecnicoB}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.tecnicoA, "field_technician,manager"),
      body: { title: "Editada por quem acumula funcao" },
    });

    assert.equal(duplo.status, 200);
    assert.equal(duplo.body.data.title, "Editada por quem acumula funcao");

    // O MESMO usuário, sem o papel de gestão no token, volta a ser escopado. A diferença é o papel,
    // não a pessoa — se o teste acima passasse por causa do usuário, este ficaria verde junto e a
    // dupla não provaria nada.
    const soCampo = await requestJson(baseUrl, `/api/v1/work-orders/${osDoTecnicoB}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.tecnicoA, "field_technician"),
      body: { title: "Sem o chapeu de gestor" },
    });

    assert.equal(soCampo.status, 403);
    assert.equal(soCampo.body.error.code, "WORK_ORDER_NOT_ASSIGNED");
  });
});

test("D3 — 404 continua sendo do cross-tenant: o 403 novo não o substituiu", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const osDaOrganizacaoA = await criarOsAtribuida(baseUrl, seed, seed.perfilA.id);

    // Técnico de OUTRA organização: a ordem não existe para ele, e continua não existindo. Trocar
    // isto por 403 confirmaria a EXISTÊNCIA da ordem a um estranho.
    const resposta = await requestJson(baseUrl, `/api/v1/work-orders/${osDaOrganizacaoA}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantB, seed.tecnicoB2, "field_technician"),
      body: { title: "De outra organizacao" },
    });

    assert.equal(resposta.status, 404);
  });
});

test("D3 — a classificação de escopo é exaustiva e a união é por presença", async () => {
  const { WORK_ORDER_MUTATION_SCOPE, actorMutatesAssignedOnly } = await import(
    "../src/modules/work-orders/work-order.types.js"
  );
  const { DEFAULT_ROLES } = await import("../src/modules/core-saas/permissions/catalog.js");

  // `satisfies Record<Role, …>` já reprovaria o `npm run check` com papel faltante; este teste é a
  // ponta de EXECUÇÃO da mesma verdade — o guard de tipo some numa refatoração para `Record<string,…>`
  // sem barulho nenhum, e aqui o buraco apareceria.
  for (const role of DEFAULT_ROLES) {
    assert.ok(
      role in WORK_ORDER_MUTATION_SCOPE,
      `papel ${role} sem classificação de escopo de mutação de OS`,
    );
  }

  const contexto = (roles: readonly string[]) =>
    ({ tenantId: randomUUID(), userId: randomUUID(), roles, permissions: [] }) as never;

  assert.equal(actorMutatesAssignedOnly(contexto(["field_technician"])), true);
  assert.equal(actorMutatesAssignedOnly(contexto(["technician"])), true);
  assert.equal(actorMutatesAssignedOnly(contexto(["field_technician", "manager"])), false);
  assert.equal(actorMutatesAssignedOnly(contexto(["manager"])), false);
  assert.equal(actorMutatesAssignedOnly(contexto(["operator"])), false);
  // Chamador interno sem papel (medido em work-order-checklists-sticky*.test.ts) NÃO é escopado — o
  // middleware HTTP já recusa `roles: []` com 403 role_required antes do serviço, então tratá-lo
  // como escopado não fecharia buraco de HTTP nenhum e quebraria composição interna.
  assert.equal(actorMutatesAssignedOnly(contexto([])), false);
});

// -----------------------------------------------------------------------------------------------
// B-O6R-07a · CICLO 2 (C2·4 do plano) — DUAL-MATCH no READ, opção (c).
//
// A tensão que a junta do ciclo 1 devolveu MEDIDA (achado `C1-A4`): o write do assign faz
// `operatorId: parseRequiredUuid(body.operatorId ?? body.userId)` (work-order.service.ts:1669), ou
// seja, quando o chamador manda `userId` — que é o que o app Flutter manda, componente `assign`
// ABERTO do `Ω6R-QUA-004` — o USER ID vai parar dentro de `assigned_operator_id`, que é campo de
// PERFIL. O guard deste bloco comparava só contra o perfil, então o técnico LEGITIMAMENTE atribuído
// recebia 403 no PATCH e no PATCH /status: um defeito operacional que o guard NOVO criou, e que
// travaria a fila offline do app de campo.
//
// O conserto é no READ, não no write: a atribuição prova-se por perfil OU por user id. Segurança:
// só quem porta `work_orders:assign` escreve o campo (o técnico não), logo o segundo ramo só concede
// a quem um ATRIBUIDOR nomeou. `Ω6R-QUA-004` SEGUE ABERTO com o dono dele — o write continua torto.
//
// VERMELHO-CONTROLE (C2·6 item 3): os três casos abaixo VERMELHOS no código pré-correção `9d44989`
// (o técnico nomeado por user id recebe 403). Registro em
// agent-orchestration/omega/juntas/votos/O6R-07a/dev-ciclo2.md, item D3.a.
// -----------------------------------------------------------------------------------------------

test("D3/DM1 — atribuído por USER ID (a forma que o app grava): o técnico nomeado muta update E status", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const os = await criarOsAtribuidaPorUserId(baseUrl, seed, seed.tecnicoA.id);
    const headersA = authHeaders(seed.tenantA, seed.tecnicoA, "field_technician");

    const update = await requestJson(baseUrl, `/api/v1/work-orders/${os}`, {
      method: "PATCH",
      headers: headersA,
      body: { title: "Editada por quem foi nomeado por user id" },
    });
    const status = await requestJson(baseUrl, `/api/v1/work-orders/${os}/status`, {
      method: "PATCH",
      headers: headersA,
      body: { status: "accepted" },
    });

    // As DUAS rotas guardadas pelo bloco — o 403 do ciclo 1 aparecia nas duas, e o conserto tem de
    // valer nas duas (o guard é um só, mas quem prova é a execução).
    assert.equal(update.status, 200, `PATCH /:id do técnico ATRIBUÍDO veio ${update.status}`);
    assert.equal(update.body.data.title, "Editada por quem foi nomeado por user id");
    assert.equal(status.status, 200, `PATCH /:id/status do técnico ATRIBUÍDO veio ${status.status}`);
    assert.equal(status.body.data.status, "accepted");
  });
});

test("D3/DM2 — o dual-match NÃO é permissão-a-mais: só o usuário nomeado passa, o colega segue 403", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const os = await criarOsAtribuidaPorUserId(baseUrl, seed, seed.tecnicoA.id);

    // O colega tem o MESMO papel e as MESMAS permissões; a única diferença é não ter sido nomeado.
    const colega = await requestJson(baseUrl, `/api/v1/work-orders/${os}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.tecnicoB, "field_technician"),
      body: { title: "Sequestrada pelo colega" },
    });

    assert.equal(colega.status, 403, `o colega NÃO nomeado veio ${colega.status}`);
    assert.equal(colega.body.error.code, "WORK_ORDER_NOT_ASSIGNED");
    assert.equal(colega.body.error.reason, "not_assigned_to_actor");

    // O par que dá sentido ao negativo: o nomeado passa. Sem ele, "403 para todos" ficaria verde
    // aqui e o teste não distinguiria conserto de guard caído.
    const nomeado = await requestJson(baseUrl, `/api/v1/work-orders/${os}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.tecnicoA, "field_technician"),
      body: { title: "Editada por quem foi nomeado" },
    });

    assert.equal(nomeado.status, 200, `o técnico NOMEADO veio ${nomeado.status}`);
    assert.equal(nomeado.body.data.title, "Editada por quem foi nomeado");

    // A recusa do colega não pode ter deixado efeito nenhum.
    const conferencia = await requestJson(baseUrl, `/api/v1/work-orders/${os}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(conferencia.body.data.title, "Editada por quem foi nomeado");
  });
});

test("D3/DM3 — as DUAS formas de atribuição coexistem e a fronteira 403/404 não se mexeu", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const porPerfil = await criarOsAtribuida(baseUrl, seed, seed.perfilA.id);
    const porUserId = await criarOsAtribuidaPorUserId(baseUrl, seed, seed.tecnicoA.id);
    const headersA = authHeaders(seed.tenantA, seed.tecnicoA, "field_technician");

    // Forma canônica ANTIGA (perfil): o ramo que já existia não pode ter sido SUBSTITUÍDO pelo novo.
    const viaPerfil = await requestJson(baseUrl, `/api/v1/work-orders/${porPerfil}`, {
      method: "PATCH",
      headers: headersA,
      body: { title: "Pela forma de perfil" },
    });
    assert.equal(viaPerfil.status, 200, `atribuição por PERFIL veio ${viaPerfil.status}`);

    // Forma canônica NOVA (user id): a que existe de fato no banco por causa do write torto.
    const viaUserId = await requestJson(baseUrl, `/api/v1/work-orders/${porUserId}`, {
      method: "PATCH",
      headers: headersA,
      body: { title: "Pela forma de user id" },
    });
    assert.equal(viaUserId.status, 200, `atribuição por USER ID veio ${viaUserId.status}`);

    // 404 do cross-tenant INTOCADO — o ramo novo não pode virar oráculo de existência para estranho.
    const estranho = await requestJson(baseUrl, `/api/v1/work-orders/${porUserId}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantB, seed.tecnicoB2, "field_technician"),
      body: { title: "De outra organizacao" },
    });
    assert.equal(estranho.status, 404, `cross-tenant veio ${estranho.status}, e tem de ser 404`);

    // Fail-closed preservado: OS SEM atribuição segue 403 — "ninguém é dono" não virou "todos são".
    const orfa = await criarOs(baseUrl, seed);
    const orfaResposta = await requestJson(baseUrl, `/api/v1/work-orders/${orfa}`, {
      method: "PATCH",
      headers: headersA,
      body: { title: "Ordem de ninguem" },
    });
    assert.equal(orfaResposta.status, 403, `OS órfã veio ${orfaResposta.status}`);
    assert.equal(orfaResposta.body.error.code, "WORK_ORDER_NOT_ASSIGNED");
  });
});

// Os usuários deste arnês são UUIDs CRUS, e não `core.createUser(...)`: o store em memória emite id
// no formato `usr-000001`, enquanto `users.id` é `@db.Uuid` no schema e `OperatorProfileService`
// valida `user_id` como UUID. Usar o formato de produção mantém o teste medindo o produto, não o
// arnês — e o contexto do ator vem inteiro do header (`tenantContextMiddleware`), então nenhum
// registro de usuário é necessário para exercer estas rotas.
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

async function criarOs(baseUrl: string, seed: SeedData): Promise<string> {
  const criada = await requestJson(baseUrl, "/api/v1/work-orders", {
    method: "POST",
    headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    body: { title: "OS de teste" },
  });
  assert.equal(criada.status, 201, `criação de OS falhou: ${JSON.stringify(criada.body)}`);
  return criada.body.data.id as string;
}

async function criarOsAtribuida(baseUrl: string, seed: SeedData, operatorProfileId: string): Promise<string> {
  const workOrderId = await criarOs(baseUrl, seed);
  const atribuida = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/assign`, {
    method: "POST",
    headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    body: { operatorId: operatorProfileId },
  });
  assert.equal(atribuida.status, 200, `atribuição falhou: ${JSON.stringify(atribuida.body)}`);
  assert.equal(atribuida.body.data.assignedOperatorId, operatorProfileId);
  return workOrderId;
}

// CICLO 2 (C2·4) — a atribuição na forma que o app de campo REALMENTE manda: corpo com `userId` e
// sem `operatorId`. Não é hipótese: `work-order.service.ts:1669` faz `body.operatorId ?? body.userId`
// e grava o resultado em `assigned_operator_id`, campo de PERFIL. A asserção abaixo é a prova
// executada dessa tensão (`Ω6R-QUA-004`, componente `assignWorkOrder`, que segue ABERTO).
async function criarOsAtribuidaPorUserId(baseUrl: string, seed: SeedData, userId: string): Promise<string> {
  const workOrderId = await criarOs(baseUrl, seed);
  const atribuida = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/assign`, {
    method: "POST",
    headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    body: { userId },
  });
  assert.equal(atribuida.status, 200, `atribuição por user id falhou: ${JSON.stringify(atribuida.body)}`);
  assert.equal(
    atribuida.body.data.assignedOperatorId,
    userId,
    "o write grava o USER ID no campo de perfil — é esta a forma que o dual-match do READ aceita",
  );
  return workOrderId;
}

async function withWorkOrderApi(
  callback: (context: { readonly baseUrl: string; readonly seed: SeedData }) => Promise<void>,
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
  const tenantA = core.createTenant({ name: "O6R07a Scope A", modules: ["work_orders"] });
  const tenantB = core.createTenant({ name: "O6R07a Scope B", modules: ["work_orders"] });
  const managerA: SeedUser = { id: randomUUID() };
  const tecnicoA: SeedUser = { id: randomUUID() };
  const tecnicoB: SeedUser = { id: randomUUID() };
  const tecnicoB2: SeedUser = { id: randomUUID() };

  // Os perfis profissionais são a ponte ator→`assigned_operator_id` (OperatorProfile é 1:1 com
  // (tenant_id, user_id)). Criados pelo serviço, o mesmo singleton que a rota /operator-profiles usa
  // em modo memória — e o mesmo que o resolver do work-order.service consulta.
  const profileService = await operatorProfileModule.createDefaultOperatorProfileService();
  const actorAdmin = { tenantId: tenantA.id, userId: managerA.id, roles: ["tenant_admin"], permissions: [] } as never;
  const perfilA = await profileService.create(actorAdmin, { user_id: tecnicoA.id, full_name: "Tecnico A" });
  const perfilB = await profileService.create(actorAdmin, { user_id: tecnicoB.id, full_name: "Tecnico B" });

  const seed: SeedData = { tenantA, tenantB, managerA, tecnicoA, tecnicoB, tecnicoB2, perfilA, perfilB };
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
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
