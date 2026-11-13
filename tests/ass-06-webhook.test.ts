// B-ASS-06 · F5 — verifyWebhook (R-PAY-9) e reconsulta por referência (R-PAY-10). Sem rede no verify
// (o segredo vem do cofre via readSecret). Mutações do plano: segredo diferente do cofre → vermelho
// (verifyWebhook aceitaria); reconsulta sem devolver a cobrança criada → vermelho.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { AsaasPaymentAdapter, createAsaasAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/index.js";
import type { CreateChargeInput } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import { VaultSecret } from "../src/modules/subscription-billing/vault/vault-secret.js";
import { startAsaasFake } from "./helpers/fake-providers/asaas.js";

const API_TOKEN = "TOKEN-ASAAS-123";
const WEBHOOK_SECRET = "WEBHOOK-SECRET-123";
const CHARGE: CreateChargeInput = {
  customerId: "cus_0001",
  amountCents: 100,
  dueDate: "2026-11-20",
  externalReference: "statement-uuid",
  method: "pix",
};

function adapterWithSecret(server: { baseUrl: string }, webhookSecret: string | null = WEBHOOK_SECRET) {
  const client = new BillingHttpClient({
    provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v3`,
  });
  const adapter = new AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? API_TOKEN : webhookSecret));
  return adapter;
}

test("T-PAY-WH-1 · verifyWebhook aceita o token do cofre e extrai id/charge/referência/evento", async () => {
  const server = await startAsaasFake();
  try {
    const adapter = adapterWithSecret(server);
    const result = await adapter.verifyWebhook({
      headers: { "asaas-access-token": WEBHOOK_SECRET },
      rawBody: JSON.stringify({ id: "evt-1", event: "PAYMENT_CONFIRMED", payment: { id: "pay_0001", externalReference: "statement-uuid" } }),
      query: {},
    });
    assert.equal(result.ok, true);
    assert.equal(result.eventId, "evt-1");
    assert.equal(result.chargeId, "pay_0001");
    assert.equal(result.externalReference, "statement-uuid");
    assert.equal(result.kind, "PAYMENT_CONFIRMED");
  } finally {
    await server.close();
  }
});

test("T-PAY-WH-2 · token errado, ausente ou segredo ausente → ok:false", async () => {
  const server = await startAsaasFake();
  try {
    const adapter = adapterWithSecret(server);
    const body = JSON.stringify({ id: "evt-1", event: "PAYMENT_CONFIRMED", payment: { id: "pay_0001" } });
    assert.equal((await adapter.verifyWebhook({ headers: { "asaas-access-token": "OUTRO" }, rawBody: body, query: {} })).ok, false);
    assert.equal((await adapter.verifyWebhook({ headers: {}, rawBody: body, query: {} })).ok, false);
    assert.equal((await adapter.verifyWebhook({ headers: { "asaas-access-token": WEBHOOK_SECRET }, rawBody: "não-json", query: {} })).ok, false);
    const noSecret = adapterWithSecret(server, null);
    assert.equal((await noSecret.verifyWebhook({ headers: { "asaas-access-token": WEBHOOK_SECRET }, rawBody: body, query: {} })).ok, false);
  } finally {
    await server.close();
  }
});

test("T-PAY-WH-3 · reconsulta por referência acha a cobrança criada; sem cobrança → lista vazia (R-PAY-10)", async () => {
  const server = await startAsaasFake();
  try {
    const adapter = adapterWithSecret(server);
    await adapter.createCharge(CHARGE);
    const list = await adapter.listChargesByExternalReference("statement-uuid");
    assert.equal(list.length, 1);
    assert.equal(list[0].chargeId, "pay_0001");
    assert.deepEqual(await adapter.listChargesByExternalReference("outra"), []);
  } finally {
    await server.close();
  }
});

test("T-PAY-WH-4 · verifyWebhook compara em tempo constante (SHA-256 + timingSafeEqual) (A6)", () => {
  const text = readFileSync(join(process.cwd(), "src/modules/subscription-billing/providers/payment/asaas/asaas.adapter.ts"), "utf8");
  assert.match(text, /timingSafeEqual/);
  assert.match(text, /createHash\(["']sha256["']\)/);
});

test("T-PAY-WH-5 · registerWebhook usa o webhook_secret do COFRE, não o passado na chamada (A10)", async () => {
  const server = await startAsaasFake();
  try {
    const adapter = adapterWithSecret(server);
    await adapter.registerWebhook({
      url: "https://app.exemplo.com/webhooks/billing/asaas",
      secret: "DIFFERENT",
      events: ["PAYMENT_CONFIRMED"],
    });
    const body = JSON.parse(server.recorded[0]!.body) as { authToken?: string };
    assert.equal(body.authToken, WEBHOOK_SECRET, "authToken vem do cofre, não da chamada");
  } finally {
    await server.close();
  }
});

test("T-PAY-WH-6 · createAsaasAdapter lê o segredo no MESMO ambiente do cliente (A10)", async () => {
  const server = await startAsaasFake();
  try {
    const calls: Array<{ provider: string; environment: string; kind: string }> = [];
    const vault = {
      async readSecretForProvider(provider: string, environment: string, kind: string) {
        calls.push({ provider, environment, kind });
        if (kind === "api_token") return new VaultSecret(API_TOKEN);
        if (kind === "webhook_secret") return new VaultSecret(WEBHOOK_SECRET);
        return null;
      },
    };
    const client = new BillingHttpClient({
      provider: "asaas",
      environment: "sandbox",
      channelEnabled: true,
      allowLocalHosts: true,
      nodeEnv: "test",
      baseUrl: `${server.baseUrl}/v3`,
    });
    const adapter = createAsaasAdapter(client, vault as never);
    await adapter.createCharge(CHARGE);
    assert.ok(
      calls.some((c) => c.provider === "asaas" && c.environment === "sandbox" && c.kind === "api_token"),
      "lê api_token do MESMO ambiente do cliente (sandbox)",
    );
  } finally {
    await server.close();
  }
});
