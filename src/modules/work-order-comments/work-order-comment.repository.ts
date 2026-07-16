import { randomUUID } from "node:crypto";

import type {
  CreateWorkOrderCommentInput,
  UpdateWorkOrderCommentMessageInput,
  WorkOrderComment,
} from "./work-order-comment.types.js";

export interface WorkOrderCommentRepository {
  create(input: CreateWorkOrderCommentInput): Promise<WorkOrderComment>;
  // Só comentários NÃO-deletados, ordem de criação (asc).
  listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderComment[]>;
  findById(tenantId: string, workOrderId: string, commentId: string): Promise<WorkOrderComment | undefined>;
  // Edita a mensagem e carimba editedAt (+ updatedAt). undefined se inexistente/deletado.
  updateMessage(input: UpdateWorkOrderCommentMessageInput): Promise<WorkOrderComment | undefined>;
  // Delete LÓGICO (deletedAt). undefined se já deletado/inexistente.
  softDelete(tenantId: string, workOrderId: string, commentId: string): Promise<WorkOrderComment | undefined>;
  reset?(): void;
}

export class InMemoryWorkOrderCommentRepository implements WorkOrderCommentRepository {
  private readonly comments = new Map<string, WorkOrderComment>();

  async create(input: CreateWorkOrderCommentInput): Promise<WorkOrderComment> {
    const now = new Date();
    const comment: WorkOrderComment = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.comments.set(comment.id, comment);
    return comment;
  }

  async listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderComment[]> {
    return [...this.comments.values()]
      .filter((c) => c.tenantId === tenantId && c.workOrderId === workOrderId && !c.deletedAt)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async findById(tenantId: string, workOrderId: string, commentId: string): Promise<WorkOrderComment | undefined> {
    const comment = this.comments.get(commentId);
    return comment && comment.tenantId === tenantId && comment.workOrderId === workOrderId && !comment.deletedAt
      ? comment
      : undefined;
  }

  async updateMessage(input: UpdateWorkOrderCommentMessageInput): Promise<WorkOrderComment | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId, input.commentId);
    if (!current) return undefined;
    const now = new Date();
    const updated: WorkOrderComment = { ...current, message: input.message, editedAt: now, updatedAt: now };
    this.comments.set(updated.id, updated);
    return updated;
  }

  async softDelete(tenantId: string, workOrderId: string, commentId: string): Promise<WorkOrderComment | undefined> {
    const current = await this.findById(tenantId, workOrderId, commentId);
    if (!current) return undefined;
    const now = new Date();
    const removed: WorkOrderComment = { ...current, deletedAt: now, updatedAt: now };
    this.comments.set(removed.id, removed);
    return removed;
  }

  reset(): void {
    this.comments.clear();
  }
}
