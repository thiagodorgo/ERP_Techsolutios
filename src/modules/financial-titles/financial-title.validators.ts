import { BUSINESS_TIMEZONE, deriveCompetencia, parseBusinessDate } from "../../config/business-time.js";
import { createFinancialItemParsers, roundMoney } from "../tariffs/financial-item.shape.js";
import {
  FINANCIAL_TITLE_DIRECTIONS,
  FINANCIAL_TITLE_PARTY_TYPES,
  FINANCIAL_TITLE_STATUSES,
  FinancialTitleError,
  type FinancialTitleStatus,
} from "./financial-title.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DIRECTION_ALLOWLIST = new Set<string>(FINANCIAL_TITLE_DIRECTIONS);
const PARTY_TYPE_ALLOWLIST = new Set<string>(FINANCIAL_TITLE_PARTY_TYPES);
// v1 — moeda única (mesma regra da Conta financeira Ω4-1): só BRL. Outra moeda exige decisão de escopo.
const CURRENCY_ALLOWLIST = new Set(["BRL"]);
const STATUS_ALLOWLIST = new Set<string>(FINANCIAL_TITLE_STATUSES);

// Máquina monetária COMPARTILHADA (mesma de Orçamento/Financeiro da OS/Conta): roundMoney (2 casas) +
// assertMoneyInRange (negativo → 400 invalid_amount; estoura Decimal(12,2) → 422 amount_overflow).
const moneyParsers = createFinancialItemParsers(
  {
    invalid: (reason, message) => new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", reason, message),
    unprocessable: (reason, message) => new FinancialTitleError(422, "FINANCIAL_TITLE_UNPROCESSABLE", reason, message),
  },
  { overflowReason: "amount_overflow" },
);

export { roundMoney };
export const assertMoneyInRange = moneyParsers.assertMoneyInRange;

// Máquina de status do Título (endpoint PATCH /:id/status). partially_paid/paid NÃO são destinos
// manuais — são DIRIGIDOS por pagamentos (Ω4-4). cancelled/paid são terminais. Cancelar só antes de pagar
// (não há aresta partially_paid/paid → cancelled). Espelha WORK_ORDER_STATUS_TRANSITIONS.
export const FINANCIAL_TITLE_STATUS_TRANSITIONS: Readonly<Record<FinancialTitleStatus, readonly FinancialTitleStatus[]>> = {
  open: ["scheduled", "in_dispute", "cancelled"],
  scheduled: ["open", "in_dispute", "cancelled"],
  in_dispute: ["open", "cancelled"],
  partially_paid: [],
  paid: [],
  cancelled: [],
};

export function assertStatusTransition(from: FinancialTitleStatus, to: FinancialTitleStatus): void {
  if (from === to) return;
  if (FINANCIAL_TITLE_STATUS_TRANSITIONS[from].includes(to)) return;
  throw new FinancialTitleError(
    422,
    "FINANCIAL_TITLE_STATUS_INVALID",
    "invalid_status_transition",
    `Cannot transition financial title from ${from} to ${to}.`,
  );
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

// overdue é DERIVADO (não é coluna): vencido (due_date < agora) E status não-final ({paid,cancelled}).
// Predicado ÚNICO compartilhado entre o DTO (expõe pronto para a UI) e o filtro ?overdue= do list.
export function isTitleOverdue(status: string, dueDate: Date, now: Date = new Date()): boolean {
  return dueDate.getTime() < now.getTime() && status !== "paid" && status !== "cancelled";
}

function parseOptionalBounded(value: unknown, field: string, maxLength: number): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > maxLength) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", `invalid_${field}`, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

// party_name é snapshot OBRIGATÓRIO (o alvo party_id é polimórfico e pode nem existir como cadastro).
export function parsePartyName(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "party_name_required", "party_name is required.");
  }
  if (normalized.length > 160) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_party_name", "party_name must be at most 160 characters.");
  }
  return normalized;
}

export function parseOptionalDocument(value: unknown): string | undefined {
  return parseOptionalBounded(value, "document", 60);
}

export function parseOptionalCategory(value: unknown): string | undefined {
  return parseOptionalBounded(value, "category", 80);
}

export function parseOptionalDescription(value: unknown): string | undefined {
  return parseOptionalBounded(value, "description", 2000);
}

// direction OBRIGATÓRIO ∈ {receivable,payable}. Ausente ou fora da allowlist → 400 invalid_direction.
export function parseDirection(value: unknown): string {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined || !DIRECTION_ALLOWLIST.has(normalized)) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_direction", "direction must be one of receivable, payable.");
  }
  return normalized;
}

// party_type OBRIGATÓRIO ∈ {customer,supplier,other}. Ausente ou fora da allowlist → 400.
export function parsePartyType(value: unknown): string {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined || !PARTY_TYPE_ALLOWLIST.has(normalized)) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_party_type", "party_type must be one of customer, supplier, other.");
  }
  return normalized;
}

// currency ∈ {BRL} no v1; default BRL. Qualquer outra moeda → 400 invalid_currency.
export function parseCurrency(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) return "BRL";
  const upper = normalized.toUpperCase();
  if (!CURRENCY_ALLOWLIST.has(upper)) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_currency", "currency must be BRL.");
  }
  return upper;
}

// amount ESTRITAMENTE > 0. Ausente/NaN/<= 0 → 400 invalid_amount; estoura Decimal(12,2) → 422 amount_overflow.
export function parseAmount(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  const rounded = roundMoney(parsed);
  if (rounded <= 0) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  // assertMoneyInRange cobre o estouro do Decimal(12,2) → 422 amount_overflow (o piso já foi tratado acima).
  return assertMoneyInRange(rounded, "amount");
}

// issue_date OPCIONAL; default = server now. Serve de base para a competencia (nunca vem do corpo).
// Ancorado ao fuso de negócio (parseBusinessDate): date-only vira meia-noite BR-local, não UTC-midnight —
// senão fim-de-mês BR cairia no mês seguinte (P-Ω4-COMPETENCIA-TZ).
export function parseIssueDate(value: unknown): Date {
  const date = parseBusinessDate(value);
  if (Number.isNaN(date.getTime())) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_issue_date", "issue_date must be a valid ISO date.");
  }
  return date;
}

// due_date OBRIGATÓRIO. Ausente OU inválido → 400 due_date_required (não existe default silencioso).
export function parseDueDate(value: unknown): Date {
  if (value === undefined || value === null || value === "") {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "due_date_required", "due_date is required.");
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "due_date_required", "due_date must be a valid ISO date.");
  }
  return date;
}

// competencia = 'YYYY-MM' DERIVADA de issue_date no SERVIDOR, formatada no FUSO DE NEGÓCIO (BUSINESS_TIMEZONE,
// não UTC — P-Ω4-COMPETENCIA-TZ). Definição única em src/config/business-time.ts; re-exportada aqui (e via
// index) para os callers de Título/Lançamento e os testes que a importam deste módulo.
export { BUSINESS_TIMEZONE, deriveCompetencia };

// status inicial no create: default 'open'; 'scheduled' aceito; qualquer outro (paid/etc.) → 400 invalid_status
// (paid/partially_paid são dirigidos por pagamentos, nunca nascem manualmente).
export function parseInitialStatus(value: unknown): "open" | "scheduled" {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined) return "open";
  if (normalized !== "open" && normalized !== "scheduled") {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_status", "status must be 'open' or 'scheduled' on creation.");
  }
  return normalized;
}

// alvo do PATCH /:id/status: precisa ser um status conhecido (string desconhecida → 400 invalid_status).
// A validade da TRANSIÇÃO (422) é decidida depois por assertStatusTransition.
export function parseTargetStatus(value: unknown): FinancialTitleStatus {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined || !STATUS_ALLOWLIST.has(normalized)) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_status", `status must be one of ${[...STATUS_ALLOWLIST].join(", ")}.`);
  }
  return normalized as FinancialTitleStatus;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseRequiredUuid(value, field);
}

// token opaco de idempotência do cliente — só sanidade de tamanho (idempotência real vem no Ω4-3).
export function parseOptionalClientActionId(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 120) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_client_action_id", "clientActionId must be at most 120 characters.");
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FinancialTitleError(400, "FINANCIAL_TITLE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

// Filtros são LENIENTES (não são entrada de escrita): valor desconhecido simplesmente não casa (lista vazia).
export function parseFilterToken(value: unknown): string | undefined {
  return optionalString(value)?.toLowerCase();
}

// Filtro de data (from/to do due_date) — LENIENTE: data inválida vira undefined (não 400).
export function parseOptionalFilterDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function readOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_boolean", `${field} must be a boolean.`);
}
