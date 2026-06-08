import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("Auth session tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute auth session tests.",
  });
} else {
  test("auth sessions support refresh rotation and logout revocation", async () => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_SECRET = "dev-only-refresh-change-me";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";

    const [
      { PrismaPg },
      { PrismaClient },
      { createApp },
      { CoreSaasRegistry, InMemoryCoreSaasStore, MemoryCoreSaasAdapter },
      { LocalAuthCredentialRepository, LocalAuthCredentialService, hashRefreshToken, verifyAccessToken },
    ] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/app.js"),
      import("../src/core-saas.js"),
      import("../src/modules/auth/index.js"),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `session-admin-${suffix}@example.com`;
    const password = "ChangeMe123!";
    const tenantIds: string[] = [];
    const userIds: string[] = [];
    const roleIds: string[] = [];
    let server: Server | undefined;

    try {
      const tenant = await client.tenant.create({
        data: {
          name: `Session Tenant ${suffix}`,
          slug: `session-tenant-${suffix}`,
        },
      });
      tenantIds.push(tenant.id);

      const user = await client.user.create({
        data: {
          tenant_id: tenant.id,
          name: "Session Admin",
          email,
        },
      });
      userIds.push(user.id);

      const role = await client.role.create({
        data: {
          tenant_id: tenant.id,
          key: "tenant_admin",
          name: "Tenant Admin",
          scope: "tenant",
        },
      });
      roleIds.push(role.id);

      await client.userRoleAssignment.create({
        data: {
          tenant_id: tenant.id,
          user_id: user.id,
          role_id: role.id,
        },
      });

      const credentialService = new LocalAuthCredentialService(
        new LocalAuthCredentialRepository(client),
        {
          findByIdForTenant: (userId, tenantId) =>
            client.user.findFirst({
              where: {
                id: userId,
                tenant_id: tenantId,
              },
              select: {
                id: true,
                tenant_id: true,
                email: true,
              },
            }),
        },
      );

      await credentialService.createCredentialForUser({
        tenant_id: tenant.id,
        user_id: user.id,
        email,
        password,
      });

      const app = createApp(
        new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())),
      );
      server = app.listen(0);
      const baseUrl = await getBaseUrl(server);

      const login = await requestJson(baseUrl, "/api/v1/auth/login", {
        tenantId: tenant.id,
        email,
        password,
      });

      assert.equal(login.status, 200);
      assert.equal(typeof login.body.data.access_token, "string");
      assert.equal(login.body.data.accessToken, login.body.data.access_token);
      assert.equal(typeof login.body.data.refresh_token, "string");
      assert.equal(login.body.data.refreshToken, login.body.data.refresh_token);
      assert.equal(typeof login.body.data.session_id, "string");

      const session = await client.authSession.findFirstOrThrow({
        where: {
          tenant_id: tenant.id,
          user_id: user.id,
        },
      });
      assert.equal(session.id, login.body.data.session_id);
      assert.equal(session.refresh_token_hash, hashRefreshToken(login.body.data.refresh_token));
      assert.notEqual(session.refresh_token_hash, login.body.data.refresh_token);

      const protectedRoute = await fetch(`${baseUrl}/api/v1/users`, {
        headers: {
          authorization: `Bearer ${login.body.data.access_token}`,
        },
      });
      assert.equal(protectedRoute.status, 200);

      const refresh = await requestJson(baseUrl, "/api/v1/auth/refresh", {
        refreshToken: login.body.data.refresh_token,
      });
      assert.equal(refresh.status, 200);
      assert.equal(typeof refresh.body.data.access_token, "string");
      assert.equal(typeof refresh.body.data.refresh_token, "string");
      assert.notEqual(refresh.body.data.refresh_token, login.body.data.refresh_token);

      const refreshedPayload = await verifyAccessToken(refresh.body.data.access_token);
      assert.equal(refreshedPayload.sub, user.id);
      assert.equal(refreshedPayload.tenant_id, tenant.id);

      const oldRefresh = await requestJson(baseUrl, "/api/v1/auth/refresh", {
        refreshToken: login.body.data.refresh_token,
      });
      assert.equal(oldRefresh.status, 401);

      const invalidRefresh = await requestJson(baseUrl, "/api/v1/auth/refresh", {
        refreshToken: "invalid.refresh.token",
      });
      assert.equal(invalidRefresh.status, 401);

      const logout = await requestJson(baseUrl, "/api/v1/auth/logout", {
        refreshToken: refresh.body.data.refresh_token,
      });
      assert.equal(logout.status, 200);
      assert.deepEqual(logout.body, {
        data: {
          revoked: true,
        },
      });

      const afterLogout = await requestJson(baseUrl, "/api/v1/auth/refresh", {
        refreshToken: refresh.body.data.refresh_token,
      });
      assert.equal(afterLogout.status, 401);

      const revokedSession = await client.authSession.findUniqueOrThrow({
        where: {
          id: session.id,
        },
      });
      assert.ok(revokedSession.revoked_at instanceof Date);
    } finally {
      if (server) {
        await closeServer(server);
      }

      await client.authSession.deleteMany({
        where: {
          tenant_id: {
            in: tenantIds,
          },
        },
      });
      await client.auditLog.deleteMany({
        where: {
          tenant_id: {
            in: tenantIds,
          },
        },
      });
      await client.localAuthCredential.deleteMany({
        where: {
          tenant_id: {
            in: tenantIds,
          },
        },
      });
      await client.userRoleAssignment.deleteMany({
        where: {
          tenant_id: {
            in: tenantIds,
          },
        },
      });
      await client.role.deleteMany({
        where: {
          id: {
            in: roleIds,
          },
        },
      });
      await client.user.deleteMany({
        where: {
          id: {
            in: userIds,
          },
        },
      });
      await client.tenant.deleteMany({
        where: {
          id: {
            in: tenantIds,
          },
        },
      });
      await client.$disconnect();
    }
  });
}

async function requestJson(baseUrl: string, path: string, body: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
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
