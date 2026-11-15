import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { after, test } from "node:test";

type Json = Record<string, unknown>;

const root = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "e2e-report-guard-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

function declarations(): Array<{ project: string; file: string; title: string }> {
  const source = readFileSync(join(root, "tests", "e2e", "critical-flows.spec.ts"), "utf8");
  const titles = [...source.matchAll(/^[ \t]*test\(\s*(["'`])((?:\\.|(?!\1).)*)\1\s*,/gm)].map((match) => match[2]);
  return [
    { project: "preparo", file: "apoio/preparo.setup.ts", title: "prepara sessao do administrador demo" },
    ...titles.map((title) => ({ project: "chromium", file: "critical-flows.spec.ts", title })),
  ];
}

function validReport(): Json {
  const items = declarations();
  return {
    config: {
      shard: null,
      projects: [
        { name: "preparo", repeatEach: 1, retries: 1, timeout: 45_000 },
        { name: "chromium", repeatEach: 1, retries: 1, timeout: 45_000 },
      ],
    },
    errors: [],
    suites: items.map((item) => ({
      file: item.file,
      specs: [{
        title: item.title,
        file: item.file,
        tests: [{
          projectName: item.project,
          expectedStatus: "passed",
          status: "expected",
          annotations: [],
          timeout: 45_000,
          results: [{ status: "passed", retry: 0, annotations: [], steps: [] }],
        }],
      }],
    })),
    stats: { expected: items.length, unexpected: 0, flaky: 0, skipped: 0 },
  };
}

function run(report: Json, mode = "suite"): ReturnType<typeof spawnSync> {
  const path = join(scratch, `${mode}-${Math.random().toString(16).slice(2)}.json`);
  writeFileSync(path, JSON.stringify(report));
  return spawnSync(process.execPath, [join(root, "scripts", "e2e-report-guard.mjs"), path, `--modo=${mode}`], {
    cwd: root,
    encoding: "utf8",
  });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

test("G1-G11: relatório completo e exato fica verde", () => {
  const result = run(validReport());
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /suite preparo=1 chromium=13 expected=14 unexpected=0 flaky=0 skipped=0/);
});

// Conserto do A3 da pré-revisão do #575: cada caso exige a linha VERMELHO da PRÓPRIA regra, e não só "alguma" linha.
// Os casos se sobrepõem (um teste ausente também dispara G3 e G7), e sem isto desligar G2, G3 ou G4 deixava o TD3 verde.
// A G10 lê o disco real (S1–S4); quem a prova é o TD2.
const VERMELHO = "e2e-guard: VERMELHO — ";
for (const [name, mutate, expected] of [
  ["G1 erros globais", (report: Json) => { (report.errors as unknown[]).push({ message: "boom" }); }, [/G1: erros globais no relatório: 1 /]],
  ["G2 teste ausente", (report: Json) => { (report.suites as unknown[]).pop(); (report.stats as Json).expected = 13; }, [/G2: projeto chromium: esperado=13 no_disco=13 rodou=12/]],
  ["G3 teste repetido", (report: Json) => { (report.suites as unknown[]).push(clone((report.suites as unknown[])[1])); (report.stats as Json).expected = 15; }, [/G3: teste repetido no relatório/]],
  ["G3 título trocado", (report: Json) => { ((report.suites as Json[])[1].specs as Json[])[0].title = "titulo-que-nao-existe-no-disco"; }, [/G3: declarado e NÃO rodou \(filtrado\?\): chromium › critical-flows\.spec\.ts › /, /G3: rodou e não está na enumeração do disco: chromium › critical-flows\.spec\.ts › titulo-que-nao-existe-no-disco/]],
  ["G4 projeto estranho", (report: Json) => { (((report.suites as Json[])[1].specs as Json[])[0].tests as Json[])[0].projectName = "estranho"; }, [/G4: projeto fora do número preso: estranho/]],
  ["G5 expectedStatus mascarado", (report: Json) => { (((report.suites as Json[])[1].specs as Json[])[0].tests as Json[])[0].expectedStatus = "failed"; }, [/G5: expectedStatus=failed em chromium/]],
  ["G6 anotação proibida", (report: Json) => { ((((report.suites as Json[])[1].specs as Json[])[0].tests as Json[])[0].annotations as unknown[]).push({ type: "slow" }); }, [/G6: anotação proibida "slow" em chromium/]],
  ["G7 agregado mentiroso", (report: Json) => { (report.stats as Json).skipped = 1; }, [/G7: stats expected=14 \(devido 14\) unexpected=0 flaky=0 skipped=1/]],
  ["G8 shard", (report: Json) => { (report.config as Json).shard = { current: 1, total: 2 }; }, [/G8: shard ligado/]],
  ["G8 timeout do teste", (report: Json) => { (((report.suites as Json[])[1].specs as Json[])[0].tests as Json[])[0].timeout = 45_001; }, [/G8: timeout=45001 no teste chromium/]],
  ["G9 orçamento de login", (report: Json) => { const testItem = (((report.suites as Json[])[1].specs as Json[])[0].tests as Json[])[0]; (testItem.results as Json[])[0].annotations = Array.from({ length: 6 }, () => ({ type: "e2e-login", description: "admin.demo@example.com" })); }, [/G9: orçamento de login estourado: 6 logins pela tela de admin\.demo@example\.com/]],
  ["G11 passo pulado", (report: Json) => { const testItem = (((report.suites as Json[])[1].specs as Json[])[0].tests as Json[])[0]; (testItem.results as Json[])[0].steps = [{ title: "mutacao", annotations: [{ type: "skip" }] }]; }, [/G11: passo pulado em chromium .* mutacao/]],
] as const) {
  test(`${name} fica vermelho`, () => {
    const report = validReport();
    mutate(report);
    const result = run(report);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    for (const rule of expected) assert.match(result.stdout, new RegExp(VERMELHO + rule.source), `${name}: falta a linha da regra\n${result.stdout}`);
  });
}

function canaryReport(error: string, status = "failed"): Json {
  return {
    config: { projects: [{ name: "controle", repeatEach: 1, retries: 0, timeout: 45_000 }] },
    errors: [],
    suites: [{ file: "controle/vermelho-controle.spec.ts", specs: [{ title: "vermelho-controle prova que a esteira propaga falha", tests: [{ projectName: "controle", expectedStatus: "passed", status: "unexpected", results: [{ status, retry: 0, errors: [{ message: error }] }] }] }] }],
    stats: { expected: 0, unexpected: 1, flaky: 0, skipped: 0 },
  };
}

test("canário falhando pelo sentinela fica verde", () => {
  const result = run(canaryReport("Error: e2e-canario: sentinela\nresto"), "controle");
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /o canário falhou, como devido/);
});

test("canário que passa ou falha por ambiente fica vermelho", () => {
  const passed = canaryReport("", "passed");
  (passed.stats as Json).expected = 1;
  (passed.stats as Json).unexpected = 0;
  const passedResult = run(passed, "controle");
  assert.notEqual(passedResult.status, 0);
  assert.match(passedResult.stdout, new RegExp(VERMELHO + "stats do canário fora do devido"));
  assert.match(passedResult.stdout, new RegExp(VERMELHO + "o canário terminou com status=passed"));
  const environment = run(canaryReport("Error: page.goto: net::ERR_CONNECTION_REFUSED"), "controle");
  assert.notEqual(environment.status, 0);
  assert.match(environment.stdout, new RegExp(VERMELHO + "a falha do canário não começa pelo sentinela"));
});
