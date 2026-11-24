import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after } from "node:test";

const rawConnection = process.env.DATABASE_URL;

if (!rawConnection) {
  test("b-comissao-motor-liberacao-db exige DATABASE_URL", {
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

  async function ensureClient() {
    if (!admin) {
      const { createPrismaClient } = await import("../src/database/pg-connection.js");
      admin = createPrismaClient(rawConnection!);
    }
  }

  async function seedOrg(tag: string) {
    await ensureClient();
    const suffix = `${tag}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const tenant = await admin.tenant.create({
      data: {
        name: `Org Liberacao ${suffix}`,
        slug: `org-liberacao-${suffix}`,
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
    const payeeUser = await mkUser("payee");
    const profile = await admin.operatorProfile.create({
      data: {
        tenant_id: tenant.id,
        user_id: payeeUser.id,
        full_name: `Guincheiro ${suffix}`,
        is_active: true,
      },
    });
    return { tenantId: tenant.id as string, adminUser, financeUser, payeeUser, operatorProfileId: profile.id as string };
  }

  async function seedWorkOrder(input: {
    tenantId: string;
    assignedUserId: string;
    completedAt?: Date;
    items: ReadonlyArray<{ totalAmount: string }>;
  }) {
    const code = `OS-LIB-${randomUUID().slice(0, 8)}`;
    const wo = await admin.workOrder.create({
      data: {
        tenant_id: input.tenantId,
        code,
        title: `Serviço ${code}`,
        status: "completed",
        assigned_user_id: input.assignedUserId,
        completed_at: input.completedAt ?? new Date(Date.now() + 1000),
      },
    });
    for (const item of input.items) {
      await admin.$executeRawUnsafe(
        `INSERT INTO work_order_financial_items (tenant_id, work_order_id, description, quantity, unit_amount, total_amount, currency, source)
         VALUES ($1::uuid, $2::uuid, 'Item de serviço', 1, $3::numeric, $3::numeric, 'BRL', 'manual')`,
        input.tenantId,
        wo.id,
        item.totalAmount,
      );
    }
    return wo;
  }

  async function seedOperationalApproval(input: {
    tenantId: string;
    workOrderId: string;
    requestedByUserId: string;
    decidedByUserId?: string;
    status: "pending_approval" | "approved" | "rejected";
  }) {
    const decidedAt = input.status === "pending_approval" ? null : new Date();
    const decidedBy = input.status === "pending_approval" ? null : input.decidedByUserId!;
    const rejectionReason = input.status === "rejected" ? "Validação da OS reprovada em teste" : null;
    await admin.operationalApproval.create({
      data: {
        tenant_id: input.tenantId,
        entity_type: "work_order",
        entity_id: input.workOrderId,
        work_order_id: input.workOrderId,
        status: input.status,
        requested_by_user_id: input.requestedByUserId,
        pending_reason: "Validação de conclusão da OS",
        decided_by_user_id: decidedBy,
        decided_at: decidedAt,
        rejection_reason: rejectionReason,
      },
    });
  }

  test("[R7/M14] Passo 2 (liberar): no modo on_validation nasce calculated; validação pendente continua prevista (calculated); aprovada libera (approved); reprovada vira rejected", async () => {
    const { tenantId, adminUser, payeeUser } = await seedOrg("passo2-libera");
    await withPrismaHttpServer(async (baseUrl) => {
      await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra 10% para teste de liberação",
          expectedRuleId: null,
        }),
      });

      const woPending = await seedWorkOrder({ tenantId, assignedUserId: payeeUser.id, items: [{ totalAmount: "100.00" }] });
      const woApproved = await seedWorkOrder({ tenantId, assignedUserId: payeeUser.id, items: [{ totalAmount: "200.00" }] });
      const woRejected = await seedWorkOrder({ tenantId, assignedUserId: payeeUser.id, items: [{ totalAmount: "300.00" }] });

      await seedOperationalApproval({
        tenantId,
        workOrderId: woPending.id,
        requestedByUserId: payeeUser.id,
        status: "pending_approval",
      });

      // 1ª varredura: nascem os 3 cálculos em calculated; nenhum ainda tem aprovação decidida
      const rec1 = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.equal(rec1.status, 200);
      const counts1 = ((await rec1.json()) as any).data;
      assert.deepEqual(counts1, { created: 3, released: 0, recalculated: 0, skipped: 0 });

      // Agora decidimos woApproved como approved e woRejected como rejected; woPending continua pending_approval
      await seedOperationalApproval({
        tenantId,
        workOrderId: woApproved.id,
        requestedByUserId: payeeUser.id,
        decidedByUserId: adminUser.id,
        status: "approved",
      });
      await seedOperationalApproval({
        tenantId,
        workOrderId: woRejected.id,
        requestedByUserId: payeeUser.id,
        decidedByUserId: adminUser.id,
        status: "rejected",
      });

      // 2ª varredura: passo 2 libera woApproved (approved) e reprova woRejected (rejected); woPending continua calculated (M14)
      const rec2 = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.equal(rec2.status, 200);
      const counts2 = ((await rec2.json()) as any).data;
      assert.equal(counts2.created, 0);
      assert.equal(counts2.released, 1, "apenas a comissão com validação approved conta como released");

      const calcs = (await admin.$queryRawUnsafe(
        `SELECT status, (calculation_snapshot->>'workOrderId') AS "woId" FROM commission_calculations WHERE tenant_id = $1::uuid`,
        tenantId,
      )) as Array<{ status: string; woId: string }>;
      const statusByWo = new Map(calcs.map((c) => [c.woId, c.status]));
      assert.equal(statusByWo.get(woPending.id), "calculated", "pendente continua prevista (M14)");
      assert.equal(statusByWo.get(woApproved.id), "approved", "aprovada vira approved");
      assert.equal(statusByWo.get(woRejected.id), "rejected", "reprovada vira rejected");
    });
  });

  test("[R7] no modo COMMISSION_RELEASE_MODE=on_completion, o cálculo já nasce approved", async () => {
    const { tenantId, adminUser, payeeUser } = await seedOrg("on-completion");
    const { env } = await import("../src/config/env.js");
    const prevMode = env.COMMISSION_RELEASE_MODE;
    (env as { COMMISSION_RELEASE_MODE: "on_validation" | "on_completion" }).COMMISSION_RELEASE_MODE = "on_completion";
    try {
      await withPrismaHttpServer(async (baseUrl) => {
        await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeUser.id}`, {
          method: "PUT",
          headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
          body: JSON.stringify({
            rateType: "percent",
            rateValue: "10",
            reason: "Regra 10% modo on_completion",
            expectedRuleId: null,
          }),
        });
        const wo = await seedWorkOrder({ tenantId, assignedUserId: payeeUser.id, items: [{ totalAmount: "150.00" }] });
        const rec = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
          method: "POST",
          headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        });
        assert.equal(((await rec.json()) as any).data.created, 1);
        const [calc] = (await admin.$queryRawUnsafe(
          `SELECT status FROM commission_calculations WHERE tenant_id = $1::uuid AND (calculation_snapshot->>'workOrderId') = $2`,
          tenantId,
          wo.id,
        )) as Array<{ status: string }>;
        assert.equal(calc?.status, "approved");
      });
    } finally {
      (env as { COMMISSION_RELEASE_MODE: "on_validation" | "on_completion" }).COMMISSION_RELEASE_MODE = prevMode;
    }
  });

  test("[R10a/M5/M17/M18] Passo 3 (conferir a base antes de pagar): base mudou em cálculo não pago -> evento antigo vira superseded, cálculo antigo vira reversed, nasce v2 com a mesma regra da conclusão; depois de recalcular há 1 evento vivo e 1 cálculo principal vivo por OS; cálculo pago fica intacto; total não soma substituída nem reprovada", async () => {
    const { tenantId, adminUser, financeUser, payeeUser } = await seedOrg("passo3-recalc");
    await withPrismaHttpServer(async (baseUrl) => {
      // Regra inicial de 10%
      const put1 = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra 10% na época da conclusão",
          expectedRuleId: null,
        }),
      });
      const r1Id = ((await put1.json()) as any).data.ruleId as string;

      const completedUnpaidAt = new Date(Date.now() + 500);
      const completedPaidAt = new Date(Date.now() + 600);
      const woUnpaid = await seedWorkOrder({
        tenantId,
        assignedUserId: payeeUser.id,
        completedAt: completedUnpaidAt,
        items: [{ totalAmount: "200.00" }],
      });
      const woPaid = await seedWorkOrder({
        tenantId,
        assignedUserId: payeeUser.id,
        completedAt: completedPaidAt,
        items: [{ totalAmount: "500.00" }],
      });

      await seedOperationalApproval({
        tenantId,
        workOrderId: woPaid.id,
        requestedByUserId: payeeUser.id,
        decidedByUserId: adminUser.id,
        status: "approved",
      });

      // 1ª varredura: cria v1 para woUnpaid (R$ 20,00 calculated) e woPaid (R$ 50,00 -> liberada como approved)
      const rec1 = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.equal(rec1.status, 200);

      // Liquida woPaid (R$ 50,00)
      const [paidCalcBefore] = (await admin.$queryRawUnsafe(
        `SELECT id FROM commission_calculations WHERE tenant_id = $1::uuid AND (calculation_snapshot->>'workOrderId') = $2`,
        tenantId,
        woPaid.id,
      )) as Array<{ id: string }>;
      assert.ok(paidCalcBefore?.id);

      const settleRes = await fetch(`${baseUrl}/api/v1/commissions/settlements`, {
        method: "POST",
        headers: jsonHeaders(tenantId, financeUser.id, "finance"),
        body: JSON.stringify({ calculationIds: [paidCalcBefore.id] }),
      });
      assert.equal(settleRes.status, 200);
      assert.equal(((await settleRes.json()) as any).data.settledCount, 1);

      // Troca a regra da pessoa DEPOIS da conclusão para 50% (o recálculo de woUnpaid tem de continuar usando 10%, a regra vigente na conclusão!)
      await new Promise((r) => setTimeout(r, 1500));
      const put2 = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "50",
          reason: "Regra nova 50% depois da conclusão",
          expectedRuleId: r1Id,
        }),
      });
      assert.equal(put2.status, 200);

      // Agora edita os itens das duas OS: woUnpaid vai de R$ 200,00 para R$ 350,00; woPaid vai de R$ 500,00 para R$ 800,00
      await admin.$executeRawUnsafe(
        `UPDATE work_order_financial_items SET unit_amount = 350.00, total_amount = 350.00 WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid`,
        tenantId,
        woUnpaid.id,
      );
      await admin.$executeRawUnsafe(
        `UPDATE work_order_financial_items SET unit_amount = 800.00, total_amount = 800.00 WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid`,
        tenantId,
        woPaid.id,
      );

      // 2ª varredura: recalcula woUnpaid (recalculated = 1) e NÃO mexe em woPaid porque settled_at IS NOT NULL (M17 no PR1)
      const rec2 = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.equal(rec2.status, 200);
      const counts2 = ((await rec2.json()) as any).data;
      assert.equal(counts2.recalculated, 1, "exatamente 1 cálculo não pago recalculado");
      assert.equal(counts2.created, 0);

      // M5: depois de recalcular há exatamente 1 evento vivo e 1 cálculo principal vivo para woUnpaid
      const unpaidEvents = (await admin.$queryRawUnsafe(
        `SELECT idempotency_key, status FROM commission_basis_events WHERE tenant_id = $1::uuid AND source_id = $2 ORDER BY created_at ASC`,
        tenantId,
        woUnpaid.id,
      )) as Array<{ idempotency_key: string; status: string }>;
      assert.equal(unpaidEvents.length, 2);
      assert.equal(unpaidEvents[0]!.idempotency_key, `engine:wo:${woUnpaid.id}:v1`);
      assert.equal(unpaidEvents[0]!.status, "superseded", "evento antigo vira superseded (M5)");
      assert.equal(unpaidEvents[1]!.idempotency_key, `engine:wo:${woUnpaid.id}:v2`);
      assert.notEqual(unpaidEvents[1]!.status, "superseded");

      const unpaidCalcs = (await admin.$queryRawUnsafe(
        `SELECT amount::text AS amount, status, calculation_snapshot AS snap FROM commission_calculations WHERE tenant_id = $1::uuid AND (calculation_snapshot->>'workOrderId') = $2 ORDER BY created_at ASC`,
        tenantId,
        woUnpaid.id,
      )) as Array<{ amount: string; status: string; snap: Record<string, unknown> }>;
      assert.equal(unpaidCalcs.length, 2);
      assert.equal(unpaidCalcs[0]!.status, "reversed", "cálculo antigo vira reversed");
      assert.equal(Number(unpaidCalcs[0]!.amount), 20);
      assert.equal(unpaidCalcs[1]!.status, "calculated");
      // 10% (vigente na conclusão) de R$ 350,00 = R$ 35,00 (e não 50%!)
      assert.equal(Number(unpaidCalcs[1]!.amount), 35);
      assert.equal(unpaidCalcs[1]!.snap.baseCents, 35000);
      assert.equal(unpaidCalcs[1]!.snap.amountCents, 3500);

      // M17 (PR1): o cálculo pago de woPaid continua intacto (approved, settled_at preenchido, R$ 50,00, 1 linha só)
      const paidCalcs = (await admin.$queryRawUnsafe(
        `SELECT amount::text AS amount, status, settled_at FROM commission_calculations WHERE tenant_id = $1::uuid AND (calculation_snapshot->>'workOrderId') = $2`,
        tenantId,
        woPaid.id,
      )) as Array<{ amount: string; status: string; settled_at: Date | null }>;
      assert.equal(paidCalcs.length, 1, "base mudou depois de pago -> cálculo pago fica intacto no PR1 (M17)");
      assert.equal(paidCalcs[0]!.status, "approved");
      assert.ok(paidCalcs[0]!.settled_at !== null);
      assert.equal(Number(paidCalcs[0]!.amount), 50);

      // M18: o resumo não soma o cálculo substituído (reversed de R$ 20,00); soma só R$ 35,00 + R$ 50,00 = R$ 85,00 (8500 centavos)
      const summaryRes = await fetch(`${baseUrl}/api/v1/commissions/statements/summary`, {
        headers: authHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.equal(summaryRes.status, 200);
      const summaryData = ((await summaryRes.json()) as any).data;
      assert.equal(summaryData.total, 85, "total não soma substituída (M18)");
      assert.equal(summaryData.totalCents, "8500");
      assert.equal(summaryData.items[0]?.count, 2);
    });
  });

  test("[R8/M15/M16] liquidação só paga approved e elegível no gate: calculada, reprovada e substituída devolvem not_released; OS que deixou de ser elegível devolve blocked; nenhuma credita no extrato", async () => {
    const { tenantId, adminUser, financeUser, payeeUser } = await seedOrg("settle-guards");
    await withPrismaHttpServer(async (baseUrl) => {
      await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra 10% para guardas da liquidação",
          expectedRuleId: null,
        }),
      });

      const woCalc = await seedWorkOrder({ tenantId, assignedUserId: payeeUser.id, items: [{ totalAmount: "100.00" }] });
      const woRej = await seedWorkOrder({ tenantId, assignedUserId: payeeUser.id, items: [{ totalAmount: "200.00" }] });
      const woBlocked = await seedWorkOrder({ tenantId, assignedUserId: payeeUser.id, items: [{ totalAmount: "300.00" }] });

      await seedOperationalApproval({
        tenantId,
        workOrderId: woRej.id,
        requestedByUserId: payeeUser.id,
        decidedByUserId: adminUser.id,
        status: "rejected",
      });
      await seedOperationalApproval({
        tenantId,
        workOrderId: woBlocked.id,
        requestedByUserId: payeeUser.id,
        decidedByUserId: adminUser.id,
        status: "approved",
      });

      // Varredura cria os 3 e aplica as aprovações
      await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });

      // Nota da M16 (plano §6.4): escreve direto no banco descartável que woBlocked passou a cancelada com decisão "zero"
      await admin.$executeRawUnsafe(
        `UPDATE work_orders SET status = 'cancelled', financial_cancellation_decision = 'zero' WHERE tenant_id = $1::uuid AND id = $2::uuid`,
        tenantId,
        woBlocked.id,
      );

      const rows = (await admin.$queryRawUnsafe(
        `SELECT id, (calculation_snapshot->>'workOrderId') AS "woId" FROM commission_calculations WHERE tenant_id = $1::uuid`,
        tenantId,
      )) as Array<{ id: string; woId: string }>;
      const calcByWo = new Map(rows.map((r) => [r.woId, r.id]));
      const idCalc = calcByWo.get(woCalc.id)!;
      const idRej = calcByWo.get(woRej.id)!;
      const idBlocked = calcByWo.get(woBlocked.id)!;

      const settleRes = await fetch(`${baseUrl}/api/v1/commissions/settlements`, {
        method: "POST",
        headers: jsonHeaders(tenantId, financeUser.id, "finance"),
        body: JSON.stringify({ calculationIds: [idCalc, idRej, idBlocked] }),
      });
      assert.equal(settleRes.status, 200);
      const settleData = ((await settleRes.json()) as any).data;
      assert.equal(settleData.settledCount, 0);
      assert.equal(settleData.settledTotal, 0);

      const lineById = new Map<string, string>(settleData.lines.map((l: any) => [l.calculationId, l.outcome]));
      assert.equal(lineById.get(idCalc), "not_released", "calculada não é paga (M15)");
      assert.equal(lineById.get(idRej), "not_released", "reprovada não é paga (M15)");
      assert.equal(lineById.get(idBlocked), "blocked", "OS que deixou de ser elegível devolve blocked (M16)");

      const [{ entryCount }] = (await admin.$queryRawUnsafe(
        `SELECT count(*)::int AS "entryCount" FROM professional_statement_entries WHERE tenant_id = $1::uuid`,
        tenantId,
      )) as Array<{ entryCount: number }>;
      assert.equal(entryCount, 0, "nenhum crédito lançado no extrato");
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
    await tx.$executeRawUnsafe(`DELETE FROM professional_statement_entries WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM operational_approvals WHERE tenant_id = $1::uuid`, tenantId);
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
