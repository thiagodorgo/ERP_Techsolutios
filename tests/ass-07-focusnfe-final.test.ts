import assert from "node:assert/strict";
import test from "node:test";

import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import { InvoiceProviderError } from "../src/modules/subscription-billing/providers/invoice/invoice-errors.js";
import type { IssueInvoiceInput } from "../src/modules/subscription-billing/providers/invoice/invoice-provider.port.js";
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";

const TOKEN = "TOKEN-FOCUS-NAO-PODE-SAIR";

function focus(baseUrl: string) {
  return new FocusNfeInvoiceAdapter(
    new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${baseUrl}/v2` }),
    async (kind) => (kind === "api_token" ? TOKEN : null),
  );
}

function input(): IssueInvoiceInput {
  return {
    externalRef: "33333333-3333-4333-8333-333333333333:1",
    dpsNumber: 21,
    emitter: { cnpj: "DOCUMENTO-EMISSOR" },
    borrower: { document: "DOCUMENTO-TOMADOR", name: "Organização tomadora" },
    serviceDescription: "Descrição de serviço",
    amountCents: 10000,
    competenceDate: "2026-11-30",
    taxProfile: {
      regimeTributario: "lucro_presumido",
      codigoOpcaoSimplesNacional: "CAMPO-OPCAO-SIMPLES",
      regimeEspecialTributacao: "CAMPO-REGIME-ESPECIAL",
      tributacaoIss: "CAMPO-TRIBUTACAO-ISS",
      municipioIbge: "CAMPO-MUNICIPIO",
      cTribNac: "CAMPO-TRIB-NACIONAL",
      serieDps: 7,
    },
  };
}

test("T-NF-44 · PDF Focus é URL pública e não expõe credencial", async () => {
  const fake = await startFocusNfeFake("authorized");
  try {
    const adapter = focus(fake.baseUrl);
    await adapter.issue(input());
    const pdf = await adapter.getInvoicePdf(input().externalRef);
    assert.deepEqual(pdf, { source: "public_url", url: "https://documentos.invalid/publico/nfse-1001.pdf" });
    assert.ok(!JSON.stringify(pdf).includes(TOKEN));
    assert.equal(adapter.describe().pdfSource, "public_url");
  } finally {
    await fake.close();
  }
});

test("T-NF-49 · Focus sem tributacaoIss falha antes da rede e nomeia o campo", async () => {
  const fake = await startFocusNfeFake();
  try {
    const adapter = focus(fake.baseUrl);
    const incomplete = input();
    const taxProfile = { ...incomplete.taxProfile, tributacaoIss: undefined };
    await assert.rejects(
      () => adapter.issue({ ...incomplete, taxProfile }),
      (error: unknown) => error instanceof InvoiceProviderError && error.code === "fiscal_data_incomplete" && error.missing.includes("tributacaoIss"),
    );
    assert.equal(fake.recorded.length, 0);
  } finally {
    await fake.close();
  }
});

test("T-NF-50 · cancelamento envia justificativa e permanece assíncrono", async () => {
  const fake = await startFocusNfeFake();
  try {
    const adapter = focus(fake.baseUrl);
    assert.deepEqual(await adapter.cancel(input().externalRef, "Motivo operacional suficiente", "CAMPO-CODIGO"), { status: "processing" });
    const request = fake.recorded[0]!;
    assert.equal(request.method, "DELETE");
    assert.equal(request.path, "/v2/nfsen/33333333-3333-4333-8333-333333333333%3A1");
    assert.deepEqual(JSON.parse(request.body), { justificativa: "Motivo operacional suficiente" });
  } finally {
    await fake.close();
  }
});

test("T-NF-51 · erro_cancelamento em 200 permanece erro", async () => {
  const fake = await startFocusNfeFake("cancel_error_in_200");
  try {
    assert.deepEqual(await focus(fake.baseUrl).cancel(input().externalRef, "Motivo operacional suficiente"), { status: "error" });
  } finally {
    await fake.close();
  }
});
