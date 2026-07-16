import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type { TagRef } from "../tag-assignments/tag-assignment.types.js";

export type WorkOrderCommentActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω3F-5 (D-Ω3F-5-COMMENT) — comentário do usuário como AGREGADO PRÓPRIO mutável. Editar carimba
// editedAt; excluir = delete LÓGICO (deletedAt). Sai da timeline/Histórico (fonte própria: GET /comments).
export type WorkOrderComment = {
  readonly id: string;
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly authorUserId: string;
  readonly message: string;
  readonly editedAt?: Date;
  readonly deletedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Comentário + tags associadas (enriquecidas) — o que a aba de comentários lê.
export type WorkOrderCommentWithTags = WorkOrderComment & {
  readonly tags: readonly TagRef[];
};

export type CreateWorkOrderCommentInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly authorUserId: string;
  readonly message: string;
};

export type UpdateWorkOrderCommentMessageInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly commentId: string;
  readonly message: string;
};

export class WorkOrderCommentError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "WorkOrderCommentError";
  }
}

export function commentNotFoundError(): WorkOrderCommentError {
  return new WorkOrderCommentError(404, "WORK_ORDER_COMMENT_NOT_FOUND", "not_found", "Comment was not found.");
}

export function commentForbiddenError(): WorkOrderCommentError {
  return new WorkOrderCommentError(
    403,
    "WORK_ORDER_COMMENT_FORBIDDEN",
    "comment_forbidden",
    "Only the author or a user with work_orders:update can modify this comment.",
  );
}
