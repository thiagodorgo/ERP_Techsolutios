import type {
  ServiceQuoteCreatePayload,
  ServiceQuoteFieldError,
  ServiceQuoteLineItem,
  ServiceQuoteLineList,
  ServiceQuotePriceSource,
  ServiceQuoteRow,
  ServiceQuoteStatus,
  ServiceQuotesData,
  ServiceQuotesFilters,
  ServiceQuotesPagination,
} from "./service-quotes.types";

const MONEY_MAX = 9999999999.99;

const STATUS_LABELS: Record<ServiceQuoteStatus, string> = {
  draft: "Rascunho",
  approved: "Aprovado",
  rejected: "Rejeitado",
  void: "Anulado",
};

const PRICE_SOURCE_LABELS: Record<ServiceQuotePriceSource, string> = {
  tariff: "Tarifa",
  manual: "Manual",
};

export function adaptServiceQuotesResponse(
  response: unknown,
  source: ServiceQuotesData["source"] = "api",
  fallbackReason?: string,
): ServiceQuotesData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptServiceQuote(item)).filter((item): item is ServiceQuoteRow => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptServiceQuoteResponse(response: unknown): ServiceQuoteRow | null {
  const payload = readRecord(response);
  return adaptServiceQuote(readRecord(payload?.data) ?? response);
}

// `resolveLabels` (opcional) devolve os rótulos humanos resolvidos (nome do serviço/cliente, código da
// OS) do item, para a busca casar o NOME e não só o UUID — o placeholder promete "OS, serviço" (veto
// cognicao-visual). Sem o resolver, cai nos ids (comportamento antigo).
export function filterServiceQuotes(
  items: readonly ServiceQuoteRow[],
  filters: { search: string; isActive: ServiceQuotesFilters["isActive"] },
  resolveLabels?: (item: ServiceQuoteRow) => (string | null | undefined)[],
): ServiceQuoteRow[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (!search) return true;

    const haystack = [
      item.workOrderId,
      item.customerId,
      item.serviceCatalogId,
      getServiceQuoteStatusLabel(item.status),
      getServiceQuotePriceSourceLabel(item.priceSource),
      ...(resolveLabels ? resolveLabels(item) : []),
    ];
    return haystack.filter(Boolean).some((value) => normalize(String(value)).includes(search));
  });
}

export function validateServiceQuote(input: ServiceQuoteCreatePayload): ServiceQuoteFieldError[] {
  const errors: ServiceQuoteFieldError[] = [];

  if (!(input.serviceCatalogId ?? "").trim()) {
    errors.push({ field: "serviceCatalogId", message: "Serviço é obrigatório." });
  }

  if (input.priceSource === "manual") {
    const price = input.unitPrice;
    if (price === undefined || !Number.isFinite(price) || price < 0) {
      errors.push({ field: "unitPrice", message: "Valor unitário é obrigatório no preço manual." });
    } else if (price > MONEY_MAX) {
      errors.push({ field: "unitPrice", message: "Valor unitário acima do máximo permitido." });
    }
  }

  if (input.quantity !== undefined && (!Number.isFinite(input.quantity) || input.quantity <= 0)) {
    errors.push({ field: "quantity", message: "Quantidade deve ser maior que zero." });
  }

  return errors;
}

export function getServiceQuoteStatusLabel(status: ServiceQuoteStatus | string): string {
  return STATUS_LABELS[status as ServiceQuoteStatus] ?? status;
}

export function getServiceQuoteStatusTone(status: ServiceQuoteStatus | string) {
  switch (status) {
    case "approved":
      return "success" as const;
    case "rejected":
      return "danger" as const;
    case "void":
      return "default" as const;
    default:
      return "info" as const; // rascunho
  }
}

export function getServiceQuotePriceSourceLabel(source: ServiceQuotePriceSource | string): string {
  return PRICE_SOURCE_LABELS[source as ServiceQuotePriceSource] ?? source;
}

// Dinheiro SEMPRE com moeda (lição B1): valor + código ISO. pt-BR.
export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);
  } catch {
    return `${(currency || "BRL").toUpperCase()} ${value.toFixed(2)}`;
  }
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

// Encurta um UUID de referência para densidade da lista (o valor completo fica no title da célula).
export function shortRef(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  return raw.length > 8 ? `${raw.slice(0, 8)}…` : raw;
}

export function formatServiceQuoteDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function adaptServiceQuote(input: unknown): ServiceQuoteRow | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const serviceCatalogId = readString(item, ["serviceCatalogId", "service_catalog_id"]);
  if (!id || !serviceCatalogId) return null;

  return {
    id,
    workOrderId: readNullableString(item, ["workOrderId", "work_order_id"]),
    customerId: readNullableString(item, ["customerId", "customer_id"]),
    serviceCatalogId,
    sourceTariffId: readNullableString(item, ["sourceTariffId", "source_tariff_id"]),
    frozenUnitPrice: readNumber(item, ["frozenUnitPrice", "frozen_unit_price"]) ?? 0,
    frozenCurrency: readString(item, ["frozenCurrency", "frozen_currency"]) ?? "BRL",
    quantity: readNumber(item, ["quantity"]) ?? 1,
    frozenTotal: readNumber(item, ["frozenTotal", "frozen_total"]) ?? 0,
    frozenAt: readString(item, ["frozenAt", "frozen_at"]) ?? new Date().toISOString(),
    priceSource: (readString(item, ["priceSource", "price_source"]) as ServiceQuotePriceSource) ?? "tariff",
    status: (readString(item, ["status"]) as ServiceQuoteStatus) ?? "draft",
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    // Cabeçalho do documento (Ω3F-4a/4b): o list DTO pode não emitir todos → null gracioso.
    number: readNullableString(item, ["number"]),
    issuedAt: readNullableString(item, ["issuedAt", "issued_at"]),
    validUntil: readNullableString(item, ["validUntil", "valid_until"]),
    createdWorkOrderId: readNullableString(item, ["createdWorkOrderId", "created_work_order_id"]),
  };
}

// ---------- linhas-de-item do orçamento (leitura defensiva; total do BACKEND) ----------

export function adaptServiceQuoteLineList(response: unknown): ServiceQuoteLineList {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const rawItems = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = rawItems.map((item) => adaptServiceQuoteLineItem(item)).filter((item): item is ServiceQuoteLineItem => item !== null);
  const totalsRecord = dataRecord ?? payload ?? {};
  return {
    items,
    // O total vem AGREGADO do backend; o front nunca soma. Fallback 0 quando ausente.
    totalAmount: readNumber(totalsRecord, ["totalAmount", "total_amount"]) ?? 0,
    currency: readString(totalsRecord, ["currency"]) ?? items[0]?.currency ?? "BRL",
  };
}

function adaptServiceQuoteLineItem(input: unknown): ServiceQuoteLineItem | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  const serviceQuoteId = readString(item, ["serviceQuoteId", "service_quote_id"]);
  if (!id || !serviceQuoteId) return null;
  return {
    id,
    serviceQuoteId,
    tariffId: readNullableString(item, ["tariffId", "tariff_id"]),
    priceTableId: readNullableString(item, ["priceTableId", "price_table_id"]),
    description: readString(item, ["description"]) ?? "—",
    quantity: readNumber(item, ["quantity"]) ?? 0,
    unitAmount: readNumber(item, ["unitAmount", "unit_amount"]) ?? 0,
    totalAmount: readNumber(item, ["totalAmount", "total_amount"]) ?? 0,
    currency: readString(item, ["currency"]) ?? "BRL",
    source: readString(item, ["source"]) === "tariff" ? "tariff" : "manual",
    notes: readNullableString(item, ["notes"]),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): ServiceQuotesPagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
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
