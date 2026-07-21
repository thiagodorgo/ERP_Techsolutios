import { AttachmentError } from "./attachment.types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// entity_type é um enum-de-aplicação em inglês (snake_case). O conjunto VÁLIDO v1 vive no resolver
// (D-Ω4C-ANEXOS-ENTITYTYPES) — aqui validamos só o FORMATO; tipo desconhecido → 422 no service.
const ENTITY_TYPE_RE = /^[a-z][a-z0-9_]{0,63}$/;

export function parseRequiredEntityType(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    throw new AttachmentError(422, "ATTACHMENT_INVALID", "entity_type_required", "entityType is required.");
  }
  if (!ENTITY_TYPE_RE.test(raw)) {
    throw new AttachmentError(422, "ATTACHMENT_INVALID", "invalid_entity_type", "entityType must be a snake_case identifier.");
  }
  return raw;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!UUID_RE.test(raw)) {
    throw new AttachmentError(422, "ATTACHMENT_INVALID", `invalid_${field}`, `${field} must be a valid UUID.`);
  }
  return raw;
}

export function isValidClientActionId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,120}$/.test(value);
}
