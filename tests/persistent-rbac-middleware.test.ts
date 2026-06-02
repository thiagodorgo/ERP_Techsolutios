import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

test("memory/default runtime keeps JWT catalog authorization without opening Prisma", async () => {
  const result = await runMemoryRuntimeCheck();

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data.map((user: { email: string }) => user.email), [
    "memory-rbac-admin@example.com",
  ]);
});

if (!connectionString) {
  test("Persistent RBAC middleware tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute persistent RBAC middleware tests.",
  });
} else {
  test("persistent RBAC middleware enriches JWT protected routes from stored assignments", async () => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";

    const [
      { PrismaPg },
      { PrismaClient },
      { createApp },
      { signAccessToken },
      { PrismaCoreSaasService },
      { PrismaCoreSaasStore },
      {
        AuditLogRepository,
        RoleRepository,
        TenantRepository,
        UserRepository,
        UserRoleRepository,
      },
    ] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/app.js"),
      import("../src/modules/auth/index.js"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const service = new PrismaCoreSaasService(
      new PrismaCoreSaasStore(
        client,
        new TenantRepository(client),
        new UserRepository(client),
        new RoleRepository(client),
        new UserRoleRepository(client),
        new AuditLogRepository(client),
      ),
    );
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    const userIds: string[] = [];
    const roleIds: string[] = [];
    let server: Server | undefined;

    try {
      const usersReadPermission = await upsertPermission(client, "users.read");
      const tenantA = await client.tenant.create({
        data: {
          name: `Persistent Middleware Tenant A ${suffix}`,
          slug: `persistent-middleware-a-${suffix}`,
        },
      });
      const tenantB = await client.tenant.create({
        data: {
          name: `Persistent Middleware Tenant B ${suffix}`,
          slug: `persistent-middleware-b-${suffix}`,
        },
      });
      tenantIds.push(tenantA.id, tenantB.id);

      const readUser = await client.user.create({
        data: {
          tenant_id: tenantA.id,
          name: "Persistent Middleware Reader",
          email: `persistent-middleware-reader-${suffix}@example.com`,
        },
      });
      const noPermissionUser = await client.user.create({
        data: {
          tenant_id: tenantA.id,
          name: "Persistent Middleware No Permission",
          email: `persistent-middleware-no-permission-${suffix}@example.com`,
        },
      });
      const tenantBUser = await client.user.create({
        data: {
          tenant_id: tenantB.id,
          name: "Persistent Middleware Tenant B User",
          email: `persistent-middleware-tenant-b-${suffix}@example.com`,
        },
      });
      userIds.push(readUser.id, noPermissionUser.id, tenantBUser.id);

      const readerRole = await client.role.create({
        data: {
          tenant_id: tenantA.id,
          key: "viewer",
          name: `Persistent Middleware Viewer ${suffix}`,
          scope: "tenant",
        },
      });
      const noPermissionRole = await client.role.create({
        data: {
          tenant_id: tenantA.id,
          key: "technician",
          name: `Persistent Middleware Technician ${suffix}`,
          scope: "tenant",
        },
      });
      roleIds.push(readerRole.id, noPermissionRole.id);

      await client.rolePermission.create({
        data: {
          role_id: readerRole.id,
          permission_id: usersReadPermission.id,
        },
      });
      await client.userRoleAssignment.createMany({
        data: [
          {
            tenant_id: tenantA.id,
            user_id: readUser.id,
            role_id: readerRole.id,
          },
          {
            tenant_id: tenantA.id,
            user_id: noPermissionUser.id,
            role_id: noPermissionRole.id,
          },
        ],
      });

      const app = createApp(service);
      server = app.listen(0);
      const baseUrl = await getBaseUrl(server);
      const readerToken = await signAccessToken({
        user_id: readUser.id,
        tenant_id: tenantA.id,
        email: readUser.email,
        roles: ["tenant_admin"],
      });
      const noPermissionToken = await signAccessToken({
        user_id: noPermissionUser.id,
        tenant_id: tenantA.id,
        email: noPermissionUser.email,
        roles: ["tenant_admin"],
      });

      const legacyResponse = await requestJson(baseUrl, "/api/v1/users", {
        headers: legacyHeaders(tenantA.id, readUser.id, "tenant_admin"),
      });
      assert.equal(legacyResponse.status, 200);

      const jwtResponse = await requestJson(baseUrl, "/api/v1/users", {
        headers: {
          authorization: `Bearer ${readerToken}`,
        },
      });
      assert.equal(jwtResponse.status, 200);
      assert.equal(
        jwtResponse.body.data.some((user: { email: string }) => user.email === readUser.email),
        true,
      );

      const missingPermissionResponse = await requestJson(baseUrl, "/api/v1/users", {
        headers: {
          authorization: `Bearer ${noPermissionToken}`,
        },
      });
      assert.equal(missingPermissionResponse.status, 403);
      assert.equal(missingPermissionResponse.body.error.code, "FORBIDDEN");
      assert.equal(missingPermissionResponse.body.error.reason, "permission_required");

      const elevatedResponse = await requestJson(baseUrl, "/api/v1/users", {
        method: "POST",
        headers: {
          authorization: `Bearer ${readerToken}`,
          ...legacyHeaders(tenantB.id, tenantBUser.id, "tenant_admin", [
            "users.manage",
          ]),
        },
        body: {
          name: "Must Not Be Created",
          email: `must-not-create-${suffix}@example.com`,
          roles: ["viewer"],
        },
      });
      assert.equal(elevatedResponse.status, 403);
      assert.equal(elevatedResponse.body.error.code, "FORBIDDEN");
      assert.equal(elevatedResponse.body.error.reason, "permission_required");

      const conflictResponse = await requestJson(baseUrl, "/api/v1/users", {
        headers: {
          authorization: `Bearer ${readerToken}`,
          ...legacyHeaders(tenantB.id, tenantBUser.id, "tenant_admin"),
        },
      });
      assert.equal(conflictResponse.status, 200);
      assert.equal(
        conflictResponse.body.data.some(
          (user: { email: string }) => user.email === tenantBUser.email,
        ),
        false,
      );
      assert.equal(
        conflictResponse.body.data.some((user: { email: string }) => user.email === readUser.email),
        true,
      );

      const invalidTokenResponse = await requestJson(baseUrl, "/api/v1/users", {
        headers: {
          authorization: "Bearer invalid.token.value",
          ...legacyHeaders(tenantA.id, readUser.id, "tenant_admin"),
        },
      });
      assert.equal(invalidTokenResponse.status, 401);
      assert.deepEqual(invalidTokenResponse.body, {
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired access token.",
        },
      });

      assert.deepEqual(Object.keys(jwtResponse.body).sort(), Object.keys(legacyResponse.body).sort());
      assert.deepEqual(
        Object.keys(jwtResponse.body.data[0]).sort(),
        Object.keys(legacyResponse.body.data[0]).sort(),
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
      await client.userRoleAssignment.deleteMany({
        where: {
          tenant_id: {
            in: tenantIds,
          },
        },
      });
      await client.rolePermission.deleteMany({
        where: {
          role_id: {
            in: roleIds,
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
          tenant_id: {
            in: tenantIds,
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

function legacyHeaders(
  tenantId: string,
  userId: string,
  role: string,
  permissions?: readonly string[],
): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": role,
    ...(permissions ? { "x-permissions": permissions.join(",") } : {}),
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

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function upsertPermission(
  client: {
    permission: {
      upsert(input: {
        readonly where: { readonly key: string };
        readonly update: Record<string, never>;
        readonly create: { readonly key: string; readonly description: string };
      }): Promise<{ readonly id: string }>;
    };
  },
  key: string,
) {
  return client.permission.upsert({
    where: {
      key,
    },
    update: {},
    create: {
      key,
      description: `Permission ${key}`,
    },
  });
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

async function runMemoryRuntimeCheck() {
  const script = `
process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = "dev-only-change-me";
process.env.JWT_EXPIRES_IN = "15m";
process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL;

const { createApp } = await import("./src/app.js");
const {
  CoreSaasRegistry,
  InMemoryCoreSaasStore,
  MemoryCoreSaasAdapter,
} = await import("./src/core-saas.js");
const { signAccessToken } = await import("./src/modules/auth/index.js");

const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const tenant = service.createTenant({ name: "Memory RBAC Tenant" });
const user = service.createUser({
  tenantId: tenant.id,
  name: "Memory RBAC Admin",
  email: "memory-rbac-admin@example.com",
  roles: ["tenant_admin"],
});
const app = createApp(new MemoryCoreSaasAdapter(service));
const server = app.listen(0);

try {
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const token = await signAccessToken({
    user_id: user.id,
    tenant_id: tenant.id,
    email: user.email,
    roles: ["tenant_admin"],
  });
  const response = await fetch("http://127.0.0.1:" + address.port + "/api/v1/users", {
    headers: {
      authorization: "Bearer " + token,
    },
  });
  const body = await response.json();

  console.log(JSON.stringify({ status: response.status, body }));
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
`;

  const child = spawn(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", script],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CORE_SAAS_PERSISTENCE: "memory",
        DATABASE_URL: "",
        JWT_SECRET: "dev-only-change-me",
        JWT_EXPIRES_IN: "15m",
        LOG_LEVEL: "silent",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
  child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));

  const exitCode = await new Promise<number | null>((resolve) => {
    child.once("close", resolve);
  });
  const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
  const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

  assert.equal(exitCode, 0, stderr || stdout);

  return JSON.parse(stdout.split(/\r?\n/).at(-1) ?? "{}");
}
