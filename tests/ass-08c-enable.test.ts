// B-ASS-08c-wh · teste-dono CA-25: precondição pura dos saltos do proxy.

import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateEnablePreconditions,
  type EnablePreconditionState,
} from "../src/modules/subscription-billing/providers/provider-config.service.js";

const NOW = new Date("2026-11-13T12:00:00.000Z");

function readyState(overrides: Partial<EnablePreconditionState> = {}): EnablePreconditionState {
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

test("EN6 produção e zero saltos confiáveis recusam com webhook_proxy_hops_unset", () => {
  const decision = evaluateEnablePreconditions({
    ...readyState(),
    nodeEnv: "production",
    webhookTrustedProxyHops: 0,
  } as EnablePreconditionState);
  assert.equal(decision.ok, false);
  if (decision.ok) return;
  assert.ok(decision.failed.includes("webhook_proxy_hops_unset"));
});
