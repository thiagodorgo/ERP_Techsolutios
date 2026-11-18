// B-ASS-08c1c (plano §4.3, D2 (i); Emendas 1 e 1.1) — a marcação imediata: a baixa manual que quita (`[EAGER-01]`, no
// `#afterManualSettle`) e o `cancel()` (`[EAGER-02]`) tiram a `charge_create` do "a cobrar" NA transação do movimento: a
// PENDING vira SKIPPED com o motivo; a SENT com a cobrança `pending` ganha o `charge_cancel` pelo núcleo único (`[CANCEL-CORE]`).
// Baixa parcial e NEEDS_REVIEW não mexem. No PostgreSQL sob papel efêmero NOSUPERUSER NOBYPASSRLS, pela rota real.
//
// Donos: EG1 a EG7. Mutações: M8 (apagar EAGER-01) → EG1/EG2; M8b (apagar EAGER-02) → EG3; M-EG4 (`if (true)`) → EG4; M-EG5
// (NEEDS_REVIEW no EAGER-SKIPPABLE) → EG5; M-EG7 (apagar CANCEL-CORE-ONE) → EG7. O EG6 injeta a falha da fila por gatilho na
// base descartável (a mesma propriedade: a gravação falha → a baixa inteira desfaz).
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
  return (await q(`SELECT id, kind, status, skip_reason, last_error, payload, external_id, idempotency_key, occurred_at, attempts FROM billing_outbox WHERE statement_id = $1::uuid AND kind LIKE 'charge_%' ORDER BY created_at, idempotency_key`, statementId)) as Line[];
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
  test("B-ASS-08c1c · a marcação imediata exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  after(teardownDb);

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, Asaas ligado e o app real no modo prisma", async () => {
    await setupDb("c1c_eager");
  });

  /** Fecha pela rota (a 1ª `charge_create` nasce) e, se pedido, despacha (a linha vira SENT com a cobrança `pending`). */
  async function closed(tag: string, sent: boolean): Promise<Fixture> {
    const tenantId = await seedTenant(tag);
    const response = await closeRoute(tenantId);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const statement = await statementOfTenant(tenantId);
    if (sent) {
      const run = await dispatch(tenantId);
      assert.equal(run.outcomes.sent, 1, JSON.stringify(run.outcomes));
      assert.deepEqual((await chargeRows(statement.id)).map((row) => row.status), ["pending"]);
    }
    return { tenantId, statementId: statement.id };
  }

  const cancels = async (statementId: string) => (await lines(statementId)).filter((row) => row.kind === "charge_cancel");

  test("EG1: baixa manual que quita com PENDING → SKIPPED statement_paid NA transação da baixa (lida antes de qualquer despacho)", async () => {
    const f = await closed("eg1", false);
    const paid = await payRoute(f, "100.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    assert.equal((await statementRow(f.statementId)).status, "paid");
    assert.deepEqual((await lines(f.statementId)).map((row) => [row.kind, row.status, row.skip_reason]), [["charge_create", "SKIPPED", "statement_paid"]]);
  });

  test("EG2: baixa que quita com SENT e cobrança pending → 1 charge_cancel → despacho → 1 DELETE, cobrança cancelled, 0 cobrança nova", async () => {
    const f = await closed("eg2", true);
    const paid = await payRoute(f, "100.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    const pending = await cancels(f.statementId);
    assert.deepEqual(pending.map((row) => row.status), ["PENDING"]);
    const deletes = deletesOfPayments();
    const posts = postsToPayments();
    await dispatch(f.tenantId);
    assert.equal(deletesOfPayments() - deletes, 1, "1 DELETE");
    assert.equal(postsToPayments() - posts, 0, "0 cobrança nova");
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["cancelled"]);
    assert.deepEqual((await cancels(f.statementId)).map((row) => row.status), ["SENT"]);
  });

  test("EG3: cancel() com PENDING → SKIPPED statement_cancelled; com SENT e cobrança pending → charge_cancel", async () => {
    const a = await closed("eg3a", false);
    const ra = await cancelRoute(a);
    assert.equal(ra.status, 200, JSON.stringify(ra.body));
    assert.deepEqual((await lines(a.statementId)).map((row) => [row.status, row.skip_reason]), [["SKIPPED", "statement_cancelled"]]);
    const b = await closed("eg3b", true);
    const rb = await cancelRoute(b);
    assert.equal(rb.status, 200, JSON.stringify(rb.body));
    assert.deepEqual((await cancels(b.statementId)).map((row) => row.status), ["PENDING"]);
  });

  test("EG4: baixa PARCIAL com SENT → nada muda (Q4 (a))", async () => {
    const f = await closed("eg4", true);
    const before = await lines(f.statementId);
    const paid = await payRoute(f, "30.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    assert.deepEqual(await lines(f.statementId), before);
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["pending"]);
  });

  test("EG5: baixa que quita com NEEDS_REVIEW → a linha continua NEEDS_REVIEW (§9 D-2)", async () => {
    const f = await closed("eg5", false);
    await H.db.$executeRawUnsafe(`UPDATE billing_outbox SET status = 'NEEDS_REVIEW', last_error = 'charge_found_no_candidate' WHERE statement_id = $1::uuid`, f.statementId);
    const paid = await payRoute(f, "100.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    assert.deepEqual((await lines(f.statementId)).map((row) => [row.status, row.last_error]), [["NEEDS_REVIEW", "charge_found_no_candidate"]]);
  });

  test("EG6: a gravação do charge_cancel falha (gatilho de falha injetada) → a baixa que quita falha inteira: 0 pagamento, demonstrativo closed", async () => {
    const f = await closed("eg6", true);
    await H.db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION c1c_fail_outbox_eg6() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN IF NEW.tenant_id = '${f.tenantId}'::uuid THEN RAISE EXCEPTION 'c1c_injected_outbox_failure'; END IF; RETURN NEW; END $f$`);
    await H.db.$executeRawUnsafe(`CREATE TRIGGER c1c_fail_outbox_eg6 BEFORE INSERT ON billing_outbox FOR EACH ROW EXECUTE FUNCTION c1c_fail_outbox_eg6()`);
    try {
      const paid = await payRoute(f, "100.00");
      assert.notEqual(paid.status, 201, JSON.stringify(paid.body));
      assert.equal((await q(`SELECT count(*)::int AS n FROM subscription_statement_payments WHERE statement_id = $1::uuid`, f.statementId))[0].n, 0, "0 pagamento");
      assert.equal((await statementRow(f.statementId)).status, "closed");
      assert.deepEqual(await cancels(f.statementId), []);
    } finally {
      await H.db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS c1c_fail_outbox_eg6 ON billing_outbox`);
    }
  });

  test("EG7: dois cancelamentos pela mesma cobrança (rota charge/cancel + baixa que quita) → 1 charge_cancel vivo (o núcleo único)", async () => {
    const f = await closed("eg7", true);
    const cancel = await chargeCancelRoute(f);
    assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
    const paid = await payRoute(f, "100.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    assert.deepEqual((await cancels(f.statementId)).map((row) => row.status), ["PENDING"], "um só charge_cancel vivo");
  });

  // ---------------------------------------------------------------- conserto da J-579 (C2-01/C2-03 e A-C1-01): EG8 a EG8d, EG9
  // O estado DESCONHECIDO da cobrança (`needs_review`) e os 3 estados pagos são FORÇADOS por UPDATE (declarado): nenhum escritor
  // de produto grava esses estados na tabela hoje (plano do conserto §1.3). O fixture é o `closedSentWithCharge` da PX1 da C2.
  async function closedSentWithCharge(tag: string, chargeState: string): Promise<Fixture & { ext: string }> {
    const f = await closed(tag, true);
    const ext = (await lines(f.statementId)).find((row) => row.kind === "charge_create")!.external_id!;
    await H.db.$executeRawUnsafe(`UPDATE subscription_statement_charges SET status = $2 WHERE statement_id = $1::uuid`, f.statementId, chargeState);
    return { ...f, ext };
  }

  test("EG8: SENT + cobrança needs_review (forçada); a lista diz PENDING; baixa que quita → 1 charge_cancel na transação da baixa; despacho → 1 DELETE, tabela cancelled, a charge_create SKIPPED charge_cancelled, conta paid", async () => {
    const f = await closedSentWithCharge("eg8", "needs_review");
    const paid = await payRoute(f, "100.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    assert.deepEqual((await cancels(f.statementId)).map((row) => row.status), ["PENDING"], "o cancelamento nasce na transação da baixa");
    const deletes = deletesOfPayments();
    await dispatch(f.tenantId);
    assert.equal(deletesOfPayments() - deletes, 1, "1 DELETE");
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["cancelled"]);
    const create = (await lines(f.statementId)).find((row) => row.kind === "charge_create")!;
    assert.deepEqual([create.status, create.last_error], ["SKIPPED", "charge_cancelled"]);
    assert.equal((await statementRow(f.statementId)).status, "paid");
  });

  test("EG8b: o mesmo pelo cancel() da conta", async () => {
    const f = await closedSentWithCharge("eg8b", "needs_review");
    const cancelled = await cancelRoute(f);
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    assert.deepEqual((await cancels(f.statementId)).map((row) => row.status), ["PENDING"]);
    const deletes = deletesOfPayments();
    await dispatch(f.tenantId);
    assert.equal(deletesOfPayments() - deletes, 1, "1 DELETE");
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["cancelled"]);
    assert.equal((await statementRow(f.statementId)).status, "cancelled");
  });

  test("EG8c: SENT + needs_review; a lista traz a cobrança num status que o mapa não conhece; baixa que quita → 1 charge_cancel; despacho → NEEDS_REVIEW charge_state_unknown, 0 DELETE, a tabela continua needs_review", async () => {
    const f = await closedSentWithCharge("eg8c", "needs_review");
    H.fake!.setPaymentStatus(f.ext, "FOO_UNMAPPED");
    const paid = await payRoute(f, "100.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    assert.equal((await cancels(f.statementId)).length, 1);
    const deletes = deletesOfPayments();
    await dispatch(f.tenantId);
    assert.equal(deletesOfPayments() - deletes, 0, "0 DELETE às cegas");
    assert.deepEqual((await cancels(f.statementId)).map((row) => [row.status, row.last_error]), [["NEEDS_REVIEW", "charge_state_unknown"]]);
    assert.deepEqual((await chargeRows(f.statementId)).map((row) => row.status), ["needs_review"]);
  });

  test("EG8d: os 3 estados pagos (confirmed, partially_refunded, chargeback_disputed; forçados) → baixa que quita → 0 charge_cancel, 0 DELETE", async () => {
    for (const state of ["confirmed", "partially_refunded", "chargeback_disputed"]) {
      const f = await closedSentWithCharge(`eg8d-${state.slice(0, 6)}`, state);
      const deletes = deletesOfPayments();
      const paid = await payRoute(f, "100.00");
      assert.equal(paid.status, 201, JSON.stringify(paid.body));
      await dispatch(f.tenantId);
      assert.deepEqual(await cancels(f.statementId), [], `${state}: 0 charge_cancel`);
      assert.equal(deletesOfPayments() - deletes, 0, `${state}: 0 DELETE`);
    }
  });

  test("EG9 (A-C1-01): um charge_cancel ANTIGO FAILED da MESMA cobrança não conta como vivo; a baixa que quita enfileira o 2º; despacho → 1 DELETE, 0 cobrança pending, conta paid", async () => {
    const f = await closed("eg9", true);
    const create = (await lines(f.statementId)).find((row) => row.kind === "charge_create")!;
    await H.db.$executeRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, attempts, last_error)
       VALUES ($1::uuid, $2::uuid, 'charge_cancel', 'asaas', $3, gen_random_uuid(), $4::jsonb, now(), 'FAILED', 8, 'provider_timeout')`,
      f.tenantId,
      f.statementId,
      `charge_cancel:${f.statementId}:1`,
      JSON.stringify({ chargeId: create.external_id, chargeCreateId: create.id }),
    );
    const paid = await payRoute(f, "100.00");
    assert.equal(paid.status, 201, JSON.stringify(paid.body));
    // Ordenado pelo `seq` da chave (o FAILED semeado tem o `created_at` do relógio do banco e o PENDING o do app: a ordem de criação
    // não é o que se mede).
    assert.deepEqual((await cancels(f.statementId)).map((row) => `${row.idempotency_key.split(":")[2]}:${row.status}`).sort(), ["1:FAILED", "2:PENDING"]);
    const deletes = deletesOfPayments();
    await dispatch(f.tenantId);
    assert.equal(deletesOfPayments() - deletes, 1, "1 DELETE");
    assert.deepEqual((await chargeRows(f.statementId)).filter((row) => row.status === "pending"), []);
    assert.equal((await statementRow(f.statementId)).status, "paid");
  });
}
