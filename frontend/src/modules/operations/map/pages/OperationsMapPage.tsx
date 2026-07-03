import { AlertTriangle, Map, Pause, Play, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Alert, Button, Chip, EmptyState, ErrorState, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import {
  calculateOperationsMapSummary,
  filterFieldLocationsByWorkOrder,
  filterFieldLocations,
  formatFieldLocationDate,
  listOperationTeams,
} from "../operations-map.adapter";
import type { FieldLocationItem, OperationsMapFilters as OperationsMapFilterState } from "../operations-map.types";
import { useOperationsMap } from "../useOperationsMap";
import { OperationsMapCanvas } from "../components/OperationsMapCanvas";
import { OperationsMapFilters } from "../components/OperationsMapFilters";
import { OperationsMapSummaryCards } from "../components/OperationsMapSummaryCards";
import { OperationsOperatorDetailPanel } from "../components/OperationsOperatorDetailPanel";
import { OperationsOperatorList } from "../components/OperationsOperatorList";

const initialFilters: OperationsMapFilterState = {
  status: "all",
  team: "all",
  staleOnly: false,
  search: "",
};

export function OperationsMapPage() {
  const {
    locations,
    source,
    fallbackReason,
    loading,
    isRefreshing,
    error,
    refreshedAt,
    realtime,
    refresh,
    autoRefresh,
    setAutoRefresh,
  } = useOperationsMap();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<OperationsMapFilterState>(initialFilters);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const workOrderContextId = searchParams.get("workOrderId")?.trim() || undefined;
  const canReadWorkOrders = can("work_orders:read");
  const canReadDispatches = can("field_dispatch:read");
  const canCreateDispatches = can("field_dispatch:create");
  const canUpdateDispatches = can("field_dispatch:update");
  const canCancelDispatches = can("field_dispatch:cancel");
  const canReassignDispatches = can("field_dispatch:reassign");
  const dispatchContext = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );
  const workOrderContextLocations = useMemo(
    () => filterFieldLocationsByWorkOrder(locations, workOrderContextId),
    [locations, workOrderContextId],
  );
  const teams = useMemo(() => listOperationTeams(workOrderContextLocations), [workOrderContextLocations]);
  const filteredLocations = useMemo(
    () => filterFieldLocations(workOrderContextLocations, filters),
    [filters, workOrderContextLocations],
  );
  const summary = useMemo(() => calculateOperationsMapSummary(workOrderContextLocations), [workOrderContextLocations]);
  const workOrderContextLabel =
    workOrderContextLocations.find((location) => location.currentWorkOrder?.id === workOrderContextId)?.currentWorkOrder?.code ??
    workOrderContextId;
  const selectedLocation =
    filteredLocations.find((location) => location.id === selectedId) ??
    filteredLocations[0] ??
    workOrderContextLocations.find((location) => location.id === selectedId);
  const clearWorkOrderContext = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("workOrderId");
    setSearchParams(nextParams, { replace: true });
    setSelectedId(undefined);
  };

  useEffect(() => {
    if (filteredLocations[0] && (!selectedId || !filteredLocations.some((location) => location.id === selectedId))) {
      setSelectedId(filteredLocations[0].id);
    }
  }, [filteredLocations, selectedId]);

  return (
    <div className="page-stack operations-map-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Operação em campo</span>
          <h1>Mapa Operacional</h1>
          <p>Acompanhe a última localização conhecida dos operadores em campo.</p>
        </div>
        <div className="operations-map-actions">
          <Chip tone={source === "api" ? "success" : source === "fallback" ? "warning" : "info"}>
            Fonte: {source === "api" ? "API real" : source === "fallback" ? "fallback seguro" : "dados de demonstração"}
          </Chip>
          <Chip tone={realtime.status === "connected" ? "success" : realtime.status === "unavailable" ? "danger" : "warning"}>
            {realtime.label}
          </Chip>
          {realtime.fallbackPolling && realtime.status !== "fallback" ? <Chip tone="warning">Atualização periódica</Chip> : null}
          {canReadWorkOrders ? <Chip tone="info">OS vinculadas</Chip> : null}
          {canReadDispatches ? <Chip tone="info">Despachos vinculados</Chip> : null}
          {refreshedAt ? <Chip tone="default">Atualizado {formatFieldLocationDate(refreshedAt)}</Chip> : null}
          {isRefreshing ? <Chip tone="info">Atualizando...</Chip> : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAutoRefresh((prev) => !prev)}
            title={autoRefresh ? "Pausar atualização automática" : "Retomar atualização automática"}
          >
            {autoRefresh ? <><Pause size={16} /> Pausar auto</> : <><Play size={16} /> Auto atualizar</>}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading || isRefreshing}>
            <RefreshCw size={16} /> Atualizar
          </Button>
        </div>
      </header>

      {source === "fallback" ? (
        <Alert title="Fallback seguro ativo" tone="warning">
          {fallbackReason ?? "A tela está usando dados locais seguros até a API retornar dados."}
        </Alert>
      ) : null}
      {error ? (
        <Alert title="Fonte de dados degradada" tone="warning">
          {error}
        </Alert>
      ) : null}
      {realtime.status === "degraded" ? (
        <Alert title="Realtime degradado" tone="warning">
          {realtime.detail}
        </Alert>
      ) : null}
      {realtime.status === "unavailable" ? (
        <Alert title="Realtime indisponível" tone="warning">
          {realtime.detail}
        </Alert>
      ) : null}
      {workOrderContextId ? (
        <section className="erp-filter-bar operations-map-actions" aria-label="Contexto da ordem de serviço">
          <Chip tone={workOrderContextLocations.length > 0 ? "info" : "warning"}>
            OS filtrada: {workOrderContextLabel}
          </Chip>
          <Button type="button" variant="ghost" size="sm" onClick={clearWorkOrderContext}>
            <X size={16} /> Limpar contexto
          </Button>
        </section>
      ) : null}

      <OperationsMapSummaryCards summary={summary} />
      <OperationsMapFilters filters={filters} teams={teams} onChange={setFilters} />

      {loading && locations.length === 0 ? <Skeleton lines={4} /> : null}
      {!loading && locations.length === 0 && source === "api" ? (
        <EmptyState title="Nenhum operador localizado" detail="A API não retornou localizações para a organização atual." />
      ) : null}
      {!loading && locations.length > 0 && workOrderContextLocations.length === 0 && workOrderContextId ? (
        <section className="ui-state ui-state--error">
          <strong>Nenhum operador ou despacho para esta OS</strong>
          <p>O mapa não encontrou operadores ou despachos vinculados à OS informada no contexto atual.</p>
          <Button type="button" variant="secondary" size="sm" onClick={clearWorkOrderContext}>
            <X size={16} /> Limpar contexto da OS
          </Button>
        </section>
      ) : null}
      {!loading && workOrderContextLocations.length > 0 && filteredLocations.length === 0 ? (
        <ErrorState title="Nenhum resultado para os filtros" detail="Ajuste status, equipe, busca, filtro de localização antiga ou limpe o contexto da OS." />
      ) : null}

      {filteredLocations.length > 0 ? (
        <section className="operations-map-layout">
          <div className="operations-map-main">
            <OperationsMapCanvas
              locations={filteredLocations}
              selectedId={selectedLocation?.id}
              onSelect={(location: FieldLocationItem) => setSelectedId(location.id)}
              showDispatches={canReadDispatches}
            />
            <OperationsOperatorList
              locations={filteredLocations}
              selectedId={selectedLocation?.id}
              onSelect={(location) => setSelectedId(location.id)}
              showWorkOrders={canReadWorkOrders}
              showDispatches={canReadDispatches}
              canCreateDispatch={canCreateDispatches}
            />
          </div>
          <aside className="operations-map-side">
            <OperationsOperatorDetailPanel
              location={selectedLocation}
              showWorkOrder={canReadWorkOrders}
              showDispatch={canReadDispatches}
              canCreateDispatch={canCreateDispatches}
              canUpdateDispatch={canUpdateDispatches}
              canCancelDispatch={canCancelDispatches}
              canReassignDispatch={canReassignDispatches}
              dispatchContext={dispatchContext}
              onDispatchChanged={refresh}
            />
            <Alert title="Privacidade operacional" tone="info">
              Localização é dado sensível. O frontend não registra coordenadas em logs e o acesso real continua protegido por RBAC/RLS no backend.
            </Alert>
            <Alert title="Limite desta etapa" tone="info">
              <span><Map size={16} /> Roteirização avançada e rastreamento em tempo real serão adicionados em etapas futuras.</span>
            </Alert>
          </aside>
        </section>
      ) : null}

      {locations.some((location) => location.isStale) ? (
        <Alert title="Há localização antiga" tone="warning">
          <span><AlertTriangle size={16} /> Registros com mais de 15 minutos aparecem destacados para revisão operacional.</span>
        </Alert>
      ) : null}
    </div>
  );
}
