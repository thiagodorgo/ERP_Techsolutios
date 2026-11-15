import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import ts from "typescript";

// B-ASS-10b (T5) · T-CTR-1 — o tipo do front espelha o contrato `platform_billing_overview@2026-11.b-ass-09`.
// Lido pelo verificador de tipos do TypeScript nos DOIS lados (servidor e front), sem importar o front (JSX e o
// `tsconfig` dele não são o da raiz): os nomes de campo dos cinco tipos JSON da visão são os mesmos, e os enums têm os
// mesmos membros. Se o B-ASS-09 mudar o contrato, este teste fica vermelho.
// J-567 (C3-04): os enums são DERIVADOS do arquivo do servidor, não de uma lista copiada aqui, nos DOIS formatos que ele
// usa: (1) toda lista exportada `export const X = [...] as const` só de textos — o front tem a mesma lista, mesmos membros
// na mesma ordem; (2) toda união exportada só de textos literais (`export type X = "a" | "b"`) — o front tem o tipo X com
// o mesmo conjunto de membros. Um membro novo no servidor, num formato ou no outro, sem espelho na tela fica VERMELHO.

const ROOT = process.cwd();
const SERVER = path.join(ROOT, "src/modules/subscription-billing/overview/overview.types.ts");
const FRONT = path.join(ROOT, "frontend/src/modules/platform/cloud-billing/cloud-billing.types.ts");
const JSON_TYPES = ["TenantLineJson", "GroupLineJson", "TotalsJson", "GlobalJson", "OverviewCostJson"] as const;
/** Piso de vacuidade da derivação (não é a fonte do teste): os enums que o servidor tem hoje. */
const KNOWN_LISTS = ["COST_STATUSES", "OVERVIEW_ALERTS", "OVERVIEW_GROUP_BYS", "OVERVIEW_WARNINGS", "SUBSCRIPTION_SOURCES"] as const;
const KNOWN_UNIONS = ["SubscriptionSkipReason"] as const;

const program = ts.createProgram([SERVER, FRONT], { strict: true, skipLibCheck: true, noEmit: true, types: [], jsx: ts.JsxEmit.ReactJSX });
const checker = program.getTypeChecker();

function sourceOf(file: string): ts.SourceFile {
  const source = program.getSourceFile(file);
  assert.ok(source, `arquivo não lido: ${path.relative(ROOT, file)}`);
  return source;
}

/** Os nomes de campo de um tipo, recursivamente nos objetos aninhados (`original`, `sources`, itens de lista). */
function shapeOf(file: string, name: string): string[] {
  const source = sourceOf(file);
  const alias = source.statements.find((statement): statement is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(statement) && statement.name.text === name);
  assert.ok(alias, `${name} não está em ${path.relative(ROOT, file)}`);
  const out: string[] = [];
  const walk = (type: ts.Type, prefix: string, depth: number) => {
    if (depth > 3) return;
    const parts = type.isUnion() ? type.types : [type];
    for (const part of parts) {
      if (part.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike)) continue;
      // dinheiro marcado do front (`string & { __brand }`) é folha, como a `string` do servidor
      if (part.getProperty("__brand")) continue;
      const element = checker.getIndexTypeOfType(part, ts.IndexKind.Number);
      if (element && checker.isArrayLikeType(part)) {
        walk(element, `${prefix}[]`, depth + 1);
        continue;
      }
      for (const property of part.getProperties()) {
        if (property.name === "__brand") continue;
        const key = prefix ? `${prefix}.${property.name}` : property.name;
        out.push(key);
        walk(checker.getTypeOfSymbol(property), key, depth + 1);
      }
    }
  };
  walk(checker.getTypeAtLocation(alias.name), "", 0);
  return [...new Set(out)].sort();
}

function enumOf(file: string, name: string): string[] {
  const source = sourceOf(file);
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name || !declaration.initializer) continue;
      let initializer: ts.Expression = declaration.initializer;
      if (ts.isAsExpression(initializer)) initializer = initializer.expression;
      assert.ok(ts.isArrayLiteralExpression(initializer), `${name} não é lista literal`);
      return initializer.elements.map((element) => {
        assert.ok(ts.isStringLiteral(element), `${name} tem membro que não é texto literal`);
        return element.text;
      });
    }
  }
  assert.fail(`${name} não está em ${path.relative(ROOT, file)}`);
}

for (const name of JSON_TYPES) {
  test(`T-CTR-1 ${name}: o front tem os mesmos campos que o servidor`, () => {
    const server = shapeOf(SERVER, name);
    assert.ok(server.length > 2, `controle de vacuidade: ${name} do servidor tem campos (${server.length})`);
    assert.deepEqual(shapeOf(FRONT, name), server);
  });
}

const isExported = (node: ts.Node) => ts.canHaveModifiers(node) && !!ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

/** (1) As listas `as const` só de textos que o arquivo exporta. */
function constListsOf(file: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const statement of sourceOf(file).statements) {
    if (!ts.isVariableStatement(statement) || !isExported(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const initializer = declaration.initializer;
      if (!ts.isIdentifier(declaration.name) || !initializer || !ts.isAsExpression(initializer)) continue;
      if (!ts.isTypeReferenceNode(initializer.type) || initializer.type.getText() !== "const") continue;
      if (!ts.isArrayLiteralExpression(initializer.expression) || !initializer.expression.elements.length) continue;
      if (!initializer.expression.elements.every((element) => ts.isStringLiteral(element))) continue;
      out.set(declaration.name.text, initializer.expression.elements.map((element) => (element as ts.StringLiteral).text));
    }
  }
  return out;
}

/** (2) As uniões só de textos literais que o arquivo exporta (a forma SINTÁTICA do servidor). */
function literalUnionsOf(file: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const statement of sourceOf(file).statements) {
    if (!ts.isTypeAliasDeclaration(statement) || !isExported(statement)) continue;
    const members = ts.isUnionTypeNode(statement.type) ? statement.type.types : [statement.type];
    if (!members.every((member) => ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal))) continue;
    out.set(statement.name.text, members.map((member) => ((member as ts.LiteralTypeNode).literal as ts.StringLiteral).text).sort());
  }
  return out;
}

/** O conjunto de textos de um tipo do FRONT, pelo verificador (vale a união escrita ou derivada de uma lista). */
function typeMembersOf(file: string, name: string): string[] {
  const alias = sourceOf(file).statements.find((statement): statement is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(statement) && statement.name.text === name);
  assert.ok(alias, `${name} não está em ${path.relative(ROOT, file)}`);
  const type = checker.getTypeAtLocation(alias.name);
  const parts = type.isUnion() ? type.types : [type];
  return parts.map((part) => {
    assert.ok(part.isStringLiteral(), `${name} do front tem membro que não é texto literal`);
    return part.value;
  }).sort();
}

const SERVER_LISTS = constListsOf(SERVER);
const SERVER_UNIONS = literalUnionsOf(SERVER);

test("T-CTR-1 (J-567) a derivação dos enums do servidor não é vazia e cobre o que o servidor tem hoje", () => {
  for (const name of KNOWN_LISTS) assert.ok(SERVER_LISTS.has(name), `lista não derivada: ${name}`);
  for (const name of KNOWN_UNIONS) assert.ok(SERVER_UNIONS.has(name), `união não derivada: ${name}`);
});

for (const [name, server] of SERVER_LISTS) {
  test(`T-CTR-1 ${name}: o enum do front é o do servidor`, () => {
    assert.ok(server.length > 0);
    assert.deepEqual(enumOf(FRONT, name), server);
  });
}

for (const [name, server] of SERVER_UNIONS) {
  test(`T-CTR-1 ${name}: a união do front tem os membros da do servidor`, () => {
    assert.ok(server.length > 0);
    assert.deepEqual(typeMembersOf(FRONT, name), server);
  });
}
