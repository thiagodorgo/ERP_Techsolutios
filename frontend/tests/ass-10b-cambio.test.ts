import assert from "node:assert/strict";
import test from "node:test";

import { parseRatePtBr, sameRate } from "../src/modules/platform/cloud-billing/cloud-billing.money";

// B-ASS-10b (T5) · R-FX (plano v2 §6.4.1) — a taxa do dólar digitada em pt-BR. O servidor aceita
// /^\d{1,3}(\.\d{1,6})?$/ e ACEITA "541": tirar a vírgula multiplicaria por 100 todo o custo em reais do mês.

test("T-FX-1 a taxa em pt-BR vira a string do servidor: o separador é trocado, nunca retirado", () => {
  assert.deepEqual(parseRatePtBr("5,41"), { ok: true, rate: "5.41" });
  assert.deepEqual(parseRatePtBr("5.41"), { ok: true, rate: "5.41" });
  assert.deepEqual(parseRatePtBr(" 5,412300 "), { ok: true, rate: "5.412300" });
  assert.deepEqual(parseRatePtBr("541"), { ok: true, rate: "541" });
  for (const bad of ["", "5,", ",5", "5,4,1", "1.234,56", "5,1234567", "1000", "-5,41", "+5,41", "5e2", "5 ,41", "5,41 BRL", "R$ 5,41", "abc"]) {
    assert.deepEqual(parseRatePtBr(bad), { ok: false, reason: "formato" }, bad);
  }
  for (const zero of ["0", "0,0", "000.000000"]) assert.deepEqual(parseRatePtBr(zero), { ok: false, reason: "zero" }, zero);
  // propriedade: o que sai sempre casa com o padrão do servidor, e nenhum dígito muda de casa
  for (const text of ["5,41", "0,5", "12,000001", "999,999999", "7"]) {
    const parsed = parseRatePtBr(text);
    assert.ok(parsed.ok && /^\d{1,3}(\.\d{1,6})?$/.test(parsed.rate), text);
    assert.equal(parsed.ok && parsed.rate.replace(".", ","), text);
  }
});

test("T-FX-3 a pós-condição compara a taxa enviada com a gravada, por texto", () => {
  assert.equal(sameRate("5.41", "5.410000"), true);
  assert.equal(sameRate("5.41", "541.000000"), false);
  assert.equal(sameRate("05.4", "5.400000"), true);
  assert.equal(sameRate("5.412300", "5.4123"), true);
  assert.equal(sameRate("5.41", "5.410001"), false);
});
