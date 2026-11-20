// Os casos CR1–CR4 vivem no teste-dono de memória ao lado; este arquivo mantém o nome -db do plano
// e prova que a implementação Prisma oferece a mesma primitive auditada no mesmo StatementTx.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { openPrismaKit, type PrismaKit } from "./helpers/ass-08c3-prisma-kit.js";
import { source } from "./helpers/ass-08c3-test-kit.js";

test("CR1–CR4-db: o runtime Prisma implementa lockById, saveStatement e recordAudit no StatementTx", () => {
  const text = source("src/modules/subscription-billing/statements/statement.prisma-runtime.ts");
  for (const primitive of ["lockById", "saveStatement", "recordAudit"]) assert.match(text, new RegExp(primitive));
  assert.match(text, /async recordAudit\(event\)[\s\S]*writeAuditInTx\(tx, event\)/);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Conserto único do #608 (fix-608b-cl), no PRISMA, pelos serviços de produção (close, settle, reopen, applyCredit,
// applyReversal), sob papel NOSUPERUSER NOBYPASSRLS. A cena da pendência: outubro 112,00 pago com 150,00 (crédito 38,00);
// novembro 100,00 reaberto, o crédito aplicado, refechado a 62,00 e pago a 62,00.
//   CR-PARCIAL (B2-1): o estorno PARCIAL de 20,00 do pagamento de outubro retira de novembro SÓ os 20,00 estornados do crédito:
//         novembro passa a dever 20,00 (total 82,00, pago 62,00), não 38,00; o resto do estorno, depois, fecha a conta (150,00).
//   CR-TRILHA (B2-2): a trilha `subscription_statement.credit_reversed` é do mês que VOLTOU A DEVER (novembro): `entity_id` e
//         `statementId` = novembro, `code` = o tipo do estorno, `count` = os centavos que voltaram à dívida.
// ---------------------------------------------------------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;
const PRICE: Record<string, number> = { "2026-10": 11_200, "2026-11": 10_000 };
const T = (iso: string) => new Date(iso);
if (!connectionString) {
  test("CR-PARCIAL/CR-TRILHA exigem DATABASE_URL", { skip: "Defina DATABASE_URL para os testes -db." });
} else {
  let kit: PrismaKit;
  let M: any = {};
  after(async () => {
    await kit?.close();
  });
  const inputs = {
    async resolve(_tenant: string, period: string) {
      const [y, m] = period.split("-").map(Number);
      const days = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
      return {
        kind: "ready",
        subscriptionId: null,
        planVersionId: null,
        addonPlanVersionId: null,
        computation: {
          daysInMonth: days,
          segments: [{ subscriptionId: "sub", planVersionId: "plan-v1", fromDay: 1, toDay: days, monthlyPriceCents: PRICE[period] ?? 10_000 }],
          terms: { includedUsers: 0, includedStorageMilliGb: 0, extraUserPriceCents: 0, extraGbPriceCents: 0 },
          measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 0 },
          perVehiclePriceCents: null,
        },
        daysMeasured: days,
        gaps: [],
        dueDays: 10,
      };
    },
  };
  const services = () => {
    const repo = new M.runtime.PrismaStatementRepository(kit.role.client);
    const svc = new M.service.StatementService(repo, inputs, new M.runtime.PrismaStatementAuditSink(kit.role.client));
    return { svc, settlement: new M.settlement.StatementSettlementService(repo, svc) };
  };
  const cents = (value: string) => Math.round(Number(value) * 100);
  const stmt = async (tenantId: string, period: string) => {
    const row = await kit.one(
      `SELECT id, status, total_amount::text AS total, paid_amount::text AS paid, credits_applied_amount::text AS credits, paid_at IS NULL AS paid_at_null, snapshot
         FROM subscription_statements WHERE tenant_id = $1::uuid AND period = $2`,
      tenantId,
      period,
    );
    return {
      id: row.id as string,
      status: row.status as string,
      total: cents(row.total),
      paid: cents(row.paid),
      credits: cents(row.credits),
      paidAtNull: row.paid_at_null as boolean,
      recompute: row.snapshot?.latest ? M.engine.recompute(row.snapshot.latest) : null,
    };
  };

  async function scene(tag: string) {
    const { svc, settlement } = services();
    const slug = `c08c3-cr-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = (await kit.one(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)).id as string;
    const actor = (await kit.one(`INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, 'op', $2) RETURNING id`, tenantId, `${slug}@teste.invalid`)).id as string;
    const octCharge = `pay_${tag}_oct`;
    const oct = await svc.close({ tenantId, period: "2026-10", now: T("2026-11-02T12:00:00Z"), actorId: null, source: "job" });
    assert.equal(oct.kind, "closed");
    await settlement.settle({ tenantId, statementId: oct.statement.id, source: "asaas", externalChargeId: octCharge, paidCents: 15_000, method: null, now: T("2026-11-05T12:00:00Z") });
    const credit = await kit.one(`SELECT id FROM subscription_credits WHERE tenant_id = $1::uuid`, tenantId);
    const nov = await svc.close({ tenantId, period: "2026-11", now: T("2026-12-02T12:00:00Z"), actorId: null, source: "job" });
    await svc.reopen({ tenantId, statementId: nov.statement.id, reason: "aplicar crédito", actorId: actor, now: T("2026-12-03T12:00:00Z") });
    await svc.applyCredit({ tenantId, creditId: credit.id, statementId: nov.statement.id, actorId: actor, now: T("2026-12-03T12:01:00Z") });
    assert.equal((await svc.close({ tenantId, period: "2026-11", now: T("2026-12-03T13:00:00Z"), actorId: actor, source: "manual" })).kind, "closed");
    await settlement.settle({ tenantId, statementId: nov.statement.id, source: "asaas", externalChargeId: `pay_${tag}_nov`, paidCents: 6_200, method: null, now: T("2026-12-05T12:00:00Z") });
    const novBefore = await stmt(tenantId, "2026-11");
    assert.deepEqual({ status: novBefore.status, total: novBefore.total, paid: novBefore.paid, credits: novBefore.credits }, { status: "paid", total: 6_200, paid: 6_200, credits: 3_800 });
    return { tenantId, octId: oct.statement.id as string, novId: nov.statement.id as string, octCharge, settlement };
  }

  test("setup -db: base própria, papel NOSUPERUSER NOBYPASSRLS", async () => {
    kit = await openPrismaKit(connectionString, "c08c3_cr");
    M = {
      runtime: await import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js"),
      service: await import("../src/modules/subscription-billing/statements/statement.service.js"),
      settlement: await import("../src/modules/subscription-billing/statements/statement-settlement.service.js"),
      engine: await import("../src/modules/subscription-billing/statements/statement.engine.js"),
    };
  });

  test("CR-PARCIAL (B2-1): o estorno parcial de 20,00 devolve à dívida de novembro só os 20,00; o resto do estorno fecha a conta", async () => {
    const s = await scene("crp");
    await s.settlement.applyReversal({ tenantId: s.tenantId, statementId: s.octId, externalChargeId: s.octCharge, reversedCents: 2_000, kind: "refund", now: T("2026-12-10T12:00:00Z") });
    const nov = await stmt(s.tenantId, "2026-11");
    const oct = await stmt(s.tenantId, "2026-10");
    // Contratado 212,00; o cliente recebeu de volta 20,00 dos 212,00 pagos → deve 20,00, todos em novembro.
    assert.deepEqual(
      { status: nov.status, total: nov.total, paid: nov.paid, credits: nov.credits, paidAtNull: nov.paidAtNull },
      { status: "closed", total: 8_200, paid: 6_200, credits: 1_800, paidAtNull: true },
    );
    assert.equal(nov.recompute, nov.total, "o retrato de novembro é coerente");
    assert.deepEqual({ status: oct.status, total: oct.total, paid: oct.paid }, { status: "paid", total: 11_200, paid: 11_200 });
    assert.equal(nov.total - nov.paid + (oct.total - oct.paid), 2_000, "a dívida total é exatamente o estornado");
    const credits = await kit.rows(
      `SELECT status, amount::text AS amount, resolution_note, applied_to_statement_id FROM subscription_credits WHERE tenant_id = $1::uuid ORDER BY status, amount`,
      s.tenantId,
    );
    assert.deepEqual(
      credits.map((c) => [c.status, cents(c.amount), c.resolution_note, c.applied_to_statement_id]),
      [
        ["applied", 1_800, null, s.novId],
        ["written_off", 2_000, "credit_reversed", s.novId],
      ],
    );

    // O resto do estorno (130,00): novembro perde os 18,00 que sobravam do crédito e outubro, os 112,00 aplicados.
    await s.settlement.applyReversal({ tenantId: s.tenantId, statementId: s.octId, externalChargeId: s.octCharge, reversedCents: 15_000, kind: "refund", now: T("2026-12-12T12:00:00Z") });
    const nov2 = await stmt(s.tenantId, "2026-11");
    const oct2 = await stmt(s.tenantId, "2026-10");
    assert.deepEqual({ total: nov2.total, paid: nov2.paid, credits: nov2.credits }, { total: 10_000, paid: 6_200, credits: 0 });
    assert.deepEqual({ status: oct2.status, total: oct2.total, paid: oct2.paid }, { status: "closed", total: 11_200, paid: 0 });
    assert.equal(nov2.total - nov2.paid + (oct2.total - oct2.paid), 15_000, "o estorno inteiro do pagamento de 150,00 volta inteiro à dívida");
  });

  test("CR-TRILHA (B2-2): a trilha credit_reversed é de novembro (o mês que voltou a dever), com statementId, code e count", async () => {
    const s = await scene("crt");
    await s.settlement.applyReversal({ tenantId: s.tenantId, statementId: s.octId, externalChargeId: s.octCharge, reversedCents: 2_000, kind: "refund", now: T("2026-12-10T12:00:00Z") });
    await s.settlement.applyReversal({ tenantId: s.tenantId, statementId: s.octId, externalChargeId: s.octCharge, reversedCents: 15_000, kind: "chargeback", now: T("2026-12-12T12:00:00Z") });
    const trails = await kit.rows(`SELECT entity_id, metadata FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'subscription_statement.credit_reversed' ORDER BY created_at`, s.tenantId);
    assert.equal(trails.length, 2);
    assert.deepEqual(
      trails.map((t) => ({ entity: t.entity_id, statementId: t.metadata.statementId, code: t.metadata.code, count: t.metadata.count })),
      [
        { entity: s.novId, statementId: s.novId, code: "refund", count: 2_000 },
        { entity: s.novId, statementId: s.novId, code: "chargeback", count: 1_800 },
      ],
    );
    assert.doesNotMatch(JSON.stringify(trails.map((t) => t.metadata)), /tenant_?id|pay_|token|secret/i);
  });
}
