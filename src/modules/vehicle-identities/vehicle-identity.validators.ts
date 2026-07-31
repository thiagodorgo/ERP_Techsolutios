import {
  VehicleIdentityError,
  WRITABLE_CONFIDENCE_LEVELS,
  type WritableConfidenceLevel,
} from "./vehicle-identity.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function optionalString(value: unknown, maxLength = 160, field = "field"): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "invalid_type", `${field} must be a string.`);
  }
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

// undefined = campo não veio no PATCH (não mexe); null = veio explicitamente para limpar o campo.
export function optionalNullableString(value: unknown, maxLength = 160, field = "field"): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return optionalString(value, maxLength, field) ?? null;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);
  if (!uuidPattern.test(normalized)) {
    throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function readRequiredBoolean(value: unknown, field: string): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "invalid_boolean", `${field} must be a boolean.`);
}

export function readOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return readRequiredBoolean(value, field);
}

// Ano de fabricação — faixa de sanidade (1900..2100); DB não tem CHECK dedicado, é belt-and-suspenders só na APP.
export function parseOptionalYear(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_YEAR || parsed > MAX_YEAR) {
    throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "invalid_year", `year must be an integer between ${MIN_YEAR} and ${MAX_YEAR}.`);
  }
  return parsed;
}

export function parseOptionalConfidence(value: unknown): WritableConfidenceLevel | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(WRITABLE_CONFIDENCE_LEVELS as readonly string[]).includes(normalized)) {
    // MERGED explicitamente rejeitado aqui (mensagem própria) — só o fluxo de merge (PR-04) o atinge.
    throw new VehicleIdentityError(
      400,
      "VEHICLE_IDENTITY_INVALID",
      "invalid_confidence",
      `confidence must be one of: ${WRITABLE_CONFIDENCE_LEVELS.join(", ")} (MERGED is only reachable via the merge flow, PR-04).`,
    );
  }
  return normalized as WritableConfidenceLevel;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value, 120, "search");
  return search;
}

// Resolve um campo que aceita 2 nomes alternativos no body (ex.: "plate"/"plateRaw") preservando a distinção
// PATCH entre "não veio" (undefined, key ausente nos DOIS) e "veio null" (limpar) — `??` não serve aqui porque
// trata null como ausente e mascararia o clear explícito.
export function readAliasedField(body: Record<string, unknown>, primaryKey: string, aliasKey: string): unknown {
  if (primaryKey in body) return body[primaryKey];
  if (aliasKey in body) return body[aliasKey];
  return undefined;
}

// Belt-and-suspenders do CHECK third_party_vehicle_identities_identity_chk: não-identificado ⇒ justificativa
// não vazia; identificado ⇒ ≥1 identificador (plateKey/chassis/renavamKey) não-nulo. Recebe os valores JÁ
// RESOLVIDOS (depois de aplicar undefined-preserva/null-limpa sobre o registro atual, no caso do PATCH).
export function assertIdentityCoherence(input: {
  readonly unidentified: boolean;
  readonly unidentifiedReason?: string;
  readonly plateKey?: string;
  readonly chassis?: string;
  readonly renavamKey?: string;
}): void {
  if (input.unidentified) {
    if (!input.unidentifiedReason || input.unidentifiedReason.trim().length === 0) {
      throw new VehicleIdentityError(
        400,
        "VEHICLE_IDENTITY_INVALID",
        "unidentified_requires_reason",
        "unidentifiedReason is required when unidentified is true.",
      );
    }
    // Achado do crítico-adversarial (PR-02, junta Ω-VID): unidentified=true não pode conviver com
    // identificador ainda presente — nunca limpa em silêncio (mesmo espírito do módulo, que sempre rejeita
    // em vez de reescrever campo por conta própria). O cliente precisa mandar plate/chassis/renavam
    // explicitamente null junto no mesmo PATCH.
    if (input.plateKey || input.chassis || input.renavamKey) {
      throw new VehicleIdentityError(
        400,
        "VEHICLE_IDENTITY_INVALID",
        "unidentified_conflicts_with_identifier",
        "unidentified cannot be true while plate, chassis or renavam is still set — clear them explicitly (send null) in the same request.",
      );
    }
    return;
  }
  if (!input.plateKey && !input.chassis && !input.renavamKey) {
    throw new VehicleIdentityError(
      400,
      "VEHICLE_IDENTITY_INVALID",
      "identified_requires_identifier",
      "at least one of plate, chassis or renavam is required when unidentified is false.",
    );
  }
}

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 1000;

// Ω-VID PR-04 — reason obrigatório (merge/unmerge-admin), mínimo 10 caracteres (§Parte A/B) — justificativa
// mínima para uma ação irreversível na prática (o histórico vive em ThirdPartyVehicleIdentityMergeEvent).
export function assertReason(value: unknown, field = "reason"): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "reason_required", `${field} is required.`);
  }
  if (normalized.length < MIN_REASON_LENGTH) {
    throw new VehicleIdentityError(
      400,
      "VEHICLE_IDENTITY_INVALID",
      "reason_too_short",
      `${field} must be at least ${MIN_REASON_LENGTH} characters.`,
    );
  }
  if (normalized.length > MAX_REASON_LENGTH) {
    throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "reason_too_long", `${field} must be at most ${MAX_REASON_LENGTH} characters.`);
  }
  return normalized;
}
