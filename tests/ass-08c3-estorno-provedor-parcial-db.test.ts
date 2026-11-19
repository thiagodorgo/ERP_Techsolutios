import assert from "node:assert/strict";
import test from "node:test";

import { source } from "./helpers/ass-08c3-test-kit.js";

test("EP0: padrão Q1(a) cancela nota no estorno total do provedor mesmo com pagamento manual restante", () => {
  const text = source("src/modules/subscription-billing/statements/statement-settlement.service.ts");
  const anchor = text.indexOf("// [INTX-03]");
  const statement = text.slice(anchor, anchor + 600);
  assert.match(statement, /live\.status === "pending" \|\| live\.status === "authorized"/);
  assert.doesNotMatch(statement, /savedStatement\.paidCents === 0/);
  assert.doesNotMatch(text, /\[EP-PARCIAL\]/);
});

test("M-EP0: a mutação literal é adicionar paidCents===0 à condição INTX-03", () => {
  const text = source("src/modules/subscription-billing/statements/statement-settlement.service.ts");
  assert.equal(text.split("[INTX-03]").length - 1, 1);
});

