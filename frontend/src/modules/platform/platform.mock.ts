import type { PlatformModule, PlatformTenant } from "./platform.types";

export const mockPlatformTenants: PlatformTenant[] = [
  {
    id: "pten-industrial-01",
    name: "Techsolutions Industrial",
    slug: "techsolutions-industrial",
    plan: "professional",
    status: "active",
    activeUsers: 84,
    enabledModules: ["dashboard", "users", "tenant-admin", "inventory", "approvals", "finance", "mobile", "tenant_checklist"],
    createdAt: "2026-01-10T12:00:00.000Z",
    lastActivityAt: "2026-06-02T09:40:00.000Z",
    adminUser: {
      id: "adm-industrial-01",
      name: "Carlos Almeida",
      email: "carlos.almeida@techsolutions.example",
    },
    usageSummary: {
      workOrders: 1248,
      storageGb: 84,
      apiCalls: 39240,
    },
  },
  {
    id: "pten-mining-02",
    name: "Minas Norte Service",
    slug: "minas-norte-service",
    plan: "starter",
    status: "suspended",
    activeUsers: 18,
    enabledModules: ["dashboard", "users", "tenant-admin", "inventory"],
    createdAt: "2026-02-18T10:20:00.000Z",
    lastActivityAt: "2026-05-31T17:10:00.000Z",
    adminUser: {
      id: "adm-mining-02",
      name: "Renata Borges",
      email: "renata.borges@minasnorte.example",
    },
    usageSummary: {
      workOrders: 206,
      storageGb: 12,
      apiCalls: 8320,
    },
  },
  {
    id: "pten-field-03",
    name: "Field Operations LATAM",
    slug: "field-operations-latam",
    plan: "enterprise",
    status: "pending",
    activeUsers: 0,
    enabledModules: [
      "dashboard",
      "users",
      "tenant-admin",
      "inventory",
      "approvals",
      "finance",
      "tenant_checklist",
      "reports",
      "audit",
      "integrations",
      "analytics",
    ],
    createdAt: "2026-06-01T14:30:00.000Z",
    usageSummary: {
      workOrders: 0,
      storageGb: 0,
      apiCalls: 0,
    },
  },
];

export const platformModuleCatalog: Array<Omit<PlatformModule, "status" | "availableInPlan">> = [
  { key: "dashboard", name: "Dashboard", description: "Indicadores operacionais e visão executiva.", category: "MVP" },
  { key: "users", name: "Usuários", description: "Usuários, convites e permissões da organização.", category: "MVP" },
  { key: "tenant-admin", name: "Administrador", description: "Configurações administrativas da organização.", category: "MVP" },
  { key: "inventory", name: "Estoque", description: "Controle básico de estoque operacional.", category: "MVP" },
  { key: "approvals", name: "Aprovações", description: "Fluxos de aprovação e limites operacionais.", category: "MVP" },
  { key: "finance", name: "Financeiro", description: "Visão financeira inicial e conciliações.", category: "MVP" },
  { key: "notifications", name: "Notificações", description: "Alertas e comunicação operacional.", category: "MVP" },
  { key: "mobile", name: "Mobile", description: "Experiência Flutter para campo.", category: "MVP" },
  { key: "tenant_checklist", name: "Checklists", description: "Checklists configuráveis por organização.", category: "Fase 2" },
  { key: "purchasing", name: "Compras", description: "Solicitações e pedidos de compra.", category: "Fase 2" },
  { key: "suppliers", name: "Fornecedores", description: "Cadastro e desempenho de fornecedores.", category: "Fase 2" },
  { key: "customers", name: "Clientes", description: "Gestão de clientes e contratos.", category: "Fase 2" },
  { key: "technicians", name: "Técnicos", description: "Cadastro e disponibilidade de equipes.", category: "Fase 2" },
  { key: "vehicles", name: "Veículos", description: "Frota e ativos de campo.", category: "Fase 2" },
  { key: "reports", name: "Relatórios", description: "Relatórios gerenciais e operacionais.", category: "Fase 2" },
  { key: "audit", name: "Auditoria", description: "Trilha auditável e eventos sensíveis.", category: "Fase 2" },
  { key: "integrations", name: "Integrações", description: "Conectores externos e webhooks.", category: "Enterprise" },
  { key: "analytics", name: "Analytics", description: "Análises avançadas e indicadores preditivos.", category: "Enterprise" },
];

const modulesByPlan = {
  starter: new Set(["dashboard", "users", "tenant-admin", "inventory"]),
  professional: new Set([
    "dashboard",
    "users",
    "tenant-admin",
    "inventory",
    "approvals",
    "finance",
    "notifications",
    "mobile",
    "tenant_checklist",
    "reports",
    "audit",
  ]),
  enterprise: new Set(platformModuleCatalog.map((module) => module.key)),
};

export function buildTenantModules(tenant: PlatformTenant): PlatformModule[] {
  const availableModules = modulesByPlan[tenant.plan];

  return platformModuleCatalog.map((module) => {
    const availableInPlan = availableModules.has(module.key);
    const enabled = tenant.enabledModules.includes(module.key);

    return {
      ...module,
      availableInPlan,
      status: !availableInPlan ? "blocked_by_plan" : enabled ? "enabled" : "disabled",
    };
  });
}
