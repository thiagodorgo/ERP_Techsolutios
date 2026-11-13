import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

// B-SAN3-14 — A VISTORIA DE ENTREGA NASCE NO DESPACHO, NO POSTGRES REAL (composição de produção, Prisma).
//
//   T1 · o despacho de uma OS com coleta + entrega do MESMO modelo cria 2 execuções (uma por fase, a chave de
//        idempotência carrega a fase) e 2 unidades medidas `checklist_run.created` (a unidade é gravada na mesma
//        transação da execução, `cloud-usage.capture.ts`);
//   T2 · re-despacho e reatribuição NÃO duplicam: seguem 2 execuções e 2 unidades;
//   T3 · a reabertura no repositório Prisma herda a fase (a entrega reaberta continua entrega);
//   T4 · drill de RLS (padrão B-O6R-06): o app roda sob papel efêmero NOSUPERUSER NOBYPASSRLS (postura asserida), a
//        lista da OS por outra organização volta vazia, e o acesso CRU às execuções sem o contexto da organização
//        devolve zero linhas (FORCE RLS).
//
// PAPEL DO BANCO (regra da casa para suítes `-db`): o cliente do app é o do papel efêmero, criado pelo mecanismo
// único do arnês (`createEphemeralRole`) e injetado no singleton `src/database/prisma.ts` (`globalThis.prisma`) ANTES
// de importar qualquer módulo de src. A semeadura de usuários e a limpeza usam a conexão administrativa. Falha ao
// criar o papel é VERMELHO (o `await` lança), nunca skip. Sem DATABASE_URL, o arquivo se declara pulado.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-SAN3-14 no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = connectionString;
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  let admin: any;
  let efemera: Awaited<ReturnType<typeof createEphemeralRole>>;

  before(async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = (await import("../src/database/pg-connection.js")).createPrismaClient(connection);
    efemera = await createEphemeralRole(admin, connection);
    (globalThis as { prisma?: unknown }).prisma = efemera.client;
  });

  after(async () => {
    await efemera?.drop();
    await admin?.$disconnect();
  });

  test("T1 · despacho do par cria 2 execuções e 2 unidades checklist_run.created", async () => {
    await comCenario(admin, async (c) => {
      const workOrderId = await c.criarOsComPar();
      await c.despachar(workOrderId, c.tecnicoA);

      const runs = await c.execucoes(workOrderId);
      assert.deepEqual(
        runs.map((run) => `${run.role}:${run.client_run_key}`),
        [
          `collection:dispatch:${workOrderId}:${c.templateId}:collection`,
          `delivery:dispatch:${workOrderId}:${c.templateId}:delivery`,
        ],
      );
      assert.equal(await c.unidades(), 2);
    });
  });

  test("T2 · re-despacho e reatribuição mantêm 2 execuções e 2 unidades", async () => {
    await comCenario(admin, async (c) => {
      const workOrderId = await c.criarOsComPar();
      const despacho = await c.despachar(workOrderId, c.tecnicoA);
      await c.despachar(workOrderId, c.tecnicoA);
      await c.reatribuir(despacho.id, c.tecnicoB);

      const runs = await c.execucoes(workOrderId);
      assert.equal(runs.length, 2, `execuções: ${runs.map((run) => run.client_run_key).join(", ")}`);
      assert.deepEqual(runs.map((run) => run.role), ["collection", "delivery"]);
      assert.equal(await c.unidades(), 2);
    });
  });

  test("T3 · reabertura Prisma herda a fase", async () => {
    await comCenario(admin, async (c) => {
      const workOrderId = await c.criarOsComPar();
      await c.despachar(workOrderId, c.tecnicoA);
      const entrega = (await c.execucoes(workOrderId)).find((run) => run.role === "delivery");
      assert.ok(entrega, "a entrega não nasceu no despacho");

      await c.checklists.completeRun(c.atorChecklist, entrega.id, { hasDivergence: false });
      const reaberta = await c.checklists.reopenRun(c.atorChecklist, entrega.id, { reason: "Foto ilegível" });

      const [linha] = await c.sql(
        "SELECT role, reopened_from_run_id::text FROM checklist_runs WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [c.tenantId, reaberta.run.run.id],
      );
      assert.equal(linha.reopened_from_run_id, entrega.id);
      assert.equal(linha.role, "delivery", "a versão reaberta da entrega perdeu a fase no Postgres");
    });
  });

  test("T4 · drill de RLS: papel sem bypass, lista vazia para outra organização e acesso cru sem contexto = 0", async () => {
    await comCenario(admin, async (c) => {
      const { prisma: prismaDoApp } = await import("../src/database/prisma.js");
      assert.equal(prismaDoApp, efemera.client, "o singleton src/database/prisma.ts não é o cliente do papel efêmero");
      const postura = await efemera.client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      );
      assert.deepEqual(
        [postura[0]?.rolsuper, postura[0]?.rolbypassrls],
        [false, false],
        "o papel do app não pode ser superusuário nem atravessar a RLS",
      );

      const workOrderId = await c.criarOsComPar();
      await c.despachar(workOrderId, c.tecnicoA);
      assert.equal((await c.execucoes(workOrderId)).length, 2);

      // A própria organização vê as 2 pela lista do app novo; outra organização não vê nenhuma.
      const minhas = await c.checklists.listRunsForWorkOrder(c.atorChecklist, workOrderId, undefined, { roleAware: true });
      assert.equal(minhas.length, 2);
      const alheias = await c.checklists.listRunsForWorkOrder(
        { tenantId: randomUUID(), userId: randomUUID() },
        workOrderId,
        undefined,
        { roleAware: true },
      );
      assert.deepEqual(alheias, []);

      // Acesso CRU, pelo papel do app, sem o GUC da organização: FORCE RLS devolve zero.
      const [{ n }] = await efemera.client.$queryRawUnsafe<Array<{ n: number }>>(
        "SELECT count(*)::int AS n FROM checklist_runs WHERE related_entity_id = $1",
        workOrderId,
      );
      assert.equal(n, 0, "sem contexto de organização, o papel do app leu execuções");
    });
  });
}

async function montarCenario(admin: any) {
  const [{ resolvePermissionsForRoles }, workOrderModule, checklistModule, dispatchModule] = await Promise.all([
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/checklists/checklist.service.js"),
    import("../src/modules/field-dispatch/field-dispatch.service.js"),
  ]);

  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await admin.tenant.create({ data: { name: `BSAN314 DB ${sufixo}`, slug: `bsan314-db-${sufixo}` } });
  const tenantId: string = tenant.id;
  const usuario = (nome: string) =>
    admin.user.create({ data: { tenant_id: tenantId, name: `${nome} ${sufixo}`, email: `bsan314-db-${nome}-${sufixo}@example.com` } });
  const [gestor, tecnicoA, tecnicoB] = [await usuario("gestor"), await usuario("tecnico-a"), await usuario("tecnico-b")];

  workOrderModule.resetWorkOrderRuntimeForTests();
  checklistModule.resetChecklistRuntimeForTests();
  dispatchModule.resetFieldDispatchRuntimeForTests();
  const ordens = await workOrderModule.createDefaultWorkOrderService();
  const checklists = await checklistModule.createDefaultChecklistService();
  // O núcleo só responde "o alvo é técnico de campo" (é o que o despacho consulta dele).
  const nucleo = { getUserForTenant: async (id: string, tid: string) => ({ id, tenantId: tid, roles: ["field_technician"] }) };
  const despachos = await dispatchModule.createDefaultFieldDispatchService(nucleo as never);

  const gestao = {
    tenantId,
    userId: gestor.id,
    roles: ["manager"],
    permissions: resolvePermissionsForRoles(["manager"]),
    explicitPermissions: true,
  };
  const atorChecklist = { tenantId, userId: gestor.id };

  const template = await checklists.createTemplate(atorChecklist, {
    name: "Vistoria do Veículo",
    type: "towing_collection",
    schema: {},
    components: [
      {
        componentKey: "observacao",
        type: "observation",
        label: "Observações do guincheiro",
        required: false,
        config: {},
        validationRules: {},
        visibilityRules: {},
      },
    ],
  });
  await checklists.publishTemplate(atorChecklist, template.id);

  const sql = async (texto: string, params: readonly unknown[] = []): Promise<any[]> => admin.$queryRawUnsafe(texto, ...params);

  return {
    tenantId,
    templateId: template.id as string,
    tecnicoA: tecnicoA.id as string,
    tecnicoB: tecnicoB.id as string,
    checklists,
    atorChecklist,
    sql,
    async criarOsComPar(): Promise<string> {
      const os = await ordens.create(gestao as never, {
        title: "OS de guincho com coleta e entrega",
        checklists: [
          { checklistId: template.id, role: "collection" },
          { checklistId: template.id, role: "delivery" },
        ],
      });
      return os.id;
    },
    async despachar(workOrderId: string, operatorUserId: string) {
      return despachos.create(gestao as never, { workOrderId, operatorUserId });
    },
    async reatribuir(dispatchId: string, operatorUserId: string) {
      return despachos.reassign(gestao as never, dispatchId, { operatorUserId });
    },
    async execucoes(workOrderId: string): Promise<Array<{ id: string; role: string | null; client_run_key: string | null }>> {
      return sql(
        `SELECT id::text, role, client_run_key FROM checklist_runs
          WHERE tenant_id = $1::uuid AND related_entity_type = 'work_order' AND related_entity_id = $2
          ORDER BY role`,
        [tenantId, workOrderId],
      );
    },
    async unidades(): Promise<number> {
      const [{ n }] = await sql(
        "SELECT count(*)::int AS n FROM cloud_usage_events WHERE tenant_id = $1::uuid AND metric_key = 'checklist_run.created'",
        [tenantId],
      );
      return n;
    },
  };
}

type Cenario = Awaited<ReturnType<typeof montarCenario>>;

async function comCenario(admin: any, callback: (c: Cenario) => Promise<void>): Promise<void> {
  const c = await montarCenario(admin);
  try {
    await callback(c);
  } finally {
    await teardown(admin, c.tenantId);
  }
}

// Teardown ESCOPADO à organização descartável do caso (o idioma de `o6r07c-b-scope-db.test.ts`): toda tabela com
// `tenant_id` uuid, pelo id que o caso semeou, com gatilhos de FK em modo réplica; depois, zero linha residual.
async function teardown(admin: any, tenantId: string): Promise<void> {
  const tabelas: Array<{ table_name: string }> = await admin.$queryRawUnsafe(
    `SELECT c.table_name FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND c.data_type = 'uuid' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name`,
  );
  await admin.$transaction(async (tx: { $executeRawUnsafe: (sql: string, ...p: unknown[]) => Promise<number> }) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    for (const { table_name } of tabelas) {
      await tx.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
    }
    await tx.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
  });
  for (const { table_name } of tabelas) {
    const [{ n }]: Array<{ n: number }> = await admin.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM "${table_name}" WHERE tenant_id = $1::uuid`,
      tenantId,
    );
    assert.equal(n, 0, `teardown deixou ${n} linha(s) em ${table_name} da organização descartável`);
  }
}
