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
    throw new Error(readLoginErrorMessage(response.status));
  }

  const payload = (await response.json()) as LoginApiResponse;

  if (!payload.data.authenticated) {
    throw new Error("Nao foi possivel autenticar com a API.");
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
    throw new Error("Sessao expirada. Faca login novamente.");
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

function apiBaseUrl(): string {
  return readFrontendEnv("VITE_API_BASE_URL", "/api/v1");
}

function mapLoginResponse(payload: LoginApiResponse): AuthSession {
  const tokens = mapTokenUpdate(payload);
  const backendRoles = payload.data.roles.map((role) => role.key);
  const permissions = resolveFrontendPermissions(backendRoles);
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
    throw new Error("Resposta de autenticacao invalida.");
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

function readLoginErrorMessage(status: number): string {
  if (status === 400) {
    return "Revise tenant, e-mail e senha.";
  }

  if (status === 401) {
    return "Tenant, e-mail ou senha invalidos.";
  }

  if (status === 423) {
    return "Conta bloqueada. Solicite suporte ao administrador.";
  }

  return "Nao foi possivel autenticar agora.";
}

function resolveFrontendRoles(backendRoles: readonly string[]): UserRole[] {
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
  if (normalized === "auditor" || normalized === "viewer") return "Auditor";
  if (normalized === "support") return "Supervisor";

  return null;
}

function resolveFrontendPermissions(backendRoles: readonly string[]): string[] {
  const backendPermissions = backendRoles.flatMap((role) => rolePermissions[role.trim().toLowerCase()] ?? []);

  return [...new Set(["dashboard:view", ...backendPermissions.flatMap(mapBackendPermission)])];
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
    "platform:cloud-charges:read",
    "platform:cloud-charges:calculate",
    "platform:cloud-charge-rules:read",
    "platform:cloud-charge-rules:write",
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
    "platform:cloud-charges:read",
    "platform:cloud-charges:calculate",
    "platform:cloud-charge-rules:read",
    "platform:cloud-charge-rules:write",
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
  "os.read": ["work_orders:read", "work-orders:view"],
};
