import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { CHARGE_KINDS } from "../src/modules/charging/charge.types.js";
import { centsToMoney, moneyToCents } from "../src/modules/charging/charge.validators.js";
import { InMemoryImpoundPaymentRepository } from "../src/modules/impound-payments/impound-payment.repository.js";
import { ImpoundPaymentService } from "../src/modules/impound-payments/impound-payment.service.js";
import {
  PAYABLE_CHARGE_KINDS,
  PAYMENT_METHODS,
  type ImpoundPaymentActorContext,
  type IntentAccount,
} from "../src/modules/impound-payments/impound-payment.types.js";
import {
  assertIntentMoney,
  maskPayerDocument,
  parseCreateIntentBody,
  parsePayerDocument,
  parsePayerName,
} from "../src/modules/impound-payments/impound-payment.validators.js";

// B-PATIO-REC-01 F1 — validadores, invariantes de dinheiro na app, P-REC-3 e P-REC-22b. Ambiente [SB].

const VALID_CPF = "529.982.247-25";
const VALID_CNPJ = "11.222.333/0001-81";

function reason(expected: string) {
  return (error: unknown) => (error as { reason?: string }).reason === expected;
}

test("T-DOM-1 · pagador: CPF e CNPJ com dígito verificador; nome de 3 a 120 caracteres", () => {
  assert.equal(parsePayerDocument(VALID_CPF), "52998224725");
  assert.equal(parsePayerDocument(VALID_CNPJ), "11222333000181");
  for (const bad of ["529.982.247-24", "111.111.111-11", "11.222.333/0001-80", "123", "", undefined, 52998224725]) {
    assert.throws(() => parsePayerDocument(bad), reason("payer_document_invalid"), `aceitou ${String(bad)}`);
  }
  assert.equal(parsePayerName("  Maria   da  Silva "), "Maria da Silva");
  assert.throws(() => parsePayerName("Al"), reason("payer_name_invalid"));
  assert.throws(() => parsePayerName("x".repeat(121)), reason("payer_name_invalid"));
});

test("T-DOM-2 · Q5: o documento do pagador sai mascarado, só os 2 últimos dígitos", () => {
  assert.equal(maskPayerDocument("52998224725"), "***.***.***-25");
  assert.equal(maskPayerDocument("11222333000181"), "**.***.***/****-81");
  assert.doesNotMatch(maskPayerDocument("52998224725"), /529|982|247/);
});

test("T-DOM-3 · P-REC-1: sem meios, os três; subconjunto válido; boleto e desconhecido recusados; campo desconhecido → 400", () => {
  assert.deepEqual(parseCreateIntentBody({ payerName: "Maria", payerDocument: VALID_CPF }).methods, PAYMENT_METHODS);
  assert.deepEqual(parseCreateIntentBody({ payerName: "Maria", payerDocument: VALID_CPF, methods: ["debit_card", "pix"] }).methods, ["pix", "debit_card"]);
  for (const methods of [["boleto"], [], ["pix", "cash"], "pix"]) {
    assert.throws(() => parseCreateIntentBody({ payerName: "Maria", payerDocument: VALID_CPF, methods }), reason("methods_invalid"));
  }
  for (const extra of ["tenantId", "amountCents", "split", "connectionId"]) {
    assert.throws(
      () => parseCreateIntentBody({ payerName: "Maria", payerDocument: VALID_CPF, [extra]: "x" }),
      (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 400 && (error as { reason?: string }).reason === "unknown_field",
      `aceitou o campo ${extra}`,
    );
  }
});

test("T-DOM-4 · §4.1: o espelho dos CHECKs na app (identidade, motivo do retido, dinheiro por estado)", () => {
  const base = { amountCents: 35_000, paidCents: 0, appliedCents: 0, heldCents: 0, refundedCents: 0 };
  assertIntentMoney({ ...base, status: "pending" });
  assertIntentMoney({ ...base, status: "settled", paidCents: 36_000, appliedCents: 35_000, heldCents: 1_000, heldReason: "overpayment" });
  assertIntentMoney({ ...base, status: "funds_held", paidCents: 20_000, heldCents: 20_000, heldReason: "amount_short" });
  assertIntentMoney({ ...base, status: "reversed", paidCents: 35_000, refundedCents: 35_000 });
  assert.throws(() => assertIntentMoney({ ...base, status: "funds_held", paidCents: 20_000, heldCents: 10_000, heldReason: "amount_short" }), reason("money_identity_broken"));
  assert.throws(() => assertIntentMoney({ ...base, status: "funds_held", paidCents: 20_000, heldCents: 20_000 }), reason("held_reason_mismatch"));
  assert.throws(() => assertIntentMoney({ ...base, status: "pending", paidCents: 1_000, heldCents: 1_000, heldReason: "overpayment" }), reason("state_money_mismatch"));
  assert.throws(() => assertIntentMoney({ ...base, status: "settled", paidCents: 36_000, appliedCents: 35_000, heldCents: 1_000, heldReason: "amount_short" }), reason("state_money_mismatch"));
  assert.throws(() => assertIntentMoney({ ...base, status: "reversed" }), reason("state_money_mismatch"));
  assert.throws(() => assertIntentMoney({ ...base, status: "pending", amountCents: 0 }), reason("money_not_cents"));
  assert.throws(() => assertIntentMoney({ ...base, status: "pending", paidCents: 0.5 }), reason("money_not_cents"));
});

test("T-DOM-5 · emenda §11.1: a conversão Decimal(12,2) em reais ↔ centavos inteiros (a do charging, usada no repositório) é exata", () => {
  assert.equal(moneyToCents("350.00"), 35_000);
  assert.equal(moneyToCents("123.45"), 12_345);
  assert.equal(moneyToCents("0.10"), 10);
  assert.equal(centsToMoney(35_001), "350.01");
  assert.equal(centsToMoney(5), "0.05");
  for (let cents = 0; cents <= 200_000; cents += 7) {
    assert.equal(moneyToCents(centsToMoney(cents)), cents);
  }
});

test("T-DOM-6 · P-REC-3: só a taxa de pátio é cobrável on-line (remoção, diária, avulso); nada do órgão", () => {
  assert.deepEqual([...PAYABLE_CHARGE_KINDS], ["REMOVAL", "DAILY", "ADDITIONAL"]);
  for (const kind of PAYABLE_CHARGE_KINDS) {
    assert.ok((CHARGE_KINDS as readonly string[]).includes(kind), `${kind} não é encargo do ledger do charging`);
  }
  assert.ok(!(PAYABLE_CHARGE_KINDS as readonly string[]).includes("ADJUSTMENT"));
  assert.ok(!PAYABLE_CHARGE_KINDS.some((kind) => /AGENCY|FINE|MULTA|ORGAO|AUTHORITY/i.test(kind)), "multa ou taxa do órgão entrou no cobrável");
});

test("T-DOM-27 · P-REC-22b: porta que devolve a conta da PLATAFORMA → 422 account_not_allowed, 0 intenção e 0 linha de fila", async () => {
  const tenantId = randomUUID();
  const processId = randomUUID();
  const repository = new InMemoryImpoundPaymentRepository({
    processState: async () => ({ processStatus: "RELEASE_IN_PROGRESS", activeReleaseKind: "STANDARD" }),
    settleableDue: async () => ({ dueCents: 35_000, overAccruedUnreconciled: false, currency: "BRL" }),
  });
  const platformPort = {
    resolve: async () => ({
      ok: true as const,
      account: { scope: "platform" } as unknown as IntentAccount,
      provider: "asaas",
      methods: PAYMENT_METHODS,
    }),
  };
  const service = new ImpoundPaymentService(repository, platformPort, { isEnabled: async () => true });
  const actor: ImpoundPaymentActorContext = { tenantId, userId: randomUUID(), roles: ["manager"], permissions: [] };

  let outcome: string;
  try {
    const intent = await service.create(actor, processId, { payerName: "Maria", payerDocument: VALID_CPF });
    outcome = `created ${intent.status}`;
  } catch (error) {
    outcome = (error as { reason?: string }).reason ?? String(error);
  }
  assert.equal(outcome, "account_not_allowed", `expected account_not_allowed, got ${outcome}`);
  assert.equal(repository.allIntentsForTests().length, 0, "intenção gravada na conta da plataforma");
  assert.equal(repository.outboxForTests().length, 0, "linha de fila gravada para a conta da plataforma");
  assert.equal(repository.allRefsForTests().length, 0);
});
