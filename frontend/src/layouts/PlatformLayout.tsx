import {
  Activity,
  Building2,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { Tooltip } from "../components/ui";
import { PlatformGuard } from "../guards/PlatformGuard";
import { platformNavigation } from "../navigation/platformNavigation";
import { filterNavigationItems } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";
import { useTenantContext } from "../providers/TenantProvider";

const iconByModule = {
  "platform-overview": LayoutDashboard,
  "platform-tenants": Building2,
  "platform-modules": SlidersHorizontal,
  "platform-audit": ShieldCheck,
  "platform-health": HeartPulse,
  "platform-settings": Settings,
};

export function PlatformLayout() {
  const { permissions, roles } = usePermissions();
  const { signOut } = useAuth();
  const { clearContext } = useTenantContext();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const visibleItems = filterNavigationItems(
    {
      permissions,
      roles,
      scope: "platform",
      mode: "platform",
    },
    platformNavigation,
  );

  return (
    <PlatformGuard>
      <div className={`platform-shell ${sidebarCollapsed ? "platform-shell--collapsed" : ""}`}>
        <aside className={`platform-sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
          <div className="platform-sidebar__brand">
            <Activity size={22} />
            <div>
              <strong>Console da Plataforma</strong>
              <span>Escopo Super Admin</span>
            </div>
            <Tooltip label={sidebarCollapsed ? "Expandir navegacao" : "Recolher navegacao"}>
              <button
                type="button"
                className="erp-sidebar__toggle"
                onClick={() => setSidebarCollapsed((current) => !current)}
                aria-label={sidebarCollapsed ? "Expandir navegacao" : "Recolher navegacao"}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              </button>
            </Tooltip>
          </div>
          <nav>
            {visibleItems.map((item) => {
              const Icon = iconByModule[(item.icon ?? item.moduleKey) as keyof typeof iconByModule] ?? LayoutDashboard;
              const link = (
                <NavLink key={item.path} to={item.path} aria-label={sidebarCollapsed ? item.label : undefined}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );

              return sidebarCollapsed ? (
                <Tooltip key={item.path} label={item.label}>
                  {link}
                </Tooltip>
              ) : (
                link
              );
            })}
          </nav>
        </aside>
        <main className="platform-main">
          <header className="platform-topbar">
            <strong>ERP Techsolutions</strong>
            <span>Operacoes globais da plataforma</span>
            <Tooltip label="Sair">
              <button
                type="button"
                className="erp-icon-button"
                aria-label="Sair"
                onClick={() => {
                  clearContext();
                  signOut();
                  navigate("/login", { replace: true });
                }}
              >
                <LogOut size={18} />
              </button>
            </Tooltip>
          </header>
          <div className="app-content">
            <Outlet />
          </div>
        </main>
      </div>
    </PlatformGuard>
  );
}
