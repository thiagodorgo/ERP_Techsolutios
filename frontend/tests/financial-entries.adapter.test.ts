import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ApiError } from "../src/services/api/client";
import {
  adaptEntriesAggregate,
  adaptFinancialEntriesResponse,
  adaptFinancialEntryResponse,
  adaptReconciliationPolicy,
  adaptTitleCheques,
  adaptUnlinkResult,
} from "../src/modules/finance/entries/financial-entries.adapter";
import { FINANCE_UI_ERROR_REASONS, financeErrorMessage, financeErrorReason } from "../src/modules/finance/entries/finance-errors";

// B-SAN3-12b — camada de dados dos LANÇAMENTOS (extrato, conciliação, agregado, política) e a lista FECHADA de razões
// que a tela traduz (§4.1 do plano, ratificação de 14:35Z: 32, iguais ao §4.1 e à seção "lista da tela" de
// API_CONTRACTS.md). Os bytes de entrada são os do backend 12a (`toFinancialEntryListDto` etc.).

const ENTRY = {
  id: "e-1",
  accountId: "acc-1",
  titleId: "t-1",
  direction: "in",
  amount: 200.1,
  currency: "BRL",
  paymentMethod: "pix",
  category: null,
  occurredAt: "2026-10-20T13:00:00.000Z",
  competencia: "2026-10",
  description: "Recebimento OS-101",
  reversalOf: null,
  reconciled: true,
  divergenceType: "value",
  reconciliationRef: "DOC 77",
  reconciledAt: "2026-10-21T10:00:00.123Z",
  reconciledBy: "u-1",
  active: true,
  createdAt: "2026-10-20T13:00:00.000Z",
  updatedAt: "2026-10-21T10:00:00.123Z",
};

test("lista do extrato: DTO real sem envelope; o estado lógico do CAS (reconciled + reconciledAt) passa intacto", () => {
  const data = adaptFinancialEntriesResponse({ items: [ENTRY], pagination: { limit: 100, offset: 0, total: 1 } }, "api");
  const entry = data.items[0]!;
  assert.equal(entry.reconciled, true);
  assert.equal(entry.reconciledAt, "2026-10-21T10:00:00.123Z", "o carimbo volta ao servidor exatamente como veio");
  assert.equal(entry.divergenceType, "value");
  assert.equal(entry.description, "Recebimento OS-101");
  assert.equal(data.pagination.total, 1);
});

test("lista do extrato: item sem id, sem conta ou com direção desconhecida não vira linha", () => {
  const data = adaptFinancialEntriesResponse({ items: [ENTRY, { ...ENTRY, id: "" }, { ...ENTRY, id: "e-2", direction: "x" }, { ...ENTRY, id: "e-3", accountId: null }] }, "api");
  assert.deepEqual(data.items.map((e) => e.id), ["e-1"]);
});

test("detalhe: { data } do GET/PATCH; resposta inválida → null", () => {
  assert.equal(adaptFinancialEntryResponse({ data: { ...ENTRY, reconciled: false, reconciledAt: null } })?.reconciledAt, null);
  assert.equal(adaptFinancialEntryResponse({ data: {} }), null);
});

test("agregado: valores e contagens do servidor, fuso e moeda declarados", () => {
  const agg = adaptEntriesAggregate({ data: { groupBy: "none", currency: "BRL", timezone: "America/Sao_Paulo", items: [{ bucket: null, count: 7, inflow: 1500.25, outflow: 300, net: 1200.25 }] } });
  assert.deepEqual(agg, { groupBy: "none", currency: "BRL", timezone: "America/Sao_Paulo", items: [{ bucket: null, count: 7, inflow: 1500.25, outflow: 300, net: 1200.25 }] });
});

test("agregado: resposta sem itens vira null (a tela não renderiza o que o servidor não deu — F19)", () => {
  assert.equal(adaptEntriesAggregate({ data: { groupBy: "none" } }), null);
  assert.equal(adaptEntriesAggregate(null), null);
});

test("política: calculada PARA O ATOR no servidor; ausência = sem privilégio (fail-closed)", () => {
  assert.deepEqual(adaptReconciliationPolicy({ data: { canUnreconcile: true, delegatedToFinance: true } }), { canUnreconcile: true, delegatedToFinance: true });
  assert.deepEqual(adaptReconciliationPolicy({ data: { canUnreconcile: "true" } }), { canUnreconcile: false, delegatedToFinance: false });
  assert.deepEqual(adaptReconciliationPolicy(undefined), { canUnreconcile: false, delegatedToFinance: false });
});

test("cheques do título (GET /cheques?title_id=): só os pendentes (registrado/depositado) entram no bloco da troca", () => {
  const cheques = adaptTitleCheques({
    items: [
      { id: "ch-1", titleId: "t-1", chequeNumber: "000123", bank: "Itaú", amount: 1000, status: "registered", dueDate: "2026-11-01" },
      { id: "ch-2", titleId: "t-1", chequeNumber: "000124", bank: "Itaú", amount: 1000, status: "bounced", dueDate: null },
      { id: "ch-3", titleId: "t-1", chequeNumber: "000125", bank: null, amount: 1000, status: "deposited", dueDate: null },
    ],
  });
  assert.deepEqual(cheques.map((c) => c.id), ["ch-1", "ch-3"]);
  assert.equal(cheques[0]?.chequeNumber, "000123");
});

test("desvincular: o aviso `cheque_still_depositable` (cheque depositado) chega à tela", () => {
  const result = adaptUnlinkResult({ data: { id: "ch-3", titleId: null, chequeNumber: "000125", bank: null, amount: 1000, status: "deposited" }, warning: "cheque_still_depositable" });
  assert.equal(result?.stillDepositable, true);
  assert.equal(result?.cheque.id, "ch-3");
  assert.equal(adaptUnlinkResult({ data: { id: "ch-1", chequeNumber: "1", amount: 1, status: "registered" } })?.stillDepositable, false);
});

// ---------------------------------------------- F4 ----------------------------------------------

/** A lista da tela em API_CONTRACTS.md: a sentença "Lista fechada do que a tela traduz" até "Novos FORA da lista". */
function contractScreenReasons(): Set<string> {
  const md = readFileSync(new URL("../../API_CONTRACTS.md", import.meta.url), "utf8");
  const start = md.indexOf("**Lista fechada do que a tela traduz");
  const end = md.indexOf("Novos FORA da lista da tela", start);
  assert.ok(start > 0 && end > start, "seção 'lista da tela' não encontrada em API_CONTRACTS.md");
  const out = new Set<string>();
  for (const match of md.slice(start, end).matchAll(/`([^`]+)`/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (token === "404") out.add("not_found");
      else if (token === "403") out.add("forbidden");
      else if (/^[a-z][a-z_]+$/.test(token)) out.add(token);
    }
  }
  return out;
}

test("F4: a lista do código é IGUAL, como conjunto, à lista da tela de API_CONTRACTS.md — e tem 32", () => {
  const fromContract = contractScreenReasons();
  const fromCode = new Set<string>(FINANCE_UI_ERROR_REASONS);
  assert.equal(FINANCE_UI_ERROR_REASONS.length, 32);
  assert.equal(fromCode.size, 32, "sem repetição");
  assert.deepEqual([...fromCode].filter((r) => !fromContract.has(r)).sort(), [], "razão no código que o contrato não lista");
  assert.deepEqual([...fromContract].filter((r) => !fromCode.has(r)).sort(), [], "razão do contrato sem mensagem na tela");
});

test("F4: cada razão tem mensagem PT-BR distinta; desconhecida → genérica honesta", () => {
  const generic = financeErrorMessage(new ApiError(422, "x", "C", "razao_que_nao_existe"));
  const messages = FINANCE_UI_ERROR_REASONS.map((reason) =>
    financeErrorMessage(new ApiError(reason === "not_found" ? 404 : reason === "forbidden" ? 403 : 422, "x", "C", reason === "not_found" || reason === "forbidden" ? undefined : reason)),
  );
  assert.equal(new Set(messages).size, 32, "mensagens distintas");
  for (const message of messages) assert.notEqual(message, generic);
  assert.match(generic, /Não foi possível concluir/);
  for (const message of [...messages, generic]) assert.doesNotMatch(message, /tenant|role|reconciled|\/api\//i);
});

test("F4: `invalid_amount` é 400 e tem mensagem própria; 404 e 403 sem razão caem em 'not_found'/'forbidden'", () => {
  assert.equal(financeErrorReason(new ApiError(400, "x", "C", "invalid_amount")), "invalid_amount");
  assert.equal(financeErrorReason(new ApiError(404, "x", "C", "title_not_found")), "not_found");
  assert.equal(financeErrorReason(new ApiError(403, "x", "C", "missing_permission")), "forbidden");
  assert.equal(financeErrorReason(new ApiError(403, "x", "C", "unreconcile_forbidden")), "unreconcile_forbidden");
  assert.equal(financeErrorReason(new TypeError("Failed to fetch")), null);
  assert.match(financeErrorMessage(new TypeError("Failed to fetch")), /conexão/i, "falha de rede tem frase própria");
});
