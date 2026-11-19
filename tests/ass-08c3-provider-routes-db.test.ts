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
import { AsaasPaymentAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/index.js";
import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { paymentProviderOn } from "../src/modules/subscription-billing/outbox/channel-state.js";
import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { PrismaOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { createVaultPlatformRouter } from "../src/modules/subscription-billing/vault/vault.platform.routes.js";
import { assertApplicationNamePropagated, captureSettled, expectRejected, waitForOwnBlockedStatement } from "./helpers/pg-barrier.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const TOKEN_ASAAS = "TOKEN-ASAAS-FAKE";
const WEBHOOK_ASAAS = "WEBHOOK-ASAAS-FAKE";
const TOKEN_FOCUS = "TOKEN-FOCUS-FAKE";
const WEBHOOK_FOCUS = "WEBHOOK-FOCUS-FAKE";
const PUBLIC_BASE = "https://public.invalid";
const APP_NAME = `o6r-08c3-provider-routes-${process.pid}`;

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

  const q = (sql: string, ...args: unknown[]) => db.$queryRawUnsafe(sql, ...args) as Promise<any[]>;

  async function resetAsaasDisabled(): Promise<void> {
    await db.$executeRawUnsafe(
      `UPDATE billing_provider_configs SET enabled = false, enabled_environment = NULL, enabled_at = NULL, enabled_by = NULL WHERE provider = 'asaas'`,
    );
  }

  async function arrangeAsaasReady(environment: "sandbox" | "production" = "sandbox"): Promise<void> {
    await db.$executeRawUnsafe(
      `UPDATE billing_provider_configs
          SET enabled = false,
              enabled_environment = NULL,
              enabled_at = NULL,
              enabled_by = NULL,
              last_test_ok = true,
              last_test_environment = $1::text,
              last_test_at = now(),
              last_test_error = NULL,
              webhook_registered_at = now(),
              webhook_registered_environment = $1::text,
              webhook_external_id = 'wh_ext_fake',
              webhook_public_url = $2::text
        WHERE provider = 'asaas'`,
      environment,
      `${PUBLIC_BASE}/api/v1/webhooks/billing/asaas`,
    );
  }

  async function seedStatementForProvider(tag: string, tenantId?: string, period = "2026-10"): Promise<{ tenantId: string; statementId: string }> {
    let owner = tenantId;
    if (!owner) {
      const slug = `c3a-${tag}-${randomUUID().slice(0, 8)}`;
      owner = (await q(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug))[0].id as string;
    }
    const dueDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 20 * 24 * 60 * 60 * 1000));
    const statementId = (await q(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, charge_status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, paid_amount, due_date, closed_at, reopened_at, snapshot)
       VALUES ($1::uuid, $4::text, 'closed', 'none', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 123.45,0,0,0,0,0,123.45, 0::numeric, $2::date, $3, NULL, '{"latest":null,"history":[]}'::jsonb) RETURNING id`,
      owner,
      dueDate,
      new Date(Date.now() - 60 * 60 * 1000),
      period,
    ))[0].id as string;
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, owner);
    return { tenantId: owner, statementId };
  }

  async function seedOutboxLine(f: { tenantId: string; statementId: string }, options: { seq?: number; occurredAt?: Date } = {}): Promise<string> {
    const occurredAt = options.occurredAt ?? new Date();
    const payload = { amountCents: 12345, dueDate: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)), method: "pix" };
    const rows = (await q(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, created_at, updated_at, status, attempts)
       VALUES ($1::uuid, $2::uuid, 'charge_create', 'asaas', $3, gen_random_uuid(), $4::jsonb, $5, $5, $5, 'PENDING', 0) RETURNING id`,
      f.tenantId,
      f.statementId,
      `charge_create:${f.statementId}:${options.seq ?? 1}`,
      JSON.stringify(payload),
      occurredAt,
    )) as Array<{ id: string }>;
    return rows[0]!.id;
  }

  function asaasAdapterOverFake(fake: AsaasFake): AsaasPaymentAdapter {
    const client = new BillingHttpClient({
      provider: "asaas",
      environment: "sandbox",
      channelEnabled: true,
      allowLocalHosts: true,
      nodeEnv: "test",
      baseUrl: `${fake.baseUrl}/v3`,
    });
    return new AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? TOKEN_ASAAS : WEBHOOK_ASAAS));
  }

  async function dispatchRound(tenantId: string, fake: AsaasFake | null, now: Date): Promise<{ processed: number; sent: number; needsReview: number }> {
    const repo = new PrismaOutboxRepository(role.client, { tenantIds: [tenantId] });
    const result = await runDispatchOutbox({
      repo,
      ports: fake ? { asaas: asaasAdapterOverFake(fake) } : {},
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_fake" }),
      now: () => now,
    });
    return { processed: result.processed, sent: result.outcomes.sent ?? 0, needsReview: result.outcomes.needs_review ?? 0 };
  }
  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, cofre e catálogo de teste", async () => {
    const [{ PrismaClient }] = await Promise.all([import("@prisma/client")]);
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_c3a_prov_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    url.searchParams.set("application_name", APP_NAME);
    const targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(targetUrl) });
    role = await createEphemeralRole(db, targetUrl);
    const [posture] = (await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false });
    await assertApplicationNamePropagated(role.client, APP_NAME);

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

  test("EN1: sem teste e sem webhook → enable_preconditions_failed com last_test_required e webhook_not_registered_for_environment", async () => {
    await db.$executeRawUnsafe(
      `UPDATE billing_provider_configs
          SET enabled = false, enabled_environment = NULL, enabled_at = NULL, enabled_by = NULL,
              last_test_ok = NULL, last_test_environment = NULL, last_test_at = NULL, last_test_error = NULL,
              webhook_registered_at = NULL, webhook_registered_environment = NULL, webhook_external_id = NULL, webhook_public_url = NULL
        WHERE provider = 'asaas'`,
    );
    const response = await api("POST", "/api/v1/platform/billing/providers/asaas/enable", { confirm: "asaas:sandbox" });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "enable_preconditions_failed");
    assert.ok(response.body.error.details.failed.includes("last_test_required"), JSON.stringify(response.body));
    assert.ok(response.body.error.details.failed.includes("webhook_not_registered_for_environment"), JSON.stringify(response.body));
    assert.equal((await configRow("asaas"))!.enabled, false);
  });

  test("EN2: teste ok + webhook + confirm correto → 200 e enabled no banco", async () => {
    await arrangeAsaasReady();
    const actorId = randomUUID();
    const response = await apiRaw("POST", "/api/v1/platform/billing/providers/asaas/enable", { confirm: "asaas:sandbox" }, { "x-user-id": actorId, "x-role": "super_admin" });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual(Object.keys(response.body.data).sort(), ["enabledAt", "enabledBy", "environment", "provider"]);
    assert.equal(response.body.data.provider, "asaas");
    assert.equal(response.body.data.environment, "sandbox");
    assert.equal(response.body.data.enabledBy, actorId);

    const row = await configRow("asaas");
    assert.equal(row!.enabled, true);
    assert.equal(row!.enabled_environment, "sandbox");
    assert.equal(row!.enabled_by, actorId);
    assert.ok(Math.abs(new Date(row!.enabled_at).getTime() - Date.now()) < 10_000);

    const trail = await auditActions("asaas", "billing_provider.enabled");
    assert.equal(trail.length, 1, JSON.stringify(trail));
    assert.deepEqual(Object.keys(trail[0]!.metadata).sort(), ["actor_user_id", "environment", "kind", "provider"]);
    assert.equal(JSON.stringify(trail).includes(TOKEN_ASAAS), false);
    assert.equal((await paymentProviderOn(runtime))?.provider, "asaas");
    await resetAsaasDisabled();
  });

  test("EN3: outro provedor de pagamento ligado → enable 422 another_provider_enabled_for_kind", async () => {
    await runtime.providers.updateSettings("mercadopago", { environment: "sandbox", settings: {} });
    await db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = false, enabled_environment = NULL WHERE provider = 'mercadopago'`);
    await arrangeAsaasReady();
    await db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = true, enabled_environment = 'sandbox', enabled_at = now(), enabled_by = NULL WHERE provider = 'mercadopago'`);
    try {
      const response = await api("POST", "/api/v1/platform/billing/providers/asaas/enable", { confirm: "asaas:sandbox" });
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error?.reason, "enable_preconditions_failed");
      assert.ok(response.body.error.details.failed.includes("another_provider_enabled_for_kind"), JSON.stringify(response.body));
      assert.equal((await configRow("asaas"))!.enabled, false);
    } finally {
      await db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = false, enabled_environment = NULL WHERE provider = 'mercadopago'`);
      await resetAsaasDisabled();
    }
  });

  test("EN3b: corrida do G14 — dono liga outro provedor sem commitar, enable espera e vira 409", async () => {
    await runtime.providers.updateSettings("mercadopago", { environment: "sandbox", settings: {} });
    await db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = false, enabled_environment = NULL WHERE provider = 'mercadopago'`);
    await arrangeAsaasReady();
    const trailBefore = (await auditActions("asaas", "billing_provider.enabled")).length;

    let release!: () => void;
    const ownerGate = new Promise<void>((resolve) => { release = resolve; });
    const ownerTx = db.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = true, enabled_environment = 'sandbox', enabled_at = now(), enabled_by = NULL WHERE provider = 'mercadopago'`);
      await ownerGate;
    }, { timeout: 20000 });

    const enablePromise = runtime.providers.enable("asaas", { confirm: "asaas:sandbox" }, null);
    await waitForOwnBlockedStatement(role.client, { applicationName: APP_NAME, fragment: "billing_provider_configs", label: "EN3b enable do Asaas bloqueado no índice G14", timeoutMs: 15000 });

    release();
    await ownerTx;
    const outcome = await captureSettled(enablePromise);
    const reason = expectRejected(outcome, "EN3b enable do Asaas") as { statusCode: number; reason: string };
    assert.equal(reason.statusCode, 409);
    assert.equal(reason.reason, "another_provider_enabled_for_kind");

    const enabled = (await q(`SELECT count(*)::int AS n FROM billing_provider_configs WHERE enabled = true`)) as Array<{ n: number }>;
    assert.equal(enabled[0]!.n, 1);
    assert.equal((await configRow("asaas"))!.enabled, false);
    assert.equal((await auditActions("asaas", "billing_provider.enabled")).length, trailBefore);
    await db.$executeRawUnsafe(`UPDATE billing_provider_configs SET enabled = false, enabled_environment = NULL WHERE provider = 'mercadopago'`);
  });

  test("EN4: disable → provider_disabled; religar em 3 dias → 1 POST; 8 dias → stale_on_reenable", async () => {
    await resetAsaasDisabled();
    await arrangeAsaasReady();
    const enabledNow = await api("POST", "/api/v1/platform/billing/providers/asaas/enable", { confirm: "asaas:sandbox" });
    assert.equal(enabledNow.status, 200, JSON.stringify(enabledNow.body));

    const threeDays = await seedStatementForProvider("en4a", undefined, "2026-10");
    const eightDays = await seedStatementForProvider("en4b", threeDays.tenantId, "2026-09");
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const threeId = await seedOutboxLine(threeDays, { seq: 1, occurredAt: new Date(now.getTime() - 3 * day) });
    const eightId = await seedOutboxLine(eightDays, { seq: 1, occurredAt: new Date(now.getTime() - 8 * day) });

    const disable = await api("POST", "/api/v1/platform/billing/providers/asaas/disable");
    assert.equal(disable.status, 200, JSON.stringify(disable.body));
    assert.equal((await configRow("asaas"))!.enabled, false);
    assert.equal((await configRow("asaas"))!.enabled_environment, null);

    const offRound = await dispatchRound(threeDays.tenantId, null, now);
    assert.equal(offRound.processed, 0, JSON.stringify(offRound));
    const offThree = (await q(`SELECT status, skip_reason FROM billing_outbox WHERE id = $1::uuid`, threeId))[0];
    const offEight = (await q(`SELECT status, skip_reason FROM billing_outbox WHERE id = $1::uuid`, eightId))[0];
    assert.deepEqual([offThree.status, offThree.skip_reason], ["PENDING", "provider_disabled"]);
    assert.deepEqual([offEight.status, offEight.skip_reason], ["PENDING", "provider_disabled"]);

    await arrangeAsaasReady();
    const reenable = await api("POST", "/api/v1/platform/billing/providers/asaas/enable", { confirm: "asaas:sandbox" });
    assert.equal(reenable.status, 200, JSON.stringify(reenable.body));

    const fake = await startAsaasFake("ok");
    try {
      pointCatalog("asaas", `${fake.baseUrl}/v3`);
      const onRound = await dispatchRound(threeDays.tenantId, fake, now);
      assert.equal(onRound.sent, 1, JSON.stringify(onRound));
      assert.equal(onRound.needsReview, 1, JSON.stringify(onRound));
      const posts = fake.recorded.filter((request) => request.method === "POST" && request.path.split("?")[0] === "/v3/payments");
      assert.equal(posts.length, 1, JSON.stringify(fake.recorded));

      const three = (await q(`SELECT status, external_id, last_error FROM billing_outbox WHERE id = $1::uuid`, threeId))[0];
      assert.equal(three.status, "SENT");
      assert.ok(three.external_id);
      const eight = (await q(`SELECT status, external_id, last_error FROM billing_outbox WHERE id = $1::uuid`, eightId))[0];
      assert.equal(eight.status, "NEEDS_REVIEW");
      assert.equal(eight.last_error, "stale_on_reenable");
      assert.equal(eight.external_id, null);
    } finally {
      await fake.close();
      await resetAsaasDisabled();
    }
  });

  test("EN5: confirm errado → 422 confirm_mismatch", async () => {
    await arrangeAsaasReady();
    const response = await api("POST", "/api/v1/platform/billing/providers/asaas/enable", { confirm: "asaas:production" });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "enable_preconditions_failed");
    assert.ok(response.body.error.details.failed.includes("confirm_mismatch"), JSON.stringify(response.body));
    assert.equal((await configRow("asaas"))!.enabled, false);
  });

  test("EN6r: NODE_ENV=production e saltos 0 → 422 webhook_proxy_hops_unset", async () => {
    const previousNodeEnv = mutableEnv.NODE_ENV;
    const previousHops = mutableEnv.BILLING_WEBHOOK_TRUSTED_PROXY_HOPS;
    mutableEnv.NODE_ENV = "production";
    mutableEnv.BILLING_WEBHOOK_TRUSTED_PROXY_HOPS = 0;
    try {
      await arrangeAsaasReady();
      const response = await api("POST", "/api/v1/platform/billing/providers/asaas/enable", { confirm: "asaas:sandbox" });
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error?.reason, "enable_preconditions_failed");
      assert.ok(response.body.error.details.failed.includes("webhook_proxy_hops_unset"), JSON.stringify(response.body));
      assert.equal((await configRow("asaas"))!.enabled, false);
    } finally {
      mutableEnv.NODE_ENV = previousNodeEnv;
      mutableEnv.BILLING_WEBHOOK_TRUSTED_PROXY_HOPS = previousHops;
      await resetAsaasDisabled();
    }
  });

  test("EN7: deep scan — nenhuma resposta ou trilha vaza segredo, url, id externo ou tenant alheio", async () => {
    await resetAsaasDisabled();
    await arrangeAsaasReady();
    const foreignTenantId = randomUUID();
    const fake = await startAsaasFake("ok");
    const bodies: Json[] = [];
    try {
      pointCatalog("asaas", `${fake.baseUrl}/v3`);
      const record = (response: { status: number; body: Json }) => { bodies.push(response.body); return response; };
      assert.equal(record(await api("GET", "/api/v1/platform/billing/providers")).status, 200);
      assert.equal(record(await api("GET", "/api/v1/platform/billing/providers/asaas")).status, 200);
      assert.equal(record(await api("PUT", "/api/v1/platform/billing/providers/asaas", { environment: "sandbox", settings: {} })).status, 200);
      assert.equal(record(await api("PUT", "/api/v1/platform/billing/providers/asaas/credentials", { kind: "api_token", secret: TOKEN_ASAAS })).status, 200);
      assert.equal(record(await api("POST", "/api/v1/platform/billing/providers/asaas/test-connection")).status, 200);
      assert.equal(record(await api("POST", "/api/v1/platform/billing/providers/asaas/register-webhook")).status, 200);
      assert.equal(record(await api("POST", "/api/v1/platform/billing/providers/asaas/enable", { confirm: "asaas:sandbox" })).status, 200);
      assert.equal(record(await api("POST", "/api/v1/platform/billing/providers/asaas/disable")).status, 200);

      const audits = (await q(`SELECT action, metadata FROM platform_audit_logs WHERE entity = 'billing_provider'`)) as Array<{ action: string; metadata: Json }>;
      const forbidden = [TOKEN_ASAAS, WEBHOOK_ASAAS, TOKEN_FOCUS, WEBHOOK_FOCUS, PUBLIC_BASE, "wh_ext_fake", foreignTenantId];
      for (const body of bodies) {
        const text = JSON.stringify(body);
        for (const token of forbidden) assert.equal(text.includes(token), false, `resposta vazou "${token}": ${text.slice(0, 240)}`);
      }
      const auditText = JSON.stringify(audits);
      for (const token of forbidden) assert.equal(auditText.includes(token), false, `trilha vazou "${token}"`);
      for (const row of audits) {
        assert.equal("tenant_id" in row.metadata, false, JSON.stringify(row));
        assert.equal("tenantId" in row.metadata, false, JSON.stringify(row));
      }
    } finally {
      await fake.close();
      await resetAsaasDisabled();
    }
  });

  test("EN8: teste ok em sandbox, PUT muda ambiente para production → 422 last_test_environment_mismatch", async () => {
    await arrangeAsaasReady("sandbox");
    const put = await api("PUT", "/api/v1/platform/billing/providers/asaas", { environment: "production", settings: {} });
    assert.equal(put.status, 200, JSON.stringify(put.body));
    try {
      const response = await api("POST", "/api/v1/platform/billing/providers/asaas/enable", { confirm: "asaas:production" });
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error?.reason, "enable_preconditions_failed");
      assert.ok(response.body.error.details.failed.includes("last_test_environment_mismatch"), JSON.stringify(response.body));
      assert.equal((await configRow("asaas"))!.enabled, false);
    } finally {
      await api("PUT", "/api/v1/platform/billing/providers/asaas", { environment: "sandbox", settings: {} });
      await resetAsaasDisabled();
    }
  });

  test("EW1: censo de rotas do cofre — só enable muda enabled", async () => {
    await resetAsaasDisabled();
    const router = createVaultPlatformRouter();
    const census = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack
      .filter((layer) => layer.route)
      .map((layer) => ({ method: Object.keys(layer.route!.methods)[0]!.toUpperCase(), path: layer.route!.path }));
    const expected = [
      "GET /providers",
      "GET /providers/:provider",
      "PUT /providers/:provider",
      "PUT /providers/:provider/credentials",
      "POST /providers/:provider/test-connection",
      "POST /providers/:provider/register-webhook",
      "POST /providers/:provider/enable",
      "POST /providers/:provider/disable",
      "POST /vault/rotate",
    ];
    assert.deepEqual(census.map((r) => `${r.method} ${r.path}`).sort(), [...expected].sort());

    const fake = await startAsaasFake("ok");
    try {
      pointCatalog("asaas", `${fake.baseUrl}/v3`);
      const call = async (method: string, path: string, body?: unknown) => api(method, `/api/v1/platform/billing${path.replace(":provider", "asaas")}`, body);

      for (const route of census) {
        if (route.path === "/providers/:provider/enable" || route.path === "/vault/rotate") continue;
        const before = await configRow("asaas");
        if (route.method === "GET") {
          await call(route.method, route.path);
        } else if (route.path === "/providers/:provider") {
          await call(route.method, route.path, { environment: "sandbox", settings: {} });
        } else if (route.path === "/providers/:provider/credentials") {
          await call(route.method, route.path, { kind: "api_token", secret: TOKEN_ASAAS });
        } else {
          await call(route.method, route.path, {});
        }
        const after = await configRow("asaas");
        assert.equal(after!.enabled, before!.enabled, `${route.method} ${route.path} mudou enabled`);
        assert.equal(after!.enabled, false, `${route.method} ${route.path} deixou enabled true`);
      }

      await arrangeAsaasReady();
      const enable = await call("POST", "/providers/:provider/enable", { confirm: "asaas:sandbox" });
      assert.equal(enable.status, 200, JSON.stringify(enable.body));
      assert.equal((await configRow("asaas"))!.enabled, true);

      const beforeRotate = await configRow("asaas");
      const rotate = await call("POST", "/vault/rotate", {});
      assert.equal(rotate.status, 200, JSON.stringify(rotate.body));
      assert.equal((await configRow("asaas"))!.enabled, beforeRotate!.enabled);
    } finally {
      await fake.close();
      await resetAsaasDisabled();
    }
  });
}
