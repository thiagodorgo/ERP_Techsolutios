// B-ASS-06 · F5 — erros e limites do adaptador Asaas (plano §4.6, R-PAY-3 e R-PAY-7). Tudo contra o falso.
// Mutações do plano: 400 sem sanitizar (ecoar token) → vermelho; 429 sem ler Retry-After → vermelho;
// timeout com repetição automática → vermelho (recorded[] > 1).

import assert from "node:assert/strict";
import test from "node:test";

import { ProviderRateLimitedError, ProviderTimeoutError, ProviderValidationError } from "../src/modules/subscription-billing/providers/http/billing-errors.js";
import { BillingHttpClient, type BillingHttpLogEntry } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { AsaasPaymentAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/index.js";
import type { CreateChargeInput } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import { startAsaasFake } from "./helpers/fake-providers/asaas.js";

const TOKEN = "TOKEN-ASAAS-123";
const CHARGE: CreateChargeInput = {
  customerId: "cus_0001",
  amountCents: 2999,
  dueDate: "2026-11-20",
  externalReference: "stmt-1",
  method: "credit_card",
};

async function adapterWith(server: { baseUrl: string }, options: Partial<ConstructorParameters<typeof BillingHttpClient>[0]> = {}) {
  const client = new BillingHttpClient({
    provider: "asaas",
    environment: "sandbox",
    channelEnabled: true,
    allowLocalHosts: true,
    nodeEnv: "test",
    baseUrl: `${server.baseUrl}/v3`,
    ...options,
  });
  const adapter = new AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? TOKEN : "WEBHOOK"));
  return { adapter, client };
}

test("T-PAY-ERR-1 · 400 → ProviderValidationError com mensagem sanitizada, sem eco do token", async () => {
  const server = await startAsaasFake("validation_400");
  try {
    const logs: BillingHttpLogEntry[] = [];
    const { adapter } = await adapterWith(server, { log: (entry) => logs.push(entry) });
    await assert.rejects(
      adapter.createCharge(CHARGE),
      (error: unknown) => {
        assert.ok(error instanceof ProviderValidationError);
        assert.ok(!String((error as Error).message).includes(TOKEN), "a mensagem não ecoa o token");
        return true;
      },
    );
    assert.ok(logs.every((entry) => !JSON.stringify(entry).includes(TOKEN)), "log sem segredo");
  } finally {
    await server.close();
  }
});

test("T-PAY-ERR-2 · 429 → retryAfterMs lido de Retry-After (2000 ms)", async () => {
  const server = await startAsaasFake("rate_limited_429");
  try {
    const { adapter } = await adapterWith(server);
    await assert.rejects(
      adapter.createCharge(CHARGE),
      (error: unknown) => error instanceof ProviderRateLimitedError && error.retryAfterMs === 2000,
    );
  } finally {
    await server.close();
  }
});

test("T-PAY-ERR-3 · timeout → ProviderTimeoutError SEM repetição automática", async () => {
  const server = await startAsaasFake("timeout");
  try {
    const { adapter } = await adapterWith(server, { timeoutMs: 150, cardTimeoutMs: 150 });
    await assert.rejects(
      adapter.createCharge(CHARGE),
      (error: unknown) => error instanceof ProviderTimeoutError,
    );
    assert.equal(server.recorded.length, 1, "uma única tentativa: nada de repetição automática");
  } finally {
    await server.close();
  }
});

test("T-PAY-ERR-4 · credencial ausente → provider_not_configured, antes de tocar a rede", async () => {
  const server = await startAsaasFake();
  try {
    const client = new BillingHttpClient({
      provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v3`,
    });
    const adapter = new AsaasPaymentAdapter(client, async () => null);
    await assert.rejects(
      adapter.createCharge(CHARGE),
      (error: unknown) => (error as { code?: string }).code === "provider_not_configured",
    );
    assert.equal(server.recorded.length, 0, "sem credencial não há fetch");
  } finally {
    await server.close();
  }
});
