#!/usr/bin/env node
// B-SAN3-06b — censo AST de dados fabricados nas telas do console de plataforma.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const repo = path.resolve(process.argv[2] ?? ".");
const directory = process.argv[3] ?? "frontend/src/modules/platform";
const ts = (() => {
  for (const packageJson of ["frontend/package.json", "package.json"]) {
    try {
      return createRequire(path.join(repo, packageJson))("typescript");
    } catch {}
  }
  throw new Error("typescript não resolvido em frontend/ nem na raiz");
})();
function walk(current, output = []) {
  for (const entry of readdirSync(current)) {
    const file = path.join(current, entry);
    statSync(file).isDirectory() ? walk(file, output) : output.push(file);
  }
  return output;
}
const files = walk(path.resolve(repo, directory)).filter(
  (file) =>
    /\.(tsx|ts)$/.test(file) &&
    !/\.d\.ts$/.test(file) &&
    !/\.mock\.ts$/.test(file) &&
    !/\.types\.ts$/.test(file),
);
const NUMBER =
  /^\s*[+\-−]?\s*(R\$\s*)?\d[\d.,]*\s*(k|%|dias?|h|min|GB|TB|ms)?\s*(\/\s*(mês|org|\d+))?\s*$/i;
const DATED =
  /\b\d{1,2}\/\d{2}(\s+\d{2}:\d{2})?\b|\b(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+\d{4}\b|\bhá \d+ (min|h|dias?)\b/;
const rows = [];
for (const file of files) {
  const relativePath = path.relative(repo, file).replace(/\\/g, "/");
  const sourceText = readFileSync(file, "utf8");
  const source = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const line = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const arrays = new Map();
  const used = new Set();
  function visit(node) {
    if (ts.isVariableStatement(node) && node.parent === source) {
      for (const declaration of node.declarationList.declarations) {
        if (
          declaration.initializer &&
          ts.isArrayLiteralExpression(declaration.initializer) &&
          declaration.initializer.elements.some(ts.isObjectLiteralExpression)
        ) {
          let domain = false;
          for (const element of declaration.initializer.elements) {
            if (!ts.isObjectLiteralExpression(element)) continue;
            for (const property of element.properties) {
              if (!ts.isPropertyAssignment(property)) continue;
              const value = property.initializer;
              if (ts.isNumericLiteral(value)) domain = true;
              if (
                value.kind === ts.SyntaxKind.TrueKeyword ||
                value.kind === ts.SyntaxKind.FalseKeyword
              ) {
                domain = true;
              }
              if (ts.isStringLiteral(value) && /\d|R\$/.test(value.text)) domain = true;
            }
          }
          arrays.set(declaration.name.getText(source), {
            line: line(declaration),
            domain,
            count: declaration.initializer.elements.length,
          });
        }
      }
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === "map" &&
      ts.isIdentifier(node.expression)
    ) {
      used.add(node.expression.text);
    }
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression)) {
      used.add(node.expression.text);
    }
    if (ts.isJsxText(node)) {
      const value = node.getText(source).trim();
      if (value && NUMBER.test(value)) {
        rows.push({ relativePath, line: line(node), class: "JSX-NUMERO", what: JSON.stringify(value) });
      } else if (value && DATED.test(value)) {
        rows.push({ relativePath, line: line(node), class: "TEXTO-DATADO", what: JSON.stringify(value.slice(0, 60)) });
      }
    }
    if (ts.isJsxExpression(node) && node.expression && ts.isStringLiteral(node.expression)) {
      const value = node.expression.text.trim();
      if (NUMBER.test(value)) {
        rows.push({ relativePath, line: line(node), class: "JSX-NUMERO", what: JSON.stringify(value) });
      } else if (DATED.test(value)) {
        rows.push({ relativePath, line: line(node), class: "TEXTO-DATADO", what: JSON.stringify(value.slice(0, 60)) });
      }
    }
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const value = node.initializer.text.trim();
      const name = node.name.getText(source);
      if (
        !/^(style|className|key|id|width|height|size|viewBox|d|stroke|fill|strokeWidth|strokeLinecap|strokeLinejoin|x1|x2|y1|y2|initialEntries|to|path|href|title|aria-label|type)$/.test(
          name,
        )
      ) {
        if (NUMBER.test(value)) {
          rows.push({ relativePath, line: line(node), class: "JSX-NUMERO", what: `${name}=${JSON.stringify(value)}` });
        } else if (DATED.test(value)) {
          rows.push({ relativePath, line: line(node), class: "TEXTO-DATADO", what: `${name}=${JSON.stringify(value.slice(0, 60))}` });
        }
      }
    }
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      /^(Toggle|Switch|Checkbox|Radio)$/.test(node.tagName.getText(source))
    ) {
      for (const attribute of node.attributes.properties) {
        if (
          ts.isJsxAttribute(attribute) &&
          /^(on|checked|active|enabled|value)$/.test(attribute.name.getText(source)) &&
          (!attribute.initializer ||
            (ts.isJsxExpression(attribute.initializer) &&
              attribute.initializer.expression &&
              /^(true|false)$/.test(attribute.initializer.expression.getText(source))))
        ) {
          rows.push({
            relativePath,
            line: line(node),
            class: "CONTROLE-BOOL",
            what: `<${node.tagName.getText(source)} ${attribute.getText(source)}>`,
          });
        }
      }
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "readFrontendEnv" &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text === "VITE_USE_MOCKS"
    ) {
      rows.push({
        relativePath,
        line: line(node),
        class: "MOCK-DEFAULT",
        what: node.getText(source),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const [name, info] of arrays) {
    if (info.domain && used.has(name)) {
      rows.push({
        relativePath,
        line: info.line,
        class: "ARRAY-LITERAL",
        what: `${name}[${info.count}] consumido em JSX`,
      });
    }
    if (relativePath.endsWith(".tsx") && info.domain && !used.has(name)) {
      rows.push({
        relativePath,
        line: info.line,
        class: "ARRAY-LITERAL?",
        what: `${name}[${info.count}] de domínio, sem .map/[] achado (conferir)`,
      });
    }
  }
}
rows.sort((left, right) =>
  left.relativePath.localeCompare(right.relativePath) || left.line - right.line,
);
const byFile = {};
for (const row of rows) byFile[row.relativePath] = (byFile[row.relativePath] ?? 0) + 1;
const byClass = rows.reduce((counts, row) => {
  counts[row.class] = (counts[row.class] ?? 0) + 1;
  return counts;
}, {});
console.log(
  `# arquivos varridos = ${files.length} · sítios = ${rows.length} · por classe = ${JSON.stringify(byClass)}`,
);
console.log(`# por arquivo = ${JSON.stringify(byFile)}`);
for (const row of rows) {
  console.log(`${row.relativePath}:${row.line} | ${row.class} | ${row.what}`);
}
