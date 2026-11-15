// B-SAN3-10-E2E-CI (item 42) — o guarda do relatório JSON do Playwright, no job `e2e` da CI.
// uso: node scripts/e2e-report-guard.mjs <relatorio.json> --modo=suite|controle
//
// Só transforma verde em vermelho. Cada violação sai numa linha `e2e-guard: VERMELHO — …` e o código de saída é 1.
// `--modo=suite` (plano v2 §3.5, G1 a G11): rodou exatamente o que existe no disco, pelo título, no número preso, e
// cada teste passou de primeira, sem máscara. `--modo=controle` (§3.4): o canário falhou, e pelo sentinela.
import { readFileSync } from "node:fs";

import {
  ANOTACOES_PROIBIDAS,
  SENTINELA,
  TETO_LOGIN_POR_EMAIL,
  TETO_TIMEOUT_MS,
  chaveDoTeste,
  enumerarDisco,
  lerContagem,
  regrasEstaticas,
} from "./e2e-guard-regras.mjs";

const argumentos = process.argv.slice(2);
const arquivoRelatorio = argumentos.find((argumento) => !argumento.startsWith("--"));
const modo = (argumentos.find((argumento) => argumento.startsWith("--modo=")) ?? "").slice("--modo=".length);
const violacoes = [];
const reprovar = (motivo) => violacoes.push(motivo);
const semCor = (texto) => String(texto ?? "").replace(/\u001b\[[0-9;]*m/g, "");

function encerrar(linhaVerde) {
  if (violacoes.length > 0) {
    for (const motivo of violacoes) console.log(`e2e-guard: VERMELHO — ${motivo}`);
    process.exit(1);
  }
  console.log(linhaVerde);
  process.exit(0);
}

let relatorio;
try {
  relatorio = JSON.parse(readFileSync(arquivoRelatorio, "utf8"));
} catch (erro) {
  reprovar(`G1: relatório ausente ou ilegível (${arquivoRelatorio}): ${erro.message}`);
  encerrar("");
}
if (!relatorio || typeof relatorio.stats !== "object" || relatorio.stats === null || !Array.isArray(relatorio.suites)) {
  reprovar("G1: relatório sem stats ou sem suites");
  encerrar("");
}
if (modo !== "suite" && modo !== "controle") {
  reprovar(`modo desconhecido: "${modo}" (use --modo=suite ou --modo=controle)`);
  encerrar("");
}

// O que RODOU, achatado: cada teste com o arquivo e o título próprio (os grupos `describe` não entram no título).
const rodou = [];
(function andar(suites, arquivoDoPai) {
  for (const suite of suites ?? []) {
    const arquivo = suite.file ?? arquivoDoPai;
    for (const spec of suite.specs ?? []) {
      for (const teste of spec.tests ?? []) rodou.push({ arquivo: String(spec.file ?? arquivo).split("\\").join("/"), titulo: spec.title, teste });
    }
    andar(suite.suites, arquivo);
  }
})(relatorio.suites, "");

const stats = relatorio.stats;
const errosGlobais = Array.isArray(relatorio.errors) ? relatorio.errors : [];

if (modo === "controle") {
  // S4 também aqui: um canário trocado por um que falha sem a web (throw do sentinela) não serve de prova.
  for (const motivo of regrasEstaticas().filter((item) => item.startsWith("S4"))) reprovar(motivo);
  if (rodou.length !== 1) reprovar(`o canário tem de ser exatamente 1 teste; rodaram ${rodou.length}`);
  if (stats.expected !== 0 || stats.unexpected !== 1 || stats.flaky !== 0 || stats.skipped !== 0) {
    reprovar(`stats do canário fora do devido: expected=${stats.expected} unexpected=${stats.unexpected} flaky=${stats.flaky} skipped=${stats.skipped}`);
  }
  for (const { titulo, teste } of rodou) {
    if (teste.projectName !== "controle") reprovar(`teste fora do projeto controle: ${teste.projectName} › ${titulo}`);
    const tentativas = teste.results ?? [];
    if (tentativas.length === 0) reprovar("o canário não tem tentativa no relatório");
    for (const tentativa of tentativas) {
      if (tentativa.status !== "failed") reprovar(`o canário terminou com status=${tentativa.status}, e não por asserção (failed)`);
      const primeiraLinha = semCor((tentativa.errors ?? [])[0]?.message ?? tentativa.error?.message).split(/\r?\n/)[0].trim();
      if (primeiraLinha !== SENTINELA) reprovar(`a falha do canário não começa pelo sentinela (primeira linha: "${primeiraLinha}") — falhou por outro motivo`);
    }
  }
  encerrar("e2e-guard: o canário falhou, como devido (pelo sentinela)");
}

// ---- modo suite ----

// G1
if (errosGlobais.length > 0) reprovar(`G1: erros globais no relatório: ${errosGlobais.length} (${semCor(errosGlobais[0]?.message).split(/\r?\n/)[0]})`);

// O número preso e o disco.
let contagem = {};
try {
  contagem = lerContagem();
} catch (erro) {
  reprovar(`G2: número preso ausente ou ilegível (tests/e2e/contagem-esperada.json): ${erro.message}`);
}
const noDisco = enumerarDisco();
const chavesDisco = noDisco.map((item) => chaveDoTeste(item.projeto, item.arquivo, item.titulo));
const chavesRodou = rodou.map((item) => chaveDoTeste(item.teste.projectName, item.arquivo, item.titulo));

// G2 e G4: por projeto, número preso = disco = rodou; nenhum projeto fora do número preso.
const projetosNoRelatorio = new Set([...rodou.map((item) => item.teste.projectName), ...(relatorio.config?.projects ?? []).map((projeto) => projeto.name)]);
for (const projeto of new Set([...Object.keys(contagem), ...noDisco.map((item) => item.projeto), ...projetosNoRelatorio])) {
  const esperado = contagem[projeto];
  const quantosNoDisco = noDisco.filter((item) => item.projeto === projeto).length;
  const quantosRodaram = rodou.filter((item) => item.teste.projectName === projeto).length;
  if (esperado === undefined) reprovar(`G4: projeto fora do número preso: ${projeto}`);
  else if (quantosNoDisco !== esperado || quantosRodaram !== esperado) reprovar(`G2: projeto ${projeto}: esperado=${esperado} no_disco=${quantosNoDisco} rodou=${quantosRodaram}`);
}

// G3: o conjunto que rodou é o do disco, por projeto, arquivo e título; sem repetição.
for (const chave of chavesDisco) if (!chavesRodou.includes(chave)) reprovar(`G3: declarado e NÃO rodou (filtrado?): ${chave}`);
for (const chave of chavesRodou) if (!chavesDisco.includes(chave)) reprovar(`G3: rodou e não está na enumeração do disco: ${chave}`);
if (new Set(chavesRodou).size !== chavesRodou.length) reprovar("G3: teste repetido no relatório (--repeat-each ou título duplicado)");
if (new Set(chavesDisco).size !== chavesDisco.length) reprovar("G3: título repetido no disco");

// G5, G6, G8 (por teste), G9 e G11.
const loginsPorEmail = new Map();
function passosMascarados(passos, onde) {
  for (const passo of passos ?? []) {
    if (passo.skipped === true || (passo.annotations ?? []).some((anotacao) => ANOTACOES_PROIBIDAS.has(anotacao.type))) {
      reprovar(`G11: passo pulado em ${onde}: ${passo.title}`);
    }
    passosMascarados(passo.steps, onde);
  }
}
for (const { arquivo, titulo, teste } of rodou) {
  const onde = chaveDoTeste(teste.projectName, arquivo, titulo);
  const tentativas = teste.results ?? [];
  if (teste.expectedStatus !== "passed") reprovar(`G5: expectedStatus=${teste.expectedStatus} em ${onde}`);
  if (teste.status !== "expected") reprovar(`G5: status=${teste.status} em ${onde}`);
  if (tentativas.length !== 1) reprovar(`G5: ${tentativas.length} tentativas (tem de ser 1) em ${onde}`);
  if (typeof teste.timeout === "number" && teste.timeout > TETO_TIMEOUT_MS) reprovar(`G8: timeout=${teste.timeout} no teste ${onde} (teto ${TETO_TIMEOUT_MS})`);
  for (const anotacao of teste.annotations ?? []) {
    if (ANOTACOES_PROIBIDAS.has(anotacao.type)) reprovar(`G6: anotação proibida "${anotacao.type}" em ${onde}`);
  }
  for (const tentativa of tentativas) {
    if (tentativa.status !== "passed" || tentativa.retry !== 0) reprovar(`G5: tentativa status=${tentativa.status} retry=${tentativa.retry} em ${onde}`);
    for (const anotacao of tentativa.annotations ?? []) {
      if (ANOTACOES_PROIBIDAS.has(anotacao.type)) reprovar(`G6: anotação proibida "${anotacao.type}" na tentativa de ${onde}`);
      if (anotacao.type === "e2e-login") loginsPorEmail.set(anotacao.description, (loginsPorEmail.get(anotacao.description) ?? 0) + 1);
    }
    passosMascarados(tentativa.steps, onde);
  }
}
for (const [email, quantos] of loginsPorEmail) {
  if (quantos > TETO_LOGIN_POR_EMAIL) reprovar(`G9: orçamento de login estourado: ${quantos} logins pela tela de ${email} (teto ${TETO_LOGIN_POR_EMAIL}; o freio do produto é 10)`);
}

// G7: o agregado.
const totalPreso = Object.values(contagem).reduce((soma, valor) => soma + (Number(valor) || 0), 0);
if (stats.unexpected !== 0 || stats.flaky !== 0 || stats.skipped !== 0 || stats.expected !== totalPreso) {
  reprovar(`G7: stats expected=${stats.expected} (devido ${totalPreso}) unexpected=${stats.unexpected} flaky=${stats.flaky} skipped=${stats.skipped}`);
}

// G8: a configuração que de fato valeu.
const configuracao = relatorio.config ?? {};
if (configuracao.shard) reprovar(`G8: shard ligado: ${JSON.stringify(configuracao.shard)}`);
for (const projeto of configuracao.projects ?? []) {
  if (!(projeto.name in contagem)) continue;
  if (projeto.repeatEach !== 1) reprovar(`G8: repeatEach=${projeto.repeatEach} no projeto ${projeto.name}`);
  if (!(projeto.retries <= 1)) reprovar(`G8: retries=${projeto.retries} no projeto ${projeto.name}`);
  if (!(projeto.timeout <= TETO_TIMEOUT_MS)) reprovar(`G8: timeout=${projeto.timeout} no projeto ${projeto.name} (teto ${TETO_TIMEOUT_MS})`);
}

// G10: as regras estáticas S1 a S4, também no job `e2e`.
for (const motivo of regrasEstaticas()) reprovar(`G10: ${motivo}`);

const resumoContagem = Object.entries(contagem).map(([projeto, valor]) => `${projeto}=${valor}`).join(" ");
encerrar(
  `e2e-guard: suite ${resumoContagem} expected=${stats.expected} unexpected=0 flaky=0 skipped=0 logins=${JSON.stringify(Object.fromEntries(loginsPorEmail))}`,
);
