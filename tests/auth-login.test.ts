import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("Auth login tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute auth login tests.",
  });
} else {
  test("POST /api/v1/auth/login authenticates local credentials without issuing tokens", async () => {
    process.env.LOG_LEVEL = "silent";

    const [
      { PrismaPg },
      { PrismaClient },
      { createApp },
      { CoreSaasRegistry, InMemoryCoreSaasStore, MemoryCoreSaasAdapter },
      { LocalAuthCredentialRepository, LocalAuthCredentialService },
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
    const email = `login-admin-${suffix}@example.com`;
    const password = "ChangeMe123!";
    const tenantIds: string[] = [];
    const userIds: string[] = [];
    const roleIds: string[] = [];
    let server: Server | undefined;

    try {
      const tenant = await client.tenant.create({
        data: {
          name: `Login Tenant ${suffix}`,
          slug: `login-tenant-${suffix}`,
        },
      });
      tenantIds.push(tenant.id);

      const user = await client.user.create({
        data: {
          tenant_id: tenant.id,
          name: "Login Admin",
          email,
        },
      });
      userIds.push(user.id);

      const role = await client.role.create({
        data: {
          tenant_id: tenant.id,
          key: `login_admin_${suffix}`,
          name: "Login Admin",
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

      const wrongPassword = await requestJson(baseUrl, {
        tenantId: tenant.id,
        email,
        password: "WrongPassword123!",
      });
      assert.equal(wrongPassword.status, 401);
      assert.deepEqual(wrongPassword.body, {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials.",
        },
      });

      const afterFailure = await client.localAuthCredential.findUnique({
        where: {
          tenant_id_email: {
            tenant_id: tenant.id,
            email,
          },
        },
      });
      assert.equal(afterFailure?.failed_attempts, 1);

      const missingEmail = await requestJson(baseUrl, {
        tenantId: tenant.id,
        email: `missing-${email}`,
        password,
      });
      assert.equal(missingEmail.status, 401);
      assert.deepEqual(missingEmail.body, wrongPassword.body);

      const missingTenant = await requestJson(baseUrl, {
        tenantId: "11111111-1111-4111-8111-111111111111",
        email,
        password,
      });
      assert.equal(missingTenant.status, 401);
      assert.deepEqual(missingTenant.body, wrongPassword.body);

      const invalidTenant = await requestJson(baseUrl, {
        tenantId: "not-a-uuid",
        email,
        password,
      });
      assert.equal(invalidTenant.status, 400);
      assert.equal(invalidTenant.body.error.code, "BAD_REQUEST");

      const invalidBody = await requestJson(baseUrl, {
        tenantId: tenant.id,
        email,
      });
      assert.equal(invalidBody.status, 400);
      assert.equal(invalidBody.body.error.code, "BAD_REQUEST");

      const success = await requestJson(baseUrl, {
        tenantId: tenant.id,
        email: email.toUpperCase(),
        password,
      });
      assert.equal(success.status, 200);
      assert.equal(success.body.data.authenticated, true);
      assert.deepEqual(success.body.data.user, {
        id: user.id,
        tenant_id: tenant.id,
        email,
        name: "Login Admin",
        status: "active",
      });
      assert.deepEqual(success.body.data.tenant, {
        id: tenant.id,
        name: tenant.name,
      });
      assert.deepEqual(success.body.data.roles, [
        {
          id: role.id,
          key: role.key,
          name: role.name,
        },
      ]);
      assert.equal(success.body.data.next.token_required, true);
      assert.equal(
        success.body.data.next.message,
        "JWT access token will be issued in a later auth block.",
      );

      const successJson = JSON.stringify(success.body);
      assert.equal(successJson.includes("password_hash"), false);
      assert.equal(successJson.includes("access_token"), false);
      assert.equal(successJson.includes("refresh_token"), false);

      const afterSuccess = await client.localAuthCredential.findUnique({
        where: {
          tenant_id_email: {
            tenant_id: tenant.id,
            email,
          },
        },
      });
      assert.equal(afterSuccess?.failed_attempts, 0);
      assert.ok(afterSuccess?.last_login_at instanceof Date);

      const auditActions = await client.auditLog.findMany({
        where: {
          tenant_id: tenant.id,
          action: {
            in: ["auth.login.success", "auth.login.failed"],
          },
        },
        orderBy: {
          created_at: "asc",
        },
      });
      assert.equal(
        auditActions.some((event) => event.action === "auth.login.failed"),
        true,
      );
      assert.equal(
        auditActions.some((event) => event.action === "auth.login.success"),
        true,
      );
      assert.equal(
        JSON.stringify(auditActions.map((event) => event.metadata)).includes(password),
        false,
      );
    } finally {
      if (server) {
        await closeServer(server);
      }

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

async function requestJson(baseUrl: string, body: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
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
