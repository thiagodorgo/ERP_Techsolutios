import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { O6R06_JANELA_RESERVADA } from "./helpers/o6r06-cost-fixtures.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-06 · GUARD DA JANELA RESERVADA — estático, sem banco, sempre executa.
//
// `o6r06-cost-summary-sum-db` semeia 10.001 linhas de custo e mede o total. Duas pontas do produto
// leem essas linhas POR PERÍODO, e uma delas — `listCostLineItems` do rateio — faz overlap puro
// SEM `import_id`: não existe escopo a passar para ela. A única defesa contra outro arquivo de
// teste somar linhas ao mesmo mês é a CONVENÇÃO de que 2028-02 pertence àquela fixture.
//
// Convenção que ninguém verifica é convenção que morre. Este guard a verifica POR PRESENÇA:
// varre `tests/**` e assere que o conjunto de arquivos que menciona a janela reservada é
// EXATAMENTE a allowlist abaixo. Duas falhas possíveis, e as duas são as que interessam:
//
//   - alguém escreve um teste novo em 2028-02  → o conjunto CRESCE     → vermelho, com o nome do arquivo;
//   - alguém apaga ou renomeia a constante     → o conjunto ESVAZIA    → vermelho por não achar nem o helper.
//
// O segundo caso é o motivo de a prova ser por PRESENÇA e não por ausência: um guard que só
// procurasse intrusos ficaria verde para sempre no dia em que o literal deixasse de existir.
// -----------------------------------------------------------------------------------------------

const testsDir = path.dirname(fileURLToPath(import.meta.url));

/** O literal como ele aparece no código-fonte do helper — derivado da constante, nunca digitado. */
const LITERAL_DA_JANELA = O6R06_JANELA_RESERVADA.toISOString();

const IDENTIFICADOR = "O6R06_JANELA_RESERVADA";

/** Quem pode escrever o literal da janela. Só o helper: os consumidores importam a constante. */
const ALLOWLIST_DO_LITERAL = ["helpers/o6r06-cost-fixtures.ts"];

/** A fixture que a janela reservada serve — a única que semeia 10.001 linhas de custo. */
const CONSUMIDOR = "o6r06-cost-summary-sum-db.test.ts";

/** Quem pode CONSUMIR a janela: o helper que a define, a fixture que a usa, e este guard. */
const ALLOWLIST_DO_IDENTIFICADOR = [
  "helpers/o6r06-cost-fixtures.ts",
  "o6r06-cost-summary-sum-db.test.ts",
  "o6r06-janela-reservada-guard.test.ts",
];

test("G1 · o LITERAL da janela reservada aparece em EXATAMENTE um arquivo de `tests/` — o helper", () => {
  const encontrados = arquivosQueContem(LITERAL_DA_JANELA);

  assert.deepEqual(
    encontrados,
    ALLOWLIST_DO_LITERAL,
    `A janela reservada é ${LITERAL_DA_JANELA}. Se esta lista CRESCEU, um arquivo novo passou a semear ` +
      "no mesmo mês da fixture de 10.001 linhas e a colisão bidirecional volta (o rateio soma por " +
      "overlap de período, sem `import_id`). Se ESVAZIOU, a constante do helper sumiu e não há mais " +
      "reserva a guardar. Nos dois casos: escolha outro mês, provando por varredura que ele está livre.",
  );
});

test("G2 · a constante é CONSUMIDA — a reserva tem dono e não é literal órfão no helper", () => {
  const encontrados = arquivosQueContem(IDENTIFICADOR);

  assert.deepEqual(
    encontrados,
    ALLOWLIST_DO_IDENTIFICADOR,
    "G1 sozinho ficaria verde se `o6r06-cost-summary-sum-db` voltasse a cravar 2026-06 na mão e " +
      "deixasse a constante intocada no helper. G2 é quem fecha isso: a fixture do resumo tem de " +
      "IMPORTAR a janela reservada, não repetir uma data.",
  );
});

test("G3 · o consumo é por IMPORT, não por menção em comentário — a lição do falsificador MUT-C", () => {
  // MEDIDO, e é por isso que este caso existe. A primeira versão de G2 asseria só a PRESENÇA do
  // identificador no arquivo; a mutação que devolvia `new Date("2026-06-01...")` ao `seedLineItems`
  // deixou G2 VERDE, porque o identificador seguia aparecendo — na PROSA dos comentários. Presença
  // de string não distingue código de comentário. Estes dois asserts distinguem.
  const fonte = readFileSync(path.join(testsDir, CONSUMIDOR), "utf8");
  const importado = /import\s*\{([^}]*)\}\s*from\s*"\.\/helpers\/o6r06-cost-fixtures\.js"/.exec(fonte);

  assert.ok(importado, `${CONSUMIDOR} tem de importar do helper da fixture`);
  assert.ok(
    importado![1]!
      .split(",")
      .map((binding) => binding.trim())
      .includes(IDENTIFICADOR),
    `${IDENTIFICADOR} tem de estar na LISTA DE IMPORT de ${CONSUMIDOR} — mencionar em comentário não vale`,
  );

  assert.equal(
    fonte.includes('new Date("'),
    false,
    `${CONSUMIDOR} não pode conter data literal nenhuma: toda a janela vem de ${IDENTIFICADOR}. ` +
      "Uma data cravada aqui é exatamente como a colisão com `o6r06-allocation-basis-rls-db` nasceu.",
  );
});

test("G4 · o guard não é vácuo: a varredura enxerga os arquivos que deve enxergar", () => {
  const varridos = arquivosDeTeste();

  assert.ok(varridos.length > 50, `a varredura achou só ${varridos.length} arquivo(s) — o caminho de \`tests/\` mudou`);
  assert.ok(
    varridos.includes("helpers/o6r06-cost-fixtures.ts") && varridos.includes("o6r06-cost-summary-sum-db.test.ts"),
    "os dois arquivos da allowlist estão dentro do universo varrido (senão G1/G2 provariam ausência por cegueira)",
  );
});

// ── varredura ────────────────────────────────────────────────────────────────────────────────────
function arquivosQueContem(agulha: string): string[] {
  return arquivosDeTeste()
    .filter((relativo) => readFileSync(path.join(testsDir, relativo), "utf8").includes(agulha))
    .sort();
}

function arquivosDeTeste(base = testsDir): string[] {
  const encontrados: string[] = [];

  for (const entrada of readdirSync(base, { withFileTypes: true })) {
    const completo = path.join(base, entrada.name);

    if (entrada.isDirectory()) {
      encontrados.push(...arquivosDeTeste(completo));
      continue;
    }

    if (entrada.name.endsWith(".ts")) {
      encontrados.push(path.relative(testsDir, completo).split(path.sep).join("/"));
    }
  }

  return encontrados.sort();
}
