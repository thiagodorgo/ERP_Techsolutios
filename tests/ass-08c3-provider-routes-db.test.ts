// B-ASS-08c3 (F-A4) — as 4 rotas novas do cofre (`test-connection`, `register-webhook`, `enable`,
// `disable`) pela ROTA REAL, no PostgreSQL, sob papel efêmero NOSUPERUSER NOBYPASSRLS. Os provedores
// são os FALSOS locais (127.0.0.1); o catálogo é apontado para o falso durante o teste (o cliente HTTP
// de produção usa o host do catálogo, e em `test` aceita hosts locais).
//
// Casos do plano §6.1: TC1–TC3, TC-OFF, WH1–WH3, AD1 e PR1 (redefinido pela Emenda 1 §3.1).
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import net from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { startAsaasFake, type AsaasFake } from "./helpers/fake-providers/asaas.js";
import { startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";
import type { FakeServer } from "./helpers/fake-providers/shared.js";
import { PROVIDER_CATALOG } from "../src/modules/subscription-billing/providers/provider.catalog.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const TOKEN_ASAAS = "TOKEN-ASAAS-FAKE";
const WEBHOOK_ASAAS = "WEBHOOK-ASAAS-FAKE";
const TOKEN_FOCUS = "TOKEN-FOCUS-FAKE";
const WEBHOOK_FOCUS = "WEBHOOK-FOCUS-FAKE";
const PUBLIC_BASE = "https://public.invalid";

type Json = Record<string, any>;

type MutableEnv = {
  CORE_SAAS_PERSISTENCE: string;
  BILLING_PROVIDERS_ENABLED: boolean;
  BILLING_PROVIDER_ALLOW_LOCAL_HOSTS: boolean;
  NODE_ENV: string;
  BILLING_WEBHOOK_PUBLIC_BASE_URL: string;
  BILLING_WEBHOOK_TRUSTED_PROXY_HOPS: number;
};

function pointCatalog(provider: string, base: string): void {
  const entry = PROVIDER_CATALOG[provider as keyof typeof PROVIDER_CATALOG] as unknown as { hosts: { sandbox: string; production: string } };
  entry.hosts = { sandbox: base, production: base };
}

if (!connectionString) {
  test("B-ASS-08c3 · as rotas do provedor exigem DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any;
  let db: any;
  let role: EphemeralRole;
  let databaseName = "";
  let server: Server | undefined;
  let baseUrl = "";
  let mutableEnv: MutableEnv;
  let runtime: Awaited<ReturnType<typeof import("../src/modules/subscription-billing/vault/vault.factory.js").createDefaultVaultRuntime>>;

  after(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await role?.drop();
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  async function apiRaw(method: string, route: string, body: unknown, headers: Record<string, string>): Promise<{ status: number; body: Json }> {
    const response = await fetch(baseUrl + route, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as Json };
  }

  async function api(method: string, route: string, body?: unknown): Promise<{ status: number; body: Json }> {
    return apiRaw(method, route, body, { ...PLATFORM });
  }

  async function configRow(provider: string): Promise<Record<string, any> | undefined> {
    const rows = (await db.$queryRawUnsafe(`SELECT * FROM billing_provider_configs WHERE provider = $1`, provider)) as Array<Record<string, any>>;
    return rows[0];
  }

  function auditActions(provider: string, action: string): Promise<Array<{ action: string; metadata: Json }>> {
    return db.$queryRawUnsafe(
      `SELECT action, metadata FROM platform_audit_logs WHERE entity = 'billing_provider' AND entity_id = $1 AND action = $2 ORDER BY created_at`,
      provider,
      action,
    ) as Promise<Array<{ action: string; metadata: Json }>>;
  }

  /** Conta e BLOQUEIA rede de saída, permitindo só o loopback do próprio app do teste. */
  async function probeOutbound(fn: () => Promise<void>): Promise<string[]> {
    const attempts: string[] = [];
    const originalFetch = globalThis.fetch;
    const originalConnect = net.Socket.prototype.connect;
    const port = (server!.address() as AddressInfo).port;
    const own = `http://127.0.0.1:${port}/`;
    globalThis.fetch = (async (input: unknown, init?: unknown) => {
      if (String(input).startsWith(own)) return originalFetch(input as never, init as never);
      attempts.push(`fetch ${String(input)}`);
      throw new Error("provider_routes_probe: rede bloqueada");
    }) as typeof fetch;
    net.Socket.prototype.connect = function guarded(this: net.Socket, ...args: unknown[]) {
      const target = (Array.isArray(args[0]) ? args[0][0] : args[0]) as { port?: unknown; host?: unknown } | number | undefined;
      const targetPort = typeof target === "object" && target !== null ? Number(target.port) : Number(target);
      const host = typeof target === "object" && target !== null ? String(target.host ?? "") : String(args[1] ?? "");
      if (targetPort === port && (host === "127.0.0.1" || host === "localhost" || host === "")) {
        return (originalConnect as (...a: unknown[]) => net.Socket).apply(this, args);
      }
      attempts.push(`socket ${JSON.stringify(args[0])}`);
      throw new Error("provider_routes_probe: rede bloqueada");
    } as typeof net.Socket.prototype.connect;
    try {
      await fn();
    } finally {
      globalThis.fetch = originalFetch;
      net.Socket.prototype.connect = originalConnect;
    }
    return attempts;
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, cofre e catálogo de teste", async () => {
    const [{ PrismaClient }] = await Promise.all([import("@prisma/client")]);
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_c3a_prov_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    const targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(targetUrl) });
    role = await createEphemeralRole(db, targetUrl);
    const [posture] = (await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false });

    (globalThis as { prisma?: unknown }).prisma = role.client;
    process.env.DATABASE_URL = targetUrl;
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";

    const [envModule, { createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, { resetStatementRuntimeForTests }, vaultFactory, { EnvVaultKeyProvider }] =
      await Promise.all([
        import("../src/config/env.js"),
        import("../src/app.js"),
        import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
        import("../src/modules/core-saas/services/core-saas.service.js"),
        import("../src/modules/core-saas/store/core-saas.store.js"),
        import("../src/modules/subscription-billing/statements/statement.factory.js"),
        import("../src/modules/subscription-billing/vault/vault.factory.js"),
        import("../src/modules/subscription-billing/vault/vault-keys.js"),
      ]);

    mutableEnv = envModule.env as unknown as MutableEnv;
    mutableEnv.CORE_SAAS_PERSISTENCE = "prisma";
    mutableEnv.BILLING_PROVIDERS_ENABLED = true;
    mutableEnv.BILLING_PROVIDER_ALLOW_LOCAL_HOSTS = true;
    mutableEnv.NODE_ENV = "test";
    mutableEnv.BILLING_WEBHOOK_PUBLIC_BASE_URL = PUBLIC_BASE;
    mutableEnv.BILLING_WEBHOOK_TRUSTED_PROXY_HOPS = 1;

    resetStatementRuntimeForTests();
    vaultFactory.resetVaultRuntimeForTests();
    vaultFactory.setVaultKeysForTests(new EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }));

    const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    runtime = await vaultFactory.createDefaultVaultRuntime();
    await runtime.providers.updateSettings("asaas", { environment: "sandbox", settings: {} });
    await runtime.providers.updateSettings("focusnfe", { environment: "sandbox", settings: {} });
    await runtime.vault.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "api_token", secret: TOKEN_ASAAS }, actorId: null });
    await runtime.vault.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "webhook_secret", secret: WEBHOOK_ASAAS }, actorId: null });
    await runtime.vault.setCredential({ provider: "focusnfe", environment: "sandbox", credential: { kind: "api_token", secret: TOKEN_FOCUS }, actorId: null });
  });

  test("TC1: Asaas responde 200 com a lista vazia → ok, banco e trilha corretos", async () => {
    const fake = await startAsaasFake("ok");
    try {
      pointCatalog("asaas", `${fake.baseUrl}/v3`);
      const response = await api("POST", "/api/v1/platform/billing/providers/asaas/test-connection");
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.data.provider, "asaas");
      assert.equal(response.body.data.environment, "sandbox");
      assert.equal(response.body.data.ok, true);
      assert.deepEqual(Object.keys(response.body.data).sort(), ["at", "environment", "ok", "provider"]);

      const row = await configRow("asaas");
      assert.equal(row!.last_test_ok, true);
      assert.equal(row!.last_test_environment, "sandbox");
      assert.ok(Math.abs(new Date(row!.last_test_at).getTime() - Date.now()) < 10_000, "last_test_at é o relógio");

      const gets = fake.recorded.filter((request) => request.method === "GET" && request.path.split("?")[0] === "/v3/payments");
      assert.equal(gets.length, 1, JSON.stringify(fake.recorded));
      assert.equal(gets[0]!.headers["access_token"], TOKEN_ASAAS);

      const trail = await auditActions("asaas", "billing_provider.connection_tested");
      assert.equal(trail.length, 1, JSON.stringify(trail));
      assert.deepEqual(trail[0]!.metadata.codes, []);
    } finally {
      await fake.close();
    }
  });

  test("TC2: Asaas 401 → credential_rejected, sem corpo do provedor na resposta nem na trilha", async () => {
    const fake = await startAsaasFake("credential_rejected_401");
    try {
      pointCatalog("asaas", `${fake.baseUrl}/v3`);
      const response = await api("POST", "/api/v1/platform/billing/providers/asaas/test-connection");
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.data.ok, false);
      assert.equal(response.body.data.code, "credential_rejected");
      assert.ok(!JSON.stringify(response.body).includes("access token"), "o corpo do falso não sai na resposta");

      const row = await configRow("asaas");
      assert.equal(row!.last_test_ok, false);
      assert.equal(row!.last_test_error, "credential_rejected");

      const trail = await auditActions("asaas", "billing_provider.connection_tested");
      assert.equal(trail.length, 2, JSON.stringify(trail));
      assert.deepEqual(trail.at(-1)!.metadata.codes, ["credential_rejected"]);
      assert.ok(!JSON.stringify(trail.at(-1)).includes("access token"), "o corpo do falso não sai na trilha");
    } finally {
      await fake.close();
    }
  });

  test("TC3: Focus 404 → ok, 401 → credential_rejected, 503 → provider_unavailable", async () => {
    const cases: Array<{ scenario: string; ok: boolean; code?: string }> = [
      { scenario: "not_found_404", ok: true },
      { scenario: "credential_rejected_401", ok: false, code: "credential_rejected" },
      { scenario: "provider_unavailable_500", ok: false, code: "provider_unavailable" },
    ];
    for (const item of cases) {
      const fake: FakeServer = await startFocusNfeFake(item.scenario);
      try {
        pointCatalog("focusnfe", `${fake.baseUrl}/v2`);
        const response = await api("POST", "/api/v1/platform/billing/providers/focusnfe/test-connection");
        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal(response.body.data.ok, item.ok);
        if (item.ok) assert.equal(response.body.data.code, undefined);
        else assert.equal(response.body.data.code, item.code);

        const row = await configRow("focusnfe");
        assert.equal(row!.last_test_ok, item.ok);
        if (item.ok) assert.equal(row!.last_test_error, null);
        else assert.equal(row!.last_test_error, item.code);
      } finally {
        await fake.close();
      }
    }
  });

  test("TC-OFF: canal desligado → 422 channel_disabled, 0 conexão e colunas intactas", async () => {
    const before = await configRow("asaas");
    mutableEnv.BILLING_PROVIDERS_ENABLED = false;
    try {
      const attempts = await probeOutbound(async () => {
        const testConnection = await api("POST", "/api/v1/platform/billing/providers/asaas/test-connection");
        assert.equal(testConnection.status, 422, JSON.stringify(testConnection.body));
        assert.equal(testConnection.body.error?.reason, "channel_disabled");
        const registerWebhook = await api("POST", "/api/v1/platform/billing/providers/asaas/register-webhook");
        assert.equal(registerWebhook.status, 422, JSON.stringify(registerWebhook.body));
        assert.equal(registerWebhook.body.error?.reason, "channel_disabled");
      });
      assert.deepEqual(attempts, []);
      const afterRow = await configRow("asaas");
      assert.equal(afterRow!.last_test_at?.toISOString(), before!.last_test_at?.toISOString());
      assert.equal(afterRow!.last_test_ok, before!.last_test_ok);
      assert.equal(afterRow!.last_test_environment, before!.last_test_environment);
      assert.equal(afterRow!.webhook_registered_at, before!.webhook_registered_at);
      assert.equal(afterRow!.webhook_registered_environment, before!.webhook_registered_environment);
      assert.equal(afterRow!.webhook_external_id, before!.webhook_external_id);
      assert.equal(afterRow!.webhook_public_url, before!.webhook_public_url);
    } finally {
      mutableEnv.BILLING_PROVIDERS_ENABLED = true;
    }
  });

  test("WH1: Asaas registra o webhook no falso com url e authToken do cofre; resposta enxuta", async () => {
    const fake = await startAsaasFake("ok");
    try {
      pointCatalog("asaas", `${fake.baseUrl}/v3`);
      const response = await api("POST", "/api/v1/platform/billing/providers/asaas/register-webhook");
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.data.provider, "asaas");
      assert.equal(response.body.data.environment, "sandbox");
      assert.deepEqual(Object.keys(response.body.data).sort(), ["environment", "provider", "registeredAt"]);

      const posts = fake.recorded.filter((request) => request.method === "POST" && request.path.split("?")[0] === "/v3/webhooks");
      assert.equal(posts.length, 1, JSON.stringify(fake.recorded));
      const sent = JSON.parse(posts[0]!.body) as Record<string, unknown>;
      assert.equal(sent.url, `${PUBLIC_BASE}/api/v1/webhooks/billing/asaas`);
      assert.equal(sent.authToken, WEBHOOK_ASAAS);

      const row = await configRow("asaas");
      assert.equal(row!.webhook_registered_environment, "sandbox");
      assert.ok(row!.webhook_external_id);
      assert.equal(row!.webhook_public_url, `${PUBLIC_BASE}/api/v1/webhooks/billing/asaas`);

      const trail = await auditActions("asaas", "billing_provider.webhook_registered");
      assert.equal(trail.length, 1, JSON.stringify(trail));
      assert.equal(trail[0]!.metadata.environment, "sandbox");
    } finally {
      await fake.close();
    }
  });

  test("WH2: base pública vazia → webhook_public_url_missing; sem segredo → webhook_secret_required; 0 rede", async () => {
    mutableEnv.BILLING_WEBHOOK_PUBLIC_BASE_URL = "";
    try {
      const missingUrlAttempts = await probeOutbound(async () => {
        const response = await api("POST", "/api/v1/platform/billing/providers/asaas/register-webhook");
        assert.equal(response.status, 422, JSON.stringify(response.body));
        assert.equal(response.body.error?.reason, "webhook_public_url_missing");
      });
      assert.deepEqual(missingUrlAttempts, []);
    } finally {
      mutableEnv.BILLING_WEBHOOK_PUBLIC_BASE_URL = PUBLIC_BASE;
    }

    const missingSecretAttempts = await probeOutbound(async () => {
      const response = await api("POST", "/api/v1/platform/billing/providers/focusnfe/register-webhook");
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error?.reason, "webhook_secret_required");
    });
    assert.deepEqual(missingSecretAttempts, []);
  });

  test("WH3: registrar duas vezes na mesma base → 2ª alreadyRegistered, 1 só POST e 1 só trilha", async () => {
    const fake: FakeServer = await startFocusNfeFake("ok");
    try {
      pointCatalog("focusnfe", `${fake.baseUrl}/v2`);
      await runtime.vault.setCredential({ provider: "focusnfe", environment: "sandbox", credential: { kind: "webhook_secret", secret: WEBHOOK_FOCUS }, actorId: null });

      const first = await api("POST", "/api/v1/platform/billing/providers/focusnfe/register-webhook");
      assert.equal(first.status, 200, JSON.stringify(first.body));
      const second = await api("POST", "/api/v1/platform/billing/providers/focusnfe/register-webhook");
      assert.equal(second.status, 200, JSON.stringify(second.body));
      assert.equal(second.body.data.alreadyRegistered, true);

      const posts = fake.recorded.filter((request) => request.method === "POST" && request.path.split("?")[0] === "/v2/hooks");
      assert.equal(posts.length, 1, JSON.stringify(fake.recorded));

      const trail = await auditActions("focusnfe", "billing_provider.webhook_registered");
      assert.equal(trail.length, 1, JSON.stringify(trail));
    } finally {
      await fake.close();
    }
  });

  test("AD1: provedores sem adaptador recusam sem rede; Mercado Pago é manual", async () => {
    const attempts = await probeOutbound(async () => {
      for (const provider of ["iugu", "mercadopago", "nfeio", "plugnotas"]) {
        const testConnection = await api("POST", `/api/v1/platform/billing/providers/${provider}/test-connection`);
        assert.equal(testConnection.status, 422, JSON.stringify(testConnection.body));
        assert.equal(testConnection.body.error?.reason, "provider_adapter_unavailable");

        const registerWebhook = await api("POST", `/api/v1/platform/billing/providers/${provider}/register-webhook`);
        assert.equal(registerWebhook.status, 422, JSON.stringify(registerWebhook.body));
        assert.equal(registerWebhook.body.error?.reason, provider === "mercadopago" ? "webhook_registration_manual" : "provider_adapter_unavailable");

        const enable = await api("POST", `/api/v1/platform/billing/providers/${provider}/enable`, { confirm: `${provider}:sandbox` });
        assert.equal(enable.status, 422, JSON.stringify(enable.body));
        assert.equal(enable.body.error?.reason, "provider_adapter_unavailable");
      }
    });
    assert.deepEqual(attempts, []);
    const enabled = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM billing_provider_configs WHERE enabled = true`)) as Array<{ n: number }>;
    assert.equal(enabled[0]!.n, 0);
  });

  test("PR1: ator de organização → 403 em todas; sem ator → o mesmo do GET /providers; tenantId é ignorado", async () => {
    const tenantId = randomUUID();
    const actorHeaders = { "x-user-id": randomUUID(), "x-tenant-id": tenantId, "x-role": "tenant_admin" };
    const routes = [
      "/api/v1/platform/billing/providers/asaas/test-connection",
      "/api/v1/platform/billing/providers/asaas/register-webhook",
      "/api/v1/platform/billing/providers/asaas/enable",
      "/api/v1/platform/billing/providers/asaas/disable",
    ];
    for (const route of routes) {
      const withTenant = await apiRaw("POST", route, { tenantId: randomUUID() }, actorHeaders);
      assert.equal(withTenant.status, 403, JSON.stringify(withTenant.body));
      assert.equal(withTenant.body.error?.reason, "platform_permission_required");

      const withoutTenant = await apiRaw("POST", route, {}, actorHeaders);
      assert.equal(withoutTenant.status, 403, JSON.stringify(withoutTenant.body));
      assert.equal(withoutTenant.body.error?.reason, "platform_permission_required");

      const noActor = await apiRaw("POST", route, {}, {});
      assert.equal(noActor.status, 403, JSON.stringify(noActor.body));
      assert.equal(noActor.body.error?.reason, "platform_actor_required");
    }
  });
}