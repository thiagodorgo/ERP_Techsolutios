import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-SAN3-14 (R-A4, R-R2-01, R-R2-03; Pergunta 1 = (a) e Pergunta 4 = (a), `D-DONO-TODAS-RECOMENDACOES-1111`) — A OS COM
// VISTORIA DE ENTREGA EM ABERTO NÃO CONCLUI NO SERVIDOR.
//
// Sem a trava, toda OS de guincho concluída sem a entrega (pelo console, pelo app antigo, por um aparelho que nunca
// baixou a entrega) levaria a vistoria de entrega VAZIA ao dossiê de custódia, que é prova. A recusa é 422 ("tente de
// novo"), para que a conclusão feita sem sinal convirja no sync do app em vez de virar conflito parado.
//
// Em memória: as linhas abaixo rodam ANTES de qualquer módulo de src (o `env` é congelado no 1º import).
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

type RunPhase = { readonly role: string | null; readonly status: string };

async function montar(options: { readonly phases?: () => Promise<readonly RunPhase[]> } = {}) {
  const [workOrders, checklists, { resolvePermissionsForRoles }, sync] = await Promise.all([
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/checklists/checklist.service.js"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
  ]);
  workOrders.resetWorkOrderRuntimeForTests();
  checklists.resetChecklistRuntimeForTests();
  sync.resetMobileWorkOrderSyncRuntimeForTests();

  const tenantId = randomUUID();
  const userId = randomUUID();
  const gestao = {
    tenantId,
    userId,
    roles: ["manager"],
    permissions: resolvePermissionsForRoles(["manager"]),
    explicitPermissions: true,
  };
  const memoryService = workOrders.createMemoryWorkOrderService();
  // A composição de produção (a porta lê as vistorias de verdade) ou, para os casos de régua, a porta substituída.
  const service = options.phases
    ? new workOrders.WorkOrderService(workOrders.getMemoryWorkOrderRepositoryForTests(), {
        listChecklistRunPhases: async () => options.phases!(),
      })
    : memoryService;
  const checklistService = checklists.createMemoryChecklistService();
  const atorChecklist = { tenantId, userId };

  const template = await checklistService.createTemplate(atorChecklist, {
    name: "Vistoria do Veículo",
    type: "towing_collection",
    schema: {},
    components: [
      {
        type: "observation",
        label: "Observações do guincheiro",
        required: false,
        config: {},
        validationRules: {},
        visibilityRules: {},
      },
    ],
  });
  await checklistService.publishTemplate(atorChecklist, template.id);

  // A OS chega em "Em atendimento" (o caminho até lá não é o que este arquivo mede).
  const criarOsEmAtendimento = async (): Promise<string> => {
    const os = await memoryService.create(gestao as never, { title: "Reboque leve" });
    const repo = workOrders.getMemoryWorkOrderRepositoryForTests();
    let from = os.status;
    for (const status of ["assigned", "accepted", "on_route", "on_site", "in_progress"] as const) {
      await repo.changeStatus({
        tenantId,
        workOrderId: os.id,
        status,
        expectedStatus: from,
        actorUserId: userId,
        message: "preparo do teste",
      } as never);
      from = status;
    }
    return os.id;
  };
  const criarVistoria = (workOrderId: string, role: "collection" | "delivery") =>
    checklistService.createRun(atorChecklist, {
      checklistId: template.id,
      clientRunKey: `dispatch:${workOrderId}:${template.id}:${role}`,
      relatedEntityType: "work_order",
      relatedEntityId: workOrderId,
      role,
      answers: [],
    });
  const concluir = (workOrderId: string) => service.changeStatus(gestao as never, workOrderId, { status: "completed" });

  return { service, checklistService, atorChecklist, gestao, sync, criarOsEmAtendimento, criarVistoria, concluir };
}

async function recusaDaEntrega(promise: Promise<unknown>): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    const e = error as { statusCode?: number; code?: string; reason?: string; message?: string };
    assert.equal(e.statusCode, 422);
    assert.equal(e.code, "WORK_ORDER_UNPROCESSABLE");
    assert.equal(e.reason, "delivery_checklist_pending");
    assert.equal(e.message, "Conclua a vistoria de entrega antes de concluir a OS.");
    return true;
  });
}

test("OS com vistoria de entrega em andamento não conclui por changeStatus: 422 delivery_checklist_pending", async () => {
  const c = await montar();
  const os = await c.criarOsEmAtendimento();
  await c.criarVistoria(os, "collection");
  await c.criarVistoria(os, "delivery");

  await recusaDaEntrega(c.concluir(os));
  assert.equal((await c.service.get(c.gestao as never, os)).status, "in_progress", "a OS mudou de status");
});

test("OS sem execução de entrega conclui (OS legada, Pergunta 2 = (a))", async () => {
  const c = await montar();
  const os = await c.criarOsEmAtendimento();
  await c.criarVistoria(os, "collection");

  const concluida = await c.concluir(os);
  assert.equal(concluida.status, "completed");
});

test("entrega concluída: conclui", async () => {
  const c = await montar();
  const os = await c.criarOsEmAtendimento();
  const entrega = await c.criarVistoria(os, "delivery");
  await c.checklistService.completeRun(c.atorChecklist, entrega.id, { hasDivergence: false });

  assert.equal((await c.concluir(os)).status, "completed");
});

test("entrega pending_acknowledgement: conclui", async () => {
  const c = await montar();
  const os = await c.criarOsEmAtendimento();
  const entrega = await c.criarVistoria(os, "delivery");
  const concluida = await c.checklistService.completeRun(c.atorChecklist, entrega.id, {
    hasDivergence: true,
    observation: "Retrovisor esquerdo trincado na entrega.",
  });
  assert.equal(concluida.run.status, "pending_acknowledgement", "o arnês não produziu a entrega à espera da ciência");

  assert.equal((await c.concluir(os)).status, "completed");
});

test("entrega cancelled: conclui", async () => {
  const c = await montar({ phases: async () => [{ role: "delivery", status: "cancelled" }] });
  const os = await c.criarOsEmAtendimento();

  assert.equal((await c.concluir(os)).status, "completed");
});

test("cadeia reaberta: versão concluída + versão nova in_progress: 422; concluída a nova: conclui", async () => {
  const c = await montar();
  const os = await c.criarOsEmAtendimento();
  const entrega = await c.criarVistoria(os, "delivery");
  await c.checklistService.completeRun(c.atorChecklist, entrega.id, { hasDivergence: false });
  const reaberta = await c.checklistService.reopenRun(c.atorChecklist, entrega.id, { reason: "Foto ilegível" });
  assert.equal(reaberta.run.run.role, "delivery");

  await recusaDaEntrega(c.concluir(os));

  await c.checklistService.completeRun(c.atorChecklist, reaberta.run.run.id, { hasDivergence: false });
  assert.equal((await c.concluir(os)).status, "completed");
});

test("falha da consulta recusa (fail-closed)", async () => {
  const c = await montar({
    phases: async () => {
      throw new Error("leitura das vistorias indisponível (simulado)");
    },
  });
  const os = await c.criarOsEmAtendimento();

  await recusaDaEntrega(c.concluir(os));
});

test("[sync] conclusão da OS com entrega em andamento pela fila do app sai como rejected/delivery_checklist_pending; concluída a entrega, a MESMA ação (mesmo client_action_id) é aceita", async () => {
  const c = await montar();
  const os = await c.criarOsEmAtendimento();
  const entrega = await c.criarVistoria(os, "delivery");
  const acao = {
    client_action_id: randomUUID(),
    type: "work_order.status_change",
    payload: { work_order_id: os, status: "completed" },
  };
  const enviar = () =>
    c.sync.syncMobileWorkOrderActions(
      c.gestao as never,
      { client_batch_id: randomUUID(), actions: [acao] },
      async () => c.service,
    );

  const primeira = await enviar();
  assert.equal(primeira.accepted.length, 0);
  assert.equal(primeira.conflicts.length, 0, "a recusa virou conflito (o app pararia a ação)");
  assert.equal(primeira.rejected.length, 1);
  const recusada = primeira.rejected[0] as { client_action_id: string; error?: { reason?: string } };
  assert.equal(recusada.client_action_id, acao.client_action_id);
  assert.equal(recusada.error?.reason, "delivery_checklist_pending");

  await c.checklistService.completeRun(c.atorChecklist, entrega.id, { hasDivergence: false });

  const segunda = await enviar();
  assert.equal(segunda.rejected.length, 0);
  assert.equal(segunda.accepted.length, 1, "a mesma ação não foi aceita depois da entrega concluída");
  assert.equal((segunda.accepted[0] as { client_action_id: string }).client_action_id, acao.client_action_id);
  assert.equal((await c.service.get(c.gestao as never, os)).status, "completed");
});
