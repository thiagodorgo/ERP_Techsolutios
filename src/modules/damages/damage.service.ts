import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import { createDefaultWorkOrderService } from "../work-orders/work-order.service.js";
import {
  deleteStoredDamageAttachmentFile,
  resolveDamageAttachmentDownload,
  saveDamageAttachmentFile,
  type DamageAttachmentDownload,
  type DamageAttachmentUpload,
} from "./damage-attachment.storage.js";
import { InMemoryDamageRepository, type DamageRepository } from "./damage.repository.js";
import type {
  Damage,
  DamageActorContext,
  DamageAttachment,
  ListDamagesInput,
  UpdateDamageInput,
} from "./damage.types.js";
import { DEFAULT_DAMAGE_STATUS, DamageError } from "./damage.types.js";
import {
  assertDamageStatusTransition,
  parseCusto,
  parseDamageStatus,
  parseDescricao,
  parseGravidade,
  parseLimit,
  parseOffset,
  parseOptionalDamageStatus,
  parseOptionalDate,
  parseOptionalDescricao,
  parseOptionalGravidade,
  parseOptionalSearch,
  parseOptionalUuid,
  parseRequiredDate,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./damage.validators.js";

type RawRecord = Record<string, unknown>;

/**
 * Tenant-scoped reads used to enforce cross-entity rules. A cross-tenant /
 * missing id resolves to "not found" and is rejected as an invalid reference.
 * - `resolveVehicle` validates the REQUIRED `vehicle_id` (400 invalid_vehicle_reference).
 * - `resolveWorkOrder` validates the OPTIONAL `work_order_id` (a WorkOrder). There is
 *   no hard FK: it is verified here as an in-tenant OS (400 invalid_work_order_reference).
 */
export type DamageReferenceResolvers = {
  readonly resolveVehicle?: (actor: DamageActorContext, id: string) => Promise<boolean>;
  readonly resolveWorkOrder?: (actor: DamageActorContext, id: string) => Promise<boolean>;
};

export class DamageService {
  constructor(
    private readonly repository: DamageRepository,
    private readonly references: DamageReferenceResolvers = {},
  ) {}

  async list(actor: DamageActorContext, query: RawRecord) {
    const input: ListDamagesInput = {
      tenantId: actor.tenantId,
      vehicleId: parseOptionalUuid(query.vehicle_id ?? query.vehicleId, "vehicleId"),
      workOrderId: parseOptionalUuid(query.work_order_id ?? query.workOrderId, "workOrderId"),
      status: parseOptionalDamageStatus(query.status),
      gravidade: parseOptionalGravidade(query.gravidade),
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: DamageActorContext, body: RawRecord): Promise<Damage> {
    const vehicleId = parseRequiredUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    await this.assertVehicleReference(actor, vehicleId);

    const workOrderId = parseOptionalUuid(body.work_order_id ?? body.workOrderId, "workOrderId");
    if (workOrderId !== undefined) {
      await this.assertWorkOrderReference(actor, workOrderId);
    }

    // A damage always starts on `registrado`; later status changes go through the
    // PATCH state machine (R5.1). A body-supplied status is validated (a bad value
    // is a 400) but only the default is honoured on create.
    parseOptionalDamageStatus(body.status);

    return this.repository.create({
      tenantId: actor.tenantId,
      vehicleId,
      workOrderId,
      data: parseRequiredDate(body.data, "data"),
      gravidade: parseGravidade(body.gravidade),
      descricao: parseDescricao(body.descricao),
      status: DEFAULT_DAMAGE_STATUS,
      custoEstimado: parseCusto(body.custo_estimado ?? body.custoEstimado, "custoEstimado"),
      custoReal: parseCusto(body.custo_real ?? body.custoReal, "custoReal"),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: DamageActorContext, damageId: string): Promise<Damage> {
    return this.getEntity(actor, damageId);
  }

  /** Detail path: the damage plus its photo gallery (safe DTO applied downstream). */
  async getWithAttachments(
    actor: DamageActorContext,
    damageId: string,
  ): Promise<{ readonly damage: Damage; readonly attachments: readonly DamageAttachment[] }> {
    const damage = await this.getEntity(actor, damageId);
    const attachments = await this.repository.listAttachments(actor.tenantId, damage.id);

    return { damage, attachments };
  }

  async update(actor: DamageActorContext, damageId: string, body: RawRecord): Promise<Damage> {
    const current = await this.getEntity(actor, damageId);

    const workOrderId = parseOptionalUuid(body.work_order_id ?? body.workOrderId, "workOrderId");
    if (workOrderId !== undefined && workOrderId !== current.workOrderId) {
      await this.assertWorkOrderReference(actor, workOrderId);
    }

    const nextStatus =
      body.status === undefined || body.status === null || body.status === ""
        ? undefined
        : parseDamageStatus(body.status);

    if (nextStatus !== undefined && nextStatus !== current.status) {
      // R5.1 — restricted, strictly linear state machine (422 on invalid transition).
      assertDamageStatusTransition(current.status, nextStatus);
    }

    const input: UpdateDamageInput = {
      tenantId: actor.tenantId,
      damageId: parseRequiredUuid(damageId, "damageId"),
      workOrderId,
      data: parseOptionalDate(body.data, "data"),
      gravidade: parseOptionalGravidade(body.gravidade),
      descricao: parseOptionalDescricao(body.descricao),
      status: nextStatus,
      custoEstimado: parseCusto(body.custo_estimado ?? body.custoEstimado, "custoEstimado"),
      custoReal: parseCusto(body.custo_real ?? body.custoReal, "custoReal"),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new DamageError(404, "DAMAGE_NOT_FOUND", "not_found", "Damage was not found.");
    }

    return updated;
  }

  async listAttachments(actor: DamageActorContext, damageId: string): Promise<readonly DamageAttachment[]> {
    // Ensures the damage exists in-tenant (404 otherwise) before listing photos.
    const damage = await this.getEntity(actor, damageId);

    return this.repository.listAttachments(actor.tenantId, damage.id);
  }

  /**
   * Persists the uploaded photo through the checklist STORAGE PROVIDER (D-014),
   * then records the attachment row. On any DB failure the stored object is
   * removed so no orphan blob is left behind.
   */
  async createUploadedAttachment(
    actor: DamageActorContext,
    damageId: string,
    upload: DamageAttachmentUpload,
  ): Promise<DamageAttachment> {
    const damage = await this.getEntity(actor, damageId);

    const stored = await saveDamageAttachmentFile({
      tenantId: actor.tenantId,
      damageId: damage.id,
      upload: upload.file,
    });

    try {
      const attachment = await this.repository.createAttachment({
        tenantId: actor.tenantId,
        damageId: damage.id,
        fileUrl: stored.fileUrl,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksum,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        marker: upload.marker,
        metadata: {},
        createdBy: actor.userId,
      });

      if (!attachment) {
        throw new DamageError(404, "DAMAGE_NOT_FOUND", "not_found", "Damage was not found.");
      }

      return attachment;
    } catch (error) {
      await deleteStoredDamageAttachmentFile(stored.storageKey, stored.storageProvider);
      throw error;
    }
  }

  async getAttachmentDownload(
    actor: DamageActorContext,
    damageId: string,
    attachmentId: string,
  ): Promise<DamageAttachmentDownload> {
    const attachment = await this.getAttachmentEntity(actor, damageId, attachmentId);

    return resolveDamageAttachmentDownload(attachment);
  }

  /** Removes the attachment row and its stored blob. Returns the removed row. */
  async deleteAttachment(
    actor: DamageActorContext,
    damageId: string,
    attachmentId: string,
  ): Promise<DamageAttachment> {
    const attachment = await this.getAttachmentEntity(actor, damageId, attachmentId);

    const removed = await this.repository.deleteAttachment(actor.tenantId, attachment.damageId, attachment.id);

    if (!removed) {
      throw new DamageError(404, "DAMAGE_ATTACHMENT_NOT_FOUND", "attachment_not_found", "Damage attachment was not found.");
    }

    if (removed.storageKey) {
      await deleteStoredDamageAttachmentFile(
        removed.storageKey,
        removed.storageProvider === "s3" ? "s3" : "local",
      );
    }

    return removed;
  }

  private async getEntity(actor: DamageActorContext, damageId: string): Promise<Damage> {
    const damage = await this.repository.findById(actor.tenantId, parseRequiredUuid(damageId, "damageId"));

    if (!damage) {
      throw new DamageError(404, "DAMAGE_NOT_FOUND", "not_found", "Damage was not found.");
    }

    return damage;
  }

  private async getAttachmentEntity(
    actor: DamageActorContext,
    damageId: string,
    attachmentId: string,
  ): Promise<DamageAttachment> {
    // Resolving the damage first keeps cross-tenant access a 404 (not a leak).
    const damage = await this.getEntity(actor, damageId);
    const attachment = await this.repository.findAttachmentById(
      actor.tenantId,
      damage.id,
      parseRequiredUuid(attachmentId, "attachmentId"),
    );

    if (!attachment) {
      throw new DamageError(404, "DAMAGE_ATTACHMENT_NOT_FOUND", "attachment_not_found", "Damage attachment was not found.");
    }

    return attachment;
  }

  private async assertVehicleReference(actor: DamageActorContext, vehicleId: string): Promise<void> {
    const resolver = this.references.resolveVehicle;
    const exists = resolver ? await resolver(actor, vehicleId) : false;

    if (!exists) {
      throw new DamageError(
        400,
        "DAMAGE_INVALID",
        "invalid_vehicle_reference",
        "vehicleId does not reference a vehicle in this organization.",
      );
    }
  }

  private async assertWorkOrderReference(actor: DamageActorContext, workOrderId: string): Promise<void> {
    const resolver = this.references.resolveWorkOrder;
    const exists = resolver ? await resolver(actor, workOrderId) : false;

    if (!exists) {
      throw new DamageError(
        400,
        "DAMAGE_INVALID",
        "invalid_work_order_reference",
        "workOrderId does not reference a work order in this organization.",
      );
    }
  }
}

const memoryRepository = new InMemoryDamageRepository();
let defaultServicePromise: Promise<DamageService> | undefined;

export function createMemoryDamageService(_coreService: ICoreSaasService): DamageService {
  return new DamageService(memoryRepository, createDefaultReferenceResolvers());
}

export function getMemoryDamageRepositoryForTests(): InMemoryDamageRepository {
  return memoryRepository;
}

export async function createDefaultDamageService(coreService: ICoreSaasService): Promise<DamageService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryDamageService(coreService);
  }

  defaultServicePromise ??= createPrismaDamageService();

  return defaultServicePromise;
}

export function resetDamageRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaDamageService(): Promise<DamageService> {
  const { createPrismaDamageRepository } = await import("./damage-prisma.repository.js");
  const repository = await createPrismaDamageRepository();

  return new DamageService(repository, createDefaultReferenceResolvers());
}

/**
 * Builds tenant-scoped resolvers over the vehicles and work-orders default
 * services (shared singletons in memory mode). A cross-tenant or missing
 * reference resolves to `false`, surfacing as a 400 invalid reference.
 */
function createDefaultReferenceResolvers(): DamageReferenceResolvers {
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
    resolveWorkOrder: async (actor, id) => {
      try {
        const service = await createDefaultWorkOrderService();
        await service.get(actor, id);

        return true;
      } catch {
        return false;
      }
    },
  };
}
