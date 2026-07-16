import { WorkOrderCommentError } from "./work-order-comment.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new WorkOrderCommentError(400, "WORK_ORDER_COMMENT_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new WorkOrderCommentError(400, "WORK_ORDER_COMMENT_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

// Lista opcional de tag_ids no POST de comentário. Aceita array de UUIDs; dedupe preservando ordem
// (attach do mesmo id 2x geraria 409 — a intenção do usuário é 1 tag). Cada id deve ser UUID válido
// (400 invalid_uuid). Corpo ausente → []. Máx. 50 tags por comentário (sanidade).
export function parseOptionalTagIds(value: unknown): readonly string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new WorkOrderCommentError(400, "WORK_ORDER_COMMENT_INVALID", "invalid_tag_ids", "tag_ids must be an array of tag UUIDs.");
  }
  if (value.length > 50) {
    throw new WorkOrderCommentError(400, "WORK_ORDER_COMMENT_INVALID", "too_many_tag_ids", "tag_ids must contain at most 50 tags.");
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value) {
    const id = parseRequiredUuid(raw, "tag_id");
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}
