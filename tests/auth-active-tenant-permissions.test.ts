import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { resolvePermissionsForRoles } from "../src/modules/core-saas/permissions/catalog.js";

// -----------------------------------------------------------------------------------------------
// B-DASH-PERFIL, ciclo 2 (plano §2.5 B). O contrato do POST /api/v1/auth/active-tenant passa a ser
// provado por HTTP, não por regex sobre o fonte: o router real, o core-saas em memória e um JWT
// real. A resposta 200 traz EXATAMENTE o catálogo do papel; o pedido de outra organização falha
// fechado (403) sem fabricar permissão. Mutações que estes casos deixam vermelhos: M3, M2, M6.
// Roda sem banco: a sessão de refresh é um dublê injetado e o core-saas é o registry em memória.
// -----------------------------------------------------------------------------------------------

test("catálogo devolvido distingue Financeiro, Estoque e Suporte", () => {
  const finance = resolvePermissionsForRoles(["finance"]);
  const inventory = resolvePermissionsForRoles(["inventory"]);
  const support = resolvePermissionsForRoles(["support"]);

  assert.ok(finance.includes("financial_entries:read"));
  assert.equal(finance.includes("dashboard:read"), false);
  assert.ok(inventory.includes("inventory_items:read"));
  assert.equal(inventory.includes("dashboard:read"), false);
  assert.ok(support.includes("dashboard:read"));
  assert.equal(support.includes("work_orders:read"), false);
});

const ROLES_UNDER_TEST = ["finance", "inventory", "support"] as const;

type RoleUnderTest = (typeof ROLES_UNDER_TEST)[number];

type SeededUser = {
  readonly id: string;
  readonly email: string;
};

type ActiveTenantHarness = {
  readonly baseUrl: string;
  readonly tenantAId: string;
  readonly tenantBId: string;
  readonly tokenFor: (role: RoleUnderTest) => Promise<string>;
  readonly close: () => Promise<void>;
};

for (const role of ROLES_UNDER_TEST) {
  test(`active-tenant devolve exatamente o catálogo do papel: ${role}`, async () => {
    const harness = await buildActiveTenantHarness();

    try {
      const response = await postActiveTenant(harness.baseUrl, await harness.tokenFor(role), {
        tenantId: harness.tenantAId,
      });

      assert.equal(response.status, 200);
      const data = response.body.data as { permissions: string[]; roles: string[] };
      assert.deepEqual([...data.permissions].sort(), [...resolvePermissionsForRoles([role])].sort());
      assert.deepEqual(data.roles, [role]);

      if (role === "support") {
        assert.equal(data.permissions.includes("dashboard:read"), true);
        assert.equal(data.permissions.includes("work_orders:read"), false);
      } else {
        assert.equal(data.permissions.includes("dashboard:read"), false);
        assert.equal(data.permissions.includes("dashboard:view"), false);
      }
    } finally {
      await harness.close();
    }
  });
}

test("active-tenant cross-tenant falha fechado e não fabrica permissão", async () => {
  const harness = await buildActiveTenantHarness();

  try {
    const response = await postActiveTenant(harness.baseUrl, await harness.tokenFor("finance"), {
      tenantId: harness.tenantBId,
    });

    assert.equal(response.status, 403);
    assert.equal((response.body.error as { code?: string } | undefined)?.code, "FORBIDDEN");
    assert.equal(response.body.data, undefined);
  } finally {
    await harness.close();
  }
});

// -----------------------------------------------------------------------------------------------
// Arnês: espelho de tests/o6r07a-login-rate-limit.test.ts (express + createAuthRouter + listen(0))
// e de tests/actor-aware-routes.test.ts (CoreSaasRegistry em memória + signAccessToken real, com
// JWT_SECRET setado ANTES do import dinâmico). O active-tenant já monta attachAuthenticatedActor()
// por dentro; o vínculo (tenant, usuário) do token nasce na própria registry.
// -----------------------------------------------------------------------------------------------
async function buildActiveTenantHarness(): Promise<ActiveTenantHarness> {
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";
  process.env.LOG_LEVEL = "silent";

  const { default: express } = await import("express");
  const { createAuthRouter } = await import("../src/modules/auth/routes/auth.routes.js");
  const { signAccessToken } = await import("../src/modules/auth/services/jwt.service.js");
  const { CoreSaasRegistry } = await import("../src/modules/core-saas/services/core-saas.service.js");
  const { MemoryCoreSaasAdapter } = await import("../src/modules/core-saas/services/memory-core-saas.adapter.js");
  const { InMemoryCoreSaasStore } = await import("../src/modules/core-saas/store/core-saas.store.js");

  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = registry.createTenant({ name: "Org Ativa A" });
  const tenantB = registry.createTenant({ name: "Org Alheia B" });
  const users = Object.fromEntries(
    ROLES_UNDER_TEST.map((role) => {
      const user = registry.createUser({
        tenantId: tenantA.id,
        name: `Usuário ${role}`,
        email: `${role}@org-a.example.com`,
        roles: [role],
      });

      return [role, { id: user.id, email: user.email }];
    }),
  ) as Record<RoleUnderTest, SeededUser>;

  const sessionServiceDouble = {
    createSession: async () => ({
      sessionId: "s-teste",
      refreshToken: "r-teste",
      refreshTokenExpiresAt: new Date(Date.now() + 60_000),
      refreshTokenExpiresIn: 60,
    }),
  } as unknown as AuthSessionService;

  const app = express();

  app.use(express.json());
  app.use(
    "/api/v1/auth",
    createAuthRouter({
      getCoreSaasService: async () => new MemoryCoreSaasAdapter(registry),
      getSessionService: async () => sessionServiceDouble,
    }),
  );

  const server: Server = app.listen(0);

  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    tenantAId: tenantA.id,
    tenantBId: tenantB.id,
    tokenFor: (role: RoleUnderTest) =>
      signAccessToken({
        user_id: users[role].id,
        tenant_id: tenantA.id,
        email: users[role].email,
        roles: [role],
      }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

type AuthSessionService = import("../src/modules/auth/services/auth-session.service.js").AuthSessionService;

async function postActiveTenant(
  baseUrl: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${baseUrl}/api/v1/auth/active-tenant`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}
