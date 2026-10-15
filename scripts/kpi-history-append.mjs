#!/usr/bin/env node
// Acrescenta UMA entrada ao histórico do painel de KPI (`Kpis/kpis-history.json` e a tabela de
// `Kpis/kpis-history.md`) sem que ninguém precise ler os ~500 KB do histórico.
//
// Por que isto existe (decisão do dono, 2026-10-15, depois do 1º teste do loop de KPI com o Gemini, PR #435):
// o agente que montava a entrada à mão relia o arquivo inteiro, travou 25 minutos, errou datas e INVENTOU
// referências (um commit e cinco rodadas de CI que não existem). Aqui, tudo o que é FATO vem de comando:
//   - PR, merge commit, data do merge e head aprovado: `gh pr view`;
//   - bloco: o título do PR (o ID entre parênteses, ex. "(B-O6R-03a)");
//   - números de teste: o log da rodada `ci` de push do PRÓPRIO merge commit (`gh run list` + `gh run view --log`);
//   - blocos entregues: a última entrada do histórico + 1.
// Quem chama só escreve o texto humano (`--descricao`). Referência nenhuma é digitada.
//
// Uso:
//   node scripts/kpi-history-append.mjs --pr 425 --descricao "o sync de despesa ficou atômico" \
//        --secao KPI-MARCO-2026-10-14 [--approved-head <sha>] [--consolidacao "<texto>"] [--sem-bloco] [--dry-run]
//   --secao         : o marco. A linha entra na tabela da seção "## Entregas do <secao>" do .md, criada no fim do
//                     arquivo se não existir; nunca na tabela de um marco anterior.
//   --approved-head : quando o objeto aprovado pela junta difere do head mergeado (o sha é conferido no git).
//   --sem-bloco     : a entrega não conta como bloco (blocks_completed não sobe).
//   --dry-run       : mostra a entrada e a linha da tabela, sem gravar.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const HIST_JSON = `${ROOT}Kpis/kpis-history.json`;
const HIST_MD = `${ROOT}Kpis/kpis-history.md`;
export const CABECALHO_TABELA = "| Data | Bloco | PR | merge | approved_head | Backend | Web | App | Blocos | CI (run, tentativa 1) |";

// ---------- funções puras (testadas em tests/kpi-loop-ferramentas.test.ts) ----------

/** Data do merge no fuso de Brasília (YYYY-MM-DD) a partir do ISO do GitHub. */
export function dataBrasilia(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`data inválida: ${iso}`);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** O ID do bloco no título do PR: o último "(B-…)" entre parênteses. */
export function blocoDoTitulo(titulo) {
  const achados = [...String(titulo).matchAll(/\((B-[A-Za-z0-9-]+)\)/g)];
  return achados.length ? achados[achados.length - 1][1] : null;
}

/** Contagens de teste a partir do log da CI (backend, frontend e flutter). Falta = erro, nunca chute. */
export function contagensDoLog(log) {
  const be = log.match(/(\d+) teste\(s\) · pass (\d+) · fail (\d+) · skipped (\d+)/);
  const linhasFe = log.split(/\r?\n/).filter((l) => /^frontend\b/.test(l));
  const feT = linhasFe.map((l) => l.match(/# tests (\d+)/)).find(Boolean);
  const feP = linhasFe.map((l) => l.match(/# pass (\d+)/)).find(Boolean);
  const fl = log.split(/\r?\n/).filter((l) => /^flutter\b/.test(l)).map((l) => l.match(/\+(\d+): All tests passed!/)).find(Boolean);
  const falta = [!be && "backend", !(feT && feP) && "frontend", !fl && "flutter"].filter(Boolean);
  if (falta.length) throw new Error(`o log da CI não traz a contagem de: ${falta.join(", ")}`);
  if (Number(be[3]) !== 0) throw new Error(`a rodada tem ${be[3]} falha(s) no backend: não se publica número de rodada vermelha`);
  return {
    backend: `${be[2]}/${be[1]}`,
    backendResumo: be[0],
    frontend: `${feP[1]}/${feT[1]}`,
    flutter: `${fl[1]}/${fl[1]}`,
  };
}

/** Serializa a entrada no mesmo recuo do arquivo (2 espaços na entrada, 4 nos campos) e com o EOL dele. */
export function entradaFormatada(entrada, eol) {
  return JSON.stringify(entrada, null, 2).split("\n").map((l) => `  ${l}`).join(eol);
}

/** Acrescenta a entrada antes do `]` final do array, sem reformatar o resto do arquivo. */
export function acrescentarNoJson(texto, entrada) {
  const eol = texto.includes("\r\n") ? "\r\n" : "\n";
  const fim = texto.lastIndexOf("]");
  const ultimaChave = texto.lastIndexOf("}", fim);
  if (fim < 0 || ultimaChave < 0) throw new Error("kpis-history.json não termina num array de objetos");
  const novo = `${texto.slice(0, ultimaChave + 1)},${eol}${entradaFormatada(entrada, eol)}${eol}${texto.slice(fim)}`;
  JSON.parse(novo); // falha cedo se algo saiu torto
  return novo;
}

/** Insere a linha na tabela da seção do MARCO ("## Entregas do <secao>"); cria a seção no fim se não existir. */
export function acrescentarNaTabela(texto, linha, secao) {
  if (!secao) throw new Error("falta --secao (o marco): a linha não entra na tabela de um marco anterior");
  const eol = texto.includes("\r\n") ? "\r\n" : "\n";
  const titulo = `## Entregas do ${secao}`;
  const linhas = texto.split(eol);
  const s = linhas.indexOf(titulo);
  if (s < 0) {
    const base = texto.replace(/(\r?\n)+$/, "");
    return [base, "", titulo, "", CABECALHO_TABELA, "|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|", linha, ""].join(eol);
  }
  const ini = linhas.indexOf(CABECALHO_TABELA, s);
  if (ini < 0) throw new Error(`a seção "${titulo}" não tem a tabela de entregas`);
  let fim = ini + 1;
  while (fim + 1 < linhas.length && linhas[fim + 1].startsWith("|")) fim++;
  linhas.splice(fim + 1, 0, linha);
  return linhas.join(eol);
}

// ---------- fatos, por comando ----------

const sh = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

function fatosDoPr(pr) {
  const v = JSON.parse(sh("gh", ["pr", "view", String(pr), "--json", "state,title,mergedAt,mergeCommit,headRefOid"]));
  if (v.state !== "MERGED") throw new Error(`PR #${pr} não está mergeado (state=${v.state})`);
  return { titulo: v.title, mergedAt: v.mergedAt, merge: v.mergeCommit.oid, head: v.headRefOid };
}

function rodadaCi(sha) {
  const runs = JSON.parse(sh("gh", ["run", "list", "--commit", sha, "--event", "push", "--workflow", "ci", "--json", "databaseId,attempt,conclusion"]));
  const ok = runs.find((r) => r.conclusion === "success");
  if (!ok) throw new Error(`nenhuma rodada 'ci' verde de push para ${sha.slice(0, 8)}: ${JSON.stringify(runs)}`);
  return { id: ok.databaseId, tentativa: ok.attempt, log: sh("gh", ["run", "view", String(ok.databaseId), "--log"]) };
}

function shaExiste(sha) {
  try { sh("git", ["cat-file", "-e", `${sha}^{commit}`]); return true; } catch { return false; }
}

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run" || a === "--sem-bloco") o[a.slice(2)] = true;
    else if (a.startsWith("--")) o[a.slice(2)] = argv[++i];
  }
  return o;
}

function main() {
  const o = args(process.argv.slice(2));
  if (!o.pr || !o.descricao || !o.secao) throw new Error('uso: --pr <n> --descricao "<texto>" --secao <marco> [--approved-head <sha>] [--consolidacao "<texto>"] [--sem-bloco] [--dry-run]');
  const pr = Number(o.pr);
  const textoJson = readFileSync(HIST_JSON, "utf8");
  const hist = JSON.parse(textoJson);
  if (hist.some((e) => Number(e.pr) === pr)) throw new Error(`o PR #${pr} já tem entrada no histórico`);

  const f = fatosDoPr(pr);
  const aprovado = o["approved-head"] || f.head;
  if (!shaExiste(aprovado)) throw new Error(`approved_head ${aprovado} não existe no git`);
  const bloco = blocoDoTitulo(f.titulo) || `PR-${pr}`;
  const ci = rodadaCi(f.merge);
  const c = contagensDoLog(ci.log);
  const anterior = hist[hist.length - 1];
  const blocos = Number(anterior.blocks_completed) + (o["sem-bloco"] ? 0 : 1);
  const data = dataBrasilia(f.mergedAt);

  const entrada = {
    snapshot_date: data,
    version: bloco,
    pr,
    merge_commit: f.merge,
    approved_head: aprovado,
    status: "published_per_pr",
    flutter_tests: c.flutter,
    backend_tests: c.backend,
    frontend_smoke_tests: c.frontend,
    blocks_completed: blocos,
    ...(o.consolidacao ? { consolidation: o.consolidacao } : {}),
    description: `${bloco} — ${o.descricao}. NÚMEROS DA CI no merge commit \`${f.merge.slice(0, 8)}\` (push na \`main\`), workflow \`ci\`, run ${ci.id}, tentativa ${ci.tentativa}: backend \`${c.backendResumo}\`; frontend ${c.frontend}; flutter ${c.flutter}. \`blocks_completed\` ${anterior.blocks_completed} -> ${blocos}.`,
    backfill_note: `Gerada por \`scripts/kpi-history-append.mjs\`: pr, merge_commit, data e approved_head de \`gh pr view ${pr}\`${o["approved-head"] ? " (approved_head informado e conferido no git)" : ""}; números do log da rodada ${ci.id}. Nada fica \`null\`.`,
  };
  const desc = String(o.descricao).replace(/\|/g, "\\|");
  const linha = `| ${data} | \`${bloco}\` — ${desc} | #${pr} | \`${f.merge.slice(0, 8)}\` | \`${aprovado.slice(0, 8)}\` | ${c.backend} | ${c.frontend} | ${c.flutter} | ${blocos} | ${ci.id} (tentativa ${ci.tentativa}) |`;

  // Os DOIS textos são montados antes de gravar qualquer um: se um falhar, nenhum arquivo muda.
  const novoJson = acrescentarNoJson(textoJson, entrada);
  const novoMd = acrescentarNaTabela(readFileSync(HIST_MD, "utf8"), linha, o.secao);
  if (o["dry-run"]) { console.log(JSON.stringify(entrada, null, 2)); console.log(linha); return; }
  writeFileSync(HIST_JSON, novoJson);
  writeFileSync(HIST_MD, novoMd);
  console.log(`kpi-history-append: #${pr} (${bloco}) entrou no histórico — ${data}, blocos ${blocos}, run ${ci.id}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { main(); } catch (e) { console.error(`kpi-history-append: ${e.message}`); process.exit(1); }
}
