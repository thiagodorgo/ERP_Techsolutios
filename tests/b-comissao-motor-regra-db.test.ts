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
  test("b-comissao-motor-regra-db exige DATABASE_URL", {
    skip: "Defina DATABASE_URL para executar esta suíte.",
  });
} else {
  const applicationName = buildApplicationName("comm-regra");
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

  async function seedOrgWithUsers(tag: string) {
    await ensureClients();
    const suffix = `${tag}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const tenant = await admin.tenant.create({
      data: {
        name: `Org Regra ${suffix}`,
        slug: `org-regra-${suffix}`,
        status: "active",
        modules: ["dashboard", "commissions", "finance"],
      },
    });
    tenantsToCleanup.push(tenant.id);
    const mkUser = async (label: string) => {
      return admin.user.create({
        data: {
          tenant_id: tenant.id,
          name: `${label} ${suffix}`,
          email: `${label}-${suffix}@example.com`,
          status: "active",
        },
      });
    };
    const adminUser = await mkUser("admin");
    const managerUser = await mkUser("manager");
    const payeeP = await mkUser("payee-p");
    const payeeQ = await mkUser("payee-q");
    return { tenantId: tenant.id as string, adminUser, managerUser, payeeP, payeeQ };
  }

  test("[T-R1/M13] mesma pessoa: duas escritas simultâneas com mesmo expectedRuleId esperam na trava commission_rate_lock -> uma 200 e uma 409 rate_changed_meanwhile; 1 regra vigente", async () => {
    const { tenantId, adminUser, payeeP } = await seedOrgWithUsers("tr1");
    await withPrismaHttpServer(async (baseUrl) => {
      // Cria política engine e regra inicial R0
      const r0Res = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeP.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Regra R0 inicial para corrida",
          expectedRuleId: null,
        }),
      });
      assert.equal(r0Res.status, 200);
      const r0Id = ((await r0Res.json()) as any).data.ruleId as string;

      // Controle segura a linha da política engine com FOR NO KEY UPDATE
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
          const rows = await tx.$queryRawUnsafe(
            `SELECT id FROM commission_policies WHERE tenant_id = $1::uuid AND scope = 'engine' FOR NO KEY UPDATE`,
            tenantId,
          );
          assert.equal((rows as unknown[]).length, 1);
          lockTaken();
          await controlHold;
        },
        { timeout: 30_000 },
      );

      await lockReady;

      const req1 = captureSettled(
        fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeP.id}`, {
          method: "PUT",
          headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
          body: JSON.stringify({
            rateType: "percent",
            rateValue: "15",
            reason: "Escrita concorrente A (15%)",
            expectedRuleId: r0Id,
          }),
        }),
      );
      const req2 = captureSettled(
        fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeP.id}`, {
          method: "PUT",
          headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
          body: JSON.stringify({
            rateType: "percent",
            rateValue: "20",
            reason: "Escrita concorrente B (20%)",
            expectedRuleId: r0Id,
          }),
        }),
      );

      await waitForTwoBlocked(control, "commission_rate_lock", applicationName);

      releaseControl();
      await controlTx;

      const [out1, out2] = await Promise.all([req1, req2]);
      assert.equal(out1.status, "fulfilled");
      assert.equal(out2.status, "fulfilled");
      const res1 = (out1 as { status: "fulfilled"; value: Response }).value;
      const res2 = (out2 as { status: "fulfilled"; value: Response }).value;
      const statuses = [res1.status, res2.status].sort();
      assert.deepEqual(statuses, [200, 409], `esperado 200 e 409, veio ${statuses.join(",")}`);

      const conflictRes = res1.status === 409 ? res1 : res2;
      const conflictBody = (await conflictRes.json()) as any;
      assert.equal(conflictBody.error?.reason, "rate_changed_meanwhile");

      const [{ activeCount }] = (await admin.$queryRawUnsafe(
        `SELECT count(*)::int AS "activeCount" FROM commission_policy_rules WHERE tenant_id = $1::uuid AND rule_type = 'engine_payee' AND active = true AND conditions->>'payeeUserId' = $2`,
        tenantId,
        payeeP.id,
      )) as Array<{ activeCount: number }>;
      assert.equal(activeCount, 1, "exatamente 1 regra vigente de P após a corrida");
    });
  });

  test("[T-R2/M83] organização sem política, duas pessoas: dois PUT simultâneos bloqueiam em commission_engine_policy_ensure -> ambos 200, 1 política engine e 2 regras vigentes", async () => {
    const { tenantId, adminUser, payeeP, payeeQ } = await seedOrgWithUsers("tr2");
    await withPrismaHttpServer(async (baseUrl) => {
      let releaseControl!: () => void;
      const controlHold = new Promise<void>((resolve) => {
        releaseControl = resolve;
      });
      let lockTaken!: () => void;
      const lockReady = new Promise<void>((resolve) => {
        lockTaken = resolve;
      });

      const controlTx = control
        .$transaction(
          async (tx: any) => {
            await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
            await tx.$executeRawUnsafe(
              `INSERT INTO commission_policies (tenant_id, name, scope, vertical, status, effective_from, created_by)
               VALUES ($1::uuid, 'Comissão da organização', 'engine', 'field_services', 'active', now(), $2::uuid)`,
              tenantId,
              adminUser.id,
            );
            lockTaken();
            await controlHold;
            throw new Error("ROLLBACK_CONTROL_TX");
          },
          { timeout: 30_000 },
        )
        .catch((err: unknown) => {
          if (err instanceof Error && err.message === "ROLLBACK_CONTROL_TX") return;
          throw err;
        });

      await lockReady;

      const reqP = captureSettled(
        fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeP.id}`, {
          method: "PUT",
          headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
          body: JSON.stringify({
            rateType: "percent",
            rateValue: "10",
            reason: "Primeira escrita pessoa P",
            expectedRuleId: null,
          }),
        }),
      );
      const reqQ = captureSettled(
        fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeQ.id}`, {
          method: "PUT",
          headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
          body: JSON.stringify({
            rateType: "fixed",
            rateValue: "50.00",
            reason: "Primeira escrita pessoa Q",
            expectedRuleId: null,
          }),
        }),
      );

      await waitForTwoBlocked(control, "commission_engine_policy_ensure", applicationName);

      releaseControl();
      await controlTx;

      const [outP, outQ] = await Promise.all([reqP, reqQ]);
      assert.equal(outP.status, "fulfilled");
      assert.equal(outQ.status, "fulfilled");
      const resP = (outP as { status: "fulfilled"; value: Response }).value;
      const resQ = (outQ as { status: "fulfilled"; value: Response }).value;
      assert.equal(resP.status, 200);
      assert.equal(resQ.status, 200);

      const [{ policyCount }] = (await admin.$queryRawUnsafe(
        `SELECT count(*)::int AS "policyCount" FROM commission_policies WHERE tenant_id = $1::uuid AND scope = 'engine'`,
        tenantId,
      )) as Array<{ policyCount: number }>;
      assert.equal(policyCount, 1, "exatamente 1 política engine na organização");

      const [{ activeRules }] = (await admin.$queryRawUnsafe(
        `SELECT count(*)::int AS "activeRules" FROM commission_policy_rules WHERE tenant_id = $1::uuid AND rule_type = 'engine_payee' AND active = true`,
        tenantId,
      )) as Array<{ activeRules: number }>;
      assert.equal(activeRules, 2, "2 regras vigentes criadas");
    });
  });

  test("[T-R3/M81/M82] a trava da regra não alcança outro módulo: UPDATE tenants e INSERT com FK para commission_policies terminam; SELECT ... FOR NO KEY UPDATE na política falha com 55P03", async () => {
    const { tenantId, adminUser } = await seedOrgWithUsers("tr3");
    const [{ withTenantRls }, { PrismaCommissionRepository }] = await Promise.all([
      import("../src/database/rls.js"),
      import("../src/modules/commissions/commission-prisma.repository.js"),
    ]);

    // Garante que a política engine já está commitada no banco antes de abrir a unidade que a trava (senão a FK de 2ª conexão não enxerga a tupla não commitada)
    await withTenantRls(admin, tenantId, async (tx) => {
      const unit = new PrismaCommissionRepository(tx);
      await unit.ensureEnginePolicy(tenantId, adminUser.id);
    });

    let releaseUnit!: () => void;
    const unitHold = new Promise<void>((resolve) => {
      releaseUnit = resolve;
    });
    let unitLocked!: (policyId: string) => void;
    const unitReady = new Promise<string>((resolve) => {
      unitLocked = resolve;
    });

    const unitPromise = withTenantRls(admin, tenantId, async (tx) => {
      const unit = new PrismaCommissionRepository(tx);
      await unit.ensureEnginePolicy(tenantId, adminUser.id);
      const policyId = await unit.lockCommissionRate(tenantId);
      unitLocked(policyId);
      await unitHold;
    });

    const policyId = await unitReady;

    try {
      // (a) UPDATE tenants SET modules = modules WHERE id = <A> termina sem bloqueio (M81)
      await control.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '1000ms'`);
        const updated = await tx.$executeRawUnsafe(`UPDATE tenants SET modules = modules WHERE id = $1::uuid`, tenantId);
        assert.equal(updated, 1);
      });

      // (b) INSERT de um evento-base de A com policy_id = a política travada (FK KEY SHARE) termina sem bloqueio (M82)
      await control.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '1000ms'`);
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
        await tx.$executeRawUnsafe(
          `INSERT INTO commission_basis_events (tenant_id, source_type, source_id, source_event_name, idempotency_key, payload, occurred_at, status, policy_id)
           VALUES ($1::uuid, 'work_order', $2, 'work_order.completed', $3, '{}'::jsonb, now(), 'received', $4::uuid)`,
          tenantId,
          randomUUID(),
          `fk-test-${randomUUID()}`,
          policyId,
        );
      });

      // (c) SELECT id FROM commission_policies ... FOR NO KEY UPDATE falha com 55P03 (M13)
      await assert.rejects(
        control.$transaction(async (tx: any) => {
          await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '1000ms'`);
          await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
          await tx.$queryRawUnsafe(
            `SELECT id FROM commission_policies WHERE tenant_id = $1::uuid AND scope = 'engine' FOR NO KEY UPDATE`,
            tenantId,
          );
        }),
        (err: unknown) => {
          assert.match(String((err as Error).message), /55P03|lock timeout/i);
          return true;
        },
      );
    } finally {
      releaseUnit();
      await unitPromise;
    }
  });

  test("[R11/R13/M33] histórico em ordem, selfChange preservado no banco e troca fecha a anterior e cria a nova", async () => {
    const { tenantId, adminUser, managerUser, payeeP } = await seedOrgWithUsers("hist");
    await withPrismaHttpServer(async (baseUrl) => {
      // Gestor define a própria
      const selfRes = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${managerUser.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, managerUser.id, "manager"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "12.5",
          reason: "Gestor definindo própria comissão",
          expectedRuleId: null,
        }),
      });
      assert.equal(selfRes.status, 200);

      const histSelf = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${managerUser.id}/history`, {
        headers: authHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      assert.equal(histSelf.status, 200);
      const selfItems = (((await histSelf.json()) as any).items ?? ((await histSelf.json()) as any).data?.items) as Array<
        Record<string, unknown>
      >;
      assert.equal(selfItems.length, 1);
      assert.equal(selfItems[0]?.selfChange, true);

      // Admin define e troca regra de payeeP
      const r1 = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeP.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "percent",
          rateValue: "10",
          reason: "Primeira taxa do guincheiro P",
          expectedRuleId: null,
        }),
      });
      const r1Id = ((await r1.json()) as any).data.ruleId as string;

      const r2 = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeP.id}`, {
        method: "PUT",
        headers: jsonHeaders(tenantId, adminUser.id, "tenant_admin"),
        body: JSON.stringify({
          rateType: "fixed",
          rateValue: "75.00",
          reason: "Segunda taxa do guincheiro P",
          expectedRuleId: r1Id,
        }),
      });
      const r2Id = ((await r2.json()) as any).data.ruleId as string;

      const histP = await fetch(`${baseUrl}/api/v1/commissions/rates/payees/${payeeP.id}/history`, {
        headers: authHeaders(tenantId, adminUser.id, "tenant_admin"),
      });
      const pItems = (((await histP.json()) as any).items ?? []) as Array<Record<string, unknown>>;
      assert.equal(pItems.length, 2);
      assert.equal(pItems[0]?.ruleId, r2Id);
      assert.equal(pItems[0]?.active, true);
      assert.equal(pItems[0]?.effectiveTo, null);
      assert.equal(pItems[1]?.ruleId, r1Id);
      assert.equal(pItems[1]?.active, false);
      assert.ok(typeof pItems[1]?.effectiveTo === "string");
    });
  });
}

async function waitForTwoBlocked(client: any, fragment: string, applicationName: string, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const waiting = await countBlockedStatements(client, { fragment, applicationName });
    if (waiting >= 2) return;
    if (Date.now() > deadline) {
      assert.fail(`timeout esperando 2 statements bloqueados em ${fragment} para ${applicationName} (atual: ${waiting})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
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
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM user_role_assignments WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1::uuid`, tenantId);
  });
}
