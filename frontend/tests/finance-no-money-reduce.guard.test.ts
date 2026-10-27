import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// B-SAN3-12b — F8 como TRAVA com inventário congelado (ratificação do orquestrador, 2026-10-26 14:40Z, no fim do plano).
// O dinheiro dos indicadores vem do servidor (`/financial-summary`, `/aggregate`, `/balance`); o front não soma.
// A forma procurada é a do `rg` do §9.2 (`reduce(` ou `+= …amount`) mais `+= <qualquer coisa>` em geral, sobre
// TODO `frontend/src/modules/finance/**`, comentários fora. As 8 ocorrências abaixo existiam na `origin/main`
// `c9a2d036` ANTES do ramo (pré-existentes, §C7.1-ter(a)); são comparadas por arquivo e pela expressão normalizada
// (sem espaços), nunca por número de linha. Pendência `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE` (fecha com o
// inventário vazio): 7 em `commissions/**` (dono: o bloco das telas de comissões) e 1 em `titles/` (dono: B-SAN3-24).
//   (a) qualquer ocorrência FORA do inventário reprova;
//   (b) entrada do inventário que sumiu do código reprova (para o inventário não guardar entrada morta);
//   (c) nos diretórios que o 12b cria ou edita (`accounts/**`, `entries/**`, `pages/**`) o inventário é VAZIO.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/modules/finance");

export const FROZEN_INVENTORY: readonly string[] = [
  "commissions/commissions.adapter.ts::items.reduce((sum,item)=>sum+item.total,0)",
  "commissions/components/CommissionDetailDrawer.tsx::state.items.reduce((sum,item)=>sum+(Number.isFinite(item.amount)?item.amount:0),0)",
  "commissions/components/ConferenciaRemuneracoesView.tsx::settledTotal+=amount",
  "commissions/components/ConferenciaRemuneracoesView.tsx::toPay+=amount",
  "commissions/components/ConferenciaRemuneracoesView.tsx::selectedItems.reduce((sum,calc)=>sum+(Number.isFinite(calc.amount)?calc.amount:0),0)",
  "commissions/pages/RemuneracoesPage.tsx::summary.items.reduce((sum,item)=>sum+item.count,0)",
  "commissions/pages/RemuneracoesPage.tsx::summary.items.reduce((sum,item)=>sum+item.count,0)",
  "titles/financial-titles.adapter.ts::items.reduce((total,title)=>(predicate(title)?total+title.amount:total),0)",
];

const BLOCK_DIRS = ["accounts/", "entries/", "pages/"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(item.name) ? [full] : [];
  });
}

/** Remove comentários de linha e de bloco sem tocar em strings simples (as do módulo não contêm // nem /*). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** Do índice de `(` até o `)` que o fecha (parênteses balanceados). */
function balanced(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === "(") depth += 1;
    else if (code[i] === ")" && --depth === 0) return code.slice(open, i + 1);
  }
  return code.slice(open);
}

/**
 * Toda ocorrência no módulo, como `arquivo::expressão-sem-espaços` (uma por ocorrência). `strict` = a forma do `rg`
 * do §9.2 (`reduce(` ou `+= …amount`), que é a régua do inventário; `broad` = qualquer `.reduce(` ou `+=`, a régua
 * dos diretórios do 12b (mais dura: lá não nasce acúmulo nenhum, de dinheiro ou não).
 */
export function scanFinance(root: string = ROOT, mode: "strict" | "broad" = "strict"): string[] {
  const found: string[] = [];
  for (const file of sourceFiles(root)) {
    const rel = path.relative(root, file).replaceAll("\\", "/");
    const code = stripComments(readFileSync(file, "utf8"));
    for (const match of code.matchAll(/([A-Za-z_$][\w$.?]*)\.reduce\(/g)) {
      const open = (match.index ?? 0) + match[0].length - 1;
      found.push(`${rel}::${(match[1] + ".reduce" + balanced(code, open)).replace(/\s+/g, "")}`);
    }
    const plus = mode === "strict" ? /([A-Za-z_$][\w$.]*)\s*\+=\s*([a-zA-Z.]*amount)(?![\w$])/g : /([A-Za-z_$][\w$.]*)\s*\+=\s*([^;\n]*)/g;
    for (const match of code.matchAll(plus)) found.push(`${rel}::${`${match[1]}+=${match[2]}`.replace(/\s+/g, "")}`);
    // E2/R12: a soma por `x = x + …` (ou `x = x - …`), nas duas réguas. Medido no ciclo 2: 0 ocorrência pré-existente em
    // todo o módulo, logo o inventário continua o das 8.
    for (const match of code.matchAll(/(?<![\w$.])([A-Za-z_$][\w$.]*)\s*=\s*\1\s*([+-][^;\n]*)/g)) {
      found.push(`${rel}::${`${match[1]}=${match[1]}${match[2]}`.replace(/\s+/g, "")}`);
    }
  }
  return found.sort();
}

function multiset(items: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) out.set(item, (out.get(item) ?? 0) + 1);
  return out;
}

test("F8: o módulo financeiro tem EXATAMENTE as 8 ocorrências do inventário congelado (nenhuma nova, nenhuma morta)", () => {
  const found = multiset(scanFinance());
  const frozen = multiset(FROZEN_INVENTORY);
  const extra = [...found].filter(([key, n]) => n > (frozen.get(key) ?? 0)).map(([key]) => key);
  const dead = [...frozen].filter(([key, n]) => n > (found.get(key) ?? 0)).map(([key]) => key);
  assert.deepEqual(extra, [], "soma/acúmulo novo no front financeiro — o dinheiro vem do servidor (F8)");
  assert.deepEqual(dead, [], "entrada do inventário que não existe mais no código — tire-a do inventário");
});

test("F8: nos diretórios do 12b (accounts/, entries/, pages/) o inventário é vazio e o código também", () => {
  assert.deepEqual(FROZEN_INVENTORY.filter((item) => BLOCK_DIRS.some((dir) => item.startsWith(dir))), []);
  assert.deepEqual(scanFinance(ROOT, "broad").filter((item) => BLOCK_DIRS.some((dir) => item.startsWith(dir))), []);
});

test("F8: o detector acusa as duas mutações da ratificação (controle positivo, sem tocar no código)", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const tmp = mkdtempSync(path.join(tmpdir(), "f8-guard-"));
  try {
    mkdirSync(path.join(tmp, "pages/views"), { recursive: true });
    writeFileSync(path.join(tmp, "pages/views/X.tsx"), "const total = props.items.reduce((s, e) => s + e.amount, 0);\n// items.reduce(comentado) não conta\n");
    mkdirSync(path.join(tmp, "entries"), { recursive: true });
    writeFileSync(path.join(tmp, "entries/y.ts"), "let saldo = 0;\nfor (const e of list) saldo += e.amount;\n");
    assert.deepEqual(scanFinance(tmp), ["entries/y.ts::saldo+=e.amount", "pages/views/X.tsx::props.items.reduce((s,e)=>s+e.amount,0)"]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("F8/R12: o detector acusa a soma por `x = x + …` nas duas réguas (controle positivo, sem tocar no código)", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const tmp = mkdtempSync(path.join(tmpdir(), "f8-r12-"));
  try {
    mkdirSync(path.join(tmp, "pages/views"), { recursive: true });
    writeFileSync(path.join(tmp, "pages/views/Z.tsx"), "let soma = 0;\nfor (const e of items) soma = soma + Number(e.amount);\nlet resto = 10;\nresto = resto - 1;\n");
    const expected = ["pages/views/Z.tsx::resto=resto-1", "pages/views/Z.tsx::soma=soma+Number(e.amount)"];
    assert.deepEqual(scanFinance(tmp), expected);
    assert.deepEqual(scanFinance(tmp, "broad"), expected);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
