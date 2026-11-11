import type { PlatformModule, PlatformPlan, PlatformTenant } from "./platform.types.js";

// B-SAN3-18 (F1, P4) — CATÁLOGO CANÔNICO de módulos: a fonte ÚNICA de chave → rótulo. O registro de navegação, a
// classe de rota do gate (`src/modules/navigation/route-modules.ts`), a semente (`DEMO_TENANT_MODULES`), o plano
// (`PLAN_MODULE_KEYS`, plan-catalog.ts) e o bootstrap móvel só usam chaves daqui. As 7 chaves novas (`work_orders`,
// `master_data`, `quotes`, `patios`, `telemetry`, `expense_management`, `logistics`) já existiam no registro, na
// semente ou no bootstrap e faltavam aqui (D5 do plano). Rótulos em PT-BR com acento (§11.3).
const moduleCatalog: Array<Omit<PlatformModule, "status" | "availableInPlan">> = [
  { key: "dashboard", name: "Dashboard", description: "Indicadores operacionais e visão executiva.", category: "MVP" },
  { key: "users", name: "Usuários", description: "Usuários, convites e permissões da organização.", category: "MVP" },
  { key: "tenant-admin", name: "Administrador", description: "Configurações administrativas da organização.", category: "MVP" },
  { key: "work_orders", name: "Ordens de Serviço", description: "Abertura, atribuição e acompanhamento de OS.", category: "MVP" },
  { key: "master_data", name: "Cadastros", description: "Filiais, serviços, tarifas, equipes, viaturas, tags e pontos de interesse.", category: "MVP" },
  { key: "inventory", name: "Estoque", description: "Controle básico de estoque operacional.", category: "MVP" },
  { key: "approvals", name: "Aprovações", description: "Fluxos de aprovação e limites operacionais.", category: "MVP" },
  { key: "finance", name: "Financeiro", description: "Títulos, caixa, conciliação, cheques e remunerações.", category: "MVP" },
  { key: "notifications", name: "Notificações", description: "Alertas e comunicação operacional.", category: "MVP" },
  { key: "mobile", name: "Mobile", description: "Experiência Flutter para campo.", category: "MVP" },
  { key: "tenant_checklist", name: "Checklists", description: "Checklists configuráveis por organização.", category: "Fase 2" },
  { key: "field_operations", name: "Operação em Campo", description: "Despachos, mapa operacional e operadores em campo.", category: "Fase 2" },
  { key: "quotes", name: "Orçamentos", description: "Orçamentos com preço congelado a partir da tarifa vigente.", category: "Fase 2" },
  { key: "purchasing", name: "Compras", description: "Solicitações e pedidos de compra.", category: "Fase 2" },
  { key: "suppliers", name: "Fornecedores", description: "Cadastro de fornecedores.", category: "Fase 2" },
  { key: "customers", name: "Clientes", description: "Gestão de clientes e contratos.", category: "Fase 2" },
  { key: "technicians", name: "Técnicos", description: "Disponibilidade de equipes.", category: "Fase 2" },
  { key: "vehicles", name: "Frota", description: "Abastecimento, manutenção, multas, seguros e danos da frota.", category: "Fase 2" },
  { key: "patios", name: "Pátios", description: "Pátios de recolhimento, custódia, liberação e leilão.", category: "Fase 2" },
  { key: "telemetry", name: "Telemetria", description: "Quilometragem, rastreamento e dispositivos do app de campo.", category: "Fase 2" },
  { key: "expense_management", name: "Despesas de Viagem", description: "Relatórios de despesa e adiantamentos do campo.", category: "Fase 2" },
  { key: "logistics", name: "Logística", description: "Painel, rotas e mapa logístico.", category: "Fase 2" },
  { key: "reports", name: "Relatórios", description: "Relatórios gerenciais.", category: "Fase 2" },
  { key: "audit", name: "Auditoria", description: "Trilha auditável.", category: "Fase 2" },
  { key: "integrations", name: "Integrações", description: "Conectores externos.", category: "Enterprise" },
  { key: "analytics", name: "Analytics", description: "Análises avançadas.", category: "Enterprise" },
];

// B-SAN3-18 (F1, P4) — APELIDOS aceitos só na LEITURA das chaves de uma organização (`tenants.modules`), nunca na
// escrita: o plano continua recusando apelido (`module_unknown`, plans.service.ts), e o registro de navegação usa só a
// forma canônica. `work-orders` e `checklists` estão em organizações e sementes anteriores a este bloco.
export const MODULE_KEY_ALIASES: Readonly<Record<string, string>> = {
  "work-orders": "work_orders",
  "checklists": "tenant_checklist",
};

// As chaves canônicas, na ordem do catálogo (a mesma lista que `PLAN_MODULE_KEYS` deriva por `mapTenantModuleFlags([])`).
export const CANONICAL_MODULE_KEYS: readonly string[] = moduleCatalog.map((item) => item.key);

// Normaliza a lista de módulos de uma organização para a forma canônica: apara, troca o apelido pela chave canônica e
// tira repetição. Chave desconhecida passa como está, e não libera nada, porque nenhuma classe de rota nem entrada de
// menu a usa. É a ÚNICA leitura de `tenants.modules` que o gate (module-gate.middleware.ts) e o menu fazem.
export function normalizeModuleKeys(modules: readonly string[] | undefined | null): string[] {
  const out = new Set<string>();
  for (const raw of modules ?? []) {
    if (typeof raw !== "string") continue;
    const key = raw.trim();
    if (!key) continue;
    out.add(MODULE_KEY_ALIASES[key] ?? key);
  }
  return [...out];
}

const modulesByPlan: Record<PlatformPlan, Set<string>> = {
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
    "field_operations",
    "reports",
    "audit",
  ]),
  business: new Set(["inventory", "integrations"]),
  enterprise: new Set(moduleCatalog.map((item) => item.key)),
};

// Flag de módulo derivada da lista de módulos habilitados de uma organização (`Tenant.modules`).
// Reusa o MESMO catálogo do painel de módulos (fonte única de key→label) — o detalhe da org expõe o
// catálogo inteiro com `enabled` por módulo, sem inventar rótulo.
export type TenantModuleFlag = {
  readonly key: string;
  readonly label: string;
  readonly enabled: boolean;
};

export function mapTenantModuleFlags(enabledModules: readonly string[]): TenantModuleFlag[] {
  const enabled = new Set(enabledModules.map((key) => key.trim()));

  return moduleCatalog.map((module) => ({
    key: module.key,
    label: module.name,
    enabled: enabled.has(module.key),
  }));
}

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
