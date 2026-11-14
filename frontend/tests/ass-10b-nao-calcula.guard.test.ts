import assert from "node:assert/strict";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { moneyViolations } from "./ass-10b-nao-calcula.guard";

// B-ASS-10b (T5) · T-DIN-P — "a tela não calcula dinheiro" (R-T5-DIN, plano v2 §6.2; Emenda 1, A4-r2 e A8-r2), pela trava
// de `ass-10b-nao-calcula.guard.ts`. (1) A tela REAL (`modules/platform/cloud-billing/**`, menos o arquivo de dinheiro) não
// tem violação. (2) Num módulo de exemplo que só formata, conta, ordena e desenha (controle limpo), cada mutação de conta
// fica vermelha pela regra esperada: as 11 do plano (M-DIN-P1 a P11), as formas 1 e 3 da crítica r2 (N-DIN-1, N-DIN-3) e a
// marca de escala numa view (A8-r2). (3) As formas 2 e 4 são LIMITE DECLARADO: o teste mostra que os 2 `git grep` da
// Emenda 1 §2, que a cadeira de dinheiro roda, as encontram.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.dirname(HERE);
const SRC = path.join(FRONTEND, "src");
const MODULE_DIR = "modules/platform/cloud-billing/";
const MONEY_FILE = "modules/platform/cloud-billing/cloud-billing.money.ts";
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

test("T-DIN-P a tela real (todo arquivo de cloud-billing/**, menos o de dinheiro) não calcula dinheiro", () => {
  const moduleFiles = files(path.join(SRC, MODULE_DIR));
  assert.ok(moduleFiles.length >= 8, `controle de vacuidade: o módulo tem arquivos (${moduleFiles.length})`);
  const violations = moneyViolations(moduleFiles, OPTIONS, SRC, MODULE_DIR, MONEY_FILE);
  assert.deepEqual(violations, []);
});

const MODEL = `import type { Money, Pct } from "./cloud-billing.money";
export type Line = { id: string; name: string; allocatedCost: Money | null; margin: Money | null; marginPct: Pct | null; alert: string };
export type Model = {
  lines: Line[];
  totals: { allocatedCost: Money | null; margin: Money | null };
  global: { margin: Money | null; marginPct: Pct | null; unallocatedOther: Money | null; totalImportedCost: Money | null };
};
`;
const CHART = `export function Barras(props: { valores: (number | null)[]; rotulos: string[] }) {
  return <svg>{props.valores.map((valor, index) => <rect key={index} height={valor ?? 0} />)}</svg>;
}
`;
const HELPER = "export function somar(valores: string[]): string { return String(valores.reduce((s, v) => s + Number(v), 0)); }\n";
// o que a tela PODE fazer: formatar a string, contar linhas, ordenar por comparação, comparar com faixa e passar geometria ao gráfico
const VIEW = `import { Barras } from "../lib/Barras";
import { asMoney, compareMoney, formatBRL, formatPct, geometryNumber, type Money } from "./cloud-billing.money";
import type { Model } from "./model";
export function ViewOk({ model }: { model: Model }) {
  const emAlerta = model.lines.filter((line) => line.alert === "critical" || line.alert === "warning").length;
  const maiores = [...model.lines].sort((a, b) => compareMoney(b.allocatedCost, a.allocatedCost)).slice(0, 5);
  const negativa = model.lines.filter((line) => { const pct = geometryNumber(line.marginPct); return pct !== null && pct < 0; }).length;
  return (
    <section>
      <b>{formatBRL(model.totals.allocatedCost)}</b><i>{formatPct(model.global.marginPct)}</i>
      <span>{emAlerta} organizações em alerta · {negativa + emAlerta} no total · faixa de 0 a 20 %</span>
      <Barras valores={maiores.map((line) => geometryNumber(line.allocatedCost))} rotulos={maiores.map((line) => \`\${line.name}: \${formatBRL(line.allocatedCost)}\`)} />
    </section>
  );
}
void asMoney;
`;

const MUTATIONS: Record<string, { readonly code: string; readonly rule: RegExp }> = {
  // a mutação de SOMA da crítica r1: "Custo rateado" passa a ser a soma das linhas
  "M-DIN-P1 soma das linhas": {
    code: `export function Soma({ model }: { model: Model }) { const custoRateado = model.lines.reduce((soma, line) => soma + (geometryNumber(line.allocatedCost) ?? 0), 0); return <b>{formatBRL(String(custoRateado) as Money)}</b>; }`,
    rule: /R1 conta/,
  },
  // a mutação de PERCENTUAL da crítica r1: a nota de "Não rateado" ganha um percentual calculado na tela
  "M-DIN-P2 percentual calculado": {
    code: `export function Percentual({ model }: { model: Model }) { return <small>{(geometryNumber(model.global.unallocatedOther)! / geometryNumber(model.global.totalImportedCost)! * 100).toFixed(1)}% do importado sem dono</small>; }`,
    rule: /R1 conta/,
  },
  "M-DIN-P3 Number() no dinheiro": { code: `export const margem = (model: Model) => Number(model.global.margin);`, rule: /R3 conversão/ },
  "M-DIN-P4 parseFloat no percentual": { code: `export const pct = (model: Model) => parseFloat(model.global.marginPct ?? "0");`, rule: /R3 conversão/ },
  "M-DIN-P5 geometria como texto": { code: `export function Cru({ model }: { model: Model }) { return <b>{geometryNumber(model.global.margin)}</b>; }`, rule: /R5 geometria vira texto/ },
  "M-DIN-P6 marca retirada por as": { code: `export const cru = (model: Model) => (model.global.margin as unknown as number) * 2;`, rule: /R8 marca retirada/ },
  "M-DIN-P7 marca forjada": { code: `export const forjada = "1.00" as Money;`, rule: /R8 marca forjada/ },
  "M-DIN-P8 geometria por parâmetro number": {
    code: `function soma(a: number, b: number) { return a + b; }\nexport const total = (model: Model) => soma(geometryNumber(model.global.margin)!, geometryNumber(model.totals.margin)!);`,
    rule: /R10 geometria desmarcada/,
  },
  "M-DIN-P9 geometria por anotação": { code: `export const solto = (model: Model) => { const n: number = geometryNumber(model.global.margin)!; return n; };`, rule: /R11 geometria desmarcada/ },
  "M-DIN-P10 formatação na tela": { code: `export const fmt = (count: number) => count.toLocaleString("pt-BR");`, rule: /R6 formatação/ },
  "M-DIN-P11 percentual de contagem": { code: `export function Parte({ a, b }: { a: number; b: number }) { return <i>{a / b * 100}% das organizações</i>; }`, rule: /R7 percentual/ },
  // Emenda 1, A4-r2 — forma 1 (a trava ACUSA): Number passado como callback sobre lista de valor marcado
  "N-DIN-1 Number como callback de map": {
    code: `export function SomaMap({ model }: { model: Model }) { const total = model.lines.map((line) => line.allocatedCost ?? "0").map(Number).reduce((s, v) => s + v, 0); return <b>{formatBRL(asMoney(\`\${total}\`))}</b>; }`,
    rule: /R3 conversão de valor marcado \(callback\)/,
  },
  // Emenda 1, A4-r2 — forma 3 (a trava ACUSA): JSON.parse de valor marcado, somado
  "N-DIN-3 JSON.parse no dinheiro": {
    code: `export function SomaJson({ model }: { model: Model }) { const total = model.lines.reduce((s, line) => s + JSON.parse(line.allocatedCost ?? "0"), 0); return <b>{formatBRL(asMoney(\`\${total}\`))}</b>; }`,
    rule: /R3 conversão/,
  },
  // Emenda 1, A8-r2 — M-UI-ESC (parte da trava): a view escreve um R$ calculado e o marca como escala
  "M-UI-ESC data-escala numa view": { code: `export function Eixo({ model }: { model: Model }) { return <text data-escala="">{formatBRL(model.totals.allocatedCost)}</text>; }`, rule: /R12 data-escala/ },
};

// Emenda 1, A4-r2 — formas 2 e 4: LIMITE DECLARADO. Quem cobre é a cadeira de dinheiro, com os 2 `git grep` da emenda.
const LIMITS: Record<string, { readonly code: string; readonly grep: RegExp }> = {
  "N-DIN-2 geometria em array anotado number[]": {
    code: `export function SomaArr({ model }: { model: Model }) { const xs: number[] = model.lines.map((line) => geometryNumber(line.allocatedCost) ?? 0); const total = xs.reduce((s, v) => s + v, 0); return <b>{formatBRL(asMoney(\`\${total}\`))}</b>; }`,
    grep: /geometryNumber\(/,
  },
  "N-DIN-4 margem calculada por helper de fora do módulo": {
    code: `import { somar } from "../lib/somar";\nexport function SomaFora({ model }: { model: Model }) { return <b>{formatBRL(asMoney(somar(model.lines.map((line) => line.allocatedCost ?? "0"))))}</b>; }`,
    grep: /from "(\.\.\/)+(lib|utils)\//,
  },
};

function scenario(extra = ""): { readonly violations: string[]; readonly view: string } {
  const root = mkdtempSync(path.join(tmpdir(), "ass10b-din-"));
  try {
    mkdirSync(path.join(root, "mod"));
    mkdirSync(path.join(root, "lib"));
    cpSync(path.join(SRC, MONEY_FILE), path.join(root, "mod/cloud-billing.money.ts"));
    writeFileSync(path.join(root, "mod/model.ts"), MODEL);
    writeFileSync(path.join(root, "lib/Barras.tsx"), CHART);
    writeFileSync(path.join(root, "lib/somar.ts"), HELPER);
    writeFileSync(path.join(root, "mod/ViewOk.tsx"), VIEW);
    if (extra) appendFileSync(path.join(root, "mod/ViewOk.tsx"), `${extra}\n`);
    const violations = moneyViolations(files(root), OPTIONS, root, "mod/", "mod/cloud-billing.money.ts");
    return { violations, view: readFileSync(path.join(root, "mod/ViewOk.tsx"), "utf8") };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("T-DIN-P a tela de exemplo, que só formata, conta, ordena e desenha, não tem violação", () => {
  assert.deepEqual(scenario().violations, []);
});

for (const [name, mutation] of Object.entries(MUTATIONS)) {
  test(`T-DIN-P ${name} fica vermelho`, () => {
    const { violations } = scenario(mutation.code);
    console.log(`# ${name}: ${JSON.stringify(violations)}`);
    assert.ok(violations.some((violation) => mutation.rule.test(violation)), `sem a regra esperada: ${JSON.stringify(violations)}`);
  });
}

for (const [name, limit] of Object.entries(LIMITS)) {
  test(`T-DIN-P ${name}: limite declarado, achado pelo git grep da cadeira de dinheiro`, () => {
    const { violations, view } = scenario(limit.code);
    console.log(`# ${name} (limite declarado): trava=${JSON.stringify(violations)}`);
    const appended = view.split("\n").filter((line) => limit.grep.test(line) && !VIEW.includes(line));
    assert.ok(appended.length > 0, `o grep da Emenda 1 §2 (${limit.grep}) tem de achar a forma ${name}`);
  });
}
