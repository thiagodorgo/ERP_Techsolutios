import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

// -----------------------------------------------------------------------------------------------
// B-ASS-09 · F8 — R-REG-1 do plano v2 (D-1, P12): o cálculo de custo + markup que o `B-ASS-01` (#498) retirou continua
// INALCANÇÁVEL. O código de `src/modules/cloud-charges/**` fica congelado no repositório (sem bloco de remoção), mas nenhum
// ponto de entrada do processo chega a ele.
//
// Pontos de entrada: todo `src/*.ts` de topo (`app.ts`, `server.ts`, …) e `src/infra/jobs/job-worker.bootstrap.ts`. A partir
// deles o teste segue, arquivo a arquivo, todo `import`/`export … from` estático, todo `import "x"` e todo `import("x")`
// dinâmico com especificador literal (`ts.preProcessFile`), resolvendo `./x.js` para `./x.ts` (ou `./x/index.ts`). `import
// type` também conta: é mais estrito, e falha fechado.
//
// Fail-closed: um `import()` cujo especificador NÃO é literal não pode ser seguido; o teste o acusa em vez de supor que não
// alcança nada. O controle positivo prova que o mesmo caminhador ENXERGA `cloud-charges` quando parte de lá.
//
// MUTAÇÃO QUE MATA (M-REG-1, vermelho-controle real): recolocar em `src/modules/platform/platform.routes.ts` a linha de
// `0f2bfb73^:6`, `import { createCloudChargesPlatformRouter } from "../cloud-charges/cloud-charge.routes.js";`.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const FROZEN = path.join(SRC, "modules", "cloud-charges") + path.sep;

const rel = (file: string): string => path.relative(ROOT, file).replace(/\\/g, "/");

function entryPoints(): string[] {
  const topLevel = readdirSync(SRC)
    .filter((name) => name.endsWith(".ts") && statSync(path.join(SRC, name)).isFile())
    .map((name) => path.join(SRC, name));
  return [...topLevel, path.join(SRC, "infra", "jobs", "job-worker.bootstrap.ts")];
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null; // pacote: fora de `src/`
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base.replace(/\.js$/, ".ts"),
    base.replace(/\.js$/, ".tsx"),
    base,
    `${base}.ts`,
    path.join(base, "index.ts"),
  ];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

/** `import(<expressão>)` que não é string literal: o caminhador não sabe aonde ele leva. */
function nonLiteralDynamicImports(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (!arg || !(ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        found.push(`${rel(file)}:${line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

type Walk = { reached: Set<string>; unresolved: string[]; opaque: string[] };

function walk(starts: readonly string[]): Walk {
  const reached = new Set<string>();
  const unresolved: string[] = [];
  const opaque: string[] = [];
  const queue = [...starts];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (reached.has(file)) continue;
    reached.add(file);
    const text = readFileSync(file, "utf8");
    opaque.push(...nonLiteralDynamicImports(file, text));
    for (const imported of ts.preProcessFile(text, true, true).importedFiles) {
      if (!imported.fileName.startsWith(".")) continue;
      const target = resolveSpecifier(file, imported.fileName);
      if (target === null) {
        unresolved.push(`${rel(file)} → ${imported.fileName}`);
        continue;
      }
      if (!reached.has(target)) queue.push(target);
    }
  }
  return { reached, unresolved, opaque };
}

test("R-REG-1 · nenhum módulo de src/modules/cloud-charges/ é alcançável a partir dos pontos de entrada", () => {
  const starts = entryPoints();
  assert.ok(starts.some((file) => rel(file) === "src/app.ts"), "o app é ponto de entrada");
  assert.ok(starts.some((file) => rel(file) === "src/server.ts"), "o servidor é ponto de entrada");
  assert.ok(existsSync(starts[starts.length - 1]!), "o bootstrap do worker existe");

  const { reached, unresolved, opaque } = walk(starts);
  assert.ok(reached.size > 200, `o caminhador percorreu o app (${reached.size} arquivos)`);
  assert.ok(
    [...reached].some((file) => rel(file) === "src/modules/platform/platform.routes.ts"),
    "o router de plataforma, onde o markup morava, é alcançado",
  );
  assert.deepEqual(unresolved, [], "todo import relativo resolve para um arquivo (o que não resolve não pode ser julgado)");
  assert.deepEqual(opaque, [], "import() com especificador não literal não pode ser seguido: falha fechado");

  const frozen = [...reached].filter((file) => file.startsWith(FROZEN)).map(rel).sort();
  assert.deepEqual(frozen, [], "o cálculo de custo + markup voltou a ser alcançável");
});

test("R-REG-1 (controle) · o mesmo caminhador enxerga cloud-charges quando parte de lá", () => {
  const { reached } = walk([path.join(FROZEN, "index.ts")]);
  const frozen = [...reached].filter((file) => file.startsWith(FROZEN)).map(rel);
  assert.ok(frozen.includes("src/modules/cloud-charges/cloud-charge.engine.ts"), "o motor do markup é visto pelo caminhador");
  assert.ok(frozen.length >= 5, `módulos de cloud-charges vistos: ${frozen.length}`);
});
