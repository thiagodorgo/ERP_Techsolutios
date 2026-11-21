import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_NAME = "20260906000000_users_grant_organization_view";
const MIGRATION = path.join(ROOT, "prisma", "migrations", MIGRATION_NAME, "migration.sql");
const KEY = "users:grant_organization_view";
const EXPECTED_ROLES = ["manager", "super_admin", "tenant_admin"] as const;
const SEEDED_ROLES = [...EXPECTED_ROLES, "support"] as const;

if (!connectionString) {
  test("users-concessao migration drill exige DATABASE_URL com CREATE DATABASE", {
    skip: "Defina DATABASE_URL para executar o drill da migração.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  let createdDatabase: string | undefined;
  let admin: any;
  let db: any;
  let url = "";
  let rolePermissionsBeforeApply = 0;

  const migrationSql = () => readFileSync(MIGRATION, "utf8").replace(/\r\n/g, "\n");
  const prismaCli = (): string => createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");

  function bodyStatements(): string[] {
    return migrationSql()
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .split(/;\s*\n/)
      .map((statement) => statement.replace(/;\s*$/, "").trim())
      .filter((statement) => statement && !/^(BEGIN|COMMIT)$/i.test(statement));
  }

  function rollbackStatements(): string[] {
    const lines = migrationSql().split("\n");
    const start = lines.findIndex((line) => /^-- ROLLBACK/.test(line));
    assert.ok(start >= 0, "a migração traz o bloco -- ROLLBACK");
    const body: string[] = [];
    for (const line of lines.slice(start + 1)) {
      if (!line.startsWith("--")) break;
      const statement = line.replace(/^--\s?/, "").trim();
      if (/^DELETE\s+/i.test(statement)) {
        body.push(statement.replace(/;\s*$/, ""));
      }
    }
    return body;
  }

  async function applyBody(): Promise<void> {
    const statements = bodyStatements();
    await db.$transaction(statements.map((statement) => db.$executeRawUnsafe(statement)));
  }

  async function applyRollback(): Promise<void> {
    const statements = rollbackStatements();
    await db.$transaction(statements.map((statement) => db.$executeRawUnsafe(statement)));
  }

  async function grantRoles(): Promise<string[]> {
    const rows = (await db.$queryRawUnsafe(
      `SELECT r.key AS role
         FROM role_permissions rp
         JOIN roles r ON r.id = rp.role_id
         JOIN permissions p ON p.id = rp.permission_id
        WHERE p.key = $1
        ORDER BY 1`,
      KEY,
    )) as Array<{ role: string }>;
    return rows.map((row) => row.role);
  }

  async function keyCount(): Promise<number> {
    const rows = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM permissions WHERE key = $1`, KEY)) as Array<{ n: number }>;
    return rows[0]?.n ?? 0;
  }

  async function rolePermissionCount(): Promise<number> {
    const rows = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM role_permissions`)) as Array<{ n: number }>;
    return rows[0]?.n ?? 0;
  }

  test("D-MIG-1 — aplicação concede a chave exatamente para manager/super_admin/tenant_admin", async () => {
    const { createPrismaClient } = await import("../src/database/pg-connection.js");
    admin = createPrismaClient(connectionString!);

    const source = new URL(connectionString!);
    const baseName = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    const databaseName = `${baseName}_drill_${randomUUID().replace(/-/g, "").slice(0, 10)}`.slice(0, 63);
    assert.match(databaseName, /^[a-z0-9_]+$/);

    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    createdDatabase = databaseName;

    const target = new URL(connectionString!);
    target.pathname = `/${databaseName}`;
    url = target.toString();

    execFileSync(process.execPath, [prismaCli(), "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
    });

    db = createPrismaClient(url);

    const applied = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      MIGRATION_NAME,
    )) as Array<{ n: number }>;
    assert.equal(applied[0]?.n, 1);

    for (const role of SEEDED_ROLES) {
      await db.$executeRawUnsafe(
        `INSERT INTO roles (key, name, scope) VALUES ($1, $1, 'system')`,
        role,
      );
    }

    rolePermissionsBeforeApply = await rolePermissionCount();
    await applyBody();

    assert.equal(await keyCount(), 1);
    assert.deepEqual(await grantRoles(), [...EXPECTED_ROLES]);
  });

  test("D-MIG-2 — reexecutar o corpo nao cria linhas novas", async () => {
    assert.ok(db);

    const beforePermissionCount = await keyCount();
    const beforeGrantRows = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE p.key = $1`,
      KEY,
    )) as Array<{ n: number }>;

    await applyBody();
    await applyBody();

    const afterGrantRows = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE p.key = $1`,
      KEY,
    )) as Array<{ n: number }>;

    assert.equal(await keyCount(), beforePermissionCount);
    assert.equal(afterGrantRows[0]?.n, beforeGrantRows[0]?.n);
  });

  test("D-MIG-3 — rollback literal do runbook remove a chave sem apagar concessoes alheias", async () => {
    assert.ok(db);

    await applyRollback();

    assert.equal(await keyCount(), 0);
    assert.deepEqual(await grantRoles(), []);
    assert.equal(await rolePermissionCount(), rolePermissionsBeforeApply);
  });

  test("D-MIG-4 — aplicar o corpo aumenta role_permissions em +3", async () => {
    assert.ok(db);

    const before = await rolePermissionCount();
    await applyBody();
    const after = await rolePermissionCount();

    assert.equal(after - before, 3);
    assert.deepEqual(await grantRoles(), [...EXPECTED_ROLES]);
  });

  after(async () => {
    if (db) {
      await db.$disconnect();
    }
    if (admin && createdDatabase) {
      await admin.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        createdDatabase,
      );
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${createdDatabase}"`);
      await admin.$disconnect();
    }
  });
}