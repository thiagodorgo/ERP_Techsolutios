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
// Em memória: as linhas abaixo rodam ANTES de qualquer módulo de src (o `env` é congelado no 1º import).
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOTIVO_DA_CONCLUSAO = "Ordem de servico concluida e pronta para validacao operacional.";

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

  return { tenantId: tenant.id, gestorId: gestor.id, criarOsEmAtendimento, concluirPelaRota, concluirPelaFila, pendentesDaOs, fechar, service, gestao };
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

test("T2 · work-order.controller.ts não pede mais a aprovação por fora da unidade que conclui", () => {
  const fonte = readFileSync(path.join(REPO_ROOT, "src/modules/work-orders/work-order.controller.ts"), "utf8");
  assert.equal(fonte.includes("approvals.request("), false, "o controller ainda chama approvals.request( depois do commit");
  assert.equal(fonte.includes("createDefaultApprovalService"), false, "o controller ainda importa o serviço de aprovações");
});
