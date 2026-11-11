import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

test("A12/G2 — APIs JWT e exceção da sessão restrita ficam nos pontos fechados", () => {
  const files = sourceFiles(SRC);
  const joseImporters = new Set<string>();
  const signImporters = new Set<string>();
  const verifyImporters = new Set<string>();

  for (const file of files) {
    const relative = slash(path.relative(ROOT, file));
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);

    source.forEachChild((node) => {
      if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return;
      const moduleName = node.moduleSpecifier.text;
      if (moduleName === "jose") joseImporters.add(relative);
      if (!moduleName.endsWith("jwt.service.js") && !moduleName.endsWith("auth/index.js")) return;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        signImporters.add(relative);
        verifyImporters.add(relative);
      }
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const imported = element.propertyName?.text ?? element.name.text;
          if (imported === "signAccessToken") signImporters.add(relative);
          if (imported === "verifyAccessToken") verifyImporters.add(relative);
        }
      }
    });
  }

  assert.deepEqual([...joseImporters].sort(), [
    "src/modules/auth/services/jwt.service.ts",
    "src/modules/portal-shared/portal-session.ts",
  ]);
  assert.deepEqual([...signImporters].sort(), [
    "src/modules/auth/routes/auth.routes.ts",
    "src/modules/auth/services/auth-session.service.ts",
  ]);
  assert.deepEqual([...verifyImporters].sort(), [
    "src/modules/auth/middleware/authenticated-actor.middleware.ts",
  ]);

  const all = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.equal((all.match(/acceptPasswordChangeSession\s*:\s*true/g) ?? []).length, 1);
  const middleware = readFileSync(
    path.join(SRC, "modules/auth/middleware/authenticated-actor.middleware.ts"),
    "utf8",
  );
  assert.doesNotMatch(middleware, /@prisma\/client|database\/prisma|Repository/);
});

function sourceFiles(root: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".ts")) found.push(target);
  }
  return found;
}

function slash(value: string): string {
  return value.replaceAll("\\", "/");
}
