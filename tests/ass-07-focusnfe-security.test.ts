import assert from "node:assert/strict";
import test from "node:test";

import { BillingHttpClient, type BillingHttpLogEntry } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { BillingChannelDisabledError, BillingHostNotAllowedError, ProviderNotConfiguredError, ProviderValidationError } from "../src/modules/subscription-billing/providers/http/billing-errors.js";
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import { createFocusNfeAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/index.js";
import type { IssueInvoiceInput } from "../src/modules/subscription-billing/providers/invoice/invoice-provider.port.js";
import { VaultSecret } from "../src/modules/subscription-billing/vault/vault-secret.js";
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";

const API_TOKEN = "SEGREDO-API-FOCUS";
const WEBHOOK_SECRET = "SEGREDO-WEBHOOK-FOCUS";
const CERTIFICATE = JSON.stringify({ pfxBase64: "CERTIFICADO-BASE64-FALSO", password: "SENHA-CERTIFICADO-FALSA" });

function issueInput(): IssueInvoiceInput {
  return {
    externalRef: "22222222-2222-4222-8222-222222222222:1",
    dpsNumber: 11,
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
      serieDps: 9,
    },
  };
}

function http(baseUrl: string, options: { channelEnabled?: boolean; allowLocalHosts?: boolean; nodeEnv?: "test" | "production"; log?: (entry: BillingHttpLogEntry) => void } = {}) {
  return new BillingHttpClient({
    provider: "focusnfe",
    environment: "sandbox",
    channelEnabled: options.channelEnabled ?? true,
    allowLocalHosts: options.allowLocalHosts ?? true,
    nodeEnv: options.nodeEnv ?? "test",
    baseUrl: `${baseUrl}/v2`,
    log: options.log,
  });
}

function secrets(kind: "api_token" | "webhook_secret" | "certificate"): Promise<string | null> {
  return Promise.resolve({ api_token: API_TOKEN, webhook_secret: WEBHOOK_SECRET, certificate: CERTIFICATE }[kind]);
}

test("T-NF-33 · canal desligado recusa antes da rede", async () => {
  const fake = await startFocusNfeFake();
  try {
    const focus = new FocusNfeInvoiceAdapter(http(fake.baseUrl, { channelEnabled: false }), secrets);
    await assert.rejects(() => focus.issue(issueInput()), (error: unknown) => error instanceof BillingChannelDisabledError);
    assert.equal(fake.recorded.length, 0);
  } finally {
    await fake.close();
  }
});

test("T-NF-34 · localhost exige flag e NODE_ENV=test", async () => {
  const fake = await startFocusNfeFake();
  try {
    for (const client of [http(fake.baseUrl, { allowLocalHosts: false }), http(fake.baseUrl, { nodeEnv: "production" })]) {
      const focus = new FocusNfeInvoiceAdapter(client, secrets);
      await assert.rejects(() => focus.issue(issueInput()), (error: unknown) => error instanceof BillingHostNotAllowedError);
    }
    assert.equal(fake.recorded.length, 0);
  } finally {
    await fake.close();
  }
});

test("T-NF-35 · token não sai em log nem em erro ecoado pelo provedor", async () => {
  const fake = await startFocusNfeFake("validation_422");
  try {
    const logs: BillingHttpLogEntry[] = [];
    const focus = new FocusNfeInvoiceAdapter(http(fake.baseUrl, { log: (entry) => logs.push(entry) }), secrets);
    await assert.rejects(
      () => focus.issue(issueInput()),
      (error: unknown) => error instanceof ProviderValidationError
        && !error.message.includes(API_TOKEN)
        && !error.message.includes(Buffer.from(`${API_TOKEN}:`).toString("base64"))
        && error.message.includes("[redacted]"),
    );
    assert.ok(!JSON.stringify(logs).includes(API_TOKEN));
    assert.deepEqual(Object.keys(logs[0]!).sort(), ["latencyMs", "op", "provider", "status"]);
  } finally {
    await fake.close();
  }
});

test("T-NF-36 · credencial ausente falha antes da rede", async () => {
  const fake = await startFocusNfeFake();
  try {
    const focus = new FocusNfeInvoiceAdapter(http(fake.baseUrl), async () => null);
    await assert.rejects(() => focus.issue(issueInput()), (error: unknown) => error instanceof ProviderNotConfiguredError);
    assert.equal(fake.recorded.length, 0);
  } finally {
    await fake.close();
  }
});

test("T-NF-41 · emissor e webhook usam somente os três segredos lidos do cofre", async () => {
  const fake = await startFocusNfeFake();
  const reads: string[] = [];
  try {
    const vault = {
      async readSecretForProvider(provider: string, environment: string, kind: "api_token" | "webhook_secret" | "certificate") {
        reads.push(`${provider}:${environment}:${kind}`);
        const value = await secrets(kind);
        return value ? new VaultSecret(value) : null;
      },
    };
    const focus = createFocusNfeAdapter(http(fake.baseUrl), vault as never);
    assert.deepEqual(await focus.registerEmitter({ cnpj: "DOCUMENTO-EMISSOR", regimeTributario: "campo-regime" }), { externalId: "empresa_1" });
    assert.deepEqual(await focus.registerWebhook({ url: "https://callbacks.invalid/webhooks/billing/focusnfe" }), { externalId: "hook_2" });

    const emitterBody = JSON.parse(fake.recorded[0]!.body) as Record<string, unknown>;
    const hookBody = JSON.parse(fake.recorded[1]!.body) as Record<string, unknown>;
    assert.equal(emitterBody.certificado, "CERTIFICADO-BASE64-FALSO");
    assert.equal(emitterBody.senha_certificado, "SENHA-CERTIFICADO-FALSA");
    assert.equal(hookBody.authorization, WEBHOOK_SECRET);
    assert.equal(hookBody.authorization_header, "X-Webhook-Token");
    assert.deepEqual(new Set(reads), new Set(["focusnfe:sandbox:certificate", "focusnfe:sandbox:api_token", "focusnfe:sandbox:webhook_secret"]));
  } finally {
    await fake.close();
  }
});

test("T-NF-41b · webhook Focus compara o segredo e extrai apenas allowlist", async () => {
  const focus = new FocusNfeInvoiceAdapter(http("http://127.0.0.1:1"), secrets);
  const rawBody = JSON.stringify({ id: "evt_1", ref: "statement:1", status: "autorizado", token: API_TOKEN });
  assert.deepEqual(await focus.verifyWebhook({ headers: { "x-webhook-token": WEBHOOK_SECRET }, rawBody }), {
    ok: true,
    eventId: "evt_1",
    externalRef: "statement:1",
    kind: "autorizado",
  });
  assert.deepEqual(await focus.verifyWebhook({ headers: { "x-webhook-token": "incorreto" }, rawBody }), { ok: false });
});
