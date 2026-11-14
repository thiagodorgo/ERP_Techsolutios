// B-ASS-08c1b — a fila operável pela ROTA REAL, no PostgreSQL, sob papel efêmero NOSUPERUSER NOBYPASSRLS (drill do B-O6R-06).
//
// O app real (`createApp`) roda no modo `prisma` sobre uma base PRÓPRIA (template0 + `migrate deploy`), com o singleton do
// Prisma apontado para o cliente do papel efêmero: toda leitura e escrita das rotas passa pelo RLS da organização. A base é
// apagada no fim (`DROP DATABASE … WITH (FORCE)`), e o papel pelo teardown resiliente.
//
// Casos (abertura §5.1 e Emendas 1 e 2):
//   RO1 (F1, P8) — reopen com linha NEEDS_REVIEW → 422 `outbox_needs_review` pela rota, com a leitura no MESMO `tx`: o papel
//   abre UMA conexão só durante o pedido (com o guard numa transação à parte seriam duas, porque a do reopen segura a
//   sua). Mutação M9: apagar a linha `[GUARD-01]` → 200.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// O vencimento que ainda vale: a data de negócio de hoje em São Paulo + 30 dias (nunca a data UTC, nunca um literal que envelhece).
const DUE_FUTURA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;

type Json = Record<string, any>;

if (!connectionString) {
  test("B-ASS-08c1b · a fila operável exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any;
  let db: any;
  let role: EphemeralRole;
  let databaseName = "";
  let server: Server | undefined;
  let baseUrl = "";

  after(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await role?.drop();
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  async function api(method: string, route: string, body?: unknown): Promise<{ status: number; body: Json }> {
    const response = await fetch(baseUrl + route, {
      method,
      headers: { "content-type": "application/json", ...PLATFORM },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as Json };
  }

  async function roleBackends(): Promise<number> {
    const rows = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE usename = $1`, role.roleName)) as Array<{ n: number }>;
    return rows[0]!.n;
  }

  /** Organização + demonstrativo `closed` sem pagamento, sem cobrança e sem nota (o reopen passa, salvo o guard). */
  async function seedClosed(tag: string): Promise<{ tenantId: string; statementId: string }> {
    const slug = `c1b-rv-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>)[0]!.id;
    const statementId = ((await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 123.45,0,0,0,0,0,123.45, '${DUE_FUTURA}', now(),
               '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
    )) as Array<{ id: string }>)[0]!.id;
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);
    return { tenantId, statementId };
  }

  async function seedOutbox(
    fixture: { tenantId: string; statementId: string },
    kind: string,
    status: string,
    extra: { readonly seq?: number; readonly lastError?: string | null; readonly payload?: Record<string, unknown> } = {},
  ): Promise<string> {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, attempts, last_error)
       VALUES ($1::uuid, $2::uuid, $3, 'asaas', $4, gen_random_uuid(), $5::jsonb, now(), $6, 1, $7) RETURNING id`,
      fixture.tenantId,
      fixture.statementId,
      kind,
      `${kind}:${fixture.statementId}:${extra.seq ?? 1}`,
      JSON.stringify(extra.payload ?? { amountCents: 12345, dueDate: DUE_FUTURA, method: "pix" }),
      status,
      extra.lastError ?? null,
    )) as Array<{ id: string }>;
    return rows[0]!.id;
  }

  async function statementStatus(statementId: string): Promise<string> {
    const rows = (await db.$queryRawUnsafe(`SELECT status FROM subscription_statements WHERE id = $1::uuid`, statementId)) as Array<{ status: string }>;
    return rows[0]!.status;
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS e o app real no modo prisma sobre o papel", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_c1b_rv_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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

    // O singleton do Prisma do app passa a ser o cliente do papel (src/database/prisma.ts honra `globalThis.prisma`).
    (globalThis as { prisma?: unknown }).prisma = role.client;
    process.env.DATABASE_URL = targetUrl;
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";
    const [{ env }, { createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, { resetStatementRuntimeForTests }] = await Promise.all([
      import("../src/config/env.js"),
      import("../src/app.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
      import("../src/modules/subscription-billing/statements/statement.factory.js"),
    ]);
    (env as unknown as { CORE_SAAS_PERSISTENCE: string }).CORE_SAAS_PERSISTENCE = "prisma";
    resetStatementRuntimeForTests();
    const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  test("RO1: reopen com linha NEEDS_REVIEW → 422 outbox_needs_review pela rota, a leitura no mesmo tx (1 conexão do papel)", async () => {
    const fixture = await seedClosed("ro1");
    await seedOutbox(fixture, "charge_create", "NEEDS_REVIEW", { lastError: "charge_found_no_candidate" });
    assert.equal(await roleBackends(), 0, "premissa: o papel ainda não abriu conexão (o RO1 é o 1º pedido do arquivo)");

    const response = await api("POST", `/api/v1/platform/billing/statements/${fixture.statementId}/reopen`, { tenantId: fixture.tenantId, reason: "reabrir para conferir o fechamento" });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "outbox_needs_review");
    assert.equal(await statementStatus(fixture.statementId), "closed", "nada gravado");
    assert.equal(await roleBackends(), 1, "a leitura da fila roda no MESMO tx do reopen: o papel nunca precisou de 2 conexões");

    // Controle positivo: sem linha em revisão, a mesma rota reabre.
    const free = await seedClosed("ro1-livre");
    await seedOutbox(free, "charge_create", "FAILED", { lastError: "provider_unavailable" });
    const ok = await api("POST", `/api/v1/platform/billing/statements/${free.statementId}/reopen`, { tenantId: free.tenantId, reason: "reabrir para conferir o fechamento" });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(await statementStatus(free.statementId), "reopened");
  });

  // ------------------------------------------------------------------------------------- F5: a revisão da fila (P10)
  const SP_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const spDayPlus = (days: number) => SP_DAY.format(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
  const REASON = "conferido no painel do provedor pelo operador";

  /** Demonstrativo no estado pedido (padrão: `closed`, R$ 123,45, nada pago, vencimento daqui a 10 dias). */
  async function seedStatement(tag: string, options: { readonly status?: string; readonly paid?: string; readonly dueDate?: string | null } = {}): Promise<{ tenantId: string; statementId: string }> {
    const fixture = await seedClosed(tag);
    await db.$executeRawUnsafe(
      `UPDATE subscription_statements SET status = $2, paid_amount = $3::numeric, due_date = $4::date, paid_at = CASE WHEN $2 = 'paid' THEN now() END WHERE id = $1::uuid`,
      fixture.statementId,
      options.status ?? "closed",
      options.paid ?? "0",
      options.dueDate === undefined ? spDayPlus(10) : options.dueDate,
    );
    return fixture;
  }

  async function outboxRow(id: string): Promise<{ status: string; last_error: string | null; payload: Json; occurred_at: Date; attempts: number }> {
    const rows = (await db.$queryRawUnsafe(`SELECT status, last_error, payload, occurred_at, attempts FROM billing_outbox WHERE id = $1::uuid`, id)) as any[];
    return rows[0];
  }

  async function dispatchModules() {
    const [dispatcher, outboxPrisma, http, asaas, fakeModule] = await Promise.all([
      import("../src/modules/subscription-billing/outbox/outbox.dispatcher.js"),
      import("../src/modules/subscription-billing/outbox/outbox.prisma.js"),
      import("../src/modules/subscription-billing/providers/http/billing-http.client.js"),
      import("../src/modules/subscription-billing/providers/payment/asaas/index.js"),
      import("./helpers/fake-providers/asaas.js"),
    ]);
    return { dispatcher, outboxPrisma, http, asaas, fakeModule };
  }

  /** O despacho real sobre o falso do Asaas, recortado à organização do caso. */
  async function dispatchOnFake(tenantId: string, fake: { baseUrl: string }) {
    const m = await dispatchModules();
    const client = new m.http.BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${fake.baseUrl}/v3` });
    const adapter = new m.asaas.AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE"));
    return m.dispatcher.runDispatchOutbox({
      repo: new m.outboxPrisma.PrismaOutboxRepository(role.client, { tenantIds: [tenantId] }),
      ports: { asaas: adapter },
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_fake_rs" }),
    });
  }

  const postsToPayments = (fake: { recorded: Array<{ method: string; path: string }> }) =>
    fake.recorded.filter((request) => request.method === "POST" && request.path.split("?")[0] === "/v3/payments").length;

  test("RS1: /resolve → FAILED com o last_error MANTIDO e a trilha billing_outbox.resolved com o código anterior", async () => {
    const fixture = await seedStatement("rs1");
    const id = await seedOutbox(fixture, "charge_create", "NEEDS_REVIEW", { lastError: "charge_found_no_candidate", payload: { amountCents: 12345, dueDate: spDayPlus(10), method: "pix" } });
    const response = await api("POST", `/api/v1/platform/billing/outbox/${id}/resolve`, { tenantId: fixture.tenantId, reason: REASON });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.status, "FAILED");
    assert.equal(response.body.data.lastError, "charge_found_no_candidate");
    assert.deepEqual(Object.keys(response.body.data).sort(), ["attempts", "externalId", "id", "kind", "lastError", "nextAttemptAt", "occurredAt", "provider", "skipReason", "statementId", "status", "updatedAt"]);
    const row = await outboxRow(id);
    assert.equal(row.status, "FAILED");
    assert.equal(row.last_error, "charge_found_no_candidate", "o last_error fica (a regra dos 7 dias e a adoção o leem)");
    const trail = (await db.$queryRawUnsafe(
      `SELECT entity, entity_id, metadata FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'billing_outbox.resolved'`,
      fixture.tenantId,
    )) as Array<{ entity: string; entity_id: string; metadata: Json }>;
    assert.equal(trail.length, 1);
    assert.equal(trail[0]!.entity_id, id);
    assert.equal(trail[0]!.metadata.previousCode, "charge_found_no_candidate");
    assert.equal(trail[0]!.metadata.kind, "charge_create");
    assert.equal(trail[0]!.metadata.reason, REASON);
    const again = await api("POST", `/api/v1/platform/billing/outbox/${id}/resolve`, { tenantId: fixture.tenantId, reason: REASON });
    assert.equal(again.status, 422, JSON.stringify(again.body));
    assert.equal(again.body.error?.reason, "outbox_not_in_review");
    const short = await api("POST", `/api/v1/platform/billing/outbox/${id}/resolve`, { tenantId: fixture.tenantId, reason: "curto" });
    assert.equal(short.status, 400);
  });

  test("RS2: /retry de charge_create com outra viva → 422 charge_already_exists, nada reaberto", async () => {
    const fixture = await seedStatement("rs2");
    const failed = await seedOutbox(fixture, "charge_create", "FAILED", { seq: 1, lastError: "provider_unavailable", payload: { amountCents: 12345, dueDate: spDayPlus(10), method: "pix" } });
    await seedOutbox(fixture, "charge_create", "PENDING", { seq: 2, payload: { amountCents: 12345, dueDate: spDayPlus(10), method: "pix" } });
    const response = await api("POST", `/api/v1/platform/billing/outbox/${failed}/retry`, { tenantId: fixture.tenantId });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "charge_already_exists");
    assert.equal((await outboxRow(failed)).status, "FAILED");
  });

  test("RS3: id de linha de OUTRA organização com o meu tenantId → 404 no /resolve e no /retry, e a linha não muda", async () => {
    const mine = await seedStatement("rs3-a");
    const other = await seedStatement("rs3-b");
    const review = await seedOutbox(other, "charge_create", "NEEDS_REVIEW", { lastError: "charge_found_no_candidate" });
    const failed = await seedOutbox(other, "invoice_cancel", "FAILED", { lastError: "provider_unavailable", payload: {} });
    const resolve = await api("POST", `/api/v1/platform/billing/outbox/${review}/resolve`, { tenantId: mine.tenantId, reason: REASON });
    assert.equal(resolve.status, 404, JSON.stringify(resolve.body));
    assert.equal(resolve.body.error?.reason, "outbox_not_found");
    const retry = await api("POST", `/api/v1/platform/billing/outbox/${failed}/retry`, { tenantId: mine.tenantId });
    assert.equal(retry.status, 404, JSON.stringify(retry.body));
    assert.equal(retry.body.error?.reason, "outbox_not_found");
    assert.equal((await outboxRow(review)).status, "NEEDS_REVIEW");
    assert.equal((await outboxRow(failed)).status, "FAILED");
    const unknown = await api("POST", `/api/v1/platform/billing/outbox/nao-e-uuid/retry`, { tenantId: mine.tenantId });
    assert.equal(unknown.status, 404);
  });

  test("RS3b: a listagem da fila traz SÓ a organização pedida, numa lista fechada de campos", async () => {
    const mine = await seedStatement("rs3b-a");
    const other = await seedStatement("rs3b-b");
    const own = await seedOutbox(mine, "charge_create", "NEEDS_REVIEW", { lastError: "charge_found_no_candidate" });
    const foreign = await seedOutbox(other, "charge_create", "NEEDS_REVIEW", { lastError: "charge_found_no_candidate" });
    const listed = await api("GET", `/api/v1/platform/billing/outbox?tenantId=${mine.tenantId}&status=NEEDS_REVIEW&provider=asaas`);
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    const ids = listed.body.data.map((row: Json) => row.id);
    assert.deepEqual(ids, [own]);
    assert.equal(ids.includes(foreign), false, "nenhuma linha de outra organização");
    for (const row of listed.body.data) {
      for (const forbidden of ["payload", "claimedBy", "providerIdempotencyKey", "tenantId", "idempotencyKey"]) assert.equal(forbidden in row, false, `sem ${forbidden}`);
    }
    const bad = await api("GET", `/api/v1/platform/billing/outbox?tenantId=${mine.tenantId}&status=QUALQUER`);
    assert.equal(bad.status, 400);
    const noTenant = await api("GET", `/api/v1/platform/billing/outbox`);
    assert.equal(noTenant.status, 400);
  });

  test("RS3c: os métodos novos, chamados por uma conexão que NÃO passa pelo RLS (superusuário), não acham a linha de outra organização", async () => {
    const { PrismaOutboxRepository } = await import("../src/modules/subscription-billing/outbox/outbox.prisma.js");
    const owner = new PrismaOutboxRepository(db);
    const mine = await seedStatement("rs3c-a");
    const other = await seedStatement("rs3c-b");
    const review = await seedOutbox(other, "charge_create", "NEEDS_REVIEW", { lastError: "charge_found_no_candidate" });
    const failed = await seedOutbox(other, "invoice_cancel", "FAILED", { lastError: "provider_unavailable", payload: {} });
    assert.deepEqual(await owner.resolve(mine.tenantId, review, { reason: REASON, actorId: null, now: new Date() }), { kind: "not_found" });
    assert.deepEqual(await owner.retryByOperator(mine.tenantId, failed, new Date(), {}), { kind: "not_found" });
    assert.deepEqual((await owner.listForTenant(mine.tenantId, {})).map((row) => row.id), []);
    assert.equal((await outboxRow(review)).status, "NEEDS_REVIEW");
    assert.equal((await outboxRow(failed)).status, "FAILED");
  });

  test("RS4: /resolve de invoice_cancel em NEEDS_REVIEW → FAILED (a saída do cuidado 2 da Q3)", async () => {
    const fixture = await seedStatement("rs4");
    const id = await seedOutbox(fixture, "invoice_cancel", "NEEDS_REVIEW", { lastError: "invoice_stuck_processing", payload: { reason: "payment_reversed" } });
    const response = await api("POST", `/api/v1/platform/billing/outbox/${id}/resolve`, { tenantId: fixture.tenantId, reason: REASON });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal((await outboxRow(id)).status, "FAILED");
    assert.equal((await outboxRow(id)).last_error, "invoice_stuck_processing");
  });

  test("RS5: /retry de charge_create de conta JÁ PAGA → PENDING, e o claim a pula (SKIPPED statement_paid), 0 POST", async () => {
    const { fakeModule } = await dispatchModules();
    const fake = await fakeModule.startAsaasFake();
    try {
      const fixture = await seedStatement("rs5", { status: "paid", paid: "123.45" });
      const id = await seedOutbox(fixture, "charge_create", "FAILED", { lastError: "provider_unavailable", payload: { amountCents: 12345, dueDate: spDayPlus(10), method: "pix" } });
      const response = await api("POST", `/api/v1/platform/billing/outbox/${id}/retry`, { tenantId: fixture.tenantId });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.data.outbox.status, "PENDING");
      const result = await dispatchOnFake(fixture.tenantId, fake);
      assert.equal(result.outcomes.skipped, 1);
      const row = (await db.$queryRawUnsafe(`SELECT status, skip_reason FROM billing_outbox WHERE id = $1::uuid`, id)) as Array<{ status: string; skip_reason: string }>;
      assert.deepEqual(row[0], { status: "SKIPPED", skip_reason: "statement_paid" });
      assert.equal(postsToPayments(fake), 0, "0 POST");
    } finally {
      await fake.close();
    }
  });

  test("RS6: /retry de linha que não está FAILED → 422 outbox_not_failed (e não 404)", async () => {
    const fixture = await seedStatement("rs6");
    const id = await seedOutbox(fixture, "charge_create", "NEEDS_REVIEW", { lastError: "charge_found_no_candidate" });
    const response = await api("POST", `/api/v1/platform/billing/outbox/${id}/retry`, { tenantId: fixture.tenantId });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "outbox_not_failed");
    assert.equal((await outboxRow(id)).status, "NEEDS_REVIEW");
  });

  test("RS7 (banco): /retry de charge_create FAILED em conta com pagamento PARCIAL → 422 statement_partially_paid, FAILED, 0 POST", async () => {
    const { fakeModule } = await dispatchModules();
    const fake = await fakeModule.startAsaasFake();
    try {
      const fixture = await seedStatement("rs7", { paid: "50.00" });
      const id = await seedOutbox(fixture, "charge_create", "FAILED", { lastError: "provider_unavailable", payload: { amountCents: 12345, dueDate: spDayPlus(10), method: "pix" } });
      const response = await api("POST", `/api/v1/platform/billing/outbox/${id}/retry`, { tenantId: fixture.tenantId });
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error?.reason, "statement_partially_paid");
      assert.equal((await outboxRow(id)).status, "FAILED");
      await dispatchOnFake(fixture.tenantId, fake);
      assert.equal(postsToPayments(fake), 0, "0 POST");
    } finally {
      await fake.close();
    }
  });

  test("RS7b (banco): o retry ANTIGO, direto no repositório Prisma, também recusa o parcial (422)", async () => {
    const { PrismaOutboxRepository } = await import("../src/modules/subscription-billing/outbox/outbox.prisma.js");
    const fixture = await seedStatement("rs7b", { paid: "50.00" });
    const id = await seedOutbox(fixture, "charge_create", "FAILED", { lastError: "provider_unavailable", payload: { amountCents: 12345, dueDate: spDayPlus(10), method: "pix" } });
    await assert.rejects(new PrismaOutboxRepository(role.client).retry(fixture.tenantId, id, new Date()), (error: any) => error?.statusCode === 422 && error?.reason === "statement_partially_paid");
    assert.equal((await outboxRow(id)).status, "FAILED");
    // Controle: sem pagamento, o mesmo retry reabre.
    const free = await seedStatement("rs7b-livre");
    const freeId = await seedOutbox(free, "charge_create", "FAILED", { lastError: "provider_unavailable", payload: { amountCents: 12345, dueDate: spDayPlus(10), method: "pix" } });
    assert.equal((await new PrismaOutboxRepository(role.client).retry(free.tenantId, freeId, new Date()))?.status, "PENDING");
  });

  /** O app no modo MEMÓRIA, só durante `fn` (o `env` é lido a cada chamada pelas fábricas); os dublês são zerados antes e depois. */
  async function inMemoryMode<T>(fn: () => Promise<T>): Promise<T> {
    const [{ env }, statementFactory, channelRuntime] = await Promise.all([
      import("../src/config/env.js"),
      import("../src/modules/subscription-billing/statements/statement.factory.js"),
      import("../src/modules/subscription-billing/outbox/channel.runtime.js"),
    ]);
    const mutable = env as unknown as { CORE_SAAS_PERSISTENCE: string };
    mutable.CORE_SAAS_PERSISTENCE = "memory";
    statementFactory.resetStatementRuntimeForTests();
    channelRuntime.resetChannelRuntimeForTests();
    try {
      return await fn();
    } finally {
      mutable.CORE_SAAS_PERSISTENCE = "prisma";
      statementFactory.resetStatementRuntimeForTests();
      channelRuntime.resetChannelRuntimeForTests();
    }
  }

  test("RS7 e RS7b (memória): pela rota e pelo retry antigo, a conta com pagamento parcial → 422; sem pagamento, reabre", async () => {
    const [statementFactory, channelRuntime, outboxTypes, outboxRepository] = await Promise.all([
      import("../src/modules/subscription-billing/statements/statement.factory.js"),
      import("../src/modules/subscription-billing/outbox/channel.runtime.js"),
      import("../src/modules/subscription-billing/outbox/outbox.types.js"),
      import("../src/modules/subscription-billing/outbox/outbox.repository.js"),
    ]);
    await inMemoryMode(async () => {
      const tenantId = randomUUID();
      const now = new Date();
      const statements = statementFactory.getMemoryStatementRepositoryForTests();
      const statement = await statements.transaction(tenantId, async (tx) => {
        const { statement: fresh } = await tx.insertIfAbsentAndLock({ tenantId, period: "2026-10" });
        return tx.saveStatement({ ...fresh, status: "closed", totalCents: 12345, paidCents: 5000, dueDate: spDayPlus(10), closedAt: now });
      });
      const deps = await channelRuntime.createChannelRuntime();
      const { row } = await deps.outbox.enqueue({ tenantId, statementId: statement.id, kind: "charge_create", provider: "asaas", seq: 1, payload: { amountCents: 12345, dueDate: spDayPlus(10), method: "pix" } }, now);
      const claimed = await deps.outbox.claimNext({ enabledProviders: ["asaas"], now, claimedBy: "rs7-mem", orphanMs: outboxTypes.OUTBOX_ORPHAN_MS, verdict: () => ({ kind: "eligible" }) });
      assert.equal(claimed?.kind, "claimed");
      assert.ok(await deps.outbox.markFailed(tenantId, row.id, "provider_unavailable", now, outboxRepository.leaseOf((claimed as { row: never }).row)));
      const response = await api("POST", `/api/v1/platform/billing/outbox/${row.id}/retry`, { tenantId });
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error?.reason, "statement_partially_paid");
      assert.equal((await deps.outbox.findById(tenantId, row.id))?.status, "FAILED");
      await assert.rejects(deps.outbox.retry(tenantId, row.id, now), (error: any) => error?.statusCode === 422 && error?.reason === "statement_partially_paid");
      assert.equal((await deps.outbox.findById(tenantId, row.id))?.status, "FAILED");
    });
    // Controle no dublê direto: leitor sem pagamento → reabre; com pagamento parcial → 422.
    const make = (paidCents: number) =>
      new outboxRepository.InMemoryOutboxRepository({ readStatement: async () => ({ status: "closed", reopenedAt: null, totalCents: 12345, paidCents }) });
    for (const [paidCents, expected] of [[0, "PENDING"], [5000, "422"]] as const) {
      const repo = make(paidCents);
      const now = new Date();
      const { row } = await repo.enqueue({ tenantId: "t-mem", statementId: "s-mem", kind: "charge_create", provider: "asaas", seq: 1, payload: { amountCents: 12345, dueDate: spDayPlus(10) } }, now);
      const claimed = await repo.claimNext({ enabledProviders: ["asaas"], now, claimedBy: "rs7b-mem", orphanMs: outboxTypes.OUTBOX_ORPHAN_MS, verdict: () => ({ kind: "eligible" }) });
      await repo.markFailed("t-mem", row.id, "provider_unavailable", now, outboxRepository.leaseOf((claimed as { row: never }).row));
      if (expected === "PENDING") assert.equal((await repo.retry("t-mem", row.id, now))?.status, "PENDING");
      else await assert.rejects(repo.retry("t-mem", row.id, now), (error: any) => error?.statusCode === 422 && error?.reason === "statement_partially_paid");
    }
  });

  test("RS8: /retry com o vencimento PASSADO — sem data → 422 due_date_past; com data → PENDING e o payload regravado, last_error e occurred_at intactos; data com o vencimento valendo → 422 due_date_not_past", async () => {
    const fixture = await seedStatement("rs8");
    const id = await seedOutbox(fixture, "charge_create", "FAILED", { lastError: "provider_unavailable", payload: { amountCents: 12345, dueDate: "2026-11-01", method: "pix" } });
    const before = await outboxRow(id);
    const route = `/api/v1/platform/billing/outbox/${id}/retry`;
    const without = await api("POST", route, { tenantId: fixture.tenantId });
    assert.equal(without.status, 422, JSON.stringify(without.body));
    assert.equal(without.body.error?.reason, "due_date_past");
    assert.equal((await outboxRow(id)).status, "FAILED");
    const badFormat = await api("POST", route, { tenantId: fixture.tenantId, dueDate: "01/12/2026" });
    assert.equal(badFormat.status, 400, JSON.stringify(badFormat.body));
    const newDate = spDayPlus(12);
    const withDate = await api("POST", route, { tenantId: fixture.tenantId, dueDate: newDate });
    assert.equal(withDate.status, 200, JSON.stringify(withDate.body));
    assert.equal(withDate.body.data.outbox.status, "PENDING");
    assert.equal(withDate.body.data.notice, "due_date_applies_only_if_created");
    const after = await outboxRow(id);
    assert.equal(after.payload.dueDate, newDate, "o payload é regravado na MESMA transação");
    assert.equal(after.payload.amountCents, 12345);
    assert.equal(after.last_error, before.last_error, "o last_error não muda");
    assert.equal(after.occurred_at.getTime(), before.occurred_at.getTime(), "o occurred_at não muda");

    const valid = await seedStatement("rs8-valendo");
    const validId = await seedOutbox(valid, "charge_create", "FAILED", { lastError: "provider_unavailable", payload: { amountCents: 12345, dueDate: spDayPlus(5), method: "pix" } });
    const notPast = await api("POST", `/api/v1/platform/billing/outbox/${validId}/retry`, { tenantId: valid.tenantId, dueDate: spDayPlus(9) });
    assert.equal(notPast.status, 422, JSON.stringify(notPast.body));
    assert.equal(notPast.body.error?.reason, "due_date_not_past");
    const plain = await api("POST", `/api/v1/platform/billing/outbox/${validId}/retry`, { tenantId: valid.tenantId });
    assert.equal(plain.status, 200, JSON.stringify(plain.body));
    assert.equal(plain.body.data.notice, null);
  });

  test("RS8b: /retry com data nova e a cobrança viva no provedor → o 200 traz o aviso; o despacho ADOTA (0 POST) e a tabela fica com o vencimento do provedor", async () => {
    const { fakeModule, http, asaas } = await dispatchModules();
    const fake = await fakeModule.startAsaasFake();
    try {
      const fixture = await seedStatement("rs8b");
      const id = await seedOutbox(fixture, "charge_create", "FAILED", { lastError: "provider_unavailable", payload: { amountCents: 12345, dueDate: "2026-11-01", method: "pix" } });
      // A cobrança desta intenção já vive no provedor (criada numa tentativa cuja resposta se perdeu), com vencimento próprio.
      const providerDue = spDayPlus(4);
      const client = new http.BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${fake.baseUrl}/v3` });
      const adapter = new asaas.AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE"));
      const created = await adapter.createCharge({ customerId: "cus_fake_rs", amountCents: 12345, dueDate: providerDue, externalReference: fixture.statementId, method: "pix", idempotencyKey: randomUUID() });
      const postsBefore = postsToPayments(fake);
      const response = await api("POST", `/api/v1/platform/billing/outbox/${id}/retry`, { tenantId: fixture.tenantId, dueDate: spDayPlus(20) });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.data.notice, "due_date_applies_only_if_created");
      const result = await dispatchOnFake(fixture.tenantId, fake);
      assert.equal(result.outcomes.recovered, 1, JSON.stringify(result.outcomes));
      assert.equal(postsToPayments(fake) - postsBefore, 0, "0 POST: a cobrança existente é adotada como está");
      const table = (await db.$queryRawUnsafe(`SELECT external_charge_id, to_char(due_date, 'YYYY-MM-DD') AS due_date FROM subscription_statement_charges WHERE statement_id = $1::uuid`, fixture.statementId)) as Array<{ external_charge_id: string; due_date: string }>;
      assert.deepEqual(table, [{ external_charge_id: created.chargeId, due_date: providerDue }]);
      const listed = await api("GET", `/api/v1/platform/billing/statements/${fixture.statementId}/charges?tenantId=${fixture.tenantId}`);
      assert.equal(listed.body.data.charges[0].dueDate, providerDue);
    } finally {
      await fake.close();
    }
  });

  test("RS9: /retry com dueDate numa linha charge_cancel FAILED → 422 due_date_not_applicable, linha ainda FAILED", async () => {
    const fixture = await seedStatement("rs9");
    const id = await seedOutbox(fixture, "charge_cancel", "FAILED", { lastError: "provider_unavailable", payload: { chargeId: "pay_rs9", chargeCreateId: randomUUID() } });
    const response = await api("POST", `/api/v1/platform/billing/outbox/${id}/retry`, { tenantId: fixture.tenantId, dueDate: spDayPlus(5) });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "due_date_not_applicable");
    assert.equal((await outboxRow(id)).status, "FAILED");
  });

  // B-ASS-08c1b (F9; Emenda 1 §3.1 e Emenda 2, a P-ASS08C-POSSE-NAO-COBRE-O-POST): a saída do C1-02 dentro do 08c1b.
  test("F2R: a forma F2 (a cobrança criada no provedor e desconhecida aqui, a órfã em orphan_recovery_not_found) → /resolve + /retry pelas rotas → o despacho ADOTA: recovered 1, 0 POST, 1 cobrança viva, external_id e a referência preenchidos", async () => {
    const { fakeModule, http, asaas } = await dispatchModules();
    const fake = await fakeModule.startAsaasFake();
    try {
      const fixture = await seedStatement("f2r");
      // A órfã: PROCESSING com a posse vencida há 11 min (> OUTBOX_ORPHAN_MS): o POST saiu e a resposta não voltou.
      const id = await seedOutbox(fixture, "charge_create", "PROCESSING", { payload: { amountCents: 12345, dueDate: spDayPlus(10), method: "pix" } });
      await db.$executeRawUnsafe(
        `UPDATE billing_outbox SET claimed_by = 'dispatch-outbox:f2r', claimed_at = now() - interval '11 minutes', attempt_started_at = now() - interval '11 minutes' WHERE id = $1::uuid`,
        id,
      );
      // 1ª rodada: a lista da referência ainda não traz a cobrança → a órfã nunca cria: orphan_recovery_not_found.
      const first = await dispatchOnFake(fixture.tenantId, fake);
      assert.equal(first.outcomes.needs_review, 1, JSON.stringify(first.outcomes));
      assert.deepEqual({ status: (await outboxRow(id)).status, last_error: (await outboxRow(id)).last_error }, { status: "NEEDS_REVIEW", last_error: "orphan_recovery_not_found" });
      // A cobrança daquela tentativa aparece no provedor (o POST chegou depois da posse).
      const client = new http.BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${fake.baseUrl}/v3` });
      const adapter = new asaas.AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE"));
      // O falso numera as cobranças a partir de `pay_0001` a cada `startAsaasFake`, e a tabela de cobranças é UNIQUE por
      // (provedor, id): o RS8b, neste arquivo, já gravou `pay_0001`. Uma cobrança de OUTRA referência, antes, desloca a numeração.
      await adapter.createCharge({ customerId: "cus_fake_rs", amountCents: 100, dueDate: spDayPlus(10), externalReference: randomUUID(), method: "pix", idempotencyKey: randomUUID() });
      const created = await adapter.createCharge({ customerId: "cus_fake_rs", amountCents: 12345, dueDate: spDayPlus(10), externalReference: fixture.statementId, method: "pix", idempotencyKey: randomUUID() });
      const taken = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM subscription_statement_charges WHERE external_charge_id = $1`, created.chargeId)) as Array<{ n: number }>;
      assert.equal(taken[0]!.n, 0, `o id ${created.chargeId} do falso já está na tabela (outro caso deste arquivo): o F2R mediria a colisão, e não a adoção`);
      const postsBefore = postsToPayments(fake);

      const resolved = await api("POST", `/api/v1/platform/billing/outbox/${id}/resolve`, { tenantId: fixture.tenantId, reason: "a cobrança apareceu no painel do provedor" });
      assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
      assert.equal(resolved.body.data.status, "FAILED");
      const retried = await api("POST", `/api/v1/platform/billing/outbox/${id}/retry`, { tenantId: fixture.tenantId });
      assert.equal(retried.status, 200, JSON.stringify(retried.body));
      assert.equal(retried.body.data.outbox.status, "PENDING");

      // O estado da linha vem antes da contagem: se o /resolve apagar o last_error (a M-RS1), o vermelho mostra o efeito, a
      // linha de volta à conferência com charge_found_unknown_origin.
      const result = await dispatchOnFake(fixture.tenantId, fake);
      const row = ((await db.$queryRawUnsafe(`SELECT status, last_error, external_id FROM billing_outbox WHERE id = $1::uuid`, id)) as Array<{ status: string; last_error: string | null; external_id: string | null }>)[0]!;
      assert.deepEqual(row, { status: "SENT", last_error: null, external_id: created.chargeId });
      assert.equal(result.outcomes.recovered, 1, JSON.stringify(result.outcomes));
      assert.equal(postsToPayments(fake) - postsBefore, 0, "0 POST: a cobrança da própria tentativa é adotada");
      const table = (await db.$queryRawUnsafe(`SELECT external_charge_id, status FROM subscription_statement_charges WHERE statement_id = $1::uuid`, fixture.statementId)) as Array<{ external_charge_id: string; status: string }>;
      assert.deepEqual(table, [{ external_charge_id: created.chargeId, status: "pending" }], "1 cobrança viva, a adotada");
      const ref = (await db.$queryRawUnsafe(`SELECT external_charge_id FROM billing_statement_refs WHERE statement_id = $1::uuid`, fixture.statementId)) as Array<{ external_charge_id: string | null }>;
      assert.deepEqual(ref, [{ external_charge_id: created.chargeId }], "a referência ganha o id da cobrança");
    } finally {
      await fake.close();
    }
  });
}

// M-RT (guarda de texto, roda sem banco; Emenda 2 §3.2): nenhuma chamada `.retry(` em `src/` inteiro — a rota de operador
// chama SÓ `retryByOperator`, que tem as travas novas. As definições (`async retry(`) não casam com o padrão.
test("M-RT · guarda: `.retry(` em src/ = 0", () => {
  const hits: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) {
        readFileSync(full, "utf8")
          .split(/\r?\n/)
          .forEach((line, index) => {
            if (/[.]retry[(]/.test(line)) hits.push(`${path.relative(ROOT, full).replaceAll("\\", "/")}:${index + 1}`);
          });
      }
    }
  };
  walk(path.join(ROOT, "src"));
  assert.deepEqual(hits, []);
});
