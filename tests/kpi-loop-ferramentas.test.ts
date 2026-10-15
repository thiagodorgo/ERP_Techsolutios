import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error -- script .mjs sem tipos
import { dataBrasilia, blocoDoTitulo, contagensDoLog, acrescentarNoJson, acrescentarNaTabela, CABECALHO_TABELA } from "../scripts/kpi-history-append.mjs";
// @ts-expect-error -- script .mjs sem tipos
import { extrairReferencias, linhasAcrescentadas } from "../scripts/kpi-check-refs.mjs";

test("kpi-history-append: a data do merge é a de Brasília, não a UTC", () => {
  assert.equal(dataBrasilia("2026-10-10T03:40:00Z"), "2026-10-10");
  assert.equal(dataBrasilia("2026-10-11T02:30:00Z"), "2026-10-10"); // 23:30 de 10/10 em Brasília
});

test("kpi-history-append: o bloco vem do título do PR", () => {
  assert.equal(blocoDoTitulo("fix(expenses): sync de despesa atômico (B-O6R-03a)"), "B-O6R-03a");
  assert.equal(blocoDoTitulo("fix(web): menu sem tela fictícia (B-SAN3-06a-telas)"), "B-SAN3-06a-telas");
  assert.equal(blocoDoTitulo("docs(registro): sem bloco"), null);
});

const LOG_VERDE = [
  "backend\tTests\t2026-10-14T13:43:30Z [run-backend-tests] 305 arquivo(s) · 3339 teste(s) · pass 3337 · fail 0 · skipped 2",
  "frontend\tSmoke\t2026-10-14T13:40:00Z # tests 1327",
  "frontend\tSmoke\t2026-10-14T13:40:00Z # pass 1327",
  "flutter\tTest\t2026-10-14T13:41:00Z 00:53 +864: All tests passed!",
].join("\n");

test("kpi-history-append: as contagens saem do log da CI", () => {
  const c = contagensDoLog(LOG_VERDE);
  assert.equal(c.backend, "3337/3339");
  assert.equal(c.frontend, "1327/1327");
  assert.equal(c.flutter, "864/864");
});

test("kpi-history-append: log sem uma contagem é erro, nunca chute", () => {
  assert.throws(() => contagensDoLog(LOG_VERDE.replace(/^flutter.*$/m, "")), /flutter/);
});

test("kpi-history-append: rodada com falha no backend não é publicada", () => {
  assert.throws(() => contagensDoLog(LOG_VERDE.replace("fail 0", "fail 2")), /falha/);
});

test("kpi-history-append: acrescenta no JSON sem reformatar o resto e mantendo o CRLF", () => {
  const antes = '[\r\n  {\r\n    "pr": 1,\r\n    "blocks_completed": 1\r\n  }\r\n]\r\n';
  const depois = acrescentarNoJson(antes, { pr: 2, blocks_completed: 2 });
  assert.ok(depois.startsWith('[\r\n  {\r\n    "pr": 1,'));
  assert.deepEqual(JSON.parse(depois).map((e: { pr: number }) => e.pr), [1, 2]);
  assert.ok(!/[^\r]\n/.test(depois), "todo fim de linha continua CRLF");
});

test("kpi-history-append: a linha entra no fim da ÚLTIMA tabela de entregas, antes do texto que a segue", () => {
  const md = ["# Histórico", CABECALHO_TABELA, "|-----|", "| antiga |", "", CABECALHO_TABELA, "|-----|", "| a |", "| b |", "", "Texto depois."].join("\n");
  const out = acrescentarNaTabela(md, "| nova |").split("\n");
  assert.equal(out[out.indexOf("| b |") + 1], "| nova |");
  assert.equal(out[out.indexOf("| antiga |") + 1], "");
});

test("kpi-check-refs: extrai commit, rodada de CI e PR, sem confundir palavra com hash", () => {
  const r = extrairReferencias("merge `d910c97f` run 38574848019, PR #425; head 302b130e; a palavra 'decade' e o id 'abcdefa' não são hash");
  assert.deepEqual(r.hashes.sort(), ["302b130e", "d910c97f"]);
  assert.deepEqual(r.runs, ["38574848019"]);
  assert.deepEqual(r.prs, ["425"]);
});

test("kpi-check-refs: só conta as linhas acrescentadas do diff", () => {
  const diff = ["+++ b/Kpis/x.json", "-removida 302b130e", "+nova d910c97f", " contexto 99f18403"].join("\n");
  assert.equal(linhasAcrescentadas(diff), "nova d910c97f");
});
