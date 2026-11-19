import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const ROOT = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const TESTS_ROOT = path.join(ROOT, "tests");

const EXPECTED_CREATORS = new Map<string, { readonly count: number; readonly classification: string }>([
  ["tests/helpers/child-server.ts", { count: 2, classification: "helper gerenciado: spawn do servidor + taskkill da árvore" }],
  ["tests/avreal-privacy.test.ts", { count: 1, classification: "one-shot: cliente do scanner encerra por process.exit(0)" }],
  ["tests/expense-sync-atomic-db.test.ts", { count: 1, classification: "one-shot: comando de reinício com timeout e close" }],
  ["tests/helpers/o6r07c-census.ts", { count: 1, classification: "one-shot: execFile com timeout nativo" }],
  ["tests/helpers/wo-leitura-census.ts", { count: 1, classification: "one-shot: execFile com timeout nativo" }],
  ["tests/san3-05-runtime-role-guard-db.test.ts", { count: 1, classification: "one-shot: executor de comandos de catálogo com timeout" }],
]);

const A_605_04 = {
  file: "tests/b-o6r-09-dispatch-same-tx-db.test.ts",
  reason: "A-605-04: promisify(execFile) executa prisma migrate deploy one-shot, com timeout; não sobe servidor",
} as const;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return entry.isFile() && /\.[cm]?[jt]s$/.test(entry.name) ? [absolute] : [];
  });
}

function directChildCreators(file: string): number {
  const sourceText = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  const creatorNames = new Set<string>();

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.getText(source).replaceAll(/["']/g, "") !== "node:child_process") continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      if (imported === "spawn" || imported === "fork" || imported === "execFile") creatorNames.add(element.name.text);
    }
  }

  let count = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && creatorNames.has(node.expression.text)) count += 1;
    ts.forEachChild(node, visit);
  };
  visit(source);
  return count;
}

test("todo processo-filho servidor em tests/** nasce pelo helper que sempre mata a árvore", () => {
  const actual = new Map<string, number>();
  for (const file of sourceFiles(TESTS_ROOT)) {
    const count = directChildCreators(file);
    if (count > 0) actual.set(path.relative(ROOT, file).replaceAll("\\", "/"), count);
  }

  assert.deepEqual(
    [...actual].sort(([left], [right]) => left.localeCompare(right)),
    [...EXPECTED_CREATORS].map(([file, entry]) => [file, entry.count] as [string, number]).sort(([left], [right]) => left.localeCompare(right)),
    "criador de processo-filho novo ou alterado: classifique-o; servidor deve usar tests/helpers/child-server.ts",
  );

  const migrationSource = readFileSync(path.join(ROOT, A_605_04.file), "utf8");
  assert.match(migrationSource, /promisify\(execFile\)/, A_605_04.reason);
  assert.match(migrationSource, /promisify\(execFile\)\(process\.execPath, \[prismaCli, "migrate", "deploy"\]/, A_605_04.reason);
  assert.match(migrationSource, /timeout:\s*840_000/, A_605_04.reason);
});
