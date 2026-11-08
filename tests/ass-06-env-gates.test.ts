// B-ASS-06 · F1/F5 — gates das variáveis do bloco em src/config/env.ts (plano §3.9, R-PAY-5/R-PAY-9):
// G-BILLING-LOCAL (127.0.0.1 só em test) e a URL pública do webhook em produção. Molde: tests/env-billing-vault.test.ts.

import assert from "node:assert/strict";
import test from "node:test";

import { envSchema } from "../src/config/env.js";

const PROD_BASE = {
  NODE_ENV: "production",
  JWT_SECRET: "a-real-production-secret",
  JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
  CORS_ORIGIN: "https://app.exemplo.com",
  PORTAL_SESSION_SECRET: "a-real-production-portal-session-secret",
  PORTAL_LOG_SECRET: "a-real-production-portal-log-secret",
  PORTAL_AUTHORITY_SESSION_SECRET: "a-real-production-authority-session-secret",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com",
  CORE_SAAS_PERSISTENCE: "prisma",
  DATABASE_URL: "postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public",
  JOBS_WORKER_ENABLED: "true",
  REDIS_URL: "redis://redis.interno.exemplo.com:6379",
};

function issuesOf(input: Record<string, unknown>): string[] {
  const result = envSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

test("T-PAY-ENV-1 · BILLING_PROVIDER_ALLOW_LOCAL_HOSTS default false; true fora de test recusa (G-BILLING-LOCAL)", () => {
  assert.equal(envSchema.parse({ NODE_ENV: "development" }).BILLING_PROVIDER_ALLOW_LOCAL_HOSTS, false);
  assert.ok(issuesOf({ ...PROD_BASE, BILLING_PROVIDER_ALLOW_LOCAL_HOSTS: "true" }).some((i) => i.startsWith("BILLING_PROVIDER_ALLOW_LOCAL_HOSTS:")));
  assert.deepEqual(issuesOf({ NODE_ENV: "test", BILLING_PROVIDER_ALLOW_LOCAL_HOSTS: "true" }), []);
});

test("T-PAY-ENV-2 · produção + canal ligado exige BILLING_WEBHOOK_PUBLIC_BASE_URL https://", () => {
  const key = "BILLING_VAULT_KEY";
  // Satisfaz o G-BILLING-VAULT: canal ligado em produção exige chave válida (32 bytes).
  const vaultKey = Buffer.alloc(32, 1).toString("base64");
  const base = { ...PROD_BASE, BILLING_PROVIDERS_ENABLED: "true", [key]: vaultKey };
  assert.ok(issuesOf(base).some((i) => i.startsWith("BILLING_WEBHOOK_PUBLIC_BASE_URL:") && i.includes("exige")), "sem URL → recusa");
  assert.ok(issuesOf({ ...base, BILLING_WEBHOOK_PUBLIC_BASE_URL: "http://app.exemplo.com" }).some((i) => i.startsWith("BILLING_WEBHOOK_PUBLIC_BASE_URL:")));
  assert.deepEqual(issuesOf({ ...base, BILLING_WEBHOOK_PUBLIC_BASE_URL: "https://app.exemplo.com" }), []);
});
