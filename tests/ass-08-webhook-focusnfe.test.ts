// B-ASS-08 · F4 — Focus NFe: o falso EMITE o webhook com o header nomeado por nós (`X-Webhook-Token`); o adaptador
// real verifica (`timingSafeEqual`) e o router aceita/recusa. Evento sem `id` → external_event_id = sha256(corpo).

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import { emitFocusNfeWebhook } from "./helpers/fake-providers/focusnfe.js";
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import type { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { InMemoryWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.repository.js";
import { createWebhookRateLimiter } from "../src/modules/subscription-billing/webhooks/webhook.rate-limit.js";
import {
  createSubscriptionBillingWebhookRouter,
  type WebhookTarget,
} from "../src/modules/subscription-billing/webhooks/subscription-billing.webhook.routes.js";

const SECRET = "whk_focus_SECRET-xyz";
const noNetworkClient = { request: async () => { throw new Error("verifyWebhook não deve tocar a rede"); } } as unknown as BillingHttpClient;

function buildApp() {
  const adapter = new FocusNfeInvoiceAdapter(noNetworkClient, async (kind) => (kind === "webhook_secret" ? SECRET : null));
  const target: WebhookTarget = {
    provider: "focusnfe",
    verify: async (input) => {
      const result = await adapter.verifyWebhook({ headers: input.headers, rawBody: input.rawBody });
      return { ok: result.ok, eventId: result.eventId, externalReference: result.externalRef, kind: result.kind };
    },
  };
  const events = new InMemoryWebhookEventRepository();
  const enqueued: { provider: string; externalEventId: string }[] = [];
  const router = createSubscriptionBillingWebhookRouter({
    resolveTarget: async (p) => (p === "focusnfe" ? target : null),
    events,
    limiter: createWebhookRateLimiter(),
    enqueueReconcile: async (input) => void enqueued.push(input),
    clientIp: () => "ip-1",
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

test("R-WH-2 Focus assinado (X-Webhook-Token) → 200; external_reference = ref; id ausente → digest (T-WH-14)", async () => {
  const { app, events, enqueued } = buildApp();
  await withServer(app, async (base) => {
    const res = await emitFocusNfeWebhook(`${base}/webhooks/billing/focusnfe`, { ref: "stmt-7:1", status: "autorizado" }, { secret: SECRET });
    assert.equal(res.status, 200);
  });
  assert.equal(enqueued.length, 1);
  const [stored] = events.all();
  assert.equal(stored?.externalReference, "stmt-7:1");
  assert.match(stored?.externalEventId ?? "", /^[0-9a-f]{64}$/, "sem id documentado → sha256(corpo)");
});

test("R-WH-2 Focus segredo errado → 401, 0 eventos (T-WH-15)", async () => {
  const { app, events } = buildApp();
  await withServer(app, async (base) => {
    const res = await emitFocusNfeWebhook(`${base}/webhooks/billing/focusnfe`, { ref: "stmt-7:1", status: "autorizado" }, { secret: SECRET, badSecret: true });
    assert.equal(res.status, 401);
  });
  assert.equal(events.all().length, 0);
});
