import assert from "node:assert/strict";
import test from "node:test";

import {
  adaptFinancialAccountBalance,
  adaptFinancialAccountResponse,
  adaptFinancialAccountsResponse,
  getAccountKindLabel,
} from "../src/modules/finance/accounts/financial-accounts.adapter";

// B-SAN3-12b — camada de dados das CONTAS (GET/POST /financial-accounts, GET /financial-accounts/:id/balance).
// Os bytes de entrada são os do backend: `toFinancialAccountListDto` (lista SEM envelope `data`), `toFinancialAccountDto`
// (detalhe em `{ data }`) e `toFinancialAccountBalanceDto` (`in`/`out`, somados no servidor). O front nunca soma (F8).

const LIST_DTO = {
  items: [
    { id: "acc-1", name: "Banco do Brasil", kind: "bank", currency: "BRL", openingBalance: 1000, bankName: "BB", status: "active", isActive: true, createdAt: "2026-10-01T12:00:00.000Z" },
    { id: "acc-2", name: "Caixa da loja", kind: "cash", currency: "BRL", openingBalance: 0, bankName: null, status: "inactive", isActive: false, createdAt: "2026-10-02T12:00:00.000Z" },
  ],
  pagination: { limit: 100, offset: 0, total: 2 },
};

test("lista: lê o DTO real (sem envelope), preserva a paginação do servidor e a situação da conta", () => {
  const data = adaptFinancialAccountsResponse(LIST_DTO, "api");
  assert.equal(data.source, "api");
  assert.deepEqual(data.items.map((a) => [a.id, a.kind, a.active]), [["acc-1", "bank", true], ["acc-2", "cash", false]]);
  assert.deepEqual(data.pagination, { limit: 100, offset: 0, total: 2 });
  assert.equal(data.items[0]?.bankName, "BB");
});

test("lista: também aceita o envelope { data: { items } } e descarta item sem id, sem nome ou com tipo desconhecido", () => {
  const data = adaptFinancialAccountsResponse(
    { data: { items: [LIST_DTO.items[0], { id: "x", kind: "bank" }, { id: "y", name: "Y", kind: "cofre" }], pagination: { limit: 20, offset: 0, total: 3 } } },
    "api",
  );
  assert.deepEqual(data.items.map((a) => a.id), ["acc-1"]);
  assert.equal(data.pagination.total, 3, "o total é o do servidor, nunca recontado no front");
});

test("detalhe: lê { data } do POST /financial-accounts e devolve null para resposta inválida", () => {
  assert.equal(adaptFinancialAccountResponse({ data: LIST_DTO.items[0] })?.name, "Banco do Brasil");
  assert.equal(adaptFinancialAccountResponse({ data: null }), null);
  assert.equal(adaptFinancialAccountResponse("lixo"), null);
});

test("saldo: consumido pronto do servidor (`in`/`out`/`balance`), nenhum número recalculado", () => {
  const balance = adaptFinancialAccountBalance({ data: { accountId: "acc-1", currency: "BRL", openingBalance: 1000, in: 250.5, out: 100, balance: 1150.5 } });
  assert.deepEqual(balance, { accountId: "acc-1", openingBalance: 1000, inflow: 250.5, outflow: 100, balance: 1150.5 });
  // Se o servidor mandar um saldo "incoerente", o front MOSTRA o do servidor — não soma abertura + entradas − saídas.
  const odd = adaptFinancialAccountBalance({ data: { accountId: "acc-1", openingBalance: 1, in: 1, out: 1, balance: 999 } });
  assert.equal(odd?.balance, 999);
});

test("saldo: resposta sem `balance` numérico é recusada (null), nunca vira zero fingido", () => {
  assert.equal(adaptFinancialAccountBalance({ data: { accountId: "acc-1", in: 1, out: 1 } }), null);
});

test("rótulo do tipo de conta em português", () => {
  assert.deepEqual([getAccountKindLabel("bank"), getAccountKindLabel("cash"), getAccountKindLabel("wallet")], ["Conta bancária", "Caixa", "Carteira digital"]);
});
