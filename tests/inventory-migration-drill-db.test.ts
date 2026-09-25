import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";

import {
  buildConnectionStringForRole,
  createEphemeralRole,
  withRoleCatalogLock,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";

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
const MIGRATION_NAME = "20260873000000_add_stock_movements_unique_backstops";
const MIGRATION = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
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
    execFileSync(process.execPath, [prismaCliPath(), "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: target.toString() },
      stdio: "pipe",
    });
    const migratedIn = Date.now() - startedAt;
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString() }) });
    console.log(`[drill] base própria ${name}: migrate deploy em ${migratedIn} ms`);
    return { admin, db, name, url: target.toString() };
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
  const prismaCliPath = (): string => createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");

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

  /**
   * Os statements do script do censo, na ordem: `SET row_security = off` + as TRÊS consultas. As linhas de
   * meta-comando do psql (`\set ON_ERROR_STOP on`) são descartadas — elas não existem no protocolo do servidor.
   */
  function censusStatements(): string[] {
    const raw = readFileSync(path.join(ROOT, CENSUS), "utf8").replace(/\r\n/g, "\n");
    const statements = raw
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("\\"))
      .join("\n")
      .replace(/--[^\n]*/g, "")
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);
    assert.equal(statements.length, 4, `censo: SET + 3 consultas (achei ${statements.length})`);
    assert.match(statements[0]!, /^SET row_security = off$/, "o 1º statement do censo é a guarda de visibilidade");
    return statements;
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

    // O censo somente leitura (o do ato do dono) lista os 21 grupos, sem mutar nada. Pelo ADMIN (que enxerga
    // tudo), a guarda `row_security = off` é inócua — é sob outro papel que ela recusa (C7′).
    const [before] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements`);
    const census = censusStatements();
    const { groups, summary } = await db.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(census[0]!);
      return {
        groups: (await tx.$queryRawUnsafe(census[1]!)) as Array<Record<string, unknown>>,
        summary: (await tx.$queryRawUnsafe(census[2]!)) as Array<Record<string, unknown>>,
      };
    });
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

  // ---------------------------------------------------------------------------------------------
  // CICLO 2 · C1-F1 — o censo e o M-01 sob o PAPEL REAL DA APLICAÇÃO.
  //
  // O ciclo 1 mediu o portão do deploy só sob SUPERUSUÁRIO. Sob FORCE RLS e um papel `NOSUPERUSER
  // NOBYPASSRLS` — a postura da URL da aplicação (`docs/deployment.md`) —, a mesma migração e o mesmo censo
  // enumeravam um universo VAZIO em silêncio: 17 grupos duplicados na tabela, `0|0` no censo, o bloco `DO`
  // mudo e o deploy saindo com `23505` cru. Aqui a recusa é do MOTOR (`row_security = off` → 42501), nas
  // três posturas: admin (enxerga), papel não dono, papel DONO sob FORCE.
  // ---------------------------------------------------------------------------------------------

  /** A semente do jurado: 11 grupos de estorno duplicado + 6 de ajuste duplicado = 17 grupos, 45 movimentos. */
  async function seedSeventeenGroups(db: any): Promise<{ tenants: string[]; movements: number }> {
    const tenant = await seedTenant(db, "c1f1");
    const item = await seedItem(db, tenant);
    let movements = 0;
    for (let i = 0; i < 11; i += 1) {
      const original = await insertMovement(db, tenant, item);
      await insertMovement(db, tenant, item, { reverses: original });
      await insertMovement(db, tenant, item, { reverses: original });
      movements += 3;
    }
    const [session] = await db.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, tenant);
    for (let i = 0; i < 6; i += 1) {
      const other = await seedItem(db, tenant);
      await insertMovement(db, tenant, other, { cycleCount: (session as { id: string }).id });
      await insertMovement(db, tenant, other, { cycleCount: (session as { id: string }).id });
      movements += 2;
    }
    return { tenants: [tenant], movements };
  }

  /** Papel efêmero `NOSUPERUSER NOBYPASSRLS` desta base própria (o helper do arnês; teardown pelo nome). */
  async function ephemeralRole(): Promise<EphemeralRole> {
    const { db, url } = await drill();
    return createEphemeralRole(db as any, url);
  }

  /**
   * A URL do papel efêmero para um processo FILHO (`prisma migrate deploy`): o helper não devolve a senha que
   * sorteou, então o admin repõe uma conhecida — a role continua efêmera e some no `drop()`, pelo nome.
   *
   * `ALTER ROLE` é escrita em catálogo de CLUSTER (`pg_authid`), compartilhado por TODO o lote paralelo:
   * vai DENTRO do `withRoleCatalogLock` do arnês, como manda `tests/db-catalog-write-guard.test.ts`.
   */
  async function roleConnectionString(role: EphemeralRole): Promise<string> {
    const { db, url } = await drill();
    const password = `dev-c2-${randomUUID()}`;
    await withRoleCatalogLock(db as any, async (tx) => {
      await tx.$executeRawUnsafe(`ALTER ROLE "${role.roleName}" PASSWORD '${password}'`);
    });
    return buildConnectionStringForRole(url, role.roleName, password);
  }

  async function rolePosture(db: any, roleName: string): Promise<{ rolsuper: boolean; rolbypassrls: boolean }> {
    const rows = await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, roleName);
    return (rows as Array<{ rolsuper: boolean; rolbypassrls: boolean }>)[0]!;
  }

  /** Troca o dono das tabelas do esquema `public` DESTA base própria (nunca a compartilhada). */
  async function chownTables(db: any, owner: string): Promise<number> {
    const rows = (await db.$queryRawUnsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`,
    )) as Array<{ tablename: string }>;
    for (const { tablename } of rows) await db.$executeRawUnsafe(`ALTER TABLE public."${tablename}" OWNER TO "${owner}"`);
    return rows.length;
  }

  test("C6′ [DO sob o papel real] · o bloco DO do M-01 nas TRÊS posturas: admin conta 17; papel NOSUPERUSER (dono e não dono) ABORTA com 'censo CEGO', nunca mudo, nunca '0 grupos'", async () => {
    const { db, admin: _admin } = await drill();
    for (const statement of downStatements()) await db.$executeRawUnsafe(statement);
    const { tenants, movements } = await seedSeventeenGroups(db);
    const role = await ephemeralRole();
    const [{ owner: originalOwner }] = (await db.$queryRawUnsafe(
      `SELECT tableowner AS owner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_movements'`,
    )) as Array<{ owner: string }>;

    try {
      const posture = await rolePosture(db, role.roleName);
      assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false }, "o papel do teste é o papel da aplicação");
      const [forced] = (await db.$queryRawUnsafe(
        `SELECT relrowsecurity AS rls, relforcerowsecurity AS force FROM pg_class WHERE relname = 'stock_movements'`,
      )) as Array<{ rls: boolean; force: boolean }>;
      assert.deepEqual(forced, { rls: true, force: true }, "stock_movements com RLS FORCE (a condição do achado)");

      // (i) ADMIN — enxerga tudo: a contagem REAL.
      let byAdmin: unknown;
      try {
        await db.$executeRawUnsafe(censusBlock());
      } catch (caught) {
        byAdmin = caught;
      }
      assert.ok(byAdmin, "(i) com 17 grupos o bloco tinha de abortar");
      assert.match(errorText(byAdmin), /P0001/);
      assert.match(errorText(byAdmin), /17 grupo\(s\) DUPLICADO\(S\)/);
      assert.equal(/censo CEGO/.test(errorText(byAdmin)), false, "(i) o admin NÃO é cego");

      // (ii) PAPEL NÃO DONO — a política se aplica: o motor RECUSA em vez de filtrar.
      let byRole: unknown;
      try {
        await (role.client as any).$executeRawUnsafe(censusBlock());
      } catch (caught) {
        byRole = caught;
      }
      assert.ok(byRole, "(ii) o bloco tinha de ABORTAR sob o papel (antes: `DO` mudo)");
      assert.match(errorText(byRole), /censo CEGO sob o papel/);
      assert.match(errorText(byRole), new RegExp(role.roleName));
      assert.equal(/grupo\(s\) DUPLICADO/.test(errorText(byRole)), false, "(ii) jamais uma contagem cega");

      // (iii) PAPEL DONO sob FORCE — o caso que a postura "quem migra é dono" produz.
      await chownTables(db, role.roleName);
      let byOwner: unknown;
      try {
        await (role.client as any).$executeRawUnsafe(censusBlock());
      } catch (caught) {
        byOwner = caught;
      }
      assert.ok(byOwner, "(iii) o bloco tinha de ABORTAR sob o papel DONO (FORCE RLS)");
      assert.match(errorText(byOwner), /censo CEGO sob o papel/);
      assert.equal(/grupo\(s\) DUPLICADO/.test(errorText(byOwner)), false);

      // Nada foi mutado em nenhuma das três.
      const [after] = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM stock_movements`)) as Array<{ n: number }>;
      assert.equal(after!.n, movements, "nenhum movimento mutado pelo censo");
      assert.deepEqual(await indexNames(db), [], "nenhum índice criado");
    } finally {
      await chownTables(db, originalOwner!);
      await role.drop();
      await cleanup(db, tenants);
      for (const statement of upStatements()) await db.$executeRawUnsafe(statement);
    }
  });

  test("C7′ [censo sob o papel real] · o script: admin lista 17 grupos + resumo + R19; o papel NOSUPERUSER recebe 42501 na 1ª consulta e NENHUMA linha — nunca `0|0`", async () => {
    const { db } = await drill();
    for (const statement of downStatements()) await db.$executeRawUnsafe(statement);
    const { tenants } = await seedSeventeenGroups(db);
    const role = await ephemeralRole();
    const census = censusStatements();

    try {
      // Uma sobreposição de sessões NÃO terminais (a R19, 3ª consulta) semeada no mesmo tenant.
      const tenant = tenants[0]!;
      const sharedItem = await seedItem(db, tenant);
      for (const status of ["aberta", "suspensa"]) {
        const [session] = (await db.$queryRawUnsafe(
          `INSERT INTO cycle_counts (tenant_id, status) VALUES ($1::uuid, $2) RETURNING id`,
          tenant,
          status,
        )) as Array<{ id: string }>;
        await db.$executeRawUnsafe(
          `INSERT INTO cycle_count_entries (tenant_id, cycle_count_id, item_id, system_quantity) VALUES ($1::uuid, $2::uuid, $3::uuid, 1)`,
          tenant,
          session!.id,
          sharedItem,
        );
      }

      // ADMIN: as três consultas respondem.
      const byAdmin = await db.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(census[0]!);
        return {
          groups: (await tx.$queryRawUnsafe(census[1]!)) as unknown[],
          summary: (await tx.$queryRawUnsafe(census[2]!)) as Array<Record<string, unknown>>,
          overlaps: (await tx.$queryRawUnsafe(census[3]!)) as unknown[],
        };
      });
      assert.equal(byAdmin.groups.length, 17, "admin: 17 grupos duplicados");
      assert.equal(byAdmin.summary.length, 1);
      assert.equal(byAdmin.overlaps.length, 1, "admin: a R19 acusa a sobreposição (inclusive a sessão `suspensa`)");

      // PAPEL: a 1ª consulta RECUSA (42501) e não devolve linha nenhuma.
      let refused: unknown;
      let rows: unknown[] | undefined;
      try {
        rows = await (role.client as any).$transaction(async (tx: any) => {
          await tx.$executeRawUnsafe(census[0]!);
          return (await tx.$queryRawUnsafe(census[1]!)) as unknown[];
        });
      } catch (caught) {
        refused = caught;
      }
      assert.ok(refused, "o censo tinha de RECUSAR sob o papel (antes: uma linha `0|0`)");
      assert.equal(rows, undefined, "nenhuma linha devolvida");
      assert.match(errorText(refused), /42501|row-level security/i);
    } finally {
      await role.drop();
      await db.$executeRawUnsafe(`DELETE FROM cycle_count_entries WHERE tenant_id = ANY($1::uuid[])`, tenants);
      await cleanup(db, tenants);
      for (const statement of upStatements()) await db.$executeRawUnsafe(statement);
    }
  });

  test("C8′ [`migrate deploy` sob o papel real] · papel NOSUPERUSER dono: com 17 grupos E com 0 grupos o deploy ABORTA com 'censo CEGO' (nunca `23505` cru, nunca '0 grupos'); pelo admin, aplica", async () => {
    const { db, url } = await drill();
    const role = await ephemeralRole();
    const roleUrl = await roleConnectionString(role);
    const [{ owner: originalOwner }] = (await db.$queryRawUnsafe(
      `SELECT tableowner AS owner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_movements'`,
    )) as Array<{ owner: string }>;

    /** Repõe a migração do bloco como PENDENTE: derruba os índices e apaga a linha de `_prisma_migrations`. */
    async function makePending(): Promise<void> {
      for (const statement of downStatements()) await db.$executeRawUnsafe(statement);
      await db.$executeRawUnsafe(`DELETE FROM _prisma_migrations WHERE migration_name = $1`, MIGRATION_NAME);
    }

    function deploy(connection: string): { code: number; output: string } {
      try {
        const output = execFileSync(process.execPath, [prismaCliPath(), "migrate", "deploy"], {
          cwd: ROOT,
          env: { ...process.env, DATABASE_URL: connection },
          stdio: "pipe",
        });
        return { code: 0, output: output.toString() };
      } catch (error) {
        const failure = error as { status?: number; stdout?: Buffer; stderr?: Buffer };
        return { code: failure.status ?? 1, output: `${failure.stdout?.toString() ?? ""}${failure.stderr?.toString() ?? ""}` };
      }
    }

    let tenants: string[] = [];
    try {
      await db.$executeRawUnsafe(`GRANT CREATE, USAGE ON SCHEMA public TO "${role.roleName}"`);
      await chownTables(db, role.roleName);

      // (a) papel + 17 grupos → recusa por CEGUEIRA (antes: `23505` cru, sem contagem e sem instrução).
      await makePending();
      tenants = (await seedSeventeenGroups(db)).tenants;
      const blindWithGroups = deploy(roleUrl);
      assert.notEqual(blindWithGroups.code, 0, "(a) o deploy tinha de falhar");
      assert.match(blindWithGroups.output, /censo CEGO sob o papel/);
      assert.equal(/grupo\(s\) DUPLICADO/.test(blindWithGroups.output), false, "(a) nunca uma contagem cega");
      assert.equal(/23505/.test(blindWithGroups.output), false, "(a) nunca o 23505 cru do índice");
      assert.deepEqual(await indexNames(db), [], "(a) nada criado");

      // (b) papel + 0 grupos → a MESMA recusa (a consequência declarada em R21: sem papel que enxergue, não aplica).
      await cleanup(db, tenants);
      tenants = [];
      await makePending();
      const blindWithoutGroups = deploy(roleUrl);
      assert.notEqual(blindWithoutGroups.code, 0, "(b) o deploy tinha de falhar mesmo com a tabela limpa");
      assert.match(blindWithoutGroups.output, /censo CEGO sob o papel/);

      // (c) admin (superusuário) + 0 grupos → aplica.
      await chownTables(db, originalOwner!);
      await makePending();
      const byAdmin = deploy(url);
      assert.equal(byAdmin.code, 0, `(c) o deploy pelo admin tinha de aplicar: ${byAdmin.output}`);
      assert.deepEqual(await indexNames(db), INDEXES, "(c) os dois índices nascem");
    } finally {
      await chownTables(db, originalOwner!);
      await role.drop();
      if (tenants.length > 0) await cleanup(db, tenants);
      const [applied] = (await db.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
        MIGRATION_NAME,
      )) as Array<{ n: number }>;
      if (applied!.n === 0) {
        await db.$executeRawUnsafe(`DELETE FROM _prisma_migrations WHERE migration_name = $1`, MIGRATION_NAME);
        for (const statement of upStatements()) await db.$executeRawUnsafe(statement);
      }
    }
  });

  // ---------------------------------------------------------------------------------------------
  // CICLO 2 · C2-04 — a violação de unicidade de um índice ALHEIO não pode virar "já estornado".
  // DDL (`CREATE UNIQUE INDEX`) só nesta suíte, em base PRÓPRIA (D9).
  // ---------------------------------------------------------------------------------------------
  test("C10′ [índice alheio] · com um índice único de outra pessoa sobre stock_movements, removeExitForSource e reverseMovement REJEITAM (o chamador sabe) em vez de devolver sucesso silencioso; sem ele, estornam", async () => {
    const { db, url } = await drill();
    const inv = await import("../src/modules/inventory/inventory-prisma.repository.js");
    const repo = new inv.RlsPrismaInventoryRepository(db as any);
    const tenant = await seedTenant(db, "c10");
    const item = await seedItem(db, tenant);
    const sourceA = randomUUID();
    const sourceB = randomUUID();
    const saldo = async (): Promise<number> => {
      const rows = (await db.$queryRawUnsafe(
        `SELECT COALESCE(sum(quantidade_sinalizada), 0)::float8 AS saldo FROM stock_movements WHERE item_id = $1::uuid`,
        item,
      )) as Array<{ saldo: number }>;
      return rows[0]!.saldo;
    };

    try {
      await db.$executeRawUnsafe(
        `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type) VALUES ($1::uuid, $2::uuid, 'entrada', 10, 'base')`,
        tenant,
        item,
      );
      await repo.createExitForSource({ tenantId: tenant, itemId: item, quantity: 2, sourceType: "fuel_log", sourceId: sourceA, reason: "c2-a" } as any);
      await repo.createExitForSource({ tenantId: tenant, itemId: item, quantity: 3, sourceType: "fuel_log", sourceId: sourceB, reason: "c2-b" } as any);
      assert.equal(await saldo(), 5, "10 − 2 − 3");

      // O índice do jurado: "no máximo UM estorno por item" — nada a ver com os três do bloco.
      await db.$executeRawUnsafe(
        `CREATE UNIQUE INDEX c2_probe_um_estorno_por_item ON stock_movements (tenant_id, item_id)
           WHERE reverses_movement_id IS NOT NULL AND reason LIKE 'c2-%'`,
      );

      const first = await repo.removeExitForSource({ tenantId: tenant, sourceType: "fuel_log", sourceId: sourceA, reason: "c2-a" } as any);
      assert.ok(first, "a 1ª baixa é estornada normalmente");
      assert.equal(await saldo(), 7, "10 − 3");

      // A 2ª bate no índice ALHEIO: antes devolvia `undefined` (SUCESSO silencioso) e o saldo ficava em 7.
      let removal: unknown;
      try {
        await repo.removeExitForSource({ tenantId: tenant, sourceType: "fuel_log", sourceId: sourceB, reason: "c2-b" } as any);
      } catch (caught) {
        removal = caught;
      }
      assert.ok(removal, "a violação de índice ALHEIO tem de chegar ao chamador");
      assert.equal(inv.isUniqueViolationOf(removal, inv.STOCK_MOVEMENT_UNIQUE_INDEXES.reversal), false, "não é o índice de estorno");
      assert.equal(await saldo(), 7, "nada mudou: a baixa B NÃO foi estornada");

      const exitB = (await db.$queryRawUnsafe(
        `SELECT id::text AS id FROM stock_movements WHERE source_id = $1::uuid AND source_type = 'fuel_log'`,
        sourceB,
      )) as Array<{ id: string }>;
      let reversal: unknown;
      try {
        await repo.reverseMovement({ tenantId: tenant, movementId: exitB[0]!.id, reason: "c2-b" } as any);
      } catch (caught) {
        reversal = caught;
      }
      assert.ok(reversal, "reverseMovement também rejeita (antes: `already_reversed`)");
      assert.equal(await saldo(), 7);

      // Sem o índice alheio, o estorno acontece: a recusa era DELE, não do bloco.
      await db.$executeRawUnsafe(`DROP INDEX c2_probe_um_estorno_por_item`);
      const again = await repo.removeExitForSource({ tenantId: tenant, sourceType: "fuel_log", sourceId: sourceB, reason: "c2-b" } as any);
      assert.ok(again, "sem o índice alheio, a baixa B é estornada");
      assert.equal(await saldo(), 10, "o saldo volta a 10");
    } finally {
      await db.$executeRawUnsafe(`DROP INDEX IF EXISTS c2_probe_um_estorno_por_item`);
      await cleanup(db, [tenant]);
    }
  });
}
