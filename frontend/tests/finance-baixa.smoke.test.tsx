import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ApiError } from "../src/services/api/client";
import type { FinancialAccount } from "../src/modules/finance/accounts/financial-accounts.types";
import { BaixaForm } from "../src/modules/finance/entries/components/BaixaForm";
import { TitleDetail } from "../src/modules/finance/entries/components/TitleDetail";
import { financeErrorMessage } from "../src/modules/finance/entries/finance-errors";
import { BAIXA_PAYMENT_METHODS, newClientActionId, payPayloadFor } from "../src/modules/finance/entries/useFinanceActions";
import type { FinancialTitle } from "../src/modules/finance/titles/financial-titles.types";

// B-SAN3-12b — a BAIXA (registrar recebimento/pagamento) em SSR: meios, aviso do cheque, valor padrão, gate da ação no
// detalhe do título e o corpo do POST /financial-titles/:id/pay. O fluxo com efeitos (reenvio, releitura, cheque
// pendente) está em finance-page-live.test.tsx, com a página real.

const TITLE: FinancialTitle = {
  id: "t-1",
  direction: "receivable",
  partyType: "customer",
  partyName: "Transportes Alfa",
  document: "NF 1001",
  category: "Serviços",
  description: null,
  amount: 1500,
  currency: "BRL",
  issueDate: null,
  dueDate: "2026-10-10",
  paidAmount: 500,
  status: "partially_paid",
  competencia: "2026-10",
  accountId: null,
  workOrderId: "wo-77",
  overdue: true,
  active: true,
  createdAt: "2026-10-01T12:00:00.000Z",
};

const ACCOUNTS: FinancialAccount[] = [
  { id: "acc-1", name: "Banco do Brasil", kind: "bank", currency: "BRL", openingBalance: 0, bankName: null, active: true, createdAt: "" },
  { id: "acc-old", name: "Conta encerrada", kind: "bank", currency: "BRL", openingBalance: 0, bankName: null, active: false, createdAt: "" },
];

const NOOP_ACTIONS = {
  pay: async () => TITLE,
  rereadTitle: async () => TITLE,
  listPendingCheques: async () => [],
  unlinkCheque: async () => {
    throw new Error("não usado");
  },
};

const form = () =>
  renderToStaticMarkup(<BaixaForm title={TITLE} accounts={ACCOUNTS} canUnlinkCheque={false} actions={NOOP_ACTIONS} onDone={() => undefined} onClose={() => undefined} />);

test("F5: os meios oferecidos são Pix, Transferência, Boleto, Dinheiro e Cartão — nunca cheque", () => {
  const html = form();
  const options = [...html.matchAll(/<option value="([a-z]+)"[^>]*>([^<]+)<\/option>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(options.filter(([value]) => ["pix", "transfer", "boleto", "cash", "card", "check"].includes(value)), [
    ["pix", "Pix"],
    ["transfer", "Transferência"],
    ["boleto", "Boleto"],
    ["cash", "Dinheiro"],
    ["card", "Cartão"],
  ]);
  assert.doesNotMatch(html, /<option[^>]*>Cheque<\/option>|value="check"/);
  assert.deepEqual([...BAIXA_PAYMENT_METHODS].map((m) => m.value), ["pix", "transfer", "boleto", "cash", "card"]);
});

test("F5: o aviso fixo do cheque está presente (cheque entra pela compensação, na tela de Cheques)", () => {
  assert.match(form(), /Recebeu em cheque\?.*Cheque não é baixado aqui/);
});

test("F5: 422 cheque_required (cliente antigo) vira mensagem em português", () => {
  assert.match(financeErrorMessage(new ApiError(422, "x", "FINANCIAL_ENTRY_UNPROCESSABLE", "cheque_required")), /Cheques/);
});

test("baixa: valor padrão é o saldo em aberto (R$ 1.000,00), só contas ativas, data e meio presentes", () => {
  const html = form();
  assert.match(html, /name="valor"[^>]*value="1.000,00"/);
  assert.match(html, /<option value="acc-1">Banco do Brasil<\/option>/);
  assert.doesNotMatch(html, /Conta encerrada/, "conta inativa não recebe baixa");
  assert.match(html, /name="data"[^>]*type="date"|type="date"[^>]*name="data"/);
  assert.match(html, /Conta que recebeu/);
  assert.match(html, /Registrar recebimento/);
});

test("F1: o corpo da baixa leva account_id, amount, payment_method, occurred_at e client_action_id", () => {
  const body = payPayloadFor({ accountId: "acc-1", amountText: "1.000,00", date: "2026-10-26", method: "pix" }, "cid-1");
  assert.deepEqual(body, { account_id: "acc-1", amount: 1000, payment_method: "pix", occurred_at: "2026-10-26", client_action_id: "cid-1" });
  assert.equal(payPayloadFor({ accountId: "acc-1", amountText: "0,00", date: "2026-10-26", method: "pix" }, "cid"), null, "valor zero não envia");
  assert.equal(payPayloadFor({ accountId: "", amountText: "10", date: "2026-10-26", method: "pix" }, "cid"), null, "sem conta não envia");
});

test("F2: cada formulário novo nasce com um client_action_id próprio", () => {
  const ids = new Set(Array.from({ length: 20 }, () => newClientActionId()));
  assert.equal(ids.size, 20);
});

test("F7: no detalhe do título, 'Registrar recebimento' só com a permissão de baixa e em título que não está quitado nem cancelado", () => {
  const can = renderToStaticMarkup(<TitleDetail title={TITLE} canPay onPay={() => undefined} />);
  assert.match(can, /<button[^>]*>.*Registrar recebimento<\/button>/);
  const readOnly = renderToStaticMarkup(<TitleDetail title={TITLE} canPay={false} onPay={() => undefined} />);
  assert.doesNotMatch(readOnly, /Registrar recebimento<\/button>/);
  assert.match(readOnly, /Seu perfil só consulta/);
  for (const status of ["paid", "cancelled"] as const) {
    const html = renderToStaticMarkup(<TitleDetail title={{ ...TITLE, status }} canPay onPay={() => undefined} />);
    assert.doesNotMatch(html, /Registrar recebimento<\/button>/, status);
  }
  const payable = renderToStaticMarkup(<TitleDetail title={{ ...TITLE, direction: "payable" }} canPay onPay={() => undefined} />);
  assert.match(payable, /Registrar pagamento<\/button>/);
});

test("detalhe do título: propriedades (documento, OS, valor, já recebido, saldo) sem inventar o que o servidor não deu", () => {
  const html = renderToStaticMarkup(<TitleDetail title={TITLE} canPay onPay={() => undefined} />).replace(/\u00a0/g, " ");
  for (const piece of ["NF 1001", "Transportes Alfa", "R$ 1.500,00", "R$ 500,00", "R$ 1.000,00"]) assert.ok(html.includes(piece), piece);
  const semDoc = renderToStaticMarkup(<TitleDetail title={{ ...TITLE, document: null, workOrderId: null, category: null }} canPay onPay={() => undefined} />);
  assert.doesNotMatch(semDoc, />—</, "nada de travessão fingindo dado (F19)");
});
