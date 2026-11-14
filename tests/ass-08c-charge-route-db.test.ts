// B-ASS-08c1b — o pedido de cobrança pela ROTA REAL (`POST …/statements/:statementId/charge`), no PostgreSQL, sob papel
// efêmero NOSUPERUSER NOBYPASSRLS (drill do B-O6R-06), com o despacho real sobre o falso do Asaas.
//
// O app real (`createApp`) roda no modo `prisma` sobre uma base PRÓPRIA (template0 + `migrate deploy`), com o singleton do
// Prisma apontado para o cliente do papel. O provedor ligado vem da composição de produção (`paymentProviderOn`: env + cofre
// + `enabled`), com chave de cofre de teste gerada agora e a configuração do Asaas gravada na base descartável.
//
// Casos (abertura §4.2 e §5.1; Emenda 1 §3.6):
//   CR1 — dois POST concorrentes (barreira pelo `pg_stat_activity`: os dois esperam a trava do demonstrativo) → 1 linha viva,
//         1×422 `charge_already_exists`; o despacho faz 1 POST /v3/payments.
//   CR2 — sem provedor ligado → 422 `payment_provider_disabled`, nada gravado, 0 requisição ao falso.
//   CR3 — o `amountCents` gravado é o TOTAL do demonstrativo, mesmo com valor no corpo ([CHARGE-PAYLOAD]).
//   CR4 — demonstrativo `closed` com pagamento parcial → 422 `statement_partially_paid`, nada gravado.
//   CR5 — vencido sem `dueDate` → 422 `due_date_required`; com `dueDate` → 1 linha com a data informada.
//   CR6 — `due_date` nulo conta como vencido: sem `dueDate` → 422; com → 1 linha.
// Mutações: M5 (a rota enfileira direto: guarda de texto), M-CR3 (o valor vem do corpo), M-CR4 (apagar a recusa do parcial).
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { startAsaasFake, type AsaasFake } from "./helpers/fake-providers/asaas.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const SP_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

type Json = Record<string, any>;

function spDayPlus(days: number): string {
  return SP_DAY.format(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

// M5 (guarda de texto, roda sem banco): `charge_create` só nasce pelo pedido guardado. Uma rota que enfileire direto
// escreve `kind: "charge_create"` fora de `charges/charge-request.service.ts`.
test('M5 · guarda: `kind: "charge_create"` em src/ só em charges/charge-request.service.ts (1 ocorrência)', () => {
  const hits: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) {
        const count = readFileSync(full, "utf8").split('kind: "charge_create"').length - 1;
        for (let i = 0; i < count; i += 1) hits.push(path.relative(ROOT, full).replaceAll("\\", "/"));
      }
    }
  };
  walk(path.join(ROOT, "src"));
  assert.deepEqual(hits, ["src/modules/subscription-billing/charges/charge-request.service.ts"]);
});

if (!connectionString) {
  test("B-ASS-08c1b · o pedido de cobrança pela rota exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any;
  let db: any;
  let role: EphemeralRole;
  let databaseName = "";
  let server: Server | undefined;
  let baseUrl = "";
  let fake: AsaasFake | undefined;
  let mutableEnv: { BILLING_PROVIDERS_ENABLED: boolean; CORE_SAAS_PERSISTENCE: string };
  let modules: {
    runDispatchOutbox: typeof import("../src/modules/subscription-billing/outbox/outbox.dispatcher.js").runDispatchOutbox;
    PrismaOutboxRepository: typeof import("../src/modules/subscription-billing/outbox/outbox.prisma.js").PrismaOutboxRepository;
    BillingHttpClient: typeof import("../src/modules/subscription-billing/providers/http/billing-http.client.js").BillingHttpClient;
    AsaasPaymentAdapter: typeof import("../src/modules/subscription-billing/providers/payment/asaas/index.js").AsaasPaymentAdapter;
  };

  after(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await fake?.close();
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

  /** Organização + demonstrativo `closed` de R$ 123,45 (centavos que não são múltiplo de 100: lição da J-555). */
  async function seedClosed(tag: string, options: { readonly dueDate?: string | null; readonly paid?: string } = {}): Promise<{ tenantId: string; statementId: string }> {
    const slug = `c1b-cr-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = ((await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>)[0]!.id;
    const statementId = ((await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, paid_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 123.45,0,0,0,0,0,123.45, $2::numeric, $3::date, now(),
               '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
      options.paid ?? "0",
      options.dueDate === undefined ? spDayPlus(20) : options.dueDate,
    )) as Array<{ id: string }>)[0]!.id;
    return { tenantId, statementId };
  }

  async function chargeLines(statementId: string): Promise<Array<{ status: string; payload: Json; kind: string }>> {
    return (await db.$queryRawUnsafe(`SELECT kind, status, payload FROM billing_outbox WHERE statement_id = $1::uuid ORDER BY created_at`, statementId)) as Array<{ status: string; payload: Json; kind: string }>;
  }

  function adapterOverFake(): InstanceType<typeof modules.AsaasPaymentAdapter> {
    const client = new modules.BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${fake!.baseUrl}/v3` });
    return new modules.AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE"));
  }

  function postsToPayments(): number {
    return fake!.recorded.filter((request) => request.method === "POST" && request.path.split("?")[0] === "/v3/payments").length;
  }

  test("setup: base própria migrada, papel NOSUPERUSER NOBYPASSRLS, Asaas ligado no cofre e o app real no modo prisma", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: (await import("../src/database/pg-connection.js")).createPgAdapter(connectionString!) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_c1b_cr_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
    // A configuração do Asaas, LIGADA, na base descartável (a fixture; o código de produção só liga por `setEnabled`).
    await db.$executeRawUnsafe(`INSERT INTO billing_provider_configs (provider, kind, environment, enabled, enabled_environment) VALUES ('asaas', 'payment', 'sandbox', true, 'sandbox')`);

    (globalThis as { prisma?: unknown }).prisma = role.client;
    process.env.DATABASE_URL = targetUrl;
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";
    const [envModule, { createApp }, { MemoryCoreSaasAdapter }, { CoreSaasRegistry }, { InMemoryCoreSaasStore }, { resetStatementRuntimeForTests }, vaultFactory, { EnvVaultKeyProvider }, dispatcher, outboxPrisma, http, asaas] =
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
      ]);
    modules = { runDispatchOutbox: dispatcher.runDispatchOutbox, PrismaOutboxRepository: outboxPrisma.PrismaOutboxRepository, BillingHttpClient: http.BillingHttpClient, AsaasPaymentAdapter: asaas.AsaasPaymentAdapter };
    mutableEnv = envModule.env as unknown as typeof mutableEnv;
    mutableEnv.CORE_SAAS_PERSISTENCE = "prisma";
    mutableEnv.BILLING_PROVIDERS_ENABLED = true;
    resetStatementRuntimeForTests();
    vaultFactory.resetVaultRuntimeForTests();
    vaultFactory.setVaultKeysForTests(new EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }));
    const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    fake = await startAsaasFake();
  });

  test("CR1: dois POST concorrentes pela rota → 1 viva e 1×422 charge_already_exists; o despacho faz 1 POST /v3/payments", async () => {
    const fixture = await seedClosed("cr1");
    const { Client } = (await import("pg")) as any;
    const holder = new Client({ connectionString: process.env.DATABASE_URL });
    await holder.connect();
    await holder.query("BEGIN");
    await holder.query(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, [fixture.statementId]);
    const route = `/api/v1/platform/billing/statements/${fixture.statementId}/charge`;
    const both = Promise.all([api("POST", route, { tenantId: fixture.tenantId }), api("POST", route, { tenantId: fixture.tenantId })]);
    // Barreira causal: os DOIS pedidos do papel esperam a trava do demonstrativo antes de o detentor soltar.
    const deadline = Date.now() + 4_000;
    let waiting = 0;
    while (Date.now() < deadline) {
      const rows = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE usename = $1 AND wait_event_type = 'Lock'`, role.roleName)) as Array<{ n: number }>;
      waiting = rows[0]!.n;
      if (waiting >= 2) break;
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    await holder.query("ROLLBACK");
    await holder.end();
    assert.equal(waiting, 2, "os dois pedidos esperaram a trava do demonstrativo");
    const results = await both;
    const statuses = results.map((result) => result.status).sort();
    assert.deepEqual(statuses, [201, 422], JSON.stringify(results.map((result) => result.body)));
    assert.equal(results.find((result) => result.status === 422)!.body.error?.reason, "charge_already_exists");
    const lines = await chargeLines(fixture.statementId);
    assert.equal(lines.length, 1, "uma linha só");
    assert.equal(lines[0]!.status, "PENDING");

    const before = postsToPayments();
    const result = await modules.runDispatchOutbox({
      repo: new modules.PrismaOutboxRepository(role.client, { tenantIds: [fixture.tenantId] }),
      ports: { asaas: adapterOverFake() },
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_fake_cr1" }),
    });
    assert.equal(result.outcomes.sent, 1);
    assert.equal(postsToPayments() - before, 1, "1 POST /v3/payments");
  });

  test("CR2: sem provedor ligado → 422 payment_provider_disabled, nada gravado, 0 requisição ao provedor", async () => {
    const fixture = await seedClosed("cr2");
    const before = fake!.recorded.length;
    mutableEnv.BILLING_PROVIDERS_ENABLED = false;
    try {
      const response = await api("POST", `/api/v1/platform/billing/statements/${fixture.statementId}/charge`, { tenantId: fixture.tenantId });
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error?.reason, "payment_provider_disabled");
    } finally {
      mutableEnv.BILLING_PROVIDERS_ENABLED = true;
    }
    assert.equal((await chargeLines(fixture.statementId)).length, 0);
    assert.equal(fake!.recorded.length, before, "0 requisição ao provedor");
  });

  test("CR3: o amountCents gravado é o total do demonstrativo, mesmo com valor no corpo", async () => {
    const fixture = await seedClosed("cr3");
    const response = await api("POST", `/api/v1/platform/billing/statements/${fixture.statementId}/charge`, { tenantId: fixture.tenantId, amountCents: 1, amount: "0.01", method: "boleto" });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    const lines = await chargeLines(fixture.statementId);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]!.payload.amountCents, 12345, "o servidor monta o valor com o demonstrativo travado");
    assert.equal(lines[0]!.payload.method, "boleto");
    assert.equal("amount" in lines[0]!.payload, false, "nenhuma chave de valor do corpo é gravada");
    assert.equal("payload" in response.body.data, false, "a resposta não traz o payload");
    assert.equal("tenantId" in response.body.data, false, "a resposta não traz a organização");
  });

  test("CR4: pagamento parcial → 422 statement_partially_paid, nada gravado", async () => {
    const fixture = await seedClosed("cr4", { paid: "50.00" });
    const response = await api("POST", `/api/v1/platform/billing/statements/${fixture.statementId}/charge`, { tenantId: fixture.tenantId });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "statement_partially_paid");
    assert.equal((await chargeLines(fixture.statementId)).length, 0);
  });

  test("CR5: vencido sem dueDate → 422 due_date_required; com dueDate → 1 linha com a data informada", async () => {
    const fixture = await seedClosed("cr5", { dueDate: "2026-11-01" });
    const route = `/api/v1/platform/billing/statements/${fixture.statementId}/charge`;
    const without = await api("POST", route, { tenantId: fixture.tenantId });
    assert.equal(without.status, 422, JSON.stringify(without.body));
    assert.equal(without.body.error?.reason, "due_date_required");
    assert.equal((await chargeLines(fixture.statementId)).length, 0);
    const informed = spDayPlus(7);
    const withDate = await api("POST", route, { tenantId: fixture.tenantId, dueDate: informed });
    assert.equal(withDate.status, 201, JSON.stringify(withDate.body));
    const lines = await chargeLines(fixture.statementId);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]!.payload.dueDate, informed);
    const outOfRange = await seedClosed("cr5-faixa", { dueDate: "2026-11-01" });
    const far = await api("POST", `/api/v1/platform/billing/statements/${outOfRange.statementId}/charge`, { tenantId: outOfRange.tenantId, dueDate: spDayPlus(61) });
    assert.equal(far.status, 400, JSON.stringify(far.body));
  });

  /** Uma cobrança `pending` na tabela para o demonstrativo (a que o provedor criou). */
  async function seedPendingCharge(fixture: { tenantId: string; statementId: string }): Promise<string> {
    const chargeId = `pay_q4_${randomUUID().slice(0, 8)}`;
    await db.$executeRawUnsafe(
      `INSERT INTO subscription_statement_charges (tenant_id, statement_id, provider, external_charge_id, status, pay_url, due_date, created_at)
       VALUES ($1::uuid, $2::uuid, 'asaas', $3, 'pending', 'https://pagamento.exemplo.invalid/i/inv_q4', $4::date, now())`,
      fixture.tenantId,
      fixture.statementId,
      chargeId,
      spDayPlus(20),
    );
    return chargeId;
  }

  test("Q4-1: baixa PARCIAL com cobrança pending → notice full_amount_charge_open na baixa e no GET …/charges", async () => {
    const fixture = await seedClosed("q4a");
    const chargeId = await seedPendingCharge(fixture);
    const payment = await api("POST", `/api/v1/platform/billing/statements/${fixture.statementId}/payments`, { tenantId: fixture.tenantId, amount: "50.00", method: "pix" });
    assert.equal(payment.status, 201, JSON.stringify(payment.body));
    assert.equal(payment.body.data.statement.status, "closed");
    assert.equal(payment.body.data.notice, "full_amount_charge_open");
    const listed = await api("GET", `/api/v1/platform/billing/statements/${fixture.statementId}/charges?tenantId=${fixture.tenantId}`);
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    assert.equal(listed.body.data.notice, "full_amount_charge_open");
    assert.equal(listed.body.data.charges.length, 1);
    assert.deepEqual(Object.keys(listed.body.data.charges[0]).sort(), ["cancelledAt", "createdAt", "dueDate", "externalChargeId", "id", "payUrl", "provider", "status"]);
    assert.equal(listed.body.data.charges[0].externalChargeId, chargeId);
    assert.equal(listed.body.data.charges[0].status, "pending");
  });

  test("Q4-2: baixa que QUITA, ou baixa parcial sem cobrança → notice null", async () => {
    const quits = await seedClosed("q4b");
    await seedPendingCharge(quits);
    const full = await api("POST", `/api/v1/platform/billing/statements/${quits.statementId}/payments`, { tenantId: quits.tenantId, amount: "123.45", method: "pix" });
    assert.equal(full.status, 201, JSON.stringify(full.body));
    assert.equal(full.body.data.statement.status, "paid");
    assert.equal(full.body.data.notice, null);
    const listedPaid = await api("GET", `/api/v1/platform/billing/statements/${quits.statementId}/charges?tenantId=${quits.tenantId}`);
    assert.equal(listedPaid.status, 200, JSON.stringify(listedPaid.body));
    assert.equal(listedPaid.body.data.notice, null);

    const noCharge = await seedClosed("q4c");
    const partial = await api("POST", `/api/v1/platform/billing/statements/${noCharge.statementId}/payments`, { tenantId: noCharge.tenantId, amount: "10.00", method: "pix" });
    assert.equal(partial.status, 201, JSON.stringify(partial.body));
    assert.equal(partial.body.data.notice, null);
    const listed = await api("GET", `/api/v1/platform/billing/statements/${noCharge.statementId}/charges?tenantId=${noCharge.tenantId}`);
    assert.deepEqual(listed.body.data, { charges: [], notice: null });
  });

  test("CR6: due_date nulo conta como vencido — sem dueDate → 422; com → 1 linha", async () => {
    const fixture = await seedClosed("cr6", { dueDate: null });
    const route = `/api/v1/platform/billing/statements/${fixture.statementId}/charge`;
    const without = await api("POST", route, { tenantId: fixture.tenantId });
    assert.equal(without.status, 422, JSON.stringify(without.body));
    assert.equal(without.body.error?.reason, "due_date_required");
    const informed = spDayPlus(3);
    const withDate = await api("POST", route, { tenantId: fixture.tenantId, dueDate: informed });
    assert.equal(withDate.status, 201, JSON.stringify(withDate.body));
    assert.equal((await chargeLines(fixture.statementId))[0]!.payload.dueDate, informed);
  });

  /** Uma `charge_create` PENDING semeada direto (a que nasceu antes de o vencimento passar), com o payload do servidor. */
  async function seedPendingCreate(fixture: { tenantId: string; statementId: string }, dueDate: string): Promise<string> {
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas') ON CONFLICT DO NOTHING`, fixture.statementId, fixture.tenantId);
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status)
       VALUES ($1::uuid, $2::uuid, 'charge_create', 'asaas', $3, gen_random_uuid(), $4::jsonb, now(), 'PENDING') RETURNING id`,
      fixture.tenantId,
      fixture.statementId,
      `charge_create:${fixture.statementId}:1`,
      JSON.stringify({ amountCents: 12345, dueDate, method: "pix" }),
    )) as Array<{ id: string }>;
    return rows[0]!.id;
  }

  function postedDueDates(): string[] {
    return fake!.recorded
      .filter((request) => request.method === "POST" && request.path.split("?")[0] === "/v3/payments")
      .map((request) => (JSON.parse(request.body || "{}") as { dueDate?: string }).dueDate ?? "");
  }

  test("CR7: linha PENDING com o vencimento PASSADO → o despacho a põe em due_date_past com 0 POST; /resolve + /retry com data → 1 POST com a data nova", async () => {
    const fixture = await seedClosed("cr7");
    const id = await seedPendingCreate(fixture, "2026-11-01");
    const before = postsToPayments();
    const repo = new modules.PrismaOutboxRepository(role.client, { tenantIds: [fixture.tenantId] });
    const port = adapterOverFake();
    const first = await modules.runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true as const, customerId: "cus_fake_cr7" }) });
    assert.equal(first.outcomes.needs_review, 1, JSON.stringify(first.outcomes));
    assert.equal(postsToPayments() - before, 0, "0 POST com a data vencida");
    const row = (await db.$queryRawUnsafe(`SELECT status, last_error FROM billing_outbox WHERE id = $1::uuid`, id)) as Array<{ status: string; last_error: string }>;
    assert.deepEqual(row[0], { status: "NEEDS_REVIEW", last_error: "due_date_past" });
    const resolved = await api("POST", `/api/v1/platform/billing/outbox/${id}/resolve`, { tenantId: fixture.tenantId, reason: "vencimento passou, nova data combinada" });
    assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
    const newDate = spDayPlus(9);
    const retried = await api("POST", `/api/v1/platform/billing/outbox/${id}/retry`, { tenantId: fixture.tenantId, dueDate: newDate });
    assert.equal(retried.status, 200, JSON.stringify(retried.body));
    const second = await modules.runDispatchOutbox({ repo, ports: { asaas: port }, resolveCustomer: async () => ({ ok: true as const, customerId: "cus_fake_cr7" }) });
    assert.equal(second.outcomes.sent, 1, JSON.stringify(second.outcomes));
    assert.equal(postsToPayments() - before, 1, "1 POST");
    assert.equal(postedDueDates().at(-1), newDate, "o POST sai com a data nova");
  });

  test("CR7b: relógio em 02:30Z do dia seguinte (ainda o dia anterior em São Paulo) → o vencimento igual ao dia de São Paulo NÃO é passado", async () => {
    const fixture = await seedClosed("cr7b");
    await seedPendingCreate(fixture, "2027-03-10");
    const before = postsToPayments();
    const clock = new Date("2027-03-11T02:30:00.000Z"); // 23:30 de 10/03 em São Paulo
    const result = await modules.runDispatchOutbox({
      repo: new modules.PrismaOutboxRepository(role.client, { tenantIds: [fixture.tenantId] }),
      ports: { asaas: adapterOverFake() },
      resolveCustomer: async () => ({ ok: true as const, customerId: "cus_fake_cr7b" }),
      now: () => clock,
    });
    assert.equal(result.outcomes.sent, 1, JSON.stringify(result.outcomes));
    assert.equal(postsToPayments() - before, 1);
    assert.equal(postedDueDates().at(-1), "2027-03-10");
  });
}
