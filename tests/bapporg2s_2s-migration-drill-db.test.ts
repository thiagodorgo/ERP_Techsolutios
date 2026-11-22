
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S (S1) — DRILL DA MIGRAÇÃO 20260907000000_apporg2s_registro_e_concessao EM BASE PRÓPRIA.
//   (a) o `migrate deploy` aplica a tabela `user_creation_log` (RLS FORCE, índice único parcial
//       `em_curso`) e o modo `concessao` nos dois CHECK de `auth_identity_links`/`auth_identity_link_events`;
//   (b) o down do runbook, numa transação só, apaga a tabela e restaura os dois CHECK sem `concessao`;
//       o corpo reaplicado converge;
//   (c) todo prefixo quebrado do corpo é atômico: nenhum prefixo deixa tabela, índice, política
//       nem CHECK novo.
// O guard G6 de `scripts/migration-transaction-guard.mjs` exige que este arquivo cite o nome do diretório.
// Molde: `tests/ass-09a-import-id-migration-drill-db.test.ts`.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_NAME = "20260907000000_apporg2s_registro_e_concessao";
const MIGRATION = path.join(ROOT, "prisma", "migrations", MIGRATION_NAME, "migration.sql");

const migrationSql = (): string => readFileSync(MIGRATION, "utf8").replace(/\r\n/g, "\n");

function bodyStatements(): string[] {
  return migrationSql()
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((statement) => statement.replace(/;\s*$/, "").trim())
    .filter((statement) => statement && !/^(BEGIN|COMMIT)$/i.test(statement));
}

function downStatements(): string[] {
  const lines = migrationSql().split("\n");
  const start = lines.findIndex((line) => line.startsWith("-- down"));
  assert.ok(start >= 0, "a migração traz o runbook down");
  return lines
    .slice(start + 1)
    .filter((line) => /^--\s{3}(DROP|ALTER)/.test(line))
    .map((line) => line.replace(/^--\s{3}/, "").replace(/;\s*$/, ""));
}

type Catalog = { table: number; stateConcessao: number; linksConcessao: number; eventsConcessao: number; partialIndex: number };

async function catalog(db: any): Promise<Catalog> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'user_creation_log' AND c.relkind = 'r') AS "table",
      (SELECT count(*)::int FROM pg_constraint
        WHERE conname = 'user_creation_log_state_chk' AND pg_get_constraintdef(oid) LIKE '%''concessao''%') AS "stateConcessao",
      (SELECT count(*)::int FROM pg_constraint
        WHERE conname = 'auth_identity_links_attached_via_chk' AND pg_get_constraintdef(oid) LIKE '%''concessao''%') AS "linksConcessao",
      (SELECT count(*)::int FROM pg_constraint
        WHERE conname = 'auth_identity_link_events_event_chk' AND pg_get_constraintdef(oid) LIKE '%''concessao''%') AS "eventsConcessao",
      (SELECT count(*)::int FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'user_creation_log_em_curso_key') AS "partialIndex"`,
  )) as Catalog[];
  return rows[0]!;
}

const APPLIED: Catalog = { table: 1, stateConcessao: 1, linksConcessao: 1, eventsConcessao: 1, partialIndex: 1 };
const ABSENT: Catalog = { table: 0, stateConcessao: 0, linksConcessao: 0, eventsConcessao: 0, partialIndex: 0 };

if (!connectionString) {
  test("B-APP-ORG-2S (drill da migração em base própria) exige DATABASE_URL e permissão de CREATE DATABASE", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
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

  test("apporg2s drill (a): migrate deploy aplica tabela, índice parcial e os dois CHECK com 'concessao'", async () => {
    const { createPrismaClient } = await import("../src/database/pg-connection.js");
    admin = createPrismaClient(connectionString!);
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_apporg2s_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
    db = createPrismaClient(target.toString());
    const applied = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      MIGRATION_NAME,
    )) as Array<{ n: number }>;
    assert.equal(applied[0]!.n, 1, "a migração foi aplicada pelo deploy");
    assert.deepEqual(await catalog(db), APPLIED);
  });

  test("apporg2s drill (b): down em transação única apaga tabela e restaura os CHECK; o corpo reaplicado converge", async () => {
    assert.ok(db, "depende do (a)");
    const down = downStatements();
    assert.equal(down.length, 5, "o runbook down tem o DROP TABLE e os 4 ALTER dos CHECK");
    await db.$transaction(down.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), ABSENT);

    const statements = bodyStatements();
    assert.equal(statements.length, 12, "o corpo tem 12 sentenças");
    await db.$transaction(statements.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), APPLIED);
  });

  test("apporg2s drill (c): todo prefixo quebrado do corpo é atômico; o corpo inteiro converge", async () => {
    assert.ok(db, "depende do (a)");
    await db.$transaction(downStatements().map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), ABSENT);
    const statements = bodyStatements();
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM apporg2s_prefix_failure_${k}`];
      await assert.rejects(db.$transaction(broken.map((sql) => db.$executeRawUnsafe(sql))), `prefixo k=${k} falha`);
      assert.deepEqual(await catalog(db), ABSENT, `prefixo k=${k} não deixa tabela, índice, política nem CHECK novo`);
    }
    await db.$transaction(statements.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), APPLIED);
  });
}
