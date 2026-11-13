import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// B-SAN3-24 (D2 — R-POLITICA-FORA e escopo, A-05 da crítica r1; desenho pela N-01 da crítica r2). Duas partes:
//   (1) a REGRA, como função pura (`scopeViolations`), com casos fixos — roda sempre, em qualquer ramo e na CI: o que
//       está fora do PERMITIDO do PR do B-SAN3-24, e TODO caminho de política de comissão, reprova;
//   (2) o DIFF REAL, só no ramo do bloco (`feat/web-cheques-fechamento`): `git diff --name-only origin/main...HEAD`
//       MAIS o que está na árvore e ainda não foi commitado (alterado ou novo), para a mutação "criar
//       commissions/politicas.ts" ficar vermelha antes do commit. Fora do ramo do bloco (os outros blocos, e a `main`
//       depois do merge), ou sem `origin/main` (o checkout raso da CI busca só `refs/pull/N/merge`), esta parte NÃO
//       usa `t.skip` (o job `backend` tem orçamento de 2 pulos e já os usa — N-01): ela registra o motivo em
//       `t.diagnostic` e passa; o aceite do diff real, então, é este mesmo comando rodado pelo verificador no worktree
//       dele, com a saída anexada (troca declarada no plano v2, §3.4).

const BLOCK_BRANCH = "feat/web-cheques-fechamento";

/** O PERMITIDO do PR do B-SAN3-24 (plano v2 §4: 24-M, 24a, 24b e o registro), como prefixos e nomes exatos. */
export const PERMITTED: readonly (string | RegExp)[] = [
  "docs/claude-code-handoff/screen-refs/cheques-3opcoes.reference.html",
  "docs/claude-code-handoff/screen-refs/fechamento-periodo-3opcoes.reference.html",
  "docs/claude-code-handoff/screen-refs/README.md",
  /^frontend\/src\/modules\/finance\/cheques\//,
  /^frontend\/src\/modules\/finance\/period-closes\//,
  "frontend/src/App.tsx",
  "frontend/src/layouts/appSidebarNav.ts",
  "src/modules/navigation/navigation.registry.ts",
  "src/modules/financial-period-closes/financial-period-close.controller.ts",
  "frontend/src/modules/appearance/appearance.registry.ts",
  "frontend/tests/aparencia-registro.guard.test.ts",
  "tests/cheque-title-link.test.ts",
  "tests/navigation-menu.test.ts",
  "frontend/package.json",
  "docs/revisoes/SAN3/PLANO_SAN3.md",
  /^tests\/b-san3-24-[a-z0-9-]+\.test\.ts$/,
  /^frontend\/tests\/b-san3-24-[a-z0-9.-]+\.test\.tsx?$/,
  /^docs\/revisoes\/SAN3\/B-SAN3-24-[A-Za-z0-9-]+\.md$/,
  /^agent-orchestration\//,
];

/** R-POLITICA-FORA: a política de comissão não entra, nem por um arquivo vazio. */
export const FORBIDDEN: readonly RegExp[] = [/^frontend\/src\/modules\/finance\/commissions\//, /^src\/modules\/commissions\//];

export function scopeViolations(paths: readonly string[]): string[] {
  return paths
    .map((path) => path.replaceAll("\\", "/").trim())
    .filter((path) => path !== "")
    .filter((path) => FORBIDDEN.some((rule) => rule.test(path)) || !PERMITTED.some((rule) => (typeof rule === "string" ? rule === path : rule.test(path))));
}

test("D2 a regra: o que o plano permite passa; fora do PERMITIDO e qualquer caminho de política de comissão reprova", () => {
  assert.deepEqual(
    scopeViolations([
      "frontend/src/modules/finance/cheques/ChequesPage.tsx",
      "frontend/src/modules/finance/period-closes/period-keys.ts",
      "src/modules/navigation/navigation.registry.ts",
      "tests/b-san3-24-cheques-front-contract.test.ts",
      "frontend/tests/b-san3-24-cheques-live.test.tsx",
      "docs/revisoes/SAN3/B-SAN3-24-dev.md",
      "agent-orchestration/controle/pendencias.md",
    ]),
    [],
  );
  assert.deepEqual(scopeViolations(["frontend/src/modules/finance/commissions/politicas.ts"]), ["frontend/src/modules/finance/commissions/politicas.ts"]);
  assert.deepEqual(scopeViolations(["src/modules/commissions/commission.routes.ts"]), ["src/modules/commissions/commission.routes.ts"]);
  assert.deepEqual(scopeViolations(["prisma/schema.prisma", "Kpis/kpis-latest.json", "frontend/src/services/api/client.ts"]), [
    "prisma/schema.prisma",
    "Kpis/kpis-latest.json",
    "frontend/src/services/api/client.ts",
  ]);
  assert.deepEqual(scopeViolations(["frontend/src/modules/finance/pages/FinanceiroPage.tsx", "src/modules/cheques/cheque.dto.ts"]), [
    "frontend/src/modules/finance/pages/FinanceiroPage.tsx",
    "src/modules/cheques/cheque.dto.ts",
  ]);
});

function git(args: readonly string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function lines(output: string | null): string[] {
  return (output ?? "").split(/\r?\n/).filter((line) => line.trim() !== "");
}

test("D2 o diff real do ramo do bloco (commitado + árvore) está dentro do PERMITIDO", (t) => {
  const branch = process.env.GITHUB_HEAD_REF || (git(["rev-parse", "--abbrev-ref", "HEAD"]) ?? "").trim();
  if (branch !== BLOCK_BRANCH) {
    t.diagnostic(`ramo "${branch || "desconhecido"}" não é o do bloco (${BLOCK_BRANCH}): só a regra (teste acima) roda aqui.`);
    return;
  }
  if (git(["rev-parse", "--verify", "--quiet", "origin/main"]) === null || git(["merge-base", "origin/main", "HEAD"]) === null) {
    t.diagnostic("sem origin/main nem base comum (checkout raso da CI): o aceite do diff real é o comando rodado pelo verificador.");
    return;
  }
  const committed = lines(git(["diff", "--name-only", "origin/main...HEAD"]));
  const tree = lines(git(["diff", "--name-only", "HEAD"]));
  const untracked = lines(git(["ls-files", "--others", "--exclude-standard"]));
  const all = [...new Set([...committed, ...tree, ...untracked])].sort();
  t.diagnostic(`${all.length} caminhos medidos (${committed.length} commitados, ${tree.length} alterados na árvore, ${untracked.length} novos)`);
  assert.ok(committed.length > 0, "o ramo do bloco tem diff contra origin/main");
  assert.deepEqual(scopeViolations(all), []);
});
