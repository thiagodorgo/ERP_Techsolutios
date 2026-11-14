import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

function canonical(target: string): string {
  return path.normalize(target).replaceAll("\\", "/");
}

const SRC_ROOT = canonical(path.resolve(fileURLToPath(new URL("../src", import.meta.url))));
const TITLES_ROOT = canonical(path.join(SRC_ROOT, "modules", "finance", "titles"));
const LEGACY_REMOVALS = new Set([
  canonical(path.join(SRC_ROOT, "modules", "finance", "pages", "ChargesPage.tsx")),
  canonical(path.join(SRC_ROOT, "modules", "finance", "pages", "PaymentsPage.tsx")),
  canonical(path.join(TITLES_ROOT, "components", "TitlesListView.tsx")),
]);

type ExportNode = {
  readonly key: string;
  readonly name: string;
  readonly file: string;
  readonly node: ts.Node;
};

function sourceFilesAt(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFilesAt(target);
    return /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [canonical(target)] : [];
  });
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function exportNodes(sourceFile: ts.SourceFile): ExportNode[] {
  return sourceFile.statements.flatMap((statement): ExportNode[] => {
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      return statement.exportClause.elements.map((element) => ({
        key: `${sourceFile.fileName}#${element.name.text}`,
        name: element.name.text,
        file: sourceFile.fileName,
        node: element,
      }));
    }
    if (!hasExportModifier(statement)) return [];
    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      return statement.name
        ? [{ key: `${sourceFile.fileName}#${statement.name.text}`, name: statement.name.text, file: sourceFile.fileName, node: statement }]
        : [];
    }
    if (ts.isVariableStatement(statement)) {
      return statement.declarationList.declarations.flatMap((declaration) =>
        ts.isIdentifier(declaration.name)
          ? [{ key: `${sourceFile.fileName}#${declaration.name.text}`, name: declaration.name.text, file: sourceFile.fileName, node: declaration }]
          : [],
      );
    }
    return [];
  });
}

function resolveRelativeImport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return canonical(candidate);
  }
  return null;
}

function namedImports(sourceFile: ts.SourceFile): Map<string, string> {
  const imports = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const target = resolveRelativeImport(sourceFile.fileName, statement.moduleSpecifier.text);
    const bindings = statement.importClause?.namedBindings;
    if (!target || !bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      imports.set(element.name.text, `${target}#${element.propertyName?.text ?? element.name.text}`);
    }
  }
  return imports;
}

function importedTitleExports(sourceFile: ts.SourceFile, exportsByFile: ReadonlyMap<string, readonly ExportNode[]>): string[] {
  const found: string[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const target = resolveRelativeImport(sourceFile.fileName, statement.moduleSpecifier.text);
    if (!target || !target.startsWith(TITLES_ROOT)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings) continue;
    if (ts.isNamespaceImport(bindings)) {
      found.push(...(exportsByFile.get(target) ?? []).map((item) => item.key));
      continue;
    }
    for (const element of bindings.elements) found.push(`${target}#${element.propertyName?.text ?? element.name.text}`);
  }
  return found;
}

function identifiersWithin(node: ts.Node): string[] {
  const names: string[] = [];
  const visit = (current: ts.Node) => {
    if (ts.isIdentifier(current)) names.push(current.text);
    ts.forEachChild(current, visit);
  };
  visit(node);
  return names;
}

test("D3: cada export de titles tem uso vivo fora do próprio arquivo", () => {
  const allFiles = sourceFilesAt(SRC_ROOT);
  const parsed = new Map(
    allFiles.map((file) => [
      file,
      ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS),
    ]),
  );
  const titleExports = [...parsed.values()].filter((sourceFile) => sourceFile.fileName.startsWith(TITLES_ROOT)).flatMap(exportNodes);
  assert.ok(titleExports.length > 0, `nenhum export encontrado sob ${TITLES_ROOT}`);
  const exportsByFile = new Map<string, ExportNode[]>();
  for (const item of titleExports) exportsByFile.set(item.file, [...(exportsByFile.get(item.file) ?? []), item]);

  const live = new Set<string>();
  for (const sourceFile of parsed.values()) {
    if (sourceFile.fileName.startsWith(TITLES_ROOT) || LEGACY_REMOVALS.has(sourceFile.fileName)) continue;
    for (const key of importedTitleExports(sourceFile, exportsByFile)) live.add(key);
  }

  const dependencies = new Map<string, Set<string>>();
  for (const item of titleExports) {
    const imports = namedImports(parsed.get(item.file)!);
    const sameFileExports = new Map((exportsByFile.get(item.file) ?? []).map((candidate) => [candidate.name, candidate.key]));
    const used = new Set<string>();
    for (const identifier of identifiersWithin(item.node)) {
      const target = imports.get(identifier) ?? sameFileExports.get(identifier);
      if (target && target !== item.key) used.add(target);
    }
    dependencies.set(item.key, used);
  }

  const pending = [...live];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const dependency of dependencies.get(current) ?? []) {
      if (!live.has(dependency)) {
        live.add(dependency);
        pending.push(dependency);
      }
    }
  }

  const orphans = titleExports
    .filter((item) => !live.has(item.key))
    .map((item) => `${path.relative(SRC_ROOT, item.file).replaceAll("\\", "/")}::${item.name}`)
    .sort();

  assert.deepEqual(orphans, [], `exports órfãos:\n${orphans.map((item) => `- ${item}`).join("\n")}`);
});
