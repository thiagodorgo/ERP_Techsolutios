import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// B-APROVACOES-DURAVEIS (item 67 do portão; plano §4.1, T2) — EM MEMÓRIA, TODA CONCLUSÃO DE OS PEDE A VALIDAÇÃO, PELAS
// DUAS PORTAS, E UMA SÓ.
//
// Antes deste bloco, o único produtor do pedido era o controller da rota de status, DEPOIS de a conclusão já ter sido
// gravada; a fila do app (`work_order.status_change` em mobile-work-order-sync.ts) concluía a OS sem pedido nenhum. O
// pedido passa a nascer na unidade que conclui (o `changeStatus` do repositório), e as duas portas chamam o mesmo
// `WorkOrderService.changeStatus`.
//
// T2b (emenda 1 §3.4, F4c, com o B-SAN3-16 na main): com um pedido do técnico pendente (enviado pelo lote
// `work_order.approval_request`), concluir a OS por cada uma das 2 portas → 2 pendentes para a OS: 1 com `entity_id` = id
// da OS e o motivo da conclusão, 1 com o motivo do técnico. Aprovar a do técnico deixa a da conclusão pendente. O vermelho
// é a MB21 do 16 (`entityId: fieldApprovalEntityId(…)` → `entityId: workOrder.id,` em mobile-work-order-sync.ts),
// aplicada e revertida sem commit: com ela, o pedido do técnico e o da conclusão se fundem num só.
//
// Em memória: as linhas abaixo rodam ANTES de qualquer módulo de src (o `env` é congelado no 1º import).
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOTIVO_DA_CONCLUSAO = "Ordem de servico concluida e pronta para validacao operacional.";
const MOTIVO_DO_TECNICO = "Troca de peça fora do orçamento";

async function montar() {
  const [
    { createApp },
    workOrders,
    approvals,
    notifications,
    sync,
    { resolvePermissionsForRoles },
    { verifyCheckin },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/work-orders/approval.service.js"),
    import("../src/modules/notifications/notification.service.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/core-saas/permissions/catalog.js"),
    import("../src/modules/work-orders/work-order.checkin.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  workOrders.resetWorkOrderRuntimeForTests();
  approvals.resetApprovalRuntimeForTests();
  notifications.resetNotificationRuntimeForTests();
  sync.resetMobileWorkOrderSyncRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "B-APROV memória", modules: ["work_orders"] });
  const gestor = core.createUser({
    tenantId: tenant.id,
    name: "Gestor B-APROV",
    email: `b-aprov-memoria-${randomUUID()}@example.com`,
    roles: ["manager"],
  });
  const gestao = {
    tenantId: tenant.id,
    userId: gestor.id,
    roles: ["manager"],
    permissions: resolvePermissionsForRoles(["manager"]),
    explicitPermissions: true,
  };
  const service = workOrders.createMemoryWorkOrderService();
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // A OS chega em "Em atendimento" pelo repositório (o caminho até lá não é o que este arquivo mede), com o veredito de
  // check-in da base no "No local", como em tests/bsan314-trava-conclusao.test.ts.
  const criarOsEmAtendimento = async (): Promise<string> => {
    const os = await service.create(gestao as never, { title: "Reboque leve B-APROV" });
    const repo = workOrders.getMemoryWorkOrderRepositoryForTests();
    let from = os.status;
    for (const status of ["assigned", "accepted", "on_route", "on_site", "in_progress"] as const) {
      const atual = await repo.findById(tenant.id, os.id);
      assert.ok(atual);
      const feito = await repo.changeStatus({
        tenantId: tenant.id,
        workOrderId: os.id,
        status,
        expectedStatus: from,
        actorUserId: gestor.id,
        message: "preparo do teste",
        ...(status === "on_site" ? { checkin: verifyCheckin(gestao as never, atual, null, {}, "http_status_route") } : {}),
      } as never);
      assert.ok(feito, `o arnês levou a OS a ${status}`);
      from = status;
    }
    return os.id;
  };

  const concluirPelaRota = async (workOrderId: string) => {
    const response = await fetch(`${baseUrl}/api/v1/work-orders/${workOrderId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": gestor.id, "x-role": "manager" },
      body: JSON.stringify({ status: "completed" }),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  const concluirPelaFila = (workOrderId: string) =>
    sync.syncMobileWorkOrderActions(
      gestao as never,
      {
        client_batch_id: randomUUID(),
        actions: [{ client_action_id: randomUUID(), type: "work_order.status_change", payload: { work_order_id: workOrderId, status: "completed" } }],
      },
      async () => service,
    );

  const pendentesDaOs = async (workOrderId: string) =>
    (await approvals.createDefaultApprovalService()).listPending(gestao as never, { work_order_id: workOrderId });

  const fechar = () =>
    new Promise<void>((resolve, reject) => server.close((error?: Error) => (error ? reject(error) : resolve())));

  // T2b — o técnico da OS (id cru, como no arnês do B-SAN3-16: o contexto do ator vem do token) e a OS atribuída a ele,
  // levada a "Em atendimento" pelo repositório.
  const tecnicoId = randomUUID();
  const campo = {
    tenantId: tenant.id,
    userId: tecnicoId,
    roles: ["field_technician"],
    permissions: resolvePermissionsForRoles(["field_technician"]),
    explicitPermissions: true,
  };
  const criarOsDoTecnico = async (): Promise<string> => {
    const os = await service.create(gestao as never, { title: "Reboque leve B-APROV do técnico" });
    const atribuida = await service.assign(gestao as never, os.id, { userId: tecnicoId });
    const repo = workOrders.getMemoryWorkOrderRepositoryForTests();
    let from = atribuida.status;
    const caminho = ["assigned", "accepted", "on_route", "on_site", "in_progress"] as const;
    for (const status of caminho.slice(caminho.indexOf(from as (typeof caminho)[number]) + 1)) {
      const atual = await repo.findById(tenant.id, os.id);
      assert.ok(atual);
      const feito = await repo.changeStatus({
        tenantId: tenant.id,
        workOrderId: os.id,
        status,
        expectedStatus: from,
        actorUserId: gestor.id,
        message: "preparo do teste",
        ...(status === "on_site" ? { checkin: verifyCheckin(gestao as never, atual, null, {}, "http_status_route") } : {}),
      } as never);
      assert.ok(feito, `o arnês levou a OS a ${status}`);
      from = status;
    }
    return os.id;
  };
  // O pedido do técnico pelo lote do app (B-SAN3-16), com a fila de Aprovações PADRÃO (a memória que `pendentesDaOs` lê).
  const pedirPeloLote = (workOrderId: string) =>
    sync.syncMobileWorkOrderActions(
      campo as never,
      {
        client_batch_id: randomUUID(),
        actions: [
          {
            client_action_id: randomUUID(),
            type: "work_order.approval_request",
            local_created_at: "2026-11-17T12:00:00.000Z",
            payload: { work_order_id: workOrderId, reason: MOTIVO_DO_TECNICO, urgency: "normal" },
          },
        ],
      },
      async () => service,
    );
  const aprovar = async (approvalId: string) =>
    (await approvals.createDefaultApprovalService()).approve(gestao as never, approvalId, { note: "ok" });

  return {
    tenantId: tenant.id,
    gestorId: gestor.id,
    tecnicoId,
    criarOsEmAtendimento,
    criarOsDoTecnico,
    pedirPeloLote,
    aprovar,
    concluirPelaRota,
    concluirPelaFila,
    pendentesDaOs,
    fechar,
    service,
    gestao,
  };
}

async function comCenario(corpo: (c: Awaited<ReturnType<typeof montar>>) => Promise<void>): Promise<void> {
  const c = await montar();
  try {
    await corpo(c);
  } finally {
    await c.fechar();
  }
}

function assertPedidoDaConclusao(
  pendentes: readonly { entityType: string; entityId: string; workOrderId?: string; requestedByUserId: string; pendingReason: string; status: string }[],
  workOrderId: string,
  gestorId: string,
): void {
  assert.equal(pendentes.length, 1, `esperava 1 pedido pendente da conclusão, veio ${pendentes.length}`);
  const [pedido] = pendentes;
  assert.equal(pedido.status, "pending_approval");
  assert.equal(pedido.entityType, "work_order");
  assert.equal(pedido.entityId, workOrderId);
  assert.equal(pedido.workOrderId, workOrderId);
  assert.equal(pedido.requestedByUserId, gestorId);
  assert.equal(pedido.pendingReason, MOTIVO_DA_CONCLUSAO);
}

test("T2 · rota de status — concluir a OS gera 1 pedido pendente de validação da conclusão", async () => {
  await comCenario(async (c) => {
    const os = await c.criarOsEmAtendimento();
    const resposta = await c.concluirPelaRota(os);
    assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
    assert.equal(resposta.body.data.status, "completed");
    assertPedidoDaConclusao(await c.pendentesDaOs(os), os, c.gestorId);
  });
});

test("T2 · fila do app — concluir a OS pelo lote (work_order.status_change) gera 1 pedido pendente de validação", async () => {
  await comCenario(async (c) => {
    const os = await c.criarOsEmAtendimento();
    const lote = await c.concluirPelaFila(os);
    assert.equal(lote.accepted.length, 1, JSON.stringify(lote));
    assert.equal((await c.service.get(c.gestao as never, os)).status, "completed");
    assertPedidoDaConclusao(await c.pendentesDaOs(os), os, c.gestorId);
  });
});

test("T2 · a 2ª conclusão da mesma OS não duplica o pedido (rota, depois fila, depois rota de novo)", async () => {
  await comCenario(async (c) => {
    const os = await c.criarOsEmAtendimento();
    assert.equal((await c.concluirPelaRota(os)).status, 200);
    assert.equal((await c.concluirPelaFila(os)).accepted.length, 1);
    assert.equal((await c.concluirPelaRota(os)).status, 200);
    assertPedidoDaConclusao(await c.pendentesDaOs(os), os, c.gestorId);
  });
});

for (const porta of ["rota", "fila"] as const) {
  test(`T2b · ${porta} — com o pedido do técnico pendente, concluir a OS gera o 2º pendente (o da conclusão); aprovar o do técnico deixa o da conclusão pendente`, async () => {
    await comCenario(async (c) => {
      const os = await c.criarOsDoTecnico();
      const lote = await c.pedirPeloLote(os);
      assert.equal(lote.accepted.length, 1, `o lote recusou o pedido do técnico: ${JSON.stringify(lote)}`);
      assert.equal((await c.pendentesDaOs(os)).length, 1, "o pedido do técnico não ficou pendente");

      if (porta === "rota") {
        const resposta = await c.concluirPelaRota(os);
        assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
      } else {
        assert.equal((await c.concluirPelaFila(os)).accepted.length, 1, "a fila não concluiu");
      }
      assert.equal((await c.service.get(c.gestao as never, os)).status, "completed");

      const pendentes = await c.pendentesDaOs(os);
      assert.equal(pendentes.length, 2, `esperava 2 pendentes para a OS (o do técnico e o da conclusão), veio ${pendentes.length}`);
      const daConclusao = pendentes.find((p) => p.entityId === os);
      const doTecnico = pendentes.find((p) => p.entityId !== os);
      assert.ok(daConclusao, "falta o pedido da conclusão (entity_id = id da OS)");
      assert.ok(doTecnico, "falta o pedido do técnico");
      assert.equal(daConclusao.pendingReason, MOTIVO_DA_CONCLUSAO);
      assert.equal(daConclusao.requestedByUserId, c.gestorId);
      assert.equal(doTecnico.pendingReason, MOTIVO_DO_TECNICO);
      assert.equal(doTecnico.requestedByUserId, c.tecnicoId);
      assert.equal(doTecnico.workOrderId, os);
      assert.match(doTecnico.entityId, /^pedido-app:[0-9a-f]{32}$/);

      await c.aprovar(doTecnico.id);
      const sobra = await c.pendentesDaOs(os);
      assert.deepEqual(
        sobra.map((p) => ({ entityId: p.entityId, pendingReason: p.pendingReason })),
        [{ entityId: os, pendingReason: MOTIVO_DA_CONCLUSAO }],
        "aprovar o pedido do técnico mexeu no pedido da conclusão",
      );
    });
  });
}

test("T2 · work-order.controller.ts não pede mais a aprovação por fora da unidade que conclui", () => {
  const fonte = readFileSync(path.join(REPO_ROOT, "src/modules/work-orders/work-order.controller.ts"), "utf8");
  assert.equal(fonte.includes("approvals.request("), false, "o controller ainda chama approvals.request( depois do commit");
  assert.equal(fonte.includes("createDefaultApprovalService"), false, "o controller ainda importa o serviço de aprovações");
});
