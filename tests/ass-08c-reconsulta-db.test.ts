// B-ASS-08c1a · Emenda 2.1 (§1.7, §7.2) — a recobrança e a cobrança da outra intenção viva ou paga no provedor, no
// Postgres descartável, sob o papel efêmero NOSUPERUSER NOBYPASSRLS, pelo `PrismaOutboxRepository` e o
// `AsaasPaymentAdapter` reais sobre o falso do Asaas (127.0.0.1:0; nenhuma chamada a host real). A semente de R0 é por SQL
// (o precedente `ass-08-channel-db.test.ts`, `erasedEvidenceDb`): R0 `SKIPPED`, `external_id` = a cobrança dela,
// `last_error = 'charge_cancelled'`, e a cobrança na tabela `cancelled` (ou `refunded`) — a visão interna sem viva.
// O demonstrativo foi reaberto depois de R0 e refechado em R$ 150; R1 nasce pelo pedido real (seq 2).
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { PrismaChargeIntentRepository } from "../src/modules/subscription-billing/charges/charge-intent.prisma.js";
import { requestChargeCreate } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { PrismaOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { AsaasPaymentAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/index.js";
import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { startAsaasFake, type AsaasFake } from "./helpers/fake-providers/asaas.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SP_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

if (!connectionString) {
  test("B-ASS-08c1a · reconsulta -db exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any;
  let db: any;
  let role: EphemeralRole;
  let databaseName = "";
  let targetUrl = "";

  const minutesAfter = (base: Date, n: number) => new Date(base.getTime() + n * 60_000);

  type Recharge = {
    readonly provider: string;
    readonly statementId: string;
    readonly r0Charge: string;
    readonly r1: { readonly id: string };
    readonly t1: Date;
    readonly server: AsaasFake;
    readonly adapter: AsaasPaymentAdapter;
  };

  /** A cobrança de R0 nasce no falso pelo adaptador real; `shape` a leva ao estado do caso; R0, a cobrança da tabela e o
   * refechamento entram por SQL; R1 pelo pedido real. */
  async function seedRecharge(
    slug: string,
    options: { readonly r0Cents: number; readonly tableStatus: "cancelled" | "refunded"; readonly shape: (server: AsaasFake, adapter: AsaasPaymentAdapter, chargeId: string, t0: Date) => Promise<void> },
  ): Promise<Recharge> {
    const provider = `asaas-${slug}-${randomUUID().slice(0, 8)}`;
    const tenants = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, `ass08c-${slug}-${randomUUID().slice(0, 8)}`)) as Array<{ id: string }>;
    const tenantId = tenants[0]!.id;
    const t0 = new Date();
    const statements = (await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 100,0,0,0,0,0,100, '2026-11-10', $2, '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
      t0,
    )) as Array<{ id: string }>;
    const statementId = statements[0]!.id;
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);

    const server = await startAsaasFake();
    const client = new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v3` });
    const adapter = new AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE"));
    try {
      return await seedAfterServer(provider, tenantId, statementId, t0, server, adapter, options);
    } catch (error) {
      await server.close();
      throw error;
    }
  }

  async function seedAfterServer(
    provider: string,
    tenantId: string,
    statementId: string,
    t0: Date,
    server: AsaasFake,
    adapter: AsaasPaymentAdapter,
    options: Parameters<typeof seedRecharge>[1],
  ): Promise<Recharge> {
    const r0 = await adapter.createCharge({ customerId: "cus_0001", amountCents: options.r0Cents, dueDate: "2026-11-10", description: "Assinatura", externalReference: statementId, method: "pix" });
    await options.shape(server, adapter, r0.chargeId, t0);

    await db.$executeRawUnsafe(
      `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, status, skip_reason, attempts, last_error, external_id)
       VALUES ($1::uuid, $2::uuid, 'charge_create', $3, $4, gen_random_uuid(), $5::jsonb, $6, 'SKIPPED', NULL, 1, 'charge_cancelled', $7)`,
      tenantId,
      statementId,
      provider,
      `charge_create:${statementId}:1`,
      JSON.stringify({ amountCents: options.r0Cents, dueDate: "2026-11-10", method: "pix" }),
      t0,
      r0.chargeId,
    );
    await db.$executeRawUnsafe(
      `INSERT INTO subscription_statement_charges (tenant_id, statement_id, provider, external_charge_id, status, cancelled_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)`,
      tenantId,
      statementId,
      provider,
      r0.chargeId,
      options.tableStatus,
      options.tableStatus === "cancelled" ? minutesAfter(t0, 1) : null,
    );
    await db.$executeRawUnsafe(`UPDATE subscription_statements SET status = 'closed', reopened_at = $2, total_amount = 150 WHERE id = $1::uuid`, statementId, minutesAfter(t0, 1));

    const t1 = minutesAfter(t0, 3);
    const r1 = await requestChargeCreate({ intents: new PrismaChargeIntentRepository(role.client) }, { tenantId, statementId, provider, payload: { amountCents: 15_000, dueDate: "2026-11-10", method: "pix" }, now: t1 });
    assert.equal(r1.idempotencyKey, `charge_create:${statementId}:2`, "montagem: R1 é a 2ª intenção do demonstrativo");
    return { provider, statementId, r0Charge: r0.chargeId, r1, t1, server, adapter };
  }

  const postsToPayments = (server: AsaasFake) => server.recorded.filter((recorded) => recorded.method === "POST" && recorded.path === "/v3/payments").length;

  async function dispatch(seed: Recharge): Promise<number> {
    const before = postsToPayments(seed.server);
    await runDispatchOutbox({
      repo: new PrismaOutboxRepository(role.client),
      ports: { [seed.provider]: seed.adapter },
      resolveCustomer: async () => ({ ok: true, customerId: "cus_0001" }),
      now: () => seed.t1,
    });
    return postsToPayments(seed.server) - before;
  }

  async function finalState(seed: Recharge) {
    const [row] = (await db.$queryRawUnsafe(`SELECT status, last_error, external_id FROM billing_outbox WHERE id = $1::uuid`, seed.r1.id)) as Array<{ status: string; last_error: string | null; external_id: string | null }>;
    const charges = (await db.$queryRawUnsafe(
      `SELECT external_charge_id, status FROM subscription_statement_charges WHERE statement_id = $1::uuid ORDER BY created_at, external_charge_id`,
      seed.statementId,
    )) as Array<{ external_charge_id: string; status: string }>;
    return { row, charges };
  }

  after(async () => {
    await role?.drop();
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  test("setup: base própria migrada e papel NOSUPERUSER NOBYPASSRLS", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const base = decodeURIComponent(new URL(connectionString!).pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass08c_rv_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });
    role = await createEphemeralRole(db, targetUrl);
    const [posture] = (await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false });
  });

  test("RV1-db (C8): recobrança depois do charge/cancel — a de R0 removida no Asaas é listada cancelled → 1 POST, R1 SENT, 1 cobrança viva", async () => {
    const seed = await seedRecharge("rv1", { r0Cents: 10_000, tableStatus: "cancelled", shape: async (_server, adapter, chargeId) => { await adapter.cancelCharge(chargeId); } });
    try {
      assert.equal(await dispatch(seed), 1, "1 POST /v3/payments");
      const { row, charges } = await finalState(seed);
      assert.equal(row!.status, "SENT");
      assert.notEqual(row!.external_id, seed.r0Charge, "nunca a cobrança de R0");
      assert.deepEqual(charges.filter((c) => c.status === "pending" || c.status === "confirmed").map((c) => c.external_charge_id), [row!.external_id], "1 cobrança viva na tabela, a de R1");
    } finally {
      await seed.server.close();
    }
  });

  test("RV4-db (C10): a de R0 paga e ESTORNADA no provedor e na tabela → R1 NEEDS_REVIEW charge_found_for_previous_intent, 0 POST", async () => {
    const seed = await seedRecharge("rv4", { r0Cents: 10_000, tableStatus: "refunded", shape: async (server, _adapter, chargeId) => { server.setPaymentStatus(chargeId, "REFUNDED"); } });
    try {
      assert.equal(await dispatch(seed), 0, "0 POST /v3/payments depois do pedido de R1");
      const { row, charges } = await finalState(seed);
      assert.deepEqual(row, { status: "NEEDS_REVIEW", last_error: "charge_found_for_previous_intent", external_id: null });
      assert.equal(charges.length, 1, "nenhuma linha nova na tabela");
    } finally {
      await seed.server.close();
    }
  });

  const VIVA: ReadonlyArray<{ readonly label: string; readonly r0Cents: number; readonly shape: (server: AsaasFake, adapter: AsaasPaymentAdapter, chargeId: string, t0: Date) => Promise<void> }> = [
    {
      label: "(a) restaurada no painel depois do DELETE",
      r0Cents: 10_000,
      shape: async (server, adapter, chargeId) => { await adapter.cancelCharge(chargeId); server.setPaymentStatus(chargeId, "PENDING"); },
    },
    {
      label: "(b) paga depois do cancelamento interno",
      r0Cents: 10_000,
      shape: async (server, _adapter, chargeId, t0) => { server.setPaymentStatus(chargeId, "RECEIVED"); server.patchPayment(chargeId, { paymentDate: SP_DAY.format(t0) }); },
    },
    {
      label: "(c) paga depois do cancelamento interno, com o MESMO valor de R1 (R$ 150)",
      r0Cents: 15_000,
      shape: async (server, _adapter, chargeId, t0) => { server.setPaymentStatus(chargeId, "RECEIVED"); server.patchPayment(chargeId, { paymentDate: SP_DAY.format(t0) }); },
    },
  ];

  for (const variant of VIVA) {
    test(`RV-VIVA-db (C22) ${variant.label}: visão interna sem viva → R1 NEEDS_REVIEW charge_found_for_previous_intent, 0 POST, nada na tabela`, async () => {
      const seed = await seedRecharge(`viva${variant.label.slice(1, 2)}`, { r0Cents: variant.r0Cents, tableStatus: "cancelled", shape: variant.shape });
      try {
        assert.equal(await dispatch(seed), 0, "0 POST /v3/payments depois do pedido de R1");
        const { row, charges } = await finalState(seed);
        assert.deepEqual(row, { status: "NEEDS_REVIEW", last_error: "charge_found_for_previous_intent", external_id: null });
        assert.deepEqual(charges, [{ external_charge_id: seed.r0Charge, status: "cancelled" }], "nenhuma linha nova na tabela");
      } finally {
        await seed.server.close();
      }
    });
  }

  // J-555 (C2-02): os centavos pelo adaptador REAL e pelo Prisma real, sob o papel sem bypass. O 1º POST cria a cobrança no
  // falso e PERDE a resposta (o embrulho só intercepta o `createCharge`); a lista e o `getCharge` são o adaptador real.
  test("RV-CENTAVOS-db (adaptador real): a retentativa adota a PRÓPRIA cobrança de R$ 99,99 — recovered, SENT, 1 POST, 1 cobrança pending", async () => {
    const provider = `asaas-cent-${randomUUID().slice(0, 8)}`;
    const tenants = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, `ass08c-cent-${randomUUID().slice(0, 8)}`)) as Array<{ id: string }>;
    const tenantId = tenants[0]!.id;
    const t0 = new Date();
    const statements = (await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb,
          storage_extra_gb, tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, '2026-10', 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 31,31, 0,0, 99.99,0,0,0,0,0,99.99, '2026-11-10', $2, '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
      t0,
    )) as Array<{ id: string }>;
    const statementId = statements[0]!.id;
    await db.$executeRawUnsafe(`INSERT INTO billing_statement_refs (statement_id, tenant_id, provider) VALUES ($1::uuid, $2::uuid, 'asaas')`, statementId, tenantId);
    const server = await startAsaasFake();
    try {
      const client = new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${server.baseUrl}/v3` });
      const adapter = new AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? "TOKEN-FAKE" : "WEBHOOK-FAKE"));
      let first = true;
      const port = new Proxy(adapter, {
        get(target, prop) {
          if (prop === "createCharge") {
            return async (input: Parameters<AsaasPaymentAdapter["createCharge"]>[0]) => {
              const created = await target.createCharge(input);
              if (first) {
                first = false;
                throw Object.assign(new Error("provider_timeout"), { code: "provider_timeout" });
              }
              return created;
            };
          }
          const value = Reflect.get(target, prop, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      const r = await requestChargeCreate({ intents: new PrismaChargeIntentRepository(role.client) }, { tenantId, statementId, provider, payload: { amountCents: 9_999, dueDate: "2026-11-10", method: "pix" }, now: t0 });
      const go = (now: Date) =>
        runDispatchOutbox({ repo: new PrismaOutboxRepository(role.client, { tenantIds: [tenantId] }), ports: { [provider]: port }, resolveCustomer: async () => ({ ok: true, customerId: "cus_0001" }), now: () => now });
      const firstRun = await go(t0);
      const retry = await go(minutesAfter(t0, 2));
      const [row] = (await db.$queryRawUnsafe(`SELECT status, last_error, external_id FROM billing_outbox WHERE id = $1::uuid`, r.id)) as Array<{ status: string; last_error: string | null; external_id: string | null }>;
      const charges = (await db.$queryRawUnsafe(`SELECT external_charge_id, status FROM subscription_statement_charges WHERE statement_id = $1::uuid`, statementId)) as Array<{ external_charge_id: string; status: string }>;
      const own = await adapter.listChargesByExternalReference(statementId);
      assert.deepEqual([firstRun.outcomes.retry, retry.outcomes.recovered, row!.status, row!.last_error, postsToPayments(server)], [1, 1, "SENT", null, 1], JSON.stringify({ firstRun, retry, row }));
      assert.deepEqual(own.map((candidate) => [candidate.chargeId, candidate.amountCents]), [[row!.external_id, 9_999]], "a adotada é a própria, de 9 999 centavos");
      assert.deepEqual(charges, [{ external_charge_id: row!.external_id, status: "pending" }], "1 cobrança pending na tabela, a adotada");
    } finally {
      await server.close();
    }
  });
}
