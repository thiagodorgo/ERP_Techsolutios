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
  // B-O6R-05 — gates de RUNTIME de produção (Ω6R-DAT-001 + Ω6R-DIN-006). O baseline VÁLIDO precisa
  // satisfazê-los; sem isso o `baseline` abaixo falharia e os `rejectsOn` ficariam vacuamente verdadeiros.
  CORE_SAAS_PERSISTENCE: "prisma",
  DATABASE_URL: "postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public",
  JOBS_WORKER_ENABLED: "true",
  REDIS_URL: "redis://redis.interno.exemplo.com:6379",
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

// Regressão B-O6R-05: o isolamento authority×owner×ERP é verificado por IGUALDADE de secrets; os gates de
// runtime são verificados por outra coisa inteiramente. Provar que continuam independentes evita que um
// afrouxamento futuro num deles passe despercebido por o outro estar reprovando no lugar.
test("regressão: o isolamento do authority e os gates de runtime disparam de forma INDEPENDENTE", () => {
  // Runtime quebrado, isolamento intacto → reprova pelo Redis no loopback.
  rejectsOn({ REDIS_URL: "redis://localhost:6379" }, "REDIS_URL");
  // Runtime intacto, isolamento quebrado → continua reprovando pelo authority.
  rejectsOn({ PORTAL_AUTHORITY_SESSION_SECRET: PROD_OK.PORTAL_SESSION_SECRET }, "PORTAL_AUTHORITY_SESSION_SECRET");
});
