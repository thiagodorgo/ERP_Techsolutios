import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { GuiaDebitos } from "../src/modules/patios/charges/components/GuiaDebitos";
import { buildInput, LancamentoChargeModal, MANUAL_CHARGE_OPTIONS } from "../src/modules/patios/charges/components/LancamentoChargeModal";
import type { ChargeStatementView } from "../src/modules/patios/charges/charges.types";

// Refs INTERNAS (formato UUID) — tariffId/adjustmentOfChargeId NUNCA devem aparecer no DOM (§2.8/allowlist).
const TARIFF_UUID = "550e8400-e29b-41d4-a716-446655440000";
const ADJ_TARGET_UUID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Statement REAL (shape de charge.dto.ts toChargeStatementDto): REMOVAL + 2 DAILY (periodSeq) + ADJUSTMENT
// negativo; teto atingido (THIRTY_DAYS_LEGACY, capReached); reconciliação pendente (overAccruedDailies).
const STATEMENT: ChargeStatementView = {
  processId: "p1",
  currency: "BRL",
  lines: [
    { id: "l-removal", kind: "REMOVAL", kindLabel: "Remoção", periodSeq: null, refDate: "2026-07-19", description: "Remoção do veículo", quantity: "1.00", unitAmount: "150.00", totalAmount: "150.00", currency: "BRL", tariffId: null, adjustmentOfChargeId: null, settledAt: null },
    { id: "l-daily-3", kind: "DAILY", kindLabel: "Diária", periodSeq: 3, refDate: "2026-07-20", description: null, quantity: "1.00", unitAmount: "50.00", totalAmount: "50.00", currency: "BRL", tariffId: TARIFF_UUID, adjustmentOfChargeId: null, settledAt: null },
    { id: "l-daily-4", kind: "DAILY", kindLabel: "Diária", periodSeq: 4, refDate: "2026-07-21", description: null, quantity: "1.00", unitAmount: "50.00", totalAmount: "50.00", currency: "BRL", tariffId: TARIFF_UUID, adjustmentOfChargeId: null, settledAt: null },
    { id: "l-adj", kind: "ADJUSTMENT", kindLabel: "Ajuste (correção retroativa)", periodSeq: null, refDate: null, description: "Estorno de diária indevida", quantity: "1.00", unitAmount: "50.00", totalAmount: "-50.00", currency: "BRL", tariffId: null, adjustmentOfChargeId: ADJ_TARGET_UUID, settledAt: null },
  ],
  subtotals: [
    { kind: "REMOVAL", kindLabel: "Remoção", total: "150.00" },
    { kind: "DAILY", kindLabel: "Diária", total: "100.00" },
    { kind: "ADJUSTMENT", kindLabel: "Ajuste (correção retroativa)", total: "-50.00" },
  ],
  total: "200.00",
  cap: { model: "ROLLING_24H", cap: "THIRTY_DAYS_LEGACY", capCount: 30, nDue: 32, nAccrue: 30, capReached: true },
  asOf: "2026-07-27T12:00:00.000Z",
  reconciliationPending: true,
  overAccruedDailies: 2,
};

function renderGuia(overrides: Partial<Parameters<typeof GuiaDebitos>[0]> = {}): string {
  return renderToString(
    <GuiaDebitos statement={STATEMENT} loading={false} error={null} denied={false} canCreate onRetry={() => {}} onLaunch={() => {}} {...overrides} />,
  );
}

test("F4: linha DAILY usa periodSeq como identificador PRIMÁRIO + janela de 24h; refDate é legenda SECUNDÁRIA", () => {
  const html = renderGuia();

  // periodSeq é o identificador primário (ordinal DST-imune) — uma linha por diária.
  assert.match(html, /Diária #3/);
  assert.match(html, /Diária #4/);
  // A janela de 24h é rotulada (ROLLING_24H = §21 §1º).
  assert.match(html, /Janela de 24h/);
  // refDate aparece SÓ como legenda secundária, prefixada por "ref." (nunca o título da linha).
  assert.match(html, /ref\. 20\/07\/2026/);
  // F4 — o periodSeq PRECEDE a legenda de refDate no DOM (a data não é o identificador primário).
  assert.ok(html.indexOf("Diária #3") < html.indexOf("ref. 20/07/2026"), "Diária #N precede ref. da refDate");
  // O ISO cru da refDate NUNCA é renderizado como chave (não-injetivo no DST).
  assert.doesNotMatch(html, /2026-07-20/);
});

test("subtotais por kind + total + painel do teto + selo âmbar 'Teto atingido'; dinheiro em BRL (nunca float cru)", () => {
  const html = renderGuia();

  assert.match(html, /Subtotal · Remoção/);
  assert.match(html, /Subtotal · Diária/);
  // B2 — sob reconciliação pendente (STATEMENT.reconciliationPending=true), o rótulo do total é "apurado"
  // (memória de cálculo), NÃO "devido" (o ledger append-only ainda inclui diárias que o PR-10 estornará).
  assert.match(html, /Total apurado \(memória de cálculo\)/);
  assert.doesNotMatch(html, /Total devido/);

  // Painel do teto (cap.model / capCount / nAccrue) + selo âmbar quando capReached.
  assert.match(html, /Teto de diárias/);
  assert.match(html, /Teto atingido/);
  assert.match(html, /Diária de 24h/); // rótulo PT-BR do modelo ROLLING_24H
  assert.match(html, /30 diárias/); // capCount

  // Dinheiro formatado (Decimal→BRL): R$, decimais com vírgula, negativo do ADJUSTMENT com -R$.
  assert.match(html, /R\$/);
  assert.match(html, /150,00/);
  assert.match(html, /200,00/);
  assert.match(html, /-R\$/);
});

test("banner de reconciliação pendente (read-only, PR-10) quando reconciliationPending/overAccruedDailies", () => {
  const html = renderGuia();
  assert.match(html, /Reconciliação pendente/);
  assert.match(html, /2 diárias acumuladas além do congelamento/);
  // sem pendência → sem banner E o total volta a "Total devido" (B2).
  const clean = renderGuia({ statement: { ...STATEMENT, reconciliationPending: false, overAccruedDailies: 0 } });
  assert.doesNotMatch(clean, /Reconciliação pendente/);
  assert.match(clean, /Total devido/);
  assert.doesNotMatch(clean, /Total apurado/);
});

test("§2.8/allowlist + white-label: nenhum UUID cru (tariffId/adjustmentOfChargeId), sem 'tenant'/'polícia'", () => {
  const html = renderGuia();
  assert.doesNotMatch(html, UUID_RE);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

test("EmptyState honesto (D-007): guia sem lançamentos → 'Nenhum encargo registrado'", () => {
  const emptyHtml = renderGuia({ statement: { ...STATEMENT, lines: [], subtotals: [], total: "0.00", cap: null, reconciliationPending: false, overAccruedDailies: 0 } });
  assert.match(emptyHtml, /Nenhum encargo registrado/);
  // mock/sem statement (null) também cai no empty honesto.
  const nullHtml = renderGuia({ statement: null, canCreate: false });
  assert.match(nullHtml, /Nenhum encargo registrado/);
});

test("estados: skeleton na 1ª carga; erro + 'Tentar novamente'; acesso-negado quando denied", () => {
  const loadingHtml = renderToString(<GuiaDebitos statement={null} loading error={null} denied={false} canCreate={false} onRetry={() => {}} onLaunch={() => {}} />);
  assert.match(loadingHtml, /ui-skeleton/);

  const errorHtml = renderToString(<GuiaDebitos statement={null} loading={false} error="Falha" denied={false} canCreate={false} onRetry={() => {}} onLaunch={() => {}} />);
  assert.match(errorHtml, /Tentar novamente/);

  const deniedHtml = renderToString(<GuiaDebitos statement={null} loading={false} error={null} denied canCreate={false} onRetry={() => {}} onLaunch={() => {}} />);
  assert.match(deniedHtml, /Sem acesso à guia de débitos/);
});

test("gate charging:create — sem a permissão o botão 'Lançar encargo' some; com a permissão aparece", () => {
  assert.match(renderGuia({ canCreate: true }), /Lançar encargo/);
  assert.doesNotMatch(renderGuia({ canCreate: false }), /Lançar encargo/);
});

test("seletor de lançamento NÃO oferece DAILY (engine-only); só ADDITIONAL | ADJUSTMENT", () => {
  assert.equal(MANUAL_CHARGE_OPTIONS.length, 2);
  assert.deepEqual(
    MANUAL_CHARGE_OPTIONS.map((option) => option.value),
    ["ADDITIONAL", "ADJUSTMENT"],
  );
  assert.ok(MANUAL_CHARGE_OPTIONS.every((option) => option.value !== "DAILY"));

  const modalHtml = renderToString(
    <LancamentoChargeModal processId="p1" lines={STATEMENT.lines} currency="BRL" context={{}} onClose={() => {}} onDone={() => {}} />,
  );
  assert.match(modalHtml, /Adicional/);
  assert.match(modalHtml, /Ajuste \(correção retroativa\)/);
  // Estado inicial = ADDITIONAL: o seletor de tipo não tem "Diária" e não há seletor de alvo.
  assert.doesNotMatch(modalHtml, /Diária/);
  assert.doesNotMatch(modalHtml, /\btenant\b/i);
  assert.doesNotMatch(modalHtml, /pol[íi]cia/i);
});

test("buildInput: ADDITIONAL calcula qtd×valor (canônico 0.00); ADJUSTMENT exige alvo + delta assinado não-zero", () => {
  const add = buildInput("ADDITIONAL", { description: "Içamento", quantity: "2", unitValue: "150,00", adjustmentTarget: "", adjustmentValue: "", currency: "BRL" });
  assert.deepEqual(add, { kind: "ADDITIONAL", description: "Içamento", quantity: "2.00", unitAmount: "150.00", currency: "BRL" });

  // ADJUSTMENT sem alvo → erro (o backend exige adjustment_of_charge_id).
  assert.equal(typeof buildInput("ADJUSTMENT", { description: "x", quantity: "1", unitValue: "", adjustmentTarget: "", adjustmentValue: "-50,00", currency: "BRL" }), "string");

  // ADJUSTMENT válido: total assinado (delta), magnitude em unit_amount (>= 0), quantidade 1.
  const adj = buildInput("ADJUSTMENT", { description: "Estorno", quantity: "1", unitValue: "", adjustmentTarget: "l-removal", adjustmentValue: "-50,00", currency: "BRL" });
  assert.deepEqual(adj, { kind: "ADJUSTMENT", description: "Estorno", adjustmentOfChargeId: "l-removal", totalAmount: "-50.00", unitAmount: "50.00", quantity: "1", currency: "BRL" });

  // Ajuste zero é recusado (não altera o ledger).
  assert.equal(typeof buildInput("ADJUSTMENT", { description: "x", quantity: "1", unitValue: "", adjustmentTarget: "l-removal", adjustmentValue: "0", currency: "BRL" }), "string");

  // Descrição é normalizada (trim) — a obrigatoriedade é validada no modal (handleSubmit), não em buildInput.
  const trimmed = buildInput("ADDITIONAL", { description: "  Içamento  ", quantity: "1", unitValue: "10", adjustmentTarget: "", adjustmentValue: "", currency: "BRL" });
  assert.equal(typeof trimmed === "object" ? trimmed.description : "", "Içamento");
});
