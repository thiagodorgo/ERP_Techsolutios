import type {
  DailyCap,
  DailyModel,
  ProfileDefaults,
  ProfileDetail,
  ProfileItem,
  ProfileScope,
  ProfilesData,
  ProfilesFilters,
  ProfilesPagination,
  ReleaseRequirement,
} from "./profiles.types";

const NAME_MAX = 160;

const SCOPES: readonly ProfileScope[] = ["PUBLIC_AGREEMENT", "PRIVATE_CONTRACT"];
const DAILY_MODELS: readonly DailyModel[] = ["ROLLING_24H", "CALENDAR"];
const DAILY_CAPS: readonly DailyCap[] = ["SIX_MONTHS", "THIRTY_DAYS_LEGACY", "UNLIMITED"];

// Rótulos PT-BR de fallback (o backend já devolve *Label; reusa quando presente). Neutralidade white-label.
const SCOPE_LABELS: Record<ProfileScope, string> = {
  PUBLIC_AGREEMENT: "Convênio público",
  PRIVATE_CONTRACT: "Contrato privado",
};
const DAILY_MODEL_LABELS: Record<DailyModel, string> = {
  ROLLING_24H: "24 horas corridas",
  CALENDAR: "Dia-calendário",
};
const DAILY_CAP_LABELS: Record<DailyCap, string> = {
  SIX_MONTHS: "6 meses (art. 271 §10)",
  THIRTY_DAYS_LEGACY: "30 diárias (Tema 124)",
  UNLIMITED: "Ilimitado (contratual)",
};

export function getScopeLabel(scope: ProfileScope | string | null | undefined): string {
  return SCOPE_LABELS[(scope ?? "PUBLIC_AGREEMENT") as ProfileScope] ?? "Convênio público";
}

export function getScopeTone(scope: ProfileScope | string | null | undefined) {
  return scope === "PRIVATE_CONTRACT" ? ("audit" as const) : ("info" as const);
}

export function getDailyModelLabel(model: DailyModel | string | null | undefined): string {
  return DAILY_MODEL_LABELS[(model ?? "ROLLING_24H") as DailyModel] ?? "24 horas corridas";
}

export function getDailyCapLabel(cap: DailyCap | string | null | undefined): string {
  return DAILY_CAP_LABELS[(cap ?? "SIX_MONTHS") as DailyCap] ?? "6 meses (art. 271 §10)";
}

export function getProfileActiveLabel(active: boolean): string {
  return active ? "Ativo" : "Inativo";
}

export function getProfileActiveTone(active: boolean) {
  return active ? ("success" as const) : ("default" as const);
}

export function adaptProfilesResponse(response: unknown, source: ProfilesData["source"] = "api", fallbackReason?: string): ProfilesData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptProfileItem(item)).filter((item): item is ProfileItem => Boolean(item));

  return { items, pagination: adaptPagination(payload, dataRecord, items.length), source, fallbackReason };
}

export function adaptProfileDetailResponse(response: unknown): ProfileDetail | null {
  const payload = readRecord(response);
  const item = readRecord(payload?.data) ?? readRecord(response);
  if (!item) return null;
  const base = adaptProfileItem(item);
  if (!base) return null;

  const rawModel = readString(item, ["dailyModel", "daily_model"]);
  const dailyModel = (rawModel && DAILY_MODELS.includes(rawModel as DailyModel) ? rawModel : "ROLLING_24H") as DailyModel;

  return {
    ...base,
    ownerNotifDays: readNumber(item, ["ownerNotifDays", "owner_notif_days"]) ?? 10,
    noticeEdictDay: readNumber(item, ["noticeEdictDay", "notice_edict_day"]) ?? 30,
    auctionEligibleDay: readNumber(item, ["auctionEligibleDay", "auction_eligible_day"]) ?? 60,
    auctionEdictBusinessDays: readNumber(item, ["auctionEdictBusinessDays", "auction_edict_business_days"]) ?? 15,
    dailyModelLabel: readString(item, ["dailyModelLabel"]) ?? getDailyModelLabel(dailyModel),
    releaseRequirements: adaptReleaseRequirements(item.releaseRequirements ?? item.release_requirements),
    notes: readString(item, ["notes"]) ?? null,
  };
}

export function adaptProfileDefaultsResponse(response: unknown): ProfileDefaults | null {
  const payload = readRecord(response);
  const item = readRecord(payload?.data) ?? readRecord(response);
  if (!item) return null;

  const rawScope = readString(item, ["scope"]);
  const scope = (rawScope && SCOPES.includes(rawScope as ProfileScope) ? rawScope : "PUBLIC_AGREEMENT") as ProfileScope;
  const rawModel = readString(item, ["dailyModel", "daily_model"]);
  const dailyModel = (rawModel && DAILY_MODELS.includes(rawModel as DailyModel) ? rawModel : "ROLLING_24H") as DailyModel;
  const rawCap = readString(item, ["dailyCap", "daily_cap"]);
  const dailyCap = (rawCap && DAILY_CAPS.includes(rawCap as DailyCap) ? rawCap : "SIX_MONTHS") as DailyCap;

  return {
    scope,
    scopeLabel: readString(item, ["scopeLabel"]) ?? getScopeLabel(scope),
    ownerNotifDays: readNumber(item, ["ownerNotifDays", "owner_notif_days"]) ?? 10,
    noticeEdictDay: readNumber(item, ["noticeEdictDay", "notice_edict_day"]) ?? 30,
    auctionEligibleDay: readNumber(item, ["auctionEligibleDay", "auction_eligible_day"]) ?? 60,
    auctionEdictBusinessDays: readNumber(item, ["auctionEdictBusinessDays", "auction_edict_business_days"]) ?? 15,
    dailyModel,
    dailyModelLabel: readString(item, ["dailyModelLabel"]) ?? getDailyModelLabel(dailyModel),
    dailyCap,
    dailyCapLabel: readString(item, ["dailyCapLabel"]) ?? getDailyCapLabel(dailyCap),
  };
}

export function filterProfiles(items: readonly ProfileItem[], filters: { search: string; isActive: ProfilesFilters["isActive"] }): ProfileItem[] {
  const search = normalize(filters.search);
  return items.filter((item) => {
    if (filters.isActive === "active" && !item.active) return false;
    if (filters.isActive === "inactive" && item.active) return false;
    if (!search) return true;
    return [item.name, getScopeLabel(item.scope), getDailyCapLabel(item.dailyCap)].filter(Boolean).some((value) => normalize(String(value)).includes(search));
  });
}

export function validateProfileName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Nome é obrigatório.";
  if (trimmed.length > NAME_MAX) return `Nome deve ter no máximo ${NAME_MAX} caracteres.`;
  return null;
}

function adaptProfileItem(input: unknown): ProfileItem | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  const rawScope = readString(item, ["scope"]);
  const scope = (rawScope && SCOPES.includes(rawScope as ProfileScope) ? rawScope : "PUBLIC_AGREEMENT") as ProfileScope;
  const rawModel = readString(item, ["dailyModel", "daily_model"]);
  const dailyModel = (rawModel && DAILY_MODELS.includes(rawModel as DailyModel) ? rawModel : "ROLLING_24H") as DailyModel;
  const rawCap = readString(item, ["dailyCap", "daily_cap"]);
  const dailyCap = (rawCap && DAILY_CAPS.includes(rawCap as DailyCap) ? rawCap : "SIX_MONTHS") as DailyCap;

  return {
    id,
    name,
    scope,
    scopeLabel: readString(item, ["scopeLabel"]) ?? getScopeLabel(scope),
    dailyModel,
    dailyCap,
    dailyCapLabel: readString(item, ["dailyCapLabel"]) ?? getDailyCapLabel(dailyCap),
    active: readBoolean(item, ["active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptReleaseRequirements(value: unknown): ReleaseRequirement[] {
  if (!Array.isArray(value)) return [];
  const requirements: ReleaseRequirement[] = [];
  for (const raw of value) {
    const record = readRecord(raw);
    const code = readString(record, ["code"]);
    const label = readString(record, ["label"]);
    if (!code || !label) continue;
    requirements.push({ code, label, required: readBoolean(record, ["required"]) ?? false });
  }
  return requirements;
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): ProfilesPagination {
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

function readNumber(input: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readBoolean(input: Record<string, unknown> | undefined, keys: readonly string[]): boolean | undefined {
  if (!input) return undefined;
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
