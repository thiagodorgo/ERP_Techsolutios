import type { WorkOrdersApiContext } from "./work-orders.types";

// Ω3F-5b — comentários da OS (aba Comentários do hub). Espelha o DTO do backend
// (work-order-comment): mensagem + etiquetas coloridas (attach/detach) + autoria (editar/excluir
// só do próprio autor OU work_orders:update). §2.8: sem tenant_id/token/client_action_id no payload.

// Etiqueta anexada ao comentário (subset do TagItem: só o que o chip precisa).
export type WorkOrderCommentTag = {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
};

export type WorkOrderComment = {
  readonly id: string;
  readonly workOrderId: string;
  readonly authorUserId: string;
  readonly message: string;
  readonly tags: readonly WorkOrderCommentTag[];
  // Preenchido quando o comentário foi editado após a criação (mostra selo "editado").
  readonly editedAt: string | null;
  readonly createdAt: string;
};

export type WorkOrderCommentList = {
  readonly items: readonly WorkOrderComment[];
};

// Novo comentário: mensagem obrigatória + etiquetas opcionais (multi-seleção do picker).
export type WorkOrderCommentInput = {
  readonly message: string;
  readonly tagIds?: readonly string[];
};

export type WorkOrderCommentApiContext = WorkOrdersApiContext;
