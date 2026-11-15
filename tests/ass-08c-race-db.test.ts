// B-ASS-08c1c (plano §4.4, A1; Emendas 1 e 1.1) — a corrida residual e a releitura no registro: o registro da cobrança trava o
// demonstrativo (`FOR NO KEY UPDATE` sem SKIP LOCKED: ESPERA a baixa, o cancelamento e o reopen) e relê no MESMO `tx`; não
// vigente com a cobrança `pending` → `charge_cancel` pelo núcleo único (`[REG-REREAD]`/`[REREAD-ENQ]`). O pagamento que chegou
// antes do registro faz a cobrança nascer `confirmed` (`[REG-PAID]`, §9 D-4). No PostgreSQL sob papel efêmero NOSUPERUSER
// NOBYPASSRLS, com o despacho real sobre o falso do Asaas e a pausa do `createCharge` por um invólucro da porta (o padrão do RACE-6).
//
// Donos: RACE-1 (i), RACE-1 (ii), RACE-2, RACE-4, RACE-5, RACE-7 (o RACE-6 de regressão fica em `ass-08c-register-db`).
// Mutações: M-A1a (`[REG-REREAD]` → `false`) → RACE-1 (i)/(ii), RACE-2, RACE-4; M-A1b (` SKIP LOCKED` no passo 1) → RACE-1 (ii);
// M-A1c (cancela qualquer estado) → RACE-5; M-REGPAID (apagar `[REG-PAID]`) → RACE-7.
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

if (!connectionString) {
  test("B-ASS-08c1c · a corrida e a releitura no registro exigem DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  after(teardownDb);

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, Asaas ligado e o app real no modo prisma", async () => {
    await setupDb("c1c_race");
  });

  async function closed(tag: string): Promise<Fixture> {
    const tenantId = await seedTenant(tag);
    const response = await closeRoute(tenantId);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return { tenantId, statementId: (await statementOfTenant(tenantId)).id };
  }

  /** A porta do falso com o `createCharge` pausado (o padrão do RACE-6: um invólucro da porta, sem mexer no falso). `after`:
   * pausa DEPOIS de o provedor criar a cobrança (o pagamento chega entre a criação e o registro). */
  function pausedPort(options: { readonly after?: boolean } = {}) {
    const real = adapterOverFake();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let entered!: (chargeId: string | null) => void;
    // A chamada tem de chegar em 15 s (sem a linha da fila, nunca chega: o teste cai, não pendura).
    const inside = Promise.race([
      new Promise<string | null>((resolve) => (entered = resolve)),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("o createCharge não foi chamado em 15 s (nenhuma charge_create na fila?)")), 15_000).unref()),
    ]);
    const port = Object.create(real);
    port.createCharge = async (input: unknown) => {
      if (options.after) {
        const result = await real.createCharge(input);
        entered(result.chargeId);
        await gate;
        return result;
      }
      entered(null);
      await gate;
      return real.createCharge(input);
    };
    return { port, inside, release };
  }

  /** O fim que vale para RACE-1 (i)/(ii) e RACE-2: 0 cobrança pending na tabela, o cancelamento enviado (1 DELETE) e o cliente
   * sem link de pagamento, sem chave de dinheiro. */
  async function assertNoLiveChargeLeft(f: Fixture, deletesBefore: number): Promise<void> {
    await dispatch(f.tenantId);
    assert.deepEqual((await chargeRows(f.statementId)).filter((row) => row.status === "pending"), [], "0 cobrança pending na tabela");
    assert.equal(deletesOfPayments() - deletesBefore, 1, "1 DELETE no provedor");
    const cancels = (await lines(f.statementId)).filter((row) => row.kind === "charge_cancel");
    assert.deepEqual(cancels.map((row) => row.status), ["SENT"]);
    const runtime = await H.m.statementFactory.createDefaultStatementRuntime();
    const { buildTenantSubscriptionView } = await import("../src/modules/subscription-billing/statements/subscription-view.js");
    const { findMoneyKeys } = await import("../src/modules/subscription-billing/charges/charge-view.js");
    const view = await buildTenantSubscriptionView(runtime, f.tenantId, new Date());
    assert.deepEqual(findMoneyKeys(view), []);
    assert.equal(view?.payment, undefined, "a conta está paga ou cancelada: nada a pagar");
  }

  test("RACE-1 (i): createCharge pausado; a baixa que quita COMMITA durante a chamada; solta → o registro relê → 1 charge_cancel → 1 DELETE", async () => {
    const f = await closed("race1i");
    const deletes = deletesOfPayments();
    const { port, inside, release } = pausedPort();
    const running = dispatch(f.tenantId, { port });
    await inside;
    const paid = await payRoute(f, "100.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    assert.equal((await statementRow(f.statementId)).status, "paid");
    release();
    await running;
    assert.ok((await lines(f.statementId)).some((row) => row.kind === "charge_cancel"), "o registro enfileirou o cancelamento");
    await assertNoLiveChargeLeft(f, deletes);
  });

  test("RACE-1 (ii): a baixa ABERTA segura a trava quando o registro chega — o registro ESPERA (Lock no pg_stat_activity) e depois relê o pago", async () => {
    const f = await closed("race1ii");
    const deletes = deletesOfPayments();
    const { port, inside, release } = pausedPort();
    const running = dispatch(f.tenantId, { port });
    await inside;
    const { Client } = (await import("pg")) as any;
    const holder = new Client({ connectionString: process.env.DATABASE_URL });
    await holder.connect();
    let waited = false;
    try {
      await holder.query("BEGIN");
      await holder.query(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, [f.statementId]);
      await holder.query(`UPDATE subscription_statements SET status = 'paid', paid_amount = total_amount, paid_at = now() WHERE id = $1::uuid`, [f.statementId]);
      release();
      const deadline = Date.now() + 8_000;
      while (Date.now() < deadline && !waited) {
        const rows = await q(`SELECT query FROM pg_stat_activity WHERE usename = $1 AND state = 'active' AND wait_event_type = 'Lock'`, H.role.roleName);
        waited = rows.some((row) => String(row.query).includes("FOR NO KEY UPDATE"));
        if (!waited) await new Promise((resolve) => setTimeout(resolve, 20));
      }
      await holder.query("COMMIT");
    } finally {
      await holder.end();
    }
    await running;
    assert.equal(waited, true, "o registro esperou a trava do demonstrativo ANTES de a baixa soltar");
    await assertNoLiveChargeLeft(f, deletes);
  });

  test("RACE-2: cancel() com o createCharge pausado → o mesmo fim", async () => {
    const f = await closed("race2");
    const deletes = deletesOfPayments();
    const { port, inside, release } = pausedPort();
    const running = dispatch(f.tenantId, { port });
    await inside;
    const cancelled = await cancelRoute(f);
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    release();
    await running;
    await assertNoLiveChargeLeft(f, deletes);
    assert.equal((await statementRow(f.statementId)).status, "cancelled");
  });

  /** Uma órfã: a linha PROCESSING parada há 20 min (o processo caiu entre o POST e o registro) e a cobrança já no provedor. */
  async function orphanWithCharge(tag: string, providerStatus: string): Promise<Fixture & { chargeId: string }> {
    const f = await closed(tag);
    const real = adapterOverFake();
    const created = await real.createCharge({ customerId: "cus_c1c", amountCents: 10_000, dueDate: spDayPlus(10), externalReference: f.statementId, method: "pix", idempotencyKey: randomUUID() });
    H.fake!.setPaymentStatus(created.chargeId, providerStatus);
    const stale = new Date(Date.now() - 20 * 60 * 1000);
    await H.db.$executeRawUnsafe(
      `UPDATE billing_outbox SET status = 'PROCESSING', attempts = 1, claimed_at = $2, claimed_by = 'dispatch-outbox:caiu', attempt_started_at = $2 WHERE statement_id = $1::uuid`,
      f.statementId,
      stale,
    );
    await H.db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'paid', paid_amount = total_amount, paid_at = now() WHERE id = $1::uuid`, f.statementId);
    return { ...f, chargeId: created.chargeId };
  }

  test("RACE-4: órfã adotada pending sobre demonstrativo paid → charge_cancel (e o DELETE)", async () => {
    const f = await orphanWithCharge("race4", "PENDING");
    const deletes = deletesOfPayments();
    const run = await dispatch(f.tenantId);
    assert.equal(run.outcomes.recovered, 1, JSON.stringify(run.outcomes));
    const cancels = (await lines(f.statementId)).filter((row) => row.kind === "charge_cancel");
    assert.equal(cancels.length, 1, JSON.stringify(cancels));
    assert.equal(cancels[0]!.payload.chargeId, f.chargeId);
    await dispatch(f.tenantId);
    assert.equal(deletesOfPayments() - deletes, 1);
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["cancelled"]);
  });

  test("RACE-5: órfã adotada PAGA sobre paid → cobrança confirmed, 0 charge_cancel", async () => {
    const f = await orphanWithCharge("race5", "RECEIVED");
    const run = await dispatch(f.tenantId);
    assert.equal(run.outcomes.recovered, 1, JSON.stringify(run.outcomes));
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["confirmed"]);
    assert.deepEqual((await lines(f.statementId)).filter((row) => row.kind === "charge_cancel"), []);
  });

  test("RACE-7: o webhook aplica o pagamento entre o createCharge e o registro → a cobrança nasce confirmed, 0 charge_cancel, 0 DELETE", async () => {
    const f = await closed("race7");
    const deletes = deletesOfPayments();
    const { port, inside, release } = pausedPort({ after: true });
    const running = dispatch(f.tenantId, { port });
    const chargeId = (await inside)!;
    const deps = await channelDeps();
    const settled = await deps.settlement.settle({ tenantId: f.tenantId, statementId: f.statementId, source: "asaas", externalChargeId: chargeId, paidCents: 10_000, method: "pix", now: new Date() });
    assert.equal(settled.kind, "settled");
    assert.equal((await statementRow(f.statementId)).status, "paid");
    release();
    await running;
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => [row.external_charge_id, row.status]), [[chargeId, "confirmed"]]);
    assert.deepEqual((await lines(f.statementId)).filter((row) => row.kind === "charge_cancel"), []);
    await dispatch(f.tenantId);
    assert.equal(deletesOfPayments() - deletes, 0);
  });
}
