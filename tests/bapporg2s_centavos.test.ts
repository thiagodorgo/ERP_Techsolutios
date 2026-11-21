// B-APP-ORG-2S, fatia S2e (Emenda 1.8.3 §3, "O que continua fora, com dono e com trava") — CS3, a trava da liquidação.
//
// A liquidação (`settleCalculations`, `commission.service.ts`) arredonda o valor em `double` (`roundToCents`) e erra 1
// centavo nos empates de meio centavo (`10.075` credita `10.07`, a tela mostra `10,08`). Hoje nenhum código grava
// `commission_calculations.amount`, então nenhuma linha é atingida. Pendência `P-COMISSAO-LIQUIDACAO-CENTAVO` (apelido
// `P-COMISSAO-LIQUIDACAO-ARREDONDA-EM-DOUBLE`; ALTA, dono `B-COMISSAO-MOTOR`).
//
// CS3: este teste fica VERMELHO no dia em que algum arquivo de `src/` gravar `amount` de comissão no banco enquanto o
// `settleCalculations` ainda chamar `roundToCents(`. O motor não consegue gravar valor sem consertar a liquidação.
//
// O que conta como gravador (lido pelo compilador TypeScript, não por texto solto), fail-closed:
//   (a) `<qualquer>.commissionCalculation.<create|createMany|createManyAndReturn|upsert>(…)` — toda linha nova grava amount;
//   (b) `<qualquer>.commissionCalculation.<update|updateMany|updateManyAndReturn>(…)` — salvo quando o argumento é um
//       objeto literal cujo `data` é um objeto literal SEM a chave `amount` e sem espalhamento (o `markSettled` de hoje);
//   (c) o acesso por colchete (`client["commissionCalculation"]`) com os mesmos métodos;
//   (d) SQL em texto (string, template ou template marcado) com `INSERT INTO`, `UPDATE` ou `COPY` de
//       `commission_calculations`.
// Sem o `settleCalculations` no arquivo, o teste falha: a trava não se avalia às cegas.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVICE = "src/modules/commissions/commission.service.ts";
const CREATE_METHODS = new Set(["create", "createMany", "createManyAndReturn", "upsert"]);
const UPDATE_METHODS = new Set(["update", "updateMany", "updateManyAndReturn"]);
const RAW_WRITE = /\b(insert\s+into|update|copy)\s+(?:"?public"?\.)?"?commission_calculations"?\b/i;

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSourceFiles(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

function delegateMethod(callee: ts.Expression): { delegate: string; method: string } | undefined {
  if (!ts.isPropertyAccessExpression(callee)) return undefined;
  const method = callee.name.text;
  const target = callee.expression;
  if (ts.isPropertyAccessExpression(target)) return { delegate: target.name.text, method };
  if (ts.isElementAccessExpression(target) && ts.isStringLiteralLike(target.argumentExpression)) {
    return { delegate: target.argumentExpression.text, method };
  }
  return undefined;
}

function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

/** O `update*` só fica fora quando o `data` é objeto literal, sem `amount` e sem espalhamento. Qualquer outra forma conta. */
function updateWritesAmount(call: ts.CallExpression): boolean {
  const [arg] = call.arguments;
  if (!arg || !ts.isObjectLiteralExpression(arg)) return true;
  const data = arg.properties.find((property) => ts.isPropertyAssignment(property) && propertyName(property.name) === "data");
  if (arg.properties.some((property) => ts.isSpreadAssignment(property))) return true;
  if (!data || !ts.isPropertyAssignment(data) || !ts.isObjectLiteralExpression(data.initializer)) return true;
  return data.initializer.properties.some((property) => {
    if (ts.isSpreadAssignment(property)) return true;
    if (ts.isShorthandPropertyAssignment(property)) return property.name.text === "amount";
    if (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) {
      const name = propertyName(property.name);
      return name === undefined || name === "amount";
    }
    return true;
  });
}

function literalText(node: ts.Node): string | undefined {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ");
  return undefined;
}

/** Gravadores de `commission_calculations.amount` num texto-fonte; cada um como `arquivo:linha forma`. */
export function findCommissionAmountWriters(fileName: string, source: string): string[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const hits: string[] = [];
  const where = (node: ts.Node): string => `${fileName}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const access = delegateMethod(node.expression);
      if (access?.delegate === "commissionCalculation") {
        if (CREATE_METHODS.has(access.method)) hits.push(`${where(node)} commissionCalculation.${access.method}`);
        else if (UPDATE_METHODS.has(access.method) && updateWritesAmount(node)) hits.push(`${where(node)} commissionCalculation.${access.method} com amount`);
      }
    }
    const text = literalText(node);
    if (text !== undefined && RAW_WRITE.test(text)) hits.push(`${where(node)} SQL: ${text.replace(/\s+/g, " ").trim().slice(0, 60)}`);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return hits;
}

/** `undefined` quando o método não existe no arquivo (a trava não se avalia às cegas). */
export function settleCallsRoundToCents(source: string): boolean | undefined {
  const sourceFile = ts.createSourceFile(SERVICE, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  let found: boolean | undefined;
  const visit = (node: ts.Node): void => {
    if (ts.isMethodDeclaration(node) && propertyName(node.name) === "settleCalculations" && node.body) {
      let calls = false;
      const inner = (child: ts.Node): void => {
        if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === "roundToCents") calls = true;
        ts.forEachChild(child, inner);
      };
      inner(node.body);
      found = (found ?? false) || calls;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

test("CS3-detector · o detector reconhece cada forma de gravador e deixa de fora o markSettled de hoje (controle)", () => {
  const sample = [
    `await tx.commissionCalculation.create({ data: { amount: 1 } });`,
    `await this.client.commissionCalculation.createMany({ data: rows });`,
    `await prisma["commissionCalculation"].upsert({ where: w, create: c, update: u });`,
    `await tx.commissionCalculation.update({ where: w, data: { amount } });`,
    `await tx.commissionCalculation.updateMany({ where: w, data: payload });`,
    `await tx.commissionCalculation.updateManyAndReturn({ where: w, data: { ...patch } });`,
    "await tx.$executeRaw`INSERT INTO commission_calculations (amount) VALUES (${v})`;",
    `await tx.$executeRawUnsafe('UPDATE "commission_calculations" SET amount = $1');`,
    // fora: leitura, e a escrita só do marcador de liquidação (o markSettled da ref)
    `await tx.commissionCalculation.findMany({ where: w });`,
    `await this.client.commissionCalculation.updateManyAndReturn({ where: w, data: { settled_at: a, settlement_ref: b } });`,
    `const tabela = "commission_calculations";`,
  ].join("\n");
  const hits = findCommissionAmountWriters("amostra.ts", sample);
  assert.deepEqual(
    hits.map((hit) => Number(hit.split(" ")[0]!.split(":")[1])),
    [1, 2, 3, 4, 5, 6, 7, 8],
    hits.join("\n"),
  );
  assert.equal(settleCallsRoundToCents(`class S { async settleCalculations() { return roundToCents(1); } }`), true);
  assert.equal(settleCallsRoundToCents(`class S { async settleCalculations() { return Math.round(1); } }`), false);
  assert.equal(settleCallsRoundToCents(`class S { async other() { return roundToCents(1); } }`), undefined);
});

test("CS3 · trava da liquidação: nenhum gravador de amount de comissão em src/ enquanto settleCalculations chamar roundToCents(", () => {
  const writers = listSourceFiles(path.join(ROOT, "src")).flatMap((file) =>
    findCommissionAmountWriters(path.relative(ROOT, file).replaceAll("\\", "/"), readFileSync(file, "utf8")),
  );
  const rounds = settleCallsRoundToCents(readFileSync(path.join(ROOT, SERVICE), "utf8"));
  assert.notEqual(rounds, undefined, `settleCalculations não encontrado em ${SERVICE}: a trava CS3 precisa ser revista por emenda`);
  if (rounds) {
    assert.deepEqual(
      writers,
      [],
      "P-COMISSAO-LIQUIDACAO-CENTAVO: há gravador de amount de comissão e a liquidação ainda arredonda em double (roundToCents). " +
        "Conserte a liquidação (centavos exatos, commission-money.ts) antes de gravar valor.",
    );
  }
});
