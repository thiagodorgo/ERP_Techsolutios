import { PlusCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Alert, Button, Card, Chip, EmptyState, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { calculateDispatchesSummary } from "../dispatches.adapter";
import { createDispatch, getDispatchFromApi, reassignDispatch, updateDispatchStatus } from "../dispatches.service";
import type { DispatchDetail, DispatchListItem, DispatchesFilters as DispatchesFilterState } from "../dispatches.types";
import { useOperationsDispatches } from "../useOperationsDispatches";
import { DispatchCreateForm } from "../components/DispatchCreateForm";
import { DispatchDetailPanel } from "../components/DispatchDetailPanel";
import { DispatchReassignForm } from "../components/DispatchReassignForm";
import { DispatchStatusActions } from "../components/DispatchStatusActions";
import { DispatchesFilters } from "../components/DispatchesFilters";
import { DispatchesSummaryCards } from "../components/DispatchesSummaryCards";
import { DispatchesTable } from "../components/DispatchesTable";

const initialFilters: DispatchesFilterState = {
  search: "",
  status: "all",
  priority: "all",
  operatorUserId: "",
};

export function OperationsDispatchesPage() {
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const initialWorkOrderId = searchParams.get("workOrderId") ?? "";
  const initialOperatorUserId = searchParams.get("operatorUserId") ?? searchParams.get("operatorId") ?? "";
  const initialDispatchId = searchParams.get("dispatchId") ?? "";
  const [filters, setFilters] = useState<DispatchesFilterState>({
    ...initialFilters,
    search: initialDispatchId || initialWorkOrderId,
    operatorUserId: initialOperatorUserId,
    workOrderId: initialWorkOrderId || undefined,
  });
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchDetail | DispatchListItem | null>(null);
  const [quickStatusDispatch, setQuickStatusDispatch] = useState<DispatchListItem | null>(null);
  const [reassignTarget, setReassignTarget] = useState<DispatchListItem | null>(null);
  const [showCreate, setShowCreate] = useState(Boolean(initialWorkOrderId && initialOperatorUserId));
  const { items, allItems, source, fallbackReason, loading, error, refresh } = useOperationsDispatches(filters);
  const summary = useMemo(() => calculateDispatchesSummary(allItems), [allItems]);
  const operatorOptions = useMemo(() => [...new Set(allItems.map((item) => item.operatorUserId))].sort(), [allItems]);
  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  async function loadDetail(dispatch: DispatchListItem) {
    setSelectedDispatch(dispatch);
    const detail = await getDispatchFromApi(context, dispatch.id);
    setSelectedDispatch(detail.dispatch);
  }

  useEffect(() => {
    if (!initialDispatchId) return;
    const dispatch = allItems.find((item) => item.id === initialDispatchId);
    if (dispatch) void loadDetail(dispatch);
  }, [allItems, initialDispatchId]);

  return (
    <section className="page-stack work-orders-page dispatches-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Operacao</span>
          <h1>Despachos Operacionais</h1>
          <p>Acompanhe criacao, status, reatribuicao e cancelamento de despachos vinculados a OS.</p>
        </div>
        <div className="work-orders-actions">
          <Chip tone={source === "api" ? "success" : source === "fallback" ? "warning" : "info"}>
            {source === "api" ? "API real" : source === "fallback" ? "Fallback local" : "Dados demonstrativos"}
          </Chip>
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} /> Atualizar
          </Button>
          {can("field_dispatch:create") ? (
            <Button type="button" onClick={() => setShowCreate((value) => !value)}>
              <PlusCircle size={16} /> Novo despacho
            </Button>
          ) : null}
        </div>
      </header>

      {fallbackReason || error ? (
        <Alert title="Dados demonstrativos" tone="warning">
          {fallbackReason ?? error}
        </Alert>
      ) : null}

      <DispatchesSummaryCards summary={summary} />
      <DispatchesFilters filters={filters} operatorOptions={operatorOptions} onChange={setFilters} />

      {showCreate && can("field_dispatch:create") ? (
        <Card title="Criar despacho">
          <DispatchCreateForm
            initialWorkOrderId={initialWorkOrderId}
            initialOperatorUserId={initialOperatorUserId}
            onSubmit={async (payload) => {
              await createDispatch(context, payload);
              setShowCreate(false);
              await refresh();
            }}
          />
        </Card>
      ) : null}

      <section className="dispatches-layout">
        <div className="dispatches-main">
          {loading && allItems.length === 0 ? <Skeleton lines={5} /> : null}
          {!loading && items.length === 0 ? (
            <EmptyState title="Nenhum despacho encontrado" detail="Ajuste status, prioridade, operador ou busca por OS." />
          ) : null}
          {items.length > 0 ? (
            <DispatchesTable
              items={items}
              canChangeStatus={can("field_dispatch:update")}
              canCancel={can("field_dispatch:cancel")}
              canReassign={can("field_dispatch:reassign")}
              onDetail={(dispatch) => void loadDetail(dispatch)}
              onQuickStatus={setQuickStatusDispatch}
              onReassign={setReassignTarget}
            />
          ) : null}
        </div>
        {selectedDispatch ? <DispatchDetailPanel dispatch={selectedDispatch} /> : null}
      </section>

      {quickStatusDispatch ? (
        <section className="work-order-inline-panel">
          <header>
            <strong>Alterar status de {quickStatusDispatch.workOrderCode ?? quickStatusDispatch.id}</strong>
            <Button type="button" size="sm" variant="ghost" onClick={() => setQuickStatusDispatch(null)}>Fechar</Button>
          </header>
          <DispatchStatusActions
            currentStatus={quickStatusDispatch.status}
            canCancel={can("field_dispatch:cancel")}
            disabled={!can("field_dispatch:update") && !can("field_dispatch:cancel")}
            onSubmit={async (payload) => {
              await updateDispatchStatus(context, quickStatusDispatch.id, payload);
              setQuickStatusDispatch(null);
              await refresh();
            }}
          />
        </section>
      ) : null}

      {reassignTarget ? (
        <section className="work-order-inline-panel">
          <header>
            <strong>Reatribuir {reassignTarget.workOrderCode ?? reassignTarget.id}</strong>
            <Button type="button" size="sm" variant="ghost" onClick={() => setReassignTarget(null)}>Fechar</Button>
          </header>
          <DispatchReassignForm
            currentOperatorUserId={reassignTarget.operatorUserId}
            disabled={!can("field_dispatch:reassign")}
            onSubmit={async (payload) => {
              await reassignDispatch(context, reassignTarget.id, payload);
              setReassignTarget(null);
              await refresh();
            }}
          />
        </section>
      ) : null}
    </section>
  );
}
