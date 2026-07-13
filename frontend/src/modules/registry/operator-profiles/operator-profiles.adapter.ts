import type {
  OperatorProfileCreatePayload,
  OperatorProfileFieldError,
  OperatorProfileItem,
  OperatorProfilesData,
  OperatorProfilesFilters,
  OperatorProfilesPagination,
} from "./operator-profiles.types";

const FULL_NAME_MAX = 160;
const CNH_NUMBER_MAX = 20;
const CNH_CATEGORY_MAX = 8;
const PHONE_MIN = 8;
const PHONE_MAX = 20;
const NOTES_MAX = 2000;
const USER_ID_MAX = 64;

// Tom dos selos (subconjunto do Tone do Chip): cinza (neutro) · verde (sucesso) · âmbar (atenção).
export type ProfileChipTone = "default" | "success" | "warning";

export function adaptOperatorProfilesResponse(
  response: unknown,
  source: OperatorProfilesData["source"] = "api",
  fallbackReason?: string,
): OperatorProfilesData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptOperatorProfile(item)).filter((item): item is OperatorProfileItem => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptOperatorProfileResponse(response: unknown): OperatorProfileItem | null {
  const payload = readRecord(response);
  return adaptOperatorProfile(readRecord(payload?.data) ?? response);
}

export function filterOperatorProfiles(
  items: readonly OperatorProfileItem[],
  filters: { search: string; isActive: OperatorProfilesFilters["isActive"]; hasConsent?: OperatorProfilesFilters["hasConsent"] },
): OperatorProfileItem[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (filters.hasConsent === "with" && !item.trackingConsent) return false;
    if (filters.hasConsent === "without" && item.trackingConsent) return false;
    if (!search) return true;

    // Busca client-side cobre nome, categoria, telefone e o ID do usuário. O NÚMERO da CNH não vem na
    // lista (LGPD) — a busca por número é feita server-side (validator `search` do backend cobre cnhNumber).
    return [item.fullName, item.cnhCategory, item.phone, item.userId]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateOperatorProfile(input: OperatorProfileCreatePayload): OperatorProfileFieldError[] {
  const errors: OperatorProfileFieldError[] = [];

  const userId = (input.userId ?? "").trim();
  if (!userId) errors.push({ field: "userId", message: "Informe o ID do usuário." });
  else if (userId.length > USER_ID_MAX) errors.push({ field: "userId", message: `ID do usuário deve ter no máximo ${USER_ID_MAX} caracteres.` });

  const fullName = (input.fullName ?? "").trim();
  if (fullName.length > FULL_NAME_MAX) errors.push({ field: "fullName", message: `Nome deve ter no máximo ${FULL_NAME_MAX} caracteres.` });

  const cnhNumber = (input.cnhNumber ?? "").trim();
  if (cnhNumber.length > CNH_NUMBER_MAX) errors.push({ field: "cnhNumber", message: `Número da CNH deve ter no máximo ${CNH_NUMBER_MAX} caracteres.` });

  const cnhCategory = (input.cnhCategory ?? "").trim();
  if (cnhCategory.length > CNH_CATEGORY_MAX) errors.push({ field: "cnhCategory", message: `Categoria da CNH deve ter no máximo ${CNH_CATEGORY_MAX} caracteres.` });

  if (input.cnhExpiresAt && !parseDate(input.cnhExpiresAt)) {
    errors.push({ field: "cnhExpiresAt", message: "Validade da CNH deve ser uma data válida." });
  }

  const phone = (input.phone ?? "").trim();
  if (phone && (phone.length < PHONE_MIN || phone.length > PHONE_MAX)) {
    errors.push({ field: "phone", message: `Telefone deve ter entre ${PHONE_MIN} e ${PHONE_MAX} caracteres.` });
  }

  const notes = input.notes ?? "";
  if (notes.length > NOTES_MAX) errors.push({ field: "notes", message: `Observações devem ter no máximo ${NOTES_MAX} caracteres.` });

  return errors;
}

// Situação de cadastro (isActive) — profissional é MASCULINO ("Ativo"/"Inativo").
export function getOperatorProfileStatusLabel(isActive: boolean): string {
  return isActive ? "Ativo" : "Inativo";
}

export function getOperatorProfileStatusTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
}

// Nome de exibição do profissional — fallback honesto "—" quando não há nome (nunca inventa nome
// a partir do userId, que é opaco).
export function getOperatorProfileDisplayName(profile: Pick<OperatorProfileItem, "fullName">): string {
  const name = (profile.fullName ?? "").trim();
  return name || "—";
}

// ID do usuário abreviado para exibição (é um UUID) — mostra o primeiro segmento; o valor completo
// vai no atributo `title`. Nunca traduz o ID para um nome.
export function formatUserIdShort(userId: string | null | undefined): string {
  const value = (userId ?? "").trim();
  if (!value) return "—";
  const firstSegment = value.split("-")[0];
  return firstSegment.length >= 6 ? firstSegment : value.slice(0, 8);
}

// Selo da CNH: âmbar "Vencida" se a validade já passou · verde "Válida até dd/mm/aaaa" se em dia ·
// cinza "Sem CNH" quando não há CNH. Deriva de `hasCnh` (sinal do list DTO — LGPD, sem o número cru) +
// a validade. `now` é injetável para teste determinístico.
export function formatCnhStatus(
  hasCnh: boolean,
  cnhExpiresAt: string | null | undefined,
  now: Date = new Date(),
): { label: string; tone: ProfileChipTone } {
  if (!hasCnh) return { label: "Sem CNH", tone: "default" };

  const expires = parseDate(cnhExpiresAt);
  if (!expires) return { label: "Sem validade", tone: "default" };

  // Compara só a data (UTC), zerando horas — vencida se a validade caiu ANTES de hoje.
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expiry = Date.UTC(expires.getUTCFullYear(), expires.getUTCMonth(), expires.getUTCDate());
  if (expiry < today) return { label: "Vencida", tone: "warning" };

  return { label: `Válida até ${formatProfileDate(cnhExpiresAt)}`, tone: "success" };
}

// Selo de rastreamento (LGPD): verde "Consentido em dd/mm/aaaa" quando o operador consentiu ·
// cinza "Sem consentimento" caso contrário. O consentimento é um REGISTRO do operador, não presunção.
export function formatConsentStatus(
  trackingConsent: boolean,
  trackingConsentAt: string | null | undefined,
): { label: string; tone: ProfileChipTone } {
  if (!trackingConsent) return { label: "Sem consentimento", tone: "default" };
  const when = formatProfileDate(trackingConsentAt);
  return { label: when !== "—" ? `Consentido em ${when}` : "Consentido", tone: "success" };
}

// Formata datas de domínio (validade/consentimento) sem hora, em UTC (não desloca o dia pelo fuso).
export function formatProfileDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function adaptOperatorProfile(input: unknown): OperatorProfileItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const userId = readString(item, ["userId", "user_id"]);
  if (!id || !userId) return null;

  return {
    id,
    userId,
    fullName: readNullableString(item, ["fullName", "full_name"]),
    // `cnhNumber` só existe no DETALHE; na lista é null. `hasCnh` vem da lista (sinal p/ o selo) ou é
    // derivado da presença do número no detalhe.
    cnhNumber: readNullableString(item, ["cnhNumber", "cnh_number"]),
    hasCnh: readBoolean(item, ["hasCnh", "has_cnh"]) ?? Boolean(readString(item, ["cnhNumber", "cnh_number"])),
    cnhCategory: readNullableString(item, ["cnhCategory", "cnh_category"]),
    cnhExpiresAt: readNullableString(item, ["cnhExpiresAt", "cnh_expires_at"]),
    trackingConsent: readBoolean(item, ["trackingConsent", "tracking_consent"]) ?? false,
    trackingConsentAt: readNullableString(item, ["trackingConsentAt", "tracking_consent_at"]),
    phone: readNullableString(item, ["phone"]),
    notes: readNullableString(item, ["notes"]),
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): OperatorProfilesPagination {
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
