// B-ASS-08 · F2 — router do webhook: decisão ANTES do parser, 404/401/413, limitador (R-WH-1/6, S11).
// Vermelho-controle: `webhooks/**` não existe em origin/main. Zero rede: o alvo é injetado (dublê).

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express, { type Request } from "express";

import { InMemoryWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.repository.js";
import { createWebhookRateLimiter } from "../src/modules/subscription-billing/webhooks/webhook.rate-limit.js";
import {
  createSubscriptionBillingWebhookRouter,
  WEBHOOK_NOT_FOUND_BODY,
  type WebhookTarget,
  type WebhookRouterDeps,
} from "../src/modules/subscription-billing/webhooks/subscription-billing.webhook.routes.js";

const okTarget: WebhookTarget = {
  provider: "asaas",
  verify: async () => ({ ok: true, eventId: "evt_1", externalResourceId: "pay_1", externalReference: "stmt_1" }),
};
const badTarget: WebhookTarget = { provider: "asaas", verify: async () => ({ ok: false }) };

type Harness = {
  readonly events: InMemoryWebhookEventRepository;
  readonly enqueued: { provider: string; externalEventId: string }[];
};

function buildApp(deps: Partial<WebhookRouterDeps> & { resolveTarget: WebhookRouterDeps["resolveTarget"] }): { app: express.Express; harness: Harness } {
  const events = new InMemoryWebhookEventRepository();
  const enqueued: Harness["enqueued"] = [];
  const router = createSubscriptionBillingWebhookRouter({
    resolveTarget: deps.resolveTarget,
    events,
    limiter: deps.limiter ?? createWebhookRateLimiter(),
    enqueueReconcile: async (input) => void enqueued.push(input),
    clientIp: deps.clientIp ?? ((req: Request) => (req.headers["x-test-ip"] as string) ?? "ip-default"),
  });
  const app = express();
  app.use("/webhooks/billing", router);
  return { app, harness: { events, enqueued } };
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

function post(base: string, provider: string, body: string, headers: Record<string, string> = {}) {
  return fetch(`${base}/webhooks/billing/${provider}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
}

test("R-WH-1 canal desligado por env → 404 PADRÃO, 0 eventos (T-WH-1)", async () => {
  const { app, harness } = buildApp({ resolveTarget: async () => null });
  await withServer(app, async (base) => {
    const res = await post(base, "asaas", JSON.stringify({ event: "PAYMENT_CONFIRMED" }));
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), WEBHOOK_NOT_FOUND_BODY);
  });
  assert.equal(harness.events.all().length, 0);
});

test("R-WH-1 provedor desconhecido / enabled=false → mesmo 404 (T-WH-2/3)", async () => {
  const { app } = buildApp({ resolveTarget: async (p) => (p === "asaas" ? okTarget : null) });
  await withServer(app, async (base) => {
    const unknown = await post(base, "desconhecido", JSON.stringify({}));
    assert.equal(unknown.status, 404);
    assert.deepEqual(await unknown.json(), WEBHOOK_NOT_FOUND_BODY);
  });
});

test("R-WH-1 desligado: 257 KB → 404 (NÃO 413) e JSON malformado → 404 (decisão antes do parser) (T-WH-28/29)", async () => {
  const { app, harness } = buildApp({ resolveTarget: async () => null });
  await withServer(app, async (base) => {
    const big = await post(base, "asaas", "x".repeat(257 * 1024));
    assert.equal(big.status, 404, "257 KB desligado dá 404, não 413");
    assert.deepEqual(await big.json(), WEBHOOK_NOT_FOUND_BODY);
    const malformed = await post(base, "asaas", "{not json");
    assert.equal(malformed.status, 404);
  });
  assert.equal(harness.events.all().length, 0);
});

test("R-WH-6 canal ligado: 257 KB → 413 (T-WH-25)", async () => {
  const { app } = buildApp({ resolveTarget: async () => okTarget });
  await withServer(app, async (base) => {
    const res = await post(base, "asaas", "y".repeat(257 * 1024));
    assert.equal(res.status, 413);
  });
});

test("R-WH-6 válido → 200 {} rápido e enfileira reconcile 1× (reconsulta é job) (T-WH-24)", async () => {
  const { app, harness } = buildApp({ resolveTarget: async () => okTarget });
  await withServer(app, async (base) => {
    const res = await post(base, "asaas", JSON.stringify({ id: "evt_1", payment: { id: "pay_1", externalReference: "stmt_1" } }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {});
  });
  assert.equal(harness.enqueued.length, 1);
  assert.deepEqual(harness.enqueued[0], { provider: "asaas", externalEventId: "evt_1" });
  // Só o digest/ids ficam guardados — nunca o corpo.
  const [event] = harness.events.all();
  assert.equal(event?.status, "received");
  assert.equal(event?.externalReference, "stmt_1");
  assert.match(event?.bodyDigest ?? "", /^[0-9a-f]{64}$/);
});

test("replay: mesmo evento 2× → 200 nas duas e 1 só enfileiramento (ON CONFLICT DO NOTHING)", async () => {
  const { app, harness } = buildApp({ resolveTarget: async () => okTarget });
  await withServer(app, async (base) => {
    await post(base, "asaas", JSON.stringify({ id: "evt_1" }));
    const second = await post(base, "asaas", JSON.stringify({ id: "evt_1" }));
    assert.equal(second.status, 200);
  });
  assert.equal(harness.enqueued.length, 1, "replay não enfileira de novo");
  assert.equal(harness.events.all().length, 1);
});

test("R-WH-2/6 segredo errado → 401 sem motivo; 21ª falha do mesmo IP → 429; outro IP legítimo → 200 (T-WH-30)", async () => {
  // resolveTarget alterna: o IP ruim manda segredo errado (badTarget); o bom, okTarget. Para simplificar, a verificação
  // depende do header x-secret-ok.
  const target: WebhookTarget = {
    provider: "asaas",
    verify: async (input) => (input.headers["x-secret-ok"] === "yes" ? { ok: true, eventId: `evt_${Math.random()}` } : { ok: false }),
  };
  const { app, harness } = buildApp({ resolveTarget: async () => target });
  await withServer(app, async (base) => {
    for (let i = 0; i < 20; i += 1) {
      const res = await post(base, "asaas", "{}", { "x-test-ip": "ip-bad" });
      assert.equal(res.status, 401);
      assert.deepEqual(await res.json(), { error: { code: "unauthorized" } });
    }
    const blocked = await post(base, "asaas", "{}", { "x-test-ip": "ip-bad" });
    assert.equal(blocked.status, 429, "21º pedido do IP ruim → 429");
    const legit = await post(base, "asaas", "{}", { "x-test-ip": "ip-good", "x-secret-ok": "yes" });
    assert.equal(legit.status, 200, "o IP legítimo não é penalizado");
  });
  assert.equal(harness.enqueued.length, 1);
});

test("R-WH-6 teto global do provedor → 429 (T-WH-26, mecanismo do token bucket)", async () => {
  const limiter = createWebhookRateLimiter({ globalPerMinute: 2 });
  const { app } = buildApp({ resolveTarget: async () => okTarget, limiter });
  await withServer(app, async (base) => {
    assert.equal((await post(base, "asaas", JSON.stringify({ id: "a" }))).status, 200);
    assert.equal((await post(base, "asaas", JSON.stringify({ id: "b" }))).status, 200);
    assert.equal((await post(base, "asaas", JSON.stringify({ id: "c" }))).status, 429, "estourou o teto do minuto");
  });
});
