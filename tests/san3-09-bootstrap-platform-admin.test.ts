// B-SAN3-09 — testes SEM BANCO para scripts/bootstrap-platform-admin.ts
// T1.1–T1.8 (8 casos): trava, argv, entrada, senha, processo filho (2×), guard de imports, doc-guard.
// Espelha: tests/seed-guard.test.ts (T1.1), tests/backfill-third-party-vehicle-identity.test.ts
// (funções puras), tests/npm-test-runner-guard.test.ts (spawnSync), tests/san3-04a-...guard (doc-guard).
// Ratchet lexical (db-catalog-write-guard): nenhum CREATE ROLE, DROP ROLE, ALTER ROLE, GRANT, REVOKE, OWNER TO.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BOOTSTRAP_MIN_PASSWORD_LENGTH,
  BootstrapRefused,
  assertBootstrapPassword,
  isBootstrapAllowed,
  parseArgv,
  readBootstrapInput,
} from "../scripts/bootstrap-platform-admin.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

// ── T1.1 — isBootstrapAllowed (espelha 1:1 os 4 casos de seed-guard.test.ts + A2) ─────────────────

test("T1.1 isBootstrapAllowed: fora de produção o bootstrap é sempre permitido", () => {
  assert.equal(isBootstrapAllowed({ NODE_ENV: "development" }), true);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "test" }), true);
  assert.equal(isBootstrapAllowed({}), true);
});

test("T1.1 isBootstrapAllowed: produção SEM opt-in bloqueia o bootstrap", () => {
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production" }), false);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_BOOTSTRAP: "" }), false);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_BOOTSTRAP: "0" }), false);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_BOOTSTRAP: "false" }), false);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_BOOTSTRAP: "no" }), false);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_BOOTSTRAP: "off" }), false);
});

test("T1.1 isBootstrapAllowed: produção com opt-in ESTRITO libera o bootstrap", () => {
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_BOOTSTRAP: "1" }), true);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_BOOTSTRAP: "true" }), true);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_BOOTSTRAP: "TRUE" }), true);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_BOOTSTRAP: "yes" }), true);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_BOOTSTRAP: "on" }), true);
});

test("T1.1/A2 isBootstrapAllowed: ALLOW_PROD_SEED=1 NÃO libera o bootstrap em produção (variáveis são independentes)", () => {
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "1" }), false);
  assert.equal(isBootstrapAllowed({ NODE_ENV: "production", ALLOW_PROD_SEED: "true", ALLOW_PROD_BOOTSTRAP: undefined }), false);
});

// ── T1.2 — parseArgv: --password/--password= → PASSWORD_IN_ARGV; flags ────────────────────────────

test("T1.2 parseArgv: --password recusado (PASSWORD_IN_ARGV)", () => {
  try {
    parseArgv(["--password"]);
    assert.fail("deveria ter lançado BootstrapRefused");
  } catch (e) {
    assert.ok(e instanceof BootstrapRefused, `esperava BootstrapRefused, veio ${e}`);
    assert.equal(e.code, "PASSWORD_IN_ARGV");
  }
});

test("T1.2 parseArgv: --password=x recusado (PASSWORD_IN_ARGV)", () => {
  try {
    parseArgv(["--password=minhasenha"]);
    assert.fail("deveria ter lançado BootstrapRefused");
  } catch (e) {
    assert.ok(e instanceof BootstrapRefused, `esperava BootstrapRefused, veio ${e}`);
    assert.equal(e.code, "PASSWORD_IN_ARGV");
  }
});

test("T1.2 parseArgv: flags --dry-run, --password-stdin, --reset-password reconhecidas", () => {
  const flags = parseArgv(["--dry-run", "--password-stdin", "--reset-password"]);
  assert.equal(flags.dryRun, true);
  assert.equal(flags.passwordStdin, true);
  assert.equal(flags.resetPassword, true);
});

test("T1.2 parseArgv: sem flags → todos false", () => {
  const flags = parseArgv([]);
  assert.equal(flags.dryRun, false);
  assert.equal(flags.passwordStdin, false);
  assert.equal(flags.resetPassword, false);
});

// ── T1.3 — readBootstrapInput: validações de entrada ─────────────────────────────────────────────

const BASE_FLAGS = { dryRun: false, passwordStdin: false, resetPassword: false };

test("T1.3 readBootstrapInput: sem e-mail → EMAIL_MISSING", () => {
  try {
    readBootstrapInput({ PLATFORM_ADMIN_PASSWORD: "SenhaForte-2026!" }, BASE_FLAGS);
    assert.fail("deveria ter lançado BootstrapRefused");
  } catch (e) {
    assert.ok(e instanceof BootstrapRefused, `esperava BootstrapRefused, veio ${e}`);
    assert.equal(e.code, "EMAIL_MISSING");
  }
});

test("T1.3 readBootstrapInput: e-mail sem @ → EMAIL_MISSING", () => {
  try {
    readBootstrapInput({ PLATFORM_ADMIN_EMAIL: "semArroba", PLATFORM_ADMIN_PASSWORD: "SenhaForte-2026!" }, BASE_FLAGS);
    assert.fail("deveria ter lançado BootstrapRefused");
  } catch (e) {
    assert.ok(e instanceof BootstrapRefused, `esperava BootstrapRefused, veio ${e}`);
    assert.equal(e.code, "EMAIL_MISSING");
  }
});

test("T1.3 readBootstrapInput: sem senha (env e stdin ausentes) → PASSWORD_MISSING", () => {
  try {
    readBootstrapInput({ PLATFORM_ADMIN_EMAIL: "admin@example.com" }, BASE_FLAGS);
    assert.fail("deveria ter lançado BootstrapRefused");
  } catch (e) {
    assert.ok(e instanceof BootstrapRefused, `esperava BootstrapRefused, veio ${e}`);
    assert.equal(e.code, "PASSWORD_MISSING");
  }
});

test("T1.3 readBootstrapInput: stdin vazio com --password-stdin → PASSWORD_MISSING", () => {
  const flags = { ...BASE_FLAGS, passwordStdin: true };
  try {
    readBootstrapInput({ PLATFORM_ADMIN_EMAIL: "admin@example.com" }, flags, "");
    assert.fail("deveria ter lançado BootstrapRefused");
  } catch (e) {
    assert.ok(e instanceof BootstrapRefused, `esperava BootstrapRefused, veio ${e}`);
    assert.equal(e.code, "PASSWORD_MISSING");
  }
});

test("T1.3 readBootstrapInput: e-mail é normalizado (trim + toLowerCase)", () => {
  const input = readBootstrapInput(
    { PLATFORM_ADMIN_EMAIL: "  Admin@EXEMPLO.COM.BR  ", PLATFORM_ADMIN_PASSWORD: "SenhaForte-2026!" },
    BASE_FLAGS,
  );
  assert.equal(input.email, "admin@exemplo.com.br");
});

test("T1.3 readBootstrapInput: nome default quando PLATFORM_ADMIN_NAME não definido", () => {
  const input = readBootstrapInput(
    { PLATFORM_ADMIN_EMAIL: "admin@example.com", PLATFORM_ADMIN_PASSWORD: "SenhaForte-2026!" },
    BASE_FLAGS,
  );
  assert.equal(input.name, "Administrador da Plataforma");
});

test("T1.3 readBootstrapInput: nome customizado é respeitado", () => {
  const input = readBootstrapInput(
    { PLATFORM_ADMIN_EMAIL: "admin@example.com", PLATFORM_ADMIN_PASSWORD: "SenhaForte-2026!", PLATFORM_ADMIN_NAME: "Thiago Admin" },
    BASE_FLAGS,
  );
  assert.equal(input.name, "Thiago Admin");
});

// ── T1.4 — assertBootstrapPassword: política de senha ────────────────────────────────────────────

test("T1.4 assertBootstrapPassword: 8 chars < 12 → PASSWORD_TOO_WEAK", () => {
  assert.equal(BOOTSTRAP_MIN_PASSWORD_LENGTH, 12);
  try {
    assertBootstrapPassword("Abc12345", "admin@example.com");
    assert.fail("deveria ter lançado BootstrapRefused");
  } catch (e) {
    assert.ok(e instanceof BootstrapRefused, `esperava BootstrapRefused, veio ${e}`);
    assert.equal(e.code, "PASSWORD_TOO_WEAK");
  }
});

test("T1.4 assertBootstrapPassword: senha = e-mail → PASSWORD_TOO_WEAK (app policy)", () => {
  const email = "admin@example.com";
  try {
    assertBootstrapPassword(email, email);
    assert.fail("deveria ter lançado BootstrapRefused");
  } catch (e) {
    assert.ok(e instanceof BootstrapRefused, `esperava BootstrapRefused, veio ${e}`);
    assert.equal(e.code, "PASSWORD_TOO_WEAK");
  }
});

test("T1.4 assertBootstrapPassword: 12 chars ≠ e-mail → passa", () => {
  assert.doesNotThrow(() => assertBootstrapPassword("SenhaForte-2026!", "admin@example.com"));
});

// ── T1.5 — processo filho: NODE_ENV=production sem opt-in → exit 2, PRODUCTION_OPT_IN_MISSING ───

const SCRIPT = join(ROOT, "scripts", "bootstrap-platform-admin.ts");

test("T1.5 processo filho: NODE_ENV=production sem opt-in → exit 2 + PRODUCTION_OPT_IN_MISSING + sem ZodError/JWT_SECRET", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx/esm", SCRIPT],
    {
      env: {
        NODE_ENV: "production",
        PATH: process.env.PATH,
      },
      encoding: "utf8",
      timeout: 30_000,
    },
  );
  assert.equal(result.error, undefined, `spawn falhou: ${result.error?.message}`);
  assert.equal(result.status, 2);
  assert.ok(
    (result.stderr ?? "").includes("PRODUCTION_OPT_IN_MISSING"),
    `stderr não contém PRODUCTION_OPT_IN_MISSING: ${result.stderr}`,
  );
  assert.ok(
    !(result.stderr ?? "").includes("ZodError"),
    `stderr contém ZodError (env.ts foi carregado!): ${result.stderr}`,
  );
  assert.ok(
    !(result.stderr ?? "").includes("JWT_SECRET"),
    `stderr contém JWT_SECRET (env.ts foi carregado!): ${result.stderr}`,
  );
});

// ── T1.6 — processo filho com senha no argv e sentinela no env ─────────────────────────────────

test("T1.6 processo filho: --password=x → exit 2 PASSWORD_IN_ARGV; sentinela não vaza em stdout/stderr", () => {
  const SENTINEL = `sentinel-san3-09-${Date.now()}-secret`;
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx/esm", SCRIPT, "--password=qualquer"],
    {
      env: {
        PATH: process.env.PATH,
        PLATFORM_ADMIN_PASSWORD: SENTINEL,
        PLATFORM_ADMIN_EMAIL: "admin@example.com",
      },
      encoding: "utf8",
      timeout: 30_000,
    },
  );
  assert.equal(result.error, undefined, `spawn falhou: ${result.error?.message}`);
  assert.equal(result.status, 2);
  assert.ok(
    (result.stderr ?? "").includes("PASSWORD_IN_ARGV"),
    `stderr não contém PASSWORD_IN_ARGV: ${result.stderr}`,
  );
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  assert.ok(!output.includes(SENTINEL), `sentinela vazou em stdout/stderr`);
});

// ── T1.7 — guard de imports (CE-G1): todos os imports do script pertencem à allowlist ──────────

const IMPORT_ALLOWLIST = new Set([
  "dotenv/config",
  "@prisma/adapter-pg",
  "@prisma/client",
  "../src/database/rls.js",
  "../src/modules/auth/repositories/local-auth-credential.repository.js",
  "../src/modules/auth/services/local-auth-credential.service.js",
]);

function extractScriptImports(scriptPath: string): string[] {
  const text = readFileSync(scriptPath, "utf8");
  const matches = [...text.matchAll(/^import\s+.*?from\s+"([^"]+)"/gm)];
  return matches.map((m) => m[1]);
}

test("T1.7 guard de imports (CE-G1): todos os imports de bootstrap-platform-admin.ts pertencem à allowlist", () => {
  const scriptPath = join(ROOT, "scripts", "bootstrap-platform-admin.ts");
  const imports = extractScriptImports(scriptPath);
  assert.ok(imports.length > 0, "nenhum import encontrado no script");
  for (const imp of imports) {
    assert.ok(
      IMPORT_ALLOWLIST.has(imp),
      `import fora da allowlist (CE-G1): "${imp}"\nAllowlist: ${[...IMPORT_ALLOWLIST].join(", ")}`,
    );
  }
});

test("T1.7 guard de imports (CE-G1): MUTAÇÃO — import fora da allowlist é detectado", () => {
  const fakeScript = `
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { setTenantRlsContext } from "../src/database/rls.js";
import { LocalAuthCredentialRepository } from "../src/modules/auth/repositories/local-auth-credential.repository.js";
import { LocalAuthCredentialService } from "../src/modules/auth/services/local-auth-credential.service.js";
import { auth } from "../src/modules/auth/index.js";
`;
  const imports = [...fakeScript.matchAll(/^import\s+.*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
  const outOfAllowlist = imports.filter((imp) => !IMPORT_ALLOWLIST.has(imp));
  assert.ok(
    outOfAllowlist.length > 0,
    "a mutação deveria ter detectado um import fora da allowlist",
  );
  assert.ok(
    outOfAllowlist.includes("../src/modules/auth/index.js"),
    `esperava detectar "../src/modules/auth/index.js", achado: ${outOfAllowlist.join(", ")}`,
  );
});

// ── T1.8 — doc-guard: Runbook B em docs/deployment.md contém as variáveis e flags corretas ──────

const DEPLOYMENT_PATH = join(ROOT, "docs", "deployment.md");

function extractRunbookB(text: string): string {
  const start = text.indexOf("#### Runbook B");
  if (start === -1) return "";
  const afterStart = text.indexOf("\n", start);
  const end = text.indexOf("\n### ", afterStart);
  return end === -1 ? text.slice(afterStart) : text.slice(afterStart, end);
}

test("T1.8 doc-guard Runbook B: contém ALLOW_PROD_BOOTSTRAP, scripts/bootstrap-platform-admin.ts, --dry-run, --password-stdin, PRODUCTION_OPT_IN_MISSING e menção ao runbook B-O6R-01", () => {
  const text = readFileSync(DEPLOYMENT_PATH, "utf8");
  const runbook = extractRunbookB(text);
  assert.ok(runbook.length > 0, "Runbook B não encontrado em docs/deployment.md (procurou por '#### Runbook B')");

  for (const expected of [
    "ALLOW_PROD_BOOTSTRAP",
    "scripts/bootstrap-platform-admin.ts",
    "--dry-run",
    "--password-stdin",
    "PRODUCTION_OPT_IN_MISSING",
    "B-O6R-01",
  ]) {
    assert.ok(
      runbook.includes(expected),
      `Runbook B não contém "${expected}" (A20/A16 — E4 ainda não foi aplicada ou foi revertida)`,
    );
  }
});
