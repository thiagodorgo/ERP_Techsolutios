import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { emptyFinancialSummary } from "../src/modules/finance/dashboard/financial-summary.types";
import type { FinancialEntry } from "../src/modules/finance/entries/financial-entries.types";
import { fourteenDayDates, localIsoDate } from "../src/modules/finance/pages/financeiro.state";
import type { FinanceiroViewModel } from "../src/modules/finance/pages/views/FinanceiroViewA";
import { AGGREGATE_KEYS } from "../src/modules/finance/pages/views/FinanceiroViewA";
import { FinanceiroViewC } from "../src/modules/finance/pages/views/FinanceiroViewC";
import type { FinancialTitle } from "../src/modules/finance/titles/financial-titles.types";

const now = new Date();
const dayIso = (delta: number) => localIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta));
const aggregate = (groupBy: "none" | "day", items: readonly { bucket: string | null; count: number; inflow: number; outflow: number; net: number }[]) => ({ groupBy, currency: "BRL", timezone: "America/Sao_Paulo", items });
const counted = (count: number) => aggregate("none", [{ bucket: null, count, inflow: 0, outflow: 0, net: 0 }]);
const TITLE: FinancialTitle = { id: "t1", direction: "receivable", partyType: "customer", partyName: "Cliente Alfa", document: "N1", category: null, description: null, amount: 10, currency: "BRL", issueDate: null, dueDate: dayIso(-3), paidAmount: 0, status: "open", competencia: "2026-10", accountId: null, overdue: true, active: true, createdAt: "" };
const ENTRY: FinancialEntry = { id: "e1", accountId: "acc-1", titleId: null, direction: "in", amount: 50, currency: "BRL", paymentMethod: "pix", category: null, occurredAt: "2026-10-23T12:00:00Z", competencia: "2026-10", description: "Recebimento NF 1", reversalOf: null, reconciled: false, divergenceType: null, reconciliationRef: null, reconciledAt: null, reconciledBy: null, active: true, createdAt: "", updatedAt: "" };

function model(over: Partial<FinanceiroViewModel> = {}): FinanceiroViewModel {
  const summary = emptyFinancialSummary();
  return {
    state: { tab: "rec", accountId: null, target: null },
    onState: () => undefined,
    summary: { ...summary, receivable: { ...summary.receivable, overdueAmount: 56300 }, payable: { ...summary.payable, overdueAmount: 30500 }, cheques: { pendingReceivedCount: 3, pendingReceivedAmount: 900, pendingIssuedCount: 1, pendingIssuedAmount: 100, linkedPendingCount: 2, linkedPendingAmount: 700 } },
    summaryLoading: false,
    accounts: { items: [], loading: false, failed: false, total: 0 },
    balances: {},
    receivables: { items: [TITLE], loading: false, failed: false, total: 1, hasMore: false, loadingMore: false, loadMore: async () => undefined },
    payables: { items: [], loading: false, failed: false, total: 0, hasMore: false, loadingMore: false, loadMore: async () => undefined },
    entries: { items: [ENTRY], loading: false, failed: false, total: 1 },
    aggregates: {
      [AGGREGATE_KEYS.pending]: counted(14),
      [AGGREGATE_KEYS.value]: counted(1),
      [AGGREGATE_KEYS.date]: counted(2),
      [AGGREGATE_KEYS.routineDays(null)]: aggregate("day", [{ bucket: dayIso(0), count: 2, inflow: 100, outflow: 40, net: 60 }]),
      [AGGREGATE_KEYS.routineDaysPending(null)]: aggregate("day", [{ bucket: dayIso(0), count: 1, inflow: 0, outflow: 0, net: 0 }]),
      [AGGREGATE_KEYS.routineAge("0-2", null)]: counted(5),
      [AGGREGATE_KEYS.routineAge("3-7", null)]: counted(2),
      [AGGREGATE_KEYS.routineAge("8-15", null)]: counted(6),
      [AGGREGATE_KEYS.routineAge("16+", null)]: counted(1),
    },
    policy: { canUnreconcile: false, delegatedToFinance: false },
    access: { readEntries: true, readTitles: true, readAccounts: true, pay: true, reconcile: true, createAccount: true },
    failed: false,
    stale: false,
    lastUpdatedAt: null,
    entryBusyId: null,
    entryMessage: null,
    onRetry: () => undefined,
    onNewAccount: () => undefined,
    onPay: () => undefined,
    onReconcile: () => undefined,
    onUnreconcile: () => undefined,
    ...over,
  };
}

const css = readFileSync(new URL("../src/styles/app.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const ruleOf = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? null;
};
const source = () => readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewC.tsx", import.meta.url), "utf8");

test("C: ação primária Começar a conferência no cabeçalho, só para quem concilia", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model()} />);
  assert.match(html, /data-aparencia="C"/);
  assert.match(html, /pat-page-header__kicker">FINANCEIRO · ROTINA DO DIA</);
  assert.match(html, /pat-page-header__title">Conferência do caixa</);
  assert.match(html, /baixe o que venceu, confira o que entrou e saiu e concilie com o banco\./);
  const actions = html.slice(html.indexOf("pat-page-header__actions"));
  assert.match(actions, /pat-btn pat-btn--primary[^>]*>.*Começar a conferência/);
  const base = model();
  const consulta = renderToStaticMarkup(<FinanceiroViewC {...model({ access: { ...base.access, reconcile: false } })} />);
  assert.doesNotMatch(consulta, /Começar a conferência/);
});

test("C: 4 indicadores com semântica — 3 passos e cheques, todos clicáveis", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model()} />);
  const row = html.slice(html.indexOf("pat-kpi-row--4"), html.indexOf("financeiro-c__grid"));
  assert.equal((row.match(/class="pat-kpi pat-kpi--clickable"/g) ?? []).length, 4);
  assert.equal((row.match(/class="pat-kpi__tile"/g) ?? []).length, 4, "cada indicador tem o ícone na cor do seu papel");
  for (const [label, tag] of [["Baixar o que venceu", "Passo 1"], ["Conciliar com o banco", "Passo 2"], ["Revisar ressalvas", "Passo 3"], ["Cheques a compensar", "1 emitido"]]) {
    assert.match(row, new RegExp(label));
    assert.match(row, new RegExp(tag));
  }
  assert.match(row, /aria-label="Conciliar com o banco: 14 lançamentos — abrir o passo 2"/);
  assert.match(row, /aria-label="Revisar ressalvas: 3 lançamentos — abrir o passo 3"/);
  assert.match(row, /1 de valor · 2 de data/);
  assert.match(row, /R\$\s900,00 · baixam os títulos sozinhos/);
  assert.match(row, /R\$\s56,3k a receber · R\$\s30,5k a pagar vencidos/, "o dinheiro do indicador vem do resumo do servidor");
});

test("C: movimento diário com os 14 dias da janela; dia sem bucket não vira R$ 0,00", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model()} />);
  const grid = html.slice(html.indexOf("financeiro-c__grid"), html.indexOf("financeiro-bc__panel"));
  assert.match(grid, /Últimos 14 dias: entradas e saídas por dia/);
  assert.match(grid, /clique no dia para ver o extrato/);
  assert.equal((grid.match(/class="ui-day-bars__day[^"]*"/g) ?? []).length, fourteenDayDates().length);
  assert.equal((grid.match(/entradas R\$/g) ?? []).length, 1);
  assert.equal((grid.match(/o servidor não retornou lançamentos neste dia/g) ?? []).length, 13);
  assert.match(grid, /ui-day-bars__day--today/);
  assert.match(grid, /lançamentos a conciliar no dia/);
});

test("C: idade das pendências com 4 colunas clicáveis e contagem do servidor", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model()} />);
  const grid = html.slice(html.indexOf("financeiro-c__grid"), html.indexOf("financeiro-bc__panel"));
  assert.match(grid, /Há quanto tempo cada lançamento espera a conciliação/);
  assert.equal((grid.match(/class="ui-column-bars__column"/g) ?? []).length, 4);
  for (const text of ["5 lançamentos a conciliar há até 2 dias", "2 lançamentos a conciliar há 3 a 7 dias", "6 lançamentos a conciliar há 8 a 15 dias", "1 lançamentos a conciliar há mais de 15"]) assert.match(grid, new RegExp(text));
  assert.match(grid, /Quanto mais à direita, mais antigo/);
  assert.match(source(), /onSelect=\{\(target\) => go\(\{ tab: "conc", target \}\)\}/);
});

test("C: idade indisponível é declarada; faixa isolada ausente vira —, nunca zero", () => {
  const base = model();
  const ages = { [AGGREGATE_KEYS.routineAge("0-2", null)]: null, [AGGREGATE_KEYS.routineAge("3-7", null)]: null, [AGGREGATE_KEYS.routineAge("8-15", null)]: null, [AGGREGATE_KEYS.routineAge("16+", null)]: null };
  const none = renderToStaticMarkup(<FinanceiroViewC {...model({ aggregates: { ...base.aggregates, ...ages } })} />);
  assert.match(none, /Contagem por idade indisponível/);
  const one = renderToStaticMarkup(<FinanceiroViewC {...model({ aggregates: { ...base.aggregates, [AGGREGATE_KEYS.routineAge("3-7", null)]: null } })} />);
  assert.match(one, /Contagem indisponível dos lançamentos a conciliar há 3 a 7 dias/);
  assert.match(one, /ui-column-bars__value">—</);
});

test("C: painel com 4 passos, contagens, busca e contador", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model()} />);
  const toolbar = html.slice(html.indexOf("financeiro-bc__toolbar"));
  assert.match(toolbar, /role="tablist"/);
  assert.match(toolbar, /aria-selected="true"[^>]*>1 · Baixar<span class="financeiro-bc__tab-count">1</);
  assert.match(toolbar, /2 · Conciliar<span class="financeiro-bc__tab-count">14</);
  assert.match(toolbar, /3 · Ressalvas<span class="financeiro-bc__tab-count">3</);
  assert.match(toolbar, /Extrato completo/);
  assert.match(toolbar, /class="pat-os-search"/);
  assert.match(toolbar, /pat-os-count">1 título</);
});

test("C: passo 1 organiza por vencimento, com direção por linha e subconjunto declarado", () => {
  const base = model();
  const html = renderToStaticMarkup(
    <FinanceiroViewC
      {...model({
        receivables: {
          ...base.receivables,
          items: [TITLE, { ...TITLE, id: "t2", dueDate: dayIso(0), overdue: false }, { ...TITLE, id: "t3", dueDate: dayIso(3), overdue: false }, { ...TITLE, id: "t4", dueDate: dayIso(10), overdue: false }],
          total: 7,
          hasMore: true,
        },
      })}
    />,
  );
  assert.match(html, /Títulos vencidos, de hoje e dos próximos 7 dias, a receber e a pagar juntos/);
  assert.match(html, /aria-label="Vencidos: 1 título carregado — filtrar a lista"/);
  assert.match(html, /aria-label="Vencem hoje: 1 título carregado — filtrar a lista"/);
  assert.match(html, /aria-label="Próximos dias: 1 título carregado — filtrar a lista"/, "o título em 10 dias fica fora, como o filtro sem7");
  assert.match(html, /financeiro-bc__dir--in/);
  assert.match(html, /nos 4 títulos carregados de 7/);
  assert.match(html, /4 títulos carregados de 7 no servidor/);
  assert.match(html, /Carregar mais a receber/);
});

test("C: passo 2 organiza por dia e mostra o progresso da sessão", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model({ state: { tab: "conc", accountId: null, target: "conc:pendente" } })} />);
  assert.match(html, /Conferidos nesta sessão: 0 de 14/);
  assert.match(html, /financeiro-bc__group-head--static/);
  assert.match(html, /Sexta-feira, 23\/10\/2026/);
  assert.match(html, /Recebimento NF 1/);
  assert.doesNotMatch(html, /Tudo conciliado/, "fim da página não é o mesmo que tudo conciliado");
});

test("C: passo 3 filtra um tipo de ressalva por vez, no servidor", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model({ state: { tab: "conc", accountId: null, target: "conc:valor" }, entries: { items: [], loading: false, failed: false, total: 0 } })} />);
  assert.match(html, /Conciliados com ressalva/);
  assert.match(html, /aria-pressed="true" aria-label="Ressalva de valor: 1 — filtrar a lista"/);
  assert.match(html, /aria-pressed="false" aria-label="Ressalva de data: 2 — filtrar a lista"/);
  assert.match(html, /Nenhuma ressalva/);
});

test("C: com conta na URL, indicador global não se anuncia pressionado e o chip mostra o escopo", () => {
  const account = { id: "acc-1", name: "Banco do Brasil", kind: "bank", currency: "BRL", openingBalance: 0, bankName: null, active: true, createdAt: "" } as const;
  const html = renderToStaticMarkup(<FinanceiroViewC {...model({ state: { tab: "conc", accountId: "acc-1", target: "conc:pendente" }, accounts: { items: [account], loading: false, failed: false, total: 1 } })} />);
  assert.match(html, /aria-label="Conciliar com o banco:[^"]*" aria-pressed="false"/);
  assert.match(html, /Filtro: Conta: Banco do Brasil/);
});

test("C loading usa skeleton acessível, sem a ação primária", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model({ summaryLoading: true })} />);
  assert.match(html, /aria-busy="true" aria-label="Carregando a rotina do dia"/);
  assert.doesNotMatch(html, /Começar a conferência/);
});

test("C erro inicial oferece retry", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model({ failed: true })} />);
  assert.match(html, /data-state="error"/);
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Começar a conferência/);
});

test("C sem leitura é forbidden", () => {
  const base = model();
  const html = renderToStaticMarkup(<FinanceiroViewC {...model({ access: { ...base.access, readEntries: false } })} />);
  assert.match(html, /data-state="forbidden"/);
  assert.doesNotMatch(html, /Começar a conferência/);
});

test("C stale mantém dados e mostra faixa", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model({ stale: true })} />);
  assert.match(html, /Dados desatualizados/);
  assert.match(html, /Cheques a compensar/);
});

test("C vazio não declara total global", () => {
  const base = model();
  const html = renderToStaticMarkup(<FinanceiroViewC {...model({ receivables: { ...base.receivables, items: [], total: 4 }, entries: { items: [], loading: false, failed: false, total: 9 } })} />);
  assert.match(html, /data-state="empty"/);
  assert.match(html, /carregue a próxima página antes de concluir/);
  assert.doesNotMatch(html, /Tudo conferido/);
});

test("C não inventa vínculo inverso de cheque: o indicador explica, e a lista segue a mesma", () => {
  const html = renderToStaticMarkup(<FinanceiroViewC {...model()} />);
  assert.match(html, /aria-label="Cheques a compensar: 3 cheques — como conferir"/);
  assert.doesNotMatch(html, /título t1.*cheque/i);
  assert.match(source(), /setChequeInfo\(\(current\) => !current\)/);
  assert.match(source(), /o resumo não lista os títulos de cada cheque/);
});

test("C: conferência em sequência avança só no sucesso, e só na mesma linha", () => {
  const view = source();
  assert.match(view, /const \[openEntryId, setOpenEntryId\]/);
  assert.match(view, /model\.onReconcile\(entry, \(\) => afterConference\(entry\), true\)/);
  assert.match(view, /if \(openRef\.current !== entry\.id\) return;/);
});

test("C avança somente no onDone do formulário e fechar não confirma", () => {
  const page = readFileSync(new URL("../src/modules/finance/pages/FinanceiroPage.tsx", import.meta.url), "utf8");
  assert.equal((page.match(/reconcileDone\?\.\(\)/g) ?? []).length, 1);
  assert.match(page, /onDone=\{\(updated\) => \{[\s\S]*reconcileDone\?\.\(\)/);
  assert.doesNotMatch(page, /onClose=\{\(\) => \{[^}]*reconcileDone/);
  assert.match(page, /setReconcileOp\(\(current\) => \(current\?\.entry\.id === updated\.id \? null : current\)\)/, "resposta atrasada não fecha o formulário de outra linha");
});

test("C conta em Próximos dias exatamente os mesmos títulos do filtro sem7", () => {
  const base = model();
  const html = renderToStaticMarkup(
    <FinanceiroViewC
      {...model({
        receivables: {
          ...base.receivables,
          items: [
            { ...TITLE, id: "em-tres-dias", dueDate: dayIso(3), overdue: false },
            { ...TITLE, id: "em-dez-dias", dueDate: dayIso(10), overdue: false },
          ],
          total: 2,
        },
      })}
    />,
  );
  assert.match(html, /aria-label="Próximos dias: 1 título carregado — filtrar a lista"/);
  assert.match(html, /<small>1 título<\/small>/);
});

test("Grade de C: 4 indicadores compactos e 14 dias + idade na proporção da referência", () => {
  assert.match(css, /\.financeiro-c__loading, \.financeiro-c > \.pat-kpi-row--4 \{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(ruleOf(".financeiro-c .pat-kpi__value") ?? "", /font-size:\s*18px/);
  assert.match(ruleOf(".financeiro-c__grid") ?? "", /grid-template-columns:\s*minmax\(0, 1\.5fr\) minmax\(0, 1fr\)/);
  assert.match(ruleOf(".financeiro-c .pat-kpi--clickable:hover") ?? "", /border-color:\s*#2563eb/, "indicador clicável responde ao ponteiro");
});
