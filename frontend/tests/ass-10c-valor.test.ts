import assert from "node:assert/strict";
import test from "node:test";

import { formatBRL, hasValue, typedAmountToDecimal, asMoney } from "../src/modules/platform/billing-operations/billing-ops.money";

// B-ASS-10c-OPERACAO · R-VALOR — o valor DIGITADO na baixa manual vira EXATAMENTE o texto decimal que o servidor grava, só
// por texto (nunca `Number`/`parseFloat`); o que é ambíguo, negativo, zero ou lixo vira erro no campo. Mutações do plano:
// M1 (milhar), M2 (vírgula), M3 (sinal), M4 (3 casas).

const value = (raw: string) => {
  const result = typedAmountToDecimal(raw);
  return result.ok ? result.value : `ERRO: ${result.message}`;
};

test("T-VAL-1 milhar com ponto e centavos com vírgula: '1.234,56' → '1234.56' (e milhões)", () => {
  assert.equal(value("1.234,56"), "1234.56");
  assert.equal(value("12.345.678,9"), "12345678.90");
  assert.equal(value(" 1.020,00 "), "1020.00");
});

test("T-VAL-2 vírgula decimal sem milhar: '1234,56' → '1234.56', '7,5' → '7.50'", () => {
  assert.equal(value("1234,56"), "1234.56");
  assert.equal(value("7,5"), "7.50");
  assert.equal(value("0,01"), "0.01");
});

test("T-VAL-3 negativo nunca passa: '-1,00', '-1234.56' e '-0,50' são erro", () => {
  for (const raw of ["-1,00", "-1234.56", "-0,50", "-1.234,56"]) assert.match(value(raw), /^ERRO/, raw);
  assert.match(value("-1,00"), /negativo/);
});

test("T-VAL-4 mais de 2 casas é ambíguo: '1,234', '1.234' sem centavos com 3 casas e '10,999' são erro", () => {
  for (const raw of ["1,234", "10,999", "1234,567", "1.2345"]) assert.match(value(raw), /^ERRO/, raw);
  assert.match(value("1,234"), /ambíguo/);
});

test("T-VAL-5 ponto decimal e inteiro também valem: '1234.56', '1234', '0012,30'", () => {
  assert.equal(value("1234.56"), "1234.56");
  assert.equal(value("1234"), "1234.00");
  assert.equal(value("0012,30"), "12.30");
});

test("T-VAL-6 zero, vazio, letras e formatos tortos são erro no campo", () => {
  for (const raw of ["", "   ", "0", "0,00", "0.0", "abc", "R$ 10,00", "1,2,3", "1.23,45", "12.34,56"]) assert.match(value(raw), /^ERRO/, JSON.stringify(raw));
  assert.match(value("0,00"), /maior que zero/);
  assert.match(value(""), /Digite/);
});

test("T-VAL-7 a formatação é só texto: o decimal do servidor vira reais sem passar por número", () => {
  assert.equal(formatBRL(asMoney("1234.56")), "R$ 1.234,56");
  assert.equal(formatBRL(asMoney("1890.00")), "R$ 1.890,00");
  assert.equal(formatBRL(asMoney("0.5")), "R$ 0,50");
  assert.equal(formatBRL(asMoney("-100.00")), "−R$ 100,00");
  assert.equal(formatBRL(asMoney("12345678901234567.89")), "R$ 12.345.678.901.234.567,89", "sem perda de precisão de número");
  assert.equal(formatBRL(asMoney(1234.56)), "—", "número não é dinheiro");
  assert.equal(formatBRL(null), "—");
  assert.equal(hasValue(asMoney("0.00")), false);
  assert.equal(hasValue(asMoney("0.01")), true);
  assert.equal(hasValue(null), false);
});
