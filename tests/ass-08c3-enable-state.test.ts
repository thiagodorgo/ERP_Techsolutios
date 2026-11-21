// B-ASS-08c3 · F-A3 · EN6t — a prova de compilação fica em
// `src/modules/subscription-billing/providers/provider-config.enable-state.typecheck.ts` (o tsconfig só inclui `src/**`).
// Aqui o teste-dono apenas exercita o módulo para amarrar o id à trilha de testes.

import assert from "node:assert/strict";
import test from "node:test";

import {
  enableStateMissingHops,
  enableStateMissingNodeEnv,
} from "../src/modules/subscription-billing/providers/provider-config.enable-state.typecheck.js";

test("EN6t · o guard de tipo P-557 é compilado e exercitável", () => {
  assert.equal(enableStateMissingNodeEnv().provider, "asaas");
  assert.equal(enableStateMissingHops().provider, "asaas");
});