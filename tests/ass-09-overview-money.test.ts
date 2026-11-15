import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MICRO,
  costToBrlCents,
  formatCents,
  formatMicro,
  rateToMicro,
  roundHalfAwayFromZero,
  subOrNull,
  sumIgnoringNull,
  sumOrNull,
  toMicro,
} from "../src/modules/subscription-billing/overview/overview-money.js";

// B-ASS-09 · F1 — o dinheiro da visão de custo × assinatura (plano v2 §3 P1, §6 C1: R-FX-1, R-FX-2, R-FX-2b). Valores
// sintéticos (plano §15): custo `100.000000`, taxa `5.400000`, assinatura `1000.00`.
//
// MUTAÇÕES LITERAIS QUE ESTE ARQUIVO MATA (plano v1 §6, sem mudança no v2):
//   M-FX-1  `costMicro * rateMicro` → `costMicro * MICRO`                         → T-FX-1 ("100.00" no lugar de "540.00")
//   M-FX-2  `r * 2n >= d ? q + 1n : q` → `q`                                       → T-FX-2 ("0.00" no lugar de "0.01")
//   M-FX-3  corpo de `roundHalfAwayFromZero` → `return (n + d / 2n) / d;`          → T-FX-2b ("0.00" no lugar de "-0.01")

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("T-FX-1 · conversão: 100.000000 USD × 5.400000, assinatura 1000.00 → custo 540.00, margem 460.00, original 100.000000", () => {
  const costMicro = toMicro(100);
  const rateMicro = rateToMicro("5.400000");
  const costCents = costToBrlCents(costMicro, "USD", rateMicro);
  assert.equal(costCents, 54_000n);
  assert.equal(formatCents(costCents!), "540.00");
  assert.equal(formatCents(subOrNull(100_000n, costCents)!), "460.00");
  assert.equal(formatMicro(costMicro), "100.000000");
  assert.equal(formatMicro(rateMicro), "5.400000");
});

test("T-FX-2 · meia unidade: 0.001000 USD × 5.000000 = 0,005 → 0.01 (metade sobe)", () => {
  const cents = costToBrlCents(toMicro(0.001), "USD", rateToMicro("5.000000"));
  assert.equal(cents, 1n);
  assert.equal(formatCents(cents!), "0.01");
});

test("T-FX-2b · simetria: resíduo −0.001000 × 5.000000 → −0.01 (metade para longe do zero, com sinal)", () => {
  const cents = costToBrlCents(toMicro(-0.001), "USD", rateToMicro("5.000000"));
  assert.equal(cents, -1n);
  assert.equal(formatCents(cents!), "-0.01");
  assert.equal(roundHalfAwayFromZero(-15n, 10n), -2n);
  assert.equal(roundHalfAwayFromZero(-14n, 10n), -1n);
  assert.equal(roundHalfAwayFromZero(15n, 10n), 2n);
});

test("F1 apoio · somas e subtração que falham fechado, formatos e leitura da taxa", () => {
  // `sumOrNull`: um `null` basta para o total ser `null` (P13); `sumIgnoringNull`: só para assinatura, `null` se todos.
  assert.equal(sumOrNull([1n, 2n, 3n]), 6n);
  assert.equal(sumOrNull([1n, null, 3n]), null);
  assert.equal(sumOrNull([]), 0n);
  assert.equal(sumIgnoringNull([1n, null, 3n]), 4n);
  assert.equal(sumIgnoringNull([null, null]), null);
  assert.equal(sumIgnoringNull([]), null);
  assert.equal(subOrNull(5n, 3n), 2n);
  assert.equal(subOrNull(null, 3n), null);
  assert.equal(subOrNull(5n, null), null);
  assert.equal(formatCents(0n), "0.00");
  assert.equal(formatCents(-5n), "-0.05");
  assert.equal(formatCents(123_456n), "1234.56");
  assert.equal(formatMicro(-1n), "-0.000001");
  assert.equal(MICRO, 1_000_000n);
  assert.equal(rateToMicro("5.4"), 5_400_000n);
  assert.equal(rateToMicro("12"), 12_000_000n);
  for (const invalid of ["", "abc", "1e3", "-1", "5.1234567", " 5.4", "5,4", "0", "0.000000"]) {
    assert.throws(() => rateToMicro(invalid), /rate_invalid/, invalid);
  }
  assert.throws(() => toMicro(Number.NaN), /cost_invalid/);
  assert.throws(() => toMicro(Number.POSITIVE_INFINITY), /cost_invalid/);
});

test("F1 apoio · guard de texto: nada de float no dinheiro da visão depois da entrada", () => {
  const source = readFileSync(path.join(REPO, "src/modules/subscription-billing/overview/overview-money.ts"), "utf8");
  // A única passagem por `Math.round` é a entrada do custo original (`toMicro`, o do motor de rateio).
  assert.equal(source.match(/Math\.round/g)?.length ?? 0, 1);
  assert.equal(/toFixed|parseFloat|Number\(/.test(source), false);
});
