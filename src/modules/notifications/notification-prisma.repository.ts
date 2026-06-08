import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import {
  isValidPermission,
  isValidRole,
  type Permission,
  type Role,
} from "../core-saas/permissions/catalog.js";
import type {
  CreateNotificationInput,
  ListNotificationFilters,
  Notification,
  NotificationRecipientCandidate,
  NotificationSeverity,
  NotificationStatus,
} from "./notification.types.js";
import type { NotificationRepository } from "./notification.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    if (input.idempotencyKey) {
      const existing = await this.client.notification.findUnique({
        where: {
          tenant_id_recipient_user_id_idempotency_key: {
            tenant_id: input.tenantId,
            recipient_user_id: input.recipientUserId,
            idempotency_key: input.idempotencyKey,
          },
        },
      });

      if (existing) return mapNotificationRecord(existing);
    }

    const notification = await this.client.notification.create({
      data: {
        tenant_id: input.tenantId,
        recipient_user_id: input.recipientUserId,
        type: input.type,
        title: input.title,
        message: input.message,
        severity: input.severity ?? "info",
        source_type: input.sourceType ?? null,
        source_id: input.sourceId ?? null,
        action_url: input.actionUrl ?? null,
        metadata: toJsonObject(input.metadata ?? {}),
        idempotency_key: input.idempotencyKey ?? null,
      },
    });

    return mapNotificationRecord(notification);
  }

  async createMany(inputs: readonly CreateNotificationInput[]): Promise<readonly Notification[]> {
    const notifications: Notification[] = [];

    for (const input of inputs) {
      notifications.push(await this.create(input));
    }

    return notifications;
  }

  async listByRecipient(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly filters?: ListNotificationFilters;
  }): Promise<readonly Notification[]> {
    const notifications = await this.client.notification.findMany({
      where: {
        tenant_id: input.tenantId,
        recipient_user_id: input.recipientUserId,
        ...(input.filters?.status ? { status: input.filters.status } : {}),
        ...(input.filters?.severity ? { severity: input.filters.severity } : {}),
        ...(input.filters?.type ? { type: input.filters.type } : {}),
        ...(input.filters?.sourceType ? { source_type: input.filters.sourceType } : {}),
      },
      orderBy: {
        created_at: "desc",
      },
      take: input.filters?.limit ?? 50,
    });

    return notifications.map(mapNotificationRecord);
  }

  countUnread(input: { readonly tenantId: string; readonly recipientUserId: string }): Promise<number> {
    return this.client.notification.count({
      where: {
        tenant_id: input.tenantId,
        recipient_user_id: input.recipientUserId,
        status: "unread",
      },
    });
  }

  async markAsRead(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly notificationId: string;
  }): Promise<Notification | null> {
    const result = await this.client.notification.updateManyAndReturn({
      where: {
        id: input.notificationId,
        tenant_id: input.tenantId,
        recipient_user_id: input.recipientUserId,
      },
      data: {
        status: "read",
        read_at: new Date(),
      },
      limit: 1,
    });

    return result[0] ? mapNotificationRecord(result[0]) : null;
  }

  async markAllAsRead(input: { readonly tenantId: string; readonly recipientUserId: string }): Promise<number> {
    const result = await this.client.notification.updateMany({
      where: {
        tenant_id: input.tenantId,
        recipient_user_id: input.recipientUserId,
        status: "unread",
      },
      data: {
        status: "read",
        read_at: new Date(),
      },
    });

    return result.count;
  }

  async archive(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly notificationId: string;
  }): Promise<Notification | null> {
    const result = await this.client.notification.updateManyAndReturn({
      where: {
        id: input.notificationId,
        tenant_id: input.tenantId,
        recipient_user_id: input.recipientUserId,
      },
      data: {
        status: "archived",
      },
      limit: 1,
    });

    return result[0] ? mapNotificationRecord(result[0]) : null;
  }

  async listRecipientCandidates(tenantId: string): Promise<readonly NotificationRecipientCandidate[]> {
    const users = await this.client.user.findMany({
      where: {
        tenant_id: tenantId,
        status: "active",
      },
      include: {
        role_assignments: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    return users.map((user) => {
      const roles = new Set<Role>();
      const permissions = new Set<Permission>();

      for (const assignment of user.role_assignments) {
        if (isValidRole(assignment.role.key)) {
          roles.add(assignment.role.key as Role);
        }

        for (const rolePermission of assignment.role.role_permissions) {
          if (isValidPermission(rolePermission.permission.key)) {
            permissions.add(rolePermission.permission.key as Permission);
          }
        }
      }

      return {
        userId: user.id,
        status: user.status,
        roles: [...roles],
        permissions: [...permissions],
      };
    });
  }
}

export class RlsPrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateNotificationInput): Promise<Notification> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaNotificationRepository(tx).create(input),
    );
  }

  createMany(inputs: readonly CreateNotificationInput[]): Promise<readonly Notification[]> {
    if (inputs.length === 0) return Promise.resolve([]);
    const tenantIds = new Set(inputs.map((input) => input.tenantId));

    if (tenantIds.size !== 1) {
      return Promise.reject(new Error("createManyNotifications requires a single tenant."));
    }

    const [tenantId] = tenantIds;

    return withTenantRls(this.prismaClient, tenantId ?? "", (tx) =>
      new PrismaNotificationRepository(tx).createMany(inputs),
    );
  }

  listByRecipient(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly filters?: ListNotificationFilters;
  }): Promise<readonly Notification[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaNotificationRepository(tx).listByRecipient(input),
    );
  }

  countUnread(input: { readonly tenantId: string; readonly recipientUserId: string }): Promise<number> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaNotificationRepository(tx).countUnread(input),
    );
  }

  markAsRead(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly notificationId: string;
  }): Promise<Notification | null> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaNotificationRepository(tx).markAsRead(input),
    );
  }

  markAllAsRead(input: { readonly tenantId: string; readonly recipientUserId: string }): Promise<number> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaNotificationRepository(tx).markAllAsRead(input),
    );
  }

  archive(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly notificationId: string;
  }): Promise<Notification | null> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaNotificationRepository(tx).archive(input),
    );
  }

  listRecipientCandidates(tenantId: string): Promise<readonly NotificationRecipientCandidate[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaNotificationRepository(tx).listRecipientCandidates(tenantId),
    );
  }
}

export async function createPrismaNotificationRepository(): Promise<RlsPrismaNotificationRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaNotificationRepository(prisma);
}

function mapNotificationRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly recipient_user_id: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly severity: string;
  readonly status: string;
  readonly source_type: string | null;
  readonly source_id: string | null;
  readonly action_url: string | null;
  readonly metadata: unknown;
  readonly read_at: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Notification {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    recipientUserId: record.recipient_user_id,
    type: record.type,
    title: record.title,
    message: record.message,
    severity: record.severity as NotificationSeverity,
    status: record.status as NotificationStatus,
    sourceType: record.source_type ?? undefined,
    sourceId: record.source_id ?? undefined,
    actionUrl: record.action_url ?? undefined,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    readAt: record.read_at ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
