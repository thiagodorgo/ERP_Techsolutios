import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryNotificationService,
  getMemoryNotificationRepositoryForTests,
  resetNotificationRuntimeForTests,
} from "../src/modules/notifications/notification.service.js";
import { runFineDueNotifications } from "../src/modules/fines/fine.notifications.js";
import { InMemoryFineRepository } from "../src/modules/fines/fine.repository.js";
import { FineService, type FineReferenceResolvers } from "../src/modules/fines/fine.service.js";
import type { FineActorContext } from "../src/modules/fines/fine.types.js";
import {
  FINE_STATUS_TRANSITIONS,
  assertFineStatusTransition,
  parseFineStatus,
  parseNumeroAuto,
  parseValor,
} from "../src/modules/fines/fine.validators.js";

const TENANT = randomUUID();
const OTHER_TENANT = randomUUID();
const USER = randomUUID();
const VEHICLE_V = randomUUID();
const VEHICLE_W = randomUUID();
const DRIVER_OK = randomUUID();

const managerActor: FineActorContext = {
  tenantId: TENANT,
  userId: USER,
  roles: ["manager"],
  permissions: [],
};
const adminActor: FineActorContext = {
  tenantId: TENANT,
  userId: USER,
  roles: ["tenant_admin"],
  permissions: [],
};

function baseBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    vehicle_id: VEHICLE_V,
    numero_auto: `AI-${randomUUID().slice(0, 8)}`,
    data_infracao: "2026-06-01T10:00:00.000Z",
    orgao: "DETRAN-SP",
    valor: 150,
    ...overrides,
  };
}

test("[R3.1] FINE_STATUS_TRANSITIONS: terminais sem saida; assertFineStatusTransition lanca 422", () => {
  assert.deepEqual(FINE_STATUS_TRANSITIONS.recebida, ["em_recurso", "paga", "cancelada"]);
  assert.deepEqual(FINE_STATUS_TRANSITIONS.em_recurso, ["deferida", "indeferida", "cancelada"]);
  assert.deepEqual(FINE_STATUS_TRANSITIONS.deferida, ["cancelada"]);
  assert.deepEqual(FINE_STATUS_TRANSITIONS.indeferida, ["paga", "cancelada"]);
  assert.deepEqual(FINE_STATUS_TRANSITIONS.paga, []);
  assert.deepEqual(FINE_STATUS_TRANSITIONS.cancelada, []);

  assert.doesNotThrow(() => assertFineStatusTransition("recebida", "em_recurso"));
  assert.doesNotThrow(() => assertFineStatusTransition("em_recurso", "em_recurso"));

  assert.throws(
    () => assertFineStatusTransition("recebida", "deferida"),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "invalid_status_transition");
      return true;
    },
  );
});

test("[R3.1] service.update percorre recebida -> em_recurso -> indeferida -> paga", async () => {
  const service = buildService();
  const created = await service.create(managerActor, baseBody());

  const recurso = await service.update(managerActor, created.id, { status: "em_recurso" });
  assert.equal(recurso.status, "em_recurso");

  const indeferida = await service.update(managerActor, created.id, { status: "indeferida" });
  assert.equal(indeferida.status, "indeferida");

  const paga = await service.update(managerActor, created.id, { status: "paga" });
  assert.equal(paga.status, "paga");
});

test("[cancelamento] cancelar por nao-admin rejeita 403; por tenant_admin conclui", async () => {
  const service = buildService();

  const forManager = await service.create(managerActor, baseBody());
  await assert.rejects(
    () => service.update(managerActor, forManager.id, { status: "cancelada" }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 403);
      assert.equal(err.reason, "cancel_requires_admin");
      return true;
    },
  );

  const forAdmin = await service.create(managerActor, baseBody());
  const cancelled = await service.update(adminActor, forAdmin.id, { status: "cancelada" });
  assert.equal(cancelled.status, "cancelada");
});

test("[R3.3] numero_auto duplicado no mesmo tenant rejeita 409; outro tenant permite", async () => {
  const service = buildService();
  await service.create(managerActor, baseBody({ numero_auto: "SVC-DUP" }));

  await assert.rejects(
    () => service.create(managerActor, baseBody({ numero_auto: "SVC-DUP" })),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 409);
      assert.equal(err.reason, "duplicate_numero_auto");
      return true;
    },
  );

  const otherTenantActor: FineActorContext = { ...managerActor, tenantId: OTHER_TENANT };
  const other = await service.create(otherTenantActor, baseBody({ numero_auto: "SVC-DUP" }));
  assert.equal(other.numeroAuto, "SVC-DUP");
});

test("[driver] driver_id fora do tenant rejeita 400 invalid_driver_reference; driver valido aceito", async () => {
  const service = buildService();

  await assert.rejects(
    () => service.create(managerActor, baseBody({ driver_id: randomUUID() })),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 400);
      assert.equal(err.reason, "invalid_driver_reference");
      return true;
    },
  );

  const withDriver = await service.create(managerActor, baseBody({ driver_id: DRIVER_OK }));
  assert.equal(withDriver.driverId, DRIVER_OK);
});

test("service.create rejeita vehicle_id desconhecido com 400 invalid_vehicle_reference", async () => {
  const service = buildService();

  await assert.rejects(
    () => service.create(managerActor, baseBody({ vehicle_id: randomUUID() })),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 400);
      assert.equal(err.reason, "invalid_vehicle_reference");
      return true;
    },
  );
});

test("[isolamento] service.get de multa de outro tenant retorna 404", async () => {
  const service = buildService();
  const created = await service.create(managerActor, baseBody());
  const otherActor: FineActorContext = { ...managerActor, tenantId: OTHER_TENANT };

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

test("[R3.2] runFineDueNotifications e idempotente: rodar 2x gera exatamente 1 aviso", async () => {
  resetNotificationRuntimeForTests();
  const notificationService = createMemoryNotificationService();
  const notificationRepository = getMemoryNotificationRepositoryForTests();
  const repository = new InMemoryFineRepository();
  const recipient = randomUUID();

  const now = new Date("2026-07-08T00:00:00.000Z");

  // Multa não-final, prazo de pagamento em 3 dias (dentro da janela de 7).
  await repository.create({
    tenantId: TENANT,
    vehicleId: VEHICLE_V,
    numeroAuto: "DUE-1",
    dataInfracao: new Date("2026-06-01T00:00:00.000Z"),
    orgao: "DETRAN",
    valor: 100,
    pontos: 0,
    prazoPagamento: new Date("2026-07-11T00:00:00.000Z"),
    status: "recebida",
    createdBy: USER,
    updatedBy: USER,
  });
  // Multa já paga (final) — não deve gerar aviso mesmo com prazo próximo.
  await repository.create({
    tenantId: TENANT,
    vehicleId: VEHICLE_W,
    numeroAuto: "DUE-PAGA",
    dataInfracao: new Date("2026-06-01T00:00:00.000Z"),
    orgao: "DETRAN",
    valor: 100,
    pontos: 0,
    prazoPagamento: new Date("2026-07-10T00:00:00.000Z"),
    status: "paga",
    createdBy: USER,
    updatedBy: USER,
  });
  // Fora da janela (60 dias) — sem aviso.
  await repository.create({
    tenantId: TENANT,
    vehicleId: VEHICLE_W,
    numeroAuto: "DUE-FAR",
    dataInfracao: new Date("2026-06-01T00:00:00.000Z"),
    orgao: "DETRAN",
    valor: 100,
    pontos: 0,
    prazoRecurso: new Date("2026-09-06T00:00:00.000Z"),
    status: "recebida",
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

  const first = await runFineDueNotifications(context);
  const second = await runFineDueNotifications(context);

  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(first[0]?.id, second[0]?.id, "a segunda execução deve retornar o MESMO aviso");

  const stored = await notificationRepository.listByRecipient({
    tenantId: TENANT,
    recipientUserId: recipient,
    filters: {},
  });
  assert.equal(stored.length, 1, "apenas 1 notificação deve existir após 2 execuções");
  assert.equal(stored[0]?.sourceType, "fine");
});

test("[validacao] parseNumeroAuto/Status/Valor normalizam e rejeitam invalidos", () => {
  assert.equal(parseNumeroAuto("  AI-9  "), "AI-9");
  assert.throws(() => parseNumeroAuto(""), /numeroAuto is required/);

  assert.equal(parseFineStatus("EM_RECURSO"), "em_recurso");
  assert.throws(() => parseFineStatus("arquivada"), /status must be one of/);

  assert.equal(parseValor(0), 0);
  assert.equal(parseValor(199.99), 199.99);
  assert.throws(() => parseValor(-1), /greater than or equal to zero/);
});

function buildService(): FineService {
  const repository = new InMemoryFineRepository();
  const references: FineReferenceResolvers = {
    resolveVehicle: async (_actor, id) => id === VEHICLE_V || id === VEHICLE_W,
    resolveDriver: async (_actor, id) => id === DRIVER_OK,
  };

  return new FineService(repository, references);
}
