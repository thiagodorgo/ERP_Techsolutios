import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

const TOKEN_INPUT = {
  user_id: "11111111-1111-4111-8111-111111111111",
  tenant_id: "22222222-2222-4222-8222-222222222222",
  email: "provisoria@example.com",
  roles: ["super_admin", "platform_admin", "tenant_admin", "manager", "operator", "field_technician"],
} as const;

test("A1 — token password_change é recusado pelo portão antes de qualquer rota protegida", async () => {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  process.env.JWT_SECRET = "dev-only-change-me";

  const [
    { createApp },
    { signAccessToken },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/auth/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  const token = await signAccessToken({ ...TOKEN_INPUT, scope: "password_change" } as never);
  const server = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore()))).listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    const cases = [
      ["GET", "/api/v1/mobile/bootstrap"],
      ["POST", "/api/v1/mobile/sync/work-order-actions"],
      ["GET", "/api/v1/platform/tenants"],
      ["GET", "/api/v1/users"],
      ["POST", "/api/v1/auth/active-tenant"],
      ["POST", "/api/v1/auth/identity-links"],
      ["POST", "/api/v1/auth/users/33333333-3333-4333-8333-333333333333/reset-password"],
    ] as const;

    for (const [method, path] of cases) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: method === "GET" ? undefined : "{}",
      });
      const body = (await response.json()) as { error?: { reason?: string } };

      assert.equal(response.status, 403, `${method} ${path}`);
      assert.equal(body.error?.reason, "password_change_required", `${method} ${path}`);
    }
  } finally {
    await closeServer(server);
  }
});

test("A9 — scope desconhecido falha fechado como INVALID_TOKEN", async () => {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  process.env.JWT_SECRET = "dev-only-change-me";

  const [{ createApp }, { signAccessToken }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/auth/index.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
    ]);
  const token = await signAccessToken({ ...TOKEN_INPUT, scope: "outra" } as never);
  const server = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore()))).listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    const response = await fetch(`${baseUrl}/api/v1/mobile/bootstrap`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as { error?: { code?: string } };

    assert.equal(response.status, 401);
    assert.equal(body.error?.code, "INVALID_TOKEN");
  } finally {
    await closeServer(server);
  }
});

test("A10 — POST /auth/password aceita a sessão password_change", async () => {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  const [{ default: express }, { createIdentityLinkRouter, signAccessToken }] = await Promise.all([
    import("express"),
    import("../src/modules/auth/index.js"),
  ]);
  const token = await signAccessToken({ ...TOKEN_INPUT, scope: "password_change", roles: [] });
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1/auth",
    createIdentityLinkRouter(async () => ({
      changeOwnPassword: async () => ({ revokedSessions: 1, unlinked: false }),
    }) as never),
  );
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/password`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: "SenhaProvisoria!", newPassword: "SenhaDefinitiva!" }),
    });
    const body = (await response.json()) as { error?: { reason?: string } };
    assert.equal(response.status, 200);
    assert.notEqual(body.error?.reason, "password_change_required");
  } finally {
    await closeServer(server);
  }
});

test("A3-U — resolveAccessTokenScope falha fechado: só `false` estrito dá sessão inteira", async () => {
  const { resolveAccessTokenScope } = await import("../src/modules/auth/services/access-token-scope.js");
  const roles = ["tenant_admin", "operator"];

  for (const lost of [undefined, null, "false", 0, true] as const) {
    const scope = resolveAccessTokenScope(lost as never, roles);
    assert.equal(scope.scope, "password_change", `valor perdido ${String(lost)} restringe`);
    assert.deepEqual([...scope.roles], [], `valor perdido ${String(lost)} esvazia os papéis`);
    assert.equal(scope.restricted, true);
  }

  const full = resolveAccessTokenScope(false, roles);
  assert.equal("scope" in full && full.scope !== undefined, false, "false estrito não põe scope");
  assert.deepEqual([...full.roles], roles);
  assert.equal(full.restricted, false);
});

async function getBaseUrl(server: Server): Promise<string> {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", resolve));
  }
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
