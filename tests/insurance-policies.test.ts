import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryNotificationService,
  getMemoryNotificationRepositoryForTests,
  resetNotificationRuntimeForTests,
} from "../src/modules/notifications/notification.service.js";
import { runInsuranceRenewalNotifications } from "../src/modules/insurance-policies/insurance-policy.notifications.js";
import { InMemoryInsurancePolicyRepository } from "../src/modules/insurance-policies/insurance-policy.repository.js";
import {
  InsurancePolicyService,
  type InsurancePolicyReferenceResolvers,
} from "../src/modules/insurance-policies/insurance-policy.service.js";
import type { InsuranceActorContext } from "../src/modules/insurance-policies/insurance-policy.types.js";
import {
  deriveInsuranceStatus,
  parseInsuranceWriteStatus,
  parseSeguradora,
  parseValor,
} from "../src/modules/insurance-policies/insurance-policy.validators.js";

const TENANT = randomUUID();
const OTHER_TENANT = randomUUID();
const USER = randomUUID();
const VEHICLE_V = randomUUID();
const VEHICLE_W = randomUUID();

const managerActor: InsuranceActorContext = {
  tenantId: TENANT,
  userId: USER,
  roles: ["manager"],
  permissions: [],
};

function baseBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    vehicle_id: VEHICLE_V,
    seguradora: "Porto Seguro",
    numero_apolice: `AP-${randomUUID().slice(0, 8)}`,
    vigencia_inicio: "2026-01-01T00:00:00.000Z",
    vigencia_fim: "2027-01-01T00:00:00.000Z",
    valor: 1500,
    ...overrides,
  };
}

test("[R4.1] deriveInsuranceStatus: vigente/vencida/cancelada incl. limite exatamente hoje", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");

  // cancelada sempre cancelada, mesmo com vigencia futura.
  assert.equal(deriveInsuranceStatus("cancelada", new Date("2030-01-01T00:00:00.000Z"), now), "cancelada");

  // vigencia no passado => vencida.
  assert.equal(deriveInsuranceStatus("vigente", new Date("2026-07-07T12:00:00.000Z"), now), "vencida");

  // vigencia no futuro => vigente.
  assert.equal(deriveInsuranceStatus("vigente", new Date("2026-07-09T12:00:00.000Z"), now), "vigente");

  // limite: vigencia_fim exatamente == now => ainda vigente (nao expirou).
  assert.equal(deriveInsuranceStatus("vigente", new Date(now.getTime()), now), "vigente");

  // limite: 1ms antes de now => vencida.
  assert.equal(deriveInsuranceStatus("vigente", new Date(now.getTime() - 1), now), "vencida");
});

test("[R4.1] parseInsuranceWriteStatus: vencida=422; invalido=400; vigente/cancelada ok", () => {
  assert.equal(parseInsuranceWriteStatus("vigente"), "vigente");
  assert.equal(parseInsuranceWriteStatus("CANCELADA"), "cancelada");

  assert.throws(
    () => parseInsuranceWriteStatus("vencida"),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string; code?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.code, "INSURANCE_INVALID");
      assert.equal(err.reason, "cannot_set_derived_status");
      return true;
    },
  );

  assert.throws(
    () => parseInsuranceWriteStatus("arquivada"),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 400);
      assert.equal(err.reason, "invalid_status");
      return true;
    },
  );
});

test("service.create cria vigente; cancelar e reativar (vigente <-> cancelada)", async () => {
  const service = buildService();
  const created = await service.create(managerActor, baseBody());
  assert.equal(created.status, "vigente");

  const cancelled = await service.update(managerActor, created.id, { status: "cancelada" });
  assert.equal(cancelled.status, "cancelada");

  const reactivated = await service.update(managerActor, created.id, { status: "vigente" });
  assert.equal(reactivated.status, "vigente");
});

test("[R4.1] service.update com status=vencida rejeita 422", async () => {
  const service = buildService();
  const created = await service.create(managerActor, baseBody());

  await assert.rejects(
    () => service.update(managerActor, created.id, { status: "vencida" }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "cannot_set_derived_status");
      return true;
    },
  );
});

test("[validacao] vigencia_fim <= vigencia_inicio rejeita 400 invalid_vigencia", async () => {
  const service = buildService();

  await assert.rejects(
    () =>
      service.create(
        managerActor,
        baseBody({ vigencia_inicio: "2027-01-01T00:00:00.000Z", vigencia_fim: "2026-01-01T00:00:00.000Z" }),
      ),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 400);
      assert.equal(err.reason, "invalid_vigencia");
      return true;
    },
  );
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

test("[P6] numero_apolice duplicado no mesmo tenant rejeita 409; outro tenant permite", async () => {
  const service = buildService();
  await service.create(managerActor, baseBody({ numero_apolice: "SVC-DUP" }));

  await assert.rejects(
    () => service.create(managerActor, baseBody({ numero_apolice: "SVC-DUP" })),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 409);
      assert.equal(err.reason, "duplicate_numero_apolice");
      return true;
    },
  );

  const otherTenantActor: InsuranceActorContext = { ...managerActor, tenantId: OTHER_TENANT };
  const other = await service.create(otherTenantActor, baseBody({ numero_apolice: "SVC-DUP" }));
  assert.equal(other.numeroApolice, "SVC-DUP");
});

test("[isolamento] service.get de apolice de outro tenant retorna 404", async () => {
  const service = buildService();
  const created = await service.create(managerActor, baseBody());
  const otherActor: InsuranceActorContext = { ...managerActor, tenantId: OTHER_TENANT };

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

test("[R4.2] runInsuranceRenewalNotifications: janelas 30/15/7 corretas e idempotente (2x = mesmos avisos)", async () => {
  resetNotificationRuntimeForTests();
  const notificationService = createMemoryNotificationService();
  const notificationRepository = getMemoryNotificationRepositoryForTests();
  const repository = new InMemoryInsurancePolicyRepository();
  const recipient = randomUUID();

  const now = new Date("2026-07-08T00:00:00.000Z");
  const daysOut = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // 5 dias para vencer => cruzou 30, 15 e 7 => 3 avisos.
  const fiveDays = await repository.create({
    tenantId: TENANT,
    vehicleId: VEHICLE_V,
    seguradora: "Porto",
    numeroApolice: "REN-5",
    vigenciaInicio: new Date("2025-07-08T00:00:00.000Z"),
    vigenciaFim: daysOut(5),
    valor: 1000,
    status: "vigente",
    createdBy: USER,
    updatedBy: USER,
  });
  // 20 dias para vencer => cruzou apenas 30 => 1 aviso.
  await repository.create({
    tenantId: TENANT,
    vehicleId: VEHICLE_W,
    seguradora: "Porto",
    numeroApolice: "REN-20",
    vigenciaInicio: new Date("2025-07-08T00:00:00.000Z"),
    vigenciaFim: daysOut(20),
    valor: 1000,
    status: "vigente",
    createdBy: USER,
    updatedBy: USER,
  });
  // Cancelada (5 dias) => nunca gera aviso.
  await repository.create({
    tenantId: TENANT,
    vehicleId: VEHICLE_W,
    seguradora: "Porto",
    numeroApolice: "REN-CANC",
    vigenciaInicio: new Date("2025-07-08T00:00:00.000Z"),
    vigenciaFim: daysOut(5),
    valor: 1000,
    status: "cancelada",
    createdBy: USER,
    updatedBy: USER,
  });
  // Fora de todas as janelas (60 dias) => sem aviso.
  await repository.create({
    tenantId: TENANT,
    vehicleId: VEHICLE_W,
    seguradora: "Porto",
    numeroApolice: "REN-FAR",
    vigenciaInicio: new Date("2025-07-08T00:00:00.000Z"),
    vigenciaFim: daysOut(60),
    valor: 1000,
    status: "vigente",
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

  const first = await runInsuranceRenewalNotifications(context);
  const second = await runInsuranceRenewalNotifications(context);

  assert.equal(first.length, 4, "3 (5 dias) + 1 (20 dias)");
  assert.equal(second.length, 4, "2a execucao retorna os MESMOS avisos");

  const stored = await notificationRepository.listByRecipient({
    tenantId: TENANT,
    recipientUserId: recipient,
    filters: {},
  });
  assert.equal(stored.length, 4, "apenas 4 notificacoes apos 2 execucoes (idempotente)");
  assert.equal(stored[0]?.sourceType, "insurance_policy");

  // A apolice de 5 dias cruzou exatamente as janelas 30/15/7.
  const fiveDayWindows = stored
    .filter((notification) => notification.sourceId === fiveDays.id)
    .map((notification) => notification.metadata.windowDays as number)
    .sort((a, b) => a - b);
  assert.deepEqual(fiveDayWindows, [7, 15, 30]);
});

test("[validacao] parseSeguradora/parseValor normalizam e rejeitam invalidos", () => {
  assert.equal(parseSeguradora("  Porto Seguro  "), "Porto Seguro");
  assert.throws(() => parseSeguradora(""), /seguradora is required/);

  assert.equal(parseValor(0), 0);
  assert.equal(parseValor(199.99), 199.99);
  assert.throws(() => parseValor(-1), /greater than or equal to zero/);
});

function buildService(): InsurancePolicyService {
  const repository = new InMemoryInsurancePolicyRepository();
  const references: InsurancePolicyReferenceResolvers = {
    resolveVehicle: async (_actor, id) => id === VEHICLE_V || id === VEHICLE_W,
  };

  return new InsurancePolicyService(repository, references);
}
