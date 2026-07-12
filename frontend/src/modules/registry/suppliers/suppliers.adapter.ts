import type {
  SupplierCreatePayload,
  SupplierFieldError,
  SupplierItem,
  SuppliersData,
  SuppliersFilters,
  SuppliersPagination,
} from "./suppliers.types";

const NAME_MAX = 160;
const DOCUMENT_MIN = 11;
const DOCUMENT_MAX = 18;
const PHONE_MIN = 8;
const PHONE_MAX = 20;
const CATEGORY_MAX = 80;
const NOTES_MAX = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function adaptSuppliersResponse(response: unknown, source: SuppliersData["source"] = "api", fallbackReason?: string): SuppliersData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptSupplier(item)).filter((item): item is SupplierItem => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptSupplierResponse(response: unknown): SupplierItem | null {
  const payload = readRecord(response);
  return adaptSupplier(readRecord(payload?.data) ?? response);
}

export function filterSuppliers(items: readonly SupplierItem[], filters: { search: string; isActive: SuppliersFilters["isActive"] }): SupplierItem[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (!search) return true;

    return [item.name, item.document, item.email, item.phone, item.category]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateSupplier(input: SupplierCreatePayload): SupplierFieldError[] {
  const errors: SupplierFieldError[] = [];

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Nome é obrigatório." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const document = (input.document ?? "").trim();
  if (document && (document.length < DOCUMENT_MIN || document.length > DOCUMENT_MAX)) {
    errors.push({ field: "document", message: `Documento deve ter entre ${DOCUMENT_MIN} e ${DOCUMENT_MAX} caracteres.` });
  }

  const email = (input.email ?? "").trim();
  if (email && !EMAIL_PATTERN.test(email)) errors.push({ field: "email", message: "E-mail inválido." });

  const phone = (input.phone ?? "").trim();
  if (phone && (phone.length < PHONE_MIN || phone.length > PHONE_MAX)) {
    errors.push({ field: "phone", message: `Telefone deve ter entre ${PHONE_MIN} e ${PHONE_MAX} caracteres.` });
  }

  const category = (input.category ?? "").trim();
  if (category.length > CATEGORY_MAX) errors.push({ field: "category", message: `Categoria deve ter no máximo ${CATEGORY_MAX} caracteres.` });

  const notes = input.notes ?? "";
  if (notes.length > NOTES_MAX) errors.push({ field: "notes", message: `Observações devem ter no máximo ${NOTES_MAX} caracteres.` });

  return errors;
}

// Situação de cadastro (isActive) — fornecedor é MASCULINO ("Ativo"/"Inativo"),
// mesma convenção dos irmãos masculinos (cliente, serviço).
export function getSupplierStatusLabel(isActive: boolean): string {
  return isActive ? "Ativo" : "Inativo";
}

export function getSupplierStatusTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
}

// Contato em uma célula (e-mail · telefone) — densidade honesta sem coluna extra.
export function formatSupplierContact(supplier: Pick<SupplierItem, "email" | "phone">): string {
  const email = supplier.email?.trim();
  const phone = supplier.phone?.trim();
  if (email && phone) return `${email} · ${phone}`;
  if (email) return email;
  if (phone) return phone;
  return "—";
}

export function formatSupplierDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function adaptSupplier(input: unknown): SupplierItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  return {
    id,
    name,
    document: readNullableString(item, ["document"]),
    email: readNullableString(item, ["email"]),
    phone: readNullableString(item, ["phone"]),
    address: readNullableString(item, ["address"]),
    category: readNullableString(item, ["category"]),
    notes: readNullableString(item, ["notes"]),
    status: readString(item, ["status"]) ?? "active",
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): SuppliersPagination {
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
