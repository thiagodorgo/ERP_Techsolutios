// B-ASS-08c1c (plano §4.9, P11b; Emendas 1 §7 c e 1.1 CR2-03) — a visão do cliente: o link, o Pix e o boleto vêm da cobrança
// `pending` do fechamento VIGENTE e sem `charge_cancel` vivo (`findPayableCharge`, `[VIEW-VIGENTE]`, `[VIEW-LIVE]`); com
// pagamento parcial e cobrança vigente, o aviso `full_amount_charge_open` (`[CLIENT-NOTICE]`, só nesse ramo). Nenhuma chave de
// dinheiro. Pela composição de produção (`buildTenantSubscriptionView` sobre o runtime Prisma), no PostgreSQL sob papel efêmero
// NOSUPERUSER NOBYPASSRLS.
//
// Donos: CV1, CV3, CV4, CV5. Mutações: M12 (`payUrl: null,`) → CV1; M-VIEW/M-VIEW2 → CV3/CV4; M-CV5 (apagar CLIENT-NOTICE) → CV5;
// M-CRIT-CV5 (a linha no nível do `payment`) → o caso negativo do CV5.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { startAsaasFake, type AsaasFake } from "./helpers/fake-providers/asaas.js";

// ------------------------------------------------------------------------------------------------ arnês -db (o drill do B-O6R-06)
// Base PRÓPRIA (template0 + `migrate deploy`), papel efêmero NOSUPERUSER NOBYPASSRLS como o singleton do Prisma, o app real no
// modo `prisma`, o Asaas LIGADO na base descartável (env + cofre + `enabled`: a composição de produção `paymentProviderOn`) e o
// despacho real sobre o falso do Asaas. Datas relativas ao relógio do próprio teste.
const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const PERIOD = "2026-10";
const OCT_1 = new Date("2026-10-01T00:00:00-03:00");
const SP_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const DAY_MS = 24 * 60 * 60 * 1000;
const spDayPlus = (days: number): string => SP_DAY.format(new Date(Date.now() + days * DAY_MS));

type Json = Record<string, any>;
type Fixture = { readonly tenantId: string; readonly statementId: string };
type Line = { id: string; kind: string; status: string; skip_reason: string | null; last_error: string | null; payload: Json; external_id: string | null; idempotency_key: string; occurred_at: Date; attempts: number };

const H: {
  admin: any;
  db: any;
  role: EphemeralRole;
  databaseName: string;
  server?: Server;
  baseUrl: string;
  fake?: AsaasFake;
  env: { BILLING_PROVIDERS_ENABLED: boolean; CORE_SAAS_PERSISTENCE: string };
  m: Record<string, any>;
  planIds: string[];
} = { admin: undefined, db: undefined, role: undefined as unknown as EphemeralRole, databaseName: "", baseUrl: "", env: undefined as never, m: {}, planIds: [] };

async function setupDb(prefix: string): Promise<void> {
  const { PrismaClient } = await import("@prisma/client");
  const { createPgAdapter } = await import("../src/database/pg-connection.js");
  H.admin = new PrismaClient({ adapter: createPgAdapter(connectionString!) });
  const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
  H.databaseName = `${base}_${prefix}_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
  await H.admin.$executeRawUnsafe(`CREATE DATABASE "${H.databaseName}" TEMPLATE template0`);
  const url = new URL(connectionString!);
  url.pathname = `/${H.databaseName}`;
  const targetUrl = url.toString();
  const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
  H.db = new PrismaClient({ adapter: createPgAdapter(targetUrl) });
  H.role = await createEphemeralRole(H.db, targetUrl);
  const [posture] = (await H.db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, H.role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
  assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false });
  await H.db.$executeRawUnsafe(`INSERT INTO billing_provider_configs (provider, kind, environment, enabled, enabled_environment) VALUES ('asaas', 'payment', 'sandbox', true, 'sandbox')`);
  (globalThis as { prisma?: unknown }).prisma = H.role.client;
  process.env.DATABASE_URL = targetUrl;
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";
  const [envModule, { createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, statementFactory, vaultFactory, { EnvVaultKeyProvider }, dispatcher, outboxPrisma, http, asaas, channelRuntime, channelJobs, runtime] =
    await Promise.all([
      import("../src/config/env.js"),
      import("../src/app.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
      import("../src/modules/subscription-billing/statements/statement.factory.js"),
      import("../src/modules/subscription-billing/vault/vault.factory.js"),
      import("../src/modules/subscription-billing/vault/vault-keys.js"),
      import("../src/modules/subscription-billing/outbox/outbox.dispatcher.js"),
      import("../src/modules/subscription-billing/outbox/outbox.prisma.js"),
      import("../src/modules/subscription-billing/providers/http/billing-http.client.js"),
      import("../src/modules/subscription-billing/providers/payment/asaas/index.js"),
      import("../src/modules/subscription-billing/outbox/channel.runtime.js"),
      import("../src/modules/subscription-billing/outbox/channel.jobs.js"),
      import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js"),
    ]);
  H.m = { dispatcher, outboxPrisma, http, asaas, channelRuntime, channelJobs, statementFactory, runtime, vaultFactory, EnvVaultKeyProvider };
  H.env = envModule.env as unknown as typeof H.env;
  H.env.CORE_SAAS_PERSISTENCE = "prisma";
  H.env.BILLING_PROVIDERS_ENABLED = true;
  statementFactory.resetStatementRuntimeForTests();
  vaultFactory.resetVaultRuntimeForTests();
  setVault(true);
  const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  H.server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => H.server!.once("listening", resolve));
  H.baseUrl = `http://127.0.0.1:${(H.server.address() as AddressInfo).port}`;
  H.fake = await startAsaasFake();
}

/** O cofre disponível (uma chave de teste gerada agora) ou indisponível (sem chave). O runtime do cofre é refeito. */
function setVault(available: boolean): void {
  H.m.vaultFactory.resetVaultRuntimeForTests();
  H.m.vaultFactory.setVaultKeysForTests(new H.m.EnvVaultKeyProvider(available ? { BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" } : {}));
}

async function teardownDb(): Promise<void> {
  if (H.server) await new Promise<void>((resolve) => H.server!.close(() => resolve()));
  await H.fake?.close();
  await H.role?.drop();
  await H.db?.$disconnect();
  if (H.admin && H.databaseName) await H.admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${H.databaseName}" WITH (FORCE)`);
  await H.admin?.$disconnect();
}

async function api(method: string, route: string, body?: unknown): Promise<{ status: number; body: Json }> {
  const response = await fetch(H.baseUrl + route, { method, headers: { "content-type": "application/json", ...PLATFORM }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: (await response.json()) as Json };
}

const q = (sql: string, ...args: unknown[]) => H.db.$queryRawUnsafe(sql, ...args) as Promise<any[]>;

/** Organização com plano de R$ 100,00 vigente desde 01/10 (o fechamento de `2026-10` dá 10 000 centavos). */
async function seedTenant(tag: string): Promise<string> {
  const slug = `c1c-${tag}-${randomUUID().slice(0, 8)}`;
  const tenantId = (await q(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug))[0].id as string;
  const planId = (await q(`INSERT INTO subscription_plans (code, kind, name) VALUES ($1, 'base', $1) RETURNING id`, `c1c_${randomUUID().replaceAll("-", "").slice(0, 10)}`))[0].id as string;
  H.planIds.push(planId);
  await H.db.$executeRawUnsafe(
    `INSERT INTO subscription_plan_versions (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb, extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
     VALUES ($1::uuid, 1, $2::timestamptz, 100.00, 10, 10.000, 5.00, 2.00, NULL, 'flat', ARRAY['dashboard']::text[])`,
    planId,
    OCT_1,
  );
  await H.db.$executeRawUnsafe(`INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from) VALUES ($1::uuid, $2::uuid, $3::timestamptz)`, tenantId, planId, OCT_1);
  return tenantId;
}

/** Organização + demonstrativo semeado direto (R$ 123,45), no estado pedido. */
async function seedStatement(tag: string, options: { status?: string; mirror?: string; paid?: string; reopenedAt?: Date | null; closedAt?: Date } = {}): Promise<Fixture> {
  const slug = `c1c-${tag}-${randomUUID().slice(0, 8)}`;
  const tenantId = (await q(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug))[0].id as string;
  const statementId = (await q(
    `INSERT INTO subscription_statements
       (tenant_id, period, status, charge_status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
        storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
        base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
        credits_applied_amount, total_amount, paid_amount, due_date, closed_at, reopened_at, snapshot)
     VALUES ($1::uuid, $2, $3, $4, '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 123.45,0,0,0,0,0,123.45, $5::numeric, $6::date, $7, $8, '{"latest":null,"history":[]}'::jsonb) RETURNING id`,
    tenantId,
    PERIOD,
    options.status ?? "closed",
    options.mirror ?? "none",
    options.paid ?? "0",
    spDayPlus(20),
    options.closedAt ?? new Date(Date.now() - 60 * 60 * 1000),
    options.reopenedAt ?? null,
  ))[0].id as string;
  await H.db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);
  return { tenantId, statementId };
}

/** Uma linha `charge_create` (ou `charge_cancel`) no estado pedido; a SENT ganha `external_id` e, se pedido, a cobrança na tabela. */
async function seedLine(f: Fixture, status: string, options: { kind?: string; seq?: number; externalId?: string | null; charge?: string | null; occurredAt?: Date; attempts?: number; lastError?: string | null; nextAttemptAt?: Date | null; skipReason?: string | null; amountCents?: number; payload?: Json } = {}): Promise<{ id: string; externalId: string | null }> {
  const kind = options.kind ?? "charge_create";
  const externalId = options.externalId !== undefined ? options.externalId : status === "SENT" && kind === "charge_create" ? `pay_c1c_${randomUUID().slice(0, 8)}` : null;
  const processing = status === "PROCESSING";
  const payload = options.payload ?? { amountCents: options.amountCents ?? 12345, dueDate: spDayPlus(20), method: "pix" };
  const id = (await q(
    `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, created_at, updated_at, status, attempts, external_id,
                                 claimed_at, claimed_by, attempt_started_at, last_error, next_attempt_at, skip_reason)
     VALUES ($1::uuid, $2::uuid, $3, 'asaas', $4, gen_random_uuid(), $5::jsonb, $6, $6, $6, $7, $8, $9, $10, $11, $10, $12, $13, $14) RETURNING id`,
    f.tenantId,
    f.statementId,
    kind,
    `${kind}:${f.statementId}:${options.seq ?? 1}`,
    JSON.stringify(payload),
    options.occurredAt ?? new Date(),
    status,
    options.attempts ?? (processing ? 1 : 0),
    externalId,
    processing ? new Date() : null,
    processing ? "dispatch-outbox:c1c" : null,
    options.lastError ?? (status === "NEEDS_REVIEW" ? "charge_found_no_candidate" : null),
    options.nextAttemptAt ?? null,
    options.skipReason ?? null,
  ))[0].id as string;
  if (externalId && options.charge) await seedCharge(f, externalId, options.charge);
  return { id, externalId };
}

async function seedCharge(f: Fixture, externalId: string, status: string, createdAt: Date = new Date()): Promise<void> {
  await H.db.$executeRawUnsafe(
    `INSERT INTO subscription_statement_charges (tenant_id, statement_id, provider, external_charge_id, status, pay_url, pix_copy_paste, due_date, created_at)
     VALUES ($1::uuid, $2::uuid, 'asaas', $3, $4, 'https://pay.example/c1c', '00020c1c', $5::date, $6)`,
    f.tenantId,
    f.statementId,
    externalId,
    status,
    spDayPlus(20),
    createdAt,
  );
}

async function lines(statementId: string): Promise<Line[]> {
  return (await q(`SELECT id, kind, status, skip_reason, last_error, payload, external_id, idempotency_key, occurred_at, attempts FROM billing_outbox WHERE statement_id = $1::uuid ORDER BY created_at, idempotency_key`, statementId)) as Line[];
}

async function chargeRows(statementId: string): Promise<Array<{ external_charge_id: string; status: string }>> {
  return (await q(`SELECT external_charge_id, status FROM subscription_statement_charges WHERE statement_id = $1::uuid ORDER BY created_at, external_charge_id`, statementId)) as Array<{ external_charge_id: string; status: string }>;
}

async function statementRow(statementId: string): Promise<{ id: string; status: string; charge_status: string; total: number; paid: number; due_date: string | null; closed_at: Date | null; reopened_at: Date | null }> {
  return (await q(`SELECT id, status, charge_status, round(total_amount * 100)::int AS total, round(paid_amount * 100)::int AS paid, to_char(due_date, 'YYYY-MM-DD') AS due_date, closed_at, reopened_at FROM subscription_statements WHERE id = $1::uuid`, statementId))[0];
}

async function statementOfTenant(tenantId: string): Promise<{ id: string; status: string }> {
  return (await q(`SELECT id, status FROM subscription_statements WHERE tenant_id = $1::uuid AND period = $2`, tenantId, PERIOD))[0];
}

const closeRoute = (tenantId: string) => api("POST", "/api/v1/platform/billing/statements/close", { tenantId, period: PERIOD });
const reopenRoute = (f: Fixture) => api("POST", `/api/v1/platform/billing/statements/${f.statementId}/reopen`, { tenantId: f.tenantId, reason: "refazer o fechamento do mês" });
const payRoute = (f: Fixture, amount: string) => api("POST", `/api/v1/platform/billing/statements/${f.statementId}/payments`, { tenantId: f.tenantId, amount, method: "pix" });
const cancelRoute = (f: Fixture) => api("POST", `/api/v1/platform/billing/statements/${f.statementId}/cancel`, { tenantId: f.tenantId, reason: "conta lançada por engano" });
const chargeCancelRoute = (f: Fixture) => api("POST", `/api/v1/platform/billing/statements/${f.statementId}/charge/cancel`, { tenantId: f.tenantId, reason: "cliente pediu o cancelamento da cobrança" });

function adapterOverFake(): any {
  const client = new H.m.http.BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${H.fake!.baseUrl}/v3` });
  return new H.m.asaas.AsaasPaymentAdapter(client, async (kind: string) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE"));
}

function recorded(method: string, prefix: string): number {
  return H.fake!.recorded.filter((request: { method: string; path: string }) => request.method === method && request.path.split("?")[0]!.startsWith(prefix)).length;
}
const postsToPayments = () => H.fake!.recorded.filter((request: { method: string; path: string }) => request.method === "POST" && request.path.split("?")[0] === "/v3/payments").length;
const deletesOfPayments = () => recorded("DELETE", "/v3/payments/");

async function dispatch(tenantId: string, options: { now?: Date; port?: any } = {}): Promise<any> {
  return H.m.dispatcher.runDispatchOutbox({
    repo: new H.m.outboxPrisma.PrismaOutboxRepository(H.role.client, { tenantIds: [tenantId] }),
    ports: { asaas: options.port ?? adapterOverFake() },
    resolveCustomer: async () => ({ ok: true as const, customerId: "cus_c1c" }),
    ...(options.now ? { now: () => options.now! } : {}),
  });
}

/** As dependências de produção dos jobs do canal, com o falso do Asaas no lugar da porta real e o relógio do teste. */
async function channelDeps(now: Date = new Date()): Promise<any> {
  const deps = await H.m.channelRuntime.createChannelRuntime();
  return { ...deps, ports: { asaas: adapterOverFake() }, resolveCustomer: async () => ({ ok: true as const, customerId: "cus_c1c" }), resolveExpectedCustomerId: async () => null, now: () => now };
}

// ------------------------------------------- conserto da J-579 (C3-A3): a metade do DUBLÊ do `findPayableCharge`, sem banco
// Pela composição de memória de produção (`createDefaultStatementRuntime` + `createChannelRuntime`, o molde do CL1-mem): o
// fechamento enfileira, o registro do dublê grava a cobrança `pending`, e a cobrança pagável é lida pelo dublê do repositório.
async function memoryPayable(tag: string, mutate: (ctx: { runtime: any; deps: any; statementId: string; chargeId: string }) => Promise<void>) {
  const [envModule, factory, channel, vault, keys, serviceModule] = await Promise.all([
    import("../src/config/env.js"),
    import("../src/modules/subscription-billing/statements/statement.factory.js"),
    import("../src/modules/subscription-billing/outbox/channel.runtime.js"),
    import("../src/modules/subscription-billing/vault/vault.factory.js"),
    import("../src/modules/subscription-billing/vault/vault-keys.js"),
    import("../src/modules/subscription-billing/statements/statement.service.js"),
  ]);
  const env = envModule.env as unknown as { BILLING_PROVIDERS_ENABLED: boolean; CORE_SAAS_PERSISTENCE: string };
  const before = { persistence: env.CORE_SAAS_PERSISTENCE, enabled: env.BILLING_PROVIDERS_ENABLED };
  env.CORE_SAAS_PERSISTENCE = "memory";
  env.BILLING_PROVIDERS_ENABLED = true;
  factory.resetStatementRuntimeForTests();
  channel.resetChannelRuntimeForTests();
  vault.resetVaultRuntimeForTests();
  vault.setVaultKeysForTests(new keys.EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }));
  try {
    const configs = vault.getMemoryVaultForTests().configs;
    await configs.upsert({ provider: "asaas", kind: "payment", environment: "sandbox", settings: {} }, new Date());
    configs.setEnabledForTests("asaas", true);
    const runtime = await factory.createDefaultStatementRuntime();
    const ready = {
      kind: "ready" as const,
      subscriptionId: `sub_${tag}`,
      planVersionId: `pv_${tag}`,
      addonPlanVersionId: null,
      computation: {
        daysInMonth: 31,
        segments: [{ fromDay: 1, toDay: 31, monthlyPriceCents: 10_000 }],
        terms: { includedUsers: 10, includedStorageMilliGb: 10_000, extraUserPriceCents: 500, extraGbPriceCents: 200 },
        measurements: { usersPeak: 1, storagePeakMilliGb: 100, trackedVehicles: 0 },
        perVehiclePriceCents: null,
      } as never,
      daysMeasured: 31,
      gaps: [],
      dueDays: 10,
    };
    const tenantId = `ten_${tag}`;
    const service = new serviceModule.StatementService(runtime.repository, { resolve: async () => ready }, runtime.audit, (runtime.service as unknown as { channel: never }).channel);
    const closedOut = (await service.close({ tenantId, period: "2026-10", now: new Date(), actorId: null, source: "manual" })) as { statement: { id: string } };
    const statementId = closedOut.statement.id;
    const deps = await channel.createChannelRuntime();
    deps.outbox.configureChargeOutcomeSink?.(async (charge: any, at: Date) => {
      await deps.charges.insert(charge, at);
      await deps.refs.setExternalChargeId(charge.statementId, charge.externalChargeId, at);
    });
    const claimed = (await deps.outbox.claimNext({ enabledProviders: ["asaas"], now: new Date(), claimedBy: `w-${tag}`, orphanMs: 600_000, verdict: () => ({ kind: "eligible" }) })) as { kind: string; row: any };
    assert.equal(claimed.kind, "claimed");
    const chargeId = `pay_${tag}`;
    await deps.outbox.recordChargeOutcome(tenantId, claimed.row, { claimedBy: claimed.row.claimedBy, attemptStartedAt: claimed.row.attemptStartedAt }, { kind: "created", result: { chargeId, status: "pending", payUrl: "https://pay.example/mem" } }, new Date());
    const payable = await runtime.repository.findPayableCharge(tenantId, statementId);
    assert.equal(payable?.externalChargeId, chargeId, "controle: antes, a cobrança vigente é pagável");
    await mutate({ runtime, deps, statementId, chargeId });
    return await runtime.repository.findPayableCharge(tenantId, statementId);
  } finally {
    env.CORE_SAAS_PERSISTENCE = before.persistence;
    env.BILLING_PROVIDERS_ENABLED = before.enabled;
    factory.resetStatementRuntimeForTests();
    channel.resetChannelRuntimeForTests();
    vault.resetVaultRuntimeForTests();
  }
}

test("CV3-mem (C3-A3): no dublê, com charge_cancel vivo para a cobrança → nada pagável (payUrl nulo)", async () => {
  const payable = await memoryPayable("cv3m", async ({ deps, statementId, chargeId }) => {
    await deps.outbox.enqueue({ tenantId: "ten_cv3m", statementId, kind: "charge_cancel", provider: "asaas", seq: 1, payload: { chargeId, chargeCreateId: null } }, new Date());
  });
  assert.equal(payable, undefined);
});

test("CV4-mem (C3-A3): no dublê, a cobrança pending de um fechamento desfeito (reaberto depois, com outro total) → nada pagável", async () => {
  const payable = await memoryPayable("cv4m", async ({ runtime, statementId }) => {
    await runtime.repository.transaction("ten_cv4m", async (tx: any) => {
      const current = await tx.lockById(statementId);
      await tx.saveStatement({ ...current, reopenedAt: new Date(Date.now() + 60_000), totalCents: 9_000 });
    });
  });
  assert.equal(payable, undefined);
});

if (!connectionString) {
  test("B-ASS-08c1c · a visão do cliente exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  after(teardownDb);

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, Asaas ligado e o app real no modo prisma", async () => {
    await setupDb("c1c_view");
  });

  /** A visão do cliente pela composição de produção (`buildTenantSubscriptionView` sobre o runtime Prisma do app). */
  async function clientView(tenantId: string): Promise<Json | null> {
    const runtime = await H.m.statementFactory.createDefaultStatementRuntime();
    const { buildTenantSubscriptionView } = await import("../src/modules/subscription-billing/statements/subscription-view.js");
    return (await buildTenantSubscriptionView(runtime, tenantId, new Date())) as Json | null;
  }

  async function moneyKeys(value: unknown): Promise<string[]> {
    const { findMoneyKeys } = await import("../src/modules/subscription-billing/charges/charge-view.js");
    return findMoneyKeys(value);
  }

  async function charged(tag: string): Promise<Fixture> {
    const tenantId = await seedTenant(tag);
    assert.equal((await closeRoute(tenantId)).status, 200);
    const statementId = (await statementOfTenant(tenantId)).id;
    const run = await dispatch(tenantId);
    assert.equal(run.outcomes.sent, 1, JSON.stringify(run.outcomes));
    return { tenantId, statementId };
  }

  test("CV1: cobrança pending do fechamento vigente → payUrl, Pix e boleto na visão do cliente; nenhuma chave de dinheiro", async () => {
    const f = await charged("cv1");
    const view = await clientView(f.tenantId);
    assert.equal(view?.payment?.statementId, f.statementId);
    assert.match(String(view?.payment?.payUrl), /^https:\/\//, JSON.stringify(view?.payment));
    assert.ok(view?.payment?.pixCopyPaste, "o Pix copia-e-cola");
    assert.equal(view?.payment?.notice, undefined, "sem pagamento parcial, sem aviso");
    assert.deepEqual(await moneyKeys(view), []);
  });

  test("CV3: com charge_cancel vivo para a cobrança → payUrl nulo", async () => {
    const f = await charged("cv3");
    const cancel = await chargeCancelRoute(f);
    assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
    const view = await clientView(f.tenantId);
    assert.equal(view?.payment?.statementId, f.statementId);
    assert.equal(view?.payment?.payUrl, null);
    assert.equal(view?.payment?.pixCopyPaste, null);
  });

  test("CV4: cobrança pending de um fechamento desfeito (refechado com outro total, sem cancelar) → payUrl nulo", async () => {
    const f = await charged("cv4");
    await H.db.$executeRawUnsafe(`UPDATE subscription_statements SET reopened_at = now(), total_amount = 90.00 WHERE id = $1::uuid`, f.statementId);
    const view = await clientView(f.tenantId);
    assert.equal(view?.payment?.statementId, f.statementId);
    assert.equal(view?.payment?.payUrl, null);
  });

  test("CV5: baixa parcial com a cobrança cheia pending → payUrl e notice; sem pagamento → sem notice; parcial SEM cobrança vigente → sem notice", async () => {
    const f = await charged("cv5");
    const without = await clientView(f.tenantId);
    assert.equal(without?.payment?.notice, undefined, "sem pagamento → sem aviso");
    const paid = await payRoute(f, "30.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    const partial = await clientView(f.tenantId);
    assert.match(String(partial?.payment?.payUrl), /^https:\/\//);
    assert.equal(partial?.payment?.notice, "full_amount_charge_open");
    assert.deepEqual(await moneyKeys(partial), []);
    // CR2-03: parcial SEM cobrança vigente (o canal desligado no fechamento: nenhuma cobrança) → sem aviso.
    const tenantId = await seedTenant("cv5-off");
    H.env.BILLING_PROVIDERS_ENABLED = false;
    try {
      assert.equal((await closeRoute(tenantId)).status, 200);
    } finally {
      H.env.BILLING_PROVIDERS_ENABLED = true;
    }
    const g = { tenantId, statementId: (await statementOfTenant(tenantId)).id };
    assert.equal((await payRoute(g, "30.00")).status, 201);
    const noCharge = await clientView(tenantId);
    assert.equal(noCharge?.payment?.statementId, g.statementId);
    assert.equal(noCharge?.payment?.payUrl, null);
    assert.equal(noCharge?.payment?.notice, undefined, "sem cobrança vigente → sem aviso");
  });
}
