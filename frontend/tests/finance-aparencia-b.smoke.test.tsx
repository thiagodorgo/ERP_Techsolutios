import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { emptyFinancialSummary } from "../src/modules/finance/dashboard/financial-summary.types";
import type { EntriesAggregate } from "../src/modules/finance/entries/financial-entries.types";
import type { FinancialEntry } from "../src/modules/finance/entries/financial-entries.types";
import type { FinancialTitle } from "../src/modules/finance/titles/financial-titles.types";
import type { FinanceiroViewModel } from "../src/modules/finance/pages/views/FinanceiroViewA";
import { AGGREGATE_KEYS } from "../src/modules/finance/pages/views/FinanceiroViewA";
import { FinanceiroViewB } from "../src/modules/finance/pages/views/FinanceiroViewB";

const ACCOUNT = { id: "acc-1", name: "Banco do Brasil", kind: "bank", currency: "BRL", openingBalance: 100, bankName: "BB", active: true, createdAt: "" } as const;
const TITLE: FinancialTitle = { id: "tit-1", direction: "receivable", partyType: "customer", partyName: "Cliente Alfa", document: "NF-12", category: null, description: "Guincho urbano", amount: 500, currency: "BRL", issueDate: null, dueDate: "2026-10-20", paidAmount: 0, status: "open", competencia: "2026-10", accountId: null, overdue: true, active: true, createdAt: "" };
const ENTRY: FinancialEntry = { id: "ent-1", accountId: "acc-1", titleId: "tit-1", direction: "in", amount: 500, currency: "BRL", paymentMethod: "pix", category: null, occurredAt: "2026-10-20T12:00:00Z", competencia: "2026-10", description: "Baixa NF-12", reversalOf: null, reconciled: false, divergenceType: null, reconciliationRef: null, reconciledAt: null, reconciledBy: null, active: true, createdAt: "", updatedAt: "" };
const aggregate = (count: number, groupBy: "none" | "month" = "none"): EntriesAggregate => ({
  groupBy,
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  items: groupBy === "month" ? [{ bucket: "2026-10", count, inflow: 500, outflow: 200, net: 300 }] : [{ bucket: null, count, inflow: 500, outflow: 200, net: 300 }],
});

function model(over: Partial<FinanceiroViewModel> = {}): FinanceiroViewModel {
  return {
    state: { tab: "ext", accountId: "acc-1", target: null },
    onState: () => undefined,
    summary: emptyFinancialSummary(),
    summaryLoading: false,
    accounts: { items: [ACCOUNT], loading: false, failed: false, total: 1 },
    balances: { "acc-1": { accountId: "acc-1", openingBalance: 100, inflow: 500, outflow: 200, balance: 999 } },
    receivables: { items: [], loading: false, failed: false, total: 0, hasMore: false, loadingMore: false, loadMore: async () => undefined },
    payables: { items: [], loading: false, failed: false, total: 0, hasMore: false, loadingMore: false, loadMore: async () => undefined },
    entries: { items: [], loading: false, failed: false, total: 0 },
    aggregates: {
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

test("B populada usa conta em foco, saldo literal, ponte, rosca e série mensal reais", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model()} />);
  assert.match(html, /data-aparencia="B"/);
  assert.match(html, /Conta em foco: Banco do Brasil/);
  assert.match(html, /R\$\s999,00/);
  assert.match(html, /Saldo atual: R\$\s999,00/, "a ponte recebe o saldo literal da conta, não o resumo global");
  assert.match(html, /De onde vem o saldo/);
  assert.match(html, /Conciliação desta conta/);
  assert.match(html, /Movimento da conta · 6 meses/);
});

test("B loading publica esqueleto acessível", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ accounts: { items: [], loading: true, failed: false, total: 0 } })} />);
  assert.match(html, /aria-busy="true" aria-label="Carregando a conta em foco"/);
});

test("B vazio oferece cadastro somente quando permitido", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ accounts: { items: [], loading: false, failed: false, total: 0 } })} />);
  assert.match(html, /data-state="empty"/);
  assert.match(html, /Cadastre a primeira conta/);
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
  assert.doesNotMatch(html, /R\$\s0,00/);
});

test("B expõe conta, direção, conciliação e filtro removível como controles acessíveis", () => {
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ state: { tab: "ext", accountId: "acc-1", target: "dir:in" } })} />);
  assert.match(html, /aria-label="Contas em foco"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Filtro: Entradas/);
  assert.match(html, /aria-label="Remover o filtro"/);
  const source = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewB.tsx", import.meta.url), "utf8");
  assert.match(source, /onDirection=\{\(direction\) => go/);
  assert.match(source, /onFilter=\{\(filter\) => go/);
});

test("B extrato mostra somente a conta em foco e um único detalhe expansível", () => {
  const other = { ...ENTRY, id: "ent-2", accountId: "acc-2", description: "Outra conta" };
  const html = renderToStaticMarkup(<FinanceiroViewB {...model({ entries: { items: [ENTRY, other], loading: false, failed: false, total: 2 } })} />);
  assert.match(html, /Extrato da conta · 1/);
  assert.match(html, /Baixa NF-12/);
  assert.doesNotMatch(html, /Outra conta/);
  const source = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewB.tsx", import.meta.url), "utf8");
  assert.match(source, /const \[openKey, setOpenKey\]/);
  assert.equal((source.match(/openKey=\{openKey\}/g) ?? []).length, 2, "as duas listas compartilham a mesma chave de detalhe");
});

test("B títulos mistura a organização, busca descrição e encaixa a baixa com a conta em foco", () => {
  const html = renderToStaticMarkup(
    <FinanceiroViewB
      {...model({
        state: { tab: "rec", accountId: "acc-1", target: null },
        receivables: { items: [TITLE], loading: false, failed: false, total: 1, hasMore: false, loadingMore: false, loadMore: async () => undefined },
        payPanel: { titleId: "tit-1", node: <div>FORMULÁRIO INLINE DA BAIXA</div> },
      })}
    />,
  );
  assert.match(html, /Títulos a baixar · 1/);
  assert.match(html, /CLIENTE OU FORNECEDOR/);
  assert.match(html, /A baixa já abre com Banco do Brasil escolhida/);
  assert.match(html, /FORMULÁRIO INLINE DA BAIXA/);
  assert.match(html, /Documento, cliente, fornecedor ou descrição/);
  const source = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewB.tsx", import.meta.url), "utf8");
  assert.match(source, /model\.onPay\(title, selected\.id\)/);
  assert.match(source, /titleMatchesSearch\(title, titleSearch\)/);
});
