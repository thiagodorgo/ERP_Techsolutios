// B-ASS-08c3, conserto único do #608 (fix-608b-cl), A-02 (plano §4.3): o `enable` monta o estado das precondições com o que foi
// lido SOB A TRAVA, inclusive o cofre, para o AMBIENTE da linha travada — nunca com uma leitura anterior à trava.
//
// A cena da pré-revisão `prerev-608-a-cx2` (A-02): a leitura sem trava vê `sandbox` (com credenciais de sandbox); a linha
// travada já está em `production` (o `PUT` mudou o ambiente entre as duas), com teste e webhook de produção, e o cofre NÃO tem
// credencial de produção. Esperado: 422 `enable_preconditions_failed` com `api_token_not_readable`, e o cofre consultado para
// `production`. Controle: com a credencial de produção no cofre, liga em produção.
import assert from "node:assert/strict";
import test from "node:test";

import { env } from "../src/config/env.js";
import type { ProviderConfig, ProviderConfigRepository, ProviderEnableEffect } from "../src/modules/subscription-billing/providers/provider-config.repository.js";
import { ProviderConfigService, type ProviderCredentialSummaries } from "../src/modules/subscription-billing/providers/provider-config.service.js";

const NOW = new Date("2026-11-20T12:00:00.000Z");

function row(environment: "sandbox" | "production"): ProviderConfig {
  return {
    provider: "asaas",
    kind: "payment",
    environment,
    enabled: false,
    enabledEnvironment: null,
    enabledAt: null,
    enabledBy: null,
    settings: {},
    lastTestAt: new Date(NOW.getTime() - 60_000),
    lastTestOk: true,
    lastTestEnvironment: environment,
    lastTestError: null,
    webhookRegisteredAt: NOW,
    webhookRegisteredEnvironment: environment,
    webhookExternalId: "wh_1",
    webhookPublicUrl: "https://exemplo.invalid/api/v1/webhooks/billing/asaas",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

/** A leitura SEM trava vê `sandbox`; a travada (dentro de `enableLocked`) já vê `production`. */
function racingRepository(): ProviderConfigRepository & { enabledWith: ProviderEnableEffect[] } {
  const enabledWith: ProviderEnableEffect[] = [];
  return {
    enabledWith,
    get: async () => row("sandbox"),
    list: async () => [row("sandbox")],
    upsert: async () => row("sandbox"),
    recordTest: async () => row("sandbox"),
    recordWebhook: async () => row("sandbox"),
    setEnabled: async () => row("production"),
    async enableLocked(_provider: string, _now: Date, decide: (locked: ProviderConfig | null, peers: readonly ProviderConfig[]) => ProviderEnableEffect | null | Promise<ProviderEnableEffect | null>) {
      const locked = row("production");
      const effect = await decide(locked, [locked]);
      if (!effect) return { locked, updated: null };
      enabledWith.push(effect);
      return { locked, updated: { ...locked, enabled: true, enabledEnvironment: effect.environment, enabledAt: NOW, enabledBy: effect.actorId } };
    },
  } as unknown as ProviderConfigRepository & { enabledWith: ProviderEnableEffect[] };
}

function vault(environments: readonly string[]): ProviderCredentialSummaries & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async list(_provider, environment) {
      calls.push(`list:${environment}`);
      return environments.includes(environment)
        ? ([{ kind: "api_token" }, { kind: "webhook_secret" }] as unknown as Awaited<ReturnType<ProviderCredentialSummaries["list"]>>)
        : [];
    },
    async readability(_provider, environment) {
      calls.push(`readability:${environment}`);
      return { configured: environments.includes(environment), readable: environments.includes(environment) };
    },
  };
}

function service(repository: ProviderConfigRepository, credentials: ProviderCredentialSummaries) {
  return new ProviderConfigService(repository, credentials, () => NOW, { payment: () => ({}) as never, invoice: () => null });
}

async function withChannelOn<T>(run: () => Promise<T>): Promise<T> {
  const mutableEnv = env as unknown as { BILLING_PROVIDERS_ENABLED: boolean };
  const before = mutableEnv.BILLING_PROVIDERS_ENABLED;
  mutableEnv.BILLING_PROVIDERS_ENABLED = true;
  try {
    return await run();
  } finally {
    mutableEnv.BILLING_PROVIDERS_ENABLED = before;
  }
}

test("EN-TRAVA (A-02): o ambiente travado é production e o cofre só tem sandbox → 422 api_token_not_readable, nada ligado", async () => {
  const repository = racingRepository();
  const credentials = vault(["sandbox"]);
  await withChannelOn(async () => {
    await assert.rejects(
      () => service(repository, credentials).enable("asaas", { confirm: "asaas:production" }, "usr_platform"),
      (error: { statusCode?: number; reason?: string; details?: { failed?: readonly string[] } }) => {
        assert.equal(error.statusCode, 422);
        assert.equal(error.reason, "enable_preconditions_failed");
        assert.deepEqual(error.details?.failed, ["api_token_not_readable"]);
        return true;
      },
    );
  });
  assert.deepEqual(repository.enabledWith, [], "nada foi ligado");
  assert.deepEqual([...credentials.calls].sort(), ["list:production", "readability:production"], "o cofre é lido para o ambiente da linha travada, só para ele");
});

test("EN-TRAVA-controle: com a credencial de produção no cofre, liga em production", async () => {
  const repository = racingRepository();
  const credentials = vault(["sandbox", "production"]);
  const outcome = await withChannelOn(() => service(repository, credentials).enable("asaas", { confirm: "asaas:production" }, "usr_platform"));
  assert.equal(outcome.environment, "production");
  assert.deepEqual(repository.enabledWith.map((effect) => effect.environment), ["production"]);
});
