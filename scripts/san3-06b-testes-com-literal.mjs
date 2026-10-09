#!/usr/bin/env node
// B-SAN3-06b — testes de frontend que asseveram literal de tela da plataforma.
import { readFileSync, readdirSync } from "node:fs";
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
const testDirectory = path.join(repo, "frontend/tests");
const files = readdirSync(testDirectory)
  .filter((file) => /\.test\.tsx?$/.test(file))
  .map((file) => path.join(testDirectory, file));
const PLATFORM =
  /modules\/platform\/|navigation\/platformNavigation|Platform[A-Za-z]+Page|platformNavigation/;
const LITERAL =
  /\/(R\\\$|\d[\d.,]*|Tenant|Techsolutions Industrial|Minas Norte|AgroMax|Logística Delta|Field Operations LATAM)/;
const output = [];
for (const file of files) {
  const relativePath = path.relative(repo, file).replace(/\\/g, "/");
  const source = ts.createSourceFile(
    relativePath,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const line = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  (function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "test" &&
      node.arguments.length >= 2
    ) {
      const body = node.arguments[1].getText(source);
      if (PLATFORM.test(body)) {
        const assertions = [
          ...body.matchAll(/assert\.(match|doesNotMatch|equal|ok)\(([^\n]*)\)/g),
        ];
        const literals = assertions
          .filter((match) => LITERAL.test(match[2]) && match[1] !== "doesNotMatch")
          .map((match) => match[0].slice(0, 90));
        output.push({
          relativePath,
          line: line(node),
          name: node.arguments[0].getText(source).slice(0, 80),
          touches: [
            ...new Set(body.match(new RegExp(PLATFORM.source, "g")) ?? []),
          ]
            .slice(0, 4)
            .join(","),
          literals,
        });
      }
    }
    ts.forEachChild(node, visit);
  })(source);
}
console.log(
  `# arquivos de teste = ${files.length} · testes que tocam a fronteira = ${output.length} · com asserção de literal (match/equal) = ${output.filter((item) => item.literals.length).length}`,
);
for (const item of output) {
  console.log(
    `${item.relativePath}:${item.line} | ${item.name} | toca: ${item.touches} | literal: ${item.literals.length ? item.literals.join(" ;; ") : "—"}`,
  );
}
