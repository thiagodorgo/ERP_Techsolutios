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

test("R-WH-6 teto global do provedor → 429 (T-WH-26, teto de 2 na janela)", async () => {
  const limiter = createWebhookRateLimiter({ globalPerMinute: 2 });
  const { app } = buildApp({ resolveTarget: async () => okTarget, limiter });
  await withServer(app, async (base) => {
    assert.equal((await post(base, "asaas", JSON.stringify({ id: "a" }))).status, 200);
    assert.equal((await post(base, "asaas", JSON.stringify({ id: "b" }))).status, 200);
    assert.equal((await post(base, "asaas", JSON.stringify({ id: "c" }))).status, 429, "estourou o teto do minuto");
  });
});

// R-WH-6 — conserto J-522 (C1-01 / E2): "601ª requisição/min do provedor → 429" vale com RELÓGIO REAL. Um token bucket de
// recarga contínua liberava fichas durante a rajada (600 POSTs em ~0,5 s ≈ 4,8 fichas) e a 601ª passava; T-WH-26 (teto 2,
// rajada instantânea) não distinguia as duas formas. Os dois testes abaixo distinguem: 26b com relógio injetado que ANDA
// entre os pedidos; 26c na forma real — o comando literal da cadeira C1. Mutação: restaurar a recarga contínua → ambos vermelhos.

/** Alvo que verifica OK com `eventId` ÚNICO por pedido (cada aceito enfileira 1 reconcile — nenhum é "replay"). */
function uniqueEventTarget(): WebhookTarget {
  let seq = 0;
  return { provider: "asaas", verify: async () => ({ ok: true, eventId: `evt_${(seq += 1)}` }) };
}

test("R-WH-6 janela deslizante, relógio injetado que anda 5 ms por pedido: 600 × 200, a 601ª → 429, 60 s depois → 200 (T-WH-26b)", async () => {
  let t = Date.UTC(2026, 11, 1, 12, 0, 0);
  const limiter = createWebhookRateLimiter({ now: () => t, globalPerMinute: 600 });
  const target = uniqueEventTarget(); // UM alvo para todos os pedidos: o contador de eventId é compartilhado
  const { app } = buildApp({ resolveTarget: async () => target, limiter });
  await withServer(app, async (base) => {
    for (let i = 0; i < 600; i += 1) {
      assert.equal((await post(base, "asaas", JSON.stringify({ id: i }))).status, 200, `pedido ${i + 1} dentro do teto`);
      t += 5; // o relógio ANDA durante a rajada: um token bucket recarregaria ≈ 0,05 ficha por pedido e a 601ª passaria
    }
    assert.equal((await post(base, "asaas", JSON.stringify({ id: 600 }))).status, 429, "601ª em menos de 60 s → 429");
    t += 60_001; // a janela desliza: os 600 carimbos saem
    assert.equal((await post(base, "asaas", JSON.stringify({ id: 601 }))).status, 200, "passada a janela, aceita de novo");
  });
});

test("R-WH-6 forma REAL (o comando da C1): 600 POSTs HTTP com relógio real → 600 × 200; a 601ª → 429 (T-WH-26c)", async () => {
  const target = uniqueEventTarget(); // UM alvo para todos os pedidos: eventId único por pedido, nenhum é replay
  const { app, harness } = buildApp({ resolveTarget: async () => target }); // limiter padrão: 600/min, relógio real
  await withServer(app, async (base) => {
    const started = Date.now();
    for (let i = 0; i < 600; i += 1) {
      assert.equal((await post(base, "asaas", JSON.stringify({ id: i }))).status, 200);
    }
    const elapsed = Date.now() - started;
    // Pré-condição afirmada (não `skip`): se 600 POSTs levassem ≥ 55 s, a 601ª cairia fora da janela e o teste não mediria o teto.
    assert.ok(elapsed < 55_000, `600 POSTs em ${elapsed} ms — a máquina precisa caber na janela de 60 s`);
    assert.equal((await post(base, "asaas", JSON.stringify({ id: 600 }))).status, 429, "601ª requisição/min do provedor → 429");
  });
  assert.equal(harness.enqueued.length, 600, "exatamente as 600 aceitas enfileiraram reconcile; a 601ª não");
});
