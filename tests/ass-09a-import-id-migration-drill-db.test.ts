// B-ASS-09a · F1m — drill da M-09a (`20260902000000_ass09a_allocation_run_import_id`), R2-03 e R2-08 da Emenda 1.
// Numa base PRÓPRIA e descartável (criada e derrubada pela suíte; o DDL nunca toca a base das irmãs):
//   (1) o `migrate deploy` aplica a coluna, a FK `ON DELETE SET NULL` e o índice;
//   (2) o down do runbook, numa transação só, tira os três; o backfill trata os 4 casos — `importId` de importação que
//       existe → preenchido; UUID sem importação → NULL; texto que não é UUID (`'nao-e-uuid'`) → NULL, sem abortar a
//       migração (o cast fica dentro do `CASE`); `null` → NULL —, e apagar a importação deixa `import_id` NULL;
//   (3) todo prefixo quebrado da migração é atômico: nem catálogo nem dado mudam.
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
const M09A = "20260902000000_ass09a_allocation_run_import_id";
const migrationSql = (): string =>
  readFileSync(path.join(ROOT, "prisma", "migrations", M09A, "migration.sql"), "utf8").replace(/\r\n/g, "\n");

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
  assert.ok(start >= 0, "a M-09a traz o runbook down");
  return lines
    .slice(start + 1)
    .filter((line) => /^--\s{3}(DROP|ALTER)/.test(line))
    .map((line) => line.replace(/^--\s{3}/, "").replace(/;\s*$/, ""));
}

type Catalog = { columns: number; fkSetNull: number; indexes: number };

async function catalog(db: any): Promise<Catalog> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT
      (SELECT count(*)::int FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'cloud_cost_allocation_runs' AND column_name = 'import_id') AS "columns",
      (SELECT count(*)::int FROM pg_constraint
        WHERE conname = 'cloud_cost_allocation_runs_import_id_fkey' AND confdeltype = 'n') AS "fkSetNull",
      (SELECT count(*)::int FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'cloud_cost_allocation_runs_import_id_idx') AS "indexes"`,
  )) as Catalog[];
  return rows[0]!;
}

const APPLIED: Catalog = { columns: 1, fkSetNull: 1, indexes: 1 };
const ABSENT: Catalog = { columns: 0, fkSetNull: 0, indexes: 0 };

type Seed = { importId: string; existing: string; missingUuid: string; notUuid: string; nullImport: string };

/** A importação que existe e as 4 runs do backfill, gravadas ANTES da M-09a (coluna ausente). */
async function seedLegacyRuns(db: any): Promise<Seed> {
  const imports = (await db.$queryRawUnsafe(
    `INSERT INTO cloud_cost_imports (provider, source_type, status, metadata)
     VALUES ('aws', 'manual_csv', 'completed', '{}'::jsonb) RETURNING id`,
  )) as Array<{ id: string }>;
  const importId = imports[0]!.id;
  const insertRun = async (metadata: Record<string, unknown>): Promise<string> => {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO cloud_cost_allocation_runs (provider, status, period_start, period_end, strategy, metadata)
       VALUES ('aws', 'completed', '2033-06-01T00:00:00Z', '2033-06-30T23:59:59.999Z', 'direct_tag_then_usage_weighted_v1', $1::jsonb)
       RETURNING id`,
      JSON.stringify(metadata),
    )) as Array<{ id: string }>;
    return rows[0]!.id;
  };
  return {
    importId,
    existing: await insertRun({ importId, importResolution: "explicit" }),
    missingUuid: await insertRun({ importId: randomUUID(), importResolution: "explicit" }),
    notUuid: await insertRun({ importId: "nao-e-uuid", importResolution: "explicit" }),
    nullImport: await insertRun({ importId: null, importResolution: "none" }),
  };
}

async function importIdOf(db: any, runId: string): Promise<string | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT import_id::text AS "importId" FROM cloud_cost_allocation_runs WHERE id = $1::uuid`,
    runId,
  )) as Array<{ importId: string | null }>;
  assert.equal(rows.length, 1, `a run ${runId} existe`);
  return rows[0]!.importId;
}

async function runCount(db: any): Promise<number> {
  const rows = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM cloud_cost_allocation_runs`)) as Array<{ n: number }>;
  return rows[0]!.n;
}

if (!connectionString) {
  test("B-ASS-09a · drill da M-09a exige DATABASE_URL e CREATE DATABASE", {
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

  test("M-09a drill: migrate deploy aplica a coluna import_id, a FK ON DELETE SET NULL e o índice", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass09a_m09a_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
    const applied = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      M09A,
    )) as Array<{ n: number }>;
    assert.equal(applied[0]!.n, 1, "a M-09a foi aplicada pelo deploy");
    assert.deepEqual(await catalog(db), APPLIED);
  });

  test("M-09a drill: down em transação única, backfill dos 4 casos (preenchido, UUID inexistente, texto, null) e SET NULL", async () => {
    assert.ok(db, "depende do deploy");
    const down = downStatements();
    assert.equal(down.length, 3, "o runbook down tem o DROP INDEX, o DROP CONSTRAINT e o DROP COLUMN");
    await db.$transaction(down.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), ABSENT);

    const seed = await seedLegacyRuns(db);
    const statements = bodyStatements();
    await db.$transaction(statements.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), APPLIED);

    assert.deepEqual(
      [
        await importIdOf(db, seed.existing),
        await importIdOf(db, seed.missingUuid),
        await importIdOf(db, seed.notUuid),
        await importIdOf(db, seed.nullImport),
      ],
      [seed.importId, null, null, null],
      "preenchido (importação que existe) · NULL (UUID sem importação) · NULL ('nao-e-uuid', sem abortar) · NULL (null)",
    );
    assert.equal(statements.length, 4, "a M-09a tem 4 sentenças: coluna, FK, índice e backfill");

    // SET NULL: apagar a importação não apaga a run; a coluna volta a NULL e o metadata segue com a referência.
    await db.$executeRawUnsafe(`DELETE FROM cloud_cost_imports WHERE id = $1::uuid`, seed.importId);
    assert.equal(await importIdOf(db, seed.existing), null, "apagar a importação deixa import_id NULL");
    const metadata = (await db.$queryRawUnsafe(
      `SELECT metadata->>'importId' AS "importId" FROM cloud_cost_allocation_runs WHERE id = $1::uuid`,
      seed.existing,
    )) as Array<{ importId: string }>;
    assert.equal(metadata[0]!.importId, seed.importId, "o metadata continua guardando a referência");
  });

  test("M-09a drill: todo prefixo quebrado é atômico (catálogo e dado intactos)", async () => {
    assert.ok(db, "depende do deploy");
    await db.$transaction(downStatements().map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), ABSENT);
    const seed = await seedLegacyRuns(db);
    const runsBefore = await runCount(db);
    const statements = bodyStatements();
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM ass09a_prefix_failure_${k}`];
      await assert.rejects(db.$transaction(broken.map((sql) => db.$executeRawUnsafe(sql))), `prefixo k=${k} falha`);
      assert.deepEqual(await catalog(db), ABSENT, `prefixo k=${k} não deixa coluna, FK nem índice`);
      assert.equal(await runCount(db), runsBefore, `prefixo k=${k} não muda as runs`);
    }
    // E a aplicação inteira, depois dos prefixos quebrados, ainda converge.
    await db.$transaction(statements.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), APPLIED);
    assert.equal(await importIdOf(db, seed.existing), seed.importId);
  });
}
