#!/usr/bin/env node
// B-SAN3-06b — inventário AST de endpoints reais sob /api/v1/platform.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const repo = path.resolve(process.argv[2] ?? ".");
const ts = (() => {
  for (const packageJson of ["frontend/package.json", "package.json"]) {
    try {
      return createRequire(path.join(repo, packageJson))("typescript");
    } catch {}
  }
  throw new Error("typescript não resolvido em frontend/ nem na raiz");
})();
const load = (relativePath) => ({
  relativePath,
  source: ts.createSourceFile(
    relativePath,
    readFileSync(path.join(repo, relativePath), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  ),
});
const stringValue = (node) =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : null;

const app = load("src/app.ts");
let mount = null;
(function visit(node) {
  if (
    ts.isCallExpression(node) &&
    node.expression.getText(app.source) === "app.use" &&
    stringValue(node.arguments[0]) === "/api/v1/platform"
  ) {
    mount = {
      prefix: "/api/v1/platform",
      line: app.source.getLineAndCharacterOfPosition(node.getStart(app.source)).line + 1,
      arguments: node.arguments.map((argument) => argument.getText(app.source)),
    };
  }
  ts.forEachChild(node, visit);
})(app.source);
if (!mount) throw new Error("montagem /api/v1/platform não encontrada em src/app.ts");
console.log(`# montagem: app.ts:${mount.line} ${mount.arguments.join(", ")}`);

function importsOf(file) {
  const imports = new Map();
  for (const statement of file.source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      for (const element of statement.importClause.namedBindings.elements) {
        imports.set(element.name.text, statement.moduleSpecifier.text);
      }
    }
  }
  return imports;
}
const rows = [];
function scanRouter(relativePath, prefix) {
  const file = load(relativePath);
  const imports = importsOf(file);
  (function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(file.source) === "router"
    ) {
      const verb = node.expression.name.text;
      if (verb === "use") {
        const [first, second] = node.arguments;
        const subrouter = second ?? first;
        const subprefix = second ? stringValue(first) : "";
        const functionName = ts.isCallExpression(subrouter)
          ? subrouter.expression.getText(file.source)
          : null;
        const specifier = functionName && imports.get(functionName);
        if (specifier) {
          const target = path.posix.normalize(
            path.posix.join(
              path.posix.dirname(relativePath),
              specifier.replace(/\.js$/, ".ts"),
            ),
          );
          scanRouter(target, prefix + (subprefix ?? ""));
        }
      } else if (["get", "post", "patch", "put", "delete"].includes(verb)) {
        const routePath = stringValue(node.arguments[0]);
        const permission =
          node.arguments
            .slice(1)
            .map((argument) => argument.getText(file.source))
            .map(
              (value) =>
                (value.match(/requirePlatformPermission\("([^"]+)"\)/) ?? [])[1],
            )
            .find(Boolean) ?? "SEM requirePlatformPermission";
        rows.push({
          verb: verb.toUpperCase(),
          path: path.posix.normalize(prefix + routePath),
          permission,
          location: `${relativePath}:${file.source.getLineAndCharacterOfPosition(node.getStart(file.source)).line + 1}`,
        });
      }
    }
    ts.forEachChild(node, visit);
  })(file.source);
}
scanRouter("src/modules/platform/platform.routes.ts", mount.prefix);
console.log(`# endpoints sob ${mount.prefix} = ${rows.length}`);
for (const row of rows) {
  console.log(
    `${row.verb.padEnd(6)} ${row.path.padEnd(70)} | ${row.permission.padEnd(40)} | ${row.location}`,
  );
}
