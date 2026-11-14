import "dotenv/config";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { PrismaClient } from "@prisma/client";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-ASS-09 · F7 — R-E2E-db-1 do plano v2, na FORMA REAL (§C7 11(3)): um Postgres migrado, o app de verdade e o papel de
// runtime NOSUPERUSER NOBYPASSRLS do arnês. O caminho é o da plataforma:
//   1. importa um CSV sintético em USD pela rota (`POST /platform/cloud-costs/imports/manual-csv`);
//   2. o rateio automático do `B-ASS-09a` cria a run do mês pela importação, e o job `cloud-cost-allocation.run` a executa;
//   3. `PUT /platform/billing/fx-rates/:month` cadastra a taxa do mês;
//   4. `GET /platform/billing/overview` devolve o custo da organização convertido para reais, `cost.status "ok"`, e o global
//      fecha a conservação (as 5 parcelas somam o total, em centavos).
// É o aceite do fluxo, sem mutação própria. O mês da suíte é sorteado entre 1950 e 1998 (passado: a visão recusa mês futuro;
// fora das janelas das outras suítes). Valores sintéticos (plano §15).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ANO = 1950 + Math.floor(Math.random() * 49);
const MES = `${ANO}-06`;
const TAXA = "5.000000";

type Json = Record<string, any>;

/** Centavos de uma string decimal com 2 casas (`"12.34"` → 1234n), com sinal. */
function cents(value: string): bigint {
  const negative = value.startsWith("-");
  const [inteiro, fracao = ""] = value.replace("-", "").split(".");
  const n = BigInt(inteiro!) * 100n + BigInt((fracao + "00").slice(0, 2));
  return negative ? -n : n;
}

if (!connectionString) {
  test("B-ASS-09 · fim a fim -db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL para o PostgreSQL descartável do bloco.",
  });
} else {
  test("T-E2E-db-1 · CSV em USD pela rota → rateio automático → taxa do mês → a visão em reais, com a conservação", { timeout: 300_000 }, async () => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";

    const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const admin = new Client({ adapter: new PrismaPg({ connectionString }) }) as unknown as PrismaClient;
    const role = await createEphemeralRole(admin, connectionString);
    let server: Server | undefined;
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const tenant = await admin.tenant.create({ data: { name: `B-ASS-09 e2e ${suffix}`, slug: `ass09-e2e-${suffix}` } });
    const ator = await admin.user.create({ data: { tenant_id: tenant.id, name: "Ator de plataforma", email: `plataforma-${suffix}@ass09-e2e.test` } });
    let importId: string | undefined;

    try {
      const postura = (await role.client.$queryRawUnsafe(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
      assert.deepEqual(postura, [{ rolsuper: false, rolbypassrls: false }], "o app roda SEM superusuário e SEM bypass de RLS");
      // O cliente global da aplicação (`src/database/prisma.ts`) passa a ser o do papel, antes de qualquer import dela.
      (globalThis as { prisma?: unknown }).prisma = role.client;

      const [
        { createApp },
        { signAccessToken },
        { PrismaCoreSaasService },
        { PrismaCoreSaasStore },
        { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
        { getDefaultJobRegistry, resetDefaultJobRegistryForTests },
      ] = await Promise.all([
        import("../src/app.js"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/infra/jobs/job.registry.js"),
      ]);
      const client = role.client;
      const app = createApp(
        new PrismaCoreSaasService(
          new PrismaCoreSaasStore(
            client,
            new TenantRepository(client),
            new UserRepository(client),
            new RoleRepository(client),
            new UserRoleRepository(client),
            new AuditLogRepository(client),
          ),
        ),
      );
      server = app.listen(0, "127.0.0.1");
      await new Promise<void>((resolve) => server!.once("listening", () => resolve()));
      const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const token = await signAccessToken({
        user_id: ator.id,
        tenant_id: tenant.id,
        email: `plataforma-${suffix}@ass09-e2e.test`,
        roles: ["platform_admin"],
      });
      const http = async (method: string, path: string, body?: unknown): Promise<{ status: number; body: Json }> => {
        const response = await fetch(`${baseUrl}/api/v1/platform${path}`, {
          method,
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return { status: response.status, body: (await response.json()) as Json };
      };

      // 1. O CSV sintético do repositório, no mês da suíte e com a tag desta organização.
      const [header, ...rows] = readFileSync(new URL("./fixtures/aws-cur-sample.csv", import.meta.url), "utf8")
        .replace(/\r\n/g, "\n")
        .trim()
        .split("\n");
      const csv = [header, ...rows.map((row) => row.replaceAll("2026-", `${ANO}-`).replace(",tenant-a,", `,${tenant.slug},`))].join("\n");
      const imported = await http("POST", "/cloud-costs/imports/manual-csv", { csv });
      assert.equal(imported.status, 201, JSON.stringify(imported.body));
      importId = imported.body.data.id as string;
      assert.equal(imported.body.data.status, "completed");

      // 2. O rateio automático: a importação criou a run do mês; o job a executa (como o worker faria).
      const runs = (await admin.$queryRawUnsafe(
        `SELECT id::text AS id, status FROM cloud_cost_allocation_runs WHERE import_id = $1::uuid`,
        importId,
      )) as Array<{ id: string; status: string }>;
      assert.equal(runs.length, 1, "uma run automática por importação e mês");
      resetDefaultJobRegistryForTests();
      const job = getDefaultJobRegistry().get("cloud-cost-allocation.run");
      assert.ok(job, "o job do rateio está registrado");
      await job({ mode: "import_auto", importId }, {} as never);
      resetDefaultJobRegistryForTests();
      const executed = (await admin.$queryRawUnsafe(
        `SELECT status FROM cloud_cost_allocation_runs WHERE id = $1::uuid`,
        runs[0]!.id,
      )) as Array<{ status: string }>;
      assert.equal(executed[0]!.status, "completed", "o job concluiu a run");
      const summary = await http("GET", `/cloud-cost-allocations/summary?periodStart=${MES}-01&periodEnd=${MES}-30`);
      assert.equal(summary.status, 200, JSON.stringify(summary.body));
      assert.equal(summary.body.data.coverage, "imported");
      const own = (summary.body.data.tenants as Array<{ tenantId: string; allocatedCost: number }>).find((t) => t.tenantId === tenant.id);
      assert.ok(own && own.allocatedCost > 0, "a organização recebeu custo no rateio");

      // 3. A taxa do mês, pela rota.
      const fx = await http("PUT", `/billing/fx-rates/${MES}`, { currencyFrom: "USD", currencyTo: "BRL", rate: TAXA });
      assert.equal(fx.status, 200, JSON.stringify(fx.body));

      // 4. A visão pela rota: o custo da organização em reais, com o original e a taxa.
      const porOrganizacao = await http("GET", `/billing/overview?period=${MES}&groupBy=tenant`);
      assert.equal(porOrganizacao.status, 200, JSON.stringify(porOrganizacao.body));
      const dados = porOrganizacao.body.data;
      assert.equal(dados.cost.status, "ok");
      assert.equal(dados.cost.currencyOriginal, "USD");
      assert.equal(dados.cost.fxRate, TAXA);
      assert.equal(dados.cost.runId, runs[0]!.id, "a visão lê a run do mês, a do rateio automático");
      const linha = (dados.lines as Json[]).find((line) => line.tenantId === tenant.id);
      assert.ok(linha, "a organização da suíte está na visão");
      const originalMicro = BigInt(Math.round(own.allocatedCost * 1e6));
      const esperado = (originalMicro * 5_000_000n + 5_000_000_000n) / 10_000_000_000n; // metade para longe do zero (positivo)
      assert.equal(cents(linha.allocatedCost as string), esperado, `custo em reais: ${linha.allocatedCost} × ${own.allocatedCost} USD`);
      assert.equal(linha.allocatedCostOriginal, own.allocatedCost.toFixed(6));

      // O global fecha: as 5 parcelas somam o total importado convertido, em centavos.
      const global = await http("GET", `/billing/overview?period=${MES}&groupBy=global`);
      assert.equal(global.status, 200, JSON.stringify(global.body));
      const g = global.body.data.global as Json;
      assert.equal(global.body.data.cost.status, "ok");
      const parcelas = [g.tenantsCost, g.platformOwnCost, g.unallocatedOther, g.roundingResidualCost, g.conversionResidualCost];
      assert.ok(parcelas.every((value) => typeof value === "string"), `as 5 parcelas em reais: ${JSON.stringify(parcelas)}`);
      assert.equal(
        parcelas.reduce((total: bigint, value: string) => total + cents(value), 0n),
        cents(g.totalCost as string),
        "conservação: tenantsCost + platformOwnCost + unallocatedOther + roundingResidualCost + conversionResidualCost = totalCost",
      );
    } finally {
      if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
      if (importId) {
        await admin.$executeRawUnsafe(
          `DELETE FROM tenant_cloud_cost_allocations WHERE allocation_run_id IN (SELECT id FROM cloud_cost_allocation_runs WHERE import_id = $1::uuid)`,
          importId,
        );
        await admin.$executeRawUnsafe(`DELETE FROM cloud_cost_allocation_runs WHERE import_id = $1::uuid`, importId);
        await admin.$executeRawUnsafe(`DELETE FROM cloud_cost_line_items WHERE import_id = $1::uuid`, importId);
        await admin.$executeRawUnsafe(`DELETE FROM cloud_cost_imports WHERE id = $1::uuid`, importId);
      }
      await admin.$executeRawUnsafe(`DELETE FROM platform_fx_rates WHERE month = $1 AND currency_from = 'USD'`, MES);
      await admin.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = $1::uuid`, tenant.id);
      await admin.user.deleteMany({ where: { id: ator.id } });
      await admin.tenant.deleteMany({ where: { id: tenant.id } });
      await role.drop();
      await admin.$disconnect();
    }
  });
}
