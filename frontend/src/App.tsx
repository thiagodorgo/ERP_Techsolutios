import { Navigate, Route, Routes } from "react-router-dom";

import { PermissionGuard } from "./guards/PermissionGuard";
import { AppProviders } from "./providers/AppProviders";
import { AppShell } from "./layouts/AppShell";
import { ChecklistRuntimePage } from "./modules/checklists/pages/ChecklistRuntimePage";
import { ChecklistRunsPage } from "./modules/checklists/pages/ChecklistRunsPage";
import { TenantChecklistsPage } from "./modules/checklists/pages/TenantChecklistsPage";
import { NotificationsPage } from "./modules/notifications/pages/NotificationsPage";
import { OperationsMapPage } from "./modules/operations/map/pages/OperationsMapPage";
import { WorkOrderCreatePage } from "./modules/work-orders/pages/WorkOrderCreatePage";
import { WorkOrderDetailPage } from "./modules/work-orders/pages/WorkOrderDetailPage";
import { WorkOrdersPage } from "./modules/work-orders/pages/WorkOrdersPage";
import { TenantSettingsPage } from "./modules/settings/pages/TenantSettingsPage";
import { PlatformLayout } from "./layouts/PlatformLayout";
import { PlatformCloudBillingPage } from "./modules/platform/cloud-billing/pages/PlatformCloudBillingPage";
import { PlatformTenantDetailPage } from "./modules/platform/pages/PlatformTenantDetailPage";
import { PlatformTenantModulesPage } from "./modules/platform/pages/PlatformTenantModulesPage";
import { PlatformTenantsPage } from "./modules/platform/pages/PlatformTenantsPage";
import { ContextSelectionPage } from "./pages/ContextSelectionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LogisticsPage } from "./pages/LogisticsPage";
import { LoginPage } from "./pages/LoginPage";

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
          <Route
            path="/platform/cloud-billing"
            element={
              <PermissionGuard
                permissions={[
                  "platform:cloud-usage:read",
                  "platform:cloud-costs:read",
                  "platform:cloud-cost-allocation:read",
                  "platform:cloud-charges:read",
                  "platform:cloud-charge-rules:read",
                ]}
              >
                <PlatformCloudBillingPage />
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
            path="/operations/checklists"
            element={
              <PermissionGuard permissions={["checklist_runs:read", "checklist_runs:create"]}>
                <ChecklistRunsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/operations/checklists/:checklistId/run"
            element={
              <PermissionGuard permissions={["checklist_runs:create"]}>
                <ChecklistRuntimePage />
              </PermissionGuard>
            }
          />
          <Route
            path="/operations/map"
            element={
              <PermissionGuard permissions={["field_location:read"]}>
                <OperationsMapPage />
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
            path="/administrator/settings"
            element={
              <PermissionGuard permissions={["tenant:manage"]}>
                <TenantSettingsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/work-orders"
            element={
              <PermissionGuard permissions={["work_orders:read"]}>
                <WorkOrdersPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/work-orders/new"
            element={
              <PermissionGuard permissions={["work_orders:create"]}>
                <WorkOrderCreatePage />
              </PermissionGuard>
            }
          />
          <Route
            path="/work-orders/:workOrderId"
            element={
              <PermissionGuard permissions={["work_orders:read"]}>
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
          <Route
            path="/notifications"
            element={
              <PermissionGuard permissions={["notifications:read"]}>
                <NotificationsPage />
              </PermissionGuard>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppProviders>
  );
}
