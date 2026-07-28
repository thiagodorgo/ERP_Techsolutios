#!/usr/bin/env node
// sync-agent-skills.mjs — espelha as skills do Claude Code (.claude/skills/) para o Codex (.agents/skills/).
//
// Contexto: D-INTEROP-CLAUDE-CODEX (2026-07-28). O CLAUDE.md é a fonte da verdade; as skills devem
// funcionar nos DOIS ambientes. O Claude Code descobre skills em `.claude/skills/`; o Codex, em
// `.agents/skills/`. Ambas usam o mesmo formato portátil `SKILL.md` (frontmatter mínimo name+description).
// Sem symlink (problemático no Windows). Este script NÃO toca código do ERP.
//
// Uso:
//   node scripts/sync-agent-skills.mjs            # espelha .claude/skills/ -> .agents/skills/ (cópia)
//   node scripts/sync-agent-skills.mjs --check    # só verifica; sai !=0 se divergir; NÃO escreve nada
//
// Regra: a ORIGEM é `.claude/skills/`; o ESPELHO é `.agents/skills/`. Alterou a skill num lado,
// rode este script (ou replique manualmente) para manter os dois em dia.

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '.claude', 'skills');
const DST = join(ROOT, '.agents', 'skills');
const CHECK = process.argv.includes('--check');

/** Lista recursiva de arquivos (caminhos relativos ao base). */
function listFiles(base) {
  const out = [];
  if (!existsSync(base)) return out;
  for (const entry of readdirSync(base)) {
    const abs = join(base, entry);
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...listFiles(abs).map((p) => join(entry, p)));
    else out.push(entry);
  }
  return out;
}

/** Valida o frontmatter mínimo (name + description) de um SKILL.md. */
function validateSkillMd(absPath) {
  const raw = readFileSync(absPath, 'utf8');
  const fm = raw.startsWith('---') ? raw.slice(3, raw.indexOf('\n---', 3)) : '';
  const hasName = /(^|\n)\s*name\s*:/.test(fm);
  const hasDesc = /(^|\n)\s*description\s*:/.test(fm);
  return { ok: hasName && hasDesc, hasName, hasDesc };
}

if (!existsSync(SRC)) {
  console.error(`[skills-sync] origem não encontrada: ${relative(ROOT, SRC)}`);
  process.exit(2);
}

const srcFiles = listFiles(SRC).sort();
const problems = [];
const drift = [];

// Valida cada SKILL.md da origem.
for (const rel of srcFiles) {
  if (rel.endsWith('SKILL.md')) {
    const v = validateSkillMd(join(SRC, rel));
    if (!v.ok) problems.push(`frontmatter incompleto em .claude/skills/${rel} (name:${v.hasName} description:${v.hasDesc})`);
  }
}

if (CHECK) {
  // Modo verificação: compara conteúdo byte a byte; não escreve.
  const dstFiles = listFiles(DST).sort();
  const srcSet = new Set(srcFiles);
  const dstSet = new Set(dstFiles);
  for (const rel of srcFiles) {
    if (!dstSet.has(rel)) { drift.push(`FALTA no espelho: .agents/skills/${rel}`); continue; }
    if (readFileSync(join(SRC, rel)) .toString() !== readFileSync(join(DST, rel)).toString())
      drift.push(`DIVERGE: .agents/skills/${rel}`);
  }
  for (const rel of dstFiles) if (!srcSet.has(rel)) drift.push(`SOBRA no espelho (não existe na origem): .agents/skills/${rel}`);

  const skills = new Set(srcFiles.map((p) => p.split(/[\\/]/)[0]));
  if (drift.length === 0 && problems.length === 0) {
    console.log(`[skills-sync] OK — ${skills.size} skills, ${srcFiles.length} arquivos, espelho idêntico.`);
    process.exit(0);
  }
  for (const p of problems) console.error(`[skills-sync] PROBLEMA: ${p}`);
  for (const d of drift) console.error(`[skills-sync] ${d}`);
  console.error(`[skills-sync] divergência detectada — rode 'node scripts/sync-agent-skills.mjs' para espelhar.`);
  process.exit(1);
}

// Modo cópia: recria o espelho a partir da origem.
if (problems.length > 0) {
  for (const p of problems) console.error(`[skills-sync] PROBLEMA: ${p}`);
  console.error(`[skills-sync] corrija o frontmatter antes de espelhar.`);
  process.exit(1);
}
if (existsSync(DST)) rmSync(DST, { recursive: true, force: true });
mkdirSync(DST, { recursive: true });
for (const rel of srcFiles) {
  const to = join(DST, rel);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, readFileSync(join(SRC, rel)));
}
const skills = new Set(srcFiles.map((p) => p.split(/[\\/]/)[0]));
console.log(`[skills-sync] espelhadas ${skills.size} skills (${srcFiles.length} arquivos) de .claude/skills/ -> .agents/skills/`);
