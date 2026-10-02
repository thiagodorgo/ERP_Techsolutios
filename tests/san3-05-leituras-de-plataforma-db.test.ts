import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { PrismaClient } from "@prisma/client";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-05 — T10, T11a–d e T12 do plano v3 (item 10 do gate vendável): as leituras e escritas de PLATAFORMA
// sobre tabelas FORCE ROW LEVEL SECURITY rodam por organização, sob o contexto dela, e somam.
//
// PAPEL DO BANCO: o efêmero do arnês (`createEphemeralRole`: NOSUPERUSER NOBYPASSRLS, só DML), com a postura
// ASSERIDA por execução. A semeadura e a limpeza usam a conexão administrativa. Sob `postgres` (dev/CI) todo
// teste de política ficaria verde para sempre — é por isso que o diferencial existe.
//
// JANELA FIXA EM 2001 (F2-03): ninguém grava em 2001 (`grep -rln '2001-0' tests src prisma` → 0 antes deste
// arquivo), então o seed não colide com a captura de uso que grava `now()` em outras suítes do lote paralelo,
// e os valores esperados são EXATOS (soma 50), não só "iguais".
//
// T11 — A PROPRIEDADE DO ITEM 10 sobre a superfície FECHADA de plataforma (§2.3 do plano): para cada rota e job
// de plataforma que toca tabela FORCE sem tenant, o corpo devolvido (ou o efeito gravado) sob o papel sem bypass
// é IGUAL ao devolvido sob superusuário, com o mesmo seed. UM app só: o singleton `src/database/prisma.ts`
// recebe (antes de qualquer import do app) um client ROTEADO que delega ao client da vez — o administrativo ou
// o efêmero —, e o JWT é de `platform_admin` (CE-G2). A superfície é ENUMERADA DO ROUTER EM RUNTIME: toda rota
// registrada sob `/api/v1/platform` tem de estar na lista fechada abaixo, com etiqueta e tabelas — e as tabelas
// declaradas têm o FORCE conferido no catálogo. Rota nova sem etiqueta = vermelho.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

const JANELA_INICIO = "2001-01-01T00:00:00.000Z";
const JANELA_FIM = "2001-01-02T00:00:00.000Z";
const MES_INICIO = "2001-01-01T00:00:00.000Z";
const MES_FIM = "2001-01-31T23:59:59.999Z";

type Etiqueta = "FORCE-SEM-TENANT" | "FORCE-POR-TENANT" | "SEM-FORCE";
type Superficie = { readonly etiqueta: Etiqueta; readonly tabelas: readonly string[]; readonly nota: string };

const S = (etiqueta: Etiqueta, tabelas: readonly string[], nota: string): Superficie => ({ etiqueta, tabelas, nota });
const P = "/api/v1/platform";

// A superfície FECHADA (§2.3 do plano), rota a rota — enumerada da fonte e conferida contra o router em runtime.
const SUPERFICIE: ReadonlyMap<string, Superficie> = new Map([
  [`GET ${P}/cloud-usage/summary`, S("FORCE-SEM-TENANT", ["cloud_usage_events"], "S1 — T11a")],
  [`POST ${P}/cloud-charges/calculation-runs`, S("FORCE-SEM-TENANT", ["tenant_cloud_cost_allocations", "tenant_cloud_charges"], "S3 — T11c")],
  [`GET ${P}/cloud-charges/calculation-runs/:runId/tenant-charges`, S("FORCE-SEM-TENANT", ["tenant_cloud_charges"], "S3 — T11c")],
  [`GET ${P}/cloud-charges/summary`, S("FORCE-SEM-TENANT", ["tenant_cloud_charges"], "S3 — T11c")],
  [`GET ${P}/cloud-usage/tenants/:tenantId/summary`, S("FORCE-POR-TENANT", ["cloud_usage_events"], "withTenantRls (filtro com tenantId)")],
  [`GET ${P}/cloud-usage/tenants/:tenantId/daily`, S("FORCE-POR-TENANT", ["cloud_usage_daily_aggregates"], "S4 — controle do T11d")],
  [`GET ${P}/overview`, S("FORCE-POR-TENANT", ["users"], "S4 — controle do T11d (listUsersForTenant sob withTenantRls)")],
  [`GET ${P}/tenants/:tenantId/detail`, S("FORCE-POR-TENANT", ["users"], "listUsersForTenant sob withTenantRls")],
  [`GET ${P}/cloud-cost-allocations/runs/:runId/tenant-allocations`, S("FORCE-POR-TENANT", ["tenant_cloud_cost_allocations"], "S4 — controle do T11d (B-O6R-06)")],
  [`POST ${P}/cloud-cost-allocations/runs`, S("FORCE-POR-TENANT", ["tenant_cloud_cost_allocations", "cloud_usage_events"], "forEachTenantInOneTx (B-O6R-06)")],
  [`GET ${P}/cloud-cost-allocations/summary`, S("FORCE-POR-TENANT", ["tenant_cloud_cost_allocations"], "listTenantAllocations por organização (B-O6R-06)")],
  [`GET ${P}/cloud-cost-allocations/runs`, S("SEM-FORCE", ["cloud_cost_allocation_runs"], "excluída")],
  [`GET ${P}/cloud-cost-allocations/runs/:runId`, S("SEM-FORCE", ["cloud_cost_allocation_runs"], "excluída")],
  [`GET ${P}/cloud-charge-rules`, S("SEM-FORCE", ["cloud_charge_rules"], "excluída")],
  [`POST ${P}/cloud-charge-rules`, S("SEM-FORCE", ["cloud_charge_rules"], "excluída")],
  [`GET ${P}/cloud-charge-rules/:ruleId`, S("SEM-FORCE", ["cloud_charge_rules"], "excluída")],
  [`PATCH ${P}/cloud-charge-rules/:ruleId`, S("SEM-FORCE", ["cloud_charge_rules"], "excluída")],
  [`GET ${P}/cloud-charges/calculation-runs`, S("SEM-FORCE", ["cloud_charge_calculation_runs"], "excluída")],
  [`GET ${P}/cloud-charges/calculation-runs/:runId`, S("SEM-FORCE", ["cloud_charge_calculation_runs"], "excluída")],
  [`GET ${P}/cloud-costs/imports`, S("SEM-FORCE", ["cloud_cost_imports"], "excluída")],
  [`GET ${P}/cloud-costs/imports/:importId`, S("SEM-FORCE", ["cloud_cost_imports"], "excluída")],
  [`POST ${P}/cloud-costs/imports/manual-csv`, S("SEM-FORCE", ["cloud_cost_imports", "cloud_cost_line_items"], "excluída")],
  [`GET ${P}/cloud-costs/line-items`, S("SEM-FORCE", ["cloud_cost_line_items"], "excluída")],
  [`GET ${P}/cloud-costs/summary`, S("SEM-FORCE", ["cloud_cost_line_items"], "excluída")],
  [`GET ${P}/tenants`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`POST ${P}/tenants`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`GET ${P}/tenants/:tenantId`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`PATCH ${P}/tenants/:tenantId`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`PATCH ${P}/tenants/:tenantId/status`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`GET ${P}/tenants/:tenantId/modules`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`PATCH ${P}/tenants/:tenantId/modules`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`POST ${P}/tenants/:tenantId/admin-user`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
]);

type Cenario = {
  tenantA: string;
  tenantB: string;
  allocationRunId: string;
  ruleIds: string[];
  calculationRunIds: string[];
};

if (!connectionString) {
  test("san3-05: leituras de plataforma sob papel sem bypass exigem DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL (banco migrado) para executar T10–T12.",
  });
} else {
  test("B-SAN3-05 · T10–T12 — plataforma sob papel NOSUPERUSER NOBYPASSRLS soma o que o superusuário soma", { timeout: 600_000 }, async (t) => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";

    const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const admin = new Client({ adapter: new PrismaPg({ connectionString }) }) as unknown as PrismaClient;
    const efemera = await createEphemeralRole(admin, connectionString);
    const alvo: { atual: PrismaClient } = { atual: admin };
    (globalThis as { prisma?: unknown }).prisma = roteado(alvo);

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const cenario: Cenario = { tenantA: "", tenantB: "", allocationRunId: "", ruleIds: [], calculationRunIds: [] };
    let server: Server | undefined;

    try {
      const postura = await efemera.client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      );
      assert.deepEqual(postura, [{ rolsuper: false, rolbypassrls: false }], "o papel efêmero tem de ser NOSUPERUSER NOBYPASSRLS");

      await semear(admin, suffix, cenario);
      const tag = (tenantId: string): string => (tenantId === cenario.tenantA ? "A" : tenantId === cenario.tenantB ? "B" : `alheio:${tenantId}`);

      // ─────────────── T10 — A10 + A11: o repositório de uso, sob o papel sem bypass ───────────────
      await t.test("T10 · listEvents sem tenant soma os 5 eventos de 2 organizações, intercalados, em ordem (A10)", async () => {
        const { RlsPrismaCloudUsageRepository } = await import("../src/modules/cloud-usage/cloud-usage-prisma.repository.js");
        const events = await new RlsPrismaCloudUsageRepository(efemera.client).listEvents({
          periodStart: new Date(JANELA_INICIO),
          periodEnd: new Date(JANELA_FIM),
        });

        assert.deepEqual(
          events.map((event) => `${tag(event.tenantId)}@${event.occurredAt.toISOString().slice(11, 13)}`),
          ["A@01", "B@02", "A@03", "B@04", "A@05"],
          "as duas organizações, na ordem de occurredAt (zero aqui = o defeito do item 10)",
        );
        assert.equal(events.reduce((total, event) => total + event.quantity, 0), 50);
      });

      await t.test("T10 · listDailyAggregates sem tenant devolve os 2 agregados por date asc (A11)", async () => {
        const { RlsPrismaCloudUsageRepository } = await import("../src/modules/cloud-usage/cloud-usage-prisma.repository.js");
        const aggregates = await new RlsPrismaCloudUsageRepository(efemera.client).listDailyAggregates({
          periodStart: new Date("2001-01-10T00:00:00.000Z"),
          periodEnd: new Date("2001-01-20T00:00:00.000Z"),
        });

        assert.deepEqual(
          aggregates.map((aggregate) => `${tag(aggregate.tenantId)}@${aggregate.date}`),
          ["B@2001-01-14", "A@2001-01-15"],
        );
      });

      // ─────────────── T11 — A12: a superfície fechada, super × efêmero, no MESMO app ───────────────
      const RouterCtor = createRequire(import.meta.url)("router") as { prototype: Record<string, (...args: unknown[]) => unknown> };
      const registros = new Map<object, { mounts: Array<{ path: string; handle: unknown }>; routes: Array<{ path: string; route: { methods: Record<string, boolean> } }> }>();
      const registro = (router: object) => {
        let entry = registros.get(router);
        if (!entry) {
          entry = { mounts: [], routes: [] };
          registros.set(router, entry);
        }
        return entry;
      };
      const originalUse = RouterCtor.prototype.use!;
      const originalRoute = RouterCtor.prototype.route!;
      RouterCtor.prototype.use = function use(this: object, ...args: unknown[]) {
        const hasPath = typeof args[0] === "string" || args[0] instanceof RegExp || Array.isArray(args[0]);
        const path = hasPath ? String(args[0]) : "/";
        for (const fn of (hasPath ? args.slice(1) : args).flat(Infinity)) registro(this).mounts.push({ path, handle: fn });
        return originalUse.apply(this, args);
      };
      RouterCtor.prototype.route = function route(this: object, ...args: unknown[]) {
        const created = originalRoute.apply(this, args) as { methods: Record<string, boolean> };
        registro(this).routes.push({ path: String(args[0]), route: created });
        return created;
      };

      const [
        { createApp },
        { signAccessToken },
        { PrismaCoreSaasService },
        { PrismaCoreSaasStore },
        { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
        { prisma: singleton },
        { createCloudUsageAggregateDailyJobHandler },
      ] = await Promise.all([
        import("../src/app.js"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/database/prisma.js"),
        import("../src/modules/cloud-usage/cloud-usage.jobs.js"),
      ]);

      const appClient = singleton as unknown as PrismaClient;
      let app: ReturnType<typeof createApp>;
      try {
        app = createApp(
          new PrismaCoreSaasService(
            new PrismaCoreSaasStore(
              appClient,
              new TenantRepository(appClient),
              new UserRepository(appClient),
              new RoleRepository(appClient),
              new UserRoleRepository(appClient),
              new AuditLogRepository(appClient),
            ),
          ),
        );
      } finally {
        RouterCtor.prototype.use = originalUse;
        RouterCtor.prototype.route = originalRoute;
      }

      server = app.listen(0, "127.0.0.1");
      await new Promise<void>((resolve) => server!.once("listening", () => resolve()));
      const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const token = await signAccessToken({
        user_id: randomUUID(),
        tenant_id: cenario.tenantA,
        email: `plataforma-${suffix}@san3-05.test`,
        roles: ["platform_admin"],
      });
      const http = async (method: string, path: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown> }> => {
        const response = await fetch(`${baseUrl}${path}`, {
          method,
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return { status: response.status, body: (await response.json()) as Record<string, unknown> };
      };
      const job = createCloudUsageAggregateDailyJobHandler();

      type Medida = {
        s1: unknown;
        s1Quantidade: number;
        s2: unknown[];
        s3Run: unknown;
        s3Charges: unknown[];
        s3Summary: unknown;
        s4Alocacoes: unknown;
        s4Overview: unknown;
        s4Daily: unknown;
      };
      const medidas = new Map<"super" | "efemero", Medida>();

      for (const papel of ["super", "efemero"] as const) {
        alvo.atual = papel === "super" ? admin : efemera.client;
        const identidade = await appClient.$queryRawUnsafe<Array<{ rolsuper: boolean }>>(
          "SELECT rolsuper FROM pg_roles WHERE rolname = current_user",
        );
        assert.equal(identidade[0]?.rolsuper, papel === "super", `o app não está falando como o papel ${papel}`);

        // S1 — GET /cloud-usage/summary (listEvents sem tenant)
        const s1 = await http("GET", `${P}/cloud-usage/summary?periodStart=${JANELA_INICIO}&periodEnd=${JANELA_FIM}`);
        assert.equal(s1.status, 200, JSON.stringify(s1.body));
        const s1Data = s1.body.data as { metrics: Array<{ quantity: number }> };

        // S4 controles ANTES do job (a janela do daily não inclui o dia que o job grava)
        const s4Alocacoes = await http("GET", `${P}/cloud-cost-allocations/runs/${cenario.allocationRunId}/tenant-allocations`);
        assert.equal(s4Alocacoes.status, 200, JSON.stringify(s4Alocacoes.body));
        const s4Overview = await http("GET", `${P}/overview`);
        assert.equal(s4Overview.status, 200, JSON.stringify(s4Overview.body));
        const s4Daily = await http(
          "GET",
          `${P}/cloud-usage/tenants/${cenario.tenantA}/daily?periodStart=2001-01-10T00:00:00.000Z&periodEnd=2001-01-20T00:00:00.000Z`,
        );
        assert.equal(s4Daily.status, 200, JSON.stringify(s4Daily.body));

        // S2 — o job cloud-usage.aggregate-daily (aggregateDailyUsage → listEvents sem tenant → grava agregados)
        await admin.cloudUsageDailyAggregate.deleteMany({
          where: { tenant_id: { in: [cenario.tenantA, cenario.tenantB] }, date: new Date(JANELA_INICIO) },
        });
        await job({ date: JANELA_INICIO }, {} as never);
        const gravados = await admin.cloudUsageDailyAggregate.findMany({
          where: { tenant_id: { in: [cenario.tenantA, cenario.tenantB] }, date: new Date(JANELA_INICIO) },
          orderBy: [{ tenant_id: "asc" }, { metric_key: "asc" }],
        });

        // S3 — POST calculation-runs → GET tenant-charges → GET summary (nesta ordem: o summary lê o run mais recente)
        const s3Run = await http("POST", `${P}/cloud-charges/calculation-runs`, {
          periodStart: MES_INICIO,
          periodEnd: MES_FIM,
          sourceAllocationRunId: cenario.allocationRunId,
        });
        assert.equal(s3Run.status, 201, JSON.stringify(s3Run.body));
        const runId = (s3Run.body.data as { id: string }).id;
        cenario.calculationRunIds.push(runId);
        const s3Charges = await http("GET", `${P}/cloud-charges/calculation-runs/${runId}/tenant-charges`);
        assert.equal(s3Charges.status, 200, JSON.stringify(s3Charges.body));
        const s3Summary = await http("GET", `${P}/cloud-charges/summary?periodStart=${MES_INICIO}&periodEnd=${MES_FIM}`);
        assert.equal(s3Summary.status, 200, JSON.stringify(s3Summary.body));

        medidas.set(papel, {
          s1: normalizar(s1.body.data),
          s1Quantidade: s1Data.metrics.reduce((total, metric) => total + Number(metric.quantity), 0),
          s2: gravados.map((row) => `${tag(row.tenant_id)}|${row.metric_key}|${Number(row.quantity)}|${row.unit}|${row.source_type}`),
          s3Run: normalizar(s3Run.body.data),
          s3Charges: (s3Charges.body.data as Array<Record<string, unknown>>).map((charge) => normalizar({ ...charge, tenantId: tag(String(charge.tenantId)) })),
          s3Summary: normalizar(s3Summary.body.data),
          s4Alocacoes: normalizar(s4Alocacoes.body.data),
          s4Overview: ((s4Overview.body.data as { orgs: Array<{ id: string }> }).orgs ?? [])
            .filter((org) => org.id === cenario.tenantA || org.id === cenario.tenantB)
            .map((org) => normalizar(org)),
          s4Daily: normalizar(s4Daily.body.data),
        });
      }

      const sup = medidas.get("super")!;
      const efe = medidas.get("efemero")!;

      await t.test("T11a · GET /platform/cloud-usage/summary: efêmero == super, e a soma é 50", () => {
        assert.equal(sup.s1Quantidade, 50, "o seed (5 × 10) sob superusuário");
        assert.equal(efe.s1Quantidade, 50, "sob o papel sem bypass a soma tem de ser a mesma (hoje: metrics [] — 50 × vazio)");
        assert.deepEqual(efe.s1, sup.s1);
      });

      await t.test("T11b · job cloud-usage.aggregate-daily: efêmero grava os mesmos 2 agregados que o super", () => {
        assert.equal(sup.s2.length, 2, JSON.stringify(sup.s2));
        assert.deepEqual(sup.s2.map((row) => String(row).split("|").slice(0, 3).join("|")).sort(), [
          "A|storage_bytes_current|30",
          "B|storage_bytes_current|20",
        ]);
        assert.deepEqual(efe.s2, sup.s2, "sob o papel sem bypass o job agrega 0 (H7-a) se a leitura não for por organização");
      });

      await t.test("T11c · POST calculation-runs + GET tenant-charges + GET summary: efêmero == super (2 cobranças)", () => {
        assert.equal(sup.s3Charges.length, 2, JSON.stringify(sup.s3Charges));
        assert.deepEqual(
          (sup.s3Charges as Array<{ tenantId: string }>).map((charge) => charge.tenantId).sort(),
          ["A", "B"],
        );
        assert.deepEqual(efe.s3Charges, sup.s3Charges, "cobranças sob o papel sem bypass (H7-b: hoje 0)");
        assert.deepEqual(efe.s3Run, sup.s3Run);
        assert.deepEqual(efe.s3Summary, sup.s3Summary);
      });

      await t.test("T11d · controles (já por organização): iguais nos dois papéis", () => {
        assert.equal((sup.s4Alocacoes as unknown[]).length, 2);
        assert.deepEqual(efe.s4Alocacoes, sup.s4Alocacoes);
        assert.equal((sup.s4Overview as unknown[]).length, 2, "as duas organizações do seed aparecem no overview");
        assert.deepEqual(efe.s4Overview, sup.s4Overview);
        assert.equal((sup.s4Daily as { daily: unknown[] }).daily.length, 1);
        assert.deepEqual(efe.s4Daily, sup.s4Daily);
      });

      await t.test("T11d · a superfície de /api/v1/platform lida do router em runtime == a lista fechada, com o FORCE de cada tabela conferido", async () => {
        const rotas = new Set<string>();
        const juntar = (prefixo: string, path: string): string => (path === "/" ? prefixo : `${prefixo}${path}`);
        const visitar = (router: object, prefixo: string): void => {
          const entry = registros.get(router);
          if (!entry) return;
          for (const { path, route } of entry.routes) {
            for (const [method, on] of Object.entries(route.methods)) {
              if (on && method !== "_all") rotas.add(`${method.toUpperCase()} ${juntar(prefixo, path)}`);
            }
          }
          for (const { path, handle } of entry.mounts) {
            if (typeof handle === "function" && registros.has(handle)) visitar(handle, juntar(prefixo, path));
          }
        };
        visitar((app as unknown as { router: object }).router, "");

        const plataforma = [...rotas].filter((rota) => rota.split(" ")[1]!.startsWith(`${P}/`) || rota.endsWith(` ${P}`)).sort();
        assert.ok(plataforma.length >= 10, `a leitura do router veio rasa: ${JSON.stringify(plataforma)}`);
        assert.deepEqual(
          { semEtiqueta: plataforma.filter((rota) => !SUPERFICIE.has(rota)), etiquetaSemRota: [...SUPERFICIE.keys()].filter((rota) => !plataforma.includes(rota)) },
          { semEtiqueta: [], etiquetaSemRota: [] },
          "rota de plataforma nova (ou sumida) sem atualização da lista fechada do §2.3",
        );

        const tabelas = [...new Set([...SUPERFICIE.values()].flatMap((item) => item.tabelas))];
        const force = await admin.$queryRawUnsafe<Array<{ relname: string; force: boolean }>>(
          "SELECT c.relname, c.relforcerowsecurity AS force FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname = ANY($1::text[])",
          tabelas,
        );
        const forcePorTabela = new Map(force.map((row) => [row.relname, row.force]));
        for (const [rota, item] of SUPERFICIE) {
          for (const tabela of item.tabelas) {
            assert.ok(forcePorTabela.has(tabela), `${rota}: a tabela ${tabela} não existe no banco`);
            assert.equal(forcePorTabela.get(tabela), item.etiqueta !== "SEM-FORCE", `${rota}: ${tabela} tem FORCE=${forcePorTabela.get(tabela)} e a etiqueta é ${item.etiqueta}`);
          }
          if (item.etiqueta === "FORCE-SEM-TENANT") assert.match(item.nota, /T11[ac]/, `${rota}: rota FORCE sem tenant sem diferencial`);
          if (item.etiqueta !== "SEM-FORCE") assert.ok(item.tabelas.length > 0, `${rota}: etiqueta FORCE sem tabela nomeada`);
        }
      });

      alvo.atual = efemera.client;

      // ─────────────── T12 — A13 + A14: o repositório de cobrança pela FÁBRICA, sob o papel sem bypass ───────────────
      await t.test("T12 · via createPrismaCloudChargeRepository(): alocações, cobranças, replace (B7) sob o papel sem bypass (A13)", async () => {
        const { createPrismaCloudChargeRepository } = await import("../src/modules/cloud-charges/cloud-charge-prisma.repository.js");
        const repo = await createPrismaCloudChargeRepository();

        const alocacoes = await repo.listAllocationTenantAllocations(cenario.allocationRunId);
        assert.deepEqual(alocacoes.map((item) => tag(item.tenantId)).sort(), ["A", "B"]);

        const run = await repo.createCalculationRun({
          periodStart: new Date("2002-01-01T00:00:00.000Z"),
          periodEnd: new Date("2002-01-31T23:59:59.999Z"),
          sourceAllocationRunId: cenario.allocationRunId,
        });
        cenario.calculationRunIds.push(run.id);

        const gravadas = await repo.replaceTenantCharges(run.id, [cobranca(cenario, run.id, cenario.tenantA, 33), cobranca(cenario, run.id, cenario.tenantB, 11)]);
        assert.deepEqual(gravadas.map((charge) => tag(charge.tenantId)), ["A", "B"], "devolve na ordem de entrada");
        assert.equal((await repo.listTenantCharges(run.id)).length, 2);
        assert.deepEqual((await repo.listTenantCharges(run.id, { tenantId: cenario.tenantA })).map((charge) => tag(charge.tenantId)), ["A"]);

        await repo.replaceTenantCharges(run.id, [cobranca(cenario, run.id, cenario.tenantA, 44)]);
        const depois = await repo.listTenantCharges(run.id);
        assert.deepEqual(depois.map((charge) => `${tag(charge.tenantId)}:${charge.finalChargeAmount}`), ["A:44"], "B7: a cobrança de quem saiu do cálculo é APAGADA sob o contexto dela");
        assert.equal(await admin.tenantCloudCharge.count({ where: { calculation_run_id: run.id } }), 1, "conferido pela conexão administrativa");
      });

      await t.test("T12 · B8: falha injetada na 2ª organização não deixa NENHUMA linha da 1ª (uma transação só)", async () => {
        const { RlsPrismaCloudChargeRepository } = await import("../src/modules/cloud-charges/cloud-charge-prisma.repository.js");
        const run = await new RlsPrismaCloudChargeRepository(efemera.client).createCalculationRun({
          periodStart: new Date("2002-02-01T00:00:00.000Z"),
          periodEnd: new Date("2002-02-28T23:59:59.999Z"),
          sourceAllocationRunId: cenario.allocationRunId,
        });
        cenario.calculationRunIds.push(run.id);
        const repo = new RlsPrismaCloudChargeRepository(efemera.client);
        await repo.replaceTenantCharges(run.id, [cobranca(cenario, run.id, cenario.tenantA, 1), cobranca(cenario, run.id, cenario.tenantB, 2)]);

        const quebrado = new RlsPrismaCloudChargeRepository(comCreateQueFalha(efemera.client, 2));
        await assert.rejects(
          () => quebrado.replaceTenantCharges(run.id, [cobranca(cenario, run.id, cenario.tenantA, 7), cobranca(cenario, run.id, cenario.tenantB, 8)]),
          /falha injetada/,
        );
        const restantes = await admin.tenantCloudCharge.findMany({ where: { calculation_run_id: run.id }, orderBy: { final_charge_amount: "asc" } });
        assert.deepEqual(restantes.map((row) => `${tag(row.tenant_id)}:${Number(row.final_charge_amount)}`), ["A:1", "B:2"], "o conjunto anterior sobrevive inteiro");
      });

      await t.test("T12 · A14: o canário — linha de outra organização numa volta lança rows_from_another_tenant", async () => {
        const [{ RlsPrismaCloudChargeRepository }, { RlsPrismaCloudUsageRepository }] = await Promise.all([
          import("../src/modules/cloud-charges/cloud-charge-prisma.repository.js"),
          import("../src/modules/cloud-usage/cloud-usage-prisma.repository.js"),
        ]);
        const vazaCobranca = new RlsPrismaCloudChargeRepository(comFindManyQueVaza(efemera.client, "tenantCloudCharge", cenario.tenantB));
        const vazaAlocacao = new RlsPrismaCloudChargeRepository(comFindManyQueVaza(efemera.client, "tenantCloudCostAllocation", cenario.tenantB));
        const vazaUso = new RlsPrismaCloudUsageRepository(comFindManyQueVaza(efemera.client, "cloudUsageEvent", cenario.tenantB));
        const canario = (error: unknown): boolean => (error as { code?: string }).code === "rows_from_another_tenant";

        await assert.rejects(() => vazaCobranca.listTenantCharges(cenario.calculationRunIds[0]!), canario);
        await assert.rejects(() => vazaAlocacao.listAllocationTenantAllocations(cenario.allocationRunId), canario);
        await assert.rejects(
          () => vazaUso.listEvents({ periodStart: new Date(JANELA_INICIO), periodEnd: new Date(JANELA_FIM) }),
          canario,
        );
      });
    } finally {
      if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
      await limpar(admin, cenario);
      await efemera.drop();
      await admin.$disconnect();
    }
  });
}

/** Client que delega, a cada acesso, ao client da vez — o singleton do app troca de papel sem novo import. */
function roteado(alvo: { atual: PrismaClient }): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, property) {
      const client = alvo.atual as unknown as Record<PropertyKey, unknown>;
      const value = client[property];
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(alvo.atual) : value;
    },
    // `"$transaction" in client` (o assert do executor do rateio, B-O6R-06) pergunta ao client da vez.
    has(_target, property) {
      return property in (alvo.atual as object);
    },
  });
}

/** Ids, tempos e carimbos de geração variam entre execuções; o resto do corpo tem de ser idêntico. */
function normalizar(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizar);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (/^(id|runId|calculationRunId|createdAt|updatedAt|startedAt|completedAt|generatedAt|createdBy)$/.test(key)) continue;
      if (key === "metadata" && inner && typeof inner === "object") {
        const { executionStartedAt: _a, executionCompletedAt: _b, ...rest } = inner as Record<string, unknown>;
        out[key] = normalizar(rest);
        continue;
      }
      out[key] = normalizar(inner);
    }
    return out;
  }
  return value;
}

function cobranca(cenario: Cenario, runId: string, tenantId: string, valor: number) {
  return {
    calculationRunId: runId,
    tenantId,
    sourceAllocationRunId: cenario.allocationRunId,
    periodStart: new Date("2002-01-01T00:00:00.000Z"),
    periodEnd: new Date("2002-01-31T23:59:59.999Z"),
    allocatedCost: valor,
    includedCloudCost: 0,
    billableCost: valor,
    markupType: "percentage" as const,
    markupValue: 0,
    minimumMonthlyCharge: 0,
    grossChargeAmount: valor,
    discountAmount: 0,
    finalChargeAmount: valor,
    marginAmount: 0,
    currency: "BRL",
    status: "draft" as const,
    metadata: {},
  };
}

async function semear(admin: PrismaClient, suffix: string, cenario: Cenario): Promise<void> {
  const tenantA = await admin.tenant.create({ data: { name: `SAN3-05 A ${suffix}`, slug: `san3-05-a-${suffix}` } });
  const tenantB = await admin.tenant.create({ data: { name: `SAN3-05 B ${suffix}`, slug: `san3-05-b-${suffix}` } });
  cenario.tenantA = tenantA.id;
  cenario.tenantB = tenantB.id;

  // Intercalado (F12): A 01h, 03h, 05h; B 02h, 04h — a concatenação por organização só sai ordenada se reordenar.
  const eventos = [
    [tenantA.id, 1],
    [tenantB.id, 2],
    [tenantA.id, 3],
    [tenantB.id, 4],
    [tenantA.id, 5],
  ] as const;
  await admin.cloudUsageEvent.createMany({
    data: eventos.map(([tenantId, hora]) => ({
      tenant_id: tenantId,
      source_type: "medicao",
      metric_key: "storage_bytes_current",
      quantity: 10,
      unit: "bytes",
      occurred_at: new Date(`2001-01-01T0${hora}:00:00.000Z`),
      metadata: {},
    })),
  });
  await admin.cloudUsageDailyAggregate.createMany({
    data: [
      { tenant_id: tenantA.id, date: new Date("2001-01-15T00:00:00.000Z"), metric_key: "storage_bytes_current", quantity: 7, unit: "bytes", source_type: "medicao", metadata: {} },
      { tenant_id: tenantB.id, date: new Date("2001-01-14T00:00:00.000Z"), metric_key: "storage_bytes_current", quantity: 3, unit: "bytes", source_type: "medicao", metadata: {} },
    ],
  });

  const run = await admin.cloudCostAllocationRun.create({
    data: {
      provider: "aws",
      status: "completed",
      period_start: new Date(MES_INICIO),
      period_end: new Date(MES_FIM),
      strategy: "usage_weighted_v1",
      total_imported_cost: 40,
      total_allocated_cost: 40,
      currency: "BRL",
      completed_at: new Date(MES_FIM),
      metadata: { origem: "san3-05-teste" },
    },
  });
  cenario.allocationRunId = run.id;
  for (const [tenantId, custo] of [[tenantA.id, 30], [tenantB.id, 10]] as const) {
    await admin.tenantCloudCostAllocation.create({
      data: {
        allocation_run_id: run.id,
        tenant_id: tenantId,
        provider: "aws",
        period_start: new Date(MES_INICIO),
        period_end: new Date(MES_FIM),
        service_code: "AmazonS3",
        allocation_method: "storage_usage_weight",
        allocated_cost: custo,
        currency: "BRL",
        source_cost_line_item_ids: [],
        metadata: {},
      },
    });
    // Regra POR ORGANIZAÇÃO, vigente só em 2001: prevalece sobre regra default que outra suíte do lote crie.
    const rule = await admin.cloudChargeRule.create({
      data: {
        tenant_id: tenantId,
        name: `SAN3-05 ${suffix}`,
        priority: 1000,
        effective_from: new Date(MES_INICIO),
        effective_until: new Date("2001-12-31T23:59:59.999Z"),
        currency: "BRL",
        markup_type: "percentage",
        markup_value: 10,
        metadata: {},
      },
    });
    cenario.ruleIds.push(rule.id);
  }
}

async function limpar(admin: PrismaClient, cenario: Cenario): Promise<void> {
  const tenantIds = [cenario.tenantA, cenario.tenantB].filter(Boolean);
  if (tenantIds.length === 0) return;
  await admin.tenantCloudCharge.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  if (cenario.calculationRunIds.length > 0) {
    await admin.cloudChargeCalculationRun.deleteMany({ where: { id: { in: cenario.calculationRunIds } } });
  }
  if (cenario.allocationRunId) {
    await admin.cloudChargeCalculationRun.deleteMany({ where: { source_allocation_run_id: cenario.allocationRunId } });
  }
  await admin.cloudChargeRule.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.tenantCloudCostAllocation.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  if (cenario.allocationRunId) await admin.cloudCostAllocationRun.deleteMany({ where: { id: cenario.allocationRunId } });
  await admin.cloudUsageDailyAggregate.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.cloudUsageEvent.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.tenant.deleteMany({ where: { id: { in: tenantIds } } });
}

/**
 * O proxy TEM de atravessar o `$transaction`: o envoltório opera sobre o `tx` que o `forEachTenantRls` recebe.
 * Um proxy só no client de fora ficaria verde por nunca ser chamado.
 */
function comModelo<T extends object>(client: T, modelo: string, sobrescrever: (delegate: object) => Record<string, unknown>): T {
  const envolver = (alvo: object): object =>
    new Proxy(alvo, {
      get(inner, property, receiver) {
        if (property === "$transaction") {
          const original = Reflect.get(inner, property, receiver) as (fn: (tx: unknown) => Promise<unknown>, options?: unknown) => Promise<unknown>;
          return (fn: (tx: unknown) => Promise<unknown>, options?: unknown) => original.call(inner, (tx: unknown) => fn(envolver(tx as object)), options);
        }
        const value = Reflect.get(inner, property, receiver);
        if (property === modelo && value && typeof value === "object") {
          const extra = sobrescrever(value as object);
          return new Proxy(value as object, {
            get(delegate, key, delegateReceiver) {
              if (typeof key === "string" && key in extra) return extra[key];
              const inner2 = Reflect.get(delegate, key, delegateReceiver);
              return typeof inner2 === "function" ? (inner2 as (...args: unknown[]) => unknown).bind(delegate) : inner2;
            },
          });
        }
        return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(inner) : value;
      },
    });
  return envolver(client) as T;
}

function comFindManyQueVaza<T extends object>(client: T, modelo: string, tenantAlheio: string): T {
  return comModelo(client, modelo, (delegate) => ({
    async findMany(args: unknown) {
      const rows = (await (delegate as Record<string, (input: unknown) => Promise<unknown[]>>).findMany!(args)) as Array<Record<string, unknown>>;
      return rows.map((row) => ({ ...row, tenant_id: tenantAlheio }));
    },
  }));
}

function comCreateQueFalha<T extends object>(client: T, falharNaChamada: number): T {
  let chamadas = 0;
  return comModelo(client, "tenantCloudCharge", (delegate) => ({
    async create(args: unknown) {
      chamadas += 1;
      if (chamadas >= falharNaChamada) throw new Error("falha injetada na gravação da cobrança");
      return (delegate as Record<string, (input: unknown) => Promise<unknown>>).create!(args);
    },
  }));
}
