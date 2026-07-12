import type {
  TariffCreatePayload,
  TariffFieldError,
  TariffItem,
  TariffsData,
  TariffsFilters,
  TariffsPagination,
} from "./tariffs.types";

const NAME_MAX = 160;
const ORIGIN_MAX = 120;
const RULE_MAX = 500;
const CURRENCY_LEN = 3;
const UNIT_PRICE_MAX = 100000000; // 100 milhões — guarda contra overflow acidental de digitação.

export function adaptTariffsResponse(response: unknown, source: TariffsData["source"] = "api", fallbackReason?: string): TariffsData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptTariff(item)).filter((item): item is TariffItem => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptTariffResponse(response: unknown): TariffItem | null {
  const payload = readRecord(response);
  return adaptTariff(readRecord(payload?.data) ?? response);
}

export function filterTariffs(items: readonly TariffItem[], filters: { search: string; isActive: TariffsFilters["isActive"] }): TariffItem[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (!search) return true;

    // A busca cobre os campos que vivem na própria tarifa (nome, origem, moeda, regra);
    // Serviço/Cliente são resolvidos por referência na tela e não fazem parte do item.
    return [item.name, item.origin, item.currency, item.rule]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateTariff(input: TariffCreatePayload): TariffFieldError[] {
  const errors: TariffFieldError[] = [];

  const priceTableId = (input.priceTableId ?? "").trim();
  if (!priceTableId) errors.push({ field: "priceTableId", message: "Tabela de Valores é obrigatória." });

  const unitPrice = input.unitPrice;
  if (unitPrice === undefined || unitPrice === null || !Number.isFinite(unitPrice)) {
    errors.push({ field: "unitPrice", message: "Valor unitário é obrigatório." });
  } else if (unitPrice < 0) {
    errors.push({ field: "unitPrice", message: "Valor unitário deve ser igual ou maior que zero." });
  } else if (unitPrice > UNIT_PRICE_MAX) {
    errors.push({ field: "unitPrice", message: "Valor unitário acima do limite permitido." });
  } else if (Math.round(unitPrice * 100) / 100 !== unitPrice) {
    errors.push({ field: "unitPrice", message: "Valor unitário deve ter no máximo 2 casas decimais." });
  }

  const origin = (input.origin ?? "").trim();
  if (!origin) errors.push({ field: "origin", message: "Origem é obrigatória." });
  else if (origin.length > ORIGIN_MAX) errors.push({ field: "origin", message: `Origem deve ter no máximo ${ORIGIN_MAX} caracteres.` });

  const name = (input.name ?? "").trim();
  if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const currency = (input.currency ?? "").trim();
  if (currency && !/^[A-Za-z]{3}$/.test(currency)) {
    errors.push({ field: "currency", message: `Moeda deve ser um código de ${CURRENCY_LEN} letras (ex.: BRL).` });
  }

  const rule = input.rule ?? "";
  if (rule.length > RULE_MAX) errors.push({ field: "rule", message: `Regra deve ter no máximo ${RULE_MAX} caracteres.` });

  const from = parseDate(input.validFrom);
  const to = parseDate(input.validTo);
  if (input.validFrom && !from) errors.push({ field: "validFrom", message: "Início da vigência deve ser uma data válida." });
  if (input.validTo && !to) errors.push({ field: "validTo", message: "Fim da vigência deve ser uma data válida." });
  if (from && to && from.getTime() > to.getTime()) {
    errors.push({ field: "validTo", message: "O fim da vigência deve ser posterior ao início." });
  }

  return errors;
}

// Situação de cadastro (isActive) — tarifa é FEMININO ("Ativa"/"Inativa").
export function getTariffActiveLabel(isActive: boolean): string {
  return isActive ? "Ativa" : "Inativa";
}

export function getTariffActiveTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
}

// Nome da tarifa para exibição — cai na origem quando não há nome próprio (evita linha "sem título").
export function getTariffDisplayName(tariff: Pick<TariffItem, "name" | "origin">): string {
  const name = (tariff.name ?? "").trim();
  if (name) return name;
  const origin = (tariff.origin ?? "").trim();
  return origin || "Tarifa sem nome";
}

// Valor unitário sempre em moeda (2 casas). Formata na moeda da própria tarifa (default BRL).
export function formatUnitPrice(value: number | null | undefined, currency: string | null | undefined = "BRL"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const code = (currency ?? "BRL").trim().toUpperCase();
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: code || "BRL" }).format(value);
  } catch {
    // Moeda desconhecida para o Intl → cai em formatação decimal com o código ao lado (honesto).
    return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ${code}`;
  }
}

export function formatTariffDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  // Vigência tem semântica de data (sem hora); formata em UTC para não deslocar o dia pelo fuso.
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatValidity(validFrom: string | null | undefined, validTo: string | null | undefined): string {
  const from = formatTariffDate(validFrom);
  const to = formatTariffDate(validTo);
  const hasFrom = from !== "—";
  const hasTo = to !== "—";
  if (!hasFrom && !hasTo) return "Sem vigência definida";
  if (hasFrom && !hasTo) return `A partir de ${from}`;
  if (!hasFrom && hasTo) return `Até ${to}`;
  return `${from} – ${to}`;
}

function adaptTariff(input: unknown): TariffItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const priceTableId = readString(item, ["priceTableId", "price_table_id"]);
  if (!id || !priceTableId) return null;

  return {
    id,
    name: readNullableString(item, ["name"]),
    priceTableId,
    serviceCatalogId: readNullableString(item, ["serviceCatalogId", "service_catalog_id"]),
    customerId: readNullableString(item, ["customerId", "customer_id"]),
    unitPrice: readNumber(item, ["unitPrice", "unit_price"]) ?? 0,
    currency: (readString(item, ["currency"]) ?? "BRL").toUpperCase(),
    origin: readString(item, ["origin"]) ?? "",
    rule: readNullableString(item, ["rule"]),
    validFrom: readNullableString(item, ["validFrom", "valid_from"]),
    validTo: readNullableString(item, ["validTo", "valid_to"]),
    status: readString(item, ["status"]) ?? "active",
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): TariffsPagination {
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
