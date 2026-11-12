// B-O6R-09 · T11 — drill da migração `20260901090000_field_dispatch_idempotency_key` (a chave de repetição da criação
// do despacho, plano v2 §2.2 P3 e R-A10), numa base PRÓPRIA:
//   [up]       `migrate deploy` aplica a coluna nula, o índice único (tenant_id, created_by, idempotency_key) e o CHECK
//              que exige autor quando há chave;
//   [unicidade] a mesma (organização, autor, chave) → 23505; a mesma chave em OUTRA organização e por OUTRO autor passam;
//              chave sem autor → 23514; despachos sem chave (NULL) não colidem;
//   [legado]   down em transação única → a linha antiga sobrevive → re-up → a linha antiga fica com a chave NULA;
//   [prefixo]  todo prefixo quebrado do corpo é atômico (o arquivo tem BEGIN; … COMMIT;).
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
const MIGRATION = "20260901090000_field_dispatch_idempotency_key";
const INDEX = "field_dispatches_tenant_id_created_by_idempotency_key_key";
const CHECK = "field_dispatches_idempotency_key_requires_author";
const migrationSql = (): string => readFileSync(path.join(ROOT, "prisma", "migrations", MIGRATION, "migration.sql"), "utf8").replace(/\r\n/g, "\n");

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
  assert.ok(start >= 0, "a migração contém o runbook down");
  return lines
    .slice(start + 1)
    .filter((line) => /^--\s{3}(DROP|ALTER)/.test(line))
    .map((line) => line.replace(/^--\s{3}/, "").replace(/;\s*$/, ""));
}

async function catalog(db: any): Promise<{ column: number; nullable: number; index: number; check: number }> {
  const [row] = (await db.$queryRawUnsafe(
    `SELECT
      (SELECT count(*)::int FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'field_dispatches' AND column_name = 'idempotency_key') AS column,
      (SELECT count(*)::int FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'field_dispatches' AND column_name = 'idempotency_key' AND is_nullable = 'YES' AND data_type = 'text') AS nullable,
      (SELECT count(*)::int FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
         WHERE c.relname = '${INDEX}' AND i.indisunique
           AND pg_get_indexdef(i.indexrelid) LIKE '%(tenant_id, created_by, idempotency_key)%') AS index,
      (SELECT count(*)::int FROM pg_constraint WHERE conname = '${CHECK}' AND contype = 'c') AS check`,
  )) as Array<{ column: number; nullable: number; index: number; check: number }>;
  return row!;
}

function sqlState(error: unknown): string | undefined {
  const codes: string[] = [];
  const collect = (candidate: unknown, depth: number): void => {
    if (depth > 5 || typeof candidate !== "object" || candidate === null) return;
    const record = candidate as Record<string, unknown>;
    for (const key of ["code", "originalCode"]) if (typeof record[key] === "string") codes.push(record[key] as string);
    collect(record.cause, depth + 1);
    collect(record.meta, depth + 1);
    collect(record.driverAdapterError, depth + 1);
  };
  collect(error, 0);
  return codes.find((code) => /^\d{5}$/.test(code)) ?? codes.find((code) => /^P\d{4}$/.test(code));
}

async function expectSqlState(promise: Promise<unknown>, expected: string, label: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const state = sqlState(error);
    assert.ok(state === expected || (expected === "23505" && state === "P2002"), `${label}: esperado ${expected}, veio ${state} (${String((error as Error).message).slice(0, 200)})`);
    return;
  }
  assert.fail(`${label}: era para falhar com ${expected} e passou`);
}

if (!connectionString) {
  test("B-O6R-09 · drill da chave do despacho exige DATABASE_URL e CREATE DATABASE", {
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

  async function seed(tag: string): Promise<{ tenantId: string; userId: string; otherUserId: string; workOrderId: string; operatorId: string }> {
    const slug = `b-o6r-09-drill-${tag}-${randomUUID().slice(0, 8)}`;
    const [{ id: tenantId }] = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id::text`, slug)) as Array<{ id: string }>;
    const user = async (nome: string): Promise<string> =>
      (
        (await db.$queryRawUnsafe(`INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id::text`, tenantId, nome, `${nome}-${slug}@example.com`)) as Array<{ id: string }>
      )[0]!.id;
    const userId = await user("autor");
    const otherUserId = await user("outro");
    const operatorId = await user("tecnico");
    const [{ id: workOrderId }] = (await db.$queryRawUnsafe(
      `INSERT INTO work_orders (tenant_id, code, title) VALUES ($1::uuid, $2, 'OS drill') RETURNING id::text`,
      tenantId,
      `OS-${slug}`,
    )) as Array<{ id: string }>;
    return { tenantId, userId, otherUserId, workOrderId, operatorId };
  }

  const insertDispatch = (s: { tenantId: string; workOrderId: string; operatorId: string }, createdBy: string | null, key: string | null) =>
    db.$executeRawUnsafe(
      `INSERT INTO field_dispatches (tenant_id, work_order_id, operator_user_id, created_by, idempotency_key, metadata)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, '{}'::jsonb)`,
      s.tenantId,
      s.workOrderId,
      s.operatorId,
      createdBy,
      key,
    );

  test("[up] migrate deploy aplica a coluna nula, o índice único (tenant_id, created_by, idempotency_key) e o CHECK; o arquivo é BEGIN; … COMMIT;", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_b_o6r_09_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    assert.match(databaseName, /^[a-z0-9_]+$/);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const target = new URL(connectionString!);
    target.pathname = `/${databaseName}`;
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: target.toString() }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString() }) });
    const [{ n }] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      MIGRATION,
    )) as Array<{ n: number }>;
    assert.equal(n, 1, "a migração não foi aplicada");
    assert.deepEqual(await catalog(db), { column: 1, nullable: 1, index: 1, check: 1 });
    const text = migrationSql().split("\n").filter((line) => line.trim() && !line.trimStart().startsWith("--"));
    assert.equal(text[0]?.trim(), "BEGIN;", "a 1ª sentença é BEGIN;");
    assert.equal(text.at(-1)?.trim(), "COMMIT;", "a última sentença é COMMIT;");
  });

  test("[unicidade] mesma (organização, autor, chave) → 23505; outra organização e outro autor passam; chave sem autor → 23514; NULL não colide", async () => {
    assert.ok(db, "depende do deploy");
    const a = await seed("a");
    const b = await seed("b");
    const key = `b-o6r-09-${randomUUID()}`;
    await insertDispatch(a, a.userId, key);
    await expectSqlState(insertDispatch(a, a.userId, key), "23505", "a mesma chave do mesmo autor na mesma organização");
    await insertDispatch(b, b.userId, key);
    await insertDispatch(a, a.otherUserId, key);
    await expectSqlState(insertDispatch(a, null, `b-o6r-09-${randomUUID()}`), "23514", "chave sem autor");
    await insertDispatch(a, a.userId, null);
    await insertDispatch(a, a.userId, null);
    await insertDispatch(a, null, null);
  });

  test("[legado] down em transação única → a linha antiga sobrevive → re-up → a chave da linha antiga é NULA", async () => {
    assert.ok(db, "depende do deploy");
    const down = downStatements();
    assert.equal(down.length, 3, "o runbook down tem 3 sentenças (índice, CHECK, coluna)");
    await db.$transaction(down.map((statement: string) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalog(db), { column: 0, nullable: 0, index: 0, check: 0 });
    const legado = await seed("legado");
    const [{ id }] = (await db.$queryRawUnsafe(
      `INSERT INTO field_dispatches (tenant_id, work_order_id, operator_user_id, created_by, metadata)
       VALUES ($1::uuid, $2::uuid, $3::uuid, NULL, '{}'::jsonb) RETURNING id::text`,
      legado.tenantId,
      legado.workOrderId,
      legado.operatorId,
    )) as Array<{ id: string }>;
    await db.$transaction(bodyStatements().map((statement: string) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalog(db), { column: 1, nullable: 1, index: 1, check: 1 });
    const [linha] = (await db.$queryRawUnsafe(`SELECT idempotency_key FROM field_dispatches WHERE id = $1::uuid`, id)) as Array<{ idempotency_key: string | null }>;
    assert.equal(linha!.idempotency_key, null, "a linha antiga ganhou chave");
  });

  test("[prefixo] todo prefixo quebrado do corpo é atômico (nada fica pela metade)", async () => {
    assert.ok(db, "depende do deploy");
    await db.$transaction(downStatements().map((statement: string) => db.$executeRawUnsafe(statement)));
    const statements = bodyStatements();
    assert.equal(statements.length, 3, "o corpo tem 3 sentenças de DDL (coluna, CHECK, índice)");
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM b_o6r_09_prefix_failure_${k}`];
      await assert.rejects(db.$transaction(broken.map((statement: string) => db.$executeRawUnsafe(statement))));
      assert.deepEqual(await catalog(db), { column: 0, nullable: 0, index: 0, check: 0 }, `prefixo k=${k} deixou resíduo`);
    }
    await db.$transaction(statements.map((statement: string) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalog(db), { column: 1, nullable: 1, index: 1, check: 1 });
  });
}
