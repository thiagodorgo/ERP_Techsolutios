// B-ASS-08c-wh · testes-dono CA-27/CA-28. O canal usa somente alvos e servidores falsos locais.

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express, { type Request } from "express";

import { createWebhookRateLimiter, type WebhookRateLimiter } from "../src/modules/subscription-billing/webhooks/webhook.rate-limit.js";
import {
  createSubscriptionBillingWebhookRouterForApp,
  resetWebhookRuntimeForTests,
  setWebhookEnqueueForTests,
  setWebhookTargetResolverForTests,
} from "../src/modules/subscription-billing/webhooks/webhook-runtime.js";
import * as webhookRoutes from "../src/modules/subscription-billing/webhooks/subscription-billing.webhook.routes.js";

type ClientIpResolver = (req: Request, trustedProxyHops: number) => string;

function resolver(): ClientIpResolver {
  const candidate = (webhookRoutes as unknown as { webhookClientIp?: ClientIpResolver }).webhookClientIp;
  assert.equal(typeof candidate, "function", "webhookClientIp(req, hops) precisa existir");
  return candidate!;
}

function requestWith(socketIp: string, forwardedFor?: string): Request {
  return {
    socket: { remoteAddress: socketIp },
    headers: forwardedFor === undefined ? {} : { "x-forwarded-for": forwardedFor },
  } as unknown as Request;
}

// Montagem pela composição de PRODUÇÃO (`createSubscriptionBillingWebhookRouterForApp`): o IP sai do `clientIp` do
// runtime, e não de um resolvedor injetado pelo teste. Só o alvo e a fila são dublês locais (sem cofre, sem rede).
function buildApp(options: { readonly hops: number; readonly limiter?: WebhookRateLimiter }) {
  let eventSequence = 0;
  resetWebhookRuntimeForTests();
  setWebhookTargetResolverForTests(async () => ({
    provider: "asaas",
    verify: async ({ headers }) =>
      headers["x-secret-ok"] === "yes" ? { ok: true, eventId: `evt_${(eventSequence += 1)}` } : { ok: false },
  }));
  setWebhookEnqueueForTests(async () => undefined);
  const router = createSubscriptionBillingWebhookRouterForApp({
    limiter: options.limiter ?? createWebhookRateLimiter(),
    trustedProxyHops: options.hops,
  });
  const app = express();
  app.use("/webhooks/billing", router);
  return app;
}

test.after(() => resetWebhookRuntimeForTests());

async function withServer(app: express.Express, body: (baseUrl: string) => Promise<void>): Promise<void> {
  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await body(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function post(baseUrl: string, forwardedFor: string, authenticated = false): Promise<Response> {
  return fetch(`${baseUrl}/webhooks/billing/asaas`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": forwardedFor,
      ...(authenticated ? { "x-secret-ok": "yes" } : {}),
    },
    body: "{}",
  });
}

test("IP1 hops 1: 20 respostas 401 de XFF A não bloqueiam XFF B no mesmo socket", async () => {
  const app = buildApp({ hops: 1 });
  await withServer(app, async (baseUrl) => {
    for (let index = 0; index < 20; index += 1) {
      assert.equal((await post(baseUrl, "198.51.100.10")).status, 401);
    }
    assert.equal((await post(baseUrl, "198.51.100.11", true)).status, 200);
  });
});

test("IP2 XFF forjado com mais saltos não escolhe o IP acrescentado à esquerda", () => {
  const clientIp = resolver();
  const request = requestWith("192.0.2.200", "203.0.113.250, 198.51.100.20, 192.0.2.10");
  assert.equal(clientIp(request, 2), "198.51.100.20");
});

test("IP3 hops 0 ignora XFF e usa o socket", () => {
  const clientIp = resolver();
  const request = requestWith("192.0.2.200", "198.51.100.30");
  assert.equal(clientIp(request, 0), "192.0.2.200");
});

test("IP4 atacante já bloqueado manda 1 000 pedidos; o legítimo seguinte ainda recebe 200", async () => {
  let globalCalls = 0;
  const limiter: WebhookRateLimiter = {
    isIpBlocked: (ip) => ip === "198.51.100.40",
    allowGlobal: () => (globalCalls += 1) <= 1,
    recordFailure: () => undefined,
  };
  const app = buildApp({ hops: 1, limiter });
  await withServer(app, async (baseUrl) => {
    for (let index = 0; index < 1_000; index += 1) {
      assert.equal((await post(baseUrl, "198.51.100.40")).status, 429);
    }
    assert.equal((await post(baseUrl, "198.51.100.41", true)).status, 200);
  });
  assert.equal(globalCalls, 1, "pedidos de IP já bloqueado não gastam a cota global");
});
