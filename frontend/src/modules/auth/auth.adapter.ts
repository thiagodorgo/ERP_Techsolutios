import { readFrontendEnv } from "../../config/env";
import type { AuthSession, AuthTenant, AuthTokenUpdate, AuthUser, LoginCredentials, UserRole } from "./types";

type LoginApiResponse = {
  readonly data: {
    readonly authenticated: boolean;
    readonly access_token?: string;
    readonly accessToken?: string;
    readonly refresh_token?: string;
    readonly refreshToken?: string;
    readonly token_type?: "Bearer";
    readonly tokenType?: "Bearer";
    readonly expires_in?: number;
    readonly expiresIn?: number;
    readonly refresh_expires_at?: string;
    readonly refreshExpiresAt?: string;
    readonly session_id?: string;
    readonly sessionId?: string;
    readonly user: {
      readonly id: string;
      readonly tenant_id: string;
      readonly email: string;
      readonly name: string;
      readonly status: string;
    };
    readonly tenant: {
      readonly id: string;
      readonly name: string;
    };
    readonly roles: readonly {
      readonly id: string;
      readonly key: string;
      readonly name: string;
    }[];
    // Permissões efetivas resolvidas pelo backend (fonte de verdade do catálogo).
    // Quando presente, o frontend a usa em vez do mapa role→permissão hardcoded.
    readonly permissions?: readonly string[];
    // B-USERS-ACESSO-SEG (F2 do backend) — sempre presente no backend novo: `true` = sessão restrita da senha
    // provisória (papéis e permissões vazios, token que só troca a senha).
    readonly must_change_password?: boolean;
  };
};

type RefreshApiResponse = {
  readonly data: {
    readonly access_token?: string;
    readonly accessToken?: string;
    readonly refresh_token?: string;
    readonly refreshToken?: string;
    readonly token_type?: "Bearer";
    readonly tokenType?: "Bearer";
    readonly expires_in?: number;
    readonly expiresIn?: number;
    readonly refresh_expires_at?: string;
    readonly refreshExpiresAt?: string;
    readonly session_id?: string;
    readonly sessionId?: string;
  };
};

export async function loginWithJwt(credentials: LoginCredentials): Promise<AuthSession> {
  const response = await fetch(`${apiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tenantId: credentials.tenantId,
      email: credentials.email,
      password: credentials.password,
    }),
  });

  if (!response.ok) {
    // B-O6R-01 — o login sem organização ganhou códigos novos (409 TENANT_SELECTION_REQUIRED,
    // 400 TENANT_ID_REQUIRED, 429 RATE_LIMITED); o corpo de erro carrega o código que distingue
    // os dois 400. Falha na leitura do corpo → mapeamento só por status.
    let errorCode: string | undefined;

    try {
      errorCode = ((await response.json()) as { error?: { code?: string } }).error?.code;
    } catch {
      errorCode = undefined;
    }

    throw new Error(readLoginErrorMessage(response.status, errorCode));
  }

  const payload = (await response.json()) as LoginApiResponse;

  if (!payload.data.authenticated) {
    throw new Error("Não foi possível autenticar com a API.");
  }

  return mapLoginResponse(payload);
}

export async function refreshWithJwt(refreshToken: string): Promise<AuthTokenUpdate> {
  const response = await fetch(`${apiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return mapTokenUpdate((await response.json()) as RefreshApiResponse);
}

export async function logoutWithJwt(refreshToken: string): Promise<void> {
  await fetch(`${apiBaseUrl()}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken,
    }),
  });
}

// ============================ B-USERS-ACESSO-SEG (T1) — troca da senha provisória ============================
// Contrato: `POST /api/v1/auth/password` com `{currentPassword, newPassword}`; o 200 revoga TODAS as sessões do par.
// RQ-6: `fetch` direto, com o `Authorization` da sessão guardada, na forma de `loginWithJwt` e `refreshWithJwt` — NUNCA
// pelo `apiRequest`, que repete a chamada depois de um refresh no 401 e contaria 2 tentativas erradas da provisória no
// bloqueio. A mensagem do servidor nunca vai à tela (vem em inglês e pode vir crua): o texto sai do mapa fixo de T.1,
// por `status` e `reason`.

export type PasswordChangeInput = {
  readonly currentPassword: string;
  readonly newPassword: string;
};

export type PasswordChangeFailure =
  | "invalid_payload"
  | "invalid_new_password"
  | "invalid_credentials"
  | "session_expired"
  | "user_inactive"
  | "credential_unavailable"
  | "account_locked"
  | "unavailable";

/** Mapa fixo de T.1 (plano do conserto do #527): PT-BR de negócio, sem termo técnico, sem eco do servidor. */
export const PASSWORD_CHANGE_MESSAGES: Readonly<Record<PasswordChangeFailure, string>> = {
  invalid_payload: "Preencha todos os campos.",
  invalid_new_password: "A nova senha precisa ter pelo menos 8 caracteres e ser diferente do seu e-mail e da senha provisória.",
  invalid_credentials: "A senha provisória não confere.",
  session_expired: "Sua sessão expirou. Entre de novo com a senha provisória.",
  user_inactive: "Seu acesso está desativado. Fale com o administrador da sua organização.",
  credential_unavailable: "Não foi possível trocar a senha por aqui. Fale com o administrador da sua organização.",
  account_locked: "Conta bloqueada por tentativas. Fale com o administrador da sua organização.",
  unavailable: "Não foi possível trocar a senha agora. Tente de novo.",
};

/** Validação local da referência aprovada: a confirmação só o cliente confere (o servidor não a recebe). */
export const PASSWORD_CONFIRMATION_MISMATCH_MESSAGE = "A confirmação não é igual à nova senha.";

/** Aviso do login depois do 200 (T.1, passo 4). */
export const PASSWORD_CHANGED_NOTICE = "Senha alterada. Entre com a nova senha.";

/**
 * A regra do servidor, espelhada (T.1): pelo menos 8 caracteres e diferente do e-mail sem diferenciar maiúsculas
 * (`validateLocalPassword`), e diferente da senha atual por comparação exata. Quem decide é o backend.
 */
export function newPasswordRuleChecks(newPassword: string, currentPassword: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  return {
    longEnough: newPassword.length >= 8,
    differsFromEmail: !normalizedEmail || newPassword.trim().toLowerCase() !== normalizedEmail,
    differsFromCurrent: newPassword !== currentPassword,
  } as const;
}

/** Prazo da troca: "tempo esgotado" do mapa de T.1 vira o texto genérico, nunca um botão girando para sempre. */
export const PASSWORD_CHANGE_TIMEOUT_MS = 30_000;

/** Corpo de erro do backend (`{ error: { code, reason, message } }`). `message` nunca vai à tela. */
export type PasswordChangeErrorBody = {
  readonly code?: string;
  readonly reason?: string;
  readonly message?: string;
};

export class PasswordChangeError extends Error {
  constructor(
    readonly failure: PasswordChangeFailure,
    message: string = PASSWORD_CHANGE_MESSAGES[failure],
  ) {
    super(message);
    this.name = "PasswordChangeError";
  }
}

/**
 * Classifica a resposta da troca. Fora do mapa de T.1: 401 com outro motivo (inclusive o `INVALID_TOKEN`, que só tem
 * `code`) é sessão vencida, porque tentar de novo com o token morto não resolve; 423 vale pelo status; todo o resto
 * (400/403 com outro motivo, 404, 429, 5xx, rede, prazo) é o texto genérico.
 */
export function classifyPasswordChangeFailure(status: number, body?: PasswordChangeErrorBody): PasswordChangeFailure {
  const reason = body?.reason;

  if (status === 400 && reason === "invalid_payload") return "invalid_payload";
  if (status === 400 && reason === "invalid_new_password") return "invalid_new_password";
  if (status === 401) return reason === "invalid_credentials" ? "invalid_credentials" : "session_expired";
  if (status === 403 && reason === "user_inactive") return "user_inactive";
  if (status === 403 && reason === "credential_unavailable") return "credential_unavailable";
  if (status === 423) return "account_locked";

  return "unavailable";
}

/** O texto fixo da resposta (status 0 = sem resposta: rede ou prazo). */
export function readPasswordChangeErrorMessage(status: number, body?: PasswordChangeErrorBody): string {
  return PASSWORD_CHANGE_MESSAGES[classifyPasswordChangeFailure(status, body)];
}

export async function changePasswordWithJwt(
  accessToken: string,
  input: PasswordChangeInput,
  options: { readonly timeoutMs?: number } = {},
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? PASSWORD_CHANGE_TIMEOUT_MS);

  try {
    let response: Response;

    try {
      response = await fetch(`${apiBaseUrl()}/auth/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
        }),
        signal: controller.signal,
      });
    } catch {
      // Rede caída ou prazo vencido: o texto genérico, nunca o erro cru.
      throw new PasswordChangeError("unavailable", readPasswordChangeErrorMessage(0));
    }

    if (response.ok) return;

    const body = await readPasswordChangeErrorBody(response);
    throw new PasswordChangeError(
      classifyPasswordChangeFailure(response.status, body),
      readPasswordChangeErrorMessage(response.status, body),
    );
  } finally {
    clearTimeout(timer);
  }
}

async function readPasswordChangeErrorBody(response: Response): Promise<PasswordChangeErrorBody> {
  try {
    const parsed: unknown = await response.json();
    const error = parsed && typeof parsed === "object" ? (parsed as { error?: unknown }).error : undefined;

    if (!error || typeof error !== "object") return {};

    const field = (key: "code" | "reason" | "message"): string | undefined => {
      const value = (error as Record<string, unknown>)[key];
      return typeof value === "string" ? value : undefined;
    };

    return { code: field("code"), reason: field("reason"), message: field("message") };
  } catch {
    // Corpo vazio, não-JSON ou cortado pelo prazo: classifica só pelo status.
    return {};
  }
}

function apiBaseUrl(): string {
  return readFrontendEnv("VITE_API_BASE_URL", "/api/v1");
}

function mapLoginResponse(payload: LoginApiResponse): AuthSession {
  const tokens = mapTokenUpdate(payload);
  const backendRoles = payload.data.roles.map((role) => role.key);
  // Prefere as permissões REAIS do backend (catálogo); só cai no mapa por papel
  // quando o backend não as envia (retrocompatível com respostas antigas/mock).
  const backendPermissions = payload.data.permissions ?? [];
  const permissions = backendPermissions.length > 0
    ? resolveFrontendPermissionsFromBackend(backendPermissions)
    : resolveFrontendPermissions(backendRoles);
  const roles = resolveFrontendRoles(backendRoles);
  const tenant: AuthTenant = {
    id: payload.data.tenant.id,
    name: payload.data.tenant.name,
  };
  const user: AuthUser = {
    id: payload.data.user.id,
    name: payload.data.user.name,
    email: payload.data.user.email,
    cognitoSubject: `local:${payload.data.user.id}`,
    roles,
    backendRoles,
    permissions,
    status: payload.data.user.status === "inactive" ? "inactive" : "active",
  };

  return {
    provider: "local-jwt",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: tokens.tokenType,
    expiresAt: tokens.expiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
    sessionId: tokens.sessionId,
    tenant,
    user,
    // RQ-1 — a falha fechada mora SÓ aqui, sobre a resposta do login: campo ausente ou diferente de `false` vira sessão
    // restrita. O portão do backend é a trava (P-SESSAO-RESTRITA); a web só leva a pessoa à troca de senha.
    mustChangePassword: payload.data.must_change_password !== false,
  };
}

function mapTokenUpdate(payload: LoginApiResponse | RefreshApiResponse): AuthTokenUpdate {
  const accessToken = payload.data.accessToken ?? payload.data.access_token;
  const refreshToken = payload.data.refreshToken ?? payload.data.refresh_token;
  const tokenType = payload.data.tokenType ?? payload.data.token_type;
  const expiresIn = payload.data.expiresIn ?? payload.data.expires_in;
  const refreshExpiresAt = payload.data.refreshExpiresAt ?? payload.data.refresh_expires_at;
  const sessionId = payload.data.sessionId ?? payload.data.session_id;

  if (!accessToken || tokenType !== "Bearer" || typeof expiresIn !== "number") {
    throw new Error("Resposta de autenticação inválida.");
  }

  return {
    accessToken,
    refreshToken,
    tokenType,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    refreshExpiresAt,
    sessionId,
  };
}

export function readLoginErrorMessage(status: number, errorCode?: string): string {
  // B-O6R-01 — códigos do login sem organização (§6.2): a UI fala "organização", nunca termo
  // técnico (§3 do CLAUDE.md).
  if (status === 400 && errorCode === "TENANT_ID_REQUIRED") {
    return "Este e-mail existe em mais de uma organização. Selecione a organização para entrar.";
  }

  if (status === 409) {
    return "Sua senha vale em mais de uma organização. Selecione a organização para entrar.";
  }

  if (status === 429) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  if (status === 400) {
    return "Revise tenant, e-mail e senha.";
  }

  if (status === 401) {
    return "Tenant, e-mail ou senha inválidos.";
  }

  if (status === 423) {
    return "Conta bloqueada. Solicite suporte ao administrador.";
  }

  return "Não foi possível autenticar agora.";
}

export function resolveFrontendRoles(backendRoles: readonly string[]): UserRole[] {
  const roles = backendRoles.map(mapBackendRole).filter((role): role is UserRole => Boolean(role));

  return [...new Set(roles)];
}

function mapBackendRole(role: string): UserRole | null {
  const normalized = role.trim().toLowerCase();

  if (normalized === "super_admin" || normalized === "platform_admin") return "Super Admin";
  if (normalized === "tenant_admin") return "Administrador";
  if (normalized === "manager") return "Gestor Operacional";
  if (normalized === "technician" || normalized === "operator" || normalized === "field_technician") return "Operador Logistico";
  if (normalized === "finance") return "Financeiro";
  if (normalized === "inventory") return "Estoque";
  if (normalized === "auditor" || normalized === "viewer") return "Auditor";
  if (normalized === "support") return "Supervisor";
  if (normalized === "field_dispatcher") return "Operação de Campo";

  return null;
}

export function resolveFrontendPermissions(backendRoles: readonly string[]): string[] {
  const backendPermissions = backendRoles.flatMap((role) => rolePermissions[role.trim().toLowerCase()] ?? []);

  return [...new Set(backendPermissions.flatMap(mapBackendPermission))];
}

// Recebe as permissões REAIS do backend (catálogo) e expande os aliases de UI
// (ex.: dashboard:read -> dashboard:view, work_orders:read -> work-orders:view), para
// que os guards que usam vocabulário mock e os que usam o real funcionem.
export function resolveFrontendPermissionsFromBackend(backendPermissions: readonly string[]): string[] {
  return [...new Set(backendPermissions.flatMap(mapBackendPermission))];
}

function mapBackendPermission(permission: string): string[] {
  const mapped = frontendPermissionAliases[permission] ?? [];

  return [permission, ...mapped];
}

const rolePermissions: Record<string, string[]> = {
  super_admin: [
    "platform:tenants:read",
    "platform:tenants:create",
    "platform:tenants:update",
    "platform:modules:manage",
    "platform:cloud-usage:read",
    "platform:cloud-costs:read",
    "platform:cloud-costs:import",
    "platform:cloud-cost-allocation:read",
    "platform:cloud-cost-allocation:run",
  ],
  platform_admin: [
    "platform:tenants:read",
    "platform:tenants:create",
    "platform:tenants:update",
    "platform:modules:manage",
    "platform:cloud-usage:read",
    "platform:cloud-costs:read",
    "platform:cloud-costs:import",
    "platform:cloud-cost-allocation:read",
    "platform:cloud-cost-allocation:run",
  ],
  tenant_admin: [
    "tenant.manage",
    "users.manage",
    "users.read",
    "roles.manage",
    "audit.read",
    "os.manage",
    "os.read",
    "inventory.manage",
    "inventory.read",
    "finance.manage",
    "finance.read",
    "tenant_checklists:read",
    "tenant_checklists:create",
    "tenant_checklists:update",
    "tenant_checklists:publish",
    "checklist_runs:read",
    "checklist_runs:create",
    "checklist_runs:update",
    "checklist_runs:complete",
    "checklist_runs:acknowledge",
    "notifications:read",
    "notifications:update",
  ],
  manager: [
    "users.read",
    "audit.read",
    "os.manage",
    "os.read",
    "inventory.read",
    "finance.read",
    "tenant_checklists:read",
    "checklist_runs:read",
    "checklist_runs:create",
    "checklist_runs:update",
    "checklist_runs:complete",
    "checklist_runs:acknowledge",
    "notifications:read",
    "notifications:update",
  ],
  technician: ["os.read", "inventory.read", "checklist_runs:read", "checklist_runs:create", "checklist_runs:update", "checklist_runs:complete", "notifications:read", "notifications:update"],
  operator: ["os.manage", "os.read", "inventory.read", "checklist_runs:read", "checklist_runs:create", "checklist_runs:update", "checklist_runs:complete", "notifications:read", "notifications:update"],
  viewer: ["users.read", "os.read", "inventory.read", "finance.read", "tenant_checklists:read", "checklist_runs:read", "notifications:read"],
  finance: ["finance.manage", "finance.read", "os.read", "notifications:read", "notifications:update"],
  inventory: ["inventory.manage", "inventory.read", "os.read", "notifications:read", "notifications:update"],
  field_technician: ["os.read", "inventory.read", "notifications:read", "notifications:update"],
  auditor: ["users.read", "audit.read", "os.read", "inventory.read", "finance.read", "tenant_checklists:read", "checklist_runs:read", "notifications:read"],
  support: ["users.read", "audit.read", "os.read", "tenant_checklists:read", "checklist_runs:read", "notifications:read"],
  field_dispatcher: [
    "os.read",
    "work_orders:read",
    "work_orders:create",
    "work_orders:assign",
    "work_orders:status",
    "field_dispatch:read",
    "field_dispatch:create",
    "field_dispatch:update",
    "field_dispatch:cancel",
    "field_dispatch:reassign",
    "field_operator:read",
    "field_location:read",
    "field_location:history",
    "notifications:read",
    "notifications:update",
    "logistics:dispatch",
  ],
};

const frontendPermissionAliases: Record<string, string[]> = {
  "tenant.manage": ["tenant:manage"],
  "users.manage": ["users:read"],
  "users.read": ["users:read"],
  "audit.read": ["audit:view"],
  "os.manage": [
    "work_orders:read",
    "work_orders:create",
    "work_orders:update",
    "work_orders:assign",
    "work_orders:status",
    "work_orders:cancel",
    "work-orders:view",
    "work-orders:create",
    "work-orders:update",
    "logistics:dispatch",
  ],
  "os.read": ["work-orders:view"],
};
