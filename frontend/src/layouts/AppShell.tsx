import {
  Activity,
  BarChart3,
  Bell,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  Contact,
  CreditCard,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Package,
  Receipt,
  Route as RouteIcon,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useNavigationMenu } from "../modules/navigation/useNavigationMenu";
import { getUnreadNotificationCount } from "../modules/notifications/notification.service";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";
import { useTenantContext } from "../providers/TenantProvider";

type NavItem = { label: string; path: string; icon: LucideIcon; badge?: number };
type NavGroup = { label: string; items: readonly NavItem[] };
type RoleKind = "finance" | "dispatcher" | "admin" | "gestor";

// Grupo de Cadastros — registros operacionais (clientes, viaturas, equipes, serviços).
const CADASTROS_GROUP: NavGroup = {
  label: "CADASTROS",
  items: [
    { label: "Clientes", path: "/cadastros/clientes", icon: Contact },
    { label: "Viaturas", path: "/cadastros/viaturas", icon: Truck },
    { label: "Equipes", path: "/cadastros/equipes", icon: UsersRound },
    { label: "Serviços", path: "/cadastros/servicos", icon: Wrench },
  ],
};

// Navegação por papel — espelha `nav per role` do protótipo (ERP Web.dc.html).
const NAV_BY_ROLE: Record<RoleKind, readonly NavGroup[]> = {
  gestor: [
    {
      label: "OPERAÇÃO",
      items: [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "Ordens de Serviço", path: "/work-orders", icon: ClipboardList },
        { label: "Despachos", path: "/operations/dispatches", icon: Send },
        { label: "Mapa Operacional", path: "/operations/map", icon: MapPin },
        { label: "Aprovações", path: "/approvals", icon: CheckCircle, badge: 3 },
      ],
    },
    CADASTROS_GROUP,
    {
      label: "CHECKLISTS & CONTA",
      items: [
        { label: "Checklists", path: "/operations/checklists", icon: ListChecks },
        { label: "Builder de checklists", path: "/administrator/checklists", icon: ClipboardList },
        { label: "Notificações", path: "/notifications", icon: Bell },
        { label: "Configurações", path: "/administrator/settings", icon: Settings },
      ],
    },
  ],
  dispatcher: [
    {
      label: "OPERAÇÃO DE CAMPO",
      items: [
        { label: "Console Tempo Real", path: "/dispatch/console", icon: Activity },
        { label: "Mapa Operacional", path: "/operations/map", icon: MapPin },
        { label: "Fila de Despacho", path: "/operations/dispatches", icon: Send },
        { label: "Rotas", path: "/logistics", icon: RouteIcon },
        { label: "Técnicos · Disponib.", path: "/field-operators", icon: Users },
      ],
    },
    CADASTROS_GROUP,
    {
      label: "SUPORTE",
      items: [
        { label: "Ordens de Serviço", path: "/work-orders", icon: ClipboardList },
        { label: "Relatórios Operacionais", path: "/reports", icon: BarChart3 },
      ],
    },
  ],
  finance: [
    {
      label: "FINANCEIRO",
      items: [
        { label: "Financeiro", path: "/finance", icon: Wallet },
        { label: "Cobranças", path: "/finance/charges", icon: Receipt },
        { label: "Faturas", path: "/finance/invoices", icon: FileText },
        { label: "Pagamentos", path: "/finance/payments", icon: CreditCard },
      ],
    },
    {
      label: "GESTÃO",
      items: [
        { label: "Aprovações", path: "/approvals", icon: CheckCircle, badge: 3 },
        { label: "Relatórios", path: "/reports", icon: BarChart3 },
        { label: "Estoque", path: "/inventory", icon: Package },
      ],
    },
  ],
  admin: [
    {
      label: "ADMINISTRAÇÃO",
      items: [
        { label: "Checklists", path: "/administrator/checklists", icon: ListChecks },
        { label: "Usuários", path: "/users", icon: Users },
        { label: "Configurações da Organização", path: "/administrator/settings", icon: Settings },
        { label: "Auditoria", path: "/audit", icon: ShieldCheck },
      ],
    },
    CADASTROS_GROUP,
    {
      label: "CONTA",
      items: [
        { label: "Notificações", path: "/notifications", icon: Bell, badge: 4 },
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      ],
    },
  ],
};

const ROLE_SUBTITLE: Record<RoleKind, string> = {
  gestor: "Gestor de operações",
  dispatcher: "Operação de campo",
  finance: "Financeiro",
  admin: "Administrador",
};

// §4.3 — a navegação mostra SOMENTE telas do MVP web (esconde estoque, compras,
// faturamento, relatórios avançados, roteirização, platform admin, etc.).
const MVP_NAV_PATHS = new Set<string>([
  "/dashboard",
  "/work-orders",
  "/operations/dispatches",
  "/operations/map",
  "/operations/checklists",
  "/cadastros/clientes",
  "/cadastros/viaturas",
  "/cadastros/equipes",
  "/cadastros/servicos",
  "/approvals",
  "/notifications",
  "/administrator/checklists",
  "/administrator/settings",
]);

const NAVY = "#0D1B2A";
const ACTIVE = "#2563EB";
const NAV_IDLE = "#9FB4CC";
const GROUP_LABEL = "#41607A";

function roleKindFor(roles: readonly string[]): RoleKind {
  if (roles.includes("Financeiro")) return "finance";
  if (roles.includes("Operador Logistico")) return "dispatcher";
  if (roles.includes("Administrador") && !roles.includes("Gestor Operacional")) return "admin";
  return "gestor";
}

function currentTitle(nav: readonly NavGroup[], pathname: string): string {
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

function initials(name?: string): string {
  if (!name) return "RS";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "RS";
}

export function AppShell() {
  const { isAuthenticated, isLoading, session, signOut } = useAuth();
  const { activeContext, clearContext } = useTenantContext();
  const { permissions } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);

  const roleKind = useMemo(() => roleKindFor(session?.user?.roles ?? []), [session?.user?.roles]);
  // Navegação vem de GET /api/v1/navigation/menu (mock atrás do flag; fallback local),
  // usada para ocultar itens marcados "planned"; a allowlist MVP garante o escopo (§4.3).
  const menu = useNavigationMenu();
  const nav = useMemo(() => {
    const plannedPaths = new Set(menu.items.filter((item) => item.status === "planned").map((item) => item.path));
    return NAV_BY_ROLE[roleKind]
      .map((group) => ({ ...group, items: group.items.filter((item) => MVP_NAV_PATHS.has(item.path) && !plannedPaths.has(item.path)) }))
      .filter((group) => group.items.length > 0);
  }, [roleKind, menu.items]);

  const notificationContext = useMemo(() => {
    if (!activeContext || !permissions.includes("notifications:read")) return null;
    return {
      token: session?.accessToken,
      tenantId: activeContext.tenantId,
      branchId: activeContext.branchId,
      role: activeContext.role,
      permissions: activeContext.permissions,
    };
  }, [activeContext, permissions, session?.accessToken]);

  const refreshUnread = useCallback(async () => {
    if (!notificationContext) {
      setUnread(0);
      return;
    }
    try {
      const result = await getUnreadNotificationCount(notificationContext);
      setUnread(result.count);
    } catch {
      setUnread(0);
    }
  }, [notificationContext]);

  useEffect(() => {
    void refreshUnread();
    window.addEventListener("notifications:changed", refreshUnread);
    return () => window.removeEventListener("notifications:changed", refreshUnread);
  }, [refreshUnread]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!activeContext) return <Navigate to="/select-context" replace />;

  const userName = session?.user?.name ?? "Rafael Souza";
  const orgName = activeContext.tenantName ?? activeContext.tenantId ?? "Organização";
  const sidebarWidth = collapsed ? 74 : 236;

  return (
    <div style={{ height: "100vh", display: "flex", background: "#F1F5F9" }}>
      {/* SIDEBAR */}
      <aside style={{ width: sidebarWidth, flexShrink: 0, background: NAVY, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,.06)", transition: "width .16s ease" }}>
        <div style={{ padding: "16px 14px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid #33475B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7BE084" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21V11" /><path d="M12 11c-4 0-7-2.6-7.8-6.4C8 4 11 6 12 9.6" /><path d="M12 9.6C13 6 16 4 19.8 4.6 19 8.4 16 11 12 11" />
              </svg>
            </div>
            {!collapsed ? (
              <div style={{ lineHeight: 1.15, whiteSpace: "nowrap" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>TechSolutions</div>
                <div style={{ fontSize: 10, color: "#5E8C86", fontWeight: 600, letterSpacing: ".12em" }}>PLATAFORMA ERP</div>
              </div>
            ) : null}
          </div>
          <button type="button" title={collapsed ? "Expandir menu" : "Recolher menu"} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} onClick={() => setCollapsed((c) => !c)} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: NAV_IDLE }}>
            <ChevronDown size={15} style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(90deg)" }} />
          </button>
        </div>

        <nav style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12 }}>
          {nav.map((group) => (
            <div key={group.label} style={{ marginBottom: 6 }}>
              {!collapsed ? (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: GROUP_LABEL, padding: "14px 10px 7px", whiteSpace: "nowrap" }}>{group.label}</div>
              ) : (
                <div style={{ height: 12 }} />
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "9px 11px",
                    borderRadius: 9,
                    marginBottom: 2,
                    textDecoration: "none",
                    justifyContent: collapsed ? "center" : "flex-start",
                    background: isActive ? ACTIVE : "transparent",
                    color: isActive ? "#fff" : NAV_IDLE,
                    fontWeight: isActive ? 700 : 600,
                  })}
                >
                  <item.icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed ? <span style={{ fontSize: 13.5, flex: 1 }}>{item.label}</span> : null}
                  {!collapsed && item.badge ? (
                    <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 99, background: "#EF4444", color: "#fff", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.badge}</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ flexShrink: 0, padding: 12, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", color: "#9DC3E6", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{initials(userName)}</div>
          {!collapsed ? (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
                <div style={{ fontSize: 10.5, color: "#5B7A96", whiteSpace: "nowrap" }}>{ROLE_SUBTITLE[roleKind]}</div>
              </div>
              <button type="button" aria-label="Sair" onClick={() => { clearContext(); signOut(); navigate("/login", { replace: true }); }} style={{ background: "none", border: "none", color: GROUP_LABEL, cursor: "pointer", display: "flex", flexShrink: 0 }}>
                <LogOut size={16} />
              </button>
            </>
          ) : null}
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#F1F5F9" }}>
        <header style={{ flexShrink: 0, height: 60, background: "#fff", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>{currentTitle(nav, location.pathname)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, width: 280, padding: "8px 13px", background: "#F1F5F9", borderRadius: 10 }}>
              <Search size={16} style={{ color: "#94A3B8" }} />
              <span style={{ fontSize: 13, color: "#94A3B8" }}>Buscar pedidos, itens, clientes…</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 10, cursor: "pointer" }}>
              <Package size={15} style={{ color: "#64748B" }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{orgName}</span>
              <ChevronDown size={14} style={{ color: "#94A3B8" }} />
            </div>
            <div style={{ position: "relative", width: 38, height: 38, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer" }}>
              <Bell size={18} />
              {unread > 0 ? <span style={{ position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: "50%", background: "#EF4444", border: "1.5px solid #fff" }} /> : null}
            </div>
          </div>
        </header>
        <div className="scrl" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 24 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
