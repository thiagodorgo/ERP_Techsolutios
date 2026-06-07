import type { PlatformModule, PlatformPlan, PlatformTenant } from "./platform.types.js";

const moduleCatalog: Array<Omit<PlatformModule, "status" | "availableInPlan">> = [
  { key: "dashboard", name: "Dashboard", description: "Indicadores operacionais e visao executiva.", category: "MVP" },
  { key: "users", name: "Usuarios", description: "Usuarios, convites e permissoes do tenant.", category: "MVP" },
  { key: "tenant-admin", name: "Administrador", description: "Configuracoes administrativas do tenant.", category: "MVP" },
  { key: "inventory", name: "Estoque", description: "Controle basico de estoque operacional.", category: "MVP" },
  { key: "approvals", name: "Aprovacoes", description: "Fluxos de aprovacao e limites operacionais.", category: "MVP" },
  { key: "finance", name: "Financeiro", description: "Visao financeira inicial.", category: "MVP" },
  { key: "notifications", name: "Notificacoes", description: "Alertas e comunicacao operacional.", category: "MVP" },
  { key: "mobile", name: "Mobile", description: "Experiencia Flutter para campo.", category: "MVP" },
  { key: "purchasing", name: "Compras", description: "Solicitacoes e pedidos de compra.", category: "Fase 2" },
  { key: "suppliers", name: "Fornecedores", description: "Cadastro de fornecedores.", category: "Fase 2" },
  { key: "customers", name: "Clientes", description: "Gestao de clientes e contratos.", category: "Fase 2" },
  { key: "technicians", name: "Tecnicos", description: "Disponibilidade de equipes.", category: "Fase 2" },
  { key: "vehicles", name: "Veiculos", description: "Frota e ativos de campo.", category: "Fase 2" },
  { key: "reports", name: "Relatorios", description: "Relatorios gerenciais.", category: "Fase 2" },
  { key: "audit", name: "Auditoria", description: "Trilha auditavel.", category: "Fase 2" },
  { key: "integrations", name: "Integracoes", description: "Conectores externos.", category: "Enterprise" },
  { key: "analytics", name: "Analytics", description: "Analises avancadas.", category: "Enterprise" },
];

const modulesByPlan: Record<PlatformPlan, Set<string>> = {
  starter: new Set(["dashboard", "users", "tenant-admin", "inventory"]),
  professional: new Set(["dashboard", "users", "tenant-admin", "inventory", "approvals", "finance", "notifications", "mobile", "reports", "audit"]),
  enterprise: new Set(moduleCatalog.map((item) => item.key)),
};

export class PlatformModulesService {
  listForTenant(tenant: PlatformTenant): PlatformModule[] {
    const planModules = modulesByPlan[tenant.plan];

    return moduleCatalog.map((module) => {
      const availableInPlan = planModules.has(module.key);
      const enabled = tenant.enabledModules.includes(module.key);

      return {
        ...module,
        availableInPlan,
        status: !availableInPlan ? "blocked_by_plan" : enabled ? "enabled" : "disabled",
      };
    });
  }
}
