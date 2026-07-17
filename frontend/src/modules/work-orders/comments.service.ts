import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import type {
  WorkOrderComment,
  WorkOrderCommentApiContext,
  WorkOrderCommentInput,
  WorkOrderCommentList,
  WorkOrderCommentTag,
} from "./comments.types";

// Ω3F-5b — camada de dados da aba Comentários. Contrato (Ω3F-5a):
//   GET/POST  /work-orders/:id/comments
//   PATCH/DELETE /work-orders/:id/comments/:commentId (delete = lógico)
//   POST|DELETE /work-orders/:id/comments/:commentId/tags/:tagId (attach/detach)
// Leitura DEFENSIVA (campos podem evoluir); modo mock → no-op honesto (D-007: nunca fabricar linhas).

function basePath(workOrderId: string): string {
  return `/work-orders/${encodeURIComponent(workOrderId)}/comments`;
}

export async function listComments(
  context: WorkOrderCommentApiContext,
  workOrderId: string,
): Promise<WorkOrderCommentList> {
  if (isMockMode()) return { items: [] };

  const response = await apiRequest<unknown>(basePath(workOrderId), context);
  return adaptList(response);
}

export async function addComment(
  context: WorkOrderCommentApiContext,
  workOrderId: string,
  input: WorkOrderCommentInput,
): Promise<WorkOrderComment> {
  const tagIds = (input.tagIds ?? []).filter((id) => typeof id === "string" && id.trim());
  const response = await apiRequest<unknown>(basePath(workOrderId), {
    ...context,
    method: "POST",
    body: {
      message: input.message.trim(),
      tag_ids: tagIds.length > 0 ? tagIds : undefined,
    },
  });
  return adaptOrThrow(readData(response));
}

export async function editComment(
  context: WorkOrderCommentApiContext,
  workOrderId: string,
  commentId: string,
  message: string,
): Promise<WorkOrderComment> {
  const response = await apiRequest<unknown>(`${basePath(workOrderId)}/${encodeURIComponent(commentId)}`, {
    ...context,
    method: "PATCH",
    body: { message: message.trim() },
  });
  return adaptOrThrow(readData(response));
}

export async function deleteComment(
  context: WorkOrderCommentApiContext,
  workOrderId: string,
  commentId: string,
): Promise<void> {
  await apiRequest<unknown>(`${basePath(workOrderId)}/${encodeURIComponent(commentId)}`, {
    ...context,
    method: "DELETE",
  });
}

export async function attachTag(
  context: WorkOrderCommentApiContext,
  workOrderId: string,
  commentId: string,
  tagId: string,
): Promise<void> {
  await apiRequest<unknown>(
    `${basePath(workOrderId)}/${encodeURIComponent(commentId)}/tags/${encodeURIComponent(tagId)}`,
    { ...context, method: "POST" },
  );
}

export async function detachTag(
  context: WorkOrderCommentApiContext,
  workOrderId: string,
  commentId: string,
  tagId: string,
): Promise<void> {
  await apiRequest<unknown>(
    `${basePath(workOrderId)}/${encodeURIComponent(commentId)}/tags/${encodeURIComponent(tagId)}`,
    { ...context, method: "DELETE" },
  );
}

// ---------- adapters (leitura defensiva) ----------

function adaptList(response: unknown): WorkOrderCommentList {
  const record = asRecord(response);
  const rawItems = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(response)
        ? response
        : [];
  const items = rawItems
    .map((item) => adaptComment(item))
    .filter((item): item is WorkOrderComment => item !== null);
  return { items };
}

function adaptComment(value: unknown): WorkOrderComment | null {
  const item = asRecord(value);
  const id = readString(item.id);
  const workOrderId = readString(item.workOrderId ?? item.work_order_id);
  if (!id || !workOrderId) return null;
  return {
    id,
    workOrderId,
    authorUserId: readString(item.authorUserId ?? item.author_user_id) ?? "",
    authorName: readString(item.authorName ?? item.author_name) ?? null,
    message: readString(item.message) ?? "",
    tags: adaptTags(item.tags),
    editedAt: readString(item.editedAt ?? item.edited_at) ?? null,
    createdAt: readString(item.createdAt ?? item.created_at) ?? "",
  };
}

function adaptTags(value: unknown): readonly WorkOrderCommentTag[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw): WorkOrderCommentTag | null => {
      const tag = asRecord(raw);
      const id = readString(tag.id);
      const name = readString(tag.name);
      if (!id || !name) return null;
      return { id, name, color: readString(tag.color) ?? null };
    })
    .filter((tag): tag is WorkOrderCommentTag => tag !== null);
}

// Resposta de mutação (POST/PATCH): o backend sempre devolve um comentário válido.
function adaptOrThrow(value: unknown): WorkOrderComment {
  const comment = adaptComment(value);
  if (!comment) throw new Error("invalid_comment_response");
  return comment;
}

function readData(response: unknown): unknown {
  const record = asRecord(response);
  return "data" in record ? record.data : response;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
