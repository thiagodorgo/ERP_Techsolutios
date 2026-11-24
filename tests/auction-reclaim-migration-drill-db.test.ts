import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../src/database/prisma.js";

const MIGRATION_NAME = "20261123000000_grant_auction_reclaim_permission";
const PERSISTED_ROLES = ["super_admin", "tenant_admin", "manager"] as const;

test("migration drill :: 20261123000000_grant_auction_reclaim_permission provisiona auction:reclaim para os 3 papéis persistidos", async () => {
  const permissao = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
      FROM permissions
     WHERE key = 'auction:reclaim'
     LIMIT 1
  `;
  assert.equal(permissao.length, 1, `${MIGRATION_NAME}: permission key ausente`);

  for (const roleKey of PERSISTED_ROLES) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO roles (key, name, scope)
       SELECT $1, $1, 'system'
        WHERE NOT EXISTS (
          SELECT 1 FROM roles
           WHERE key = $1 AND tenant_id IS NULL
        )`,
      roleKey,
    );
  }
  await prisma.$executeRawUnsafe(
    `INSERT INTO role_permissions (role_id, permission_id)
     SELECT r.id, p.id
       FROM roles r
      CROSS JOIN permissions p
      WHERE p.key = 'auction:reclaim'
        AND r.key IN ('super_admin', 'tenant_admin', 'manager')
        AND r.tenant_id IS NULL
     ON CONFLICT (role_id, permission_id) DO NOTHING`,
  );

  const grants = await prisma.$queryRaw<Array<{ role_key: string }>>`
    SELECT DISTINCT r.key AS role_key
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
     WHERE p.key = 'auction:reclaim'
       AND r.key IN ('super_admin', 'tenant_admin', 'manager')
       AND r.tenant_id IS NULL
     ORDER BY r.key
  `;

  assert.deepEqual(
    grants.map((row) => row.role_key),
    ["manager", "super_admin", "tenant_admin"],
    `${MIGRATION_NAME}: concessões persistidas divergentes`,
  );

  const roleCount = await prisma.$queryRaw<Array<{ total: number }>>`
    SELECT COUNT(*)::int AS total
      FROM roles
     WHERE tenant_id IS NULL
       AND key IN ('super_admin', 'tenant_admin', 'manager')
  `;
  assert.equal(
    roleCount[0]?.total,
    3,
    `${MIGRATION_NAME}: papéis de sistema duplicados (${roleCount[0]?.total} linhas para 3 chaves)`,
  );

  const grantCount = await prisma.$queryRaw<Array<{ total: number }>>`
    SELECT COUNT(*)::int AS total
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
     WHERE p.key = 'auction:reclaim'
       AND r.key IN ('super_admin', 'tenant_admin', 'manager')
       AND r.tenant_id IS NULL
  `;
  assert.equal(
    grantCount[0]?.total,
    3,
    `${MIGRATION_NAME}: concessões de auction:reclaim duplicadas (${grantCount[0]?.total} linhas para 3 chaves)`,
  );
});
