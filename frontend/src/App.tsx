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
const ServicosPage = lazy(() => import("./modules/registry/service-catalog/pages/ServicosPage").then((m) => ({ default: m.ServicosPage })));
const TabelasValoresPage = lazy(() => import("./modules/registry/price-tables/pages/TabelasValoresPage").then((m) => ({ default: m.TabelasValoresPage })));
const TarifasPage = lazy(() => import("./modules/registry/tariffs/pages/TarifasPage").then((m) => ({ default: m.TarifasPage })));
const OrcamentosPage = lazy(() => import("./modules/registry/service-quotes/pages/OrcamentosPage").then((m) => ({ default: m.OrcamentosPage })));
const FiliaisPage = lazy(() => import("./modules/registry/branches/pages/FiliaisPage").then((m) => ({ default: m.FiliaisPage })));
const FornecedoresPage = lazy(() => import("./modules/registry/suppliers/pages/FornecedoresPage").then((m) => ({ default: m.FornecedoresPage })));
const TagsPage = lazy(() => import("./modules/registry/tags/pages/TagsPage").then((m) => ({ default: m.TagsPage })));
const PontosInteressePage = lazy(() => import("./modules/registry/pois/pages/PontosInteressePage").then((m) => ({ default: m.PontosInteressePage })));
const ProfissionaisPage = lazy(() => import("./modules/registry/operator-profiles/pages/ProfissionaisPage").then((m) => ({ default: m.ProfissionaisPage })));
const AbastecimentoPage = lazy(() => import("./modules/fleet/fuel/pages/AbastecimentoPage").then((m) => ({ default: m.AbastecimentoPage })));
const ManutencaoPage = lazy(() => import("./modules/fleet/maintenance/pages/ManutencaoPage").then((m) => ({ default: m.ManutencaoPage })));
const MultasPage = lazy(() => import("./modules/fleet/fines/pages/MultasPage").then((m) => ({ default: m.MultasPage })));
const SegurosPage = lazy(() => import("./modules/fleet/insurance/pages/SegurosPage").then((m) => ({ default: m.SegurosPage })));
const DanosPage = lazy(() => import("./modules/fleet/damages/pages/DanosPage").then((m) => ({ default: m.DanosPage })));
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
const RemuneracoesPage = lazy(() => import("./modules/finance/commissions/pages/RemuneracoesPage").then((m) => ({ default: m.RemuneracoesPage })));

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
                <PermissionGuard permissions={["dashboard:read", "dashboard:view"]}>
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
              path="/cadastros/servicos"
              element={
                <PermissionGuard permissions={["service_catalog:read"]}>
                  <ServicosPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/cadastros/tabelas-valores"
              element={
                <PermissionGuard permissions={["price_tables:read"]}>
                  <TabelasValoresPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/cadastros/tarifas"
              element={
                <PermissionGuard permissions={["tariffs:read"]}>
                  <TarifasPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/cadastros/filiais"
              element={
                <PermissionGuard permissions={["branches:read"]}>
                  <FiliaisPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/cadastros/fornecedores"
              element={
                <PermissionGuard permissions={["suppliers:read"]}>
                  <FornecedoresPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/cadastros/tags"
              element={
                <PermissionGuard permissions={["tags:read"]}>
                  <TagsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/cadastros/pontos-interesse"
              element={
                <PermissionGuard permissions={["pois:read"]}>
                  <PontosInteressePage />
                </PermissionGuard>
              }
            />
            <Route
              path="/cadastros/profissionais"
              element={
                <PermissionGuard permissions={["operator_profiles:read"]}>
                  <ProfissionaisPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/fleet/fuel"
              element={
                <PermissionGuard permissions={["fuel_logs:read"]}>
                  <AbastecimentoPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/fleet/maintenance"
              element={
                <PermissionGuard permissions={["maintenance_orders:read"]}>
                  <ManutencaoPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/fleet/fines"
              element={
                <PermissionGuard permissions={["fines:read"]}>
                  <MultasPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/fleet/insurance"
              element={
                <PermissionGuard permissions={["insurance_policies:read"]}>
                  <SegurosPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/fleet/damages"
              element={
                <PermissionGuard permissions={["damages:read"]}>
                  <DanosPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/inventory"
              element={
                <PermissionGuard permissions={["inventory_items:read"]}>
                  <EstoquePage />
                </PermissionGuard>
              }
            />
            {/* F7a: a API busca item por ID (GET /inventory-items/:id) → rota por :id, não :sku. */}
            <Route
              path="/inventory/:id"
              element={
                <PermissionGuard permissions={["inventory_items:read"]}>
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
                <PermissionGuard permissions={["users.read", "users:read"]}>
                  <UsersPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/audit"
              element={
                <PermissionGuard permissions={["audit:read", "audit.read", "audit:view"]}>
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
                // Dashboard financeiro: gate REAL do backend (o /financial-summary exige financial_entries:read).
                // finance:read fica como fallback de compat (permissão só-de-UI/demo; era órfã p/ não-admins).
                <PermissionGuard permissions={["financial_entries:read", "finance:read"]}>
                  <FinanceiroPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/finance/charges"
              element={
                <PermissionGuard permissions={["financial_titles:read"]}>
                  <ChargesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/finance/invoices"
              element={
                // Faturas ≈ títulos/faturamento → gate real financial_titles:read (como Cobranças/Pagamentos);
                // finance:read fica como fallback de compat (era órfã p/ não-admins).
                <PermissionGuard permissions={["financial_titles:read", "finance:read"]}>
                  <InvoicesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="/finance/payments"
              element={
                <PermissionGuard permissions={["financial_titles:read"]}>
                  <PaymentsPage />
                </PermissionGuard>
              }
            />
            {/* F8 Remunerações — extrato de comissões (adaptativo por permissão: read → todos; read_own → próprio). */}
            <Route
              path="/finance/commissions"
              element={
                <PermissionGuard permissions={["commissions:read", "commissions:read_own"]}>
                  <RemuneracoesPage />
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
              path="/operations/quotes"
              element={
                <PermissionGuard permissions={["service_quotes:read"]}>
                  <OrcamentosPage />
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
                <PermissionGuard permissions={["tenant_settings:read", "tenant.manage", "tenant:manage"]}>
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
