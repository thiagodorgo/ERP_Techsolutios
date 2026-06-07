import type { AuthSession } from "../../modules/auth/types";
import type { TenantContext } from "../../modules/context/types";

export const mockSession: AuthSession = {
  provider: "cognito-compatible",
  accessToken: "mock-cognito-compatible-access-token",
  expiresAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
  user: {
    id: "usr-ops-01",
    name: "Marina Costa",
    email: "marina.costa@techsolutions.example",
    cognitoSubject: "cognito|usr-ops-01",
    roles: ["Super Admin", "Administrador", "Gestor Operacional", "Operador Logistico", "Auditor"],
    permissions: [
      "platform:tenants:read",
      "platform:tenants:create",
      "platform:tenants:update",
      "platform:tenants:suspend",
      "platform:modules:manage",
      "platform:users:create_admin",
      "platform:audit:read",
      "platform:health:read",
    ],
    status: "active",
  },
};

export const mockTenantContexts: TenantContext[] = [
  {
    tenantId: "ten-industrial-01",
    tenantName: "Techsolutions Industrial",
    tenantStatus: "active",
    branchId: "fil-sp-01",
    branchName: "Sao Paulo - Campo",
    role: "Gestor Operacional",
    permissions: [
      "dashboard:view",
      "work-orders:view",
      "work-orders:create",
      "work-orders:update",
      "logistics:dispatch",
      "audit:view",
      "users:read",
      "tenant:manage",
      "tenant_checklists:read",
      "tenant_checklists:create",
      "tenant_checklists:update",
      "tenant_checklists:publish",
      "checklist_runs:read",
      "checklist_runs:create",
      "checklist_runs:update",
      "checklist_runs:complete",
      "checklist_runs:acknowledge",
    ],
    scope: "branch",
  },
  {
    tenantId: "ten-mining-02",
    tenantName: "Minas Norte Service",
    tenantStatus: "blocked",
    branchId: "fil-mg-02",
    branchName: "Contagem - Planta",
    role: "Auditor",
    permissions: ["dashboard:view", "work-orders:view", "audit:view"],
    scope: "tenant",
  },
];
