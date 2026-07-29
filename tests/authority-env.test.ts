import assert from "node:assert/strict";
import test from "node:test";

import { envSchema } from "../src/config/env.js";

// Ω5P PR-18a — gate de produção do PORTAL_AUTHORITY_SESSION_SECRET (isolamento authority×owner×ERP). Em produção o
// secret PRÓPRIO da sessão do authority-portal é OBRIGATÓRIO e ≠ dev-default; e JAMAIS pode coincidir com o do ERP
// (JWT_SECRET) nem com o do owner (PORTAL_SESSION_SECRET) — isolamento por CONTRATO, não só por audience.

const PROD_OK = {
  NODE_ENV: "production",
  JWT_SECRET: "a-real-production-secret",
  JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
  CORS_ORIGIN: "https://app.exemplo.com",
  PORTAL_SESSION_SECRET: "a-real-production-portal-session-secret",
  PORTAL_LOG_SECRET: "a-real-production-portal-log-secret",
  PORTAL_AUTHORITY_SESSION_SECRET: "a-real-production-authority-session-secret",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com",
};

function rejectsOn(overrides: Record<string, unknown>, path: string): void {
  const merged = { ...PROD_OK, ...overrides } as Record<string, unknown>;
  for (const [key, val] of Object.entries(overrides)) {
    if (val === undefined) delete merged[key];
  }
  const result = envSchema.safeParse(merged);
  assert.equal(result.success, false, `esperava REJEITAR quando ${path} é inválido/ausente`);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path.includes(path)), `esperava issue no caminho ${path}`);
  }
}

test("baseline: produção com PORTAL_AUTHORITY_SESSION_SECRET válido → schema ACEITA", () => {
  assert.equal(envSchema.safeParse(PROD_OK).success, true);
});

test("produção SEM PORTAL_AUTHORITY_SESSION_SECRET → REJEITA (fail-closed)", () => {
  rejectsOn({ PORTAL_AUTHORITY_SESSION_SECRET: undefined }, "PORTAL_AUTHORITY_SESSION_SECRET");
});

test("produção com default de DEV do authority (dev-only-portal-authority-session-change-me) → REJEITA", () => {
  rejectsOn({ PORTAL_AUTHORITY_SESSION_SECRET: "dev-only-portal-authority-session-change-me" }, "PORTAL_AUTHORITY_SESSION_SECRET");
});

test("produção com PORTAL_AUTHORITY_SESSION_SECRET === JWT_SECRET → REJEITA (isolamento authority×ERP)", () => {
  rejectsOn({ PORTAL_AUTHORITY_SESSION_SECRET: PROD_OK.JWT_SECRET }, "PORTAL_AUTHORITY_SESSION_SECRET");
});

test("produção com PORTAL_AUTHORITY_SESSION_SECRET === PORTAL_SESSION_SECRET → REJEITA (isolamento authority×owner)", () => {
  rejectsOn({ PORTAL_AUTHORITY_SESSION_SECRET: PROD_OK.PORTAL_SESSION_SECRET }, "PORTAL_AUTHORITY_SESSION_SECRET");
});

// Fora de produção o gate NÃO se aplica (dev/test injeta o secret por teste).
test("desenvolvimento sem PORTAL_AUTHORITY_SESSION_SECRET → schema ACEITA (só produção é barrada)", () => {
  assert.equal(envSchema.safeParse({ NODE_ENV: "development" }).success, true);
});

// Regressão: o gate novo NÃO afrouxou os gates existentes do owner nem do core.
test("regressão: produção sem PORTAL_SESSION_SECRET continua REJEITANDO mesmo com o authority válido", () => {
  rejectsOn({ PORTAL_SESSION_SECRET: undefined }, "PORTAL_SESSION_SECRET");
});
