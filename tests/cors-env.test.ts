import assert from "node:assert/strict";
import test from "node:test";

import { envSchema } from "../src/config/env.js";

// P-SAN-CORS (Ω-INFRA-3) — o bare app.use(cors()) refletia qualquer origem ("*"). O gate do env.ts
// endurece o CORS em produção (allowlist explícita, sem curinga), espelhando o gate do JWT. Fora de
// produção o CORS_ORIGIN pode ser vazio (app.ts cai em `origin: true`, permissivo p/ dev).

const PROD_BASE = {
  NODE_ENV: "production",
  JWT_SECRET: "a-real-production-secret",
  JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
};

test("produção SEM CORS_ORIGIN (vazio) → schema REJEITA (fail-closed)", () => {
  const result = envSchema.safeParse({ ...PROD_BASE });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path.includes("CORS_ORIGIN")));
  }
});

test("produção com CORS_ORIGIN='*' → schema REJEITA", () => {
  const result = envSchema.safeParse({ ...PROD_BASE, CORS_ORIGIN: "*" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path.includes("CORS_ORIGIN")));
  }
});

test("produção com curinga PARCIAL ('*.exemplo.com' na lista) → schema REJEITA", () => {
  const result = envSchema.safeParse({
    ...PROD_BASE,
    CORS_ORIGIN: "https://app.exemplo.com,https://*.exemplo.com",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path.includes("CORS_ORIGIN")));
  }
});

test("produção com allowlist explícita (CSV, múltiplas origens) → schema ACEITA e deriva o array", () => {
  const result = envSchema.safeParse({
    ...PROD_BASE,
    CORS_ORIGIN: "https://app.exemplo.com, https://admin.exemplo.com",
  });
  assert.equal(result.success, true);
  if (result.success) {
    // O trim/filter da derivação é exercido no export `env`; aqui garantimos que o valor cru passou.
    assert.equal(result.data.CORS_ORIGIN, "https://app.exemplo.com, https://admin.exemplo.com");
  }
});

test("desenvolvimento com CORS_ORIGIN vazio → schema ACEITA (permissivo; só prod é barrado)", () => {
  const result = envSchema.safeParse({ NODE_ENV: "development" });
  assert.equal(result.success, true);
});

// Regressão (secops C6): o gate CORS não pode ter afrouxado os gates existentes.
test("regressão: produção sem JWT_SECRET continua REJEITANDO", () => {
  const result = envSchema.safeParse({
    NODE_ENV: "production",
    JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
    CORS_ORIGIN: "https://app.exemplo.com",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path.includes("JWT_SECRET")));
  }
});

test("regressão: produção + Nominatim público continua REJEITANDO", () => {
  const result = envSchema.safeParse({
    ...PROD_BASE,
    CORS_ORIGIN: "https://app.exemplo.com",
    GEOCODING_ENABLED: "true",
    NOMINATIM_BASE_URL: "https://nominatim.openstreetmap.org/search",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path.includes("GEOCODING_ENABLED")));
  }
});
