import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { createDefaultFinancialTitleService } from "../financial-titles/financial-title.service.js";
import { createDefaultOperatorProfileService } from "../operator-profiles/operator-profile.service.js";
import { createDefaultProfessionalStatementService } from "../professional-statements/professional-statement.service.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import { InMemoryFineRepository, type FineRepository } from "./fine.repository.js";
import type {
  Fine,
  FineActorContext,
  ListFinesInput,
  ListFinesResult,
  UpdateFineInput,
} from "./fine.types.js";
import { DEFAULT_FINE_STATUS, FINE_CANCEL_ROLES, FineError } from "./fine.types.js";
import {
  assertFineStatusTransition,
  parseFineStatus,
  parseLimit,
  parseNumeroAuto,
  parseOffset,
  parseOptionalDate,
  parseOptionalDescricao,
  parseOptionalDueWithinDays,
  parseOptionalFineStatus,
  parseOptionalNumeroAuto,
  parseOptionalOrgao,
  parseOptionalPontos,
  parseOptionalSearch,
  parseOptionalUserId,
  parseOptionalUuid,
  parseOptionalValor,
  parseOrgao,
  parsePontos,
  parseRequiredDate,
  parseRequiredUuid,
  parseResponsibleInstallmentTotal,
  parseValor,
  readOptionalBoolean,
} from "./fine.validators.js";

type RawRecord = Record<string, unknown>;

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Ω4C PR-07 — payload do efeito de domínio que lança o débito da multa no extrato do profissional
 * (D-Ω4C-MULSEG-STATEMENT-EFFECT). O serviço fixa entryType='fine'/direction='debit'/sourceType='fine' na
 * fronteira (a multa nunca escreve tipo/direção arbitrários — MUL-esc); amount = `fine.valor` REAL (nunca
 * fabricado). É um efeito service→service (NÃO exige `professional_statements:create` do usuário).
 */
export type FineResponsibleStatementInput = {
  readonly fine: Fine;
  readonly operatorProfileId: string;
  readonly installmentTotal: number;
};

/**
 * Tenant-scoped reads used to enforce cross-entity rules. Each resolver receives
 * the acting tenant context so a cross-tenant / missing id resolves to "not
 * found" and is rejected as an invalid reference (400).
 * - `resolveVehicle` validates the REQUIRED `vehicle_id`.
 * - `resolveDriver` validates the OPTIONAL `driver_id` (a User). There is no hard
 *   FK for the driver: it is verified here as an in-tenant user.
 */
export type FineReferenceResolvers = {
  readonly resolveVehicle?: (actor: FineActorContext, id: string) => Promise<boolean>;
  readonly resolveDriver?: (actor: FineActorContext, id: string) => Promise<boolean>;
  // Ω4C PR-07 — `responsible_operator_profile_id` valida um operator_profile do tenant (404/400 cross-tenant).
  readonly resolveResponsible?: (actor: FineActorContext, id: string) => Promise<boolean>;
  // Efeito de domínio: cria o débito da multa no extrato do profissional (RN-MUL-01). Idempotente por origem.
  readonly createResponsibleStatementDebit?: (actor: FineActorContext, input: FineResponsibleStatementInput) => Promise<void>;
  // Efeito inverso: retira o débito do extrato (soft-delete do grupo). Respeita RN-EXT-01 (settled → 409).
  readonly removeResponsibleStatementDebit?: (actor: FineActorContext, fineId: string) => Promise<void>;
  // Guarda either/or (D-Ω4C-MULSEG-DISPOSITION): há débito ATIVO desta multa no extrato?
  readonly hasActiveStatementDebit?: (actor: FineActorContext, fineId: string) => Promise<boolean>;
  // Guarda either/or: há título de contas a pagar ATIVO desta multa?
  readonly hasActivePayable?: (actor: FineActorContext, fineId: string) => Promise<boolean>;
};

export class FineService {
  constructor(
    private readonly repository: FineRepository,
    private readonly references: FineReferenceResolvers = {},
  ) {}

  async list(actor: FineActorContext, query: RawRecord): Promise<ListFinesResult> {
    const dueWithinDays = parseOptionalDueWithinDays(query.due_within_days ?? query.dueWithinDays);
    const prazoFrom = parseOptionalDate(query.prazo_from ?? query.prazoFrom, "prazoFrom");
    const explicitPrazoTo = parseOptionalDate(query.prazo_to ?? query.prazoTo, "prazoTo");

    const input: ListFinesInput = {
      tenantId: actor.tenantId,
      vehicleId: parseOptionalUuid(query.vehicle_id ?? query.vehicleId, "vehicleId"),
      driverId: parseOptionalUserId(query.driver_id ?? query.driverId, "driverId"),
      status: parseOptionalFineStatus(query.status),
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      // `due_within_days` is sugar for prazoTo = now + N days (finds fines coming
      // due soon). An explicit prazo_to takes precedence when both are provided.
      prazoFrom,
      prazoTo: explicitPrazoTo ?? (dueWithinDays !== undefined ? new Date(Date.now() + dueWithinDays * MILLIS_PER_DAY) : undefined),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: FineActorContext, body: RawRecord): Promise<Fine> {
    const vehicleId = parseRequiredUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    await this.assertVehicleReference(actor, vehicleId);

    const driverId = parseOptionalUserId(body.driver_id ?? body.driverId, "driverId");
    if (driverId !== undefined) {
      await this.assertDriverReference(actor, driverId);
    }

    // RN-MUL-01 — condutor responsável (operator_profile). Setar no create → débito no extrato desse profissional.
    const responsibleOperatorProfileId = parseOptionalUuid(
      body.responsible_operator_profile_id ?? body.responsibleOperatorProfileId,
      "responsibleOperatorProfileId",
    );
    if (responsibleOperatorProfileId !== undefined) {
      await this.assertResponsibleReference(actor, responsibleOperatorProfileId);
    }
    const responsibleInstallmentTotal = parseResponsibleInstallmentTotal(
      body.responsible_installment_total ?? body.responsibleInstallmentTotal,
    );

    // A fine always starts on `recebida`; later status changes go through the
    // PATCH state machine (R3.1).
    const created = await this.repository.create({
      tenantId: actor.tenantId,
      vehicleId,
      driverId,
      responsibleOperatorProfileId,
      numeroAuto: parseNumeroAuto(body.numero_auto ?? body.numeroAuto),
      dataInfracao: parseRequiredDate(body.data_infracao ?? body.dataInfracao, "dataInfracao"),
      orgao: parseOrgao(body.orgao),
      descricao: parseOptionalDescricao(body.descricao),
      valor: parseValor(body.valor),
      pontos: parsePontos(body.pontos),
      prazoRecurso: parseOptionalDate(body.prazo_recurso ?? body.prazoRecurso, "prazoRecurso"),
      prazoPagamento: parseOptionalDate(body.prazo_pagamento ?? body.prazoPagamento, "prazoPagamento"),
      status: DEFAULT_FINE_STATUS,
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    if (responsibleOperatorProfileId !== undefined) {
      await this.applyResponsibleStatementEffect(actor, created, responsibleInstallmentTotal);
    }

    return created;
  }

  async get(actor: FineActorContext, fineId: string): Promise<Fine> {
    return this.getEntity(actor, fineId);
  }

  async update(actor: FineActorContext, fineId: string, body: RawRecord): Promise<Fine> {
    const current = await this.getEntity(actor, fineId);

    const driverId = parseOptionalUserId(body.driver_id ?? body.driverId, "driverId");
    if (driverId !== undefined && driverId !== current.driverId) {
      await this.assertDriverReference(actor, driverId);
    }

    const nextStatus =
      body.status === undefined || body.status === null || body.status === ""
        ? undefined
        : parseFineStatus(body.status);

    if (nextStatus !== undefined && nextStatus !== current.status) {
      // R3.1 — restricted state machine (422 on invalid transition).
      assertFineStatusTransition(current.status, nextStatus);
      // Cancelling is admin-only (403 for a non-admin actor).
      if (nextStatus === "cancelada") {
        this.assertCancelPermission(actor);
      }
    }

    // RN-MUL-01/RN-MUL-02 — transição do condutor responsável (tri-estado):
    //  - ausente no corpo  → não muda (undefined)
    //  - null/""           → LIMPAR (retira o débito do extrato; RN-EXT-01: settled → 409)
    //  - uuid              → SETAR/TROCAR (valida no tenant; either/or: com payable ativo → 409; cria débito)
    const responsibleProvided =
      body.responsible_operator_profile_id !== undefined || body.responsibleOperatorProfileId !== undefined;
    const responsibleInstallmentTotal = parseResponsibleInstallmentTotal(
      body.responsible_installment_total ?? body.responsibleInstallmentTotal,
    );
    let nextResponsible: string | null | undefined;
    if (responsibleProvided) {
      // NÃO usar `??` aqui: `null` (limpar) colapsaria para o RHS. Prefere a chave snake quando presente.
      const raw =
        body.responsible_operator_profile_id !== undefined
          ? body.responsible_operator_profile_id
          : body.responsibleOperatorProfileId;
      nextResponsible = raw === null || raw === "" ? null : parseRequiredUuid(raw, "responsibleOperatorProfileId");
    }

    const isSetOrChange = nextResponsible != null && nextResponsible !== current.responsibleOperatorProfileId;
    const isClear = nextResponsible === null && current.responsibleOperatorProfileId !== undefined;
    // PRE-efeitos (antes de gravar a coluna): valida referência + either/or + retira débito anterior sob a trava.
    if (isSetOrChange) {
      await this.assertResponsibleReference(actor, nextResponsible as string);
      await this.assertNoActivePayable(actor, current.id);
      if (current.responsibleOperatorProfileId !== undefined) {
        await this.removeResponsibleStatementEffect(actor, current.id);
      }
    } else if (isClear) {
      await this.removeResponsibleStatementEffect(actor, current.id);
    }

    const input: UpdateFineInput = {
      tenantId: actor.tenantId,
      fineId: parseRequiredUuid(fineId, "fineId"),
      driverId,
      responsibleOperatorProfileId: nextResponsible,
      numeroAuto: parseOptionalNumeroAuto(body.numero_auto ?? body.numeroAuto),
      dataInfracao: parseOptionalDate(body.data_infracao ?? body.dataInfracao, "dataInfracao"),
      orgao: parseOptionalOrgao(body.orgao),
      descricao: parseOptionalDescricao(body.descricao),
      valor: parseOptionalValor(body.valor),
      pontos: parseOptionalPontos(body.pontos),
      prazoRecurso: parseOptionalDate(body.prazo_recurso ?? body.prazoRecurso, "prazoRecurso"),
      prazoPagamento: parseOptionalDate(body.prazo_pagamento ?? body.prazoPagamento, "prazoPagamento"),
      status: nextStatus,
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new FineError(404, "FINE_NOT_FOUND", "not_found", "Fine was not found.");
    }

    // POST-efeito: cria o débito do NOVO responsável (idempotente por origem).
    if (isSetOrChange) {
      await this.applyResponsibleStatementEffect(actor, updated, responsibleInstallmentTotal);
    }

    return updated;
  }

  // Ω4C PR-07 — posse + guarda de disposição para o rail de contas a pagar (injetado no factory PR-02, INTOCADO).
  // Prova a posse tenant-scoped (404 cross-tenant) e assere ausência de débito ATIVO no extrato desta multa
  // (either/or genuíno → 409 fine_disposition_conflict: retire do extrato antes de lançar em contas a pagar).
  async assertPayableDispositionAllowed(actor: FineActorContext, fineId: string): Promise<void> {
    await this.getEntity(actor, fineId);
    const resolver = this.references.hasActiveStatementDebit;
    if (resolver && (await resolver(actor, fineId))) {
      throw dispositionConflict();
    }
  }

  private async getEntity(actor: FineActorContext, fineId: string): Promise<Fine> {
    const fine = await this.repository.findById(actor.tenantId, parseRequiredUuid(fineId, "fineId"));

    if (!fine) {
      throw new FineError(404, "FINE_NOT_FOUND", "not_found", "Fine was not found.");
    }

    return fine;
  }

  private async assertVehicleReference(actor: FineActorContext, vehicleId: string): Promise<void> {
    const resolver = this.references.resolveVehicle;
    const exists = resolver ? await resolver(actor, vehicleId) : false;

    if (!exists) {
      throw new FineError(
        400,
        "FINE_INVALID",
        "invalid_vehicle_reference",
        "vehicleId does not reference a vehicle in this organization.",
      );
    }
  }

  private async assertDriverReference(actor: FineActorContext, driverId: string): Promise<void> {
    const resolver = this.references.resolveDriver;
    const exists = resolver ? await resolver(actor, driverId) : false;

    if (!exists) {
      throw new FineError(
        400,
        "FINE_INVALID",
        "invalid_driver_reference",
        "driverId does not reference a user in this organization.",
      );
    }
  }

  // MUL-03 — o condutor responsável (operator_profile) deve existir no tenant (a FK composta RESTRICT é o
  // backstop do banco; aqui é o pré-check → 400 cross-tenant, espelhando driver/vehicle).
  private async assertResponsibleReference(actor: FineActorContext, operatorProfileId: string): Promise<void> {
    const resolver = this.references.resolveResponsible;
    const exists = resolver ? await resolver(actor, operatorProfileId) : false;

    if (!exists) {
      throw new FineError(
        400,
        "FINE_INVALID",
        "invalid_operator_profile_reference",
        "responsibleOperatorProfileId does not reference a professional in this organization.",
      );
    }
  }

  // Either/or (D-Ω4C-MULSEG-DISPOSITION): setar responsável numa multa com payable ATIVO → 409.
  private async assertNoActivePayable(actor: FineActorContext, fineId: string): Promise<void> {
    const resolver = this.references.hasActivePayable;
    if (resolver && (await resolver(actor, fineId))) {
      throw dispositionConflict();
    }
  }

  private async applyResponsibleStatementEffect(
    actor: FineActorContext,
    fine: Fine,
    installmentTotal: number,
  ): Promise<void> {
    const resolver = this.references.createResponsibleStatementDebit;
    if (!resolver || fine.responsibleOperatorProfileId === undefined) return;
    await resolver(actor, { fine, operatorProfileId: fine.responsibleOperatorProfileId, installmentTotal });
  }

  private async removeResponsibleStatementEffect(actor: FineActorContext, fineId: string): Promise<void> {
    const resolver = this.references.removeResponsibleStatementDebit;
    if (!resolver) return;
    await resolver(actor, fineId);
  }

  // A transition to `cancelada` is reserved for organization administrators.
  private assertCancelPermission(actor: FineActorContext): void {
    const isAdmin = actor.roles.some((role) => (FINE_CANCEL_ROLES as readonly string[]).includes(role));

    if (!isAdmin) {
      throw new FineError(
        403,
        "FINE_FORBIDDEN",
        "cancel_requires_admin",
        "Somente um administrador da organização pode cancelar uma multa.",
      );
    }
  }
}

// D-Ω4C-MULSEG-DISPOSITION — either/or genuíno: a multa é lançada no extrato (condutor responsável) XOR em
// contas a pagar (empresa paga), nunca as duas. A violação em qualquer direção é 409 fine_disposition_conflict.
function dispositionConflict(): FineError {
  return new FineError(
    409,
    "FINE_CONFLICT",
    "fine_disposition_conflict",
    "Esta multa já possui uma disposição ativa. Retire a atual (extrato do profissional ou contas a pagar) antes de aplicar a outra.",
  );
}

const memoryRepository = new InMemoryFineRepository();
let defaultServicePromise: Promise<FineService> | undefined;

export function createMemoryFineService(coreService: ICoreSaasService): FineService {
  return new FineService(memoryRepository, createDefaultReferenceResolvers(coreService));
}

export function getMemoryFineRepositoryForTests(): InMemoryFineRepository {
  return memoryRepository;
}

export async function createDefaultFineService(coreService: ICoreSaasService): Promise<FineService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFineService(coreService);
  }

  defaultServicePromise ??= createPrismaFineService(coreService);

  return defaultServicePromise;
}

export function resetFineRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

/**
 * Returns the SAME repository the default service reads/writes: the shared
 * in-memory singleton in memory mode (so API-created fines are visible), or the
 * Prisma-backed repository in `prisma` mode. Used by the fleet-alerts orchestrator
 * to run the R3.2 "fine due" producer without hand-rolling a repository.
 */
export async function createDefaultFineRepository(): Promise<FineRepository> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return memoryRepository;
  }

  const { createPrismaFineRepository } = await import("./fine-prisma.repository.js");

  return createPrismaFineRepository();
}

async function createPrismaFineService(coreService: ICoreSaasService): Promise<FineService> {
  const { createPrismaFineRepository } = await import("./fine-prisma.repository.js");
  const repository = await createPrismaFineRepository();

  return new FineService(repository, createDefaultReferenceResolvers(coreService));
}

/**
 * Builds tenant-scoped resolvers over the vehicles default service (shared
 * singleton in memory mode) and the core SaaS service (users). A cross-tenant or
 * missing reference resolves to `false`, surfacing as a 400 invalid reference.
 */
function createDefaultReferenceResolvers(coreService: ICoreSaasService): FineReferenceResolvers {
  return {
    resolveVehicle: async (actor, id) => {
      try {
        const service = await createDefaultVehicleService();
        await service.get(actor, id);

        return true;
      } catch {
        return false;
      }
    },
    resolveDriver: async (actor, id) => {
      try {
        await coreService.getUserForTenant(id, actor.tenantId);

        return true;
      } catch {
        return false;
      }
    },
    // Ω4C PR-07 — o condutor responsável é um operator_profile: valida via o service de Profissionais (404
    // cross-tenant nativo → false → 400 invalid_operator_profile_reference).
    resolveResponsible: async (actor, id) => {
      try {
        const service = await createDefaultOperatorProfileService();
        await service.get(actor, id);

        return true;
      } catch {
        return false;
      }
    },
    // Efeito de domínio (service→service): lança o débito da multa no extrato do profissional pelo caminho
    // interno reservado da PR-03 (typed fine/debit/fine; amount = fine.valor REAL). NÃO exige
    // `professional_statements:create` do usuário (mandato §6). Idempotente por (source_type='fine', source_id).
    createResponsibleStatementDebit: async (actor, input) => {
      const service = await createDefaultProfessionalStatementService();
      await service.createForSource(actor, {
        operatorProfileId: input.operatorProfileId,
        entryType: "fine",
        direction: "debit",
        sourceType: "fine",
        sourceId: input.fine.id,
        amount: input.fine.valor,
        installmentTotal: input.installmentTotal,
        firstDueDate: input.fine.prazoPagamento ?? new Date(),
        description: `Multa ${input.fine.numeroAuto} (${input.fine.orgao})`,
      });
    },
    // Efeito inverso: retira o débito do extrato (soft-delete do grupo). Respeita RN-EXT-01 (settled → 409).
    removeResponsibleStatementDebit: async (actor, fineId) => {
      const service = await createDefaultProfessionalStatementService();
      await service.removeForSource(actor, "fine", fineId);
    },
    // Guardas either/or (leituras derivadas).
    hasActiveStatementDebit: async (actor, fineId) => {
      const service = await createDefaultProfessionalStatementService();
      const active = await service.findActiveBySource(actor, "fine", fineId);
      return active.length > 0;
    },
    hasActivePayable: async (actor, fineId) => {
      const service = await createDefaultFinancialTitleService();
      const active = await service.findActiveBySource(actor, "fine", fineId, "payable");
      return active !== undefined;
    },
  };
}
