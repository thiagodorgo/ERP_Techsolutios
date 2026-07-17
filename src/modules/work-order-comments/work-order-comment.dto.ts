import type { WorkOrderCommentWithTags } from "./work-order-comment.types.js";

// §2.8 (allowlist) — o DTO NUNCA emite tenant_id (resolvido pelo ator autenticado). Expõe autor,
// mensagem, tags (id/name/color) e os carimbos de edição/criação.
// Ω3F-5b (veto §11.2) — emite também `authorName` (nome legível resolvido no backend): a UI mostra o
// NOME, nunca o UUID. `authorUserId` permanece (o front usa só p/ o gating de autoria, não o renderiza).
export function toWorkOrderCommentDto(comment: WorkOrderCommentWithTags, nameById?: ReadonlyMap<string, string>) {
  return {
    id: comment.id,
    workOrderId: comment.workOrderId,
    authorUserId: comment.authorUserId,
    authorName: nameById?.get(comment.authorUserId) ?? null,
    message: comment.message,
    tags: comment.tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
    editedAt: comment.editedAt ? comment.editedAt.toISOString() : null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export function toWorkOrderCommentListDto(
  comments: readonly WorkOrderCommentWithTags[],
  nameById?: ReadonlyMap<string, string>,
) {
  return { items: comments.map((comment) => toWorkOrderCommentDto(comment, nameById)) };
}
