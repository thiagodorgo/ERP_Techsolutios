import {
  Activity,
  Bell,
  Box,
  ChevronDown,
  ChevronRight,
  Cloud,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Search,
  Server,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { PlatformGuard } from "../guards/PlatformGuard";
import { useAuth } from "../providers/AuthProvider";
import { useTenantContext } from "../providers/TenantProvider";

type PlatformNavItem = {
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
};

type PlatformNavGroup = {
  readonly label: string;
  readonly items: readonly PlatformNavItem[];
};

const PLATFORM_NAV: readonly PlatformNavGroup[] = [
  {
    label: "PRINCIPAL",
    items: [
      { label: "Visão Geral", path: "/platform/overview", icon: LayoutDashboard },
      { label: "Organizações", path: "/platform/tenants", icon: Server },
      { label: "Planos e Módulos", path: "/platform/plans-modules", icon: Box },
      { label: "Cloud Billing", path: "/platform/cloud-billing", icon: Cloud },
    ],
  },
  {
    label: "PLATAFORMA",
    items: [
      { label: "Auditoria Global", path: "/platform/audit", icon: ShieldCheck },
      { label: "Health do Sistema", path: "/platform/health", icon: Activity },
      { label: "APIs e Credenciais", path: "/platform/apis", icon: KeyRound },
      { label: "Configurações", path: "/platform/settings", icon: Settings },
    ],
  },
];

const NAVY = "#0D1B2A";
const ACTIVE = "#2563EB";
const NAV_IDLE = "#9FB4CC";
const GROUP_LABEL = "#41607A";

function currentTitle(pathname: string): string {
  for (const group of PLATFORM_NAV) {
    for (const item of group.items) {
      if (pathname.startsWith(item.path)) return item.label;
    }
  }
  return "Plataforma";
}

export function PlatformLayout() {
  const { signOut } = useAuth();
  const { clearContext } = useTenantContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 74 : 236;

  return (
    <PlatformGuard>
      <div style={{ height: "100vh", display: "flex", background: "#F1F5F9" }}>
        {/* SIDEBAR */}
        <aside
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            background: NAVY,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid rgba(255,255,255,.06)",
            transition: "width .16s ease",
          }}
        >
          <div
            style={{
              padding: "16px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              gap: 12,
              borderBottom: "1px solid rgba(255,255,255,.06)",
            }}
          >
            {collapsed ? (
              // Colapsada — o LOGO É o botão de expandir (padrão `.logo-toggle` do protótipo). Um único
              // elemento, sem o botão de 28px sobreposto ao ícone (bug do "botão atrás do ícone").
              <button
                type="button"
                title="Expandir menu"
                aria-label="Expandir menu"
                onClick={() => setCollapsed(false)}
                className="sidebar-logo-toggle"
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #33475B", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}
              >
                <svg className="ic-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7BE084" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21V11" />
                  <path d="M12 11c-4 0-7-2.6-7.8-6.4C8 4 11 6 12 9.6" />
                  <path d="M12 9.6C13 6 16 4 19.8 4.6 19 8.4 16 11 12 11" />
                </svg>
                <ChevronRight className="ic-back" size={18} style={{ color: "#9FB4CC" }} />
              </button>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: "1px solid #33475B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7BE084" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21V11" />
                      <path d="M12 11c-4 0-7-2.6-7.8-6.4C8 4 11 6 12 9.6" />
                      <path d="M12 9.6C13 6 16 4 19.8 4.6 19 8.4 16 11 12 11" />
                    </svg>
                  </div>
                  <div style={{ lineHeight: 1.15, whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>TechSolutions</div>
                    <div style={{ fontSize: 10, color: "#5E8C86", fontWeight: 600, letterSpacing: ".12em" }}>PLATAFORMA ERP</div>
                  </div>
                </div>
                <button
                  type="button"
                  title="Recolher menu"
                  aria-label="Recolher menu"
                  onClick={() => setCollapsed((c) => !c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(255,255,255,.06)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    color: NAV_IDLE,
                  }}
                >
                  <ChevronDown size={15} style={{ transform: "rotate(90deg)" }} />
                </button>
              </>
            )}
          </div>

          <nav style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12 }}>
            {PLATFORM_NAV.map((group) => (
              <div key={group.label} style={{ marginBottom: 6 }}>
                {!collapsed ? (
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: GROUP_LABEL, padding: "14px 10px 7px", whiteSpace: "nowrap" }}>
                    {group.label}
                  </div>
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
                    {!collapsed ? <span style={{ fontSize: 13.5 }}>{item.label}</span> : null}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div
            style={{
              flexShrink: 0,
              padding: 12,
              borderTop: "1px solid rgba(255,255,255,.06)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#1E3A5F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9DC3E6",
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              AP
            </div>
            {!collapsed ? (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Admin Plataforma
                  </div>
                  <div style={{ fontSize: 10.5, color: "#5B7A96", whiteSpace: "nowrap" }}>Super-administrador</div>
                </div>
                <button
                  type="button"
                  aria-label="Sair"
                  onClick={() => {
                    clearContext();
                    signOut();
                    navigate("/login", { replace: true });
                  }}
                  style={{ background: "none", border: "none", color: GROUP_LABEL, cursor: "pointer", display: "flex", flexShrink: 0 }}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : null}
          </div>
        </aside>

        {/* MAIN */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#F1F5F9" }}>
          <header
            style={{
              flexShrink: 0,
              height: 60,
              background: "#fff",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>{currentTitle(location.pathname)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, width: 280, padding: "8px 13px", background: "#F1F5F9", borderRadius: 10 }}>
                <Search size={16} style={{ color: "#94A3B8" }} />
                <span style={{ fontSize: 13, color: "#94A3B8" }}>Buscar organização, recurso, serviço…</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 11px", border: "1px solid #E2E8F0", borderRadius: 10, cursor: "pointer" }}>
                <Server size={15} style={{ color: "#64748B" }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>Todas as organizações</span>
                <ChevronDown size={14} style={{ color: "#94A3B8" }} />
              </div>
              <div style={{ position: "relative", width: 38, height: 38, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer" }}>
                <Bell size={18} />
                <span style={{ position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: "50%", background: "#EF4444", border: "1.5px solid #fff" }} />
              </div>
            </div>
          </header>
          <div className="scrl" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 24 }}>
            <Outlet />
          </div>
        </div>
      </div>
    </PlatformGuard>
  );
}
