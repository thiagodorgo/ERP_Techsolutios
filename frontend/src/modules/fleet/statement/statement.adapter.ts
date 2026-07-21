import { formatBRL } from "../../registry/service-catalog/service-catalog.adapter";
import type {
  ProfessionalStatementEntry,
  ProfessionalStatementGroup,
  ProfessionalStatementLedger,
  ProfessionalStatementSummary,
  StatementAdjustmentDraft,
  StatementAdjustmentFieldError,
  StatementSource,
} from "./statement.types";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "pending" | "audit";

const DESCRIPTION_MAX = 2000;
const MAX_INSTALLMENTS = 240;

// Reexport do formatador de moeda do repo (fonte única — Catálogo de Serviço). Dinheiro Decimal(12,2).
export { formatBRL };

// §3 — enums do backend (INGLÊS) → rótulos PT-BR de negócio. Nunca exibir o token cru na UI.
export const ENTRY_TYPE_LABELS: Record<string, string> = {
  damage: "Dano",
  fine: "Multa",
  remuneration: "Remuneração",
  adjustment: "Ajuste",
};

export function getEntryTypeLabel(value: string | null | undefined): string {
  return (value && ENTRY_TYPE_LABELS[value]) ?? "—";
}

// Tom do TIPO: provento (Remuneração) verde; descontos (Dano/Multa) vermelho/âmbar; Ajuste neutro (azul).
export function getEntryTypeTone(value: string | null | undefined): Tone {
  switch (value) {
    case "remuneration":
      return "success";
    case "damage":
      return "danger";
    case "fine":
      return "warning";
    case "adjustment":
      return "info";
    default:
      return "default";
  }
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  settled: "Liquidado",
  cancelled: "Cancelado",
};

export function getStatusLabel(value: string | null | undefined): string {
  return (value && STATUS_LABELS[value]) ?? "—";
}

// Badge liquidado/pendente (a "bolinha" da Remuneração, ANALISE:237): liquidado = verde; pendente = âmbar
// (estado de espera, não erro); cancelado = neutro.
export function getStatusTone(value: string | null | undefined): Tone {
  switch (value) {
    case "settled":
      return "success";
    case "cancelled":
      return "default";
    default:
      return "pending";
  }
}

// D-Ω4C-EXTRATO-DIRECTION — debit = desconto (reduz o saldo do profissional); credit = provento.
export function getDirectionLabel(direction: string | null | undefined): string {
  if (direction === "credit") return "Crédito";
  if (direction === "debit") return "Débito";
  return "—";
}

export function getAmountTone(direction: string | null | undefined): Tone {
  return direction === "credit" ? "success" : "danger";
}

// Valor da parcela COM SINAL segundo a direção: crédito soma (+), débito subtrai (−). Usa o traço de menos
// tipográfico (−) para não confundir com hífen.
export function formatSignedAmount(amount: number, direction: string | null | undefined): string {
  if (!Number.isFinite(amount)) return "—";
  const sign = direction === "credit" ? "+" : "−";
  return `${sign} ${formatBRL(Math.abs(amount))}`;
}

// Saldo (corrente ou por linha) COM SINAL. Positivo (crédito) = a empresa deve ao profissional.
export function formatBalance(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (value === 0) return formatBRL(0);
  const sign = value < 0 ? "−" : "+";
  return `${sign} ${formatBRL(Math.abs(value))}`;
}

export function getBalanceTone(value: number | null | undefined): Tone {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return "default";
  return value > 0 ? "success" : "danger";
}

// Semântica do saldo (D-Ω4C-EXTRATO-DIRECTION) — texto de apoio do card de saldo corrente.
export function describeBalance(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return "Sem saldo em aberto";
  return value > 0 ? "A empresa deve ao profissional" : "O profissional deve à empresa";
}

// Parcela n/N. Lançamento à vista (total 1) → "Única".
export function formatInstallment(number: number, total: number): string {
  if (!Number.isFinite(number) || !Number.isFinite(total) || total < 1) return "—";
  if (total === 1) return "Única";
  return `${number}/${total}`;
}

// due_date é timestamptz — no extrato mostramos só a DATA (vencimento), sem hora.
export function formatStatementDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

const EMPTY_SUMMARY: ProfessionalStatementSummary = { currentBalance: 0, totalDebits: 0, totalCredits: 0, count: 0 };
const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

export function emptyLedger(
  operatorProfileId: string | null,
  source: StatementSource,
  fallbackReason?: string,
): ProfessionalStatementLedger {
  return {
    operatorProfileId,
    professionalName: null,
    summary: { ...EMPTY_SUMMARY },
    items: [],
    pagination: { ...EMPTY_PAGINATION },
    source,
    ...(fallbackReason ? { fallbackReason } : {}),
  };
}

// GET /professional-statements devolve o LEDGER no topo (sem envelope { data }). Defensivo: desembrulha
// `data` se vier aninhado. §2.8: só lê campos allowlistados do DTO (nunca tenant_id/source_id/CNH).
export function adaptStatementLedger(
  response: unknown,
  operatorProfileId: string,
  source: StatementSource = "api",
  fallbackReason?: string,
): ProfessionalStatementLedger {
  const payload = readRecord(response);
  const ledger = readRecord(payload?.data) ?? payload;
  const summaryRecord = readRecord(ledger?.summary);
  const items = readArray(ledger?.items)
    ?.map((item) => adaptEntry(item))
    .filter((item): item is ProfessionalStatementEntry => Boolean(item)) ?? [];
  const paginationRecord = readRecord(ledger?.pagination);

  return {
    operatorProfileId: readString(ledger, ["operatorProfileId", "operator_profile_id"]) ?? operatorProfileId,
    professionalName: readString(ledger, ["professionalName", "professional_name"]) ?? null,
    summary: {
      currentBalance: readNumber(summaryRecord, ["currentBalance", "current_balance"]) ?? 0,
      totalDebits: readNumber(summaryRecord, ["totalDebits", "total_debits"]) ?? 0,
      totalCredits: readNumber(summaryRecord, ["totalCredits", "total_credits"]) ?? 0,
      count: readNumber(summaryRecord, ["count"]) ?? items.length,
    },
    items,
    pagination: {
      limit: readNumber(paginationRecord, ["limit"]) ?? 20,
      offset: readNumber(paginationRecord, ["offset"]) ?? 0,
      total: readNumber(paginationRecord, ["total"]) ?? items.length,
    },
    source,
    ...(fallbackReason ? { fallbackReason } : {}),
  };
}

// Resposta de create/delete: envelope { data: grupo } com installments[].
export function adaptStatementGroup(response: unknown): ProfessionalStatementGroup | null {
  const payload = readRecord(response);
  const group = readRecord(payload?.data) ?? payload;
  const groupId = readString(group, ["groupId", "group_id"]);
  const operatorProfileId = readString(group, ["operatorProfileId", "operator_profile_id"]);
  if (!group || !groupId || !operatorProfileId) return null;

  const installments = readArray(group.installments)
    ?.map((item) => adaptEntry(item))
    .filter((item): item is ProfessionalStatementEntry => Boolean(item)) ?? [];

  return {
    groupId,
    operatorProfileId,
    entryType: readString(group, ["entryType", "entry_type"]) ?? "adjustment",
    direction: readString(group, ["direction"]) ?? "debit",
    description: readString(group, ["description"]) ?? null,
    currency: readString(group, ["currency"]) ?? "BRL",
    sourceType: readString(group, ["sourceType", "source_type"]) ?? null,
    installmentTotal: readNumber(group, ["installmentTotal", "installment_total"]) ?? installments.length,
    totalAmount: readNumber(group, ["totalAmount", "total_amount"]) ?? 0,
    installments,
    createdAt: readString(group, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptEntry(input: unknown): ProfessionalStatementEntry | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  const operatorProfileId = readString(item, ["operatorProfileId", "operator_profile_id"]);
  if (!id || !operatorProfileId) return null;

  return {
    id,
    operatorProfileId,
    groupId: readString(item, ["groupId", "group_id"]) ?? id,
    entryType: readString(item, ["entryType", "entry_type"]) ?? "adjustment",
    direction: readString(item, ["direction"]) ?? "debit",
    description: readString(item, ["description"]) ?? null,
    amount: readNumber(item, ["amount"]) ?? 0,
    currency: readString(item, ["currency"]) ?? "BRL",
    installmentNumber: readNumber(item, ["installmentNumber", "installment_number"]) ?? 1,
    installmentTotal: readNumber(item, ["installmentTotal", "installment_total"]) ?? 1,
    dueDate: readString(item, ["dueDate", "due_date"]) ?? new Date().toISOString(),
    competencia: readString(item, ["competencia"]) ?? "",
    status: readString(item, ["status"]) ?? "pending",
    settledAt: readString(item, ["settledAt", "settled_at"]) ?? null,
    sourceType: readString(item, ["sourceType", "source_type"]) ?? null,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    runningBalance: readNumber(item, ["runningBalance", "running_balance"]) ?? 0,
  };
}

// ── AJUSTE manual: parsing pt-BR + validação de cliente (o backend é a autoridade final) ──

// pt-BR: remove separador de milhar (ponto antes de 3 dígitos) e usa vírgula como decimal.
export function parsePtBrMoney(value: string | null | undefined): number | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseIntStrict(value: string | null | undefined): number | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function validateAdjustment(draft: StatementAdjustmentDraft): StatementAdjustmentFieldError[] {
  const errors: StatementAdjustmentFieldError[] = [];

  if (draft.direction !== "debit" && draft.direction !== "credit") {
    errors.push({ field: "direction", message: "Selecione crédito ou débito." });
  }

  const description = (draft.description ?? "").trim();
  if (!description) errors.push({ field: "description", message: "Informe a descrição do ajuste." });
  else if (description.length > DESCRIPTION_MAX) {
    errors.push({ field: "description", message: `Descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.` });
  }

  if (draft.amount === undefined || !Number.isFinite(draft.amount) || draft.amount <= 0) {
    errors.push({ field: "amount", message: "Valor deve ser maior que zero." });
  }

  const total = draft.installmentTotal;
  if (total === undefined || !Number.isInteger(total) || total < 1 || total > MAX_INSTALLMENTS) {
    errors.push({ field: "installmentTotal", message: `Parcelas deve ser um inteiro entre 1 e ${MAX_INSTALLMENTS}.` });
  }

  if (!(draft.firstDueDate ?? "").trim()) {
    errors.push({ field: "firstDueDate", message: "Informe a data do primeiro vencimento." });
  } else if (Number.isNaN(new Date(draft.firstDueDate).getTime())) {
    errors.push({ field: "firstDueDate", message: "Data do primeiro vencimento inválida." });
  }

  return errors;
}

// RN-EXT-01 — mensagem do AutEM na trava de integridade. O ApiError não expõe o corpo cru; o único 409
// documentado do extrato é a trava (parcela liquidada), então mapeamos status 409 → esta mensagem.
export const STATEMENT_LOCKED_MESSAGE =
  "O valor já se encontra no extrato do profissional. A exclusão e algumas alterações não podem ser feitas até que todas as parcelas sejam removidas do mesmo.";

export function interpretRemoveError(error: unknown): string {
  if (readErrorStatus(error) === 409) return STATEMENT_LOCKED_MESSAGE;
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível retirar o lançamento do extrato. Tente novamente.";
}

export function interpretAdjustmentSubmitError(error: unknown): string {
  const status = readErrorStatus(error);
  if (status === 422) return "Valor muito baixo para o número de parcelas informado. Ajuste o valor ou as parcelas.";
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível registrar o ajuste. Tente novamente.";
}

// ── leitores defensivos (o DTO já é allowlistado no backend; aqui só normalizamos tipos) ──

function readErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

function readArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readString(input: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(input: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
