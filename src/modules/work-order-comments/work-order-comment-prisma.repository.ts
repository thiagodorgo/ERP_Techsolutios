import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateWorkOrderCommentInput,
  UpdateWorkOrderCommentMessageInput,
  WorkOrderComment,
} from "./work-order-comment.types.js";
import type { WorkOrderCommentRepository } from "./work-order-comment.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaWorkOrderCommentRepository implements WorkOrderCommentRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateWorkOrderCommentInput): Promise<WorkOrderComment> {
    const record = await this.client.workOrderComment.create({
      data: {
        tenant_id: input.tenantId,
        work_order_id: input.workOrderId,
        author_user_id: input.authorUserId,
        message: input.message,
      },
    });
    return mapRecord(record);
  }

  async listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderComment[]> {
    const records = await this.client.workOrderComment.findMany({
      where: { tenant_id: tenantId, work_order_id: workOrderId, deleted_at: null },
      orderBy: [{ created_at: "asc" }],
    });
    return records.map(mapRecord);
  }

  async findById(tenantId: string, workOrderId: string, commentId: string): Promise<WorkOrderComment | undefined> {
    const record = await this.client.workOrderComment.findFirst({
      where: { tenant_id: tenantId, work_order_id: workOrderId, id: commentId, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async updateMessage(input: UpdateWorkOrderCommentMessageInput): Promise<WorkOrderComment | undefined> {
    const updated = await this.client.workOrderComment.updateManyAndReturn({
      where: { tenant_id: input.tenantId, work_order_id: input.workOrderId, id: input.commentId, deleted_at: null },
      data: { message: input.message, edited_at: new Date() },
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async softDelete(tenantId: string, workOrderId: string, commentId: string): Promise<WorkOrderComment | undefined> {
    const updated = await this.client.workOrderComment.updateManyAndReturn({
      where: { tenant_id: tenantId, work_order_id: workOrderId, id: commentId, deleted_at: null },
      data: { deleted_at: new Date() },
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }
}

export class RlsPrismaWorkOrderCommentRepository implements WorkOrderCommentRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateWorkOrderCommentInput): Promise<WorkOrderComment> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderCommentRepository(tx).create(input));
  }
  listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderComment[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderCommentRepository(tx).listByWorkOrder(tenantId, workOrderId));
  }
  findById(tenantId: string, workOrderId: string, commentId: string): Promise<WorkOrderComment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderCommentRepository(tx).findById(tenantId, workOrderId, commentId));
  }
  updateMessage(input: UpdateWorkOrderCommentMessageInput): Promise<WorkOrderComment | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderCommentRepository(tx).updateMessage(input));
  }
  softDelete(tenantId: string, workOrderId: string, commentId: string): Promise<WorkOrderComment | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderCommentRepository(tx).softDelete(tenantId, workOrderId, commentId));
  }
}

export async function createPrismaWorkOrderCommentRepository(): Promise<RlsPrismaWorkOrderCommentRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaWorkOrderCommentRepository(prisma);
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly work_order_id: string;
  readonly author_user_id: string;
  readonly message: string;
  readonly edited_at: Date | null;
  readonly deleted_at: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): WorkOrderComment {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    workOrderId: record.work_order_id,
    authorUserId: record.author_user_id,
    message: record.message,
    editedAt: record.edited_at ?? undefined,
    deletedAt: record.deleted_at ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
