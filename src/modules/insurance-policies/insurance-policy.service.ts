import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import {
  InMemoryInsurancePolicyRepository,
  type InsurancePolicyRepository,
} from "./insurance-policy.repository.js";
import type {
  InsuranceActorContext,
  InsurancePolicy,
  ListInsurancePoliciesInput,
  UpdateInsurancePolicyInput,
} from "./insurance-policy.types.js";
import { DEFAULT_INSURANCE_STATUS, InsurancePolicyError } from "./insurance-policy.types.js";
import {
  assertVigenciaRange,
  parseInsuranceWriteStatus,
  parseLimit,
  parseNumeroApolice,
  parseOffset,
  parseOptionalCobertura,
  parseOptionalExpiringWithinDays,
  parseOptionalInsuranceWriteStatus,
  parseOptionalListStatus,
  parseOptionalNumeroApolice,
  parseOptionalSeguradora,
  parseOptionalSearch,
  parseOptionalUuid,
  parseOptionalValor,
  parseRequiredDate,
  parseRequiredUuid,
  parseSeguradora,
  parseValor,
  readOptionalBoolean,
} from "./insurance-policy.validators.js";

type RawRecord = Record<string, unknown>;

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Tenant-scoped read used to enforce the REQUIRED `vehicle_id`. A cross-tenant /
 * missing id resolves to "not found" and is rejected as a 400 invalid reference.
 */
export type InsurancePolicyReferenceResolvers = {
  readonly resolveVehicle?: (actor: InsuranceActorContext, id: string) => Promise<boolean>;
};

export class InsurancePolicyService {
  constructor(
    private readonly repository: InsurancePolicyRepository,
    private readonly references: InsurancePolicyReferenceResolvers = {},
  ) {}

  async list(actor: InsuranceActorContext, query: RawRecord) {
    const now = new Date();
    const statusFilter = parseOptionalListStatus(query.status);
    const expiringWithinDays = parseOptionalExpiringWithinDays(query.expiring_within_days ?? query.expiringWithinDays);

    // R4.1 — the `status` filter understands the DERIVED `vencida`: it is
    // translated into stored-status + `vigencia_fim` bounds relative to `now`.
    let storedStatus: ListInsurancePoliciesInput["storedStatus"];
    let vigenciaFimGte: Date | undefined;
    let vigenciaFimLt: Date | undefined;
    let vigenciaFimLte: Date | undefined;

    if (statusFilter === "cancelada") {
      storedStatus = "cancelada";
    } else if (statusFilter === "vigente") {
      storedStatus = "vigente";
      vigenciaFimGte = now;
    } else if (statusFilter === "vencida") {
      storedStatus = "vigente";
      vigenciaFimLt = now;
    }

    // `expiring_within_days` = still-valid policies due within N days from now.
    if (expiringWithinDays !== undefined) {
      vigenciaFimLte = new Date(now.getTime() + expiringWithinDays * MILLIS_PER_DAY);
      vigenciaFimGte = vigenciaFimGte ?? now;
    }

    const input: ListInsurancePoliciesInput = {
      tenantId: actor.tenantId,
      vehicleId: parseOptionalUuid(query.vehicle_id ?? query.vehicleId, "vehicleId"),
      storedStatus,
      vigenciaFimGte,
      vigenciaFimLt,
      vigenciaFimLte,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: InsuranceActorContext, body: RawRecord): Promise<InsurancePolicy> {
    const vehicleId = parseRequiredUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    await this.assertVehicleReference(actor, vehicleId);

    const vigenciaInicio = parseRequiredDate(body.vigencia_inicio ?? body.vigenciaInicio, "vigenciaInicio");
    const vigenciaFim = parseRequiredDate(body.vigencia_fim ?? body.vigenciaFim, "vigenciaFim");
    assertVigenciaRange(vigenciaInicio, vigenciaFim);

    // A policy always starts `vigente`; `vencida` is derived, and cancelling is
    // done later through PATCH (R4.1). Any body-supplied status is validated so
    // `vencida` is rejected (422) instead of being silently ignored.
    const status = parseOptionalInsuranceWriteStatus(body.status) ?? DEFAULT_INSURANCE_STATUS;

    return this.repository.create({
      tenantId: actor.tenantId,
      vehicleId,
      seguradora: parseSeguradora(body.seguradora),
      numeroApolice: parseNumeroApolice(body.numero_apolice ?? body.numeroApolice),
      vigenciaInicio,
      vigenciaFim,
      valor: parseValor(body.valor),
      cobertura: parseOptionalCobertura(body.cobertura),
      status,
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: InsuranceActorContext, insurancePolicyId: string): Promise<InsurancePolicy> {
    return this.getEntity(actor, insurancePolicyId);
  }

  async update(actor: InsuranceActorContext, insurancePolicyId: string, body: RawRecord): Promise<InsurancePolicy> {
    const current = await this.getEntity(actor, insurancePolicyId);

    // R4.1 — editable transitions are `vigente <-> cancelada` only; setting the
    // derived `vencida` is a 422 (handled inside parseInsuranceWriteStatus).
    const nextStatus =
      body.status === undefined || body.status === null || body.status === ""
        ? undefined
        : parseInsuranceWriteStatus(body.status);

    const vigenciaInicio = body.vigencia_inicio ?? body.vigenciaInicio;
    const vigenciaFim = body.vigencia_fim ?? body.vigenciaFim;
    const nextInicio =
      vigenciaInicio === undefined || vigenciaInicio === null || vigenciaInicio === ""
        ? undefined
        : parseRequiredDate(vigenciaInicio, "vigenciaInicio");
    const nextFim =
      vigenciaFim === undefined || vigenciaFim === null || vigenciaFim === ""
        ? undefined
        : parseRequiredDate(vigenciaFim, "vigenciaFim");

    if (nextInicio !== undefined || nextFim !== undefined) {
      assertVigenciaRange(nextInicio ?? current.vigenciaInicio, nextFim ?? current.vigenciaFim);
    }

    const input: UpdateInsurancePolicyInput = {
      tenantId: actor.tenantId,
      insurancePolicyId: parseRequiredUuid(insurancePolicyId, "insurancePolicyId"),
      seguradora: parseOptionalSeguradora(body.seguradora),
      numeroApolice: parseOptionalNumeroApolice(body.numero_apolice ?? body.numeroApolice),
      vigenciaInicio: nextInicio,
      vigenciaFim: nextFim,
      valor: parseOptionalValor(body.valor),
      cobertura: parseOptionalCobertura(body.cobertura),
      status: nextStatus,
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new InsurancePolicyError(404, "INSURANCE_NOT_FOUND", "not_found", "Insurance policy was not found.");
    }

    return updated;
  }

  /**
   * R4.3 (read-only helper, intentionally NOT wired into other modules) — true
   * when the vehicle has at least one active, stored-`vigente` policy that is
   * still valid (`vigencia_fim >= now`), i.e. an effective `vigente` policy.
   */
  async hasActivePolicy(actor: InsuranceActorContext, vehicleId: string, now: Date = new Date()): Promise<boolean> {
    const result = await this.repository.list({
      tenantId: actor.tenantId,
      vehicleId: parseRequiredUuid(vehicleId, "vehicleId"),
      storedStatus: "vigente",
      vigenciaFimGte: now,
      isActive: true,
      limit: 1,
      offset: 0,
    });

    return result.total > 0;
  }

  private async getEntity(actor: InsuranceActorContext, insurancePolicyId: string): Promise<InsurancePolicy> {
    const policy = await this.repository.findById(
      actor.tenantId,
      parseRequiredUuid(insurancePolicyId, "insurancePolicyId"),
    );

    if (!policy) {
      throw new InsurancePolicyError(404, "INSURANCE_NOT_FOUND", "not_found", "Insurance policy was not found.");
    }

    return policy;
  }

  private async assertVehicleReference(actor: InsuranceActorContext, vehicleId: string): Promise<void> {
    const resolver = this.references.resolveVehicle;
    const exists = resolver ? await resolver(actor, vehicleId) : false;

    if (!exists) {
      throw new InsurancePolicyError(
        400,
        "INSURANCE_INVALID",
        "invalid_vehicle_reference",
        "vehicleId does not reference a vehicle in this organization.",
      );
    }
  }
}

const memoryRepository = new InMemoryInsurancePolicyRepository();
let defaultServicePromise: Promise<InsurancePolicyService> | undefined;

export function createMemoryInsurancePolicyService(_coreService: ICoreSaasService): InsurancePolicyService {
  return new InsurancePolicyService(memoryRepository, createDefaultReferenceResolvers());
}

export function getMemoryInsurancePolicyRepositoryForTests(): InMemoryInsurancePolicyRepository {
  return memoryRepository;
}

export async function createDefaultInsurancePolicyService(
  coreService: ICoreSaasService,
): Promise<InsurancePolicyService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryInsurancePolicyService(coreService);
  }

  defaultServicePromise ??= createPrismaInsurancePolicyService();

  return defaultServicePromise;
}

export function resetInsurancePolicyRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

/**
 * Returns the SAME repository the default service reads/writes: the shared
 * in-memory singleton in memory mode (so API-created policies are visible), or the
 * Prisma-backed repository in `prisma` mode. Used by the fleet-alerts orchestrator
 * to run the R4.2 insurance renewal producer without hand-rolling a repository.
 */
export async function createDefaultInsurancePolicyRepository(): Promise<InsurancePolicyRepository> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return memoryRepository;
  }

  const { createPrismaInsurancePolicyRepository } = await import("./insurance-policy-prisma.repository.js");

  return createPrismaInsurancePolicyRepository();
}

async function createPrismaInsurancePolicyService(): Promise<InsurancePolicyService> {
  const { createPrismaInsurancePolicyRepository } = await import("./insurance-policy-prisma.repository.js");
  const repository = await createPrismaInsurancePolicyRepository();

  return new InsurancePolicyService(repository, createDefaultReferenceResolvers());
}

/**
 * Builds the tenant-scoped vehicle resolver over the vehicles default service
 * (shared singleton in memory mode). A cross-tenant or missing reference
 * resolves to `false`, surfacing as a 400 invalid_vehicle_reference.
 */
function createDefaultReferenceResolvers(): InsurancePolicyReferenceResolvers {
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
  };
}
