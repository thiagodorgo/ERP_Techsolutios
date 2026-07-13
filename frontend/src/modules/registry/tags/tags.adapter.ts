import type {
  TagCreatePayload,
  TagFieldError,
  TagItem,
  TagsData,
  TagsFilters,
  TagsPagination,
} from "./tags.types";

const NAME_MAX = 120;
const DESCRIPTION_MAX = 500;

// Normaliza uma cor digitada para `#rrggbb` minúsculo. Aceita com/sem `#`, forma curta (#rgb) ou
// completa (#rrggbb). Retorna null quando o valor não é um hexadecimal de cor válido.
export function normalizeHexColor(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const raw = value.trim();
  if (!raw) return null;
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const [r, g, b] = hex.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex.toLowerCase()}`;
  return null;
}

export function adaptTagsResponse(response: unknown, source: TagsData["source"] = "api", fallbackReason?: string): TagsData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptTag(item)).filter((item): item is TagItem => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptTagResponse(response: unknown): TagItem | null {
  const payload = readRecord(response);
  return adaptTag(readRecord(payload?.data) ?? response);
}

export function filterTags(items: readonly TagItem[], filters: { search: string; isActive: TagsFilters["isActive"] }): TagItem[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (!search) return true;

    return [item.name, item.color, item.description]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateTag(input: TagCreatePayload): TagFieldError[] {
  const errors: TagFieldError[] = [];

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Nome é obrigatório." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const color = (input.color ?? "").trim();
  if (color && !normalizeHexColor(color)) {
    errors.push({ field: "color", message: "Cor deve ser um hexadecimal válido (ex.: #3B82F6)." });
  }

  const description = input.description ?? "";
  if (description.length > DESCRIPTION_MAX) {
    errors.push({ field: "description", message: `Descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.` });
  }

  return errors;
}

// Situação de cadastro (isActive) — etiqueta é FEMININO ("Ativa"/"Inativa").
export function getTagStatusLabel(isActive: boolean): string {
  return isActive ? "Ativa" : "Inativa";
}

export function getTagStatusTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
}

// Hex em maiúsculas para a coluna Cor (mono); "—" quando a etiqueta não tem cor.
export function formatTagColor(color: string | null | undefined): string {
  const normalized = normalizeHexColor(color);
  return normalized ? normalized.toUpperCase() : "—";
}

// Trunca a descrição para a densidade da lista; o texto completo fica no `title` da célula.
export function truncateText(value: string | null | undefined, max = 80): string {
  const text = (value ?? "").trim();
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function formatTagDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function adaptTag(input: unknown): TagItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  return {
    id,
    name,
    color: normalizeHexColor(readNullableString(item, ["color"])),
    description: readNullableString(item, ["description"]),
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): TagsPagination {
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
