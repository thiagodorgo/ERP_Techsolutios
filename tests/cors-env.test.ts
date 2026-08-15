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
  // Ω5P PR-16 — o portal público adiciona 4 gates de produção (secrets próprios + binding de tenant + CORS
  // allowlist). Estas fixtures afirmam parse com SUCESSO, então precisam satisfazer os novos gates (distintos
  // do JWT do ERP — o gate defense-in-depth rejeita PORTAL_SESSION_SECRET===JWT_SECRET em produção).
  PORTAL_SESSION_SECRET: "a-real-production-portal-session-secret",
  PORTAL_LOG_SECRET: "a-real-production-portal-log-secret",
  // Ω5P PR-18a — o authority-portal somou o secret de sessão próprio obrigatório em produção (≠ owner ≠ ERP).
  PORTAL_AUTHORITY_SESSION_SECRET: "a-real-production-authority-session-secret",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com",
  // B-O6R-05 — os gates de RUNTIME de produção (Ω6R-DAT-001 + Ω6R-DIN-006): persistência prisma, banco
  // declarado, worker de jobs ligado e Redis fora do loopback. Esta fixture afirma parse com SUCESSO em
  // alguns casos, então precisa satisfazê-los — senão o teste do CORS mediria a rejeição errada.
  CORE_SAAS_PERSISTENCE: "prisma",
  DATABASE_URL: "postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public",
  JOBS_WORKER_ENABLED: "true",
  REDIS_URL: "redis://redis.interno.exemplo.com:6379",
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

// Regressão B-O6R-05: os gates de runtime NÃO afrouxaram o gate do CORS, e o gate do CORS não encobre os de
// runtime. As duas direções, porque o risco de somar gate a um `superRefine` é justamente uma condição nova
// mascarar a antiga (ou a antiga passar a ser a única que dispara).
test("regressão: o gate do CORS e os gates de runtime disparam de forma INDEPENDENTE", () => {
  // CORS inválido com TODOS os gates de runtime satisfeitos → ainda é o CORS que reprova.
  const corsRuim = envSchema.safeParse({ ...PROD_BASE, CORS_ORIGIN: "*" });
  assert.equal(corsRuim.success, false);
  if (!corsRuim.success) {
    assert.ok(corsRuim.error.issues.some((issue) => issue.path.includes("CORS_ORIGIN")));
  }

  // CORS válido com o agregado core-saas em memória → reprova pela persistência, não pelo CORS.
  const memoria = envSchema.safeParse({
    ...PROD_BASE,
    CORS_ORIGIN: "https://app.exemplo.com",
    CORE_SAAS_PERSISTENCE: "memory",
  });
  assert.equal(memoria.success, false);
  if (!memoria.success) {
    assert.ok(memoria.error.issues.some((issue) => issue.path.includes("CORE_SAAS_PERSISTENCE")));
    assert.ok(!memoria.error.issues.some((issue) => issue.path.includes("CORS_ORIGIN")));
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
