import {
  DAMAGE_GRAVIDADES,
  DAMAGE_STATUSES,
  DAMAGE_TIPOS,
  DamageError,
  type DamageGravidade,
  type DamageStatus,
  type DamageTipo,
} from "./damage.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Rounds money to 2 decimal places (invariante Decimal(12,2) do extrato). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * R5.1 — restricted, strictly linear state machine (mirrors the insurance / fines
 * table-driven guards). Only the transitions listed here are legal; `resolvido`
 * is terminal. A no-op (from === to) is tolerated so idempotent PATCHes never
 * fail. Any other transition is a 422 (`invalid_status_transition`).
 */
export const DAMAGE_STATUS_TRANSITIONS: Readonly<Record<DamageStatus, readonly DamageStatus[]>> = {
  registrado: ["em_tratativa"],
  em_tratativa: ["resolvido"],
  resolvido: [],
};

export function assertDamageStatusTransition(from: DamageStatus, to: DamageStatus): void {
  if (from === to) return;
  if (DAMAGE_STATUS_TRANSITIONS[from].includes(to)) return;

  throw new DamageError(
    422,
    "DAMAGE_INVALID",
    "invalid_status_transition",
    `Transição de dano inválida: de "${from}" para "${to}".`,
  );
}

export function assertNonEmptyString(value: unknown, field: string, maxLength = 5000): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new DamageError(400, "DAMAGE_INVALID", "required_field", `${field} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new DamageError(400, "DAMAGE_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }

  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized || undefined;
}

export function parseDescricao(value: unknown): string {
  return assertNonEmptyString(value, "descricao", 5000);
}

export function parseOptionalDescricao(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseDescricao(value);
}

export function parseGravidade(value: unknown): DamageGravidade {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((DAMAGE_GRAVIDADES as readonly string[]).includes(normalized)) {
    return normalized as DamageGravidade;
  }

  throw new DamageError(
    400,
    "DAMAGE_INVALID",
    normalized ? "invalid_gravidade" : "required_field",
    `gravidade must be one of: ${DAMAGE_GRAVIDADES.join(", ")}.`,
  );
}

export function parseOptionalGravidade(value: unknown): DamageGravidade | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseGravidade(value);
}

export function parseDamageStatus(value: unknown): DamageStatus {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((DAMAGE_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as DamageStatus;
  }

  throw new DamageError(
    400,
    "DAMAGE_INVALID",
    "invalid_status",
    `status must be one of: ${DAMAGE_STATUSES.join(", ")}.`,
  );
}

export function parseOptionalDamageStatus(value: unknown): DamageStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseDamageStatus(value);
}

// Ω4C PR-09 — "Tipo de Dano" (enum-app internal|external|both). Normaliza para o valor interno; label PT-BR
// (INTERNO/EXTERNO/AMBOS) é da fronteira de apresentação.
export function parseTipo(value: unknown): DamageTipo {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((DAMAGE_TIPOS as readonly string[]).includes(normalized)) {
    return normalized as DamageTipo;
  }

  throw new DamageError(
    400,
    "DAMAGE_INVALID",
    "invalid_tipo",
    `tipo must be one of: ${DAMAGE_TIPOS.join(", ")}.`,
  );
}

export function parseOptionalTipo(value: unknown): DamageTipo | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseTipo(value);
}

// Ω4C PR-09 — campos descritivos (origem/objeto/identificacao_objeto/analise_interna): texto livre opcional,
// bounded. Sem regra de negócio além do parseamento (display/impressão — D-007).
export function parseOptionalText(value: unknown, field: string, maxLength = 5000): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return assertNonEmptyString(value, field, maxLength);
}

/**
 * Ω4C PR-09 (D-Ω4C-DANO-MONEY) — "Profissional R$": o valor do DESCONTO a lançar no extrato (pode ser
 * PARCIAL, ex.: 250 de 500 — ANALISE:124). Campo TRANSIENTE (não persistido no dano; o dinheiro vive no
 * extrato). Ausente = identificação-só (sem efeito no extrato). Não-número → 400; ≤ 0 → 422 (money guard).
 * Retorna arredondado a 2 casas (invariante Decimal(12,2)).
 */
export function parseResponsibleAmount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new DamageError(400, "DAMAGE_INVALID", "invalid_responsible_amount", "responsibleAmount must be a number.");
  }
  if (parsed <= 0) {
    throw new DamageError(422, "DAMAGE_UNPROCESSABLE", "invalid_responsible_amount", "responsibleAmount must be greater than zero.");
  }

  return roundMoney(parsed);
}

// Ω4C PR-09 — parcelas do DESCONTO no extrato (transiente, como na Multa). int ≥ 1, default 1; fora de
// 1..240 → 400 invalid_responsible_installment_total.
const MAX_RESPONSIBLE_INSTALLMENTS = 240;
export function parseResponsibleInstallmentTotal(value: unknown): number {
  if (value === undefined || value === null || value === "") return 1;
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_RESPONSIBLE_INSTALLMENTS) {
    throw new DamageError(
      400,
      "DAMAGE_INVALID",
      "invalid_responsible_installment_total",
      `responsibleInstallmentTotal must be an integer between 1 and ${MAX_RESPONSIBLE_INSTALLMENTS}.`,
    );
  }
  return parsed;
}

// Ω4C PR-09 — "Data do 1º desconto" (transiente). Ausente → o serviço usa `now` (o extrato ancora a 1ª parcela).
export function parseResponsibleFirstDueDate(value: unknown): Date | undefined {
  return parseOptionalDate(value, "responsibleFirstDueDate");
}

export function parseCusto(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new DamageError(400, "DAMAGE_INVALID", `invalid_${field}`, `${field} must be a number.`);
  }
  if (parsed < 0) {
    throw new DamageError(400, "DAMAGE_INVALID", `invalid_${field}`, `${field} must be greater than or equal to zero.`);
  }

  return parsed;
}

export function parseRequiredDate(value: unknown, field: string): Date {
  if (value === undefined || value === null || value === "") {
    throw new DamageError(400, "DAMAGE_INVALID", "required_field", `${field} is required.`);
  }
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new DamageError(400, "DAMAGE_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }

  return date;
}

export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredDate(value, field);
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new DamageError(400, "DAMAGE_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field, 160);

  if (!uuidPattern.test(normalized)) {
    throw new DamageError(400, "DAMAGE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }

  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredUuid(value, field);
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new DamageError(400, "DAMAGE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new DamageError(400, "DAMAGE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}
