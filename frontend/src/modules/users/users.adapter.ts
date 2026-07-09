import { resolveFrontendRoles } from "../auth/auth.adapter";
import type {
  User,
  UserField,
  UserFieldError,
  UsersData,
  UsersPagination,
  UsersStatusFilter,
  UserStatus,
} from "./users.types";

const NAME_MAX = 160;
const EMAIL_MAX = 254;

// ── Situação: token técnico -> rótulo PT-BR + tom do Chip ─────────────────────
// Enum real do backend é active|inactive; "invited" fica mapeado por robustez (nunca fabricado).
// inactive usa o tom neutro (muted) — o design system não expõe um tom "muted" dedicado.
const USER_STATUS_META: Record<UserStatus, { label: string; tone: "default" | "success" | "warning" }> = {
  active: { label: "Ativo", tone: "success" },
  inactive: { label: "Inativo", tone: "default" },
  invited: { label: "Convidado", tone: "warning" },
};

export function getUserStatusLabel(status: UserStatus): string {
  return USER_STATUS_META[status]?.label ?? "—";
}

export function getUserStatusTone(status: UserStatus) {
  return USER_STATUS_META[status]?.tone ?? ("default" as const);
}

// ── Papéis: reutiliza o mapa canônico chave->rótulo PT-BR (auth.adapter, fonte única) ─
// Nunca inventa rótulo: papel sem mapeamento cai na própria chave (não some da tela).
export function roleLabel(key: string): string {
  return resolveFrontendRoles([key])[0] ?? key;
}

// Papéis atribuíveis a usuários da organização (RBAC_MATRIX) com rótulos distintos.
// Papéis de plataforma (super_admin/platform_admin) não entram — não são atribuídos por tenant.
const ASSIGNABLE_ROLE_KEYS = [
  "tenant_admin",
  "manager",
  "operator",
  "finance",
  "auditor",
  "support",
  "field_dispatcher",
] as const;

export const USER_ROLE_OPTIONS: readonly { value: string; label: string }[] = ASSIGNABLE_ROLE_KEYS.map((value) => ({
  value,
  label: roleLabel(value),
}));

// Junta os papéis do usuário em rótulos PT-BR (dedup preservando ordem), "—" quando vazio.
export function formatUserRoles(roles: readonly string[] | undefined): string {
  if (!roles || roles.length === 0) return "—";
  const labels = [...new Set(roles.map((role) => roleLabel(role)))];
  return labels.length > 0 ? labels.join(" · ") : "—";
}

// ── Adaptação de resposta (envelope {data} + snake_case/camelCase → DTO) ───────
export function adaptUsersResponse(response: unknown, source: UsersData["source"] = "api", fallbackReason?: string): UsersData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptUser(item)).filter((item): item is User => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptUserResponse(response: unknown): User | null {
  const payload = readRecord(response);
  return adaptUser(readRecord(payload?.data) ?? response);
}

function adaptUser(input: unknown): User | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  const email = readString(item, ["email"]);
  if (!id || !name) return null;

  return {
    id,
    name,
    email: email ?? "",
    roles: adaptRoleKeys(item.roles),
    branchIds: adaptStringList(item.branchIds ?? item.branch_ids),
    status: coerceStatus(readString(item, ["status"])),
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

// Papéis podem vir como strings ("tenant_admin") ou objetos ({key|name|role|id}). Normaliza para chaves.
function adaptRoleKeys(value: unknown): string[] {
  const list = readArray(value) ?? [];
  const keys: string[] = [];
  for (const entry of list) {
    if (typeof entry === "string" && entry.trim()) {
      keys.push(entry.trim());
      continue;
    }
    const record = readRecord(entry);
    const key = record ? readString(record, ["key", "role", "name", "id"]) : undefined;
    if (key) keys.push(key);
  }
  return [...new Set(keys)];
}

function adaptStringList(value: unknown): string[] {
  const list = readArray(value) ?? [];
  return list.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim());
}

function coerceStatus(value: string | undefined): UserStatus {
  if (value === "active" || value === "inactive" || value === "invited") return value;
  return "active";
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): UsersPagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
}

// ── Filtro (client-side sobre a janela carregada) ─────────────────────────────
export function filterUsers(items: readonly User[], filters: { search: string; isActive: UsersStatusFilter }): User[] {
  const search = normalize(filters.search);

  return items.filter((user) => {
    if (filters.isActive === "active" && user.status !== "active") return false;
    if (filters.isActive === "inactive" && user.status === "active") return false;
    if (!search) return true;

    return [user.name, user.email, formatUserRoles(user.roles)]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

// ── KPIs reais da janela (renderizam mesmo vazio — nunca números fixos) ───────
export type UserTotals = {
  readonly total: number;
  readonly ativos: number;
  readonly inativos: number;
  readonly convidados: number;
  readonly papeis: number;
};

export function computeUserTotals(items: readonly User[]): UserTotals {
  let ativos = 0;
  let inativos = 0;
  let convidados = 0;
  const roleSet = new Set<string>();

  for (const user of items) {
    if (user.status === "active") ativos += 1;
    else if (user.status === "invited") convidados += 1;
    else inativos += 1;
    for (const role of user.roles) roleSet.add(role);
  }

  return { total: items.length, ativos, inativos, convidados, papeis: roleSet.size };
}

// ── Validação de formulário ───────────────────────────────────────────────────
export function validateUser(input: { name?: string; email?: string; roles?: readonly string[] }, options: { isEdit?: boolean } = {}): UserFieldError[] {
  const errors: UserFieldError[] = [];

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Nome é obrigatório." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  // E-mail é imutável na edição (PATCH não aceita e-mail) — só validado na criação.
  if (!options.isEdit) {
    const email = (input.email ?? "").trim();
    if (!email) errors.push({ field: "email", message: "E-mail é obrigatório." });
    else if (email.length > EMAIL_MAX || !isEmail(email)) errors.push({ field: "email", message: "E-mail inválido." });
  }

  if (!input.roles || input.roles.length === 0) errors.push({ field: "roles", message: "Selecione ao menos um papel." });

  return errors;
}

// ── Interpretação dos erros de domínio ({error:{reason}}) ─────────────────────
// A ApiError não expõe o corpo cru; motivos explícitos (testes/integração) mapeiam campo+mensagem.
export type UserSubmitContext = "create" | "update";

export type UserSubmitFeedback = {
  readonly reason?: string;
  readonly field?: UserField;
  readonly message: string;
};

export const USER_REASON_FEEDBACK: Record<string, UserSubmitFeedback> = {
  invalid_role: {
    reason: "invalid_role",
    field: "roles",
    message: "Papel inválido para esta organização. Revise os papéis selecionados.",
  },
  user_role_required: {
    reason: "user_role_required",
    field: "roles",
    message: "Selecione ao menos um papel.",
  },
  invalid_user_email: {
    reason: "invalid_user_email",
    field: "email",
    message: "E-mail inválido.",
  },
  user_name_required: {
    reason: "user_name_required",
    field: "name",
    message: "Nome é obrigatório.",
  },
  invalid_user_status: {
    reason: "invalid_user_status",
    field: "status",
    message: "Situação inválida. Use Ativo ou Inativo.",
  },
  user_not_found: {
    reason: "user_not_found",
    message: "Usuário não encontrado. Atualize a lista e tente novamente.",
  },
};

const FALLBACK_MESSAGE: Record<UserSubmitContext, string> = {
  create: "Não foi possível salvar o usuário. Tente novamente.",
  update: "Não foi possível atualizar o usuário. Tente novamente.",
};

function resolveUserReason(explicitReason: string | undefined, status: number | undefined): string | undefined {
  if (explicitReason) return explicitReason;
  // 404 é inequívoco (usuário inexistente); 400 é ambíguo (papel × nome × e-mail) sem o motivo do corpo.
  if (status === 404) return "user_not_found";
  return undefined;
}

export function interpretUserSubmitError(error: unknown, context: UserSubmitContext = "create"): UserSubmitFeedback {
  const reason = resolveUserReason(readErrorReason(error), readErrorStatus(error));
  if (reason && USER_REASON_FEEDBACK[reason]) return USER_REASON_FEEDBACK[reason];

  if (error instanceof Error && error.message) return { message: error.message };
  return { message: FALLBACK_MESSAGE[context] };
}

// ── Formatação de data ────────────────────────────────────────────────────────
export function formatUserDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

// ── Helpers de leitura tolerante ──────────────────────────────────────────────
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readErrorReason(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    const direct = (error as { reason?: unknown }).reason;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const nested = readRecord((error as { error?: unknown }).error);
    const nestedReason = nested?.reason;
    if (typeof nestedReason === "string" && nestedReason.trim()) return nestedReason.trim();
  }
  return undefined;
}

function readErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
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
