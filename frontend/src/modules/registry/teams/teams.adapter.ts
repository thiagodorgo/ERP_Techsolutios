import type {
  Team,
  TeamCreatePayload,
  TeamFieldError,
  TeamMember,
  TeamsData,
  TeamsFilters,
  TeamsPagination,
  TenantUser,
} from "./teams.types";

const NAME_MAX = 120;
const STATUS_MAX = 40;
const NOTES_MAX = 2000;

export function adaptTeamsResponse(response: unknown, source: TeamsData["source"] = "api", fallbackReason?: string): TeamsData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptTeam(item)).filter((item): item is Team => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptTeamResponse(response: unknown): Team | null {
  const payload = readRecord(response);
  return adaptTeam(readRecord(payload?.data) ?? response);
}

export function adaptTenantUsersResponse(response: unknown): TenantUser[] {
  const payload = readRecord(response);
  const source = Array.isArray(response) ? response : readArray(payload?.data) ?? readArray(payload?.items) ?? [];
  return source.map((item) => adaptTenantUser(item)).filter((item): item is TenantUser => Boolean(item));
}

export function filterTeams(items: readonly Team[], filters: TeamsFilters): Team[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (!search) return true;

    return [item.name, getTeamOperationalStatusLabel(item.status)]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateTeam(input: TeamCreatePayload): TeamFieldError[] {
  const errors: TeamFieldError[] = [];

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Nome da equipe é obrigatório." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const status = (input.status ?? "").trim();
  if (status && status.length > STATUS_MAX) errors.push({ field: "status", message: `Situação operacional deve ter no máximo ${STATUS_MAX} caracteres.` });

  const notes = input.notes ?? "";
  if (notes.length > NOTES_MAX) errors.push({ field: "notes", message: `Observações devem ter no máximo ${NOTES_MAX} caracteres.` });

  return errors;
}

// Situação (isActive) da equipe — feminino: Ativa/Inativa.
export function getTeamStatusLabel(isActive: boolean): string {
  return isActive ? "Ativa" : "Inativa";
}

export function getTeamStatusTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
}

// Situação operacional da equipe (token técnico -> rótulo PT-BR; nunca exibir o token cru).
// Rótulos distintos do chip de situação (Ativa/Inativa) para não colidir na tabela.
export const TEAM_STATUS_OPTIONS = [
  { value: "active", label: "Operacional" },
  { value: "forming", label: "Em formação" },
  { value: "inactive", label: "Desmobilizada" },
] as const;

export function getTeamOperationalStatusLabel(status: string | null | undefined): string {
  return TEAM_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Operacional";
}

export function formatTeamMemberCount(team: Pick<Team, "memberCount" | "members">): number {
  return team.memberCount ?? team.members.length;
}

export function formatTeamDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function adaptTeam(input: unknown): Team | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  const members = (readArray(item.members) ?? [])
    .map((member) => adaptTeamMember(member))
    .filter((member): member is TeamMember => Boolean(member));

  return {
    id,
    name,
    leaderUserId: readNullableString(item, ["leaderUserId", "leader_user_id"]),
    status: readString(item, ["status"]) ?? "active",
    notes: readNullableString(item, ["notes"]),
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    memberCount: readNullableNumber(item, ["memberCount", "member_count"]) ?? (members.length > 0 ? members.length : null),
    members,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptTeamMember(input: unknown): TeamMember | null {
  const item = readRecord(input);
  if (!item) return null;

  const userId = readString(item, ["userId", "user_id"]);
  if (!userId) return null;

  return {
    id: readString(item, ["id"]) ?? userId,
    userId,
    userName: readNullableString(item, ["userName", "user_name", "name"]),
    roleInTeam: readNullableString(item, ["roleInTeam", "role_in_team", "role"]),
  };
}

function adaptTenantUser(input: unknown): TenantUser | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  const roles = readArray(item.roles) ?? [];

  return {
    id,
    name,
    email: readNullableString(item, ["email"]),
    roles: roles.filter((role): role is string => typeof role === "string" && role.trim().length > 0).map((role) => role.trim()),
    status: readNullableString(item, ["status"]),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): TeamsPagination {
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

function readNullableNumber(input: Record<string, unknown>, keys: readonly string[]): number | null {
  return readNumber(input, keys) ?? null;
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
