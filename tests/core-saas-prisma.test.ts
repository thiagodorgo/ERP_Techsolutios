import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("UserRoleRepository requires DATABASE_URL and a migrated PostgreSQL database", {
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
}
