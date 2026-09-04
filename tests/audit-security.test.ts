import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  dropEphemeralRoleResilient,
  withRoleCatalogLock,
} from "./helpers/auth-identity-fixture.js";

// B-O6R-ARNES (2026-08-28) — este arquivo era um dos TRÊS que escreviam catálogo de cluster fora do
// mecanismo único. A sequência de catálogo (CREATE ROLE + GRANTs no setup; DROP OWNED/DROP ROLE no
// teardown) passa agora por `withRoleCatalogLock`, o MESMO advisory lock do arnês. Duas medições
// explicam por que aqui era o pior lugar para ficar de fora:
//   - o `DROP OWNED BY` da l.158 foi o produtor nomeado do `XX000 tuple concurrently updated` em
//     2 das 10 rodadas da canônica 3 e reaparece na bateria barata da base;
//   - a sequência de teardown não tinha catch: a falha do `DROP OWNED` engolia o `DROP ROLE`
//     seguinte e a role `audit_rls_*` sobrevivia COM LOGIN e INSERT/UPDATE/DELETE em 115 tabelas
//     (inclusive `financial_entries`). Era o B-3c4.
// Só a sequência de CATÁLOGO entra no lock — a criação de organização/usuário e o corpo do teste
// ficam de fora, para a janela ser curta.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("audit security tests require DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute audit security tests.",
  });
} else {
  test("enterprise audit logs preserve tenant, actor, sanitization and RLS isolation", async () => {
    const [
      { PrismaPg },
      { PrismaClient },
      { withTenantRls },
      { EnterpriseAuditLogService },
      { AuditLogRepository },
    ] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
      import("../src/modules/core-saas/audit/audit-log.service.js"),
      import("../src/modules/core-saas/repositories/audit-log.repository.js"),
    ]);
    const adminClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const roleName = `audit_rls_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const rolePassword = `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    const userIds: string[] = [];
    let client: InstanceType<typeof PrismaClient> | undefined;

    try {
      await withRoleCatalogLock(adminClient, async (tx) => {
        await tx.$executeRawUnsafe(
          `CREATE ROLE "${roleName}" LOGIN PASSWORD '${escapeSqlLiteral(rolePassword)}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
        );
        await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
        await tx.$executeRawUnsafe(
          `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${roleName}"`,
        );
        await tx.$executeRawUnsafe(
          `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${roleName}"`,
        );
      });

      client = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: buildConnectionStringForRole(
            connectionString,
            roleName,
            rolePassword,
          ),
        }),
      });

      const tenantA = await client.tenant.create({
        data: {
          name: `Audit Tenant A ${suffix}`,
          slug: `audit-tenant-a-${suffix}`,
        },
      });
      const tenantB = await client.tenant.create({
        data: {
          name: `Audit Tenant B ${suffix}`,
          slug: `audit-tenant-b-${suffix}`,
        },
      });
      tenantIds.push(tenantA.id, tenantB.id);

      const userA = await withTenantRls(client, tenantA.id, (tx) =>
        tx.user.create({
          data: {
            tenant_id: tenantA.id,
            name: "Audit User A",
            email: `audit-a-${suffix}@example.com`,
          },
        }),
      );
      userIds.push(userA.id);

      const audit = await withTenantRls(client, tenantA.id, (tx) =>
        new EnterpriseAuditLogService(new AuditLogRepository(tx), {
          publishEvent: false,
        }).record({
          tenantId: tenantA.id,
          actorId: userA.id,
          actorEmail: userA.email,
          action: "audit.security.test",
          resourceType: "user",
          resourceId: userA.id,
          outcome: "success",
          severity: "info",
          metadata: {
            accessToken: "do-not-store",
            password: "do-not-store",
            safe: "visible",
          },
        }),
      );

      assert.equal(audit.tenantId, tenantA.id);
      assert.equal(audit.actorId, userA.id);

      const tenantAView = await withTenantRls(client, tenantA.id, (tx) =>
        tx.auditLog.findMany({
          where: {
            id: audit.id,
          },
        }),
      );
      const tenantBView = await withTenantRls(client, tenantB.id, (tx) =>
        tx.auditLog.findMany({
          where: {
            id: audit.id,
          },
        }),
      );

      assert.equal(tenantAView.length, 1);
      assert.equal(tenantBView.length, 0);
      assert.equal(tenantAView[0].tenant_id, tenantA.id);
      assert.equal(tenantAView[0].actor_user_id, userA.id);
      assert.equal(tenantAView[0].action, "audit.security.test");

      const metadataJson = JSON.stringify(tenantAView[0].metadata);
      assert.equal(metadataJson.includes("do-not-store"), false);
      assert.equal(metadataJson.includes("[REDACTED]"), true);
      assert.equal(metadataJson.includes("visible"), true);
    } finally {
      if (client) {
        await client.$disconnect();
      }

      await adminClient.auditLog.deleteMany({
        where: {
          tenant_id: {
            in: tenantIds,
          },
        },
      });
      await adminClient.user.deleteMany({
        where: {
          id: {
            in: userIds,
          },
        },
      });
      await adminClient.tenant.deleteMany({
        where: {
          id: {
            in: tenantIds,
          },
        },
      });
      // Teardown resiliente E ruidoso (C-B): a sequência inteira roda no lock, statement a
      // statement, e é repetida enquanto a role sobreviver — a falha de um não engole os
      // seguintes, e nenhuma delas some em silêncio. Role viva ao fim LANÇA.
      await dropEphemeralRoleResilient(adminClient, roleName);
      await adminClient.$disconnect();
    }
  });
}

function buildConnectionStringForRole(
  source: string,
  roleName: string,
  rolePassword: string,
): string {
  const url = new URL(source);
  url.username = roleName;
  url.password = rolePassword;

  return url.toString();
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
