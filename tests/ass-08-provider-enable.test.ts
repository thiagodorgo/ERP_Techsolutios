// B-ASS-08 · F9 (núcleo invariante) — precondições de habilitação (G14, R-CFG-1) fail-closed e o guard R-CFG-2
// ("enabled: true" só em provider-config.service.ts). A persistência do liga/desliga e test-connection/register-webhook/
// emitter/metrics pareiam com a M5 e a montagem de rotas (fora desta execução; declarado no diário).

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { evaluateEnablePreconditions, type EnablePreconditionState } from "../src/modules/subscription-billing/providers/provider-config.service.js";

const NOW = new Date("2026-12-01T12:00:00Z");

function baseState(overrides: Partial<EnablePreconditionState> = {}): EnablePreconditionState {
  return {
    provider: "asaas",
    kind: "payment",
    environment: "sandbox",
    channelEnabledByEnv: true,
    apiTokenReadable: true,
    lastTestOk: true,
    lastTestAt: new Date(NOW.getTime() - 60_000),
    lastTestEnvironment: "sandbox",
    webhookRegistrationMode: "api",
    webhookRegisteredEnvironment: "sandbox",
    webhookSecretPresent: false,
    fiscalComplete: true,
    otherProviderEnabledForKind: false,
    confirm: "asaas:sandbox",
    now: NOW,
    ...overrides,
  };
}

test("R-CFG-1 todas as precondições satisfeitas → ok", () => {
  assert.deepEqual(evaluateEnablePreconditions(baseState()), { ok: true });
});

test("R-CFG-1 os 7+1 casos negativos recusam com enable_preconditions_failed e a lista do que falta", () => {
  const cases: Array<[Partial<EnablePreconditionState>, string]> = [
    [{ channelEnabledByEnv: false }, "channel_disabled_by_env"],
    [{ apiTokenReadable: false }, "api_token_not_readable"],
    [{ lastTestOk: null }, "last_test_required"],
    [{ lastTestEnvironment: "production" }, "last_test_environment_mismatch"],
    [{ lastTestAt: new Date(NOW.getTime() - 31 * 60_000) }, "last_test_expired"],
    [{ webhookRegisteredEnvironment: "production" }, "webhook_not_registered_for_environment"],
    [{ kind: "invoice", provider: "focusnfe", confirm: "focusnfe:sandbox", fiscalComplete: false }, "fiscal_data_incomplete"],
    [{ otherProviderEnabledForKind: true }, "another_provider_enabled_for_kind"],
    [{ confirm: "asaas:production" }, "confirm_mismatch"],
  ];
  for (const [patch, reason] of cases) {
    const decision = evaluateEnablePreconditions(baseState(patch));
    assert.equal(decision.ok, false, `esperava recusa para ${reason}`);
    if (decision.ok) continue;
    assert.equal(decision.reason, "enable_preconditions_failed");
    assert.ok(decision.failed.includes(reason), `${reason} deveria estar na lista: ${decision.failed.join(",")}`);
  }
});

test("R-CFG-3 Mercado Pago (registro manual): exige o webhook_secret colado, não o registro por API", () => {
  const mpBase = baseState({ provider: "mercadopago", confirm: "mercadopago:sandbox", webhookRegistrationMode: "manual", webhookRegisteredEnvironment: null });
  assert.equal(evaluateEnablePreconditions({ ...mpBase, webhookSecretPresent: false }).ok, false);
  assert.deepEqual(evaluateEnablePreconditions({ ...mpBase, webhookSecretPresent: true }), { ok: true });
});

test("R-CFG-2 guard de texto: 'enabled: true' só pode aparecer em provider-config.service.ts", () => {
  const root = fileURLToPath(new URL("../src/modules/subscription-billing", import.meta.url));
  const offenders: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!full.endsWith(".ts")) continue;
      if (/enabled\s*:\s*true/.test(readFileSync(full, "utf8")) && !full.endsWith("provider-config.service.ts")) {
        offenders.push(full);
      }
    }
  };
  walk(root);
  assert.deepEqual(offenders, [], "nenhum caminho fora do serviço grava enabled: true");
});
