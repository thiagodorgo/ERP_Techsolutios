import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { QuoteTab, QuoteCard } from "../src/modules/work-orders/components/tabs/QuoteTab";
import type { ServiceQuoteRow } from "../src/modules/registry/service-quotes/service-quotes.types";

// Ω3F-4c — aba Orçamento (front): estados §7 (cabeçalho + carregamento) e gating por permissão
// (Aprovar exige service_quotes:approve; Compartilhar exige service_quotes:update).

const ctx = { tenantId: "t1", token: "tok" };

const draftQuote: ServiceQuoteRow = {
  id: "q-1",
  workOrderId: "wo-1",
  customerId: "c-1",
  serviceCatalogId: "svc-1",
  sourceTariffId: null,
  frozenUnitPrice: 250,
  frozenCurrency: "BRL",
  quantity: 2,
  frozenTotal: 500,
  frozenAt: "2026-07-13T00:00:00.000Z",
  priceSource: "tariff",
  status: "draft",
  isActive: true,
  createdAt: "2026-07-13T00:00:00.000Z",
  number: "ORC-000123",
  issuedAt: "2026-07-13T00:00:00.000Z",
  validUntil: "2026-08-13T00:00:00.000Z",
  createdWorkOrderId: null,
};

test("QuoteTab: cabeçalho + estado de carregamento (§7) no primeiro render (SSR)", () => {
  const html = renderToString(
    <QuoteTab workOrderId="wo-1" context={ctx} permissions={["service_quotes:read"]} />,
  );
  assert.match(html, /Orçamentos da OS/);
  assert.match(html, /Carregando orçamentos/);
});

test("QuoteCard: número, situação PT-BR, validade e total (do backend)", () => {
  const html = renderToString(
    <QuoteCard
      quote={draftQuote}
      items={{ items: [{ id: "i1", serviceQuoteId: "q-1", tariffId: null, priceTableId: null, description: "Guincho pesado", quantity: 2, unitAmount: 250, totalAmount: 500, currency: "BRL", source: "tariff", notes: null }], totalAmount: 500, currency: "BRL" }}
      canApprove={false}
      canShare={false}
      busy={false}
      approvedWorkOrderId={null}
      sharePath={null}
      onApprove={() => {}}
      onShare={() => {}}
    />,
  );
  assert.match(html, /ORC-000123/);
  assert.match(html, /Rascunho/);
  assert.match(html, /Validade:/);
  assert.match(html, /500,00/);
  assert.match(html, /Guincho pesado/);
});

test("QuoteCard: 'Aprovar' só com service_quotes:approve (e orçamento em rascunho)", () => {
  const withApprove = renderToString(
    <QuoteCard quote={draftQuote} items={null} canApprove canShare={false} busy={false} approvedWorkOrderId={null} sharePath={null} onApprove={() => {}} onShare={() => {}} />,
  );
  assert.match(withApprove, /Aprovar/);

  const withoutApprove = renderToString(
    <QuoteCard quote={draftQuote} items={null} canApprove={false} canShare={false} busy={false} approvedWorkOrderId={null} sharePath={null} onApprove={() => {}} onShare={() => {}} />,
  );
  assert.doesNotMatch(withoutApprove, /Aprovar/);

  // Aprovar não aparece se o orçamento não está em rascunho, mesmo com permissão.
  const approved = renderToString(
    <QuoteCard quote={{ ...draftQuote, status: "approved" }} items={null} canApprove canShare={false} busy={false} approvedWorkOrderId={null} sharePath={null} onApprove={() => {}} onShare={() => {}} />,
  );
  assert.doesNotMatch(approved, /Aprovar/);
});

test("QuoteCard: 'Compartilhar' só com service_quotes:update", () => {
  const withShare = renderToString(
    <QuoteCard quote={draftQuote} items={null} canApprove={false} canShare busy={false} approvedWorkOrderId={null} sharePath={null} onApprove={() => {}} onShare={() => {}} />,
  );
  assert.match(withShare, /Compartilhar/);

  const withoutShare = renderToString(
    <QuoteCard quote={draftQuote} items={null} canApprove={false} canShare={false} busy={false} approvedWorkOrderId={null} sharePath={null} onApprove={() => {}} onShare={() => {}} />,
  );
  assert.doesNotMatch(withoutShare, /Compartilhar/);
});

test("QuoteCard: OS gerada e link de compartilhamento aparecem quando presentes", () => {
  const html = renderToString(
    <QuoteCard quote={draftQuote} items={null} canApprove={false} canShare busy={false} approvedWorkOrderId="wo-new-9" sharePath="/orcamentos/compartilhado/abc" onApprove={() => {}} onShare={() => {}} />,
  );
  assert.match(html, /OS gerada/);
  assert.match(html, /wo-new-9/);
  assert.match(html, /\/orcamentos\/compartilhado\/abc/);
  assert.match(html, /Copiar link/);
});
