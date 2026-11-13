import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { AuthenticatedActor } from "../src/modules/core-saas/types/core-saas.types.js";
import { InMemoryInventoryRepository } from "../src/modules/inventory/inventory.repository.js";
import { InventoryService } from "../src/modules/inventory/inventory.service.js";
import { syncMobileInventoryActions } from "../src/modules/mobile/mobile-inventory-sync.js";
import { InMemoryWorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import { WorkOrderService } from "../src/modules/work-orders/work-order.service.js";

// B-MATERIAL-REENVIO, C-F14a — RC4b: o contrato do PEDIDO de material, do Dart ao handler TS (Emenda C2.8, E-C28.3
// com a E-C28.5 A3/A4/A5).
//
// A fixture `mobile/flutter_app/test/core/sync/bmaterial_request_payloads.json` é VERSIONADA e sai da cadeia real do
// app (`bmaterial_codec_test.dart`: enfileiramento do `PrestadorRepository`, reenvio que injeta o `work_order_id` e o
// `DioInventorySyncBatchApi` com captura dos bytes). O teste Dart a compara com o que o app gera, e este teste a LÊ e
// roda o handler real (`syncMobileInventoryActions`) sobre ela. Nada aqui regrava a fixture.
//
// Um só valor é trocado antes de rodar o handler: o `work_order_id`, que é o id que o SERVIDOR deu à OS; aqui ele
// passa a ser o id da OS criada no repositório em memória. Antes da troca, o valor da fixture tem de ter o formato
// que o parser exige (UUID). Toda chave e todo outro valor vão literais.
//
// Mutação M-C47: a mesma chave da M-C46 trocada só na fixture → este teste vermelho.

const FIXTURE_URL = new URL("../mobile/flutter_app/test/core/sync/bmaterial_request_payloads.json", import.meta.url);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Pedido = { readonly client_batch_id: string; readonly actions: readonly Record<string, unknown>[] };
const fixture = JSON.parse(readFileSync(FIXTURE_URL, "utf8")) as { readonly pedidos: Record<string, Pedido> };

function acaoUnica(tipo: string): Record<string, unknown> {
  const pedido = fixture.pedidos[tipo];
  assert.ok(pedido, `a fixture não tem o pedido ${tipo}`);
  assert.equal(pedido.actions.length, 1, `o pedido ${tipo} tem de ter uma ação`);
  return pedido.actions[0]!;
}

function payloadDe(acao: Record<string, unknown>): Record<string, unknown> {
  const payload = acao.payload;
  assert.ok(payload && typeof payload === "object" && !Array.isArray(payload), "ação sem payload");
  return payload as Record<string, unknown>;
}

function comChaves(objeto: Record<string, unknown>, chaves: readonly string[], onde: string): void {
  for (const chave of chaves) assert.ok(Object.hasOwn(objeto, chave), `${onde} não contém '${chave}'`);
}

test("[RC4b(1)] o pedido do app tem as chaves por tipo, e o remove aponta o add", () => {
  const add = acaoUnica("work_order_material.add");
  const remove = acaoUnica("work_order_material.remove");

  for (const [tipo, acao] of [["work_order_material.add", add], ["work_order_material.remove", remove]] as const) {
    comChaves(acao, ["client_action_id", "type"], `envelope do ${tipo}`);
    assert.equal(acao.type, tipo);
    assert.match(String(acao.client_action_id), UUID, `client_action_id do ${tipo}`);
  }

  const addPayload = payloadDe(add);
  const removePayload = payloadDe(remove);
  comChaves(addPayload, ["work_order_id", "sku", "quantity", "material_local_id"], "payload do add");
  comChaves(removePayload, ["work_order_id", "source_client_action_id", "material_local_id"], "payload do remove");
  assert.equal(Object.hasOwn(removePayload, "sku"), false, "o remove não leva sku");
  assert.equal(Object.hasOwn(removePayload, "quantity"), false, "o remove não leva quantity");

  assert.equal(removePayload.source_client_action_id, add.client_action_id, "o remove desfaz o add do app");
  assert.equal(removePayload.material_local_id, addPayload.material_local_id);
  assert.equal(removePayload.work_order_id, addPayload.work_order_id);
  assert.match(String(addPayload.work_order_id), UUID, "work_order_id do app fora do formato do parser");
});

test("[RC4b(2)] o handler real aceita o add e o remove literais do app", async () => {
  const tenantId = randomUUID();
  const actor = (role: AuthenticatedActor["roles"][number], permissions: AuthenticatedActor["permissions"]): AuthenticatedActor => ({
    tenantId,
    userId: randomUUID(),
    roles: [role],
    permissions,
    explicitPermissions: true,
  });
  const manager = actor("manager", ["work_orders:update"]);
  const tecnico = actor("field_technician", ["work_orders:update"]);
  const inventoryActor = actor("inventory", ["inventory.read", "inventory.manage", "inventory.consume"] as AuthenticatedActor["permissions"]);
  const perfilTecnico = { id: randomUUID(), isActive: true, label: "Técnico do app" };

  const add = acaoUnica("work_order_material.add");
  const remove = acaoUnica("work_order_material.remove");
  const sku = String(payloadDe(add).sku);
  const quantidade = Number(payloadDe(add).quantity);

  // O estoque do técnico, no molde de tests/b-material-sync.test.ts: o item do SKU do app, entrada na base e uma
  // parte na custódia profissional do perfil dele.
  const inventoryRepository = new InMemoryInventoryRepository();
  const inventory = new InventoryService(inventoryRepository, {
    resolveActorOperatorProfile: async (candidate) => (candidate.userId === tecnico.userId ? perfilTecnico : undefined),
  });
  const item = await inventory.createItem(inventoryActor, { sku, name: "Peça do contrato", unit: "un" });
  await inventory.createMovement(inventoryActor, { item_id: item.id, type: "entrada", quantidade: 30, unit_cost: 10 });
  await inventoryRepository.createTransfer({
    tenantId,
    itemId: item.id,
    type: "link",
    quantity: 5,
    custody: { custodyType: "professional", custodyOperatorProfileId: perfilTecnico.id },
    createdBy: inventoryActor.userId,
  });

  // A OS atribuída ao técnico. O id dela é o que o servidor deu, e é ele que substitui o `work_order_id` da fixture.
  const workOrderRepository = new InMemoryWorkOrderRepository();
  const workOrders = new WorkOrderService(workOrderRepository);
  const criada = await workOrderRepository.create({
    tenantId,
    code: `OS-${randomUUID()}`,
    title: "OS do contrato",
    priority: "medium",
    createdBy: manager.userId,
    updatedBy: manager.userId,
  });
  await workOrderRepository.assign({
    tenantId,
    workOrderId: criada.id,
    operatorId: tecnico.userId,
    userId: tecnico.userId,
    message: "Atribuição de teste",
    assignedBy: manager.userId,
    event: { fromStatus: criada.status, actorUserId: manager.userId, message: "Atribuição de teste", metadata: {} },
  });
  const deps = { inventory, workOrders, workOrdersModuleEnabled: async () => true };
  const comOsDoServidor = (tipo: string) => {
    const pedido = structuredClone(fixture.pedidos[tipo]!) as { client_batch_id: string; actions: Record<string, any>[] };
    for (const acao of pedido.actions) acao.payload.work_order_id = criada.id;
    return pedido;
  };

  const respostaAdd = await syncMobileInventoryActions(tecnico, comOsDoServidor("work_order_material.add"), deps);
  assert.equal(respostaAdd.accepted.length, 1, `add: ${JSON.stringify(respostaAdd)}`);
  assert.equal(respostaAdd.accepted[0]?.client_action_id, add.client_action_id);
  assert.equal(respostaAdd.accepted[0]?.material_local_id, payloadDe(add).material_local_id);
  assert.ok(respostaAdd.accepted[0]?.result_ref);
  const baixa = await inventory.findExitBySource(inventoryActor, "work_order_material", String(add.client_action_id));
  assert.ok(baixa, "o add do app não baixou o estoque");
  assert.equal(Math.abs(baixa.quantidadeSinalizada), quantidade);
  assert.equal(baixa.workOrderId, criada.id);

  const respostaRemove = await syncMobileInventoryActions(tecnico, comOsDoServidor("work_order_material.remove"), deps);
  assert.equal(respostaRemove.accepted.length, 1, `remove: ${JSON.stringify(respostaRemove)}`);
  assert.equal(respostaRemove.accepted[0]?.client_action_id, remove.client_action_id);
  assert.equal(
    await inventory.findExitBySource(inventoryActor, "work_order_material", String(add.client_action_id)),
    undefined,
    "o remove do app não estornou a baixa",
  );
});
