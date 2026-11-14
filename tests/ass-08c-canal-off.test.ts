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
