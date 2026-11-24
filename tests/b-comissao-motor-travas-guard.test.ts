import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");
const commRoot = path.join(srcRoot, "modules", "commissions");
const PRISMA_REPO_REL = "src/modules/commissions/commission-prisma.repository.ts";

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

type CodeLine = { readonly file: string; readonly line: number; readonly text: string };

function readCodeLines(files: readonly string[], override?: { readonly file: string; readonly extraLine: string }): CodeLine[] {
  const linesOut: CodeLine[] = [];
  for (const file of files) {
    const rel = relative(file);
    const rawLines = readFileSync(file, "utf8").split(/\r?\n/);
    if (override && override.file === rel) {
      rawLines.push(override.extraLine);
    }
    rawLines.forEach((text, index) => {
      if (!isCommentLine(text)) {
        linesOut.push({ file: rel, line: index + 1, text: text.trim() });
      }
    });
  }
  return linesOut;
}

const srcFiles = listFilesRecursive(srcRoot, [".ts"]);
const commFiles = listFilesRecursive(commRoot, [".ts"]);

function evaluateTravasGuard(override?: { readonly file: string; readonly extraLine: string }) {
  const commLines = readCodeLines(commFiles, override);
  const allSrcLines = readCodeLines(srcFiles, override);

  const forNoKeyLines = commLines.filter((l) => /FOR NO KEY UPDATE/.test(l.text));
  const rateLockLines = allSrcLines.filter((l) => l.text.includes("/* commission_rate_lock */"));
  const payeeLockLines = allSrcLines.filter((l) => l.text.includes("/* commission_payee_lock */"));
  const ensurePolicyLines = allSrcLines.filter((l) => l.text.includes("/* commission_engine_policy_ensure */"));
  const tenantFromLines = commLines.filter((l) => /FROM\s+"?tenants"?\b/i.test(l.text));

  return {
    forNoKeyLines,
    rateLockLines,
    payeeLockLines,
    ensurePolicyLines,
    tenantFromLines,
  };
}

test("[E1.6-7 / E1.6.1-Q1.4] travas-guard: as 2 linhas FOR NO KEY UPDATE e os 3 marcadores vivem só em commission-prisma.repository.ts, e 0 linhas tocam FROM tenants", () => {
  const { forNoKeyLines, rateLockLines, payeeLockLines, ensurePolicyLines, tenantFromLines } = evaluateTravasGuard();

  assert.equal(forNoKeyLines.length, 2, `esperadas exatamente 2 linhas FOR NO KEY UPDATE em commissions/** (achei ${forNoKeyLines.length})`);
  assert.ok(
    forNoKeyLines.every((l) => l.file === PRISMA_REPO_REL),
    `todas as linhas FOR NO KEY UPDATE devem viver em ${PRISMA_REPO_REL}`,
  );
  assert.ok(
    forNoKeyLines.some((l) => /FROM\s+commission_policies\b/.test(l.text) && l.text.includes("/* commission_rate_lock */")),
    "falta a trava da regra em commission_policies com /* commission_rate_lock */",
  );
  assert.ok(
    forNoKeyLines.some((l) => /FROM\s+operator_profiles\b/.test(l.text) && l.text.includes("/* commission_payee_lock */")),
    "falta a trava do guincheiro em operator_profiles com /* commission_payee_lock */",
  );

  assert.equal(rateLockLines.length, 1, "marcador /* commission_rate_lock */ deve aparecer 1 vez em src/**");
  assert.equal(payeeLockLines.length, 1, "marcador /* commission_payee_lock */ deve aparecer 1 vez em src/**");
  assert.equal(ensurePolicyLines.length, 1, "marcador /* commission_engine_policy_ensure */ deve aparecer 1 vez em src/**");
  assert.deepEqual(tenantFromLines, [], "nenhum SQL de src/modules/commissions/** pode ler ou travar tenants (Q1)");
});

test("[M80] travas-um-lar: uma 2ª linha com FROM operator_profiles e FOR NO KEY UPDATE /* commission_payee_lock */ em arquivo de serviço derruba a guarda", () => {
  // B-COMISSAO:travas-um-lar
  const mutated = evaluateTravasGuard({
    file: "src/modules/commissions/commission.service.ts",
    extraLine:
      "await this.client.$queryRaw`SELECT id FROM operator_profiles WHERE tenant_id = ${tenantId}::uuid AND user_id = ${payeeUserId}::uuid FOR NO KEY UPDATE /* commission_payee_lock */`;",
  });
  assert.equal(mutated.forNoKeyLines.length, 3);
  assert.equal(mutated.payeeLockLines.length, 2);
  assert.ok(mutated.forNoKeyLines.some((l) => l.file !== PRISMA_REPO_REL));
});
