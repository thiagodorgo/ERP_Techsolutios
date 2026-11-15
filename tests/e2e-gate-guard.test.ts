import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const e2eRoot = join(root, "tests", "e2e");
const declaration = /^[ \t]*(?:test|setup)\(\s*(["'`])((?:\\.|(?!\1).)*)\1\s*,/gm;
const forbiddenWord = /\b(skip|fixme|fail|slow|only|configure)\b/;

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

function workflowJob(source: string, name: string): string {
  const match = source.match(new RegExp(`^  ${name}:\\r?\\n([\\s\\S]*?)(?=^  [a-z][a-z0-9-]*:\\r?$|\\Z)`, "m"));
  assert.ok(match, `job ${name} ausente`);
  return match[0];
}

test("S1/S2: a suíte não contém máscaras nem formas que esvaziam a prova", () => {
  for (const path of filesBelow(e2eRoot).filter((path) => /\.(spec|setup)\.ts$/.test(path))) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, forbiddenWord, relative(root, path));
    assert.doesNotMatch(source, /\bcatch\b/, relative(root, path));
    assert.doesNotMatch(source, /(^|\n)[ \t]*expect\.poll\(/, relative(root, path));
    assert.doesNotMatch(source, /\bsetTimeout\s*\(/, relative(root, path));
    assert.doesNotMatch(source, /\bretries\s*:/, relative(root, path));
  }
});

test("S3: contagem presa é exatamente preparo=1 e chromium=13", () => {
  const expected = JSON.parse(readFileSync(join(e2eRoot, "contagem-esperada.json"), "utf8")) as Record<string, number>;
  assert.deepEqual(expected, { preparo: 1, chromium: 13 });

  const actual = { preparo: 0, chromium: 0 };
  for (const path of filesBelow(e2eRoot).filter((path) => /\.(spec|setup)\.ts$/.test(path) && !path.includes(`${sep}controle${sep}`))) {
    const project = path.endsWith(".setup.ts") ? "preparo" : "chromium";
    actual[project] += [...readFileSync(path, "utf8").matchAll(declaration)].length;
  }
  assert.deepEqual(actual, expected);
});

test("S4: canário é byte-equivalente ao sentinela aprovado", () => {
  const expected = `import { expect, test } from "@playwright/test";\n\ntest("vermelho-controle prova que a esteira propaga falha", async ({ page }) => {\n  await page.goto("/login");\n  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();\n  await expect(\n    page.getByText("e2e-canario: texto que nao existe"),\n    "e2e-canario: sentinela",\n  ).toBeVisible({ timeout: 3_000 });\n});\n`;
  const actual = readFileSync(join(e2eRoot, "controle", "vermelho-controle.spec.ts"), "utf8").replaceAll("\r\n", "\n");
  assert.equal(actual, expected);
});

test("Y1-Y4: job e2e é obrigatório, literal e sem filtros", () => {
  const workflow = readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8");
  const job = workflowJob(workflow, "e2e");
  assert.doesNotMatch(job, /continue-on-error|\|\| true|--pass-with-no-tests/);
  assert.equal((job.match(/^ {6}if:/gm) ?? []).length, 1);
  assert.match(job, /^ {6}if: failure\(\)$/m);
  assert.match(job, /^ {8}set -o pipefail$/m);
  assert.match(job, /^ {8}PLAYWRIGHT_JSON_OUTPUT_FILE=playwright-report\/suite\.json npx playwright test -c playwright\.config\.ts --forbid-only --fail-on-flaky-tests$/m);
  assert.match(job, /^ {8}node scripts\/e2e-report-guard\.mjs playwright-report\/suite\.json --modo=suite$/m);
  assert.match(job, /^ {8}E2E_CANARIO=1 PLAYWRIGHT_JSON_OUTPUT_FILE=playwright-report\/controle\.json npx playwright test -c playwright\.config\.ts --project=controle$/m);

  const config = readFileSync(join(root, "playwright.config.ts"), "utf8");
  assert.match(config, /workers:\s*1/);
  assert.match(config, /process\.env\.E2E_CANARIO/);
  const chromium = config.match(/name:\s*["']chromium["'][\s\S]*?\n\s*},/m)?.[0] ?? "";
  assert.doesNotMatch(chromium, /\bgrep(?:Invert)?\s*:/);
});

