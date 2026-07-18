import { FinancialPeriodCloseError } from "./financial-period-close.types.js";

// period 'YYYY-MM' com mês 01-12 (rejeita 2026-13, 2026-00, 2026-7, abc). É a chave da competência que casa a
// coluna `competencia` (igualdade de string; TZ-correto por construção — a coluna já foi derivada no fuso de
// negócio ao gravar título/lançamento). Malformado → 400 invalid_period.
const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function parsePeriod(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!PERIOD_PATTERN.test(normalized)) {
    throw new FinancialPeriodCloseError(
      400,
      "FINANCIAL_PERIOD_INVALID",
      "invalid_period",
      "period must be in the 'YYYY-MM' format with a month between 01 and 12.",
    );
  }
  return normalized;
}

// force do close: default false. Ignora o gate BLOQUEANTE (in_dispute) sob a MESMA financial_period:close, mas
// exige `reason` (e/ataque) e carimba forced:true no snapshot + auditoria.
export function parseForce(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new FinancialPeriodCloseError(400, "FINANCIAL_PERIOD_INVALID", "invalid_force", "force must be a boolean.");
}

// reason OBRIGATÓRIO no reopen (RN-FIN-009) e no close forçado (e/ataque). Ausente/vazio → 400 reason_required.
export function parseReason(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new FinancialPeriodCloseError(400, "FINANCIAL_PERIOD_INVALID", "reason_required", "reason is required.");
  }
  if (normalized.length > 2000) {
    throw new FinancialPeriodCloseError(400, "FINANCIAL_PERIOD_INVALID", "invalid_reason", "reason must be at most 2000 characters.");
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new FinancialPeriodCloseError(400, "FINANCIAL_PERIOD_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FinancialPeriodCloseError(400, "FINANCIAL_PERIOD_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}
