import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { MobileHeader, Sidebar, Topbar } from "../components/erp";
import { Drawer } from "../components/ui";
import { getUnreadNotificationCount } from "../modules/notifications/notification.service";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";
import { useTenantContext } from "../providers/TenantProvider";

export function AppShell() {
  const { isAuthenticated, isLoading, session } = useAuth();
  const { activeContext } = useTenantContext();
  const { permissions } = usePermissions();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
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

  const refreshNotificationCount = useCallback(async () => {
    if (!notificationContext) {
      setNotificationUnreadCount(0);
      return;
    }

    try {
      const unread = await getUnreadNotificationCount(notificationContext);
      setNotificationUnreadCount(unread.count);
    } catch {
      setNotificationUnreadCount(0);
    }
  }, [notificationContext]);

  useEffect(() => {
    void refreshNotificationCount();

    window.addEventListener("notifications:changed", refreshNotificationCount);
    return () => window.removeEventListener("notifications:changed", refreshNotificationCount);
  }, [refreshNotificationCount]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!activeContext) return <Navigate to="/select-context" replace />;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "app-shell--collapsed" : ""}`}>
      <Sidebar
        context={activeContext}
        collapsed={sidebarCollapsed}
        notificationUnreadCount={notificationUnreadCount}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />
      <MobileHeader onMenu={() => setMobileNavOpen(true)} />
      <Drawer title="Navegacao" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
        <Sidebar context={activeContext} notificationUnreadCount={notificationUnreadCount} />
      </Drawer>
      <main className="app-main">
        <Topbar context={activeContext} notificationUnreadCount={notificationUnreadCount} />
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
