import type {
  PriceTableFieldError,
  PriceTableItem,
  PriceTableCreatePayload,
  PriceTableStatus,
  PriceTablesData,
  PriceTablesFilters,
  PriceTablesPagination,
} from "./price-tables.types";
import { PRICE_TABLE_STATUS_TRANSITIONS } from "./price-tables.types";

const NAME_MAX = 160;
const CURRENCY_LEN = 3;
const VERSION_MIN = 1;
const VERSION_MAX = 100000;
const DESCRIPTION_MAX = 2000;

const STATUSES: readonly PriceTableStatus[] = ["draft", "published", "archived"];

export function adaptPriceTablesResponse(
  response: unknown,
  source: PriceTablesData["source"] = "api",
  fallbackReason?: string,
): PriceTablesData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptPriceTable(item)).filter((item): item is PriceTableItem => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptPriceTableResponse(response: unknown): PriceTableItem | null {
  const payload = readRecord(response);
  return adaptPriceTable(readRecord(payload?.data) ?? response);
}

export function filterPriceTables(items: readonly PriceTableItem[], filters: { search: string; isActive: PriceTablesFilters["isActive"] }): PriceTableItem[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (!search) return true;

    return [item.name, item.description, item.currency, getPriceTableStatusLabel(item.status)]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validatePriceTable(input: PriceTableCreatePayload): PriceTableFieldError[] {
  const errors: PriceTableFieldError[] = [];

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Nome é obrigatório." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const currency = (input.currency ?? "").trim();
  if (currency && !/^[A-Za-z]{3}$/.test(currency)) {
    errors.push({ field: "currency", message: `Moeda deve ser um código de ${CURRENCY_LEN} letras (ex.: BRL).` });
  }

  if (input.version !== undefined && input.version !== null) {
    const version = input.version;
    if (!Number.isInteger(version) || version < VERSION_MIN || version > VERSION_MAX) {
      errors.push({ field: "version", message: `Versão deve ser um número inteiro entre ${VERSION_MIN} e ${VERSION_MAX}.` });
    }
  }

  const description = input.description ?? "";
  if (description.length > DESCRIPTION_MAX) errors.push({ field: "description", message: `Descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.` });

  const from = parseDate(input.validFrom);
  const to = parseDate(input.validTo);
  if (input.validFrom && !from) errors.push({ field: "validFrom", message: "Início da vigência deve ser uma data válida." });
  if (input.validTo && !to) errors.push({ field: "validTo", message: "Fim da vigência deve ser uma data válida." });
  if (from && to && from.getTime() > to.getTime()) {
    errors.push({ field: "validTo", message: "O fim da vigência deve ser posterior ao início." });
  }

  return errors;
}

// Status de publicação (token técnico -> rótulo PT-BR; nunca exibir o token cru). Tabela é FEMININO.
const STATUS_LABEL: Record<PriceTableStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  archived: "Arquivada",
};

export function getPriceTableStatusLabel(status: PriceTableStatus | string | null | undefined): string {
  return STATUS_LABEL[(status ?? "draft") as PriceTableStatus] ?? "Rascunho";
}

export function getPriceTableStatusTone(status: PriceTableStatus | string | null | undefined) {
  if (status === "published") return "success" as const;
  if (status === "archived") return "default" as const;
  return "pending" as const; // rascunho — aguardando publicação
}

// Situação de cadastro (isActive) — FEMININO ("Ativa"/"Inativa"), distinta do status de publicação.
export function getPriceTableActiveLabel(isActive: boolean): string {
  return isActive ? "Ativa" : "Inativa";
}

export function getPriceTableActiveTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
}

// Ação de transição de status válida para a linha (só o que a máquina de estado do backend aceita).
export type PriceTableStatusAction = {
  readonly target: PriceTableStatus;
  readonly label: string;
};

const TRANSITION_LABEL: Record<PriceTableStatus, string> = {
  draft: "Voltar a rascunho",
  published: "Publicar",
  archived: "Arquivar",
};

export function getPriceTableStatusActions(status: PriceTableStatus | string | null | undefined): PriceTableStatusAction[] {
  const current = (STATUSES.includes(status as PriceTableStatus) ? status : "draft") as PriceTableStatus;
  return PRICE_TABLE_STATUS_TRANSITIONS[current].map((target) => ({ target, label: TRANSITION_LABEL[target] }));
}

export function formatCurrency(code: string | null | undefined): string {
  const normalized = (code ?? "").trim().toUpperCase();
  return normalized || "—";
}

export function formatVersion(version: number | null | undefined): string {
  if (version === null || version === undefined || !Number.isFinite(version)) return "—";
  return `v${Math.max(1, Math.trunc(version))}`;
}

export function formatPriceTableDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  // Vigência tem semântica de data (sem hora); formata em UTC para não deslocar o dia
  // conforme o fuso do cliente (ex.: 2026-01-01Z não vira 31/12/2025 em UTC-3).
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatValidity(validFrom: string | null | undefined, validTo: string | null | undefined): string {
  const from = formatPriceTableDate(validFrom);
  const to = formatPriceTableDate(validTo);
  const hasFrom = from !== "—";
  const hasTo = to !== "—";
  if (!hasFrom && !hasTo) return "Sem vigência definida";
  if (hasFrom && !hasTo) return `A partir de ${from}`;
  if (!hasFrom && hasTo) return `Até ${to}`;
  return `${from} – ${to}`;
}

function adaptPriceTable(input: unknown): PriceTableItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  const rawStatus = readString(item, ["status"]) ?? "draft";
  const status = (STATUSES.includes(rawStatus as PriceTableStatus) ? rawStatus : "draft") as PriceTableStatus;

  return {
    id,
    name,
    description: readNullableString(item, ["description"]),
    currency: (readString(item, ["currency"]) ?? "BRL").toUpperCase(),
    version: readNumber(item, ["version"]) ?? 1,
    validFrom: readNullableString(item, ["validFrom", "valid_from"]),
    validTo: readNullableString(item, ["validTo", "valid_to"]),
    status,
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): PriceTablesPagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

function readNullableString(input: Record<string, unknown>, keys: readonly string[]): string | null {
  return readString(input, keys) ?? null;
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

function readBoolean(input: Record<string, unknown>, keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
