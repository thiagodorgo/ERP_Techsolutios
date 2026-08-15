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
      env: process.env,
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
