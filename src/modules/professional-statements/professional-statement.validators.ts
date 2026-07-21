import { deriveCompetencia, parseBusinessDate } from "../../config/business-time.js";
import { createFinancialItemParsers, roundMoney } from "../tariffs/financial-item.shape.js";
import {
  PROFESSIONAL_STATEMENT_DIRECTIONS,
  ProfessionalStatementError,
} from "./professional-statement.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DIRECTION_ALLOWLIST = new Set<string>(PROFESSIONAL_STATEMENT_DIRECTIONS);
// v1 — moeda única (mesma regra do Título/Conta): só BRL. Outra moeda exige decisão de escopo.
const CURRENCY_ALLOWLIST = new Set(["BRL"]);
// Teto de parcelas: guarda contra plano absurdo (20 anos mensais). N ≥ 1 (EXT-04).
const MAX_INSTALLMENTS = 240;

// Máquina monetária COMPARTILHADA (mesma de Título/Financeiro da OS): roundMoney (2 casas) +
// assertMoneyInRange (negativo → 400 invalid_amount; estoura Decimal(12,2) → 422 amount_overflow).
const moneyParsers = createFinancialItemParsers(
  {
    invalid: (reason, message) => new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", reason, message),
    unprocessable: (reason, message) => new ProfessionalStatementError(422, "PROFESSIONAL_STATEMENT_UNPROCESSABLE", reason, message),
  },
  { overflowReason: "amount_overflow" },
);

export { roundMoney };
export const assertMoneyInRange = moneyParsers.assertMoneyInRange;
export { deriveCompetencia };

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

// direction OBRIGATÓRIO ∈ {debit,credit} no AJUSTE (D-Ω4C-EXTRATO-DIRECTION: debit=desconto, credit=provento).
export function parseDirection(value: unknown): string {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined || !DIRECTION_ALLOWLIST.has(normalized)) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_direction", "direction must be one of debit, credit.");
  }
  return normalized;
}

// description OBRIGATÓRIA no AJUSTE (é o único campo editável depois — RN-EXT-01). Máx. 2000.
export function parseRequiredDescription(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "description_required", "description is required.");
  }
  if (normalized.length > 2000) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_description", "description must be at most 2000 characters.");
  }
  return normalized;
}

// currency ∈ {BRL} no v1; default BRL.
export function parseCurrency(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) return "BRL";
  const upper = normalized.toUpperCase();
  if (!CURRENCY_ALLOWLIST.has(upper)) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_currency", "currency must be BRL.");
  }
  return upper;
}

// amount TOTAL do lançamento, ESTRITAMENTE > 0. Ausente/NaN/<= 0 → 400 invalid_amount; estoura Decimal(12,2)
// → 422 amount_overflow. O split em parcelas é feito depois (buildInstallmentPlan).
export function parseAmount(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  const rounded = roundMoney(parsed);
  if (rounded <= 0) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  return assertMoneyInRange(rounded, "amount");
}

// installment_total OBRIGATÓRIO int ≥ 1 (default 1). Fora de 1..240 → 400 invalid_installment_total.
export function parseInstallmentTotal(value: unknown): number {
  if (value === undefined || value === null || value === "") return 1;
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_INSTALLMENTS) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_installment_total", `installment_total must be an integer between 1 and ${MAX_INSTALLMENTS}.`);
  }
  return parsed;
}

// first_due_date OBRIGATÓRIA (base dos vencimentos mensais). Ausente/inválida → 400 first_due_date_required.
// Ancorada ao fuso de negócio (parseBusinessDate) para a competência cair no mês BR correto.
export function parseFirstDueDate(value: unknown): Date {
  if (value === undefined || value === null || value === "") {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "first_due_date_required", "first_due_date is required.");
  }
  const date = value instanceof Date ? value : parseBusinessDate(value);
  if (Number.isNaN(date.getTime())) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "first_due_date_required", "first_due_date must be a valid ISO date.");
  }
  return date;
}

// EXT-04 — parcelamento fiel: N parcelas, Σparcelas = total (resto de centavos na 1ª), vencimentos mensais a
// partir de first_due_date; cada parcela Decimal(12,2) > 0. Total baixo demais p/ N parcelas > 0 → 422.
export function buildInstallmentPlan(
  totalAmount: number,
  installmentTotal: number,
  firstDueDate: Date,
): readonly { installmentNumber: number; installmentTotal: number; amount: number; dueDate: Date; competencia: string }[] {
  const totalCents = Math.round(totalAmount * 100);
  const base = Math.floor(totalCents / installmentTotal);
  if (base < 1) {
    throw new ProfessionalStatementError(
      422,
      "PROFESSIONAL_STATEMENT_UNPROCESSABLE",
      "installment_amount_too_small",
      "amount is too small to split into the requested number of installments (each installment must be at least 0.01).",
    );
  }
  const remainder = totalCents - base * installmentTotal;
  const plan: { installmentNumber: number; installmentTotal: number; amount: number; dueDate: Date; competencia: string }[] = [];
  for (let index = 0; index < installmentTotal; index += 1) {
    const cents = index === 0 ? base + remainder : base;
    const dueDate = addMonths(firstDueDate, index);
    plan.push({
      installmentNumber: index + 1,
      installmentTotal,
      amount: roundMoney(cents / 100),
      dueDate,
      competencia: deriveCompetencia(dueDate),
    });
  }
  return plan;
}

// Soma meses preservando o instante do dia; clampa o dia ao último dia do mês-alvo (31/jan + 1 mês → 28/fev).
function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);
  const result = new Date(date.getTime());
  result.setUTCFullYear(targetYear, targetMonth, clampedDay);
  return result;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseOptionalClientActionId(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 120) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_client_action_id", "clientActionId must be at most 120 characters.");
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

// Filtros são LENIENTES (não são entrada de escrita): valor desconhecido simplesmente não casa.
export function parseFilterToken(value: unknown): string | undefined {
  return optionalString(value)?.toLowerCase();
}

export function parseOptionalFilterDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}
