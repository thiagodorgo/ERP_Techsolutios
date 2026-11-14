import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import ts from "typescript";

// -----------------------------------------------------------------------------------------------
// B-SAN3-17 — G-B (CE-G1): quem escreve e quem lê posição ao vivo fora do módulo `field-location`.
// Claude, sem cruzamento, declarado (§C7 11(2), ordem do dono de 13/11).
//
// Lei: plano v1 §3 (G-B (a)–(c), mantido no v2) + abertura E2.3 (caso (d)) + Emenda 1 da abertura 2.2 (o (d)
// reescrito: dois chamadores, cada um com UM método).
//
//   (a) todo arquivo de `src/**` FORA de `src/modules/field-location/` que importa o repositório de posição
//       (`field-location.repository` ou `field-location-prisma.repository`), por `import`, `export … from` ou
//       `import()` literal, é exatamente {traccar-ingestion.service.ts} (D6 do Traccar, nominal);
//   (b) arquivo novo nesse conjunto = vermelho (a lista é fechada: o padrão é negar);
//   (c) `field-location.service.ts` tem exatamente 1 chamada `this.repository.record(` — o portão da rota móvel
//       (B2) é a única porta de gravação do app;
//   (d) fora do módulo, `createDefaultFieldLocationService` só aparece em `work-order.service.ts`, e ali só com
//       `latestLiveForOperator`; e em `mobile-evidence-sync.ts`, e ali só com `hasOwnTrackingConsent`. Chamador
//       novo, método diferente, ou um uso que o leitor não reconhece = vermelho (falha fechada).
//
// A leitura é pela AST do compilador TypeScript (sem regex sobre o texto, que contaria comentário e string).
// Na base `d2737339`, (a)–(c) ficam verdes (valem pela MB7) e o (d) fica vermelho: o detalhe da OS ainda chama
// `listHistory` e a evidência ainda não chama nada.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const MODULE_DIR = path.join(SRC, "modules", "field-location") + path.sep;
const REPOSITORY_SPECIFIER = /(^|\/)field-location(-prisma)?\.repository(\.js|\.ts)?$/;

const EXPECTED_REPOSITORY_IMPORTERS = ["src/integrations/traccar/traccar-ingestion.service.ts"];
const EXPECTED_SERVICE_CALLERS: Record<string, readonly string[]> = {
  "src/modules/mobile/mobile-evidence-sync.ts": ["hasOwnTrackingConsent"],
  "src/modules/work-orders/work-order.service.ts": ["latestLiveForOperator"],
};

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSourceFiles(full));
    else if (entry.isFile() && full.endsWith(".ts") && !full.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

function relative(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function moduleSpecifiers(source: ts.SourceFile): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      found.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [arg] = node.arguments;
      found.push(arg && ts.isStringLiteralLike(arg) ? arg.text : "<import-dinamico-nao-literal>");
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** Métodos chamados sobre o serviço que `createDefaultFieldLocationService()` devolve, no arquivo. */
function serviceMethodsCalled(source: ts.SourceFile): { methods: Set<string>; unrecognized: string[] } {
  const methods = new Set<string>();
  const unrecognized: string[] = [];
  // Cada variável que recebe o serviço vale no bloco em que foi declarada (o `const` tem escopo de bloco).
  const bindings: Array<{ readonly name: string; readonly scope: ts.Node }> = [];

  const unwrap = (node: ts.Expression): ts.Expression => (ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node);
  const enclosingBlock = (node: ts.Node): ts.Node => {
    let current: ts.Node = node.parent;
    while (!ts.isBlock(current) && !ts.isSourceFile(current)) current = current.parent;
    return current;
  };

  const collect = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "createDefaultFieldLocationService") {
      const parent = node.parent;
      if (ts.isImportSpecifier(parent)) return;
      if (!(ts.isCallExpression(parent) && parent.expression === node)) {
        unrecognized.push(`referência sem chamada na linha ${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
        return;
      }
      let call: ts.Node = parent;
      if (ts.isAwaitExpression(call.parent)) call = call.parent;
      const holder = call.parent;
      if (ts.isVariableDeclaration(holder) && holder.initializer === call && ts.isIdentifier(holder.name)) {
        bindings.push({ name: holder.name.text, scope: enclosingBlock(holder) });
        return;
      }
      if (ts.isParenthesizedExpression(holder) && ts.isPropertyAccessExpression(holder.parent) && ts.isCallExpression(holder.parent.parent)) {
        methods.add(holder.parent.name.text);
        return;
      }
      unrecognized.push(`uso não reconhecido na linha ${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
    }
    ts.forEachChild(node, collect);
  };
  collect(source);

  for (const binding of bindings) {
    const usages = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === binding.name && !ts.isVariableDeclaration(node.parent)) {
        const parent = node.parent;
        if (ts.isPropertyAccessExpression(parent) && parent.expression === node && ts.isCallExpression(parent.parent) && unwrap(parent.parent.expression) === parent) {
          methods.add(parent.name.text);
        } else {
          unrecognized.push(`o serviço "${node.text}" sai do bloco ou é usado sem chamada, linha ${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
        }
      }
      ts.forEachChild(node, usages);
    };
    usages(binding.scope);
  }
  return { methods, unrecognized };
}

const files = listSourceFiles(SRC);

test("[G-B] (a)+(b) fora do módulo, só a ingestão do Traccar importa o repositório de posição", () => {
  const importers = files
    .filter((file) => !file.startsWith(MODULE_DIR))
    .filter((file) => moduleSpecifiers(parse(file)).some((spec) => REPOSITORY_SPECIFIER.test(spec) || spec === "<import-dinamico-nao-literal>"))
    .map(relative)
    .sort();
  assert.ok(files.length > 100, `varredura sem universo: ${files.length} arquivos`);
  assert.deepEqual(importers, EXPECTED_REPOSITORY_IMPORTERS);
});

test("[G-B] (c) field-location.service.ts tem exatamente 1 chamada this.repository.record(", () => {
  const source = parse(path.join(MODULE_DIR, "field-location.service.ts"));
  let calls = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "this.repository.record") calls += 1;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(calls, 1);
});

test("[G-B] (d) createDefaultFieldLocationService fora do módulo: work-order.service.ts só com latestLiveForOperator; mobile-evidence-sync.ts só com hasOwnTrackingConsent", () => {
  const found: Record<string, string[]> = {};
  const problems: string[] = [];
  for (const file of files.filter((candidate) => !candidate.startsWith(MODULE_DIR))) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("createDefaultFieldLocationService")) continue;
    const { methods, unrecognized } = serviceMethodsCalled(parse(file));
    found[relative(file)] = [...methods].sort();
    problems.push(...unrecognized.map((item) => `${relative(file)}: ${item}`));
  }
  assert.deepEqual(problems, [], "todo uso do serviço precisa ser reconhecido");
  assert.deepEqual(found, EXPECTED_SERVICE_CALLERS);
});
