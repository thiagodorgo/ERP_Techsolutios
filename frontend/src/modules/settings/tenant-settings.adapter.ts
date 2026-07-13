import {
  TENANT_SETTINGS_CATEGORY_PRESENTATION,
  TENANT_SETTINGS_KEY_LABELS,
  TENANT_SETTINGS_UNCATEGORIZED,
} from "./tenant-settings.presentation";
import type {
  TenantSettingItem,
  TenantSettingsData,
  TenantSettingsGroup,
} from "./tenant-settings.types";

const UNCATEGORIZED_KEY = "__uncategorized__";

// Envelope tolerante: aceita `{ items }`, `{ data: { items } }`, `{ data: [...] }` ou array cru.
export function adaptTenantSettingsResponse(
  response: unknown,
  source: TenantSettingsData["source"] = "api",
  fallbackReason?: string,
): TenantSettingsData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];

  const items = itemsSource
    .map((item) => adaptTenantSetting(item))
    .filter((item): item is TenantSettingItem => Boolean(item));

  return { items, source, fallbackReason };
}

export function adaptTenantSettingResponse(response: unknown): TenantSettingItem | null {
  const payload = readRecord(response);
  return adaptTenantSetting(readRecord(payload?.data) ?? response);
}

// Rótulo humano do parâmetro: rótulo curado por chave conhecida OU humanização da própria key.
// A `description` do backend é mostrada à parte (helper), não vira rótulo.
export function deriveSettingLabel(item: Pick<TenantSettingItem, "key">): string {
  return TENANT_SETTINGS_KEY_LABELS[item.key] ?? humanizeSettingKey(item.key);
}

// `organization.business_name` → "Business name"; `billing.invoice_prefix` → "Invoice prefix".
// Usa só o último segmento da chave (após o último ponto) e troca separadores por espaço.
export function humanizeSettingKey(key: string): string {
  const segment = key.includes(".") ? key.slice(key.lastIndexOf(".") + 1) : key;
  const words = segment.replace(/[._-]+/g, " ").trim();
  if (!words) return key;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Agrupa por `category` (null → grupo "Outros parâmetros"), ordena grupos pela ordem de
// apresentação (fallback ao meio) e itens pelo rótulo (pt-BR).
export function groupTenantSettings(items: readonly TenantSettingItem[]): TenantSettingsGroup[] {
  const buckets = new Map<string, TenantSettingItem[]>();

  for (const item of items) {
    const bucketKey = item.category ?? UNCATEGORIZED_KEY;
    const bucket = buckets.get(bucketKey) ?? [];
    bucket.push(item);
    buckets.set(bucketKey, bucket);
  }

  const groups = [...buckets.entries()].map(([bucketKey, bucketItems]) => {
    const category = bucketKey === UNCATEGORIZED_KEY ? null : bucketKey;
    const presentation = category ? TENANT_SETTINGS_CATEGORY_PRESENTATION[category] : undefined;
    const title = presentation?.title
      ?? (category ? humanizeSettingKey(category) : TENANT_SETTINGS_UNCATEGORIZED.title);
    const order = presentation?.order ?? (category ? 50 : TENANT_SETTINGS_UNCATEGORIZED.order);
    const sortedItems = [...bucketItems].sort((a, b) =>
      deriveSettingLabel(a).localeCompare(deriveSettingLabel(b), "pt-BR"),
    );
    return { category, title, order, items: sortedItems };
  });

  return groups.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "pt-BR"));
}

export function formatSettingUpdatedAt(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function adaptTenantSetting(input: unknown): TenantSettingItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const key = readString(item, ["key"]);
  if (!key) return null;

  return {
    key,
    value: readValueAsString(item.value),
    category: readNullableString(item, ["category"]),
    description: readNullableString(item, ["description"]),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? null,
  };
}

// Valor cru → string editável. String passa direto; número/booleano viram texto; objeto vira JSON.
function readValueAsString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function readArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
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
