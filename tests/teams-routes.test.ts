import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("POST /teams cria equipe e retorna 201 sem vazar tenant", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        name: "Equipe Guincho Matriz",
        leader_user_id: seed.leaderA.id,
        status: "active",
        notes: "Equipe da matriz.",
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.name, "Equipe Guincho Matriz");
    assert.equal(created.body.data.leaderUserId, seed.leaderA.id);
    assert.equal(created.body.data.status, "active");
    assert.equal(created.body.data.isActive, true);
    assert.equal(created.body.data.memberCount, 0);
    assert.deepEqual(created.body.data.members, []);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.equal(created.body.data.tenantId, undefined);
    assert.ok(created.body.data.id);
  });
});

test("POST /teams sem status usa 'active' por padrao", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Sem Status" },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "active");
    assert.equal(created.body.data.leaderUserId, null);
  });
});

test("GET /teams pagina e filtra por nome via ?search", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Alfa" },
    });
    await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Bravo" },
    });

    const paged = await requestJson(baseUrl, "/api/v1/teams?limit=1", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const searched = await requestJson(baseUrl, "/api/v1/teams?search=Alfa", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(paged.status, 200);
    assert.equal(paged.body.items.length, 1);
    assert.equal(paged.body.pagination.total, 2);
    assert.equal(paged.body.pagination.limit, 1);
    assert.equal(searched.body.items.length, 1);
    assert.equal(searched.body.items[0].name, "Equipe Alfa");
  });
});

test("GET /teams/:id retorna a equipe com a lista de membros", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Detalhe" },
    });
    await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}/members`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { userId: seed.memberA.id, roleInTeam: "operador" },
    });

    const detailed = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(detailed.status, 200);
    assert.equal(detailed.body.data.id, created.body.data.id);
    assert.equal(detailed.body.data.memberCount, 1);
    assert.equal(detailed.body.data.members.length, 1);
    assert.equal(detailed.body.data.members[0].userId, seed.memberA.id);
    assert.equal(detailed.body.data.members[0].roleInTeam, "operador");
  });
});

test("PATCH /teams/:id atualiza campos", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Editavel", status: "active" },
    });
    const updated = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { status: "archived", name: "Equipe Renomeada" },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.status, "archived");
    assert.equal(updated.body.data.name, "Equipe Renomeada");
  });
});

test("PATCH /teams/:id { is_active:false } desativa e o filtro ?is_active=false reflete", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Ativa" },
    });
    const deactivated = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { is_active: false },
    });
    const inactiveList = await requestJson(baseUrl, "/api/v1/teams?is_active=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const activeList = await requestJson(baseUrl, "/api/v1/teams?is_active=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(inactiveList.body.items.length, 1);
    assert.equal(inactiveList.body.items[0].id, created.body.data.id);
    assert.equal(activeList.body.items.length, 0);
  });
});

test("[isolamento] GET /teams/:id de outra organizacao retorna 404", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Tenant A" },
    });
    const crossTenant = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "not_found");
  });
});

test("[isolamento] a lista da organizacao B nunca contem itens da organizacao A", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe A-1" },
    });
    await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe A-2" },
    });
    await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { name: "Equipe B-1" },
    });

    const listA = await requestJson(baseUrl, "/api/v1/teams", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const listB = await requestJson(baseUrl, "/api/v1/teams", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(listA.status, 200);
    assert.equal(listA.body.pagination.total, 2);
    assert.equal(listB.body.pagination.total, 1);
    assert.deepEqual(
      listB.body.items.map((item: { name: string }) => item.name),
      ["Equipe B-1"],
    );
  });
});

test("[isolamento] POST forjando tenant_id no corpo e ignorado; o registro pertence ao tenant do claim", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        name: "Equipe Forjada",
        tenant_id: seed.tenantB.id,
        tenantId: seed.tenantB.id,
      },
    });
    const fromClaimTenant = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const fromForgedTenant = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(created.status, 201);
    assert.equal(fromClaimTenant.status, 200);
    assert.equal(fromForgedTenant.status, 404);
  });
});

test("[isolamento] POST nome duplicado no mesmo tenant retorna 409; mesmo nome em outro tenant retorna 201", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const first = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Unica" },
    });
    const duplicateSameTenant = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Unica" },
    });
    const sameNameOtherTenant = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { name: "Equipe Unica" },
    });

    assert.equal(first.status, 201);
    assert.equal(duplicateSameTenant.status, 409);
    assert.equal(duplicateSameTenant.body.error.reason, "duplicate_name");
    assert.equal(sameNameOtherTenant.status, 201);
  });
});

test("[isolamento] POST sem permissao de escrita (operator) retorna 403; sem headers retorna 403", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const asOperator = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { name: "Equipe Sem Permissao" },
    });
    const unauthenticated = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      body: { name: "Equipe Anonima" },
    });

    assert.equal(asOperator.status, 403);
    assert.equal(unauthenticated.status, 403);
  });
});

test("POST /teams/:id/members adiciona um usuario do proprio tenant e retorna 201", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Com Membros", leader_user_id: seed.leaderA.id },
    });
    const added = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}/members`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { userId: seed.memberA.id, roleInTeam: "operador" },
    });

    assert.equal(added.status, 201);
    assert.equal(added.body.data.userId, seed.memberA.id);
    assert.equal(added.body.data.roleInTeam, "operador");
  });
});

test("POST /teams/:id/members com membro duplicado retorna 409", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Duplicada" },
    });
    const first = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}/members`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { userId: seed.memberA.id },
    });
    const duplicate = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}/members`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { userId: seed.memberA.id },
    });

    assert.equal(first.status, 201);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.reason, "duplicate_member");
  });
});

test("DELETE /teams/:id/members/:userId remove o vinculo; remocao repetida retorna 404", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Remocao" },
    });
    await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}/members`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { userId: seed.memberA.id },
    });

    const removed = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}/members/${seed.memberA.id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const removedAgain = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}/members/${seed.memberA.id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(removed.status, 200);
    assert.equal(removedAgain.status, 404);
    assert.equal(removedAgain.body.error.reason, "member_not_found");
  });
});

test("[isolamento] operacoes de membro sem teams:update (operator) retornam 403", async () => {
  await withTeamApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Protegida" },
    });
    await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}/members`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { userId: seed.memberA.id },
    });

    const addAsOperator = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}/members`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { userId: seed.leaderA.id },
    });
    const removeAsOperator = await requestJson(baseUrl, `/api/v1/teams/${created.body.data.id}/members/${seed.memberA.id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
    });

    assert.equal(addAsOperator.status, 403);
    assert.equal(removeAsOperator.status, 403);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly operatorA: User;
  readonly leaderA: User;
  readonly memberA: User;
};

type TeamApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withTeamApi(callback: (context: TeamApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetTeamRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/teams/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetTeamRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetTeamRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Teams A",
    modules: ["dashboard", "work_orders"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Teams B",
    modules: ["dashboard", "work_orders"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "teams-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "teams-manager-b@example.com",
    roles: ["manager"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "teams-operator-a@example.com",
    roles: ["operator"],
  });
  const leaderA = service.createUser({
    tenantId: tenantA.id,
    name: "Leader A",
    email: "teams-leader-a@example.com",
    roles: ["technician"],
  });
  const memberA = service.createUser({
    tenantId: tenantA.id,
    name: "Member A",
    email: "teams-member-a@example.com",
    roles: ["technician"],
  });

  return { tenantA, tenantB, managerA, managerB, operatorA, leaderA, memberA };
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
  };
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
