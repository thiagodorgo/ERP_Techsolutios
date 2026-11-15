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
  assert.match(job, /^ {10}set -o pipefail\r?$/m);
  assert.match(job, /^ {10}PLAYWRIGHT_JSON_OUTPUT_FILE=playwright-report\/suite\.json npx playwright test -c playwright\.config\.ts --forbid-only --fail-on-flaky-tests\r?$/m);
  assert.match(job, /^ {10}node scripts\/e2e-report-guard\.mjs playwright-report\/suite\.json --modo=suite\r?$/m);
  assert.match(job, /^ {10}E2E_CANARIO=1 PLAYWRIGHT_JSON_OUTPUT_FILE=playwright-report\/controle\.json npx playwright test -c playwright\.config\.ts --project=controle\r?$/m);
  assert.match(job, /^ {10}node scripts\/e2e-report-guard\.mjs playwright-report\/controle\.json --modo=controle\r?$/m);
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
