import assert from "node:assert/strict";
import test from "node:test";

import { InvoiceProviderError } from "../src/modules/subscription-billing/providers/invoice/invoice-errors.js";
import { ibsCbsPayloadFor } from "../src/modules/subscription-billing/providers/tax/ibs-cbs.rules.js";
import { validateTaxProfileBeforeNetwork } from "../src/modules/subscription-billing/providers/tax/nfse-route.rules.js";

const COMPLETE_IBS_CBS = {
  cst: "campo-cst",
  cClassTrib: "campo-classificacao",
  indicadorDestinatario: "campo-destinatario",
  finalidadeEmissao: "campo-finalidade",
} as const;

test("T-NF-22 · não-Simples em 2026-11-30 omite IBS/CBS", () => {
  assert.equal(ibsCbsPayloadFor({ competenceDate: "2026-11-30", regimeTributario: "lucro_presumido", ibsCbs: COMPLETE_IBS_CBS }), undefined);
});

test("T-NF-23 · não-Simples em 2026-12-01 envia os campos configurados", () => {
  assert.deepEqual(ibsCbsPayloadFor({ competenceDate: "2026-12-01", regimeTributario: "lucro_presumido", ibsCbs: COMPLETE_IBS_CBS }), COMPLETE_IBS_CBS);
});

test("T-NF-24 · Simples em 2026-12-31 omite IBS/CBS", () => {
  assert.equal(ibsCbsPayloadFor({ competenceDate: "2026-12-31", regimeTributario: "simples_nacional", ibsCbs: COMPLETE_IBS_CBS }), undefined);
});

test("T-NF-25 · Simples em 2027-01-01 envia os campos configurados", () => {
  assert.deepEqual(ibsCbsPayloadFor({ competenceDate: "2027-01-01", regimeTributario: "simples_nacional", ibsCbs: COMPLETE_IBS_CBS }), COMPLETE_IBS_CBS);
});

test("T-NF-26 · grupo IBS/CBS obrigatório incompleto falha com os campos ausentes", () => {
  assert.throws(
    () => ibsCbsPayloadFor({ competenceDate: "2026-12-01", regimeTributario: "lucro_real", ibsCbs: { cst: "campo-cst" } }),
    (error: unknown) => error instanceof InvoiceProviderError && error.code === "ibs_cbs_incomplete" && error.missing.join(",") === "cClassTrib,indicadorDestinatario,finalidadeEmissao",
  );
});

test("T-NF-27 · Simples em rota municipal após 2026-11-01 falha fechado", () => {
  assert.throws(
    () => validateTaxProfileBeforeNetwork({ regimeTributario: "simples_nacional", nfseRoute: "municipal" }, "2026-11-01"),
    (error: unknown) => error instanceof InvoiceProviderError && error.code === "municipal_route_not_allowed_for_simples",
  );
});

test("T-NF-37 · regime ausente falha antes de qualquer rede", () => {
  assert.throws(
    () => validateTaxProfileBeforeNetwork({ nfseRoute: "nacional" }, "2026-12-01"),
    (error: unknown) => error instanceof InvoiceProviderError && error.code === "fiscal_data_incomplete" && error.missing[0] === "regimeTributario",
  );
});
