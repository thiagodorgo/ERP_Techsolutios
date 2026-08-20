import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// -----------------------------------------------------------------------------------------------
// B-O6R-02 (Ω6R-DIN-008, plano §D3) — GUARD DE VARREDURA da trava de período financeiro.
// A chave do advisory lock tem UM lar: src/database/financial-period-lock.ts. Uma segunda emissão
// de `pg_advisory*` em qualquer outro arquivo de src/** é exatamente o drift que reabriria o
// DIN-008 (duas expressões de chave que divergem em silêncio → close e writer deixam de conflitar).
// Idioma de tests/auth-invariant-guards.test.ts (guard 3 — GUC/set_config só em rls.ts).
// Escopo deliberado: src/** apenas — scripts/ e tests/helpers usam um advisory lock PRÓPRIO
// (ROLE_CATALOG_ADVISORY_LOCK, catálogo de RBAC) que não é a chave de período, e os testes -db
// tomam a trava de propósito (via import do próprio helper) para provar o conflito.
// -----------------------------------------------------------------------------------------------

const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");
const LOCK_HOME = "src/database/financial-period-lock.ts";

function listFilesRecursive(dir: string, extensions: readonly string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      out.push(...listFilesRecursive(full, extensions));
      continue;
    }
    if (extensions.some((ext) => full.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function relative(file: string): string {
  return path.relative(repoRoot, file).replace(/\\/g, "/");
}

function isCommentLine(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*") || trimmed.startsWith("--");
}

function findMatches(
  files: readonly string[],
  pattern: RegExp,
): Array<{ readonly file: string; readonly line: number; readonly text: string }> {
  const matches: Array<{ file: string; line: number; text: string }> = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((text, index) => {
      if (!isCommentLine(text) && pattern.test(text)) {
        matches.push({ file: relative(file), line: index + 1, text: text.trim() });
      }
    });
  }
  return matches;
}

const srcFiles = listFilesRecursive(srcRoot, [".ts"]);

test("guard — pg_advisory em src/** vive SÓ em src/database/financial-period-lock.ts", () => {
  const outsiders = findMatches(srcFiles, /pg_advisory/).filter((match) => match.file !== LOCK_HOME);
  assert.deepEqual(
    outsiders,
    [],
    "advisory lock fora do lar único emite uma SEGUNDA expressão de chave — é o drift que reabre o DIN-008",
  );
});

test("guard — o lar único emite os DOIS modos com a MESMA expressão de chave (hashtext tenant:period)", () => {
  const content = readFileSync(path.join(repoRoot, LOCK_HOME), "utf8");

  // A chave é BYTE-IDÊNTICA à histórica do close: hashtext(`${tenantId}:${period}`). O modo shared
  // (writers) e o exclusivo (close/reopen) diferem SÓ no nome da função — nunca na expressão da chave.
  const sharedCalls = content.match(/pg_advisory_xact_lock_shared\(hashtext\(\$\{`\$\{tenantId\}:\$\{period\}`\}\)\)/g) ?? [];
  const exclusiveCalls =
    content.match(/pg_advisory_xact_lock\(hashtext\(\$\{`\$\{tenantId\}:\$\{period\}`\}\)\)/g) ?? [];

  assert.equal(sharedCalls.length, 1, "exatamente UMA emissão do modo shared (writers)");
  assert.equal(exclusiveCalls.length, 1, "exatamente UMA emissão do modo exclusivo (close/reopen)");
});
