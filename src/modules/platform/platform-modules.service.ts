import type { PlatformModule, PlatformTenant } from "./platform.types.js";

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

// B-PLANOS-MODULOS (D-PLANOS-MODULOS-PORTA-REAL) — o mapa de código `modulesByPlan` SAIU: ele não ligava nem
// destrava nada (o gate e o menu leem `tenants.modules`), só fazia a tela de módulos mentir, tratando toda
// organização como se fosse do plano inicial. O conteúdo de cada plano é DADO (a lista `modules` da versão do plano
// no banco), não código. No lugar entra a lista canônica que a porta grava.

// A lista que a porta grava em `tenants.modules`: só as chaves canônicas pedidas, na ordem do catálogo e sem
// repetição. Apelido e chave desconhecida já foram recusados pelo validador (422 `module_unknown`).
export function canonicalModuleList(modules: readonly string[]): string[] {
  const wanted = new Set(modules);
  return CANONICAL_MODULE_KEYS.filter((key) => wanted.has(key));
}

// B-PLANOS-MODULOS (§5.2/§5.4) — a comparação de conjuntos que a porta usa para decidir "sem mudança" e para
// montar a trilha. `current` é o que está gravado em `tenants.modules` (pode trazer apelido antigo e chave fora
// do catálogo, herdados de sementes anteriores); `next` já chega canônica (`canonicalModuleList`). Comparar como
// CONJUNTO normalizado é o que impede a porta de escrever e trilhar uma mudança que não mudou nada.
export type ModuleSetDiff = {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly removedOther: number;
};

export function sameModuleSet(current: readonly string[] | undefined | null, next: readonly string[]): boolean {
  const before = new Set(normalizeModuleKeys(current));
  const after = new Set(normalizeModuleKeys(next));
  if (before.size !== after.size) return false;
  for (const key of after) if (!before.has(key)) return false;
  return true;
}

// `removed` lista só as chaves CANÔNICAS que saíram (na ordem do catálogo, como o resto da trilha); chave antiga
// fora do catálogo que sai é contada em `removedOther`, sem o texto dela — a trilha não carrega texto livre (§5.4).
export function diffModuleKeys(current: readonly string[] | undefined | null, next: readonly string[]): ModuleSetDiff {
  const before = normalizeModuleKeys(current);
  const beforeSet = new Set(before);
  const after = new Set(canonicalModuleList(next));
  const canonical = new Set(CANONICAL_MODULE_KEYS);
  const added = CANONICAL_MODULE_KEYS.filter((key) => after.has(key) && !beforeSet.has(key));
  const removed = CANONICAL_MODULE_KEYS.filter((key) => beforeSet.has(key) && !after.has(key));
  let removedOther = 0;
  for (const key of before) if (!canonical.has(key) && !after.has(key)) removedOther += 1;
  return { added, removed, removedOther };
}

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
    // "Ligada" é calculada com `normalizeModuleKeys`: sem isto, uma chave antiga gravada como apelido
    // (`work-orders`) apareceria desligada no painel embora o gate e o menu a tratem como ligada.
    const enabled = new Set(normalizeModuleKeys(tenant.enabledModules));

    return moduleCatalog.map((module) => {
      const isEnabled = enabled.has(module.key);
      // SEM assinatura em vigor não há plano para comparar: tudo está disponível e a plataforma liga pela porta.
      // COM assinatura, `blocked_by_plan` é verdade operacional — aquela área só liga mudando o plano contratado.
      const availableInPlan = tenant.managedBySubscription ? isEnabled : true;

      return {
        ...module,
        availableInPlan,
        status: isEnabled ? "enabled" : tenant.managedBySubscription ? "blocked_by_plan" : "disabled",
      };
    });
  }
}
