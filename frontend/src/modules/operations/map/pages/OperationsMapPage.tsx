import { AlertTriangle, Map, Pause, Play, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Alert, Button, Chip, EmptyState, ErrorState, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import {
  calculateOperationsMapSummary,
  FIELD_LOCATION_STALE_THRESHOLD_MS,
  filterFieldLocationsByWorkOrder,
  filterFieldLocations,
  formatFieldLocationDate,
  listOperationTeams,
} from "../operations-map.adapter";
import {
  FIELD_LOCATION_STATUSES,
  type FieldLocationItem,
  type FieldLocationStatus,
  type OperationsMapFilters as OperationsMapFilterState,
} from "../operations-map.types";
import { useOperationsMap } from "../useOperationsMap";
import { OperationsMapCanvas } from "../components/OperationsMapCanvas";
import { OperationsMapFilters } from "../components/OperationsMapFilters";
import { OperationsMapSummaryCards } from "../components/OperationsMapSummaryCards";
import { OperationsOperatorDetailPanel } from "../components/OperationsOperatorDetailPanel";
import { OperationsOperatorList } from "../components/OperationsOperatorList";

export function OperationsMapPage() {
  const {
    locations,
    source,
    fallbackReason,
    maintenanceVehicleIds,
    insuredVehicleIds,
    loading,
    isRefreshing,
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
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  // Ω1 — filtros ficam na URL (?status=&team=&stale=&q=) para permitir link direto e refresh.
  const statusParam = searchParams.get("status") ?? "all";
  const teamParam = searchParams.get("team") ?? "all";
  const staleParam = searchParams.get("stale") === "1";
  const searchQuery = searchParams.get("q") ?? "";
  const filters = useMemo<OperationsMapFilterState>(() => {
    const status: OperationsMapFilterState["status"] =
      statusParam !== "all" && FIELD_LOCATION_STATUSES.includes(statusParam as FieldLocationStatus)
        ? (statusParam as FieldLocationStatus)
        : "all";
    return { status, team: teamParam, staleOnly: staleParam, search: searchQuery };
  }, [statusParam, teamParam, staleParam, searchQuery]);
  const setFilters = useCallback(
    (next: OperationsMapFilterState) => {
      const params = new URLSearchParams(searchParams);
      if (next.status && next.status !== "all") params.set("status", next.status);
      else params.delete("status");
      if (next.team && next.team !== "all") params.set("team", next.team);
      else params.delete("team");
      if (next.staleOnly) params.set("stale", "1");
      else params.delete("stale");
      if (next.search.trim()) params.set("q", next.search);
      else params.delete("q");
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );
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
            Fonte: {source === "api" ? "API real" : source === "fallback" ? "indisponível" : "modo demonstração"}
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
        <Alert
          title={locations.length > 0 ? "Não foi possível atualizar as localizações" : "Não foi possível carregar as localizações"}
          tone="warning"
        >
          <span className="operations-map-error-retry">
            {fallbackReason ?? "A API de localização não respondeu."}{" "}
            {locations.length > 0
              ? "Exibindo os últimos dados carregados — eles podem estar desatualizados."
              : "Nenhum dado é exibido até a fonte real voltar."}
            <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading || isRefreshing}>
              <RefreshCw size={14} /> Tentar novamente
            </Button>
          </span>
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

      <OperationsMapSummaryCards
        summary={summary}
        activeStatus={filters.status}
        staleOnly={filters.staleOnly}
        onFilterStatus={(status) => setFilters({ ...filters, status, staleOnly: false })}
        onToggleStale={() => setFilters({ ...filters, staleOnly: !filters.staleOnly })}
      />
      <OperationsMapFilters filters={filters} teams={teams} onChange={setFilters} />

      {loading && locations.length === 0 ? <Skeleton lines={4} /> : null}
      {!loading && locations.length === 0 && source !== "fallback" ? (
        <EmptyState
          title="Nenhum operador em campo"
          detail="Quando os operadores iniciarem o envio de localização pelo aplicativo de campo, os últimos pontos conhecidos aparecerão aqui automaticamente. Verifique se há despachos ativos ou use Atualizar para consultar novamente."
        />
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
              maintenanceVehicleIds={maintenanceVehicleIds}
              insuredVehicleIds={insuredVehicleIds}
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
              maintenanceVehicleIds={maintenanceVehicleIds}
              insuredVehicleIds={insuredVehicleIds}
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
          <span>
            <AlertTriangle size={16} /> Registros com mais de {Math.round(FIELD_LOCATION_STALE_THRESHOLD_MS / 60_000)} minutos aparecem
            destacados para revisão operacional.
          </span>
        </Alert>
      ) : null}
    </div>
  );
}
