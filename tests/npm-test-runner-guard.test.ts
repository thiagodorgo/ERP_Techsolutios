import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { expandTestFiles, parseTapSummary } from "../scripts/run-backend-tests.mjs";

// B-O6R-05 / N1 — guard do runner da suíte (`P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS`).
//
// O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR DE VOLTAR: `npm test` apontava para
// `node --test --import tsx tests/*.test.ts`. No Windows o npm roda o script via `cmd.exe`, que não
// expande glob — o Node recebia a string literal, não achava arquivo nenhum, e a suíte terminava sem
// executar um único teste. Quem media o resultado através de um pipe (`npm test | tail`) lia o código
// de saída do `tail` e via zero: verde vazio.
//
// Duas metades. A primeira exercita as funções PURAS (expansão e leitura do TAP). A segunda —
// acrescentada na frente D do bloco — executa o runner DE VERDADE, `main()` inteira, apontado para
// um diretório de FIXTURE isolado: nunca para `tests/`, logo sem recursão (era por isso que a
// `main()` não tinha uma única linha de teste, e era exatamente ali que morava o risco maior).
//
// O QUE A SEGUNDA METADE EXISTE PARA IMPEDIR: quatro mutações de UMA LINHA no runner sobreviviam à
// suíte inteira — (1) `process.exit(childExit)` virar `process.exit(0)`; (2) o cálculo do código de
// saída virar `0`; (3) a `main()` deixar de chamar o leitor de TAP; (4) a `main()` deixar de chamar
// a expansão. Com qualquer uma delas o job `backend` da CI (que roda `npm test`) ficaria VERDE com
// a suíte VERMELHA — a mesma classe de defeito que este runner nasceu para matar, uma camada acima.
//
// LIMITE DECLARADO (D-007): estes testes provam os guards e a propagação do código de saída contra
// fixtures. A contagem oficial da suíte real continua vindo da execução da bateria, que vai no PR.

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const TESTS_DIR = path.join(REPO_ROOT, "tests");

/** Diretório temporário isolado, sempre removido — §C5 (nada de lixo para o dono varrer). */
function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "erp-runner-guard-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Guard 1 — zero arquivo casado tem de LANÇAR (mata: remover o guard de 0 arquivos)
// ---------------------------------------------------------------------------

test("expandTestFiles: diretório sem *.test.ts LANÇA em vez de devolver lista vazia", () => {
  withTempDir((dir) => {
    // Arquivos que NÃO são teste: o diretório existe e é legível, só não tem suíte.
    fs.writeFileSync(path.join(dir, "leia-me.md"), "não sou teste\n");
    fs.writeFileSync(path.join(dir, "helper.ts"), "export const x = 1;\n");

    assert.throws(
      () => expandTestFiles(dir),
      /nenhum arquivo .* encontrado/i,
      "lista vazia devolvida em silêncio é exatamente o verde vazio que este runner existe para matar",
    );
  });
});

test("expandTestFiles: diretório inexistente LANÇA (não devolve lista vazia)", () => {
  const missing = path.join(REPO_ROOT, "tests-que-nao-existem-b-o6r-05");
  assert.throws(() => expandTestFiles(missing), /não consegui ler o diretório/i);
});

// ---------------------------------------------------------------------------
// Expansão real: determinística, ordenada e não-vazia
// ---------------------------------------------------------------------------

test("expandTestFiles: expansão do tests/ real é não-vazia, ordenada e determinística", () => {
  const first = expandTestFiles(TESTS_DIR);
  const second = expandTestFiles(TESTS_DIR);

  assert.ok(first.length > 0, "o tests/ do repositório não pode expandir para zero arquivo");
  assert.deepEqual(first, second, "duas chamadas seguidas têm de devolver a MESMA ordem");

  const sorted = [...first].sort();
  assert.deepEqual(first, sorted, "a ordem tem de ser estável (sort), não a ordem do sistema de arquivos");

  for (const file of first) {
    assert.ok(file.endsWith(".test.ts"), `${file} não deveria estar na lista`);
  }

  // Este próprio arquivo tem de estar lá — se ele sumisse da expansão, o guard não rodaria.
  assert.ok(
    first.includes(path.join(TESTS_DIR, "npm-test-runner-guard.test.ts")),
    "o guard precisa estar na própria expansão",
  );
});

test("expandTestFiles: a ordem vem do sort, NÃO da ordem do sistema de arquivos", () => {
  // Por que nomes com caixa MISTA: o `tests/` real não distingue as duas ordens — o NTFS já devolve
  // as entradas em ordem alfabética, então remover o `.sort()` passaria despercebido nesta máquina
  // (mutação verificada: sobreviveu). O NTFS ordena ignorando a caixa ("alpha" < "Zebra"), enquanto
  // `Array.sort()` ordena por unidade de código UTF-16 ("Z" 0x5A < "a" 0x61). Os dois discordam aqui,
  // e é essa discordância que torna o `.sort()` observável.
  withTempDir((dir) => {
    fs.writeFileSync(path.join(dir, "alpha.test.ts"), "");
    fs.writeFileSync(path.join(dir, "Zebra.test.ts"), "");

    assert.deepEqual(expandTestFiles(dir), [
      path.join(dir, "Zebra.test.ts"),
      path.join(dir, "alpha.test.ts"),
    ]);
  });
});

test("expandTestFiles: só arquivos — subdiretório terminado em .test.ts é ignorado", () => {
  withTempDir((dir) => {
    fs.mkdirSync(path.join(dir, "pasta.test.ts"));
    fs.writeFileSync(path.join(dir, "real.test.ts"), "");

    assert.deepEqual(expandTestFiles(dir), [path.join(dir, "real.test.ts")]);
  });
});

// ---------------------------------------------------------------------------
// Guard 2 — TAP sem teste executado tem de LANÇAR (mata: remover o guard de 0 testes)
// ---------------------------------------------------------------------------

const TAP_ZERO = ["TAP version 13", "1..0", "# tests 0", "# pass 0", "# fail 0", ""].join("\n");

const TAP_REAL = [
  "TAP version 13",
  "# Subtest: soma",
  "ok 1 - soma",
  "  ---",
  "  duration_ms: 1.2",
  "  ...",
  "1..1",
  "# tests 7",
  "# suites 0",
  "# pass 6",
  "# fail 0",
  "# cancelled 0",
  "# skipped 1",
  "# todo 0",
  "# duration_ms 42.5",
  "",
].join("\n");

test("parseTapSummary: TAP com '# tests 0' LANÇA (processo terminou sem executar teste)", () => {
  assert.throws(() => parseTapSummary(TAP_ZERO), /# tests 0|sem executar/i);
});

test("parseTapSummary: TAP sem a linha '# tests' LANÇA (ilegível é falha, não verde)", () => {
  assert.throws(() => parseTapSummary("TAP version 13\nok 1 - algo\n"), /não consegui ler "# tests"/i);
  assert.throws(() => parseTapSummary(""), /não consegui ler "# tests"/i);
});

test("parseTapSummary: TAP real é ACEITO e as contagens são lidas de verdade", () => {
  const summary = parseTapSummary(TAP_REAL);

  assert.equal(summary.tests, 7);
  assert.equal(summary.pass, 6);
  assert.equal(summary.fail, 0);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.todo, 0);
  assert.equal(summary.cancelled, 0);
});

test("parseTapSummary: ignora linhas indentadas e usa o sumário final", () => {
  // Sub-testes aninhados aparecem indentados; só o bloco de fechamento vale.
  const nested = ["  # tests 0", "  # pass 0", "1..1", "# tests 3", "# pass 3", ""].join("\n");

  assert.equal(parseTapSummary(nested).tests, 3);
});

// ---------------------------------------------------------------------------
// A `main()` — o caminho LIGADO, executado de verdade contra fixtures isoladas
// ---------------------------------------------------------------------------

const RUNNER = path.join(REPO_ROOT, "scripts", "run-backend-tests.mjs");

function writeFixture(dir: string, name: string, body: string[]): void {
  fs.writeFileSync(path.join(dir, name), `${body.join("\n")}\n`, "utf8");
}

const UM_TESTE_QUE_PASSA = [
  'import test from "node:test";',
  'import assert from "node:assert/strict";',
  'test("fixture: passa", () => { assert.equal(1, 1); });',
];

const DOIS_TESTES_QUE_PASSAM = [
  'import test from "node:test";',
  'import assert from "node:assert/strict";',
  'test("fixture: passa a", () => { assert.ok(true); });',
  'test("fixture: passa b", () => { assert.ok(true); });',
];

const UM_TESTE_QUE_FALHA = [
  'import test from "node:test";',
  'import assert from "node:assert/strict";',
  'test("fixture: FALHA de proposito", () => { assert.equal(1, 2); });',
];

type RunnerRun = { readonly status: number | null; readonly stdout: string; readonly stderr: string };

/**
 * Executa `node scripts/run-backend-tests.mjs <alvo>` como processo filho — precedente no repo:
 * `tests/persistent-rbac-middleware.test.ts`. Só assim a `main()` é exercitada: o código de saída
 * do processo é o produto que interessa, e ele não existe dentro deste processo.
 */
function runRunner(target: string, overrides: Record<string, string> = {}): RunnerRun {
  const env: NodeJS.ProcessEnv = { ...process.env, ...overrides };

  // `NODE_TEST_CONTEXT` é posto pelo test runner no ambiente de CADA arquivo de teste. Herdada, ela
  // faz o `node --test` de dentro do runner se julgar um processo-filho do runner de fora e PULAR
  // os arquivos ("run() is being called recursively"), saindo 0 — verde vazio de novo, por outra
  // porta. Em uso real (shell, `npm test`, CI) a variável não existe; aqui ela é removida para
  // reproduzir esse ambiente. O último caso deste arquivo mantém a variável DE PROPÓSITO.
  if (!("NODE_TEST_CONTEXT" in overrides)) {
    delete env.NODE_TEST_CONTEXT;
  }

  const result = spawnSync(process.execPath, [RUNNER, target], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 180_000,
    env,
  });

  assert.equal(result.error, undefined, `o runner não chegou a executar: ${result.error?.message}`);

  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

test("main(): fixture com teste VERMELHO ⇒ o runner sai com status ≠ 0", () => {
  // MUTAÇÕES QUE ESTE CASO MATA: `process.exit(childExit)` → `process.exit(0)`; e o cálculo
  // `const childExit = …` → `0`. Com qualquer uma delas o runner imprime a falha e sai 0 — e a CI,
  // que só olha o código de saída, fica verde com a suíte vermelha.
  withTempDir((dir) => {
    writeFixture(dir, "vermelho.test.ts", UM_TESTE_QUE_FALHA);

    const run = runRunner(dir);

    assert.notEqual(
      run.status,
      0,
      `status 0 com fixture vermelha: ${run.stderr || run.stdout}`,
    );
    assert.match(run.stdout, /not ok 1/, "o TAP do filho tem de chegar à saída do runner");
    assert.match(run.stderr, /fail 1/, "o sumário do runner tem de reportar a falha lida no TAP");
  });
});

test("main(): fixture VERDE ⇒ status 0 e o sumário traz as contagens REAIS lidas do TAP", () => {
  // MUTAÇÃO QUE ESTE CASO MATA: "consertar" o caso anterior saindo sempre 1. E, junto, a mutação de
  // a `main()` deixar de chamar o leitor de TAP: sem ele não há de onde tirar `3 teste(s)`/`pass 3`.
  withTempDir((dir) => {
    writeFixture(dir, "a-dois.test.ts", DOIS_TESTES_QUE_PASSAM);
    writeFixture(dir, "b-um.test.ts", UM_TESTE_QUE_PASSA);

    const run = runRunner(dir);

    assert.equal(run.status, 0, `status ≠ 0 com fixture verde: ${run.stderr || run.stdout}`);
    assert.match(run.stderr, /2 arquivo\(s\)/, "a expansão real tem de contar os dois arquivos");
    assert.match(run.stderr, /3 teste\(s\)/, "as contagens vêm do TAP do processo filho");
    assert.match(run.stderr, /pass 3/);
    assert.match(run.stderr, /fail 0/);
  });
});

test("main(): fixture SEM arquivo de teste ⇒ status 1 e a mensagem do guard de zero arquivos", () => {
  // MUTAÇÃO QUE ESTE CASO MATA: a `main()` deixar de chamar `expandTestFiles` (o guard de zero
  // arquivos continuaria existindo e continuaria testado — só que morto no caminho ligado).
  withTempDir((dir) => {
    fs.writeFileSync(path.join(dir, "leia-me.md"), "sem suíte aqui\n");

    const run = runRunner(dir);

    assert.equal(run.status, 1, `esperava status 1, veio ${run.status}: ${run.stdout}`);
    assert.match(run.stderr, /nenhum arquivo/i);
    assert.doesNotMatch(run.stderr, /teste\(s\)/, "não havia o que executar — não pode haver sumário");
  });
});

test("main(): `node --test` que sai 0 SEM emitir sumário ⇒ o runner recusa o verde", () => {
  // O caminho ligado do guard de TAP, com um ambiente que acontece de verdade: invocado de dentro de
  // um processo de teste (`NODE_TEST_CONTEXT` herdada), o `node --test` PULA os arquivos, não emite
  // `# tests` e sai **0**. Sem a leitura do TAP na `main()`, o runner propagaria esse 0 — nenhum
  // teste executado, exit 0, ninguém avisado. MUTAÇÃO QUE ESTE CASO MATA: a `main()` deixar de
  // chamar `parseTapSummary`.
  withTempDir((dir) => {
    writeFixture(dir, "verde.test.ts", UM_TESTE_QUE_PASSA);

    const run = runRunner(dir, { NODE_TEST_CONTEXT: "child-v8" });

    assert.notEqual(run.status, 0, `o runner aceitou uma execução que não rodou teste nenhum: ${run.stderr}`);
    assert.match(run.stderr, /não consegui ler "# tests"/i);
  });
});
