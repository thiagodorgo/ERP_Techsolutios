import { Navigate, Route, Routes } from "react-router-dom";

import { PermissionGuard } from "./guards/PermissionGuard";
import { AppProviders } from "./providers/AppProviders";
import { AppShell } from "./layouts/AppShell";
import { TenantChecklistsPage } from "./modules/checklists/pages/TenantChecklistsPage";
import { PlatformLayout } from "./layouts/PlatformLayout";
import { PlatformTenantDetailPage } from "./modules/platform/pages/PlatformTenantDetailPage";
import { PlatformTenantModulesPage } from "./modules/platform/pages/PlatformTenantModulesPage";
import { PlatformTenantsPage } from "./modules/platform/pages/PlatformTenantsPage";
import { ContextSelectionPage } from "./pages/ContextSelectionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LogisticsPage } from "./pages/LogisticsPage";
import { LoginPage } from "./pages/LoginPage";
import { WorkOrderDetailPage } from "./pages/WorkOrderDetailPage";
import { WorkOrderFormPage } from "./pages/WorkOrderFormPage";
import { WorkOrdersListPage } from "./pages/WorkOrdersListPage";

export function App() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-context" element={<ContextSelectionPage />} />
        <Route element={<PlatformLayout />}>
          <Route
            path="/platform/tenants"
            element={
              <PermissionGuard permissions={["platform:tenants:read"]}>
                <PlatformTenantsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/platform/tenants/:tenantId"
            element={
              <PermissionGuard permissions={["platform:tenants:read"]}>
                <PlatformTenantDetailPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/platform/tenants/:tenantId/modules"
            element={
              <PermissionGuard permissions={["platform:modules:manage"]}>
                <PlatformTenantModulesPage />
              </PermissionGuard>
            }
          />
        </Route>
        <Route element={<AppShell />}>
          <Route
            path="/dashboard"
            element={
              <PermissionGuard permissions={["dashboard:view"]}>
                <DashboardPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/administrator/checklists"
            element={
              <PermissionGuard permissions={["tenant_checklists:read"]}>
                <TenantChecklistsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/work-orders"
            element={
              <PermissionGuard permissions={["work-orders:view"]}>
                <WorkOrdersListPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/work-orders/new"
            element={
              <PermissionGuard permissions={["work-orders:create"]}>
                <WorkOrderFormPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/work-orders/:workOrderId"
            element={
              <PermissionGuard permissions={["work-orders:view"]}>
                <WorkOrderDetailPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/logistics"
            element={
              <PermissionGuard permissions={["logistics:dispatch"]}>
                <LogisticsPage />
              </PermissionGuard>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppProviders>
  );
}
