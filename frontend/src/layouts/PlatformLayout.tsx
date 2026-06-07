import {
  Activity,
  Building2,
  HeartPulse,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { Tooltip } from "../components/ui";
import { PlatformGuard } from "../guards/PlatformGuard";
import { platformNavigation } from "../navigation/platformNavigation";
import { filterNavigationItems } from "../navigation/types";
import { usePermissions } from "../providers/PermissionProvider";

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
          </header>
          <div className="app-content">
            <Outlet />
          </div>
        </main>
      </div>
    </PlatformGuard>
  );
}
