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
const TECH = /\b(tenant|tenants|role|roles|reconciled|unreconcile|payment_method|client_action_id)\b|\/api\/|\/financial-|\/cheques\//i;

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
