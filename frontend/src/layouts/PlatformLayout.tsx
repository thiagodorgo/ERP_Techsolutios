import {
  Activity,
  Building2,
  HeartPulse,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { PlatformGuard } from "../guards/PlatformGuard";
import { platformNavigation } from "../navigation/platformNavigation";
import { canShowNavigationItem } from "../navigation/types";
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
  const { permissions } = usePermissions();
  const visibleItems = platformNavigation.filter((item) => canShowNavigationItem(item, { permissions }));

  return (
    <PlatformGuard>
      <div className="platform-shell">
        <aside className="platform-sidebar">
          <div className="platform-sidebar__brand">
            <Activity size={22} />
            <div>
              <strong>Console da Plataforma</strong>
              <span>Escopo Super Admin</span>
            </div>
          </div>
          <nav>
            {visibleItems.map((item) => {
              const Icon = iconByModule[item.module as keyof typeof iconByModule] ?? LayoutDashboard;

              return item.disabled ? (
                <span key={item.path} className="erp-nav-disabled">
                  <Icon size={18} />
                  <span>{item.label}</span>
                </span>
              ) : (
                <NavLink key={item.path} to={item.path}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
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
