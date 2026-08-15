import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { WorkOrderService } from "../src/modules/work-orders/work-order.service.js";
import { WorkOrderError, type WorkOrderActorContext } from "../src/modules/work-orders/work-order.types.js";

// CHECKLIST P1 PR-04c-A — o conjunto de vistorias contra o PostgreSQL REAL.
//
// A suíte em memória prova a SEMÂNTICA; ela não sabe nada do banco. O que só existe aqui:
//
//   1. o UNIQUE PARCIAL `(tenant_id, work_order_id, checklist_id, role) WHERE removed_at IS NULL` — é ele que
//      impede duas vistorias iguais na mesma etapa, e é ele que PERMITE o mesmo modelo na coleta e na entrega
//      (a identidade com fase que a junta decidiu). Um duplo de teste provaria apenas que o duplo sabe recusar;
//   2. o CHECK biconditional da proveniência `(checklist_source = 'resolved') = (rule_id IS NOT NULL)`;
//   3. a atomicidade junção↔espelho: ordem + N linhas + `work_orders.checklist_id` na MESMA transação;
//   4. a remoção SOFT liberando o par para re-inclusão (o índice é parcial) sem perder o histórico.
//
// É a mesma família de bug do hotfix #341: o banco divergir do código com a suíte verde o tempo todo porque
// rodava em memória.
//
// Cada caso cria uma organização DESCARTÁVEL e a remove no `finally`, escopada pelo id que ele mesmo semeou —
// nunca apagamento em massa por curinga na base viva (P-JUNTA-LIMPEZA-BASE-VIVA).

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("conjunto de vistorias no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = connectionString;

  test("[sticky no banco] o create grava ordem + conjunto + espelho na MESMA transação", async () => {
    await comCenario(connection, async ({ client, service, actor, cenario }) => {
      const workOrder = await service.create(actor, { title: "Guincho com regra" });

      const linhas = await linhasCruas(client, cenario.tenantId);
      assert.equal(linhas.length, 1, "a linha da junção existe no banco, não só no objeto devolvido");
      assert.equal(linhas[0]?.checklist_id, cenario.templateColeta);
      assert.equal(linhas[0]?.role, "collection");
      assert.equal(linhas[0]?.checklist_source, "resolved");
      assert.equal(linhas[0]?.rule_id, cenario.ruleId, "a regra que escolheu a vistoria fica gravada na linha");

      const persistida = await ordemCrua(client, workOrder.id);
      assert.equal(persistida?.checklist_id, cenario.templateColeta, "o espelho é gravado junto, não depois");
    });
  });

  test("[identidade com fase] o MESMO modelo em coleta e entrega convive; repetir a etapa estoura o unique parcial", async () => {
    await comCenario(connection, async ({ client, service, actor, cenario }) => {
      // O par que alimenta a tela de comparação: um schema, duas execuções, um resumo de divergências.
      const workOrder = await service.create(actor, {
        title: "Coleta e entrega do mesmo formulário",
        checklists: [
          { checklistId: cenario.templateColeta, role: "collection" },
          { checklistId: cenario.templateColeta, role: "delivery" },
        ],
      });
      assert.equal((await linhasCruas(client, cenario.tenantId)).length, 2);

      // O índice é a autoridade final: um INSERT direto da MESMA etapa tem de ser recusado pelo banco, mesmo
      // que algum caminho de serviço no futuro esqueça o pré-check.
      await assert.rejects(
        inserirLinhaCrua(client, {
          tenantId: cenario.tenantId,
          workOrderId: workOrder.id,
          checklistId: cenario.templateColeta,
          role: "delivery",
        }),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_unique/);
          return true;
        },
        "duas vistorias iguais na mesma etapa tornariam indefinido o que o técnico recebe",
      );
    });
  });

  test("[proveniência] o CHECK do banco recusa `resolved` sem regra e `manual` com regra", async () => {
    await comCenario(connection, async ({ client, service, actor, cenario }) => {
      const workOrder = await service.create(actor, { title: "Proveniência", checklists: [] });

      await assert.rejects(
        inserirLinhaCrua(client, {
          tenantId: cenario.tenantId,
          workOrderId: workOrder.id,
          checklistId: cenario.templateEntrega,
          role: "delivery",
          source: "resolved",
        }),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_provenance_chk/);
          return true;
        },
        "uma linha resolvida sem regra faria a proveniência mentir sobre quem escolheu a vistoria",
      );

      await assert.rejects(
        inserirLinhaCrua(client, {
          tenantId: cenario.tenantId,
          workOrderId: workOrder.id,
          checklistId: cenario.templateEntrega,
          role: "delivery",
          source: "manual",
          ruleId: cenario.ruleId,
        }),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_provenance_chk/);
          return true;
        },
      );
    });
  });

  test("[ALTA 6 no banco] promoção preguiçosa: a ordem legada materializa a linha antes de receber a nova", async () => {
    await comCenario(connection, async ({ client, service, actor, cenario }) => {
      // Ordem ANTERIOR ao 04c, escrita como o banco a tinha: `checklist_id` preenchido e junção vazia.
      const legacyId = await inserirOrdemLegada(client, cenario, cenario.templateColeta);
      assert.equal((await linhasCruas(client, cenario.tenantId)).length, 0);

      const result = await service.adjustChecklists(actor, legacyId, {
        add: [{ checklistId: cenario.templateEntrega, role: "delivery" }],
      });

      const linhas = await linhasCruas(client, cenario.tenantId);
      assert.equal(linhas.length, 2, "a linha legada é materializada ANTES da nova, na mesma transação");
      assert.equal(linhas[0]?.checklist_id, cenario.templateColeta);
      assert.equal(linhas[0]?.order_index, 0);
      assert.equal(linhas[0]?.checklist_source, "manual");
      assert.equal(linhas[0]?.rule_id, null);
      assert.deepEqual(linhas[0]?.checklist_snapshot, { template: { name: "Congelado" } });
      assert.equal(linhas[1]?.order_index, 1, "a vistoria acrescentada entra no FIM da fila");

      // Sem a promoção, o espelho re-apontaria para a vistoria nova e a antiga sumiria da ordem.
      assert.equal((await ordemCrua(client, legacyId))?.checklist_id, cenario.templateColeta);
      assert.equal(result.workOrder.checklistId, cenario.templateColeta);
    });
  });

  test("[remoção soft] a linha retirada guarda quem/quando/por quê e LIBERA o par para voltar depois", async () => {
    await comCenario(connection, async ({ client, service, actor, cenario }) => {
      const workOrder = await service.create(actor, {
        title: "Retirada e volta",
        checklists: [{ checklistId: cenario.templateColeta, role: "collection" }],
      });

      await service.adjustChecklists(actor, workOrder.id, {
        remove: [{ checklistId: cenario.templateColeta, role: "collection", reason: "cliente dispensou a coleta" }],
      });

      const removidas = await linhasCruas(client, cenario.tenantId);
      assert.equal(removidas.length, 1, "a linha PERSISTE: por que uma vistoria não aconteceu é o que a disputa pergunta");
      assert.ok(removidas[0]?.removed_at);
      assert.equal(removidas[0]?.removed_by, cenario.userId);
      assert.equal(removidas[0]?.removed_reason, "cliente dispensou a coleta");
      assert.equal((await ordemCrua(client, workOrder.id))?.checklist_id, null, "conjunto vivo vazio ⇒ espelho vazio");

      // O índice é PARCIAL: a linha removida não ocupa mais o par, então a mesma vistoria pode voltar.
      const voltou = await service.adjustChecklists(actor, workOrder.id, {
        add: [{ checklistId: cenario.templateColeta, role: "collection" }],
      });
      assert.equal(voltou.workOrder.checklistId, cenario.templateColeta);
      assert.equal((await linhasCruas(client, cenario.tenantId)).length, 2, "a volta é uma linha NOVA; o histórico fica");
    });
  });

  test("[ALTA 7a no banco] o campo antigo com 2 vistorias vivas é recusado e não deixa rastro", async () => {
    await comCenario(connection, async ({ client, service, actor, cenario }) => {
      const workOrder = await service.create(actor, {
        title: "Duas vistorias",
        checklists: [
          { checklistId: cenario.templateColeta, role: "collection" },
          { checklistId: cenario.templateEntrega, role: "delivery" },
        ],
      });

      await assert.rejects(
        service.update(actor, workOrder.id, { checklistId: cenario.templateGenerico }),
        (error: unknown) => {
          assert.ok(error instanceof WorkOrderError);
          assert.equal(error.statusCode, 409);
          assert.equal(error.reason, "checklist_set_requires_endpoint");
          return true;
        },
      );

      const linhas = await linhasCruas(client, cenario.tenantId);
      assert.equal(linhas.length, 2);
      assert.equal(linhas.filter((linha) => linha.removed_at !== null).length, 0, "nada foi removido pela recusa");
      assert.equal((await ordemCrua(client, workOrder.id))?.checklist_id, cenario.templateColeta);
    });
  });

  test("[ALTA 7b no banco] o duplicate copia o conjunto vivo com etapa e posição preservadas", async () => {
    await comCenario(connection, async ({ client, service, actor, cenario }) => {
      const source = await service.create(actor, {
        title: "Origem",
        checklists: [
          { checklistId: cenario.templateColeta, role: "collection" },
          { checklistId: cenario.templateEntrega, role: "delivery" },
        ],
      });

      const copia = await service.duplicate(actor, source.id, { copy_checklist: true });
      const linhasCopia = (await linhasCruas(client, cenario.tenantId)).filter(
        (linha) => linha.work_order_id === copia.id,
      );

      assert.deepEqual(
        linhasCopia.map((linha) => [linha.checklist_id, linha.role, linha.order_index, linha.checklist_source]),
        [
          [cenario.templateColeta, "collection", 0, "manual"],
          [cenario.templateEntrega, "delivery", 1, "manual"],
        ],
      );
      assert.equal((await ordemCrua(client, copia.id))?.checklist_id, cenario.templateColeta);

      const semVistoria = await service.duplicate(actor, source.id, {});
      assert.equal(
        (await linhasCruas(client, cenario.tenantId)).filter((linha) => linha.work_order_id === semVistoria.id).length,
        0,
        "não copiar a vistoria nunca pode virar resolver uma vistoria nova",
      );
      assert.equal((await ordemCrua(client, semVistoria.id))?.checklist_id, null);
    });
  });

  test("[isolamento] a junção é tenant-scoped: outra organização não enxerga nem altera o conjunto", async () => {
    await comCenario(connection, async ({ service, actor, cenario }) => {
      const workOrder = await service.create(actor, {
        title: "Isolada",
        checklists: [{ checklistId: cenario.templateColeta, role: "collection" }],
      });

      const invasor: WorkOrderActorContext = { tenantId: randomUUID(), userId: randomUUID(), roles: [], permissions: [] };
      await assert.rejects(service.listChecklistSet(invasor, workOrder.id), (error: unknown) => {
        assert.ok(error instanceof WorkOrderError);
        assert.equal(error.statusCode, 404, "cross-tenant é 404: nunca vaza a existência da ordem");
        return true;
      });
      await assert.rejects(
        service.adjustChecklists(invasor, workOrder.id, { add: [{ checklistId: cenario.templateEntrega }] }),
        (error: unknown) => {
          assert.ok(error instanceof WorkOrderError);
          assert.equal(error.statusCode, 404);
          return true;
        },
      );
    });
  });
}

// ---------- harness ----------

type Cenario = {
  readonly tenantId: string;
  readonly userId: string;
  readonly ruleId: string;
  readonly templateColeta: string;
  readonly templateEntrega: string;
  readonly templateGenerico: string;
};

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
  ]);
  const { RlsPrismaWorkOrderRepository } = await import("../src/modules/work-orders/work-order-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });

  return { client, repository: new RlsPrismaWorkOrderRepository(client) };
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function comCenario(
  connection: string,
  callback: (contexto: {
    readonly client: BootstrapClient;
    readonly service: WorkOrderService;
    readonly actor: WorkOrderActorContext;
    readonly cenario: Cenario;
  }) => Promise<void>,
): Promise<void> {
  const { client, repository } = await bootstrap(connection);
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await client.tenant.create({ data: { name: `Vistorias OS ${sufixo}`, slug: `wo-chk-${sufixo}` } });

  try {
    const [coleta, entrega, generico] = await Promise.all(
      ["Vistoria de coleta", "Vistoria de entrega", "Vistoria padrão"].map((name) =>
        client.checklistTemplate.create({
          data: { tenant_id: tenant.id, name, type: "towing_collection", status: "published", schema: {} },
        }),
      ),
    );
    const user = await client.user.create({
      data: { tenant_id: tenant.id, name: `Despachante ${sufixo}`, email: `wo-chk-${sufixo}@example.com` },
    });
    // A regra existe só para a linha `resolved` ter uma proveniência REAL (a FK é RESTRICT): nesta fatia
    // nenhuma rota a cria, e é por isso que o porto de resolução é injetado no teste, não montado no serviço.
    const regra = await client.checklistApplicabilityRule.create({
      data: { tenant_id: tenant.id, template_id: coleta!.id, role: "collection" },
    });

    const cenario: Cenario = {
      tenantId: tenant.id,
      userId: user.id,
      ruleId: regra.id,
      templateColeta: coleta!.id,
      templateEntrega: entrega!.id,
      templateGenerico: generico!.id,
    };

    const service = new WorkOrderService(repository, {
      resolveApplicableChecklists: async () => [
        { role: "collection", templateId: cenario.templateColeta, ruleId: cenario.ruleId },
      ],
    });

    await callback({
      client,
      service,
      actor: { tenantId: tenant.id, userId: user.id, roles: [], permissions: [] },
      cenario,
    });
  } finally {
    await teardown(client, tenant.id);
    await client.$disconnect();
  }
}

type LinhaCrua = {
  readonly id: string;
  readonly work_order_id: string;
  readonly checklist_id: string;
  readonly role: string;
  readonly checklist_source: string;
  readonly rule_id: string | null;
  readonly order_index: number;
  readonly checklist_snapshot: unknown;
  readonly removed_at: Date | null;
  readonly removed_by: string | null;
  readonly removed_reason: string | null;
};

async function linhasCruas(client: BootstrapClient, tenantId: string): Promise<readonly LinhaCrua[]> {
  return client.$queryRawUnsafe<LinhaCrua[]>(
    `SELECT id, work_order_id, checklist_id, role, checklist_source, rule_id, order_index, checklist_snapshot,
            removed_at, removed_by, removed_reason
       FROM work_order_checklists WHERE tenant_id = '${tenantId}'::uuid ORDER BY created_at, order_index`,
  );
}

async function ordemCrua(client: BootstrapClient, workOrderId: string) {
  const linhas = await client.$queryRawUnsafe<Array<{ checklist_id: string | null; checklist_snapshot: unknown }>>(
    `SELECT checklist_id, checklist_snapshot FROM work_orders WHERE id = '${workOrderId}'::uuid`,
  );

  return linhas[0];
}

async function inserirLinhaCrua(
  client: BootstrapClient,
  input: {
    readonly tenantId: string;
    readonly workOrderId: string;
    readonly checklistId: string;
    readonly role: string;
    readonly source?: string;
    readonly ruleId?: string;
  },
): Promise<void> {
  await client.$executeRawUnsafe(
    `INSERT INTO work_order_checklists (tenant_id, work_order_id, checklist_id, role, checklist_source, rule_id)
     VALUES ('${input.tenantId}'::uuid, '${input.workOrderId}'::uuid, '${input.checklistId}'::uuid, '${input.role}',
             '${input.source ?? "manual"}', ${input.ruleId ? `'${input.ruleId}'::uuid` : "NULL"})`,
  );
}

/** Ordem como o banco a tinha ANTES do 04c: coluna legada preenchida, junção inexistente (não há backfill). */
async function inserirOrdemLegada(client: BootstrapClient, cenario: Cenario, checklistId: string): Promise<string> {
  const workOrder = await client.workOrder.create({
    data: {
      tenant_id: cenario.tenantId,
      code: `OS-LEG-${Math.random().toString(16).slice(2, 8)}`,
      title: "Ordem legada",
      priority: "medium",
      status: "open",
      checklist_id: checklistId,
      checklist_snapshot: { template: { name: "Congelado" } },
      created_by: cenario.userId,
      updated_by: cenario.userId,
    },
  });

  return workOrder.id;
}

function mensagem(error: unknown): string {
  if (error instanceof Error) {
    const causa = (error as { cause?: unknown }).cause;
    const detalhe = causa instanceof Error ? causa.message : typeof causa === "string" ? causa : "";

    return `${error.message} ${detalhe}`;
  }

  return String(error);
}

/**
 * Remove SÓ a organização que este caso criou, na ordem das dependências. Nunca apagamento por curinga na base
 * viva: a limpeza tem o escopo do que o próprio caso semeou (P-JUNTA-LIMPEZA-BASE-VIVA).
 * `work_order_checklists` cai por CASCADE das ordens, mas é apagada explicitamente para o teardown não depender
 * de um comportamento de FK que este mesmo teste está validando.
 */
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM work_order_checklists WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM work_order_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_applicability_rules WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_templates WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = '${tenantId}'::uuid`);
  });
}
