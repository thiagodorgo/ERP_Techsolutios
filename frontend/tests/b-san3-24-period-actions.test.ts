import assert from "node:assert/strict";
import test from "node:test";

import { periodActionsFor } from "../src/modules/finance/period-closes/period-actions";
import type { PeriodAction, PeriodStatus } from "../src/modules/finance/period-closes/period-closes.types";

// B-SAN3-24 (24b, B3 e B5 — P-ACESSO) — Fechar e Reabrir por situação × permissão, contra o oráculo escrito a partir do
// servidor (`financial-period-close.service.ts`: fechar o que não está fechado; reabrir só o fechado; "fechando" → 409),
// e não a partir do código da tela. O cruzamento com o servidor real por papel é o B3 do contrato da raiz.

const STATUSES: readonly PeriodStatus[] = ["open", "closing", "closed", "reopened"];
const KEYS = ["financial_period:close", "financial_period:reopen"] as const;

function expected(status: PeriodStatus, perms: ReadonlySet<string>): readonly PeriodAction[] {
  if (status === "closing") return [];
  const out: PeriodAction[] = [];
  if ((status === "open" || status === "reopened") && perms.has("financial_period:close")) out.push("close");
  if (status === "closed" && perms.has("financial_period:reopen")) out.push("reopen");
  return out;
}

test("B3 a tabela de Fechar/Reabrir bate com o oráculo em 4 situações × 4 subconjuntos de permissão (16 casos)", () => {
  let cases = 0;
  for (const status of STATUSES) {
    for (let mask = 0; mask < 4; mask++) {
      const perms = new Set(KEYS.filter((_, index) => (mask >> index) % 2 === 1));
      assert.deepEqual([...periodActionsFor({ status }, perms)], [...expected(status, perms)], `${status} · {${[...perms].join(", ")}}`);
      cases++;
    }
  }
  assert.equal(cases, 16);
});

test("B3 o Financeiro (só fechar) não vê Reabrir; o administrador vê as duas; quem só lê, nenhuma", () => {
  const finance = new Set(["financial_period:read", "financial_period:close"]);
  const admin = new Set(["financial_period:read", "financial_period:close", "financial_period:reopen"]);
  const reader = new Set(["financial_period:read"]);
  assert.deepEqual(periodActionsFor({ status: "closed" }, finance), []);
  assert.deepEqual(periodActionsFor({ status: "open" }, finance), ["close"]);
  assert.deepEqual(periodActionsFor({ status: "closed" }, admin), ["reopen"]);
  assert.deepEqual(periodActionsFor({ status: "reopened" }, admin), ["close"]);
  assert.deepEqual(periodActionsFor({ status: "open" }, reader), []);
});

test("B5 'fechando' (closing): nenhuma ação, nem para o administrador", () => {
  assert.deepEqual(periodActionsFor({ status: "closing" }, new Set(KEYS)), []);
});
