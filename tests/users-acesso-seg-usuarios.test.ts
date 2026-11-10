import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { CoreSaasRegistry, Tenant, User } from "../src/core-saas.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG — as fatias de USUÁRIO no caminho de MEMÓRIA (o do job `backend` da CI), pela
// rota real (`src/app.js`, cadastro em memória). O caminho Prisma, sob papel NOSUPERUSER
// NOBYPASSRLS, vive em `tests/users-acesso-seg-usuarios-db.test.ts`.
//
//   S6 — e-mail duplicado é REQUISITO (ajuste 9 da crítica): na MESMA organização, o segundo
//        cadastro com o mesmo e-mail (comparado depois de aparar e baixar a caixa) é recusado com
//        409 `user_email_conflict` e não cria nada; em OUTRA organização o mesmo e-mail é aceito
//        (o e-mail nunca decide entre organizações).
//   S3 — a trava do administrador (Achado 2 do plano original, passo 1): o ator não se desativa
//        (409 `cannot_deactivate_self`) nem tira de si o papel de administrador (409
//        `cannot_demote_self`); e nenhuma mudança deixa a organização sem administrador ATIVO (409
//        `last_tenant_admin`, por desativação ou por rebaixamento). Administrador inativo não conta.
// -----------------------------------------------------------------------------------------------

type Seed = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
};

async function withApi(
  callback: (context: { readonly baseUrl: string; readonly seed: Seed; readonly core: CoreSaasRegistry }) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";

  const [{ app }, { coreSaasService }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/index.js"),
  ]);

  coreSaasService.reset();

  const tenantA = coreSaasService.createTenant({ name: "Organização A" });
  const tenantB = coreSaasService.createTenant({ name: "Organização B" });
  const adminA = coreSaasService.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = coreSaasService.createUser({
    tenantId: tenantB.id,
    name: "Admin B",
    email: "admin-b@example.com",
    roles: ["tenant_admin"],
  });
  const server = app.listen(0);

  try {
    const baseUrl = await getBaseUrl(server);

    await callback({ baseUrl, seed: { tenantA, tenantB, adminA, adminB }, core: coreSaasService });
  } finally {
    await closeServer(server);
  }
}

function asAdmin(tenant: Tenant, user: User): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": "tenant_admin",
  };
}

test("S6 (memória) — e-mail já usado na MESMA organização → 409 user_email_conflict e nada é criado; outra organização aceita", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const first = await requestJson(baseUrl, "/api/v1/users", {
      method: "POST",
      headers: asAdmin(seed.tenantA, seed.adminA),
      body: { name: "Fulano", email: "fulano@example.com", roles: ["operator"] },
    });

    assert.equal(first.status, 201);

    const usersBefore = core.listUsersForTenant(seed.tenantA.id).length;
    const auditBefore = core.getAuditEventsForTenant(seed.tenantA.id).length;

    // Mesma pessoa, grafia diferente: o serviço apara e baixa a caixa antes de comparar.
    const duplicate = await requestJson(baseUrl, "/api/v1/users", {
      method: "POST",
      headers: asAdmin(seed.tenantA, seed.adminA),
      body: { name: "Fulano de novo", email: "  FULANO@Example.com ", roles: ["viewer"] },
    });

    assert.equal(duplicate.status, 409, "o segundo cadastro com o mesmo e-mail é recusado");
    assert.equal(duplicate.body.error.code, "CONFLICT");
    assert.equal(duplicate.body.error.reason, "user_email_conflict");
    assert.equal(core.listUsersForTenant(seed.tenantA.id).length, usersBefore, "nenhum usuário novo");
    assert.equal(core.getAuditEventsForTenant(seed.tenantA.id).length, auditBefore, "nenhuma auditoria de criação");

    const otherOrganization = await requestJson(baseUrl, "/api/v1/users", {
      method: "POST",
      headers: asAdmin(seed.tenantB, seed.adminB),
      body: { name: "Fulano em B", email: "fulano@example.com", roles: ["operator"] },
    });

    assert.equal(otherOrganization.status, 201, "o e-mail não decide entre organizações");
  });
});

test("S3·m1 (memória, rota) — o administrador não se desativa: 409 cannot_deactivate_self e o status não muda", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const response = await requestJson(baseUrl, `/api/v1/users/${seed.adminA.id}`, {
      method: "PATCH",
      headers: asAdmin(seed.tenantA, seed.adminA),
      body: { status: "inactive" },
    });

    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "CONFLICT");
    assert.equal(response.body.error.reason, "cannot_deactivate_self");
    assert.equal(core.getUserForTenant(seed.adminA.id, seed.tenantA.id).status, "active");
  });
});

test("S3·m2 (memória, rota) — o administrador não tira de si o papel de administrador: 409 cannot_demote_self", async () => {
  await withApi(async ({ baseUrl, seed, core }) => {
    const response = await requestJson(baseUrl, `/api/v1/users/${seed.adminA.id}`, {
      method: "PATCH",
      headers: asAdmin(seed.tenantA, seed.adminA),
      body: { roles: ["manager"] },
    });

    assert.equal(response.status, 409);
    assert.equal(response.body.error.reason, "cannot_demote_self");
    assert.deepEqual([...core.getUserForTenant(seed.adminA.id, seed.tenantA.id).roles], ["tenant_admin"]);
  });
});

test("S3·m3 (memória, rota) — sem falso positivo: o ator muda o próprio nome e acrescenta papel mantendo o de administrador", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const rename = await requestJson(baseUrl, `/api/v1/users/${seed.adminA.id}`, {
      method: "PATCH",
      headers: asAdmin(seed.tenantA, seed.adminA),
      body: { name: "Admin A renomeado" },
    });

    assert.equal(rename.status, 200);

    const widen = await requestJson(baseUrl, `/api/v1/users/${seed.adminA.id}`, {
      method: "PATCH",
      headers: asAdmin(seed.tenantA, seed.adminA),
      body: { roles: ["tenant_admin", "manager"] },
    });

    assert.equal(widen.status, 200);
    assert.deepEqual([...widen.body.data.roles].sort(), ["manager", "tenant_admin"]);
  });
});

test("S3·m4 (memória, serviço) — nenhuma mudança deixa a organização sem administrador ativo; inativo não conta", async () => {
  const { CoreSaasRegistry: Registry } = await import("../src/core-saas.js");
  const core = new Registry();
  const tenant = core.createTenant({ name: "Organização com um administrador" });
  const admin = core.createUser({ tenantId: tenant.id, name: "Admin", email: "unico@example.com", roles: ["tenant_admin"] });
  const manager = core.createUser({ tenantId: tenant.id, name: "Gestor", email: "gestor@example.com", roles: ["manager"] });
  // O ator é outro usuário com poder de gerir usuários (aqui, o registro não confere permissão: quem
  // confere é a rota). O que se mede é a trava do serviço, que não depende de quem pede.
  const actor = {
    tenantId: tenant.id,
    userId: manager.id,
    roles: ["tenant_admin" as const],
    permissions: [],
    explicitPermissions: false,
  };
  const isLastAdmin = (error: unknown) =>
    (error as { statusCode?: number; reason?: string }).statusCode === 409 &&
    (error as { reason?: string }).reason === "last_tenant_admin";

  assert.throws(() => core.updateUser({ userId: admin.id, tenantId: tenant.id, status: "inactive" }, actor), isLastAdmin);
  assert.throws(() => core.updateUser({ userId: admin.id, tenantId: tenant.id, roles: ["manager"] }, actor), isLastAdmin);
  assert.equal(core.getUserForTenant(admin.id, tenant.id).status, "active", "nada mudou");

  // Um segundo administrador INATIVO não conta.
  const sleeping = core.createUser({
    tenantId: tenant.id,
    name: "Admin inativo",
    email: "inativo@example.com",
    roles: ["tenant_admin"],
    status: "inactive",
  });

  assert.throws(() => core.updateUser({ userId: admin.id, tenantId: tenant.id, status: "inactive" }, actor), isLastAdmin);

  // Reativá-lo destrava: agora há outro administrador ativo.
  core.updateUser({ userId: sleeping.id, tenantId: tenant.id, status: "active" }, actor);

  const deactivated = core.updateUser({ userId: admin.id, tenantId: tenant.id, status: "inactive" }, actor);

  assert.equal(deactivated.status, "inactive");
  assert.throws(
    () => core.updateUser({ userId: sleeping.id, tenantId: tenant.id, roles: ["manager"] }, actor),
    isLastAdmin,
    "o que sobrou é o último: rebaixá-lo também é recusado",
  );
});

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

  return { status: response.status, body: await response.json() };
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
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
