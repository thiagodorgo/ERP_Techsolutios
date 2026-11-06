import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { Prisma, PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  countBlockedStatements,
  expectRejected,
  waitForOwnBlockedStatement,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-ASS-04 · F3 (achado do revisor sênior) — as corridas do demonstrativo contra o PostgreSQL real,
// sob papel NOSUPERUSER NOBYPASSRLS e com BARREIRA DETERMINÍSTICA (`waitForOwnBlockedStatement`,
// escopada pelo application_name da suíte). O plano §4.4 (R-ST-5) pede "fechamento × baixa" com três
// cenários, mais pagamento × cancelamento e crédito × fechamento. Nenhuma corrida usa relógio nem
// `Promise.all` puro; o vencedor é uma transação crua com as MESMAS peças do produto (SELECT … FOR
// UPDATE) segurada antes do commit, e o perdedor é o serviço REAL observado bloqueado na fila de lock.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const NOW = new Date("2026-11-02T12:00:00-03:00");
const PERIOD = "2026-10";
const OPEN_PERIOD = "2026-09";
const OCT_1 = new Date("2026-10-01T00:00:00-03:00");

const applicationName = buildApplicationName("ass04-statement-races");
const FRAGMENT = "subscription_statements";

if (!connectionString) {
  test("B-ASS-04 · corridas do demonstrativo exigem DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL para executar T-ST-db-11..15.",
  });
} else {
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient: Client }, rls] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
    ]);
    const admin = new Client({ adapter: new PrismaPg({ connectionString: connection }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connection);
    await assertApplicationNamePropagated(role.client, applicationName);
    return {
      admin,
      role,
      setTenantRlsContext: rls.setTenantRlsContext,
      tenantIds: [] as string[],
      planIds: [] as string[],
    };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      if (h.tenantIds.length > 0) {
        for (const table of [
          "audit_logs",
          "subscription_credits",
          "subscription_statement_payments",
          "subscription_statements",
          "tenant_billing_profiles",
          "tenant_usage_daily",
          "tenant_subscription_addons",
          "tenant_subscriptions",
        ]) {
          await h.admin.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = ANY($1::uuid[])`, h.tenantIds);
        }
        await h.admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, h.tenantIds);
      }
      if (h.planIds.length > 0) {
        await h.admin.$executeRawUnsafe(`DELETE FROM subscription_plan_versions WHERE plan_id = ANY($1::uuid[])`, h.planIds);
        await h.admin.$executeRawUnsafe(`DELETE FROM subscription_plans WHERE id = ANY($1::uuid[])`, h.planIds);
      }
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  async function seedTenant(h: Harness, tag: string): Promise<string> {
    const slug = `ass04-races-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = (
      await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)
    )[0]!.id;
    h.tenantIds.push(tenantId);
    const code = `ass04races_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const planId = (
      await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO subscription_plans (code, kind, name) VALUES ($1, 'base', $1) RETURNING id`,
        code,
      )
    )[0]!.id;
    h.planIds.push(planId);
    await h.admin.$executeRawUnsafe(
      `INSERT INTO subscription_plan_versions
         (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb,
          extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
       VALUES ($1::uuid, 1, $2::timestamptz, 100.00, 10, 10.000, 5.00, 2.00, NULL, 'flat', ARRAY['dashboard']::text[])`,
      planId,
      OCT_1,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from) VALUES ($1::uuid, $2::uuid, $3::timestamptz)`,
      tenantId,
      planId,
      OCT_1,
    );
    return tenantId;
  }

  async function runtimeFor(client: PrismaClient) {
    const [runtime, plansRepo, subsRepo, lookup, inputsModule, serviceModule] = await Promise.all([
      import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js"),
      import("../src/modules/subscription-billing/plans/plans-prisma.repository.js"),
      import("../src/modules/subscription-billing/plans/subscriptions-prisma.repository.js"),
      import("../src/modules/subscription-billing/plans/tenant-lookup.prisma.js"),
      import("../src/modules/subscription-billing/statements/statement.inputs-provider.js"),
      import("../src/modules/subscription-billing/statements/statement.service.js"),
    ]);
    const repository = new runtime.PrismaStatementRepository(client);
    const usage = new runtime.PrismaUsageSource(client);
    const bindings = new runtime.PrismaBindingsSource(client);
    const inputs = new inputsModule.RepositoryStatementInputsProvider(
      new subsRepo.PrismaSubscriptionsRepository(client),
      new plansRepo.PrismaPlansRepository(client),
      new lookup.PrismaTenantLookup(client),
      usage,
      bindings,
    );
    const audit = new runtime.PrismaStatementAuditSink(client);
    return { service: new serviceModule.StatementService(repository, inputs, audit) };
  }

  async function readStatement(h: Harness, statementId: string) {
    const rows = await h.admin.$queryRawUnsafe<Array<Record<string, string>>>(
      `SELECT status, paid_amount::text AS paid, total_amount::text AS total, credits_applied_amount::text AS credits_applied
         FROM subscription_statements WHERE id = $1::uuid`,
      statementId,
    );
    return rows[0]!;
  }

  async function insertOpenStatement(h: Harness, tenantId: string, period: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO subscription_statements
         (tenant_id, period, status, segments, users_included, users_peak, users_extra,
          storage_included_gb, storage_peak_gb, storage_extra_gb, tracked_vehicles,
          days_in_month, days_measured, extra_user_price, extra_gb_price, base_amount,
          users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, snapshot)
       VALUES ($1::uuid, $2, 'open', '[]'::jsonb, 0, 0, 0, 0, 0, 0, 0, 0, 0,
               0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
               '{"latest":null,"history":[]}'::jsonb)
       RETURNING id`,
      tenantId,
      period,
    );
    return rows[0]!.id;
  }

  async function insertOpenCredit(h: Harness, tenantId: string, originStatementId: string): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO subscription_credits (tenant_id, origin_statement_id, amount, reason, status)
       VALUES ($1::uuid, $2::uuid, 10.00, 'overpayment', 'open') RETURNING id`,
      tenantId,
      originStatementId,
    );
    return rows[0]!.id;
  }

  function holdStatementLock(
    h: Harness,
    tenantId: string,
    statementId: string,
    finalWrite: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    let signalReady!: () => void;
    const ready = new Promise<void>((resolve) => {
      signalReady = resolve;
    });
    let releaseWinner!: () => void;
    const mayCommit = new Promise<void>((resolve) => {
      releaseWinner = resolve;
    });
    const outcome = captureSettled(
      h.role.client.$transaction(
        async (tx) => {
          await h.setTenantRlsContext(tx, tenantId);
          await tx.$queryRaw`SELECT id FROM subscription_statements WHERE id = ${statementId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`;
          signalReady();
          await mayCommit;
          await finalWrite(tx);
        },
        { timeout: 30_000, maxWait: 10_000 },
      ),
    );
    return { ready, release: releaseWinner, outcome };
  }

  async function fulfilled(outcome: Promise<SettledOutcome<unknown>>, label: string): Promise<void> {
    const settled = await outcome;
    assert.equal(
      settled.status,
      "fulfilled",
      `${label}: ${settled.status === "rejected" ? String((settled.reason as { message?: unknown })?.message ?? settled.reason) : "não liquidou limpo"}`,
    );
  }

  test("T-ST-db-11: R-ST-5 cenário 1 — refechamento × baixa: a baixa espera e vê `closed` com sucesso", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "reclose-baixa");
    const { service } = await runtimeFor(h.role.client);
    const closed = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    const statementId = (closed as { statement: { id: string } }).statement.id;
    await service.reopen({ tenantId, statementId, reason: "medição corrigida à mão", actorId: "u", now: NOW });

    const winner = holdStatementLock(h, tenantId, statementId, async (tx) => {
      await tx.$executeRaw`UPDATE subscription_statements SET status = 'closed' WHERE id = ${statementId}::uuid AND tenant_id = ${tenantId}::uuid`;
    });
    await winner.ready;

    let loserSettled = false;
    const loser = captureSettled(
      service.recordManualPayment({ tenantId, statementId, amountCents: 4_000, method: "pix", note: null, actorId: "u", now: NOW }),
    ).then((outcome) => {
      loserSettled = true;
      return outcome;
    });

    await waitForOwnBlockedStatement(h.role.client, {
      applicationName,
      fragment: FRAGMENT,
      label: "baixa bloqueada no FOR UPDATE do demonstrativo (refechamento)",
    });
    assert.equal(loserSettled, false, "a baixa TEM de estar bloqueada no row lock — nunca commitada");

    winner.release();
    await fulfilled(winner.outcome, "refechamento vencedor");
    const paid = await loser;
    assert.equal(paid.status, "fulfilled", "a baixa vê `closed` e tem sucesso");
    const row = await readStatement(h, statementId);
    assert.deepEqual({ status: row.status, paid: row.paid }, { status: "closed", paid: "40.00" });
  });

  test("T-ST-db-12: R-ST-5 cenário 2 — reabertura × baixa: a baixa espera, recebe 422 e paid fica 0", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "reopen-baixa");
    const { service } = await runtimeFor(h.role.client);
    const closed = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    const statementId = (closed as { statement: { id: string } }).statement.id;

    const winner = holdStatementLock(h, tenantId, statementId, async (tx) => {
      await tx.$executeRaw`UPDATE subscription_statements SET status = 'reopened', reopen_reason = 'corrigir medição' WHERE id = ${statementId}::uuid AND tenant_id = ${tenantId}::uuid`;
    });
    await winner.ready;

    let loserSettled = false;
    const loser = captureSettled(
      service.recordManualPayment({ tenantId, statementId, amountCents: 4_000, method: "pix", note: null, actorId: "u", now: NOW }),
    ).then((outcome) => {
      loserSettled = true;
      return outcome;
    });

    await waitForOwnBlockedStatement(h.role.client, {
      applicationName,
      fragment: FRAGMENT,
      label: "baixa bloqueada no FOR UPDATE do demonstrativo (reabertura)",
    });
    assert.equal(loserSettled, false, "a baixa TEM de estar bloqueada no row lock — nunca commitada");

    winner.release();
    await fulfilled(winner.outcome, "reabertura vencedora");
    const err = expectRejected(await loser, "baixa perdedora atrás da reabertura");
    assert.equal((err as { statusCode?: number }).statusCode, 422);
    assert.equal((err as { reason?: string }).reason, "statement_not_closed");
    const row = await readStatement(h, statementId);
    assert.deepEqual({ status: row.status, paid: row.paid }, { status: "reopened", paid: "0.00" });
  });

  test("T-ST-db-13: R-ST-5 cenário 3 — primeiro fechamento × baixa: sem linha, 404 e sem esperar", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "none-baixa");
    const { service } = await runtimeFor(h.role.client);
    const ghostId = randomUUID();
    const err = expectRejected(
      await captureSettled(service.recordManualPayment({ tenantId, statementId: ghostId, amountCents: 1_000, method: "pix", note: null, actorId: "u", now: NOW })),
      "baixa sem demonstrativo",
    );
    assert.equal((err as { statusCode?: number }).statusCode, 404);
    assert.equal((err as { reason?: string }).reason, "statement_not_found");
    const blocked = await countBlockedStatements(h.role.client, { fragment: FRAGMENT, applicationName });
    assert.equal(blocked, 0, "sem linha não há lock a esperar");
  });

  test("T-ST-db-14: pagamento × cancelamento — o cancelamento espera e recusa; jamais paid>0 com cancelled", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "pay-cancel");
    const { service } = await runtimeFor(h.role.client);
    const closed = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    const statementId = (closed as { statement: { id: string } }).statement.id;

    const winner = holdStatementLock(h, tenantId, statementId, async (tx) => {
      await tx.$executeRaw`INSERT INTO subscription_statement_payments (tenant_id, statement_id, source, amount, applied_amount, paid_at) VALUES (${tenantId}::uuid, ${statementId}::uuid, 'manual', 40.00, 40.00, now())`;
      await tx.$executeRaw`UPDATE subscription_statements SET paid_amount = 40.00 WHERE id = ${statementId}::uuid AND tenant_id = ${tenantId}::uuid`;
    });
    await winner.ready;

    let loserSettled = false;
    const loser = captureSettled(
      service.cancel({ tenantId, statementId, reason: "cobrança indevida", actorId: "u", now: NOW }),
    ).then((outcome) => {
      loserSettled = true;
      return outcome;
    });

    await waitForOwnBlockedStatement(h.role.client, {
      applicationName,
      fragment: FRAGMENT,
      label: "cancelamento bloqueado atrás do pagamento",
    });
    assert.equal(loserSettled, false, "o cancelamento TEM de estar bloqueado no row lock");

    winner.release();
    await fulfilled(winner.outcome, "pagamento vencedor");
    const err = expectRejected(await loser, "cancelamento perdedor");
    assert.equal((err as { statusCode?: number }).statusCode, 422);
    assert.equal((err as { reason?: string }).reason, "statement_has_payments");
    const row = await readStatement(h, statementId);
    assert.deepEqual({ status: row.status, paid: row.paid }, { status: "closed", paid: "40.00" });
  });

  test("T-ST-db-15: crédito × fechamento — o fechamento ganha e o crédito fica open (nunca perdido nem duplo-aplicado)", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "credit-close");
    const { service } = await runtimeFor(h.role.client);
    const openStatementId = await insertOpenStatement(h, tenantId, OPEN_PERIOD);
    const creditId = await insertOpenCredit(h, tenantId, openStatementId);

    const winner = holdStatementLock(h, tenantId, openStatementId, async (tx) => {
      await tx.$executeRaw`UPDATE subscription_statements SET status = 'closed' WHERE id = ${openStatementId}::uuid AND tenant_id = ${tenantId}::uuid`;
    });
    await winner.ready;

    let loserSettled = false;
    const loser = captureSettled(
      service.applyCredit({ tenantId, creditId, statementId: openStatementId, actorId: "u", now: NOW }),
    ).then((outcome) => {
      loserSettled = true;
      return outcome;
    });

    await waitForOwnBlockedStatement(h.role.client, {
      applicationName,
      fragment: FRAGMENT,
      label: "crédito bloqueado atrás do fechamento",
    });
    assert.equal(loserSettled, false, "o crédito TEM de estar bloqueado no row lock do demonstrativo");

    winner.release();
    await fulfilled(winner.outcome, "fechamento vencedor");
    const err = expectRejected(await loser, "crédito perdedor");
    assert.equal((err as { statusCode?: number }).statusCode, 422);
    assert.equal((err as { reason?: string }).reason, "statement_not_adjustable");

    const credits = await h.admin.$queryRawUnsafe<Array<{ status: string; applied: string | null }>>(
      `SELECT status, applied_to_statement_id::text AS applied FROM subscription_credits WHERE id = $1::uuid`,
      creditId,
    );
    assert.deepEqual(credits[0], { status: "open", applied: null });
    const row = await readStatement(h, openStatementId);
    assert.deepEqual({ status: row.status, credits: row.credits_applied }, { status: "closed", credits: "0.00" });
  });

  test("T-ST-db-2b: dois fechamentos concorrentes com barreira → um closed, um already_closed, uma linha", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "close-close");
    const { service } = await runtimeFor(h.role.client);
    const statementId = await insertOpenStatement(h, tenantId, PERIOD);

    const winner = holdStatementLock(h, tenantId, statementId, async (tx) => {
      await tx.$executeRaw`UPDATE subscription_statements SET status = 'closed', total_amount = 100.00 WHERE id = ${statementId}::uuid AND tenant_id = ${tenantId}::uuid`;
    });
    await winner.ready;

    let loserSettled = false;
    const loser = captureSettled(
      service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" }),
    ).then((outcome) => {
      loserSettled = true;
      return outcome;
    });

    await waitForOwnBlockedStatement(h.role.client, {
      applicationName,
      fragment: FRAGMENT,
      label: "2º fechamento bloqueado no FOR UPDATE do período",
    });
    assert.equal(loserSettled, false, "o 2º fechamento TEM de estar bloqueado");

    winner.release();
    await fulfilled(winner.outcome, "1º fechamento vencedor");
    const outcome = await loser;
    assert.equal(outcome.status, "fulfilled");
    assert.equal((outcome as { value: { kind: string } }).value.kind, "already_closed");

    const rows = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM subscription_statements WHERE tenant_id = $1::uuid AND period = $2`,
      tenantId,
      PERIOD,
    );
    assert.equal(rows[0]!.n, 1);
  });

  test("T-ST-db-3b: dois pagamentos concorrentes com barreira → um entra, o outro 422 amount_exceeds_balance", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "pay-pay");
    const { service } = await runtimeFor(h.role.client);
    const closed = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    const statementId = (closed as { statement: { id: string } }).statement.id;

    const winner = holdStatementLock(h, tenantId, statementId, async (tx) => {
      await tx.$executeRaw`INSERT INTO subscription_statement_payments (tenant_id, statement_id, source, amount, applied_amount, paid_at) VALUES (${tenantId}::uuid, ${statementId}::uuid, 'manual', 60.00, 60.00, now())`;
      await tx.$executeRaw`UPDATE subscription_statements SET paid_amount = 60.00 WHERE id = ${statementId}::uuid AND tenant_id = ${tenantId}::uuid`;
    });
    await winner.ready;

    let loserSettled = false;
    const loser = captureSettled(
      service.recordManualPayment({ tenantId, statementId, amountCents: 6_000, method: null, note: null, actorId: "u", now: NOW }),
    ).then((outcome) => {
      loserSettled = true;
      return outcome;
    });

    await waitForOwnBlockedStatement(h.role.client, {
      applicationName,
      fragment: FRAGMENT,
      label: "2º pagamento bloqueado atrás do 1º",
    });
    assert.equal(loserSettled, false, "o 2º pagamento TEM de estar bloqueado");

    winner.release();
    await fulfilled(winner.outcome, "1º pagamento vencedor");
    const err = expectRejected(await loser, "2º pagamento perdedor");
    assert.equal((err as { statusCode?: number }).statusCode, 422);
    assert.equal((err as { reason?: string }).reason, "amount_exceeds_balance");

    const row = await readStatement(h, statementId);
    assert.equal(row.paid, "60.00");
    const payments = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM subscription_statement_payments WHERE tenant_id = $1::uuid AND statement_id = $2::uuid`,
      tenantId,
      statementId,
    );
    assert.equal(payments[0]!.n, 1, "só o pagamento vencedor sobrevive");
  });
}
