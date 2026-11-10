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
