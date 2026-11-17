import "dotenv/config";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

// B-GUI-02 (Emenda 2, §1.4) — A PRIMÁRIA É A COLETA, PELA ETAPA, NO POSTGRES REAL (composição de produção, Prisma).
//
// A suíte em memória (`bgui02-ordem-por-etapa.test.ts`) prova a regra pelo app inteiro. Aqui ficam os casos em que o
// banco tem palavra própria: o espelho `work_orders.checklist_id` gravado na mesma transação da criação (T3), a guarda
// do BLOQ 3 sem escrita nenhuma quando recusa (T4), e o CARIMBO por linha em `work_order_checklists.checklist_snapshot`
// (T7), que o SQL do repositório Prisma escreve à mão e o de memória não exerce.
//
//   T1 · Entrega e depois Coleta (2 ajustes de uma linha) → o espelho aponta a coleta, e o despacho cria as execuções
//        `collection` e `delivery`, cada uma do seu modelo;
//   T3 · criação com [Entrega, Coleta] → o espelho da criação aponta a coleta;
//   T4 · OS enviada só com a entrega + incluir a coleta → 409 `collection_after_dispatch`, e as linhas e o espelho ficam
//        IGUAIS (comparação por igualdade das linhas cruas);
//   T7 · depois do despacho de Entrega@0 + Coleta@1, cada linha guarda o formulário do SEU modelo (`template_id`).
//
// PAPEL DO BANCO (regra da casa para suítes `-db`, molde de `bsan314-provisao-entrega-db.test.ts`): o cliente do app é
// o do papel efêmero NOSUPERUSER NOBYPASSRLS, injetado no singleton `src/database/prisma.ts` antes de importar src. A
// semeadura e a limpeza usam a conexão administrativa, escopadas à organização descartável do caso.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-GUI-02 (ordem por etapa) no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = connectionString;
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  let admin: any;
  let efemera: Awaited<ReturnType<typeof createEphemeralRole>>;

  before(async () => {
    admin = (await import("../src/database/pg-connection.js")).createPrismaClient(connection);
    efemera = await createEphemeralRole(admin, connection);
    (globalThis as { prisma?: unknown }).prisma = efemera.client;
  });

  after(async () => {
    await efemera?.drop();
    await admin?.$disconnect();
  });

  test("T1 · Entrega e depois Coleta → espelho = coleta, e o despacho cria as execuções collection e delivery", async () => {
    await comCenario(admin, async (c) => {
      const workOrderId = await c.criarOs([]);
      await c.ajustar(workOrderId, { add: [{ checklistId: c.entrega, role: "delivery" }] });
      await c.ajustar(workOrderId, { add: [{ checklistId: c.coleta, role: "collection" }] });

      assert.equal((await c.ordemCrua(workOrderId)).checklist_id, c.coleta, "o espelho gravado no banco aponta a coleta");

      await c.despachar(workOrderId);
      const runs = await c.checklists.listRunsForWorkOrder(c.atorChecklist, workOrderId, undefined, { roleAware: true });
      assert.deepEqual(
        Object.fromEntries(runs.map((run: { role: string | null; templateId: string }) => [String(run.role), run.templateId])),
        { collection: c.coleta, delivery: c.entrega },
      );
      assert.equal(runs.length, 2, "exatamente uma execução por etapa");
    });
  });

  test("T3 · criação com [Entrega, Coleta] → o espelho da criação aponta a coleta", async () => {
    await comCenario(admin, async (c) => {
      const workOrderId = await c.criarOs([
        { checklistId: c.entrega, role: "delivery" },
        { checklistId: c.coleta, role: "collection" },
      ]);

      assert.equal((await c.ordemCrua(workOrderId)).checklist_id, c.coleta);
      assert.equal((await c.linhasCruas(workOrderId)).length, 2);
    });
  });

  test("T4 · OS enviada só com entrega + incluir coleta → 409 collection_after_dispatch, linhas e espelho iguais", async () => {
    await comCenario(admin, async (c) => {
      const workOrderId = await c.criarOs([]);
      await c.ajustar(workOrderId, { add: [{ checklistId: c.entrega, role: "delivery" }] });
      await c.despachar(workOrderId);

      const linhasAntes = await c.linhasCruas(workOrderId);
      const ordemAntes = await c.ordemCrua(workOrderId);

      await assert.rejects(c.ajustar(workOrderId, { add: [{ checklistId: c.coleta, role: "collection" }] }), (error: any) => {
        assert.equal(error?.statusCode, 409);
        assert.equal(error?.code, "WORK_ORDER_CONFLICT");
        assert.equal(error?.reason, "collection_after_dispatch");
        return true;
      });

      assert.deepEqual(await c.linhasCruas(workOrderId), linhasAntes, "a recusa gravou ou retirou linha");
      assert.deepEqual(await c.ordemCrua(workOrderId), ordemAntes, "a recusa mexeu no espelho");
    });
  });

  test("T7 · o carimbo certo: cada linha guarda o formulário do SEU modelo depois do despacho", async () => {
    await comCenario(admin, async (c) => {
      const workOrderId = await c.criarOs([]);
      await c.ajustar(workOrderId, { add: [{ checklistId: c.entrega, role: "delivery" }] });
      await c.ajustar(workOrderId, { add: [{ checklistId: c.coleta, role: "collection" }] });
      await c.despachar(workOrderId);

      const linhas = await c.linhasCruas(workOrderId);
      const carimbo = (role: string) => linhas.find((linha) => linha.role === role)?.template_carimbado;
      assert.equal(carimbo("collection"), c.coleta, "a linha da coleta recebeu o formulário de outro modelo");
      assert.equal(carimbo("delivery"), c.entrega, "a linha da entrega recebeu o formulário de outro modelo");
      assert.equal((await c.ordemCrua(workOrderId)).template_carimbado, c.coleta, "o espelho congelado é o da coleta");
    });
  });

  // Emenda 2.1 (A1) — a METADE DO ESPELHO da guarda S4 (`isChecklistSetFrozen`): a OS anterior à migração 20260865, feita SEM
  // backfill, tem a junção VAZIA e o espelho (`work_orders.checklist_id` + `checklist_snapshot`) já congelado por um envio. A API
  // de hoje não produz esse estado; ele existe no banco. Só o espelho diz que a OS foi enviada: sem essa metade, a coleta
  // entraria depois do envio (BLOQ 3).
  test("T8 · OS antiga enviada (junção vazia, espelho congelado) + incluir coleta → 409 collection_after_dispatch, nada muda", async () => {
    await comCenario(admin, async (c) => {
      const workOrderId = await c.criarOsLegadaEnviada();
      assert.equal((await c.linhasCruas(workOrderId)).length, 0, "a OS antiga não tem linha na junção");
      const ordemAntes = await c.ordemCrua(workOrderId);
      assert.equal(ordemAntes.checklist_id, c.entrega);
      assert.equal(ordemAntes.template_carimbado, c.entrega, "o espelho está congelado");

      await assert.rejects(c.ajustar(workOrderId, { add: [{ checklistId: c.coleta, role: "collection" }] }), (error: any) => {
        assert.equal(error?.statusCode, 409);
        assert.equal(error?.reason, "collection_after_dispatch");
        return true;
      });

      assert.equal((await c.linhasCruas(workOrderId)).length, 0, "a recusa gravou linha");
      assert.deepEqual(await c.ordemCrua(workOrderId), ordemAntes, "a recusa mexeu no espelho");
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
  const tenant = await admin.tenant.create({ data: { name: `BGUI02 DB ${sufixo}`, slug: `bgui02-db-${sufixo}` } });
  const tenantId: string = tenant.id;
  const usuario = (nome: string) =>
    admin.user.create({ data: { tenant_id: tenantId, name: `${nome} ${sufixo}`, email: `bgui02-db-${nome}-${sufixo}@example.com` } });
  const [gestor, tecnico] = [await usuario("gestor"), await usuario("tecnico")];

  workOrderModule.resetWorkOrderRuntimeForTests();
  checklistModule.resetChecklistRuntimeForTests();
  dispatchModule.resetFieldDispatchRuntimeForTests();
  const ordens = await workOrderModule.createDefaultWorkOrderService();
  const checklists = await checklistModule.createDefaultChecklistService();
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

  const publicar = async (name: string): Promise<string> => {
    const template = await checklists.createTemplate(atorChecklist, {
      name,
      type: "towing_collection",
      schema: {},
      components: [
        {
          componentKey: "observacao",
          type: "observation",
          label: `Observações — ${name}`,
          required: false,
          config: {},
          validationRules: {},
          visibilityRules: {},
        },
      ],
    });
    await checklists.publishTemplate(atorChecklist, template.id);
    return template.id as string;
  };
  const coleta = await publicar("Vistoria de coleta");
  const entrega = await publicar("Vistoria de entrega");

  const sql = async (texto: string, params: readonly unknown[] = []): Promise<any[]> => admin.$queryRawUnsafe(texto, ...params);

  return {
    tenantId,
    coleta,
    entrega,
    checklists,
    atorChecklist,
    async criarOs(set: ReadonlyArray<{ checklistId: string; role: string }>): Promise<string> {
      const os = await ordens.create(gestao as never, { title: "OS de guincho (ordem por etapa)", checklists: set });
      return os.id;
    },
    /** OS como o banco a tinha ANTES do 04c e já enviada: campo legado + formulário congelado no espelho, junção vazia. */
    async criarOsLegadaEnviada(): Promise<string> {
      const os = await admin.workOrder.create({
        data: {
          tenant_id: tenantId,
          code: `OS-LEG-${Math.random().toString(16).slice(2, 8)}`,
          title: "Ordem anterior à junção, já enviada",
          priority: "medium",
          status: "assigned",
          checklist_id: entrega,
          checklist_snapshot: { template_id: entrega, contract: "checklist_snapshot@2026-07-31.omega3c" },
          created_by: gestor.id,
          updated_by: gestor.id,
        },
      });
      return os.id as string;
    },
    async ajustar(workOrderId: string, body: Record<string, unknown>) {
      return ordens.adjustChecklists(gestao as never, workOrderId, body);
    },
    async despachar(workOrderId: string) {
      return despachos.create(gestao as never, { workOrderId, operatorUserId: tecnico.id });
    },
    async linhasCruas(workOrderId: string): Promise<Array<{ id: string; checklist_id: string; role: string; order_index: number; removed: boolean; template_carimbado: string | null }>> {
      return sql(
        `SELECT id::text, checklist_id::text, role, order_index, (removed_at IS NOT NULL) AS removed,
                checklist_snapshot->>'template_id' AS template_carimbado
           FROM work_order_checklists
          WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid
          ORDER BY id`,
        [tenantId, workOrderId],
      );
    },
    async ordemCrua(workOrderId: string): Promise<{ checklist_id: string | null; template_carimbado: string | null }> {
      const [linha] = await sql(
        `SELECT checklist_id::text, checklist_snapshot->>'template_id' AS template_carimbado
           FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid`,
        [tenantId, workOrderId],
      );
      return linha;
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

// Teardown ESCOPADO à organização descartável do caso (o idioma de `bsan314-provisao-entrega-db.test.ts`): toda tabela
// com `tenant_id` uuid, pelo id que o caso semeou, com gatilhos de FK em modo réplica; depois, zero linha residual.
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
