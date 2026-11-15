// B-SAN3-10-E2E-CI (item 42) — as regras dos dois guardas do e2e, num módulo só, para não divergirem:
// o guarda do relatório (`scripts/e2e-report-guard.mjs`, no job `e2e`) e o guarda estático
// (`tests/e2e-gate-guard.test.ts`, no `npm test` do job `backend`). O relator de passos
// (`tests/e2e/apoio/relator-passos.mjs`) também lê daqui as anotações proibidas.
//
// Plano v2 §3.4 e §3.5, Emenda 2.1 (R2-A1, R2-A2, R2-A3). Fail-closed: o que não estiver previsto reprova.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ_REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
export const RAIZ_E2E = join(RAIZ_REPO, "tests", "e2e");
export const ARQUIVO_CONTAGEM = join(RAIZ_E2E, "contagem-esperada.json");
export const ARQUIVO_CANARIO = join(RAIZ_E2E, "controle", "vermelho-controle.spec.ts");

/** O piso literal do número preso (§3.5): baixar o número exige mexer aqui, à vista da junta. */
export const PISO_CONTAGEM = Object.freeze({ preparo: 1, chromium: 13 });

/** Um teste é uma linha que casa esta regra, num `*.spec.ts` ou `*.setup.ts` de `tests/e2e/**`, fora de `controle/`. */
export const REGRA_DECLARACAO = /^[ \t]*(?:test|setup)\(\s*(["'`])((?:\\.|(?!\1).)*)\1\s*,/gm;

/** Anotações que mascaram um teste ou um passo (G6, G11). */
export const ANOTACOES_PROIBIDAS = Object.freeze(new Set(["skip", "fixme", "fail", "slow"]));

/** G9: com `retries: 1` o pior caso é o dobro (10), que é a capacidade do freio de login do produto. */
export const TETO_LOGIN_POR_EMAIL = 5;

/** G8: o limite de tempo por teste não sobe. */
export const TETO_TIMEOUT_MS = 45_000;

/** O canário só vale se a PRIMEIRA linha do erro for esta (o resto da mensagem cita o código-fonte). */
export const SENTINELA = "Error: e2e-canario: sentinela";

/** S4 (Emenda 2.1 R2-A2): o canário é este texto, por igualdade, com o CRLF normalizado. */
export const TEXTO_CANARIO = [
  'import { expect, test } from "@playwright/test";',
  "",
  'test("vermelho-controle prova que a esteira propaga falha", async ({ page }) => {',
  '  await page.goto("/login");',
  '  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();',
  "  await expect(",
  '    page.getByText("e2e-canario: texto que nao existe"),',
  '    "e2e-canario: sentinela",',
  "  ).toBeVisible({ timeout: 3_000 });",
  "});",
  "",
].join("\n");

/**
 * S1 e S2: nenhuma linha de `tests/e2e/**` casa uma destas regras. A palavra solta pega também a forma
 * desestruturada (`const { … } = test.step`) e a forma por colchete (`test["…"]`).
 */
export const REGRAS_TEXTO = Object.freeze([
  { id: "S1", regra: /\b(skip|fixme|fail|slow|only|configure)\b/, motivo: "máscara de teste ou de passo" },
  { id: "S1", regra: /\bcatch\b/, motivo: "catch que pode engolir a asserção" },
  { id: "S1", regra: /^\s*expect\.poll\(/, motivo: "expect.poll sem await" },
  { id: "S2", regra: /\bsetTimeout\s*\(/, motivo: "setTimeout" },
  { id: "S2", regra: /\bretries\s*:/, motivo: "retries na suíte" },
]);

const normalizar = (caminho) => caminho.split(sep).join("/");

function arquivosAbaixo(pasta) {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivosAbaixo(caminho) : [caminho];
  });
}

/** O que EXISTE no disco, pela regra fixa: `{ projeto, arquivo, titulo }`, com `arquivo` relativo a `tests/e2e`. */
export function enumerarDisco(raiz = RAIZ_E2E) {
  const declarados = [];
  for (const caminho of arquivosAbaixo(raiz)) {
    const arquivo = normalizar(relative(raiz, caminho));
    if (arquivo.startsWith("controle/") || !/\.(spec|setup)\.ts$/.test(arquivo)) continue;
    const projeto = arquivo.endsWith(".setup.ts") ? "preparo" : "chromium";
    for (const casamento of readFileSync(caminho, "utf8").matchAll(REGRA_DECLARACAO)) {
      declarados.push({ projeto, arquivo, titulo: casamento[2] });
    }
  }
  return declarados;
}

/** O número preso, lido do arquivo; ausente ou ilegível vira erro (quem chama reprova). */
export function lerContagem(arquivo = ARQUIVO_CONTAGEM) {
  return JSON.parse(readFileSync(arquivo, "utf8"));
}

export function chaveDoTeste(projeto, arquivo, titulo) {
  return `${projeto} › ${normalizar(arquivo)} › ${titulo}`;
}

/** S1 a S4 sobre o disco. Devolve a lista de violações; lista vazia é verde. */
export function regrasEstaticas(raiz = RAIZ_E2E) {
  const violacoes = [];

  for (const caminho of arquivosAbaixo(raiz)) {
    const arquivo = normalizar(relative(raiz, caminho));
    const linhas = readFileSync(caminho, "utf8").split(/\r?\n/);
    linhas.forEach((linha, indice) => {
      for (const { id, regra, motivo } of REGRAS_TEXTO) {
        if (regra.test(linha)) violacoes.push(`${id}: ${motivo} em tests/e2e/${arquivo}:${indice + 1}`);
      }
    });
  }

  let contagem;
  try {
    contagem = lerContagem(join(raiz, "contagem-esperada.json"));
  } catch (erro) {
    violacoes.push(`S3: número preso ausente ou ilegível (tests/e2e/contagem-esperada.json): ${erro.message}`);
  }
  if (contagem) {
    const projetos = Object.keys(contagem).sort().join(",");
    if (projetos !== Object.keys(PISO_CONTAGEM).sort().join(",")) violacoes.push(`S3: projetos do número preso fora do previsto: ${projetos}`);
    for (const [projeto, piso] of Object.entries(PISO_CONTAGEM)) {
      const valor = contagem[projeto];
      if (!Number.isInteger(valor) || valor < piso) violacoes.push(`S3: número preso ${projeto}=${valor} abaixo do piso literal ${piso}`);
    }
    const disco = enumerarDisco(raiz);
    for (const projeto of new Set([...Object.keys(contagem), ...disco.map((item) => item.projeto)])) {
      const noDisco = disco.filter((item) => item.projeto === projeto).length;
      if (noDisco !== contagem[projeto]) violacoes.push(`S3: projeto ${projeto}: número preso=${contagem[projeto]} no_disco=${noDisco}`);
    }
    const chaves = disco.map((item) => chaveDoTeste(item.projeto, item.arquivo, item.titulo));
    if (new Set(chaves).size !== chaves.length) violacoes.push("S3: título repetido no disco");
  }

  const canario = join(raiz, "controle", "vermelho-controle.spec.ts");
  const outrosNoControle = arquivosAbaixo(join(raiz, "controle")).filter((caminho) => caminho !== canario);
  if (outrosNoControle.length > 0) violacoes.push(`S4: a pasta controle/ só pode ter o canário; achei ${outrosNoControle.map((c) => normalizar(relative(raiz, c))).join(", ")}`);
  if (!existsSync(canario)) violacoes.push("S4: o canário tests/e2e/controle/vermelho-controle.spec.ts não existe");
  else if (readFileSync(canario, "utf8").replaceAll("\r\n", "\n") !== TEXTO_CANARIO) violacoes.push("S4: o canário difere do texto aprovado (§3.4)");

  return violacoes;
}
