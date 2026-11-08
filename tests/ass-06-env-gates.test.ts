// B-ASS-06 · F1/F5 — gate da variável do bloco em src/config/env.ts (plano §3.9, R-PAY-5):
// G-BILLING-LOCAL (127.0.0.1 só em test). A URL pública do webhook nasce no B-ASS-08 (o B-ASS-06 não a usa). Molde: tests/env-billing-vault.test.ts.

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
