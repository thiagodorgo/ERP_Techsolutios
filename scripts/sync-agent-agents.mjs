#!/usr/bin/env node
// sync-agent-agents.mjs — espelha os agentes especializados do Claude Code (.claude/agents/) para o
// Codex (.agents/agents/), como PAPÉIS portáteis de junta.
//
// Contexto: D-INTEROP-CLAUDE-CODEX (2026-07-28). O nível alto das rodadas vem da JUNTA de agentes
// (planejador → dev → avaliador+secops+crítico+dba votando, com ciclos de reprovação — §C7). Esses
// agentes são definições do Claude Code (`.claude/agents/**/*.md`). Este script os espelha para
// `.agents/agents/**/*.md` num formato que o Codex consome: MESMO corpo (o system-prompt do papel,
// VERBATIM — os poderes de VETO/adversarial não podem sofrer drift), frontmatter portátil (name +
// description + tradução estritamente allowlisted de modelo; só `tools:` sai) e um PREÂMBULO de
// orientação Codex. A emulação sequencial pelo mesmo agente foi revogada pela decisão do dono
// D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO: sem agentes isolados, a entrega bloqueia. Sem symlink. NÃO toca ERP.
//
// GARANTIAS (ciclo 2 da reprovação GOV-PORTEIRO-PRE-MERGE — F-A):
//   1. RECURSIVO. A caminhada cobre subpastas (`especialistas/…`), que a versão anterior ignorava —
//      o `--check` dizia "23 agentes, espelho consistente" com 25 arquivos existentes, e um espelho
//      mutado para "aprove sempre" ficava VERDE (achados 6/11/14/25/32 do dossiê do ciclo 2).
//   2. SEM DELEÇÃO SILENCIOSA. Nenhum modo apaga arquivo do espelho. Arquivo só-espelho (fora de
//      origem ∪ KEEP) é ERRO RUIDOSO: o script lista, sai !=0 e NÃO escreve nada; a divergência é
//      registrada em `agent-orchestration/controle/` por §A2 (achados 13/28).
//   3. ÍNDICE NORMATIVO CONFERIDO. O `--check` exige o `README.md` do espelho e cruza a tabela de
//      papéis dele com os arquivos reais — papel citado que não existe fica vermelho (achados 23/38).
//
// Uso:
//   node scripts/sync-agent-agents.mjs            # espelha/transforma .claude/agents/ -> .agents/agents/
//   node scripts/sync-agent-agents.mjs --check    # só verifica; sai !=0 se divergir; NÃO escreve nada

import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '.claude', 'agents');
const DST = join(ROOT, '.agents', 'agents');
const CHECK = process.argv.includes('--check');
// arquivos do espelho que NÃO são agentes-fonte e devem ser preservados (índice/protocolo de agentes isolados).
const KEEP = new Set(['README.md']);
const CODEX_HIGH_REASONING = new Set(['planejador-mestre', 'porteiro-pos-merge']);

/**
 * Lista recursiva dos papéis (.md) sob `base`, em caminhos RELATIVOS estilo posix
 * (`especialistas/guardiao-….md`), ordenados — a ordem não pode depender do sistema de arquivos.
 */
export function listAgentFiles(base) {
  if (!existsSync(base)) return [];
  const out = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...listAgentFiles(join(base, entry.name)).map((p) => `${entry.name}/${p}`));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(entry.name);
    }
  }
  return out.sort();
}

/** Nome do papel a partir do caminho relativo (`especialistas/x.md` -> `x`). */
export function roleOf(rel) {
  return basename(rel, '.md');
}

const PREAMBLE = (rel) =>
  `> **Papel para o Codex** — espelho de \`.claude/agents/${rel}\` (D-INTEROP-CLAUDE-CODEX). Adote as\n` +
  `> instruções abaixo como o seu system-prompt ao atuar como **${roleOf(rel)}** na junta (§C7 do \`AGENTS.md\`).\n` +
  `> A FUNÇÃO e os poderes — inclusive **VETO**, quando o papel indicar — são idênticos aos do Claude Code.\n` +
  `> Onde o texto citar mecanismos do Claude Code (ferramenta Agent, caminhos \`.claude/\`, invocação de\n` +
  `> subagentes), use o equivalente do Codex. As alçadas incompatíveis exigem agentes isolados distintos;\n` +
  `> emulação sequencial pelo mesmo agente é inválida (D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO).`;

/**
 * Transforma `.claude/agents/<rel>` em conteúdo `.agents/agents/<rel>` (papel Codex).
 * `rel` é o caminho RELATIVO com extensão (ex.: `planejador-mestre.md`, `especialistas/x.md`).
 */
export function transform(rel, rawInput) {
  const name = roleOf(rel);
  const raw = rawInput.replace(/\r\n/g, '\n'); // normaliza CRLF (Windows) -> LF antes de parsear
  // frontmatter entre o 1o '---' e o próximo '---'
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    // sem frontmatter: só prepende o preâmbulo
    return `${PREAMBLE(rel)}\n\n${raw.trimStart()}`;
  }
  const fm = m[1];
  const body = m[2].replace(/^\n+/, '');
  // Remove `tools:` — a lista de ferramentas é mecanismo do Claude Code e não tem equivalente no Codex.
  let cleanedFm = fm
    .split('\n')
    .filter((line) => !/^\s*tools\s*:/.test(line))
    .join('\n')
    .trim();
  if (CODEX_HIGH_REASONING.has(name)) {
    if (!/^model:\s*fable\s*$/m.test(cleanedFm)) {
      throw new Error(`[agents-sync] ${name}: Claude precisa declarar exatamente model: fable`);
    }
    cleanedFm = cleanedFm.replace(/^model:\s*fable\s*$/m, 'model: gpt-5.6-sol');
    cleanedFm += '\nreasoning_effort: ultra';
  } else if (/^\s*reasoning_effort\s*:/m.test(cleanedFm) ||
             (/^\s*model\s*:/m.test(cleanedFm) && !/^model:\s*inherit\s*$/m.test(cleanedFm))) {
    throw new Error(`[agents-sync] ${name}: override de alto raciocínio fora da allowlist`);
  }
  const receipt = CODEX_HIGH_REASONING.has(name)
    ? `\n> **Invocação Codex obrigatória:** crie o agente isolado com \`fork_turns: "none"\`, ` +
      `\`model: "gpt-5.6-sol"\` e \`reasoning_effort: "ultra"\`. O artefato final deve incluir recibo ` +
      `\`agent_id · role · runtime=codex · model=gpt-5.6-sol · reasoning_effort=ultra\`; este arquivo sozinho não prova a execução.\n`
    : '';
  return `---\n${cleanedFm}\n---\n\n${PREAMBLE(rel)}${receipt}\n${body}`.replace(/\n+$/, '\n');
}

/**
 * Papéis citados na TABELA do índice do espelho (`.agents/agents/README.md`): primeira célula
 * entre crases de uma linha de tabela. Menções em prosa não contam — o índice normativo é a tabela.
 */
export function citedRoles(readmeRaw) {
  const roles = new Set();
  for (const line of readmeRaw.replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(/^\|\s*`([A-Za-z0-9][A-Za-z0-9._-]*)`\s*\|/);
    if (m) roles.add(m[1]);
  }
  return roles;
}

export function runSync() {
if (!existsSync(SRC)) {
  console.error(`[agents-sync] origem não encontrada: .claude/agents`);
  process.exit(2);
}

const files = listAgentFiles(SRC);
if (files.length === 0) {
  console.error('[agents-sync] nenhum agente em .claude/agents');
  process.exit(2);
}

const expected = new Set(files);
const dstFiles = listAgentFiles(DST);
// Arquivo do espelho que não vem da origem e não está na allowlist KEEP. NUNCA é apagado.
const orphans = dstFiles.filter((f) => !expected.has(f) && !KEEP.has(f));

if (CHECK) {
  const drift = [];
  for (const f of files) {
    const want = transform(f, readFileSync(join(SRC, f), 'utf8'));
    const to = join(DST, f);
    if (!existsSync(to)) { drift.push(`FALTA no espelho: .agents/agents/${f}`); continue; }
    if (readFileSync(to, 'utf8') !== want) drift.push(`DIVERGE: .agents/agents/${f}`);
  }
  for (const f of orphans) {
    drift.push(`SOBRA no espelho (não existe na origem): .agents/agents/${f} — NÃO foi apagado; registre em agent-orchestration/controle/ (§A2)`);
  }
  // Índice normativo do espelho: precisa existir e não pode citar papel que não existe.
  const readmePath = join(DST, 'README.md');
  if (!existsSync(readmePath)) {
    drift.push('FALTA o índice normativo do espelho: .agents/agents/README.md (sede do protocolo de agentes isolados, §C7)');
  } else {
    const cited = citedRoles(readFileSync(readmePath, 'utf8'));
    const real = new Set(files.map(roleOf));
    if (cited.size === 0) {
      drift.push('.agents/agents/README.md sem tabela de papéis — o índice normativo não pode ficar vazio');
    }
    for (const role of [...cited].sort()) {
      if (!real.has(role)) drift.push(`.agents/agents/README.md cita papel inexistente: \`${role}\` (nenhum arquivo em .claude/agents/**)`);
    }
  }
  if (drift.length === 0) {
    console.log(`[agents-sync] OK — ${files.length} agentes, espelho consistente.`);
    process.exit(0);
  }
  for (const d of drift) console.error(`[agents-sync] ${d}`);
  console.error(`[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.`);
  process.exit(1);
}

// Modo escrita. Fail-closed ANTES de qualquer escrita: nada é apagado e nada é gravado enquanto
// existir arquivo só-espelho. Quem decide o destino dele é o registro em controle/ (§A2), não o script.
if (orphans.length > 0) {
  for (const f of orphans) console.error(`[agents-sync] SÓ NO ESPELHO (não existe na origem): .agents/agents/${f}`);
  console.error('[agents-sync] recusado: o sync NÃO apaga papel do espelho. Traga o papel para .claude/agents/ ou');
  console.error('[agents-sync] registre a divergência em agent-orchestration/controle/ (§A2) antes de removê-lo à mão.');
  process.exit(1);
}

mkdirSync(DST, { recursive: true });
for (const f of files) {
  const out = transform(f, readFileSync(join(SRC, f), 'utf8'));
  const to = join(DST, f);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, out);
}
console.log(`[agents-sync] espelhados ${files.length} agentes de .claude/agents/ -> .agents/agents/ (papéis Codex; README preservado)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runSync();
