import assert from "node:assert/strict";
import test from "node:test";

import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { InvoiceProviderError } from "../src/modules/subscription-billing/providers/invoice/invoice-errors.js";
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import type { IssueInvoiceInput } from "../src/modules/subscription-billing/providers/invoice/invoice-provider.port.js";
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";

const TOKEN = "token-falso-focus";

function input(ref = "11111111-1111-4111-8111-111111111111:1", dpsNumber = 1): IssueInvoiceInput {
  return {
    externalRef: ref,
    dpsNumber,
    emitter: { cnpj: "DOCUMENTO-EMISSOR" },
    borrower: { document: "DOCUMENTO-TOMADOR", name: "Organização tomadora", municipalityCode: "CAMPO-MUNICIPIO-TOMADOR" },
    serviceDescription: "Descrição de serviço",
    amountCents: 12990,
    competenceDate: "2026-11-30",
    taxProfile: {
      nfseRoute: "nacional",
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

function adapter(baseUrl: string, secrets: Partial<Record<"api_token" | "webhook_secret" | "certificate", string>> = { api_token: TOKEN }) {
  const client = new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${baseUrl}/v2` });
  return new FocusNfeInvoiceAdapter(client, async (kind) => secrets[kind] ?? null);
}

test("T-NF-1/T-NF-2 · Focus emite NFS-e Nacional com Basic em header e corpo fiscal", async () => {
  const fake = await startFocusNfeFake();
  try {
    const result = await adapter(fake.baseUrl).issue(input());
    assert.deepEqual(result, { providerInvoiceId: "nfse_1", status: "processing" });
    const request = fake.recorded[0]!;
    assert.equal(request.method, "POST");
    assert.equal(request.path, "/v2/nfsen?ref=11111111-1111-4111-8111-111111111111%3A1");
    assert.equal(request.headers.authorization, `Basic ${Buffer.from(`${TOKEN}:`).toString("base64")}`);
    assert.ok(!request.path.includes(TOKEN));
    const body = JSON.parse(request.body) as Record<string, unknown>;
    assert.equal(body.numero_dps, 1);
    assert.equal(body.valor_servico, 129.9);
    assert.equal(body.cnpj_prestador, "DOCUMENTO-EMISSOR");
    assert.equal(body.ibs_cbs, undefined);
  } finally {
    await fake.close();
  }
});

test("T-NF-3/T-NF-19 · emissão permanece processing e consulta evolui para authorized", async () => {
  const fake = await startFocusNfeFake();
  try {
    const focus = adapter(fake.baseUrl);
    await focus.issue(input());
    assert.deepEqual(await focus.getInvoice(input().externalRef), { status: "processing" });
    assert.deepEqual(await focus.getInvoice(input().externalRef), {
      status: "authorized",
      number: "NFSE-1001",
      verificationCode: "VERIFY-1001",
      pdfUrl: "https://documentos.invalid/publico/nfse-1001.pdf",
      xmlUrl: "https://documentos.invalid/publico/nfse-1001.xml",
    });
  } finally {
    await fake.close();
  }
});

test("T-NF-4 · situação desconhecida é unknown e não final", async () => {
  const fake = await startFocusNfeFake();
  try {
    assert.deepEqual(await adapter(fake.baseUrl).getInvoice("ref-desconhecida:1"), { status: "unknown" });
  } finally {
    await fake.close();
  }
});

test("T-NF-5/T-NF-28 · mesma referência é mapeada para already_issued com id existente", async () => {
  const fake = await startFocusNfeFake();
  try {
    const focus = adapter(fake.baseUrl);
    await focus.issue(input());
    await assert.rejects(
      () => focus.issue(input()),
      (error: unknown) => error instanceof InvoiceProviderError && error.code === "already_issued" && error.existingId === "nfse_1",
    );
  } finally {
    await fake.close();
  }
});

test("T-NF-6/T-NF-31 · erro de cancelamento em HTTP 200 vira status error", async () => {
  const fake = await startFocusNfeFake("cancel_error_in_200");
  try {
    assert.deepEqual(await adapter(fake.baseUrl).cancel("ref-cancelamento:1", "Motivo operacional suficiente"), { status: "error" });
  } finally {
    await fake.close();
  }
});
