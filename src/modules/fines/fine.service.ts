import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
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
  parseValor,
  readOptionalBoolean,
} from "./fine.validators.js";

type RawRecord = Record<string, unknown>;

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

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

    // A fine always starts on `recebida`; later status changes go through the
    // PATCH state machine (R3.1).
    return this.repository.create({
      tenantId: actor.tenantId,
      vehicleId,
      driverId,
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

    const input: UpdateFineInput = {
      tenantId: actor.tenantId,
      fineId: parseRequiredUuid(fineId, "fineId"),
      driverId,
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

    return updated;
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
  };
}
