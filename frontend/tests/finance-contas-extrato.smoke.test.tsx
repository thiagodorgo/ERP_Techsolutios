import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import React from "react";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";

import { AccountCard } from "../src/modules/finance/accounts/components/AccountCard";
import type { FinancialAccount } from "../src/modules/finance/accounts/financial-accounts.types";
import { EntryDetail } from "../src/modules/finance/entries/components/EntryDetail";
import type { FinancialEntry } from "../src/modules/finance/entries/financial-entries.types";
import { emptyFinancialSummary } from "../src/modules/finance/dashboard/financial-summary.types";
import { FinanceiroViewA, type FinanceiroViewModel, type FinanceTitleListState } from "../src/modules/finance/pages/views/FinanceiroViewA";
import { formatBRL } from "../src/modules/finance/titles/financial-titles.adapter";
import type { FinancialTitle } from "../src/modules/finance/titles/financial-titles.types";

// B-SAN3-12b — CONTAS e EXTRATO em SSR: o saldo da conta vem do `/balance` (F8), o que o servidor não deu não é
// renderizado (F19), o detalhe do lançamento conciliado trava estorno/exclusão com a frase do F20, e nenhum termo
// técnico chega à tela (F17).

const ACCOUNT: FinancialAccount = { id: "acc-1", name: "Banco do Brasil", kind: "bank", currency: "BRL", openingBalance: 1000, bankName: "BB", active: true, createdAt: "" };

const ENTRY: FinancialEntry = {
  id: "e-2",
  accountId: "acc-1",
  titleId: null,
  direction: "in",
  amount: 350,
  currency: "BRL",
  paymentMethod: "pix",
  category: null,
  occurredAt: "2026-10-20T13:00:00.000Z",
  competencia: "2026-10",
  description: "Recebimento avulso",
  reversalOf: null,
  reconciled: true,
  divergenceType: null,
  reconciliationRef: "DOC 9",
  reconciledAt: "2026-10-21T10:00:00.000Z",
  reconciledBy: "u-1",
  active: true,
  createdAt: "2026-10-20T13:00:00.000Z",
  updatedAt: "2026-10-21T10:00:00.000Z",
};

const F20 = "Este lançamento está conciliado. Para estornar ou excluir, um administrador (ou o Financeiro, se a organização permitir) precisa desfazer a conciliação.";

test("conta: saldo vindo do servidor, cartão clicável com aria-pressed", () => {
  const html = renderToStaticMarkup(
    <AccountCard account={ACCOUNT} balance={{ accountId: "acc-1", openingBalance: 1000, inflow: 500, outflow: 120, balance: 1380 }} pendingCount={3} selected onSelect={() => undefined} />,
  );
  assert.match(html, /<button[^>]*aria-pressed="true"/);
  assert.match(html, /R\$\s1\.380,00/);
  assert.match(html, /3 a conciliar/);
});

test("F19: conta sem saldo do servidor diz 'saldo indisponível' — nunca '—' nem R$ 0,00 fingido", () => {
  const html = renderToStaticMarkup(<AccountCard account={ACCOUNT} balance={null} pendingCount={null} selected={false} onSelect={() => undefined} />);
  assert.match(html, /Saldo indisponível/);
  const visible = html.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visible, /—|R\$\s0,00|a conciliar/, "texto visível sem travessão, sem zero fingido e sem contagem inventada");
});

test("F20: lançamento conciliado — Estornar e Excluir desabilitados com a frase; sem o privilégio não há 'Desfazer'", () => {
  const html = renderToStaticMarkup(
    <EntryDetail entry={ENTRY} accountName="Banco do Brasil" canReconcile canUnreconcile={false} busy={false} message={null} onReconcile={() => undefined} onUnreconcile={() => undefined} />,
  );
  assert.match(html, /<button[^>]*disabled=""[^>]*>[^<]*Estornar/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>[^<]*Excluir/);
  assert.ok(html.includes(F20));
  assert.doesNotMatch(html, /Desfazer conciliação<\/button>/);
});

test("F20: com o privilégio (canUnreconcile) a ação primária do conciliado é 'Desfazer conciliação'", () => {
  const html = renderToStaticMarkup(
    <EntryDetail entry={ENTRY} accountName="Banco do Brasil" canReconcile canUnreconcile busy={false} message={null} onReconcile={() => undefined} onUnreconcile={() => undefined} />,
  );
  assert.match(html, /<button[^>]*class="pat-btn pat-btn--primary"[^>]*>[^<]*(<svg.*?<\/svg>)?Desfazer conciliação<\/button>/);
});

test("F7: lançamento a conciliar mostra 'Conciliar' só com a permissão; Gestor/Auditor leem 'Seu perfil só consulta'", () => {
  const pending = { ...ENTRY, reconciled: false, reconciledAt: null, reconciledBy: null };
  const can = renderToStaticMarkup(<EntryDetail entry={pending} accountName="Banco" canReconcile canUnreconcile={false} busy={false} message={null} onReconcile={() => undefined} onUnreconcile={() => undefined} />);
  assert.match(can, /Conciliar<\/button>/);
  assert.doesNotMatch(can, /Estornar|Excluir/, "estorno/exclusão só aparecem (travados) no conciliado");
  const readOnly = renderToStaticMarkup(<EntryDetail entry={pending} accountName="Banco" canReconcile={false} canUnreconcile={false} busy={false} message={null} onReconcile={() => undefined} onUnreconcile={() => undefined} />);
  assert.doesNotMatch(readOnly, /Conciliar<\/button>/);
  assert.match(readOnly, /Seu perfil só consulta/);
});

// ---------------------------------------------- F17 ----------------------------------------------

const FINANCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/modules/finance");
// E2/R11: `titles/` entra na varredura, e os `.ts` também (o adaptador de títulos produz rótulo de tela). Medido no ciclo 2:
// 0 ocorrência pré-existente nos quatro diretórios com a régua nova, logo nenhuma exclusão nominal.
const UI_DIRS = ["accounts", "entries", "pages", "titles"];
// E3/R-E3-5: `scope`, `rbac` e `permission` entram na lista, como a E2/R11 prometia (§3 do CLAUDE.md).
const TECH = /\b(tenant|tenants|role|roles|reconciled|unreconcile|payment_method|client_action_id|scope|scopes|rbac|permission|permissions)\b|\/api\/|\/financial-|\/cheques\//i;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name);
    return item.isDirectory() ? tsxFiles(full) : /\.tsx?$/.test(item.name) ? [full] : [];
  });
}

/**
 * Texto que pode chegar à tela: texto de JSX (entre > e <) e literais com espaço, com acento ou que COMEÇAM por maiúscula
 * (E2/R11: palavra única de rótulo, como `label="Reconciled"`, também conta).
 */
export function uiTexts(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const jsxText = [...code.matchAll(/>([^<>{}]*[A-Za-zÀ-ú][^<>{}]*)</g)].map((m) => m[1].trim());
  const literals = [...code.matchAll(/"([^"\n]*)"|`([^`\n]*)`/g)].map((m) => m[1] ?? m[2]).filter((s) => /\s/.test(s) || /[À-ú]/.test(s) || /^[A-ZÀ-Ý]/.test(s));
  return [...jsxText, ...literals].filter(Boolean);
}

test("F17: nenhum termo técnico (tenant, role, reconciled, rota de API) nos textos de tela do Financeiro (12b)", () => {
  const offenders: string[] = [];
  for (const dir of UI_DIRS) {
    for (const file of tsxFiles(path.join(FINANCE, dir))) {
      for (const textValue of uiTexts(readFileSync(file, "utf8"))) {
        if (TECH.test(textValue)) offenders.push(`${path.relative(FINANCE, file)}: ${textValue}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("F17: o detector acusa 'Tenant' num rótulo (controle positivo)", () => {
  assert.ok(uiTexts('<span className="pat-x">Tenant ativo</span>').some((t) => TECH.test(t)));
  assert.ok(uiTexts('const l = "Conta do tenant";').some((t) => TECH.test(t)));
  assert.ok(!uiTexts('<button className="pat-btn" onClick={x}>Conciliar</button>').some((t) => TECH.test(t)));
});

test("F17/R11: a régua alcança palavra única com maiúscula, o diretório titles/ e os arquivos .ts (controle positivo)", () => {
  assert.ok(uiTexts('<StatusPill label="Reconciled" />').some((t) => TECH.test(t)), "palavra única com maiúscula é texto de tela");
  assert.ok(uiTexts('const LABELS = { open: "Open (not reconciled)" };').some((t) => TECH.test(t)), "literal de adaptador .ts");
  assert.ok(UI_DIRS.includes("titles"), "titles/ está na varredura");
  assert.ok(tsxFiles(path.join(FINANCE, "titles")).some((file) => file.endsWith("financial-titles.adapter.ts")), "os .ts entram na varredura");
});

test("F17/R-E3-5: a régua acusa scope, rbac e permission, e deixa o PT-BR livre (controle positivo)", () => {
  assert.ok(uiTexts('<StatusPill label="Scope" />').some((t) => TECH.test(t)), "palavra única 'Scope' num rótulo");
  assert.ok(uiTexts('const l = "Sem permission";').some((t) => TECH.test(t)), "'permission' num literal");
  assert.ok(uiTexts('const l = "Perfil sem RBAC";').some((t) => TECH.test(t)), "'RBAC' num literal");
  assert.ok(!uiTexts('const l = "Sem permissão";').some((t) => TECH.test(t)), "'permissão' (PT-BR) não é termo técnico");
});

// ------------------------------------- E3: R-E3-3 e R-E3-4 -------------------------------------
// A suíte não tem navegador (o jsdom não faz layout): a trava é por regra de CSS efetivo + classe no SSR; a prova de
// geometria (a sobra do valor nas 3 larguras) é da sonda no navegador, publicada no relatório do dev (RETOMADA 12).

const LIVE_CSS = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/styles/app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Corpos de toda regra do CSS efetivo cuja lista de seletores contém `selector` (fora e dentro de @media). */
function cssBodies(selector: string): string[] {
  const wanted = selector.replace(/\s+/g, " ").trim();
  return [...LIVE_CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => m[1].split(",").map((s) => s.replace(/\s+/g, " ").trim()).includes(wanted))
    .map((m) => m[2]);
}

const TITLE: FinancialTitle = {
  id: "t-1",
  direction: "receivable",
  partyType: "customer",
  partyName: "Transportes Alfa",
  document: "NF 1001",
  category: null,
  description: null,
  amount: 1500,
  currency: "BRL",
  issueDate: null,
  dueDate: "2026-10-10",
  paidAmount: 500,
  status: "partially_paid",
  competencia: "2026-10",
  accountId: null,
  overdue: false,
  active: true,
  createdAt: "2026-10-01T12:00:00.000Z",
};

function titleList(items: readonly FinancialTitle[]): FinanceTitleListState {
  return { items, loading: false, failed: false, total: items.length, hasMore: false, loadingMore: false, loadMore: async () => undefined };
}

function viewModel(summaryLoading: boolean): FinanceiroViewModel {
  const summary = emptyFinancialSummary();
  return {
    state: { tab: "rec", accountId: null, target: null },
    onState: () => undefined,
    summary: { ...summary, cash: { totalBalance: 126958.65, accountCount: 2, currency: "BRL" } },
    summaryLoading,
    accounts: { items: [ACCOUNT], loading: false, failed: false, total: 1 },
    balances: {},
    receivables: titleList([TITLE]),
    payables: titleList([]),
    entries: { items: [], loading: false, failed: false, total: 0 },
    aggregates: {},
    policy: { canUnreconcile: false, delegatedToFinance: false },
    access: { readTitles: true, readAccounts: true, pay: true, reconcile: true, createAccount: true },
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
  };
}

test("R-E3-3: a variante .pat-kpi-row--6 existe no CSS efetivo — grade de 6, valor a 18 px sem quebra e com reticências, 15,5 px até 1340 px", () => {
  assert.ok(cssBodies(".pat-kpi-row--6").some((body) => /grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/.test(body)), "grade de 6 da biblioteca");
  const value = cssBodies(".pat-kpi-row--6 .pat-kpi__value").find((body) => /font-size:\s*18px/.test(body));
  assert.ok(value, "regra .pat-kpi-row--6 .pat-kpi__value com font-size: 18px");
  assert.match(value!, /white-space:\s*nowrap/);
  assert.match(value!, /overflow:\s*hidden/);
  assert.match(value!, /text-overflow:\s*ellipsis/);
  const narrow = /@media\s*\(max-width:\s*1340px\)\s*\{\s*\.pat-kpi-row--6 \.pat-kpi__value\s*\{([^}]*)\}\s*\}/.exec(LIVE_CSS);
  assert.ok(narrow, "@media (max-width: 1340px) com a regra do valor");
  assert.match(narrow![1], /font-size:\s*15\.5px/);
});

test("R-E3-3: a linha de indicadores da opção A usa a classe da biblioteca, sem grade inline — carregada e no esqueleto", () => {
  for (const loading of [false, true]) {
    const html = renderToStaticMarkup(<FinanceiroViewA {...viewModel(loading)} />);
    const rows = [...html.matchAll(/<div[^>]*class="pat-kpi-row[^"]*"[^>]*>/g)].map((m) => m[0]);
    assert.equal(rows.length, 1, `uma linha de indicadores (loading=${loading})`);
    assert.match(rows[0], /class="pat-kpi-row pat-kpi-row--6"/, `classe da variante de 6 (loading=${loading})`);
    assert.doesNotMatch(rows[0], /grid-template-columns/, `sem gridTemplateColumns inline (loading=${loading})`);
  }
  assert.ok(renderToStaticMarkup(<FinanceiroViewA {...viewModel(false)} />).includes(`class="pat-kpi__value">${formatBRL(126958.65)}<`), "o saldo chega ao .pat-kpi__value");
});

test("R-E3-4: VALOR e SALDO EM ABERTO da lista de títulos levam dense-col-right e dense-col-tabular no th e no td", () => {
  const html = renderToStaticMarkup(<FinanceiroViewA {...viewModel(false)} />);
  assert.match(html, /<table class="pat-ab-table">/, "a lista é o skin .pat-ab-table");
  for (const header of ["VALOR", "SALDO EM ABERTO"]) {
    assert.match(html, new RegExp(`<th scope="col" class="dense-col-right dense-col-tabular">${header}</th>`), `th ${header}`);
  }
  const cells = [...html.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
  const amount = cells.find((m) => m[2] === formatBRL(TITLE.amount));
  assert.ok(amount, "td do VALOR");
  assert.match(amount![1], /class="dense-col-right dense-col-tabular"/);
  const open = cells.find((m) => m[2].includes(formatBRL(TITLE.amount - TITLE.paidAmount)));
  assert.ok(open, "td do SALDO EM ABERTO");
  assert.match(open![1], /class="dense-col-right dense-col-tabular"/);
});

test("R-E3-4: o skin .pat-ab-table alinha à direita e tabula as colunas de dinheiro no CSS efetivo (espelho de .dense-table)", () => {
  for (const selector of [".pat-ab-table th.dense-col-right", ".pat-ab-row td.dense-col-right"]) {
    assert.ok(cssBodies(selector).some((body) => /text-align:\s*right/.test(body)), `${selector} { text-align: right }`);
  }
  for (const selector of [".pat-ab-table th.dense-col-tabular", ".pat-ab-row td.dense-col-tabular"]) {
    assert.ok(cssBodies(selector).some((body) => /font-variant-numeric:\s*tabular-nums/.test(body)), `${selector} { font-variant-numeric: tabular-nums }`);
  }
  assert.ok(cssBodies(".pat-ab-table th.dense-col-right .dense-sort-btn").some((body) => /justify-content:\s*flex-end/.test(body)), "botão de ordenação à direita");
});
