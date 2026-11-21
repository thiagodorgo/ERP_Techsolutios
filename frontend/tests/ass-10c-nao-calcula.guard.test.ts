import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { moneyViolations } from "./ass-10b-nao-calcula.guard";

// B-ASS-10c-OPERACAO · R-T5-DIN — a tela de operação da cobrança NÃO calcula dinheiro. A trava T-DIN-P do T5
// (`ass-10b-nao-calcula.guard.ts`) roda sobre `billing-operations/**`, com `billing-ops.money.ts` como o único arquivo de
// dinheiro. T-DIN-1: a tela real não tem violação. T-DIN-2 e T-DIN-3: as mutações M19 e M18 do plano (§8.4), aplicadas EM
// MEMÓRIA no `billing-ops.state.ts` real (os imports resolvem de verdade, nada é escrito no disco), ficam vermelhas — na
// forma que tipa (R13, R3) e na forma que não tipa, `s.balance` sobre a linha, que não tem `balance` (R0, a trava falha
// fechado; achados A-04 e A-05 da pré-revisão).

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.dirname(HERE);
const SRC = path.join(FRONTEND, "src");
const MODULE_DIR = "modules/platform/billing-operations/";
const MONEY_FILE = "modules/platform/billing-operations/billing-ops.money.ts";
const STATE_FILE = path.join(SRC, MODULE_DIR, "billing-ops.state.ts");
const OPTIONS: ts.CompilerOptions = {
  ...ts.parseJsonConfigFileContent(ts.readConfigFile(path.join(FRONTEND, "tsconfig.json"), ts.sys.readFile).config, ts.sys, FRONTEND).options,
  types: [],
};

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? files(target) : /\.(ts|tsx)$/.test(name) ? [target] : [];
  });
}
const MODULE_FILES = files(path.join(SRC, MODULE_DIR));

/** A trava sobre o módulo real, com o `billing-ops.state.ts` trocado em memória pela mutação (âncora única, CRLF-neutra). */
function mutatedState(anchor: string, replacement: string): string[] {
  const source = readFileSync(STATE_FILE, "utf8").replace(/\r\n/g, "\n");
  assert.equal(source.split(anchor).length - 1, 1, `âncora única no billing-ops.state.ts: ${anchor}`);
  return moneyViolations(MODULE_FILES, OPTIONS, SRC, MODULE_DIR, MONEY_FILE, { [STATE_FILE]: source.replace(anchor, replacement) });
}

const MONTH_ROWS = "  const monthRows = allRows.filter((row) => row.statement.period === month);";
const A_COBRAR = 'acobrar: kpi("acobrar", "A cobrar", countWhere(FILTERS.acobrar),';

test("T-DIN-1 a tela não calcula dinheiro (a trava T-DIN-P do T5 sobre billing-operations/, com billing-ops.money.ts como arquivo de dinheiro)", () => {
  assert.ok(MODULE_FILES.length >= 15, `controle de vacuidade: ${MODULE_FILES.length} arquivos`);
  assert.deepEqual(moneyViolations(MODULE_FILES, OPTIONS, SRC, MODULE_DIR, MONEY_FILE), []);
});

test("T-DIN-2 (M19, regra 1 da P-567-TRAVA-DINHEIRO-TEMPLATE) a desmarcação por template no modelo da Cobrança é acusada", () => {
  const typed = mutatedState(MONTH_ROWS, `${MONTH_ROWS}\n  const x = monthRows.map((row) => { const s = row.statement; return Number(\`\${s.balance}\`); });\n  void x;`);
  assert.ok(typed.some((violation) => /billing-ops\.state\.ts:\d+ R13 desmarcação por template/.test(violation)), JSON.stringify(typed));
  const untyped = mutatedState(MONTH_ROWS, `${MONTH_ROWS}\n  const x = monthRows.map((s) => Number(\`\${s.balance}\`));\n  void x;`);
  assert.ok(untyped.some((violation) => /billing-ops\.state\.ts:\d+ R0 template com valor sem tipo/.test(violation)), JSON.stringify(untyped));
});

test("T-DIN-3 (M18) o indicador 'A cobrar' somando o saldo é acusado, na forma que tipa e na que não tipa", () => {
  const typed = mutatedState(A_COBRAR, 'acobrar: kpi("acobrar", "A cobrar", monthRows.reduce((acc, row) => { const s = row.statement; return acc + Number(s.balance); }, 0),');
  assert.ok(typed.some((violation) => /billing-ops\.state\.ts:\d+ R3 conversão de valor marcado/.test(violation)), JSON.stringify(typed));
  const untyped = mutatedState(A_COBRAR, 'acobrar: kpi("acobrar", "A cobrar", monthRows.reduce((acc, s) => acc + Number(s.balance), 0),');
  assert.ok(untyped.some((violation) => /billing-ops\.state\.ts:\d+ R0 conversão de valor sem tipo/.test(violation)), JSON.stringify(untyped));
});
