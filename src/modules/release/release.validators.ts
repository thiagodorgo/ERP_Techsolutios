import { RECIPIENT_RELATIONSHIPS, ReleaseError, type RecipientRelationship } from "./release.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new ReleaseError(400, "RELEASE_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new ReleaseError(400, "RELEASE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseRequiredUuid(value, field);
}

export function optionalString(value: unknown, maxLength = 500): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new ReleaseError(400, "RELEASE_INVALID", "field_too_long", `field must be at most ${maxLength} characters.`);
  }
  return normalized;
}

// Quem retira: nome + documento (PII — SÓ na tabela de domínio, jamais no payload da cadeia/audit — §2.8). Limite
// generoso (nome completo/procurador); a minimização de exposição é do DTO/allowlist, não do input.
export function parseRecipientName(value: unknown): string | undefined {
  return optionalString(value, 200);
}

export function parseRecipientDocument(value: unknown): string | undefined {
  return optionalString(value, 60);
}

export function parseRecipientRelationship(value: unknown): RecipientRelationship | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(RECIPIENT_RELATIONSHIPS as readonly string[]).includes(normalized)) {
    throw new ReleaseError(
      400,
      "RELEASE_INVALID",
      "invalid_relationship",
      `recipientRelationship must be one of: ${RECIPIENT_RELATIONSHIPS.join(", ")}.`,
    );
  }
  return normalized as RecipientRelationship;
}

// Referência do ato da autoridade (nº decisão/ofício — white-label, texto livre curto; sem PII do proprietário).
export function parseAuthorityReference(value: unknown): string | undefined {
  return optionalString(value, 120);
}

// Ω5P PR-10b (CTB art. 271 §2º / Res. 1025 art. 23 §1º) — prazo para o veículo reapresentar-se após a saída p/
// reparo. LIMITE LEGAL = 60 dias a partir de agora. Ausente/malformado → 400; > 60d → 422. O perfil não tem campo
// de override (exigiria migração — fora desta fatia). O reason é ÚNICO (repair_deadline_invalid), diferenciado
// pelo statusCode (400 vs 422); o guard re-checa a presença como 409 defensivo.
export const REPAIR_REPRESENTATION_MAX_DAYS = 60;
const MS_PER_DAY = 86_400_000;

export function parseRepairDeadline(value: unknown, now: Date = new Date()): Date {
  if (value === undefined || value === null || value === "") {
    throw new ReleaseError(400, "RELEASE_INVALID", "repair_deadline_invalid", "A repair deadline is required to release the vehicle for repair.");
  }
  const raw = typeof value === "string" ? value.trim() : value;
  const parsed = raw instanceof Date ? raw : new Date(raw as string);
  if (Number.isNaN(parsed.getTime())) {
    throw new ReleaseError(400, "RELEASE_INVALID", "repair_deadline_invalid", "repair_deadline must be a valid ISO date.");
  }
  // LOW-3 (critico): um prazo de reapresentação NO PASSADO é dado inválido (repairOverdue já no ato) — 400 (mesma
  // classe do ausente/malformado), antes de checar o teto legal.
  if (parsed.getTime() <= now.getTime()) {
    throw new ReleaseError(400, "RELEASE_INVALID", "repair_deadline_invalid", "repair_deadline must be a future date.");
  }
  const maxDeadline = now.getTime() + REPAIR_REPRESENTATION_MAX_DAYS * MS_PER_DAY;
  if (parsed.getTime() > maxDeadline) {
    throw new ReleaseError(422, "RELEASE_INVALID", "repair_deadline_invalid", `repair_deadline must be within ${REPAIR_REPRESENTATION_MAX_DAYS} days (art. 23 §1º).`);
  }
  return parsed;
}

// Código do requisito do checklist (SNAPSHOT). Alfanumérico + underscore, curto.
export function parseRequirementCode(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!normalized) {
    throw new ReleaseError(422, "RELEASE_INVALID", "code_required", "A requirement code is required.");
  }
  if (normalized.length > 60 || !/^[A-Z0-9_]+$/.test(normalized)) {
    throw new ReleaseError(400, "RELEASE_INVALID", "invalid_code", "code must be up to 60 chars [A-Z0-9_].");
  }
  return normalized;
}

// Flag booleana explícita (satisfied). Default true (o operador marca "cumprido"); false só se enviado.
export function parseSatisfied(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "sim"].includes(normalized)) return true;
  if (["false", "0", "no", "nao", "não"].includes(normalized)) return false;
  throw new ReleaseError(400, "RELEASE_INVALID", "invalid_boolean", "satisfied must be a boolean.");
}

// Máscara §2.8 da referência do ato p/ o payload da cadeia (nunca o valor bruto). Mostra só o sufixo curto.
export function maskAuthorityReference(reference: string | undefined): string | null {
  if (!reference) return null;
  const trimmed = reference.trim();
  if (trimmed.length <= 4) return "…";
  return `…${trimmed.slice(-4)}`;
}
