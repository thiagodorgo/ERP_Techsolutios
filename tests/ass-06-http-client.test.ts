// B-ASS-06 · F1 — cliente HTTP único (plano §4.6, R-PAY-4 e R-PAY-5). Tudo contra servidor falso em
// 127.0.0.1:0; nenhuma chamada a host real. Mutações do plano: checar o canal DEPOIS do fetch → vermelho;
// base URL fora do catálogo sem recusa → vermelho; 127.0.0.1 sem a flag → vermelho.

import assert from "node:assert/strict";
import test from "node:test";

import { BillingHttpClient, billingHttpClientFromEnv, type BillingHttpLogEntry } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { BillingChannelDisabledError, BillingHostNotAllowedError, ProviderUnavailableError } from "../src/modules/subscription-billing/providers/http/billing-errors.js";
import { env } from "../src/config/env.js";
import { PROVIDER_CATALOG } from "../src/modules/subscription-billing/providers/provider.catalog.js";
import { sendJson, startFakeServer } from "./helpers/fake-providers/shared.js";

function client(overrides: Partial<ConstructorParameters<typeof BillingHttpClient>[0]> = {}) {
  return new BillingHttpClient({
    provider: "asaas",
    environment: "sandbox",
    channelEnabled: true,
    allowLocalHosts: true,
    nodeEnv: "test",
    baseUrl: "http://127.0.0.1:1",
    ...overrides,
  });
}

test("T-PAY-CLIENT-1 · canal desligado → channel_disabled ANTES de tocar a rede (R-PAY-4)", async () => {
  const server = await startFakeServer((_req, res) => sendJson(res, 200, { ok: true }));
  try {
    const http = client({ channelEnabled: false, baseUrl: server.baseUrl });
    await assert.rejects(
      http.request({ op: "createCharge", method: "POST", path: "/payments", body: {} }),
      (error: unknown) => error instanceof BillingChannelDisabledError && error.code === "channel_disabled",
    );
    assert.equal(server.recorded.length, 0, "o falso registra 0 requisições com o canal desligado");
  } finally {
    await server.close();
  }
});

test("T-PAY-CLIENT-2 · base URL fora do catálogo → host_not_allowed (R-PAY-5)", async () => {
  const http = client({ baseUrl: "https://evil.example.com/v3" });
  await assert.rejects(
    http.request({ op: "getCharge", method: "GET", path: "/payments/x" }),
    (error: unknown) => error instanceof BillingHostNotAllowedError && error.code === "host_not_allowed",
  );
});

test("T-PAY-CLIENT-3 · 127.0.0.1 só com a flag em test (R-PAY-5)", async () => {
  await assert.rejects(
    client({ allowLocalHosts: false, baseUrl: "http://127.0.0.1:1234/v3" }).request({ op: "getCharge", method: "GET", path: "/payments/x" }),
    (error: unknown) => error instanceof BillingHostNotAllowedError,
  );
  await assert.rejects(
    client({ allowLocalHosts: true, nodeEnv: "production", baseUrl: "http://127.0.0.1:1234/v3" }).request({ op: "getCharge", method: "GET", path: "/payments/x" }),
    (error: unknown) => error instanceof BillingHostNotAllowedError,
  );
  // Com a flag e NODE_ENV=test, o host do falso é aceito (prova o caminho feliz).
  const server = await startFakeServer((_req, res) => sendJson(res, 200, { ok: true }));
  try {
    const response = await client({ baseUrl: server.baseUrl }).request({ op: "ping", method: "GET", path: "/ping" });
    assert.equal(response.status, 200);
    await response.json();
  } finally {
    await server.close();
  }
});

test("T-PAY-CLIENT-4 · log tem provider/op/status/latencyMs e NUNCA headers nem corpo (R-PAY-7)", async () => {
  const server = await startFakeServer((_req, res) => {
    res.setHeader("x-api-key", "SECRET-ABC123-XYZ");
    sendJson(res, 200, { ok: true, token: "SECRET-ABC123-XYZ" });
  });
  try {
    const logs: BillingHttpLogEntry[] = [];
    const http = client({
      baseUrl: server.baseUrl,
      log: (entry) => logs.push(entry),
    });
    await http.request({
      op: "createCharge",
      method: "POST",
      path: "/payments",
      headers: { access_token: "SECRET-ABC123-XYZ" },
      body: { value: 1, token: "SECRET-ABC123-XYZ" },
    });
    assert.equal(logs.length, 1);
    const serialized = JSON.stringify(logs);
    assert.ok(!serialized.includes("SECRET-ABC123-XYZ"), "o log não carrega o token nem o corpo");
    assert.deepEqual(Object.keys(logs[0]!).sort(), ["latencyMs", "op", "provider", "status"]);
  } finally {
    await server.close();
  }
});

test("T-PAY-CLIENT-6 · redirect NÃO é seguido: o token não sai para host fora da lista (A1)", async () => {
  const steal = await startFakeServer((_req, res) => sendJson(res, 200, { stolen: true }), { host: "127.0.0.2" });
  const redirector = await startFakeServer((_req, res) => {
    res.statusCode = 302;
    res.setHeader("location", `http://127.0.0.2:${steal.port}/steal`);
    res.end();
  });
  try {
    const http = client({ baseUrl: redirector.baseUrl });
    await assert.rejects(
      http.request({
        op: "getCharge",
        method: "GET",
        path: "/payments/x",
        headers: { access_token: "SECRET-ABC123-XYZ" },
      }),
      (error: unknown) => error instanceof ProviderUnavailableError && error.code === "provider_unavailable",
    );
    assert.equal(steal.recorded.length, 0, "o destino do redirect não recebe nada");
  } finally {
    await redirector.close();
    await steal.close();
  }
});

test("T-PAY-CLIENT-7 · allowlist por provedor/ambiente: https obrigatório e porta padrão (A4)", async () => {
  const production = new URL(PROVIDER_CATALOG.asaas.hosts.production);
  const httpSandbox = new URL(PROVIDER_CATALOG.asaas.hosts.sandbox);
  httpSandbox.protocol = "http:";
  const otherProvider = new URL(PROVIDER_CATALOG.focusnfe.hosts.sandbox);
  const arbitraryPort = new URL(PROVIDER_CATALOG.asaas.hosts.sandbox);
  arbitraryPort.port = "8443";

  const rejectCases: readonly [string, string][] = [
    ["host de produção do Asaas", production.toString()],
    ["http (sem TLS) do sandbox", httpSandbox.toString()],
    ["host de outro provedor", otherProvider.toString()],
    ["porta arbitrária", arbitraryPort.toString()],
  ];
  for (const [label, baseUrl] of rejectCases) {
    const http = client({ baseUrl });
    await assert.rejects(
      http.request({
        op: "getCharge",
        method: "GET",
        path: "/payments/x",
        headers: { access_token: "SECRET-ABC123-XYZ" },
      }),
      (error: unknown) => error instanceof BillingHostNotAllowedError && error.code === "host_not_allowed",
      label,
    );
  }
});

test("T-PAY-CLIENT-8 · billingHttpClientFromEnv respeita o canal desligado (M-ENV / R-PAY-4)", async () => {
  const server = await startFakeServer((_req, res) => sendJson(res, 200, { ok: true }));
  try {
    const previous = env.BILLING_PROVIDERS_ENABLED;
    env.BILLING_PROVIDERS_ENABLED = false;
    try {
      const http = billingHttpClientFromEnv("asaas", "sandbox", `${server.baseUrl}/v3`);
      await assert.rejects(
        http.request({ op: "createCharge", method: "POST", path: "/payments", body: {} }),
        (error: unknown) => (error as { code?: string }).code === "channel_disabled",
      );
      assert.equal(server.recorded.length, 0, "canal desligado não toca a rede");
    } finally {
      env.BILLING_PROVIDERS_ENABLED = previous;
    }
  } finally {
    await server.close();
  }
});

test("T-PAY-CLIENT-9 · cartão usa cardTimeoutMs e o resto usa timeoutMs (M-TO)", async () => {
  const server = await startFakeServer(() => {});
  try {
    const http = client({ baseUrl: server.baseUrl, cardTimeoutMs: 400, timeoutMs: 100 });

    const cardStart = Date.now();
    await assert.rejects(
      http.request({ op: "charge", method: "POST", path: "/x", cardTimeout: true }),
      (error: unknown) => (error as { code?: string }).code === "provider_timeout",
    );
    const cardElapsed = Date.now() - cardStart;
    assert.ok(cardElapsed >= 350, `cartão deve esperar cardTimeoutMs (~400 ms), mas abortou em ${cardElapsed} ms`);

    const restStart = Date.now();
    await assert.rejects(
      http.request({ op: "get", method: "GET", path: "/x" }),
      (error: unknown) => (error as { code?: string }).code === "provider_timeout",
    );
    const restElapsed = Date.now() - restStart;
    assert.ok(restElapsed < 300, `o resto deve usar timeoutMs (~100 ms), mas levou ${restElapsed} ms`);
  } finally {
    await server.close();
  }
});
