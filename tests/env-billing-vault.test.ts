// B-ASS-05 · F2 — os gates do cofre em `src/config/env.ts` (plano §3.9, R-VLT-6): G-BILLING-VAULT e
// G-BILLING-VAULT-PREV. Molde: tests/env-geocoding.test.ts.

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { envSchema } from "../src/config/env.js";

// A mesma base de produção do tests/env-geocoding.test.ts: satisfaz todos os gates de produção da casa.
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
  // B-ASS-08: um ambiente de produção completo tem a URL pública do webhook (exigida quando o canal liga).
  BILLING_WEBHOOK_PUBLIC_BASE_URL: "https://hooks.exemplo.com",
};

const KEY = randomBytes(32).toString("base64");
const OTHER_KEY = randomBytes(32).toString("base64");

function issuesOf(input: Record<string, unknown>): string[] {
  const result = envSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

test("T-ENV-0 · a base de produção sobe sem nada do cofre, com o canal desligado por padrão", () => {
  const parsed = envSchema.parse(PROD_BASE);
  assert.equal(parsed.BILLING_PROVIDERS_ENABLED, false);
  assert.equal(parsed.BILLING_VAULT_KEY, "");
  assert.equal(parsed.BILLING_VAULT_KEY_VERSION, 1);
  assert.equal(parsed.BILLING_VAULT_KEY_PREVIOUS_VERSION, undefined);
});

// B-ASS-08 — gate da URL pública do webhook (plano §3.9): produção + canal ligado exige `https://`.
test("B-ASS-08 · produção + canal ligado sem webhook URL https → recusa, citando BILLING_WEBHOOK_PUBLIC_BASE_URL", () => {
  const semUrl = { ...PROD_BASE, BILLING_PROVIDERS_ENABLED: "true", BILLING_VAULT_KEY: KEY, BILLING_WEBHOOK_PUBLIC_BASE_URL: "" };
  assert.ok(issuesOf(semUrl).some((issue) => issue.startsWith("BILLING_WEBHOOK_PUBLIC_BASE_URL:")), "vazia em produção com canal ligado recusa");
  assert.ok(
    issuesOf({ ...semUrl, BILLING_WEBHOOK_PUBLIC_BASE_URL: "http://hooks.exemplo.com" }).some((issue) => issue.startsWith("BILLING_WEBHOOK_PUBLIC_BASE_URL:")),
    "http:// (não https) recusa",
  );
  assert.deepEqual(issuesOf({ ...semUrl, BILLING_WEBHOOK_PUBLIC_BASE_URL: "https://hooks.exemplo.com" }), [], "https:// com o resto completo passa");
  // Canal desligado: a URL não é exigida mesmo em produção.
  assert.deepEqual(issuesOf({ ...PROD_BASE, BILLING_PROVIDERS_ENABLED: "false", BILLING_WEBHOOK_PUBLIC_BASE_URL: "" }), []);
});

test("T-ENV-1 · produção + canal ligado + chave ausente → recusa, citando BILLING_VAULT_KEY", () => {
  const issues = issuesOf({ ...PROD_BASE, BILLING_PROVIDERS_ENABLED: "true" });
  assert.ok(issues.some((issue) => issue.startsWith("BILLING_VAULT_KEY:") && issue.includes("BILLING_VAULT_KEY")), issues.join("\n"));
  assert.deepEqual(issuesOf({ ...PROD_BASE, BILLING_PROVIDERS_ENABLED: "true", BILLING_VAULT_KEY: KEY }), []);
});

test("T-ENV-2 · chave de 31 bytes (ou base64 frouxo) → recusa, em produção e fora dela", () => {
  const short = randomBytes(31).toString("base64");
  assert.ok(issuesOf({ ...PROD_BASE, BILLING_VAULT_KEY: short }).some((issue) => issue.startsWith("BILLING_VAULT_KEY:")));
  assert.ok(issuesOf({ NODE_ENV: "development", BILLING_VAULT_KEY: short }).some((issue) => issue.startsWith("BILLING_VAULT_KEY:")));
  assert.ok(issuesOf({ NODE_ENV: "development", BILLING_VAULT_KEY: `${KEY}!` }).some((issue) => issue.startsWith("BILLING_VAULT_KEY:")));
});

test("T-ENV-3 · chave anterior igual à atual, sem versão ou com versão >= atual → recusa", () => {
  const base = { ...PROD_BASE, BILLING_VAULT_KEY: KEY, BILLING_VAULT_KEY_VERSION: "2" };
  const has = (input: Record<string, unknown>) => issuesOf(input).some((issue) => issue.startsWith("BILLING_VAULT_KEY_PREVIOUS:"));
  assert.ok(has({ ...base, BILLING_VAULT_KEY_PREVIOUS: KEY, BILLING_VAULT_KEY_PREVIOUS_VERSION: "1" }), "igual à atual");
  assert.ok(has({ ...base, BILLING_VAULT_KEY_PREVIOUS: OTHER_KEY }), "sem versão");
  assert.ok(has({ ...base, BILLING_VAULT_KEY_PREVIOUS: OTHER_KEY, BILLING_VAULT_KEY_PREVIOUS_VERSION: "2" }), "versão igual");
  assert.ok(has({ ...base, BILLING_VAULT_KEY_PREVIOUS: OTHER_KEY, BILLING_VAULT_KEY_PREVIOUS_VERSION: "3" }), "versão maior");
  assert.ok(has({ ...PROD_BASE, BILLING_VAULT_KEY_PREVIOUS: OTHER_KEY, BILLING_VAULT_KEY_PREVIOUS_VERSION: "1" }), "anterior sem atual");
  assert.deepEqual(issuesOf({ ...base, BILLING_VAULT_KEY_PREVIOUS: OTHER_KEY, BILLING_VAULT_KEY_PREVIOUS_VERSION: "1" }), []);
});

test("T-ENV-4 · produção sem canal e sem chave → aceita (o cofre fica indisponível, sem derrubar o boot)", () => {
  assert.deepEqual(issuesOf({ ...PROD_BASE, BILLING_PROVIDERS_ENABLED: "false" }), []);
});

test("T-ENV-5 · versão vazia cai no padrão 1; versão 0 ou negativa → recusa", () => {
  assert.equal(envSchema.parse({ ...PROD_BASE, BILLING_VAULT_KEY_VERSION: "" }).BILLING_VAULT_KEY_VERSION, 1);
  assert.ok(issuesOf({ ...PROD_BASE, BILLING_VAULT_KEY_VERSION: "0" }).some((issue) => issue.startsWith("BILLING_VAULT_KEY_VERSION")));
  assert.ok(issuesOf({ ...PROD_BASE, BILLING_VAULT_KEY_VERSION: "-1" }).some((issue) => issue.startsWith("BILLING_VAULT_KEY_VERSION")));
});
