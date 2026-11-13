import assert from "node:assert/strict";
import test from "node:test";

import { bounceReasonRequired, canRegisterCheque, chequeActionsFor, movesMoney } from "../src/modules/finance/cheques/cheque-actions";
import type { Cheque, ChequeAction, ChequeStatus } from "../src/modules/finance/cheques/cheques.types";

// B-SAN3-24 (24a, A4 — P-ACESSO, R-VINCULO, R-ANCORAS) — a tabela de ações por estado × vínculo × permissão, contra o
// ORÁCULO escrito abaixo a partir do serviço (`src/modules/cheques/cheque.service.ts`; plano v2 §1.2), não a partir do
// código da tela. 5 estados × {com, sem título} × os 8 subconjuntos de {cheques:update, financial_entries:create,
// cheques:create}. O cruzamento com o servidor real é o A5 (`tests/b-san3-24-cheques-front-contract.test.ts`).

const STATES: readonly ChequeStatus[] = ["registered", "deposited", "cleared", "bounced", "cancelled"];
const KEYS = ["cheques:update", "financial_entries:create", "cheques:create"] as const;

function subsets(): readonly (readonly string[])[] {
  const out: string[][] = [];
  for (let mask = 0; mask < 8; mask++) out.push(KEYS.filter((_, index) => (mask >> index) % 2 === 1));
  return out;
}

function cheque(status: ChequeStatus, titleId: string | null): Cheque {
  return {
    id: "chq-1",
    accountId: "acc-1",
    titleId,
    direction: "received",
    chequeNumber: "000123",
    bank: "Banco",
    amount: 100,
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

/** O oráculo: o que o SERVIDOR aceita (rota + serviço), escrito à parte do código da tela. */
function expected(status: ChequeStatus, linked: boolean, perms: ReadonlySet<string>): readonly ChequeAction[] {
  const update = perms.has("cheques:update");
  const money = update && perms.has("financial_entries:create");
  const out: ChequeAction[] = [];
  if (status === "registered" && update) out.push("deposit", "edit", ...(linked ? [] : (["cancel", "delete"] as const)));
  if (status === "deposited" && money) out.push("clear");
  if (status === "deposited" && update) out.push("bounce");
  if (status === "cleared" && money) out.push("bounce");
  return out;
}

const sorted = (actions: readonly ChequeAction[]) => [...actions].sort();

test("A4 a tabela de ações bate com o oráculo em 5 estados × vínculo × 8 subconjuntos de permissão (80 casos)", () => {
  let cases = 0;
  for (const status of STATES) {
    for (const linked of [false, true]) {
      for (const subset of subsets()) {
        const perms = new Set(subset);
        const label = `${status} · ${linked ? "com título" : "sem título"} · {${subset.join(", ")}}`;
        assert.deepEqual(sorted(chequeActionsFor(cheque(status, linked ? "tit-1" : null), perms)), sorted(expected(status, linked, perms)), label);
        cases++;
      }
    }
  }
  assert.equal(cases, 80);
});

test("A4 vinculado ⇒ nunca Cancelar nem Excluir, com qualquer permissão", () => {
  const all = new Set<string>(KEYS);
  for (const status of STATES) {
    const actions = chequeActionsFor(cheque(status, "tit-1"), all);
    assert.ok(!actions.includes("cancel"), status);
    assert.ok(!actions.includes("delete"), status);
  }
});

test("A4 `cleared` com só {cheques:update} ⇒ sem Devolver; `deposited` com só {cheques:update} ⇒ sem Compensar", () => {
  const onlyUpdate = new Set(["cheques:update"]);
  assert.deepEqual(chequeActionsFor(cheque("cleared", null), onlyUpdate), []);
  assert.deepEqual(chequeActionsFor(cheque("deposited", null), onlyUpdate), ["bounce"]);
});

test("A4 cheque excluído (inativo) não oferece nada; registrar exige `cheques:create`", () => {
  const all = new Set<string>(KEYS);
  assert.deepEqual(chequeActionsFor({ ...cheque("registered", null), active: false }, all), []);
  assert.equal(canRegisterCheque(new Set(["cheques:create"])), true);
  assert.equal(canRegisterCheque(new Set(["cheques:read", "cheques:update"])), false);
});

test("A4 motivo obrigatório só ao devolver depositado vinculado; só compensar e devolver compensado movem dinheiro", () => {
  assert.equal(bounceReasonRequired(cheque("deposited", "tit-1")), true);
  assert.equal(bounceReasonRequired(cheque("deposited", null)), false);
  assert.equal(bounceReasonRequired(cheque("cleared", "tit-1")), false);
  assert.equal(movesMoney(cheque("deposited", null), "clear"), true);
  assert.equal(movesMoney(cheque("cleared", null), "bounce"), true);
  assert.equal(movesMoney(cheque("deposited", null), "bounce"), false);
  assert.equal(movesMoney(cheque("registered", null), "deposit"), false);
});
