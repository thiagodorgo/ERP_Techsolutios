import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateScheduledNotificationInput,
  ScheduledNotification,
  ScheduledNotificationListFilters,
} from "./scheduled-notification.types.js";
import {
  duplicateClientActionError,
  type ScheduledNotificationRepository,
} from "./scheduled-notification.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaScheduledNotificationRepository implements ScheduledNotificationRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateScheduledNotificationInput): Promise<ScheduledNotification> {
    if (input.clientActionId) {
      const existing = await this.client.scheduledNotification.findFirst({
        where: { tenant_id: input.tenantId, client_action_id: input.clientActionId },
      });
      if (existing) return mapRecord(existing);
    }

    try {
      const created = await this.client.scheduledNotification.create({
        data: {
          tenant_id: input.tenantId,
          title: input.title,
          message: input.message,
          notify_at: input.notifyAt,
          remind_before_minutes: input.remindBeforeMinutes ?? null,
          reminder_at: input.reminderAt ?? null,
          visibility: input.visibility,
          custom_recipient_ids: [...input.customRecipientIds] as Prisma.InputJsonValue,
          source_type: input.sourceType ?? null,
          source_id: input.sourceId ?? null,
          status: "pending",
          created_by: input.createdBy,
          client_action_id: input.clientActionId ?? null,
        },
      });
      return mapRecord(created);
    } catch (error) {
      if (isPrismaError(error, "P2002")) {
        throw duplicateClientActionError();
      }
      throw error;
    }
  }

  async findById(tenantId: string, id: string): Promise<ScheduledNotification | null> {
    const record = await this.client.scheduledNotification.findFirst({
      where: { tenant_id: tenantId, id, deleted_at: null },
    });
    return record ? mapRecord(record) : null;
  }

  async listByCreator(
    tenantId: string,
    createdBy: string,
    filters?: ScheduledNotificationListFilters,
  ): Promise<ScheduledNotification[]> {
    const records = await this.client.scheduledNotification.findMany({
      where: { tenant_id: tenantId, created_by: createdBy, deleted_at: null },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: filters?.limit ?? 20,
      skip: filters?.offset ?? 0,
    });
    return records.map(mapRecord);
  }

  countByCreator(tenantId: string, createdBy: string): Promise<number> {
    return this.client.scheduledNotification.count({
      where: { tenant_id: tenantId, created_by: createdBy, deleted_at: null },
    });
  }

  async softCancel(tenantId: string, id: string): Promise<ScheduledNotification | null> {
    const result = await this.client.scheduledNotification.updateManyAndReturn({
      where: { tenant_id: tenantId, id, deleted_at: null },
      data: { status: "cancelled", deleted_at: new Date() },
      limit: 1,
    });
    return result[0] ? mapRecord(result[0]) : null;
  }

  async findDueReminders(tenantId: string, now: Date): Promise<ScheduledNotification[]> {
    const records = await this.client.scheduledNotification.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        status: "pending",
        reminder_fired_at: null,
        reminder_at: { not: null, lte: now },
      },
      orderBy: [{ reminder_at: "asc" }, { id: "asc" }],
    });
    return records.map(mapRecord);
  }

  async findDueMain(tenantId: string, now: Date): Promise<ScheduledNotification[]> {
    const records = await this.client.scheduledNotification.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        status: "pending",
        fired_at: null,
        notify_at: { lte: now },
      },
      orderBy: [{ notify_at: "asc" }, { id: "asc" }],
    });
    return records.map(mapRecord);
  }

  async markReminderFired(tenantId: string, id: string, firedAt: Date): Promise<void> {
    await this.client.scheduledNotification.updateMany({
      where: { tenant_id: tenantId, id },
      data: { reminder_fired_at: firedAt },
    });
  }

  async markMainFired(tenantId: string, id: string, firedAt: Date): Promise<void> {
    await this.client.scheduledNotification.updateMany({
      where: { tenant_id: tenantId, id },
      data: { fired_at: firedAt, status: "fired" },
    });
  }
}

// withTenantRls por operação: cada chamada carrega app.current_tenant_id → a policy USING/WITH CHECK escopa
// tudo por tenant (espelha RlsPrismaProfessionalStatementRepository).
export class RlsPrismaScheduledNotificationRepository implements ScheduledNotificationRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateScheduledNotificationInput): Promise<ScheduledNotification> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaScheduledNotificationRepository(tx).create(input));
  }
  findById(tenantId: string, id: string): Promise<ScheduledNotification | null> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaScheduledNotificationRepository(tx).findById(tenantId, id));
  }
  listByCreator(tenantId: string, createdBy: string, filters?: ScheduledNotificationListFilters): Promise<ScheduledNotification[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaScheduledNotificationRepository(tx).listByCreator(tenantId, createdBy, filters));
  }
  countByCreator(tenantId: string, createdBy: string): Promise<number> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaScheduledNotificationRepository(tx).countByCreator(tenantId, createdBy));
  }
  softCancel(tenantId: string, id: string): Promise<ScheduledNotification | null> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaScheduledNotificationRepository(tx).softCancel(tenantId, id));
  }
  findDueReminders(tenantId: string, now: Date): Promise<ScheduledNotification[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaScheduledNotificationRepository(tx).findDueReminders(tenantId, now));
  }
  findDueMain(tenantId: string, now: Date): Promise<ScheduledNotification[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaScheduledNotificationRepository(tx).findDueMain(tenantId, now));
  }
  markReminderFired(tenantId: string, id: string, firedAt: Date): Promise<void> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaScheduledNotificationRepository(tx).markReminderFired(tenantId, id, firedAt));
  }
  markMainFired(tenantId: string, id: string, firedAt: Date): Promise<void> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaScheduledNotificationRepository(tx).markMainFired(tenantId, id, firedAt));
  }
}

export async function createPrismaScheduledNotificationRepository(): Promise<RlsPrismaScheduledNotificationRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaScheduledNotificationRepository(prisma);
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly title: string;
  readonly message: string;
  readonly notify_at: Date;
  readonly remind_before_minutes: number | null;
  readonly reminder_at: Date | null;
  readonly visibility: string;
  readonly custom_recipient_ids: unknown;
  readonly source_type: string | null;
  readonly source_id: string | null;
  readonly status: string;
  readonly reminder_fired_at: Date | null;
  readonly fired_at: Date | null;
  readonly created_by: string;
  readonly client_action_id: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}): ScheduledNotification {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    title: record.title,
    message: record.message,
    notifyAt: record.notify_at,
    remindBeforeMinutes: record.remind_before_minutes ?? undefined,
    reminderAt: record.reminder_at ?? undefined,
    visibility: record.visibility,
    customRecipientIds: toStringArray(record.custom_recipient_ids),
    sourceType: record.source_type ?? undefined,
    sourceId: record.source_id ?? undefined,
    status: record.status,
    reminderFiredAt: record.reminder_fired_at ?? undefined,
    firedAt: record.fired_at ?? undefined,
    createdBy: record.created_by,
    clientActionId: record.client_action_id ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}
