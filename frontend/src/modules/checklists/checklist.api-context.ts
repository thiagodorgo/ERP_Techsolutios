import type { TenantContext } from "../context/types";
import type { ChecklistApiContext } from "./types";

// CHECKLIST P1 PR-02b — a montagem do contexto de API era PRIVADA da lista; com o editor em rota
// própria as duas telas precisam da MESMA regra. Fonte única aqui (DRY): quem muda a resolução de
// organização/perfil muda em um lugar só. O backend continua sendo a autoridade de autorização
// (§2.4) — isto só carrega o contexto do ator autenticado.

export function buildChecklistApiContext(
  activeContext: TenantContext | null,
  accessToken: string | undefined,
): ChecklistApiContext | null {
  if (!activeContext) return null;

  return {
    tenantId: activeContext.tenantId,
    branchId: activeContext.branchId,
    role: toBackendRole(activeContext.role, activeContext.permissions),
    permissions: activeContext.permissions,
    ...(accessToken && !accessToken.startsWith("mock-") ? { token: accessToken } : {}),
  };
}

function toBackendRole(role: string, permissions: readonly string[]): string {
  if (
    permissions.includes("tenant_checklists:create") ||
    permissions.includes("tenant_checklists:update") ||
    permissions.includes("tenant_checklists:publish")
  ) {
    return "tenant_admin";
  }

  const normalizedRole = role.toLowerCase();
  if (normalizedRole.includes("admin")) return "tenant_admin";
  if (normalizedRole.includes("gestor")) return "manager";
  if (normalizedRole.includes("auditor")) return "auditor";
  if (normalizedRole.includes("operador")) return "operator";
  return "tenant_admin";
}
