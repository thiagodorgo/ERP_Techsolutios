import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";

// -----------------------------------------------------------------------------------------------
// B-O6R-04a · T-C′ (T-04, M-01) — DRILL DA MIGRAÇÃO EM BASE PRÓPRIA.
//
// A migração 20260873000000_add_stock_movements_unique_backstops cria dois índices únicos parciais em
// `stock_movements` e ABORTA (fail-closed, nunca deduplica) se houver duplicata de legado. Provar o down e o
// censo exige DDL (`DROP INDEX`/`CREATE UNIQUE INDEX`), que pega ACCESS EXCLUSIVE na tabela — na base
// compartilhada, atrás de uma transação de suíte irmã segurando `stock_movements`, isso travaria leitura e
// escrita de todas as irmãs (P2028; os arquivos rodam em processos paralelos na CI). Por isso esta suíte:
//   · deriva `<db>_drill_<aleatório>` da DATABASE_URL e faz CREATE DATABASE pelo cliente admin (sem permissão
//     = VERMELHO, nunca skip);
//   · roda `prisma migrate deploy` num processo filho com a DATABASE_URL da base nova;
//   · executa C4′ (up → down → re-up) e C5′ (censo fail-closed com a contagem REAL de grupos) LÁ;
//   · derruba a base no teardown (DROP DATABASE … WITH (FORCE)).
// Roda como o dono do cluster (CREATE DATABASE) — declarado. Nenhuma outra suíte do bloco faz DDL (D9).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const MIGRATION = "prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql";
const CENSUS = "scripts/inventory-duplicates-census.sql";
const INDEXES = ["stock_movements_cycle_count_item_key", "stock_movements_reversal_active_key"];

if (!connectionString) {
  test("B-O6R-04a T-C′ (drill da migração em base própria) exige DATABASE_URL e permissão de CREATE DATABASE", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";

  type Drill = Awaited<ReturnType<typeof bootstrap>>;
  let drillPromise: Promise<Drill> | undefined;
  const drill = (): Promise<Drill> => (drillPromise ??= bootstrap());
  let createdDatabase: string | undefined;
  let adminForTeardown: any;

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    adminForTeardown = admin;

    const source = new URL(connectionString!);
    const baseName = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    const name = `${baseName}_drill_${randomUUID().replace(/-/g, "").slice(0, 10)}`.slice(0, 63);
    assert.match(name, /^[a-z0-9_]+$/, `nome de base derivado inseguro: ${name}`);
    // Sem permissão de CREATE DATABASE isto LANÇA — o caso fica vermelho, nunca pulado.
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE template0`);
    createdDatabase = name;

    const target = new URL(connectionString!);
    target.pathname = `/${name}`;
    const startedAt = Date.now();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: target.toString() },
      stdio: "pipe",
    });
    const migratedIn = Date.now() - startedAt;
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString() }) });
    console.log(`[drill] base própria ${name}: migrate deploy em ${migratedIn} ms`);
    return { admin, db, name };
  }

  after(async () => {
    if (drillPromise) {
      const d = await drillPromise.catch(() => undefined);
      await d?.db.$disconnect();
    }
    if (createdDatabase && adminForTeardown) {
      await adminForTeardown.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${createdDatabase}" WITH (FORCE)`);
    }
    await adminForTeardown?.$disconnect();
  });

  const migrationSql = () => readFileSync(path.join(ROOT, MIGRATION), "utf8").replace(/\r\n/g, "\n");

  /** O `down` do rodapé da migração: as linhas comentadas `--   DROP INDEX IF EXISTS "…";`. */
  function downStatements(): string[] {
    const statements = [...migrationSql().matchAll(/^--\s+(DROP INDEX IF EXISTS "[a-z_]+";)\s*$/gm)].map((match) => match[1]!);
    assert.equal(statements.length, 2, "o rodapé da migração traz os dois DROP INDEX do down");
    return statements;
  }

  /** O `up` dos índices, extraído do corpo da migração. */
  function upStatements(): string[] {
    const statements = [...migrationSql().matchAll(/^(CREATE UNIQUE INDEX "[a-z_]+"\n\s+ON "stock_movements" \([^)]*\) WHERE "[a-z_]+" IS NOT NULL;)$/gm)].map((match) => match[1]!);
    assert.equal(statements.length, 2, "o corpo da migração traz os dois CREATE UNIQUE INDEX");
    return statements;
  }

  /** O bloco fail-closed do censo, extraído do corpo da migração. */
  function censusBlock(): string {
    const match = /DO \$censo\$[\s\S]*?END \$censo\$;/.exec(migrationSql());
    assert.ok(match, "a migração traz o bloco DO $censo$");
    return match[0];
  }

  async function indexNames(db: any): Promise<string[]> {
    const rows = await db.$queryRawUnsafe(
      `SELECT indexname AS name FROM pg_indexes WHERE tablename = 'stock_movements' AND indexname = ANY($1::text[]) ORDER BY 1`,
      INDEXES,
    );
    return (rows as Array<{ name: string }>).map((row) => row.name);
  }

  async function seedTenant(db: any, tag: string): Promise<string> {
    const slug = `inv-drill-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    return (rows as Array<{ id: string }>)[0]!.id;
  }

  async function seedItem(db: any, tenantId: string): Promise<string> {
    const id = randomUUID();
    await db.$executeRawUnsafe(`INSERT INTO inventory_items (id, tenant_id, sku, name, unit) VALUES ($1::uuid, $2::uuid, $3, $3, 'un')`, id, tenantId, `SKU-${id.slice(0, 13)}`);
    return id;
  }

  async function insertMovement(db: any, tenantId: string, itemId: string, options: { reverses?: string; cycleCount?: string } = {}): Promise<string> {
    const rows = await db.$queryRawUnsafe(
      `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, reverses_movement_id, cycle_count_id)
       VALUES ($1::uuid, $2::uuid, 'ajuste', 1, 'base', $3::uuid, $4::uuid) RETURNING id`,
      tenantId,
      itemId,
      options.reverses ?? null,
      options.cycleCount ?? null,
    );
    return (rows as Array<{ id: string }>)[0]!.id;
  }

  async function cleanup(db: any, tenants: readonly string[]): Promise<void> {
    await db.$executeRawUnsafe(`DELETE FROM stock_movements WHERE tenant_id = ANY($1::uuid[])`, [...tenants]);
    await db.$executeRawUnsafe(`DELETE FROM cycle_counts WHERE tenant_id = ANY($1::uuid[])`, [...tenants]);
    await db.$executeRawUnsafe(`DELETE FROM inventory_items WHERE tenant_id = ANY($1::uuid[])`, [...tenants]);
    await db.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, [...tenants]);
  }

  function errorText(error: unknown): string {
    const record = error as { message?: string; code?: string };
    return `${record?.code ?? ""} ${record?.message ?? ""} ${JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}))}`;
  }

  test("C4′ [base própria] · migrate deploy cria os dois índices; down do rodapé → 0 e duplicata aceita; re-up → 2 e duplicata recusada (23505)", async () => {
    const { db } = await drill();
    const [migration] = await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = '20260873000000_add_stock_movements_unique_backstops' AND finished_at IS NOT NULL`,
    );
    assert.equal((migration as { n: number }).n, 1, "a migração do bloco foi aplicada na base própria");
    assert.deepEqual(await indexNames(db), INDEXES, "up: os dois índices");

    const t = await seedTenant(db, "c4");
    const x = await seedItem(db, t);
    const original = await insertMovement(db, t, x);
    const [session] = await db.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t);
    const sessionId = (session as { id: string }).id;

    for (const statement of downStatements()) await db.$executeRawUnsafe(statement);
    assert.deepEqual(await indexNames(db), [], "down: zero índices");
    await insertMovement(db, t, x, { reverses: original });
    await insertMovement(db, t, x, { reverses: original });
    await insertMovement(db, t, x, { cycleCount: sessionId });
    await insertMovement(db, t, x, { cycleCount: sessionId });
    const [dups] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements WHERE tenant_id = $1::uuid AND (reverses_movement_id IS NOT NULL OR cycle_count_id IS NOT NULL)`, t);
    assert.equal((dups as { n: number }).n, 4, "sem os índices, as duplicatas (C1/C2) são aceitas");

    await db.$executeRawUnsafe(`DELETE FROM stock_movements WHERE tenant_id = $1::uuid AND (reverses_movement_id IS NOT NULL OR cycle_count_id IS NOT NULL)`, t);
    const startedAt = Date.now();
    for (const statement of upStatements()) await db.$executeRawUnsafe(statement);
    console.log(`[C4′] re-up em ${Date.now() - startedAt} ms`);
    assert.deepEqual(await indexNames(db), INDEXES, "re-up: os dois índices");
    await insertMovement(db, t, x, { reverses: original });
    await insertMovement(db, t, x, { cycleCount: sessionId });
    for (const options of [{ reverses: original }, { cycleCount: sessionId }]) {
      let error: unknown;
      try {
        await insertMovement(db, t, x, options);
      } catch (caught) {
        error = caught;
      }
      assert.ok(error, `re-up: a duplicata ${JSON.stringify(options)} tinha de ser recusada`);
      assert.match(errorText(error), /23505/);
    }
    await cleanup(db, [t]);
  });

  test("C5′ [censo fail-closed] (M-01) · 21 grupos de legado (13 estornos + 8 ajustes, 2 tenants) → P0001 com a contagem REAL e amostra de 20; o censo lista os 21 sem mutar; limpo → mudo; re-up", async () => {
    const { db } = await drill();
    for (const statement of downStatements()) await db.$executeRawUnsafe(statement);
    assert.deepEqual(await indexNames(db), []);

    const tenants = [await seedTenant(db, "c5-a"), await seedTenant(db, "c5-b")];
    for (const [index, tenant] of tenants.entries()) {
      const estornos = index === 0 ? 7 : 6;
      const ajustes = 4;
      const item = await seedItem(db, tenant);
      for (let i = 0; i < estornos; i += 1) {
        const original = await insertMovement(db, tenant, item);
        await insertMovement(db, tenant, item, { reverses: original });
        await insertMovement(db, tenant, item, { reverses: original });
      }
      const [session] = await db.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, tenant);
      for (let i = 0; i < ajustes; i += 1) {
        const other = await seedItem(db, tenant);
        await insertMovement(db, tenant, other, { cycleCount: (session as { id: string }).id });
        await insertMovement(db, tenant, other, { cycleCount: (session as { id: string }).id });
      }
    }

    // O censo somente leitura (o do ato do dono) lista os 21 grupos, sem mutar nada.
    const [before] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements`);
    const census = readFileSync(path.join(ROOT, CENSUS), "utf8")
      .replace(/\r\n/g, "\n")
      .replace(/--[^\n]*/g, "")
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);
    const groups = (await db.$queryRawUnsafe(census[0]!)) as Array<Record<string, unknown>>;
    const summary = (await db.$queryRawUnsafe(census[1]!)) as Array<Record<string, unknown>>;
    const [afterCount] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements`);
    assert.equal(groups.length, 21, "uma linha por grupo duplicado");
    assert.deepEqual(Object.keys(groups[0]!).sort(), ["chave_1", "chave_2", "linhas", "movimentos", "tenant_id", "tipo"]);
    assert.deepEqual(
      [groups.filter((row) => row.tipo === "estorno").length, groups.filter((row) => row.tipo === "ajuste_contagem").length],
      [13, 8],
    );
    assert.equal(summary.length, 1);
    assert.equal((afterCount as { n: number }).n, (before as { n: number }).n, "o censo não muta (contagem antes = depois)");

    // O bloco fail-closed da migração aborta com a contagem REAL (nunca o teto da amostra) e sem tenant_id.
    let failure: unknown;
    try {
      await db.$executeRawUnsafe(censusBlock());
    } catch (caught) {
      failure = caught;
    }
    assert.ok(failure, "com 21 grupos o censo da migração tinha de ABORTAR");
    const text = errorText(failure);
    assert.match(text, /P0001/);
    assert.match(text, /21 grupo\(s\) DUPLICADO\(S\)/);
    assert.match(text, /Amostra \(ate 20 de 21\)/);
    assert.match(text, /P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD/);
    assert.match(text, /migrate resolve --rolled-back 20260873000000_add_stock_movements_unique_backstops/);
    for (const tenant of tenants) assert.equal(text.includes(tenant), false, "a mensagem nunca traz tenant_id (§B2.8)");
    assert.deepEqual(await indexNames(db), [], "nada foi criado");

    await cleanup(db, tenants);
    await db.$executeRawUnsafe(censusBlock()); // limpo → mudo
    for (const statement of upStatements()) await db.$executeRawUnsafe(statement);
    assert.deepEqual(await indexNames(db), INDEXES, "re-up depois de sanear");
  });
}
