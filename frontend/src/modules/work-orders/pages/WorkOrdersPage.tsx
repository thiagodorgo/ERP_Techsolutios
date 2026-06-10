import { PlusCircle, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, Button, Chip, EmptyState, Skeleton } from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { calculateWorkOrdersSummary } from "../work-orders.adapter";
import { updateWorkOrderStatus } from "../work-orders.service";
import type { WorkOrderListItem, WorkOrdersFilters as WorkOrdersFilterState } from "../work-orders.types";
import { useWorkOrders } from "../useWorkOrders";
import { WorkOrderStatusActions } from "../components/WorkOrderStatusActions";
import { WorkOrdersFilters } from "../components/WorkOrdersFilters";
import { WorkOrdersSummaryCards } from "../components/WorkOrdersSummaryCards";
import { WorkOrdersTable } from "../components/WorkOrdersTable";

const initialFilters: WorkOrdersFilterState = {
  search: "",
  status: "all",
  priority: "all",
  assignedOperatorId: "",
  from: "",
  to: "",
};

export function WorkOrdersPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const [filters, setFilters] = useState<WorkOrdersFilterState>(initialFilters);
  const [quickStatusWorkOrder, setQuickStatusWorkOrder] = useState<WorkOrderListItem | null>(null);
  const { items, allItems, source, fallbackReason, loading, error, refresh } = useWorkOrders(filters);
  const summary = useMemo(() => calculateWorkOrdersSummary(allItems), [allItems]);

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Operacao</span>
          <h1>Ordens de Servico</h1>
          <p>Gerencie atendimentos, atribuicoes e status operacionais.</p>
        </div>
        <div className="work-orders-actions">
          <Chip tone={source === "api" ? "success" : source === "fallback" ? "warning" : "info"}>
            {source === "api" ? "API real" : source === "fallback" ? "Fallback local" : "Dados demonstrativos"}
          </Chip>
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} /> Atualizar
          </Button>
          {can("work_orders:create") ? (
            <Button type="button" onClick={() => navigate("/work-orders/new")}>
              <PlusCircle size={16} /> Nova OS
            </Button>
          ) : null}
        </div>
      </header>

      {fallbackReason || error ? (
        <Alert title="Dados demonstrativos" tone="warning">
          {fallbackReason ?? error}
        </Alert>
      ) : null}

      <WorkOrdersSummaryCards summary={summary} />
      <WorkOrdersFilters filters={filters} onChange={setFilters} />

      {loading && allItems.length === 0 ? <Skeleton lines={5} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="Nenhuma OS encontrada" detail="Ajuste status, prioridade, periodo, operador ou busca." />
      ) : null}
      {items.length > 0 ? (
        <WorkOrdersTable items={items} canChangeStatus={can("work_orders:status")} onQuickStatus={setQuickStatusWorkOrder} />
      ) : null}

      {quickStatusWorkOrder ? (
        <section className="work-order-inline-panel">
          <header>
            <strong>Alterar status de {quickStatusWorkOrder.code}</strong>
            <Button type="button" size="sm" variant="ghost" onClick={() => setQuickStatusWorkOrder(null)}>Fechar</Button>
          </header>
          <WorkOrderStatusActions
            currentStatus={quickStatusWorkOrder.status}
            disabled={!can("work_orders:status")}
            onSubmit={async (payload) => {
              if (!activeContext) return;
              await updateWorkOrderStatus(
                {
                  token: session?.accessToken,
                  tenantId: activeContext.tenantId,
                  branchId: activeContext.branchId,
                  role: activeContext.role,
                  permissions: activeContext.permissions,
                },
                quickStatusWorkOrder.id,
                payload,
              );
              setQuickStatusWorkOrder(null);
              await refresh();
            }}
          />
        </section>
      ) : null}
    </section>
  );
}
