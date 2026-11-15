import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// B-ASS-11 (F6, Emenda 1 §8.1 e Emenda 1.1 §4.2 e §5.1) — o escopo da tela "Minha assinatura":
//   T-G1 nenhum arquivo da pasta `settings/subscription/` nem o `UsagePie.tsx` contém `usage-history`, `/platform/`, `R$`,
//        `currency` ou `tenantId=`; nenhum contém `new Date(` com argumento; a pasta inteira tem 1 `new Date()`, no hook;
//   T-G2 `my-subscription.types.ts` não declara campo de dinheiro;
//   T-G3 (1) a REGRA do §4.1 como função pura, com casos fixos (roda sempre); (2) o DIFF REAL, só no ramo do bloco:
//        `origin/main...HEAD` mais a árvore sem commit. Fora do ramo, ou sem `origin/main` (o checkout raso da CI), registra
//        o motivo em `t.diagnostic` e passa, sem `t.skip`; aí o aceite é o comando do §4.1 rodado pelo revisor. Molde:
//        `tests/b-san3-24-escopo.test.ts`. O ramo: a Emenda 1.1 cita `feat/my-subscription-view`; o orquestrador nomeou
//        `feat/ass-minha-assinatura-62t` (os dois valem).

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, "..");
const FOLDER = path.join(FRONTEND, "src/modules/settings/subscription");
const USAGE_PIE = path.join(FRONTEND, "src/components/charts/UsagePie.tsx");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const target = path.join(dir, name);
    return statSync(target).isDirectory() ? sourceFiles(target) : /\.(ts|tsx)$/.test(name) ? [target] : [];
  });
}

const FILES = [...sourceFiles(FOLDER), USAGE_PIE];
const rel = (file: string) => path.relative(FRONTEND, file).replaceAll("\\", "/");

test("T-G1 a pasta e o UsagePie: sem tendência, plataforma, R$, moeda, tenantId=; sem new Date( com argumento; 1 new Date(), no hook", () => {
  assert.ok(FILES.length >= 10, `arquivos medidos: ${FILES.length}`);
  const hits: string[] = [];
  const bareNow: string[] = [];
  for (const file of FILES) {
    const source = readFileSync(file, "utf8");
    for (const token of ["usage-history", "/platform/", "R$", "currency", "tenantId="]) if (source.includes(token)) hits.push(`${rel(file)}: ${token}`);
    for (const match of source.matchAll(/new Date\(([^)]*)\)/g)) {
      if (match[1].trim() !== "") hits.push(`${rel(file)}: new Date(${match[1]})`);
      else bareNow.push(rel(file));
    }
  }
  assert.deepEqual(hits, []);
  assert.deepEqual(bareNow, ["src/modules/settings/subscription/useMySubscription.ts"], "exatamente 1 new Date(), no hook");
});

test("T-G2 my-subscription.types.ts não declara campo de dinheiro", () => {
  const source = readFileSync(path.join(FOLDER, "my-subscription.types.ts"), "utf8").replace(/\/\/.*$/gm, "");
  const fields = [...source.matchAll(/(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:/g)].map((match) => match[1]);
  assert.ok(fields.length >= 15, `campos lidos: ${fields.length}`);
  assert.deepEqual(fields.filter((field) => /(price|amount|cost|total|margin|value|cents)/i.test(field)), []);
});

/** O PERMITIDO do §7.1 (Emenda 1) com o acréscimo do §4.1 (Emenda 1.1), na letra do comando. */
export const PERMIT_T =
  /^(frontend\/src\/modules\/settings\/subscription\/[^\s]+|frontend\/src\/components\/charts\/(UsagePie\.tsx|index\.ts)|frontend\/src\/App\.tsx|frontend\/src\/layouts\/appSidebarNav\.ts|frontend\/src\/modules\/appearance\/appearance\.registry\.ts|frontend\/src\/styles\/app\.css|frontend\/package\.json|frontend\/tests\/ass-11-[a-z0-9.-]+\.test\.tsx?|frontend\/tests\/aparencia-registro\.guard\.test\.ts|docs\/claude-code-handoff\/screen-refs\/(minha-assinatura-3opcoes\.reference\.html|README\.md)|docs\/(navigation-matrix|frontend-screens)\.md|COMPONENT_LIBRARY\.md|docs\/revisoes\/ASSINATURA\/B-ASS-11-dev\.md|agent-orchestration\/codex\/comandos\/B-ASS-11-minha-assinatura\.md|agent-orchestration\/controle\/(pendencias|pendencias-indice|decisoes)\.md|agent-orchestration\/docs\/status-geral\.md|docs\/revisoes\/SAN3\/PLANO_SAN3\.md)$/;

export function scopeViolations(paths: readonly string[]): string[] {
  return paths
    .map((item) => item.replaceAll("\\", "/").trim())
    .filter((item) => item !== "")
    .filter((item) => !PERMIT_T.test(item));
}

test("T-G3 (1) a regra: o PERMITIDO passa; src/**, tenantNavigation.ts, lockfile, prisma/** e teste fora de ass-11-* reprovam", () => {
  assert.deepEqual(
    scopeViolations([
      "frontend/src/modules/settings/subscription/MySubscriptionPage.tsx",
      "frontend/src/modules/settings/subscription/components/MySubscriptionViewC.tsx",
      "frontend/src/components/charts/UsagePie.tsx",
      "frontend/src/components/charts/index.ts",
      "frontend/src/App.tsx",
      "frontend/src/layouts/appSidebarNav.ts",
      "frontend/src/modules/appearance/appearance.registry.ts",
      "frontend/src/styles/app.css",
      "frontend/package.json",
      "frontend/tests/ass-11-escopo.guard.test.ts",
      "frontend/tests/ass-11-minha-assinatura-live.test.tsx",
      "frontend/tests/aparencia-registro.guard.test.ts",
      "docs/claude-code-handoff/screen-refs/minha-assinatura-3opcoes.reference.html",
      "docs/claude-code-handoff/screen-refs/README.md",
      "docs/navigation-matrix.md",
      "docs/frontend-screens.md",
      "COMPONENT_LIBRARY.md",
      "docs/revisoes/ASSINATURA/B-ASS-11-dev.md",
      "agent-orchestration/codex/comandos/B-ASS-11-minha-assinatura.md",
      "agent-orchestration/controle/pendencias.md",
      "agent-orchestration/controle/pendencias-indice.md",
      "agent-orchestration/controle/decisoes.md",
      "agent-orchestration/docs/status-geral.md",
      "docs/revisoes/SAN3/PLANO_SAN3.md",
    ]),
    [],
  );
  const dirty = [
    "src/modules/subscription-billing/statements/subscription-view.ts",
    "src/modules/navigation/navigation.registry.ts",
    "frontend/src/navigation/tenantNavigation.ts",
    "frontend/package-lock.json",
    "prisma/schema.prisma",
    "frontend/tests/minha-assinatura.test.tsx",
    "frontend/src/components/charts/TrendChart.tsx",
    ".github/workflows/ci.yml",
    "Kpis/kpis-latest.json",
  ];
  assert.deepEqual(scopeViolations(dirty), dirty);
});

const BLOCK_BRANCHES: ReadonlySet<string> = new Set(["feat/my-subscription-view", "feat/ass-minha-assinatura-62t"]);

function git(args: readonly string[], cwd: string = FRONTEND): string | null {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

const lines = (output: string | null) => (output ?? "").split(/\r?\n/).filter((line) => line.trim() !== "");

test("T-G3 (2) o diff real do ramo do bloco (commitado + árvore) está dentro do PERMITIDO", (t) => {
  const branch = process.env.GITHUB_HEAD_REF || (git(["rev-parse", "--abbrev-ref", "HEAD"]) ?? "").trim();
  if (!BLOCK_BRANCHES.has(branch)) {
    t.diagnostic(`ramo "${branch || "desconhecido"}" não é o do bloco: só a regra (teste acima) roda aqui.`);
    return;
  }
  const top = (git(["rev-parse", "--show-toplevel"]) ?? "").trim();
  if (!top || git(["rev-parse", "--verify", "--quiet", "origin/main"], top) === null || git(["merge-base", "origin/main", "HEAD"], top) === null) {
    t.diagnostic("sem origin/main nem base comum (checkout raso da CI): o aceite do diff real é o comando do §4.1 rodado pelo revisor.");
    return;
  }
  const committed = lines(git(["diff", "--name-only", "origin/main...HEAD"], top));
  const tree = lines(git(["diff", "--name-only", "HEAD"], top));
  const untracked = lines(git(["ls-files", "--others", "--exclude-standard"], top));
  const all = [...new Set([...committed, ...tree, ...untracked])].sort();
  t.diagnostic(`${all.length} caminhos medidos (${committed.length} commitados, ${tree.length} alterados na árvore, ${untracked.length} novos)`);
  assert.ok(committed.length > 0, "o ramo do bloco tem diff contra origin/main");
  assert.deepEqual(scopeViolations(all), []);
});
