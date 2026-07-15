import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { FinancialTab } from "../src/modules/work-orders/components/tabs/FinancialTab";
import { formatMoney } from "../src/modules/work-orders/financials.service";
import { entityTypeLabel } from "../src/modules/work-orders/approval.types";

// Ω3F-3b — aba Financeiro (front): estados §7, gating por permissão, dinheiro com moeda, e o
// humanizador do enum de entidade (P-Ω3F1-ENTITYTYPE).

const ctx = { tenantId: "t1", token: "tok" };

test("FinancialTab: cabeçalho + estado de carregamento (§7) no primeiro render (SSR)", () => {
  const html = renderToString(
    <FinancialTab workOrderId="wo-1" context={ctx} permissions={["work_order_financials:read"]} />,
  );
  assert.match(html, /Itens financeiros/);
  assert.match(html, /Carregando itens financeiros/);
});

test("FinancialTab: 'Lançar item avulso' só com work_order_financials:create", () => {
  const withCreate = renderToString(
    <FinancialTab workOrderId="wo-1" context={ctx} permissions={["work_order_financials:read", "work_order_financials:create"]} />,
  );
  assert.match(withCreate, /Lançar item avulso/);

  const readOnly = renderToString(
    <FinancialTab workOrderId="wo-1" context={ctx} permissions={["work_order_financials:read"]} />,
  );
  assert.doesNotMatch(readOnly, /Lançar item avulso/);
});

test("formatMoney: usa a moeda do item (não assume BRL) e degrada valor inválido", () => {
  assert.match(formatMoney(351, "BRL"), /351,00/);
  assert.match(formatMoney(100, "USD"), /100,00/);
  assert.equal(formatMoney(Number.NaN, "BRL"), "—");
});

test("entityTypeLabel (P-Ω3F1-ENTITYTYPE): enum técnico → rótulo PT-BR acentuado; desconhecido → 'Registro'", () => {
  assert.equal(entityTypeLabel("work_order"), "Ordem de serviço");
  assert.equal(entityTypeLabel("checklist_run"), "Checklist");
  assert.equal(entityTypeLabel("evidence"), "Evidência");
  assert.equal(entityTypeLabel("qualquer_coisa"), "Registro");
});
