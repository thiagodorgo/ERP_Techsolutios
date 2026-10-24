import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { pathToFileURL } from "node:url";

// -----------------------------------------------------------------------------------------------
// B-SAN3-20 · K7 + K12 — DRILL DA MIGRAÇÃO 20260881000000_cheque_title_link EM BASE PRÓPRIA.
//
// Molde: o drill mergeado do B-SAN3-02 (`tests/work-order-invoicing-migration-drill-db.test.ts`). DDL em `cheques`
// pega ACCESS EXCLUSIVE: na base compartilhada, atrás de uma transação de suíte irmã, travaria o lote. Por isso:
//   · deriva `<db>_drill_<aleatório>` da DATABASE_URL e faz CREATE DATABASE pelo cliente admin (sem permissão =
//     VERMELHO, nunca skip);
//   · roda `prisma migrate deploy` num processo filho com a DATABASE_URL da base nova;
//   · executa os casos (a)–(e) LÁ, na ordem do arquivo; derruba a base no teardown (DROP DATABASE … WITH (FORCE)).
// O up e o down vêm do PRÓPRIO arquivo da migração (corpo e rodapé comentado): mutar o arquivo muda o drill.
//
// T-D(f) prende a atomicidade pelo `prisma migrate deploy` REAL (CLI, `--config` temporário): para k = 1..3, uma
// variante com falha injetada depois da k-ésima DDL deixa o catálogo como antes, e `resolve --rolled-back` + `deploy`
// convergem. T-D(d′) é o K12: o diff do Prisma entre a base própria e o `schema.prisma` do bloco é EXATAMENTE a
// fixture do drift pré-existente, gerada na base do bloco ANTES de qualquer edição.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const MIGRATION_NAME = "20260881000000_cheque_title_link";
const MIGRATION = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const FIXTURE = "tests/fixtures/prisma-migrate-diff-baseline.sql";
const FK = "cheques_tenant_id_title_id_fkey";
const INDEX = "cheques_tenant_id_title_id_idx";

if (!connectionString) {
  test("B-SAN3-20 T-D (drill da migração cheque × título em base própria) exige DATABASE_URL e permissão de CREATE DATABASE", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";

  type Drill = Awaited<ReturnType<typeof bootstrap>>;
  let drillPromise: Promise<Drill> | undefined;
  const drill = (): Promise<Drill> => (drillPromise ??= bootstrap());
  let createdDatabase: string | undefined;
  let adminForTeardown: any;
  const extraDatabases = new Set<string>();
  const tempDirs = new Set<string>();

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    adminForTeardown = admin;
    const source = new URL(connectionString!);
    const baseName = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    const name = `${baseName}_drill_${randomUUID().replace(/-/g, "").slice(0, 10)}`.slice(0, 63);
    assert.match(name, /^[a-z0-9_]+$/, `nome de base derivado inseguro: ${name}`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE template0`);
    createdDatabase = name;
    const url = databaseUrlFor(name);
    const startedAt = Date.now();
    execFileSync(process.execPath, [prismaCliPath(), "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
    console.log(`[drill] base própria ${name}: migrate deploy em ${Date.now() - startedAt} ms`);
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    return { admin, db, name, url };
  }

  after(async () => {
    if (drillPromise) {
      const d = await drillPromise.catch(() => undefined);
      await d?.db.$disconnect();
    }
    if (adminForTeardown) {
      for (const name of extraDatabases) await adminForTeardown.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      if (createdDatabase) await adminForTeardown.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${createdDatabase}" WITH (FORCE)`);
    }
    await adminForTeardown?.$disconnect();
    // Windows: o diretório temporário pode ficar ocupado (EBUSY) por instantes depois do último processo filho do CLI;
    // tenta por até 60 s e diz quanto levou — nunca deixa o lixo sem avisar.
    for (const dir of tempDirs) {
      const startedAt = Date.now();
      for (;;) {
        try {
          rmSync(dir, { recursive: true, force: true });
          console.log(`[drill] diretório temporário removido em ${Date.now() - startedAt} ms`);
          break;
        } catch (error) {
          if (Date.now() - startedAt > 60_000) throw error;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  });

  function databaseUrlFor(name: string): string {
    const target = new URL(connectionString!);
    target.pathname = `/${name}`;
    return target.toString();
  }

  const migrationSql = () => readFileSync(path.join(ROOT, MIGRATION), "utf8").replace(/\r\n/g, "\n");
  const prismaCliPath = (): string => createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");

  /** O corpo executável CRU da migração (sem linhas de comentário), dividido por `;` de fim de sentença. */
  function rawStatements(): string[] {
    const body = migrationSql()
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    return body
      .split(/;\s*\n/)
      .map((statement) => statement.replace(/;\s*$/, "").trim())
      .filter(Boolean);
  }

  const isTransactionControl = (statement: string): boolean => /^(BEGIN|COMMIT)$/i.test(statement);

  /** O UP: as 3 DDL entre `BEGIN` (1ª sentença) e `COMMIT` (última). */
  function upStatements(): string[] {
    const raw = rawStatements();
    assert.equal(raw[0], "BEGIN", `a migração abre com BEGIN (1ª sentença achada: ${JSON.stringify(raw[0])}; ${raw.length} sentenças)`);
    assert.equal(raw.at(-1), "COMMIT", `a migração fecha com COMMIT (última achada: ${JSON.stringify(raw.at(-1))})`);
    const statements = raw.slice(1, -1);
    assert.equal(statements.length, 3, `entre BEGIN e COMMIT a migração traz 3 sentenças (achei ${statements.length})`);
    assert.ok(!statements.some(isTransactionControl), `BEGIN/COMMIT só nas pontas (achei ${JSON.stringify(raw)})`);
    return statements;
  }

  /** O DOWN: o rodapé comentado `--   <SQL>;`, na ordem escrita. */
  function downStatements(): string[] {
    const lines = migrationSql().split("\n");
    const start = lines.findIndex((line) => /^-- down/.test(line));
    assert.ok(start >= 0, "a migração traz o rodapé `-- down`");
    const sql = lines
      .slice(start + 1)
      .filter((line) => /^--\s{2,}\S/.test(line))
      .map((line) => line.replace(/^--\s+/, "").replace(/\s--\s.*$/, "").trimEnd())
      .join("\n");
    return sql
      .split(/;\s*(?:\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);
  }

  async function catalogState(db: any): Promise<{ column: number; fk: number; index: number }> {
    const [row] = (await db.$queryRawUnsafe(
      `SELECT
         (SELECT count(*)::int FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'cheques' AND column_name = 'title_id') AS "column",
         (SELECT count(*)::int FROM pg_constraint WHERE conrelid = 'cheques'::regclass AND conname = $1) AS "fk",
         (SELECT count(*)::int FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'cheques' AND indexname = $2) AS "index"`,
      FK,
      INDEX,
    )) as Array<{ column: number; fk: number; index: number }>;
    return { column: row!.column, fk: row!.fk, index: row!.index };
  }

  function errorText(error: unknown): string {
    const record = error as { message?: string; code?: string };
    return `${record?.code ?? ""} ${record?.message ?? ""} ${JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}))}`;
  }

  async function seedTenantWithAccount(db: any, tag: string): Promise<{ tenantId: string; accountId: string }> {
    const slug = `cheque-drill-${tag}-${randomUUID().slice(0, 8)}`;
    const [tenant] = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>;
    const [account] = (await db.$queryRawUnsafe(
      `INSERT INTO financial_accounts (tenant_id, name, kind, currency, is_active) VALUES ($1::uuid, $2, 'cash', 'BRL', true) RETURNING id`,
      tenant!.id,
      `Conta ${slug}`,
    )) as Array<{ id: string }>;
    return { tenantId: tenant!.id, accountId: account!.id };
  }

  async function cleanup(db: any, tenantIds: readonly string[]): Promise<void> {
    await db.$executeRawUnsafe(`DELETE FROM cheques WHERE tenant_id = ANY($1::uuid[])`, [...tenantIds]);
    await db.$executeRawUnsafe(`DELETE FROM financial_titles WHERE tenant_id = ANY($1::uuid[])`, [...tenantIds]);
    await db.$executeRawUnsafe(`DELETE FROM financial_accounts WHERE tenant_id = ANY($1::uuid[])`, [...tenantIds]);
    await db.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, [...tenantIds]);
  }

  /** Normalização do K12: fora comentários e linhas vazias; sentenças terminadas em `;`; espaço colapsado; ordenadas. */
  function normalizeStatements(sql: string): string[] {
    return sql
      .replace(/\r\n/g, "\n")
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.trimStart().startsWith("--"))
      .join("\n")
      .split(/;\s*(?:\n|$)/)
      .map((statement) => statement.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .sort();
  }

  test("[T-D(a)] migrate deploy: coluna title_id (uuid, anulável), FK composta (tenant_id,title_id)→financial_titles(tenant_id,id) RESTRICT e índice no catálogo", async () => {
    const { db } = await drill();
    const [migration] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      MIGRATION_NAME,
    )) as Array<{ n: number }>;
    assert.equal(migration!.n, 1, "a migração do bloco foi aplicada na base própria");
    const [column] = await db.$queryRawUnsafe(
      `SELECT data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cheques' AND column_name = 'title_id'`,
    );
    assert.deepEqual(column, { data_type: "uuid", is_nullable: "YES" });
    const [fk] = (await db.$queryRawUnsafe(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`, FK)) as Array<{ def: string }>;
    assert.match(fk!.def, /FOREIGN KEY \(tenant_id, title_id\) REFERENCES financial_titles\(tenant_id, id\)/);
    assert.match(fk!.def, /ON DELETE RESTRICT/);
    const [index] = (await db.$queryRawUnsafe(`SELECT indexdef FROM pg_indexes WHERE indexname = $1`, INDEX)) as Array<{ indexdef: string }>;
    assert.match(index!.indexdef, /ON public\.cheques USING btree \(tenant_id, title_id\)/);
  });

  test("[T-D(b)] legado ANTES do up (cheques sem a coluna, um deles apagado): o up aplica com ec 0 e o legado nasce sem vínculo", async () => {
    const { db } = await drill();
    await db.$transaction(downStatements().map((statement) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalogState(db), { column: 0, fk: 0, index: 0 }, "down: catálogo sem os três objetos");
    const { tenantId, accountId } = await seedTenantWithAccount(db, "b");
    for (const deleted of [false, true]) {
      await db.$executeRawUnsafe(
        `INSERT INTO cheques (tenant_id, account_id, direction, cheque_number, bank, amount, currency, status, deleted_at)
         VALUES ($1::uuid, $2::uuid, 'received', $3, 'Banco drill', 100, 'BRL', 'registered', ${deleted ? "now()" : "NULL"})`,
        tenantId,
        accountId,
        `LEG-${randomUUID().slice(0, 8)}`,
      );
    }
    for (const statement of upStatements()) await db.$executeRawUnsafe(statement);
    assert.deepEqual(await catalogState(db), { column: 1, fk: 1, index: 1 }, "up sobre o legado");
    const [legacy] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM cheques WHERE tenant_id = $1::uuid AND title_id IS NULL`,
      tenantId,
    )) as Array<{ n: number }>;
    assert.equal(legacy!.n, 2, "todo legado (inclusive o apagado) nasce sem vínculo");
    await cleanup(db, [tenantId]);
  });

  test("[T-D(c)] up → down (rodapé, transação única) → catálogo SEM coluna, FK e índice → re-up → os três presentes", async () => {
    const { db } = await drill();
    assert.deepEqual(await catalogState(db), { column: 1, fk: 1, index: 1 }, "estado de partida: up aplicado");
    await db.$transaction(downStatements().map((statement) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalogState(db), { column: 0, fk: 0, index: 0 }, "depois do down: coluna, FK e índice ausentes");
    try {
      for (const statement of upStatements()) await db.$executeRawUnsafe(statement);
    } catch (error) {
      assert.fail(`re-up depois do down falhou (um down que deixa a coluna faz o re-up dar 42701): ${errorText(error).slice(0, 300)}`);
    }
    assert.deepEqual(await catalogState(db), { column: 1, fk: 1, index: 1 }, "depois do re-up: os três presentes");
  });

  test("[T-D(d′)/K12] o diff do Prisma entre a base própria e o schema do bloco é EXATAMENTE a fixture do drift pré-existente (nem uma sentença a mais ou a menos)", async () => {
    const { url } = await drill();
    const current = execFileSync(
      process.execPath,
      [prismaCliPath(), "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script"],
      { cwd: ROOT, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8", stdio: "pipe", timeout: 180_000 },
    );
    const now = normalizeStatements(current);
    const baseline = normalizeStatements(readFileSync(path.join(ROOT, FIXTURE), "utf8"));
    const extra = now.filter((statement) => !baseline.includes(statement));
    const missing = baseline.filter((statement) => !now.includes(statement));
    console.log(`[drill K12] diff atual: ${now.length} sentenças; fixture: ${baseline.length}; a mais: ${extra.length}; a menos: ${missing.length}`);
    assert.deepEqual(
      { extra, missing },
      { extra: [], missing: [] },
      `drift novo do bloco (delta sentença a sentença):\n+ ${extra.join("\n+ ")}\n- ${missing.join("\n- ")}`,
    );
    assert.equal(now.length, baseline.length);
  });

  test("[T-D(e)] RLS herdada: cheques segue relrowsecurity e relforcerowsecurity; a FK recusa título de OUTRA organização (23503)", async () => {
    const { db } = await drill();
    const [rls] = (await db.$queryRawUnsafe(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'public.cheques'::regclass`,
    )) as Array<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>;
    assert.deepEqual(rls, { relrowsecurity: true, relforcerowsecurity: true });
    const a = await seedTenantWithAccount(db, "e-a");
    const b = await seedTenantWithAccount(db, "e-b");
    const [title] = (await db.$queryRawUnsafe(
      `INSERT INTO financial_titles (tenant_id, direction, party_type, party_name, amount, currency, issue_date, due_date, paid_amount, status, competencia)
       VALUES ($1::uuid, 'receivable', 'customer', 'Drill', 100, 'BRL', now(), now(), 0, 'open', to_char(now(), 'YYYY-MM')) RETURNING id`,
      b.tenantId,
    )) as Array<{ id: string }>;
    let failure: unknown;
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO cheques (tenant_id, account_id, title_id, direction, cheque_number, bank, amount, currency, status)
         VALUES ($1::uuid, $2::uuid, $3::uuid, 'received', 'X', 'Banco drill', 100, 'BRL', 'registered')`,
        a.tenantId,
        a.accountId,
        title!.id,
      );
    } catch (error) {
      failure = error;
    }
    assert.ok(failure, "cheque de A apontando título de B tinha de ser recusado pelo banco");
    assert.match(errorText(failure), /23503/);
    await cleanup(db, [a.tenantId, b.tenantId]);
  });

  // ---------------------------------------------------------------------------------------------
  // T-D(f) — atomicidade no `prisma migrate deploy` REAL, por prefixo.
  // ---------------------------------------------------------------------------------------------

  const INJECTED_FAILURE = `ALTER TABLE "drill_nao_existe" ADD COLUMN "x" INT`;

  function variantWithFailureAfter(k: number): string {
    const out: string[] = [];
    let ddl = 0;
    for (const statement of rawStatements()) {
      out.push(statement);
      if (isTransactionControl(statement)) continue;
      ddl += 1;
      if (ddl === k) out.push(INJECTED_FAILURE);
    }
    assert.equal(out.filter((statement) => statement === INJECTED_FAILURE).length, 1, `variante k=${k}: falha injetada uma vez (DDL achadas: ${ddl})`);
    return `${out.map((statement) => `${statement};`).join("\n\n")}\n`;
  }

  type CliResult = { status: number | null; signal: string | null; stdout: string; stderr: string };

  function runPrisma(args: string[], configPath: string, cwd: string, databaseUrl: string): CliResult {
    try {
      const stdout = execFileSync(process.execPath, [prismaCliPath(), ...args, "--config", configPath], {
        cwd,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: "pipe",
        timeout: 180_000,
      });
      return { status: 0, signal: null, stdout: stdout.toString(), stderr: "" };
    } catch (error) {
      const failure = error as { status?: number | null; signal?: string | null; stdout?: Buffer; stderr?: Buffer };
      return { status: failure.status ?? null, signal: failure.signal ?? null, stdout: failure.stdout?.toString() ?? "", stderr: failure.stderr?.toString() ?? "" };
    }
  }

  const cliTail = (result: CliResult): string => `${result.stdout}\n${result.stderr}`.trim().slice(-600);

  async function createFromTemplate(admin: any, name: string, template: string): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        await admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
        extraDatabases.add(name);
        return;
      } catch (error) {
        if (attempt >= 20 || !/being accessed by other users/.test(errorText(error))) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  async function migrationRows(db: any): Promise<{ total: number; failed: number; finished: number; rolled_back: number }> {
    const [row] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS failed,
              count(*) FILTER (WHERE finished_at IS NOT NULL)::int AS finished,
              count(*) FILTER (WHERE rolled_back_at IS NOT NULL)::int AS rolled_back
         FROM _prisma_migrations WHERE migration_name = $1`,
      MIGRATION_NAME,
    )) as Array<{ total: number; failed: number; finished: number; rolled_back: number }>;
    return { total: row!.total, failed: row!.failed, finished: row!.finished, rolled_back: row!.rolled_back };
  }

  test("[T-D(f)] para k = 1..3: migrate deploy com falha injetada depois da k-ésima DDL deixa o catálogo como antes e uma linha falha em _prisma_migrations; resolve --rolled-back + deploy convergem", async () => {
    const { admin, name: drillName } = await drill();
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);

    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "san320-drill-"));
    tempDirs.add(tempRoot);
    const migrationsDir = path.join(tempRoot, "migrations");
    mkdirSync(migrationsDir);
    const sourceDir = path.join(ROOT, "prisma/migrations");
    const entries = readdirSync(sourceDir);
    assert.ok(entries.includes(MIGRATION_NAME), "a migração do bloco existe no repositório");
    for (const entry of entries) {
      if (entry !== MIGRATION_NAME) cpSync(path.join(sourceDir, entry), path.join(migrationsDir, entry), { recursive: true });
    }
    assert.equal(readdirSync(migrationsDir).length, entries.length - 1, "o diretório temporário tem todas as migrações menos a do bloco");
    const configPath = path.join(tempRoot, "prisma.config.mjs");
    const prismaConfigModule = createRequire(path.join(ROOT, "package.json")).resolve("prisma/config");
    writeFileSync(
      configPath,
      [
        `import * as prismaConfig from ${JSON.stringify(pathToFileURL(prismaConfigModule).href)};`,
        `const defineConfig = prismaConfig.defineConfig ?? prismaConfig.default?.defineConfig;`,
        `export default defineConfig({`,
        `  schema: ${JSON.stringify(path.join(ROOT, "prisma/schema.prisma"))},`,
        `  migrations: { path: ${JSON.stringify(migrationsDir)} },`,
        `  datasource: { url: process.env.DATABASE_URL },`,
        `});`,
        "",
      ].join("\n"),
    );

    const mainName = `${drillName}_main`;
    assert.match(mainName, /^[a-z0-9_]{1,57}$/, `nome de base derivado inseguro ou longo demais: ${mainName}`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${mainName}" TEMPLATE template0`);
    extraDatabases.add(mainName);
    const mainDeploy = runPrisma(["migrate", "deploy"], configPath, tempRoot, databaseUrlFor(mainName));
    assert.equal(mainDeploy.status, 0, `deploy da base <drill>_main pelo --config temporário: ${cliTail(mainDeploy)}`);

    const cleanMigration = readFileSync(path.join(ROOT, MIGRATION));
    const migrationFile = path.join(migrationsDir, MIGRATION_NAME, "migration.sql");
    mkdirSync(path.dirname(migrationFile));
    const failures: string[] = [];
    for (let k = 1; k <= 3; k += 1) {
      const name = `${drillName}_k${k}`;
      const url = databaseUrlFor(name);
      const startedAt = Date.now();
      let db: any;
      try {
        await createFromTemplate(admin, name, mainName);
        writeFileSync(migrationFile, variantWithFailureAfter(k));
        const failed = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
        assert.ok(
          failed.signal === null && typeof failed.status === "number" && failed.status !== 0,
          `deploy com falha injetada depois da DDL ${k} tinha de sair com ec ≠ 0 (status ${failed.status}, sinal ${failed.signal}): ${cliTail(failed)}`,
        );
        db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
        assert.deepEqual(await catalogState(db), { column: 0, fk: 0, index: 0 }, "depois do deploy falho o catálogo é o de ANTES: sem coluna, FK nem índice");
        assert.deepEqual(await migrationRows(db), { total: 1, failed: 1, finished: 0, rolled_back: 0 }, "_prisma_migrations: 1 linha falha");

        writeFileSync(migrationFile, cleanMigration);
        const blocked = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
        assert.ok(blocked.signal === null && typeof blocked.status === "number" && blocked.status !== 0, `redeploy sobre a linha falha tinha de sair com ec ≠ 0: ${cliTail(blocked)}`);
        assert.match(blocked.stderr, /P3009/, `redeploy sobre a linha falha: esperado P3009 — ${cliTail(blocked)}`);
        const resolved = runPrisma(["migrate", "resolve", "--rolled-back", MIGRATION_NAME], configPath, tempRoot, url);
        assert.equal(resolved.status, 0, `migrate resolve --rolled-back: ${cliTail(resolved)}`);
        const redeploy = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
        assert.equal(redeploy.status, 0, `deploy depois do resolve tinha de convergir: ${cliTail(redeploy)}`);
        assert.deepEqual(await catalogState(db), { column: 1, fk: 1, index: 1 }, "depois da recuperação: coluna, FK e índice");
        assert.deepEqual(await migrationRows(db), { total: 2, failed: 0, finished: 1, rolled_back: 1 }, "_prisma_migrations: 1 aplicada e 1 revertida");
        console.log(`[drill T-D(f)] k=${k}: atômico e convergente em ${Date.now() - startedAt} ms`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`k=${k}: ${message.slice(0, 700)}`);
        console.log(`[drill T-D(f)] k=${k}: FALHOU em ${Date.now() - startedAt} ms — ${message.split("\n")[0]}`);
      } finally {
        await db?.$disconnect();
        await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
        extraDatabases.delete(name);
      }
    }
    assert.deepEqual(failures, [], `T-D(f): prefixos em que a migração não foi atômica ou a recuperação não convergiu:\n${failures.join("\n")}`);
  });
}
