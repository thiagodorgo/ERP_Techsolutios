import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { MobileHeader, Sidebar, Topbar } from "../components/erp";
import { Drawer } from "../components/ui";
import { useAuth } from "../providers/AuthProvider";
import { useTenantContext } from "../providers/TenantProvider";

export function AppShell() {
  const { isAuthenticated } = useAuth();
  const { activeContext } = useTenantContext();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!activeContext) return <Navigate to="/select-context" replace />;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "app-shell--collapsed" : ""}`}>
      <Sidebar context={activeContext} collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((current) => !current)} />
      <MobileHeader onMenu={() => setMobileNavOpen(true)} />
      <Drawer title="Navegacao" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
        <Sidebar context={activeContext} />
      </Drawer>
      <main className="app-main">
        <Topbar context={activeContext} />
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
