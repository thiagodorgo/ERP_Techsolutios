import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after } from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  countBlockedStatements,
  withApplicationName,
} from "./helpers/pg-barrier.js";

const rawConnection = process.env.DATABASE_URL;

if (!rawConnection) {
  test("b-comissao-motor-uma-vez-db exige DATABASE_URL", {
    skip: "Defina DATABASE_URL para executar esta suíte.",
  });
} else {
  const applicationName = buildApplicationName("comm-umavez");
  const scopedConnection = withApplicationName(rawConnection, applicationName);
  process.env.DATABASE_URL = scopedConnection;
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  let admin: any;
  let control: any;
  const tenantsToCleanup: string[] = [];

  after(async () => {
    try {
      for (const tenantId of tenantsToCleanup) {
        await cleanupTenant(admin, tenantId);
      }
    } finally {
      await control?.$disconnect();
      await admin?.$disconnect();
      const { prisma } = await import("../src/database/prisma.js");
      await prisma.$disconnect();
    }
  });

  async function ensureClients() {
    if (!admin) {
      const { createPrismaClient } = await import("../src/database/pg-connection.js");
      admin = createPrismaClient(scopedConnection);
      control = createPrismaClient(withApplicationName(rawConnection!, `${applicationName}-ctrl`));
      const { prisma } = await import("../src/database/prisma.js");
      await assertApplicationNamePropagated(prisma as never, applicationName);
    }
  }

  async function seedOrg(tag: string) {
    await ensureClients();
    const suffix = `${tag}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const tenant = await admin.tenant.create({
      data: {
        name: `Org UmaVez ${suffix}`,
        slug: `org-umavez-${suffix}`,
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
    return { tenantId: tenant.id as string, adminUser, financeUser, payeeUser };
  }

  async function seedWorkOrder(input: {
    tenantId: string;
    assignedUserId?: string | null;
    status?: string;
    completedAt?: Date;
    financialDecision?: string | null;
    items?: ReadonlyArray<{ totalAmount: string; currency?: string }>;
  }) {
    const code = `OS-${randomUUID().slice(0, 8)}`;
    const status = input.status ?? "completed";
    const instant = input.completedAt ?? new Date();
    // A OS cancelada não tem conclusão: o instante dela é o do cancelamento (`cancelled_at`), como no produto.
    const wo = await admin.workOrder.create({
      data: {
        tenant_id: input.tenantId,
        code,
        title: `Serviço ${code}`,
        status,
        assigned_user_id: input.assignedUserId ?? null,
        completed_at: status === "cancelled" ? null : instant,
        cancelled_at: status === "cancelled" ? instant : null,
        financial_cancellation_decision: input.financialDecision ?? null,
      },
    });
    for (const item of input.items ?? []) {
      await admin.$executeRawUnsafe(
        `INSERT INTO work_order_financial_items (tenant_id, work_order_id, description, quantity, unit_amount, total_amount, currency, source)
         VALUES ($1::uuid, $2::uuid, 'Item de serviço', 1, $3::numeric, $3::numeric, $4, 'manual')`,
        input.tenantId,
        wo.id,
        item.totalAmount,
        item.currency ?? "BRL",
      );
    }
    return wo;
  }

  test("[R5] sem política engine na organização, a varredura não cria evento nem cálculo", async () => {
    const { tenantId, payeeUser } = await seedOrg("sem-pol");
    await seedWorkOrder({
      tenantId,
      assignedUserId: payeeUser.id,
      items: [{ totalAmount: "200.00" }],
    });
    const { reconcileTenantCommissions } = await import("../src/modules/commissions/commission-reconcile.service.js");
    const counts = await reconcileTenantCommissions(admin, tenantId);
    assert.deepEqual(counts, { created: 0, released: 0, recalculated: 0, skipped: 0 });
  });

  test("[R5/M7] com política engine e sem regra para a pessoa, nasce cálculo de R$ 0,00 com motivo no_rule", async () => {
    const { tenantId, adminUser, payeeUser } = await seedOrg("no-rule");
    const otherUser = await admin.user.create({
      data: {
        tenant_id: tenantId,
        name: "Outro",
        email: `outro-${randomUUID()}@example.com`,
        status: "active",
      },
    });
    await withPrismaHttpServer(async (baseUrl) => {
      // Cria regra apenas para otherUser (isso cria a política engine da organização)
      const putRes = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${otherUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra de outro usuário",
          expectedRuleId: null,
        }),
      });
      assert.equal(putRes.status, 200);

      // OS concluída depois da política para payeeUser (que não tem regra)
      const wo = await seedWorkOrder({
        tenantId,
        assignedUserId: payeeUser.id,
        completedAt: new Date(Date.now() + 1000),
        items: [{ totalAmount: "350.00" }],
      });

      const recRes = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.equal(recRes.status, 200);
      const recData = ((await recRes.json()) as any).data;
      assert.equal(recData.created, 1);

      const calcs = (await admin.$queryRawUnsafe(
        `SELECT amount::text AS amount, status, calculation_snapshot AS snap FROM commission_calculations WHERE tenant_id = $1::uuid AND payee_id = $2::uuid`,
        tenantId,
        payeeUser.id,
      )) as Array<{ amount: string; status: string; snap: Record<string, unknown> }>;
      assert.equal(calcs.length, 1);
      assert.equal(Number(calcs[0]!.amount), 0);
      assert.equal(calcs[0]!.snap.outcome, "no_rule");
      assert.equal(calcs[0]!.snap.workOrderId, wo.id);
      assert.equal(calcs[0]!.snap.baseCents, 35000);
      assert.equal(calcs[0]!.snap.amountCents, 0);
    });
  });

  test("[R3/M4] rodar a varredura duas vezes produz exatamente 1 evento vivo e 1 cálculo por OS; a 2ª volta não toca a OS", async () => {
    const { tenantId, adminUser, payeeUser } = await seedOrg("duas-vezes");
    await withPrismaHttpServer(async (baseUrl) => {
      const put = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra 10% para teste de idempotência",
          expectedRuleId: null,
        }),
      });
      assert.equal(put.status, 200);

      await seedWorkOrder({
        tenantId,
        assignedUserId: payeeUser.id,
        completedAt: new Date(Date.now() + 1000),
        items: [{ totalAmount: "150.00" }, { totalAmount: "50.00" }],
      });

      const first = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.deepEqual(((await first.json()) as any).data, { created: 1, released: 0, recalculated: 0, skipped: 0 });

      // A 2ª volta não pode nem tocar a OS: com o índice, um 2º evento vivo cai com 23505 e a falha é registrada
      // (conta em `skipped`); sem o índice, nasceriam dois. As duas formas reprovam aqui (M4, Emenda 1 §E1.11.3).
      const second = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.deepEqual(((await second.json()) as any).data, { created: 0, released: 0, recalculated: 0, skipped: 0 });

      const [{ eventsCount, calcsCount }] = (await admin.$queryRawUnsafe(
        `SELECT
           (SELECT count(*)::int FROM commission_basis_events WHERE tenant_id = $1::uuid AND status <> 'superseded') AS "eventsCount",
           (SELECT count(*)::int FROM commission_calculations WHERE tenant_id = $1::uuid) AS "calcsCount"`,
        tenantId,
      )) as Array<{ eventsCount: number; calcsCount: number }>;
      assert.equal(eventsCount, 1);
      assert.equal(calcsCount, 1);
    });
  });

  // R3 com as duas transações de fato abertas ao mesmo tempo (plano §6.2). A M5 do plano original (chave do cálculo)
  // foi reescrita pela Emenda 1 §E1.11.3 para o recálculo (F4, liberacao-db); este teste fica como prova do R3.
  test("[R3] 2 execuções simultâneas da varredura sobre a mesma OS esperam na trava da OS e criam exatamente 1 evento e 1 cálculo", async () => {
    const { tenantId, adminUser, payeeUser } = await seedOrg("corrida-varredura");
    await withPrismaHttpServer(async (baseUrl) => {
      await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "fixed",
          rateValue: "85.00",
          reason: "Regra fixa R$ 85,00 para corrida",
          expectedRuleId: null,
        }),
      });

      const wo = await seedWorkOrder({
        tenantId,
        assignedUserId: payeeUser.id,
        completedAt: new Date(Date.now() + 1000),
        items: [{ totalAmount: "500.00" }],
      });

      // Controle segura FOR UPDATE na linha da OS
      let releaseControl!: () => void;
      const controlHold = new Promise<void>((resolve) => {
        releaseControl = resolve;
      });
      let lockTaken!: () => void;
      const lockReady = new Promise<void>((resolve) => {
        lockTaken = resolve;
      });

      const controlTx = control.$transaction(
        async (tx: any) => {
          await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
          await tx.$queryRawUnsafe(
            `SELECT id FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`,
            tenantId,
            wo.id,
          );
          lockTaken();
          await controlHold;
        },
        { timeout: 30_000 },
      );

      await lockReady;

      const { reconcileTenantCommissions } = await import("../src/modules/commissions/commission-reconcile.service.js");
      let r1!: Promise<PromiseSettledResult<{ created: number }>>;
      let r2!: Promise<PromiseSettledResult<{ created: number }>>;
      try {
        r1 = captureSettled(reconcileTenantCommissions(admin, tenantId));
        r2 = captureSettled(reconcileTenantCommissions(admin, tenantId));

        const deadline = Date.now() + 15_000;
        for (;;) {
          const waiting = await countBlockedStatements(control, {
            fragment: "commission_wo_lock",
            applicationName,
          });
          if (waiting >= 2) break;
          if (Date.now() > deadline) {
            assert.fail(`timeout esperando 2 varreduras bloqueadas em commission_wo_lock (atual: ${waiting})`);
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      } finally {
        releaseControl();
        await controlTx;
      }

      const [o1, o2] = await Promise.all([r1, r2]);
      assert.equal(o1.status, "fulfilled");
      assert.equal(o2.status, "fulfilled");
      const v1 = (o1 as { status: "fulfilled"; value: { created: number; skipped: number } }).value;
      const v2 = (o2 as { status: "fulfilled"; value: { created: number; skipped: number } }).value;
      const c1 = v1.created;
      const c2 = v2.created;
      assert.equal(c1 + c2, 1, `apenas 1 das duas varreduras simultâneas deve criar (c1=${c1}, c2=${c2})`);
      // A outra viu a OS na lista, esperou a trava e, sob ela, achou o evento vivo: pulou.
      assert.equal(v1.skipped + v2.skipped, 1, `exatamente 1 das duas pula sob a trava (s1=${v1.skipped}, s2=${v2.skipped})`);

      const [{ eventsCount, calcsCount }] = (await admin.$queryRawUnsafe(
        `SELECT
           (SELECT count(*)::int FROM commission_basis_events WHERE tenant_id = $1::uuid) AS "eventsCount",
           (SELECT count(*)::int FROM commission_calculations WHERE tenant_id = $1::uuid) AS "calcsCount"`,
        tenantId,
      )) as Array<{ eventsCount: number; calcsCount: number }>;
      assert.equal(eventsCount, 1);
      assert.equal(calcsCount, 1);
    });
  });

  test("[R4/M6/M26] evento à mão com payload mentiroso nunca gera cálculo e política da rota antiga nunca paga; o motor cria o evento dele pelo banco", async () => {
    const { tenantId, adminUser, financeUser, payeeUser } = await seedOrg("payload-mentiroso");
    await withPrismaHttpServer(async (baseUrl) => {
      // Política criada pela rota antiga com regra para payeeUser -> não pode pagar (M26)
      const legacyPol = await fetch(`${baseUrl}/api/v1/commissions/policies`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          name: "Política legada",
          scope: "tenant",
          vertical: "field_services",
          status: "active",
          effectiveFrom: new Date(Date.now() - 60_000).toISOString(),
          rules: [
            {
              ruleType: "payee",
              basisType: "work_order_total",
              rateType: "percent",
              rateValue: 90,
              conditions: { payeeUserId: payeeUser.id },
              active: true,
            },
          ],
        }),
      });
      assert.equal(legacyPol.status, 201);

      const wo = await seedWorkOrder({
        tenantId,
        assignedUserId: payeeUser.id,
        completedAt: new Date(Date.now() + 2000),
        items: [{ totalAmount: "100.00" }],
      });

      // Evento criado à mão para a mesma OS com payload mentiroso (baseCents = 9999999)
      const manualEvt = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
        method: "POST",
        headers: jsonHeaders(tenantId, financeUser.id, "finance"),
        body: JSON.stringify({
          sourceType: "work_order",
          sourceId: wo.id,
          sourceEventName: "work_order.completed",
          idempotencyKey: `manual-wo-${wo.id}`,
          payload: { baseCents: 9999999, amount: 99999 },
        }),
      });
      assert.equal(manualEvt.status, 201);

      // Com apenas a política legada, a varredura não cria nada (0 cálculos)
      const recLegacy = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.equal(((await recLegacy.json()) as any).data.created, 0);

      // Agora definimos a regra de 10% no motor
      await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra do motor 10%",
          expectedRuleId: null,
        }),
      });
      // Ajusta effective_from da política engine e da regra para alcançar a OS
      const past = new Date(Date.now() - 60_000);
      await admin.$executeRawUnsafe(
        `UPDATE commission_policies SET effective_from = $2 WHERE tenant_id = $1::uuid AND scope = 'engine'`,
        tenantId,
        past,
      );
      await admin.$executeRawUnsafe(
        `UPDATE commission_policy_rules SET conditions = jsonb_set(conditions, '{effectiveFrom}', to_jsonb($2::text)) WHERE tenant_id = $1::uuid AND rule_type = 'engine_payee'`,
        tenantId,
        past.toISOString(),
      );

      const recEngine = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.equal(((await recEngine.json()) as any).data.created, 1);

      const calcs = (await admin.$queryRawUnsafe(
        `SELECT amount::text AS amount, calculation_snapshot AS snap FROM commission_calculations WHERE tenant_id = $1::uuid`,
        tenantId,
      )) as Array<{ amount: string; snap: Record<string, unknown> }>;
      assert.equal(calcs.length, 1);
      // 10% de R$ 100,00 do banco = R$ 10,00 (1000 centavos), ignorando o payload mentiroso e a política legada de 90%
      assert.equal(Number(calcs[0]!.amount), 10);
      assert.equal(calcs[0]!.snap.baseCents, 10000);
      assert.equal(calcs[0]!.snap.amountCents, 1000);
    });
  });

  test("[R6] OS sem guincheiro, com moeda diferente de BRL ou cancelada com keep / sem decisão", async () => {
    const { tenantId, adminUser, payeeUser } = await seedOrg("casos-r6");
    await withPrismaHttpServer(async (baseUrl) => {
      await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra 10% para casos R6",
          expectedRuleId: null,
        }),
      });

      const afterPolicy = new Date(Date.now() + 1000);
      // 1. OS sem guincheiro -> evento pending_review, 0 cálculo
      const woNoPayee = await seedWorkOrder({
        tenantId,
        assignedUserId: null,
        completedAt: afterPolicy,
        items: [{ totalAmount: "100.00" }],
      });
      // 2. OS com item em USD -> evento pending_review, 0 cálculo
      const woUsd = await seedWorkOrder({
        tenantId,
        assignedUserId: payeeUser.id,
        completedAt: afterPolicy,
        items: [{ totalAmount: "100.00", currency: "USD" }],
      });
      // 3. OS cancelada com decisão keep -> gera evento eligible e cálculo já approved (§3.4 / §3.6)
      const woCancelledKeep = await seedWorkOrder({
        tenantId,
        assignedUserId: payeeUser.id,
        status: "cancelled",
        financialDecision: "keep",
        completedAt: afterPolicy,
        items: [{ totalAmount: "200.00" }],
      });

      const rec = await fetch(`${baseUrl}/api/v1/commissions/reconcile`, {
        method: "POST",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.equal(rec.status, 200);

      const events = (await admin.$queryRawUnsafe(
        `SELECT source_id, status, payload FROM commission_basis_events WHERE tenant_id = $1::uuid`,
        tenantId,
      )) as Array<{ source_id: string; status: string; payload: Record<string, unknown> }>;
      const bySource = new Map(events.map((e) => [e.source_id, e]));
      assert.equal(bySource.get(woNoPayee.id)?.status, "pending_review");
      assert.equal(bySource.get(woUsd.id)?.status, "pending_review");
      assert.ok(["eligible", "processed"].includes(String(bySource.get(woCancelledKeep.id)?.status)));

      const calcs = (await admin.$queryRawUnsafe(
        `SELECT status, amount::text AS amount, calculation_snapshot AS snap FROM commission_calculations WHERE tenant_id = $1::uuid`,
        tenantId,
      )) as Array<{ status: string; amount: string; snap: Record<string, unknown> }>;
      assert.equal(calcs.length, 1);
      assert.equal(calcs[0]!.snap.workOrderId, woCancelledKeep.id);
      assert.equal(calcs[0]!.status, "approved");
      assert.equal(Number(calcs[0]!.amount), 20);
    });
  });

  test("[R20] falha numa OS durante a varredura é registrada e não derruba as outras OS da mesma volta", async () => {
    const { tenantId, adminUser, payeeUser } = await seedOrg("r20-isolamento");
    await withPrismaHttpServer(async (baseUrl) => {
      await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra 10% para teste R20",
          expectedRuleId: null,
        }),
      });

      const t1 = new Date(Date.now() + 1000);
      const t2 = new Date(Date.now() + 2000);
      const woBad = await seedWorkOrder({
        tenantId,
        assignedUserId: payeeUser.id,
        completedAt: t1,
        items: [{ totalAmount: "100.00" }],
      });
      const woGood = await seedWorkOrder({
        tenantId,
        assignedUserId: payeeUser.id,
        completedAt: t2,
        items: [{ totalAmount: "250.00" }],
      });

      const { RlsPrismaCommissionRepository } = await import("../src/modules/commissions/commission-prisma.repository.js");
      const { reconcileTenantCommissionsWithRepository } = await import(
        "../src/modules/commissions/commission-reconcile.service.js"
      );

      const baseRepo = new RlsPrismaCommissionRepository(admin);
      const faultyRepo = new Proxy(baseRepo, {
        get(target, prop, receiver) {
          if (prop === "runCommissionUnit") {
            return (tId: string, work: (unit: any) => Promise<unknown>) =>
              target.runCommissionUnit(tId, async (unit) => {
                const proxiedUnit = new Proxy(unit, {
                  get(uTarget, uProp, uReceiver) {
                    if (uProp === "lockAndReadWorkOrderForCommission") {
                      return async (utId: string, woId: string) => {
                        if (woId === woBad.id) {
                          throw new Error("falha simulada na OS defeituosa");
                        }
                        return uTarget.lockAndReadWorkOrderForCommission(utId, woId);
                      };
                    }
                    const val = Reflect.get(uTarget, uProp, uReceiver);
                    return typeof val === "function" ? val.bind(uTarget) : val;
                  },
                });
                return work(proxiedUnit);
              });
          }
          const val = Reflect.get(target, prop, receiver);
          return typeof val === "function" ? val.bind(target) : val;
        },
      });

      const counts = await reconcileTenantCommissionsWithRepository(faultyRepo, tenantId);
      assert.equal(counts.created, 1);
      assert.equal(counts.skipped, 1);

      const calcs = (await admin.$queryRawUnsafe(
        `SELECT amount::text AS amount, calculation_snapshot AS snap FROM commission_calculations WHERE tenant_id = $1::uuid`,
        tenantId,
      )) as Array<{ amount: string; snap: Record<string, unknown> }>;
      assert.equal(calcs.length, 1);
      assert.equal(calcs[0]!.snap.workOrderId, woGood.id);
      assert.equal(Number(calcs[0]!.amount), 25);
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

function jsonHeaders(tenantId: string, userId: string, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": role,
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
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1::uuid`, tenantId);
  });
}
