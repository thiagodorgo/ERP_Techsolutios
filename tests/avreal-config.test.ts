import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { envSchema } from "../src/config/env.js";

function paths(input: Record<string, unknown>): readonly string[] {
  const result = envSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

test("clamav com host e limites válidos é aceito em test", () => {
  const result = envSchema.safeParse({
    NODE_ENV: "test",
    EVIDENCE_SCANNER: "clamav",
    CLAMAV_HOST: "clamav.internal",
  });
  assert.equal(result.success, true);
});

test("clamav sem host é recusado", () => {
  assert(paths({ NODE_ENV: "test", EVIDENCE_SCANNER: "clamav" }).includes("CLAMAV_HOST"));
});

for (const [key, value] of [
  ["CLAMAV_PORT", "0"],
  ["CLAMAV_PORT", "65536"],
  ["CLAMAV_CONNECT_TIMEOUT_MS", "99"],
  ["CLAMAV_CONNECT_TIMEOUT_MS", "10001"],
  ["CLAMAV_SCAN_TIMEOUT_MS", "999"],
  ["CLAMAV_SCAN_TIMEOUT_MS", "120001"],
  ["CLAMAV_MAX_CONCURRENT_SCANS", "0"],
  ["CLAMAV_MAX_CONCURRENT_SCANS", "17"],
  ["CLAMAV_STREAM_MAX_BYTES", String(1024 * 1024 - 1)],
  ["CLAMAV_STREAM_MAX_BYTES", String(100 * 1024 * 1024 + 1)],
] as const) {
  test(`${key}=${value} é recusado`, () => {
    assert(
      paths({ NODE_ENV: "test", EVIDENCE_SCANNER: "clamav", CLAMAV_HOST: "clamav", [key]: value }).includes(key),
    );
  });
}

test("timeout total precisa ser maior que timeout de conexão", () => {
  assert(
    paths({
      NODE_ENV: "test",
      EVIDENCE_SCANNER: "clamav",
      CLAMAV_HOST: "clamav",
      CLAMAV_CONNECT_TIMEOUT_MS: "3000",
      CLAMAV_SCAN_TIMEOUT_MS: "3000",
    }).includes("CLAMAV_SCAN_TIMEOUT_MS"),
  );
});

test("produção com clamav recusa idade zero e aceita default seguro", () => {
  const base = {
    NODE_ENV: "production",
    JWT_SECRET: "secret",
    JWT_REFRESH_SECRET: "refresh",
    CORS_ORIGIN: "https://app.example.com",
    PORTAL_SESSION_SECRET: "portal-secret",
    PORTAL_LOG_SECRET: "portal-log-secret",
    PORTAL_AUTHORITY_SESSION_SECRET: "authority-secret",
    PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
    PORTAL_CORS_ORIGIN: "https://portal.example.com",
    CORE_SAAS_PERSISTENCE: "prisma",
    DATABASE_URL: "postgresql://erp:erp@db.example.com:5432/erp",
    JOBS_WORKER_ENABLED: "true",
    REDIS_URL: "redis://redis.example.com:6379",
    EVIDENCE_SCANNER: "clamav",
    CLAMAV_HOST: "clamav.internal",
  };
  assert.equal(envSchema.safeParse(base).success, true);
  assert(paths({ ...base, CLAMAV_MAX_DB_AGE_HOURS: "0" }).includes("CLAMAV_MAX_DB_AGE_HOURS"));
});

test("factory resolve ClamAvEvidenceScanner em processo isolado", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", "import('./src/modules/evidence/evidence-scanner.factory.ts').then(m=>console.log(m.resolveEvidenceScannerName()))"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test", EVIDENCE_SCANNER: "clamav", CLAMAV_HOST: "127.0.0.1" },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ClamAvEvidenceScanner/);
});
