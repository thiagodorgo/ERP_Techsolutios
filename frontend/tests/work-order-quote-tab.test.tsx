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

// B-SAN3-08 (item 40) — o diálogo único de aprovação, aberto pela aba e pela tela Orçamentos. A regra de destino tem três
// estados (R-A5); o diálogo sempre avisa que nasce uma OS nova e traz o modo de acionamento opcional (decisão do dono,
// `D-PORTAO-7-RECOMENDACOES-1011`).
const dialogProps = {
  context: ctx,
  quote: draftQuote,
  onApproved: () => {},
  onReload: () => {},
  onNotice: () => {},
  onClose: () => {},
};

test("[R-A5] diálogo de aprovação: serviço que exige destino mostra o destino obrigatório e o aviso de OS nova", async () => {
  const { ServiceQuoteApproveDialog } = await import("../src/modules/registry/service-quotes/components/ServiceQuoteApproveDialog");
  const html = renderToString(<ServiceQuoteApproveDialog {...dialogProps} destinationRule="required" />);
  assert.match(html, /Aprovar orçamento/);
  assert.match(html, /Endereço de destino \*/, "o marcador de obrigatório no endereço de destino");
  assert.match(html, /aria-required="true"/);
  assert.match(html, /Será criada uma nova ordem de serviço\./);
  assert.match(html, /Endereço de origem/);
  assert.match(html, /ORC-000123/);
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("[R-A5] diálogo de aprovação: regra desconhecida mostra o destino sem o marcador; regra opcional recolhe em Adicionar destino", async () => {
  const { ServiceQuoteApproveDialog } = await import("../src/modules/registry/service-quotes/components/ServiceQuoteApproveDialog");
  const unknown = renderToString(<ServiceQuoteApproveDialog {...dialogProps} destinationRule="unknown" />);
  assert.match(unknown, /Endereço de destino/);
  assert.doesNotMatch(unknown, /Endereço de destino \*/);
  assert.match(unknown, /Não foi possível confirmar se este serviço exige destino/);
  assert.match(unknown, /Será criada uma nova ordem de serviço\./);

  const optional = renderToString(<ServiceQuoteApproveDialog {...dialogProps} destinationRule="optional" />);
  assert.match(optional, /Adicionar destino/);
  assert.doesNotMatch(optional, /Endereço de destino/, "o destino fica recolhido");
  assert.match(optional, /Será criada uma nova ordem de serviço\./);
});

test("[R-A9] diálogo de aprovação: Modo de acionamento (opcional), texto livre até 120 caracteres", async () => {
  const { ServiceQuoteApproveDialog } = await import("../src/modules/registry/service-quotes/components/ServiceQuoteApproveDialog");
  const html = renderToString(<ServiceQuoteApproveDialog {...dialogProps} destinationRule="optional" />);
  assert.match(html, /Modo de acionamento \(opcional\)/);
  assert.match(html, /maxLength="120"|maxlength="120"/);
});

test("[§7] diálogo de aprovação: enquanto confere o serviço, Aprovar fica desabilitado e Cancelar não", async () => {
  const { ServiceQuoteApproveDialog } = await import("../src/modules/registry/service-quotes/components/ServiceQuoteApproveDialog");
  const html = renderToString(<ServiceQuoteApproveDialog {...dialogProps} />);
  assert.match(html, /Conferindo se este serviço exige endereço de destino/);
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""[^>]*>Aprovar<\/button>/);
  assert.match(html, /<button[^>]*type="button"[^>]*>Cancelar<\/button>/);
  assert.doesNotMatch(html, /<button[^>]*type="button"[^>]*disabled=""[^>]*>Cancelar<\/button>/);
});
