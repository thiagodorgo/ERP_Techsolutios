// B-O6R-05 / N1 — runner da suíte backend. ZERO dependência nova (§C7).
// Fecha `P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS` (achado do porteiro pós-merge do #352).
//
// POR QUE ESTE ARQUIVO EXISTE
// `package.json` definia `"test": "node --test --import tsx tests/*.test.ts"`, e quem expande glob é
// o SHELL — não o Node. No Windows o npm executa scripts via `cmd.exe`, que não expande glob: o
// `node --test` recebe a string literal `tests/*.test.ts`, não encontra esse arquivo e **nenhum teste
// roda**. Na CI (ubuntu/bash) o glob expande e a suíte roda de verdade — por isso o defeito
// sobreviveu meses: o único lugar onde ele aparece é a máquina do dono.
//
// A correção não pode depender de shell nenhum: a expansão acontece aqui, em JS, e o `node --test`
// recebe a LISTA EXPLÍCITA de arquivos — exatamente como a CI já roda o subconjunto contra o
// Postgres (`.github/workflows/ci.yml`), que funciona nos dois sistemas.
//
// ARMADILHA JÁ MAPEADA (não repetir): "usar `node --test <diretório>`" NÃO serve. No Node 20 — o da
// CI e o desta máquina — os padrões default de descoberta do test runner não incluem `.ts`; o
// diretório resolveria para zero arquivo, que é o mesmo verde vazio com outra roupa.
//
// DOIS GUARDS, porque a classe do defeito é "terminar sem exercitar nada":
//   1. zero ARQUIVO casado no diretório  -> falha alto (a suíte sumiu, ou o caminho está errado)
//   2. TAP sem `# tests`, ou com `# tests 0` -> falha alto (o processo rodou, mas não executou teste)
// Os guards são MONOTÔNICOS: só podem transformar um verde em vermelho, nunca um vermelho em verde.
//
// O relatório é forçado para TAP (`--test-reporter=tap`) em vez de depender do default, que muda
// conforme stdout seja TTY (`spec`) ou não (`tap`). Um guard que lê a saída não pode ter o formato
// dessa saída decidido pelo terminal de quem chamou.
//
// MODO DE PERSISTÊNCIA — por que o runner resolve isto (2026-08-16, dívida `P-SUITE-NAO-SUPORTA-ENV-PRISMA`)
// `src/config/env.ts` carrega o `.env` do repositório e CONGELA o snapshot no import. Como o ESM hasteia
// imports estáticos, os arquivos de teste que escrevem `process.env.CORE_SAAS_PERSISTENCE = "memory"` no
// próprio corpo chegam TARDE: quando a linha executa, a configuração já congelou no que o `.env` disser. O
// `.env` desta máquina diz `prisma` (o dev server serve o banco real ao dono, deliberadamente), então a suíte
// ia ao Postgres procurar fixtures que só existem em memória — 90 falhas em 16 arquivos, nenhuma delas defeito
// (os IDs de fixture, `ten_000001`, nem são UUIDs: o driver os rejeita).
//
// Na CI isso não acontece porque o job `backend` EXPORTA `CORE_SAAS_PERSISTENCE: memory`, e variável já
// presente no ambiente vence o `.env` (dotenv não sobrepõe). A correção é fazer a bateria local ser a mesma:
// o runner resolve o modo e o passa no `env` do processo FILHO.
//
//   - variável NÃO exportada  -> o runner define `memory` (exatamente o que a CI faz)
//   - variável exportada      -> o runner RESPEITA o valor e não sobrescreve (rodar em `prisma` de propósito
//                                é requisito; `CORE_SAAS_PERSISTENCE=prisma npm test` continua fazendo as 90
//                                falhas voltarem, e isso é correto)
//
// O modo resolvido é DECLARADO em uma linha, com a procedência. Silêncio aqui repetiria a classe de defeito
// que este arquivo existe para matar: ele nasceu porque o `npm test` não executava nada — e não dizia.
//
// COSTURA DE TESTE (B-O6R-05 / frente D). Sem argumento, `main()` roda a suíte real — é o que o
// `npm test` faz. COM argumento, roda o alvo indicado (diretório ou arquivo). Isso existe porque a
// `main()` — a expansão de verdade, o spawn, a leitura do TAP e, sobretudo, a PROPAGAÇÃO DO CÓDIGO
// DE SAÍDA do processo filho — não tinha uma única linha de teste: trocar `process.exit(childExit)`
// por `process.exit(0)` é uma linha, sobrevivia à suíte inteira, e a partir dela o job `backend` da
// CI ficaria VERDE com a suíte VERMELHA. `tests/npm-test-runner-guard.test.ts` aponta o runner para
// um diretório de fixture isolado (nunca `tests/`, logo sem recursão) e assere o status de saída.
// De brinde, a mesma costura faz `npm test -- tests/algum.test.ts` funcionar, em vez de ser
// ignorado em silêncio como antes.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_SUFFIX = ".test.ts";

const PERSISTENCE_VAR = "CORE_SAAS_PERSISTENCE";

// B-O6R-02 ciclo 4 · C5.3 (fecha o P8: o detector do skip era CEGO ao auto-pulo) — ORÇAMENTO DE SKIP
// COM BANCO PRESENTE. Com `DATABASE_URL` no ambiente, as suítes `-db` DEVEM RODAR, não pular. Se o
// número de pulados passar deste orçamento, uma suíte `-db` se auto-pulou em silêncio — exatamente o
// buraco do P8 (o jurado que aprovou o P8 registrou a cegueira). O guard é MONOTÔNICO: só transforma
// verde em vermelho.
//
// Os DOIS skips CONHECIDOS que compõem o orçamento (medidos na forma canônica 3 — DATABASE_URL
// exportada, banco descartável migrado, `CORE_SAAS_PERSISTENCE` NÃO exportado → runner assume memory):
//   1. tests/permission-catalog-db-parity.test.ts — "toda permissão do catálogo existe na tabela
//      `permissions` do banco"
//   2. tests/permission-catalog-db-parity.test.ts — "os grants do papel GLOBAL batem exatamente com
//      ROLE_PERMISSIONS (nas duas direções)"
// Os DOIS são gated por `RBAC_DB_PARITY != "1"` (só o job `backend-postgres` da CI liga RBAC_DB_PARITY=1);
// eles pulam MESMO com DATABASE_URL presente, e por isso entram no orçamento. Orçamento anônimo seria o
// mesmo buraco com outra roupa — por isso os dois estão NOMEADOS aqui.
const SKIP_BUDGET_DB = 2;

/**
 * O guard de skip do C5.3: com `DATABASE_URL` presente, `skipped` acima do orçamento é uma suíte `-db`
 * que se auto-pulou. Puro e exportado para o guard-do-guard (`npm-test-runner-guard.test.ts`).
 *
 * @returns {{ exceeded: boolean, skipped: number|null, budget: number, dbPresent: boolean }}
 */
export function evaluateDbSkipBudget(summary, sourceEnv = process.env, budget = SKIP_BUDGET_DB) {
  const url = sourceEnv.DATABASE_URL;
  const dbPresent = typeof url === "string" && url.trim() !== "";
  const skipped = typeof summary?.skipped === "number" ? summary.skipped : null;
  return { exceeded: dbPresent && skipped !== null && skipped > budget, skipped, budget, dbPresent };
}

// B-O6R-ARNES · C-E (fecha `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` e o B-2c4) — PISO DE DENOMINADOR.
//
// O BURACO: um arquivo de teste pode ser expandido, carregado SEM ERRO e terminar sem registrar um
// único teste — basta a guarda de topo inverter (`if (connectionString)` em vez de
// `if (!connectionString)`), ou o arquivo abortar antes de chamar `test()`. Os testes daquele
// arquivo simplesmente somem, `# fail` continua 0, e o runner sai 0 reportando um total MENOR e
// perfeitamente plausível. Foi assim que a canônica 3 publicou 2740 no lugar de 2745 numa rodada e
// ninguém foi avisado; e é a mesma classe do arquivo que aborta no `XX000`.
//
// A ASSINATURA QUE O DELATA (medida no Node v20.19.5, F0(b) deste bloco): quando um arquivo não
// registra teste nenhum, o `node --test` emite para ELE um ponto TOP-LEVEL cujo NOME é o CAMINHO do
// arquivo — `ok 2 - tests/foo.test.ts`, com `# suites 0`. Arquivo que registra testes NÃO ganha
// ponto de arquivo: os pontos são os testes. Logo "ponto de topo cujo nome é um dos caminhos que eu
// mandei executar" é exatamente "arquivo que não registrou nada".
//
// POR QUE O GUARD NÃO É POR CONTAGEM FIXA: cravar "o total tem de ser >= N" viraria um número para
// alguém atualizar toda semana, e ficaria cego a um arquivo sumindo enquanto outro cresce. O piso é
// ESTRUTURAL — nomeia o arquivo — e não precisa saber quantos testes o repositório tem.
//
// SKIP DECLARADO NÃO CAI AQUI: `test(nome, { skip })` REGISTRA um teste (e sai com a diretiva
// `# SKIP`), então o arquivo não ganha ponto de arquivo. É o que mantém a forma canônica 1 (`npm
// test` sem `DATABASE_URL`, onde ~260 suítes -db pulam declarando) verde. Ainda assim, pontos com
// diretiva SKIP/TODO são explicitamente ignorados abaixo — a propriedade é "sem registrar teste E
// sem declarar skip".
//
// Guard MONOTÔNICO, como os outros: só transforma verde em vermelho.

/** Unifica separadores e desfaz o escape de barra invertida do TAP, para comparar caminhos. */
function normalizeTapPath(value) {
  return String(value)
    .replace(/\\\\/g, "\\")
    .split(/[\\/]/)
    .join("/");
}

/**
 * Arquivos expandidos que terminaram sem registrar teste — detectados pelo ponto TOP-LEVEL cujo
 * nome é o próprio caminho do arquivo. Puro e exportado para o guard-do-guard.
 *
 * @returns {string[]} os caminhos, na forma em que foram passados ao `node --test`
 */
export function findSilentTestFiles(tapOutput, files) {
  const text = String(tapOutput ?? "");
  const esperados = new Map(files.map((file) => [normalizeTapPath(file), file]));
  const mudos = [];
  const vistos = new Set();

  // Só linhas NÃO indentadas: sub-testes vêm indentados e nunca são pontos de arquivo.
  for (const match of text.matchAll(/^(?:not )?ok +\d+ +- +(.*)$/gm)) {
    const bruto = match[1];

    // Diretiva TAP (`# SKIP`, `# TODO`) = pulo/pendência DECLARADOS: fora do escopo deste piso.
    if (/\s#\s*(SKIP|TODO)\b/i.test(bruto)) {
      continue;
    }

    const nome = normalizeTapPath(bruto.trim());

    if (esperados.has(nome) && !vistos.has(nome)) {
      vistos.add(nome);
      mudos.push(esperados.get(nome));
    }
  }

  return mudos;
}

/** O default da CI (job `backend`) e o default do `env.ts`. O runner não inventa um terceiro. */
const PERSISTENCE_FALLBACK = "memory";

/**
 * Decide em que modo de persistência a suíte vai rodar, e de ONDE essa decisão veio.
 *
 * Ambiente vence, sempre: exportar `CORE_SAAS_PERSISTENCE` é como se pede uma execução deliberada em
 * `prisma` (ou qualquer outro valor — validar o valor é papel do `env.ts`, não deste runner; um valor
 * inválido tem de quebrar ALTO lá, não ser silenciosamente trocado aqui).
 *
 * Valor ausente OU vazio conta como "não exportado": repassar string vazia ao filho não respeitaria escolha
 * nenhuma — só faria o `env.ts` recusar o enum e derrubar a suíte inteira com um erro que não é sobre teste.
 *
 * @returns {{ mode: string, origin: "ambiente" | "runner" }}
 */
export function resolvePersistenceMode(sourceEnv = process.env) {
  const exported = sourceEnv[PERSISTENCE_VAR];

  if (typeof exported === "string" && exported.trim() !== "") {
    return { mode: exported, origin: "ambiente" };
  }

  return { mode: PERSISTENCE_FALLBACK, origin: "runner" };
}

/**
 * A linha de declaração. Diz o modo E a procedência — "memory" sozinho não distingue "o dono pediu" de "o
 * runner decidiu por ele", e é justamente essa diferença que explica por que a bateria local e a CI
 * concordam.
 */
export function describePersistenceMode({ mode, origin }) {
  const procedencia =
    origin === "ambiente"
      ? "herdado do ambiente (exportado por quem chamou; o runner não sobrescreve)"
      : "padrão do runner (nada exportado no ambiente — o `.env` não decide a bateria; mesma configuração do job `backend` da CI)";

  return `[run-backend-tests] ${PERSISTENCE_VAR}=${mode} — ${procedencia}`;
}

/**
 * Expande o diretório de testes em uma lista ORDENADA e determinística de caminhos.
 * `fs.readdirSync` não garante ordem entre sistemas de arquivos; a ordenação é o que torna
 * duas execuções comparáveis (e o TAP diffável).
 *
 * @throws se o diretório não puder ser lido, ou se não casar NENHUM arquivo.
 */
export function expandTestFiles(directory, options = {}) {
  const suffix = options.suffix ?? TEST_SUFFIX;

  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `[run-backend-tests] não consegui ler o diretório de testes "${directory}": ${error.message}`,
    );
  }

  const names = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => entry.name)
    .sort();

  if (names.length === 0) {
    throw new Error(
      `[run-backend-tests] nenhum arquivo "*${suffix}" encontrado em "${directory}". ` +
        `Rodar zero teste e sair com sucesso é o defeito que este runner existe para impedir ` +
        `(P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS).`,
    );
  }

  return names.map((name) => path.join(directory, name));
}

/**
 * Lê o sumário do TAP emitido pelo `node --test`.
 * Considera apenas linhas NÃO indentadas (o sumário final; sub-testes vêm indentados) e usa a
 * ÚLTIMA ocorrência, que é o bloco de fechamento.
 *
 * @throws se `# tests` estiver ausente/ilegível, ou for 0.
 */
export function parseTapSummary(tapOutput) {
  const text = String(tapOutput ?? "");

  const read = (label) => {
    const matches = [...text.matchAll(new RegExp(`^# ${label} (\\d+)$`, "gm"))];
    return matches.length === 0 ? null : Number(matches[matches.length - 1][1]);
  };

  const tests = read("tests");

  if (tests === null) {
    throw new Error(
      `[run-backend-tests] não consegui ler "# tests" no TAP. Sem essa contagem não há como afirmar ` +
        `que a suíte executou — e "não sei" é tratado como falha, nunca como verde.`,
    );
  }

  if (tests === 0) {
    throw new Error(
      `[run-backend-tests] o TAP declara "# tests 0": o processo terminou sem executar um único ` +
        `teste. Isso é falha, não sucesso (P-NPM-TEST-VERDE-VAZIO-NO-WINDOWS).`,
    );
  }

  return {
    tests,
    pass: read("pass"),
    fail: read("fail"),
    skipped: read("skipped"),
    todo: read("todo"),
    cancelled: read("cancelled"),
  };
}

/**
 * Traduz os alvos da linha de comando em uma lista de arquivos de teste.
 *
 * Sem alvo: a suíte real (o `tests/` do repositório) — o caminho do `npm test`.
 * Com alvo: cada um pode ser um DIRETÓRIO (expandido pelo mesmo `expandTestFiles`, com os mesmos
 * dois guards) ou um ARQUIVO explícito (que o chamador escolheu; não é papel deste runner adivinhar
 * que ele não existe — quem reclama é o `statSync`).
 *
 * @throws se um alvo não existir, ou se um diretório-alvo não casar nenhum arquivo de teste.
 */
export function resolveTestTargets(targets, defaultDirectory) {
  if (targets.length === 0) {
    return expandTestFiles(defaultDirectory);
  }

  const files = [];

  for (const target of targets) {
    // Argumento de linha de comando resolve contra o cwd de quem chamou (convenção de CLI); o
    // default resolve contra o repositório, porque ele não veio de ninguém.
    const absolute = path.resolve(target);

    let stats;
    try {
      stats = fs.statSync(absolute);
    } catch (error) {
      throw new Error(`[run-backend-tests] alvo de teste inexistente "${target}": ${error.message}`);
    }

    if (stats.isDirectory()) {
      files.push(...expandTestFiles(absolute));
    } else {
      files.push(absolute);
    }
  }

  return files;
}

/**
 * Caminho RELATIVO ao repo quando o arquivo está dentro dele: encurta a linha de comando (o Windows
 * limita o processo a 32767 caracteres) e deixa o TAP legível e estável entre máquinas. Fora do
 * repo (fixture de teste em diretório temporário) o relativo seria uma escada de `..`: fica absoluto.
 */
function shortenPath(repoRoot, file) {
  const relative = path.relative(repoRoot, file);

  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? relative : file;
}

function main(argv = process.argv.slice(2)) {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const testsDir = path.join(repoRoot, "tests");

  // Declarado ANTES de qualquer outra coisa: mesmo quando a expansão aborta, quem leu a saída sabe em que
  // configuração a bateria ia rodar.
  const persistence = resolvePersistenceMode(process.env);
  console.error(describePersistenceMode(persistence));

  let files;
  try {
    files = resolveTestTargets(argv, testsDir).map((file) => shortenPath(repoRoot, file));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.error(`[run-backend-tests] ${files.length} arquivo(s) de teste — executando...`);

  const child = spawn(
    process.execPath,
    [
      "--test",
      "--import",
      "tsx",
      "--test-reporter=tap",
      "--test-reporter-destination=stdout",
      ...files,
    ],
    {
      cwd: repoRoot,
      // `shell: false` (default) é deliberado: sem shell, não há glob para expandir nem limite de
      // 8191 caracteres do cmd.exe.
      stdio: ["inherit", "pipe", "inherit"],
      // O modo vai no ambiente do FILHO, não em `process.env` deste processo: é lá que o `env.ts` congela o
      // snapshot, e é lá que ele precisa chegar ANTES do primeiro import. Presente no ambiente, o dotenv não
      // sobrepõe — o `.env` deixa de sequestrar a suíte.
      env: { ...process.env, [PERSISTENCE_VAR]: persistence.mode },
    },
  );

  let tap = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    tap += chunk;
    process.stdout.write(chunk);
  });

  child.on("error", (error) => {
    console.error(`[run-backend-tests] falha ao iniciar o processo de teste: ${error.message}`);
    process.exit(1);
  });

  child.on("close", (code, signal) => {
    // Código real do processo de teste. O guard abaixo só pode PIORÁ-LO.
    // A propagação deste código é o que separa "a CI viu a suíte falhar" de "a CI ficou verde com a
    // suíte vermelha"; ela é exercitada de ponta a ponta em `tests/npm-test-runner-guard.test.ts`
    // (fixture que falha ⇒ status ≠ 0 · fixture que passa ⇒ status 0).
    const childExit = signal ? 1 : typeof code === "number" ? code : 1;

    let summary = null;
    try {
      summary = parseTapSummary(tap);
    } catch (error) {
      console.error(error.message);
      process.exit(childExit === 0 ? 1 : childExit);
    }

    console.error(
      `[run-backend-tests] ${files.length} arquivo(s) · ${summary.tests} teste(s) · ` +
        `pass ${summary.pass ?? "?"} · fail ${summary.fail ?? "?"} · skipped ${summary.skipped ?? "?"}`,
    );

    if (signal) {
      console.error(`[run-backend-tests] processo de teste terminado pelo sinal ${signal}`);
    }

    // C-E — PISO DE DENOMINADOR, MONOTÔNICO. Vem ANTES do guard de skip de propósito: as duas
    // classes são quase disjuntas (arquivo que some não produz pulo), mas se um dia coincidirem, o
    // defeito mais específico — o arquivo NOMEADO — é o que precisa ser lido primeiro.
    const mudos = findSilentTestFiles(tap, files);
    if (mudos.length > 0) {
      console.error(
        `[run-backend-tests] PISO DE DENOMINADOR: ${mudos.length} arquivo(s) expandido(s) ` +
          `terminaram sem registrar um único teste e sem declarar skip:\n` +
          mudos.map((file) => `[run-backend-tests]   ${file}\n`).join("") +
          `[run-backend-tests] O total acima (${summary.tests}) é MENOR do que a suíte de verdade e ` +
          "não dá para saber quanto — testes que não rodaram não aparecem como falha. Sair 0 aqui é " +
          "publicar um denominador que a execução não sustenta (P-O6R-B02-RUNNER-SUMICO-SEM-SKIP).",
      );
      process.exit(childExit === 0 ? 1 : childExit);
    }

    // C5.3 — GUARD DE SKIP COM BANCO PRESENTE (P8), MONOTÔNICO: só piora o exit, nunca o melhora.
    const skipBudget = evaluateDbSkipBudget(summary, process.env);
    if (skipBudget.exceeded) {
      console.error(
        `[run-backend-tests] GUARD DE SKIP (P8): DATABASE_URL presente e ${skipBudget.skipped} teste(s) ` +
          `pulados > orçamento ${skipBudget.budget}. Com banco, as suítes -db têm de RODAR — um pulo a mais ` +
          "é uma suíte -db que se auto-pulou em silêncio. Os 2 skips do orçamento estão nomeados no runner " +
          "(permission-catalog-db-parity, gated por RBAC_DB_PARITY).",
      );
      process.exit(childExit === 0 ? 1 : childExit);
    }

    process.exit(childExit);
  });
}

const invokedPath = process.argv[1];
const isDirectRun =
  invokedPath !== undefined &&
  (import.meta.url === pathToFileURL(invokedPath).href ||
    path.basename(invokedPath) === "run-backend-tests.mjs");

if (isDirectRun) {
  main();
}
