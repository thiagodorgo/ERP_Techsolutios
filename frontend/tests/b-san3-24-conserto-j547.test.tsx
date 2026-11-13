import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import * as chequeShared from "../src/modules/finance/cheques/components/cheques.shared";
import { cashImpactFor } from "../src/modules/finance/cheques/cheque-cash-impact";
import type { Cheque } from "../src/modules/finance/cheques/cheques.types";
import { ChequeClearConfirm } from "../src/modules/finance/cheques/components/ChequeClearConfirm";
import type { ChequesViewModel } from "../src/modules/finance/cheques/components/cheques.shared";
import { ChequesViewA } from "../src/modules/finance/cheques/components/ChequesViewA";
import { ChequesViewB } from "../src/modules/finance/cheques/components/ChequesViewB";
import { ChequesViewC } from "../src/modules/finance/cheques/components/ChequesViewC";
import { EMPTY_FILTER } from "../src/modules/finance/cheques/useCheques";
import type { FechamentoViewModel } from "../src/modules/finance/period-closes/components/fechamento.shared";
import { FechamentoViewA } from "../src/modules/finance/period-closes/components/FechamentoViewA";
import { FechamentoViewB } from "../src/modules/finance/period-closes/components/FechamentoViewB";
import { FechamentoViewC } from "../src/modules/finance/period-closes/components/FechamentoViewC";
import type { PeriodDetail, PeriodRow } from "../src/modules/finance/period-closes/period-closes.types";

// J-547 (B-SAN3-24, item 29) — o conserto único da junta: um caso por achado da triagem, cada um vermelho no objeto
// julgado (`a18192e1`) e verde depois do conserto. Renderiza as views PURAS (SSR, o molde de
// `b-san3-24-cheques.smoke.test.tsx`) e as funções puras; o que só se vê com a página e os hooks reais (o desatualizado
// do C3-08, a regra do mês sem linha do C3-12 de ponta a ponta e o clique do C3-10) está em
// `b-san3-24-conserto-j547-live.test.tsx`. O que é dinheiro ou número na tela (C3-09, C3-12) afirma o VALOR.
// Os símbolos que só existem depois do conserto entram por `import()` dentro do caso, para o vermelho do objeto antigo
// ser o do comportamento, caso a caso, e não o de o arquivo inteiro não carregar.

const FRONT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SP_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const daysFromToday = (days: number) => SP_DAY.format(new Date(Date.now() + days * 86_400_000));

function cheque(over: Partial<Cheque>): Cheque {
  return {
    id: "chq-1",
    accountId: "acc-1",
    titleId: null,
    direction: "received",
    chequeNumber: "000100",
    bank: "Sicredi",
    amount: 100,
    currency: "BRL",
    dueDate: null,
    status: "registered",
    clearedEntryId: null,
    bounceEntryId: null,
    bounceReason: null,
    notes: null,
    active: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    ...over,
  };
}

type ChequeList = ChequesViewModel["list"];
const list = (items: readonly Cheque[], over: Partial<ChequeList> = {}): ChequeList => ({
  items,
  total: items.length,
  pendingTotals: null,
  complete: true,
  loading: false,
  failed: false,
  forbidden: false,
  stale: false,
  lastUpdatedAt: null,
  ...over,
});

function chequesModel(over: Partial<ChequesViewModel> = {}): ChequesViewModel {
  const items = [cheque({ id: "chq-a", status: "deposited" })];
  return {
    summary: { pendingReceivedCount: 4, pendingReceivedAmount: 4515.5, pendingIssuedCount: 3, pendingIssuedAmount: 9250, linkedPendingCount: 2, linkedPendingAmount: 4600 },
    summaryLoading: false,
    summaryStale: false,
    list: list(items),
    filter: EMPTY_FILTER,
    onFilter: () => undefined,
    page: { offset: 0, limit: 20 },
    onPage: () => undefined,
    counts: { registered: 5, deposited: 2, cleared: 2, bounced: 1, cancelled: 1 },
    countsLoading: false,
    accounts: [],
    accountsLoading: false,
    accountCounts: {},
    pending: list(items, { total: null }),
    canRegister: true,
    actionsFor: () => [],
    details: {},
    onOpen: () => undefined,
    onAction: () => undefined,
    onRegister: () => undefined,
    onRetry: () => undefined,
    message: null,
    onDismissMessage: () => undefined,
    ...over,
  } as ChequesViewModel;
}

const render = (node: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
const renderCheques = (View: (m: ChequesViewModel) => React.ReactElement, m: ChequesViewModel) => render(React.createElement(View, m));

function between(html: string, start: string, end: string): string {
  const from = html.indexOf(start);
  assert.ok(from >= 0, `"${start}" na tela`);
  const to = html.indexOf(end, from + start.length);
  assert.ok(to > from, `"${end}" depois de "${start}"`);
  return html.slice(from, to);
}

// ── C3-09 — Mesa de hoje: "depositar hoje" é só o RECEBIDO (dinheiro na tela; o valor é afirmado) ──
test("C3-09 a mesa de hoje da C põe em 'depositar hoje' só o cheque RECEBIDO com bom para vencido, nunca o EMITIDO", () => {
  const received = cheque({ id: "chq-rec", chequeNumber: "000106", amount: 455, direction: "received", status: "registered", dueDate: daysFromToday(-2) });
  const issued = cheque({ id: "chq-emi", chequeNumber: "004599", amount: 333.33, direction: "issued", status: "registered", dueDate: daysFromToday(-2) });
  const depositedIssued = cheque({ id: "chq-dep-emi", chequeNumber: "004503", amount: 1200, direction: "issued", status: "deposited" });
  const items = [received, issued, depositedIssued];
  const html = renderCheques(ChequesViewC, chequesModel({ list: list(items), pending: list(items, { total: null }) }));
  const deposit = between(html, "Depositar hoje · bom para chegou", "Entram quando o banco compensar");
  assert.match(deposit, /000106/);
  assert.match(deposit, /R\$\s455,00/, "o valor do recebido vencido");
  assert.doesNotMatch(deposit, /004599/, "o emitido quem deposita é o fornecedor");
  assert.doesNotMatch(deposit, /333,33/);
  const leaves = between(html, "Saem quando o banco compensar", "Cheques por prazo");
  assert.match(leaves, /004503/);
  assert.match(leaves, /R\$\s1\.200,00/, "o emitido depositado sai quando o banco compensar");
});

// ── C3-04 — o 3º quadro da Cheques C: pendentes sem título, do resumo do servidor; os 3 quadros filtram ──
test("C3-04 o 3º quadro da C é 'Pendentes sem título · 5 cheques · compensam sem baixar título', e os 3 quadros filtram", () => {
  const calls: unknown[] = [];
  const html = renderCheques(ChequesViewC, chequesModel({ onFilter: (next) => calls.push(next) }));
  assert.match(html, /PENDENTES SEM TÍTULO/);
  assert.match(html, /5 cheques/, "4 recebidos + 3 emitidos pendentes − 2 vinculados = 5, do resumo do servidor");
  assert.match(html, /compensam sem baixar título/);
  assert.doesNotMatch(html, /VINCULADOS A TÍTULO/);
  assert.match(html, /<button[^>]*aria-label="Pendentes sem título: 5 — filtrar a lista"/);
  assert.match(html, /<button[^>]*aria-label="A receber pendentes: R\$\s4\.515,50 — filtrar a lista"/);
  assert.match(html, /<button[^>]*aria-label="A pagar pendentes: R\$\s9\.250,00 — filtrar a lista"/);
});

// ── C3-05 — "Conta não listada" enquanto as contas carregam ──
test("C3-05 com as contas carregando: a coluna, o detalhe e a confirmação mostram o marcador, nunca 'Conta não listada'", () => {
  assert.equal(chequeShared.accountNameOf([], "acc-1", true), null, "carregando: nome nulo (marcador)");
  assert.equal(chequeShared.accountNameOf([], "acc-1", false), "Conta não listada", "carregado e fora da lista: aí sim");
  const target = cheque({ id: "chq-a", status: "deposited", amount: 1850 });
  const loading = chequesModel({ accountsLoading: true, accounts: [], list: list([target]) });
  for (const View of [ChequesViewA, ChequesViewB, ChequesViewC]) {
    const html = renderCheques(View, loading);
    assert.doesNotMatch(html, /Conta não listada/, View.name);
    assert.match(html, /aria-label="Carregando a conta"/, View.name);
  }
  const impact = cashImpactFor(target, "clear", { accountName: chequeShared.accountNameOf([], target.accountId, true), title: null });
  const confirm = renderToStaticMarkup(
    <ChequeClearConfirm cheque={target} action="clear" impact={impact} accountLoading busy={false} onConfirm={() => undefined} onCancel={() => undefined} />,
  );
  assert.match(confirm, /Entra R\$\s1\.850,00 na conta do cheque hoje\./);
  assert.match(confirm, /Carregando o nome da conta/);
  assert.doesNotMatch(confirm, /Conta não listada/);
});

// ── C3-07 — carregando: esqueleto, nenhum fato afirmado ──
test("C3-07 Cheques carregando: nenhum 'Indisponível', nenhum '0 cheques' e nenhum prazo 0 antes de o servidor responder", () => {
  const nulls = { registered: null, deposited: null, cleared: null, bounced: null, cancelled: null };
  const html = renderCheques(ChequesViewA, chequesModel({ counts: nulls, countsLoading: true, list: list([], { loading: true, total: 0 }) }));
  assert.doesNotMatch(html, /Indisponível/, "contagem ainda não voltou ≠ servidor não respondeu");
  assert.doesNotMatch(html, />0 cheques</);
  const c = renderCheques(ChequesViewC, chequesModel({ counts: nulls, countsLoading: true, list: list([], { loading: true }), pending: list([], { loading: true, total: null }) }));
  assert.doesNotMatch(c, /Bom para já passou<b>0<\/b>/);
  assert.doesNotMatch(c, /Bom para hoje<b>0<\/b>/);
  assert.doesNotMatch(c, /Próximos 7 dias<b>0<\/b>/);
  assert.doesNotMatch(c, /Nenhum cheque\./, "a mesa de hoje não afirma vazio enquanto carrega");
});

type PeriodsList = FechamentoViewModel["list"];
function fechModel(over: Partial<FechamentoViewModel> & { readonly list?: Partial<PeriodsList> } = {}): FechamentoViewModel {
  const { list: listOver, ...rest } = over;
  return {
    list: { rows: [], currentKey: "2026-11", loading: false, failed: false, forbidden: false, stale: false, lastUpdatedAt: null, ...listOver },
    details: {},
    monthToClose: "2026-10",
    filter: "all",
    onFilter: () => undefined,
    onFocusMonth: () => undefined,
    liveCashFlow: null,
    liveLoading: false,
    actionsFor: () => ["close"],
    onOpen: () => undefined,
    onAction: () => undefined,
    onRetry: () => undefined,
    message: null,
    onDismissMessage: () => undefined,
    ...rest,
  } as FechamentoViewModel;
}
const renderFech = (View: (m: FechamentoViewModel) => React.ReactElement, m: FechamentoViewModel) => render(React.createElement(View, m));

test("C3-07 Fechamento carregando: esqueleto nas 3, sem 'nenhum mês fechado', sem calendário 'aberto' e sem botão de fechar o mês corrente", () => {
  const loading = fechModel({ list: { loading: true, rows: [] }, monthToClose: "2026-11" });
  const a = renderFech(FechamentoViewA, loading);
  assert.doesNotMatch(a, /nenhum mês fechado ainda/);
  assert.doesNotMatch(a, /em novembro\/2026/);
  assert.match(a, /aria-busy="true"/);
  const b = renderFech(FechamentoViewB, loading);
  assert.doesNotMatch(b, /Nenhum mês fechado ainda\./);
  assert.doesNotMatch(b, /Nenhuma exceção\./);
  assert.doesNotMatch(b, /Fechar novembro\/2026/, "o mês corrente nunca aparece como o mês a fechar enquanto a lista carrega");
  const c = renderFech(FechamentoViewC, loading);
  assert.doesNotMatch(c, /aberto</, "o calendário não diz aberto antes de saber");
  assert.doesNotMatch(c, /em andamento/);
  assert.doesNotMatch(c, /Fechar novembro\/2026/);
  assert.doesNotMatch(c, /Checklist de novembro\/2026/, "o checklist não nomeia o mês antes de a lista dizer qual é o mês a fechar");
});

const closedSep: PeriodRow = { period: "2026-09", status: "closed", closedAt: "2026-10-03T15:00:00.000Z", reopenedAt: null };
const reopenedJul: PeriodRow = { period: "2026-07", status: "reopened", closedAt: "2026-08-04T15:00:00.000Z", reopenedAt: "2026-08-10T15:00:00.000Z" };
function snapshotDetail(row: PeriodRow, entriesIn: number, entriesOut: number): PeriodDetail {
  const agg = { count: 1, sumAmount: 0 };
  return {
    period: row.period,
    status: row.status,
    closedAt: row.closedAt,
    reopenedAt: row.reopenedAt,
    reopenReason: row.status === "reopened" ? "Tarifa lançada fora do mês" : null,
    closeCount: 1,
    checklist: { inDisputeTitles: 0, unpaidTitles: 0, unreconciledEntries: 0 },
    snapshot: {
      computedAt: row.closedAt,
      forced: false,
      forcedReason: null,
      entriesIn: { count: 2, sumAmount: entriesIn },
      entriesOut: { count: 1, sumAmount: entriesOut },
      net: entriesIn - entriesOut,
      receivable: agg,
      payable: agg,
      pendingAtClose: { inDisputeTitles: 0, unpaidTitles: 0, unreconciledEntries: 0 },
    },
  };
}

// ── C3-01 — o tempo para fechar ──
test("C3-01 o tempo para fechar: a coluna nas 3, o indicador da A, o cartão 'Dias para fechar' da B e o calendário da C", () => {
  const rows: PeriodRow[] = [
    { period: "2026-11", status: "open", closedAt: null, reopenedAt: null },
    { period: "2026-10", status: "open", closedAt: null, reopenedAt: null },
    closedSep,
  ];
  const m = fechModel({ list: { rows } });
  for (const View of [FechamentoViewA, FechamentoViewB, FechamentoViewC]) {
    const html = renderFech(View, m);
    assert.match(html, /TEMPO PARA FECHAR/, `${View.name}: a coluna`);
    assert.match(html, /<b>3 d<\/b>/, `${View.name}: setembro fechou em 03/10 = 3 dias depois de 30/09`);
    assert.match(html, /aberto há \d+ d/, `${View.name}: outubro terminou e segue aberto`);
  }
  const a = renderFech(FechamentoViewA, m);
  assert.match(a, /Tempo típico para fechar/);
  assert.match(a, />3 dias</, "a mediana de [3] é 3");
  const b = renderFech(FechamentoViewB, m);
  assert.match(b, /Dias para fechar depois do fim do mês/);
  assert.match(b, /aria-label="Setembro\/2026: fechou 3 dias depois do fim do mês — abrir o mês"/);
  const c = renderFech(FechamentoViewC, m);
  assert.match(c, /em 3 d/);
  const viewA = readFileSync(path.join(FRONT, "src/modules/finance/period-closes/components/FechamentoViewA.tsx"), "utf8");
  const viewB = readFileSync(path.join(FRONT, "src/modules/finance/period-closes/components/FechamentoViewB.tsx"), "utf8");
  assert.doesNotMatch(viewA, /"Tempo médio para fechar", "fechados com pendência" e o resultado do mês na linha estão marcados "falta no backend"/, "o comentário falso saiu");
  assert.doesNotMatch(viewB, /"Dias para fechar depois do fim do mês" não tem dado no servidor/, "o comentário falso saiu");
});

test("C3-01 as funções do tempo (dias de calendário de São Paulo, mediana sem acumular)", async () => {
  const rows = await import("../src/modules/finance/period-closes/period-rows");
  assert.equal(rows.daysToClose("2026-09", "2026-10-03T15:00:00.000Z"), 3);
  assert.equal(rows.daysToClose("2026-09", "2026-10-01T02:30:00.000Z"), 0, "23h30 de 30/09 em São Paulo ainda é 30/09");
  assert.equal(rows.daysToClose("2026-06", null), null);
  assert.equal(rows.lastDayOfPeriod("2026-02"), "2026-02-28");
  assert.equal(rows.medianDays([]), null);
  assert.equal(rows.medianDays([9, 3, 4]), 4);
  assert.equal(rows.medianDays([3, 4]), 3.5);
});

// ── C3-03 — "Entradas × saídas" da B com os meses abertos, ao vivo ──
test("C3-03 o 'Entradas × saídas' da B mostra o mês fechado pelo retrato e o aberto ao vivo, do summary.cashFlow", () => {
  const rows: PeriodRow[] = [
    { period: "2026-11", status: "open", closedAt: null, reopenedAt: null },
    { period: "2026-10", status: "open", closedAt: null, reopenedAt: null },
    closedSep,
  ];
  const html = renderFech(
    FechamentoViewB,
    fechModel({
      list: { rows },
      details: { "2026-09": { loading: false, failed: false, detail: snapshotDetail(closedSep, 1500, 400) } },
      liveCashFlow: [
        { competencia: "2026-09", inflow: 999, outflow: 999 },
        { competencia: "2026-10", inflow: 10350, outflow: 6200 },
        { competencia: "2026-11", inflow: 3400, outflow: 480 },
      ],
    }),
  );
  assert.match(html, /aria-label="Setembro\/2026, fechado: entradas R\$\s1\.500,00, saídas R\$\s400,00, resultado R\$\s1\.100,00 — abrir o mês"/, "fechado: o retrato congelado, não o ao vivo");
  assert.match(html, /aria-label="Outubro\/2026, aberto, ao vivo: entradas R\$\s10\.350,00, saídas R\$\s6\.200,00 — abrir o mês"/);
  assert.match(html, /aria-label="Novembro\/2026, aberto, ao vivo: entradas R\$\s3\.400,00, saídas R\$\s480,00 — abrir o mês"/);
  assert.doesNotMatch(html, /999,00/, "o mês fechado nunca usa o ao vivo");
  assert.match(html, /title="Outubro\/2026 \(ao vivo, ainda não fechado\) — entradas R\$\s10\.350,00, saídas R\$\s6\.200,00"/, "o valor ao passar o mouse (cc0fb777) continua");
});

// ── C3-10 — os clicáveis da B do Fechamento ──
test("C3-10 na B do Fechamento, as colunas dos gráficos e as exceções são botões que abrem o mês", () => {
  const rows: PeriodRow[] = [{ period: "2026-11", status: "open", closedAt: null, reopenedAt: null }, closedSep, reopenedJul];
  const html = renderFech(
    FechamentoViewB,
    fechModel({
      list: { rows },
      details: { "2026-09": { loading: false, failed: false, detail: snapshotDetail(closedSep, 1500, 400) }, "2026-07": { loading: false, failed: false, detail: snapshotDetail(reopenedJul, 800, 300) } },
      liveCashFlow: [{ competencia: "2026-07", inflow: 900, outflow: 350 }],
    }),
  );
  assert.match(html, /<button[^>]*aria-label="Setembro\/2026, fechado: [^"]*— abrir o mês"/);
  assert.match(html, /<button[^>]*aria-label="Julho\/2026, reaberto, ao vivo: [^"]*— abrir o mês"/);
  assert.match(html, /<button[^>]*aria-label="Julho\/2026: reaberto: Tarifa lançada fora do mês — abrir o mês"/, "a exceção abre o mês");
  assert.doesNotMatch(html, /role="listitem"/, "nenhuma barra de enfeite: todas abrem o mês");
});

// ── C3-11 — medida e token dos blocos e das abas, pela biblioteca ──
test("C3-11 blocos e abas são os da biblioteca (bloco de 36 px com borda; abas de 30 px; foco de 2 px #2563EB)", () => {
  const css = readFileSync(path.join(FRONT, "src/styles/app.css"), "utf8");
  assert.match(css, /\.financeiro-bc__block \{[^}]*min-height: 36px;[^}]*border: 1px solid #e2e8f0;/);
  assert.match(css, /\.financeiro-bc__toolbar \.pat-os-tab \{[^}]*min-height: 30px;/);
  assert.match(css, /\.financeiro-b__account:focus-visible \{ outline: 2px solid #2563eb;/);
  const a = renderCheques(ChequesViewA, chequesModel());
  assert.equal((a.match(/class="financeiro-bc__block"/g) ?? []).length, 5, "Cheques A: os 5 blocos de situação");
  assert.match(a, /class="financeiro-bc__toolbar"/, "Cheques A: a barra das abas de direção");
  assert.equal((renderCheques(ChequesViewC, chequesModel()).match(/class="financeiro-bc__block"/g) ?? []).length, 5, "Cheques C: os 5 blocos de prazo");
  assert.match(renderCheques(ChequesViewB, chequesModel()), /<button[^>]*class="financeiro-b__account"/, "Cheques B: o botão de linha com o foco do sistema");
  for (const View of [FechamentoViewA, FechamentoViewB, FechamentoViewC]) {
    const html = renderFech(View, fechModel({ list: { rows: [closedSep] } }));
    assert.equal((html.match(/class="financeiro-bc__block"/g) ?? []).length, 3, `${View.name}: os 3 blocos de situação`);
  }
});

// ── C3-12 — uma regra só para o mês sem linha no servidor (os números da tela batem) ──
test("C3-12 uma regra só para o mês sem linha no servidor: o calendário marca abertos os MESMOS 2 meses que o bloco conta; os outros ficam 'sem fechamento'", async () => {
  const { periodRowsFor } = await import("../src/modules/finance/period-closes/period-rows");
  const server: PeriodRow[] = [
    { period: "2026-06", status: "closed", closedAt: "2026-07-03T15:00:00.000Z", reopenedAt: null },
    reopenedJul,
    { period: "2026-08", status: "closed", closedAt: "2026-09-02T15:00:00.000Z", reopenedAt: null },
    closedSep,
  ];
  const rows = periodRowsFor(server, "2026-11");
  assert.deepEqual(
    rows.map((row) => `${row.period}:${row.status}`),
    ["2026-11:open", "2026-10:open", "2026-09:closed", "2026-08:closed", "2026-07:reopened", "2026-06:closed"],
    "as linhas do servidor, mais a corrente e a anterior (o mês a fechar)",
  );
  const html = renderFech(FechamentoViewC, fechModel({ list: { rows } }));
  assert.match(html, /aria-label="Terminaram e não estão fechados: 2 — filtrar a lista"/, "julho (reaberto) e outubro (aberto)");
  const ended = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro"];
  const openTiles = ended.filter((month) => new RegExp(`aria-label="${month}/2026: (aberto|reaberto) — abrir o checklist"`).test(html));
  assert.deepEqual(openTiles, ["Julho", "Outubro"], "o calendário marca abertos os MESMOS 2");
  for (const month of ["Janeiro", "Fevereiro", "Março", "Abril", "Maio"]) {
    assert.match(html, new RegExp(`aria-label="${month}/2026: sem fechamento — abrir o checklist"`), `${month}: sem linha no servidor, neutro`);
  }
  assert.match(html, /aria-label="Fechados: 3 — filtrar a lista"/);
  assert.equal(periodRowsFor([], "2026-01").map((row) => row.period).join(","), "2026-01,2025-12", "em janeiro, a anterior é dezembro do ano que passou");
  const empty = renderFech(FechamentoViewA, fechModel({ list: { rows: periodRowsFor([], "2026-11") } }));
  assert.match(empty, /aria-label="Terminaram e não estão fechados: 1 — filtrar a lista"/, "sem fechamento nenhum: só a anterior conta (o mês a fechar)");
});
