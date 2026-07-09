import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle,
  ClipboardList,
  ConciergeBell,
  Contact,
  Fuel,
  Gavel,
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

const VIATURAS: NavItem = { label: "Viaturas", path: "/cadastros/viaturas", icon: Truck };
const ABASTECIMENTO: NavItem = { label: "Abastecimento", path: "/fleet/fuel", icon: Fuel };
const MANUTENCAO: NavItem = { label: "Manutenção", path: "/fleet/maintenance", icon: Wrench };
const MULTAS: NavItem = { label: "Multas", path: "/fleet/fines", icon: Gavel };
const SEGUROS: NavItem = { label: "Seguros", path: "/fleet/insurance", icon: ShieldCheck };
const DANOS: NavItem = { label: "Danos", path: "/fleet/damages", icon: AlertTriangle };

const CLIENTES: NavItem = { label: "Clientes", path: "/cadastros/clientes", icon: Contact };
const EQUIPES: NavItem = { label: "Equipes", path: "/cadastros/equipes", icon: UsersRound };
const SERVICOS: NavItem = { label: "Serviços", path: "/cadastros/servicos", icon: ConciergeBell };
const ESTOQUE: NavItem = { label: "Estoque", path: "/inventory", icon: Package };
const PEDIDOS: NavItem = { label: "Pedidos", path: "/purchase-orders", icon: ShoppingCart };
const REMUNERACOES: NavItem = { label: "Remunerações", path: "/finance/commissions", icon: Wallet };
const RELATORIOS: NavItem = { label: "Relatórios", path: "/reports", icon: BarChart3 };
const FINANCEIRO: NavItem = { label: "Financeiro", path: "/finance", icon: Receipt };

const USUARIOS: NavItem = { label: "Usuários", path: "/users", icon: Users };
const NOTIFICACOES: NavItem = { label: "Notificações", path: "/notifications", icon: Bell };
const CONFIGURACOES: NavItem = { label: "Configurações", path: "/administrator/settings", icon: Settings };
const AUDITORIA: NavItem = { label: "Auditoria", path: "/audit", icon: ScrollText };

const G_VISAO_GERAL: NavGroup = { label: "VISÃO GERAL", items: [DASHBOARD] };

// Grupos completos (gestor/admin) — os demais papéis recebem subconjuntos.
const G_OPERACAO_FULL: NavGroup = { label: "OPERAÇÃO", items: [OS, DESPACHOS, MAPA, APROVACOES, CHECKLISTS] };
const G_FROTA_FULL: NavGroup = {
  label: "FROTA",
  items: [VIATURAS, ABASTECIMENTO, MANUTENCAO, MULTAS, SEGUROS, DANOS],
};
const G_GESTAO_FULL: NavGroup = {
  label: "GESTÃO",
  items: [CLIENTES, EQUIPES, SERVICOS, ESTOQUE, PEDIDOS, REMUNERACOES, RELATORIOS, FINANCEIRO],
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
    G_FROTA_FULL,
    { label: "GESTÃO", items: [CLIENTES, EQUIPES, SERVICOS, ESTOQUE] },
    { label: "ADMINISTRAÇÃO", items: [NOTIFICACOES] },
  ],
  // finance — recupera o grupo (multas/seguros/remunerações/financeiro/relatórios/aprovações).
  finance: [
    G_VISAO_GERAL,
    { label: "OPERAÇÃO", items: [APROVACOES] },
    { label: "FROTA", items: [ABASTECIMENTO, MANUTENCAO, MULTAS, SEGUROS, DANOS] },
    { label: "GESTÃO", items: [ESTOQUE, PEDIDOS, REMUNERACOES, RELATORIOS, FINANCEIRO] },
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
  "/operations/checklists",
  "/approvals",
  "/cadastros/clientes",
  "/cadastros/viaturas",
  "/cadastros/equipes",
  "/cadastros/servicos",
  "/fleet/fuel",
  "/fleet/maintenance",
  "/fleet/fines",
  "/fleet/insurance",
  "/fleet/damages",
  "/inventory",
  "/purchase-orders",
  "/finance/commissions",
  "/reports",
  "/finance",
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
