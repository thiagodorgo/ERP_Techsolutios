import assert from "node:assert/strict";
import test from "node:test";

import { isSeedAllowed } from "../prisma/seed-guard.js";

// P-SAN-SEED-GUARD (Ω-INFRA-3) — a guarda impede seed demo em produção. O escape hatch é ESTRITO
// (mesma semântica do booleanFlag do env.ts): 'false'/'0'/'' MANTÊM a guarda armada. Este é o
// footgun que o SecOps/critico apontaram — !e.ALLOW_PROD_SEED trataria '0'/'false' como truthy.

test("fora de produção o seed é sempre permitido", () => {
  assert.equal(isSeedAllowed({ NODE_ENV: "development" }), true);
  assert.equal(isSeedAllowed({ NODE_ENV: "test" }), true);
  assert.equal(isSeedAllowed({}), true); // NODE_ENV ausente = não-produção
});

test("produção SEM opt-in bloqueia o seed", () => {
  assert.equal(isSeedAllowed({ NODE_ENV: "production" }), false);
  assert.equal(isSeedAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "" }), false);
});

test("produção com opt-in ESTRITO verdadeiro libera o seed", () => {
  assert.equal(isSeedAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "1" }), true);
  assert.equal(isSeedAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "true" }), true);
  assert.equal(isSeedAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "TRUE" }), true);
  assert.equal(isSeedAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "yes" }), true);
  assert.equal(isSeedAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "on" }), true);
});

test("produção com '0'/'false'/'no' NÃO desarma a guarda (sem inversão booleana)", () => {
  assert.equal(isSeedAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "0" }), false);
  assert.equal(isSeedAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "false" }), false);
  assert.equal(isSeedAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "no" }), false);
  assert.equal(isSeedAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "off" }), false);
});
