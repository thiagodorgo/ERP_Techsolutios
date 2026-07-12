import type {
  BranchCreatePayload,
  BranchFieldError,
  BranchItem,
  BranchStatus,
  BranchesData,
  BranchesFilters,
  BranchesPagination,
} from "./branches.types";

const NAME_MAX = 160;
const CODE_MAX = 40;

export function adaptBranchesResponse(response: unknown, source: BranchesData["source"] = "api", fallbackReason?: string): BranchesData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptBranch(item)).filter((item): item is BranchItem => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptBranchResponse(response: unknown): BranchItem | null {
  const payload = readRecord(response);
  return adaptBranch(readRecord(payload?.data) ?? response);
}

export function filterBranches(items: readonly BranchItem[], filters: { search: string; isActive: BranchesFilters["isActive"] }): BranchItem[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && item.status !== "active") return false;
    if (filters.isActive === "inactive" && item.status !== "inactive") return false;
    if (!search) return true;

    return [item.name, item.code].filter(Boolean).some((value) => normalize(String(value)).includes(search));
  });
}

export function validateBranch(input: BranchCreatePayload): BranchFieldError[] {
  const errors: BranchFieldError[] = [];

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Nome é obrigatório." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const code = (input.code ?? "").trim();
  if (!code) errors.push({ field: "code", message: "Código é obrigatório." });
  else if (code.length > CODE_MAX) errors.push({ field: "code", message: `Código deve ter no máximo ${CODE_MAX} caracteres.` });

  return errors;
}

// Situação (enum `status`) — filial é FEMININO ("Ativa"/"Inativa"). Token técnico nunca sai cru.
export function getBranchStatusLabel(status: BranchStatus | string | null | undefined): string {
  return status === "inactive" ? "Inativa" : "Ativa";
}

export function getBranchStatusTone(status: BranchStatus | string | null | undefined) {
  return status === "inactive" ? ("default" as const) : ("success" as const);
}

export function isBranchActive(status: BranchStatus | string | null | undefined): boolean {
  return status !== "inactive";
}

export function formatBranchDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function adaptBranch(input: unknown): BranchItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  const rawStatus = readString(item, ["status"]);
  // Enum fechado — qualquer valor fora de 'inactive' cai em 'active' (default honesto do backend).
  const status: BranchStatus = rawStatus === "inactive" ? "inactive" : "active";

  return {
    id,
    name,
    code: readString(item, ["code"]) ?? "",
    status,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): BranchesPagination {
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

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
