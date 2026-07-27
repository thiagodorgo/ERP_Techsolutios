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
