import { isMockMode } from "../../config/env";
import { mockTenantContexts } from "../../mocks/auth/context";
import { getStoredAuthSession } from "../auth/auth.storage";
import type { TenantContext } from "./types";

export async function listAvailableContexts(): Promise<TenantContext[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 250));

  if (isMockMode()) {
    return mockTenantContexts;
  }

  const session = getStoredAuthSession();

  if (!session?.tenant) {
    return [];
  }

  return [
    {
      tenantId: session.tenant.id,
      tenantName: session.tenant.name,
      tenantStatus: "active",
      branchId: session.tenant.id,
      branchName: "Tenant",
      role: session.user.roles[0] ?? "Operador Logistico",
      permissions: session.user.permissions,
      enabledModules: resolveEnabledModules(session.user.permissions),
      scope: "tenant",
    },
  ];
}

function resolveEnabledModules(permissions: readonly string[]): string[] {
  const modules = new Set(["dashboard"]);

  if (permissions.some((permission) => permission.startsWith("os.") || permission.startsWith("work-orders:"))) {
    modules.add("work-orders");
  }

  if (permissions.includes("logistics:dispatch")) {
    modules.add("logistics");
  }

  if (permissions.some((permission) => permission.startsWith("users:"))) {
    modules.add("users");
  }

  if (permissions.includes("tenant:manage")) {
    modules.add("tenant-admin");
  }

  if (permissions.some((permission) => permission.startsWith("tenant_checklists:") || permission.startsWith("checklist_runs:"))) {
    modules.add("tenant_checklist");
  }

  return [...modules];
}
