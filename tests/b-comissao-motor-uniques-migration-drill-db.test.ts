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
// B-COMISSAO-MOTOR (Emenda 1 §E1.9 + Emenda 1.1 §B.4) — DRILL DA MIGRAÇÃO
// 20261124000000_commission_engine_uniques EM BASE PRÓPRIA.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const MIGRATION_NAME = "20261124000000_commission_engine_uniques";
const MIGRATION = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const NEW_INDEXES = [
  "commission_basis_events_engine_live_key",
  "commission_calculations_engine_primary_live_key",
  "commission_policies_engine_key",
  "commission_policy_rules_engine_payee_live_key",
];

if (!connectionString) {
  test("B-COMISSAO-MOTOR drill da migração 20261124000000_commission_engine_uniques exige DATABASE_URL", {
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
    const name = `${baseName}_cdrl_${randomUUID().replace(/-/g, "").slice(0, 10)}`.slice(0, 63);
    assert.match(name, /^[a-z0-9_]+$/, `nome de base derivado inseguro: ${name}`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE template0`);
    createdDatabase = name;

    const target = new URL(connectionString!);
    target.pathname = `/${name}`;
    execFileSync(process.execPath, [prismaCliPath(), "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: target.toString() },
      stdio: "pipe",
    });
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

  function upStatements(): string[] {
    const raw = rawStatements();
    assert.equal(raw[0], "BEGIN", `a migração abre com BEGIN`);
    assert.equal(raw.at(-1), "COMMIT", `a migração fecha com COMMIT`);
    const statements = raw.slice(1, -1);
    assert.equal(statements.length, 4, `entre BEGIN e COMMIT, o corpo da migração traz 4 sentenças`);
    return statements;
  }

  function downStatements(): string[] {
    return NEW_INDEXES.map((idx) => `DROP INDEX IF EXISTS "${idx}"`);
  }

  async function indexNames(db: any): Promise<string[]> {
    const rows = await db.$queryRawUnsafe(
      `SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[]) ORDER BY 1`,
      NEW_INDEXES,
    );
    return (rows as Array<{ name: string }>).map((row) => row.name);
  }

  async function seedTenant(db: any, tag: string): Promise<string> {
    const slug = `comm-drill-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    return (rows as Array<{ id: string }>)[0]!.id;
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

  test("[T-D(a)] ida: migrate deploy aplica e os 4 índices existem no catálogo com o predicado esperado", async () => {
    const { db } = await drill();
    const [migration] = await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      MIGRATION_NAME,
    );
    assert.equal((migration as { n: number }).n, 1);
    assert.deepEqual(await indexNames(db), NEW_INDEXES);

    const defs = (await db.$queryRawUnsafe(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[]) ORDER BY indexname`,
      NEW_INDEXES,
    )) as Array<{ indexname: string; indexdef: string }>;
    const byName = new Map(defs.map((d) => [d.indexname, d.indexdef]));
    assert.match(byName.get("commission_policies_engine_key") ?? "", /scope = 'engine'/);
    assert.match(byName.get("commission_policy_rules_engine_payee_live_key") ?? "", /rule_type = 'engine_payee'/);
    assert.match(byName.get("commission_basis_events_engine_live_key") ?? "", /engine:wo:%/);
    assert.match(byName.get("commission_calculations_engine_primary_live_key") ?? "", /engine:calc:%/);
  });

  test("[T-D(b)] legado: antes da ida, semear política, regra, evento e cálculo antigos e duplicados (fora do espaço reservado): a ida passa", async () => {
    const { db } = await drill();
    for (const stmt of downStatements()) await db.$executeRawUnsafe(stmt);
    assert.deepEqual(await indexNames(db), []);

    const tenantId = await seedTenant(db, "legado");
    // Duas políticas legadas scope = 'tenant'
    const [p1] = (await db.$queryRawUnsafe(
      `INSERT INTO commission_policies (tenant_id, name, scope, vertical, status, effective_from) VALUES ($1::uuid, 'P1', 'tenant', 'field_services', 'active', now()) RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>;
    await db.$queryRawUnsafe(
      `INSERT INTO commission_policies (tenant_id, name, scope, vertical, status, effective_from) VALUES ($1::uuid, 'P2', 'tenant', 'field_services', 'active', now())`,
      tenantId,
    );

    // Duas regras legadas ativas para o mesmo payeeUserId
    await db.$queryRawUnsafe(
      `INSERT INTO commission_policy_rules (tenant_id, policy_id, rule_type, basis_type, rate_type, rate_value, conditions, priority, active)
       VALUES ($1::uuid, $2::uuid, 'payee', 'work_order_total', 'percent', 10, '{"payeeUserId":"u1"}'::jsonb, 10, true),
              ($1::uuid, $2::uuid, 'payee', 'work_order_total', 'percent', 15, '{"payeeUserId":"u1"}'::jsonb, 10, true)`,
      tenantId,
      p1!.id,
    );

    // Dois eventos legados para o mesmo source_id
    const [e1] = (await db.$queryRawUnsafe(
      `INSERT INTO commission_basis_events (tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id)
       VALUES ($1::uuid, 'work_order', 'wo-dup', 'work_order.completed', 'legacy-k1', '{}'::jsonb, now(), 'received', $2::uuid) RETURNING id`,
      tenantId,
      p1!.id,
    )) as Array<{ id: string }>;
    await db.$queryRawUnsafe(
      `INSERT INTO commission_basis_events (tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id)
       VALUES ($1::uuid, 'work_order', 'wo-dup', 'work_order.completed', 'legacy-k2', '{}'::jsonb, now(), 'received', $2::uuid)`,
      tenantId,
      p1!.id,
    );

    // Dois cálculos legados para o mesmo basis_event_id
    await db.$queryRawUnsafe(
      `INSERT INTO commission_calculations (tenant_id, basis_event_id, policy_id, amount, currency, status, calculation_snapshot, idempotency_key)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 10, 'BRL', 'calculated', '{}'::jsonb, 'legacy-c1'),
              ($1::uuid, $2::uuid, $3::uuid, 10, 'BRL', 'calculated', '{}'::jsonb, 'legacy-c2')`,
      tenantId,
      e1!.id,
      p1!.id,
    );

    for (const stmt of upStatements()) await db.$executeRawUnsafe(stmt);
    assert.deepEqual(await indexNames(db), NEW_INDEXES);
  });

  test("[T-D(c)/M51] recusa: segundo vivo no espaço reservado falha com 23505 (um por índice); caso permitido passa (superseded, reversed, engine:adj:)", async () => {
    const { db } = await drill();
    const tenantId = await seedTenant(db, "recusa");

    // 1. Política engine única
    const [policy] = (await db.$queryRawUnsafe(
      `INSERT INTO commission_policies (tenant_id, name, scope, vertical, status, effective_from)
       VALUES ($1::uuid, 'Engine', 'engine', 'field_services', 'active', now()) RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>;
    await expectSqlState(
      db.$executeRawUnsafe(
        `INSERT INTO commission_policies (tenant_id, name, scope, vertical, status, effective_from)
         VALUES ($1::uuid, 'Engine 2', 'engine', 'field_services', 'active', now())`,
        tenantId,
      ),
      "23505",
      "segunda política engine",
    );

    // 2. Regra engine_payee ativa única por pessoa
    await db.$executeRawUnsafe(
      `INSERT INTO commission_policy_rules (tenant_id, policy_id, rule_type, basis_type, rate_type, rate_value, conditions, priority, active)
       VALUES ($1::uuid, $2::uuid, 'engine_payee', 'work_order_total', 'percent', 10, '{"payeeUserId":"u-1"}'::jsonb, 10, true)`,
      tenantId,
      policy!.id,
    );
    await expectSqlState(
      db.$executeRawUnsafe(
        `INSERT INTO commission_policy_rules (tenant_id, policy_id, rule_type, basis_type, rate_type, rate_value, conditions, priority, active)
         VALUES ($1::uuid, $2::uuid, 'engine_payee', 'work_order_total', 'percent', 12, '{"payeeUserId":"u-1"}'::jsonb, 10, true)`,
        tenantId,
        policy!.id,
      ),
      "23505",
      "segunda regra engine_payee ativa da mesma pessoa",
    );
    // Inativa passa
    await db.$executeRawUnsafe(
      `INSERT INTO commission_policy_rules (tenant_id, policy_id, rule_type, basis_type, rate_type, rate_value, conditions, priority, active)
       VALUES ($1::uuid, $2::uuid, 'engine_payee', 'work_order_total', 'percent', 8, '{"payeeUserId":"u-1"}'::jsonb, 10, false)`,
      tenantId,
      policy!.id,
    );

    // 3. Evento vivo único da mesma OS; evento antigo superseded + novo passa (M51)
    const [evt1] = (await db.$queryRawUnsafe(
      `INSERT INTO commission_basis_events (tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id)
       VALUES ($1::uuid, 'work_order', 'wo-1', 'engine.work_order.completed', 'engine:wo:wo-1:v1', '{}'::jsonb, now(), 'eligible', $2::uuid) RETURNING id`,
      tenantId,
      policy!.id,
    )) as Array<{ id: string }>;
    await expectSqlState(
      db.$executeRawUnsafe(
        `INSERT INTO commission_basis_events (tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id)
         VALUES ($1::uuid, 'work_order', 'wo-1', 'engine.work_order.completed', 'engine:wo:wo-1:v2', '{}'::jsonb, now(), 'eligible', $2::uuid)`,
        tenantId,
        policy!.id,
      ),
      "23505",
      "segundo evento vivo da mesma OS",
    );
    await db.$executeRawUnsafe(`UPDATE commission_basis_events SET status = 'superseded' WHERE id = $1::uuid`, evt1!.id);
    const [evt2] = (await db.$queryRawUnsafe(
      `INSERT INTO commission_basis_events (tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id)
       VALUES ($1::uuid, 'work_order', 'wo-1', 'engine.work_order.completed', 'engine:wo:wo-1:v2', '{}'::jsonb, now(), 'eligible', $2::uuid) RETURNING id`,
      tenantId,
      policy!.id,
    )) as Array<{ id: string }>;

    // 4. Cálculo principal vivo único do mesmo evento; reversed + novo passa; engine:adj: ao lado do principal passa
    const [calc1] = (await db.$queryRawUnsafe(
      `INSERT INTO commission_calculations (tenant_id, basis_event_id, policy_id, amount, currency, status, calculation_snapshot, idempotency_key)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 50, 'BRL', 'calculated', '{}'::jsonb, $4) RETURNING id`,
      tenantId,
      evt2!.id,
      policy!.id,
      `engine:calc:${evt2!.id}`,
    )) as Array<{ id: string }>;
    await expectSqlState(
      db.$executeRawUnsafe(
        `INSERT INTO commission_calculations (tenant_id, basis_event_id, policy_id, amount, currency, status, calculation_snapshot, idempotency_key)
         VALUES ($1::uuid, $2::uuid, $3::uuid, 50, 'BRL', 'approved', '{}'::jsonb, $4)`,
        tenantId,
        evt2!.id,
        policy!.id,
        `engine:calc:${evt2!.id}:dup`,
      ),
      "23505",
      "segundo cálculo principal vivo do mesmo evento",
    );
    // Ajuste engine:adj: ao lado do principal passa
    await db.$executeRawUnsafe(
      `INSERT INTO commission_calculations (tenant_id, basis_event_id, policy_id, amount, currency, status, calculation_snapshot, idempotency_key)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 10, 'BRL', 'approved', '{}'::jsonb, $4)`,
      tenantId,
      evt2!.id,
      policy!.id,
      `engine:adj:${calc1!.id}:1`,
    );
    // Antigo reversed + novo principal passa
    await db.$executeRawUnsafe(`UPDATE commission_calculations SET status = 'reversed' WHERE id = $1::uuid`, calc1!.id);
    await db.$executeRawUnsafe(
      `INSERT INTO commission_calculations (tenant_id, basis_event_id, policy_id, amount, currency, status, calculation_snapshot, idempotency_key)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 60, 'BRL', 'calculated', '{}'::jsonb, $4)`,
      tenantId,
      evt2!.id,
      policy!.id,
      `engine:calc:${evt2!.id}:v2`,
    );
  });

  test("[T-D(d)] volta e ida: DROP INDEX dos 4 -> 0 índices; aplicar de novo -> 4", async () => {
    const { db } = await drill();
    assert.equal((await indexNames(db)).length, 4);
    for (const stmt of downStatements()) await db.$executeRawUnsafe(stmt);
    assert.deepEqual(await indexNames(db), []);
    for (const stmt of upStatements()) await db.$executeRawUnsafe(stmt);
    assert.deepEqual(await indexNames(db), NEW_INDEXES);
  });

  test("[T-D(e)] fecha fechado: com duplicata semeada dentro do espaço reservado, a ida falha e nenhum dos 4 índices existe depois", async () => {
    const { db } = await drill();
    for (const stmt of downStatements()) await db.$executeRawUnsafe(stmt);
    assert.deepEqual(await indexNames(db), []);

    const tenantId = await seedTenant(db, "duplicata-reservada");
    const [p] = (await db.$queryRawUnsafe(
      `INSERT INTO commission_policies (tenant_id, name, scope, vertical, status, effective_from)
       VALUES ($1::uuid, 'E1', 'engine', 'field_services', 'active', now()) RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>;
    // Duplicata no 4º índice (cálculos principais vivos para o mesmo evento) para que os 3 primeiros CREATE INDEX rodem na transação antes da falha
    const [e] = (await db.$queryRawUnsafe(
      `INSERT INTO commission_basis_events (tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id)
       VALUES ($1::uuid, 'work_order', 'wo-e', 'engine.work_order.completed', 'engine:wo:wo-e:v1', '{}'::jsonb, now(), 'eligible', $2::uuid) RETURNING id`,
      tenantId,
      p!.id,
    )) as Array<{ id: string }>;
    await db.$executeRawUnsafe(
      `INSERT INTO commission_calculations (tenant_id, basis_event_id, policy_id, amount, currency, status, calculation_snapshot, idempotency_key)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 10, 'BRL', 'calculated', '{}'::jsonb, 'engine:calc:dup1'),
              ($1::uuid, $2::uuid, $3::uuid, 10, 'BRL', 'calculated', '{}'::jsonb, 'engine:calc:dup2')`,
      tenantId,
      e!.id,
      p!.id,
    );

    await expectSqlState(
      db.$transaction(async (tx: any) => {
        for (const stmt of upStatements()) await tx.$executeRawUnsafe(stmt);
      }),
      "23505",
      "ida com duplicata no espaço reservado",
    );
    assert.deepEqual(await indexNames(db), [], "nenhum dos 4 índices existe depois da falha");

    // Limpa a duplicata e restaura os 4 índices
    await db.$executeRawUnsafe(`DELETE FROM commission_calculations WHERE tenant_id = $1::uuid`, tenantId);
    for (const stmt of upStatements()) await db.$executeRawUnsafe(stmt);
    assert.deepEqual(await indexNames(db), NEW_INDEXES);
  });

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
      return {
        status: failure.status ?? null,
        signal: failure.signal ?? null,
        stdout: failure.stdout?.toString() ?? "",
        stderr: failure.stderr?.toString() ?? "",
      };
    }
  }

  function databaseUrlFor(name: string): string {
    const target = new URL(connectionString!);
    target.pathname = `/${name}`;
    return target.toString();
  }

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

  test("[T-D(f)] falha no meio: para k = 1..3, falha injetada depois da k-ésima sentença deixa 0 índices novos e o redeploy recupera", async () => {
    const { admin, name: drillName } = await drill();
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);

    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "comm-drill-"));
    tempDirs.add(tempRoot);
    const migrationsDir = path.join(tempRoot, "migrations");
    mkdirSync(migrationsDir);
    const sourceDir = path.join(ROOT, "prisma/migrations");
    for (const entry of readdirSync(sourceDir)) {
      if (entry !== MIGRATION_NAME) cpSync(path.join(sourceDir, entry), path.join(migrationsDir, entry), { recursive: true });
    }
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
    await admin.$executeRawUnsafe(`CREATE DATABASE "${mainName}" TEMPLATE template0`);
    extraDatabases.add(mainName);
    const mainDeploy = runPrisma(["migrate", "deploy"], configPath, tempRoot, databaseUrlFor(mainName));
    assert.equal(mainDeploy.status, 0);

    const cleanMigration = readFileSync(path.join(ROOT, MIGRATION));
    const migrationFile = path.join(migrationsDir, MIGRATION_NAME, "migration.sql");
    mkdirSync(path.dirname(migrationFile));

    for (let k = 1; k <= 3; k += 1) {
      const name = `${drillName}_k${k}`;
      const url = databaseUrlFor(name);
      let db: any;
      try {
        await createFromTemplate(admin, name, mainName);
        writeFileSync(migrationFile, variantWithFailureAfter(k));
        const failed = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
        assert.ok(failed.status !== 0);

        db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
        assert.deepEqual(await indexNames(db), [], `k=${k}: 0 índices novos após falha`);

        writeFileSync(migrationFile, cleanMigration);
        const resolved = runPrisma(["migrate", "resolve", "--rolled-back", MIGRATION_NAME], configPath, tempRoot, url);
        assert.equal(resolved.status, 0);
        const redeploy = runPrisma(["migrate", "deploy"], configPath, tempRoot, url);
        assert.equal(redeploy.status, 0);
        assert.deepEqual(await indexNames(db), NEW_INDEXES, `k=${k}: 4 índices após recuperação`);
      } finally {
        await db?.$disconnect();
        await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
        extraDatabases.delete(name);
      }
    }
  });
}
