import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookUser,
  Building2,
  Calculator,
  CheckCircle,
  ClipboardList,
  Coins,
  ConciergeBell,
  Contact,
  CreditCard,
  Factory,
  Fuel,
  Gavel,
  HandCoins,
  IdCard,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Package,
  Receipt,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Tags,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Item/grupo da sidebar (camada VISUAL). Sem `badge` numérico: os badges são
// resolvidos em tempo de render pela AppShell a partir de contagens reais
// (Aprovações pendentes, Notificações não lidas) — nunca literais (mata P-011).
export type NavItem = { label: string; path: string; icon: LucideIcon };
export type NavGroup = { label: string; items: readonly NavItem[] };
export type RoleKind = "finance" | "dispatcher" | "admin" | "gestor" | "support";

// ── Itens canônicos (rótulo → rota) — F11 sidebar-ia.md (IA aprovada) ──
const DASHBOARD: NavItem = { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard };

const OS: NavItem = { label: "Ordens de Serviço", path: "/work-orders", icon: ClipboardList };
const DESPACHOS: NavItem = { label: "Despachos", path: "/operations/dispatches", icon: Send };
const MAPA: NavItem = { label: "Mapa Operacional", path: "/operations/map", icon: MapPin };
const APROVACOES: NavItem = { label: "Aprovações", path: "/approvals", icon: CheckCircle };
const CHECKLISTS: NavItem = { label: "Checklists", path: "/operations/checklists", icon: ListChecks };
const ORCAMENTOS: NavItem = { label: "Orçamentos", path: "/operations/quotes", icon: Calculator };

const VIATURAS: NavItem = { label: "Viaturas", path: "/cadastros/viaturas", icon: Truck };
const ABASTECIMENTO: NavItem = { label: "Abastecimento", path: "/fleet/fuel", icon: Fuel };
const MANUTENCAO: NavItem = { label: "Manutenção", path: "/fleet/maintenance", icon: Wrench };
const MULTAS: NavItem = { label: "Multas", path: "/fleet/fines", icon: Gavel };
const SEGUROS: NavItem = { label: "Seguros", path: "/fleet/insurance", icon: ShieldCheck };
const DANOS: NavItem = { label: "Danos", path: "/fleet/damages", icon: AlertTriangle };
const EXTRATO_PROFISSIONAL: NavItem = { label: "Extrato do Profissional", path: "/fleet/statement", icon: BookUser };

const CLIENTES: NavItem = { label: "Clientes", path: "/cadastros/clientes", icon: Contact };
const FILIAIS: NavItem = { label: "Filiais", path: "/cadastros/filiais", icon: Building2 };
const FORNECEDORES: NavItem = { label: "Fornecedores", path: "/cadastros/fornecedores", icon: Factory };
const EQUIPES: NavItem = { label: "Equipes", path: "/cadastros/equipes", icon: UsersRound };
const PROFISSIONAIS: NavItem = { label: "Profissionais", path: "/cadastros/profissionais", icon: IdCard };
const SERVICOS: NavItem = { label: "Serviços", path: "/cadastros/servicos", icon: ConciergeBell };
const TABELAS_VALORES: NavItem = { label: "Tabela de Valores", path: "/cadastros/tabelas-valores", icon: Coins };
const TARIFAS: NavItem = { label: "Tarifas", path: "/cadastros/tarifas", icon: Tags };
const TAGS: NavItem = { label: "Tags", path: "/cadastros/tags", icon: Tag };
const PONTOS_INTERESSE: NavItem = { label: "Pontos de Interesse", path: "/cadastros/pontos-interesse", icon: MapPin };
const ESTOQUE: NavItem = { label: "Estoque", path: "/inventory", icon: Package };
const PEDIDOS: NavItem = { label: "Pedidos", path: "/purchase-orders", icon: ShoppingCart };
const REMUNERACOES: NavItem = { label: "Remunerações", path: "/finance/commissions", icon: Wallet };
const RELATORIOS: NavItem = { label: "Relatórios", path: "/reports", icon: BarChart3 };
const FINANCEIRO: NavItem = { label: "Financeiro", path: "/finance", icon: Receipt };
const COBRANCAS: NavItem = { label: "Cobranças", path: "/finance/charges", icon: HandCoins };
const PAGAMENTOS: NavItem = { label: "Pagamentos", path: "/finance/payments", icon: CreditCard };

const USUARIOS: NavItem = { label: "Usuários", path: "/users", icon: Users };
const NOTIFICACOES: NavItem = { label: "Notificações", path: "/notifications", icon: Bell };
const CONFIGURACOES: NavItem = { label: "Configurações", path: "/administrator/settings", icon: Settings };
const AUDITORIA: NavItem = { label: "Auditoria", path: "/audit", icon: ScrollText };

const G_VISAO_GERAL: NavGroup = { label: "VISÃO GERAL", items: [DASHBOARD] };

// Grupos completos (gestor/admin) — os demais papéis recebem subconjuntos.
const G_OPERACAO_FULL: NavGroup = { label: "OPERAÇÃO", items: [OS, DESPACHOS, MAPA, ORCAMENTOS, APROVACOES, CHECKLISTS] };
const G_FROTA_FULL: NavGroup = {
  label: "FROTA",
  items: [VIATURAS, ABASTECIMENTO, MANUTENCAO, MULTAS, SEGUROS, DANOS, EXTRATO_PROFISSIONAL],
};
// FROTA operacional (dispatcher/operador de campo): SEM "Extrato do Profissional" — a folha do profissional
// é sensível e o operador não tem professional_statements:read (D-Ω4C-EXTRATO-RBAC). O backend é a autoridade.
const G_FROTA_OPERACIONAL: NavGroup = {
  label: "FROTA",
  items: [VIATURAS, ABASTECIMENTO, MANUTENCAO, MULTAS, SEGUROS, DANOS],
};
const G_GESTAO_FULL: NavGroup = {
  label: "GESTÃO",
  items: [CLIENTES, FILIAIS, FORNECEDORES, EQUIPES, PROFISSIONAIS, SERVICOS, TABELAS_VALORES, TARIFAS, TAGS, PONTOS_INTERESSE, ESTOQUE, PEDIDOS, REMUNERACOES, RELATORIOS, FINANCEIRO, COBRANCAS, PAGAMENTOS],
};
const G_ADMIN_FULL: NavGroup = {
  label: "ADMINISTRAÇÃO",
  items: [USUARIOS, NOTIFICACOES, CONFIGURACOES, AUDITORIA],
};

// Navegação por papel (5 grupos da IA aprovada). Distribuição por RoleKind
// segundo a tabela "Visibilidade por papel" (sidebar-ia.md) + navigation-matrix.md.
// A autoridade final de acesso é o backend (route guards + tenantNavigation RBAC);
// esta camada apenas molda o menu visível.
export const NAV_BY_ROLE: Record<RoleKind, readonly NavGroup[]> = {
  // tenant_admin — menu completo.
  admin: [G_VISAO_GERAL, G_OPERACAO_FULL, G_FROTA_FULL, G_GESTAO_FULL, G_ADMIN_FULL],
  // manager (+ fallback: platform_admin/auditor operam com leitura ampla).
  gestor: [G_VISAO_GERAL, G_OPERACAO_FULL, G_FROTA_FULL, G_GESTAO_FULL, G_ADMIN_FULL],
  // operator / field_technician / field_dispatcher — operação + frota + cadastros (sem administração).
  dispatcher: [
    G_VISAO_GERAL,
    G_OPERACAO_FULL,
    G_FROTA_OPERACIONAL,
    { label: "GESTÃO", items: [CLIENTES, EQUIPES, SERVICOS, TABELAS_VALORES, TARIFAS, ESTOQUE] },
    { label: "ADMINISTRAÇÃO", items: [NOTIFICACOES] },
  ],
  // finance — recupera o grupo (multas/seguros/remunerações/financeiro/relatórios/aprovações).
  finance: [
    G_VISAO_GERAL,
    // Ω3-a — finance tem service_quotes:read/create/update (matriz RBAC): vê "Orçamentos" (veto V2).
    { label: "OPERAÇÃO", items: [ORCAMENTOS, APROVACOES] },
    { label: "FROTA", items: [ABASTECIMENTO, MANUTENCAO, MULTAS, SEGUROS, DANOS, EXTRATO_PROFISSIONAL] },
    { label: "GESTÃO", items: [ESTOQUE, PEDIDOS, REMUNERACOES, RELATORIOS, FINANCEIRO, COBRANCAS, PAGAMENTOS] },
    { label: "ADMINISTRAÇÃO", items: [NOTIFICACOES, AUDITORIA] },
  ],
  // support — apenas administração limitada (nunca Frota/Cadastros/Operação).
  support: [{ label: "ADMINISTRAÇÃO", items: [USUARIOS, NOTIFICACOES, AUDITORIA] }],
};

export const ROLE_SUBTITLE: Record<RoleKind, string> = {
  gestor: "Gestor de operações",
  dispatcher: "Operação de campo",
  finance: "Financeiro",
  admin: "Administrador",
  support: "Suporte",
};

// Allowlist do escopo web: só rotas com tela real entram na sidebar. F11 expande
// a lista para as telas F1–F9 (frota, estoque, pedidos, relatórios, financeiro,
// usuários, auditoria) — sem isto os itens novos não renderizam.
export const MVP_NAV_PATHS = new Set<string>([
  "/dashboard",
  "/work-orders",
  "/operations/dispatches",
  "/operations/map",
  "/operations/quotes",
  "/operations/checklists",
  "/approvals",
  "/cadastros/clientes",
  "/cadastros/filiais",
  "/cadastros/fornecedores",
  "/cadastros/viaturas",
  "/cadastros/equipes",
  "/cadastros/profissionais",
  "/cadastros/servicos",
  "/cadastros/tabelas-valores",
  "/cadastros/tarifas",
  "/cadastros/tags",
  "/cadastros/pontos-interesse",
  "/fleet/fuel",
  "/fleet/maintenance",
  "/fleet/fines",
  "/fleet/insurance",
  "/fleet/damages",
  "/fleet/statement",
  "/inventory",
  "/purchase-orders",
  "/finance/commissions",
  "/reports",
  "/finance",
  "/finance/charges",
  "/finance/payments",
  "/users",
  "/audit",
  "/notifications",
  "/administrator/checklists",
  "/administrator/settings",
]);

// Resolve o RoleKind a partir dos rótulos de papel (UserRole) da sessão. Coarse por
// natureza (a UserRole do front não distingue todos os 9 papéis canônicos — ver
// nota em navigation-matrix.md); a autoridade de acesso é sempre o backend.
export function roleKindFor(roles: readonly string[]): RoleKind {
  if (roles.includes("Financeiro")) return "finance";
  if (roles.includes("Supervisor")) return "support";
  if (roles.includes("Operador Logistico") || roles.includes("Operação de Campo")) return "dispatcher";
  if (roles.includes("Administrador") && !roles.includes("Gestor Operacional")) return "admin";
  return "gestor";
}

// Monta a navegação visível (grupos não vazios) para um conjunto de papéis,
// aplicando a allowlist MVP e escondendo itens marcados "planned" no menu backend.
export function buildSidebarNav(
  roles: readonly string[],
  plannedPaths: ReadonlySet<string> = new Set<string>(),
): NavGroup[] {
  return NAV_BY_ROLE[roleKindFor(roles)]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => MVP_NAV_PATHS.has(item.path) && !plannedPaths.has(item.path)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Ω-ACESSO — paths a esconder do sidebar: os itens "planned" do menu backend MAIS o gating dinâmico por
 * provisionamento — um path GOVERNADO pelo backend que NÃO veio no menu do tenant (módulo/feature não
 * provisionado ou papel sem permissão) é escondido. No fallback (backend indisponível) `governedPaths` é
 * vazio, então nada extra é escondido (o sidebar volta ao comportamento por papel).
 */
export function computeHiddenNavPaths(
  menuItems: readonly { readonly path: string; readonly status?: string }[],
  governedPaths: readonly string[],
): Set<string> {
  const hidden = new Set<string>(menuItems.filter((item) => item.status === "planned").map((item) => item.path));
  const visible = new Set(menuItems.map((item) => item.path));
  for (const path of governedPaths) {
    if (!visible.has(path)) hidden.add(path);
  }
  return hidden;
}

export function currentNavTitle(nav: readonly NavGroup[], pathname: string): string {
  let best: NavItem | null = null;
  for (const group of nav) {
    for (const item of group.items) {
      if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
        if (!best || item.path.length > best.path.length) best = item;
      }
    }
  }
  return best?.label ?? "Operação";
}
