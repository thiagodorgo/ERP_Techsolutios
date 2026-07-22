import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryNotificationService,
  getMemoryNotificationRepositoryForTests,
  resetNotificationRuntimeForTests,
} from "../src/modules/notifications/notification.service.js";
import { InMemoryScheduledNotificationRepository } from "../src/modules/notifications/scheduled-notification.repository.js";
import { ScheduledNotificationService } from "../src/modules/notifications/scheduled-notification.service.js";
import { InMemoryMaintenanceOrderItemRepository } from "../src/modules/maintenance-orders/maintenance-order-item.repository.js";
import { InMemoryMaintenanceOrderRepository } from "../src/modules/maintenance-orders/maintenance-order.repository.js";
import {
  MaintenanceOrderService,
  type MaintenanceNextDueNotificationInput,
  type MaintenanceOrderReferenceResolvers,
} from "../src/modules/maintenance-orders/maintenance-order.service.js";
import {
  toMaintenanceOrderDto,
  toMaintenanceOrderItemDto,
} from "../src/modules/maintenance-orders/maintenance-order.dto.js";
import type { MaintenanceOrderActorContext } from "../src/modules/maintenance-orders/maintenance-order.types.js";

const TENANT = randomUUID();
const OTHER_TENANT = randomUUID();
const USER = randomUUID();
const VEHICLE_V = randomUUID();
const VEHICLE_W = randomUUID();

const actor: MaintenanceOrderActorContext = { tenantId: TENANT, userId: USER, roles: [], permissions: [] };
const otherActor: MaintenanceOrderActorContext = { tenantId: OTHER_TENANT, userId: randomUUID(), roles: [], permissions: [] };

type Harness = {
  readonly service: MaintenanceOrderService;
  readonly schedService: ScheduledNotificationService;
  readonly schedRepo: InMemoryScheduledNotificationRepository;
  readonly nextDueCalls: MaintenanceNextDueNotificationInput[];
  readonly fuelOdometers: Map<string, number>;
};

function buildHarness(): Harness {
  resetNotificationRuntimeForTests();
  const schedRepo = new InMemoryScheduledNotificationRepository();
  const schedService = new ScheduledNotificationService(schedRepo, createMemoryNotificationService());
  const nextDueCalls: MaintenanceNextDueNotificationInput[] = [];
  const fuelOdometers = new Map<string, number>();

  const references: MaintenanceOrderReferenceResolvers = {
    resolveVehicle: async (_actor, id) => id === VEHICLE_V || id === VEHICLE_W,
    maxFuelLogOdometer: async (_actor, vehicleId) => fuelOdometers.get(vehicleId),
    // Efeito de domínio REAL: delega ao motor de notificações (memory). Também registra a chamada p/ inspeção.
    // ESPELHA createDefaultReferenceResolvers (R-Ω4C-PR06): o payload da manutenção NÃO carrega visibilidade e o
    // seam FIXA `visibility: 'private'` — jamais public/custom. Broadcast deliberado só via notifications:create.
    scheduleNextDueNotification: async (callActor, input) => {
      nextDueCalls.push(input);
      await schedService.create(callActor, {
        title: input.title,
        message: input.message,
        notify_at: input.notifyAt,
        visibility: "private",
        source_type: "maintenance_item",
        source_id: input.maintenanceOrderId,
        client_action_id: input.clientActionId,
      });
    },
  };

  const service = new MaintenanceOrderService(
    new InMemoryMaintenanceOrderRepository(),
    references,
    new InMemoryMaintenanceOrderItemRepository(),
  );

  return { service, schedService, schedRepo, nextDueCalls, fuelOdometers };
}

test("[MANUT-01/02] CRUD de item + lineTotal e totais DERIVADOS (unit×qty, Σ) nunca persistidos", async () => {
  const { service } = buildHarness();
  const order = await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Revisão." });

  const service1 = await service.addItem(actor, order.id, {
    item_type: "service",
    description: "Mão de obra",
    unit_value: 150,
    quantity: 2,
  });
  const product1 = await service.addItem(actor, order.id, {
    item_type: "product",
    description: "Filtro de óleo",
    unit_value: 49.9,
    quantity: 3,
  });
  const stock1 = await service.addItem(actor, order.id, {
    item_type: "stock",
    description: "Óleo (estoque)",
    unit_value: 30,
    quantity: 1.5,
  });

  // lineTotal derivado = unit × qty.
  assert.equal(toMaintenanceOrderItemDto(service1).lineTotal, 300);
  assert.equal(toMaintenanceOrderItemDto(product1).lineTotal, 149.7);
  assert.equal(toMaintenanceOrderItemDto(stock1).lineTotal, 45);

  const detail = await service.getWithDetail(actor, order.id);
  assert.equal(detail.items.length, 3);
  // Buckets: SERVIÇO→services; PRODUTO+ESTOQUE→products (ESTOQUE é peça física).
  assert.equal(detail.totals.totalServices, 300);
  assert.equal(detail.totals.totalProducts, 194.7); // 149.7 + 45
  assert.equal(detail.totals.total, 494.7);
  assert.equal(detail.totals.itemCount, 3);

  // Nenhuma coluna de total foi persistida — o DTO da linha não carrega maintenance_order_id/tenant_id.
  const dto = toMaintenanceOrderItemDto(service1);
  assert.equal((dto as Record<string, unknown>).tenantId, undefined);
  assert.equal((dto as Record<string, unknown>).maintenanceOrderId, undefined);
  assert.deepEqual(Object.keys(dto).sort(), [
    "createdAt",
    "description",
    "id",
    "itemType",
    "lineTotal",
    "notes",
    "quantity",
    "unitValue",
    "updatedAt",
  ]);
});

test("[MANUT-02] item update recalcula o total derivado; delete (soft) remove da soma", async () => {
  const { service } = buildHarness();
  const order = await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Revisão." });

  const item = await service.addItem(actor, order.id, { item_type: "service", description: "Mão de obra", unit_value: 100, quantity: 1 });
  await service.addItem(actor, order.id, { item_type: "product", description: "Peça", unit_value: 50, quantity: 2 });

  let detail = await service.getWithDetail(actor, order.id);
  assert.equal(detail.totals.total, 200); // 100 + 100

  await service.updateItem(actor, order.id, item.id, { quantity: 3 });
  detail = await service.getWithDetail(actor, order.id);
  assert.equal(detail.totals.totalServices, 300);
  assert.equal(detail.totals.total, 400); // 300 + 100

  await service.removeItem(actor, order.id, item.id);
  detail = await service.getWithDetail(actor, order.id);
  assert.equal(detail.totals.itemCount, 1);
  assert.equal(detail.totals.totalServices, 0);
  assert.equal(detail.totals.total, 100);
});

test("[MANUT-02] unit_value/quantity <= 0 retornam 422", async () => {
  const { service } = buildHarness();
  const order = await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Revisão." });

  await assert.rejects(
    () => service.addItem(actor, order.id, { item_type: "service", description: "X", unit_value: 0, quantity: 1 }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "invalid_unit_value");
      return true;
    },
  );
  await assert.rejects(
    () => service.addItem(actor, order.id, { item_type: "service", description: "X", unit_value: 10, quantity: -1 }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "invalid_quantity");
      return true;
    },
  );
});

test("[MANUT-01] item_type inválido e description ausente retornam 400", async () => {
  const { service } = buildHarness();
  const order = await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Revisão." });

  await assert.rejects(
    () => service.addItem(actor, order.id, { item_type: "combustivel", description: "X", unit_value: 10, quantity: 1 }),
    (error: unknown) => {
      assert.equal((error as { reason?: string }).reason, "invalid_item_type");
      return true;
    },
  );
  await assert.rejects(
    () => service.addItem(actor, order.id, { item_type: "service", unit_value: 10, quantity: 1 }),
    (error: unknown) => {
      assert.equal((error as { reason?: string }).reason, "required_field");
      return true;
    },
  );
});

test("[MANUT-09] item de ordem de outro tenant → 404 (posse do pai)", async () => {
  const { service } = buildHarness();
  const order = await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Privada A." });

  await assert.rejects(
    () => service.addItem(otherActor, order.id, { item_type: "service", description: "X", unit_value: 10, quantity: 1 }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 404);
      assert.equal(err.reason, "not_found");
      return true;
    },
  );
  await assert.rejects(
    () => service.listItems(otherActor, order.id),
    (error: unknown) => {
      assert.equal((error as { statusCode?: number }).statusCode, 404);
      return true;
    },
  );
});

test("[MANUT-01] item de OUTRA ordem no mesmo tenant → 404 no update/delete", async () => {
  const { service } = buildHarness();
  const orderA = await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "A." });
  const orderB = await service.create(actor, { vehicle_id: VEHICLE_W, type: "corretiva", description: "B." });
  const item = await service.addItem(actor, orderA.id, { item_type: "service", description: "X", unit_value: 10, quantity: 1 });

  await assert.rejects(
    () => service.updateItem(actor, orderB.id, item.id, { quantity: 2 }),
    (error: unknown) => {
      assert.equal((error as { statusCode?: number }).statusCode, 404);
      return true;
    },
  );
});

test("[MANUT-05] próxima manutenção gera 1 ScheduledNotification com client_action_id determinístico", async () => {
  const { service, schedService, nextDueCalls } = buildHarness();
  const nextDue = "2027-01-10T12:00:00.000Z";
  const order = await service.create(actor, {
    vehicle_id: VEHICLE_V,
    type: "preventiva",
    description: "Com próxima.",
    next_due_at: nextDue,
  });

  assert.equal(nextDueCalls.length, 1);
  assert.equal(nextDueCalls[0]?.clientActionId, `maintenance-next-due:${order.id}`);
  // O efeito de domínio NÃO carrega escolha de visibilidade no payload (R-Ω4C-PR06): o campo não existe.
  assert.equal((nextDueCalls[0] as Record<string, unknown>).visibility, undefined);
  assert.equal(nextDueCalls[0]?.notifyAt.toISOString(), nextDue);

  const defs = await schedService.list(actor, {});
  assert.equal(defs.total, 1);
  assert.equal(defs.items[0]?.sourceType, "maintenance_item");
  assert.equal(defs.items[0]?.sourceId, order.id);
  assert.equal(defs.items[0]?.clientActionId, `maintenance-next-due:${order.id}`);
  // A definição resultante é PRIVADA (só criador/responsável) — o seam de manutenção nunca gera broadcast.
  assert.equal(defs.items[0]?.visibility, "private");
});

test("[MANUT-05] reprocessar a MESMA manutenção NÃO duplica (dedupe idempotente)", async () => {
  const { service, schedService } = buildHarness();
  const order = await service.create(actor, {
    vehicle_id: VEHICLE_V,
    type: "preventiva",
    description: "Idempotente.",
    next_due_at: "2027-01-10T12:00:00.000Z",
  });

  const firstList = await schedService.list(actor, {});
  const firstId = firstList.items[0]?.id;

  // Reprocessa a MESMA ordem (editar/atualizar com next_due_at de novo) → mesmo client_action_id.
  await service.update(actor, order.id, { next_due_at: "2027-02-20T12:00:00.000Z", supplier: "Oficina X" });
  await service.update(actor, order.id, { next_due_at: "2027-03-30T12:00:00.000Z" });

  const finalList = await schedService.list(actor, {});
  assert.equal(finalList.total, 1, "reprocessar a MESMA manutenção não cria definição nova");
  assert.equal(finalList.items[0]?.id, firstId, "o motor devolve a definição existente (dedupe por client_action_id)");
});

test("[MANUT-05] próxima manutenção vencida dispara inline 1 entrega; reprocesso não duplica a entrega", async () => {
  const { service } = buildHarness();
  const notifRepo = getMemoryNotificationRepositoryForTests();
  const past = new Date(Date.now() - 60_000).toISOString();

  const order = await service.create(actor, {
    vehicle_id: VEHICLE_V,
    type: "preventiva",
    description: "Vencida.",
    next_due_at: past,
  });
  // Reprocessa → mesma definição, mesma idempotencyKey de entrega.
  await service.update(actor, order.id, { next_due_at: past });

  const deliveries = await notifRepo.listByRecipient({ tenantId: TENANT, recipientUserId: USER, filters: {} });
  assert.equal(deliveries.length, 1, "definição vencida entrega exatamente 1 notificação (privada → criador), sem duplicar");
});

test("[MANUT-11/R-Ω4C-PR06] ator SEM notifications:create não escala: lembrete é PRIVADO, sem broadcast tenant-wide", async () => {
  const { service, schedService, nextDueCalls } = buildHarness();
  const notifRepo = getMemoryNotificationRepositoryForTests();

  // Ator porta `maintenance_orders:create` mas NÃO `notifications:create` (não poderia disparar broadcast via a
  // rota gated POST /notifications/scheduled). Três usuários ATIVOS no tenant: se houvesse fan-out `public`, os
  // três receberiam. Com a correção, o lembrete é PRIVADO → só o criador.
  const NOTIF_LESS_USER = randomUUID();
  const OTHER_USER_1 = randomUUID();
  const OTHER_USER_2 = randomUUID();
  const notifLessActor: MaintenanceOrderActorContext = {
    tenantId: TENANT,
    userId: NOTIF_LESS_USER,
    roles: [],
    permissions: ["maintenance_orders:create"],
  };
  notifRepo.setRecipientCandidatesForTests(TENANT, [
    { userId: NOTIF_LESS_USER, status: "active", roles: [], permissions: ["maintenance_orders:create"] },
    { userId: OTHER_USER_1, status: "active", roles: [], permissions: [] },
    { userId: OTHER_USER_2, status: "active", roles: [], permissions: [] },
  ]);

  const past = new Date(Date.now() - 60_000).toISOString();
  // Tenta forçar `public` no corpo — o campo SAIU do contrato de manutenção, então é ignorado (não escala).
  const order = await service.create(notifLessActor, {
    vehicle_id: VEHICLE_V,
    type: "preventiva",
    description: "Tentativa de escalada.",
    next_due_at: past,
    next_due_visibility: "public",
  });

  // (1) O efeito de domínio NÃO propaga escolha de visibilidade (o payload não tem o campo).
  assert.equal(nextDueCalls.length, 1);
  assert.equal((nextDueCalls[0] as Record<string, unknown>).visibility, undefined);

  // (2) A definição criada é PRIVADA mesmo com `next_due_visibility: 'public'` no corpo.
  const defs = await schedService.list(notifLessActor, {});
  assert.equal(defs.total, 1);
  assert.equal(defs.items[0]?.visibility, "private", "o seam de manutenção FIXA private — nunca public/custom");

  // (3) SEM fan-out tenant-wide: só o criador/responsável recebe; os demais ativos NÃO (escalada fechada).
  const creatorInbox = await notifRepo.listByRecipient({ tenantId: TENANT, recipientUserId: NOTIF_LESS_USER, filters: {} });
  const other1Inbox = await notifRepo.listByRecipient({ tenantId: TENANT, recipientUserId: OTHER_USER_1, filters: {} });
  const other2Inbox = await notifRepo.listByRecipient({ tenantId: TENANT, recipientUserId: OTHER_USER_2, filters: {} });
  assert.equal(creatorInbox.length, 1, "o lembrete privado entrega só ao criador/responsável");
  assert.equal(other1Inbox.length, 0, "NENHUM broadcast tenant-wide — a escalada de privilégio está fechada");
  assert.equal(other2Inbox.length, 0, "NENHUM broadcast tenant-wide — a escalada de privilégio está fechada");

  // (4) O dedupe idempotente permanece: reprocessar a MESMA ordem não cria definição nova nem duplica a entrega.
  await service.update(notifLessActor, order.id, { next_due_at: past });
  const finalDefs = await schedService.list(notifLessActor, {});
  assert.equal(finalDefs.total, 1, "reprocessar a MESMA manutenção não cria definição nova");
  const creatorInboxAfter = await notifRepo.listByRecipient({ tenantId: TENANT, recipientUserId: NOTIF_LESS_USER, filters: {} });
  assert.equal(creatorInboxAfter.length, 1, "reprocesso não duplica a entrega");
});

test("[MANUT-04] sugestão de hodômetro = max(fuel, maintenance); null sem histórico; source correto", async () => {
  const { service, fuelOdometers } = buildHarness();

  // Sem histórico → null (não inventa).
  assert.equal(await service.odometerSuggestion(actor, VEHICLE_V), null);

  // Manutenção 3000 primeiro (sem fuel), depois fuel 5000 > maintenance 3000 → 5000 / fuel_log.
  await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "M.", odometer: 3000 });
  fuelOdometers.set(VEHICLE_V, 5000);
  const s1 = await service.odometerSuggestion(actor, VEHICLE_V);
  assert.deepEqual(s1, { suggestedOdometer: 5000, source: "fuel_log" });

  // Maintenance 8000 > fuel 5000 → 8000 / maintenance_order.
  await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "M2.", odometer: 8000 });
  const s2 = await service.odometerSuggestion(actor, VEHICLE_V);
  assert.deepEqual(s2, { suggestedOdometer: 8000, source: "maintenance_order" });

  // Só maintenance (VEHICLE_W sem fuel) → maintenance_order.
  await service.create(actor, { vehicle_id: VEHICLE_W, type: "corretiva", description: "W.", odometer: 1200 });
  const s3 = await service.odometerSuggestion(actor, VEHICLE_W);
  assert.deepEqual(s3, { suggestedOdometer: 1200, source: "maintenance_order" });
});

test("[MANUT-08] DTO do cabeçalho expõe totals + nextDueAt e OMITE tenant_id (§2.8)", async () => {
  const { service } = buildHarness();
  const order = await service.create(actor, {
    vehicle_id: VEHICLE_V,
    type: "preventiva",
    description: "DTO.",
    next_due_at: "2027-01-10T12:00:00.000Z",
  });
  await service.addItem(actor, order.id, { item_type: "product", description: "Peça", unit_value: 10, quantity: 2 });

  const detail = await service.getWithDetail(actor, order.id);
  const dto = toMaintenanceOrderDto(detail.order, { totals: detail.totals, items: detail.items });

  assert.equal((dto as Record<string, unknown>).tenantId, undefined);
  assert.equal((dto as Record<string, unknown>).tenant_id, undefined);
  assert.equal(dto.nextDueAt, "2027-01-10T12:00:00.000Z");
  assert.equal(dto.totals.total, 20);
  assert.equal(dto.totals.itemCount, 1);
  assert.ok(Array.isArray(dto.items));
});

test("[MANUT-10] criar SEM next_due_at NÃO dispara notificação (zero efeito colateral)", async () => {
  const { service, schedService, nextDueCalls } = buildHarness();
  await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Sem próxima." });

  assert.equal(nextDueCalls.length, 0);
  const defs = await schedService.list(actor, {});
  assert.equal(defs.total, 0);
});
