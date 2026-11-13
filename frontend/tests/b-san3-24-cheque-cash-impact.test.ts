import assert from "node:assert/strict";
import test from "node:test";

import { cashImpactFor, cashImpactText, type CashImpactAction } from "../src/modules/finance/cheques/cheque-cash-impact";
import type { Cheque, ChequeDirection, ChequeStatus } from "../src/modules/finance/cheques/cheques.types";

// B-SAN3-24 (24a, A6b — R-CAIXA, achado ALTA A-01) — a tabela pura do impacto de caixa: direção × ação × estado ×
// vínculo → sentido e efeito no título, contra a tabela do plano v2 §1.2 (fonte: `cheque.service.ts:326`, `:374` e
// `:348-358`) e §2.1. O cruzamento com o lançamento que o servidor grava é o A6a.

function cheque(direction: ChequeDirection, status: ChequeStatus, titleId: string | null, amount = 100): Cheque {
  return {
    id: "chq-1",
    accountId: "acc-1",
    titleId,
    direction,
    chequeNumber: "000123",
    bank: "Banco",
    amount,
    currency: "BRL",
    dueDate: null,
    status,
    clearedEntryId: null,
    bounceEntryId: null,
    bounceReason: null,
    notes: null,
    active: true,
    createdAt: "2026-11-11T12:00:00.000Z",
  };
}

type Row = { direction: ChequeDirection; status: ChequeStatus; action: CashImpactAction; linked: boolean; movement: "in" | "out" | "none"; title: string | null };

// A tabela do plano (§1.2 sentido; §2.1 título), linha a linha.
const TABLE: readonly Row[] = [
  { direction: "received", status: "deposited", action: "clear", linked: false, movement: "in", title: null },
  { direction: "received", status: "deposited", action: "clear", linked: true, movement: "in", title: "settles" },
  { direction: "issued", status: "deposited", action: "clear", linked: false, movement: "out", title: null },
  { direction: "issued", status: "deposited", action: "clear", linked: true, movement: "out", title: "settles" },
  { direction: "received", status: "cleared", action: "bounce", linked: false, movement: "out", title: null },
  { direction: "received", status: "cleared", action: "bounce", linked: true, movement: "out", title: "reopens" },
  { direction: "issued", status: "cleared", action: "bounce", linked: false, movement: "in", title: null },
  { direction: "issued", status: "cleared", action: "bounce", linked: true, movement: "in", title: "reopens" },
  { direction: "received", status: "deposited", action: "bounce", linked: false, movement: "none", title: null },
  { direction: "received", status: "deposited", action: "bounce", linked: true, movement: "none", title: "leaves-pending" },
  { direction: "issued", status: "deposited", action: "bounce", linked: false, movement: "none", title: null },
  { direction: "issued", status: "deposited", action: "bounce", linked: true, movement: "none", title: "leaves-pending" },
  { direction: "received", status: "registered", action: "deposit", linked: false, movement: "none", title: null },
  { direction: "issued", status: "registered", action: "deposit", linked: true, movement: "none", title: null },
  { direction: "received", status: "registered", action: "cancel", linked: false, movement: "none", title: null },
  { direction: "issued", status: "registered", action: "delete", linked: false, movement: "none", title: null },
];

test("A6b sentido e efeito no título batem com a tabela do plano (16 linhas)", () => {
  for (const row of TABLE) {
    const impact = cashImpactFor(cheque(row.direction, row.status, row.linked ? "tit-1" : null), row.action);
    const label = `${row.direction} · ${row.status} · ${row.action} · ${row.linked ? "com título" : "sem título"}`;
    assert.equal(impact.movement, row.movement, label);
    assert.equal(impact.title, row.title, label);
    assert.equal(impact.amount, 100, label);
    assert.equal(impact.accountId, "acc-1", label);
  }
});

test("A6b (N-05) devolver compensado vinculado: o título volta a ficar em aberto ou PARCIAL conforme o que já estava pago", () => {
  const fully = cashImpactFor(cheque("received", "cleared", "tit-1", 60), "bounce", { title: { document: "FAT-1", amount: 60, paidAmount: 60 } });
  assert.equal(fully.titleAfter, "open");
  assert.match(cashImpactText(fully), /O título FAT-1 volta a ficar em aberto\./);
  const partial = cashImpactFor(cheque("received", "cleared", "tit-1", 60), "bounce", { title: { document: "FAT-2", amount: 100, paidAmount: 100 } });
  assert.equal(partial.titleAfter, "partially_paid");
  assert.match(cashImpactText(partial), /O título FAT-2 volta a ficar parcialmente pago\./);
});

test("A6b os textos da confirmação saem só do impacto", () => {
  const refs = { accountName: "Itaú", title: { document: "FAT-9", amount: 100, paidAmount: 0 } };
  assert.equal(cashImpactText(cashImpactFor(cheque("received", "deposited", null), "clear", refs)), "Entra R$ 100,00 na conta Itaú hoje. Nenhum título será baixado.");
  assert.equal(cashImpactText(cashImpactFor(cheque("issued", "deposited", "tit-1"), "clear", refs)), "Sai R$ 100,00 da conta Itaú hoje. Baixa o título FAT-9.");
  assert.equal(cashImpactText(cashImpactFor(cheque("received", "cleared", null), "bounce", refs)), "Sai R$ 100,00 da conta Itaú (estorno da compensação).");
  assert.equal(cashImpactText(cashImpactFor(cheque("issued", "cleared", null), "bounce", refs)), "Volta R$ 100,00 para a conta Itaú (estorno da compensação).");
  assert.equal(cashImpactText(cashImpactFor(cheque("received", "registered", null), "deposit", refs)), "Nenhum dinheiro se move.");
  assert.match(cashImpactText(cashImpactFor(cheque("received", "deposited", "tit-1"), "bounce", refs)), /^Nenhum dinheiro se move\. O cheque sai das pendências do título FAT-9, e o motivo é obrigatório\.$/);
});
