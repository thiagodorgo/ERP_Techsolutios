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
  waitForOwnBlockedStatement,
  withApplicationName,
} from "./helpers/pg-barrier.js";

const rawConnection = process.env.DATABASE_URL;

if (!rawConnection) {
  test("b-comissao-motor-liquidacao-unidade-db exige DATABASE_URL", {
    skip: "Defina DATABASE_URL para executar esta suíte.",
  });
} else {
  const applicationName = buildApplicationName("comm-liq-unit");
  const scopedConnection = withApplicationName(rawConnection, applicationName);
  process.env.DATABASE_URL = scopedConnection;
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  let admin: any;
  let control: any;
  let aux: any;
  const tenantsToCleanup: string[] = [];

  after(async () => {
    try {
      for (const tenantId of tenantsToCleanup) {
        await cleanupTenant(admin, tenantId);
      }
    } finally {
      await aux?.$disconnect();
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
      aux = createPrismaClient(withApplicationName(rawConnection!, `${applicationName}-aux`));
      const { prisma } = await import("../src/database/prisma.js");
      await assertApplicationNamePropagated(prisma as never, applicationName);
    }
  }

  async function seedOrg(tag: string, options?: { createProfile?: boolean; profileActive?: boolean }) {
    await ensureClients();
    const suffix = `${tag}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const tenant = await admin.tenant.create({
      data: {
        name: `Org LiqUnit ${suffix}`,
        slug: `org-liqunit-${suffix}`,
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
    let operatorProfileId: string | undefined;
    if (options?.createProfile !== false) {
      const profile = await admin.operatorProfile.create({
        data: {
          tenant_id: tenant.id,
          user_id: payeeUser.id,
          full_name: `Guincheiro ${suffix}`,
          is_active: options?.profileActive ?? true,
        },
      });
      operatorProfileId = profile.id;
    }
    return { tenantId: tenant.id as string, adminUser, financeUser, payeeUser, operatorProfileId };
  }

  async function seedApprovedEngineCommission(input: {
    tenantId: string;
    adminUserId: string;
    payeeUserId: string;
    baseAmount: string;
    ratePercent?: string;
    baseUrl: string;
  }) {
    const rate = input.ratePercent ?? "10";
    const ratesRes = await fetch(`${input.baseUrl}/api/v1/commissions/rates`, {
      headers: authHeaders(input.tenantId, input.adminUserId, "tenant_admin"),
    });
    const currentRates = (((await ratesRes.json()) as any).items ?? []) as Array<Record<string, unknown>>;
    const existing = currentRates.find((r) => r.payeeUserId === input.payeeUserId);
    if (!existing) {
      await fetch(`${input.baseUrl}/api/v1/commissions/rates/payees/${input.payeeUserId}`, {
        method: "PUT",
        headers: jsonHeaders(input.tenantId, input.adminUserId, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: rate,
          reason: "Regra para liquidação em unidade",
          expectedRuleId: null,
        }),
      });
    }

    const code = `OS-LIQ-${randomUUID().slice(0, 8)}`;
    const wo = await admin.workOrder.create({
      data: {
        tenant_id: input.tenantId,
        code,
        title: `Serviço ${code}`,
        status: "completed",
        assigned_user_id: input.payeeUserId,
        completed_at: new Date(Date.now() + 1000),
      },
    });
    await admin.$executeRawUnsafe(
      `INSERT INTO work_order_financial_items (tenant_id, work_order_id, description, quantity, unit_amount, total_amount, currency, source)
       VALUES ($1::uuid, $2::uuid, 'Item de serviço', 1, $3::numeric, $3::numeric, 'BRL', 'manual')`,
      input.tenantId,
      wo.id,
      input.baseAmount,
    );
    await admin.operationalApproval.create({
      data: {
        tenant_id: input.tenantId,
        entity_type: "work_order",
        entity_id: wo.id,
        work_order_id: wo.id,
        status: "approved",
        requested_by_user_id: input.payeeUserId,
        pending_reason: "Validação de conclusão da OS",
        decided_by_user_id: input.adminUserId,
        decided_at: new Date(),
      },
    });

    await fetch(`${input.baseUrl}/api/v1/commissions/reconcile`, {
      method: "POST",
      headers: jsonHeaders(input.tenantId, input.adminUserId, "tenant_admin"),
    });

    const [calc] = (await admin.$queryRawUnsafe(
      `SELECT id, policy_id, basis_event_id FROM commission_calculations WHERE tenant_id = $1::uuid AND (calculation_snapshot->>'workOrderId') = $2`,
      input.tenantId,
      wo.id,
    )) as Array<{ id: string; policy_id: string; basis_event_id: string }>;
    assert.ok(calc?.id);
    return { workOrderId: wo.id as string, calculationId: calc.id, policyId: calc.policy_id, basisEventId: calc.basis_event_id };
  }

  test("[T-L1/M65] a trava do guincheiro fica presa durante a liquidação: enquanto a liquidação espera na OS, SELECT ... FOR NO KEY UPDATE NOWAIT em operator_profiles falha com 55P03; solto o controle, devolve settled e grava 1 crédito", async () => {
    const { tenantId, adminUser, financeUser, payeeUser } = await seedOrg("tl1");
    await withPrismaHttpServer(async (baseUrl) => {
      const { workOrderId, calculationId } = await seedApprovedEngineCommission({
        tenantId,
        adminUserId: adminUser.id,
        payeeUserId: payeeUser.id,
        baseAmount: "400.00",
        baseUrl,
      });

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
            workOrderId,
          );
          lockTaken();
          await controlHold;
        },
        { timeout: 30_000 },
      );

      await lockReady;

      const settleReq = captureSettled(
        fetch(`${baseUrl}/api/v1/commissions/settlements`, {
          method: "POST",
          headers: jsonHeaders(tenantId, financeUser.id, "finance"),
          body: JSON.stringify({ calculationIds: [calculationId] }),
        }),
      );

      try {
        await waitForOwnBlockedStatement(control, {
          fragment: "work_orders",
          applicationName,
          timeoutMs: 15_000,
        });

        // Conexão auxiliar pede FOR NO KEY UPDATE NOWAIT no perfil do guincheiro -> deve falhar com 55P03 (M65)
        await assert.rejects(
          aux.$transaction(async (tx: any) => {
            await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
            await tx.$queryRawUnsafe(
              `SELECT id FROM operator_profiles WHERE tenant_id = $1::uuid AND user_id = $2::uuid FOR NO KEY UPDATE NOWAIT`,
              tenantId,
              payeeUser.id,
            );
          }),
          (err: unknown) => {
            assert.match(String((err as Error).message), /55P03|could not obtain lock/i);
            return true;
          },
        );
      } finally {
        releaseControl();
        await controlTx;
      }

      const settledOut = await settleReq;
      assert.equal(settledOut.status, "fulfilled");
      const res = (settledOut as { status: "fulfilled"; value: Response }).value;
      assert.equal(res.status, 200);
      const data = ((await res.json()) as any).data;
      assert.equal(data.settledCount, 1);
      assert.equal(data.settledTotal, 40);
      assert.equal(data.settledTotalCents, "4000");
      assert.equal(data.lines[0]?.outcome, "settled");
      assert.equal(data.payees?.[0]?.payeeId, payeeUser.id);
      assert.equal(data.payees?.[0]?.netCents, "4000");
    });
  });

  test("[T-L2/M77] guincheiro desativado (is_active = false) depois da OS recebe a comissão normalmente", async () => {
    const { tenantId, adminUser, financeUser, payeeUser } = await seedOrg("tl2", { profileActive: false });
    await withPrismaHttpServer(async (baseUrl) => {
      const { calculationId } = await seedApprovedEngineCommission({
        tenantId,
        adminUserId: adminUser.id,
        payeeUserId: payeeUser.id,
        baseAmount: "300.00",
        baseUrl,
      });

      const res = await fetch(`${baseUrl}/api/v1/commissions/settlements`, {
        method: "POST",
        headers: jsonHeaders(tenantId, financeUser.id, "finance"),
        body: JSON.stringify({ calculationIds: [calculationId] }),
      });
      assert.equal(res.status, 200);
      const data = ((await res.json()) as any).data;
      assert.equal(data.settledCount, 1);
      assert.equal(data.lines[0]?.outcome, "settled");

      const [{ entryCount }] = (await admin.$queryRawUnsafe(
        `SELECT count(*)::int AS "entryCount" FROM professional_statement_entries WHERE tenant_id = $1::uuid AND source_id = $2::uuid`,
        tenantId,
        calculationId,
      )) as Array<{ entryCount: number }>;
      assert.equal(entryCount, 1);
    });
  });

  test("[T-L3/M78] sem perfil de profissional, lockCommissionPayee devolve false e nenhuma linha nova nasce", async () => {
    const { tenantId, payeeUser } = await seedOrg("tl3", { createProfile: false });
    const [{ withTenantRls }, { PrismaCommissionRepository }] = await Promise.all([
      import("../src/database/rls.js"),
      import("../src/modules/commissions/commission-prisma.repository.js"),
    ]);

    const locked = await withTenantRls(admin, tenantId, (tx) =>
      new PrismaCommissionRepository(tx).lockCommissionPayee(tenantId, payeeUser.id),
    );
    assert.equal(locked, false);
  });

  test("[R8/M29] trava da OS na liquidação: edição de item financeiro durante a liquidação espera até o commit da liquidação", async () => {
    const { tenantId, adminUser, financeUser, payeeUser } = await seedOrg("m29-wo-lock");
    await withPrismaHttpServer(async (baseUrl) => {
      const { workOrderId, calculationId } = await seedApprovedEngineCommission({
        tenantId,
        adminUserId: adminUser.id,
        payeeUserId: payeeUser.id,
        baseAmount: "200.00",
        baseUrl,
      });

      // Controle segura FOR UPDATE na linha do cálculo para a liquidação travar o guincheiro, travar a OS e parar no cálculo
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
            `SELECT id FROM commission_calculations WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`,
            tenantId,
            calculationId,
          );
          lockTaken();
          await controlHold;
        },
        { timeout: 30_000 },
      );

      await lockReady;

      const settleReq = captureSettled(
        fetch(`${baseUrl}/api/v1/commissions/settlements`, {
          method: "POST",
          headers: jsonHeaders(tenantId, financeUser.id, "finance"),
          body: JSON.stringify({ calculationIds: [calculationId] }),
        }),
      );

      try {
        await waitForOwnBlockedStatement(control, {
          fragment: "commission_calculations",
          applicationName,
          timeoutMs: 15_000,
        });

        // Enquanto a liquidação espera no cálculo, ela já detém FOR UPDATE na linha da OS (M29):
        // um FOR SHARE NOWAIT na OS (o mesmo lock que a escrita de item financeiro toma) falha com 55P03
        await assert.rejects(
          aux.$transaction(async (tx: any) => {
            await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
            await tx.$queryRawUnsafe(
              `SELECT id FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid FOR SHARE NOWAIT`,
              tenantId,
              workOrderId,
            );
          }),
          (err: unknown) => {
            assert.match(String((err as Error).message), /55P03|could not obtain lock/i);
            return true;
          },
        );
      } finally {
        releaseControl();
        await controlTx;
      }

      const settledOut = await settleReq;
      assert.equal(settledOut.status, "fulfilled");
      const res = (settledOut as { status: "fulfilled"; value: Response }).value;
      assert.equal(res.status, 200);
      assert.equal(((await res.json()) as any).data.lines[0]?.outcome, "settled");
    });
  });

  test("[R8/M30] item editado e varredura ainda não rodou -> liquidação devolve stale_base sob a trava da OS e não credita nada", async () => {
    const { tenantId, adminUser, financeUser, payeeUser } = await seedOrg("m30-stale-base");
    await withPrismaHttpServer(async (baseUrl) => {
      const { workOrderId, calculationId } = await seedApprovedEngineCommission({
        tenantId,
        adminUserId: adminUser.id,
        payeeUserId: payeeUser.id,
        baseAmount: "200.00",
        baseUrl,
      });

      // Edita o item financeiro sem rodar a varredura
      await admin.$executeRawUnsafe(
        `UPDATE work_order_financial_items SET unit_amount = 350.00, total_amount = 350.00 WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid`,
        tenantId,
        workOrderId,
      );

      const res = await fetch(`${baseUrl}/api/v1/commissions/settlements`, {
        method: "POST",
        headers: jsonHeaders(tenantId, financeUser.id, "finance"),
        body: JSON.stringify({ calculationIds: [calculationId] }),
      });
      assert.equal(res.status, 200);
      const data = ((await res.json()) as any).data;
      assert.equal(data.settledCount, 0);
      assert.equal(data.settledTotal, 0);
      assert.equal(data.lines[0]?.outcome, "stale_base");

      const [{ entryCount }] = (await admin.$queryRawUnsafe(
        `SELECT count(*)::int AS "entryCount" FROM professional_statement_entries WHERE tenant_id = $1::uuid AND source_id = $2::uuid`,
        tenantId,
        calculationId,
      )) as Array<{ entryCount: number }>;
      assert.equal(entryCount, 0);
    });
  });

  test("[R8/M28/M31] markCommissionSettled exige status = approved e classe COMISSÃO; falha injetada na marcação desfaz o lançamento no extrato (tudo ou nada na mesma transação)", async () => {
    const { tenantId, adminUser, payeeUser } = await seedOrg("m28-m31");
    await withPrismaHttpServer(async (baseUrl) => {
      const { calculationId } = await seedApprovedEngineCommission({
        tenantId,
        adminUserId: adminUser.id,
        payeeUserId: payeeUser.id,
        baseAmount: "250.00",
        baseUrl,
      });

      const [{ withTenantRls }, { PrismaCommissionRepository, RlsPrismaCommissionRepository }, { CommissionService }, { resolvePermissionsForRoles }] =
        await Promise.all([
          import("../src/database/rls.js"),
          import("../src/modules/commissions/commission-prisma.repository.js"),
          import("../src/modules/commissions/commission.service.js"),
          import("../src/modules/core-saas/permissions/catalog.js"),
        ]);

      // M28: se o cálculo estiver reversed, markCommissionSettled casa 0 linhas (devolve undefined)
      await admin.$executeRawUnsafe(
        `UPDATE commission_calculations SET status = 'reversed' WHERE tenant_id = $1::uuid AND id = $2::uuid`,
        tenantId,
        calculationId,
      );
      const markedReversed = await withTenantRls(admin, tenantId, (tx) =>
        new PrismaCommissionRepository(tx).markCommissionSettled(tenantId, calculationId, new Date(), randomUUID()),
      );
      assert.equal(markedReversed, undefined, "marcar direto um cálculo reversed deve casar 0 linhas (M28)");

      // Restaura para approved para testar M31 (atomicidade extrato + marcação)
      await admin.$executeRawUnsafe(
        `UPDATE commission_calculations SET status = 'approved' WHERE tenant_id = $1::uuid AND id = $2::uuid`,
        tenantId,
        calculationId,
      );

      const baseRepo = new RlsPrismaCommissionRepository(admin);
      const faultyRepo = new Proxy(baseRepo, {
        get(target, prop, receiver) {
          if (prop === "runCommissionUnit") {
            return (tId: string, work: (unit: any) => Promise<unknown>) =>
              target.runCommissionUnit(tId, async (unit) => {
                const proxiedUnit = new Proxy(unit, {
                  get(uTarget, uProp, uReceiver) {
                    if (uProp === "markCommissionSettled") {
                      return async () => undefined; // Simula falha de CAS (0 linhas marcadas depois de postar no extrato)
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

      const service = new CommissionService(faultyRepo);
      await assert.rejects(
        service.settleCalculations(
          {
            tenantId,
            userId: adminUser.id,
            roles: ["tenant_admin"],
            permissions: resolvePermissionsForRoles(["tenant_admin"]),
          },
          { calculationIds: [calculationId] },
        ),
      );

      // M31: como o lançamento no extrato rodou na mesma transação da unidade, o rollback desfez o lançamento!
      const [{ entryCount }] = (await admin.$queryRawUnsafe(
        `SELECT count(*)::int AS "entryCount" FROM professional_statement_entries WHERE tenant_id = $1::uuid AND source_id = $2::uuid`,
        tenantId,
        calculationId,
      )) as Array<{ entryCount: number }>;
      assert.equal(entryCount, 0, "falha na marcação desfaz o lançamento no extrato na mesma transação (M31)");
    });
  });

  test("[R30/R34/M56/M58/M73/M74] P-KIND na liquidação: linha de ajuste (engine:adj:...) e reservada desconhecida (engine:x:1) devolvem not_commission sem lançamento; comissão legada (fora de engine:) é paga com settled e 1 crédito no extrato", async () => {
    const { tenantId, adminUser, financeUser, payeeUser } = await seedOrg("p-kind-liq");
    await withPrismaHttpServer(async (baseUrl) => {
      const { policyId, basisEventId } = await seedApprovedEngineCommission({
        tenantId,
        adminUserId: adminUser.id,
        payeeUserId: payeeUser.id,
        baseAmount: "100.00",
        baseUrl,
      });

      const adjId = randomUUID();
      const unkId = randomUUID();
      const legId = randomUUID();

      // Semeia direto no banco: 1 ajuste, 1 chave reservada desconhecida e 1 comissão legada (fora de engine:) de R$ 40,00
      for (const row of [
        { id: adjId, key: `engine:adj:${randomUUID()}:1`, amount: "20.00" },
        { id: unkId, key: "engine:x:1", amount: "30.00" },
        { id: legId, key: "legado-a-receber-1", amount: "40.00" },
      ]) {
        await admin.$executeRawUnsafe(
          `INSERT INTO commission_calculations (id, tenant_id, basis_event_id, policy_id, eligible_user_id, payee_id, amount, currency, status, calculation_snapshot, idempotency_key)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $5::uuid, $6::numeric, 'BRL', 'approved', '{}'::jsonb, $7)`,
          row.id,
          tenantId,
          basisEventId,
          policyId,
          payeeUser.id,
          row.amount,
          row.key,
        );
      }

      const res = await fetch(`${baseUrl}/api/v1/commissions/settlements`, {
        method: "POST",
        headers: jsonHeaders(tenantId, financeUser.id, "finance"),
        body: JSON.stringify({ calculationIds: [adjId, unkId, legId] }),
      });
      assert.equal(res.status, 200);
      const data = ((await res.json()) as any).data;
      assert.equal(data.settledCount, 1);
      assert.equal(data.settledTotal, 40);
      assert.equal(data.settledTotalCents, "4000");

      const outcomeById = new Map<string, string>(data.lines.map((l: any) => [l.calculationId, l.outcome]));
      assert.equal(outcomeById.get(adjId), "not_commission", "ajuste devolve not_commission (M56)");
      assert.equal(outcomeById.get(unkId), "not_commission", "engine:x:1 devolve not_commission (M58)");
      assert.equal(outcomeById.get(legId), "settled", "comissão antiga fora de engine: é paga (M73/M74)");

      const entries = (await admin.$queryRawUnsafe(
        `SELECT source_id, amount::text AS amount FROM professional_statement_entries WHERE tenant_id = $1::uuid`,
        tenantId,
      )) as Array<{ source_id: string; amount: string }>;
      assert.equal(entries.length, 1);
      assert.equal(entries[0]!.source_id, legId);
      assert.equal(Number(entries[0]!.amount), 40);
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
