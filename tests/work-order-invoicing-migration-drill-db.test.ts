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
// B-SAN3-02 · T-D — DRILL DA MIGRAÇÃO 20260878000000_invoice_complementary_title EM BASE PRÓPRIA.
//
// A migração troca o índice de idempotência do faturamento (financial_titles_wo_direction_active_key →
// financial_titles_wo_direction_original_active_key, só para ORIGINAIS) e cria a coluna parent_title_id, a chave
// auxiliar (tenant_id, work_order_id, direction, id), a FK de 4 colunas do pai e o CHECK "complementar só com OS e
// nunca o próprio pai" (Q4 = SIM, dono, 2026-10-19). DDL (DROP/CREATE INDEX, ALTER TABLE) pega ACCESS EXCLUSIVE em
// `financial_titles`: na base compartilhada, atrás de uma transação de suíte irmã, travaria o lote inteiro. Por
// isso, como o drill do 04a:
//   · deriva `<db>_drill_<aleatório>` da DATABASE_URL e faz CREATE DATABASE pelo cliente admin (sem permissão =
//     VERMELHO, nunca skip);
//   · roda `prisma migrate deploy` num processo filho com a DATABASE_URL da base nova;
//   · executa os casos (a)–(e) LÁ, na ordem do arquivo (o node:test roda os testes de topo em sequência);
//   · derruba a base no teardown (DROP DATABASE … WITH (FORCE)).
// O up e o down vêm do PRÓPRIO arquivo da migração (corpo e rodapé comentado): mutar o arquivo muda o drill.
//
// Ciclo 2 (achado C2-01): o `prisma migrate deploy` 7.8 executa o script sentença a sentença, em autocommit; por isso
// a migração traz BEGIN/COMMIT explícitos. O T-D(f) prende a PROPRIEDADE pelo comportamento: para cada k = 1..6, um
// `migrate deploy` real (CLI do Prisma, `--config` temporário) de uma variante com falha injetada depois da k-ésima
// DDL deixa o catálogo como antes, e `resolve --rolled-back` + `deploy` convergem. Assere ESTADO, nunca a mensagem
// do CLI (que mostra só "current transaction is aborted"; a causa real fica no log do servidor Postgres).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const MIGRATION_NAME = "20260878000000_invoice_complementary_title";
const MIGRATION = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const NEW_INDEXES = ["financial_titles_tenant_wo_direction_id_key", "financial_titles_wo_direction_original_active_key"];
const OLD_INDEX = "financial_titles_wo_direction_active_key";

if (!connectionString) {
  test("B-SAN3-02 T-D (drill da migração em base própria) exige DATABASE_URL e permissão de CREATE DATABASE", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";

  type Drill = Awaited<ReturnType<typeof bootstrap>>;
  let drillPromise: Promise<Drill> | undefined;
  const drill = (): Promise<Drill> => (drillPromise ??= bootstrap());
  let createdDatabase: string | undefined;
  let adminForTeardown: any;
  /** Bases do T-D(f) (`<drill>_main` e `<drill>_k<k>`) e o diretório temporário do `--config`: caem no `after`. */
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

    const target = new URL(connectionString!);
    target.pathname = `/${name}`;
    const startedAt = Date.now();
    execFileSync(process.execPath, [prismaCliPath(), "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: target.toString() },
      stdio: "pipe",
    });
    console.log(`[drill] base própria ${name}: migrate deploy em ${Date.now() - startedAt} ms`);
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString() }) });
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

  const migrationSql = () => readFileSync(path.join(ROOT, MIGRATION), "utf8").replace(/\r\n/g, "\n");
  const prismaCliPath = (): string => createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");

  /** O corpo executável CRU da migração (sem comentários), dividido por `;` de fim de sentença — sem asserção de forma. */
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

  /**
   * O UP: as 6 DDL entre `BEGIN` (1ª sentença) e `COMMIT` (última). O replay pelo cliente Prisma roda cada DDL em
   * autocommit — é replay de FORMA; a prova de atomicidade é o T-D(f), pelo `migrate deploy` real.
   */
  function upStatements(): string[] {
    const raw = rawStatements();
    assert.equal(raw[0], "BEGIN", `a migração abre com BEGIN (1ª sentença achada: ${JSON.stringify(raw[0])}; ${raw.length} sentenças)`);
    assert.equal(raw.at(-1), "COMMIT", `a migração fecha com COMMIT (última achada: ${JSON.stringify(raw.at(-1))}; ${raw.length} sentenças)`);
    const statements = raw.slice(1, -1);
    assert.equal(statements.length, 6, `entre BEGIN e COMMIT, o corpo da migração traz 6 sentenças (achei ${statements.length})`);
    assert.ok(!statements.some(isTransactionControl), `BEGIN/COMMIT só nas pontas (achei ${JSON.stringify(raw)})`);
    return statements;
  }

  /** O DOWN: o rodapé comentado `--   <SQL>;`, na ordem escrita (ponta A). */
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
    return statements;
  }

  async function indexNames(db: any): Promise<string[]> {
    const rows = await db.$queryRawUnsafe(
      `SELECT indexname AS name FROM pg_indexes WHERE tablename = 'financial_titles' AND indexname = ANY($1::text[]) ORDER BY 1`,
      [...NEW_INDEXES, OLD_INDEX],
    );
    return (rows as Array<{ name: string }>).map((row) => row.name);
  }

  async function seedTenant(db: any, tag: string): Promise<string> {
    const slug = `invoice-drill-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    return (rows as Array<{ id: string }>)[0]!.id;
  }

  async function seedWorkOrder(db: any, tenantId: string): Promise<string> {
    const rows = await db.$queryRawUnsafe(
      `INSERT INTO work_orders (tenant_id, code, title) VALUES ($1::uuid, $2, 'OS drill') RETURNING id`,
      tenantId,
      `WO-${randomUUID().slice(0, 12)}`,
    );
    return (rows as Array<{ id: string }>)[0]!.id;
  }

  type TitleSpec = {
    tenantId: string;
    workOrderId?: string | null;
    direction?: string;
    parentTitleId?: string | null;
    id?: string;
    deleted?: boolean;
    withParentColumn?: boolean;
  };

  async function insertTitle(db: any, spec: TitleSpec): Promise<string> {
    const id = spec.id ?? randomUUID();
    const withParent = spec.withParentColumn ?? true;
    const columns = ["id", "tenant_id", "direction", "party_type", "party_name", "amount", "currency", "issue_date", "due_date", "paid_amount", "status", "competencia", "work_order_id", "deleted_at"];
    const values = [
      "$1::uuid",
      "$2::uuid",
      "$3",
      "'customer'",
      "'Drill'",
      "1",
      "'BRL'",
      "now()",
      "now()",
      "0",
      "'open'",
      "to_char(now(), 'YYYY-MM')",
      "$4::uuid",
      spec.deleted ? "now()" : "NULL",
    ];
    const params: unknown[] = [id, spec.tenantId, spec.direction ?? "receivable", spec.workOrderId ?? null];
    if (withParent) {
      columns.push("parent_title_id");
      values.push("$5::uuid");
      params.push(spec.parentTitleId ?? null);
    }
    await db.$executeRawUnsafe(`INSERT INTO financial_titles (${columns.join(", ")}) VALUES (${values.join(", ")})`, ...params);
    return id;
  }

  function errorText(error: unknown): string {
    const record = error as { message?: string; code?: string };
    return `${record?.code ?? ""} ${record?.message ?? ""} ${JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}))}`;
  }

  async function expectSqlState(promise: Promise<unknown>, state: string, label: string): Promise<void> {
    let error: unknown;
    try {
      await promise;
    } catch (caught) {
      error = caught;
    }
    assert.ok(error, `${label}: tinha de ser recusado pelo banco (${state})`);
    assert.match(errorText(error), new RegExp(state), `${label}: esperado ${state} — ${errorText(error).slice(0, 300)}`);
  }

  async function cleanup(db: any, tenants: readonly string[]): Promise<void> {
    await db.$executeRawUnsafe(`DELETE FROM financial_titles WHERE tenant_id = ANY($1::uuid[]) AND parent_title_id IS NOT NULL`, [...tenants]);
    await db.$executeRawUnsafe(`DELETE FROM financial_titles WHERE tenant_id = ANY($1::uuid[])`, [...tenants]);
    await db.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = ANY($1::uuid[])`, [...tenants]);
    await db.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, [...tenants]);
  }

  test("[T-D(a)] migrate deploy: índices novos presentes, o velho ausente; coluna, FK de 4 colunas e CHECK no catálogo", async () => {
    const { db } = await drill();
    const [migration] = await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      MIGRATION_NAME,
    );
    assert.equal((migration as { n: number }).n, 1, "a migração do bloco foi aplicada na base própria");
    assert.deepEqual(await indexNames(db), NEW_INDEXES, "up: os dois índices novos, sem o velho");
    const [partial] = await db.$queryRawUnsafe(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'financial_titles_wo_direction_original_active_key'`,
    );
    assert.match((partial as { indexdef: string }).indexdef, /parent_title_id IS NULL/, "o índice de originais exclui complementares");
    const [column] = await db.$queryRawUnsafe(
      `SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name = 'financial_titles' AND column_name = 'parent_title_id'`,
    );
    assert.deepEqual(column, { data_type: "uuid", is_nullable: "YES" });
    const constraints = (await db.$queryRawUnsafe(
      `SELECT conname, contype::text AS contype, pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conrelid = 'financial_titles'::regclass AND conname IN ('financial_titles_parent_title_fkey', 'financial_titles_parent_requires_work_order_check')
        ORDER BY conname`,
    )) as Array<{ conname: string; contype: string; def: string }>;
    assert.equal(constraints.length, 2, "FK do pai e CHECK presentes");
    const fk = constraints.find((row) => row.contype === "f")!;
    assert.match(fk.def, /FOREIGN KEY \(tenant_id, work_order_id, direction, parent_title_id\) REFERENCES financial_titles\(tenant_id, work_order_id, direction, id\)/);
    assert.match(fk.def, /ON DELETE RESTRICT/);
    const check = constraints.find((row) => row.contype === "c")!;
    assert.match(check.def, /parent_title_id IS NULL/);
  });

  test("[T-D(b)] legado ANTES do up (2 títulos da mesma OS, 1 deletado, sem coluna de pai): o up aplica com ec 0 (H5)", async () => {
    const { db } = await drill();
    for (const statement of downStatements()) await db.$executeRawUnsafe(statement);
    assert.deepEqual(await indexNames(db), [OLD_INDEX], "down: volta o índice velho");
    const t = await seedTenant(db, "b");
    const wo = await seedWorkOrder(db, t);
    await insertTitle(db, { tenantId: t, workOrderId: wo, deleted: true, withParentColumn: false });
    await insertTitle(db, { tenantId: t, workOrderId: wo, withParentColumn: false });
    for (const statement of upStatements()) await db.$executeRawUnsafe(statement);
    assert.deepEqual(await indexNames(db), NEW_INDEXES, "up sobre o legado: índices novos, sem o velho");
    const [legacy] = await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM financial_titles WHERE tenant_id = $1::uuid AND parent_title_id IS NULL`,
      t,
    );
    assert.equal((legacy as { n: number }).n, 2, "todo legado nasce ORIGINAL (parent NULL)");
    await cleanup(db, [t]);
  });

  test("[T-D(d)] down (ponta A, sem complementar) → re-up: índices novos 2 → 0 → 2; e a ponta B: com complementar ativo o down PARA (23505)", async () => {
    const { db } = await drill();
    const count = async () => (await indexNames(db)).filter((name) => NEW_INDEXES.includes(name)).length;
    assert.equal(await count(), 2);
    for (const statement of downStatements()) await db.$executeRawUnsafe(statement);
    assert.equal(await count(), 0, "down: zero índices novos");
    assert.deepEqual(await indexNames(db), [OLD_INDEX], "down: o índice velho de volta");
    const [column] = await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'financial_titles' AND column_name = 'parent_title_id'`,
    );
    assert.equal((column as { n: number }).n, 0, "down: a coluna saiu");
    for (const statement of upStatements()) await db.$executeRawUnsafe(statement);
    assert.equal(await count(), 2, "re-up: os dois índices novos");

    // Ponta B: com um complementar ATIVO, recriar o índice velho viola (23505) — o down para no 1º passo.
    const t = await seedTenant(db, "d");
    const wo = await seedWorkOrder(db, t);
    const original = await insertTitle(db, { tenantId: t, workOrderId: wo });
    await insertTitle(db, { tenantId: t, workOrderId: wo, parentTitleId: original });
    await expectSqlState(db.$executeRawUnsafe(downStatements()[0]!), "23505", "down com complementar ativo");
    assert.equal(await count(), 2, "o down parou: os índices novos FICAM");
    await cleanup(db, [t]);
  });

  test("[T-D(c)] original + 2 complementares OK; 2º original → 23505; complementar sem OS → 23514; pai = si mesmo → 23514", async () => {
    const { db } = await drill();
    const t = await seedTenant(db, "c");
    const wo = await seedWorkOrder(db, t);
    const original = await insertTitle(db, { tenantId: t, workOrderId: wo });
    await insertTitle(db, { tenantId: t, workOrderId: wo, parentTitleId: original });
    await insertTitle(db, { tenantId: t, workOrderId: wo, parentTitleId: original });
    await expectSqlState(insertTitle(db, { tenantId: t, workOrderId: wo }), "23505", "2º original ativo");
    await expectSqlState(insertTitle(db, { tenantId: t, workOrderId: null, parentTitleId: original }), "23514", "complementar sem OS");
    const self = randomUUID();
    await expectSqlState(insertTitle(db, { tenantId: t, workOrderId: wo, id: self, parentTitleId: self }), "23514", "pai = si mesmo");
    await cleanup(db, [t]);
  });

  test("[T-D(e)] a FK de 4 colunas recusa pai de OUTRA OS, AVULSO, de OUTRA direção e de OUTRO tenant (23503)", async () => {
    const { db } = await drill();
    const t = await seedTenant(db, "e");
    const other = await seedTenant(db, "e-outro");
    const wo = await seedWorkOrder(db, t);
    const wo2 = await seedWorkOrder(db, t);
    const woOther = await seedWorkOrder(db, other);
    const parentOtherWorkOrder = await insertTitle(db, { tenantId: t, workOrderId: wo2 });
    const parentStandalone = await insertTitle(db, { tenantId: t, workOrderId: null });
    const parentPayable = await insertTitle(db, { tenantId: t, workOrderId: wo, direction: "payable" });
    const parentOtherTenant = await insertTitle(db, { tenantId: other, workOrderId: woOther });
    await expectSqlState(insertTitle(db, { tenantId: t, workOrderId: wo, parentTitleId: parentOtherWorkOrder }), "23503", "pai de outra OS");
    await expectSqlState(insertTitle(db, { tenantId: t, workOrderId: wo, parentTitleId: parentStandalone }), "23503", "pai avulso");
    await expectSqlState(insertTitle(db, { tenantId: t, workOrderId: wo, parentTitleId: parentPayable }), "23503", "pai de outra direção");
    await expectSqlState(insertTitle(db, { tenantId: t, workOrderId: wo, parentTitleId: parentOtherTenant }), "23503", "pai de outro tenant");
    await cleanup(db, [t, other]);
  });

  // ---------------------------------------------------------------------------------------------
  // T-D(f) — atomicidade no `prisma migrate deploy` REAL, por prefixo (ciclo 2, achado C2-01).
  // ---------------------------------------------------------------------------------------------

  /** A falha injetada: tabela inexistente → 42P01 no meio do script. */
  const INJECTED_FAILURE = `ALTER TABLE "drill_nao_existe" ADD COLUMN "x" INT`;

  /**
   * A variante da migração com a falha inserida DEPOIS da k-ésima DDL. Conta só DDL (BEGIN/COMMIT não contam) e deixa
   * BEGIN/COMMIT onde o arquivo real os tem — assim mover ou tirar BEGIN/COMMIT do arquivo muda o comportamento medido.
   */
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

  function databaseUrlFor(name: string): string {
    const target = new URL(connectionString!);
    target.pathname = `/${name}`;
    return target.toString();
  }

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

  async function catalogState(db: any): Promise<{ column: number; constraints: number; indexes: string[] }> {
    const [row] = (await db.$queryRawUnsafe(
      `SELECT
         (SELECT count(*)::int FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'financial_titles' AND column_name = 'parent_title_id') AS "column",
         (SELECT count(*)::int FROM pg_constraint
           WHERE conrelid = 'financial_titles'::regclass
             AND conname IN ('financial_titles_parent_title_fkey', 'financial_titles_parent_requires_work_order_check')) AS "constraints"`,
    )) as Array<{ column: number; constraints: number }>;
    return { column: row!.column, constraints: row!.constraints, indexes: await indexNames(db) };
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

  test("[T-D(f)] para k = 1..6: migrate deploy com falha injetada depois da k-ésima DDL deixa o catálogo como antes (0 objetos novos, índice antigo presente, linha falha em _prisma_migrations); resolve --rolled-back + deploy convergem (catálogo inteiro, status up to date)", async () => {
    const { admin, name: drillName } = await drill();
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);

    // Diretório temporário: as migrações da `main` (todas MENOS a 20260878) e um prisma.config.mjs com caminhos absolutos.
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "san302-drill-"));
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
    console.log(`[drill T-D(f)] --config temporário em ${tempRoot}`);

    // Base no nível da `main` (sem a 20260878): a template de cada k.
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
    for (let k = 1; k <= 6; k += 1) {
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
        assert.deepEqual(
          await catalogState(db),
          { column: 0, constraints: 0, indexes: [OLD_INDEX] },
          "depois do deploy falho o catálogo é o de ANTES: sem coluna, FK, CHECK nem índices novos; o índice antigo presente",
        );
        assert.deepEqual(
          await migrationRows(db),
          { total: 1, failed: 1, finished: 0, rolled_back: 0 },
          "_prisma_migrations: 1 linha falha (finished_at e rolled_back_at NULL)",
        );

        // Recuperação: arquivo limpo → P3009 → resolve --rolled-back → deploy converge → status up to date.
        writeFileSync(migrationFile, cleanMigration);
        const blocked = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
        assert.ok(blocked.signal === null && typeof blocked.status === "number" && blocked.status !== 0, `redeploy sobre a linha falha tinha de sair com ec ≠ 0: ${cliTail(blocked)}`);
        assert.match(blocked.stderr, /P3009/, `redeploy sobre a linha falha: esperado P3009 no stderr — ${cliTail(blocked)}`);
        const resolved = runPrisma(["migrate", "resolve", "--rolled-back", MIGRATION_NAME], configPath, tempRoot, url);
        assert.equal(resolved.status, 0, `migrate resolve --rolled-back: ${cliTail(resolved)}`);
        const redeploy = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
        assert.equal(redeploy.status, 0, `deploy depois do resolve tinha de convergir: ${cliTail(redeploy)}`);
        assert.deepEqual(
          await catalogState(db),
          { column: 1, constraints: 2, indexes: NEW_INDEXES },
          "depois da recuperação: coluna, FK, CHECK e os dois índices novos; o antigo ausente",
        );
        assert.deepEqual(
          await migrationRows(db),
          { total: 2, failed: 0, finished: 1, rolled_back: 1 },
          "_prisma_migrations: 1 linha aplicada e 1 revertida",
        );
        const status = runPrisma(["migrate", "status"], configPath, tempRoot, url);
        assert.equal(status.status, 0, `migrate status depois da recuperação: ${cliTail(status)}`);
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
