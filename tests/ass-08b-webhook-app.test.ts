// B-ASS-08b · (b) — o router do webhook MONTADO NO APP REAL (src/app.ts), antes de `express.json` e do `pinoHttp`.
// R-WH-1 no pipeline de verdade: com o canal DESLIGADO (padrão), o webhook é indistinguível de inexistente — 404 com o
// corpo padrão da casa para JSON válido, 257 KB e JSON malformado; nada gravado. CONTROLE: o mesmo JSON malformado numa
// rota /api/v1 recebe o 400 do parser global (é o que o webhook receberia se fosse montado DEPOIS do express.json).

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "../src/app.js";
import { WEBHOOK_NOT_FOUND_BODY } from "../src/modules/subscription-billing/webhooks/subscription-billing.webhook.routes.js";
import { getMemoryWebhookEventsForTests, resetWebhookRuntimeForTests } from "../src/modules/subscription-billing/webhooks/webhook-runtime.js";

async function withServer(cb: (base: string) => Promise<void>): Promise<void> {
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await cb(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function post(base: string, path: string, body: string) {
  return fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body });
}

test("R-WH-1 (app real) canal desligado: JSON válido → 404 padrão, 0 eventos", async () => {
  resetWebhookRuntimeForTests();
  await withServer(async (base) => {
    const res = await post(base, "/webhooks/billing/asaas", JSON.stringify({ id: "evt_1", event: "PAYMENT_CONFIRMED" }));
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), WEBHOOK_NOT_FOUND_BODY);
  });
  assert.equal(getMemoryWebhookEventsForTests().all().length, 0);
});

test("R-WH-1 (app real) canal desligado: 257 KB → 404 e JSON malformado → 404 (o router decide antes do parser global)", async () => {
  resetWebhookRuntimeForTests();
  await withServer(async (base) => {
    const big = await post(base, "/webhooks/billing/asaas", "x".repeat(257 * 1024));
    assert.equal(big.status, 404, "257 KB com o canal desligado dá 404");
    assert.deepEqual(await big.json(), WEBHOOK_NOT_FOUND_BODY);
    const malformed = await post(base, "/webhooks/billing/asaas", "{nao e json");
    assert.equal(malformed.status, 404, "JSON malformado com o canal desligado dá 404, não o 400 do parser global");
    assert.deepEqual(await malformed.json(), WEBHOOK_NOT_FOUND_BODY);
  });
  assert.equal(getMemoryWebhookEventsForTests().all().length, 0);
});

test("CONTROLE: o mesmo JSON malformado numa rota /api/v1 recebe o 400 do parser global (invalid_json)", async () => {
  await withServer(async (base) => {
    const res = await post(base, "/api/v1/auth/login", "{nao e json");
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error?: { reason?: string } };
    assert.equal(body.error?.reason, "invalid_json");
  });
});

test("provedor desconhecido no app real → o mesmo 404 padrão", async () => {
  await withServer(async (base) => {
    const res = await post(base, "/webhooks/billing/provedor-inexistente", "{}");
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), WEBHOOK_NOT_FOUND_BODY);
  });
});
