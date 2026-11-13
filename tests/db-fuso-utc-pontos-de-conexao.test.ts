import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------------------------
// B-DB-FUSO-UTC — F4 · varreduras estáticas dos pontos de conexão.
//
// G1 `new PrismaPg(` em src/scripts/prisma só em pg-connection.ts (exceção nomeada: gen-tenant-tables.mjs);
//    nenhum `SET TIME ZONE`/`set_config('TimeZone'` em src/.
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
test("G1 · `new PrismaPg(` em src/scripts/prisma só em pg-connection.ts (exceção: gen-tenant-tables.mjs); sem SET TIME ZONE em src/", () => {
  const roots = [path.join(REPO_ROOT, "src"), path.join(REPO_ROOT, "scripts"), path.join(REPO_ROOT, "prisma")];
  const hits: string[] = [];

  for (const root of roots) {
    for (const file of collectFiles(root)) {
      if (readFileSync(file, "utf8").includes("new PrismaPg(")) {
        hits.push(rel(file));
      }
    }
  }

  assert.deepEqual(hits.sort(), ["scripts/gen-tenant-tables.mjs", "src/database/pg-connection.ts"]);

  const timezoneSetters: string[] = [];
  for (const file of collectFiles(path.join(REPO_ROOT, "src"))) {
    const content = readFileSync(file, "utf8");
    if (/SET TIME ZONE|set_config\s*\(\s*['"]TimeZone/i.test(content)) {
      timezoneSetters.push(rel(file));
    }
  }

  assert.deepEqual(timezoneSetters, []);
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
