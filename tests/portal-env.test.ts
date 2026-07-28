import assert from "node:assert/strict";
import test from "node:test";

import { envSchema } from "../src/config/env.js";

// Ω5P PR-16 (MÉDIA-1 + LOW) — os gates de produção do owner-portal PÚBLICO. Espelham a disciplina fail-closed do
// JWT/CORS do core: em produção os secrets PRÓPRIOS do portal (sessão jose + HMAC do log), o binding de tenant e a
// allowlist de CORS são OBRIGATÓRIOS — e os secrets do portal JAMAIS podem coincidir com os do ERP (isolamento por
// contrato, não só por convenção). Fora de produção nada disto é exigido (dev/test injeta por teste).

// Base de produção VÁLIDA — cada teste remove/adultera UM campo e prova que o schema REJEITA (fail-closed).
const PROD_OK = {
  NODE_ENV: "production",
  JWT_SECRET: "a-real-production-secret",
  JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
  CORS_ORIGIN: "https://app.exemplo.com",
  PORTAL_SESSION_SECRET: "a-real-production-portal-session-secret",
  PORTAL_LOG_SECRET: "a-real-production-portal-log-secret",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com",
};

function rejectsOn(overrides: Record<string, unknown>, path: string): void {
  const merged = { ...PROD_OK, ...overrides } as Record<string, unknown>;
  for (const [key, val] of Object.entries(overrides)) {
    if (val === undefined) delete merged[key]; // simula a var AUSENTE do ambiente
  }
  const result = envSchema.safeParse(merged);
  assert.equal(result.success, false, `esperava REJEITAR quando ${path} é inválido/ausente`);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((issue) => issue.path.includes(path)),
      `esperava issue no caminho ${path}`,
    );
  }
}

// Sanidade: a base de produção COMPLETA passa (senão os testes de rejeição seriam vacuamente verdadeiros).
test("baseline: produção com todos os PORTAL_* válidos → schema ACEITA", () => {
  assert.equal(envSchema.safeParse(PROD_OK).success, true);
});

test("produção SEM PORTAL_SESSION_SECRET → REJEITA (fail-closed)", () => {
  rejectsOn({ PORTAL_SESSION_SECRET: undefined }, "PORTAL_SESSION_SECRET");
});

test("produção SEM PORTAL_LOG_SECRET → REJEITA (fail-closed)", () => {
  rejectsOn({ PORTAL_LOG_SECRET: undefined }, "PORTAL_LOG_SECRET");
});

test("produção SEM PORTAL_TENANT_ID → REJEITA (fail-closed)", () => {
  rejectsOn({ PORTAL_TENANT_ID: undefined }, "PORTAL_TENANT_ID");
});

test("produção com PORTAL_CORS_ORIGIN vazio → REJEITA", () => {
  rejectsOn({ PORTAL_CORS_ORIGIN: "" }, "PORTAL_CORS_ORIGIN");
});

test("produção com PORTAL_CORS_ORIGIN='*' → REJEITA", () => {
  rejectsOn({ PORTAL_CORS_ORIGIN: "*" }, "PORTAL_CORS_ORIGIN");
});

test("produção com curinga PARCIAL no PORTAL_CORS_ORIGIN ('*.exemplo.com') → REJEITA", () => {
  rejectsOn({ PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com,https://*.exemplo.com" }, "PORTAL_CORS_ORIGIN");
});

test("produção com default de DEV do portal (dev-only-portal-session-change-me) → REJEITA", () => {
  rejectsOn({ PORTAL_SESSION_SECRET: "dev-only-portal-session-change-me" }, "PORTAL_SESSION_SECRET");
});

// LOW (defense-in-depth) — o segredo do portal não pode ser o do ERP (isolamento por contrato).
test("produção com PORTAL_SESSION_SECRET === JWT_SECRET → REJEITA (isolamento portal×ERP)", () => {
  rejectsOn({ PORTAL_SESSION_SECRET: PROD_OK.JWT_SECRET }, "PORTAL_SESSION_SECRET");
});

test("produção com PORTAL_LOG_SECRET === JWT_REFRESH_SECRET → REJEITA (isolamento portal×ERP)", () => {
  rejectsOn({ PORTAL_LOG_SECRET: PROD_OK.JWT_REFRESH_SECRET }, "PORTAL_LOG_SECRET");
});

// Fora de produção os gates do portal NÃO se aplicam (dev/test injeta os secrets por teste).
test("desenvolvimento sem NENHUM PORTAL_* → schema ACEITA (só produção é barrada)", () => {
  const result = envSchema.safeParse({ NODE_ENV: "development" });
  assert.equal(result.success, true);
});

// Regressão: os gates do portal NÃO afrouxaram os gates existentes do core.
test("regressão: produção sem JWT_SECRET continua REJEITANDO mesmo com PORTAL_* válidos", () => {
  rejectsOn({ JWT_SECRET: undefined }, "JWT_SECRET");
});
