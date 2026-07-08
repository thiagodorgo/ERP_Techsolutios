import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createMemoryNotificationService, getMemoryNotificationRepositoryForTests, resetNotificationRuntimeForTests } from "../src/modules/notifications/notification.service.js";
import { runMaintenanceDueNotifications } from "../src/modules/maintenance-orders/maintenance-order.notifications.js";
import { InMemoryMaintenanceOrderRepository } from "../src/modules/maintenance-orders/maintenance-order.repository.js";
import {
  MaintenanceOrderService,
  type MaintenanceOrderReferenceResolvers,
} from "../src/modules/maintenance-orders/maintenance-order.service.js";
import type { MaintenanceOrderActorContext } from "../src/modules/maintenance-orders/maintenance-order.types.js";
import {
  MAINTENANCE_STATUS_TRANSITIONS,
  assertMaintenanceStatusTransition,
  parseCost,
  parseMaintenanceStatus,
  parseMaintenanceType,
} from "../src/modules/maintenance-orders/maintenance-order.validators.js";

const TENANT = randomUUID();
const OTHER_TENANT = randomUUID();
const USER = randomUUID();
const VEHICLE_V = randomUUID();
const VEHICLE_W = randomUUID();

const actor: MaintenanceOrderActorContext = {
  tenantId: TENANT,
  userId: USER,
  roles: [],
  permissions: [],
};

test("[R2.1] MAINTENANCE_STATUS_TRANSITIONS: terminais sem saida; assertMaintenanceStatusTransition lanca 422", () => {
  assert.deepEqual(MAINTENANCE_STATUS_TRANSITIONS.agendada, ["em_execucao", "cancelada"]);
  assert.deepEqual(MAINTENANCE_STATUS_TRANSITIONS.em_execucao, ["concluida", "cancelada"]);
  assert.deepEqual(MAINTENANCE_STATUS_TRANSITIONS.concluida, []);
  assert.deepEqual(MAINTENANCE_STATUS_TRANSITIONS.cancelada, []);

  // Valid transitions do not throw (no-op included).
  assert.doesNotThrow(() => assertMaintenanceStatusTransition("agendada", "em_execucao"));
  assert.doesNotThrow(() => assertMaintenanceStatusTransition("em_execucao", "em_execucao"));

  assert.throws(
    () => assertMaintenanceStatusTransition("agendada", "concluida"),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "invalid_status_transition");
      return true;
    },
  );
});

test("[R2.1] service.update percorre agendada -> em_execucao -> concluida com custo e data", async () => {
  const service = buildService();
  const created = await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Reparo." });

  const started = await service.update(actor, created.id, { status: "em_execucao" });
  assert.equal(started.status, "em_execucao");

  const completed = await service.update(actor, created.id, {
    status: "concluida",
    cost: 500,
    completed_at: "2026-07-10T00:00:00.000Z",
  });
  assert.equal(completed.status, "concluida");
  assert.equal(completed.cost, 500);
});

test("[conclusao] service.update para concluida sem custo/data rejeita com 422", async () => {
  const service = buildService();
  const created = await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Sem custo." });
  await service.update(actor, created.id, { status: "em_execucao" });

  await assert.rejects(
    () => service.update(actor, created.id, { status: "concluida" }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "completion_requires_cost_and_date");
      return true;
    },
  );
});

test("[R1.2] odometro regressivo dentro de maintenance_orders retorna 422", async () => {
  const service = buildService();
  await service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Alta.", odometer: 3000 });

  await assert.rejects(
    () => service.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Baixa.", odometer: 2000 }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "odometer_regressive");
      return true;
    },
  );
});

test("[R1.2] odometro regressivo cruzado com o max do fuel-log (resolver) retorna 422", async () => {
  const repository = new InMemoryMaintenanceOrderRepository();
  const references: MaintenanceOrderReferenceResolvers = {
    resolveVehicle: async (_actor, id) => id === VEHICLE_V,
    // Fuel-log already has odometer 9000 for VEHICLE_V.
    maxFuelLogOdometer: async (_actor, vehicleId) => (vehicleId === VEHICLE_V ? 9000 : undefined),
  };
  const service = new MaintenanceOrderService(repository, references);

  await assert.rejects(
    () => service.create(actor, { vehicle_id: VEHICLE_V, description: "Menor que fuel.", odometer: 8000 }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "odometer_regressive");
      return true;
    },
  );
});

test("service.create rejeita vehicle_id desconhecido com 400 invalid_vehicle_reference", async () => {
  const service = buildService();

  await assert.rejects(
    () => service.create(actor, { vehicle_id: randomUUID(), description: "X." }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 400);
      assert.equal(err.reason, "invalid_vehicle_reference");
      return true;
    },
  );
});

test("[isolamento] service.get de manutencao de outro tenant retorna 404", async () => {
  const service = buildService();
  const created = await service.create(actor, { vehicle_id: VEHICLE_V, type: "preventiva", description: "Privada." });

  const otherActor: MaintenanceOrderActorContext = { ...actor, tenantId: OTHER_TENANT };

  await assert.rejects(
    () => service.get(otherActor, created.id),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 404);
      assert.equal(err.reason, "not_found");
      return true;
    },
  );
});

test("[R2.3] hasActiveMaintenance = true apenas quando em_execucao e ativa", async () => {
  const service = buildService();
  const created = await service.create(actor, { vehicle_id: VEHICLE_V, type: "preventiva", description: "Ativa." });

  assert.equal(await service.hasActiveMaintenance(actor, VEHICLE_V), false);

  await service.update(actor, created.id, { status: "em_execucao" });
  assert.equal(await service.hasActiveMaintenance(actor, VEHICLE_V), true);

  // Concluir libera a viatura.
  await service.update(actor, created.id, { status: "concluida", cost: 1, completed_at: "2026-07-10T00:00:00.000Z" });
  assert.equal(await service.hasActiveMaintenance(actor, VEHICLE_V), false);
  // Outra viatura nunca é afetada.
  assert.equal(await service.hasActiveMaintenance(actor, VEHICLE_W), false);
});

test("[R2.2] runMaintenanceDueNotifications e idempotente: rodar 2x gera exatamente 1 aviso", async () => {
  resetNotificationRuntimeForTests();
  const notificationService = createMemoryNotificationService();
  const notificationRepository = getMemoryNotificationRepositoryForTests();
  const repository = new InMemoryMaintenanceOrderRepository();
  const recipient = randomUUID();

  // Preventiva agendada, vencendo em 3 dias (dentro da janela de 7).
  const now = new Date("2026-07-08T00:00:00.000Z");
  await repository.create({
    tenantId: TENANT,
    vehicleId: VEHICLE_V,
    type: "preventiva",
    status: "agendada",
    scheduledFor: new Date("2026-07-11T00:00:00.000Z"),
    description: "Preventiva próxima.",
    createdBy: USER,
    updatedBy: USER,
  });
  // Fora da janela (60 dias) — não deve gerar aviso.
  await repository.create({
    tenantId: TENANT,
    vehicleId: VEHICLE_W,
    type: "preventiva",
    status: "agendada",
    scheduledFor: new Date("2026-09-06T00:00:00.000Z"),
    description: "Preventiva distante.",
    createdBy: USER,
    updatedBy: USER,
  });

  const context = {
    tenantId: TENANT,
    repository,
    notificationService,
    recipientUserIds: [recipient],
    now,
  };

  const first = await runMaintenanceDueNotifications(context);
  const second = await runMaintenanceDueNotifications(context);

  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(first[0]?.id, second[0]?.id, "a segunda execução deve retornar o MESMO aviso");

  const stored = await notificationRepository.listByRecipient({
    tenantId: TENANT,
    recipientUserId: recipient,
    filters: {},
  });
  assert.equal(stored.length, 1, "apenas 1 notificação deve existir após 2 execuções");
  assert.equal(stored[0]?.sourceType, "maintenance_order");
});

test("[validacao] parseMaintenanceType/Status/Cost normalizam e rejeitam invalidos", () => {
  assert.equal(parseMaintenanceType("PREVENTIVA"), "preventiva");
  assert.equal(parseMaintenanceType(undefined, "corretiva"), "corretiva");
  assert.throws(() => parseMaintenanceType("turbo"), /type must be one of/);
  assert.throws(() => parseMaintenanceType(undefined), /type is required/);

  assert.equal(parseMaintenanceStatus("EM_EXECUCAO"), "em_execucao");
  assert.throws(() => parseMaintenanceStatus("pausada"), /status must be one of/);

  assert.equal(parseCost(0), 0);
  assert.equal(parseCost(199.99), 199.99);
  assert.throws(() => parseCost(-1), /greater than or equal to zero/);
});

function buildService(): MaintenanceOrderService {
  const repository = new InMemoryMaintenanceOrderRepository();
  const references: MaintenanceOrderReferenceResolvers = {
    resolveVehicle: async (_actor, id) => id === VEHICLE_V || id === VEHICLE_W,
    maxFuelLogOdometer: async () => undefined,
  };

  return new MaintenanceOrderService(repository, references);
}
