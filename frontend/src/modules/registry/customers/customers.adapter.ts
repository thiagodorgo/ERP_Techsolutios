import type {
  Customer,
  CustomerCreatePayload,
  CustomerFieldError,
  CustomersData,
  CustomersFilters,
  CustomersPagination,
} from "./customers.types";

const NAME_MAX = 160;
const DOCUMENT_MIN = 11;
const DOCUMENT_MAX = 18;
const PHONE_MIN = 8;
const PHONE_MAX = 20;
const STATE_LEN = 2;
const NOTES_MAX = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function adaptCustomersResponse(response: unknown, source: CustomersData["source"] = "api", fallbackReason?: string): CustomersData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptCustomer(item)).filter((item): item is Customer => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptCustomerResponse(response: unknown): Customer | null {
  const payload = readRecord(response);
  return adaptCustomer(readRecord(payload?.data) ?? response);
}

export function filterCustomers(items: readonly Customer[], filters: CustomersFilters): Customer[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (!search) return true;

    return [item.name, item.document, item.phone, item.email, item.city, item.state]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateCustomer(input: CustomerCreatePayload): CustomerFieldError[] {
  const errors: CustomerFieldError[] = [];

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Nome é obrigatório." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const document = (input.document ?? "").trim();
  if (document && (document.length < DOCUMENT_MIN || document.length > DOCUMENT_MAX)) {
    errors.push({ field: "document", message: `Documento deve ter entre ${DOCUMENT_MIN} e ${DOCUMENT_MAX} caracteres.` });
  }

  const phone = (input.phone ?? "").trim();
  if (phone && (phone.length < PHONE_MIN || phone.length > PHONE_MAX)) {
    errors.push({ field: "phone", message: `Telefone deve ter entre ${PHONE_MIN} e ${PHONE_MAX} caracteres.` });
  }

  const email = (input.email ?? "").trim();
  if (email && !EMAIL_PATTERN.test(email)) errors.push({ field: "email", message: "E-mail inválido." });

  const state = (input.state ?? "").trim();
  if (state && state.length !== STATE_LEN) errors.push({ field: "state", message: "UF deve ter 2 letras." });

  const notes = input.notes ?? "";
  if (notes.length > NOTES_MAX) errors.push({ field: "notes", message: `Observações devem ter no máximo ${NOTES_MAX} caracteres.` });

  return errors;
}

export function getCustomerStatusLabel(isActive: boolean): string {
  return isActive ? "Ativo" : "Inativo";
}

export function getCustomerStatusTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
}

export function formatCustomerLocation(customer: Pick<Customer, "city" | "state">): string {
  const city = customer.city?.trim();
  const state = customer.state?.trim();
  if (city && state) return `${city}/${state}`;
  if (city) return city;
  if (state) return state;
  return "—";
}

export function formatCustomerDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function adaptCustomer(input: unknown): Customer | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  return {
    id,
    name,
    document: readNullableString(item, ["document"]),
    phone: readNullableString(item, ["phone"]),
    email: readNullableString(item, ["email"]),
    address: readNullableString(item, ["address"]),
    city: readNullableString(item, ["city"]),
    state: readNullableString(item, ["state"]),
    zipCode: readNullableString(item, ["zipCode", "zip_code"]),
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    notes: readNullableString(item, ["notes"]),
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): CustomersPagination {
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
