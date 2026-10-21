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
// B-TRC-02 · T-M — DRILL DA MIGRAÇÃO 20260879000000_vehicle_telemetry_events (+ a 20260880000000, só VALIDATE) EM BASE
// PRÓPRIA (emenda v2.3; achado D1 do DBA de 2026-10-20). Molde: tests/work-order-invoicing-migration-drill-db.test.ts
// (T-D(f) do B-SAN3-02) — o arnês é o dele; muda só o que é deste bloco.
//
// O `prisma migrate deploy` 7.8 executa o script sentença a sentença, em autocommit; por isso a A traz BEGIN/COMMIT
// explícitos em volta das 17 sentenças. Este arquivo prende, pelo COMPORTAMENTO e com o CLI real:
//   (a) o deploy aplica A e B e a forma da A (BEGIN, 17 sentenças, COMMIT);
//   (b) o down do rodapé, em transação ÚNICA e sem dado, volta o catálogo ao da main, e o re-up pelo deploy converge;
//   (c) a guarda é a 1ª sentença do down e enxerga a amostra pendurada em recibo de posição (R1): para com 22P02 antes
//       de qualquer DROP, mesmo em autocommit;
//   (d) sem a guarda, em transação única, o 23514 do re-estreitamento do CHECK desfaz tudo (R2);
//   (e) para k = 1..17, falha injetada depois da k-ésima sentença deixa o catálogo como ANTES, e
//       `resolve --rolled-back` + `deploy` convergem;
//   (f) a B é reaplicável (o VALIDATE commita sozinho; resolve + deploy convergem).
// Assere ESTADO do catálogo, nunca a mensagem do CLI (que mostra só "current transaction is aborted"). Base própria por
// CREATE DATABASE (sem permissão = VERMELHO, nunca skip); todas as bases e o diretório temporário caem no teardown.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const MIGRATION_A = "20260879000000_vehicle_telemetry_events";
const MIGRATION_B = "20260880000000_validate_receipt_message_kind_check";

type CatalogState = {
  table: boolean;
  receiptIndex: number;
  policies: number;
  newTableIndexes: number;
  fks: number;
  check: string;
  checkValid: boolean | null;
};
const ANTES: CatalogState = {
  table: false,
  receiptIndex: 0,
  policies: 0,
  newTableIndexes: 0,
  fks: 0,
  check: "CHECK ((message_kind = 'position'::text))",
  checkValid: true,
};
const INTEIRO: CatalogState = {
  table: true,
  receiptIndex: 1,
  policies: 1,
  newTableIndexes: 6,
  fks: 4,
  check: "CHECK ((message_kind = ANY (ARRAY['position'::text, 'event'::text])))",
  checkValid: true,
};

if (!connectionString) {
  test("B-TRC-02 T-M (drill da migração em base própria) exige DATABASE_URL e permissão de CREATE DATABASE", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";

  type Drill = Awaited<ReturnType<typeof bootstrap>>;
  let drillPromise: Promise<Drill> | undefined;
  const drill = (): Promise<Drill> => (drillPromise ??= bootstrap());
  let createdDatabase: string | undefined;
  let adminForTeardown: any;
  /** Bases do T-M(e)/(f) (`<drill>_main`, `<drill>_k<k>`, `<drill>_b`) e os diretórios temporários: caem no teardown. */
  const extraDatabases = new Set<string>();
  const tempDirs = new Set<string>();

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    adminForTeardown = admin;

    const source = new URL(connectionString!);
    const baseName = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    const name = `${baseName}_mdrill_${randomUUID().replace(/-/g, "").slice(0, 10)}`.slice(0, 63);
    assert.match(name, /^[a-z0-9_]+$/, `nome de base derivado inseguro: ${name}`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE template0`);
    createdDatabase = name;

    const startedAt = Date.now();
    execFileSync(process.execPath, [prismaCliPath(), "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: databaseUrlFor(name) },
      stdio: "pipe",
    });
    console.log(`[drill T-M] base própria ${name}: migrate deploy em ${Date.now() - startedAt} ms`);
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrlFor(name) }) });
    return { admin, db, name };
  }

  after(async () => {
    if (drillPromise) {
      const d = await drillPromise.catch(() => undefined);
      await d?.db.$disconnect();
    }
    if (adminForTeardown) {
      for (const name of extraDatabases) {
        await adminForTeardown.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      }
    }
    if (createdDatabase && adminForTeardown) {
      await adminForTeardown.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${createdDatabase}" WITH (FORCE)`);
    }
    await adminForTeardown?.$disconnect();
    for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  });

  const migrationPath = (name: string) => path.join(ROOT, "prisma/migrations", name, "migration.sql");
  const migrationSql = (name = MIGRATION_A) => readFileSync(migrationPath(name), "utf8").replace(/\r\n/g, "\n");
  const prismaCliPath = (): string => createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");

  function databaseUrlFor(name: string): string {
    const target = new URL(connectionString!);
    target.pathname = `/${name}`;
    return target.toString();
  }

  /** O corpo executável CRU da migração (sem comentários), dividido por `;` de fim de sentença — sem asserção de forma. */
  function rawStatements(name = MIGRATION_A): string[] {
    const body = migrationSql(name)
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    return body
      .split(/;\s*\n/)
      .map((statement) => statement.replace(/;\s*$/, "").trim())
      .filter(Boolean);
  }

  const isTransactionControl = (statement: string): boolean => /^(BEGIN|COMMIT)$/i.test(statement);

  /** O UP da A: as 17 sentenças entre `BEGIN` (1ª) e `COMMIT` (última). A prova de atomicidade é o T-M(e). */
  function upStatements(): string[] {
    const raw = rawStatements();
    assert.equal(raw[0], "BEGIN", `a migração A abre com BEGIN (1ª sentença achada: ${JSON.stringify(raw[0])}; ${raw.length} sentenças)`);
    assert.equal(raw.at(-1), "COMMIT", `a migração A fecha com COMMIT (última achada: ${JSON.stringify(raw.at(-1))}; ${raw.length} sentenças)`);
    const statements = raw.slice(1, -1);
    assert.equal(statements.length, 17, `entre BEGIN e COMMIT, a A traz 17 sentenças (achei ${statements.length})`);
    assert.ok(!statements.some(isTransactionControl), `BEGIN/COMMIT só nas pontas (achei ${JSON.stringify(raw.map((s) => s.slice(0, 30)))})`);
    return statements;
  }

  /** O DOWN: o rodapé comentado `--   <SQL>;`, na ordem escrita; a guarda é a 1ª sentença. */
  function downStatements(): string[] {
    const lines = migrationSql().split("\n");
    const start = lines.findIndex((line) => /^-- down/.test(line));
    assert.ok(start >= 0, "a migração traz o rodapé `-- down`");
    const sql = lines
      .slice(start + 1)
      .filter((line) => /^--\s{2,}\S/.test(line))
      .map((line) => line.replace(/^--\s+/, "").replace(/\s--\s.*$/, "").trimEnd())
      .filter((line) => !/^--/.test(line))
      .join("\n");
    const statements = sql
      .split(/;\s*(?:\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);
    assert.equal(statements.length, 6, `o down traz 6 sentenças (achei ${statements.length}): ${JSON.stringify(statements)}`);
    assert.match(statements[0]!, /^SELECT CASE WHEN n = 0 THEN 'ok'/, "a 1ª sentença do down é a guarda");
    assert.ok(statements[0]!.includes('"vehicle_telemetry_events"'), "a guarda conta a tabela de telemetria inteira");
    assert.ok(statements[0]!.includes(`"message_kind" <> 'position'`), "a guarda conta os recibos que não são de posição");
    assert.match(statements[1]!, /^DROP TABLE IF EXISTS "vehicle_telemetry_events"/, "a 2ª sentença derruba a tabela");
    assert.match(statements[5]!, /^DELETE FROM "_prisma_migrations"/, "a última limpa _prisma_migrations");
    return statements;
  }

  function errorText(error: unknown): string {
    const record = error as { message?: string; code?: string };
    return `${record?.code ?? ""} ${record?.message ?? ""} ${JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}))}`;
  }

  /** Replay do down: `single-transaction` = tudo ou nada; `autocommit` = sentença a sentença, parando na 1ª rejeição. */
  async function replayDown(db: any, statements: readonly string[], mode: "single-transaction" | "autocommit"): Promise<void> {
    const run = async (executor: any, statement: string) =>
      statement.startsWith("SELECT") ? executor.$queryRawUnsafe(statement) : executor.$executeRawUnsafe(statement);
    if (mode === "single-transaction") {
      await db.$transaction(
        async (tx: any) => {
          for (const statement of statements) await run(tx, statement);
        },
        { timeout: 60_000, maxWait: 10_000 },
      );
      return;
    }
    for (const statement of statements) await run(db, statement);
  }

  async function expectRejection(promise: Promise<unknown>, state: string, label: string): Promise<string> {
    let error: unknown;
    try {
      await promise;
    } catch (caught) {
      error = caught;
    }
    assert.ok(error, `${label}: tinha de ser recusado pelo banco (${state})`);
    const text = errorText(error);
    assert.match(text, new RegExp(state), `${label}: esperado ${state} — ${text.slice(0, 400)}`);
    return text;
  }

  async function catalogState(db: any): Promise<CatalogState> {
    const [row] = (await db.$queryRawUnsafe(
      `SELECT
         to_regclass('public.vehicle_telemetry_events') IS NOT NULL AS "table",
         (SELECT count(*)::int FROM pg_indexes WHERE indexname = 'traccar_ingress_receipts_tenant_id_id_vehicle_binding_key') AS "receiptIndex",
         (SELECT count(*)::int FROM pg_policies WHERE tablename = 'vehicle_telemetry_events') AS "policies",
         (SELECT count(*)::int FROM pg_indexes WHERE tablename = 'vehicle_telemetry_events') AS "newTableIndexes",
         (SELECT count(*)::int FROM pg_constraint WHERE conrelid = to_regclass('public.vehicle_telemetry_events') AND contype = 'f') AS "fks",
         (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'traccar_ingress_receipts_message_kind_check') AS "check",
         (SELECT convalidated FROM pg_constraint WHERE conname = 'traccar_ingress_receipts_message_kind_check') AS "checkValid"`,
    )) as Array<CatalogState & { check: string | null }>;
    return { ...row!, check: row!.check ?? "SEM-CHECK", checkValid: row!.checkValid ?? null };
  }

  async function migrationRows(db: any, name: string): Promise<{ total: number; failed: number; finished: number; rolled_back: number }> {
    const [row] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS failed,
              count(*) FILTER (WHERE finished_at IS NOT NULL)::int AS finished,
              count(*) FILTER (WHERE rolled_back_at IS NOT NULL)::int AS rolled_back
         FROM _prisma_migrations WHERE migration_name = $1`,
      name,
    )) as Array<{ total: number; failed: number; finished: number; rolled_back: number }>;
    return { total: row!.total, failed: row!.failed, finished: row!.finished, rolled_back: row!.rolled_back };
  }

  /** Organização + viatura + vínculo + recibo do tipo pedido; devolve os ids para pendurar uma linha de telemetria. */
  async function seedReceipt(db: any, kind: "position" | "event") {
    const tag = randomUUID().slice(0, 8);
    const [tenant] = await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id::text AS id`, `mdrill-${tag}`);
    const tenantId = (tenant as { id: string }).id;
    const vehicleId = randomUUID();
    await db.$executeRawUnsafe(
      `INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ($1::uuid, $2::uuid, $3, 'Viatura drill')`,
      vehicleId,
      tenantId,
      `MD${tag.slice(0, 5).toUpperCase()}`,
    );
    const [binding] = await db.$queryRawUnsafe(
      `INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key)
       VALUES ($1::uuid, $2::uuid, 'mdrill', $3) RETURNING id::text AS id`,
      tenantId,
      vehicleId,
      `dev${tag}`,
    );
    const bindingId = (binding as { id: string }).id;
    const key = randomUUID().replace(/-/g, "").padEnd(64, "0");
    const [receipt] = await db.$queryRawUnsafe(
      `INSERT INTO traccar_ingress_receipts (tenant_id, instance_key, message_kind, external_event_key, payload_digest, binding_id, vehicle_id, traccar_device_id, fix_time)
       VALUES ($1::uuid, 'mdrill', $2, $3, $3, $4::uuid, $5::uuid, '1', now()) RETURNING id::text AS id`,
      tenantId,
      kind,
      key,
      bindingId,
      vehicleId,
    );
    return { tenantId, vehicleId, bindingId, receiptId: (receipt as { id: string }).id };
  }

  async function wipeSeeds(db: any): Promise<void> {
    if ((await catalogState(db)).table) {
      await db.$executeRawUnsafe(`DELETE FROM vehicle_telemetry_events WHERE receipt_id IN (SELECT id FROM traccar_ingress_receipts WHERE instance_key = 'mdrill')`);
    }
    for (const table of ["traccar_ingress_receipts", "vehicle_tracking_bindings"]) {
      await db.$executeRawUnsafe(`DELETE FROM ${table} WHERE instance_key = 'mdrill'`);
    }
    await db.$executeRawUnsafe(`DELETE FROM vehicles WHERE model = 'Viatura drill'`);
    await db.$executeRawUnsafe(`DELETE FROM tenants WHERE slug LIKE 'mdrill-%'`);
  }

  const telemetryRows = async (db: any) =>
    ((await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM vehicle_telemetry_events`)) as Array<{ n: number }>)[0]!.n;

  test("[T-M(a)] migrate deploy numa base própria aplica A e B: catálogo INTEIRO (tabela com 6 índices, 4 FKs e política; índice de 4 colunas no recibo; CHECK alargado e VALIDADO); forma: BEGIN, 17 sentenças, COMMIT", { timeout: 180_000 }, async () => {
    const { db } = await drill();
    assert.equal((await migrationRows(db, MIGRATION_A)).finished, 1, "A aplicada");
    assert.equal((await migrationRows(db, MIGRATION_B)).finished, 1, "B aplicada");
    assert.deepEqual(await catalogState(db), INTEIRO);
    assert.equal(upStatements().length, 17);
  });

  test("[T-M(b)] down (ponta A, sem dado) em transação ÚNICA volta o catálogo ao da main (tabela e índice do recibo ausentes, CHECK = 'position' válido, _prisma_migrations sem A/B); o re-up pelo migrate deploy REAL converge (A e B aplicadas, CHECK validado)", { timeout: 180_000 }, async () => {
    const { db, name } = await drill();
    await replayDown(db, downStatements(), "single-transaction");
    assert.deepEqual(await catalogState(db), ANTES, "depois do down: o catálogo da main");
    assert.equal((await migrationRows(db, MIGRATION_A)).total, 0, "_prisma_migrations sem A");
    assert.equal((await migrationRows(db, MIGRATION_B)).total, 0, "_prisma_migrations sem B");
    execFileSync(process.execPath, [prismaCliPath(), "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: databaseUrlFor(name) },
      stdio: "pipe",
      timeout: 180_000,
    });
    assert.deepEqual(await catalogState(db), INTEIRO, "re-up pelo deploy real: catálogo inteiro");
    assert.equal((await migrationRows(db, MIGRATION_A)).finished, 1);
    assert.equal((await migrationRows(db, MIGRATION_B)).finished, 1);
  });

  test("[T-M(c)] ponta B, forma R1 (operador em AUTOCOMMIT, sentença a sentença): com 1 amostra 'sample' pendurada em recibo 'position' e NENHUM recibo de evento, a 1ª sentença (a guarda) falha com 22P02 e a mensagem traz a contagem; nada foi apagado", { timeout: 180_000 }, async () => {
    const { db } = await drill();
    const seed = await seedReceipt(db, "position");
    await db.$executeRawUnsafe(
      `INSERT INTO vehicle_telemetry_events (tenant_id, vehicle_id, binding_id, receipt_id, kind, occurred_at, ignition)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'sample', now(), true)`,
      seed.tenantId,
      seed.vehicleId,
      seed.bindingId,
      seed.receiptId,
    );
    const text = await expectRejection(replayDown(db, downStatements(), "autocommit"), "22P02", "down em autocommit com amostra");
    assert.match(text, /PARE: 1 linha/, "a mensagem da guarda traz a contagem");
    assert.deepEqual(await catalogState(db), INTEIRO, "nada foi apagado: tabela, índice do recibo e CHECK alargado intactos");
    assert.equal(await telemetryRows(db), 1, "a amostra continua lá");
    await wipeSeeds(db);
  });

  test("[T-M(d)] ponta B, forma R2 (SEM a guarda, transação ÚNICA): com 1 recibo 'event' e a sua linha, o re-estreitamento do CHECK falha (23514) e NADA muda (tabela com a linha, índice do recibo, CHECK alargado e válido, A e B em _prisma_migrations)", { timeout: 180_000 }, async () => {
    const { db } = await drill();
    const seed = await seedReceipt(db, "event");
    await db.$executeRawUnsafe(
      `INSERT INTO vehicle_telemetry_events (tenant_id, vehicle_id, binding_id, receipt_id, kind, occurred_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'device_online', now())`,
      seed.tenantId,
      seed.vehicleId,
      seed.bindingId,
      seed.receiptId,
    );
    await expectRejection(replayDown(db, downStatements().slice(1), "single-transaction"), "23514", "down sem guarda com recibo de evento");
    assert.deepEqual(await catalogState(db), INTEIRO, "NADA mudou: a transação desfez os DROP anteriores");
    assert.equal(await telemetryRows(db), 1, "a linha continua lá");
    assert.equal((await migrationRows(db, MIGRATION_A)).finished, 1);
    assert.equal((await migrationRows(db, MIGRATION_B)).finished, 1);
    await wipeSeeds(db);
  });

  // ---------------------------------------------------------------------------------------------
  // T-M(e)/(f) — atomicidade no `prisma migrate deploy` REAL, por prefixo (o T-D(f) do B-SAN3-02 com k = 1..17).
  // ---------------------------------------------------------------------------------------------

  /** A falha injetada: tabela inexistente → 42P01 no meio do script. */
  const INJECTED_FAILURE = `ALTER TABLE "drill_nao_existe" ADD COLUMN "x" INT`;

  /** A com a falha DEPOIS da k-ésima sentença (BEGIN/COMMIT não contam e ficam onde o arquivo real os tem). */
  function variantWithFailureAfter(k: number, name = MIGRATION_A): string {
    const out: string[] = [];
    let ddl = 0;
    for (const statement of rawStatements(name)) {
      out.push(statement);
      if (isTransactionControl(statement)) continue;
      ddl += 1;
      if (ddl === k) out.push(INJECTED_FAILURE);
    }
    assert.equal(out.filter((statement) => statement === INJECTED_FAILURE).length, 1, `variante k=${k}: falha injetada uma vez (sentenças achadas: ${ddl})`);
    return `${out.map((statement) => `${statement};`).join("\n\n")}\n`;
  }

  type CliResult = { status: number | null; signal: string | null; stdout: string; stderr: string };

  /** O CLI do Prisma num processo filho, com o `--config` temporário e a DATABASE_URL da base alvo. */
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
      return {
        status: failure.status ?? null,
        signal: failure.signal ?? null,
        stdout: failure.stdout?.toString() ?? "",
        stderr: failure.stderr?.toString() ?? "",
      };
    }
  }

  const cliTail = (result: CliResult): string => `${result.stdout}\n${result.stderr}`.trim().slice(-600);
  const failedRun = (result: CliResult) => result.signal === null && typeof result.status === "number" && result.status !== 0;

  /** CREATE DATABASE … TEMPLATE: a template não pode ter conexão; o backend do CLI que acabou de sair pode demorar ms. */
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

  /**
   * Diretório temporário com as migrações da `main` (TODAS menos A e B — armadilha medida: a B sozinha sobre a main é um
   * no-op com ec 0, porque o CHECK antigo tem o mesmo nome e já é válido) e um prisma.config.mjs com caminhos absolutos;
   * a base `<drill>_main` (template de cada caso) nasce desse diretório.
   */
  let templatePromise: Promise<{ tempRoot: string; migrationsDir: string; configPath: string; mainName: string }> | undefined;
  async function mainTemplate(admin: any, drillName: string) {
    templatePromise ??= (async () => {
      const tempRoot = mkdtempSync(path.join(os.tmpdir(), "trc02-mdrill-"));
      tempDirs.add(tempRoot);
      const migrationsDir = path.join(tempRoot, "migrations");
      mkdirSync(migrationsDir);
      const sourceDir = path.join(ROOT, "prisma/migrations");
      const entries = readdirSync(sourceDir);
      assert.ok(entries.includes(MIGRATION_A) && entries.includes(MIGRATION_B), "as duas migrações do bloco existem no repositório");
      for (const entry of entries) {
        if (entry !== MIGRATION_A && entry !== MIGRATION_B) cpSync(path.join(sourceDir, entry), path.join(migrationsDir, entry), { recursive: true });
      }
      assert.equal(readdirSync(migrationsDir).length, entries.length - 2, "o diretório temporário tem todas as migrações menos A e B");
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
      mkdirSync(path.join(migrationsDir, MIGRATION_A));
      mkdirSync(path.join(migrationsDir, MIGRATION_B));
      console.log(`[drill T-M] template ${mainName} (main sem A e B) e --config temporário em ${tempRoot}`);
      return { tempRoot, migrationsDir, configPath, mainName };
    })();
    return templatePromise;
  }

  test("[T-M(e)] para k = 1..17: migrate deploy com falha injetada depois da k-ésima sentença deixa o catálogo como ANTES (tabela, índice do recibo e política ausentes; CHECK = 'position' validado; linha FALHA de A em _prisma_migrations; B ausente); resolve --rolled-back + deploy convergem (catálogo INTEIRO, A e B aplicadas, status up to date)", { timeout: 900_000 }, async () => {
    const { admin, name: drillName } = await drill();
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const { tempRoot, migrationsDir, configPath, mainName } = await mainTemplate(admin, drillName);
    const fileA = path.join(migrationsDir, MIGRATION_A, "migration.sql");
    const fileB = path.join(migrationsDir, MIGRATION_B, "migration.sql");
    writeFileSync(fileB, readFileSync(migrationPath(MIGRATION_B)));
    const cleanA = readFileSync(migrationPath(MIGRATION_A));
    const failures: string[] = [];
    // O laço mede o COMPORTAMENTO em cada prefixo; a forma (BEGIN/COMMIT nas pontas) é conferida depois dele, para que uma A
    // sem transação acuse k a k, e não só pela forma.
    const total = rawStatements().filter((statement) => !isTransactionControl(statement)).length;
    assert.equal(total, 17, `a A traz 17 sentenças fora BEGIN/COMMIT (achei ${total})`);
    for (let k = 1; k <= total; k += 1) {
      const name = `${drillName}_k${k}`;
      const url = databaseUrlFor(name);
      const startedAt = Date.now();
      let db: any;
      try {
        await createFromTemplate(admin, name, mainName);
        writeFileSync(fileA, variantWithFailureAfter(k));
        const failed = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
        assert.ok(failedRun(failed), `deploy com falha injetada depois da sentença ${k} tinha de sair com ec ≠ 0 (status ${failed.status}, sinal ${failed.signal}): ${cliTail(failed)}`);
        db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
        assert.deepEqual(await catalogState(db), ANTES, "depois do deploy falho o catálogo é o de ANTES");
        assert.deepEqual(await migrationRows(db, MIGRATION_A), { total: 1, failed: 1, finished: 0, rolled_back: 0 }, "_prisma_migrations: 1 linha FALHA de A");
        assert.equal((await migrationRows(db, MIGRATION_B)).total, 0, "B nem começou");

        writeFileSync(fileA, cleanA);
        const blocked = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
        assert.ok(failedRun(blocked), `redeploy sobre a linha falha tinha de sair com ec ≠ 0: ${cliTail(blocked)}`);
        assert.match(blocked.stderr, /P3009/, `redeploy sobre a linha falha: esperado P3009 no stderr — ${cliTail(blocked)}`);
        const resolved = runPrisma(["migrate", "resolve", "--rolled-back", MIGRATION_A], configPath, tempRoot, url);
        assert.equal(resolved.status, 0, `migrate resolve --rolled-back: ${cliTail(resolved)}`);
        const redeploy = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
        assert.equal(redeploy.status, 0, `deploy depois do resolve tinha de convergir: ${cliTail(redeploy)}`);
        assert.deepEqual(await catalogState(db), INTEIRO, "depois da recuperação: catálogo inteiro");
        assert.deepEqual(await migrationRows(db, MIGRATION_A), { total: 2, failed: 0, finished: 1, rolled_back: 1 }, "A: 1 aplicada e 1 revertida");
        assert.equal((await migrationRows(db, MIGRATION_B)).finished, 1, "B aplicada");
        const status = runPrisma(["migrate", "status"], configPath, tempRoot, url);
        assert.equal(status.status, 0, `migrate status depois da recuperação: ${cliTail(status)}`);
        console.log(`[drill T-M(e)] k=${k}: atômico e convergente em ${Date.now() - startedAt} ms`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`k=${k}: ${message.slice(0, 700)}`);
        console.log(`[drill T-M(e)] k=${k}: FALHOU em ${Date.now() - startedAt} ms — ${message.split("\n")[0]}`);
      } finally {
        await db?.$disconnect();
        await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
        extraDatabases.delete(name);
        writeFileSync(fileA, cleanA);
      }
    }
    assert.deepEqual(failures, [], `T-M(e): prefixos em que a A não foi atômica ou a recuperação não convergiu:\n${failures.join("\n")}`);
    assert.equal(upStatements().length, 17, "forma: BEGIN, 17 sentenças, COMMIT");
  });

  test("[T-M(f)] B: migrate deploy com falha injetada depois do VALIDATE deixa linha FALHA de B com o CHECK já validado (A aplicada); resolve --rolled-back + deploy convergem (B aplicada; catálogo INTEIRO)", { timeout: 180_000 }, async () => {
    const { admin, name: drillName } = await drill();
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const { tempRoot, migrationsDir, configPath, mainName } = await mainTemplate(admin, drillName);
    const fileA = path.join(migrationsDir, MIGRATION_A, "migration.sql");
    const fileB = path.join(migrationsDir, MIGRATION_B, "migration.sql");
    writeFileSync(fileA, readFileSync(migrationPath(MIGRATION_A)));
    const name = `${drillName}_b`;
    const url = databaseUrlFor(name);
    const startedAt = Date.now();
    let db: any;
    try {
      await createFromTemplate(admin, name, mainName);
      writeFileSync(fileB, variantWithFailureAfter(1, MIGRATION_B));
      const failed = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
      assert.ok(failedRun(failed), `deploy com falha depois do VALIDATE tinha de sair com ec ≠ 0: ${cliTail(failed)}`);
      db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
      const failedB = await migrationRows(db, MIGRATION_B);
      assert.deepEqual([failedB.total, failedB.failed], [1, 1], "_prisma_migrations: 1 linha FALHA de B");
      assert.equal((await migrationRows(db, MIGRATION_A)).finished, 1, "A aplicada");
      assert.deepEqual(await catalogState(db), INTEIRO, "o VALIDATE commitou sozinho (uma sentença, autocommit)");

      writeFileSync(fileB, readFileSync(migrationPath(MIGRATION_B)));
      const blocked = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
      assert.ok(failedRun(blocked), `redeploy sobre a linha falha de B tinha de sair com ec ≠ 0: ${cliTail(blocked)}`);
      assert.match(blocked.stderr, /P3009/, `redeploy sobre a linha falha de B: esperado P3009 — ${cliTail(blocked)}`);
      const resolved = runPrisma(["migrate", "resolve", "--rolled-back", MIGRATION_B], configPath, tempRoot, url);
      assert.equal(resolved.status, 0, `migrate resolve --rolled-back B: ${cliTail(resolved)}`);
      const redeploy = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
      assert.equal(redeploy.status, 0, `deploy depois do resolve de B: ${cliTail(redeploy)}`);
      assert.deepEqual(await catalogState(db), INTEIRO, "B reaplicada: catálogo inteiro");
      assert.deepEqual(await migrationRows(db, MIGRATION_B), { total: 2, failed: 0, finished: 1, rolled_back: 1 }, "B: 1 aplicada e 1 revertida");
      console.log(`[drill T-M(f)] B reaplicável e convergente em ${Date.now() - startedAt} ms`);
    } finally {
      await db?.$disconnect();
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      extraDatabases.delete(name);
    }
  });
}
