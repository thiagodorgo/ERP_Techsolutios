// B-SAN3-10-E2E-CI (item 42) — TD2, o guarda estático do e2e, no `npm test` do job `backend`.
// As regras são as de `scripts/e2e-guard-regras.mjs`, o mesmo módulo do guarda do relatório (plano v2 §3.5). Este
// teste-dono guarda os LITERAIS: o piso do número preso, a regra de enumeração, as regras de texto e o canário. Afrouxar
// o módulo, ou baixar o número, exige mexer aqui, à vista da junta.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";

import {
  ANOTACOES_PROIBIDAS,
  ARQUIVO_CANARIO,
  PISO_CONTAGEM,
  REGRA_DECLARACAO,
  REGRAS_TEXTO,
  SENTINELA,
  TETO_LOGIN_POR_EMAIL,
  TETO_TIMEOUT_MS,
  TEXTO_CANARIO,
  enumerarDisco,
  lerContagem,
  regrasEstaticas,
} from "../scripts/e2e-guard-regras.mjs";

const root = process.cwd();
const e2eRoot = join(root, "tests", "e2e");

const PISO_LITERAL = { preparo: 1, chromium: 13 };
const DECLARACAO_LITERAL = String.raw`^[ \t]*(?:test|setup)\(\s*(["'` + "`" + String.raw`])((?:\\.|(?!\1).)*)\1\s*,`;
const REGRAS_TEXTO_LITERAIS = [
  String.raw`\b(skip|fixme|fail|slow|only|configure)\b`,
  String.raw`\bcatch\b`,
  String.raw`^\s*expect\.poll\(`,
  String.raw`\bsetTimeout\s*\(`,
  String.raw`\bretries\s*:`,
];
const CANARIO_LITERAL = `import { expect, test } from "@playwright/test";\n\ntest("vermelho-controle prova que a esteira propaga falha", async ({ page }) => {\n  await page.goto("/login");\n  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();\n  await expect(\n    page.getByText("e2e-canario: texto que nao existe"),\n    "e2e-canario: sentinela",\n  ).toBeVisible({ timeout: 3_000 });\n});\n`;

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

function workflowJob(source: string, name: string): string {
  const match = source.match(new RegExp(`^  ${name}:\\r?\\n([\\s\\S]*?)(?=^  [a-z][a-z0-9-]*:\\r?$|(?![\\s\\S]))`, "m"));
  assert.ok(match, `job ${name} ausente`);
  return match[0];
}

// Y3 por igualdade (plano v2 §3.1; conserto do A2 da pré-revisão do #575): o passo vigiado tem só `name` e `run: |`, e o
// corpo do `run` é EXATAMENTE a lista de linhas do plano. Uma linha a mais (um `exit 0`, por exemplo) ou a menos é vermelho.
const PASSO_SUITE = "E2E — a suíte inteira, sem filtro, sem pulo e sem flaky";
const CORPO_SUITE = [
  "set -o pipefail",
  "PLAYWRIGHT_JSON_OUTPUT_FILE=playwright-report/suite.json npx playwright test -c playwright.config.ts --forbid-only --fail-on-flaky-tests",
  "node scripts/e2e-report-guard.mjs playwright-report/suite.json --modo=suite",
];
const PASSO_CANARIO = "Vermelho-controle (o canário TEM de falhar)";
const CORPO_CANARIO = [
  "set +e",
  "E2E_CANARIO=1 PLAYWRIGHT_JSON_OUTPUT_FILE=playwright-report/controle.json npx playwright test -c playwright.config.ts --project=controle",
  "rc=$?",
  "set -e",
  'test "$rc" -ne 0 || { echo "e2e-guard: o canário PASSOU — a esteira não propaga falha"; exit 1; }',
  "node scripts/e2e-report-guard.mjs playwright-report/controle.json --modo=controle",
];

function stepLines(job: string, name: string): string[] {
  const lines = job.replace(/\r/g, "").split("\n");
  const header = `      - name: ${name}`;
  const starts = lines.flatMap((line, index) => (line === header ? [index] : []));
  assert.equal(starts.length, 1, `o passo "${name}" tem de aparecer 1 vez no job e2e; aparece ${starts.length}`);
  const step: string[] = [];
  for (let index = starts[0]; index < lines.length; index += 1) {
    if (index > starts[0] && /^ {0,6}\S/.test(lines[index])) break;
    step.push(lines[index]);
  }
  while (step.length > 0 && step[step.length - 1].trim() === "") step.pop();
  return step;
}

function assertStepBody(job: string, name: string, expected: readonly string[]): void {
  const step = stepLines(job, name);
  assert.equal(step[1], "        run: |", `o passo "${name}" tem só name e run: |`);
  const body = step.slice(2);
  for (const line of body) assert.match(line, /^ {10}/, `linha fora do corpo do run em "${name}": ${JSON.stringify(line)}`);
  assert.deepEqual(body.map((line) => line.slice(10)), [...expected], `o corpo do passo "${name}" difere do plano (§3.1)`);
}

test("o módulo de regras tem os literais do teste-dono", () => {
  assert.deepEqual({ ...PISO_CONTAGEM }, PISO_LITERAL);
  assert.equal(REGRA_DECLARACAO.source, DECLARACAO_LITERAL);
  assert.equal(REGRA_DECLARACAO.flags, "gm");
  assert.deepEqual(REGRAS_TEXTO.map((item: { regra: RegExp }) => item.regra.source), REGRAS_TEXTO_LITERAIS);
  assert.deepEqual([...ANOTACOES_PROIBIDAS].sort(), ["fail", "fixme", "skip", "slow"]);
  assert.equal(TETO_LOGIN_POR_EMAIL, 5);
  assert.equal(TETO_TIMEOUT_MS, 45_000);
  assert.equal(SENTINELA, "Error: e2e-canario: sentinela");
  assert.equal(TEXTO_CANARIO, CANARIO_LITERAL);
});

test("S1/S2: nenhuma linha de tests/e2e/** tem máscara, catch, poll sem await, setTimeout ou retries", () => {
  const files = filesBelow(e2eRoot);
  assert.ok(files.length >= 6, `tests/e2e tem ${files.length} arquivos`);
  for (const path of files) {
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line, index) => {
        for (const literal of REGRAS_TEXTO_LITERAIS) {
          assert.doesNotMatch(line, new RegExp(literal), `${relative(root, path)}:${index + 1}`);
        }
      });
  }
  assert.deepEqual(regrasEstaticas().filter((item: string) => /^S[12]:/.test(item)), []);
});

test("S3: o número preso é o do disco e não está abaixo do piso literal", () => {
  const pinned = lerContagem() as Record<string, number>;
  assert.deepEqual(Object.keys(pinned).sort(), Object.keys(PISO_LITERAL).sort());
  for (const [project, floor] of Object.entries(PISO_LITERAL)) {
    assert.ok(Number.isInteger(pinned[project]) && pinned[project] >= floor, `${project}=${pinned[project]} abaixo do piso ${floor}`);
  }

  const onDisk = { preparo: 0, chromium: 0 };
  const declaration = new RegExp(DECLARACAO_LITERAL, "gm");
  for (const path of filesBelow(e2eRoot).filter((path) => /\.(spec|setup)\.ts$/.test(path) && !path.includes(`${sep}controle${sep}`))) {
    const project = path.endsWith(".setup.ts") ? "preparo" : "chromium";
    onDisk[project] += [...readFileSync(path, "utf8").matchAll(declaration)].length;
  }
  assert.deepEqual(onDisk, pinned);
  assert.equal(enumerarDisco().length, pinned.preparo + pinned.chromium);
  assert.deepEqual(regrasEstaticas().filter((item: string) => item.startsWith("S3")), []);
});

test("S4: a pasta controle/ tem só o canário, igual ao texto aprovado", () => {
  const controle = filesBelow(join(e2eRoot, "controle")).map((path) => relative(e2eRoot, path).split(sep).join("/"));
  assert.deepEqual(controle, ["controle/vermelho-controle.spec.ts"]);
  assert.equal(ARQUIVO_CANARIO, join(e2eRoot, "controle", "vermelho-controle.spec.ts"));
  const actual = readFileSync(join(e2eRoot, "controle", "vermelho-controle.spec.ts"), "utf8").replaceAll("\r\n", "\n");
  assert.equal(actual, CANARIO_LITERAL);
  assert.deepEqual(regrasEstaticas().filter((item: string) => item.startsWith("S4")), []);
});

test("Y1-Y4: job e2e é obrigatório, literal e sem filtros", () => {
  const workflow = readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8");
  const job = workflowJob(workflow, "e2e");
  assert.doesNotMatch(job, /continue-on-error|\|\| true|--pass-with-no-tests/);
  assert.equal((job.match(/^\s*if:/gm) ?? []).length, 1);
  assert.match(job, /^ {8}if: failure\(\)\r?$/m);
  assertStepBody(job, PASSO_CANARIO, CORPO_CANARIO);
  assertStepBody(job, PASSO_SUITE, CORPO_SUITE);
  // P2 = SIM (decisão do dono, 14/11): a imagem só sai com o e2e verde.
  assert.match(workflowJob(workflow, "docker"), /^ {4}needs: \[backend, backend-postgres, frontend, e2e\]\r?$/m);

  const config = readFileSync(join(root, "playwright.config.ts"), "utf8");
  assert.match(config, /workers:\s*1,/);
  assert.match(config, /process\.env\.E2E_CANARIO/);
  assert.equal((config.match(/\["\.\/tests\/e2e\/apoio\/relator-passos\.mjs"\]/g) ?? []).length, 2, "o relator de passos (G11) nas duas listas de relatores");
  const chromium = config.match(/name:\s*["']chromium["'][\s\S]*?\n\s*},/m)?.[0] ?? "";
  assert.ok(chromium.length > 0, "projeto chromium não achado no config");
  assert.doesNotMatch(chromium, /\bgrep(?:Invert)?\s*:/);
  assert.doesNotMatch(config, /\bgrepInvert\s*:/);
});

// C1-1 da J-575: o ENVELOPE do job `e2e` por lista de permissão. O texto dos 2 corpos não basta: quem os executa
// (`defaults`, `shell:`) e a lista de passos também são do plano (§3.1). Chave, passo ou `defaults` a mais é vermelho.
const CHAVES_DO_TOPO = ["name", "on", "concurrency", "jobs"];
const CHAVES_DO_JOB = ["runs-on", "timeout-minutes", "env", "services", "steps"];
const AMBIENTE_DO_JOB = [
  "DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public",
  "REDIS_URL: redis://localhost:6379",
  "CORE_SAAS_PERSISTENCE: prisma",
  "JWT_SECRET: dev-only-change-me",
  "JWT_EXPIRES_IN: 15m",
  "LOG_LEVEL: warn",
];
const PASSOS_DO_JOB = [
  "Checkout",
  "Setup Node.js",
  "Install dependencies",
  "Install frontend dependencies",
  "Generate Prisma Client",
  "Apply migrations (Prisma)",
  "Provision database (seed)",
  "Build web (compiled mode)",
  "Install Chromium for Playwright",
  PASSO_CANARIO,
  PASSO_SUITE,
  "Diagnóstico (só na falha)",
];

test("Y5: o envelope do job e2e é o do plano (lista de permissão)", () => {
  const workflow = readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8").replace(/\r/g, "");
  const topo = workflow.split("\n").filter((line) => /^[^\s#]/.test(line)).map((line) => line.replace(/:.*$/, ""));
  assert.deepEqual(topo, CHAVES_DO_TOPO, "chaves do topo do workflow (nenhum defaults, nenhum env no topo)");

  const lines = workflowJob(workflow, "e2e").split("\n");
  assert.equal(lines[0], "  e2e:");
  const chaves = lines.filter((line) => /^ {4}[^\s#]/.test(line));
  assert.deepEqual(chaves.map((line) => line.trim().replace(/:.*$/, "")), CHAVES_DO_JOB, "chaves do job (nenhum defaults, nenhum if, nenhuma outra)");
  assert.ok(chaves.includes("    runs-on: ubuntu-24.04"), "runs-on");
  assert.ok(chaves.includes("    timeout-minutes: 15"), "timeout-minutes");

  const inicioEnv = lines.indexOf("    env:");
  const ambiente: string[] = [];
  for (let index = inicioEnv + 1; index < lines.length && !/^ {0,4}\S/.test(lines[index]); index += 1) {
    if (lines[index].trim() !== "") ambiente.push(lines[index]);
  }
  assert.deepEqual(ambiente, AMBIENTE_DO_JOB.map((line) => `      ${line}`), "o env do job é exatamente o do plano");

  const itens = lines.filter((line) => /^ {6}- /.test(line));
  assert.ok(itens.every((line) => line.startsWith("      - name: ")), "todo passo começa por name:");
  assert.deepEqual(itens.map((line) => line.slice("      - name: ".length)), PASSOS_DO_JOB, "a lista de passos do job, em nomes e em ordem");
  assert.equal(lines.filter((line) => /^\s+shell\s*:/.test(line)).length, 0, "nenhum shell: no job");
});

// C1-2 (a parte que entrou) e C3-A1 da J-575: o config que a CI de fato carrega. Ele é importado com CI ligado e sem
// E2E_PORTAL_PORT, e não lido como texto.
test("Y6: na CI o config tem o relator json, o chromium casa com os testes do disco e o portal não usa a 3100", async () => {
  const antes = { CI: process.env.CI, E2E_PORTAL_PORT: process.env.E2E_PORTAL_PORT, E2E_CANARIO: process.env.E2E_CANARIO };
  process.env.CI = "1";
  delete process.env.E2E_PORTAL_PORT;
  delete process.env.E2E_CANARIO;
  try {
    const { default: config } = (await import("../playwright.config.ts")) as { default: Record<string, unknown> };
    const reporter = config.reporter as Array<[string, unknown?]>;
    assert.ok(Array.isArray(reporter) && reporter.some((item) => Array.isArray(item) && item[0] === "json"), "o relator json na CI");

    const projects = config.projects as Array<{ name: string; testMatch?: unknown; testIgnore?: unknown }>;
    assert.deepEqual(projects.map((project) => project.name), ["preparo", "chromium"], "sem E2E_CANARIO, só preparo e chromium");
    const casa = (padrao: unknown, caminho: string) => {
      const lista = Array.isArray(padrao) ? padrao : [padrao];
      assert.ok(lista.length > 0 && lista.every((item) => item instanceof RegExp), "testMatch/testIgnore têm de ser RegExp");
      // como o Playwright: no Windows ele testa também a forma do caminho com "/"
      const formas = [caminho, caminho.split(sep).join("/")];
      return lista.some((item) => formas.some((forma) => (item as RegExp).test(forma)));
    };
    const arquivosDoDisco = (projeto: string) => [...new Set(enumerarDisco().filter((item: { projeto: string }) => item.projeto === projeto).map((item: { arquivo: string }) => item.arquivo))];
    for (const projeto of projects) {
      const esperados = arquivosDoDisco(projeto.name);
      assert.ok(esperados.length > 0, `o disco tem testes do projeto ${projeto.name}`);
      const todos = filesBelow(e2eRoot).map((path) => relative(e2eRoot, path).split(sep).join("/"));
      const selecionados = todos.filter((arquivo) => {
        const absoluto = join(e2eRoot, arquivo);
        return casa(projeto.testMatch, absoluto) && !(projeto.testIgnore !== undefined && casa(projeto.testIgnore, absoluto));
      });
      assert.deepEqual(selecionados.sort(), esperados.sort(), `o projeto ${projeto.name} seleciona exatamente os arquivos com os testes dele`);
    }
    const contados = enumerarDisco().filter((item: { projeto: string }) => item.projeto === "chromium").length;
    assert.equal(contados, (lerContagem() as Record<string, number>).chromium, "os arquivos do chromium têm os testes do número preso");

    const api = (config.webServer as Array<{ env?: Record<string, string> }>)[0];
    const portal = api.env?.PORTAL_PORT;
    assert.ok(portal !== undefined && /^\d+$/.test(portal), "o webServer da API define PORTAL_PORT");
    assert.ok(!["3000", "3100", "5173"].includes(portal), `PORTAL_PORT=${portal} não pode ser porta da pilha viva`);
    assert.notEqual(portal, api.env?.PORT, "o portal numa porta diferente da API");
  } finally {
    for (const [chave, valor] of Object.entries(antes)) {
      if (valor === undefined) delete process.env[chave];
      else process.env[chave] = valor;
    }
  }
});
