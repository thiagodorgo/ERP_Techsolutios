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
import { InMemoryScheduledNotificationRepository } from "../src/modules/notifications/scheduled-notification.repository.js";
import { ScheduledNotificationService } from "../src/modules/notifications/scheduled-notification.service.js";
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

// ---------- Ω4C PR-07 (D-Ω4C-SEG-EXPIRY-NOTIF): vencimento → ScheduledNotification PRIVADA ----------

type ExpiryHarness = {
  readonly service: InsurancePolicyService;
  readonly schedService: ScheduledNotificationService;
  readonly schedRepo: InMemoryScheduledNotificationRepository;
  readonly expiryCalls: Record<string, unknown>[];
};

// Wire REAL do efeito (memory scheduled-notification service). ESPELHA createDefaultReferenceResolvers (a lição
// PR-06): o payload NÃO carrega visibilidade e o seam FIXA `visibility: 'private'`. Registra a chamada p/ inspeção.
function buildExpiryHarness(): ExpiryHarness {
  resetNotificationRuntimeForTests();
  const schedRepo = new InMemoryScheduledNotificationRepository();
  const schedService = new ScheduledNotificationService(schedRepo, createMemoryNotificationService());
  const expiryCalls: Record<string, unknown>[] = [];
  const references: InsurancePolicyReferenceResolvers = {
    resolveVehicle: async (_actor, id) => id === VEHICLE_V || id === VEHICLE_W,
    scheduleExpiryNotification: async (actorCtx, input) => {
      expiryCalls.push({ ...input });
      await schedService.create(actorCtx, {
        title: "Vencimento de seguro",
        message: `A apólice ${input.numeroApolice} vence.`,
        notify_at: input.vigenciaFim,
        visibility: "private",
        source_type: "insurance_policy",
        source_id: input.policyId,
        client_action_id: `insurance-expiry:${input.policyId}`,
      });
    },
  };
  return { service: new InsurancePolicyService(new InMemoryInsurancePolicyRepository(), references), schedService, schedRepo, expiryCalls };
}

test("[SEG-01] vencimento cria 1 ScheduledNotification PRIVADA (source_type/source_id/notify_at); dedupe ao editar (2× → 1)", async () => {
  const { service, schedService } = buildExpiryHarness();
  const created = await service.create(managerActor, baseBody({ vigencia_fim: "2030-01-01T00:00:00.000Z", numero_apolice: "SEG-01" }));

  const defs = await schedService.list(managerActor, {});
  assert.equal(defs.total, 1);
  assert.equal(defs.items[0]?.visibility, "private");
  assert.equal(defs.items[0]?.sourceType, "insurance_policy");
  assert.equal(defs.items[0]?.sourceId, created.id);
  assert.equal(defs.items[0]?.notifyAt.toISOString(), new Date("2030-01-01T00:00:00.000Z").toISOString());
  assert.equal(defs.items[0]?.clientActionId, `insurance-expiry:${created.id}`);

  // Editar a MESMA apólice re-registra com o client_action_id determinístico → dedupe (não cria definição nova).
  await service.update(managerActor, created.id, { seguradora: "Outra Seguradora" });
  const finalDefs = await schedService.list(managerActor, {});
  assert.equal(finalDefs.total, 1, "editar não duplica a definição (dedupe determinístico)");
});

test("[SEG-esc] vencimento é lembrete PRIVADO: ator sem notifications:create NÃO escala (só o criador recebe)", async () => {
  const { service, schedService, expiryCalls } = buildExpiryHarness();
  const notifRepo = getMemoryNotificationRepositoryForTests();

  // Ator porta `insurance_policies:create` mas NÃO `notifications:create` (não poderia broadcast via rota gated).
  // Três usuários ATIVOS: se houvesse fan-out `public`, os três receberiam. Com a lição PR-06, é PRIVADO → só criador.
  const CREATOR = randomUUID();
  const OTHER_1 = randomUUID();
  const OTHER_2 = randomUUID();
  const notifLessActor: InsuranceActorContext = { tenantId: TENANT, userId: CREATOR, roles: [], permissions: ["insurance_policies:create"] };
  notifRepo.setRecipientCandidatesForTests(TENANT, [
    { userId: CREATOR, status: "active", roles: [], permissions: ["insurance_policies:create"] },
    { userId: OTHER_1, status: "active", roles: [], permissions: [] },
    { userId: OTHER_2, status: "active", roles: [], permissions: [] },
  ]);

  // vigencia_fim no passado → dispara INLINE (não depende do worker).
  const created = await service.create(
    notifLessActor,
    baseBody({ vigencia_inicio: "2019-01-01T00:00:00.000Z", vigencia_fim: "2020-01-01T00:00:00.000Z", numero_apolice: "SEG-ESC" }),
  );

  // (1) o payload do efeito NÃO propaga escolha de visibilidade (o campo não existe no contrato de seguro).
  assert.equal(expiryCalls.length, 1);
  assert.equal(expiryCalls[0]?.visibility, undefined);

  // (2) a definição criada é PRIVADA — o seam FIXA private, nunca public/custom.
  const defs = await schedService.list(notifLessActor, {});
  assert.equal(defs.total, 1);
  assert.equal(defs.items[0]?.visibility, "private", "o seam de seguro FIXA private — nunca public/custom");

  // (3) SEM fan-out tenant-wide: só o criador recebe; os demais ativos NÃO (escalada fechada).
  const creatorInbox = await notifRepo.listByRecipient({ tenantId: TENANT, recipientUserId: CREATOR, filters: {} });
  const other1Inbox = await notifRepo.listByRecipient({ tenantId: TENANT, recipientUserId: OTHER_1, filters: {} });
  const other2Inbox = await notifRepo.listByRecipient({ tenantId: TENANT, recipientUserId: OTHER_2, filters: {} });
  assert.equal(creatorInbox.length, 1, "o lembrete privado entrega só ao criador");
  assert.equal(other1Inbox.length, 0, "NENHUM broadcast tenant-wide — escalada fechada");
  assert.equal(other2Inbox.length, 0, "NENHUM broadcast tenant-wide — escalada fechada");

  // (4) dedupe: editar a MESMA apólice não cria definição nova nem duplica a entrega.
  await service.update(notifLessActor, created.id, { seguradora: "Editada" });
  const finalDefs = await schedService.list(notifLessActor, {});
  assert.equal(finalDefs.total, 1, "editar não cria definição nova (dedupe determinístico)");
  const creatorAfter = await notifRepo.listByRecipient({ tenantId: TENANT, recipientUserId: CREATOR, filters: {} });
  assert.equal(creatorAfter.length, 1, "editar não duplica a entrega");
});
