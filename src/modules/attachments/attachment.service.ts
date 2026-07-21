import { createHash } from "node:crypto";

import type { Permission } from "../core-saas/permissions/catalog.js";
import { env } from "../../config/env.js";
import {
  createDefaultAttachmentEntityResolver,
  type AttachmentEntityDescriptor,
  type AttachmentEntityResolver,
} from "./attachment-entity-resolver.js";
import { InMemoryAttachmentRepository, type AttachmentRepository } from "./attachment.repository.js";
import {
  deleteStoredAttachmentFile,
  getAttachmentScanner,
  resolveAttachmentDownload,
  saveAttachmentFile,
  type AttachmentDownload,
  type AttachmentUpload,
} from "./attachment.storage.js";
import type { Attachment, AttachmentActorContext } from "./attachment.types.js";
import { AttachmentError } from "./attachment.types.js";
import { parseRequiredEntityType, parseRequiredUuid } from "./attachment.validators.js";

export class AttachmentService {
  constructor(
    private readonly repository: AttachmentRepository,
    private readonly resolver: AttachmentEntityResolver,
  ) {}

  async listAttachments(
    actor: AttachmentActorContext,
    entityTypeRaw: string,
    entityIdRaw: string,
  ): Promise<readonly Attachment[]> {
    const entityType = parseRequiredEntityType(entityTypeRaw);
    const entityId = parseRequiredUuid(entityIdRaw, "entityId");
    const descriptor = this.requireDescriptor(entityType);
    this.requirePermission(actor, descriptor.permRead);
    await this.assertOwnership(actor, descriptor, entityId);
    return this.repository.listAttachments(actor.tenantId, entityType, entityId);
  }

  /**
   * RN-ANEXO-07 — upload: SCAN antes de STORE. infected → 422 / failed → 503 (nada persistido, sem
   * blob). Idempotência (RN-ANEXO-06) checada ANTES do scan (não gasta scan/storage num retry já
   * resolvido). RBAC/posse herdadas do resolver (RN-ANEXO-01/03): 422 tipo inválido / 403 sem
   * permissão / 404 posse. Cleanup de órfão: se o insert falha após o store, o blob é removido.
   */
  async createUploadedAttachment(
    actor: AttachmentActorContext,
    entityTypeRaw: string,
    entityIdRaw: string,
    upload: AttachmentUpload,
  ): Promise<Attachment> {
    const entityType = parseRequiredEntityType(entityTypeRaw);
    const entityId = parseRequiredUuid(entityIdRaw, "entityId");
    const descriptor = this.requireDescriptor(entityType);
    this.requirePermission(actor, descriptor.permCreate);
    await this.assertOwnership(actor, descriptor, entityId);

    // Idempotência TENANT-SCOPED (§6 / RN-ANEXO-06): duplicado ativo com o mesmo client_action_id → 409,
    // ANTES de escanear/armazenar.
    if (upload.clientActionId) {
      const existing = await this.repository.findActiveByClientActionId(actor.tenantId, entityType, entityId, upload.clientActionId);
      if (existing) {
        throw new AttachmentError(409, "ATTACHMENT_CONFLICT", "already_uploaded", "An attachment with this client_action_id already exists for this entity.");
      }
    }

    // RN-ANEXO-07 — AV-scan ANTES de armazenar; malware nunca chega ao store.
    const checksumSha256 = createHash("sha256").update(upload.file.buffer).digest("hex");
    const scan = await getAttachmentScanner().scan({
      tenantId: actor.tenantId,
      evidenceId: entityId,
      clientEvidenceId: upload.clientActionId ?? "",
      mimeType: upload.file.mimeType,
      sizeBytes: upload.file.sizeBytes,
      checksumSha256,
      buffer: upload.file.buffer,
    });
    if (scan.status === "infected") {
      throw new AttachmentError(422, "ATTACHMENT_REJECTED", "evidence_rejected", "Attachment failed the malware scan.");
    }
    if (scan.status === "failed") {
      throw new AttachmentError(503, "ATTACHMENT_SCAN_UNAVAILABLE", "scan_unavailable", "Attachment scanner is unavailable; retry later.");
    }

    const stored = await saveAttachmentFile({ tenantId: actor.tenantId, entityType, entityId, upload: upload.file });

    try {
      const attachment = await this.repository.createAttachment({
        tenantId: actor.tenantId,
        entityType,
        entityId,
        fileUrl: stored.fileUrl,
        fileName: stored.fileName,
        extension: stored.extension,
        contentType: stored.contentType,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksum,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        status: "stored",
        clientActionId: upload.clientActionId,
        metadata: upload.description ? { description: upload.description } : {},
        uploadedBy: actor.userId,
        createdBy: actor.userId,
      });
      if (!attachment) {
        throw new AttachmentError(404, "ATTACHMENT_ENTITY_NOT_FOUND", "entity_not_found", "The target entity was not found.");
      }
      return attachment;
    } catch (error) {
      // Cleanup de órfão: o insert falhou após o store → remove o blob.
      await deleteStoredAttachmentFile(stored.storageKey, stored.storageProvider);
      throw error;
    }
  }

  async getAttachmentDownload(actor: AttachmentActorContext, attachmentIdRaw: string): Promise<AttachmentDownload> {
    const attachment = await this.loadOwnedAttachment(actor, attachmentIdRaw, (descriptor) => descriptor.permRead);
    // Gate de download (RN-ANEXO-04, forward-compat AV-assíncrono): só 'stored' pode ser baixado.
    if (attachment.status !== "stored") {
      throw new AttachmentError(409, "ATTACHMENT_NOT_READY", "attachment_not_ready", "Attachment is not ready for download.");
    }
    return resolveAttachmentDownload(attachment);
  }

  async deleteAttachment(actor: AttachmentActorContext, attachmentIdRaw: string): Promise<Attachment> {
    const attachment = await this.loadOwnedAttachment(actor, attachmentIdRaw, (descriptor) => descriptor.permUpdate);
    const removed = await this.repository.deleteAttachment(actor.tenantId, attachment.id);
    if (!removed) {
      throw new AttachmentError(404, "ATTACHMENT_NOT_FOUND", "attachment_not_found", "Attachment was not found.");
    }
    if (removed.storageKey) {
      await deleteStoredAttachmentFile(removed.storageKey, removed.storageProvider === "s3" ? "s3" : "local");
    }
    return removed;
  }

  // Download/delete só têm o id do anexo: carrega (404 se fora do tenant), resolve o descriptor pelo
  // entity_type gravado, e então checa RBAC herdada (403) + posse (404) da entidade-alvo.
  private async loadOwnedAttachment(
    actor: AttachmentActorContext,
    attachmentIdRaw: string,
    permissionOf: (descriptor: AttachmentEntityDescriptor) => Permission,
  ): Promise<Attachment> {
    const attachmentId = parseRequiredUuid(attachmentIdRaw, "attachmentId");
    const attachment = await this.repository.findById(actor.tenantId, attachmentId);
    if (!attachment) {
      throw new AttachmentError(404, "ATTACHMENT_NOT_FOUND", "attachment_not_found", "Attachment was not found.");
    }
    const descriptor = this.resolver.descriptorFor(attachment.entityType);
    if (!descriptor) {
      // Integridade: row gravada com um entity_type fora da allow-list vigente.
      throw new AttachmentError(404, "ATTACHMENT_NOT_FOUND", "attachment_not_found", "Attachment was not found.");
    }
    this.requirePermission(actor, permissionOf(descriptor));
    await this.assertOwnership(actor, descriptor, attachment.entityId);
    return attachment;
  }

  private requireDescriptor(entityType: string): AttachmentEntityDescriptor {
    const descriptor = this.resolver.descriptorFor(entityType);
    if (!descriptor) {
      throw new AttachmentError(422, "ATTACHMENT_INVALID", "invalid_entity_type", "entityType is not a supported attachment target.");
    }
    return descriptor;
  }

  private requirePermission(actor: AttachmentActorContext, permission: Permission): void {
    if (!actor.permissions.includes(permission)) {
      throw new AttachmentError(403, "ATTACHMENT_FORBIDDEN", "forbidden", "You do not have permission to manage attachments for this entity.");
    }
  }

  private async assertOwnership(
    actor: AttachmentActorContext,
    descriptor: AttachmentEntityDescriptor,
    entityId: string,
  ): Promise<void> {
    const entity = await descriptor.get(actor, entityId);
    if (!entity) {
      throw new AttachmentError(404, "ATTACHMENT_ENTITY_NOT_FOUND", "entity_not_found", "The target entity was not found.");
    }
  }
}

const memoryRepository = new InMemoryAttachmentRepository();
let defaultServicePromise: Promise<AttachmentService> | undefined;

export function createMemoryAttachmentService(resolver: AttachmentEntityResolver = createDefaultAttachmentEntityResolver()): AttachmentService {
  return new AttachmentService(memoryRepository, resolver);
}

export function getMemoryAttachmentRepositoryForTests(): InMemoryAttachmentRepository {
  return memoryRepository;
}

export async function createDefaultAttachmentService(): Promise<AttachmentService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryAttachmentService();
  }
  defaultServicePromise ??= createPrismaAttachmentService();
  return defaultServicePromise;
}

export function resetAttachmentRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaAttachmentService(): Promise<AttachmentService> {
  const { createPrismaAttachmentRepository } = await import("./attachment-prisma.repository.js");
  const repository = await createPrismaAttachmentRepository();
  return new AttachmentService(repository, createDefaultAttachmentEntityResolver());
}
