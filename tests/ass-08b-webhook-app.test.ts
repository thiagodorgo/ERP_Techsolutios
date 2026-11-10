// B-ASS-08b · (b) — o router do webhook MONTADO NO APP REAL (src/app.ts) em `/api/v1/webhooks/billing/:provider`, antes de
// `express.json`, do `pinoHttp` e de qualquer `attachAuthenticatedActor`. R-WH-1 POR CONSTRUÇÃO: com o canal DESLIGADO
// (padrão) o router chama `next()` sem ler o corpo, e a resposta é a MESMA que o app dá a uma rota inexistente sob
// `/api/v1` para o MESMO corpo — status e corpo iguais, para JSON válido, 257 KB e JSON malformado (não "404 sempre": o
// que o app responderia à rota inexistente, seja 404, 400 ou 413, é o que o webhook desligado responde). Com o canal
// LIGADO (resolvedor injetado, sem cofre nem rede) o pedido NÃO passa pelo middleware de ator: um `Authorization` inválido
// não gera o 401 INVALID_TOKEN do ator, e a autenticidade é só do `verifyWebhook`.

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "../src/app.js";
import {
  BILLING_WEBHOOK_MOUNT_PATH,
  WEBHOOK_NOT_FOUND_BODY,
  billingWebhookPath,
  billingWebhookPublicUrl,
  type WebhookTarget,
} from "../src/modules/subscription-billing/webhooks/subscription-billing.webhook.routes.js";
import {
  getMemoryWebhookEventsForTests,
  resetWebhookRuntimeForTests,
  setWebhookEnqueueForTests,
  setWebhookTargetResolverForTests,
} from "../src/modules/subscription-billing/webhooks/webhook-runtime.js";

const UNKNOWN_ROUTE = "/api/v1/rota-que-nao-existe-b-ass-08b";

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

type Reply = { readonly status: number; readonly body: unknown };

async function post(base: string, path: string, body: string, headers: Record<string, string> = {}): Promise<Reply> {
  const res = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // corpo não JSON: compara o texto cru
  }
  return { status: res.status, body: parsed };
}

const BODIES: ReadonlyArray<readonly [string, string]> = [
  ["JSON válido", JSON.stringify({ id: "evt_1", event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } })],
  ["257 KB", "x".repeat(257 * 1024)],
  ["JSON malformado", "{nao e json"],
];

test("R-WH-1 por construção: canal desligado → status e corpo IGUAIS aos da rota inexistente, para os 3 corpos; 0 eventos", async () => {
  resetWebhookRuntimeForTests();
  await withServer(async (base) => {
    for (const [rotulo, body] of BODIES) {
      const webhook = await post(base, billingWebhookPath("asaas"), body, { "asaas-access-token": "SEGREDO-DO-PROVEDOR" });
      const unknown = await post(base, UNKNOWN_ROUTE, body);
      assert.deepEqual(webhook, unknown, `${rotulo}: o webhook desligado tem de responder exatamente como a rota inexistente`);
    }
    // O JSON válido cai no 404 padrão da casa (0.43) — o mesmo corpo da constante que os testes do router conferem.
    const valid = await post(base, billingWebhookPath("asaas"), BODIES[0]![1]);
    assert.equal(valid.status, 404);
    assert.deepEqual(valid.body, WEBHOOK_NOT_FOUND_BODY);
  });
  assert.equal(getMemoryWebhookEventsForTests().all().length, 0);
});

test("provedor desconhecido e provedor conhecido com o canal desligado respondem o MESMO que a rota inexistente", async () => {
  resetWebhookRuntimeForTests();
  await withServer(async (base) => {
    const body = JSON.stringify({ a: 1 });
    const unknownRoute = await post(base, UNKNOWN_ROUTE, body);
    assert.deepEqual(await post(base, billingWebhookPath("provedor-inexistente"), body), unknownRoute);
    assert.deepEqual(await post(base, billingWebhookPath("focusnfe"), body), unknownRoute);
    assert.equal(unknownRoute.status, 404);
  });
});

test("canal LIGADO (resolvedor injetado): o pedido não passa pelo ator — Authorization inválido não dá INVALID_TOKEN; 401 e 200 são do router", async () => {
  resetWebhookRuntimeForTests();
  const target: WebhookTarget = {
    provider: "asaas",
    verify: async (input) => {
      if (input.headers["x-test-ok"] !== "1") return { ok: false };
      const { id } = JSON.parse(input.rawBody) as { id: string };
      return { ok: true, eventId: id, externalResourceId: "pay_1", externalReference: "stmt_1" };
    },
  };
  setWebhookTargetResolverForTests(async (provider) => (provider === "asaas" ? target : null));
  const enqueued: { provider: string; externalEventId: string }[] = [];
  try {
    await withServer(async (base) => {
      const body = JSON.stringify({ id: "evt_app_1" });
      // Sem autenticidade: o 401 é o do router (sem motivo), não o do ator — mesmo com um Bearer inválido no pedido.
      const unauthorized = await post(base, billingWebhookPath("asaas"), body, { authorization: "Bearer token-invalido" });
      assert.deepEqual(unauthorized, { status: 401, body: { error: { code: "unauthorized" } } });
      // Fila indisponível (sem Redis neste teste): 503 SEM detalhe, nunca o 500 HTML do Express (R-WH-7).
      const unavailable = await post(base, billingWebhookPath("asaas"), JSON.stringify({ id: "evt_app_0" }), { "x-test-ok": "1" });
      assert.deepEqual(unavailable, { status: 503, body: { error: { code: "temporarily_unavailable" } } });
      // Com autenticidade e fila: 200 {} — o Bearer inválido NÃO foi olhado por ninguém (o ator responderia 401 INVALID_TOKEN).
      setWebhookEnqueueForTests(async (input) => void enqueued.push(input));
      const ok = await post(base, billingWebhookPath("asaas"), body, { authorization: "Bearer token-invalido", "x-test-ok": "1" });
      assert.deepEqual(ok, { status: 200, body: {} });
      // Outro provedor segue desligado → igual à rota inexistente.
      assert.deepEqual(await post(base, billingWebhookPath("focusnfe"), body), await post(base, UNKNOWN_ROUTE, body));
    });
    assert.deepEqual(enqueued, [{ provider: "asaas", externalEventId: "evt_app_1" }], "o reconcile é enfileirado uma vez, pelo id do evento");
    const events = getMemoryWebhookEventsForTests().all();
    const accepted = events.find((event) => event.externalEventId === "evt_app_1");
    assert.equal(accepted?.externalReference, "stmt_1");
    // O evento do 503 ficou gravado como `received` sem job: é o que o poll-pending retoma (R-WH-8).
    assert.equal(events.find((event) => event.externalEventId === "evt_app_0")?.status, "received");
  } finally {
    resetWebhookRuntimeForTests();
  }
});

test("a URL registrada no provedor é BILLING_WEBHOOK_PUBLIC_BASE_URL + o caminho montado no app", () => {
  assert.equal(BILLING_WEBHOOK_MOUNT_PATH, "/api/v1/webhooks/billing");
  assert.equal(billingWebhookPath("asaas"), "/api/v1/webhooks/billing/asaas");
  assert.equal(billingWebhookPublicUrl("https://hooks.exemplo.com/", "focusnfe"), "https://hooks.exemplo.com/api/v1/webhooks/billing/focusnfe");
  assert.equal(billingWebhookPublicUrl("https://hooks.exemplo.com", "asaas"), "https://hooks.exemplo.com/api/v1/webhooks/billing/asaas");
});
