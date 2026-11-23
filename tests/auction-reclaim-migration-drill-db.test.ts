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
      `INSERT INTO roles (key, name, scope) VALUES ($1, $1, 'system') ON CONFLICT DO NOTHING`,
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
});
