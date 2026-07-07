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

const ApprovalsPage = lazy(() =>
  import("./modules/work-orders/pages/ApprovalsPage").then((m) => ({
    default: m.ApprovalsPage,
  })),
);
const ApprovalDetailPage = lazy(() =>
  import("./modules/work-orders/pages/ApprovalDetailPage").then((m) => ({
    default: m.ApprovalDetailPage,
  })),
);
const WorkOrdersPage = lazy(() =>
  import("./modules/work-orders/pages/WorkOrdersPage").then((m) => ({
    default: m.WorkOrdersPage,
  })),
);

const ClientesPage = lazy(() => import("./modules/registry/customers/pages/ClientesPage").then((m) => ({ default: m.ClientesPage })));
const ViaturasPage = lazy(() => import("./modules/registry/vehicles/pages/ViaturasPage").then((m) => ({ default: m.ViaturasPage })));
const EquipesPage = lazy(() => import("./modules/registry/teams/pages/EquipesPage").then((m) => ({ default: m.EquipesPage })));
const EstoquePage = lazy(() => import("./modules/inventory/pages/EstoquePage").then((m) => ({ default: m.EstoquePage })));
const EstoqueDetailPage = lazy(() => import("./modules/inventory/pages/EstoqueDetailPage").then((m) => ({ default: m.EstoqueDetailPage })));
const PedidosPage = lazy(() => import("./modules/purchase-orders/pages/PedidosPage").then((m) => ({ default: m.PedidosPage })));
const ReportsPage = lazy(() => import("./modules/reports/pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const UsersPage = lazy(() => import("./modules/users/pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const AuditTenantPage = lazy(() => import("./modules/audit/pages/AuditTenantPage").then((m) => ({ default: m.AuditTenantPage })));
const FieldOperatorsPage = lazy(() => import("./modules/dispatch/pages/FieldOperatorsPage").then((m) => ({ default: m.FieldOperatorsPage })));
const DispatchConsolePage = lazy(() => import("./modules/dispatch/pages/DispatchConsolePage").then((m) => ({ default: m.DispatchConsolePage })));
const FinanceiroPage = lazy(() => import("./modules/finance/pages/FinanceiroPage").then((m) => ({ default: m.FinanceiroPage })));
const ChargesPage = lazy(() => import("./modules/finance/pages/ChargesPage").then((m) => ({ default: m.ChargesPage })));
const InvoicesPage = lazy(() => import("./modules/finance/pages/InvoicesPage").then((m) => ({ default: m.InvoicesPage })));
const PaymentsPage = lazy(() => import("./modules/finance/pages/PaymentsPage").then((m) => ({ default: m.PaymentsPage })));

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

const PlatformOverviewPage = lazy(() =>
  import("./modules/platform/pages/PlatformOverviewPage").then((m) => ({
    default: m.PlatformOverviewPage,
  })),
);
const PlatformPlansModulesPage = lazy(() =>
  import("./modules/platform/pages/PlatformPlansModulesPage").then((m) => ({
    default: m.PlatformPlansModulesPage,
  })),
);
const PlatformAuditPage = lazy(() =>
  import("./modules/platform/pages/PlatformAuditPage").then((m) => ({
    default: m.PlatformAuditPage,
  })),
);
const PlatformHealthPage = lazy(() =>
  import("./modules/platform/pages/PlatformHealthPage").then((m) => ({
    default: m.PlatformHealthPage,
  })),
);
const PlatformApisPage = lazy(() =>
  import("./modules/platform/pages/PlatformApisPage").then((m) => ({
    default: m.PlatformApisPage,
  })),
);
const PlatformSettingsPage = lazy(() =>
  import("./modules/platform/pages/PlatformSettingsPage").then((m) => ({
    default: m.PlatformSettingsPage,
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
              path="/platform/overview"
              element={
                <PermissionGuard permissions={["platform:health:read"]}>
                  <PlatformOverviewPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/platform/plans-modules"
              element={
                <PermissionGuard permissions={["platform:modules:manage"]}>
                  <PlatformPlansModulesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/platform/audit"
              element={
                <PermissionGuard permissions={["platform:audit:read"]}>
                  <PlatformAuditPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/platform/health"
              element={
                <PermissionGuard permissions={["platform:health:read"]}>
                  <PlatformHealthPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/platform/apis"
              element={
                <PermissionGuard permissions={["platform:health:read"]}>
                  <PlatformApisPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/platform/settings"
              element={
                <PermissionGuard permissions={["platform:health:read"]}>
                  <PlatformSettingsPage />
                </PermissionGuard>
              }
            />
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
              path="/approvals"
              element={
                <PermissionGuard permissions={["work_orders:read"]}>
                  <ApprovalsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/approvals/:approvalId"
              element={
                <PermissionGuard permissions={["work_orders:read"]}>
                  <ApprovalDetailPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/cadastros/clientes"
              element={
                <PermissionGuard permissions={["customers:read"]}>
                  <ClientesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/cadastros/viaturas"
              element={
                <PermissionGuard permissions={["vehicles:read"]}>
                  <ViaturasPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/cadastros/equipes"
              element={
                <PermissionGuard permissions={["teams:read"]}>
                  <EquipesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/inventory"
              element={
                <PermissionGuard permissions={["inventory:read"]}>
                  <EstoquePage />
                </PermissionGuard>
              }
            />
            <Route
              path="/inventory/:sku"
              element={
                <PermissionGuard permissions={["inventory:read"]}>
                  <EstoqueDetailPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/purchase-orders"
              element={
                <PermissionGuard permissions={["purchase_orders:read"]}>
                  <PedidosPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <PermissionGuard permissions={["reports:read"]}>
                  <ReportsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/users"
              element={
                <PermissionGuard permissions={["users:read"]}>
                  <UsersPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/audit"
              element={
                <PermissionGuard permissions={["audit:view"]}>
                  <AuditTenantPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/field-operators"
              element={
                <PermissionGuard permissions={["field_dispatch:read"]}>
                  <FieldOperatorsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/dispatch/console"
              element={
                <PermissionGuard permissions={["field_dispatch:read"]}>
                  <DispatchConsolePage />
                </PermissionGuard>
              }
            />
            <Route
              path="/finance"
              element={
                <PermissionGuard permissions={["finance:read"]}>
                  <FinanceiroPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/finance/charges"
              element={
                <PermissionGuard permissions={["finance:read"]}>
                  <ChargesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/finance/invoices"
              element={
                <PermissionGuard permissions={["finance:read"]}>
                  <InvoicesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/finance/payments"
              element={
                <PermissionGuard permissions={["finance:read"]}>
                  <PaymentsPage />
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
