import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { expandTestFiles } from "../scripts/run-backend-tests.mjs";

test("adaptador importa somente node:* e caminhos relativos", async () => {
  const source = await readFile("src/modules/evidence/clamav-scanner.ts", "utf8");
  const patterns = [
    /from\s+["']([^"']+)["']/g,
    /^\s*import\s+["']([^"']+)["']/gm,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
  ];
  const specifiers = patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1]!));
  assert(specifiers.length > 0);
  assert.deepEqual(
    specifiers.filter((specifier) => !specifier.startsWith("node:") && !specifier.startsWith("./") && !specifier.startsWith("../")),
    [],
  );
});

test("ClamAvEvidenceScanner só é instanciado na factory", async () => {
  const files = [
    "src/modules/evidence/clamav-scanner.ts",
    "src/modules/evidence/evidence-scanner.factory.ts",
    "src/modules/evidence/upload-gate.ts",
  ];
  const found: string[] = [];
  for (const file of files) {
    if ((await readFile(file, "utf8")).includes("new ClamAvEvidenceScanner(")) found.push(file);
  }
  assert.deepEqual(found, ["src/modules/evidence/evidence-scanner.factory.ts"]);
});

test("integração real fica fora do npm test, e nenhuma suíte avreal do npm test declara pulo", async () => {
  const discovered = expandTestFiles("tests").map((file: string) => file.split(path.sep).join("/"));
  assert.deepEqual(discovered.filter((file: string) => /clamd/.test(file)), []);
  const avreal = discovered.filter((file: string) => /^tests\/avreal-/.test(file));
  assert(avreal.length >= 8, `esperava ao menos 8 suítes avreal, achei ${avreal.length}`);
  for (const file of avreal) {
    assert.doesNotMatch(await readFile(file, "utf8"), /\{\s*skip\s*:/, file);
  }
});

test("job antivirus falha quando a integração falha e gera o cliente Prisma", async () => {
  const workflow = (await readFile(".github/workflows/ci.yml", "utf8")).replace(/\r\n/g, "\n");
  const job = workflow.slice(workflow.indexOf("\n  antivirus:\n"));
  const end = job.slice(1).search(/\n  [a-zA-Z_-]+:\n/);
  const body = end === -1 ? job : job.slice(0, end + 1);
  assert.match(body, /npm run db:generate/, "sem o cliente Prisma, o caso HTTP real não carrega");
  assert.match(body, /set -o pipefail\s+node scripts\/avreal-integration\.mjs[^\n]*\| tee antivirus\.tap/, "sem pipefail, o tee esconde a falha");
  assert.match(body, /test "\$failed" -eq 0/, "o guard precisa reprovar teste falho, não só pulo");
});

test("job antivirus executa o arquivo real de integração", async () => {
  const wrapper = await readFile("scripts/avreal-integration.mjs", "utf8");
  assert.match(wrapper, /"tests\/avreal-clamd\.integration\.ts"/);
  assert.match(await readFile("tests/avreal-clamd.integration.ts", "utf8"), /PING real responde PONG/);
  assert.match(await readFile(".github/workflows/ci.yml", "utf8"), /node scripts\/avreal-integration\.mjs/);
});

test("nenhum arquivo rastreado traz o EICAR inteiro, nem na forma do fonte nem na de execução", () => {
  const BS = String.fromCharCode(92);
  const head = "X5O!P%@AP[4" + BS + "PZX54(P^)7CC)7}";
  const tail = "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
  assert.equal(head.length, 27);
  assert.equal(tail.length, 41);
  const headInSource = head.replace(BS, BS + BS); // como o literal fica escrito num fonte TS/JS
  const result = spawnSync("git", ["grep", "-l", "-F", "-e", headInSource + tail, "-e", head + tail], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 1, `EICAR inteiro versionado em: ${result.stdout || result.stderr}`);
});

test("integração real: ramo saudável + limites declara exatamente 8 casos; script e CI exigem 8", async () => {
  const source = (await readFile("tests/avreal-clamd.integration.ts", "utf8")).replace(/\r\n/g, "\n");
  const start = source.search(/^\} else \{$/m);
  assert.notEqual(start, -1, "ramo saudável (`} else {`) não encontrado");
  assert.equal((source.slice(start).match(/^\s*test\(/gm) ?? []).length, 8);
  assert.match(await readFile("scripts/avreal-integration.mjs", "utf8"), /EXPECTED_TESTS/);
  assert.match((await readFile(".github/workflows/ci.yml", "utf8")).replace(/\r\n/g, "\n"), /test "\$tests" -eq 8/);
});
