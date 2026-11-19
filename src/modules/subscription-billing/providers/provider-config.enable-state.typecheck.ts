// B-ASS-08c3 · F-A3 · EN6t — guarda de TIPO da P-557: `nodeEnv` e `webhookTrustedProxyHops` são obrigatórios em
// `EnablePreconditionState`.
//
// Mora em `src/` porque o `tsconfig.json` só inclui `src/**`: é o `npm run check` que cobra cada `@ts-expect-error`.
// Se alguém afrouxar o tipo, a diretiva fica sem uso e o `npm run check` REPROVA.

import type { EnablePreconditionState } from "./provider-config.service.js";

const BASE = {
  provider: "asaas",
  kind: "payment",
  environment: "sandbox",
  channelEnabledByEnv: true,
  apiTokenReadable: true,
  lastTestOk: true,
  lastTestAt: new Date("2026-12-01T12:00:00Z"),
  lastTestEnvironment: "sandbox",
  webhookRegistrationMode: "api",
  webhookRegisteredEnvironment: "sandbox",
  webhookSecretPresent: false,
  fiscalComplete: true,
  otherProviderEnabledForKind: false,
  confirm: "asaas:sandbox",
  now: new Date("2026-12-01T12:00:00Z"),
} as const;

export function enableStateMissingNodeEnv(): EnablePreconditionState {
  // @ts-expect-error — nodeEnv é obrigatório (P-557).
  const missingNodeEnv: EnablePreconditionState = { ...BASE, webhookTrustedProxyHops: 1 };
  return missingNodeEnv;
}

export function enableStateMissingHops(): EnablePreconditionState {
  // @ts-expect-error — webhookTrustedProxyHops é obrigatório (P-557).
  const missingHops: EnablePreconditionState = { ...BASE, nodeEnv: "test" };
  return missingHops;
}