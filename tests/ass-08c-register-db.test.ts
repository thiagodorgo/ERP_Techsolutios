import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { PrismaOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { recordedChargeStatus, type OutboxLease } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { OUTBOX_ORPHAN_MS, type BillingOutboxRow } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import type { PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOW = new Date("2026-11-13T12:00:00.000Z");
const prismaSource = readFileSync(new URL("../src/modules/subscription-billing/outbox/outbox.prisma.ts", import.meta.url), "utf8");

if (!connectionString) {
  test("B-ASS-08c1a · registro transacional exige DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let admin: any;
  let db: any;
  let role: EphemeralRole;
  let databaseName = "";
  let targetUrl = "";

  type Fixture = { tenantId: string; statementId: string; outboxId: string; row: BillingOutboxRow; lease: OutboxLease };

  async function seedProcessing(suffix: string): Promise<Fixture> {
    const tenants = (await db.$queryRawUnsafe(
      `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
      `Organização fictícia ${suffix}`,
      `ass08c-${suffix}`,
    )) as Array<{ id: string }>;
    const tenantId = tenants[0]!.id;
    const statements = (await db.$queryRawUnsafe(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra,
          storage_included_gb, storage_peak_gb, storage_extra_gb, tracked_vehicles,
          days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount,
          users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, due_date, closed_at, snapshot)
       VALUES ($1::uuid, $2, 'closed', '[]'::jsonb, 0,0,0, 0,0,0, 0, 30,30, 0,0,
               123.45,0,0,0,0,0,123.45, '2026-11-20', $3, '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
      `2026-${suffix.slice(-2)}`,
      NOW,
    )) as Array<{ id: string }>;
    const statementId = statements[0]!.id;
    await db.$executeRawUnsafe(
      `INSERT INTO billing_statement_refs (statement_id, tenant_id, provider, created_at)
       VALUES ($1::uuid, $2::uuid, 'asaas', $3)`,
      statementId,
      tenantId,
      NOW,
    );
    const claimedBy = `dispatch-outbox:test-${suffix}`;
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO billing_outbox
         (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key,
          payload, status, claimed_at, claimed_by, attempt_started_at, attempts, occurred_at, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, 'charge_create', 'asaas', $3, gen_random_uuid(),
               '{"amountCents":12345,"dueDate":"2026-11-20","method":"pix"}'::jsonb, 'PROCESSING', $4, $5, $4, 1, $4, $4, $4)
       RETURNING id`,
      tenantId,
      statementId,
      `charge_create:${statementId}:${suffix}`,
      NOW,
      claimedBy,
    )) as Array<{ id: string }>;
    const outboxId = rows[0]!.id;
    const repo = new PrismaOutboxRepository(role.client);
    const row = await repo.findById(tenantId, outboxId);
    assert.ok(row);
    return { tenantId, statementId, outboxId, row, lease: { claimedBy, attemptStartedAt: NOW } };
  }

  async function persisted(fixture: Fixture): Promise<{ outbox: any; charges: any[]; ref: any }> {
    const [outbox] = (await db.$queryRawUnsafe(`SELECT status, external_id FROM billing_outbox WHERE id = $1::uuid`, fixture.outboxId)) as any[];
    const charges = (await db.$queryRawUnsafe(
      `SELECT external_charge_id, status FROM subscription_statement_charges WHERE statement_id = $1::uuid`,
      fixture.statementId,
    )) as any[];
    const [ref] = (await db.$queryRawUnsafe(
      `SELECT external_charge_id FROM billing_statement_refs WHERE statement_id = $1::uuid`,
      fixture.statementId,
    )) as any[];
    return { outbox, charges, ref };
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
    databaseName = `${base}_ass08c_reg_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(connectionString!);
    url.pathname = `/${databaseName}`;
    targetUrl = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: targetUrl }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });
    role = await createEphemeralRole(db, targetUrl);
    const [posture] = (await db.$queryRawUnsafe(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`,
      role.roleName,
    )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false });
  });

  test("RG1: falha depois do INSERT reverte cobrança, ref e SENT na mesma transação", async () => {
    const fixture = await seedProcessing("01");
    const repo = new PrismaOutboxRepository(role.client, {
      tenantIds: [fixture.tenantId],
      afterChargeInsert: async () => { throw new Error("falha_injetada_de_registro"); },
    });
    await assert.rejects(
      repo.recordChargeOutcome(fixture.tenantId, fixture.row, fixture.lease, {
        kind: "created",
        result: { chargeId: "charge-fake-rg1", status: "pending", payUrl: undefined, pixCopyPaste: undefined, boletoLine: undefined, boletoUrl: undefined },
      }, NOW),
      /falha_injetada_de_registro/,
    );
    assert.deepEqual(await persisted(fixture), { outbox: { status: "PROCESSING", external_id: null }, charges: [], ref: { external_charge_id: null } });
  });

  test("RACE-6: trava aberta faz record_failed; a órfã recupera com um único POST", async () => {
    const fixture = await seedProcessing("06");
    await db.$executeRawUnsafe(
      `UPDATE billing_outbox SET status = 'PENDING', claimed_at = NULL, claimed_by = NULL,
         attempt_started_at = NULL, attempts = 0 WHERE id = $1::uuid`,
      fixture.outboxId,
    );
    const { Client } = (await import("pg")) as any;
    let holder: any;
    let created = false;
    let createCalls = 0;
    const audits: string[] = [];
    const port: PaymentProviderPort = {
      ensureCustomer: async () => ({ customerId: "customer-fake" }),
      createCharge: async () => {
        createCalls += 1;
        created = true;
        holder = new Client({ connectionString: targetUrl });
        await holder.connect();
        await holder.query("BEGIN");
        await holder.query(`SELECT id FROM subscription_statements WHERE id = $1::uuid FOR UPDATE`, [fixture.statementId]);
        return { chargeId: "charge-fake-race6-db", status: "pending" };
      },
      listChargesByExternalReference: async () => created
        ? [{ chargeId: "charge-fake-race6-db", status: "pending", amountCents: 12_345, createdAt: "2026-11-13" }]
        : [],
      getCharge: async () => ({ status: "pending", dueDate: "2026-11-20", raw: {} }),
      cancelCharge: async (chargeId) => ({ chargeId, status: "cancelled" }),
      refund: async (chargeId) => ({ chargeId, status: "refunded" }),
      registerWebhook: async () => ({ manual: true }),
      verifyWebhook: async () => ({ ok: false }),
      supportedMethods: () => ["pix"],
      describe: () => ({ provider: "asaas", supportedMethods: ["pix"], pendingHomologation: [], webhookRegistration: "manual" }),
    };
    let clock = NOW;
    const deps = {
      repo: new PrismaOutboxRepository(role.client, { tenantIds: [fixture.tenantId] }),
      ports: { asaas: port },
      resolveCustomer: async () => ({ ok: true as const, customerId: "customer-fake" }),
      now: () => clock,
      orphanMs: OUTBOX_ORPHAN_MS,
      onAudit: async (event: { action: string; code: string }) => { audits.push(`${event.action}:${event.code}`); },
    };
    const firstRun = runDispatchOutbox(deps);
    const deadline = Date.now() + 10_000;
    let sawWaiter = false;
    while (Date.now() < deadline) {
      const waiters = (await db.$queryRawUnsafe(
        `SELECT wait_event_type FROM pg_stat_activity WHERE datname = current_database()
          AND usename = $1 AND wait_event_type = 'Lock'`,
        role.roleName,
      )) as Array<{ wait_event_type: string }>;
      if (waiters.length > 0) { sawWaiter = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(sawWaiter, true, "o registro esperou a trava do demonstrativo");
    const failed = await firstRun;
    assert.equal(failed.outcomes.record_failed, 1);
    assert.equal((await persisted(fixture)).outbox.status, "PROCESSING");
    assert.deepEqual(audits, ["billing_outbox.record_failed:P2010"]);
    await holder.query("ROLLBACK");
    await holder.end();

    clock = new Date(NOW.getTime() + OUTBOX_ORPHAN_MS + 1);
    const recovered = await runDispatchOutbox(deps);
    const afterRecovery = await persisted(fixture);
    assert.equal(recovered.outcomes.recovered, 1, JSON.stringify({ recovered, afterRecovery, audits }));
    assert.equal(createCalls, 1);
    assert.deepEqual(afterRecovery, {
      outbox: { status: "SENT", external_id: "charge-fake-race6-db" },
      charges: [{ external_charge_id: "charge-fake-race6-db", status: "pending" }],
      ref: { external_charge_id: "charge-fake-race6-db" },
    });
  });

  // R1-db (CA-3): a órfã reconsultada ADOTA a cobrança e a grava na tabela com os campos públicos (payUrl, Pix, boleto,
  // vencimento) — pelo despacho real sobre o papel sem bypass, sem atalho no repositório. Mora aqui (e não num
  // `ass-08c-recovered-db` à parte) para reaproveitar a base própria desta suíte; o nome do caso segue o plano.
  // Vermelho-controle: M3 ([RECOVER-01] volta a `markSent`) → 0 cobranças.
  test("R1-db: a recuperada grava a cobrança pending com payUrl, Pix, boleto e vencimento", async () => {
    const fixture = await seedProcessing("07");
    let lookups = 0;
    let createCalls = 0;
    const port: PaymentProviderPort = {
      ensureCustomer: async () => ({ customerId: "customer-fake" }),
      createCharge: async () => {
        createCalls += 1;
        return { chargeId: "charge-fake-r1-nao-deve-nascer", status: "pending" };
      },
      listChargesByExternalReference: async (ref) => {
        lookups += 1;
        assert.equal(ref, fixture.statementId);
        return [{ chargeId: "charge-fake-r1-db", status: "pending", amountCents: 12_345, createdAt: "2026-11-13" }];
      },
      getCharge: async () => ({
        status: "pending",
        payUrl: "https://pagamento.invalid/r1",
        pixCopyPaste: "PIX-FICTICIO-R1",
        boletoLine: "00000.00000 00000.000000 00000.000000 0 00000000000000",
        boletoUrl: "https://boleto.invalid/r1.pdf",
        dueDate: "2026-11-25",
        raw: {},
      }),
      cancelCharge: async (chargeId) => ({ chargeId, status: "cancelled" }),
      refund: async (chargeId) => ({ chargeId, status: "refunded" }),
      registerWebhook: async () => ({ manual: true }),
      verifyWebhook: async () => ({ ok: false }),
      supportedMethods: () => ["pix"],
      describe: () => ({ provider: "asaas", supportedMethods: ["pix"], pendingHomologation: [], webhookRegistration: "manual" }),
    };
    const run = await runDispatchOutbox({
      repo: new PrismaOutboxRepository(role.client, { tenantIds: [fixture.tenantId] }),
      ports: { asaas: port },
      resolveCustomer: async () => ({ ok: true as const, customerId: "customer-fake" }),
      now: () => new Date(NOW.getTime() + OUTBOX_ORPHAN_MS + 1),
      orphanMs: OUTBOX_ORPHAN_MS,
    });
    assert.equal(run.outcomes.recovered, 1, JSON.stringify(run));
    assert.equal(lookups, 1);
    assert.equal(createCalls, 0, "a recuperação nunca cria");
    const charges = (await db.$queryRawUnsafe(
      `SELECT external_charge_id, status, pay_url, pix_copy_paste, boleto_line, boleto_url, to_char(due_date, 'YYYY-MM-DD') AS due_date
         FROM subscription_statement_charges WHERE statement_id = $1::uuid`,
      fixture.statementId,
    )) as any[];
    assert.deepEqual(charges, [{
      external_charge_id: "charge-fake-r1-db",
      status: "pending",
      pay_url: "https://pagamento.invalid/r1",
      pix_copy_paste: "PIX-FICTICIO-R1",
      boleto_line: "00000.00000 00000.000000 00000.000000 0 00000000000000",
      boleto_url: "https://boleto.invalid/r1.pdf",
      due_date: "2026-11-25",
    }]);
    const after = await persisted(fixture);
    assert.deepEqual([after.outbox, after.ref], [{ status: "SENT", external_id: "charge-fake-r1-db" }, { external_charge_id: "charge-fake-r1-db" }]);
  });

  test("RG2: lease incorreta retorna false e não grava nenhum dos três efeitos", async () => {
    const fixture = await seedProcessing("02");
    const repo = new PrismaOutboxRepository(role.client, { tenantIds: [fixture.tenantId] });
    const recorded = await repo.recordChargeOutcome(fixture.tenantId, fixture.row, { ...fixture.lease, claimedBy: "dispatch-outbox:intruso" }, {
      kind: "created",
      result: { chargeId: "charge-fake-rg2", status: "pending", payUrl: undefined, pixCopyPaste: undefined, boletoLine: undefined, boletoUrl: undefined },
    }, NOW);
    assert.equal(recorded, false);
    assert.deepEqual(await persisted(fixture), { outbox: { status: "PROCESSING", external_id: null }, charges: [], ref: { external_charge_id: null } });
  });

  test("RG1/RG2: lease válida confirma SENT, cobrança e ref juntos", async () => {
    const fixture = await seedProcessing("03");
    const repo = new PrismaOutboxRepository(role.client, { tenantIds: [fixture.tenantId] });
    const recorded = await repo.recordChargeOutcome(fixture.tenantId, fixture.row, fixture.lease, {
      kind: "adopted",
      chargeId: "charge-fake-ok",
      lookup: { status: "paid", payUrl: undefined, pixCopyPaste: undefined, boletoLine: undefined, boletoUrl: undefined, dueDate: "2026-11-20", raw: {} },
    }, NOW);
    assert.equal(recorded, true);
    assert.deepEqual(await persisted(fixture), {
      outbox: { status: "SENT", external_id: "charge-fake-ok" },
      charges: [{ external_charge_id: "charge-fake-ok", status: "confirmed" }],
      ref: { external_charge_id: "charge-fake-ok" },
    });
  });

  test("RG3: mapeamento da adotada é explícito e falha fechado", () => {
    assert.equal(recordedChargeStatus("created", "unknown"), "pending");
    assert.equal(recordedChargeStatus("adopted", "pending"), "pending");
    assert.equal(recordedChargeStatus("adopted", "overdue"), "pending");
    assert.equal(recordedChargeStatus("adopted", "paid"), "confirmed");
    assert.equal(recordedChargeStatus("adopted", "partially_paid"), "confirmed");
    assert.equal(recordedChargeStatus("adopted", "refunded"), "refunded");
    assert.equal(recordedChargeStatus("adopted", "unknown"), "needs_review");
  });

  test("RG1/T-LOCK-2: o registro abre o demonstrativo antes da fila", () => {
    const body = prismaSource.slice(prismaSource.indexOf("async recordChargeOutcome"));
    assert.ok(body.indexOf("FROM subscription_statements") < body.indexOf("billing_outbox"));
  });
}
