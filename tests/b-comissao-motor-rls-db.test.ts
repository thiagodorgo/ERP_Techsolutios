import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const commRoot = path.join(repoRoot, "src", "modules", "commissions");

const connection = process.env.DATABASE_URL;

if (!connection) {
  test("b-comissao-motor-rls-db exige DATABASE_URL", {
    skip: "Defina DATABASE_URL para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  let admin: any;
  let papel: EphemeralRole | undefined;
  const tenantsToCleanup: string[] = [];

  after(async () => {
    try {
      await papel?.drop();
      for (const tenantId of tenantsToCleanup) {
        await cleanupTenant(admin, tenantId);
      }
    } finally {
      await admin?.$disconnect();
      const { prisma } = await import("../src/database/prisma.js");
      await prisma.$disconnect();
    }
  });

  async function seedOrgScenario(tag: string) {
    const { createPrismaClient } = await import("../src/database/pg-connection.js");
    admin ??= createPrismaClient(connection!);
    const suffix = `${tag}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const tenant = await admin.tenant.create({
      data: {
        name: `Org RLS ${suffix}`,
        slug: `org-rls-${suffix}`,
        status: "active",
        modules: ["dashboard", "commissions", "finance"],
      },
    });
    tenantsToCleanup.push(tenant.id);
    const adminUser = await admin.user.create({
      data: {
        tenant_id: tenant.id,
        name: `Admin ${suffix}`,
        email: `admin-${suffix}@example.com`,
        status: "active",
      },
    });
    const payeeUser = await admin.user.create({
      data: {
        tenant_id: tenant.id,
        name: `Payee ${suffix}`,
        email: `payee-${suffix}@example.com`,
        status: "active",
      },
    });
    const wo = await admin.workOrder.create({
      data: {
        tenant_id: tenant.id,
        code: `WO-${suffix.slice(0, 12)}`,
        title: `OS RLS ${suffix}`,
        status: "completed",
        assigned_user_id: payeeUser.id,
        completed_at: new Date(),
      },
    });
    await admin.$executeRawUnsafe(
      `INSERT INTO work_order_financial_items (tenant_id, work_order_id, description, quantity, unit_amount, total_amount, currency, source)
       VALUES ($1::uuid, $2::uuid, 'Serviço RLS', 1, 300.00, 300.00, 'BRL', 'manual')`,
      tenant.id,
      wo.id,
    );
    return {
      tenantId: tenant.id as string,
      adminUserId: adminUser.id as string,
      payeeUserId: payeeUser.id as string,
      workOrderId: wo.id as string,
    };
  }

  test("[R14/M8/P-Ω3F6-COMISSAO-PRISMA-COV] sob papel NOSUPERUSER NOBYPASSRLS: varredura, rotas de regra e leitor Prisma do gate de cancelamento não atravessam organizações", async () => {
    const a = await seedOrgScenario("rls-a");
    const b = await seedOrgScenario("rls-b");

    papel ??= await createEphemeralRole(admin as never, connection!);
    const [atributos] = await admin.$queryRawUnsafe(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
      papel.roleName,
    );
    assert.deepEqual({ rolsuper: atributos.rolsuper, rolbypassrls: atributos.rolbypassrls }, { rolsuper: false, rolbypassrls: false });

    const roleClient: any = papel.client;
    const [
      { withTenantRls },
      { RlsPrismaCommissionRepository },
      { CommissionService },
      { reconcileTenantCommissions },
      { readWorkOrderCancellationPrisma },
      { resolvePermissionsForRoles },
    ] = await Promise.all([
      import("../src/database/rls.js"),
      import("../src/modules/commissions/commission-prisma.repository.js"),
      import("../src/modules/commissions/commission.service.js"),
      import("../src/modules/commissions/commission-reconcile.service.js"),
      import("../src/modules/commissions/work-order-cancellation.gate.js"),
      import("../src/modules/core-saas/permissions/catalog.js"),
    ]);

    const repo = new RlsPrismaCommissionRepository(roleClient);
    const service = new CommissionService(repo);
    const actorA = {
      tenantId: a.tenantId,
      userId: a.adminUserId,
      roles: ["tenant_admin" as const],
      permissions: resolvePermissionsForRoles(["tenant_admin"]),
    };
    const actorB = {
      tenantId: b.tenantId,
      userId: b.adminUserId,
      roles: ["tenant_admin" as const],
      permissions: resolvePermissionsForRoles(["tenant_admin"]),
    };

    // Define regra em A e em B sob o papel sem bypass
    await service.upsertPayeeRate(actorA, a.payeeUserId, {
      rateType: "percent",
      rateValue: "10",
      reason: "Taxa 10% em A",
      expectedRuleId: null,
    });
    await service.upsertPayeeRate(actorB, b.payeeUserId, {
      rateType: "percent",
      rateValue: "20",
      reason: "Taxa 20% em B",
      expectedRuleId: null,
    });

    // Ajusta effective_from para antes das OS
    const past = new Date(Date.now() - 60_000);
    await admin.$executeRawUnsafe(`UPDATE commission_policies SET effective_from = $1 WHERE tenant_id = ANY($2::uuid[])`, past, [
      a.tenantId,
      b.tenantId,
    ]);
    await admin.$executeRawUnsafe(
      `UPDATE commission_policy_rules SET conditions = jsonb_set(conditions, '{effectiveFrom}', to_jsonb($1::text)) WHERE tenant_id = ANY($2::uuid[])`,
      past.toISOString(),
      [a.tenantId, b.tenantId],
    );

    // Ator de A tentando ler ou definir regra de usuário de B -> 404 payee_not_found
    await assert.rejects(
      service.upsertPayeeRate(actorA, b.payeeUserId, {
        rateType: "percent",
        rateValue: "15",
        reason: "Invasão de A em B",
        expectedRuleId: null,
      }),
      (err: unknown) => {
        assert.equal((err as { statusCode?: number }).statusCode, 404);
        return true;
      },
    );
    await assert.rejects(service.listPayeeRateHistory(actorA, b.payeeUserId), (err: unknown) => {
      assert.equal((err as { statusCode?: number }).statusCode, 404);
      return true;
    });

    // M8: a varredura de A cria os cálculos de A. Sob o papel sem bypass, a leitura fora do contexto volta vazia.
    const countsA = await reconcileTenantCommissions(roleClient, a.tenantId);
    assert.deepEqual(countsA, { created: 1, released: 0, recalculated: 0, skipped: 0 });
    const [{ calcsA }] = (await admin.$queryRawUnsafe(
      `SELECT count(*)::int AS "calcsA" FROM commission_calculations WHERE tenant_id = $1::uuid AND payee_id = $2::uuid`,
      a.tenantId,
      a.payeeUserId,
    )) as Array<{ calcsA: number }>;
    assert.equal(calcsA, 1, "a varredura de A criou o cálculo de A");

    const [{ calcsB }] = (await admin.$queryRawUnsafe(
      `SELECT count(*)::int AS "calcsB" FROM commission_calculations WHERE tenant_id = $1::uuid`,
      b.tenantId,
    )) as Array<{ calcsB: number }>;
    assert.equal(calcsB, 0, "a varredura de A não criou cálculo em B");

    // Leitura de rates e calculations de A só devolve A
    const ratesA = await service.listCurrentRates(actorA);
    assert.deepEqual(
      ratesA.map((r) => r.payeeUserId),
      [a.payeeUserId],
    );
    const calcsListA = await service.listCalculations(actorA, {});
    assert.equal(calcsListA.total, 1);
    assert.equal(calcsListA.items[0]?.payeeId, a.payeeUserId);

    // Fecha P-Ω3F6-COMISSAO-PRISMA-COV: readWorkOrderCancellationPrisma dentro de withTenantRls lê a OS de A e devolve null para a OS de B
    const stateAInA = await withTenantRls(roleClient, a.tenantId, (tx) =>
      readWorkOrderCancellationPrisma(tx, a.tenantId, a.workOrderId),
    );
    assert.deepEqual(stateAInA, { status: "completed", financialDecision: null });

    const stateBInA = await withTenantRls(roleClient, a.tenantId, (tx) =>
      readWorkOrderCancellationPrisma(tx, a.tenantId, b.workOrderId),
    );
    assert.equal(stateBInA, null, "leitor Prisma do gate sob contexto de A não enxerga OS de B");
  });

  test("[R14/M9/M23] sem o RLS (conexão que o contorna): predicado explícito tenant_id impede que varredura e leituras de A toquem B", async () => {
    const a = await seedOrgScenario("byp-a");
    const b = await seedOrgScenario("byp-b");

    const [atributos] = await admin.$queryRawUnsafe(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
    );
    assert.ok(atributos.rolsuper || atributos.rolbypassrls, "conexão do teste deve contornar o RLS");

    const [
      { RlsPrismaCommissionRepository },
      { CommissionService },
      { reconcileTenantCommissions },
      { resolvePermissionsForRoles },
    ] = await Promise.all([
      import("../src/modules/commissions/commission-prisma.repository.js"),
      import("../src/modules/commissions/commission.service.js"),
      import("../src/modules/commissions/commission-reconcile.service.js"),
      import("../src/modules/core-saas/permissions/catalog.js"),
    ]);

    const repo = new RlsPrismaCommissionRepository(admin);
    const service = new CommissionService(repo);
    const actorA = {
      tenantId: a.tenantId,
      userId: a.adminUserId,
      roles: ["tenant_admin" as const],
      permissions: resolvePermissionsForRoles(["tenant_admin"]),
    };
    const actorB = {
      tenantId: b.tenantId,
      userId: b.adminUserId,
      roles: ["tenant_admin" as const],
      permissions: resolvePermissionsForRoles(["tenant_admin"]),
    };

    await service.upsertPayeeRate(actorA, a.payeeUserId, {
      rateType: "percent",
      rateValue: "10",
      reason: "Taxa 10% em A (super)",
      expectedRuleId: null,
    });
    await service.upsertPayeeRate(actorB, b.payeeUserId, {
      rateType: "percent",
      rateValue: "20",
      reason: "Taxa 20% em B (super)",
      expectedRuleId: null,
    });

    const past = new Date(Date.now() - 60_000);
    await admin.$executeRawUnsafe(`UPDATE commission_policies SET effective_from = $1 WHERE tenant_id = ANY($2::uuid[])`, past, [
      a.tenantId,
      b.tenantId,
    ]);
    await admin.$executeRawUnsafe(
      `UPDATE commission_policy_rules SET conditions = jsonb_set(conditions, '{effectiveFrom}', to_jsonb($1::text)) WHERE tenant_id = ANY($2::uuid[])`,
      past.toISOString(),
      [a.tenantId, b.tenantId],
    );

    // M9: mesmo sob conexão que contorna RLS, definir regra para usuário de B com ator de A dá 404
    await assert.rejects(
      service.upsertPayeeRate(actorA, b.payeeUserId, {
        rateType: "percent",
        rateValue: "15",
        reason: "Tentativa cross-tenant sob superuser",
        expectedRuleId: null,
      }),
      (err: unknown) => {
        assert.equal((err as { statusCode?: number }).statusCode, 404);
        return true;
      },
    );

    // M23: sob a conexão que contorna o RLS, só o predicado explícito segura. A volta de A cria só o cálculo de A, não
    // cria nada de B, e nem toca a OS de B: sem o predicado, a OS de B entra na lista de A e sai como `skipped`.
    const countsA = await reconcileTenantCommissions(admin, a.tenantId);
    assert.deepEqual(countsA, { created: 1, released: 0, recalculated: 0, skipped: 0 }, "a volta de A não toca OS de B");

    const [{ calcsB }] = (await admin.$queryRawUnsafe(
      `SELECT count(*)::int AS "calcsB" FROM commission_calculations WHERE tenant_id = $1::uuid`,
      b.tenantId,
    )) as Array<{ calcsB: number }>;
    assert.equal(calcsB, 0, "sob conexão que contorna RLS, a volta de A não cria nada de B (M23)");

    // M24: roda a varredura de B (cria cálculo de R$ 60,00 em B) e confere que o overview de A sob conexão que contorna RLS soma só A (R$ 30,00 = "3000"), nunca B
    const countsB = await reconcileTenantCommissions(admin, b.tenantId);
    assert.deepEqual(countsB, { created: 1, released: 0, recalculated: 0, skipped: 0 });
    const overviewA = await (service as any).getOverview(actorA, {});
    assert.equal(overviewA.forecastCents, "3000", "overview de A não soma cálculos de B sob conexão que contorna RLS (M24)");
  });

  test("[E1.7 / E1.6.1-Q1.4] guarda de código: toda consulta crua ($queryRaw / $executeRaw) dentro de src/modules/commissions/ contém tenant_id", () => {
    const files = listTsFiles(commRoot);
    const missingTenantId: Array<{ file: string; snippet: string }> = [];

    let calls = 0;
    let extracted = 0;
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
      // Toda chamada `$queryRaw`/`$executeRaw` (com ou sem `Unsafe`) conta; a extração tem de achar o SQL de cada uma.
      // Chamada cuja forma o extrator não reconhece faz o total não bater e o teste cair (fail-closed).
      calls += (content.match(/\$(?:queryRaw|executeRaw)(?:Unsafe)?\b/g) ?? []).length;
      for (const sql of extractRawSql(content)) {
        extracted += 1;
        if (!/tenant_id/i.test(sql)) {
          missingTenantId.push({ file: rel, snippet: sql.replace(/\s+/g, " ").trim().slice(0, 120) });
        }
      }
    }

    assert.ok(calls > 0, "o extrator não achou nenhuma consulta crua: a guarda estaria cega");
    assert.equal(extracted, calls, `consultas cruas achadas (${calls}) × SQL extraído (${extracted}): forma não reconhecida`);
    assert.deepEqual(
      missingTenantId,
      [],
      `toda consulta crua em src/modules/commissions/ deve conter tenant_id (sem exceção EXC-TRAVA-ORGANIZACAO, revogada na 1.6.1)`,
    );
  });
}

/**
 * Extrai o texto SQL de cada `$queryRaw` / `$executeRaw` (template, com genérico aninhado como `<Array<{ id: string }>>`)
 * e de cada `$queryRawUnsafe(` / `$executeRawUnsafe(` com texto literal no 1º argumento. Os `${...}` do template ficam
 * de fora do texto (são parâmetros, nunca SQL).
 */
function extractRawSql(content: string): string[] {
  const out: string[] = [];
  const head = /\$(queryRaw|executeRaw)(Unsafe)?\b/g;
  let match: RegExpExecArray | null;
  while ((match = head.exec(content)) !== null) {
    let i = match.index + match[0].length;
    const skipSpace = () => {
      while (i < content.length && /\s/.test(content[i]!)) i += 1;
    };
    skipSpace();
    if (content[i] === "<") {
      let depth = 0;
      for (; i < content.length; i += 1) {
        if (content[i] === "<") depth += 1;
        else if (content[i] === ">") {
          depth -= 1;
          if (depth === 0) {
            i += 1;
            break;
          }
        }
      }
      skipSpace();
    }
    if (match[2]) {
      if (content[i] !== "(") continue;
      i += 1;
      skipSpace();
    }
    const quote = content[i];
    if (quote !== "`" && quote !== '"' && quote !== "'") continue;
    i += 1;
    let sql = "";
    while (i < content.length && content[i] !== quote) {
      if (content[i] === "\\") {
        sql += content[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (quote === "`" && content[i] === "$" && content[i + 1] === "{") {
        let depth = 1;
        i += 2;
        while (i < content.length && depth > 0) {
          if (content[i] === "{") depth += 1;
          else if (content[i] === "}") depth -= 1;
          i += 1;
        }
        sql += " $param ";
        continue;
      }
      sql += content[i];
      i += 1;
    }
    out.push(sql);
  }
  return out;
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listTsFiles(full));
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
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
