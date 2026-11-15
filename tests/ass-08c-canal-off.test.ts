// B-ASS-08c · CA-OFF (plano v2 §3.0; Emenda 1, R2-15) — com `BILLING_PROVIDERS_ENABLED=false` o canal abre ZERO conexões.
// Corre em todo PR do 08c; cada PR que acrescenta rota acrescenta o caso dela aqui (só acréscimo).
//
// Sonda: `globalThis.fetch` e `net.Socket.prototype.connect` contam E bloqueiam (nenhum host é contatado, nem sob mutação).
// Caminhos, todos da composição de PRODUÇÃO (nada injetado por cima da flag):
//   (a) os handlers dos jobs recorrentes (`billing.dispatch-outbox`, `billing.poll-pending`, `billing.poll-settled`);
//   (b) `createChannelRuntime()` e uma rodada de `runBillingDispatch`, `runBillingPollPending` e `runBillingPollSettled`, com
//       Asaas e Focus NFe configurados e LIGADOS no cofre, uma `charge_create` PENDING e um ref com cobrança;
//   (c) o cliente HTTP do canal pela fábrica de produção (`billingHttpClientFromEnv`) atrás do adaptador Asaas.
// B-ASS-08c1a não acrescenta rota.
// Mutação de produto, literal (M-A13 do R2-11): em `billing-http.client.ts`, `channelEnabled: env.BILLING_PROVIDERS_ENABLED,`
// → `channelEnabled: true,` → o caso (c) chama o `fetch` (bloqueado pela sonda) e fica vermelho.

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import net from "node:net";
import test from "node:test";

import { env } from "../src/config/env.js";
import { runBillingDispatch, runBillingPollPending, runBillingPollSettled } from "../src/modules/subscription-billing/outbox/channel.jobs.js";
import { createChannelRuntime, resetChannelRuntimeForTests } from "../src/modules/subscription-billing/outbox/channel.runtime.js";
import { billingHttpClientFromEnv } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { createAsaasAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/index.js";
import {
  createBillingDispatchOutboxJobHandler,
  createBillingPollPendingJobHandler,
  createBillingPollSettledJobHandler,
} from "../src/modules/subscription-billing/subscription-billing.jobs.js";
import { getMemoryVaultForTests, resetVaultRuntimeForTests, setVaultKeysForTests } from "../src/modules/subscription-billing/vault/vault.factory.js";
import { EnvVaultKeyProvider } from "../src/modules/subscription-billing/vault/vault-keys.js";

type MutableEnv = { BILLING_PROVIDERS_ENABLED: boolean; CORE_SAAS_PERSISTENCE: string; BILLING_PROVIDER_ALLOW_LOCAL_HOSTS: boolean; NODE_ENV: string };
const mutableEnv = env as unknown as MutableEnv;

/** Conta e BLOQUEIA toda tentativa de rede do processo enquanto `fn` roda. */
async function probeConnections(fn: () => Promise<void>): Promise<string[]> {
  const attempts: string[] = [];
  const originalFetch = globalThis.fetch;
  const originalConnect = net.Socket.prototype.connect;
  globalThis.fetch = (async (input: unknown) => {
    attempts.push(`fetch ${String(input)}`);
    throw new Error("ca_off_probe: rede bloqueada");
  }) as typeof fetch;
  net.Socket.prototype.connect = function blocked(this: net.Socket, ...args: unknown[]) {
    attempts.push(`socket ${JSON.stringify(args[0])}`);
    throw new Error("ca_off_probe: rede bloqueada");
  } as typeof net.Socket.prototype.connect;
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
    net.Socket.prototype.connect = originalConnect;
  }
  return attempts;
}

/** Cofre de memória DISPONÍVEL (chave de teste gerada agora, nunca versionada) com Asaas e Focus NFe configurados e LIGADOS. */
async function arrangeEnabledProviders(): Promise<void> {
  resetVaultRuntimeForTests();
  resetChannelRuntimeForTests();
  setVaultKeysForTests(new EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }));
  const { configs } = getMemoryVaultForTests();
  const now = new Date();
  await configs.upsert({ provider: "asaas", kind: "payment", environment: "sandbox", settings: {} }, now);
  await configs.upsert({ provider: "focusnfe", kind: "invoice", environment: "sandbox", settings: {} }, now);
  configs.setEnabledForTests("asaas", true);
  configs.setEnabledForTests("focusnfe", true);
}

test("CA-OFF: com o canal desligado, jobs, composição e cliente do canal abrem 0 conexões", async () => {
  const previous = { ...mutableEnv };
  try {
    mutableEnv.CORE_SAAS_PERSISTENCE = "memory";
    // Premissa: o padrão do ambiente de teste é a flag DESLIGADA (o mesmo `booleanFlag(false)` da produção).
    assert.equal(previous.BILLING_PROVIDERS_ENABLED, false, "premissa: BILLING_PROVIDERS_ENABLED é false por padrão");
    mutableEnv.BILLING_PROVIDERS_ENABLED = false;
    await arrangeEnabledProviders();

    // (a) os handlers dos jobs recorrentes, sem nada injetado além da fila (que não é rede).
    const requeued: string[] = [];
    const enqueue = async (name: string) => void requeued.push(name);
    const handlers = await probeConnections(async () => {
      await createBillingDispatchOutboxJobHandler({ enqueue })({});
      await createBillingPollPendingJobHandler({ enqueue })({});
      await createBillingPollSettledJobHandler({ enqueue })({});
    });
    assert.deepEqual(handlers, [], "(a) handlers: 0 conexões");
    assert.deepEqual(requeued, [], "(a) com o canal desligado a cadeia não continua");

    // (b) a composição de produção e uma rodada de cada job, com trabalho na fila e um ref com cobrança.
    const tenantId = randomUUID();
    const statementId = randomUUID();
    let dispatched: Awaited<ReturnType<typeof runBillingDispatch>> | undefined;
    const runtime = await probeConnections(async () => {
      const deps = await createChannelRuntime();
      assert.deepEqual(Object.keys(deps.ports), [], "(b) nenhuma porta de pagamento com a flag desligada");
      assert.deepEqual(Object.keys(deps.invoicePorts ?? {}), [], "(b) nenhuma porta de nota com a flag desligada");
      const now = new Date();
      await deps.outbox.enqueue({ tenantId, statementId, kind: "charge_create", provider: "asaas", seq: 1, payload: { amountCents: 10_000, dueDate: "2026-12-10", method: "pix" } }, now);
      await deps.refs.put({ statementId, tenantId, provider: "asaas", externalChargeId: "pay_ca_off" }, new Date(now.getTime() - 2 * 60 * 60 * 1000));
      dispatched = await runBillingDispatch(deps);
      await runBillingPollPending(deps);
      await runBillingPollSettled(deps);
    });
    assert.deepEqual(runtime, [], "(b) composição e rodadas: 0 conexões");
    assert.equal(dispatched?.outcomes.sent, 0);

    // (c) o cliente do canal pela fábrica de produção: recusa antes da rede. Base local, para que nem a mutação chegue a
    // nomear um host real (a sonda bloqueia de qualquer jeito).
    // O host local só é aceito em `NODE_ENV=test` com a permissão ligada: assim, sob a M-A13, o cliente chega de fato ao `fetch`
    // (que a sonda conta e bloqueia), e o vermelho é a conexão, não um host recusado.
    mutableEnv.BILLING_PROVIDER_ALLOW_LOCAL_HOSTS = true;
    mutableEnv.NODE_ENV = "test";
    let refusal: unknown;
    const client = await probeConnections(async () => {
      const adapter = createAsaasAdapter(billingHttpClientFromEnv("asaas", "sandbox", "http://127.0.0.1:9/v3"), {
        readSecretForProvider: async () => ({ reveal: () => "token-ficticio-ca-off" }),
      } as unknown as Parameters<typeof createAsaasAdapter>[1]);
      try {
        await adapter.listChargesByExternalReference("ref-ca-off");
      } catch (error) {
        refusal = error;
      }
    });
    assert.deepEqual(client, [], "(c) cliente do canal: 0 conexões");
    assert.equal((refusal as { code?: unknown })?.code, "channel_disabled", "(c) a recusa é a do canal desligado");
  } finally {
    Object.assign(mutableEnv, previous);
    resetVaultRuntimeForTests();
    resetChannelRuntimeForTests();
  }
});

// ----------------------------------------------------------------------------------------------------------------
// B-ASS-08c1b (F10; abertura §5.1, CA-OFF e CV2) — as 7 rotas novas de plataforma, com o canal DESLIGADO e o app real no
// modo memória: nenhuma abre conexão de saída (a única permitida é a do próprio teste ao app, no loopback da porta dele);
// o `/charge` → 422 `payment_provider_disabled`; o `charge/cancel` e o `cancel-unknown` gravam a fila sem rede. CV2: nenhuma
// resposta traz o `payload`, o `tenantId`, segredo, token do provedor ou a chave do cofre (busca profunda nas chaves e nos
// valores).

/** Conta e BLOQUEIA a rede, como `probeConnections`, salvo o loopback do próprio app do teste (`127.0.0.1:<port>`). */
async function probeOutbound(port: number, fn: () => Promise<void>): Promise<string[]> {
  const attempts: string[] = [];
  const originalFetch = globalThis.fetch;
  const originalConnect = net.Socket.prototype.connect;
  const own = `http://127.0.0.1:${port}/`;
  globalThis.fetch = (async (input: unknown, init?: unknown) => {
    if (String(input).startsWith(own)) return originalFetch(input as never, init as never);
    attempts.push(`fetch ${String(input)}`);
    throw new Error("ca_off_probe: rede bloqueada");
  }) as typeof fetch;
  net.Socket.prototype.connect = function guarded(this: net.Socket, ...args: unknown[]) {
    const target = (Array.isArray(args[0]) ? args[0][0] : args[0]) as { port?: unknown; host?: unknown } | number | undefined;
    const targetPort = typeof target === "object" && target !== null ? Number(target.port) : Number(target);
    const host = typeof target === "object" && target !== null ? String(target.host ?? "") : String(args[1] ?? "");
    if (targetPort === port && (host === "127.0.0.1" || host === "localhost" || host === "")) return (originalConnect as (...a: unknown[]) => net.Socket).apply(this, args);
    attempts.push(`socket ${JSON.stringify(args[0])}`);
    throw new Error("ca_off_probe: rede bloqueada");
  } as typeof net.Socket.prototype.connect;
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
    net.Socket.prototype.connect = originalConnect;
  }
  return attempts;
}

const FORBIDDEN_KEYS = /^(payload|tenantId|tenant_id|secret|token|apiKey|api_key|accessToken|credential|credentials|ciphertext|vaultKey)$/i;

/** CV2: as chaves e os valores proibidos em qualquer profundidade do corpo. */
function forbiddenIn(value: unknown, secrets: readonly string[], where = "$"): string[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => forbiddenIn(item, secrets, `${where}[${index}]`));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => [
      ...(FORBIDDEN_KEYS.test(key) ? [`${where}.${key}`] : []),
      ...forbiddenIn(inner, secrets, `${where}.${key}`),
    ]);
  }
  if (typeof value === "string" && secrets.some((secret) => value.includes(secret))) return [`${where} (segredo no valor)`];
  return [];
}

test("CA-OFF (08c1b): as 7 rotas novas, com o canal desligado, abrem 0 conexões de saída; /charge → 422; charge/cancel e cancel-unknown gravam sem rede; CV2 sem payload, tenantId nem segredo", async () => {
  const previous = { ...mutableEnv };
  let server: import("node:http").Server | undefined;
  try {
    mutableEnv.CORE_SAAS_PERSISTENCE = "memory";
    mutableEnv.BILLING_PROVIDERS_ENABLED = false;
    mutableEnv.NODE_ENV = "test";
    await arrangeEnabledProviders();
    const vaultKey = randomBytes(32).toString("base64");
    setVaultKeysForTests(new EnvVaultKeyProvider({ BILLING_VAULT_KEY: vaultKey, BILLING_VAULT_KEY_VERSION: "1" }));
    const [{ createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, statementFactory] = await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
      import("../src/modules/subscription-billing/statements/statement.factory.js"),
    ]);
    statementFactory.resetStatementRuntimeForTests();
    const tenantId = randomUUID();
    const dueDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
    const statement = await statementFactory.getMemoryStatementRepositoryForTests().transaction(tenantId, async (tx) => {
      const { statement: fresh } = await tx.insertIfAbsentAndLock({ tenantId, period: "2026-10" });
      return tx.saveStatement({ ...fresh, status: "closed", totalCents: 12_345, dueDate, closedAt: new Date() });
    });
    // Uma `charge_create` PENDING na fila em memória: o `charge/cancel` a pula (SKIPPED), sem rede.
    const deps = await createChannelRuntime();
    await deps.outbox.enqueue({ tenantId, statementId: statement.id, kind: "charge_create", provider: "asaas", seq: 1, payload: { amountCents: 12_345, dueDate, method: "pix" } }, new Date());

    const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", () => resolve()));
    const port = (server.address() as import("node:net").AddressInfo).port;
    const P = `http://127.0.0.1:${port}/api/v1/platform/billing`;
    const responses: Array<{ route: string; status: number; body: Record<string, any> }> = [];
    const call = async (method: string, route: string, body?: unknown) => {
      const response = await fetch(P + route, {
        method,
        headers: { "content-type": "application/json", "x-user-id": "usr_platform", "x-role": "super_admin" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const entry = { route: `${method} ${route}`, status: response.status, body: (await response.json()) as Record<string, any> };
      responses.push(entry);
      return entry;
    };

    const st = statement.id;
    const attempts = await probeOutbound(port, async () => {
      await call("POST", `/statements/${st}/charge`, { tenantId, method: "pix" });
      await call("POST", `/statements/${st}/charge/cancel`, { tenantId, reason: "cancelamento do caso CA-OFF" });
      await call("POST", `/statements/${st}/charge/cancel-unknown`, { tenantId, chargeId: "pay_ca_off_desconhecida", reason: "cancelamento do caso CA-OFF" });
      await call("GET", `/statements/${st}/charges?tenantId=${tenantId}`);
      const queue = await call("GET", `/outbox?tenantId=${tenantId}`);
      const unknownLine = (queue.body.data as Array<{ id: string; kind: string }>).find((row) => row.kind === "charge_cancel")!;
      await call("POST", `/outbox/${unknownLine.id}/resolve`, { tenantId, reason: "conferência do caso CA-OFF" });
      await call("POST", `/outbox/${unknownLine.id}/retry`, { tenantId });
    });
    assert.deepEqual(attempts, [], "as 7 rotas: 0 conexões de saída");

    const outcome = responses.map((entry) => [
      entry.route.replace(st, ":st").replace(/outbox\/[0-9a-f-]{36}/, "outbox/:id").replace(/tenantId=[^&]+/, "tenantId="),
      entry.status,
      entry.body.error?.reason ?? entry.body.data?.result ?? null,
    ]);
    assert.deepEqual(outcome, [
      ["POST /statements/:st/charge", 422, "payment_provider_disabled"],
      ["POST /statements/:st/charge/cancel", 200, "skipped"],
      ["POST /statements/:st/charge/cancel-unknown", 200, "cancel_enqueued"],
      ["GET /statements/:st/charges?tenantId=", 200, null],
      ["GET /outbox?tenantId=", 200, null],
      ["POST /outbox/:id/resolve", 422, "outbox_not_in_review"],
      ["POST /outbox/:id/retry", 422, "outbox_not_failed"],
    ]);
    const lines = await deps.outbox.listForTenant(tenantId, {});
    assert.deepEqual(
      lines.map((row) => [row.kind, row.status, row.lastError]),
      [
        ["charge_create", "SKIPPED", "charge_cancel_requested"],
        ["charge_cancel", "PENDING", null],
      ],
      "o charge/cancel e o cancel-unknown gravaram a fila, sem rede",
    );

    // CV2: nenhuma resposta traz o payload, o tenantId, segredo, token ou a chave do cofre.
    const secrets = [vaultKey, "token-ficticio-ca-off", "TOKEN-FAKE"];
    assert.deepEqual(responses.flatMap((entry) => forbiddenIn(entry.body, secrets, entry.route)), [], "CV2");
  } finally {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    Object.assign(mutableEnv, previous);
    resetVaultRuntimeForTests();
    resetChannelRuntimeForTests();
  }
});

// ─── Conserto da J-569 (leva A) ─────────────────────────────────────────────────────────────────────────────────────────
// C1-01 + C2-01 + C3-01: as regras da cópia em MEMÓRIA da fila (`InMemoryOutboxRepository`), pelas rotas da plataforma no
// modo memória (`CORE_SAAS_PERSISTENCE=memory`) e com o canal desligado. Cada regra tem um teste que fica VERMELHO sem ela
// (as mutações X-MEM-TEN-RESOLVE, X-MEM-TEN-LIST, X-MEM-TEN-RETRY, X-RS1-MEM, S-RS9-memoria e M-CC8-memoria da junta). A
// cópia Prisma tem os mesmos casos nos `-db` (RS1, RS3, RS3b, RS9 e CC8).
// C2-05: o 403 das 7 rotas novas para quem não é da plataforma (sem ator, e cada papel de organização por cabeçalho e por
// JWT), com o controle (cada papel de plataforma não é negado). Tirar a guarda de qualquer uma das 7 rotas fica VERMELHO.

const J569_PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;

/** O dia civil de São Paulo daqui a `days` dias (nunca a data UTC, nunca um literal que envelhece). */
function j569Day(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

type J569Fixture = { readonly tenantId: string; readonly statementId: string };
type J569Platform = {
  readonly deps: Awaited<ReturnType<typeof createChannelRuntime>>;
  readonly call: (method: string, route: string, body?: unknown, headers?: Record<string, string>) => Promise<{ status: number; body: Record<string, any> }>;
  /** Uma organização nova, com um demonstrativo `closed` cujo vencimento ainda vale. */
  readonly organization: () => Promise<J569Fixture>;
  /** Uma linha da fila levada a FAILED ou NEEDS_REVIEW pelo caminho do despacho (enqueue → claim → mark), com o `lastError`. */
  readonly line: (fixture: J569Fixture, kind: "charge_cancel", seq: number, payload: Record<string, unknown>, to: "FAILED" | "NEEDS_REVIEW", lastError: string) => Promise<string>;
};

/** O app real no modo memória, com o canal desligado; os dublês são zerados antes e o ambiente é devolvido no fim. */
async function withMemoryPlatform(fn: (platform: J569Platform) => Promise<void>): Promise<void> {
  const previous = { ...mutableEnv };
  let server: import("node:http").Server | undefined;
  try {
    mutableEnv.CORE_SAAS_PERSISTENCE = "memory";
    mutableEnv.BILLING_PROVIDERS_ENABLED = false;
    mutableEnv.NODE_ENV = "test";
    await arrangeEnabledProviders();
    const [{ createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, statementFactory, { leaseOf }, { OUTBOX_ORPHAN_MS }] = await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
      import("../src/modules/subscription-billing/statements/statement.factory.js"),
      import("../src/modules/subscription-billing/outbox/outbox.repository.js"),
      import("../src/modules/subscription-billing/outbox/outbox.types.js"),
    ]);
    statementFactory.resetStatementRuntimeForTests();
    const deps = await createChannelRuntime();
    const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", () => resolve()));
    const base = `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}/api/v1/platform/billing`;
    const call: J569Platform["call"] = async (method, route, body, headers = J569_PLATFORM) => {
      const response = await fetch(base + route, {
        method,
        headers: { "content-type": "application/json", ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: (await response.json().catch(() => ({}))) as Record<string, any> };
    };
    const dueDate = j569Day(10);
    const organization = async (): Promise<J569Fixture> => {
      const tenantId = randomUUID();
      const statement = await statementFactory.getMemoryStatementRepositoryForTests().transaction(tenantId, async (tx) => {
        const { statement: fresh } = await tx.insertIfAbsentAndLock({ tenantId, period: "2026-10" });
        return tx.saveStatement({ ...fresh, status: "closed", totalCents: 12_345, dueDate, closedAt: new Date() });
      });
      return { tenantId, statementId: statement.id };
    };
    const line: J569Platform["line"] = async (fixture, kind, seq, payload, to, lastError) => {
      const now = new Date();
      const { row } = await deps.outbox.enqueue({ ...fixture, kind, provider: "asaas", seq, payload }, now);
      const claimed = await deps.outbox.claimNext({ enabledProviders: ["asaas"], now, claimedBy: "j569-mem", orphanMs: OUTBOX_ORPHAN_MS, verdict: () => ({ kind: "eligible" }) });
      assert.equal(claimed?.kind, "claimed");
      assert.equal(claimed!.row.id, row.id, "o claim pegou a linha do caso");
      const lease = leaseOf(claimed!.row);
      const marked =
        to === "FAILED"
          ? await deps.outbox.markFailed(fixture.tenantId, row.id, lastError, now, lease)
          : await deps.outbox.markNeedsReview(fixture.tenantId, row.id, lastError, now, lease);
      assert.ok(marked);
      assert.deepEqual([(await deps.outbox.findById(fixture.tenantId, row.id))?.status, (await deps.outbox.findById(fixture.tenantId, row.id))?.lastError], [to, lastError]);
      return row.id;
    };
    await fn({ deps, call, organization, line });
  } finally {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    Object.assign(mutableEnv, previous);
    resetVaultRuntimeForTests();
    resetChannelRuntimeForTests();
  }
}

test("J569-MEM1 (memória): /resolve com o tenantId de OUTRA organização → 404 outbox_not_found, sem dado, e a linha continua NEEDS_REVIEW", async () => {
  await withMemoryPlatform(async ({ deps, call, organization, line }) => {
    const owner = await organization();
    const other = await organization();
    const id = await line(owner, "charge_cancel", 1, { chargeId: "pay_j569_m1" }, "NEEDS_REVIEW", "charge_state_unknown");
    const foreign = await call("POST", `/outbox/${id}/resolve`, { tenantId: other.tenantId, reason: "conferência do caso J569-MEM1" });
    assert.equal(foreign.status, 404, JSON.stringify(foreign.body));
    assert.equal(foreign.body.error?.reason, "outbox_not_found");
    assert.equal(foreign.body.data, undefined);
    assert.equal((await deps.outbox.findById(owner.tenantId, id))?.status, "NEEDS_REVIEW", "a linha da dona não muda");
    // Controle: a dona resolve a mesma linha.
    const own = await call("POST", `/outbox/${id}/resolve`, { tenantId: owner.tenantId, reason: "conferência do caso J569-MEM1" });
    assert.equal(own.status, 200, JSON.stringify(own.body));
  });
});

test("J569-MEM2 (memória): GET /outbox traz SÓ as linhas da organização pedida", async () => {
  await withMemoryPlatform(async ({ call, organization, line }) => {
    const a = await organization();
    const b = await organization();
    const idA = await line(a, "charge_cancel", 1, { chargeId: "pay_j569_m2a" }, "FAILED", "provider_unavailable");
    const idB = await line(b, "charge_cancel", 1, { chargeId: "pay_j569_m2b" }, "FAILED", "provider_unavailable");
    const listA = await call("GET", `/outbox?tenantId=${a.tenantId}`);
    assert.equal(listA.status, 200, JSON.stringify(listA.body));
    assert.deepEqual((listA.body.data as Array<{ id: string }>).map((row) => row.id), [idA]);
    const listB = await call("GET", `/outbox?tenantId=${b.tenantId}&status=FAILED`);
    assert.equal(listB.status, 200, JSON.stringify(listB.body));
    assert.deepEqual((listB.body.data as Array<{ id: string }>).map((row) => row.id), [idB]);
  });
});

test("J569-MEM3 (memória): /retry com o tenantId de OUTRA organização → 404 outbox_not_found, sem dado, e a linha continua FAILED (o retry antigo também não a acha)", async () => {
  await withMemoryPlatform(async ({ deps, call, organization, line }) => {
    const owner = await organization();
    const other = await organization();
    const id = await line(owner, "charge_cancel", 1, { chargeId: "pay_j569_m3" }, "FAILED", "provider_unavailable");
    const foreign = await call("POST", `/outbox/${id}/retry`, { tenantId: other.tenantId });
    assert.equal(foreign.status, 404, JSON.stringify(foreign.body));
    assert.equal(foreign.body.error?.reason, "outbox_not_found");
    assert.equal(foreign.body.data, undefined);
    assert.equal(await deps.outbox.retry(other.tenantId, id, new Date()), undefined, "o retry antigo, com a outra organização, não acha a linha");
    assert.equal((await deps.outbox.findById(owner.tenantId, id))?.status, "FAILED", "a linha da dona não muda");
    // Controle: a dona reabre a mesma linha.
    const own = await call("POST", `/outbox/${id}/retry`, { tenantId: owner.tenantId });
    assert.equal(own.status, 200, JSON.stringify(own.body));
    assert.equal((await deps.outbox.findById(owner.tenantId, id))?.status, "PENDING");
  });
});

test("J569-MEM4 (memória): /resolve → FAILED com o lastError MANTIDO, na resposta, na linha e no previousCode da trilha", async () => {
  await withMemoryPlatform(async ({ deps, call, organization, line }) => {
    const owner = await organization();
    const id = await line(owner, "charge_cancel", 1, { chargeId: "pay_j569_m4" }, "NEEDS_REVIEW", "charge_state_unknown");
    const response = await call("POST", `/outbox/${id}/resolve`, { tenantId: owner.tenantId, reason: "conferência do caso J569-MEM4" });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual([response.body.data?.status, response.body.data?.lastError], ["FAILED", "charge_state_unknown"]);
    const row = await deps.outbox.findById(owner.tenantId, id);
    assert.deepEqual([row?.status, row?.lastError], ["FAILED", "charge_state_unknown"]);
    const audits = (deps.outbox as unknown as { audits: Array<{ entityId: string; action: string; metadata: Record<string, unknown> }> }).audits.filter((entry) => entry.entityId === id);
    assert.deepEqual(audits.map((entry) => [entry.action, entry.metadata.previousCode]), [["billing_outbox.resolved", "charge_state_unknown"]]);
  });
});

test("J569-MEM5 (memória): /retry com dueDate numa linha charge_cancel FAILED → 422 due_date_not_applicable, e a linha continua FAILED", async () => {
  await withMemoryPlatform(async ({ deps, call, organization, line }) => {
    const owner = await organization();
    const id = await line(owner, "charge_cancel", 1, { chargeId: "pay_j569_m5" }, "FAILED", "provider_unavailable");
    const response = await call("POST", `/outbox/${id}/retry`, { tenantId: owner.tenantId, dueDate: j569Day(5) });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "due_date_not_applicable");
    const row = await deps.outbox.findById(owner.tenantId, id);
    assert.equal(row?.status, "FAILED");
    assert.equal("dueDate" in (row?.payload ?? {}), false, "nada regravado no payload");
    // Controle: sem a data, a mesma linha reabre.
    const without = await call("POST", `/outbox/${id}/retry`, { tenantId: owner.tenantId });
    assert.equal(without.status, 200, JSON.stringify(without.body));
  });
});

test("J569-MEM6 (memória): [RETRY-CANCEL-ONE] — /retry de charge_cancel FAILED com outro charge_cancel vivo da MESMA cobrança → 409 charge_cancel_in_progress; de OUTRA cobrança, reabre", async () => {
  await withMemoryPlatform(async ({ deps, call, organization, line }) => {
    // As 2 linhas FAILED nascem antes dos 2 cancelamentos vivos: o claim do arnês pega a PENDING mais antiga.
    const same = await organization();
    const distinct = await organization();
    const id = await line(same, "charge_cancel", 1, { chargeId: "pay_j569_m6" }, "FAILED", "provider_unavailable");
    const otherId = await line(distinct, "charge_cancel", 1, { chargeId: "pay_j569_m6a" }, "FAILED", "provider_unavailable");
    const { row: live } = await deps.outbox.enqueue({ ...same, kind: "charge_cancel", provider: "asaas", seq: 2, payload: { chargeId: "pay_j569_m6" } }, new Date());
    assert.equal(live.status, "PENDING");
    const conflict = await call("POST", `/outbox/${id}/retry`, { tenantId: same.tenantId });
    assert.equal(conflict.status, 409, JSON.stringify(conflict.body));
    assert.equal(conflict.body.error?.reason, "charge_cancel_in_progress");
    assert.equal((await deps.outbox.findById(same.tenantId, id))?.status, "FAILED");
    // Controle: o cancelamento vivo é de OUTRA cobrança do demonstrativo → não conflita.
    await deps.outbox.enqueue({ ...distinct, kind: "charge_cancel", provider: "asaas", seq: 2, payload: { chargeId: "pay_j569_m6b" } }, new Date());
    const reopened = await call("POST", `/outbox/${otherId}/retry`, { tenantId: distinct.tenantId });
    assert.equal(reopened.status, 200, JSON.stringify(reopened.body));
    assert.equal((await deps.outbox.findById(distinct.tenantId, otherId))?.status, "PENDING");
  });
});

test("J569-403: as 7 rotas novas da plataforma negam quem não é da plataforma (403, sem `data`): sem ator, e cada papel de organização por cabeçalho e por JWT; os papéis de plataforma (controle) não são negados", async () => {
  await withMemoryPlatform(async ({ call }) => {
    const [{ ROLE_AUTHORITY }, { signAccessToken }] = await Promise.all([
      import("../src/modules/core-saas/permissions/catalog.js"),
      import("../src/modules/auth/services/jwt.service.js"),
    ]);
    const T = randomUUID();
    const ST = randomUUID();
    const OB = randomUUID();
    const routes: Array<readonly [string, string, unknown]> = [
      ["GET", `/statements/${ST}/charges?tenantId=${T}`, undefined],
      ["POST", `/statements/${ST}/charge`, { tenantId: T, method: "pix" }],
      ["POST", `/statements/${ST}/charge/cancel`, { tenantId: T, reason: "motivo do operador para cancelar" }],
      ["POST", `/statements/${ST}/charge/cancel-unknown`, { tenantId: T, chargeId: "pay_j569_403", reason: "motivo do operador para cancelar" }],
      ["GET", `/outbox?tenantId=${T}`, undefined],
      ["POST", `/outbox/${OB}/resolve`, { tenantId: T, reason: "motivo do operador para resolver" }],
      ["POST", `/outbox/${OB}/retry`, { tenantId: T }],
    ];
    const authority = Object.entries(ROLE_AUTHORITY as Record<string, string>);
    const tenantRoles = authority.filter(([, kind]) => kind === "tenant").map(([role]) => role);
    const platformRoles = authority.filter(([, kind]) => kind === "platform").map(([role]) => role);
    assert.ok(tenantRoles.length > 0 && platformRoles.length > 0, "o catálogo tem papéis dos dois lados");
    const actors: Array<{ readonly label: string; readonly headers: Record<string, string>; readonly deny: boolean }> = [{ label: "sem-ator", headers: {}, deny: true }];
    for (const role of tenantRoles) actors.push({ label: `cabeçalho:${role}`, headers: { "x-tenant-id": T, "x-user-id": `usr_${role}`, "x-role": role }, deny: true });
    for (const role of tenantRoles) {
      const token = await signAccessToken({ user_id: randomUUID(), tenant_id: T, email: `${role}@example.com`, roles: [role] });
      actors.push({ label: `jwt:${role}`, headers: { authorization: `Bearer ${token}` }, deny: true });
    }
    for (const role of platformRoles) actors.push({ label: `controle-cabeçalho:${role}`, headers: { "x-user-id": `usr_${role}`, "x-role": role }, deny: false });
    const platformToken = await signAccessToken({ user_id: randomUUID(), tenant_id: T, email: "platform_admin@example.com", roles: ["platform_admin"] });
    actors.push({ label: "controle-jwt:platform_admin", headers: { authorization: `Bearer ${platformToken}` }, deny: false });

    const wrong: string[] = [];
    let denied = 0;
    for (const actor of actors) {
      for (const [method, route, body] of routes) {
        const response = await call(method, route, body, actor.headers);
        const where = `${actor.label} ${method} ${route.replace(T, ":T").replace(ST, ":st").replace(OB, ":id")} → ${response.status}`;
        if (actor.deny) {
          const expected = actor.label === "sem-ator" ? [401, 403] : [403];
          if (!expected.includes(response.status) || response.body.data !== undefined) wrong.push(where);
          else denied += 1;
        } else if (response.status === 401 || response.status === 403) {
          wrong.push(`CONTROLE ${where}`);
        }
      }
    }
    assert.deepEqual(wrong, []);
    assert.equal(denied, actors.filter((actor) => actor.deny).length * routes.length, "toda chamada negada foi contada");
  });
});
