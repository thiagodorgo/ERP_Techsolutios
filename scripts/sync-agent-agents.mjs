#!/usr/bin/env node
// sync-agent-agents.mjs — espelha os agentes especializados do Claude Code (.claude/agents/) para o
// Codex (.agents/agents/), como PAPÉIS portáteis de junta.
//
// Contexto: D-INTEROP-CLAUDE-CODEX (2026-07-28). O nível alto das rodadas vem da JUNTA de agentes
// (planejador → dev → avaliador+secops+crítico+dba votando, com ciclos de reprovação — §C7). Esses
// agentes são definições do Claude Code (`.claude/agents/*.md`). Este script os espelha para
// `.agents/agents/*.md` num formato que o Codex consome: MESMO corpo (o system-prompt do papel,
// VERBATIM — os poderes de VETO/adversarial não podem sofrer drift), frontmatter portátil (name +
// description + `model:` quando o papel o fixa; só `tools:` sai) e um PREÂMBULO de
// orientação Codex. A emulação sequencial pelo mesmo agente foi revogada pela decisão do dono
// D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO: sem agentes isolados, a entrega bloqueia. Sem symlink. NÃO toca ERP.
//
// Uso:
//   node scripts/sync-agent-agents.mjs            # espelha/transforma .claude/agents/ -> .agents/agents/
//   node scripts/sync-agent-agents.mjs --check    # só verifica; sai !=0 se divergir; NÃO escreve nada

import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '.claude', 'agents');
const DST = join(ROOT, '.agents', 'agents');
const CHECK = process.argv.includes('--check');
// arquivos do espelho que NÃO são agentes-fonte e devem ser preservados (índice/protocolo de agentes isolados).
const KEEP = new Set(['README.md']);

const PREAMBLE = (name) =>
  `> **Papel para o Codex** — espelho de \`.claude/agents/${name}.md\` (D-INTEROP-CLAUDE-CODEX). Adote as\n` +
  `> instruções abaixo como o seu system-prompt ao atuar como **${name}** na junta (§C7 do \`AGENTS.md\`).\n` +
  `> A FUNÇÃO e os poderes — inclusive **VETO**, quando o papel indicar — são idênticos aos do Claude Code.\n` +
  `> Onde o texto citar mecanismos do Claude Code (ferramenta Agent, caminhos \`.claude/\`, invocação de\n` +
  `> subagentes), use o equivalente do Codex. As alçadas incompatíveis exigem agentes isolados distintos;\n` +
  `> emulação sequencial pelo mesmo agente é inválida (D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO).`;

/** Transforma um .claude/agents/<name>.md em conteúdo .agents/agents/<name>.md (papel Codex). */
function transform(name, rawInput) {
  const raw = rawInput.replace(/\r\n/g, '\n'); // normaliza CRLF (Windows) -> LF antes de parsear
  // frontmatter entre o 1o '---' e o próximo '---'
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    // sem frontmatter: só prepende o preâmbulo
    return `${PREAMBLE(name)}\n\n${raw.trimStart()}`;
  }
  const fm = m[1];
  const body = m[2].replace(/^\n+/, '');
  // Remove `tools:` — a lista de ferramentas é mecanismo do Claude Code e não tem equivalente no Codex.
  // PRESERVA `model:`: não é detalhe de ferramenta quando fixado por decisão. O esforço `ultra` fica no
  // corpo e deve ser passado explicitamente pelo orquestrador, pois não há schema local comprovado para
  // `reasoning_effort:` no frontmatter. Apagar `model:` faria o espelho perder a regra em silêncio.
  const cleanedFm = fm
    .split('\n')
    .filter((line) => !/^\s*tools\s*:/.test(line))
    .join('\n')
    .trim();
  return `---\n${cleanedFm}\n---\n\n${PREAMBLE(name)}\n\n${body}`.replace(/\n+$/, '\n');
}

if (!existsSync(SRC)) {
  console.error(`[agents-sync] origem não encontrada: .claude/agents`);
  process.exit(2);
}

const files = readdirSync(SRC).filter((f) => f.endsWith('.md')).sort();
if (files.length === 0) {
  console.error('[agents-sync] nenhum agente em .claude/agents');
  process.exit(2);
}

if (CHECK) {
  const drift = [];
  const dstFiles = existsSync(DST) ? readdirSync(DST).filter((f) => f.endsWith('.md')) : [];
  const expected = new Set(files);
  for (const f of files) {
    const want = transform(f.replace(/\.md$/, ''), readFileSync(join(SRC, f), 'utf8'));
    const to = join(DST, f);
    if (!existsSync(to)) { drift.push(`FALTA no espelho: .agents/agents/${f}`); continue; }
    if (readFileSync(to, 'utf8') !== want) drift.push(`DIVERGE: .agents/agents/${f}`);
  }
  for (const f of dstFiles) if (!expected.has(f) && !KEEP.has(f)) drift.push(`SOBRA no espelho (não existe na origem): .agents/agents/${f}`);
  if (drift.length === 0) {
    console.log(`[agents-sync] OK — ${files.length} agentes, espelho consistente.`);
    process.exit(0);
  }
  for (const d of drift) console.error(`[agents-sync] ${d}`);
  console.error(`[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.`);
  process.exit(1);
}

mkdirSync(DST, { recursive: true });
const expected = new Set(files);
// remove agentes obsoletos (não estão mais na origem), PRESERVANDO o README e outros KEEP.
for (const f of readdirSync(DST)) {
  if (f.endsWith('.md') && !expected.has(f) && !KEEP.has(f)) rmSync(join(DST, f), { force: true });
}
for (const f of files) {
  const out = transform(f.replace(/\.md$/, ''), readFileSync(join(SRC, f), 'utf8'));
  writeFileSync(join(DST, f), out);
}
console.log(`[agents-sync] espelhados ${files.length} agentes de .claude/agents/ -> .agents/agents/ (papéis Codex; README preservado)`);
