import type { AuthSession, UserRole } from "../../modules/auth/types";
import type { TenantContext } from "../../modules/context/types";

export const mockSession: AuthSession = {
  provider: "mock",
  accessToken: "mock-cognito-compatible-access-token",
  refreshToken: "mock-cognito-compatible-refresh-token",
  tokenType: "Bearer",
  expiresAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
  refreshExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  sessionId: "mock-session-01",
  tenant: {
    id: "ten-industrial-01",
    name: "Techsolutions Industrial",
  },
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
    status: "active",
  },
};

// ── Perfis mock por e-mail (login distinto por papel) ──
// isPlatformAdmin = role "Super Admin" OU permissão "platform:tenants:read".
// Só o perfil "platform" tem isso; os demais caem em /select-context (operacional).

const PLATFORM_PERMS = mockSession.user.permissions;

const OPERATIONAL_PERMS = [
  "dashboard:view",
  "work_orders:read",
  "work_orders:create",
  "work_orders:update",
  "work_orders:assign",
  "work_orders:status",
  "work_orders:cancel",
  "logistics:dispatch",
  "audit:view",
  "users:read",
  "tenant:manage",
  "tenant_checklists:read",
  "checklist_runs:read",
  "field_location:read",
  "field_dispatch:read",
  "field_dispatch:create",
  "field_dispatch:update",
  "field_dispatch:reassign",
  "notifications:read",
];

type MockProfile = { name: string; roles: UserRole[]; permissions: string[] };

const MOCK_PROFILES: Record<string, MockProfile> = {
  platform: { name: "Admin Plataforma", roles: ["Super Admin"], permissions: PLATFORM_PERMS },
  gestor: { name: "Rafael Souza", roles: ["Gestor Operacional"], permissions: OPERATIONAL_PERMS },
  dispatcher: { name: "Diego Rocha", roles: ["Operador Logistico"], permissions: OPERATIONAL_PERMS },
  finance: { name: "Fernanda Dias", roles: ["Financeiro"], permissions: OPERATIONAL_PERMS },
  admin: { name: "Alice Prado", roles: ["Administrador"], permissions: OPERATIONAL_PERMS },
  auditor: { name: "Auro Lima", roles: ["Auditor"], permissions: ["dashboard:view", "work_orders:read", "audit:view"] },
};

function profileForEmail(email: string): MockProfile {
  const local = (email.split("@")[0] ?? "").toLowerCase();
  if (/(platform|plataforma|super|marina|admin\.demo)/.test(local)) return MOCK_PROFILES.platform;
  if (/(despach|dispatch|logist)/.test(local)) return MOCK_PROFILES.dispatcher;
  if (/(financ|finance)/.test(local)) return MOCK_PROFILES.finance;
  if (/(auditor|audit)/.test(local)) return MOCK_PROFILES.auditor;
  if (/(gestor|manager|operac|ops)/.test(local)) return MOCK_PROFILES.gestor;
  if (/admin/.test(local)) return MOCK_PROFILES.admin;
  return MOCK_PROFILES.gestor; // padrão: operacional (nunca "cai" na plataforma sem ser platform)
}

export function mockSessionForEmail(email: string): AuthSession {
  const profile = profileForEmail(email);
  return {
    ...mockSession,
    sessionId: `mock-session-${profile.roles[0]?.toLowerCase().replace(/\s+/g, "-") ?? "op"}`,
    user: {
      ...mockSession.user,
      name: profile.name,
      email: email || mockSession.user.email,
      roles: profile.roles,
      permissions: profile.permissions,
    },
  };
}

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
      "work_orders:read",
      "work_orders:create",
      "work_orders:update",
      "work_orders:assign",
      "work_orders:status",
      "work_orders:cancel",
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
      "field_location:read",
      "field_location:history",
      "field_dispatch:read",
      "field_dispatch:create",
      "field_dispatch:update",
      "field_dispatch:cancel",
      "field_dispatch:reassign",
      "notifications:read",
      "notifications:update",
    ],
    enabledModules: ["dashboard", "work-orders", "logistics", "users", "tenant-admin", "tenant_checklist", "field_operations", "notifications"],
    scope: "branch",
  },
  {
    tenantId: "ten-mining-02",
    tenantName: "Minas Norte Service",
    tenantStatus: "blocked",
    branchId: "fil-mg-02",
    branchName: "Contagem - Planta",
    role: "Auditor",
    permissions: ["dashboard:view", "work_orders:read", "audit:view"],
    enabledModules: ["dashboard", "work-orders"],
    scope: "tenant",
  },
];
