import type { WorkOrderCommentWithTags } from "./work-order-comment.types.js";

// §2.8 (allowlist) — o DTO NUNCA emite tenant_id (resolvido pelo ator autenticado). Expõe autor,
// mensagem, tags (id/name/color) e os carimbos de edição/criação.
export function toWorkOrderCommentDto(comment: WorkOrderCommentWithTags) {
  return {
    id: comment.id,
    workOrderId: comment.workOrderId,
    authorUserId: comment.authorUserId,
    message: comment.message,
    tags: comment.tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
    editedAt: comment.editedAt ? comment.editedAt.toISOString() : null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export function toWorkOrderCommentListDto(comments: readonly WorkOrderCommentWithTags[]) {
  return { items: comments.map(toWorkOrderCommentDto) };
}
