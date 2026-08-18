import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { signAccessToken } from "../src/modules/auth/index.js";
import {
  DEFAULT_ROLES,
  PLATFORM_ROLES,
  TENANT_ASSIGNABLE_ROLES,
  RoleNotAssignableError,
  assertAssignableRole,
} from "../src/modules/core-saas/permissions/catalog.js";
import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { PrismaCoreSaasStore } from "../src/modules/core-saas/store/prisma-core-saas.store.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import { CoreSaasError } from "../src/modules/core-saas/types/core-saas.types.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 (Ω6R-SEC-001, §4 do plano) — a allowlist fechada por construção. O defeito que este
// arquivo mata: `users.manage` numa organização atribuía super_admin/platform_admin, e o portador
// passava a operar /api/v1/platform/* contra TODAS as organizações (platform-permissions.ts
// concede plataforma pela presença do papel). Cada teste nomeia o vetor que fecha.
// -----------------------------------------------------------------------------------------------

test("guard de exaustividade (nível runtime): PLATFORM ∪ TENANT_ASSIGNABLE == DEFAULT_ROLES, sem interseção", () => {
  // O nível 1 é o tipo (_RolePartitionIsExhaustive em catalog.ts — papel novo sem classificação
  // não compila). Este é o nível 2: os VALORES particionam o catálogo exatamente.
  const union = new Set<string>([...PLATFORM_ROLES, ...TENANT_ASSIGNABLE_ROLES]);

  assert.deepEqual([...union].sort(), [...DEFAULT_ROLES].sort());
  assert.equal(PLATFORM_ROLES.length + TENANT_ASSIGNABLE_ROLES.length, DEFAULT_ROLES.length);

  for (const role of PLATFORM_ROLES) {
    assert.equal(
      (TENANT_ASSIGNABLE_ROLES as readonly string[]).includes(role),
      false,
      `papel de plataforma ${role} não pode ser atribuível por tenant`,
    );
  }
});

test("allowlist não gananciosa: todo papel NÃO-plataforma segue atribuível", () => {
  for (const role of TENANT_ASSIGNABLE_ROLES) {
    assert.equal(assertAssignableRole(role), role);
  }

  for (const role of PLATFORM_ROLES) {
    assert.throws(() => assertAssignableRole(role), RoleNotAssignableError);
  }
});

test("escalada no CREATE (memória): roles [platform] → 403 role_not_assignable; nada é criado", () => {
  const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = service.createTenant({ name: "Org SEC-001" });

  for (const role of PLATFORM_ROLES) {
    assert.throws(
      () => {
        service.createUser({
          tenantId: tenant.id,
          name: "Escalador",
          email: `escalador-${role}@example.com`,
          roles: [role],
        });
      },
      (error: unknown) => {
        assert.ok(error instanceof RoleNotAssignableError);
        assert.equal(error.statusCode, 403);
        assert.equal(error.reason, "role_not_assignable");

        return true;
      },
    );
  }

  assert.deepEqual(
    service.listUsersForTenant(tenant.id).map((user) => user.email),
    [],
    "a tentativa de escalada não pode deixar usuário parcial para trás",
  );
});

test("escalada no UPDATE/self (memória): PATCH dos próprios papéis para plataforma → 403; papéis intactos", () => {
  const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = service.createTenant({ name: "Org SEC-001 self" });
  const admin = service.createUser({
    tenantId: tenant.id,
    name: "Admin",
    email: "admin-sec001@example.com",
    roles: ["tenant_admin"],
  });

  assert.throws(
    () => {
      service.updateUser(
        { userId: admin.id, tenantId: tenant.id, roles: ["super_admin"] },
        { tenantId: tenant.id, userId: admin.id, roles: ["tenant_admin"], permissions: [], explicitPermissions: false },
      );
    },
    (error: unknown) => error instanceof RoleNotAssignableError,
  );

  assert.deepEqual(service.getUserForTenant(admin.id, tenant.id).roles, ["tenant_admin"]);
});

test("papel INVÁLIDO segue 400 invalid_role (500→400 de carona), nunca 403", () => {
  const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = service.createTenant({ name: "Org papel inválido" });

  assert.throws(
    () => {
      service.createUser({
        tenantId: tenant.id,
        name: "Bogus",
        email: "bogus@example.com",
        roles: ["nao_existe"],
      });
    },
    (error: unknown) => {
      assert.ok(error instanceof CoreSaasError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.reason, "invalid_role");

      return true;
    },
  );
});

test("o escritor SEM ROTA (store.assignRoleToUser, caminho prisma) recusa papel de plataforma antes de tocar o banco", async () => {
  // O assert roda ANTES de qualquer conexão: a recusa é provável sem DATABASE_URL — exatamente
  // o ponto (nenhum caminho de código atribui plataforma por fluxo de tenant, com ou sem rota).
  const store = new PrismaCoreSaasStore();

  await assert.rejects(
    store.assignRoleToUser({
      tenantId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      role: "platform_admin",
    }),
    RoleNotAssignableError,
  );
});

test("ponta a ponta HTTP: tenant_admin tenta criar/promover platform_admin → 403; a rota de plataforma segue 403 para ele", async () => {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  const { createApp } = await import("../src/app.js");
  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = registry.createTenant({ name: "Org ponta-a-ponta" });
  const admin = registry.createUser({
    tenantId: tenant.id,
    name: "Admin E2E",
    email: "admin-e2e-sec001@example.com",
    roles: ["tenant_admin"],
  });
  const app = createApp(new MemoryCoreSaasAdapter(registry));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    const token = await signAccessToken({
      user_id: admin.id,
      tenant_id: tenant.id,
      email: admin.email,
      roles: ["tenant_admin"],
    });

    // CREATE com papel de plataforma → 403 role_not_assignable.
    const createResponse = await requestJson(baseUrl, "/api/v1/users", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: {
        name: "Escalador HTTP",
        email: "escalador-http@example.com",
        roles: ["platform_admin"],
      },
    });

    assert.equal(createResponse.status, 403);
    assert.equal(createResponse.body.error.reason, "role_not_assignable");

    // PATCH self com papel de plataforma → 403; papéis intactos.
    const patchResponse = await requestJson(baseUrl, `/api/v1/users/${admin.id}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: { roles: ["super_admin"] },
    });

    assert.equal(patchResponse.status, 403);
    assert.equal(patchResponse.body.error.reason, "role_not_assignable");
    assert.deepEqual(registry.getUserForTenant(admin.id, tenant.id).roles, ["tenant_admin"]);

    // Pós-403: o MESMO token não alcança a rota de plataforma (o papel nunca chegou ao ator).
    const platformResponse = await requestJson(baseUrl, "/api/v1/platform/tenants", {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(platformResponse.status, 403);
    assert.equal(platformResponse.body.error.reason, "platform_permission_required");
  } finally {
    await closeServer(server);
  }
});

async function requestJson(
  baseUrl: string,
  pathName: string,
  init: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: Record<string, unknown>;
  } = {},
) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });

  return {
    status: response.status,
    body: await response.json(),
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
