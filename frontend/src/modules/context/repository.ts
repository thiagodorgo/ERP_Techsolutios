import { isMockMode, readFrontendEnv } from "../../config/env";
import { mockTenantContexts } from "../../mocks/auth/context";
import { resolveFrontendPermissions, resolveFrontendRoles } from "../auth/auth.adapter";
import { getStoredAuthSession, getStoredToken, setStoredAuthSession } from "../auth/auth.storage";
import type { AuthSession } from "../auth/types";
import type { TenantContext } from "./types";

type MeTenantsMembership = {
  readonly tenant: { readonly id: string; readonly name: string; readonly status: string };
  readonly user: { readonly id: string; readonly roles: readonly string[]; readonly status: string };
};

type ActiveTenantResponse = {
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
    readonly tenant: { readonly id: string; readonly name: string };
    readonly user: { readonly id: string; readonly name: string; readonly email: string };
    readonly roles: readonly string[];
  };
};

export async function listAvailableContexts(): Promise<TenantContext[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 250));

  if (isMockMode()) {
    return mockTenantContexts;
  }

  const token = getStoredToken();

  if (!token) {
    return [];
  }

  const response = await fetch(`${apiBaseUrl()}/me/tenants`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const session = getStoredAuthSession();
    if (!session?.tenant) return [];
    return [sessionToContext(session)];
  }

  const payload = (await response.json()) as { data: MeTenantsMembership[] };

  return payload.data.map(membershipToContext);
}

export async function switchTenantContext(tenantId: string): Promise<AuthSession> {
  const token = getStoredToken();
  const currentSession = getStoredAuthSession();

  if (!token || !currentSession) {
    throw new Error("Sessão não encontrada. Faça login novamente.");
  }

  const response = await fetch(`${apiBaseUrl()}/auth/active-tenant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tenantId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "Não foi possível trocar de tenant.");
  }

  const payload = (await response.json()) as ActiveTenantResponse;
  const d = payload.data;

  const accessToken = d.accessToken ?? d.access_token;
  const refreshToken = d.refreshToken ?? d.refresh_token;
  const tokenType = d.tokenType ?? d.token_type;
  const expiresIn = d.expiresIn ?? d.expires_in;
  const refreshExpiresAt = d.refreshExpiresAt ?? d.refresh_expires_at;
  const sessionId = d.sessionId ?? d.session_id;

  if (!accessToken || tokenType !== "Bearer" || typeof expiresIn !== "number") {
    throw new Error("Resposta de autenticação inválida.");
  }

  const backendRoles = [...d.roles];
  const nextSession: AuthSession = {
    ...currentSession,
    accessToken,
    refreshToken: refreshToken ?? currentSession.refreshToken,
    tokenType: "Bearer",
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    refreshExpiresAt: refreshExpiresAt ?? currentSession.refreshExpiresAt,
    sessionId: sessionId ?? currentSession.sessionId,
    tenant: { id: d.tenant.id, name: d.tenant.name },
    user: {
      ...currentSession.user,
      id: d.user.id,
      name: d.user.name,
      email: d.user.email,
      backendRoles,
      roles: resolveFrontendRoles(backendRoles),
      permissions: resolveFrontendPermissions(backendRoles),
    },
  };

  setStoredAuthSession(nextSession);

  return nextSession;
}

function membershipToContext(m: MeTenantsMembership): TenantContext {
  const backendRoles = [...m.user.roles];
  const permissions = resolveFrontendPermissions(backendRoles);
  const roles = resolveFrontendRoles(backendRoles);

  return {
    tenantId: m.tenant.id,
    tenantName: m.tenant.name,
    tenantStatus: m.tenant.status === "active" ? "active" : "blocked",
    branchId: m.tenant.id,
    branchName: m.tenant.name,
    role: roles[0] ?? "Operador Logistico",
    permissions,
    enabledModules: resolveEnabledModules(permissions),
    scope: "tenant",
  };
}

function sessionToContext(session: AuthSession): TenantContext {
  return {
    tenantId: session.tenant!.id,
    tenantName: session.tenant!.name,
    tenantStatus: "active",
    branchId: session.tenant!.id,
    branchName: session.tenant!.name,
    role: session.user.roles[0] ?? "Operador Logistico",
    permissions: session.user.permissions,
    enabledModules: resolveEnabledModules(session.user.permissions),
    scope: "tenant",
  };
}

function resolveEnabledModules(permissions: readonly string[]): string[] {
  const modules = new Set(["dashboard"]);

  if (permissions.some((p) => p.startsWith("os.") || p.startsWith("work_orders:") || p.startsWith("work-orders:"))) {
    modules.add("work-orders");
  }

  if (permissions.includes("logistics:dispatch")) {
    modules.add("logistics");
  }

  if (permissions.some((p) => p.startsWith("users:"))) {
    modules.add("users");
  }

  if (permissions.includes("tenant:manage")) {
    modules.add("tenant-admin");
  }

  if (permissions.some((p) => p.startsWith("tenant_checklists:") || p.startsWith("checklist_runs:"))) {
    modules.add("tenant_checklist");
  }

  if (permissions.some((p) => p.startsWith("field_location:") || p.startsWith("field_operator:") || p.startsWith("field_dispatch:"))) {
    modules.add("field_operations");
  }

  if (permissions.includes("notifications:read")) {
    modules.add("notifications");
  }

  return [...modules];
}

function apiBaseUrl(): string {
  return readFrontendEnv("VITE_API_BASE_URL", "/api/v1");
}
