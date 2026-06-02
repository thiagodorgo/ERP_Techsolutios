import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("Persistent RBAC authorization tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute persistent RBAC tests.",
  });
} else {
  test("PersistentAuthorizationService resolves roles and permissions from persisted assignments", async () => {
    const [
      { PrismaPg },
      { PrismaClient },
      { RoleRepository, UserRoleRepository },
      { PersistentAuthorizationService },
    ] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/modules/core-saas/repositories/index.js"),
      import("../src/modules/core-saas/services/persistent-authorization.service.js"),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const roleRepository = new RoleRepository(client);
    const userRoleRepository = new UserRoleRepository(client);
    const service = new PersistentAuthorizationService(
      userRoleRepository,
      roleRepository,
    );
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    const userIds: string[] = [];
    const roleIds: string[] = [];

    try {
      const [usersReadPermission, auditReadPermission] = await Promise.all([
        upsertPermission(client, "users.read"),
        upsertPermission(client, "audit.read"),
      ]);
      const tenantA = await client.tenant.create({
        data: {
          name: `Persistent RBAC Tenant A ${suffix}`,
          slug: `persistent-rbac-a-${suffix}`,
        },
      });
      const tenantB = await client.tenant.create({
        data: {
          name: `Persistent RBAC Tenant B ${suffix}`,
          slug: `persistent-rbac-b-${suffix}`,
        },
      });
      tenantIds.push(tenantA.id, tenantB.id);

      const userA = await client.user.create({
        data: {
          tenant_id: tenantA.id,
          name: "Persistent RBAC User A",
          email: `persistent-rbac-a-${suffix}@example.com`,
        },
      });
      const userWithoutRoles = await client.user.create({
        data: {
          tenant_id: tenantA.id,
          name: "Persistent RBAC User Without Roles",
          email: `persistent-rbac-empty-${suffix}@example.com`,
        },
      });
      userIds.push(userA.id, userWithoutRoles.id);

      const tenantRole = await client.role.create({
        data: {
          tenant_id: tenantA.id,
          key: "manager",
          name: `Persistent Manager ${suffix}`,
          scope: "tenant",
        },
      });
      const globalRole = await client.role.create({
        data: {
          key: `auditor`,
          name: `Persistent Auditor ${suffix}`,
          scope: "system",
        },
      });
      roleIds.push(tenantRole.id, globalRole.id);

      await client.rolePermission.createMany({
        data: [
          {
            role_id: tenantRole.id,
            permission_id: usersReadPermission.id,
          },
          {
            role_id: globalRole.id,
            permission_id: auditReadPermission.id,
          },
        ],
      });
      await userRoleRepository.assignRole({
        tenant_id: tenantA.id,
        user_id: userA.id,
        role_id: tenantRole.id,
      });
      await userRoleRepository.assignRole({
        tenant_id: tenantA.id,
        user_id: userA.id,
        role_id: globalRole.id,
      });

      const resolved = await service.resolveForActor({
        tenantId: tenantA.id,
        userId: userA.id,
      });
      assert.deepEqual([...resolved.roles].sort(), ["auditor", "manager"]);
      assert.deepEqual([...resolved.permissions].sort(), ["audit.read", "users.read"]);
      assert.equal(resolved.source, "persistent_rbac");

      const wrongTenant = await service.resolveForActor({
        tenantId: tenantB.id,
        userId: userA.id,
      });
      assert.deepEqual(wrongTenant.roles, []);
      assert.deepEqual(wrongTenant.permissions, []);

      const withoutRoles = await service.resolveForActor({
        tenantId: tenantA.id,
        userId: userWithoutRoles.id,
      });
      assert.deepEqual(withoutRoles.roles, []);
      assert.deepEqual(withoutRoles.permissions, []);
    } finally {
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
