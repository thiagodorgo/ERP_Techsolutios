import { Navigate, Route, Routes } from "react-router-dom";

import { AppProviders } from "./providers/AppProviders";
import { AppShell } from "./layouts/AppShell";
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
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/work-orders" element={<WorkOrdersListPage />} />
          <Route path="/work-orders/new" element={<WorkOrderFormPage />} />
          <Route path="/work-orders/:workOrderId" element={<WorkOrderDetailPage />} />
          <Route path="/logistics" element={<LogisticsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppProviders>
  );
}
