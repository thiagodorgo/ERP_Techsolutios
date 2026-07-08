import { randomUUID } from "node:crypto";

import type {
  CreateDamageAttachmentInput,
  CreateDamageInput,
  Damage,
  DamageAttachment,
  ListDamagesInput,
  ListDamagesResult,
  UpdateDamageInput,
} from "./damage.types.js";

export interface DamageRepository {
  create(input: CreateDamageInput): Promise<Damage>;
  list(input: ListDamagesInput): Promise<ListDamagesResult>;
  findById(tenantId: string, damageId: string): Promise<Damage | undefined>;
  update(input: UpdateDamageInput): Promise<Damage | undefined>;
  createAttachment(input: CreateDamageAttachmentInput): Promise<DamageAttachment | undefined>;
  listAttachments(tenantId: string, damageId: string): Promise<DamageAttachment[]>;
  findAttachmentById(tenantId: string, damageId: string, attachmentId: string): Promise<DamageAttachment | undefined>;
  deleteAttachment(tenantId: string, damageId: string, attachmentId: string): Promise<DamageAttachment | undefined>;
  reset?(): void;
}

export class InMemoryDamageRepository implements DamageRepository {
  private readonly damages = new Map<string, Damage>();
  private readonly attachments = new Map<string, DamageAttachment>();

  async create(input: CreateDamageInput): Promise<Damage> {
    const now = new Date();
    const damage: Damage = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.damages.set(damage.id, damage);

    return damage;
  }

  async list(input: ListDamagesInput): Promise<ListDamagesResult> {
    const filtered = this.sortedDamages()
      .filter((damage) => damage.tenantId === input.tenantId)
      .filter((damage) => input.vehicleId === undefined || damage.vehicleId === input.vehicleId)
      .filter((damage) => input.workOrderId === undefined || damage.workOrderId === input.workOrderId)
      .filter((damage) => input.status === undefined || damage.status === input.status)
      .filter((damage) => input.gravidade === undefined || damage.gravidade === input.gravidade)
      .filter((damage) => input.isActive === undefined || damage.isActive === input.isActive)
      .filter((damage) => matchesSearch(damage, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, damageId: string): Promise<Damage | undefined> {
    const damage = this.damages.get(damageId);
    return damage?.tenantId === tenantId ? damage : undefined;
  }

  async update(input: UpdateDamageInput): Promise<Damage | undefined> {
    const current = await this.findById(input.tenantId, input.damageId);
    if (!current) return undefined;

    const updated: Damage = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.damages.set(updated.id, updated);

    return updated;
  }

  async createAttachment(input: CreateDamageAttachmentInput): Promise<DamageAttachment | undefined> {
    const damage = await this.findById(input.tenantId, input.damageId);
    if (!damage) return undefined;

    const attachment: DamageAttachment = {
      id: randomUUID(),
      tenantId: input.tenantId,
      damageId: input.damageId,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      marker: input.marker,
      metadata: input.metadata,
      createdBy: input.createdBy,
      createdAt: new Date(),
    };

    this.attachments.set(attachment.id, attachment);

    return attachment;
  }

  async listAttachments(tenantId: string, damageId: string): Promise<DamageAttachment[]> {
    return [...this.attachments.values()]
      .filter((attachment) => attachment.tenantId === tenantId && attachment.damageId === damageId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async findAttachmentById(
    tenantId: string,
    damageId: string,
    attachmentId: string,
  ): Promise<DamageAttachment | undefined> {
    const attachment = this.attachments.get(attachmentId);

    return attachment?.tenantId === tenantId && attachment.damageId === damageId ? attachment : undefined;
  }

  async deleteAttachment(
    tenantId: string,
    damageId: string,
    attachmentId: string,
  ): Promise<DamageAttachment | undefined> {
    const attachment = await this.findAttachmentById(tenantId, damageId, attachmentId);
    if (!attachment) return undefined;

    this.attachments.delete(attachmentId);

    return attachment;
  }

  reset(): void {
    this.damages.clear();
    this.attachments.clear();
  }

  private sortedDamages(): Damage[] {
    return [...this.damages.values()].sort((left, right) => {
      const byCreatedAt = right.createdAt.getTime() - left.createdAt.getTime();
      if (byCreatedAt !== 0) return byCreatedAt;

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
  }
}

function matchesSearch(damage: Damage, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return String(damage.descricao).toLowerCase().includes(normalized);
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
