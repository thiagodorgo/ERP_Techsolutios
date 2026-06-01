import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("Auth Prisma tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute auth credential tests.",
  });
} else {
  test("Local auth credentials are tenant-scoped and verifiable", async () => {
    const [
      { PrismaPg },
      { PrismaClient },
      { LocalAuthCredentialRepository, LocalAuthCredentialService },
    ] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/modules/auth/index.js"),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const repository = new LocalAuthCredentialRepository(client);
    const service = new LocalAuthCredentialService(repository, {
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
    });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const sharedEmail = `shared-${suffix}@example.com`;
    const tenantIds: string[] = [];
    const userIds: string[] = [];

    try {
      const tenantA = await client.tenant.create({
        data: {
          name: `Auth Tenant A ${suffix}`,
          slug: `auth-tenant-a-${suffix}`,
        },
      });
      const tenantB = await client.tenant.create({
        data: {
          name: `Auth Tenant B ${suffix}`,
          slug: `auth-tenant-b-${suffix}`,
        },
      });
      tenantIds.push(tenantA.id, tenantB.id);

      const userA = await client.user.create({
        data: {
          tenant_id: tenantA.id,
          name: "Auth User A",
          email: sharedEmail,
        },
      });
      const userB = await client.user.create({
        data: {
          tenant_id: tenantB.id,
          name: "Auth User B",
          email: sharedEmail,
        },
      });
      const userA2 = await client.user.create({
        data: {
          tenant_id: tenantA.id,
          name: "Auth User A2",
          email: `other-${suffix}@example.com`,
        },
      });
      userIds.push(userA.id, userB.id, userA2.id);

      const credentialA = await service.createCredentialForUser({
        tenant_id: tenantA.id,
        user_id: userA.id,
        email: `  ${sharedEmail.toUpperCase()}  `,
        password: "ChangeMe123!",
      });
      const credentialB = await service.createCredentialForUser({
        tenant_id: tenantB.id,
        user_id: userB.id,
        email: sharedEmail,
        password: "OtherChangeMe123!",
      });

      assert.equal(credentialA.email, sharedEmail);
      assert.equal(credentialB.email, sharedEmail);
      assert.equal(credentialA.tenant_id, tenantA.id);
      assert.equal(credentialB.tenant_id, tenantB.id);
      assert.equal(Object.hasOwn(credentialA, "password_hash"), false);

      const storedA = await repository.findByEmailForTenant(sharedEmail, tenantA.id);
      const storedB = await repository.findByEmailForTenant(sharedEmail, tenantB.id);

      assert.notEqual(storedA, null);
      assert.notEqual(storedB, null);
      assert.equal(storedA?.user_id, userA.id);
      assert.equal(storedB?.user_id, userB.id);
      assert.notEqual(storedA?.password_hash, "ChangeMe123!");
      assert.match(storedA?.password_hash ?? "", /^scrypt\$v=1\$/);
      assert.equal(storedA?.password_algorithm, "scrypt-v1");

      await assert.rejects(
        () =>
          service.createCredentialForUser({
            tenant_id: tenantA.id,
            user_id: userB.id,
            email: sharedEmail,
            password: "ChangeMe123!",
          }),
        /User not found for tenant/,
      );

      await assert.rejects(
        () =>
          repository.create({
            tenant_id: tenantA.id,
            user_id: userA2.id,
            email: sharedEmail,
            password_hash: storedA!.password_hash,
            password_algorithm: "scrypt-v1",
          }),
        /Unique constraint|duplicate key/i,
      );

      const failedVerify = await service.verifyCredential({
        tenant_id: tenantA.id,
        email: sharedEmail,
        password: "WrongPassword123!",
      });
      assert.deepEqual(failedVerify, {
        ok: false,
        reason: "invalid_credentials",
      });

      const afterFailure = await repository.findByEmailForTenant(sharedEmail, tenantA.id);
      assert.equal(afterFailure?.failed_attempts, 1);

      const successfulVerify = await service.verifyCredential({
        tenant_id: tenantA.id,
        email: sharedEmail,
        password: "ChangeMe123!",
      });
      assert.deepEqual(successfulVerify, {
        ok: true,
        tenant_id: tenantA.id,
        user_id: userA.id,
      });

      const afterSuccess = await repository.findByEmailForTenant(sharedEmail, tenantA.id);
      assert.equal(afterSuccess?.failed_attempts, 0);
      assert.ok(afterSuccess?.last_login_at instanceof Date);

      const notFound = await service.verifyCredential({
        tenant_id: tenantA.id,
        email: `missing-${suffix}@example.com`,
        password: "ChangeMe123!",
      });
      assert.deepEqual(notFound, {
        ok: false,
        reason: "not_found",
      });
    } finally {
      await client.localAuthCredential.deleteMany({
        where: {
          tenant_id: {
            in: tenantIds,
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
