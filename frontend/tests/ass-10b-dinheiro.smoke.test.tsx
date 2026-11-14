import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { asMoney, asPct, formatBRL, formatPct } from "../src/modules/platform/cloud-billing/cloud-billing.money";

// B-ASS-10b (T5) · R-T5-DIN (plano v2 §6.2) — a tela não calcula dinheiro. Dinheiro, percentual e taxa entram como
// STRING marcada; número, vazio e lixo viram ausência ("—"), nunca zero. T-DIN-1 e T-DIN-3 (as aparências) ficam neste
// mesmo arquivo; o T-DIN-P (a trava estática) é `ass-10b-nao-calcula.guard.test.ts`.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE = path.join(HERE, "../src/modules/platform/cloud-billing");

/** Os únicos campos `number` permitidos nos tipos do módulo: contagens, versões e índices (plano v2 §6.2, T-DIN-2). */
const NUMBER_FIELDS_ALLOWED = new Set([
  // contagens
  "memberCount",
  "membersWithoutSubscription",
  "rowCount",
  "duplicateRowsSkipped",
  "runs",
  // versões
  "version",
  "fxRateVersion",
  // índices
  "index",
  // F10 do bloco (Dev-B) leva o uso medido para o detalhe da organização: `quantity` sai daqui junto com `mapUsageSummary`
  "quantity",
]);

function moduleFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    if (statSync(target).isDirectory()) return moduleFiles(target);
    return /\.(ts|tsx)$/.test(name) ? [target] : [];
  });
}

test("T-DIN-2 dinheiro só entra como string decimal; número, vazio e lixo viram ausência, nunca zero", () => {
  assert.equal(asMoney("900.00"), "900.00");
  assert.equal(asMoney("-190.62"), "-190.62");
  for (const raw of [900, 0, "", "R$ 9", null, undefined, "9,00", " 9.00", "9.", ".9", "1e3", "NaN", {}, []]) assert.equal(asMoney(raw), null, String(raw));
  assert.equal(asPct("26.0"), "26.0");
  for (const raw of [26, "", "26 %", null]) assert.equal(asPct(raw), null, String(raw));
  assert.equal(formatBRL(asMoney("12345678901234.56")).replace(/\s/g, " "), "R$ 12.345.678.901.234,56");
  assert.equal(formatBRL(asMoney("-190.62")).replace(/\s/g, " "), "-R$ 190,62");
  assert.equal(formatBRL(null), "—");
  assert.equal(formatBRL(asMoney(0)), "—", "o número 0 do servidor não vira R$ 0,00");
  assert.equal(formatPct(asPct("26.0")).replace(/\s/g, " "), "26,0 %");
  assert.equal(formatPct(null), "—");
});

test("T-DIN-2 nenhum campo dos tipos do módulo é `number`, fora as contagens, versões e índices", () => {
  const files = moduleFiles(MODULE);
  assert.ok(files.length >= 6, `controle de vacuidade: o módulo tem arquivos (${files.length})`);
  const program = ts.createProgram(files, { strict: true, skipLibCheck: true, noEmit: true, types: [], jsx: ts.JsxEmit.ReactJSX, moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 });
  const checker = program.getTypeChecker();
  const found: string[] = [];
  const offending: string[] = [];
  for (const source of program.getSourceFiles().filter((file) => path.resolve(file.fileName).startsWith(path.resolve(MODULE)))) {
    const visit = (node: ts.Node): void => {
      if ((ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) && node.type && ts.isIdentifier(node.name)) {
        const type = checker.getTypeFromTypeNode(node.type);
        const parts = type.isUnion() ? type.types : [type];
        // o campo É número (`number`, `number | null`): toda parte é número ou ausência, e uma delas é número sem marca
        const onlyNumberOrAbsent = parts.every((part) => (part.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.Null | ts.TypeFlags.Undefined)) !== 0);
        const plainNumber = onlyNumberOrAbsent && parts.some((part) => (part.flags & ts.TypeFlags.NumberLike) !== 0 && !part.getProperty("__brand"));
        if (plainNumber) {
          const where = `${path.relative(MODULE, source.fileName).split(path.sep).join("/")}:${node.name.text}`;
          found.push(where);
          if (!NUMBER_FIELDS_ALLOWED.has(node.name.text)) offending.push(where);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  console.log(`# campos number do módulo: ${JSON.stringify(found)}`);
  assert.ok(found.length > 0, "controle de vacuidade: o detector acha ao menos as contagens");
  assert.deepEqual(offending, []);
});
