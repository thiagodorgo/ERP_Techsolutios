import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { toDamageDetailDto } from "../src/modules/damages/damage.dto.js";
import { InMemoryDamageRepository } from "../src/modules/damages/damage.repository.js";
import {
  DamageService,
  deriveStatementDebit,
  type DamageReferenceResolvers,
} from "../src/modules/damages/damage.service.js";
import type { DamageActorContext } from "../src/modules/damages/damage.types.js";
import { parseResponsibleAmount, parseTipo } from "../src/modules/damages/damage.validators.js";
import {
  createMemoryOperatorProfileService,
  resetOperatorProfileRuntimeForTests,
} from "../src/modules/operator-profiles/operator-profile.service.js";
import {
  createMemoryProfessionalStatementService,
  getMemoryProfessionalStatementRepositoryForTests,
  resetProfessionalStatementRuntimeForTests,
  type ProfessionalStatementService,
} from "../src/modules/professional-statements/professional-statement.service.js";
import type { InMemoryProfessionalStatementRepository } from "../src/modules/professional-statements/professional-statement.repository.js";

const TENANT = randomUUID();
const VEHICLE_V = randomUUID();
const WORK_ORDER_OK = randomUUID();

const managerActor: DamageActorContext = {
  tenantId: TENANT,
  userId: randomUUID(),
  roles: ["manager"],
  permissions: [],
};

function baseBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    vehicle_id: VEHICLE_V,
    data: "2026-06-01T10:00:00.000Z",
    gravidade: "moderada",
    descricao: "Para-choque amassado",
    ...overrides,
  };
}

type ResponsibleHarness = {
  readonly service: DamageService;
  readonly statementService: ProfessionalStatementService;
  readonly statementRepo: InMemoryProfessionalStatementRepository;
  readonly profileId: string;
};

// Wire REAL do rail do extrato (memory statement service reusado do PR-07) + operator-profiles memory. O efeito
// service→service NÃO exige `professional_statements:create` do ator (é chamada interna typed/constrangida).
// NÃO cria notificação (Danos não notifica — sem superfície de escalada).
async function buildResponsibleHarness(): Promise<ResponsibleHarness> {
  resetProfessionalStatementRuntimeForTests();
  resetOperatorProfileRuntimeForTests();
  const profile = await createMemoryOperatorProfileService().create(managerActor, {
    user_id: randomUUID(),
    full_name: "Profissional Responsável",
  });
  const statementService = createMemoryProfessionalStatementService();
  const statementRepo = getMemoryProfessionalStatementRepositoryForTests();
  const references: DamageReferenceResolvers = {
    resolveVehicle: async (_actor, id) => id === VEHICLE_V,
    resolveWorkOrder: async (_actor, id) => id === WORK_ORDER_OK,
    // Resolve via o service de Profissionais memory (mesmo singleton) → qualquer perfil criado é resolvível;
    // cross-tenant/inexistente → 404 → false → 400 invalid_operator_profile_reference.
    resolveResponsible: async (actorCtx, id) => {
      try {
        await createMemoryOperatorProfileService().get(actorCtx, id);
        return true;
      } catch {
        return false;
      }
    },
    createResponsibleStatementDebit: async (actorCtx, input) => {
      await statementService.createForSource(actorCtx, {
        operatorProfileId: input.operatorProfileId,
        entryType: "damage",
        direction: "debit",
        sourceType: "damage",
        sourceId: input.damage.id,
        amount: input.amount,
        installmentTotal: input.installmentTotal,
        firstDueDate: input.firstDueDate,
        description: `Dano em viatura (${input.damage.gravidade})`,
      });
    },
    removeResponsibleStatementDebit: async (actorCtx, damageId) => {
      await statementService.removeForSource(actorCtx, "damage", damageId);
    },
    getActiveStatementDebit: async (actorCtx, damageId) =>
      deriveStatementDebit(await statementService.findActiveBySource(actorCtx, "damage", damageId)),
  };
  return {
    service: new DamageService(new InMemoryDamageRepository(), references),
    statementService,
    statementRepo,
    profileId: profile.id,
  };
}

// ---------- DANO-01: rail do extrato (reusa PR-07) ----------

test("[DANO-01] responsável + valor → débito parcelado (damage/debit, amount = valor REAL)", async () => {
  const { service, statementService, profileId } = await buildResponsibleHarness();
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 300, responsible_operator_profile_id: profileId, responsible_amount: 300, responsible_installment_total: 3 }),
  );
  assert.equal(created.responsibleOperatorProfileId, profileId);

  const entries = await statementService.findActiveBySource(managerActor, "damage", created.id);
  assert.equal(entries.length, 3);
  assert.equal(entries[0]?.entryType, "damage");
  assert.equal(entries[0]?.direction, "debit");
  assert.equal(entries[0]?.sourceType, "damage");
  assert.equal(
    entries.reduce((sum, entry) => Math.round((sum + entry.amount) * 100) / 100, 0),
    300,
    "Σparcelas = valor REAL do desconto (nunca fabricado)",
  );
});

test("[DANO-01] reprocessar a MESMA fonte não duplica (idempotente por origem, 2x → 1)", async () => {
  const { service, statementService, profileId } = await buildResponsibleHarness();
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 100, responsible_operator_profile_id: profileId, responsible_amount: 100 }),
  );
  // PATCH re-atribuindo o MESMO responsável + valor é no-op (não recria).
  await service.update(managerActor, created.id, { responsible_operator_profile_id: profileId, responsible_amount: 100 });
  assert.equal((await statementService.findActiveBySource(managerActor, "damage", created.id)).length, 1);
});

// ---------- DANO-04: money honesty (D-Ω4C-DANO-MONEY) ----------

test("[DANO-04] desconto PARCIAL (responsible_amount < custo_real) é permitido", async () => {
  const { service, statementService, profileId } = await buildResponsibleHarness();
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 500, responsible_operator_profile_id: profileId, responsible_amount: 250 }),
  );
  const entries = await statementService.findActiveBySource(managerActor, "damage", created.id);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.amount, 250, "cobra só o valor parcial (250 de 500)");
});

test("[DANO-04] responsible_amount > custo_real → 422 responsible_amount_exceeds_total", async () => {
  const { service, profileId } = await buildResponsibleHarness();
  await assert.rejects(
    () => service.create(managerActor, baseBody({ custo_real: 200, responsible_operator_profile_id: profileId, responsible_amount: 500 })),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "responsible_amount_exceeds_total");
      return true;
    },
  );
});

test("[DANO-04] cobrar sem custo_real → 422 damage_total_required", async () => {
  const { service, profileId } = await buildResponsibleHarness();
  await assert.rejects(
    () => service.create(managerActor, baseBody({ responsible_operator_profile_id: profileId, responsible_amount: 100 })),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "damage_total_required");
      return true;
    },
  );
});

test("[DANO-04] responsible_amount <= 0 → 422 invalid_responsible_amount", async () => {
  const { service, profileId } = await buildResponsibleHarness();
  await assert.rejects(
    () => service.create(managerActor, baseBody({ custo_real: 100, responsible_operator_profile_id: profileId, responsible_amount: 0 })),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "invalid_responsible_amount");
      return true;
    },
  );
});

test("[DANO-04] responsável SEM valor → identificação-só (sem efeito no extrato)", async () => {
  const { service, statementService, profileId } = await buildResponsibleHarness();
  const created = await service.create(managerActor, baseBody({ custo_real: 300, responsible_operator_profile_id: profileId }));
  assert.equal(created.responsibleOperatorProfileId, profileId);
  assert.equal((await statementService.findActiveBySource(managerActor, "damage", created.id)).length, 0);
});

// ---------- DANO-02: reversão / troca ----------

test("[DANO-02] limpar o responsável retira o débito do extrato (reversível)", async () => {
  const { service, statementService, profileId } = await buildResponsibleHarness();
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 100, responsible_operator_profile_id: profileId, responsible_amount: 100 }),
  );
  assert.equal((await statementService.findActiveBySource(managerActor, "damage", created.id)).length, 1);

  const cleared = await service.update(managerActor, created.id, { responsible_operator_profile_id: null });
  assert.equal(cleared.responsibleOperatorProfileId, undefined);
  assert.equal((await statementService.findActiveBySource(managerActor, "damage", created.id)).length, 0);
});

test("[DANO-02] trocar o responsável remove o débito anterior e cria o do novo", async () => {
  const { service, statementService, profileId } = await buildResponsibleHarness();
  const profile2 = await createMemoryOperatorProfileService().create(managerActor, {
    user_id: randomUUID(),
    full_name: "Segundo Profissional",
  });
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 200, responsible_operator_profile_id: profileId, responsible_amount: 200 }),
  );
  const before = await statementService.findActiveBySource(managerActor, "damage", created.id);
  const groupBefore = before[0]?.groupId;

  const changed = await service.update(managerActor, created.id, { responsible_operator_profile_id: profile2.id, responsible_amount: 150 });
  assert.equal(changed.responsibleOperatorProfileId, profile2.id);

  const after = await statementService.findActiveBySource(managerActor, "damage", created.id);
  assert.equal(after.length, 1);
  assert.equal(after[0]?.operatorProfileId, profile2.id);
  assert.equal(after[0]?.amount, 150);
  assert.notEqual(after[0]?.groupId, groupBefore, "novo lançamento = novo group_id");
});

test("[DANO-02] limpar responsável sem débito ativo é no-op (não lança)", async () => {
  const { service, statementService, profileId } = await buildResponsibleHarness();
  // responsável setado SEM valor (sem débito). Limpar não deve falhar.
  const created = await service.create(managerActor, baseBody({ custo_real: 100, responsible_operator_profile_id: profileId }));
  const cleared = await service.update(managerActor, created.id, { responsible_operator_profile_id: null });
  assert.equal(cleared.responsibleOperatorProfileId, undefined);
  assert.equal((await statementService.findActiveBySource(managerActor, "damage", created.id)).length, 0);
});

// ---------- DANO-03: trava (D-Ω4C-DANO-TRAVA) ----------

test("[DANO-03] trava: desativar o dano (is_active=false) com débito ativo → 409 damage_statement_locked", async () => {
  const { service, profileId } = await buildResponsibleHarness();
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 300, responsible_operator_profile_id: profileId, responsible_amount: 300 }),
  );
  await assert.rejects(
    () => service.update(managerActor, created.id, { is_active: false }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 409);
      assert.equal(err.reason, "damage_statement_locked");
      return true;
    },
  );
});

test("[DANO-03] trava: editar custo_real com débito ativo → 409 damage_statement_locked", async () => {
  const { service, profileId } = await buildResponsibleHarness();
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 300, responsible_operator_profile_id: profileId, responsible_amount: 300 }),
  );
  await assert.rejects(
    () => service.update(managerActor, created.id, { custo_real: 400 }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 409);
      assert.equal(err.reason, "damage_statement_locked");
      return true;
    },
  );
});

test("[DANO-03] campos NÃO-financeiros permanecem editáveis com débito ativo", async () => {
  const { service, profileId } = await buildResponsibleHarness();
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 300, responsible_operator_profile_id: profileId, responsible_amount: 300 }),
  );
  const updated = await service.update(managerActor, created.id, {
    descricao: "Descrição revisada",
    tipo: "external",
    objeto: "Retrovisor",
    analise_interna: "Nota interna",
  });
  assert.equal(updated.descricao, "Descrição revisada");
  assert.equal(updated.tipo, "external");
  assert.equal(updated.objeto, "Retrovisor");
  assert.equal(updated.analiseInterna, "Nota interna");
});

test("[DANO-03] custo_real IGUAL (no-op) não dispara a trava", async () => {
  const { service, profileId } = await buildResponsibleHarness();
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 300, responsible_operator_profile_id: profileId, responsible_amount: 300 }),
  );
  const updated = await service.update(managerActor, created.id, { custo_real: 300, descricao: "ok" });
  assert.equal(updated.custoReal, 300);
  assert.equal(updated.descricao, "ok");
});

test("[DANO-02] removeForSource com parcela liquidada (settled) → 409 statement_entry_locked", async () => {
  const { service, statementService, statementRepo, profileId } = await buildResponsibleHarness();
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 500, responsible_operator_profile_id: profileId, responsible_amount: 500, responsible_installment_total: 2 }),
  );
  const entries = await statementService.findActiveBySource(managerActor, "damage", created.id);
  assert.equal(entries.length, 2);
  // Fixture PR-03: liquida a 1ª parcela (a transição real pending→settled é da folha PR-14/15).
  assert.equal(statementRepo.settleInstallmentForTests(TENANT, entries[0]!.groupId, 1), true);

  // Limpar o responsável tenta removeForSource → parcela settled → 409 (RN-EXT-01).
  await assert.rejects(
    () => service.update(managerActor, created.id, { responsible_operator_profile_id: null }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 409);
      assert.equal(err.reason, "statement_entry_locked");
      return true;
    },
  );
});

// ---------- DANO-05: vínculo / referências ----------

test("[DANO-05] responsável cross-tenant/inexistente → 400 invalid_operator_profile_reference", async () => {
  const { service } = await buildResponsibleHarness();
  await assert.rejects(
    () => service.create(managerActor, baseBody({ custo_real: 100, responsible_operator_profile_id: randomUUID(), responsible_amount: 100 })),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 400);
      assert.equal(err.reason, "invalid_operator_profile_reference");
      return true;
    },
  );
});

test("[DANO-05] vínculo assistência/OS: work_order_id cross-tenant → 400 invalid_work_order_reference", async () => {
  const { service, profileId } = await buildResponsibleHarness();
  await assert.rejects(
    () => service.create(managerActor, baseBody({ work_order_id: randomUUID(), responsible_operator_profile_id: profileId, custo_real: 100, responsible_amount: 100 })),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 400);
      assert.equal(err.reason, "invalid_work_order_reference");
      return true;
    },
  );
});

// ---------- DANO-06: §2.8 DTO / disposição derivada ----------

test("[DANO-06] DETAIL DTO deriva statementDebit agregado + disposition; nunca expõe tenant_id", async () => {
  const { service, profileId } = await buildResponsibleHarness();
  const created = await service.create(
    managerActor,
    baseBody({ custo_real: 400, responsible_operator_profile_id: profileId, responsible_amount: 400, responsible_installment_total: 2 }),
  );
  const detail = await service.getWithAttachments(managerActor, created.id);
  const dto = toDamageDetailDto(detail) as Record<string, unknown>;

  assert.equal(dto.responsibleOperatorProfileId, profileId);
  assert.equal(dto.disposition, "statement");
  const statementDebit = dto.statementDebit as Record<string, unknown>;
  assert.equal(statementDebit.totalAmount, 400);
  assert.equal(statementDebit.installmentTotal, 2);
  assert.equal(statementDebit.hasSettled, false);
  assert.ok(typeof statementDebit.firstDueDate === "string");

  const serialized = JSON.stringify(dto);
  assert.equal(dto.tenantId, undefined);
  assert.equal(serialized.includes(TENANT), false, "tenant_id NUNCA no DTO (§2.8)");
});

test("[DANO-06] DETAIL DTO: statementDebit null + disposition 'none' sem responsável", async () => {
  const { service } = await buildResponsibleHarness();
  const created = await service.create(managerActor, baseBody({ custo_real: 100 }));
  const detail = await service.getWithAttachments(managerActor, created.id);
  const dto = toDamageDetailDto(detail) as Record<string, unknown>;
  assert.equal(dto.disposition, "none");
  assert.equal(dto.statementDebit, null);
});

// ---------- validators ----------

test("[validação] parseTipo normaliza para o enum-app; parseResponsibleAmount arredonda e rejeita <= 0", () => {
  assert.equal(parseTipo("INTERNAL"), "internal");
  assert.equal(parseTipo("both"), "both");
  assert.throws(() => parseTipo("misto"), /invalid_tipo|tipo must be/);

  assert.equal(parseResponsibleAmount(undefined), undefined);
  assert.equal(parseResponsibleAmount("250.5"), 250.5);
  assert.throws(
    () => parseResponsibleAmount(0),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 422);
      assert.equal(err.reason, "invalid_responsible_amount");
      return true;
    },
  );
});
