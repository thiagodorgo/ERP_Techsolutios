import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  waitForOwnBlockedStatement,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-04a · T-C (Ω6R-DAT-002 / DAT-003) — OS BACKSTOPS DE BANCO, o censo somente leitura e o mapeamento do
// `P2002` FORA da transação, contra o Postgres REAL. Base COMPARTILHADA: esta suíte NÃO faz DDL (D9) — o drill
// de up/down/re-up e o censo fail-closed com duplicatas vivem em `inventory-migration-drill-db.test.ts`, numa
// base PRÓPRIA (T-04: DDL aqui pegaria ACCESS EXCLUSIVE em `stock_movements` e travaria as suítes irmãs).
//
//   C1  2ª compensação do mesmo original por SQL cru → 23505 em `stock_movements_reversal_active_key`
//   C2  2º ajuste da mesma (sessão, item) por SQL cru → 23505 em `stock_movements_cycle_count_item_key`
//   C3  linhas com as chaves NULL não entram nos índices parciais
//   C6  o censo é SOMENTE LEITURA: sem comentários, nenhuma palavra de escrita; executa dentro de uma
//       transação READ ONLY e devolve as colunas do contrato
//   C7  (T-02) escritor SEM o lock do item (SQL cru, `item_id` de OUTRO item, não commitado) × `reverseMovement`
//       real: B bloqueia na tupla concorrente do índice, recebe P2002 e o wrapper responde 409 FORA da tx
//   C8  idem × `removeExitForSource` real → `undefined`
// O 23505 é INALCANÇÁVEL por escritor que respeita a FK (o INSERT toma KEY SHARE no item e espera o FOR UPDATE):
// C7/C8 usam o único escritor que o alcança. Sem o índice (head-base), B não bloqueia e grava a 2ª compensação.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const CENSUS = "scripts/inventory-duplicates-census.sql";

/** Remove comentários SQL (`--…` até o fim da linha e `/*…*\/`) fora de string literal. */
export function stripSqlComments(sql: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i]!;
    const next = sql[i + 1];
    if (inString) {
      out += ch;
      if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end < 0 ? sql.length : end + 1;
      continue;
    }
    out += ch;
  }
  return out;
}

/** Fail-closed: qualquer palavra de escrita/DDL no SQL sem comentários. */
export const SQL_WRITE_WORD = /\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|COPY|MERGE)\b/gi;

if (!connectionString) {
  test("B-O6R-04a T-C (backstops de banco) exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  const appAdmin = buildApplicationName("inv-backstop-admin");
  const appB = buildApplicationName("inv-backstop-b");

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const inv = await import("../src/modules/inventory/inventory-prisma.repository.js");
    const { InventoryService } = await import("../src/modules/inventory/inventory.service.js");

    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(connectionString!, appAdmin) }) });
    const roleB: EphemeralRole = await createEphemeralRole(admin, withApplicationName(connectionString!, appB));
    const repoB = new inv.RlsPrismaInventoryRepository(roleB.client as any);
    return { admin, roleB, repoB, inventoryB: new InventoryService(repoB), tenants: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      await teardownTenants(h.admin, h.tenants);
    } finally {
      await h.roleB.drop();
      await h.admin.$disconnect();
    }
  });

  // (o auxiliar `sleep` saiu com a última espera fixa desta suíte; a catraca de higiene do T-D
  //  afirma que a contagem aqui é ZERO, e deixá-lo declarado seria convite a reintroduzir uma)
  const actorOf = (tenantId: string) => ({ tenantId, userId: randomUUID(), roles: [], permissions: [] }) as any;

  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `inv-backstop-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug);
    h.tenants.push(rows[0]!.id);
    return rows[0]!.id;
  }

  async function newItem(h: Harness, tenantId: string, base = 10): Promise<string> {
    const id = randomUUID();
    await h.admin.$executeRawUnsafe(
      `INSERT INTO inventory_items (id, tenant_id, sku, name, unit) VALUES ($1::uuid, $2::uuid, $3, $3, 'un')`,
      id,
      tenantId,
      `SKU-${id.slice(0, 13)}`,
    );
    if (base) await rawMovement(h.admin, tenantId, id, "entrada", base);
    return id;
  }

  async function rawMovement(
    client: any,
    tenantId: string,
    itemId: string,
    type: string,
    quantity: number,
    options: { reverses?: string; cycleCount?: string; sourceType?: string; sourceId?: string } = {},
  ): Promise<string> {
    const rows = await client.$queryRawUnsafe(
      `INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, reverses_movement_id, cycle_count_id, source_type, source_id)
       VALUES ($1::uuid, $2::uuid, $3, $4::numeric, 'base', $5::uuid, $6::uuid, $7, $8::uuid) RETURNING id`,
      tenantId,
      itemId,
      type,
      quantity,
      options.reverses ?? null,
      options.cycleCount ?? null,
      options.sourceType ?? null,
      options.sourceId ?? null,
    );
    return (rows as Array<{ id: string }>)[0]!.id;
  }

  async function compensationsOf(h: Harness, movementId: string): Promise<Array<{ item: string }>> {
    return h.admin.$queryRawUnsafe<Array<{ item: string }>>(
      `SELECT item_id::text AS item FROM stock_movements WHERE reverses_movement_id = $1::uuid`,
      movementId,
    );
  }

  function errorText(error: unknown): string {
    const record = error as { message?: string; code?: string };
    return `${record?.code ?? ""} ${record?.message ?? ""} ${JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}))}`;
  }

  function describe(outcome: SettledOutcome<unknown>): string {
    if (outcome.status === "fulfilled") return outcome.value === undefined ? "undefined" : "ok";
    const reason = outcome.reason as any;
    if (reason?.statusCode) return `${reason.statusCode}|${reason.reason}`;
    const causeCode = reason?.cause?.code ?? reason?.meta?.driverAdapterError?.cause?.code ?? reason?.meta?.code;
    return `${reason?.code ?? reason?.name ?? "erro"}${causeCode ? `/${causeCode}` : ""}`;
  }

  // (`blockedWithin` saiu — ver o comentário em C7. Era uma segunda barreira, com teto de 3 s e
  //  passo de polling próprios, ao lado da barreira escopada do módulo. O teto de 3 s era o SEGUNDO
  //  mecanismo mais apertado do bloco e o único cuja espera real não era observável.)

  /** Transação do admin que grava a compensação CRUA (sem o lock do item) e SEGURA até `release()`. */
  function holdRawCompensation(h: Harness, tenantId: string, otherItem: string, reverses: string) {
    let release!: () => void;
    let markWritten!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const written = new Promise<void>((resolve) => (markWritten = resolve));
    const done = h.admin.$transaction(
      async (tx: any) => {
        await rawMovement(tx, tenantId, otherItem, "saida", 3, { reverses });
        markWritten();
        await gate;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    return { release, written, done: captureSettled(done) };
  }

  test("C0 · postura do papel (NOSUPERUSER, sem BYPASSRLS) e tag propagada; os dois índices existem com o predicado", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
      h.roleB.roleName,
    );
    assert.deepEqual(rows[0], { rolsuper: false, rolbypassrls: false });
    await assertApplicationNamePropagated(h.roleB.client as any, appB);
    await assertApplicationNamePropagated(h.admin as any, appAdmin);
    const indexes = await h.admin.$queryRawUnsafe<Array<{ name: string; def: string }>>(
      `SELECT indexname AS name, indexdef AS def FROM pg_indexes WHERE tablename = 'stock_movements'
          AND indexname IN ('stock_movements_reversal_active_key', 'stock_movements_cycle_count_item_key') ORDER BY 1`,
    );
    assert.deepEqual(
      indexes.map((index) => [index.name, /UNIQUE/.test(index.def), /WHERE \((\w+) IS NOT NULL\)/.exec(index.def)?.[1]]),
      [
        ["stock_movements_cycle_count_item_key", true, "cycle_count_id"],
        ["stock_movements_reversal_active_key", true, "reverses_movement_id"],
      ],
    );
  });

  test("C1 · 2ª compensação do MESMO original por SQL cru → 23505 nomeando stock_movements_reversal_active_key", async () => {
    const h = await harness();
    const t = await newTenant(h, "c1");
    const x = await newItem(h, t);
    const original = await rawMovement(h.admin, t, x, "saida", -3);
    await rawMovement(h.admin, t, x, "saida", 3, { reverses: original });
    const second = await captureSettled(rawMovement(h.admin, t, x, "saida", 3, { reverses: original }));
    assert.equal(second.status, "rejected", "a 2ª compensação tinha de ser recusada pelo banco");
    const text = errorText((second as { reason: unknown }).reason);
    assert.match(text, /23505/);
    assert.match(text, /stock_movements_reversal_active_key/);
    assert.equal((await compensationsOf(h, original)).length, 1);
  });

  test("C2 · 2º ajuste da MESMA (sessão, item) por SQL cru → 23505 nomeando stock_movements_cycle_count_item_key", async () => {
    const h = await harness();
    const t = await newTenant(h, "c2");
    const x = await newItem(h, t);
    const [session] = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t);
    await rawMovement(h.admin, t, x, "ajuste", -3, { cycleCount: session!.id });
    const second = await captureSettled(rawMovement(h.admin, t, x, "ajuste", -3, { cycleCount: session!.id }));
    assert.equal(second.status, "rejected", "o 2º ajuste tinha de ser recusado pelo banco");
    const text = errorText((second as { reason: unknown }).reason);
    assert.match(text, /23505/);
    assert.match(text, /stock_movements_cycle_count_item_key/);
    const [count] = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM stock_movements WHERE cycle_count_id = $1::uuid`,
      session!.id,
    );
    assert.equal(count!.n, 1);
  });

  test("C3 · chaves NULL ficam fora dos índices parciais: N movimentos sem estorno/sessão são todos aceitos", async () => {
    const h = await harness();
    const t = await newTenant(h, "c3");
    const x = await newItem(h, t, 0);
    for (let i = 0; i < 20; i += 1) await rawMovement(h.admin, t, x, i % 2 === 0 ? "entrada" : "saida", i % 2 === 0 ? 2 : -1);
    const [count] = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM stock_movements WHERE item_id = $1::uuid`, x);
    assert.equal(count!.n, 20);
  });

  test("C6 [censo] · somente leitura (sem comentários e sem meta-comandos); READ ONLY com as colunas do contrato pelo admin; e sob o papel da aplicação RECUSA com 42501 em vez de responder `0|0`", async () => {
    const h = await harness();
    const raw = readFileSync(path.join(ROOT, CENSUS), "utf8").replace(/\r\n/g, "\n");
    // Ciclo 2 (C1-F1): o censo passou a ter meta-comandos do psql (`\set ON_ERROR_STOP on`) e a guarda de
    // visibilidade (`SET row_security = off`). O que este caso confere continua sendo: NENHUMA escrita.
    const code = stripSqlComments(raw)
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("\\"))
      .join("\n");
    assert.deepEqual(code.match(SQL_WRITE_WORD) ?? [], [], "o censo não pode conter escrita/DDL fora de comentário");
    // Controle de dentes do guard: a mesma regex sobre o censo com UMA escrita acrescentada tem de casar.
    assert.ok((stripSqlComments(`${raw}\nDELETE FROM stock_movements;\n`).match(SQL_WRITE_WORD) ?? []).length >= 1, "a regex fail-closed tem dentes");
    assert.match(raw, /SOMENTE LEITURA: o arquivo contém apenas consultas \(SELECT\); nada é gravado\./);
    assert.match(raw.split("\n")[0]!, /PRE-CONDICAO DE PAPEL/, "a 1ª linha declara a pré-condição de papel (C1-F1)");
    assert.match(raw, /^\\set ON_ERROR_STOP on$/m, "o censo para na 1ª falha (nunca segue cego)");

    const statements = code.split(";").map((statement) => statement.trim()).filter(Boolean);
    assert.equal(statements.length, 4, "a guarda de visibilidade + três consultas (grupos, resumo, R19)");
    assert.match(statements[0]!, /^SET row_security = off$/);
    // Base compartilhada COM os índices: grupo duplicado é impossível aqui (o censo com 21 grupos semeados
    // roda no drill, em base própria sem os índices — C5′). O que se prova aqui: roda em READ ONLY.
    const result = await h.admin.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await tx.$executeRawUnsafe(statements[0]!);
      const groups = await tx.$queryRawUnsafe(statements[1]!);
      const summary = await tx.$queryRawUnsafe(statements[2]!);
      const overlaps = await tx.$queryRawUnsafe(statements[3]!);
      return { groups, summary, overlaps };
    });
    assert.deepEqual(result.groups, [], "com os índices únicos no lugar, zero grupo duplicado");
    assert.deepEqual(Object.keys((result.summary as Array<Record<string, unknown>>)[0]!).sort(), ["ajustes_de_contagem", "estornos"]);
    assert.ok(Array.isArray(result.overlaps), "a R19 (sessões sobrepostas) responde");

    // O PAPEL DA APLICAÇÃO (NOSUPERUSER, sem BYPASSRLS, o mesmo do C0): sob FORCE RLS ele enxergaria um
    // universo filtrado; com a guarda, o motor RECUSA. Antes deste ciclo, a resposta era uma linha `0|0`.
    let refused: unknown;
    let rows: unknown;
    try {
      rows = await (h.roleB.client as any).$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(statements[0]!);
        return tx.$queryRawUnsafe(statements[1]!);
      });
    } catch (caught) {
      refused = caught;
    }
    assert.ok(refused, "o censo tinha de RECUSAR sob o papel da aplicação");
    assert.equal(rows, undefined, "nenhuma linha — nunca um `0|0` cego");
    assert.match(errorText(refused), /42501|row-level security/i);
  });

  test("C9 [catálogo] · cada índice de STOCK_MOVEMENT_UNIQUE_INDEXES existe com EXATAMENTE as colunas declaradas, o conjunto identifica UM só índice, e a violação real devolve essa identidade", async () => {
    const h = await harness();
    const inv = await import("../src/modules/inventory/inventory-prisma.repository.js");
    const uniqueIndexes = (await h.admin.$queryRawUnsafe(
      `SELECT i.relname AS name, pg_get_indexdef(x.indexrelid) AS def
         FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid JOIN pg_class t ON t.oid = x.indrelid
        WHERE t.relname = 'stock_movements' AND x.indisunique ORDER BY 1`,
    )) as Array<{ name: string; def: string }>;
    const columnsOf = (def: string): string[] =>
      (/ON public\.stock_movements USING \w+ \(([^)]*)\)/.exec(def)?.[1] ?? "")
        .split(",")
        .map((column) => column.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    const byName = new Map(uniqueIndexes.map((index) => [index.name, columnsOf(index.def)]));
    console.log(`[C9] índices únicos de stock_movements: ${[...byName].map(([name, columns]) => `${name}(${columns.join(",")})`).join(" · ")}`);

    for (const [key, index] of Object.entries(inv.STOCK_MOVEMENT_UNIQUE_INDEXES)) {
      const columns = byName.get(index.name);
      assert.ok(columns, `${key}: o índice ${index.name} não existe no catálogo`);
      assert.deepEqual([...columns!].sort(), [...index.columns].sort(), `${key}: colunas divergentes do catálogo`);
      // Ambiguidade = vermelho: o conjunto de colunas TEM de identificar um índice só (é ele a identidade
      // que o driver expõe quando a escrita falha direto).
      const sameShape = [...byName].filter(([, other]) => other.length === columns!.length && [...other].sort().join("|") === [...columns!].sort().join("|"));
      assert.equal(sameShape.length, 1, `${key}: ${sameShape.length} índices únicos com o mesmo conjunto de colunas (ambíguo)`);
    }

    // E a identidade que o driver entrega numa violação REAL (pelo ORM, o caminho de insertMovement).
    const t = await newTenant(h, "c9");
    const x = await newItem(h, t, 0);
    const original = await rawMovement(h.admin, t, x, "saida", -3);
    await rawMovement(h.admin, t, x, "saida", 3, { reverses: original });
    let violation: unknown;
    try {
      await rawMovement(h.admin, t, x, "saida", 3, { reverses: original });
    } catch (caught) {
      violation = caught;
    }
    assert.ok(violation, "a duplicata tinha de ser recusada pelo índice");
    assert.deepEqual(
      [...(inv.uniqueViolationColumns(violation) ?? [])].sort(),
      [...inv.STOCK_MOVEMENT_UNIQUE_INDEXES.reversal.columns].sort(),
      "a violação carrega as colunas do índice de estorno",
    );
    assert.equal(inv.isUniqueViolationOf(violation, inv.STOCK_MOVEMENT_UNIQUE_INDEXES.reversal), true);
    assert.equal(inv.isUniqueViolationOf(violation, inv.STOCK_MOVEMENT_UNIQUE_INDEXES.sourceActive), false, "não confunde com outro índice");
    assert.equal(inv.isUniqueViolationOf(new Error("qualquer erro"), inv.STOCK_MOVEMENT_UNIQUE_INDEXES.reversal), false, "erro sem identidade não é classificado");
  });

  test("C7 [mapeamento V3] (T-02) · escritor SEM o lock do item × reverseMovement real → B bloqueia no índice, 409 movement_already_reversed FORA da tx, UMA compensação", async () => {
    const h = await harness();
    const t = await newTenant(h, "c7");
    const x = await newItem(h, t);
    const z = await newItem(h, t);
    const original = await rawMovement(h.admin, t, x, "saida", -3);
    const holder = holdRawCompensation(h, t, z, original);
    await holder.written;
    const b = captureSettled(h.inventoryB.reverseMovement(actorOf(t), original, {}));
    // Era `blockedWithin(…, 3000)`: um teto de 3 s que NÃO falhava — devolvia `false` para uma
    // asserção lá embaixo — e cuja espera real ninguém conseguia ver. Sob carga a duração total
    // deste caso já ocupava 2.265 ms desses 3.000. Agora a espera é a barreira escopada do módulo:
    // teto padrão de 15 s, falha COM diagnóstico (quantos bloqueios existem no cluster com esse
    // texto) e PUBLICA quanto esperou. O teto de barreira vira último recurso, não mecanismo.
    // O `sleep(200)` que vinha depois era superstição: a barreira JÁ provou o bloqueio.
    await waitForOwnBlockedStatement(h.admin as any, { applicationName: appB, fragment: "stock_movements", label: "C7" });
    holder.release();
    assert.equal((await holder.done).status, "fulfilled");
    const outcome = await b;

    // 1ª asserção = a INVARIANTE (vermelha no head-base: sem índice, B grava a 2ª compensação).
    const compensations = await compensationsOf(h, original);
    assert.deepEqual(compensations, [{ item: z }], "UMA compensação — a do escritor cru; a de B foi desfeita inteira");
    assert.equal(describe(outcome), "409|movement_already_reversed");
    assert.equal(/25P02/.test(errorText((outcome as { reason?: unknown }).reason ?? {})), false, "nunca 25P02");
    // 2ª asserção = o desenho: B esperou na tupla concorrente do índice único. Ela agora é a própria
    // barreira acima — que FALHA nomeando a causa, em vez de devolver `false` para um `assert.equal`
    // que só dizia "expected true, actual false".
  });

  test("C8 [mapeamento V5] (T-02) · escritor SEM o lock do item × removeExitForSource real → B bloqueia no índice, `undefined` FORA da tx, UMA compensação", async () => {
    const h = await harness();
    const t = await newTenant(h, "c8");
    const x = await newItem(h, t);
    const z = await newItem(h, t);
    const sourceId = randomUUID();
    const exit = await rawMovement(h.admin, t, x, "saida", -3, { sourceType: "fuel_log", sourceId });
    const holder = holdRawCompensation(h, t, z, exit);
    await holder.written;
    const b = captureSettled(h.repoB.removeExitForSource({ tenantId: t, sourceType: "fuel_log", sourceId }));
    // Mesma troca do C7: barreira escopada do módulo, que falha com diagnóstico e publica a espera.
    await waitForOwnBlockedStatement(h.admin as any, { applicationName: appB, fragment: "stock_movements", label: "C8" });
    holder.release();
    assert.equal((await holder.done).status, "fulfilled");
    const outcome = await b;

    assert.deepEqual(await compensationsOf(h, exit), [{ item: z }], "UMA compensação — a do escritor cru");
    assert.equal(describe(outcome), "undefined", "no-op idempotente");
    // "B bloqueou no INSERT em stock_movements" é afirmado pela barreira acima.
  });
}

/** Teardown ESCOPADO por tenant_id do próprio arquivo, em ordem de FK — nunca wildcard. */
async function teardownTenants(admin: any, tenants: readonly string[]): Promise<void> {
  if (tenants.length === 0) return;
  const ids = [...tenants];
  await admin.$executeRawUnsafe(`DELETE FROM cycle_count_entries WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM stock_movements WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM cycle_counts WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM inventory_items WHERE tenant_id = ANY($1::uuid[])`, ids);
  await admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, ids);
}
