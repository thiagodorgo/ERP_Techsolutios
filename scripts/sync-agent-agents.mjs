#!/usr/bin/env node
// sync-agent-agents.mjs — espelha os agentes especializados do Claude Code (.claude/agents/) para o
// Codex (.agents/agents/), como PAPÉIS portáteis de junta.
//
// Contexto: D-INTEROP-CLAUDE-CODEX (2026-07-28). O nível alto das rodadas vem da JUNTA de agentes
// (planejador → dev → avaliador+secops+crítico+dba votando, com ciclos de reprovação — §C7). Esses 24
// agentes são definições do Claude Code (`.claude/agents/*.md`). Este script os espelha para
// `.agents/agents/*.md` num formato que o Codex consome: MESMO corpo (o system-prompt do papel,
// VERBATIM — os poderes de VETO/adversarial não podem sofrer drift), frontmatter portátil (name +
// description + `model:` quando o papel o fixa; só `tools:` sai) e um PREÂMBULO de orientação Codex.
// Se o Codex não puder criar subagentes isolados, ele EMULA o papel adotando o arquivo como seu
// system-prompt e registra o voto na ata (docs/juntas/). Sem symlink. NÃO toca código do ERP.
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
// arquivos do espelho que NÃO são agentes-fonte e devem ser preservados (índice/protocolo de emulação).
const KEEP = new Set(['README.md']);

const PREAMBLE = (name) =>
  `> **Papel para o Codex** — espelho de \`.claude/agents/${name}.md\` (D-INTEROP-CLAUDE-CODEX). Adote as\n` +
  `> instruções abaixo como o seu system-prompt ao atuar como **${name}** na junta (§C7 do \`AGENTS.md\`).\n` +
  `> A FUNÇÃO e os poderes — inclusive **VETO**, quando o papel indicar — são idênticos aos do Claude Code.\n` +
  `> Onde o texto citar mecanismos do Claude Code (ferramenta Agent, caminhos \`.claude/\`, invocação de\n` +
  `> subagentes), use o equivalente do Codex. Se você não puder criar subagentes isolados, **EMULE** este\n` +
  `> papel num passe adversarial próprio e registre o voto na ata (\`docs/juntas/\`).`;

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
  // PRESERVA `model:`: ele não é detalhe de ferramenta, é REGRA DE EXECUÇÃO do papel. O `planejador-mestre`
  // roda em Fable por contrato (D-PLANEJADOR-MODELO-FABLE), obrigatoriamente na revalidação de código
  // corrigido; se a sincronização apagasse a linha, o espelho Codex perderia a regra EM SILÊNCIO a cada
  // execução — foi exatamente o que aconteceu na primeira tentativa de aplicar a decisão.
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

// Recursivo DE PROPOSITO: o listing raso ja deixou `especialistas/` fora do
// espelho E do --check dois ciclos seguidos — o guard dizia "espelho consistente"
// enquanto faltavam agentes. Caminhos relativos com '/', estaveis entre SOs.
function listMd(root, prefix = '') {
  const out = [];
  for (const e of readdirSync(root, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listMd(join(root, e.name), rel));
    else if (e.name.endsWith('.md')) out.push(rel);
  }
  return out.sort();
}

const files = listMd(SRC);
if (files.length === 0) {
  console.error('[agents-sync] nenhum agente em .claude/agents');
  process.exit(2);
}

if (CHECK) {
  const drift = [];
  const dstFiles = existsSync(DST) ? listMd(DST) : [];
  const expected = new Set(files);
  for (const f of files) {
    const want = transform(f.replace(/\.md$/, ''), readFileSync(join(SRC, f), 'utf8'));
    const to = join(DST, f);
    if (!existsSync(to)) { drift.push(`FALTA no espelho: .agents/agents/${f}`); continue; }
    // Comparação EOL-NEUTRA — e SÓ eol. O `want` já sai normalizado do `transform` (a l.39 faz
    // CRLF -> LF na FONTE); aqui o alvo lido do disco passa pela MESMA regra antes de comparar.
    // Sem essa simetria o guard MENTE em checkout fresco sob `core.autocrlf=true`: o Windows
    // materializa CRLF nas duas pontas e TODO arquivo "diverge" com os blobs idênticos
    // (P-REG-S0-GUARD-FALSO-VERMELHO). Nada de trim, case ou colapso de espaço: qualquer outra
    // diferença de byte — palavra trocada, espaço interno, BOM, linha a mais — continua reprovando.
    if (readFileSync(to, 'utf8').replace(/\r\n/g, '\n') !== want) drift.push(`DIVERGE: .agents/agents/${f}`);
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
for (const f of listMd(DST)) {
  if (!expected.has(f) && !KEEP.has(f)) rmSync(join(DST, f), { force: true });
}
for (const f of files) {
  const out = transform(f.replace(/\.md$/, ''), readFileSync(join(SRC, f), 'utf8'));
  mkdirSync(dirname(join(DST, f)), { recursive: true });
  writeFileSync(join(DST, f), out);
}
console.log(`[agents-sync] espelhados ${files.length} agentes de .claude/agents/ -> .agents/agents/ (papéis Codex; README preservado)`);
