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
// JANELA HISTÓRICA EXCLUSIVA POR PROCESSO (F2-03): cada execução sorteia um bloco não sobreposto de 32 dias
// entre os anos 1000 e 9760. Assim, processos paralelos não disputam o "run mais recente" dos resumos globais,
// e os valores esperados continuam EXATOS (soma 50), não só "iguais".
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

const DIA_MS = 24 * 60 * 60 * 1_000;
const SLOT_JANELA = Number.parseInt(randomUUID().replaceAll("-", "").slice(0, 12), 16) % 100_000;
const JANELA_BASE_MS = Date.UTC(1000, 0, 1) + SLOT_JANELA * 32 * DIA_MS;
const iso = (offsetMs: number): string => new Date(JANELA_BASE_MS + offsetMs).toISOString();
const data = (offsetDias: number): string => iso(offsetDias * DIA_MS).slice(0, 10);
const JANELA_INICIO = iso(0);
const JANELA_FIM = iso(DIA_MS - 1);
const MES_INICIO = JANELA_INICIO;
const MES_FIM = JANELA_FIM;
const DAILY_INICIO = iso(9 * DIA_MS);
const DAILY_FIM = iso(19 * DIA_MS + DIA_MS - 1);
const DAILY_B = data(13);
const DAILY_A = data(14);

type Etiqueta = "FORCE-SEM-TENANT" | "FORCE-POR-TENANT" | "SEM-FORCE";
type Superficie = { readonly etiqueta: Etiqueta; readonly tabelas: readonly string[]; readonly nota: string };

const S = (etiqueta: Etiqueta, tabelas: readonly string[], nota: string): Superficie => ({ etiqueta, tabelas, nota });
const P = "/api/v1/platform";
/** B-ASS-08b — o prefixo da rota de infra do webhook de cobrança (montada em src/app.ts sob /api/v1, antes do parser e de
 * qualquer ator; fora de /api/v1/platform, por isso entra no filtro do T11g pelo próprio prefixo). */
const WEBHOOK = "/api/v1/webhooks/billing";

// A superfície FECHADA (§2.3 do plano), rota a rota — enumerada da fonte e conferida contra o router em runtime.
const SUPERFICIE: ReadonlyMap<string, Superficie> = new Map([
  [`GET ${P}/cloud-usage/summary`, S("FORCE-SEM-TENANT", ["cloud_usage_events"], "S1 — T11a")],
  [`GET ${P}/cloud-usage/tenants/:tenantId/summary`, S("FORCE-POR-TENANT", ["cloud_usage_events"], "withTenantRls (filtro com tenantId)")],
  [`GET ${P}/cloud-usage/tenants/:tenantId/daily`, S("FORCE-POR-TENANT", ["cloud_usage_daily_aggregates"], "S4 — controle do T11d")],
  [`GET ${P}/overview`, S("FORCE-POR-TENANT", ["users"], "S4 — controle do T11d (listUsersForTenant sob withTenantRls)")],
  [`GET ${P}/tenants/:tenantId/detail`, S("FORCE-POR-TENANT", ["users", "tenant_subscriptions", "tenant_subscription_addons"], "usuários e assinatura sob withTenantRls")],
  [`GET ${P}/cloud-cost-allocations/runs/:runId/tenant-allocations`, S("FORCE-POR-TENANT", ["tenant_cloud_cost_allocations"], "S4 — controle do T11d (B-O6R-06)")],
  [`POST ${P}/cloud-cost-allocations/runs`, S("FORCE-POR-TENANT", ["tenant_cloud_cost_allocations", "cloud_usage_events", "audit_logs", "users", "checklist_attachments", "work_order_attachments", "attachments", "damage_attachments"], "forEachTenantRls (B-O6R-06; bases derivadas B-SAN3-03)")],
  [`GET ${P}/cloud-cost-allocations/summary`, S("FORCE-POR-TENANT", ["tenant_cloud_cost_allocations"], "listTenantAllocations por organização (B-O6R-06)")],
  [`GET ${P}/cloud-cost-allocations/runs`, S("SEM-FORCE", ["cloud_cost_allocation_runs"], "excluída")],
  [`GET ${P}/cloud-cost-allocations/runs/:runId`, S("SEM-FORCE", ["cloud_cost_allocation_runs"], "excluída")],
  [`GET ${P}/cloud-costs/imports`, S("SEM-FORCE", ["cloud_cost_imports"], "excluída")],
  [`GET ${P}/cloud-costs/imports/:importId`, S("SEM-FORCE", ["cloud_cost_imports"], "excluída")],
  [`POST ${P}/cloud-costs/imports/manual-csv`, S("SEM-FORCE", ["cloud_cost_imports", "cloud_cost_line_items"], "excluída")],
  [`GET ${P}/cloud-costs/line-items`, S("SEM-FORCE", ["cloud_cost_line_items"], "excluída")],
  [`GET ${P}/cloud-costs/summary`, S("SEM-FORCE", ["cloud_cost_line_items"], "excluída")],
  [`GET ${P}/billing/plans`, S("SEM-FORCE", ["subscription_plans", "subscription_plan_versions"], "catálogo global")],
  [`GET ${P}/billing/plans/summary`, S("SEM-FORCE", ["subscription_plans", "subscription_plan_versions"], "catálogo global; a leitura tenant-scoped tem prova própria no B-ASS-02")],
  [`GET ${P}/billing/plans/:planId`, S("SEM-FORCE", ["subscription_plans", "subscription_plan_versions"], "catálogo global")],
  [`GET ${P}/billing/plans/:planId/versions`, S("SEM-FORCE", ["subscription_plan_versions"], "catálogo global")],
  [`POST ${P}/billing/plans`, S("SEM-FORCE", ["subscription_plans"], "catálogo global")],
  [`PATCH ${P}/billing/plans/:planId`, S("SEM-FORCE", ["subscription_plans", "subscription_plan_versions"], "catálogo global")],
  [`POST ${P}/billing/plans/:planId/versions`, S("SEM-FORCE", ["subscription_plans", "subscription_plan_versions"], "catálogo global; a ressincronização condicional tem prova própria no B-ASS-02")],
  [`GET ${P}/billing/tenants/:tenantId/subscription`, S("FORCE-POR-TENANT", ["tenant_subscriptions", "tenant_subscription_addons"], "withTenantRls")],
  [`GET ${P}/billing/tenants/:tenantId/subscription/history`, S("FORCE-POR-TENANT", ["tenant_subscriptions", "tenant_subscription_addons"], "withTenantRls")],
  [`PUT ${P}/billing/tenants/:tenantId/subscription`, S("FORCE-POR-TENANT", ["tenant_subscriptions", "tenant_subscription_addons"], "withTenantRls")],
  [`DELETE ${P}/billing/tenants/:tenantId/subscription`, S("FORCE-POR-TENANT", ["tenant_subscriptions", "tenant_subscription_addons"], "withTenantRls")],
  [`GET ${P}/billing/tenants/:tenantId/usage`, S("FORCE-POR-TENANT", ["tenant_usage_daily"], "withTenantRls (medição diária do B-ASS-03)")],
  [`GET ${P}/billing/statements`, S("FORCE-POR-TENANT", ["subscription_statements"], "listStatements sob withTenantRls (B-ASS-04)")],
  [`GET ${P}/billing/statements/:statementId`, S("FORCE-POR-TENANT", ["subscription_statements", "subscription_statement_payments", "subscription_credits"], "findStatement + pagamentos + créditos sob withTenantRls")],
  [`POST ${P}/billing/statements/close`, S("FORCE-POR-TENANT", ["subscription_statements", "audit_logs"], "fechamento manual: INSERT … ON CONFLICT + FOR UPDATE sob withTenantRls")],
  [`POST ${P}/billing/statements/:statementId/reopen`, S("FORCE-POR-TENANT", ["subscription_statements", "audit_logs"], "FOR UPDATE sob withTenantRls")],
  [`PATCH ${P}/billing/statements/:statementId/adjustment`, S("FORCE-POR-TENANT", ["subscription_statements", "audit_logs"], "FOR UPDATE sob withTenantRls")],
  [`POST ${P}/billing/statements/:statementId/payments`, S("FORCE-POR-TENANT", ["subscription_statements", "subscription_statement_payments", "audit_logs"], "baixa manual sob withTenantRls")],
  [`POST ${P}/billing/statements/:statementId/payments/:paymentId/reverse`, S("FORCE-POR-TENANT", ["subscription_statements", "subscription_statement_payments", "audit_logs"], "estorno manual sob withTenantRls")],
  [`POST ${P}/billing/statements/:statementId/cancel`, S("FORCE-POR-TENANT", ["subscription_statements", "audit_logs"], "FOR UPDATE sob withTenantRls")],
  [`GET ${P}/billing/credits`, S("FORCE-POR-TENANT", ["subscription_credits"], "listCredits sob withTenantRls")],
  [`POST ${P}/billing/credits/:creditId/apply`, S("FORCE-POR-TENANT", ["subscription_credits", "subscription_statements", "audit_logs"], "FOR UPDATE do crédito e do demonstrativo sob withTenantRls")],
  [`POST ${P}/billing/credits/:creditId/write-off`, S("FORCE-POR-TENANT", ["subscription_credits", "audit_logs"], "FOR UPDATE do crédito sob withTenantRls")],
  [`GET ${P}/billing/tenants/:tenantId/billing-profile`, S("FORCE-POR-TENANT", ["tenant_billing_profiles"], "perfil de cobrança sob withTenantRls")],
  [`PUT ${P}/billing/tenants/:tenantId/billing-profile`, S("FORCE-POR-TENANT", ["tenant_billing_profiles", "audit_logs"], "upsert por tenant_id sob withTenantRls")],
  // B-ASS-05: o cofre e a configuração dos provedores tocam só as 3 tabelas GLOBAIS da M4 (sem tenant_id, sem RLS).
  [`GET ${P}/billing/providers`, S("SEM-FORCE", ["billing_provider_configs", "billing_provider_credentials"], "configuração e resumo das credenciais: tabelas globais da plataforma (M4)")],
  [`GET ${P}/billing/providers/:provider`, S("SEM-FORCE", ["billing_provider_configs", "billing_provider_credentials"], "configuração e resumo das credenciais: tabelas globais da plataforma (M4)")],
  [`PUT ${P}/billing/providers/:provider`, S("SEM-FORCE", ["billing_provider_configs", "platform_audit_logs"], "upsert da configuração global e trilha de plataforma (M4)")],
  [`PUT ${P}/billing/providers/:provider/credentials`, S("SEM-FORCE", ["billing_provider_credentials", "platform_audit_logs"], "cofre global (M4): grava a credencial cifrada e a trilha")],
  [`POST ${P}/billing/vault/rotate`, S("SEM-FORCE", ["billing_provider_credentials", "platform_audit_logs"], "rotação da chave do cofre global (M4)")],
  [`GET ${P}/tenants`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`POST ${P}/tenants`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`GET ${P}/tenants/:tenantId`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`PATCH ${P}/tenants/:tenantId`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`PATCH ${P}/tenants/:tenantId/status`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`GET ${P}/tenants/:tenantId/modules`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`PATCH ${P}/tenants/:tenantId/modules`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  [`POST ${P}/tenants/:tenantId/admin-user`, S("SEM-FORCE", [], "PlatformTenantsRepository em memória — não toca o banco")],
  // B-ASS-08b — a rota de INFRA do webhook dos provedores (fora de /api/v1, sem módulo, sem ator): também entra na lista
  // fechada, lida do router em runtime pelo prefixo `WEBHOOK` (T11g). Grava só a tabela GLOBAL de eventos; a organização sai
  // do NOSSO statement_id no job, nunca do corpo. Rota nova sob o prefixo sem etiqueta = vermelho.
  [`POST ${WEBHOOK}/:provider`, S("SEM-FORCE", ["billing_webhook_events"], "infra, sem módulo: o webhook dos provedores (B-ASS-08b)")],
]);

type EtiquetaJob = "FORCE-PLATAFORMA" | "FORA-DA-SUPERFICIE";
const JOBS: ReadonlyMap<string, EtiquetaJob> = new Map([
  ["aws-cur.import-cost-file", "FORA-DA-SUPERFICIE"],
  ["cloud-cost-allocation.run", "FORCE-PLATAFORMA"],
  ["checklist-attachment-postprocess", "FORA-DA-SUPERFICIE"],
  ["cloud-usage.aggregate-daily", "FORCE-PLATAFORMA"],
  ["subscription.measure-daily", "FORCE-PLATAFORMA"],
  ["subscription.close-statements", "FORCE-PLATAFORMA"],
  // B-ASS-08b — o canal de cobrança: os 4 tocam tabela FORCE de organização (billing_outbox, subscription_statement_charges,
  // subscription_statements e pagamentos) a partir das tabelas GLOBAIS de ids e eventos; cada um tem cenário executado abaixo.
  ["billing.dispatch-outbox", "FORCE-PLATAFORMA"],
  ["billing.reconcile-webhook", "FORCE-PLATAFORMA"],
  ["billing.poll-pending", "FORCE-PLATAFORMA"],
  ["billing.poll-settled", "FORCE-PLATAFORMA"],
  ["notification-dispatch", "FORA-DA-SUPERFICIE"],
  ["notifications.scan-due", "FORA-DA-SUPERFICIE"],
  ["audit-log-fanout", "FORA-DA-SUPERFICIE"],
  ["field-ops-event-fanout", "FORA-DA-SUPERFICIE"],
  ["impound.reconcile-removals", "FORA-DA-SUPERFICIE"],
  ["charging.accrue-daily", "FORA-DA-SUPERFICIE"],
  ["impound.notify-due", "FORA-DA-SUPERFICIE"],
]);

type Cenario = {
  tenantA: string;
  tenantB: string;
  usageSourceType: string;
  allocationRunId: string;
  allocationRunIds: string[];
  costImportId: string;
  ruleIds: string[];
  calculationRunIds: string[];
  subscriptionPlanId: string;
  subscriptionPlanCode: string;
  subscriptionValidFrom: string;
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
    const cenario: Cenario = {
      tenantA: "",
      tenantB: "",
      usageSourceType: `san3_05_${suffix}`,
      allocationRunId: "",
      allocationRunIds: [],
      costImportId: "",
      ruleIds: [],
      calculationRunIds: [],
      subscriptionPlanId: "",
      subscriptionPlanCode: "",
      // A data de NEGÓCIO de hoje (America/Sao_Paulo), a mesma régua do serviço de assinatura. Antes era a data UTC
      // (`toISOString().slice(0, 10)`, desde o #504): das 21:00 às 24:00 em São Paulo ela já é amanhã, e o DELETE logo
      // abaixo grava `valid_to = agora` < `valid_from` → 400 `tenant_subscriptions_valid_to_check` (medido em 09/11 no
      // B-ASS-08b). Defeito pré-existente do arnês, consertado aqui porque barrava o cenário do canal nessa janela.
      subscriptionValidFrom: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()),
    };
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
        const eventosGlobais = await new RlsPrismaCloudUsageRepository(efemera.client).listEvents({
          periodStart: new Date(JANELA_INICIO),
          periodEnd: new Date(JANELA_FIM),
        });
        const events = eventosGlobais.filter((event) => event.tenantId === cenario.tenantA || event.tenantId === cenario.tenantB);

        assert.deepEqual(
          events.map((event) => `${tag(event.tenantId)}@${event.occurredAt.toISOString().slice(11, 13)}`),
          ["A@01", "B@02", "A@03", "B@04", "A@05"],
          "as duas organizações, na ordem de occurredAt (zero aqui = o defeito do item 10)",
        );
        assert.equal(events.reduce((total, event) => total + event.quantity, 0), 50);
      });

      await t.test("T10 · listDailyAggregates sem tenant devolve os 2 agregados por date asc (A11)", async () => {
        const { RlsPrismaCloudUsageRepository } = await import("../src/modules/cloud-usage/cloud-usage-prisma.repository.js");
        const agregadosGlobais = await new RlsPrismaCloudUsageRepository(efemera.client).listDailyAggregates({
          periodStart: new Date(DAILY_INICIO),
          periodEnd: new Date(DAILY_FIM),
        });
        const aggregates = agregadosGlobais.filter((aggregate) => aggregate.tenantId === cenario.tenantA || aggregate.tenantId === cenario.tenantB);

        assert.deepEqual(
          aggregates.map((aggregate) => `${tag(aggregate.tenantId)}@${aggregate.date}`),
          [`B@${DAILY_B}`, `A@${DAILY_A}`],
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
        { getDefaultJobRegistry, resetDefaultJobRegistryForTests },
      ] = await Promise.all([
        import("../src/app.js"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/database/prisma.js"),
        import("../src/infra/jobs/job.registry.js"),
      ]);

      const { runSubscriptionMeasureDaily, runSubscriptionCloseStatements, closeStatementsPeriod } = await import(
        "../src/modules/subscription-billing/subscription-billing.jobs.js"
      );
      const { createDefaultStatementRuntime } = await import("../src/modules/subscription-billing/statements/statement.factory.js");

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
      resetDefaultJobRegistryForTests();
      const registry = getDefaultJobRegistry();
      const registeredJobs = new Set(
        (registry as unknown as { handlers: Map<string, unknown> }).handlers.keys(),
      );
      assert.deepEqual(
        { semEtiqueta: [...registeredJobs].filter((name) => !JOBS.has(name)), etiquetaSemJob: [...JOBS.keys()].filter((name) => !registeredJobs.has(name)) },
        { semEtiqueta: [], etiquetaSemJob: [] },
        "o registro runtime de jobs precisa coincidir com a lista fechada",
      );
      const usageJob = registry.get("cloud-usage.aggregate-daily");
      const allocationJob = registry.get("cloud-cost-allocation.run");
      assert.ok(usageJob && allocationJob, "os dois jobs FORCE precisam estar registrados");

      type Medida = {
        s1: unknown;
        s1Quantidade: number;
        s2: unknown[];
        s4Alocacoes: unknown;
        s4Overview: unknown;
        s4Daily: unknown;
        rotas: Record<string, unknown>;
        jobs: Record<string, unknown>;
      };
      const medidas = new Map<"super" | "efemero", Medida>();

      for (const papel of ["super", "efemero"] as const) {
        alvo.atual = papel === "super" ? admin : efemera.client;
        await admin.tenantSubscriptionAddon.deleteMany({ where: { tenant_id: cenario.tenantB } });
        await admin.tenantSubscription.deleteMany({ where: { tenant_id: cenario.tenantB } });
        await admin.tenant.update({ where: { id: cenario.tenantB }, data: { modules: [] } });
        const rotas: Record<string, unknown> = {};
        const jobs: Record<string, unknown> = {};
        const registrarRota = (chave: string, body: unknown): void => {
          assert.ok(SUPERFICIE.get(chave)?.etiqueta !== "SEM-FORCE", `cenário registrado para rota fora da superfície FORCE: ${chave}`);
          assertNonEmpty(body, chave);
          rotas[chave] = normalizar(body);
        };
        const registrarJob = (chave: string, efeito: unknown): void => {
          assert.equal(JOBS.get(chave), "FORCE-PLATAFORMA", `cenário registrado para job fora da superfície FORCE: ${chave}`);
          assertNonEmpty(efeito, chave);
          jobs[chave] = normalizar(efeito);
        };
        const identidade = await appClient.$queryRawUnsafe<Array<{ rolsuper: boolean }>>(
          "SELECT rolsuper FROM pg_roles WHERE rolname = current_user",
        );
        assert.equal(identidade[0]?.rolsuper, papel === "super", `o app não está falando como o papel ${papel}`);

        // S1 — GET /cloud-usage/summary (listEvents sem tenant)
        const s1 = await http("GET", `${P}/cloud-usage/summary?periodStart=${JANELA_INICIO}&periodEnd=${JANELA_FIM}`);
        assert.equal(s1.status, 200, JSON.stringify(s1.body));
        const s1Data = recortarResumoUso(s1.body.data, cenario.usageSourceType);
        registrarRota(`GET ${P}/cloud-usage/summary`, s1Data);

        // S4 controles ANTES do job (a janela do daily não inclui o dia que o job grava)
        const s4Alocacoes = await http("GET", `${P}/cloud-cost-allocations/runs/${cenario.allocationRunId}/tenant-allocations`);
        assert.equal(s4Alocacoes.status, 200, JSON.stringify(s4Alocacoes.body));
        registrarRota(`GET ${P}/cloud-cost-allocations/runs/:runId/tenant-allocations`, s4Alocacoes.body.data);
        const s4Overview = await http("GET", `${P}/overview`);
        assert.equal(s4Overview.status, 200, JSON.stringify(s4Overview.body));
        const s4OverviewSeed = recortarOverview(s4Overview.body.data, cenario);
        registrarRota(`GET ${P}/overview`, s4OverviewSeed);
        const s4Daily = await http(
          "GET",
          `${P}/cloud-usage/tenants/${cenario.tenantA}/daily?periodStart=${DAILY_INICIO}&periodEnd=${DAILY_FIM}`,
        );
        assert.equal(s4Daily.status, 200, JSON.stringify(s4Daily.body));
        registrarRota(`GET ${P}/cloud-usage/tenants/:tenantId/daily`, s4Daily.body.data);

        const tenantSummary = await http(
          "GET",
          `${P}/cloud-usage/tenants/${cenario.tenantA}/summary?periodStart=${JANELA_INICIO}&periodEnd=${JANELA_FIM}`,
        );
        assert.equal(tenantSummary.status, 200, JSON.stringify(tenantSummary.body));
        registrarRota(`GET ${P}/cloud-usage/tenants/:tenantId/summary`, tenantSummary.body.data);

        const tenantDetail = await http("GET", `${P}/tenants/${cenario.tenantA}/detail`);
        assert.equal(tenantDetail.status, 200, JSON.stringify(tenantDetail.body));
        registrarRota(`GET ${P}/tenants/:tenantId/detail`, tenantDetail.body.data);

        const activeSubscription = await http(
          "GET",
          `${P}/billing/tenants/${cenario.tenantA}/subscription`,
        );
        assert.equal(activeSubscription.status, 200, JSON.stringify(activeSubscription.body));
        registrarRota(
          `GET ${P}/billing/tenants/:tenantId/subscription`,
          activeSubscription.body.data,
        );

        const subscriptionHistory = await http(
          "GET",
          `${P}/billing/tenants/${cenario.tenantA}/subscription/history`,
        );
        assert.equal(subscriptionHistory.status, 200, JSON.stringify(subscriptionHistory.body));
        registrarRota(
          `GET ${P}/billing/tenants/:tenantId/subscription/history`,
          subscriptionHistory.body.data,
        );

        const assigned = await http(
          "PUT",
          `${P}/billing/tenants/${cenario.tenantB}/subscription`,
          { planCode: cenario.subscriptionPlanCode, validFrom: cenario.subscriptionValidFrom },
        );
        assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
        registrarRota(`PUT ${P}/billing/tenants/:tenantId/subscription`, assigned.body.data);

        const ended = await http(
          "DELETE",
          `${P}/billing/tenants/${cenario.tenantB}/subscription`,
          {},
        );
        assert.equal(ended.status, 200, JSON.stringify(ended.body));
        registrarRota(`DELETE ${P}/billing/tenants/:tenantId/subscription`, { ended: true });

        const allocationSummary = await http(
          "GET",
          `${P}/cloud-cost-allocations/summary?periodStart=${MES_INICIO.slice(0, 10)}&periodEnd=${MES_FIM.slice(0, 10)}`,
        );
        assert.equal(allocationSummary.status, 200, JSON.stringify(allocationSummary.body));
        registrarRota(`GET ${P}/cloud-cost-allocations/summary`, recortarResumoPorTenant(allocationSummary.body.data, cenario));

        const allocationRoute = await http("POST", `${P}/cloud-cost-allocations/runs`, {
          periodStart: MES_INICIO,
          periodEnd: MES_FIM,
        });
        assert.equal(allocationRoute.status, 201, JSON.stringify(allocationRoute.body));
        const allocationRouteId = (allocationRoute.body.data as { id: string }).id;
        cenario.allocationRunIds.push(allocationRouteId);
        const allocationRouteRows = await admin.tenantCloudCostAllocation.findMany({
          where: { allocation_run_id: allocationRouteId },
          orderBy: { tenant_id: "asc" },
        });
        const allocationRouteSeed = recortarLinhasPorTenant(allocationRouteRows, cenario);
        registrarRota(`POST ${P}/cloud-cost-allocations/runs`, {
          allocations: allocationRouteSeed.map((row) => ({
            tenantId: tag(row.tenant_id),
            serviceCode: row.service_code,
            allocationMethod: row.allocation_method,
            allocatedCost: Number(row.allocated_cost),
            currency: row.currency,
          })),
        });

        // S2 — o job cloud-usage.aggregate-daily (aggregateDailyUsage → listEvents sem tenant → grava agregados)
        await admin.cloudUsageDailyAggregate.deleteMany({
          where: { tenant_id: { in: [cenario.tenantA, cenario.tenantB] }, date: new Date(JANELA_INICIO) },
        });
        await usageJob({ date: JANELA_INICIO }, {} as never);
        const gravados = await admin.cloudUsageDailyAggregate.findMany({
          where: { tenant_id: { in: [cenario.tenantA, cenario.tenantB] }, date: new Date(JANELA_INICIO) },
          orderBy: [{ tenant_id: "asc" }, { metric_key: "asc" }],
        });
        registrarJob(
          "cloud-usage.aggregate-daily",
          gravados.map((row) => ({
            tenantId: tag(row.tenant_id),
            date: row.date.toISOString(),
            metricKey: row.metric_key,
            quantity: Number(row.quantity),
            unit: row.unit,
            sourceType: row.source_type,
          })),
        );

        const jobAllocationCreatedBy = `san3-05-${papel}-${suffix}`;
        await allocationJob({ periodStart: MES_INICIO, periodEnd: MES_FIM, createdBy: jobAllocationCreatedBy }, {} as never);
        const jobAllocationRun = await admin.cloudCostAllocationRun.findFirstOrThrow({
          where: { created_by: jobAllocationCreatedBy },
        });
        const jobAllocations = await admin.tenantCloudCostAllocation.findMany({
          where: { allocation_run_id: jobAllocationRun.id },
          orderBy: { tenant_id: "asc" },
        });
        const jobAllocationSeed = recortarLinhasPorTenant(jobAllocations, cenario);
        registrarJob(
          "cloud-cost-allocation.run",
          jobAllocationSeed.map((row) => ({
            tenantId: tag(row.tenant_id),
            serviceCode: row.service_code,
            allocationMethod: row.allocation_method,
            allocatedCost: Number(row.allocated_cost),
            currency: row.currency,
          })),
        );
        await admin.tenantCloudCostAllocation.deleteMany({ where: { allocation_run_id: jobAllocationRun.id } });
        await admin.cloudCostAllocationRun.delete({ where: { id: jobAllocationRun.id } });

        // S3 — job subscription.measure-daily: job de SISTEMA, roda SEMPRE sob o papel de runtime do app
        // (NOSUPERUSER NOBYPASSRLS — o JWT da rota não muda o papel do banco de um job). A medição é per-org
        // por RLS; rodar sob super (BYPASSRLS) é a postura que o canário do medidor recusa por desenho.
        await admin.tenantUsageDaily.deleteMany({
          where: { tenant_id: { in: [cenario.tenantA, cenario.tenantB] } },
        });
        const measureNow = new Date("2026-11-06T15:00:00.000Z"); // 12:00 SP (data fixa p/ determinismo)
        const papelHttp = alvo.atual;
        alvo.atual = efemera.client;
        try {
          // Só as organizações DESTE cenário: o cluster é compartilhado com as outras suítes (achado M-5 do #505).
          await runSubscriptionMeasureDaily(measureNow, { tenantIds: [cenario.tenantA, cenario.tenantB] });
        } finally {
          alvo.atual = papelHttp;
        }
        const usageRows = await admin.tenantUsageDaily.findMany({
          where: { tenant_id: { in: [cenario.tenantA, cenario.tenantB] } },
          orderBy: [{ tenant_id: "asc" }, { date: "asc" }],
        });
        registrarJob(
          "subscription.measure-daily",
          usageRows.map((row) => ({
            tenantId: tag(row.tenant_id),
            date: row.date.toISOString().slice(0, 10),
            activeUsers: row.active_users,
            dbBytesEstimated: row.db_bytes_estimated === null ? null : row.db_bytes_estimated.toString(),
            filesBytes: row.files_bytes === null ? null : row.files_bytes.toString(),
            filesWithoutSize: row.files_without_size,
            trackedVehicles: row.tracked_vehicles,
          })),
        );

        const usageRoute = await http(
          "GET",
          `${P}/billing/tenants/${cenario.tenantA}/usage?from=2026-11-06&to=2026-11-06`,
        );
        assert.equal(usageRoute.status, 200, JSON.stringify(usageRoute.body));
        registrarRota(
          `GET ${P}/billing/tenants/:tenantId/usage`,
          (usageRoute.body.data as Array<Record<string, unknown>>).map((row) => ({
            date: row.date,
            activeUsers: row.activeUsers,
            dbBytesEstimated: row.dbBytesEstimated,
            filesBytes: row.filesBytes,
            filesWithoutSize: row.filesWithoutSize,
            trackedVehicles: row.trackedVehicles,
          })),
        );

        // B-ASS-04 — o demonstrativo: o job de fechamento e as 13 rotas de plataforma, cada uma com cenário próprio e
        // efeito não vazio, projetado em campos estáveis (sem id nem relógio) para comparar os dois papéis.
        {
          const atorDemo = await admin.user.create({
            data: { tenant_id: cenario.tenantA, name: "Ator do demonstrativo", email: `demo-${papel}-${suffix}@san3-05.test` },
          });
          const tokenDemo = await signAccessToken({
            user_id: atorDemo.id,
            tenant_id: cenario.tenantA,
            email: `demo-${papel}-${suffix}@san3-05.test`,
            roles: ["platform_admin"],
          });
          const httpDemo = async (method: string, path: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown> }> => {
            const response = await fetch(`${baseUrl}${path}`, {
              method,
              headers: { authorization: `Bearer ${tokenDemo}`, "content-type": "application/json" },
              ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            });
            return { status: response.status, body: (await response.json()) as Record<string, unknown> };
          };
          const agora = new Date();
          const periodo = closeStatementsPeriod(agora);
          const [ano, mes] = periodo.split("-").map(Number) as [number, number];
          const seguinte = mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;
          const inicioPeriodo = new Date(`${periodo}-01T00:00:00-03:00`);
          const fimPeriodo = new Date(`${seguinte}-01T00:00:00-03:00`);
          const planoDemo = await admin.subscriptionPlan.create({
            data: { code: `san3_05_st_${papel}_${suffix.replaceAll("-", "_")}`, kind: "base", name: "Plano do demonstrativo SAN3-05", description: "" },
          });
          await admin.subscriptionPlanVersion.create({
            data: {
              plan_id: planoDemo.id,
              version: 1,
              valid_from: new Date("2000-01-01T00:00:00.000Z"),
              monthly_price: 100,
              included_users: 0,
              included_storage_gb: 0,
              extra_user_price: 0,
              extra_gb_price: 0,
              pricing_unit: "flat",
              modules: ["dashboard"],
            },
          });
          const assinaturasDemo = await Promise.all(
            [cenario.tenantA, cenario.tenantB].map((tenantId) =>
              admin.tenantSubscription.create({
                data: { tenant_id: tenantId, plan_id: planoDemo.id, valid_from: inicioPeriodo, valid_to: fimPeriodo },
              }),
            ),
          );
          const projetarDemonstrativo = (row: Record<string, unknown>) => ({
            tenantId: tag(String(row.tenantId)),
            period: row.period,
            status: row.status,
            totalAmount: row.totalAmount,
            paidAmount: row.paidAmount,
            balance: row.balance,
            adjustmentsAmount: row.adjustmentsAmount,
          });

          // O job roda sob o papel de runtime do app (job de sistema), como o da medição.
          const papelHttpDemo = alvo.atual;
          alvo.atual = efemera.client;
          try {
            await runSubscriptionCloseStatements(agora, { tenantIds: [cenario.tenantA, cenario.tenantB] });
          } finally {
            alvo.atual = papelHttpDemo;
          }
          const fechados = await admin.subscriptionStatement.findMany({
            where: { tenant_id: { in: [cenario.tenantA, cenario.tenantB] }, period: periodo },
            orderBy: { tenant_id: "asc" },
          });
          registrarJob(
            "subscription.close-statements",
            fechados.map((row) => ({ tenantId: tag(row.tenant_id), period: row.period, status: row.status, total: row.total_amount.toString() })),
          );
          const idDe = (tenantId: string): string => fechados.find((row) => row.tenant_id === tenantId)!.id;
          const stA = idDe(cenario.tenantA);
          const stB = idDe(cenario.tenantB);
          const B = cenario.tenantB;

          const lista = await httpDemo("GET", `${P}/billing/statements?tenantId=${B}`);
          assert.equal(lista.status, 200, JSON.stringify(lista.body));
          registrarRota(`GET ${P}/billing/statements`, (lista.body.data as Array<Record<string, unknown>>).map(projetarDemonstrativo));

          const pago = await httpDemo("POST", `${P}/billing/statements/${stB}/payments`, { tenantId: B, amount: "10.00", method: "pix" });
          assert.equal(pago.status, 201, JSON.stringify(pago.body));
          const pagamento = (pago.body.data as { payment: Record<string, unknown> }).payment;
          registrarRota(`POST ${P}/billing/statements/:statementId/payments`, {
            statement: projetarDemonstrativo((pago.body.data as { statement: Record<string, unknown> }).statement),
            amount: pagamento.amount,
          });

          const detalhe = await httpDemo("GET", `${P}/billing/statements/${stB}?tenantId=${B}`);
          assert.equal(detalhe.status, 200, JSON.stringify(detalhe.body));
          const detalheData = detalhe.body.data as Record<string, unknown> & { payments: Array<Record<string, unknown>> };
          registrarRota(`GET ${P}/billing/statements/:statementId`, {
            ...projetarDemonstrativo(detalheData),
            payments: detalheData.payments.map((row) => ({ amount: row.amount, source: row.source })),
          });

          const estorno = await httpDemo("POST", `${P}/billing/statements/${stB}/payments/${String(pagamento.id)}/reverse`, {
            tenantId: B,
            reason: "lançado em duplicidade",
          });
          assert.equal(estorno.status, 200, JSON.stringify(estorno.body));
          registrarRota(`POST ${P}/billing/statements/:statementId/payments/:paymentId/reverse`, {
            statement: projetarDemonstrativo((estorno.body.data as { statement: Record<string, unknown> }).statement),
            reversedAmount: (estorno.body.data as { payment: Record<string, unknown> }).payment.reversedAmount,
          });

          const reaberto = await httpDemo("POST", `${P}/billing/statements/${stB}/reopen`, { tenantId: B, reason: "desconto combinado com o cliente" });
          assert.equal(reaberto.status, 200, JSON.stringify(reaberto.body));
          registrarRota(`POST ${P}/billing/statements/:statementId/reopen`, projetarDemonstrativo(reaberto.body.data as Record<string, unknown>));

          const ajustado = await httpDemo("PATCH", `${P}/billing/statements/${stB}/adjustment`, {
            tenantId: B,
            adjustmentsAmount: "-1.00",
            adjustmentNote: "desconto combinado",
          });
          assert.equal(ajustado.status, 200, JSON.stringify(ajustado.body));
          registrarRota(`PATCH ${P}/billing/statements/:statementId/adjustment`, projetarDemonstrativo(ajustado.body.data as Record<string, unknown>));

          const refechado = await httpDemo("POST", `${P}/billing/statements/close`, { tenantId: B, period: periodo });
          assert.equal(refechado.status, 200, JSON.stringify(refechado.body));
          registrarRota(
            `POST ${P}/billing/statements/close`,
            ((refechado.body.data as { closed: Array<Record<string, unknown>> }).closed).map(projetarDemonstrativo),
          );

          const cancelado = await httpDemo("POST", `${P}/billing/statements/${stA}/cancel`, { tenantId: cenario.tenantA, reason: "contrato encerrado" });
          assert.equal(cancelado.status, 200, JSON.stringify(cancelado.body));
          registrarRota(`POST ${P}/billing/statements/:statementId/cancel`, projetarDemonstrativo(cancelado.body.data as Record<string, unknown>));

          // Créditos só nascem de pagamento do provedor acima do saldo (sem rota): o excedente e o pagamento em
          // dobro entram pelo serviço, e o demonstrativo aberto do mês corrente recebe a aplicação.
          const { service: servicoDemo, repository: repositorioDemo } = await createDefaultStatementRuntime();
          await servicoDemo.recordProviderPayment({ tenantId: B, statementId: stB, source: "asaas", externalChargeId: `san305-${papel}-1`, amountCents: 10_000, method: null, now: agora });
          await servicoDemo.recordProviderPayment({ tenantId: B, statementId: stB, source: "asaas", externalChargeId: `san305-${papel}-2`, amountCents: 500, method: null, now: agora });
          const aberto = await repositorioDemo.transaction(B, (tx) => tx.insertIfAbsentAndLock({ tenantId: B, period: seguinte }));

          const creditos = await httpDemo("GET", `${P}/billing/credits?tenantId=${B}`);
          assert.equal(creditos.status, 200, JSON.stringify(creditos.body));
          const listaCreditos = creditos.body.data as Array<Record<string, unknown>>;
          registrarRota(`GET ${P}/billing/credits`, listaCreditos.map((row) => ({ amount: row.amount, reason: row.reason, status: row.status })));
          // O excedente do 1º pagamento (1,00) e o 2º pagamento inteiro (5,00), escolhidos pelo valor.
          const creditoDe = (amount: string): string => String(listaCreditos.find((row) => row.amount === amount)!.id);

          const aplicado = await httpDemo("POST", `${P}/billing/credits/${creditoDe("1.00")}/apply`, { tenantId: B, statementId: aberto.statement.id });
          assert.equal(aplicado.status, 200, JSON.stringify(aplicado.body));
          const aplicadoData = aplicado.body.data as { credit: Record<string, unknown>; statement: Record<string, unknown> };
          registrarRota(`POST ${P}/billing/credits/:creditId/apply`, {
            credit: { amount: aplicadoData.credit.amount, status: aplicadoData.credit.status },
            creditsAppliedAmount: aplicadoData.statement.creditsAppliedAmount,
          });

          const baixado = await httpDemo("POST", `${P}/billing/credits/${creditoDe("5.00")}/write-off`, { tenantId: B, reason: "valor irrisório" });
          assert.equal(baixado.status, 200, JSON.stringify(baixado.body));
          const baixadoData = baixado.body.data as Record<string, unknown>;
          registrarRota(`POST ${P}/billing/credits/:creditId/write-off`, { amount: baixadoData.amount, status: baixadoData.status });

          const perfilGravado = await httpDemo("PUT", `${P}/billing/tenants/${B}/billing-profile`, {
            legalName: "Organização B de teste",
            document: "11222333000181",
            email: "financeiro@b.test",
            paymentMethod: "pix",
          });
          assert.equal(perfilGravado.status, 200, JSON.stringify(perfilGravado.body));
          const projetarPerfil = (row: Record<string, unknown>) => ({
            tenantId: tag(String(row.tenantId)),
            document: row.document,
            paymentMethod: row.paymentMethod,
            complete: row.complete,
            missing: row.missing,
          });
          registrarRota(`PUT ${P}/billing/tenants/:tenantId/billing-profile`, projetarPerfil(perfilGravado.body.data as Record<string, unknown>));
          const perfilLido = await httpDemo("GET", `${P}/billing/tenants/${B}/billing-profile`);
          assert.equal(perfilLido.status, 200, JSON.stringify(perfilLido.body));
          registrarRota(`GET ${P}/billing/tenants/:tenantId/billing-profile`, projetarPerfil(perfilLido.body.data as Record<string, unknown>));

          // Limpeza do cenário, nesta volta (a próxima volta apaga as assinaturas de B, e a FK do demonstrativo travaria).
          const orgs = [cenario.tenantA, cenario.tenantB];
          await admin.auditLog.deleteMany({ where: { tenant_id: { in: orgs }, action: { startsWith: "subscription_" } } });
          await admin.subscriptionCredit.deleteMany({ where: { tenant_id: { in: orgs } } });
          await admin.subscriptionStatementPayment.deleteMany({ where: { tenant_id: { in: orgs } } });
          await admin.subscriptionStatement.deleteMany({ where: { tenant_id: { in: orgs } } });
          await admin.tenantBillingProfile.deleteMany({ where: { tenant_id: { in: orgs } } });
          await admin.tenantSubscription.deleteMany({ where: { id: { in: assinaturasDemo.map((row) => row.id) } } });
          await admin.subscriptionPlanVersion.deleteMany({ where: { plan_id: planoDemo.id } });
          await admin.subscriptionPlan.delete({ where: { id: planoDemo.id } });
          await admin.user.delete({ where: { id: atorDemo.id } });
        }

        // B-ASS-08b — o canal de cobrança: os 4 jobs FORCE-PLATAFORMA, cada um com efeito próprio, pelo EXECUTOR real sobre
        // os repositórios Prisma do canal no client ROTEADO (o papel da volta) e uma porta FALSA sem rede no lugar do provedor
        // ligado. O handler registrado é inerte com o canal desligado (tests/ass-08b-channel-handlers.test.ts); aqui se prova
        // que, ligado, a varredura de plataforma — pelas tabelas GLOBAIS de ids e de eventos — chega às linhas FORCE de cada
        // organização sob o contexto dela, com o MESMO efeito nos dois papéis.
        {
          const [
            { runBillingDispatch, runBillingReconcileEvent, runBillingPollPending, runBillingPollSettled },
            { PrismaOutboxRepository },
            { PrismaWebhookEventRepository },
            { PrismaStatementRefRepository },
            { PrismaStatementChargeRepository },
            { StatementSettlementService },
          ] = await Promise.all([
            import("../src/modules/subscription-billing/outbox/channel.jobs.js"),
            import("../src/modules/subscription-billing/outbox/outbox.prisma.js"),
            import("../src/modules/subscription-billing/webhooks/webhook-events.prisma.js"),
            import("../src/modules/subscription-billing/webhooks/statement-refs.prisma.js"),
            import("../src/modules/subscription-billing/charges/charges.prisma.js"),
            import("../src/modules/subscription-billing/statements/statement-settlement.service.js"),
          ]);
          const orgs = [cenario.tenantA, cenario.tenantB];
          const porOrganizacao = (a: { tenantId: string }, b: { tenantId: string }) => a.tenantId.localeCompare(b.tenantId);
          const agoraCanal = new Date();
          // 2 h atrás: além dos 30 min a partir dos quais o poll-pending reconsulta a cobrança sem evento.
          const antes = new Date(agoraCanal.getTime() - 2 * 60 * 60 * 1_000);
          const periodoCanal = "2031-07";
          const runtimeCanal = await createDefaultStatementRuntime();
          const st = new Map<string, string>();
          for (const tenantId of orgs) {
            const salvo = await runtimeCanal.repository.transaction(tenantId, async (tx) => {
              const { statement } = await tx.insertIfAbsentAndLock({ tenantId, period: periodoCanal });
              return tx.saveStatement({ ...statement, status: "closed", chargeStatus: "pending", totalCents: 10_000, dueDate: "2031-08-10", closedAt: antes });
            });
            st.set(tenantId, salvo.id);
          }
          const tenantDoDemonstrativo = new Map([...st].map(([tenantId, statementId]) => [statementId, tenantId]));
          const meusDemonstrativos = new Set(st.values());

          // A porta FALSA: a cobrança ganha um id por organização; a reconsulta devolve o estado programado. Sem rede.
          const estado = new Map<string, { status: string; paidCents?: number; raw: Record<string, unknown> }>();
          const cobrancaDe = (tenantId: string): string => `san305-canal-${papel}-${suffix}-${tag(tenantId)}`;
          const porta = {
            ensureCustomer: async () => ({ customerId: "cus_san305" }),
            createCharge: async (input: { externalReference: string }) => ({
              chargeId: cobrancaDe(tenantDoDemonstrativo.get(input.externalReference)!),
              status: "pending",
              payUrl: "https://pay.example/san305",
            }),
            getCharge: async (chargeId: string) => estado.get(chargeId) ?? { status: "pending", raw: {} },
            findChargeByExternalReference: async () => null,
            cancelCharge: async (id: string) => ({ chargeId: id, status: "cancelled" }),
            refund: async (id: string) => ({ chargeId: id, status: "refunded" }),
            registerWebhook: async () => ({ externalId: "h" }),
            verifyWebhook: async () => ({ ok: false }),
            supportedMethods: () => ["pix"],
            describe: () => ({ provider: "asaas", supportedMethods: ["pix"], pendingHomologation: [], webhookRegistration: "api" }),
          };

          // As tabelas de eventos e de ids são GLOBAIS e o cluster é compartilhado com as outras suítes: as varreduras de
          // plataforma enxergam só as linhas DESTE cenário (o mesmo motivo do `tenantIds` da medição — M-5 do #505).
          const eventosBase = new PrismaWebhookEventRepository(appClient);
          const refsBase = new PrismaStatementRefRepository(appClient);
          const eventos = {
            insertIfAbsent: eventosBase.insertIfAbsent.bind(eventosBase),
            find: eventosBase.find.bind(eventosBase),
            markStatus: eventosBase.markStatus.bind(eventosBase),
            listByProvider: eventosBase.listByProvider.bind(eventosBase),
            listStale: async (olderThanMs: number, now: Date) =>
              (await eventosBase.listStale(olderThanMs, now)).filter((event) => meusDemonstrativos.has(event.externalReference ?? "")),
          };
          const refs = {
            put: refsBase.put.bind(refsBase),
            resolve: refsBase.resolve.bind(refsBase),
            setExternalChargeId: refsBase.setExternalChargeId.bind(refsBase),
            listWithCharge: async (since: Date) => (await refsBase.listWithCharge(since)).filter((ref) => orgs.includes(ref.tenantId)),
          };
          const deps = {
            outbox: new PrismaOutboxRepository(appClient, { tenantIds: orgs }),
            events: eventos,
            refs,
            charges: new PrismaStatementChargeRepository(appClient),
            ports: { asaas: porta } as never,
            settlement: new StatementSettlementService(runtimeCanal.repository, runtimeCanal.service),
            statements: runtimeCanal.repository,
            now: () => agoraCanal,
          };
          const projetarDemonstrativos = async () =>
            (await admin.subscriptionStatement.findMany({ where: { id: { in: [...st.values()] } } }))
              .map((row) => ({
                tenantId: tag(row.tenant_id),
                status: row.status,
                chargeStatus: row.charge_status,
                paid: row.paid_amount.toString(),
                total: row.total_amount.toString(),
              }))
              .sort(porOrganizacao);

          // dispatch-outbox: claim por organização (pelo índice GLOBAL) → cobrança criada → charges + índice.
          for (const tenantId of orgs) {
            await refs.put({ statementId: st.get(tenantId)!, tenantId, provider: "asaas" }, antes);
            await deps.outbox.enqueue(
              {
                tenantId,
                statementId: st.get(tenantId)!,
                kind: "charge_create",
                provider: "asaas",
                seq: 1,
                payload: { customerId: "cus_san305", amountCents: 10_000, dueDate: "2031-08-10", method: "pix" },
              },
              antes,
            );
          }
          const despacho = await runBillingDispatch(deps);
          const linhasOutbox = await admin.billingOutbox.findMany({ where: { tenant_id: { in: orgs } } });
          const linhasCobranca = await admin.subscriptionStatementCharge.findMany({ where: { tenant_id: { in: orgs } } });
          const linhasIndice = await admin.billingStatementRef.findMany({ where: { tenant_id: { in: orgs } } });
          assert.equal(despacho.outcomes.sent, 2, "as duas organizações têm a cobrança criada");
          registrarJob("billing.dispatch-outbox", {
            enviados: despacho.outcomes.sent,
            outbox: linhasOutbox
              .map((row) => ({ tenantId: tag(row.tenant_id), kind: row.kind, status: row.status, idDoProvedor: row.external_id === cobrancaDe(row.tenant_id) }))
              .sort(porOrganizacao),
            cobrancas: linhasCobranca
              .map((row) => ({ tenantId: tag(row.tenant_id), status: row.status, payUrl: row.pay_url, dueDate: row.due_date?.toISOString().slice(0, 10) ?? null }))
              .sort(porOrganizacao),
            indice: linhasIndice.map((row) => ({ tenantId: tag(row.tenant_id), comCobranca: row.external_charge_id === cobrancaDe(row.tenant_id) })).sort(porOrganizacao),
          });

          // reconcile-webhook: o evento de A resolve a organização pelo NOSSO id e a reconsulta paga dá a baixa.
          const eventoA = `evt-san305-${papel}-${suffix}-A`;
          estado.set(cobrancaDe(cenario.tenantA), { status: "paid", paidCents: 10_000, raw: {} });
          await eventos.insertIfAbsent(
            {
              provider: "asaas",
              externalEventId: eventoA,
              bodyDigest: "d".repeat(64),
              signatureOk: true,
              externalResourceId: cobrancaDe(cenario.tenantA),
              externalReference: st.get(cenario.tenantA)!,
            },
            agoraCanal,
          );
          const reconciliado = await runBillingReconcileEvent(deps, { provider: "asaas", externalEventId: eventoA });
          const linhaEvento = await admin.billingWebhookEvent.findFirstOrThrow({ where: { provider: "asaas", external_event_id: eventoA } });
          assert.equal(reconciliado, "settled");
          registrarJob("billing.reconcile-webhook", {
            desfecho: reconciliado,
            evento: { status: linhaEvento.status, organizacao: linhaEvento.resolved_tenant_id ? tag(linhaEvento.resolved_tenant_id) : null },
            demonstrativos: await projetarDemonstrativos(),
          });

          // poll-pending: a cobrança de B, sem evento há > 30 min, é reconsultada (webhook perdido) → baixa.
          estado.set(cobrancaDe(cenario.tenantB), { status: "paid", paidCents: 10_000, raw: {} });
          const pendente = await runBillingPollPending(deps);
          assert.deepEqual({ eventos: pendente.events, cobrancas: pendente.charges }, { eventos: 0, cobrancas: 1 });
          registrarJob("billing.poll-pending", {
            eventos: pendente.events,
            cobrancas: pendente.charges,
            desfechos: pendente.outcomes,
            demonstrativos: await projetarDemonstrativos(),
          });

          // poll-settled: o chargeback tardio de B (sem evento) reverte; A, ainda paga, não muda (baixa monotônica).
          estado.set(cobrancaDe(cenario.tenantB), { status: "charged_back", raw: {} });
          const liquidado = await runBillingPollSettled(deps);
          const pagamentos = await admin.subscriptionStatementPayment.findMany({ where: { tenant_id: { in: orgs } } });
          const creditos = await admin.subscriptionCredit.count({ where: { tenant_id: { in: orgs } } });
          const demonstrativosFinais = await projetarDemonstrativos();
          assert.deepEqual(
            demonstrativosFinais.map((row) => [row.tenantId, row.status, row.chargeStatus, row.paid]),
            [
              ["A", "paid", "confirmed", "100"],
              ["B", "closed", "charged_back", "0"],
            ],
            "A segue paga; o chargeback de B devolve o demonstrativo a closed com pago 0",
          );
          assert.equal(creditos, 0, "nem a baixa repetida de A nem o chargeback de B criam crédito");
          registrarJob("billing.poll-settled", {
            cobrancas: liquidado.charges,
            desfechos: liquidado.outcomes,
            demonstrativos: demonstrativosFinais,
            pagamentos: pagamentos
              .map((row) => ({ tenantId: tag(row.tenant_id), amount: row.amount.toString(), reversed: row.reversed_amount.toString(), kind: row.reversal_kind }))
              .sort(porOrganizacao),
            creditos,
          });

          // Limpeza do cenário, nesta volta (FK Restrict para o demonstrativo e para a organização).
          await admin.billingWebhookEvent.deleteMany({ where: { provider: "asaas", external_event_id: eventoA } });
          await admin.billingOutbox.deleteMany({ where: { tenant_id: { in: orgs } } });
          await admin.subscriptionStatementCharge.deleteMany({ where: { tenant_id: { in: orgs } } });
          await admin.billingStatementRef.deleteMany({ where: { tenant_id: { in: orgs } } });
          await admin.auditLog.deleteMany({ where: { tenant_id: { in: orgs }, action: { startsWith: "subscription_" } } });
          await admin.subscriptionCredit.deleteMany({ where: { tenant_id: { in: orgs } } });
          await admin.subscriptionStatementPayment.deleteMany({ where: { tenant_id: { in: orgs } } });
          await admin.subscriptionStatement.deleteMany({ where: { id: { in: [...st.values()] } } });
        }

        medidas.set(papel, {
          s1: normalizar(s1Data),
          s1Quantidade: s1Data.metrics.reduce((total, metric) => total + Number(metric.quantity), 0),
          s2: gravados.map((row) => `${tag(row.tenant_id)}|${row.metric_key}|${Number(row.quantity)}|${row.unit}|${row.source_type}`),
          s4Alocacoes: normalizar(s4Alocacoes.body.data),
          s4Overview: s4OverviewSeed.orgs.map((org) => normalizar(org)),
          s4Daily: normalizar(s4Daily.body.data),
          rotas,
          jobs,
        });

        await admin.tenantCloudCostAllocation.deleteMany({ where: { allocation_run_id: allocationRouteId } });
        await admin.cloudCostAllocationRun.delete({ where: { id: allocationRouteId } });
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

      await t.test("T11d · controles (já por organização): iguais nos dois papéis", () => {
        assert.equal((sup.s4Alocacoes as unknown[]).length, 2);
        assert.deepEqual(efe.s4Alocacoes, sup.s4Alocacoes);
        assert.equal((sup.s4Overview as unknown[]).length, 2, "as duas organizações do seed aparecem no overview");
        assert.deepEqual(efe.s4Overview, sup.s4Overview);
        assert.equal((sup.s4Daily as { daily: unknown[] }).daily.length, 1);
        assert.deepEqual(efe.s4Daily, sup.s4Daily);
      });

      await t.test("T11e · cada rota FORCE tem cenário próprio, não vazio e igual nos dois papéis", () => {
        const forceEnumeradas = [...SUPERFICIE]
          .filter(([, item]) => item.etiqueta !== "SEM-FORCE")
          .map(([chave]) => chave)
          .sort();
        assert.deepEqual(Object.keys(sup.rotas).sort(), forceEnumeradas, "FORCE enumerado != diferenciais executados sob super");
        assert.deepEqual(Object.keys(efe.rotas).sort(), forceEnumeradas, "FORCE enumerado != diferenciais executados sob efêmero");
        for (const chave of forceEnumeradas) assert.deepEqual(efe.rotas[chave], sup.rotas[chave], chave);
      });

      await t.test("T11f · job.registry fecha 8 jobs FORCE com efeito próprio e etiqueta os outros 9 como B-ARNES-2", () => {
        const forceEnumerados = [...JOBS]
          .filter(([, etiqueta]) => etiqueta === "FORCE-PLATAFORMA")
          .map(([chave]) => chave)
          .sort();
        const foraDaSuperficie = [...JOBS].filter(([, etiqueta]) => etiqueta === "FORA-DA-SUPERFICIE");
        // 4 → 8 no B-ASS-08b: os 4 jobs do canal de cobrança (billing.*), cada um com cenário executado nos dois papéis.
        assert.equal(forceEnumerados.length, 8);
        assert.equal(foraDaSuperficie.length, 9, "os demais jobs pertencem à pendência B-ARNES-2");
        assert.deepEqual(Object.keys(sup.jobs).sort(), forceEnumerados, "jobs FORCE enumerados != diferenciais executados sob super");
        assert.deepEqual(Object.keys(efe.jobs).sort(), forceEnumerados, "jobs FORCE enumerados != diferenciais executados sob efêmero");
        for (const chave of forceEnumerados) assert.deepEqual(efe.jobs[chave], sup.jobs[chave], chave);
      });

      await t.test("T11g · a superfície de /api/v1/platform lida do router em runtime == a lista fechada, com o FORCE de cada tabela conferido", async () => {
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

        const plataforma = [...rotas]
          .filter((rota) => rota.split(" ")[1]!.startsWith(`${P}/`) || rota.endsWith(` ${P}`) || rota.split(" ")[1]!.startsWith(`${WEBHOOK}/`))
          .sort();
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

function assertNonEmpty(value: unknown, chave: string): void {
  assert.notEqual(value, null, `${chave}: resultado nulo`);
  assert.notEqual(value, undefined, `${chave}: resultado ausente`);
  if (Array.isArray(value)) {
    assert.ok(value.length > 0, `${chave}: resultado vazio`);
    return;
  }
  if (typeof value === "string") {
    assert.ok(value.length > 0, `${chave}: resultado vazio`);
    return;
  }
  if (typeof value === "object") {
    assert.ok(Object.keys(value as Record<string, unknown>).length > 0, `${chave}: resultado vazio`);
  }
}

type TenantRow = { readonly tenantId: string };

/**
 * Respostas de plataforma agregam o banco inteiro. O diferencial compara somente as linhas criadas
 * por este cenário; contagens globais mudam legitimamente quando outra suíte grava entre as leituras.
 */
function recortarOverview(value: unknown, cenario: Cenario) {
  const orgs = ((value as { orgs?: Array<Record<string, unknown> & { id: string }> }).orgs ?? [])
    .filter((org) => org.id === cenario.tenantA || org.id === cenario.tenantB);
  assert.deepEqual(orgs.map((org) => org.id).sort(), [cenario.tenantA, cenario.tenantB].sort(), "overview precisa conter as duas organizações do seed");
  return {
    activeOrgs: orgs.filter((org) => org.status === "active").length,
    totalOrgs: orgs.length,
    totalUsers: orgs.reduce((total, org) => total + Number(org.userCount), 0),
    orgs,
  };
}

function recortarResumoUso(value: unknown, sourceType: string) {
  const metrics = ((value as { metrics?: Array<{ quantity: number; sourceType: string }> }).metrics ?? [])
    .filter((metric) => metric.sourceType === sourceType);
  assert.ok(metrics.length > 0, `summary precisa conter o sourceType do seed: ${sourceType}`);
  return { metrics };
}

function recortarResumoPorTenant(value: unknown, cenario: Cenario) {
  const tenants = ((value as { tenants?: TenantRow[] }).tenants ?? [])
    .filter((tenant) => tenant.tenantId === cenario.tenantA || tenant.tenantId === cenario.tenantB);
  assert.deepEqual(tenants.map((tenant) => tenant.tenantId).sort(), [cenario.tenantA, cenario.tenantB].sort(), "summary precisa conter as duas organizações do seed");
  return { tenants };
}

function recortarLinhasPorTenant<T extends { readonly tenant_id: string }>(rows: readonly T[], cenario: Cenario): T[] {
  const seed = rows.filter((row) => row.tenant_id === cenario.tenantA || row.tenant_id === cenario.tenantB);
  assert.deepEqual(seed.map((row) => row.tenant_id).sort(), [cenario.tenantA, cenario.tenantB].sort(), "efeito global precisa conter as duas organizações do seed");
  return seed;
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

  const plan = await admin.subscriptionPlan.create({
    data: {
      code: `san3_05_plan_${suffix.replaceAll("-", "_")}`,
      kind: "base",
      name: "Plano de teste SAN3-05",
      description: "Catálogo efêmero da prova de RLS.",
    },
  });
  cenario.subscriptionPlanId = plan.id;
  cenario.subscriptionPlanCode = plan.code;
  await admin.subscriptionPlanVersion.create({
    data: {
      plan_id: plan.id,
      version: 1,
      valid_from: new Date("2000-01-01T00:00:00.000Z"),
      monthly_price: 0,
      included_users: 0,
      included_storage_gb: 0,
      extra_user_price: 0,
      extra_gb_price: 0,
      pricing_unit: "flat",
      modules: ["dashboard"],
    },
  });
  await admin.tenantSubscription.create({
    data: {
      tenant_id: tenantA.id,
      plan_id: plan.id,
      valid_from: new Date(cenario.subscriptionValidFrom),
    },
  });

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
      source_type: cenario.usageSourceType,
      metric_key: "storage_bytes_current",
      quantity: 10,
      unit: "bytes",
      occurred_at: new Date(JANELA_BASE_MS + hora * 60 * 60 * 1_000),
      metadata: {},
    })),
  });
  await admin.cloudUsageDailyAggregate.createMany({
    data: [
      { tenant_id: tenantA.id, date: new Date(`${DAILY_A}T00:00:00.000Z`), metric_key: "storage_bytes_current", quantity: 7, unit: "bytes", source_type: cenario.usageSourceType, metadata: {} },
      { tenant_id: tenantB.id, date: new Date(`${DAILY_B}T00:00:00.000Z`), metric_key: "storage_bytes_current", quantity: 3, unit: "bytes", source_type: cenario.usageSourceType, metadata: {} },
    ],
  });

  const importado = await admin.cloudCostImport.create({
    data: {
      provider: "aws",
      source_type: "mock_fixture",
      status: "completed",
      period_start: new Date(MES_INICIO),
      period_end: new Date(MES_FIM),
      imported_at: new Date(MES_FIM),
      row_count: 1,
      total_unblended_cost: 40,
      currency: "BRL",
      metadata: {},
    },
  });
  cenario.costImportId = importado.id;
  await admin.cloudCostLineItem.create({
    data: {
      import_id: importado.id,
      provider: "aws",
      billing_period_start: new Date(MES_INICIO),
      billing_period_end: new Date(MES_FIM),
      service_code: "AmazonS3",
      usage_type: "TimedStorage-ByteHrs",
      usage_amount: 40,
      usage_unit: "bytes",
      unblended_cost: 40,
      currency: "BRL",
      raw_line_hash: `san3-05-${suffix}`,
      metadata: {},
    },
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
        effective_until: new Date(MES_FIM),
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
  if (cenario.allocationRunIds.length > 0) {
    await admin.cloudCostAllocationRun.deleteMany({ where: { id: { in: cenario.allocationRunIds } } });
  }
  if (cenario.allocationRunId) await admin.cloudCostAllocationRun.deleteMany({ where: { id: cenario.allocationRunId } });
  if (cenario.costImportId) await admin.cloudCostImport.deleteMany({ where: { id: cenario.costImportId } });
  await admin.cloudUsageDailyAggregate.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.cloudUsageEvent.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.tenantSubscriptionAddon.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.tenantSubscription.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.tenantUsageDaily.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  // B-ASS-08b — se o cenário do canal falhar no meio, as linhas dele (FK Restrict para tenants) não podem travar a limpeza.
  await admin.billingOutbox.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.subscriptionStatementCharge.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.billingStatementRef.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.subscriptionCredit.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.subscriptionStatementPayment.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.subscriptionStatement.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await admin.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  if (cenario.subscriptionPlanId) {
    await admin.subscriptionPlanVersion.deleteMany({ where: { plan_id: cenario.subscriptionPlanId } });
    await admin.subscriptionPlan.deleteMany({ where: { id: cenario.subscriptionPlanId } });
  }
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
