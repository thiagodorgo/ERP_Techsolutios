import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

// -----------------------------------------------------------------------------------------------
// B-DB-FUSO-UTC — F4 · varreduras estáticas dos pontos de conexão.
//
// G1 (Emenda 3, E3.3: a PROPRIEDADE, não a forma) em src/scripts/prisma, o módulo `@prisma/adapter-pg` só é
//    referenciado em pg-connection.ts (exceção nomeada: gen-tenant-tables.mjs, só catálogo) — pelo ESPECIFICADOR do
//    módulo, em todo literal de string do código (import estático ou de tipo, export-from, import(), require(),
//    createRequire), nunca pelo nome do construtor nem em comentário; o texto `new PrismaPg(` segue só nos mesmos dois;
//    e nenhum setter de fuso em src/ (`SET TIME ZONE`, `SET timezone TO`, `SET timezone =`, com SESSION/LOCAL ou
//    não, e `set_config('TimeZone'`), sem diferença de caixa; e (J-554, C3-A1) nenhum import ou require do módulo
//    `pg` (o driver cru, `pg.Pool`/`pg.Client`) em src/ fora da lista fechada PG_MODULE_ALLOWED, que hoje é vazia.
// G2 cada ponto P1–P9 constrói pela fábrica (sem `new PrismaPg`).
// G3 catraca dos testes: ocorrências de `new PrismaPg(` fora de tests/helpers/ e fora dos testes deste bloco ≤ 217.
// G4 o arnês (P12) constrói pela fábrica (verde a partir da F5).
// -----------------------------------------------------------------------------------------------

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (/\.(ts|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// G1 lê todo arquivo de código (TS e JS, com as variantes m/c e x), não só `.ts`/`.mjs`.
const CODE_FILE = /\.(?:[cm]?[jt]s|[jt]sx)$/;

function collectCodeFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectCodeFiles(full, out);
    } else if (CODE_FILE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const ADAPTER_MODULE = "@prisma/adapter-pg";

// Todo literal de string do arquivo (a AST do TypeScript; comentário não é literal) cujo valor é o especificador do
// adapter ou um subcaminho dele. Pega o módulo por onde ele entrar: `import … from`, `import type`, `export … from`,
// `import()`, `require()`, `createRequire(…)(…)` e `import x = require()`, com ou sem alias no nome importado.
function adapterModuleReferences(file: string): number {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest);
  let count = 0;
  const visit = (node: ts.Node): void => {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      (node.text === ADAPTER_MODULE || node.text.startsWith(`${ADAPTER_MODULE}/`))
    ) {
      count += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return count;
}

// Setter do fuso da sessão, nas grafias do SQL do Postgres: `SET [SESSION|LOCAL] TIME ZONE …`,
// `SET [SESSION|LOCAL] timezone TO|= …` (também com o nome entre aspas) e `set_config('timezone', …)`.
const TIMEZONE_SETTER =
  /\bSET\s+(?:SESSION\s+|LOCAL\s+)?(?:TIME\s+ZONE\b|"?timezone"?\s*(?:=|\bTO\b))|\bset_config\s*\(\s*['"]timezone['"]/i;

// J-554, C3-A1: o driver `pg` cru em src/ abre sessão sem passar pela fábrica UTC (`new Pool({ options })` escolhe o
// fuso que quiser), e nenhum outro guard o via. O G1 acusa o módulo `pg` (e subcaminho `pg/…`) em toda posição de
// ESPECIFICADOR de módulo: `import … from`, `import type`, `export … from`, `import x = require()`, `import()`,
// `require()`, `require.resolve()`, `createRequire(…)(…)` e o tipo `import("pg")`. Só o especificador literal; o nome
// do construtor não importa, e comentário não é nó. Fora do alcance, declarado: especificador montado em tempo de
// execução (`require("p" + "g")`), que nenhuma varredura estática resolve.
const PG_MODULE = "pg";

// Lista FECHADA dos arquivos de src/ que podem referenciar o módulo `pg`, cada um com o motivo. Medida no objeto da
// J-554 (13/11, `git grep -nE "from ['\"]pg['\"]|require\(['\"]pg['\"]\)" -- src` → 0 linhas): src/ fala com o
// Postgres só pelo `@prisma/adapter-pg` da fábrica (que usa o `pg` por dentro). Entrada nova exige o motivo aqui e uma
// conexão que passe por `withUtcSessionTimezone` (src/database/pg-connection.ts).
const PG_MODULE_ALLOWED: ReadonlyArray<{ readonly file: string; readonly motivo: string }> = [];

function isPgModuleSpecifier(text: string): boolean {
  return text === PG_MODULE || text.startsWith(`${PG_MODULE}/`);
}

function isModuleLoaderCall(call: ts.CallExpression): boolean {
  const callee = call.expression;
  return (
    callee.kind === ts.SyntaxKind.ImportKeyword ||
    (ts.isIdentifier(callee) && callee.text === "require") ||
    (ts.isPropertyAccessExpression(callee) &&
      ts.isIdentifier(callee.expression) &&
      callee.expression.text === "require" &&
      callee.name.text === "resolve") ||
    ts.isCallExpression(callee)
  );
}

function pgModuleReferences(fileName: string, code: string): number {
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
  let count = 0;
  const hit = (node: ts.Node | undefined): void => {
    if (node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && isPgModuleSpecifier(node.text)) {
      count += 1;
    }
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      hit(node.moduleSpecifier);
    } else if (ts.isExternalModuleReference(node)) {
      hit(node.expression);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      hit(node.argument.literal);
    } else if (ts.isCallExpression(node) && isModuleLoaderCall(node)) {
      hit(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return count;
}

function rel(p: string): string {
  return path.relative(REPO_ROOT, p).split(path.sep).join("/");
}

function read(relPath: string): string {
  return readFileSync(path.join(REPO_ROOT, relPath), "utf8");
}

const P_FILES = [
  "src/database/prisma.ts",
  "src/integrations/traccar/traccar-db.ts",
  "prisma/seed.ts",
  "prisma/seed-users.ts",
  "prisma/seed-fleet.ts",
  "scripts/provision-rbac.ts",
  "scripts/bootstrap-platform-admin.ts",
  "scripts/san3-18-provisionar-modulos.ts",
  "scripts/backfill-third-party-vehicle-identity.ts",
];

const HARNESS_FILES = [
  "tests/helpers/auth-identity-fixture.ts",
  "tests/helpers/users-seg-desativado-sessao.ts",
];
test("G1 · o módulo `@prisma/adapter-pg` (e `new PrismaPg(`) em src/scripts/prisma só em pg-connection.ts (exceção: gen-tenant-tables.mjs); nenhum setter de fuso nem módulo `pg` cru em src/ (lista fechada)", () => {
  const roots = [path.join(REPO_ROOT, "src"), path.join(REPO_ROOT, "scripts"), path.join(REPO_ROOT, "prisma")];
  const moduleHits: string[] = [];
  const constructorHits: string[] = [];

  for (const root of roots) {
    for (const file of collectCodeFiles(root)) {
      if (adapterModuleReferences(file) > 0) {
        moduleHits.push(rel(file));
      }
      if (readFileSync(file, "utf8").includes("new PrismaPg(")) {
        constructorHits.push(rel(file));
      }
    }
  }

  // Os dois permitidos também são o controle do detector: o import estático de um `.ts` e o `import()` dinâmico de um
  // `.mjs` têm de ser vistos; se o detector quebrar, a lista sai vazia e o teste fica vermelho.
  const allowed = ["scripts/gen-tenant-tables.mjs", "src/database/pg-connection.ts"];
  assert.deepEqual(moduleHits.sort(), allowed, `módulo ${ADAPTER_MODULE} referenciado fora da fábrica`);
  assert.deepEqual(constructorHits.sort(), allowed, "`new PrismaPg(` fora da fábrica");

  const timezoneSetters: string[] = [];
  for (const file of collectCodeFiles(path.join(REPO_ROOT, "src"))) {
    if (TIMEZONE_SETTER.test(readFileSync(file, "utf8"))) {
      timezoneSetters.push(rel(file));
    }
  }

  assert.deepEqual(timezoneSetters, [], "setter do fuso da sessão em src/");

  const pgHits: string[] = [];
  for (const file of collectCodeFiles(path.join(REPO_ROOT, "src"))) {
    if (pgModuleReferences(file, readFileSync(file, "utf8")) > 0) {
      pgHits.push(rel(file));
    }
  }

  assert.deepEqual(
    pgHits.sort(),
    PG_MODULE_ALLOWED.map((entry) => entry.file).sort(),
    "módulo `pg` (driver cru) referenciado em src/ fora da lista fechada PG_MODULE_ALLOWED",
  );
});

test("G1 · controle do detector do módulo `pg`: toda forma de carregar o módulo é vista; outro módulo e comentário não", () => {
  for (const codigo of [
    'import { Pool } from "pg"; new Pool({ connectionString: "x" });',
    'import pg from "pg";',
    'import * as pg from "pg";',
    'import type { PoolConfig } from "pg";',
    'import "pg";',
    'export { Pool } from "pg";',
    'export * from "pg";',
    'import pg = require("pg");',
    'const { Client } = require("pg");',
    "const { Client } = require(`pg`);",
    'const resolved = require.resolve("pg");',
    'const mod = await import("pg");',
    'const utils = await import("pg/lib/utils.js");',
    'import { createRequire } from "node:module"; const { Pool } = createRequire(import.meta.url)("pg");',
    'type Config = import("pg").PoolConfig;',
  ]) {
    assert.equal(pgModuleReferences("controle.ts", codigo), 1, codigo);
  }

  for (const codigo of [
    'import { PrismaPg } from "@prisma/adapter-pg";',
    'import { parse } from "pg-connection-string";',
    'import x from "pgvector";',
    'import y from "./pg.js";',
    '// import { Pool } from "pg";',
    '/* const { Client } = require("pg"); */',
    'const driver = "pg";',
    'log("pg");',
  ]) {
    assert.equal(pgModuleReferences("controle.ts", codigo), 0, codigo);
  }
});

test("G1 · controle do detector de setter de fuso: cada grafia é vista, sem diferença de caixa; leitura não é setter", () => {
  for (const setter of [
    "SET TIME ZONE 'America/Sao_Paulo'",
    "set time zone 'America/Sao_Paulo'",
    "SET timezone TO 'America/Sao_Paulo'",
    "SET TimeZone TO 'America/Sao_Paulo'",
    "SET timezone = 'America/Sao_Paulo'",
    "SET timezone='America/Sao_Paulo'",
    "SET SESSION timezone TO 'America/Sao_Paulo'",
    "SET LOCAL TIME ZONE 'America/Sao_Paulo'",
    "SET \"TimeZone\" TO 'America/Sao_Paulo'",
    "SELECT set_config('TimeZone', 'America/Sao_Paulo', false)",
    "SELECT set_config('timezone', 'America/Sao_Paulo', true)",
  ]) {
    assert.match(setter, TIMEZONE_SETTER, setter);
  }

  for (const leitura of [
    "SELECT current_setting('TimeZone') AS tz",
    "SHOW timezone",
    "RESET timezone",
    "-c TimeZone=UTC",
  ]) {
    assert.doesNotMatch(leitura, TIMEZONE_SETTER, leitura);
  }
});

test("G2 · P1–P9 constroem pela fábrica", () => {
  for (const relPath of P_FILES) {
    const content = read(relPath);

    assert.ok(!content.includes("new PrismaPg("), `${relPath} não deve usar new PrismaPg(`);
    assert.ok(
      content.includes("createPgAdapter") || content.includes("createPrismaClient"),
      `${relPath} deve referenciar a fábrica`,
    );
  }
});

test("G3 · catraca: ocorrências de `new PrismaPg(` fora de tests/helpers/ e fora dos testes deste bloco ≤ 217", () => {
  const testsDir = path.join(REPO_ROOT, "tests");
  let occurrences = 0;

  for (const file of collectFiles(testsDir)) {
    const relPath = rel(file);

    if (relPath.startsWith("tests/helpers/")) continue;
    if (path.basename(file).startsWith("db-fuso-utc-")) continue;

    const content = readFileSync(file, "utf8");
    occurrences += content.match(/new PrismaPg\(/g)?.length ?? 0;
  }

  assert.ok(occurrences <= 217, `catraca cresceu: ${occurrences} ocorrências (máximo 217)`);
});

test("G4 · o arnês (P12) constrói pela fábrica", () => {
  for (const relPath of HARNESS_FILES) {
    const content = read(relPath);

    assert.ok(!/new PrismaPg\(/.test(content), `${relPath} não deve conter new PrismaPg(`);
    assert.ok(
      content.includes("createPrismaClient") || content.includes("createPgAdapter"),
      `${relPath} deve referenciar a fábrica`,
    );
  }
});
