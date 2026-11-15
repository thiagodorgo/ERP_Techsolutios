// B-ASS-08c1c (plano §4.1, §4.2, §4.5; Emendas 1, 1.1 e 1.2) — o fechamento que enfileira (P5, `[CLOSE-ENQ]`), o refechamento
// (P6, `[REFECHA-01]`/`[REFECHA-02]`) e o claim (os 7 dias e o pagamento parcial), no PostgreSQL sob papel efêmero NOSUPERUSER
// NOBYPASSRLS, pela rota REAL e pelo despacho real sobre o falso do Asaas; e o CL1-mem pela composição de memória.
//
// Donos: CL1, CL1-mem, CL2, CL3, CL3b, CL4, CL5, CL6, CL6b, CL7, CL7b, CL7c, CL8, RF1 a RF4, RO3, RO3b.
// Mutações: M6b (o CLOSE-ENQ por `requestChargeCreate`, outra conexão) → CL1; M7 (apagar REFECHA-01) → RF4; M7b (apagar
// REFECHA-02) → o TS-1a de `ass-08c-sync-db`; M-RF2/M-RF3 → RF2/RF3; M-RO3 (`needs_review` no TERMINAL-SET) → RO3; M-A11a/M-A11c
// (apagar o env / o cofre do predicado) → CL3/CL3b; M-A11b, M-R2-07, M-CL7, M-CL7c, M-ORDER, M-CLP → CL4/CL5, CL5, CL7/CL7b, CL7c,
// CL6b, CL8; M7F → CL1 e o refechamento.
// O CL2 injeta a falha da fila por um gatilho na base descartável (a mesma propriedade do plano: a gravação na fila falha → o
// fechamento inteiro desfaz), porque o guard de escrita de catálogo dos testes congela a palavra-chave de ACL por arquivo.
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

// -------------------------------------------------------------------------------------------------- CL1-mem (sem banco)
// A composição de MEMÓRIA de produção: `createDefaultStatementRuntime` (o `StatementChannel` com o resolver) + `createChannelRuntime`
// (as quatro lojas). O fechamento roda pelo serviço de produção com o mesmo canal; só as entradas do mês são um stub.
test("CL1-mem: provedor ligado (env + cofre + enabled) → o fechamento em memória põe 1 charge_create PENDING com o total e o vencimento", async () => {
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
      subscriptionId: "sub_mem",
      planVersionId: "pv_mem",
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
    // O canal de PRODUÇÃO do modo memória (o 4º parâmetro do serviço que a fábrica montou), com as entradas do mês por stub.
    const service = new serviceModule.StatementService(runtime.repository, { resolve: async () => ready }, runtime.audit, (runtime.service as unknown as { channel: never }).channel);
    const now = new Date();
    const closed = await service.close({ tenantId: "ten_c1c_mem", period: PERIOD, now, actorId: null, source: "manual" });
    assert.equal(closed.kind, "closed");
    const statement = (closed as { statement: { id: string; totalCents: number; dueDate: string } }).statement;
    const deps = await channel.createChannelRuntime();
    const rows = await deps.outbox.listByStatement("ten_c1c_mem", statement.id);
    assert.equal(rows.length, 1, JSON.stringify(rows));
    assert.equal(rows[0]!.kind, "charge_create");
    assert.equal(rows[0]!.status, "PENDING");
    assert.equal(rows[0]!.payload.amountCents, statement.totalCents);
    assert.equal(rows[0]!.payload.dueDate, statement.dueDate);
    assert.equal(rows[0]!.occurredAt.getTime(), now.getTime());
  } finally {
    env.CORE_SAAS_PERSISTENCE = before.persistence;
    env.BILLING_PROVIDERS_ENABLED = before.enabled;
    factory.resetStatementRuntimeForTests();
    channel.resetChannelRuntimeForTests();
    vault.resetVaultRuntimeForTests();
  }
});

// ------------------------------------------------------- conserto da J-579, a parte de MEMÓRIA (CL8-mem, RACE-7-mem e RR-U-mem)
// O dublê da fila (`InMemoryOutboxRepository`), sem banco: o registro do dublê ganha o `[REG-PAID]` (A-C1-02) e o `[REG-REREAD]` lê
// a tabela-verdade (C2-01); o claim do modo memória lê o `paidCents` do leitor de produção (C2-04).
async function memoryOutboxWithClaimedLine(reader: Record<string, unknown>) {
  const [{ InMemoryOutboxRepository }, { InMemoryStatementChargeRepository }] = await Promise.all([
    import("../src/modules/subscription-billing/outbox/outbox.repository.js"),
    import("../src/modules/subscription-billing/charges/charges.repository.js"),
  ]);
  const now = new Date();
  const outbox = new InMemoryOutboxRepository({ readStatement: async () => reader as never, clock: () => now });
  const charges = new InMemoryStatementChargeRepository();
  outbox.configureChargeOutcomeSink(async (charge, at) => {
    await charges.insert(charge, at);
  });
  await outbox.enqueue({ tenantId: "ten_mem", statementId: "st_mem", kind: "charge_create", provider: "asaas", seq: 1, payload: { amountCents: 10_000, dueDate: "2026-12-20", method: "pix" } }, now);
  const claimed = await outbox.claimNext({ enabledProviders: ["asaas"], now, claimedBy: "w-mem", orphanMs: 600_000, verdict: () => ({ kind: "eligible" }) });
  assert.equal(claimed?.kind, "claimed");
  const row = (claimed as any).row;
  return { outbox, charges, row, lease: { claimedBy: row.claimedBy as string, attemptStartedAt: row.attemptStartedAt as Date }, now };
}

test("RACE-7-mem (A-C1-02): no dublê, o pagamento do provedor que quitou a conta ANTES do registro → a cobrança nasce confirmed e 0 charge_cancel", async () => {
  const m = await memoryOutboxWithClaimedLine({ status: "paid", reopenedAt: null, totalCents: 10_000, paidCents: 10_000, providerPayments: [{ source: "asaas", externalChargeId: "pay_r7m" }] });
  assert.equal(await m.outbox.recordChargeOutcome("ten_mem", m.row, m.lease, { kind: "created", result: { chargeId: "pay_r7m", status: "pending" } }, m.now), true);
  assert.deepEqual((await m.charges.listByStatement("ten_mem", "st_mem")).map((charge) => charge.status), ["confirmed"]);
  assert.deepEqual((await m.outbox.listByStatement("ten_mem", "st_mem")).filter((line) => line.kind === "charge_cancel"), []);
});

test("RR-U-mem (C2-01): no dublê, a cobrança ADOTADA em estado desconhecido sobre conta paid → 1 charge_cancel PENDING", async () => {
  const m = await memoryOutboxWithClaimedLine({ status: "paid", reopenedAt: null, totalCents: 10_000, paidCents: 10_000, providerPayments: [] });
  assert.equal(await m.outbox.recordChargeOutcome("ten_mem", m.row, m.lease, { kind: "adopted", chargeId: "pay_rrm", lookup: { status: "unknown" } }, m.now), true);
  assert.deepEqual((await m.charges.listByStatement("ten_mem", "st_mem")).map((charge) => charge.status), ["needs_review"]);
  assert.deepEqual((await m.outbox.listByStatement("ten_mem", "st_mem")).filter((line) => line.kind === "charge_cancel").map((line) => [line.status, line.payload.chargeId]), [["PENDING", "pay_rrm"]]);
});

test("CL8-mem (C2-04): pela composição de memória, fecha, faz a baixa parcial de 3 000 e o claim → NEEDS_REVIEW statement_partially_paid, sem reclamar a linha", async () => {
  const [envModule, factory, channel, vault, keys, serviceModule, dispatcher] = await Promise.all([
    import("../src/config/env.js"),
    import("../src/modules/subscription-billing/statements/statement.factory.js"),
    import("../src/modules/subscription-billing/outbox/channel.runtime.js"),
    import("../src/modules/subscription-billing/vault/vault.factory.js"),
    import("../src/modules/subscription-billing/vault/vault-keys.js"),
    import("../src/modules/subscription-billing/statements/statement.service.js"),
    import("../src/modules/subscription-billing/outbox/outbox.dispatcher.js"),
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
      subscriptionId: "sub_mem8",
      planVersionId: "pv_mem8",
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
    const service = new serviceModule.StatementService(runtime.repository, { resolve: async () => ready }, runtime.audit, (runtime.service as unknown as { channel: never }).channel);
    const closedOut = (await service.close({ tenantId: "ten_c1c_mem8", period: PERIOD, now: new Date(), actorId: null, source: "manual" })) as { statement: { id: string } };
    await service.recordManualPayment({ tenantId: "ten_c1c_mem8", statementId: closedOut.statement.id, amountCents: 3_000, method: "pix", note: null, actorId: "op", now: new Date() });
    const deps = await channel.createChannelRuntime();
    const claimed = await deps.outbox.claimNext({ enabledProviders: ["asaas"], now: new Date(), claimedBy: "w-mem8", orphanMs: 600_000, verdict: dispatcher.chargeCreateClaimVerdict });
    assert.equal(claimed?.kind, "needs_review", JSON.stringify(claimed));
    assert.equal((claimed as { code: string }).code, "statement_partially_paid");
  } finally {
    env.CORE_SAAS_PERSISTENCE = before.persistence;
    env.BILLING_PROVIDERS_ENABLED = before.enabled;
    factory.resetStatementRuntimeForTests();
    channel.resetChannelRuntimeForTests();
    vault.resetVaultRuntimeForTests();
  }
});

if (!connectionString) {
  test("B-ASS-08c1c · o fechamento que enfileira, o refechamento e o claim exigem DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  after(teardownDb);

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, Asaas ligado e o app real no modo prisma", async () => {
    await setupDb("c1c_close");
  });

  /** Fecha o mês pela rota real com o provedor ligado; devolve o demonstrativo e as linhas da fila. */
  async function closeAndRead(tenantId: string) {
    const response = await closeRoute(tenantId);
    const statement = await statementOfTenant(tenantId);
    return { response, statement, lines: statement ? await lines(statement.id) : [] };
  }

  /** Um demonstrativo fechado pela rota (com a 1ª `charge_create`), depois forçado a `reopened` (a fixture do refechamento). */
  async function reopenedWithLine(tag: string, lineStatus: "PENDING" | "PROCESSING" | "NEEDS_REVIEW" | "SENT", charge: string | null = null): Promise<Fixture & { lineId: string }> {
    const tenantId = await seedTenant(tag);
    const first = await closeAndRead(tenantId);
    assert.equal(first.response.status, 200, JSON.stringify(first.response.body));
    const lineId = first.lines[0]!.id;
    const externalId = lineStatus === "SENT" ? `pay_${tag}_${randomUUID().slice(0, 6)}` : null;
    await H.db.$executeRawUnsafe(
      `UPDATE billing_outbox SET status = $2, external_id = $3, attempts = CASE WHEN $2 = 'PROCESSING' THEN 1 ELSE attempts END,
              claimed_by = CASE WHEN $2 = 'PROCESSING' THEN 'dispatch-outbox:c1c' END, claimed_at = CASE WHEN $2 = 'PROCESSING' THEN now() END,
              attempt_started_at = CASE WHEN $2 = 'PROCESSING' THEN now() END, last_error = CASE WHEN $2 = 'NEEDS_REVIEW' THEN 'charge_found_no_candidate' END
        WHERE id = $1::uuid`,
      lineId,
      lineStatus,
      externalId,
    );
    const f = { tenantId, statementId: first.statement.id };
    if (externalId && charge) await seedCharge(f, externalId, charge);
    await H.db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'reopened', reopened_at = now() WHERE id = $1::uuid`, f.statementId);
    return { ...f, lineId };
  }

  test("CL1: provedor ligado → POST …/close → 1 charge_create PENDING, amountCents = o total gravado, dueDate = o do demonstrativo, occurred_at = o do fechamento", async () => {
    const tenantId = await seedTenant("cl1");
    const { response, statement, lines: rows } = await closeAndRead(tenantId);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const st = await statementRow(statement.id);
    assert.equal(st.status, "closed");
    assert.equal(rows.length, 1, JSON.stringify(rows));
    assert.equal(rows[0]!.kind, "charge_create");
    assert.equal(rows[0]!.status, "PENDING");
    assert.equal(rows[0]!.payload.amountCents, st.total);
    assert.equal(rows[0]!.payload.dueDate, st.due_date);
    assert.equal(rows[0]!.payload.method, "pix", "perfil sem método → pix (§9 D-8)");
    assert.equal(new Date(rows[0]!.occurred_at).getTime(), new Date(st.closed_at!).getTime(), "a linha nasce no instante do fechamento");
    assert.equal(rows[0]!.idempotency_key, `charge_create:${statement.id}:1`);
  });

  test("CL2: o INSERT na fila falha (gatilho de falha injetada no papel) → o fechamento falha inteiro: nenhum demonstrativo fechado, 0 linhas", async () => {
    const tenantId = await seedTenant("cl2");
    await H.db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION c1c_fail_outbox() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN IF NEW.tenant_id = '${tenantId}'::uuid THEN RAISE EXCEPTION 'c1c_injected_outbox_failure'; END IF; RETURN NEW; END $f$`);
    await H.db.$executeRawUnsafe(`CREATE TRIGGER c1c_fail_outbox_cl2 BEFORE INSERT ON billing_outbox FOR EACH ROW EXECUTE FUNCTION c1c_fail_outbox()`);
    try {
      const response = await closeRoute(tenantId);
      assert.notEqual(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.data, undefined, "nada fechado na resposta");
      const rows = await q(`SELECT status FROM subscription_statements WHERE tenant_id = $1::uuid`, tenantId);
      assert.deepEqual(rows.filter((row) => row.status === "closed"), [], "o fechamento desfez");
      assert.equal((await q(`SELECT count(*)::int AS n FROM billing_outbox WHERE tenant_id = $1::uuid`, tenantId))[0].n, 0);
      assert.equal((await q(`SELECT count(*)::int AS n FROM billing_statement_refs WHERE tenant_id = $1::uuid`, tenantId))[0].n, 0, "0 ref nova");
    } finally {
      await H.db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS c1c_fail_outbox_cl2 ON billing_outbox`);
    }
  });

  test("CL3: env DESLIGADO, cofre disponível e enabled = true → close → 0 linhas e 0 requisição ao provedor", async () => {
    const tenantId = await seedTenant("cl3");
    const before = H.fake!.recorded.length;
    H.env.BILLING_PROVIDERS_ENABLED = false;
    try {
      const { response, lines: rows } = await closeAndRead(tenantId);
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.deepEqual(rows, []);
      assert.equal(H.fake!.recorded.length - before, 0);
    } finally {
      H.env.BILLING_PROVIDERS_ENABLED = true;
    }
  });

  test("CL3b: env LIGADO, cofre INDISPONÍVEL e enabled = true → close → 0 linhas", async () => {
    const tenantId = await seedTenant("cl3b");
    setVault(false);
    try {
      const { response, lines: rows } = await closeAndRead(tenantId);
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.deepEqual(rows, []);
    } finally {
      setVault(true);
    }
  });

  test("CL4: PENDING `provider_disabled` com occurred_at de 8 dias; religado; despacho → NEEDS_REVIEW stale_on_reenable, 0 POST", async () => {
    const f = await seedStatement("cl4");
    const { id } = await seedLine(f, "PENDING", { occurredAt: new Date(Date.now() - 8 * DAY_MS), skipReason: "provider_disabled" });
    const before = postsToPayments();
    await dispatch(f.tenantId);
    assert.deepEqual((await lines(f.statementId)).map((row) => [row.id, row.status, row.last_error]), [[id, "NEEDS_REVIEW", "stale_on_reenable"]]);
    assert.equal(postsToPayments() - before, 0);
  });

  test("CL5: PENDING com skip_reason NULO e 8 dias (o desligamento pelo env, R2-07) → NEEDS_REVIEW stale_on_reenable, 0 POST", async () => {
    const f = await seedStatement("cl5");
    await seedLine(f, "PENDING", { occurredAt: new Date(Date.now() - 8 * DAY_MS), skipReason: null });
    const before = postsToPayments();
    await dispatch(f.tenantId);
    assert.deepEqual((await lines(f.statementId)).map((row) => [row.status, row.last_error]), [["NEEDS_REVIEW", "stale_on_reenable"]]);
    assert.equal(postsToPayments() - before, 0);
  });

  test("CL6: PENDING de 6 dias e a conta paga no intervalo → SKIPPED statement_paid, 0 POST", async () => {
    const f = await seedStatement("cl6");
    await seedLine(f, "PENDING", { occurredAt: new Date(Date.now() - 6 * DAY_MS) });
    await H.db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'paid', paid_amount = total_amount, paid_at = now() WHERE id = $1::uuid`, f.statementId);
    const before = postsToPayments();
    await dispatch(f.tenantId);
    assert.deepEqual((await lines(f.statementId)).map((row) => [row.status, row.skip_reason]), [["SKIPPED", "statement_paid"]]);
    assert.equal(postsToPayments() - before, 0);
  });

  test("CL6b: PENDING de 8 dias e a conta paga → SKIPPED statement_paid, NÃO stale_on_reenable (a ordem)", async () => {
    const f = await seedStatement("cl6b");
    await seedLine(f, "PENDING", { occurredAt: new Date(Date.now() - 8 * DAY_MS) });
    await H.db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'paid', paid_amount = total_amount, paid_at = now() WHERE id = $1::uuid`, f.statementId);
    await dispatch(f.tenantId);
    assert.deepEqual((await lines(f.statementId)).map((row) => [row.status, row.skip_reason, row.last_error]), [["SKIPPED", "statement_paid", null]]);
  });

  test("CL7: stale_on_reenable → /resolve → /retry com dueDate → despacho → 1 POST com a data nova", async () => {
    const f = await seedStatement("cl7");
    const { id } = await seedLine(f, "PENDING", { occurredAt: new Date(Date.now() - 8 * DAY_MS), payload: { amountCents: 12345, dueDate: spDayPlus(-3), method: "pix" } });
    await dispatch(f.tenantId);
    assert.equal((await lines(f.statementId))[0]!.last_error, "stale_on_reenable");
    const resolved = await api("POST", `/api/v1/platform/billing/outbox/${id}/resolve`, { tenantId: f.tenantId, reason: "o operador conferiu: a conta segue em aberto" });
    assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
    const newDate = spDayPlus(7);
    const retried = await api("POST", `/api/v1/platform/billing/outbox/${id}/retry`, { tenantId: f.tenantId, dueDate: newDate });
    assert.equal(retried.status, 200, JSON.stringify(retried.body));
    const before = postsToPayments();
    const run = await dispatch(f.tenantId);
    assert.equal(run.outcomes.sent, 1, JSON.stringify(run.outcomes));
    assert.equal(postsToPayments() - before, 1);
    const posted = H.fake!.recorded.filter((request: { method: string; path: string }) => request.method === "POST" && request.path.split("?")[0] === "/v3/payments").at(-1);
    assert.equal(JSON.parse(posted.body).dueDate, newDate);
  });

  test("CL7b: FAILED de 10 dias → /retry (com dueDate) → 1 POST", async () => {
    const f = await seedStatement("cl7b");
    const { id } = await seedLine(f, "FAILED", { occurredAt: new Date(Date.now() - 10 * DAY_MS), attempts: 8, lastError: "provider_timeout", payload: { amountCents: 12345, dueDate: spDayPlus(-5), method: "pix" } });
    const retried = await api("POST", `/api/v1/platform/billing/outbox/${id}/retry`, { tenantId: f.tenantId, dueDate: spDayPlus(6) });
    assert.equal(retried.status, 200, JSON.stringify(retried.body));
    const before = postsToPayments();
    const run = await dispatch(f.tenantId);
    assert.equal(run.outcomes.sent, 1, JSON.stringify(run.outcomes));
    assert.equal(postsToPayments() - before, 1);
  });

  test("CL7c: FAILED de 10 dias → /retry → o canal fica desligado 30 dias → claim → NEEDS_REVIEW stale_on_reenable, 0 POST", async () => {
    const f = await seedStatement("cl7c");
    const { id } = await seedLine(f, "FAILED", { occurredAt: new Date(Date.now() - 10 * DAY_MS), attempts: 8, lastError: "provider_timeout", payload: { amountCents: 12345, dueDate: spDayPlus(-5), method: "pix" } });
    const retried = await api("POST", `/api/v1/platform/billing/outbox/${id}/retry`, { tenantId: f.tenantId, dueDate: spDayPlus(40) });
    assert.equal(retried.status, 200, JSON.stringify(retried.body));
    const before = postsToPayments();
    await dispatch(f.tenantId, { now: new Date(Date.now() + 30 * DAY_MS) });
    assert.deepEqual((await lines(f.statementId)).map((row) => [row.status, row.last_error]), [["NEEDS_REVIEW", "stale_on_reenable"]]);
    assert.equal(postsToPayments() - before, 0);
  });

  test("CL8: PENDING; baixa manual PARCIAL; despacho → NEEDS_REVIEW statement_partially_paid, 0 POST", async () => {
    const tenantId = await seedTenant("cl8");
    const { statement } = await closeAndRead(tenantId);
    const f = { tenantId, statementId: statement.id };
    const paid = await payRoute(f, "30.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    assert.equal((await lines(f.statementId))[0]!.status, "PENDING", "a baixa parcial não mexe na linha (Q4 (a))");
    const before = postsToPayments();
    await dispatch(tenantId);
    assert.deepEqual((await lines(f.statementId)).map((row) => [row.status, row.last_error]), [["NEEDS_REVIEW", "statement_partially_paid"]]);
    assert.equal(postsToPayments() - before, 0);
  });

  test("RF1: charge/cancel → despacho (1 DELETE) → reopen → refechar com total novo → seq 2 com o total novo; a velha SKIPPED (charge_cancelled), external_id mantido", async () => {
    const tenantId = await seedTenant("rf1");
    const { statement } = await closeAndRead(tenantId);
    const f = { tenantId, statementId: statement.id };
    const sent = await dispatch(tenantId);
    assert.equal(sent.outcomes.sent, 1, JSON.stringify(sent.outcomes));
    const old = (await lines(f.statementId))[0]!;
    assert.ok(old.external_id);
    const cancel = await chargeCancelRoute(f);
    assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
    const deletes = deletesOfPayments();
    await dispatch(tenantId);
    assert.equal(deletesOfPayments() - deletes, 1, "1 DELETE");
    const reopened = await reopenRoute(f);
    assert.equal(reopened.status, 200, JSON.stringify(reopened.body));
    const adjusted = await api("PATCH", `/api/v1/platform/billing/statements/${f.statementId}/adjustment`, { tenantId, adjustmentsAmount: "-10.00", adjustmentNote: "desconto combinado com o cliente" });
    assert.equal(adjusted.status, 200, JSON.stringify(adjusted.body));
    const reclosed = await closeRoute(tenantId);
    assert.equal(reclosed.status, 200, JSON.stringify(reclosed.body));
    const st = await statementRow(f.statementId);
    const rows = await lines(f.statementId);
    const creates = rows.filter((row) => row.kind === "charge_create");
    assert.deepEqual(creates.map((row) => [row.idempotency_key.split(":")[2], row.status]), [["1", "SKIPPED"], ["2", "PENDING"]]);
    assert.equal(creates[0]!.last_error, "charge_cancelled");
    assert.equal(creates[0]!.external_id, old.external_id, "o external_id fica");
    assert.equal(creates[1]!.payload.amountCents, st.total);
    assert.notEqual(st.total, old.payload.amountCents, "o total novo");
  });

  test("RF2: a velha em PROCESSING → refechar → 409 charge_in_flight, nada gravado (o demonstrativo segue reopened)", async () => {
    const f = await reopenedWithLine("rf2", "PROCESSING");
    const before = await lines(f.statementId);
    const response = await closeRoute(f.tenantId);
    assert.equal(response.status, 409, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "charge_in_flight");
    assert.equal((await statementRow(f.statementId)).status, "reopened");
    assert.deepEqual(await lines(f.statementId), before);
  });

  test("RF3: a velha em NEEDS_REVIEW → refechar → 422 outbox_needs_review, nada gravado", async () => {
    const f = await reopenedWithLine("rf3", "NEEDS_REVIEW");
    const before = await lines(f.statementId);
    const response = await closeRoute(f.tenantId);
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "outbox_needs_review");
    assert.equal((await statementRow(f.statementId)).status, "reopened");
    assert.deepEqual(await lines(f.statementId), before);
  });

  test("RF4: PENDING semeada num reopened → refechar → a velha SKIPPED statement_reopened, seq 2", async () => {
    const f = await reopenedWithLine("rf4", "PENDING");
    const response = await closeRoute(f.tenantId);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const creates = (await lines(f.statementId)).filter((row) => row.kind === "charge_create");
    assert.deepEqual(creates.map((row) => [row.idempotency_key.split(":")[2], row.status, row.skip_reason]), [["1", "SKIPPED", "statement_reopened"], ["2", "PENDING", null]]);
  });

  test("RO3: SENT com a cobrança da tabela em needs_review num reopened → refechar → 422 charge_already_exists, nada gravado", async () => {
    const f = await reopenedWithLine("ro3", "SENT", "needs_review");
    const before = await lines(f.statementId);
    const response = await closeRoute(f.tenantId);
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "charge_already_exists");
    assert.equal((await statementRow(f.statementId)).status, "reopened");
    assert.deepEqual(await lines(f.statementId), before);
  });

  test("RO3b: SENT com a cobrança pending num reopened → refechar → 422 charge_already_exists, nada gravado", async () => {
    const f = await reopenedWithLine("ro3b", "SENT", "pending");
    const before = await lines(f.statementId);
    const response = await closeRoute(f.tenantId);
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "charge_already_exists");
    assert.deepEqual(await lines(f.statementId), before);
  });

  // --------------------------------------------- conserto da J-579 (C2-02; Emenda 1 A1(b)): RO3c, o [REFECHA-LIVE] com o canal desligado
  test("RO3c: refechar com o provedor DESLIGADO um reopened com SENT e a cobrança confirmed, partially_refunded ou chargeback_disputed → 422 charge_already_exists, 0 linha nova, a conta segue reopened", async () => {
    for (const state of ["confirmed", "partially_refunded", "chargeback_disputed"]) {
      const f = await reopenedWithLine(`ro3c-${state.slice(0, 6)}`, "SENT", state);
      const before = await lines(f.statementId);
      H.env.BILLING_PROVIDERS_ENABLED = false;
      try {
        const response = await closeRoute(f.tenantId);
        assert.equal(response.status, 422, `${state}: ${JSON.stringify(response.body)}`);
        assert.equal(response.body.error?.reason, "charge_already_exists");
      } finally {
        H.env.BILLING_PROVIDERS_ENABLED = true;
      }
      assert.deepEqual(await lines(f.statementId), before, `${state}: 0 linha nova`);
      assert.equal((await statementRow(f.statementId)).status, "reopened");
    }
  });
}
