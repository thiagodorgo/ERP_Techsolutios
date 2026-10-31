import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { emptyFinancialSummary } from "../src/modules/finance/dashboard/financial-summary.types";
import type { EntriesAggregate } from "../src/modules/finance/entries/financial-entries.types";
import type { FinancialEntry } from "../src/modules/finance/entries/financial-entries.types";
import type { FinancialTitle } from "../src/modules/finance/titles/financial-titles.types";
import { sixMonthCompetencias } from "../src/modules/finance/pages/financeiro.state";
import type { FinanceiroViewModel } from "../src/modules/finance/pages/views/FinanceiroViewA";
import { AGGREGATE_KEYS } from "../src/modules/finance/pages/views/FinanceiroViewA";
import { FinanceiroViewB } from "../src/modules/finance/pages/views/FinanceiroViewB";

const ACCOUNT = { id: "acc-1", name: "Banco do Brasil", kind: "bank", currency: "BRL", openingBalance: 100, bankName: "BB", active: true, createdAt: "" } as const;
const TITLE: FinancialTitle = { id: "tit-1", direction: "receivable", partyType: "customer", partyName: "Cliente Alfa", document: "NF-12", category: null, description: "Guincho urbano", amount: 500, currency: "BRL", issueDate: null, dueDate: "2026-10-20", paidAmount: 0, status: "open", competencia: "2026-10", accountId: null, overdue: true, active: true, createdAt: "" };
const ENTRY: FinancialEntry = { id: "ent-1", accountId: "acc-1", titleId: "tit-1", direction: "in", amount: 500, currency: "BRL", paymentMethod: "pix", category: null, occurredAt: "2026-10-20T12:00:00Z", competencia: "2026-10", description: "Baixa NF-12", reversalOf: null, reconciled: false, divergenceType: null, reconciliationRef: null, reconciledAt: null, reconciledBy: null, active: true, createdAt: "", updatedAt: "" };
const CURRENT_MONTH = sixMonthCompetencias()[5];
const aggregate = (count: number, groupBy: "none" | "month" = "none"): EntriesAggregate => ({
  groupBy,
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  items: groupBy === "month" ? [{ bucket: CURRENT_MONTH, count, inflow: 500, outflow: 200, net: 300 }] : [{ bucket: null, count, inflow: 500, outflow: 200, net: 300 }],
});

function model(over: Partial<FinanceiroViewModel> = {}): FinanceiroViewModel {
  const summary = emptyFinancialSummary();
  return {
    state: { tab: "ext", accountId: "acc-1", target: null },
    onState: () => undefined,
    summary: { ...summary, cash: { ...summary.cash, totalBalance: 7777, accountCount: 3 }, receivable: { ...summary.receivable, openCount: 2, overdueCount: 1 }, payable: { ...summary.payable, openCount: 3, overdueCount: 2 } },
    summaryLoading: false,
    accounts: { items: [ACCOUNT], loading: false, failed: false, total: 1 },
    balances: { "acc-1": { accountId: "acc-1", openingBalance: 100, inflow: 500, outflow: 200, balance: 999 } },
    receivables: { items: [], loading: false, failed: false, total: 0, hasMore: false, loadingMore: false, loadMore: async () => undefined },
    payables: { items: [], loading: false, failed: false, total: 0, hasMore: false, loadingMore: false, loadMore: async () => undefined },
    entries: { items: [], loading: false, failed: false, total: 0 },
    aggregates: {
      [AGGREGATE_KEYS.pending]: aggregate(14),
      [AGGREGATE_KEYS.account("acc-1")]: aggregate(4),
      [AGGREGATE_KEYS.accountReconciled("acc-1")]: aggregate(6),
      [AGGREGATE_KEYS.accountValue("acc-1")]: aggregate(1),
      [AGGREGATE_KEYS.accountDate("acc-1")]: aggregate(1),
      [AGGREGATE_KEYS.accountMonths("acc-1")]: aggregate(7, "month"),
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

test("B: cabeçalho da referência, sem ação no topo; Nova conta fica no trilho", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model()} />);
  assert.match(html, /data-aparencia="B"/);
  assert.match(html, /pat-page-header__kicker">FINANCEIRO · CONTAS</);
  assert.match(html, /pat-page-header__title">Contas e caixa</);
  assert.match(html, /Uma conta por vez: saldo, extrato, baixas e conciliação no mesmo lugar\./);
  assert.doesNotMatch(html, /Conta, saldo e conciliação/);
  assert.doesNotMatch(html, /pat-page-header__actions/);
  const rail = html.slice(html.indexOf('aria-label="Contas"'), html.indexOf("financeiro-b__main"));
  assert.match(rail, /Nova conta/);
});

test("B: trilho vertical com o total do SERVIDOR, cartão por conta e pendência real", () => {
  const second = { ...ACCOUNT, id: "acc-2", name: "Caixa da matriz", kind: "cash", bankName: null } as const;
  const base = model();
  const html = renderToStaticMarkup(
    <FinanceiroViewB
      {...model({
        accounts: { items: [ACCOUNT, second], loading: false, failed: false, total: 2 },
        balances: { ...base.balances, "acc-2": { accountId: "acc-2", openingBalance: 0, inflow: 10, outflow: 0, balance: 10 } },
        aggregates: { ...base.aggregates, [AGGREGATE_KEYS.account("acc-2")]: aggregate(0) },
      })}
    />,
  );
  const rail = html.slice(html.indexOf('aria-label="Contas"'), html.indexOf("financeiro-b__main"));
  assert.match(rail, /Total em caixa/);
  assert.match(rail, /R\$\s7\.777,00/, "o total vem do resumo, não da soma dos cartões");
  assert.match(rail, /3 contas ativas · 14 lançamentos a conciliar/);
  assert.equal((rail.match(/class="financeiro-b__account"/g) ?? []).length, 2);
  assert.match(rail, /aria-pressed="true"[^>]*>.*Banco do Brasil/);
  assert.match(rail, /R\$\s999,00/);
  assert.match(rail, /Conta bancária · 4 a conciliar/);
  assert.match(rail, /Caixa · tudo conciliado/);
});

test("B: conta e saldo no topo da coluna, com a identidade em linguagem de negócio", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model()} />);
  const head = html.slice(html.indexOf("financeiro-b__head"), html.indexOf("financeiro-b__top"));
  assert.match(head, /<h2>Banco do Brasil<\/h2>/);
  assert.match(head, /BB · real \(BRL\)/);
  assert.match(head, /Saldo atual/);
  assert.match(head, /R\$\s999,00/);
  assert.doesNotMatch(html, />bank(?: ·|<)/, "o enum interno nunca chega ao texto da tela");
  assert.doesNotMatch(html, /agência|\bc\/c\b/i, "agência e número não existem no contrato: não são inventados");
});

test("B: dois painéis analíticos — ponte com saldo literal e leitura; rosca com legenda que filtra", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model()} />);
  const top = html.slice(html.indexOf("financeiro-b__top"), html.indexOf("financeiro-b__months"));
  assert.match(top, /De onde vem o saldo/);
  assert.match(top, /desde a abertura da conta/);
  assert.match(top, /Saldo atual: R\$\s999,00/, "a ponte recebe o saldo literal da conta, não o resumo global");
  assert.match(top, /Abertura <b>R\$\s100,00<\/b>/);
  assert.match(top, /Clique em Entradas ou Saídas para filtrar o extrato\./);
  assert.match(top, /Conciliação desta conta/);
  assert.match(top, /contagem de lançamentos/);
  assert.match(top, /A conciliar: 4 — filtrar o extrato/);
  assert.match(top, /60% dos lançamentos conciliados/);
});

test("B: seis meses sempre, clicáveis, e o mês sem bucket não vira R$ 0,00", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model()} />);
  const months = html.slice(html.indexOf("financeiro-b__months"), html.indexOf("financeiro-bc__panel"));
  assert.match(months, /Movimento por mês nesta conta/);
  assert.match(months, /clique no mês para filtrar o extrato/);
  assert.equal((months.match(/class="ui-column-bars__column"/g) ?? []).length, 6);
  assert.equal((months.match(/entradas R\$/g) ?? []).length, 1, "só o mês que o servidor retornou tem valor");
  assert.equal((months.match(/o servidor não retornou lançamentos nesta conta/g) ?? []).length, 5);
  assert.doesNotMatch(months, /R\$\s0,00/);
  const source = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewB.tsx", import.meta.url), "utf8");
  assert.match(source, /onSelect=\{\(target\) => go\(\{ tab: "ext", accountId: selected\.id, target \}\)\}/);
});

test("B: painel com abas e contagem, busca e contador; lista só da conta em foco", () => {
  const other = { ...ENTRY, id: "ent-2", accountId: "acc-2", description: "Outra conta" };
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ entries: { items: [ENTRY, other], loading: false, failed: false, total: 2 } })} />);
  const toolbar = html.slice(html.indexOf("financeiro-bc__toolbar"));
  assert.match(toolbar, /role="tablist"/);
  assert.match(toolbar, /Extrato da conta<span class="financeiro-bc__tab-count">10</, "contagem da conta vem dos agregados do servidor");
  assert.match(toolbar, /Títulos a baixar<span class="financeiro-bc__tab-count">5</);
  assert.match(toolbar, /class="pat-os-search"/);
  assert.match(toolbar, /Buscar documento, cliente ou descrição/);
  assert.match(toolbar, /pat-os-count">1 lançamento</);
  assert.match(html, /Baixa NF-12/);
  assert.doesNotMatch(html, /Outra conta/);
  const source = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewB.tsx", import.meta.url), "utf8");
  assert.match(source, /const \[openKey, setOpenKey\]/);
  assert.equal((source.match(/openKey=\{openKey\}/g) ?? []).length, 2, "as duas listas compartilham a mesma chave de detalhe");
});

test("B: conta inativa escolhida fica em consulta, com selo e aviso, e a baixa não a sugere", () => {
  const inactive = { ...ACCOUNT, id: "acc-inactive", name: "Conta encerrada", bankName: null, active: false };
  const base = model();
  const html = renderToStaticMarkup(
    <FinanceiroViewB
      {...model({
        state: { tab: "ext", accountId: inactive.id, target: null },
        accounts: { items: [ACCOUNT, inactive], loading: false, failed: false, total: 2 },
        balances: { ...base.balances, [inactive.id]: null },
      })}
    />,
  );
  assert.match(html, /Conta em foco: Conta encerrada/);
  assert.match(html, /Conta bancária · real \(BRL\)/);
  assert.match(html, /financeiro-b__account--inactive/);
  assert.match(html, />Inativa</);
  assert.match(html, /Conta desativada: só consulta\. Ela não aparece na baixa\./);
  const source = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewB.tsx", import.meta.url), "utf8");
  assert.match(source, /selected\.active \? model\.onPay\(title, selected\.id\) : model\.onPay\(title\)/);
});

test("B loading publica esqueleto acessível com o trilho", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ accounts: { items: [], loading: true, failed: false, total: 0 } })} />);
  assert.match(html, /aria-busy="true" aria-label="Carregando a conta em foco"/);
  assert.match(html, /financeiro-b__rail/);
});

test("B vazio oferece cadastro somente quando permitido", () => {
  const empty = { accounts: { items: [], loading: false, failed: false, total: 0 } };
  const html = renderToStaticMarkup(<FinanceiroViewB {...model(empty)} />);
  assert.match(html, /data-state="empty"/);
  assert.match(html, /Cadastrar a primeira conta/);
  const base = model();
  const consulta = renderToStaticMarkup(<FinanceiroViewB {...model({ ...empty, access: { ...base.access, createAccount: false } })} />);
  assert.doesNotMatch(consulta, /Cadastrar a primeira conta/);
});

test("B erro inicial oferece retry e não renderiza analytics", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ failed: true })} />);
  assert.match(html, /data-state="error"/);
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Conciliação desta conta/);
});

test("B sem leitura mostra forbidden, nunca vazio", () => {
  const base = model();
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ access: { ...base.access, readEntries: false } })} />);
  assert.match(html, /data-state="forbidden"/);
  assert.doesNotMatch(html, /data-state="empty"/);
});

test("B stale mantém dados e publica a faixa de atualização", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ stale: true, lastUpdatedAt: "2026-10-29T01:00:00Z" })} />);
  assert.match(html, /Dados desatualizados/);
  assert.match(html, /R\$\s999,00/);
});

test("B agregado ou saldo ausente fica indisponível, nunca vira zero", () => {
  const base = model();
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ balances: { "acc-1": null }, aggregates: { ...base.aggregates, [AGGREGATE_KEYS.account("acc-1")]: null, [AGGREGATE_KEYS.accountMonths("acc-1")]: null } })} />);
  assert.match(html, /Saldo indisponível/);
  assert.match(html, /Conciliação indisponível/);
  assert.match(html, /Movimento indisponível/);
  assert.match(html, /contagem indisponível/);
  assert.doesNotMatch(html, /R\$\s0,00/);
});

test("B expõe conta, direção, conciliação e filtro removível como controles acessíveis", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ state: { tab: "ext", accountId: "acc-1", target: "dir:in" } })} />);
  assert.match(html, /aria-label="Contas em foco"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Filtro: Entradas/);
  assert.match(html, /aria-label="Remover o filtro Entradas"/);
  const source = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewB.tsx", import.meta.url), "utf8");
  assert.match(source, /onDirection=\{\(direction\) => go/);
  assert.match(source, /onFilter=\{\(filter\) => go/);
});

test("B títulos mistura a organização, com direção por linha, blocos, e encaixa a baixa com a conta em foco", () => {
  const html = renderToStaticMarkup(
    <FinanceiroViewB
      {...model({
        state: { tab: "rec", accountId: "acc-1", target: null },
        receivables: { items: [TITLE], loading: false, failed: false, total: 1, hasMore: false, loadingMore: false, loadMore: async () => undefined },
        payPanel: { titleId: "tit-1", node: <div>FORMULÁRIO INLINE DA BAIXA</div> },
      })}
    />,
  );
  assert.match(html, /CLIENTE OU FORNECEDOR/);
  assert.match(html, /A baixa feita aqui já vem com a conta <b>Banco do Brasil<\/b> escolhida \(dá para trocar\)/);
  assert.match(html, /financeiro-bc__dir--in/);
  assert.match(html, /FORMULÁRIO INLINE DA BAIXA/);
  for (const label of ["Vencidos", "Vencem hoje", "Próximos 7 dias", "Recebidos ou pagos em parte"]) assert.match(html, new RegExp(`aria-label="${label}:`));
  assert.match(html, /aria-label="Vencidos: 3 — filtrar a lista"/, "vencidos vem da contagem do servidor");
  const source = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewB.tsx", import.meta.url), "utf8");
  assert.match(source, /model\.onPay\(title, selected\.id\)/);
  assert.match(source, /titleMatchesSearch\(title, search\)/);
});

test("B títulos parciais: a contagem local não se passa por total do servidor", () => {
  const html = renderToStaticMarkup(
    <FinanceiroViewB
      {...model({
        state: { tab: "rec", accountId: "acc-1", target: null },
        receivables: { items: [TITLE], loading: false, failed: false, total: 130, hasMore: true, loadingMore: false, loadMore: async () => undefined },
      })}
    />,
  );
  assert.match(html, /1 resultados entre 1 títulos carregados · 130 títulos no servidor \(sem este filtro\)/);
  assert.match(html, /aria-label="Vencem hoje: contagem disponível depois de carregar todos os títulos — filtrar a lista"/);
  assert.match(html, /Carregar mais a receber/);
});

test("Cabeçalho de B e C segue a referência: gap de 20 px, sem mexer no cabeçalho das outras telas", () => {
  assert.match(ruleOf(":is(.financeiro-b, .financeiro-c) .pat-page-header") ?? "", /gap:\s*20px/);
  assert.match(ruleOf(".pat-page-header") ?? "", /gap:\s*24px/, "as demais telas ficam como estão");
});

test("Trilho e grade de B: 250 px, 220 px até 1340 px, trilho fixo ao rolar", () => {
  assert.match(ruleOf(".financeiro-b__grid") ?? "", /grid-template-columns:\s*250px minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 1340px\)[\s\S]*?\.financeiro-b__grid \{ grid-template-columns: 220px minmax\(0, 1fr\); \}/);
  assert.match(ruleOf(".financeiro-b__rail") ?? "", /position:\s*sticky/);
});

test("Lista de B em 1280 px: a coluna de dinheiro não esconde dígito", () => {
  assert.match(css, /@media \(max-width: 1340px\)[\s\S]*?\.financeiro-b \.pat-ab-row td\.dense-col-right[^{]*\{ padding-inline: 4px; \}/);
});

test("Interação: conta, abas, blocos, grupos e gráficos têm hover e foco visível", () => {
  for (const selector of [".financeiro-b__account", ".financeiro-bc__block", "button.financeiro-bc__group-head"]) {
    assert.ok(ruleOf(`${selector}:hover`), `${selector} sem hover`);
    assert.match(ruleOf(`${selector}:focus-visible`) ?? "", /outline:\s*2px solid #2563eb/, `${selector} sem foco visível`);
  }
  assert.ok(ruleOf(".financeiro-c .pat-os-tab:hover:not(.pat-os-tab--active)"), "abas sem hover");
  assert.ok(css.includes(".financeiro-b .pat-os-tab:hover:not(.pat-os-tab--active),"), "abas de B sem hover");
  assert.doesNotMatch(css, /^\.pat-os-tab(:hover| \{ transition)/m, "o hover das abas não pode valer para as outras telas");
});
