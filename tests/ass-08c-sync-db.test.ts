// B-ASS-08c1c (plano §4.7, §4.8; Emendas 1, 1.1 e 1.2) — a tabela de cobranças acompanha o provedor na MESMA transação do efeito
// no demonstrativo (`[CHG-SYNC-PAY/-MONO/-REV/-DISP/-WON]`, R2-03), o poll-pending lê a tabela (`[POLL-TABLE]`, R2-02), a
// recobrança depois do estorno total sai (`[REFECHA-02]` + `[RECONS-03]`) e o índice data a cobrança VIGENTE (`[REF-FRESH]`,
// CR-01). No PostgreSQL sob papel efêmero NOSUPERUSER NOBYPASSRLS, com o despacho e o poll reais sobre o falso do Asaas; o PP-4 do
// dublê roda sem banco.
//
// Donos: TS-1a, TS-1b, TS-2, TS-3, PP-1, PP-2, PP-3, PP-4. Mutações: M-R2-02 → PP-1; M-R2-03a (PAY) → TS-1a e PP-1; M-R2-03b (REV)
// → TS-1a; M-R2-03c (MONO) → TS-2; M-R2-03d/e (DISP/WON) → TS-3; M-RECONS3 → TS-1a/TS-1b; M7b (apagar REFECHA-02) → TS-1a;
// M-REFFRESH → PP-2 e PP-4; M-CRIT-LB (janela de 4 h) → PP-3. O TS-2 devolve a tabela a `pending` entre os dois pagamentos (o dado
// de antes deste bloco, quando a tabela não acompanhava), para a quitação monotônica ter o que acompanhar.
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

// ----------------------------------------------------------------------------------------------- PP-4 do dublê (sem banco)
test("PP-4 (dublê): o pedido sem id e o registro do mesmo id não renovam o created_at do índice; o id novo renova", async () => {
  const { InMemoryStatementRefRepository } = await import("../src/modules/subscription-billing/webhooks/statement-refs.repository.js");
  const refs = new InMemoryStatementRefRepository();
  const old = new Date(Date.now() - 50 * DAY_MS);
  const now = new Date();
  await refs.put({ statementId: "s1", tenantId: "t1", provider: "asaas" }, old);
  await refs.put({ statementId: "s1", tenantId: "t1", provider: "asaas" }, now);
  assert.equal((await refs.resolve("s1"))!.createdAt.getTime(), old.getTime(), "o pedido sem id não renova");
  await refs.put({ statementId: "s1", tenantId: "t1", provider: "asaas", externalChargeId: "pay_a" }, old);
  await refs.setExternalChargeId("s1", "pay_a", now);
  assert.equal((await refs.resolve("s1"))!.createdAt.getTime(), old.getTime(), "o mesmo id não renova");
  await refs.setExternalChargeId("s1", "pay_b", now);
  assert.equal((await refs.resolve("s1"))!.createdAt.getTime(), now.getTime(), "o id novo renova (setExternalChargeId)");
  const later = new Date(now.getTime() + 1000);
  await refs.put({ statementId: "s1", tenantId: "t1", provider: "asaas", externalChargeId: "pay_c" }, later);
  assert.equal((await refs.resolve("s1"))!.createdAt.getTime(), later.getTime(), "o id novo renova (put)");
});

if (!connectionString) {
  test("B-ASS-08c1c · a tabela acompanha o provedor e o poll pela tabela exigem DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  after(teardownDb);

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, Asaas ligado e o app real no modo prisma", async () => {
    await setupDb("c1c_sync");
  });

  /** Fecha pela rota e despacha: a cobrança nasce `pending` na tabela, com o id do falso. */
  async function charged(tag: string): Promise<Fixture & { chargeId: string }> {
    const tenantId = await seedTenant(tag);
    const response = await closeRoute(tenantId);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const statementId = (await statementOfTenant(tenantId)).id;
    const run = await dispatch(tenantId);
    assert.equal(run.outcomes.sent, 1, JSON.stringify(run.outcomes));
    const [charge] = await chargeRows(statementId);
    assert.equal(charge?.status, "pending");
    return { tenantId, statementId, chargeId: charge!.external_charge_id };
  }

  /** O provedor pagou e depois estornou TUDO (o efeito do reconcile no demonstrativo e na tabela). */
  async function paidAndFullyRefunded(f: Fixture & { chargeId: string }): Promise<void> {
    const deps = await channelDeps();
    await deps.settlement.settle({ tenantId: f.tenantId, statementId: f.statementId, source: "asaas", externalChargeId: f.chargeId, paidCents: 10_000, method: "pix", now: new Date() });
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["confirmed"], "pago → confirmed");
    await deps.settlement.applyReversal({ tenantId: f.tenantId, statementId: f.statementId, externalChargeId: f.chargeId, reversedCents: 10_000, kind: "refund", now: new Date() });
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["refunded"], "estorno total → refunded");
    H.fake!.setPaymentStatus(f.chargeId, "REFUNDED");
  }

  test("TS-1a: cria → paga (confirmed) → estorno total (refunded) → reopen passa → refechar com o provedor ligado → seq 2 → 1 POST, a velha SKIPPED statement_reopened com o external_id", async () => {
    const f = await charged("ts1a");
    await paidAndFullyRefunded(f);
    const reopened = await reopenRoute(f);
    assert.equal(reopened.status, 200, JSON.stringify(reopened.body));
    const reclosed = await closeRoute(f.tenantId);
    assert.equal(reclosed.status, 200, JSON.stringify(reclosed.body));
    const creates = (await lines(f.statementId)).filter((row) => row.kind === "charge_create");
    assert.deepEqual(creates.map((row) => [row.idempotency_key.split(":")[2], row.status, row.skip_reason]), [["1", "SKIPPED", "statement_reopened"], ["2", "PENDING", null]]);
    assert.equal(creates[0]!.external_id, f.chargeId, "o external_id da velha fica");
    const posts = postsToPayments();
    const run = await dispatch(f.tenantId);
    assert.equal(run.outcomes.sent, 1, JSON.stringify(run.outcomes));
    assert.equal(postsToPayments() - posts, 1, "1 POST");
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["refunded", "pending"]);
  });

  test("TS-1b: o mesmo com o provedor DESLIGADO no refechamento; religar; /charge → seq 2 → 1 POST", async () => {
    const f = await charged("ts1b");
    await paidAndFullyRefunded(f);
    assert.equal((await reopenRoute(f)).status, 200);
    H.env.BILLING_PROVIDERS_ENABLED = false;
    try {
      const reclosed = await closeRoute(f.tenantId);
      assert.equal(reclosed.status, 200, JSON.stringify(reclosed.body));
    } finally {
      H.env.BILLING_PROVIDERS_ENABLED = true;
    }
    assert.deepEqual((await lines(f.statementId)).filter((row) => row.kind === "charge_create").map((row) => [row.status, row.skip_reason]), [["SKIPPED", "statement_reopened"]]);
    const requested = await api("POST", `/api/v1/platform/billing/statements/${f.statementId}/charge`, { tenantId: f.tenantId });
    assert.equal(requested.status, 201, JSON.stringify(requested.body));
    const posts = postsToPayments();
    const run = await dispatch(f.tenantId);
    assert.equal(run.outcomes.sent, 1, JSON.stringify(run.outcomes));
    assert.equal(postsToPayments() - posts, 1);
  });

  test("TS-2: pagamento parcial e depois a quitação pela reconsulta (monotônico) → confirmed nas duas", async () => {
    const f = await charged("ts2");
    const deps = await channelDeps();
    await deps.settlement.settle({ tenantId: f.tenantId, statementId: f.statementId, source: "asaas", externalChargeId: f.chargeId, paidCents: 3_000, method: "pix", now: new Date() });
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["confirmed"], "1º pagamento (parcial) → confirmed");
    // A tabela de antes deste bloco não acompanhava o provedor: a cobrança paga em parte segue `pending` nela (o dado legado).
    await H.db.$executeRawUnsafe(`UPDATE subscription_statement_charges SET status = 'pending' WHERE statement_id = $1::uuid`, f.statementId);
    const second = await deps.settlement.settle({ tenantId: f.tenantId, statementId: f.statementId, source: "asaas", externalChargeId: f.chargeId, paidCents: 10_000, method: "pix", now: new Date() });
    assert.equal(second.kind, "settled");
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["confirmed"], "a quitação monotônica → confirmed");
    assert.equal((await statementRow(f.statementId)).status, "paid");
  });

  test("TS-3: disputa → chargeback_disputed; ganha → confirmed", async () => {
    const f = await charged("ts3");
    const deps = await channelDeps();
    await deps.settlement.settle({ tenantId: f.tenantId, statementId: f.statementId, source: "asaas", externalChargeId: f.chargeId, paidCents: 10_000, method: "pix", now: new Date() });
    await deps.settlement.markChargebackDisputed({ tenantId: f.tenantId, statementId: f.statementId, now: new Date() });
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["chargeback_disputed"]);
    await deps.settlement.resolveChargeback({ tenantId: f.tenantId, statementId: f.statementId, externalChargeId: f.chargeId, outcome: "won", now: new Date() });
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["confirmed"]);
  });

  test("PP-1 (R2-02): espelho none; o canal cria; o falso responde RECEIVED; sem webhook; poll-pending +2 h → demonstrativo paid, tabela confirmed", async () => {
    const f = await charged("pp1");
    assert.equal((await statementRow(f.statementId)).charge_status, "none");
    H.fake!.setPaymentStatus(f.chargeId, "RECEIVED");
    const result = await H.m.channelJobs.runBillingPollPending(await channelDeps(new Date(Date.now() + 2 * 60 * 60 * 1000)));
    assert.ok(result.charges >= 1, JSON.stringify(result));
    assert.equal((await statementRow(f.statementId)).status, "paid");
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["confirmed"]);
  });

  test("PP-2 (CR-01): ref nascida há 50 dias; a recobrança registra a cobrança nova; RECEIVED; sem webhook; poll-pending +2 h → paid, confirmed", async () => {
    const f = await charged("pp2");
    await paidAndFullyRefunded(f);
    assert.equal((await reopenRoute(f)).status, 200);
    assert.equal((await closeRoute(f.tenantId)).status, 200);
    // O índice nasceu no 1º pedido, há 50 dias (o relógio do teste).
    await H.db.$executeRawUnsafe(`UPDATE billing_statement_refs SET created_at = $2 WHERE statement_id = $1::uuid`, f.statementId, new Date(Date.now() - 50 * DAY_MS));
    const run = await dispatch(f.tenantId);
    assert.equal(run.outcomes.sent, 1, JSON.stringify(run.outcomes));
    const fresh = (await chargeRows(f.statementId)).find((row) => row.status === "pending")!;
    H.fake!.setPaymentStatus(fresh.external_charge_id, "RECEIVED");
    const gets = recorded("GET", `/v3/payments/${fresh.external_charge_id}`);
    await H.m.channelJobs.runBillingPollPending(await channelDeps(new Date(Date.now() + 2 * 60 * 60 * 1000)));
    assert.ok(recorded("GET", `/v3/payments/${fresh.external_charge_id}`) > gets, "a cobrança nova foi reconsultada");
    assert.equal((await statementRow(f.statementId)).status, "paid");
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status).sort(), ["confirmed", "refunded"]);
  });

  test("PP-3: duas cobranças pending registradas há 44 e há 46 dias → o poll reconsulta a de 44 e não a de 46", async () => {
    const make = async (tag: string, ageDays: number) => {
      const f = await seedStatement(tag);
      const real = adapterOverFake();
      const created = await real.createCharge({ customerId: "cus_c1c", amountCents: 12_345, dueDate: spDayPlus(10), externalReference: f.statementId, method: "pix", idempotencyKey: randomUUID() });
      await seedCharge(f, created.chargeId, "pending", new Date(Date.now() - ageDays * DAY_MS));
      await H.db.$executeRawUnsafe(`UPDATE billing_statement_refs SET external_charge_id = $2, created_at = $3 WHERE statement_id = $1::uuid`, f.statementId, created.chargeId, new Date(Date.now() - ageDays * DAY_MS));
      return created.chargeId as string;
    };
    const young = await make("pp3-44", 44);
    const old = await make("pp3-46", 46);
    const before = { young: recorded("GET", `/v3/payments/${young}`), old: recorded("GET", `/v3/payments/${old}`) };
    await H.m.channelJobs.runBillingPollPending(await channelDeps());
    assert.ok(recorded("GET", `/v3/payments/${young}`) > before.young, "a de 44 dias é reconsultada");
    assert.equal(recorded("GET", `/v3/payments/${old}`) - before.old, 0, "a de 46 dias fica fora da janela de 45");
  });

  test("PP-4 (Prisma): o pedido sem id e o registro do mesmo id não renovam; o id novo renova", async () => {
    const { putRefInTx } = await import("../src/modules/subscription-billing/webhooks/statement-refs.prisma.js");
    const f = await seedStatement("pp4");
    const old = new Date(Date.now() - 50 * DAY_MS);
    await H.db.$executeRawUnsafe(`UPDATE billing_statement_refs SET created_at = $2 WHERE statement_id = $1::uuid`, f.statementId, old);
    const age = async () => (await q(`SELECT created_at, external_charge_id FROM billing_statement_refs WHERE statement_id = $1::uuid`, f.statementId))[0];
    await putRefInTx(H.role.client, { statementId: f.statementId, tenantId: f.tenantId, provider: "asaas" }, new Date());
    assert.equal(new Date((await age()).created_at).getTime(), old.getTime(), "o pedido sem id não renova");
    await putRefInTx(H.role.client, { statementId: f.statementId, tenantId: f.tenantId, provider: "asaas", externalChargeId: "pay_pp4_a" }, new Date());
    const renewed = new Date((await age()).created_at).getTime();
    assert.ok(Date.now() - renewed < 60_000, "o id novo renova");
    await putRefInTx(H.role.client, { statementId: f.statementId, tenantId: f.tenantId, provider: "asaas", externalChargeId: "pay_pp4_a" }, new Date(Date.now() + 5_000));
    assert.equal(new Date((await age()).created_at).getTime(), renewed, "o mesmo id não renova");
  });
}
