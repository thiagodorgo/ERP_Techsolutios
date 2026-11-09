// B-ASS-06 · F1 — centavos exatos (plano §3.3 e §4.6, R-PAY-8 / sonda H). Mutação do plano: Math.trunc
// no lugar de Math.round → a propriedade de 1..299999 fica vermelha (0.29 vira 28).

import assert from "node:assert/strict";
import test from "node:test";

import { BillingMoneyError, fromCents, toCents } from "../src/modules/subscription-billing/providers/payment/payment-money.js";

test("T-PAY-MONEY-1 · toCents converte reais em centavos inteiros", () => {
  assert.equal(toCents(0.29), 29);
  assert.equal(toCents(129.9), 12990);
  assert.equal(toCents(2999.99), 299999);
  assert.equal(toCents(1), 100);
});

test("T-PAY-MONEY-2 · propriedade: toCents(c / 100) === c para c de 1 a 299 999", () => {
  for (let c = 1; c <= 299_999; c += 1) {
    assert.equal(toCents(c / 100), c, `toCents(${c} / 100) === ${c}`);
  }
});

test("T-PAY-MONEY-3 · NaN, infinito e resultado fora do safe integer → lançam", () => {
  assert.throws(() => toCents(Number.NaN), (error: unknown) => error instanceof BillingMoneyError);
  assert.throws(() => toCents(Number.POSITIVE_INFINITY), (error: unknown) => error instanceof BillingMoneyError);
  assert.throws(() => toCents(Number.NEGATIVE_INFINITY), (error: unknown) => error instanceof BillingMoneyError);
  assert.throws(() => fromCents(0.5), (error: unknown) => error instanceof BillingMoneyError);
  assert.equal(fromCents(299999), 2999.99);
});
