import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after } from "node:test";

const connection = process.env.DATABASE_URL;

if (!connection) {
  test("b-comissao-motor-agregados-db exige DATABASE_URL", {
    skip: "Defina DATABASE_URL para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  let admin: any;
  const tenantsToCleanup: string[] = [];

  after(async () => {
    try {
      for (const tenantId of tenantsToCleanup) {
        await cleanupTenant(admin, tenantId);
      }
    } finally {
      await admin?.$disconnect();
      const { prisma } = await import("../src/database/prisma.js");
      await prisma.$disconnect();
    }
  });

  async function seedOrg(tag: string) {
    const { createPrismaClient } = await import("../src/database/pg-connection.js");
    admin ??= createPrismaClient(connection!);
    const suffix = `${tag}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const tenant = await admin.tenant.create({
      data: {
        name: `Org Agregados ${suffix}`,
        slug: `org-agreg-${suffix}`,
        status: "active",
        modules: ["dashboard", "commissions", "finance"],
      },
    });
    tenantsToCleanup.push(tenant.id);
    const mkUser = async (label: string) =>
      admin.user.create({
        data: {
          tenant_id: tenant.id,
          name: `${label} ${suffix}`,
          email: `${label}-${suffix}@example.com`,
          status: "active",
        },
      });
    const adminUser = await mkUser("admin");
    const financeUser = await mkUser("finance");
    const payeeA = await mkUser("payeeA");
    const payeeB = await mkUser("payeeB");
    const payeeNoRule = await mkUser("payeeNoRule");
    return {
      tenantId: tenant.id as string,
      adminUser,
      financeUser,
      payeeA,
      payeeB,
      payeeNoRule,
    };
  }

  test("[R17/R18/M18/M53/M55] GET /commissions/overview soma no banco toReceiveCents, forecastCents, paidInPeriodCents, paidThisMonthCents, contagens (noRule, review, rejected), byMonth, byServiceType, topPayees e variação, excluindo reversed, rejected e linhas fora da classe COMISSÃO", async () => {
    const { tenantId, adminUser, financeUser, payeeA, payeeB, payeeNoRule } = await seedOrg("ov1");
    await withPrismaHttpServer(async (baseUrl) => {
      // Define regra para payeeA (10%) e payeeB (fixo R$ 50,00)
      await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeA.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra 10% payeeA",
          expectedRuleId: null,
        }),
      });
      await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeB.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "fixed",
          rateValue: "50.00",
          reason: "Regra fixa R$ 50 payeeB",
          expectedRuleId: null,
        }),
      });

      const [policy] = (await admin.$queryRawUnsafe(
        `SELECT id FROM commission_policies WHERE tenant_id = $1::uuid AND scope = 'engine'`,
        tenantId,
      )) as Array<{ id: string }>;
      assert.ok(policy?.id);

      const svcIdA = randomUUID();
      const svcIdB = randomUUID();
      const now = new Date();

      const insertCalc = async (input: {
        id?: string;
        payeeId: string;
        amount: string;
        status: string;
        key: string;
        settledAt?: Date | null;
        createdAt?: Date;
        snapshot?: Record<string, unknown>;
        eventStatus?: string;
      }) => {
        const evtId = randomUUID();
        const calcId = input.id ?? randomUUID();
        const createdAt = input.createdAt ?? now;
        await admin.$executeRawUnsafe(
          `INSERT INTO commission_basis_events (id, tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id, created_at)
           VALUES ($1::uuid, $2::uuid, 'work_order', $3, 'engine.work_order.completed', $4, '{}'::jsonb, $5, $6, $7::uuid, $5)`,
          evtId,
          tenantId,
          randomUUID(),
          `evt:${calcId}`,
          createdAt,
          input.eventStatus ?? "eligible",
          policy.id,
        );
        await admin.$executeRawUnsafe(
          `INSERT INTO commission_calculations (id, tenant_id, basis_event_id, policy_id, eligible_user_id, payee_id, amount, currency, status, calculation_snapshot, idempotency_key, settled_at, settlement_ref, created_at, updated_at)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $5::uuid, $6::numeric, 'BRL', $7, $8::jsonb, $9, $10, $11, $12, $12)`,
          calcId,
          tenantId,
          evtId,
          policy.id,
          input.payeeId,
          input.amount,
          input.status,
          JSON.stringify(input.snapshot ?? {}),
          input.key,
          input.settledAt ?? null,
          input.settledAt ? randomUUID() : null,
          createdAt,
        );
        return calcId;
      };

      // 1. A receber (approved, settled_at null): R$ 100,00 (payeeA, svcIdA) + R$ 40,00 legado (payeeA, svcIdA) = R$ 140,00 ("14000")
      await insertCalc({
        payeeId: payeeA.id,
        amount: "100.00",
        status: "approved",
        key: `engine:calc:${randomUUID()}`,
        snapshot: { workOrderCode: "OS-101", serviceCatalogId: svcIdA, baseCents: 100000, rateType: "percent", rateValue: "10", outcome: "calculated" },
      });
      await insertCalc({
        payeeId: payeeA.id,
        amount: "40.00",
        status: "approved",
        key: `legado-a-receber-${randomUUID()}`,
        snapshot: { workOrderCode: "OS-102", serviceCatalogId: svcIdA, baseCents: 40000, rateType: "percent", rateValue: "10", outcome: "calculated" },
      });

      // 2. Prevista (calculated, settled_at null): R$ 50,00 (payeeB, svcIdB) -> "5000"
      await insertCalc({
        payeeId: payeeB.id,
        amount: "50.00",
        status: "calculated",
        key: `engine:calc:${randomUUID()}`,
        snapshot: { workOrderCode: "OS-103", serviceCatalogId: svcIdB, baseCents: 20000, rateType: "fixed", rateValue: "50.00", outcome: "calculated" },
      });

      // 3. Paga neste mês (approved, settled_at = now): R$ 75,00 (payeeB, svcIdB) -> "7500"
      await insertCalc({
        payeeId: payeeB.id,
        amount: "75.00",
        status: "approved",
        settledAt: now,
        key: `engine:calc:${randomUUID()}`,
        snapshot: { workOrderCode: "OS-104", serviceCatalogId: svcIdB, baseCents: 30000, rateType: "fixed", rateValue: "75.00", outcome: "calculated" },
      });

      // 4. Sem regra (no_rule, amount = 0.00): 1 linha para payeeNoRule
      await insertCalc({
        payeeId: payeeNoRule.id,
        amount: "0.00",
        status: "calculated",
        key: `engine:calc:${randomUUID()}`,
        snapshot: { workOrderCode: "OS-105", serviceCatalogId: null, baseCents: 15000, rateType: null, rateValue: null, outcome: "no_rule" },
      });

      // 5. Substituída (reversed, R$ 999,00) e reprovada (rejected, R$ 888,00): NÃO entram nos totais (M18), e rejected conta 1 em rejectedCount
      await insertCalc({
        payeeId: payeeA.id,
        amount: "999.00",
        status: "reversed",
        key: `engine:calc:${randomUUID()}`,
        snapshot: { workOrderCode: "OS-REV", serviceCatalogId: svcIdA, outcome: "calculated" },
      });
      await insertCalc({
        payeeId: payeeA.id,
        amount: "888.00",
        status: "rejected",
        key: `engine:calc:${randomUUID()}`,
        snapshot: { workOrderCode: "OS-REJ", serviceCatalogId: svcIdA, outcome: "calculated" },
      });

      // 6. Linhas de AJUSTE (engine:adj:...) aprovada (R$ 20,00) e baixada/rejected (R$ 15,00): NÃO entram em toReceiveCents (M53) nem em rejectedCount (M55)
      await insertCalc({
        payeeId: payeeA.id,
        amount: "20.00",
        status: "approved",
        key: `engine:adj:${randomUUID()}:1`,
        snapshot: { kind: "adjustment", direction: "debit" },
      });
      await insertCalc({
        payeeId: payeeA.id,
        amount: "15.00",
        status: "rejected",
        key: `engine:adj:${randomUUID()}:2`,
        snapshot: { kind: "adjustment", direction: "debit" },
      });

      // 7. Um evento em revisão (pending_review) sem cálculo -> reviewCount = 1
      await admin.$executeRawUnsafe(
        `INSERT INTO commission_basis_events (id, tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id)
         VALUES ($1::uuid, $2::uuid, 'work_order', $3, 'engine.work_order.completed', $4, '{"reason":"missing_payee"}'::jsonb, now(), 'pending_review', $5::uuid)`,
        randomUUID(),
        tenantId,
        randomUUID(),
        `engine:wo:${randomUUID()}:v1`,
        policy.id,
      );

      const res = await fetch(`${baseUrl}/api/v1/commissions/overview`, {
        headers: authHeaders(tenantId, financeUser.id, "finance"),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as any;
      const data = body.data;
      assert.ok(data);

      assert.equal(data.toReceiveCents, "14000", "toReceiveCents soma só COMISSÃO approved não paga (100 + 40 = 140,00; exclui ajuste M53)");
      assert.equal(data.forecastCents, "5000", "forecastCents soma COMISSÃO calculated não paga (50,00)");
      assert.equal(data.paidInPeriodCents, "7500", "paidInPeriodCents soma COMISSÃO paga (75,00)");
      assert.equal(data.paidThisMonthCents, "7500", "paidThisMonthCents soma COMISSÃO paga no mês de SP (75,00)");
      assert.equal(data.noRuleCount, 1, "1 comissão com outcome no_rule");
      assert.equal(data.reviewCount, 1, "1 evento pending_review");
      assert.equal(data.rejectedCount, 1, "1 comissão rejected (ajuste baixado não conta como reprovada, M55)");

      assert.ok(Array.isArray(data.byMonth));
      assert.equal(data.byMonth.length, 12, "byMonth traz 12 meses");

      assert.ok(Array.isArray(data.byServiceType));
      const bySvc = new Map<string | null, { totalCents: string; count: number }>(
        data.byServiceType.map((s: any) => [s.serviceCatalogId, { totalCents: s.totalCents, count: s.count }]),
      );
      assert.deepEqual(bySvc.get(svcIdA), { totalCents: "14000", count: 2 });
      assert.deepEqual(bySvc.get(svcIdB), { totalCents: "12500", count: 2 });

      assert.ok(Array.isArray(data.topPayees));
      const topA = data.topPayees.find((p: any) => p.payeeId === payeeA.id);
      const topB = data.topPayees.find((p: any) => p.payeeId === payeeB.id);
      assert.equal(topA?.totalCents, "14000");
      assert.equal(topB?.totalCents, "12500");
      assert.match(String(data.changeCents), /^[0-9]+$/);
      assert.ok(["up", "down", "flat"].includes(data.changeDirection));
    });
  });

  test("[R17/M19] corte de mês em America/Sao_Paulo (fuso-sp): pagamento às 23:30 de São Paulo do último dia do mês (02:30 UTC do dia 1º seguinte) cai no mês de São Paulo em byMonth, paidThisMonthCents e no filtro ?month=YYYY-MM", async () => {
    const { tenantId, adminUser, financeUser, payeeA } = await seedOrg("fuso-sp");
    await withPrismaHttpServer(async (baseUrl) => {
      await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeA.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra para teste de fuso SP",
          expectedRuleId: null,
        }),
      });

      const [policy] = (await admin.$queryRawUnsafe(
        `SELECT id FROM commission_policies WHERE tenant_id = $1::uuid AND scope = 'engine'`,
        tenantId,
      )) as Array<{ id: string }>;

      // 2026-05-31 23:30:00 America/Sao_Paulo (-03:00) = 2026-06-01T02:30:00.000Z (em UTC já é junho; em SP ainda é maio!)
      const may31At2330Sp = new Date("2026-06-01T02:30:00.000Z");
      const evtId = randomUUID();
      const calcId = randomUUID();
      await admin.$executeRawUnsafe(
        `INSERT INTO commission_basis_events (id, tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id, created_at)
         VALUES ($1::uuid, $2::uuid, 'work_order', $3, 'engine.work_order.completed', $4, '{}'::jsonb, $5, 'eligible', $6::uuid, $5)`,
        evtId,
        tenantId,
        randomUUID(),
        `engine:wo:${randomUUID()}:v1`,
        may31At2330Sp,
        policy.id,
      );
      await admin.$executeRawUnsafe(
        `INSERT INTO commission_calculations (id, tenant_id, basis_event_id, policy_id, eligible_user_id, payee_id, amount, currency, status, calculation_snapshot, idempotency_key, settled_at, settlement_ref, created_at, updated_at)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $5::uuid, 64.00, 'BRL', 'approved', '{"workOrderCode":"OS-SP-2330","outcome":"calculated"}'::jsonb, $6, $7, $8, $7, $7)`,
        calcId,
        tenantId,
        evtId,
        policy.id,
        payeeA.id,
        `engine:calc:${evtId}`,
        may31At2330Sp,
        randomUUID(),
      );

      // Consulta overview com to=2026-06-15T12:00:00.000Z (mês de referência em SP = 2026-06)
      const ovRes = await fetch(`${baseUrl}/api/v1/commissions/overview?to=2026-06-15T12:00:00.000Z`, {
        headers: authHeaders(tenantId, financeUser.id, "finance"),
      });
      const ovBody = (await ovRes.json()) as any;
      assert.equal(ovRes.status, 200, JSON.stringify(ovBody));
      const ovData = ovBody.data;
      const mayBucket = ovData.byMonth.find((m: any) => m.month === "2026-05");
      const junBucket = ovData.byMonth.find((m: any) => m.month === "2026-06");
      assert.equal(mayBucket?.paidCents, "6400", "23:30 SP de 31/05 cai em 2026-05 no fuso de São Paulo (M19)");
      assert.equal(mayBucket?.calculatedCents, "6400");
      assert.equal(junBucket?.paidCents, "0", "não cai em 2026-06 (seria 6400 se usasse UTC)");
      assert.equal(ovData.paidThisMonthCents, "0", "em junho de SP, o pagamento de 31/05 23:30 SP não entra em paidThisMonthCents");

      // Filtro ?month=2026-05 em /commissions/calculations encontra a linha; ?month=2026-06 devolve 0
      const listMay = await fetch(`${baseUrl}/api/v1/commissions/calculations?month=2026-05`, {
        headers: authHeaders(tenantId, financeUser.id, "finance"),
      });
      assert.equal(listMay.status, 200);
      const mayItems = ((await listMay.json()) as any).items;
      assert.equal(mayItems.length, 1);
      assert.equal(mayItems[0]?.id, calcId);

      const listJun = await fetch(`${baseUrl}/api/v1/commissions/calculations?month=2026-06`, {
        headers: authHeaders(tenantId, financeUser.id, "finance"),
      });
      assert.equal(listJun.status, 200);
      const junItems = ((await listJun.json()) as any).items;
      assert.equal(junItems.length, 0);
    });
  });

  test("[R15/R18/M10] GET /commissions/payees (com bucket e serviceCatalogId), /payees/:userId/overview e /mine/overview devolvem os agregados por pessoa e /mine/overview ignora payee_id", async () => {
    const { tenantId, adminUser, financeUser, payeeA, payeeB } = await seedOrg("payees-ov");
    await withPrismaHttpServer(async (baseUrl) => {
      await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeA.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "15",
          reason: "Taxa 15% payeeA",
          expectedRuleId: null,
        }),
      });

      const [policy] = (await admin.$queryRawUnsafe(
        `SELECT id FROM commission_policies WHERE tenant_id = $1::uuid AND scope = 'engine'`,
        tenantId,
      )) as Array<{ id: string }>;

      const svcA = randomUUID();
      const now = new Date();

      // Semeia 1 a receber para payeeA (R$ 90,00) e 1 prevista para payeeB (R$ 45,00)
      for (const item of [
        { payeeId: payeeA.id, amount: "90.00", status: "approved", code: "OS-PA-1", svc: svcA },
        { payeeId: payeeB.id, amount: "45.00", status: "calculated", code: "OS-PB-1", svc: null },
      ]) {
        const evtId = randomUUID();
        const calcId = randomUUID();
        await admin.$executeRawUnsafe(
          `INSERT INTO commission_basis_events (id, tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id, created_at)
           VALUES ($1::uuid, $2::uuid, 'work_order', $3, 'engine.work_order.completed', $4, '{}'::jsonb, $5, 'eligible', $6::uuid, $5)`,
          evtId,
          tenantId,
          randomUUID(),
          `engine:wo:${randomUUID()}:v1`,
          now,
          policy.id,
        );
        await admin.$executeRawUnsafe(
          `INSERT INTO commission_calculations (id, tenant_id, basis_event_id, policy_id, eligible_user_id, payee_id, amount, currency, status, calculation_snapshot, idempotency_key, created_at, updated_at)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $5::uuid, $6::numeric, 'BRL', $7, $8::jsonb, $9, $10, $10)`,
          calcId,
          tenantId,
          evtId,
          policy.id,
          item.payeeId,
          item.amount,
          item.status,
          JSON.stringify({ workOrderCode: item.code, serviceCatalogId: item.svc, baseCents: 60000, rateType: "percent", rateValue: "15", outcome: "calculated" }),
          `engine:calc:${evtId}`,
          now,
        );
      }

      // GET /commissions/payees?bucket=to_receive -> só payeeA
      const toRecRes = await fetch(`${baseUrl}/api/v1/commissions/payees?bucket=to_receive`, {
        headers: authHeaders(tenantId, financeUser.id, "finance"),
      });
      assert.equal(toRecRes.status, 200);
      const toRecBody = (await toRecRes.json()) as any;
      assert.equal(toRecBody.items.length, 1);
      assert.equal(toRecBody.items[0]?.payeeId, payeeA.id);
      assert.equal(toRecBody.items[0]?.toReceiveCents, "9000");
      assert.equal(toRecBody.items[0]?.currentRate?.rateValue, "15");

      // GET /commissions/payees?bucket=forecast -> só payeeB
      const forecastRes = await fetch(`${baseUrl}/api/v1/commissions/payees?bucket=forecast`, {
        headers: authHeaders(tenantId, financeUser.id, "finance"),
      });
      assert.equal(forecastRes.status, 200);
      const forecastBody = (await forecastRes.json()) as any;
      assert.equal(forecastBody.items.length, 1);
      assert.equal(forecastBody.items[0]?.payeeId, payeeB.id);
      assert.equal(forecastBody.items[0]?.forecastCents, "4500");

      // GET /commissions/payees/:userId/overview?months=3
      const detailRes = await fetch(`${baseUrl}/api/v1/commissions/payees/${payeeA.id}/overview?months=3`, {
        headers: authHeaders(tenantId, financeUser.id, "finance"),
      });
      assert.equal(detailRes.status, 200);
      const detailData = ((await detailRes.json()) as any).data;
      assert.equal(detailData.payeeId, payeeA.id);
      assert.equal(detailData.toReceiveCents, "9000");
      assert.equal(detailData.byMonth.length, 3);
      assert.equal(detailData.recentCalculations.length, 1);
      assert.equal(detailData.recentCalculations[0]?.workOrderCode, "OS-PA-1");
      assert.equal(detailData.recentCalculations[0]?.baseCents, "60000");

      // GET /commissions/mine/overview?payee_id=<payeeB> com ator payeeA -> ignora payee_id e devolve payeeA (M10)
      const mineRes = await fetch(`${baseUrl}/api/v1/commissions/mine/overview?months=6&payee_id=${payeeB.id}&payeeId=${payeeB.id}`, {
        headers: authHeaders(tenantId, payeeA.id, "operator"),
      });
      assert.equal(mineRes.status, 200);
      const mineData = ((await mineRes.json()) as any).data;
      assert.equal(mineData.payeeId, payeeA.id, "/mine/overview fixa o favorecido no ator logado e ignora payee_id (M10)");
      assert.equal(mineData.toReceiveCents, "9000");
      assert.equal(mineData.byMonth.length, 6);
    });
  });
}

async function withPrismaHttpServer(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  const [{ createApp }, { createCoreSaasService }, { resetCommissionRuntimeForTests }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/index.js"),
    import("../src/modules/commissions/index.js"),
  ]);
  resetCommissionRuntimeForTests();
  const coreSaas = await createCoreSaasService();
  const app = createApp(coreSaas);
  const server: Server = app.listen(0);
  const address = await new Promise<AddressInfo>((resolve) => {
    server.once("listening", () => resolve(server.address() as AddressInfo));
  });
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await callback(baseUrl);
  } finally {
    resetCommissionRuntimeForTests();
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

function authHeaders(tenantId: string, userId: string, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": role,
  };
}

function jsonHeaders(tenantId: string, userId: string, role: string): Record<string, string> {
  return {
    ...authHeaders(tenantId, userId, role),
    "content-type": "application/json",
  };
}

async function cleanupTenant(client: any, tenantId: string): Promise<void> {
  if (!client) return;
  await client.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM commission_calculations WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM commission_basis_events WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM commission_policy_rules WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM commission_policies WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM work_order_financial_items WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM operator_profiles WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1::uuid`, tenantId);
  });
}
