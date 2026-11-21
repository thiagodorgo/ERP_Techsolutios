// B-ASS-08c3 · F-A1 — `testConnection()` dos dois adaptadores contra os falsos (nenhuma chamada a host real).
// O resultado nunca carrega corpo nem texto do provedor; sem token no cofre → `not_configured` com 0 rede.

import assert from "node:assert/strict";
import test from "node:test";

import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/index.js";
import { lookupFromFocus } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import { AsaasPaymentAdapter, type AsaasSecretReader } from "../src/modules/subscription-billing/providers/payment/asaas/index.js";
import type { FocusNfeSecretReader } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import { startAsaasFake } from "./helpers/fake-providers/asaas.js";
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";

const API_TOKEN = "TOKEN-ASAAS-123";

function asaasSecrets(apiToken: string | null): AsaasSecretReader {
  return async (kind) => (kind === "api_token" ? apiToken : "SECRET");
}

function focusSecrets(apiToken: string | null): FocusNfeSecretReader {
  return async (kind) => (kind === "api_token" ? apiToken : kind === "webhook_secret" ? "SECRET" : "PFX");
}

test("TCA1 · Asaas testConnection: 200 → ok; 401/403 → credential_rejected; 429 → rate_limited; 500 → provider_unavailable; sem token → not_configured e 0 rede", async () => {
  const cases: readonly [string, { ok: boolean; code?: string }][] = [
    ["ok", { ok: true }],
    ["credential_rejected_401", { ok: false, code: "credential_rejected" }],
    ["credential_rejected_403", { ok: false, code: "credential_rejected" }],
    ["rate_limited_429", { ok: false, code: "rate_limited" }],
    ["provider_unavailable_500", { ok: false, code: "provider_unavailable" }],
  ];
  for (const [scenario, expected] of cases) {
    const server = await startAsaasFake(scenario);
    try {
      const client = new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v3` });
      const adapter = new AsaasPaymentAdapter(client, asaasSecrets(API_TOKEN));
      assert.deepEqual(await adapter.testConnection(), expected, `cenário ${scenario}`);
      assert.equal(server.recorded.length, 1, `cenário ${scenario}: 1 GET`);
      assert.equal(server.recorded[0]!.method, "GET");
      assert.match(server.recorded[0]!.path, /^\/v3\/payments\?externalReference=/);
    } finally {
      await server.close();
    }
  }

  const server = await startAsaasFake("ok");
  try {
    const client = new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v3` });
    const adapter = new AsaasPaymentAdapter(client, asaasSecrets(null));
    assert.deepEqual(await adapter.testConnection(), { ok: false, code: "not_configured" });
    assert.equal(server.recorded.length, 0, "sem token no cofre: 0 pedido");
  } finally {
    await server.close();
  }
});

test("TCF1 · Focus testConnection: 404 e 200 → ok; 401/403 → credential_rejected; 500 → provider_unavailable; sem token → not_configured e 0 rede", async () => {
  const cases: readonly [string, { ok: boolean; code?: string }][] = [
    ["not_found_404", { ok: true }],
    ["ok", { ok: true }],
    ["credential_rejected_401", { ok: false, code: "credential_rejected" }],
    ["credential_rejected_403", { ok: false, code: "credential_rejected" }],
    ["provider_unavailable_500", { ok: false, code: "provider_unavailable" }],
  ];
  for (const [scenario, expected] of cases) {
    const server = await startFocusNfeFake(scenario);
    try {
      const client = new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v2` });
      const adapter = new FocusNfeInvoiceAdapter(client, focusSecrets(API_TOKEN));
      assert.deepEqual(await adapter.testConnection(), expected, `cenário ${scenario}`);
      assert.equal(server.recorded.length, 1, `cenário ${scenario}: 1 GET`);
      assert.equal(server.recorded[0]!.method, "GET");
      assert.match(server.recorded[0]!.path, /^\/v2\/nfsen\//);
    } finally {
      await server.close();
    }
  }

  const server = await startFocusNfeFake("ok");
  try {
    const client = new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v2` });
    const adapter = new FocusNfeInvoiceAdapter(client, focusSecrets(null));
    assert.deepEqual(await adapter.testConnection(), { ok: false, code: "not_configured" });
    assert.equal(server.recorded.length, 0, "sem token no cofre: 0 pedido");
  } finally {
    await server.close();
  }
});

test("LK1 · lookupFromFocus: id no corpo → providerInvoiceId; sem id ou vazio → undefined (os 5 estados)", () => {
  const states: ReadonlyArray<{ readonly body: Record<string, unknown>; readonly status: string }> = [
    { body: { status: "processando_autorizacao" }, status: "processing" },
    { body: { status: "processando_cancelamento" }, status: "processing" },
    { body: { status: "autorizado", numero: "NF", codigo_verificacao: "V", url_danfse: "P", url_xml: "X" }, status: "authorized" },
    { body: { status: "erro_autorizacao", erros: [{ mensagem: "m" }] }, status: "rejected" },
    { body: { status: "cancelado" }, status: "cancelled" },
  ];
  for (const state of states) {
    assert.equal(lookupFromFocus({ ...state.body, id: "nfse_x" } as never).status, state.status);
    assert.equal(lookupFromFocus({ ...state.body, id: "nfse_x" } as never).providerInvoiceId, "nfse_x", `${state.status} com id`);
    assert.equal(lookupFromFocus({ ...state.body } as never).providerInvoiceId, undefined, `${state.status} sem id`);
    assert.equal(lookupFromFocus({ ...state.body, id: "" } as never).providerInvoiceId, undefined, `${state.status} com id vazio`);
    assert.equal(lookupFromFocus({ ...state.body, id: "   " } as never).providerInvoiceId, undefined, `${state.status} com id só espaços`);
  }
  assert.equal(lookupFromFocus({ status: "situacao_desconhecida", id: "nfse_x" } as never).providerInvoiceId, "nfse_x");
  assert.equal(lookupFromFocus({ status: "situacao_desconhecida" } as never).providerInvoiceId, undefined);
  assert.equal(lookupFromFocus({ status: "situacao_desconhecida", id: "" } as never).providerInvoiceId, undefined);
});

// Conserto único do #608 (fix-608b-cl), A-01 (plano §4.2, "nunca lança"): a falha de transporte dos DOIS adaptadores
// (conexão recusada numa porta sem servidor) vira `{ ok: false, code: "provider_unavailable" }`, sem lançar e sem texto do erro.
test("TC-TRANSP (A-01) · Asaas e Focus: conexão recusada → provider_unavailable, sem lançar", async () => {
  const asaas = new AsaasPaymentAdapter(
    new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: "http://127.0.0.1:1/v3" }),
    asaasSecrets(API_TOKEN),
  );
  assert.deepEqual(await asaas.testConnection(), { ok: false, code: "provider_unavailable" });
  const focus = new FocusNfeInvoiceAdapter(
    new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: "http://127.0.0.1:1/v2" }),
    focusSecrets(API_TOKEN),
  );
  assert.deepEqual(await focus.testConnection(), { ok: false, code: "provider_unavailable" });
  // O canal desligado NÃO é transporte: continua lançando antes da rede (a rota já recusa antes, com 422 channel_disabled).
  const off = new AsaasPaymentAdapter(
    new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: false, allowLocalHosts: true, nodeEnv: "test", baseUrl: "http://127.0.0.1:1/v3" }),
    asaasSecrets(API_TOKEN),
  );
  await assert.rejects(() => off.testConnection(), (error: Error) => error.name === "BillingChannelDisabledError" || /channel/i.test(error.message));
});
