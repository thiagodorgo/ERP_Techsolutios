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
const MIGRATION = "20260895000000_ass02_seed_subscription_plans";
const CODES = [
  "business",
  "enterprise",
  "professional",
  "starter",
  "tracking_basic",
  "tracking_plus",
] as const;
const migrationSql = readFileSync(
  path.join(ROOT, "prisma", "migrations", MIGRATION, "migration.sql"),
  "utf8",
).replace(/\r\n/g, "\n");

function upStatements(): string[] {
  const body = migrationSql.slice(migrationSql.indexOf("BEGIN;") + 6, migrationSql.indexOf("COMMIT;"));
  return body.split(/;\s*\n/).map((statement) => statement.trim()).filter(Boolean);
}

function rollbackDelete(): string {
  const lines = migrationSql.split("\n");
  const start = lines.findIndex((line) => line.startsWith("-- DELETE FROM subscription_plans"));
  assert.ok(start >= 0, "M1-d contém rollback escopado");
  return lines.slice(start, start + 3).map((line) => line.replace(/^--\s?/, "")).join("\n").replace(/;\s*$/, "");
}

if (!connectionString) {
  test("B-ASS-02 · drill M1-d exige DATABASE_URL e CREATE DATABASE", {
    skip: "Defina DATABASE_URL para executar o drill da M1-d.",
  });
} else {
  let admin: any;
  let db: any;
  let databaseName: string | undefined;

  after(async () => {
    await db?.$disconnect();
    if (admin && databaseName) {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    }
    await admin?.$disconnect();
  });

  test("M1-d: deploy cria exatamente 6 códigos, sem versão/preço e sem autor", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass02_seed_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    assert.match(databaseName, /^[a-z0-9_]+$/);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const target = new URL(connectionString!);
    target.pathname = `/${databaseName}`;
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: target.toString() },
      stdio: "pipe",
    });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString() }) });
    const rows = (await db.$queryRawUnsafe(
      `SELECT p.code, p.created_by, count(v.id)::int AS versions
         FROM subscription_plans p LEFT JOIN subscription_plan_versions v ON v.plan_id = p.id
        WHERE p.code = ANY($1::text[]) GROUP BY p.id, p.code, p.created_by ORDER BY p.code`,
      [...CODES],
    )) as Array<{ code: string; created_by: string | null; versions: number }>;
    assert.deepEqual(rows.map((row) => row.code), [...CODES]);
    assert.ok(rows.every((row) => row.created_by === null && row.versions === 0));
  });

  test("M1-d: reaplicar o corpo duas vezes é idempotente", async () => {
    assert.ok(db, "depende do deploy");
    const apply = () => db.$transaction(upStatements().map((sql) => db.$executeRawUnsafe(sql)));
    await apply();
    await apply();
    const rows = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM subscription_plans WHERE code = ANY($1::text[])`,
      [...CODES],
    )) as Array<{ n: number }>;
    assert.equal(rows[0]!.n, 6);
  });

  test("M1-d: rollback preserva plano que já ganhou versão e remove apenas os demais", async () => {
    assert.ok(db, "depende do deploy");
    const starter = (await db.$queryRawUnsafe(
      `SELECT id FROM subscription_plans WHERE code = 'starter'`,
    )) as Array<{ id: string }>;
    await db.$executeRawUnsafe(
      `INSERT INTO subscription_plan_versions
         (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb,
          extra_user_price, extra_gb_price, pricing_unit, modules)
       VALUES ($1::uuid, 1, now(), 1, 1, 1, 1, 1, 'flat', ARRAY['dashboard']::text[])`,
      starter[0]!.id,
    );
    await db.$executeRawUnsafe(rollbackDelete());
    const remaining = (await db.$queryRawUnsafe(
      `SELECT code FROM subscription_plans WHERE code = ANY($1::text[]) ORDER BY code`,
      [...CODES],
    )) as Array<{ code: string }>;
    assert.deepEqual(remaining.map((row) => row.code), ["starter"]);
  });
}
