import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ANTERIORES,
  DDL_NAO_TRANSACIONAL,
  FRONTEIRA,
  auditMigration,
  auditMigrationsDir,
  splitStatements,
} from "../scripts/migration-transaction-guard.mjs";

// B-GUARD-MIGRACAO — guard da regra `D-MIGRACAO-COM-TRANSACAO-EXPLICITA` (dono, 2026-10-21, "3=aprovo"): toda migração
// nova com mais de uma sentença, e só de DDL transacional, leva `BEGIN;`/`COMMIT;` no próprio arquivo e um drill por
// prefixo; a migração com `CONCURRENTLY` fica sozinha no arquivo e declara a não-atomicidade.
//
// POR QUE ESTE ARQUIVO EXISTE: o `prisma migrate deploy` 7.8 executa sentença a sentença em autocommit; uma falha no
// meio deixa a base pela metade e o redeploy quebra. A mesma classe foi reprovada em dois blocos seguidos (B-SAN3-02
// C2-01, B-TRC-02 D1). Aqui ela vira mecanismo: este teste roda no `npm test` (job `backend` da CI), sem banco.
//
// Três metades. (1) O guard sobre o `prisma/migrations/` REAL: zero violação e a lista congelada das anteriores igual ao
// disco. (2) Uma asserção por mutação do §4 do plano (`docs/revisoes/B-GUARD-MIGRACAO-plano.md`), cada fixture vermelha
// pelo ID CERTO — o conjunto exato de regras, não "alguma violação". (3) O CLI real em processo filho: o código de saída
// chega ao chamador.
//
// LIMITE DECLARADO (D-007): o G6 prova que um drill CITA o nome da migração, não que injeta falha por prefixo. Isso é do
// revisor e do bloco seguinte (`B-DRILL-GENERICO-POR-PREFIXO`).

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = path.join(REPO, "prisma", "migrations");
const FIXTURES = path.join(REPO, "tests", "fixtures", "migration-guard");
const GUARD = path.join(REPO, "scripts", "migration-transaction-guard.mjs");
const CASO = "20260999000000_caso";
const DRILL_DO_CASO = [`const MIGRATION_NAME = "${CASO}";`];

type Violation = { rule: string; name: string; line: string };

function rules(violations: Violation[]): string[] {
  return violations.map((v) => v.rule).sort();
}

/** Audita uma fixture (um mini-diretório de migrações) com lista de anteriores vazia e o drill dado. */
function auditFixture(dir: string, drillSources: string[] = DRILL_DO_CASO) {
  return auditMigrationsDir(path.join(FIXTURES, dir), { anteriores: [], drillSources });
}

function tmpMigrations(entries: Record<string, string | null>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b-guard-migracao-"));
  for (const [name, sql] of Object.entries(entries)) {
    fs.mkdirSync(path.join(dir, name));
    if (sql !== null) fs.writeFileSync(path.join(dir, name, "migration.sql"), sql);
  }
  return dir;
}

function realSql(name: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
}

// ---------------------------------------------------------------------------------------------------------------
// (1) O repositório real
// ---------------------------------------------------------------------------------------------------------------

test("A1 — prisma/migrations real: 0 violações, 112 anteriores, as novas julgadas", () => {
  const r = auditMigrationsDir(MIGRATIONS_DIR);
  assert.deepEqual(
    r.violations.map((v: Violation) => v.line),
    [],
    "o guard tem de ficar verde no histórico real do repositório",
  );
  assert.equal(r.anteriores, 112);
  assert.equal(r.novas, r.total - 112);
  assert.ok(r.novas >= 4, `novas = ${r.novas}; a base 8a7885f4 já tinha 4 (878, 879, 880, 881)`);
  const byName = new Map(r.migrations.map((m: { name: string }) => [m.name, m]));
  // As 4 novas da base medida, classificadas como o plano mediu (§0.2, fato 14).
  const esperado: Record<string, { statements: number; controle: number }> = {
    "20260878000000_invoice_complementary_title": { statements: 6, controle: 2 },
    "20260879000000_vehicle_telemetry_events": { statements: 17, controle: 2 },
    "20260880000000_validate_receipt_message_kind_check": { statements: 1, controle: 0 },
    "20260881000000_cheque_title_link": { statements: 3, controle: 2 },
  };
  for (const [name, exp] of Object.entries(esperado)) {
    const m = byName.get(name) as { nova: boolean; statements: number; controle: number } | undefined;
    assert.ok(m, `${name} existe`);
    assert.equal(m.nova, true, `${name} é nova`);
    assert.equal(m.statements, exp.statements, `${name}: sentenças`);
    assert.equal(m.controle, exp.controle, `${name}: controles de transação`);
  }
});

test("A1 — drill real: sem os tests/*-migration-drill-db.test.ts, as 3 novas multi-sentença caem em G6", () => {
  const vazio = fs.mkdtempSync(path.join(os.tmpdir(), "b-guard-migracao-tests-"));
  try {
    const r = auditMigrationsDir(MIGRATIONS_DIR, { testsDir: vazio });
    const g6 = r.violations.filter((v: Violation) => v.rule === "G6").map((v: Violation) => v.name);
    for (const name of [
      "20260878000000_invoice_complementary_title",
      "20260879000000_vehicle_telemetry_events",
      "20260881000000_cheque_title_link",
    ]) {
      assert.ok(g6.includes(name), `${name} deveria cair em G6 sem drill`);
    }
    assert.ok(!g6.includes("20260880000000_validate_receipt_message_kind_check"), "a de 1 sentença é isenta de G6");
  } finally {
    fs.rmSync(vazio, { recursive: true, force: true });
  }
});

test("A15 — higiene da lista congelada: 112 nomes, únicos, todos < FRONTEIRA, IGUAIS ao disco", () => {
  assert.equal(ANTERIORES.length, 112, "ESTA LISTA NÃO CRESCE; só encolhe");
  assert.equal(new Set(ANTERIORES).size, ANTERIORES.length, "nome duplicado");
  for (const name of ANTERIORES) assert.ok(name < FRONTEIRA, `${name} não é anterior a ${FRONTEIRA}`);
  const disco = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name < FRONTEIRA)
    .map((e) => e.name)
    .sort();
  assert.deepEqual([...ANTERIORES].sort(), disco, "a lista é a do ls prisma/migrations | awk '$0 < FRONTEIRA'");
});

test("A15 — um nome da lista que some do disco é G1 (histórico reescrito)", () => {
  const presente = "20260874000000_traccar_ingestion_foundation";
  const sumida = "20260875000000_validate_location_source_check";
  const dir = tmpMigrations({ [presente]: realSql(presente) });
  try {
    const r = auditMigrationsDir(dir, { anteriores: [presente, sumida], drillSources: [] });
    assert.deepEqual(rules(r.violations), ["G1"]);
    assert.equal(r.violations[0].name, sumida);
    assert.match(r.violations[0].line, /histórico reescrito/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// (2) As mutações do §4 do plano
// ---------------------------------------------------------------------------------------------------------------

test("M1 (A1) — cópia da 20260878 sem BEGIN → G2, com n = 6 e a 1ª sentença achada", () => {
  const r = auditMigrationsDir(path.join(FIXTURES, "M01_sem_begin"), { anteriores: [] });
  assert.deepEqual(rules(r.violations), ["G2"]);
  assert.match(r.violations[0].line, /n = 6 /);
  assert.match(r.violations[0].line, /1ª sentença: `ALTER TABLE "financial_titles" ADD COLUMN "parent_title_id" UUID`/);
});

test("M2/M3 (A2) — BEGIN sem COMMIT, e sentença depois do COMMIT → G2", () => {
  assert.deepEqual(rules(auditFixture("M02_sem_commit").violations), ["G2"]);
  assert.deepEqual(rules(auditFixture("M03_sentenca_depois_do_commit").violations), ["G2"]);
});

test("M19 (A2) — START TRANSACTION/END não é a forma aceita → G2 com a dica BEGIN;/COMMIT;", () => {
  const r = auditFixture("M19_start_transaction");
  assert.deepEqual(rules(r.violations), ["G2"]);
  assert.match(r.violations[0].line, /START TRANSACTION/);
  assert.match(r.violations[0].line, /use BEGIN;\/COMMIT;/);
  // Cada ponta sozinha na forma errada também é G2 (o envoltório exige BEGIN E COMMIT, exatos).
  for (const sql of [
    'BEGIN; ALTER TABLE "t" ADD COLUMN "a" TEXT; ALTER TABLE "t" ADD COLUMN "b" TEXT; END;',
    'BEGIN WORK; ALTER TABLE "t" ADD COLUMN "a" TEXT; ALTER TABLE "t" ADD COLUMN "b" TEXT; COMMIT;',
    'BEGIN; ALTER TABLE "t" ADD COLUMN "a" TEXT; ALTER TABLE "t" ADD COLUMN "b" TEXT; COMMIT WORK;',
  ]) {
    const m = auditMigration({ name: CASO, sql, drillSources: DRILL_DO_CASO, anteriores: [] });
    assert.deepEqual(rules(m.violations), ["G2"], sql);
  }
});

test("M4 (A3) — controle de transação no meio → G2", () => {
  assert.deepEqual(rules(auditFixture("M04_controle_no_meio").violations), ["G2"]);
});

test("M5 (A4) — BEGIN dentro de $$ … $$ não conta: sem BEGIN de topo → G2; com ele → verde", () => {
  assert.deepEqual(rules(auditFixture("M05_begin_em_plpgsql").violations), ["G2"]);
  assert.deepEqual(rules(auditFixture("M05v_begin_em_plpgsql_com_transacao").violations), []);
});

test("M6 (A5) — ';' dentro de string e de comentário não divide: verde, n = 2", () => {
  const r = auditFixture("M06_ponto_e_virgula_em_string");
  assert.deepEqual(rules(r.violations), []);
  assert.equal(r.migrations[0].statements, 2);
});

test("M7 (A5) — BEGIN/COMMIT só em comentário não contam → G2", () => {
  assert.deepEqual(rules(auditFixture("M07_begin_so_em_comentario").violations), ["G2"]);
});

test("M8 (A6) — a 20260874 literal (29 sentenças, sem BEGIN): na lista → verde; fora da lista com carimbo antigo → G1", () => {
  const sql = realSql("20260874000000_traccar_ingestion_foundation");
  const naLista = auditMigration({
    name: "20260874000000_traccar_ingestion_foundation",
    sql,
    drillSources: [],
  });
  assert.deepEqual(rules(naLista.violations), []);
  const fora = auditMigration({ name: "20260874000000_x", sql, drillSources: [] });
  assert.ok(rules(fora.violations).includes("G1"), "carimbo antigo fora da lista é G1");
  assert.match(fora.violations.find((v: Violation) => v.rule === "G1").line, /carimbo antigo/);
  assert.equal(fora.statements, 29);
  // Isolado: conteúdo conforme sob carimbo antigo fora da lista → SÓ G1.
  const conforme = fs.readFileSync(path.join(FIXTURES, "M17_sem_drill", CASO, "migration.sql"), "utf8");
  const g1 = auditMigration({ name: "20260874000000_x", sql: conforme, drillSources: ['"20260874000000_x"'] });
  assert.deepEqual(rules(g1.violations), ["G1"]);
});

test("M9 (A7) — nova de 1 sentença sem BEGIN → verde, isenta de G2 e de G6", () => {
  assert.deepEqual(rules(auditFixture("M09_uma_sentenca", []).violations), []);
  // BEGIN/COMMIT em volta de UMA sentença é tolerado; controle fora da forma de envoltório, não.
  const um = 'ALTER TABLE "t" VALIDATE CONSTRAINT "c";';
  assert.deepEqual(rules(auditMigration({ name: CASO, sql: `BEGIN; ${um} COMMIT;`, anteriores: [] }).violations), []);
  assert.deepEqual(rules(auditMigration({ name: CASO, sql: `${um} COMMIT;`, anteriores: [] }).violations), ["G2"]);
});

test("M10 (A8) — exceção estrutural completa (sozinha, sem BEGIN, declarada) → verde", () => {
  const r = auditFixture("M10_concurrently_declarado", []);
  assert.deepEqual(rules(r.violations), []);
  assert.deepEqual(r.migrations[0].naoTransacional, ["CREATE INDEX CONCURRENTLY"]);
});

test("M11/M12 (A9) — exceção sem declaração, ou com motivo curto → G5", () => {
  assert.deepEqual(rules(auditFixture("M11_concurrently_sem_declaracao", []).violations), ["G5"]);
  assert.deepEqual(rules(auditFixture("M12_declaracao_curta", []).violations), ["G5"]);
});

test("M13 (A10) — DDL não transacional acompanhada → G3", () => {
  assert.deepEqual(rules(auditFixture("M13_concurrently_acompanhado", []).violations), ["G3"]);
});

test("M14 (A11) — DDL não transacional dentro de BEGIN/COMMIT → G4 (e não G3)", () => {
  assert.deepEqual(rules(auditFixture("M14_concurrently_em_transacao", []).violations), ["G4"]);
});

test("M15 (A12) — ALTER TYPE … ADD VALUE é não transacional; sem declaração → G5", () => {
  const r = auditFixture("M15_alter_type_add_value", []);
  assert.deepEqual(rules(r.violations), ["G5"]);
  assert.deepEqual(r.migrations[0].naoTransacional, ["ALTER TYPE ADD VALUE"]);
});

test("M16 (A13) — declaração como opt-out numa multi-sentença transacional sem BEGIN → G2 E G7", () => {
  assert.deepEqual(rules(auditFixture("M16_declaracao_como_opt_out").violations), ["G2", "G7"]);
});

test("M17 (A14) — nova multi-sentença com BEGIN/COMMIT: sem drill → G6; com drill que cita o nome → verde", () => {
  assert.deepEqual(rules(auditFixture("M17_sem_drill", []).violations), ["G6"]);
  assert.deepEqual(rules(auditFixture("M17_sem_drill", DRILL_DO_CASO).violations), []);
  // O drill tem de citar o nome INTEIRO, não só o carimbo.
  assert.deepEqual(rules(auditFixture("M17_sem_drill", ['"20260999000000"']).violations), ["G6"]);
});

test("M18 (A17) — diretório sem migration.sql → G0", () => {
  assert.deepEqual(rules(auditFixture("M18_sem_migration_sql").violations), ["G0"]);
});

test("R2 — CRLF não muda o veredito (a mesma fixture em CRLF dá o mesmo resultado)", () => {
  for (const [fixture, esperado] of [
    ["M06_ponto_e_virgula_em_string", []],
    ["M16_declaracao_como_opt_out", ["G2", "G7"]],
    ["M10_concurrently_declarado", []],
  ] as const) {
    const lf = fs.readFileSync(path.join(FIXTURES, fixture, CASO, "migration.sql"), "utf8").replace(/\r\n/g, "\n");
    const crlf = lf.replace(/\n/g, "\r\n");
    const r = auditMigration({ name: CASO, sql: crlf, drillSources: DRILL_DO_CASO, anteriores: [] });
    assert.deepEqual(rules(r.violations), [...esperado], fixture);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// O splitter e a constante (a base de todas as regras)
// ---------------------------------------------------------------------------------------------------------------

test("splitStatements — dollar-quote com tag, '' e E'\\'', identificador com ';', comentário aninhado", () => {
  const sql = [
    "DO $tag$ BEGIN PERFORM 1; END $tag$;",
    "SELECT 'a''; b';",
    "SELECT E'x\\'; y';",
    'ALTER TABLE "t;x" ADD COLUMN "c" TEXT;',
    "/* a /* b; */ c; */ SELECT 2",
  ].join("\n");
  const s = splitStatements(sql);
  assert.equal(s.length, 5);
  assert.equal(s[0].code, "DO $?$");
  assert.equal(s[4].code, "SELECT 2");
  // O BEGIN do corpo plpgsql nunca vira controle de transação.
  assert.ok(s.every((x: { code: string }) => x.code !== "BEGIN"));
});

test("DDL_NAO_TRANSACIONAL — cada item reconhece a sua forma e nenhum casa DDL transacional comum", () => {
  const casos: Record<string, string> = {
    "CREATE INDEX CONCURRENTLY": 'CREATE UNIQUE INDEX CONCURRENTLY "i" ON "t" ("a")',
    "DROP INDEX CONCURRENTLY": 'DROP INDEX CONCURRENTLY IF EXISTS "i"',
    "REINDEX CONCURRENTLY": 'REINDEX INDEX CONCURRENTLY "i"',
    "ALTER TYPE ADD VALUE": "ALTER TYPE \"e\" ADD VALUE IF NOT EXISTS 'x'",
    VACUUM: 'VACUUM ANALYZE "t"',
    "ALTER SYSTEM": "ALTER SYSTEM SET work_mem = '64MB'",
    "CREATE/DROP DATABASE": 'CREATE DATABASE "d"',
    "CREATE/DROP TABLESPACE": "DROP TABLESPACE ts",
    "DETACH PARTITION CONCURRENTLY": 'ALTER TABLE "t" DETACH PARTITION "p" CONCURRENTLY',
    "CREATE/DROP SUBSCRIPTION": "DROP SUBSCRIPTION s",
  };
  assert.deepEqual(
    DDL_NAO_TRANSACIONAL.map((d: { id: string }) => d.id).sort(),
    Object.keys(casos).sort(),
    "todo item da constante tem caso aqui",
  );
  for (const [id, sql] of Object.entries(casos)) {
    const [stmt] = splitStatements(`${sql};`);
    const hit = DDL_NAO_TRANSACIONAL.find((d: { re: RegExp }) => d.re.test(stmt.code));
    assert.equal(hit?.id, id, sql);
  }
  for (const sql of [
    'CREATE INDEX "i" ON "t" ("a")',
    'ALTER TABLE "t" ADD COLUMN "concurrently" TEXT',
    "COMMENT ON TABLE \"t\" IS 'CREATE INDEX CONCURRENTLY'",
    'DROP INDEX IF EXISTS "i"',
  ]) {
    const [stmt] = splitStatements(`${sql};`);
    assert.equal(DDL_NAO_TRANSACIONAL.find((d: { re: RegExp }) => d.re.test(stmt.code)), undefined, sql);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// (3) O CLI real
// ---------------------------------------------------------------------------------------------------------------

test("A16 — CLI em processo filho: fixture vermelha → exit 1 e uma linha G2; repositório → exit 0", () => {
  const red = spawnSync(process.execPath, [GUARD, path.join(FIXTURES, "M01_sem_begin")], { encoding: "utf8" });
  assert.equal(red.status, 1, red.stderr);
  const lines = red.stdout.trim().split(/\r?\n/);
  assert.equal(lines.filter((l) => /^G\d /.test(l)).length, 1);
  assert.match(lines[0], /^G2 20260878000000_invoice_complementary_title: /);
  assert.match(lines[lines.length - 1], /violações: 1$/);

  const green = spawnSync(process.execPath, [GUARD], { encoding: "utf8" });
  assert.equal(green.status, 0, green.stdout + green.stderr);
  assert.match(green.stdout, /anteriores: 112 · novas: \d+ · violações: 0/);
});
