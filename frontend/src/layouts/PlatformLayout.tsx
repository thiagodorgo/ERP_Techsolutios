import {
  Activity,
  Building2,
  CloudCog,
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
import { groupNavigationItems, useNavigationMenu } from "../modules/navigation";
import { platformNavigation } from "../navigation/platformNavigation";
import { filterNavigationItems, type NavigationItem } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";
import { useTenantContext } from "../providers/TenantProvider";

const iconByModule = {
  "platform-overview": LayoutDashboard,
  "platform-tenants": Building2,
  "platform-modules": SlidersHorizontal,
  "platform-cloud-billing": CloudCog,
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
  const navigationMenu = useNavigationMenu({ scope: "platform" });
  const visibleItems = filterNavigationItems(
    {
      permissions,
      roles,
      scope: "platform",
      mode: "platform",
    },
    navigationMenu.items ?? platformNavigation,
  );
  const visibleGroups = groupNavigationItems(visibleItems);

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
            {visibleGroups.map((group) => (
              <div className="platform-sidebar__group" key={group.scope}>
                {!sidebarCollapsed ? <span className="platform-sidebar__group-label">{group.label}</span> : null}
                {group.items.map((item) => {
                  const Icon = item.iconComponent ?? iconByModule[(item.icon ?? item.moduleKey) as keyof typeof iconByModule] ?? LayoutDashboard;
                  const link = (
                    <NavLink key={item.path} to={item.path} aria-label={sidebarCollapsed ? item.label : undefined}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                      {!sidebarCollapsed ? <NavigationStatusBadge item={item} /> : null}
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
              </div>
            ))}
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

function NavigationStatusBadge({ item }: { item: NavigationItem }) {
  const status = item.backendStatus ?? item.status;

  if (!status || status === "active" || status === "implemented" || status === "partial") {
    return null;
  }

  return <span className="erp-nav-status">{status}</span>;
}
