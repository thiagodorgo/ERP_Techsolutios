import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("Prisma Core SaaS tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute Prisma repository tests.",
  });
} else {
  test("UserRoleRepository assigns and lists roles with tenant isolation", async () => {
    const [{ PrismaPg }, { PrismaClient }, { UserRoleRepository }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/modules/core-saas/repositories/user-role.repository.js"),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const repository = new UserRoleRepository(client);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const tenantA = await client.tenant.create({
      data: {
        name: `Tenant A ${suffix}`,
        slug: `tenant-a-${suffix}`,
      },
    });
    const tenantB = await client.tenant.create({
      data: {
        name: `Tenant B ${suffix}`,
        slug: `tenant-b-${suffix}`,
      },
    });
    const branchA = await client.branch.create({
      data: {
        tenant_id: tenantA.id,
        name: "Filial A",
        code: `A-${suffix}`,
      },
    });
    const branchB = await client.branch.create({
      data: {
        tenant_id: tenantB.id,
        name: "Filial B",
        code: `B-${suffix}`,
      },
    });
    const userA = await client.user.create({
      data: {
        tenant_id: tenantA.id,
        branch_id: branchA.id,
        name: "User A",
        email: `user-a-${suffix}@example.com`,
      },
    });
    const userB = await client.user.create({
      data: {
        tenant_id: tenantB.id,
        branch_id: branchB.id,
        name: "User B",
        email: `user-b-${suffix}@example.com`,
      },
    });
    const roleA = await client.role.create({
      data: {
        tenant_id: tenantA.id,
        key: `tenant_role_a_${suffix}`,
        name: "Tenant Role A",
        scope: "tenant",
      },
    });
    const roleB = await client.role.create({
      data: {
        tenant_id: tenantB.id,
        key: `tenant_role_b_${suffix}`,
        name: "Tenant Role B",
        scope: "tenant",
      },
    });
    const globalRole = await client.role.create({
      data: {
        key: `global_role_${suffix}`,
        name: "Global Role",
        scope: "system",
      },
    });

    try {
      const scopedAssignment = await repository.assignRole({
        tenant_id: tenantA.id,
        user_id: userA.id,
        role_id: roleA.id,
        branch_id: branchA.id,
      });
      const duplicateScopedAssignment = await repository.assignRole({
        tenant_id: tenantA.id,
        user_id: userA.id,
        role_id: roleA.id,
        branch_id: branchA.id,
      });
      const globalAssignment = await repository.assignRole({
        tenant_id: tenantA.id,
        user_id: userA.id,
        role_id: globalRole.id,
      });
      const duplicateGlobalAssignment = await repository.assignRole({
        tenant_id: tenantA.id,
        user_id: userA.id,
        role_id: globalRole.id,
      });

      assert.equal(duplicateScopedAssignment.id, scopedAssignment.id);
      assert.equal(duplicateGlobalAssignment.id, globalAssignment.id);

      const assignments = await repository.listByUserForTenant(userA.id, tenantA.id);

      assert.deepEqual(
        assignments.map((assignment) => assignment.role.key).sort(),
        [globalRole.key, roleA.key].sort(),
      );
      assert.equal(await repository.findAssignmentByIdForTenant(scopedAssignment.id, tenantA.id) !== null, true);
      assert.equal(await repository.findAssignmentByIdForTenant(scopedAssignment.id, tenantB.id), null);
      assert.equal(await repository.removeAssignment(scopedAssignment.id, tenantB.id), false);
      assert.equal(await repository.removeAssignment(scopedAssignment.id, tenantA.id), true);

      await assert.rejects(
        () =>
          repository.assignRole({
            tenant_id: tenantA.id,
            user_id: userB.id,
            role_id: roleA.id,
          }),
        /User does not belong to tenant/,
      );
      await assert.rejects(
        () =>
          repository.assignRole({
            tenant_id: tenantA.id,
            user_id: userA.id,
            role_id: roleB.id,
          }),
        /Role is not assignable to tenant/,
      );
      await assert.rejects(
        () =>
          repository.assignRole({
            tenant_id: tenantA.id,
            user_id: userA.id,
            role_id: roleA.id,
            branch_id: branchB.id,
          }),
        /Branch does not belong to tenant/,
      );
    } finally {
      await client.userRoleAssignment.deleteMany({
        where: {
          tenant_id: {
            in: [tenantA.id, tenantB.id],
          },
        },
      });
      await client.role.deleteMany({
        where: {
          id: {
            in: [roleA.id, roleB.id, globalRole.id],
          },
        },
      });
      await client.user.deleteMany({
        where: {
          id: {
            in: [userA.id, userB.id],
          },
        },
      });
      await client.branch.deleteMany({
        where: {
          id: {
            in: [branchA.id, branchB.id],
          },
        },
      });
      await client.tenant.deleteMany({
        where: {
          id: {
            in: [tenantA.id, tenantB.id],
          },
        },
      });
      await client.$disconnect();
    }
  });

  test("PrismaCoreSaasService persists tenants, users, roles and audit by tenant", async () => {
    const [
      { PrismaPg },
      { PrismaClient },
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
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const roleRepository = new RoleRepository(client);
    // prismaClient is the first argument — required for $transaction support
    const store = new PrismaCoreSaasStore(
      client,
      new TenantRepository(client),
      new UserRepository(client),
      roleRepository,
      new UserRoleRepository(client),
      new AuditLogRepository(client),
    );
    const service = new PrismaCoreSaasService(store);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    const roleIds: string[] = [];

    try {
      const tenantA = await service.createTenant({
        name: `Service Tenant A ${suffix}`,
      });
      const tenantB = await service.createTenant({
        name: `Service Tenant B ${suffix}`,
      });
      tenantIds.push(tenantA.id, tenantB.id);

      const globalRole = await client.role.create({
        data: {
          key: `tenant_admin`,
          name: `Tenant Admin ${suffix}`,
          scope: "system",
        },
      });
      const tenantBRole = await client.role.create({
        data: {
          tenant_id: tenantB.id,
          key: "manager",
          name: `Manager B ${suffix}`,
          scope: "tenant",
        },
      });
      roleIds.push(globalRole.id, tenantBRole.id);

      const userA = await service.createUser({
        tenantId: tenantA.id,
        name: "Persisted User A",
        email: `persisted-a-${suffix}@example.com`,
        roles: ["tenant_admin"],
      });
      const userB = await service.createUser({
        tenantId: tenantB.id,
        name: "Persisted User B",
        email: `persisted-b-${suffix}@example.com`,
        roles: ["tenant_admin"],
      });

      const tenantAUsers = await service.listUsersForTenant(tenantA.id);
      const tenantBUsers = await service.listUsersForTenant(tenantB.id);
      const tenantAForActor = await service.getTenantForActor(tenantA.id, tenantA.id);
      const actorAudit = await service.recordAudit({
        action: "service.audit.test",
        actor_user_id: userA.id,
        tenant_id: tenantA.id,
        metadata: {
          entity: "user",
          entity_id: userA.id,
        },
      });
      const tenantAAudit = await service.getAuditEventsForTenant(tenantA.id);
      const tenantBAudit = await service.getAuditEventsForTenant(tenantB.id);

      assert.equal(tenantAForActor.id, tenantA.id);
      assert.deepEqual(
        tenantAUsers.map((user) => user.id),
        [userA.id],
      );
      assert.deepEqual(
        tenantBUsers.map((user) => user.id),
        [userB.id],
      );
      assert.deepEqual(userA.roles, ["tenant_admin"]);
      assert.equal(actorAudit.actor_user_id, userA.id);
      assert.equal(
        tenantAAudit.some((event) => event.action === "service.audit.test"),
        true,
      );
      assert.equal(
        tenantBAudit.some((event) => event.action === "service.audit.test"),
        false,
      );

      // tenant.created audit events were created inside $transaction for both tenants
      assert.equal(
        tenantAAudit.some((event) => event.action === "tenant.created"),
        true,
      );
      assert.equal(
        tenantBAudit.some((event) => event.action === "tenant.created"),
        true,
      );

      // user.created audit events were created inside $transaction for both users
      assert.equal(
        tenantAAudit.some((event) => event.action === "user.created"),
        true,
      );
      assert.equal(
        tenantBAudit.some((event) => event.action === "user.created"),
        true,
      );

      await assert.rejects(
        () => service.getTenantForActor(tenantB.id, tenantA.id),
        /Cross-tenant access is denied/,
      );
      await assert.rejects(
        () => service.getUserForTenant(userB.id, tenantA.id),
        /User not found/,
      );
      assert.equal(
        await roleRepository.findByIdForTenantOrGlobal(tenantBRole.id, tenantA.id),
        null,
      );
      await assert.rejects(
        () => service.listUsersForTenant(""),
        /Tenant context is required/,
      );
    } finally {
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
      await client.user.deleteMany({
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

  test("PrismaCoreSaasStore.createUser rolls back when branch belongs to another tenant", async () => {
    const [
      { PrismaPg },
      { PrismaClient },
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
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const store = new PrismaCoreSaasStore(
      client,
      new TenantRepository(client),
      new UserRepository(client),
      new RoleRepository(client),
      new UserRoleRepository(client),
      new AuditLogRepository(client),
    );
    const service = new PrismaCoreSaasService(store);

    const tenantIds: string[] = [];
    const roleIds: string[] = [];
    const branchIds: string[] = [];
    const orphanEmail = `orphan-${suffix}@example.com`;

    try {
      const tenantA = await service.createTenant({ name: `Rollback Tenant A ${suffix}` });
      const tenantB = await service.createTenant({ name: `Rollback Tenant B ${suffix}` });
      tenantIds.push(tenantA.id, tenantB.id);

      // branchB belongs to tenantB — must not be assignable to tenantA users
      const branchB = await client.branch.create({
        data: { tenant_id: tenantB.id, name: "Rollback Branch B", code: `RB-${suffix}` },
      });
      branchIds.push(branchB.id);

      // A global role that IS accessible — so the role lookup succeeds
      const globalRole = await client.role.create({
        data: { key: `tenant_admin`, name: `Global Admin ${suffix}`, scope: "system" },
      });
      roleIds.push(globalRole.id);

      // createUser with branchIds pointing to branchB (tenantB) → must fail and roll back
      await assert.rejects(
        () =>
          service.createUser({
            tenantId: tenantA.id,
            name: "Should Not Persist",
            email: orphanEmail,
            roles: ["tenant_admin"],
            branchIds: [branchB.id],
          }),
        /Branch does not belong to tenant/,
      );

      // Verify: transaction rolled back — no user should exist in tenantA with that email
      const orphanInDb = await client.user.findFirst({
        where: { email: orphanEmail, tenant_id: tenantA.id },
      });
      assert.equal(orphanInDb, null, "User must not persist when branch assignment fails");

      // Verify: no role assignments or audit entries were leaked
      const orphanRoles = await client.userRoleAssignment.findMany({
        where: { tenant_id: tenantA.id },
      });
      assert.equal(
        orphanRoles.length,
        0,
        "No role assignments must persist after rollback",
      );
    } finally {
      await client.auditLog.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.userRoleAssignment.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.user.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.branch.deleteMany({ where: { id: { in: branchIds } } });
      await client.role.deleteMany({ where: { id: { in: roleIds } } });
      await client.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await client.$disconnect();
    }
  });

  test("PrismaCoreSaasStore.createUser rolls back when role belongs to another tenant", async () => {
    const [
      { PrismaPg },
      { PrismaClient },
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
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const store = new PrismaCoreSaasStore(
      client,
      new TenantRepository(client),
      new UserRepository(client),
      new RoleRepository(client),
      new UserRoleRepository(client),
      new AuditLogRepository(client),
    );
    const service = new PrismaCoreSaasService(store);

    const tenantIds: string[] = [];
    const roleIds: string[] = [];
    const orphanEmail = `cross-tenant-${suffix}@example.com`;

    try {
      const tenantA = await service.createTenant({ name: `Cross-Tenant A ${suffix}` });
      const tenantB = await service.createTenant({ name: `Cross-Tenant B ${suffix}` });
      tenantIds.push(tenantA.id, tenantB.id);

      // A tenant-specific role created for tenantB with a catalog-valid key "manager"
      // findByKeyForTenant("manager", tenantA.id) will return null because this role is tenantB-scoped
      // (assuming no other global "manager" was created in this test scope)
      const tenantBRole = await client.role.create({
        data: {
          tenant_id: tenantB.id,
          key: `manager_${suffix}`,
          name: `Manager B ${suffix}`,
          scope: "tenant",
        },
      });
      roleIds.push(tenantBRole.id);

      // createUser in tenantA using a role key that maps to tenantB's scoped role
      // The store's findByKeyForTenant will NOT find it for tenantA → throws
      // But service.validateRole will reject a non-catalog key first.
      // So we test with the store directly to bypass catalog validation.
      await assert.rejects(
        () =>
          store.createUser({
            tenantId: tenantA.id,
            name: "Should Not Persist Cross",
            email: orphanEmail,
            roles: [`manager_${suffix}`],
            status: "active",
          }),
        /Role is not assignable to tenant|Invalid role/,
      );

      // Verify no user persisted
      const orphanInDb = await client.user.findFirst({
        where: { email: orphanEmail, tenant_id: tenantA.id },
      });
      assert.equal(orphanInDb, null, "User must not persist when role is from another tenant");
    } finally {
      await client.auditLog.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.userRoleAssignment.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.user.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.role.deleteMany({ where: { id: { in: roleIds } } });
      await client.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await client.$disconnect();
    }
  });

  test("PrismaCoreSaasStore.createTenant creates tenant and audit atomically", async () => {
    const [
      { PrismaPg },
      { PrismaClient },
      { PrismaCoreSaasService },
      { PrismaCoreSaasStore },
      {
        AuditLogRepository,
        TenantRepository,
        UserRepository,
        RoleRepository,
        UserRoleRepository,
      },
    ] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const store = new PrismaCoreSaasStore(
      client,
      new TenantRepository(client),
      new UserRepository(client),
      new RoleRepository(client),
      new UserRoleRepository(client),
      new AuditLogRepository(client),
    );
    const service = new PrismaCoreSaasService(store);
    const tenantIds: string[] = [];

    try {
      const tenant = await service.createTenant({ name: `Atomic Tenant ${suffix}` });
      tenantIds.push(tenant.id);

      // Audit log for tenant.created must exist in the same transaction
      const auditLogs = await client.auditLog.findMany({
        where: { tenant_id: tenant.id, action: "tenant.created" },
      });

      assert.equal(auditLogs.length, 1, "Exactly one tenant.created audit log must exist");
      assert.equal(auditLogs[0].entity_id, tenant.id);
    } finally {
      await client.auditLog.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await client.$disconnect();
    }
  });

  test("PrismaCoreSaasStore.createUser creates user.created audit with actor when actor is valid", async () => {
    const [
      { PrismaPg },
      { PrismaClient },
      { PrismaCoreSaasService },
      { PrismaCoreSaasStore },
      {
        AuditLogRepository,
        TenantRepository,
        UserRepository,
        RoleRepository,
        UserRoleRepository,
      },
    ] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const store = new PrismaCoreSaasStore(
      client,
      new TenantRepository(client),
      new UserRepository(client),
      new RoleRepository(client),
      new UserRoleRepository(client),
      new AuditLogRepository(client),
    );
    const service = new PrismaCoreSaasService(store);
    const tenantIds: string[] = [];
    const roleIds: string[] = [];

    try {
      const tenant = await service.createTenant({ name: `Actor Audit Tenant ${suffix}` });
      tenantIds.push(tenant.id);

      const globalRole = await client.role.create({
        data: { key: `tenant_admin`, name: `Admin ${suffix}`, scope: "system" },
      });
      roleIds.push(globalRole.id);

      // Create first user (will act as actor for second user)
      const actor = await service.createUser({
        tenantId: tenant.id,
        name: "Actor User",
        email: `actor-${suffix}@example.com`,
        roles: ["tenant_admin"],
      });

      // Create second user, passing actor.id as actorUserId
      const target = await store.createUser({
        tenantId: tenant.id,
        name: "Target User",
        email: `target-${suffix}@example.com`,
        roles: ["tenant_admin"],
        actorUserId: actor.id,
      });

      // The audit for target user must have actor_user_id = actor.id
      const auditLogs = await client.auditLog.findMany({
        where: { tenant_id: tenant.id, action: "user.created", entity_id: target.id },
      });

      assert.equal(auditLogs.length, 1, "Exactly one user.created audit log for target user");
      assert.equal(
        auditLogs[0].actor_user_id,
        actor.id,
        "audit actor_user_id must match the provided actorUserId",
      );

      // Global role is permitted — both users have tenant_admin
      assert.deepEqual(actor.roles, ["tenant_admin"]);
      assert.deepEqual(target.roles, ["tenant_admin"]);

      // Tenant isolation: only this tenant's users exist for this tenant
      const usersForTenant = await service.listUsersForTenant(tenant.id);
      assert.equal(usersForTenant.length, 2);
    } finally {
      await client.auditLog.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.userRoleAssignment.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.user.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.role.deleteMany({ where: { id: { in: roleIds } } });
      await client.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await client.$disconnect();
    }
  });
}
