import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import ts from "typescript";

// B-ASS-10b (T5) · T-CTR-1 — o tipo do front espelha o contrato `platform_billing_overview@2026-11.b-ass-09`.
// Lido pelo verificador de tipos do TypeScript nos DOIS lados (servidor e front), sem importar o front (JSX e o
// `tsconfig` dele não são o da raiz): os nomes de campo dos cinco tipos JSON da visão são os mesmos, e os enums
// (`as const`) têm os mesmos membros, na mesma ordem. Se o B-ASS-09 mudar o contrato, este teste fica vermelho.

const ROOT = process.cwd();
const SERVER = path.join(ROOT, "src/modules/subscription-billing/overview/overview.types.ts");
const FRONT = path.join(ROOT, "frontend/src/modules/platform/cloud-billing/cloud-billing.types.ts");
const JSON_TYPES = ["TenantLineJson", "GroupLineJson", "TotalsJson", "GlobalJson", "OverviewCostJson"] as const;
const ENUMS = ["COST_STATUSES", "OVERVIEW_ALERTS", "OVERVIEW_GROUP_BYS", "OVERVIEW_WARNINGS", "SUBSCRIPTION_SOURCES"] as const;

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

for (const name of ENUMS) {
  test(`T-CTR-1 ${name}: o enum do front é o do servidor`, () => {
    const server = enumOf(SERVER, name);
    assert.ok(server.length > 0);
    assert.deepEqual(enumOf(FRONT, name), server);
  });
}
