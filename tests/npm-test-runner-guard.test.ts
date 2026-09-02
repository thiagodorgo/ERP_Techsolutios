import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  describePersistenceMode,
  evaluateDbSkipBudget,
  expandTestFiles,
  findSilentTestFiles,
  parseTapSummary,
  resolvePersistenceMode,
} from "../scripts/run-backend-tests.mjs";

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
// TERCEIRA FRENTE (2026-08-16, `P-SUITE-NAO-SUPORTA-ENV-PRISMA`): o MODO DE PERSISTÊNCIA que o runner
// entrega ao processo filho. O `.env` desta máquina impõe `prisma`, o `env.ts` congela esse snapshot no
// import, e a suíte — desenhada para memória — ia ao Postgres procurar fixture que não existe lá: 90
// falsos vermelhos. A CI nunca viu isso porque EXPORTA `memory`. Os casos abaixo aferem o modo de dentro
// da fixture, isto é, do processo que de fato roda o teste: declarar um modo na saída e passar outro ao
// filho é a mentira que este arquivo não pode deixar passar.
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
// Modo de persistência — funções PURAS (`P-SUITE-NAO-SUPORTA-ENV-PRISMA`)
//
// O runner resolve `CORE_SAAS_PERSISTENCE` e o passa no ambiente do processo filho porque o `env.ts`
// congela o snapshot do `.env` NO IMPORT: escrever `process.env` dentro do arquivo de teste chega tarde
// (o ESM hasteia os imports estáticos). Sem isto, o `.env` desta máquina (`prisma`) sequestra a suíte e
// produz 90 falhas que não são defeito — enquanto a CI, que EXPORTA `memory`, fica verde.
// ---------------------------------------------------------------------------

test("resolvePersistenceMode: variável ausente ⇒ o runner assume `memory` (o mesmo da CI)", () => {
  assert.deepEqual(resolvePersistenceMode({}), { mode: "memory", origin: "runner" });
});

test("resolvePersistenceMode: variável exportada ⇒ RESPEITADA, inclusive `prisma`", () => {
  // Rodar a suíte em `prisma` de propósito é requisito: é assim que se vê o estado real da dívida.
  assert.deepEqual(resolvePersistenceMode({ CORE_SAAS_PERSISTENCE: "prisma" }), {
    mode: "prisma",
    origin: "ambiente",
  });
  assert.deepEqual(resolvePersistenceMode({ CORE_SAAS_PERSISTENCE: "memory" }), {
    mode: "memory",
    origin: "ambiente",
  });
});

test("resolvePersistenceMode: valor desconhecido é REPASSADO, não corrigido em silêncio", () => {
  // Quem valida o valor é o `env.ts` (enum Zod), e ele tem de quebrar ALTO. Um runner que trocasse
  // `banana` por `memory` transformaria um erro de digitação numa execução que mente sobre o próprio modo.
  assert.deepEqual(resolvePersistenceMode({ CORE_SAAS_PERSISTENCE: "banana" }), {
    mode: "banana",
    origin: "ambiente",
  });
});

test("resolvePersistenceMode: valor vazio conta como NÃO exportado", () => {
  // Repassar string vazia não respeitaria escolha nenhuma: derrubaria o enum do `env.ts` e a suíte
  // inteira morreria com um erro que não é sobre teste.
  assert.deepEqual(resolvePersistenceMode({ CORE_SAAS_PERSISTENCE: "" }), {
    mode: "memory",
    origin: "runner",
  });
  assert.deepEqual(resolvePersistenceMode({ CORE_SAAS_PERSISTENCE: "   " }), {
    mode: "memory",
    origin: "runner",
  });
});

test("describePersistenceMode: a linha diz o modo E a procedência (as duas são distinguíveis)", () => {
  const doRunner = describePersistenceMode({ mode: "memory", origin: "runner" });
  const doAmbiente = describePersistenceMode({ mode: "prisma", origin: "ambiente" });

  assert.match(doRunner, /CORE_SAAS_PERSISTENCE=memory/);
  assert.match(doRunner, /padrão do runner/i);
  assert.doesNotMatch(doRunner, /herdado do ambiente/i);

  assert.match(doAmbiente, /CORE_SAAS_PERSISTENCE=prisma/);
  assert.match(doAmbiente, /herdado do ambiente/i);
  assert.doesNotMatch(doAmbiente, /padrão do runner/i);
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
function runRunner(target: string, overrides: Record<string, string | undefined> = {}): RunnerRun {
  const env: NodeJS.ProcessEnv = { ...process.env, ...overrides };

  // Override com `undefined` REMOVE a variável do ambiente do filho. É o único jeito de testar o ramo
  // "não veio exportada": quando esta própria suíte roda sob o runner, `CORE_SAAS_PERSISTENCE` JÁ está
  // no ambiente (posta pelo runner de fora) — herdá-la faria o caso testar o ramo errado e passar por
  // acidente.
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key];
    }
  }

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

// ---------------------------------------------------------------------------
// Modo de persistência — o caminho LIGADO: o que o PROCESSO FILHO recebe de verdade
//
// A fixture afere `process.env.CORE_SAAS_PERSISTENCE` de dentro do processo de teste. É a única prova
// que interessa: declarar o modo na saída e passar outro (ou nenhum) ao filho seria exatamente o tipo de
// mentira que este arquivo existe para impedir.
// ---------------------------------------------------------------------------

/** Fixture que só passa se o modo que CHEGOU ao processo filho for o esperado. */
function fixtureQueAfereModo(esperado: string): string[] {
  return [
    'import test from "node:test";',
    'import assert from "node:assert/strict";',
    'test("fixture: o modo de persistência chegou ao processo filho", () => {',
    `  assert.equal(process.env.CORE_SAAS_PERSISTENCE, ${JSON.stringify(esperado)});`,
    "});",
  ];
}

test("main(): SEM a variável no ambiente ⇒ o filho recebe `memory` e o runner DECLARA o padrão", () => {
  // MUTAÇÕES QUE ESTE CASO MATA: (1) o runner deixar de resolver o modo e voltar a `env: process.env` —
  // o filho não receberia nada e a fixture reprovaria; (2) o runner resolver e não DECLARAR — a linha
  // sumiria da saída. Este é o caso do dono: `.env` com `prisma`, nada exportado, `npm test` verde.
  withTempDir((dir) => {
    writeFixture(dir, "modo.test.ts", fixtureQueAfereModo("memory"));

    const run = runRunner(dir, { CORE_SAAS_PERSISTENCE: undefined });

    assert.equal(run.status, 0, `o filho não recebeu \`memory\`: ${run.stdout || run.stderr}`);
    assert.match(run.stderr, /CORE_SAAS_PERSISTENCE=memory/, "o modo resolvido tem de ser declarado");
    assert.match(run.stderr, /padrão do runner/i, "a linha tem de dizer que a decisão foi do runner");
    assert.doesNotMatch(run.stderr, /herdado do ambiente/i);
  });
});

test("main(): com `prisma` EXPORTADO ⇒ o runner respeita e declara que veio do ambiente", () => {
  // MUTAÇÃO QUE ESTE CASO MATA: trocar "respeita o exportado" por "força sempre memory". Rodar a suíte
  // em `prisma` de propósito é requisito — é como se mede a dívida `P-SUITE-NAO-SUPORTA-ENV-PRISMA`.
  withTempDir((dir) => {
    writeFixture(dir, "modo.test.ts", fixtureQueAfereModo("prisma"));

    const run = runRunner(dir, { CORE_SAAS_PERSISTENCE: "prisma" });

    assert.equal(run.status, 0, `o runner sobrescreveu o modo exportado: ${run.stdout || run.stderr}`);
    assert.match(run.stderr, /CORE_SAAS_PERSISTENCE=prisma/);
    assert.match(run.stderr, /herdado do ambiente/i);
    assert.doesNotMatch(run.stderr, /padrão do runner/i);
  });
});

test("main(): com `memory` EXPORTADO (o arranjo da CI) ⇒ declara HERDADO, não padrão do runner", () => {
  // Sem este caso, "declarar sempre `padrão do runner`" sobreviveria quando o valor exportado coincide
  // com o fallback — e a linha passaria a mentir sobre a procedência justamente na configuração da CI.
  withTempDir((dir) => {
    writeFixture(dir, "modo.test.ts", fixtureQueAfereModo("memory"));

    const run = runRunner(dir, { CORE_SAAS_PERSISTENCE: "memory" });

    assert.equal(run.status, 0, `${run.stdout || run.stderr}`);
    assert.match(run.stderr, /CORE_SAAS_PERSISTENCE=memory/);
    assert.match(run.stderr, /herdado do ambiente/i);
    assert.doesNotMatch(run.stderr, /padrão do runner/i);
  });
});

// ---------------------------------------------------------------------------
// Guard 3 (C5.3, fecha P8) — com DATABASE_URL presente, skip acima do orçamento é uma suíte -db que
// se auto-pulou em silêncio. Antes deste guard o pulo era CEGO: o P8 aprovado registrou essa cegueira.
// ---------------------------------------------------------------------------

// Fixtura com N testes PULADOS (skip). Pulados contam em `# skipped` mas não em `# fail`, então sem o
// guard o runner sairia 0 — o verde silencioso que o P8 existe para pegar.
function fixtureComPulos(n: number): string[] {
  const linhas = ['import test from "node:test";'];
  for (let i = 0; i < n; i++) {
    linhas.push(`test("fixture: pula ${i}", { skip: "pulei de proposito" }, () => {});`);
  }
  // um teste que passa, para o TAP ter execução real (não cair no guard de "# tests 0")
  linhas.push('import assert from "node:assert/strict";');
  linhas.push('test("fixture: um que passa", () => { assert.ok(true); });');
  return linhas;
}

test("evaluateDbSkipBudget: só acusa com DATABASE_URL presente E skipped acima do orçamento", () => {
  // sem banco → guard inativo, qualquer skip passa
  assert.equal(evaluateDbSkipBudget({ skipped: 9 }, {}).exceeded, false);
  // com banco, dentro do orçamento (2) → ok
  assert.equal(evaluateDbSkipBudget({ skipped: 2 }, { DATABASE_URL: "postgres://x" }).exceeded, false);
  // com banco, acima do orçamento → acusa
  assert.equal(evaluateDbSkipBudget({ skipped: 3 }, { DATABASE_URL: "postgres://x" }).exceeded, true);
  // DATABASE_URL vazia conta como ausente
  assert.equal(evaluateDbSkipBudget({ skipped: 9 }, { DATABASE_URL: "  " }).exceeded, false);
});

test("main(): suíte que PULA acima do orçamento + DATABASE_URL presente ⇒ runner VERMELHO (guard de skip)", () => {
  // MUTAÇÃO QUE ESTE CASO MATA: remover o guard de skip (C5.3) — uma suíte -db se auto-pularia e o
  // runner sairia 0 com o banco presente. 3 pulos > orçamento 2.
  withTempDir((dir) => {
    writeFixture(dir, "pulos.test.ts", fixtureComPulos(3));

    const run = runRunner(dir, { DATABASE_URL: "postgres://dummy:5432/x", CORE_SAAS_PERSISTENCE: undefined });

    assert.notEqual(run.status, 0, `esperava vermelho por skip acima do orçamento: ${run.stdout || run.stderr}`);
    assert.match(run.stderr, /GUARD DE SKIP/i);
  });
});

test("main(): os MESMOS pulos SEM DATABASE_URL ⇒ runner VERDE (o guard só vale com banco presente)", () => {
  // Sem este controle, um guard que disparasse sempre (mesmo sem banco) passaria despercebido — e
  // quebraria a forma canônica 1 (npm test sem DATABASE_URL), onde pular -db é o esperado.
  withTempDir((dir) => {
    writeFixture(dir, "pulos.test.ts", fixtureComPulos(3));

    const run = runRunner(dir, { DATABASE_URL: undefined, CORE_SAAS_PERSISTENCE: undefined });

    assert.equal(run.status, 0, `sem DATABASE_URL o guard de skip não pode disparar: ${run.stdout || run.stderr}`);
    assert.doesNotMatch(run.stderr, /GUARD DE SKIP/i);
  });
});

// ---------------------------------------------------------------------------
// Guard 4 (B-O6R-ARNES · C-E, fecha `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` e o B-2c4) — PISO DE
// DENOMINADOR. Arquivo expandido que termina sem registrar teste e sem declarar skip é ERRO que
// NOMEIA o arquivo — nunca `ec=0` com um total menor e plausível.
//
// POR QUE POR FIXTURE-DIR, e não por asserção sobre a string do TAP: a assinatura que delata o
// arquivo mudo (ponto top-level nomeado pelo CAMINHO, `# suites 0`) é comportamento do `node
// --test`, não contrato nosso. Cravá-la num literal faria o guard continuar verde se o Node
// mudasse a saída — o defeito voltaria calado. Apontando o runner para um diretório de fixture
// real, a deriva de versão do Node deixa ESTE caso vermelho, e ele nomeia o que mudou.
// ---------------------------------------------------------------------------

/**
 * Arquivo que carrega limpo e NÃO registra teste nenhum — a forma exata do defeito: a guarda de
 * topo depende de uma variável que não existe, então o corpo com `test()` nunca executa.
 */
const ARQUIVO_QUE_SOME = [
  'import test from "node:test";',
  "const habilitado = process.env.FIXTURE_NUNCA_DEFINIDA === \"1\";",
  "if (habilitado) {",
  '  test("fixture: nunca chega aqui", () => undefined);',
  "}",
];

/** Arquivo cujo único teste é PULADO com skip DECLARADO — registra teste, logo não é "mudo". */
const UM_TESTE_COM_SKIP_DECLARADO = [
  'import test from "node:test";',
  'test("fixture: pulo declarado", { skip: "gated de proposito" }, () => {});',
];

test("findSilentTestFiles: só acusa ponto de topo cujo NOME é um dos arquivos expandidos", () => {
  const tap = [
    "TAP version 13",
    "ok 1 - um teste comum que passou",
    "ok 2 - tests/mudo.test.ts",
    "not ok 3 - tests/quebrado.test.ts",
    "ok 4 - tests/pulado.test.ts # SKIP gated",
    "    ok 1 - subteste indentado nao conta",
    "# tests 4",
  ].join("\n");

  const mudos = findSilentTestFiles(tap, [
    "tests/mudo.test.ts",
    "tests/quebrado.test.ts",
    "tests/pulado.test.ts",
    "tests/ausente.test.ts",
  ]);

  assert.deepEqual(
    mudos,
    ["tests/mudo.test.ts", "tests/quebrado.test.ts"],
    "ponto com diretiva SKIP é pulo DECLARADO (fora do piso); arquivo sem ponto de arquivo registrou testes",
  );
  assert.deepEqual(
    findSilentTestFiles(tap, ["tests/nada-a-ver.test.ts"]),
    [],
    "nome que não está na lista de expandidos nunca acusa — teste chamado como um arquivo não é um arquivo",
  );

  // A forma que o defeito da 1ª versão deixava passar: alvo RELATIVO, ponto de arquivo ABSOLUTO.
  const absoluto = path.resolve(REPO_ROOT, "tests/mudo.test.ts");
  const tapAbsoluto = `TAP version 13\nok 1 - ${absoluto.split("\\").join("\\\\")}\n# tests 1`;
  assert.deepEqual(
    findSilentTestFiles(tapAbsoluto, ["tests/mudo.test.ts"], REPO_ROOT),
    ["tests/mudo.test.ts"],
    "o TAP nomeia o ponto de arquivo pelo ABSOLUTO mesmo quando o alvo foi passado RELATIVO",
  );
});

test("main(): fixture-dir com arquivo que SOME ⇒ runner VERMELHO NOMEANDO o arquivo", () => {
  // MUTAÇÃO QUE ESTE CASO MATA: remover o piso de denominador do runner. Sem ele, este mesmo
  // diretório sai `ec=0` com "2 arquivo(s) · 2 teste(s) · pass 2" — total menor, plausível, mudo.
  // Foi exatamente o que o D26b mediu na canônica 3 (2740 no lugar de 2745, guard mudo).
  withTempDir((dir) => {
    writeFixture(dir, "a-controle.test.ts", DOIS_TESTES_QUE_PASSAM);
    writeFixture(dir, "b-some.test.ts", ARQUIVO_QUE_SOME);

    const run = runRunner(dir);

    assert.notEqual(
      run.status,
      0,
      `o runner aceitou um arquivo que não registrou teste: ${run.stderr || run.stdout}`,
    );
    assert.match(run.stderr, /PISO DE DENOMINADOR/i);
    assert.match(
      run.stderr,
      /b-some\.test\.ts/,
      "o vermelho tem de NOMEAR o arquivo — 'o total caiu' sem dizer onde não é acionável",
    );
    assert.doesNotMatch(
      run.stderr,
      /a-controle\.test\.ts/,
      "o arquivo que registrou testes não pode ser acusado junto",
    );
  });
});

/**
 * Fixture DENTRO do repositório, sob `test-results/` (gitignored, então nem um crash deixa sujeira
 * rastreada). É o único arranjo que exercita o `shortenPath` do runner: alvo dentro do repo vai para
 * o `node --test` como caminho RELATIVO, e o TAP responde nomeando o ponto de arquivo com o
 * ABSOLUTO. Fixture em `os.tmpdir()` (fora do repo) passa e volta ABSOLUTA nos dois lados e NÃO
 * distingue as duas formas.
 */
function withTempDirInRepo<T>(fn: (dir: string) => T): T {
  const parent = path.join(REPO_ROOT, "test-results");
  fs.mkdirSync(parent, { recursive: true });
  const dir = fs.mkdtempSync(path.join(parent, "runner-guard-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("main(): arquivo que SOME DENTRO do repositório também fica vermelho (relativo × absoluto)", () => {
  // O DEFEITO QUE ESTE CASO MATA, e que ele PEGOU: a 1ª versão do piso comparava o nome do ponto de
  // arquivo do TAP só com a forma que foi passada ao `node --test`. Para alvo dentro do repositório
  // o runner passa RELATIVO e o TAP devolve ABSOLUTO — as duas nunca batiam, e o piso ficava cego
  // justamente dentro de `tests/`. Os drills não pegaram porque a fixture deles morava em
  // `os.tmpdir()`, fora do repo, onde as duas formas coincidem; quem pegou foi a canônica 1, ao
  // reportar `not ok 84 - C:\…\tests\core-saas-role-authority.test.ts` para um alvo passado como
  // `tests\core-saas-role-authority.test.ts`.
  withTempDirInRepo((dir) => {
    writeFixture(dir, "a-controle.test.ts", DOIS_TESTES_QUE_PASSAM);
    writeFixture(dir, "b-some.test.ts", ARQUIVO_QUE_SOME);

    const run = runRunner(dir);

    assert.notEqual(
      run.status,
      0,
      `arquivo mudo DENTRO do repo escapou do piso: ${run.stderr || run.stdout}`,
    );
    assert.match(run.stderr, /PISO DE DENOMINADOR/i);
    assert.match(run.stderr, /b-some\.test\.ts/);
  });
});

test("main(): fixture-dir de CONTROLE (todos registram teste) ⇒ VERDE, sem a mensagem do piso", () => {
  // Sem este controle, um piso que disparasse sempre passaria despercebido e reprovaria a suíte
  // inteira — trocar um falso-verde por um falso-vermelho não é conserto.
  withTempDir((dir) => {
    writeFixture(dir, "a-dois.test.ts", DOIS_TESTES_QUE_PASSAM);
    writeFixture(dir, "b-um.test.ts", UM_TESTE_QUE_PASSA);

    const run = runRunner(dir);

    assert.equal(run.status, 0, `${run.stderr || run.stdout}`);
    assert.doesNotMatch(run.stderr, /PISO DE DENOMINADOR/i);
    // 2 + 1 = 3: o total tem de ser o REAL, não o número de arquivos.
    assert.match(run.stderr, /3 teste\(s\)/);
  });
});

test("main(): arquivo com skip DECLARADO ⇒ VERDE (é o arranjo da canônica 1, sem DATABASE_URL)", () => {
  // O caso que protege a forma canônica 1: `npm test` SEM `DATABASE_URL` faz ~260 suítes -db
  // pularem por `test(nome, { skip })`. Elas REGISTRAM teste, logo não são arquivos mudos. Um piso
  // que não distinguisse "não registrou nada" de "registrou um pulo declarado" deixaria a canônica
  // 1 permanentemente vermelha e seria revertido na primeira semana.
  withTempDir((dir) => {
    writeFixture(dir, "a-skip.test.ts", UM_TESTE_COM_SKIP_DECLARADO);
    writeFixture(dir, "b-um.test.ts", UM_TESTE_QUE_PASSA);

    const run = runRunner(dir, { DATABASE_URL: undefined });

    assert.equal(run.status, 0, `pulo DECLARADO não pode cair no piso: ${run.stderr || run.stdout}`);
    assert.doesNotMatch(run.stderr, /PISO DE DENOMINADOR/i);
    assert.match(run.stderr, /skipped 1/);
  });
});
