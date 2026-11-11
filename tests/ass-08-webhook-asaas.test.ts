// B-ASS-08 · F3 — Asaas: o falso EMITE o webhook assinado; o adaptador real verifica a autenticidade
// (`timingSafeEqual` sobre SHA-256) e o router aceita/recusa. R-WH-2 ponta a ponta. Zero rede a host real.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import test from "node:test";

import express from "express";

import { emitAsaasWebhook } from "./helpers/fake-providers/asaas.js";
import { AsaasPaymentAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/asaas.adapter.js";
import type { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { InMemoryWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.repository.js";
import { createWebhookRateLimiter } from "../src/modules/subscription-billing/webhooks/webhook.rate-limit.js";
import {
  createSubscriptionBillingWebhookRouter,
  type WebhookTarget,
} from "../src/modules/subscription-billing/webhooks/subscription-billing.webhook.routes.js";

const SECRET = "whk_asaas_SECRET-123";

// O cliente HTTP NUNCA é chamado em verifyWebhook; qualquer uso é bug.
const noNetworkClient: BillingHttpClient = {
  request: async () => {
    throw new Error("verifyWebhook não deve tocar a rede");
  },
} as unknown as BillingHttpClient;

function buildApp() {
  const adapter = new AsaasPaymentAdapter(noNetworkClient, async (kind) => (kind === "webhook_secret" ? SECRET : null));
  const target: WebhookTarget = {
    provider: "asaas",
    verify: async (input) => {
      const result = await adapter.verifyWebhook(input);
      return {
        ok: result.ok,
        eventId: result.eventId,
        externalResourceId: result.chargeId,
        externalReference: result.externalReference,
        kind: result.kind,
      };
    },
  };
  const events = new InMemoryWebhookEventRepository();
  const enqueued: { provider: string; externalEventId: string }[] = [];
  const router = createSubscriptionBillingWebhookRouter({
    resolveTarget: async (p) => (p === "asaas" ? target : null),
    events,
    limiter: createWebhookRateLimiter(),
    enqueueReconcile: async (input) => void enqueued.push(input),
    clientIp: (req) => (req.headers["x-test-ip"] as string) ?? "ip-1",
  });
  const app = express();
  app.use("/webhooks/billing", router);
  return { app, events, enqueued };
}

async function withServer(app: express.Express, cb: (base: string) => Promise<void>): Promise<void> {
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await cb(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

const event = { id: "evt_asaas_1", event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", externalReference: "stmt-1", status: "CONFIRMED" } };

test("R-WH-2 webhook Asaas assinado corretamente → 200 e evento gravado (T-WH-4)", async () => {
  const { app, events, enqueued } = buildApp();
  await withServer(app, async (base) => {
    const res = await emitAsaasWebhook(`${base}/webhooks/billing/asaas`, event, { secret: SECRET });
    assert.equal(res.status, 200);
  });
  assert.equal(enqueued.length, 1);
  const [stored] = events.all();
  assert.equal(stored?.externalEventId, "evt_asaas_1");
  assert.equal(stored?.externalResourceId, "pay_1");
  assert.equal(stored?.externalReference, "stmt-1");
});

test("R-WH-2 segredo errado → 401 sem motivo, 0 eventos (T-WH-5)", async () => {
  const { app, events } = buildApp();
  await withServer(app, async (base) => {
    const res = await emitAsaasWebhook(`${base}/webhooks/billing/asaas`, event, { secret: SECRET, badSecret: true });
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: { code: "unauthorized" } });
  });
  assert.equal(events.all().length, 0);
});

test("R-WH-2 header asaas-access-token repetido → 401 (T-WH-6)", async () => {
  const { app } = buildApp();
  await withServer(app, async (base) => {
    const res = await emitAsaasWebhook(`${base}/webhooks/billing/asaas`, event, { secret: SECRET, extraToken: SECRET });
    assert.equal(res.status, 401);
  });
});

test("R-WH-3 replay do mesmo evento → 200 nas duas, 1 enfileiramento", async () => {
  const { app, enqueued } = buildApp();
  await withServer(app, async (base) => {
    assert.equal((await emitAsaasWebhook(`${base}/webhooks/billing/asaas`, event, { secret: SECRET })).status, 200);
    assert.equal((await emitAsaasWebhook(`${base}/webhooks/billing/asaas`, event, { secret: SECRET })).status, 200);
  });
  assert.equal(enqueued.length, 1);
});

test("R-WH-2 guard de texto: a verificação do Asaas usa timingSafeEqual e NÃO compara o segredo com ===", () => {
  const path = fileURLToPath(new URL("../src/modules/subscription-billing/providers/payment/asaas/asaas.adapter.ts", import.meta.url));
  const src = readFileSync(path, "utf8");
  const verify = src.slice(src.indexOf("verifyWebhook"));
  assert.match(verify, /timingSafeEqual\s*\(/, "verifyWebhook do Asaas precisa de timingSafeEqual");
  // Nenhuma comparação de igualdade com o token/segredo via === no corpo de verifyWebhook.
  assert.ok(!/===\s*(secret|token)|(secret|token)\s*===/.test(verify), "a comparação do segredo nunca é com ===");
});
