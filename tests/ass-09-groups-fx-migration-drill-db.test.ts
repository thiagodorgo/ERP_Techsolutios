// B-ASS-09 · F4 — drill da M6 (`20260903000000_ass09_economic_groups_fx_rates`), R-MIG-1 do plano v2.
// Numa base PRÓPRIA e descartável (criada e derrubada pela suíte; o DDL nunca toca a base das irmãs):
//   (1) o `migrate deploy` aplica as 3 tabelas, o índice único funcional de `economic_groups`, a restrição de exclusão
//       `economic_group_members_no_overlap` (`contype = 'x'`), o `btree_gist`, os CHECKs e o RLS ENABLE + FORCE com a
//       política da casa em `economic_group_members`;
//   (2) o down do runbook, numa transação só, tira as 3 tabelas e deixa a extensão (exceção declarada no plano: ela é
//       inerte sem a tabela); o corpo da M6 reaplica por cima e converge;
//   (3) todo prefixo quebrado da migração é atômico: nem tabela, nem índice, nem restrição, nem a extensão ficam.
// O guard G6 de `scripts/migration-transaction-guard.mjs` exige que este arquivo cite o nome do diretório da migração.
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
const M6 = "20260903000000_ass09_economic_groups_fx_rates";
const migrationSql = (): string =>
  readFileSync(path.join(ROOT, "prisma", "migrations", M6, "migration.sql"), "utf8").replace(/\r\n/g, "\n");

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
  assert.ok(start >= 0, "a M6 traz o runbook down");
  return lines
    .slice(start + 1)
    .filter((line) => /^--\s{3}DROP TABLE/.test(line))
    .map((line) => line.replace(/^--\s{3}/, "").replace(/;\s*$/, ""));
}

type Catalog = {
  tables: number;
  groupsNameIndex: number;
  fxUniqueIndex: number;
  memberIndexes: number;
  exclusion: number;
  checks: number;
  rlsForced: number;
  policy: number;
  fks: number;
  btreeGist: number;
};

async function catalog(db: any): Promise<Catalog> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND c.relname IN ('economic_groups', 'economic_group_members', 'platform_fx_rates')) AS "tables",
      (SELECT count(*)::int FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'economic_groups_name_active_key'
          AND indexdef ILIKE '%UNIQUE%lower(btrim(name))%WHERE (deleted_at IS NULL)%') AS "groupsNameIndex",
      (SELECT count(*)::int FROM pg_indexes WHERE schemaname = 'public'
          AND indexname = 'platform_fx_rates_month_currency_from_currency_to_version_key' AND indexdef ILIKE '%UNIQUE%') AS "fxUniqueIndex",
      (SELECT count(*)::int FROM pg_indexes WHERE schemaname = 'public' AND indexname IN
          ('economic_group_members_tenant_id_valid_from_idx', 'economic_group_members_group_id_valid_from_idx')) AS "memberIndexes",
      (SELECT count(*)::int FROM pg_constraint WHERE conname = 'economic_group_members_no_overlap' AND contype = 'x') AS "exclusion",
      (SELECT count(*)::int FROM pg_constraint WHERE contype = 'c' AND conname IN (
          'economic_groups_name_check', 'economic_group_members_valid_to_check', 'platform_fx_rates_month_check',
          'platform_fx_rates_rate_check', 'platform_fx_rates_version_check', 'platform_fx_rates_currency_check')) AS "checks",
      (SELECT count(*)::int FROM pg_class WHERE relname = 'economic_group_members'
          AND relrowsecurity AND relforcerowsecurity) AS "rlsForced",
      (SELECT count(*)::int FROM pg_policies WHERE tablename = 'economic_group_members'
          AND policyname = 'economic_group_members_tenant_isolation'
          AND qual LIKE '%app.current_tenant_id%' AND with_check LIKE '%app.current_tenant_id%') AS "policy",
      (SELECT count(*)::int FROM pg_constraint WHERE contype = 'f' AND confdeltype = 'r' AND conname IN
          ('economic_group_members_tenant_id_fkey', 'economic_group_members_group_id_fkey')) AS "fks",
      (SELECT count(*)::int FROM pg_extension WHERE extname = 'btree_gist') AS "btreeGist"`,
  )) as Catalog[];
  return rows[0]!;
}

const APPLIED: Catalog = {
  tables: 3,
  groupsNameIndex: 1,
  fxUniqueIndex: 1,
  memberIndexes: 2,
  exclusion: 1,
  checks: 6,
  rlsForced: 1,
  policy: 1,
  fks: 2,
  btreeGist: 1,
};
const ABSENT_KEEPING_EXTENSION: Catalog = {
  tables: 0,
  groupsNameIndex: 0,
  fxUniqueIndex: 0,
  memberIndexes: 0,
  exclusion: 0,
  checks: 0,
  rlsForced: 0,
  policy: 0,
  fks: 0,
  btreeGist: 1,
};
const ABSENT: Catalog = { ...ABSENT_KEEPING_EXTENSION, btreeGist: 0 };

async function tenantCount(db: any): Promise<number> {
  const rows = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM tenants`)) as Array<{ n: number }>;
  return rows[0]!.n;
}

if (!connectionString) {
  test("B-ASS-09 · drill da M6 exige DATABASE_URL e CREATE DATABASE", {
    skip: "Defina DATABASE_URL para executar o drill da migração.",
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

  test("M6 drill: migrate deploy aplica as 3 tabelas, a exclusão por intervalo, o btree_gist, os CHECKs e o RLS FORCE", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass09_m6_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
    db = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(target.toString()) });
    const applied = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      M6,
    )) as Array<{ n: number }>;
    assert.equal(applied[0]!.n, 1, "a M6 foi aplicada pelo deploy");
    assert.deepEqual(await catalog(db), APPLIED);
    const definition = (await db.$queryRawUnsafe(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'economic_group_members_no_overlap'`,
    )) as Array<{ def: string }>;
    assert.match(
      definition[0]!.def,
      /^EXCLUDE USING gist \(tenant_id WITH =, daterange\(valid_from, valid_to, '\[\)'::text\) WITH &&\)$/,
      "a exclusão compara a mesma organização e o intervalo [valid_from, valid_to)",
    );
  });

  test("M6 drill: down em transação única tira as 3 tabelas e deixa a extensão; o corpo reaplica e converge", async () => {
    assert.ok(db, "depende do deploy");
    const down = downStatements();
    assert.equal(down.length, 3, "o runbook down tem os 3 DROP TABLE");
    const tenantsBefore = await tenantCount(db);
    await db.$transaction(down.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), ABSENT_KEEPING_EXTENSION, "as tabelas saem; o btree_gist fica (exceção declarada)");
    assert.equal(await tenantCount(db), tenantsBefore, "o down não toca tenants");

    const statements = bodyStatements();
    assert.equal(statements.length, 15, "a M6 tem 15 sentenças entre o BEGIN e o COMMIT");
    await db.$transaction(statements.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), APPLIED);
  });

  test("M6 drill: todo prefixo quebrado é atômico (tabelas, índices, exclusão, RLS e extensão intactos)", async () => {
    assert.ok(db, "depende do deploy");
    await db.$transaction(downStatements().map((sql) => db.$executeRawUnsafe(sql)));
    // Sem as tabelas, a extensão não tem dependente: sai, para o prefixo k=1 provar que ela também volta atrás.
    await db.$executeRawUnsafe(`DROP EXTENSION IF EXISTS btree_gist`);
    assert.deepEqual(await catalog(db), ABSENT);
    const tenantsBefore = await tenantCount(db);
    const statements = bodyStatements();
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM ass09_m6_prefix_failure_${k}`];
      await assert.rejects(db.$transaction(broken.map((sql) => db.$executeRawUnsafe(sql))), `prefixo k=${k} falha`);
      assert.deepEqual(await catalog(db), ABSENT, `prefixo k=${k} não deixa tabela, índice, restrição, RLS nem extensão`);
      assert.equal(await tenantCount(db), tenantsBefore, `prefixo k=${k} não muda tenants`);
    }
    // E a aplicação inteira, depois dos prefixos quebrados, ainda converge.
    await db.$transaction(statements.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), APPLIED);
  });
}
