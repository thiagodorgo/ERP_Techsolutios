import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { booleanFlag, envSchema } from "../src/config/env.js";

// B1 — `z.coerce.boolean()` transforma a STRING "false" em true. `booleanFlag` conserta isso:
// só "true"/"1"/"yes"/"on" ligam; "false"/"0"/""/unset desligam.

test("B1: booleanFlag parseia strings de forma estrita (false não vira true)", () => {
  const schema = z.object({ FLAG: booleanFlag(false) });
  assert.equal(schema.parse({ FLAG: "false" }).FLAG, false);
  assert.equal(schema.parse({ FLAG: "0" }).FLAG, false);
  assert.equal(schema.parse({ FLAG: "" }).FLAG, false);
  assert.equal(schema.parse({ FLAG: "no" }).FLAG, false);
  assert.equal(schema.parse({}).FLAG, false); // default
  assert.equal(schema.parse({ FLAG: "true" }).FLAG, true);
  assert.equal(schema.parse({ FLAG: "1" }).FLAG, true);
  assert.equal(schema.parse({ FLAG: "TRUE" }).FLAG, true);
  assert.equal(schema.parse({ FLAG: true }).FLAG, true);
});

const PROD_BASE = {
  NODE_ENV: "production",
  JWT_SECRET: "a-real-production-secret",
  JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
  // Ω-INFRA-3 (P-SAN-CORS): produção agora exige allowlist de CORS explícita (o gate rejeita vazio/'*').
  CORS_ORIGIN: "https://app.exemplo.com",
  // Ω5P PR-16 — os 4 gates de produção do portal público (secrets próprios ≠ JWT do ERP, binding de tenant, CORS
  // allowlist). Estas fixtures parseiam com SUCESSO, então precisam satisfazê-los.
  PORTAL_SESSION_SECRET: "a-real-production-portal-session-secret",
  PORTAL_LOG_SECRET: "a-real-production-portal-log-secret",
  // Ω5P PR-18a — o authority-portal somou o secret de sessão próprio obrigatório em produção (≠ owner ≠ ERP).
  PORTAL_AUTHORITY_SESSION_SECRET: "a-real-production-authority-session-secret",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com",
  // B-O6R-05 — gates de RUNTIME de produção (Ω6R-DAT-001 + Ω6R-DIN-006). Esta fixture é usada por dois
  // testes que afirmam SUCESSO (o `parse` do B1 e o self-host do R11), então precisa satisfazê-los: sem isto
  // o `envSchema.parse` abaixo LANÇA e o caso do provedor próprio passaria a medir a rejeição errada.
  CORE_SAAS_PERSISTENCE: "prisma",
  DATABASE_URL: "postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public",
  JOBS_WORKER_ENABLED: "true",
  REDIS_URL: "redis://redis.interno.exemplo.com:6379",
};

test("B1: GEOCODING_ENABLED=false realmente desliga (não coage para true)", () => {
  const parsed = envSchema.parse({ ...PROD_BASE, GEOCODING_ENABLED: "false" });
  assert.equal(parsed.GEOCODING_ENABLED, false);
});

test("R11: produção + geocoding ligado + Nominatim público → schema REJEITA", () => {
  const result = envSchema.safeParse({
    ...PROD_BASE,
    GEOCODING_ENABLED: "true",
    NOMINATIM_BASE_URL: "https://nominatim.openstreetmap.org/search",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path.includes("GEOCODING_ENABLED")));
  }
});

test("R11: produção + geocoding ligado + provedor PRÓPRIO (self-host) → schema aceita", () => {
  const result = envSchema.safeParse({
    ...PROD_BASE,
    GEOCODING_ENABLED: "true",
    NOMINATIM_BASE_URL: "https://geo.interno.exemplo.com/search",
  });
  assert.equal(result.success, true);
});

// Regressão B-O6R-05: `booleanFlag` é compartilhada por GEOCODING_ENABLED e JOBS_WORKER_ENABLED. Trocá-la por
// `z.coerce.boolean()` religaria o geocoding com a string "false" (B1) E faria o gate do worker aceitar
// exatamente o ambiente que ele existe para barrar. Um teste, os dois efeitos — para que a troca não passe.
test("regressão: o parse estrito de booleanFlag vale para o geocoding E para o worker de jobs", () => {
  // B1: "false" não vira true no geocoding.
  assert.equal(envSchema.parse({ ...PROD_BASE, GEOCODING_ENABLED: "false" }).GEOCODING_ENABLED, false);

  // Ω6R-DIN-006: "false" também não vira true no worker — e em produção isso REPROVA o boot.
  const workerDesligado = envSchema.safeParse({ ...PROD_BASE, JOBS_WORKER_ENABLED: "false" });
  assert.equal(workerDesligado.success, false);
  if (!workerDesligado.success) {
    assert.ok(workerDesligado.error.issues.some((issue) => issue.path.includes("JOBS_WORKER_ENABLED")));
  }
});

test("R11: desenvolvimento + Nominatim público ligado → permitido (só prod é barrado)", () => {
  const result = envSchema.safeParse({
    NODE_ENV: "development",
    GEOCODING_ENABLED: "true",
    NOMINATIM_BASE_URL: "https://nominatim.openstreetmap.org/search",
  });
  assert.equal(result.success, true);
});
