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
const MIGRATION = "20260906000000_group_managers";
const sql = readFileSync(path.join(ROOT, "prisma", "migrations", MIGRATION, "migration.sql"), "utf8").replace(/\r\n/g, "\n");

function statements(): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((part) => part.replace(/;\s*$/, "").trim())
    .filter((part) => part.length > 0 && !/^(BEGIN|COMMIT)$/i.test(part));
}

const down = [
  'DROP TABLE IF EXISTS "user_deactivation_requests"',
  'DROP TABLE IF EXISTS "economic_group_managers"',
] as const;

async function catalog(db: any) {
  const rows = (await db.$queryRawUnsafe(`SELECT
    (SELECT count(*)::int FROM pg_class WHERE relkind = 'r' AND relname IN ('economic_group_managers','user_deactivation_requests')) AS tables,
    (SELECT count(*)::int FROM pg_class WHERE relname IN ('economic_group_managers','user_deactivation_requests') AND relrowsecurity AND relforcerowsecurity) AS forced,
    (SELECT count(*)::int FROM pg_policies WHERE tablename IN ('economic_group_managers','user_deactivation_requests')) AS policies`)) as Array<{ tables: number; forced: number; policies: number }>;
  return rows[0]!;
}

if (!connectionString) {
  test("B-GRUPO-GESTOR · drill exige DATABASE_URL descartável", { skip: "Defina DATABASE_URL." });
} else {
  let admin: any;
  let db: any;
  let databaseName = "";

  after(async () => {
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  test("migração: deploy, down e up preservam atomicidade e RLS FORCE", async () => {
    const [{ PrismaClient }, pg] = await Promise.all([import("@prisma/client"), import("../src/database/pg-connection.js")]);
    admin = new PrismaClient({ adapter: pg.createPgAdapter(connectionString) });
    const source = new URL(connectionString);
    const base = decodeURIComponent(source.pathname.slice(1)) || "postgres";
    databaseName = `${base}_grupo_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    assert.match(databaseName, /^[a-z0-9_]+$/);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const target = new URL(connectionString);
    target.pathname = `/${databaseName}`;
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: target.toString() }, stdio: "pipe" });
    db = new PrismaClient({ adapter: pg.createPgAdapter(target.toString()) });
    assert.deepEqual(await catalog(db), { tables: 2, forced: 2, policies: 4 });

    await db.$transaction(down.map((statement) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalog(db), { tables: 0, forced: 0, policies: 0 });
    await db.$transaction(statements().map((statement) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalog(db), { tables: 2, forced: 2, policies: 4 });
  });

  test("migração: todo prefixo quebrado volta por inteiro", async () => {
    await db.$transaction(down.map((statement) => db.$executeRawUnsafe(statement)));
    const body = statements();
    for (let index = 1; index <= body.length; index += 1) {
      const broken = [...body.slice(0, index), `SELECT * FROM grupo_gestor_prefix_failure_${index}`];
      await assert.rejects(db.$transaction(broken.map((statement) => db.$executeRawUnsafe(statement))));
      assert.deepEqual(await catalog(db), { tables: 0, forced: 0, policies: 0 }, `prefixo ${index}`);
    }
    await db.$transaction(body.map((statement) => db.$executeRawUnsafe(statement)));
  });
}
