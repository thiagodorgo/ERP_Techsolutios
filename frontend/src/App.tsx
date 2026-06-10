import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { PermissionGuard } from "./guards/PermissionGuard";
import { AppProviders } from "./providers/AppProviders";
import { AppShell } from "./layouts/AppShell";
import { PlatformLayout } from "./layouts/PlatformLayout";
import { ChecklistRuntimePage } from "./modules/checklists/pages/ChecklistRuntimePage";
import { ChecklistRunsPage } from "./modules/checklists/pages/ChecklistRunsPage";
import { TenantChecklistsPage } from "./modules/checklists/pages/TenantChecklistsPage";
import { NotificationsPage } from "./modules/notifications/pages/NotificationsPage";
import { TenantSettingsPage } from "./modules/settings/pages/TenantSettingsPage";
import { ContextSelectionPage } from "./pages/ContextSelectionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LogisticsPage } from "./pages/LogisticsPage";
import { LoginPage } from "./pages/LoginPage";

const OperationsDispatchesPage = lazy(() =>
  import("./modules/operations/dispatches/pages/OperationsDispatchesPage").then((m) => ({
    default: m.OperationsDispatchesPage,
  })),
);

const OperationsMapPage = lazy(() =>
  import("./modules/operations/map/pages/OperationsMapPage").then((m) => ({
    default: m.OperationsMapPage,
  })),
);

const WorkOrderCreatePage = lazy(() =>
  import("./modules/work-orders/pages/WorkOrderCreatePage").then((m) => ({
    default: m.WorkOrderCreatePage,
  })),
);

const WorkOrderDetailPage = lazy(() =>
  import("./modules/work-orders/pages/WorkOrderDetailPage").then((m) => ({
    default: m.WorkOrderDetailPage,
  })),
);

const WorkOrdersPage = lazy(() =>
  import("./modules/work-orders/pages/WorkOrdersPage").then((m) => ({
    default: m.WorkOrdersPage,
  })),
);

const PlatformCloudBillingPage = lazy(() =>
  import("./modules/platform/cloud-billing/pages/PlatformCloudBillingPage").then((m) => ({
    default: m.PlatformCloudBillingPage,
  })),
);

const PlatformTenantDetailPage = lazy(() =>
  import("./modules/platform/pages/PlatformTenantDetailPage").then((m) => ({
    default: m.PlatformTenantDetailPage,
  })),
);

const PlatformTenantModulesPage = lazy(() =>
  import("./modules/platform/pages/PlatformTenantModulesPage").then((m) => ({
    default: m.PlatformTenantModulesPage,
  })),
);

const PlatformTenantsPage = lazy(() =>
  import("./modules/platform/pages/PlatformTenantsPage").then((m) => ({
    default: m.PlatformTenantsPage,
  })),
);

function PageLoader() {
  return <div style={{ padding: "2rem", textAlign: "center" }}>Carregando...</div>;
}

export function App() {
  return (
    <AppProviders>
      <Suspense fallback={<PageLoader />}>
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
              path="/operations/dispatches"
              element={
                <PermissionGuard permissions={["field_dispatch:read"]}>
                  <OperationsDispatchesPage />
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
      </Suspense>
    </AppProviders>
  );
}
