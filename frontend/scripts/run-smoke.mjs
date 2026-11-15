// B-SMOKE-LISTA — runner do `test:smoke` do frontend. Node puro, ZERO dependência nova.
// Fecha `P-SMOKE-LINHA-NO-LIMITE-DO-WINDOWS`.
//
// POR QUE ESTE ARQUIVO EXISTE
// O script `test:smoke` era `node --test --import tsx` seguido da lista inteira dos arquivos de teste:
// 219 caminhos, 8140 caracteres. No Windows o npm roda o script pelo `cmd.exe`, que aceita uma linha de
// pouco mais de 8150 caracteres; sobravam 14, e o próximo arquivo de teste faria o `test:smoke` morrer com
// "Linha de comando muito longa" e 0 teste rodado. A CI roda em Linux e não acusa nada. E a lista à mão tinha
// a outra classe de defeito: teste fora da lista nunca roda (o precedente #357/#344).
//
// A lista agora nasce aqui, em JS: todo `*.test.ts` e `*.test.tsx` DIRETO em `frontend/tests/` (não
// recursivo, como a lista de antes: `tests/helpers/**` fica fora), em ordem alfabética. O `node --test`
// recebe a lista por `spawn` SEM shell, então o limite é o do `CreateProcess` (32767 caracteres), não o do
// `cmd.exe`. O Node 20 da CI não aceita glob no `node --test`, e os padrões de descoberta dele não incluem
// `.ts`: por isso a lista é explícita.
//
// O stdout e o stderr do filho passam direto (o TAP chega igual ao de antes) e o código de saída do filho é
// o código de saída deste processo. Zero arquivo encontrado é falha, nunca verde vazio.
//
// COSTURA DE TESTE: sem argumento, roda `frontend/tests`, que é o que o `npm run test:smoke` faz. Com UM
// argumento, roda o diretório indicado; é como `tests/run-smoke.test.ts` prova o filtro, a não recursão e o
// repasse do código de saída contra fixtures isoladas.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** O que é arquivo de teste: `*.test.ts` e `*.test.tsx`, como a lista de antes. */
export const SMOKE_TEST_FILE = /\.test\.tsx?$/;

/** A raiz do frontend: o `cwd` do `node --test`, onde o `--import tsx` resolve. */
export const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Os arquivos de teste DIRETO em `testsDir` (sem descer em subpasta), só arquivos comuns, em ordem
 * alfabética por código de caractere (a mesma em qualquer sistema).
 *
 * @returns {string[]} os nomes dos arquivos, sem o diretório
 */
export function listSmokeFiles(testsDir) {
  return fs
    .readdirSync(testsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && SMOKE_TEST_FILE.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * O caminho que vai para o `node --test`: relativo ao frontend quando o diretório está dentro dele
 * (`tests/x.test.ts`, como na lista de antes, e a linha fica curta); absoluto quando está fora (a fixture
 * em diretório temporário).
 */
export function smokeArgPath(testsDir, name, root = FRONTEND_ROOT) {
  const file = path.resolve(testsDir, name);
  const relative = path.relative(root, file);
  const inside = relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  return inside ? relative.split(path.sep).join("/") : file;
}

function main(argv = process.argv.slice(2)) {
  if (argv.length > 1) {
    console.error(`[run-smoke] aceito no máximo 1 argumento (um diretório de testes); recebi ${argv.length}.`);
    process.exit(2);
  }

  const testsDir = argv.length === 1 ? path.resolve(argv[0]) : path.join(FRONTEND_ROOT, "tests");

  let names;
  try {
    names = listSmokeFiles(testsDir);
  } catch (error) {
    console.error(`[run-smoke] não consegui ler o diretório de testes "${testsDir}": ${error.message}`);
    process.exit(1);
  }

  if (names.length === 0) {
    console.error(
      `[run-smoke] nenhum arquivo *.test.ts ou *.test.tsx em "${testsDir}". ` +
        "Rodar zero teste e sair 0 é falha, não sucesso.",
    );
    process.exit(1);
  }

  const files = names.map((name) => smokeArgPath(testsDir, name));

  // Sem shell: nada de limite do cmd.exe nem de expansão de glob. `stdio: "inherit"` repassa o TAP sem filtro.
  const child = spawn(process.execPath, ["--test", "--import", "tsx", ...files], {
    cwd: FRONTEND_ROOT,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`[run-smoke] falha ao iniciar o node --test: ${error.message}`);
    process.exit(1);
  });

  child.on("close", (code, signal) => {
    if (signal) {
      console.error(`[run-smoke] o node --test terminou pelo sinal ${signal}.`);
      process.exit(1);
    }
    process.exit(typeof code === "number" ? code : 1);
  });
}

// Roda só quando chamado direto (`node scripts/run-smoke.mjs`); importado pelo teste, só exporta. O nome do
// arquivo é a segunda forma porque, no Windows, a letra do drive pode vir com outra caixa no `argv`.
const invokedPath = process.argv[1];
const isDirectRun =
  invokedPath !== undefined &&
  (import.meta.url === pathToFileURL(path.resolve(invokedPath)).href || path.basename(invokedPath) === "run-smoke.mjs");

if (isDirectRun) {
  main();
}
