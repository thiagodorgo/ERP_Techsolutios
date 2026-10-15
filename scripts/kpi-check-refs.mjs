#!/usr/bin/env node
// Confere TODA referência que um PR de KPI acrescenta: commit (hash), rodada de CI (run id) e PR (#n).
// Etapa fixa antes do merge de PR de KPI (decisão do dono, 2026-10-15). Por que: no 1º teste do loop de
// KPI com o Gemini (PR #435), os números estavam certos, mas um commit e cinco rodadas de CI citados NÃO
// existiam. Referência que não se confere por comando não entra no painel.
//
// Lê só as linhas ACRESCENTADAS no diff contra a base (padrão `origin/main`) dos caminhos do painel e do
// registro de achados, e confere cada referência:
//   - hash (7–40 hex, com pelo menos um dígito e uma letra): qualquer objeto do git local (`git cat-file -e`;
//     commit, árvore ou blob) OU commit no GitHub (`gh api repos/{owner}/{repo}/commits/<hash>`), porque o head
//     de um PR com o ramo apagado depois do squash não fica na cópia local;
//   - rodada de CI (número de 9 a 12 dígitos depois de "run"): `gh api repos/{owner}/{repo}/actions/runs/<id>`;
//   - PR (#n): `gh pr view <n>`.
// Sai 1 se alguma não existir, listando qual e onde.
//
// Uso: node scripts/kpi-check-refs.mjs [--base origin/main]

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CAMINHOS = ["Kpis/kpis-latest.json", "Kpis/kpis-history.json", "Kpis/kpis-history.md", "docs/revisoes/O6R/achados.jsonl", "docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md"];

// ---------- funções puras (testadas em tests/kpi-loop-ferramentas.test.ts) ----------

/** Extrai as referências de um texto: hashes, rodadas de CI e PRs, sem repetição. */
export function extrairReferencias(texto) {
  const hashes = new Set();
  for (const m of texto.matchAll(/(?<![0-9a-zA-Z_-])([0-9a-f]{7,40})(?![0-9a-zA-Z_-])/g)) {
    const h = m[1];
    if (/[0-9]/.test(h) && /[a-f]/.test(h)) hashes.add(h);
  }
  const runs = new Set();
  for (const m of texto.matchAll(/\bruns?\s*(?:id\s*)?[#`]?(\d{9,12})/gi)) runs.add(m[1]);
  // Na tabela do histórico a coluna da CI traz o id solto: célula que é só um número de 9 a 12 dígitos.
  for (const l of texto.split(/\r?\n/)) {
    if (!l.trimStart().startsWith("|")) continue;
    for (const c of l.split("|")) { const m = c.trim().match(/^(\d{9,12})(?:\s*\(tentativa \d+\))?$/); if (m) runs.add(m[1]); }
  }
  const prs = new Set();
  for (const m of texto.matchAll(/(?<![\w&])#(\d{2,5})\b/g)) prs.add(m[1]);
  return { hashes: [...hashes], runs: [...runs], prs: [...prs] };
}

/** Só as linhas acrescentadas de um diff unificado (sem os cabeçalhos +++). */
export function linhasAcrescentadas(diff) {
  return diff.split(/\r?\n/).filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1)).join("\n");
}

// ---------- conferência, por comando ----------

const sh = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
const existe = (cmd, args) => { try { sh(cmd, args); return true; } catch { return false; } };

function main() {
  const i = process.argv.indexOf("--base");
  const base = i > 0 ? process.argv[i + 1] : "origin/main";
  const texto = linhasAcrescentadas(sh("git", ["diff", "--no-color", "-U0", `${base}...HEAD`, "--", ...CAMINHOS]));
  const { hashes, runs, prs } = extrairReferencias(texto);
  const repo = sh("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]).trim();
  const falhas = [];
  for (const h of hashes) if (!existe("git", ["cat-file", "-e", h]) && !existe("gh", ["api", `repos/${repo}/commits/${h}`, "--jq", ".sha"])) falhas.push(`commit ${h}`);
  for (const r of runs) if (!existe("gh", ["api", `repos/${repo}/actions/runs/${r}`, "--jq", ".id"])) falhas.push(`rodada de CI ${r}`);
  for (const p of prs) if (!existe("gh", ["pr", "view", p, "--json", "number"])) falhas.push(`PR #${p}`);
  console.log(`kpi-check-refs: ${hashes.length} commit(s), ${runs.length} rodada(s) de CI e ${prs.length} PR(s) nas linhas acrescentadas contra ${base}.`);
  if (falhas.length) {
    console.error(`kpi-check-refs: ${falhas.length} referência(s) que NÃO existem:\n  - ${falhas.join("\n  - ")}`);
    process.exit(1);
  }
  console.log("kpi-check-refs: todas as referências existem.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { main(); } catch (e) { console.error(`kpi-check-refs: ${e.message}`); process.exit(1); }
}
