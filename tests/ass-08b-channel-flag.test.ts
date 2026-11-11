// B-ASS-08b · PR530-02 — o teste-DONO da flag `BILLING_PROVIDERS_ENABLED` nos dois compositores de PRODUÇÃO do canal:
// `resolveWebhookTargetFromRuntime` (o alvo do webhook; `null` ⇒ 404 padrão) e `enabledPaymentPorts` /
// `enabledInvoicePorts` (as portas que o dispatcher da outbox usa). Os outros testes injetam o resolvedor ou as portas e
// passam POR CIMA da flag; aqui nada é injetado no compositor: o cofre é o de memória do próprio `createDefaultVaultRuntime`
// (chave de teste gerada na hora) e os provedores estão LIGADOS e configurados. Assim a ÚNICA variável entre os casos é a
// flag lida do `env` — o mesmo objeto que o código de produção lê.
//
// Vermelho-controle (diário da 08b, linha PR530-02): apagar `if (!env.BILLING_PROVIDERS_ENABLED) return null;` em
// webhooks/webhook-runtime.ts, ou `if (!env.BILLING_PROVIDERS_ENABLED) return {};` em `enabledPaymentPorts` /
// `enabledInvoicePorts` (outbox/channel.runtime.ts), deixa este arquivo vermelho.

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { env } from "../src/config/env.js";
import { enabledInvoicePorts, enabledPaymentPorts } from "../src/modules/subscription-billing/outbox/channel.runtime.js";
import { createDefaultVaultRuntime, getMemoryVaultForTests, resetVaultRuntimeForTests, setVaultKeysForTests } from "../src/modules/subscription-billing/vault/vault.factory.js";
import { EnvVaultKeyProvider } from "../src/modules/subscription-billing/vault/vault-keys.js";
import { resolveWebhookTargetFromRuntime } from "../src/modules/subscription-billing/webhooks/webhook-runtime.js";

type MutableEnv = { BILLING_PROVIDERS_ENABLED: boolean; CORE_SAAS_PERSISTENCE: string };
const mutableEnv = env as unknown as MutableEnv;

/** Cofre de memória DISPONÍVEL (chave de teste gerada agora, nunca versionada) com Asaas e Focus NFe configurados e LIGADOS. */
async function arrangeEnabledProviders(): Promise<void> {
  resetVaultRuntimeForTests();
  setVaultKeysForTests(new EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }));
  const { configs } = getMemoryVaultForTests();
  const now = new Date();
  await configs.upsert({ provider: "asaas", kind: "payment", environment: "sandbox", settings: {} }, now);
  await configs.upsert({ provider: "focusnfe", kind: "invoice", environment: "sandbox", settings: {} }, now);
  configs.setEnabledForTests("asaas", true);
  configs.setEnabledForTests("focusnfe", true);
}

async function observe(): Promise<{ asaas: string | null; focusnfe: string | null; payment: string[]; invoice: string[] }> {
  const asaas = await resolveWebhookTargetFromRuntime("asaas");
  const focusnfe = await resolveWebhookTargetFromRuntime("focusnfe");
  const runtime = await createDefaultVaultRuntime();
  return {
    asaas: asaas?.provider ?? null,
    focusnfe: focusnfe?.provider ?? null,
    payment: Object.keys(await enabledPaymentPorts(runtime)).sort(),
    invoice: Object.keys(await enabledInvoicePorts(runtime)).sort(),
  };
}

const OFF = { asaas: null, focusnfe: null, payment: [], invoice: [] };
const ON = { asaas: "asaas", focusnfe: "focusnfe", payment: ["asaas"], invoice: ["focusnfe"] };

test("PR530-02: a flag BILLING_PROVIDERS_ENABLED decide os compositores de produção — desligada nada liga, ligada liga, e de volta desligada nada liga", async () => {
  const previous = { flag: mutableEnv.BILLING_PROVIDERS_ENABLED, persistence: mutableEnv.CORE_SAAS_PERSISTENCE };
  try {
    // O cofre de memória é o do modo memória (o job `backend-postgres` roda em prisma; aqui o arranjo é o da memória).
    mutableEnv.CORE_SAAS_PERSISTENCE = "memory";
    await arrangeEnabledProviders();

    // Premissa: o padrão do ambiente de teste é a flag DESLIGADA (o mesmo padrão `booleanFlag(false)` da produção).
    assert.equal(previous.flag, false, "premissa: BILLING_PROVIDERS_ENABLED é false por padrão no ambiente de teste");

    // (1) Flag desligada, com o cofre disponível e os dois provedores LIGADOS: nada resolve, nenhuma porta.
    assert.deepEqual(await observe(), OFF, "flag desligada: o compositor ignorou a flag");

    // (2) O MESMO arranjo com a flag ligada: o alvo do webhook e as portas aparecem — a flag é a única diferença.
    mutableEnv.BILLING_PROVIDERS_ENABLED = true;
    assert.deepEqual(await observe(), ON, "flag ligada: o arranjo deveria ligar o canal (controle positivo)");

    // (3) Desligada de novo: volta a não ligar nada (a decisão é lida a cada chamada, não presa na 1ª).
    mutableEnv.BILLING_PROVIDERS_ENABLED = false;
    assert.deepEqual(await observe(), OFF, "flag desligada de novo: o compositor reaproveitou a decisão anterior");
  } finally {
    mutableEnv.BILLING_PROVIDERS_ENABLED = previous.flag;
    mutableEnv.CORE_SAAS_PERSISTENCE = previous.persistence;
    resetVaultRuntimeForTests();
  }
});
