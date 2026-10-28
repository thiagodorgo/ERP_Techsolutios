import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ConciliarForm } from "../src/modules/finance/entries/components/ConciliarForm";
import { DesvincularChequeModal } from "../src/modules/finance/entries/components/DesvincularChequeModal";
import type { FinancialEntry } from "../src/modules/finance/entries/financial-entries.types";
import { reconcilePayloadFor, unlinkJustificationError } from "../src/modules/finance/entries/useFinanceActions";

// B-SAN3-12b — CONCILIAÇÃO e TROCA DA VINCULAÇÃO em SSR e por função pura: o corpo do PATCH sempre leva o estado
// lido da linha (F10/F22, CAS do §4.6 do plano), as escolhas do formulário são as da maquete, e a justificativa do
// desvínculo segue a régua do servidor (10–500, 400 invalid_justification). O fluxo com efeitos (409 → relê e repinta)
// está em finance-page-live.test.tsx.

const PENDING: FinancialEntry = {
  id: "e-1",
  accountId: "acc-1",
  titleId: "t-9",
  direction: "out",
  amount: 80,
  currency: "BRL",
  paymentMethod: "boleto",
  category: null,
  occurredAt: "2026-10-19T13:00:00.000Z",
  competencia: "2026-10",
  description: "Pagamento fornecedor",
  reversalOf: null,
  reconciled: false,
  divergenceType: null,
  reconciliationRef: null,
  reconciledAt: null,
  reconciledBy: null,
  active: true,
  createdAt: "2026-10-19T13:00:00.000Z",
  updatedAt: "2026-10-19T13:00:00.000Z",
};

test("F10: conciliar leva SEMPRE expected_reconciled e expected_reconciled_at lidos da linha", () => {
  assert.deepEqual(reconcilePayloadFor(PENDING, { reconciled: true, divergence: "none", ref: "" }), {
    reconciled: true,
    expected_reconciled: false,
    expected_reconciled_at: null,
  });
  assert.deepEqual(reconcilePayloadFor(PENDING, { reconciled: true, divergence: "value", ref: "  DOC 12 " }), {
    reconciled: true,
    divergence_type: "value",
    reconciliation_ref: "DOC 12",
    expected_reconciled: false,
    expected_reconciled_at: null,
  });
});

test("F10: desfazer leva o carimbo lido, exatamente como veio do servidor (ms incluídos)", () => {
  const done = { ...PENDING, reconciled: true, reconciledAt: "2026-10-21T10:00:00.123Z" };
  assert.deepEqual(reconcilePayloadFor(done, { reconciled: false, divergence: "none", ref: "" }), {
    reconciled: false,
    expected_reconciled: true,
    expected_reconciled_at: "2026-10-21T10:00:00.123Z",
  });
});

test("formulário de conciliação: as três respostas da maquete e a referência do extrato, em português", () => {
  const html = renderToStaticMarkup(
    <ConciliarForm entry={PENDING} actions={{ reconcile: async () => PENDING, rereadEntry: async () => PENDING }} onDone={() => undefined} onReread={() => undefined} onClose={() => undefined} />,
  );
  for (const label of ["Bate com o extrato", "Bate, com ressalva de valor", "Bate, com ressalva de data", "Referência no extrato"]) assert.ok(html.includes(label), label);
  assert.match(html, /type="radio"[^>]*value="none"[^>]*checked=""|checked=""[^>]*value="none"/);
  assert.doesNotMatch(html, /reconciled|expected_/i);
});

test("troca da vinculação: justificativa entre 10 e 500 caracteres (a régua do servidor)", () => {
  assert.match(unlinkJustificationError("curta") ?? "", /10/);
  assert.equal(unlinkJustificationError("O cliente pagou por Pix e o cheque volta."), null);
  assert.match(unlinkJustificationError("x".repeat(501)) ?? "", /500/);
  assert.match(unlinkJustificationError("          ") ?? "", /10/, "espaços não contam");
});

test("troca da vinculação: o modal avisa privilégio e auditoria, mostra o cheque e pede a justificativa", () => {
  const html = renderToStaticMarkup(
    <DesvincularChequeModal
      cheque={{ id: "ch-1", chequeNumber: "000123", bank: "Itaú", amount: 1000, status: "registered", dueDate: null }}
      onClose={() => undefined}
      onConfirm={async () => undefined}
    />,
  );
  assert.match(html, /000123/);
  assert.match(html, /R\$\s1\.000,00/);
  assert.match(html, /auditoria/);
  assert.match(html, /<textarea[^>]*name="justificativa"/);
});
