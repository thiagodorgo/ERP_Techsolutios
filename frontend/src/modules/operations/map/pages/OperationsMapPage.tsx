import { AlertTriangle, BellRing, Map as MapIcon, Pause, Play, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";

import { Alert, Button, Card, Chip, EmptyState, ErrorState, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import {
  buildIncomingCalls,
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
  type OperationsIncomingCall,
  type OperationsMapFilters as OperationsMapFilterState,
} from "../operations-map.types";
import { useOperationsMap } from "../useOperationsMap";
import { useNewWorkOrderAlert } from "../hooks/useNewWorkOrderAlert";
import { useTechnicianPerformance } from "../hooks/useTechnicianPerformance";
import { getWorkOrderPriorityColor, isValidMapCoordinate } from "../map/mapMarkers";
import { operatorUserIdOf, type Coordinate } from "../allocation";
import { getWorkOrderPriorityLabel } from "../../../work-orders/work-orders.adapter";
import { OperationsMapCanvas } from "../components/OperationsMapCanvas";
import { OperationsMapStage } from "../components/OperationsMapStage";
import { OperationsIncomingCallsList } from "../components/OperationsIncomingCallsList";
import { OperationsCallAllocationPopup } from "../components/OperationsCallAllocationPopup";
import { OperationsTechnicianAllocationPopup } from "../components/OperationsTechnicianAllocationPopup";
import { OperationsMapFilters } from "../components/OperationsMapFilters";
import { OperationsMapSummaryCards } from "../components/OperationsMapSummaryCards";
import { OperationsOperatorDetailPanel } from "../components/OperationsOperatorDetailPanel";
import { OperationsOperatorList } from "../components/OperationsOperatorList";
import { OperationsWorkOrderPinPanel } from "../components/OperationsWorkOrderPinPanel";
import { OperationsWorkOrdersWithoutLocationPanel } from "../components/OperationsWorkOrdersWithoutLocationPanel";
import { geocodeWorkOrder } from "../../../work-orders/work-orders.service";

export function OperationsMapPage() {
  const {
    locations,
    source,
    fallbackReason,
    maintenanceVehicleIds,
    insuredVehicleIds,
    workOrderPins,
    workOrdersWithoutLocation,
    workOrdersTruncated,
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
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | undefined>(undefined);
  // J-MAPAS-7 (SPRINT ALOCAÇÃO) — popups de alocação: chamado clicado (D, esquerda) e técnico clicado (E,
  // direita). Um por vez; abrir um fecha o outro. `null` = nenhum popup aberto.
  const [allocCall, setAllocCall] = useState<OperationsIncomingCall | null>(null);
  const [allocTech, setAllocTech] = useState<FieldLocationItem | null>(null);

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

  // Ω1b — pins de chamado só quando o papel pode ler OS (backend é a autoridade; UI apenas esconde).
  const visibleWorkOrderPins = canReadWorkOrders ? workOrderPins ?? [] : [];
  const visibleWorkOrdersWithoutLocation = canReadWorkOrders ? workOrdersWithoutLocation ?? [] : [];
  const selectedWorkOrderPin = visibleWorkOrderPins.find((pin) => pin.id === selectedWorkOrderId);
  // Ω1b-2 — geocodificar sob demanda exige work_orders:update; em sucesso, atualiza o mapa (pin aparece).
  const canGeocodeWorkOrders = can("work_orders:update");
  const handleGeocodeWorkOrder = canGeocodeWorkOrders
    ? async (id: string) => {
        const result = await geocodeWorkOrder(dispatchContext, id);
        if (result.geocoded) await refresh();
        return result;
      }
    : undefined;
  const hasMapContent =
    filteredLocations.length > 0 || visibleWorkOrderPins.length > 0 || visibleWorkOrdersWithoutLocation.length > 0;
  // M-4 — fila REAL de "chamados que chegam" (prioridade + SLA-proxy honesto), a partir das MESMAS OS
  // mapeáveis já lidas (nenhum fetch novo). Ordenada em `buildIncomingCalls` (prioridade→SLA→abertura).
  const incomingCalls = useMemo(
    () => buildIncomingCalls(visibleWorkOrderPins, visibleWorkOrdersWithoutLocation),
    [visibleWorkOrderPins, visibleWorkOrdersWithoutLocation],
  );

  // J-MAPAS-7 — índice de conclusão de OS por técnico (endpoint gateado por field_dispatch:create; só
  // busca quem PODE alocar). Alimenta a ordenação "Maior índice de conclusão" e o índice de cada linha.
  const technicianPerformance = useTechnicianPerformance(dispatchContext, canCreateDispatches);
  // Coordenada + endereço do CHAMADO para calcular distância/tempo (haversine) e mostrar o endereço no
  // detalhe. Derivado dos pins (com coordenada) e das OS sem GPS (só endereço). LGPD §12: a coordenada
  // fica NESTE mapa auxiliar só para o cálculo — nunca é renderizada crua nem logada.
  const callInfoById = useMemo(() => {
    const map = new Map<string, { coordinate: Coordinate | null; serviceAddress: string | null }>();
    for (const pin of visibleWorkOrderPins) {
      const coordinate = isValidMapCoordinate(pin.latitude, pin.longitude)
        ? { lat: pin.latitude, lng: pin.longitude }
        : null;
      map.set(pin.id, { coordinate, serviceAddress: pin.serviceAddress ?? null });
    }
    for (const workOrder of visibleWorkOrdersWithoutLocation) {
      if (!map.has(workOrder.id)) map.set(workOrder.id, { coordinate: null, serviceAddress: workOrder.serviceAddress ?? null });
    }
    return map;
  }, [visibleWorkOrderPins, visibleWorkOrdersWithoutLocation]);
  const resolveCallCoordinate = useCallback(
    (callId: string): Coordinate | null => callInfoById.get(callId)?.coordinate ?? null,
    [callInfoById],
  );
  const openCallAllocation = useCallback((call: OperationsIncomingCall) => {
    setSelectedWorkOrderId(call.id);
    setAllocTech(null);
    setAllocCall(call);
  }, []);
  const openTechAllocation = useCallback((location: FieldLocationItem) => {
    setSelectedId(location.id);
    setAllocCall(null);
    setAllocTech(location);
  }, []);

  // M-5 — alerta visual de OS nova (requisito 3 do dono): diff client-side dos ids que chegam entre
  // refreshes. NÃO alerta no mount (baseline), dedup por id, teto por ciclo, cada aviso some sozinho.
  // `pulseIds` já vem zerado sob prefers-reduced-motion (sem pulso). LGPD §12: só código/prioridade.
  const { toasts: newCallToasts, newIds: newCallIds, pulseIds: pulsingWorkOrderIds, dismissToast } =
    useNewWorkOrderAlert({ calls: incomingCalls });

  return (
    <div className="page-stack operations-map-page">
      {/* M-5 — região viva do alerta de OS nova. Existe SEMPRE no DOM (mesmo vazia) para o leitor de tela
          anunciar de forma NÃO-agressiva (role=status → aria-live=polite); nunca rouba o foco. LGPD §12:
          o toast mostra SÓ código + prioridade — NUNCA coordenada. Some sozinho (TTL do hook) e é
          dispensável pelo botão. A animação de entrada é desligada por @media reduced-motion no CSS. */}
      <div
        className="operations-map-toasts"
        role="status"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Avisos de novos chamados"
      >
        {newCallToasts.map((toast) => (
          <div
            key={toast.key}
            className="operations-map-toast"
            data-priority={toast.priority}
            style={{ "--call-priority": getWorkOrderPriorityColor(toast.priority) } as CSSProperties}
          >
            <BellRing size={16} aria-hidden="true" className="operations-map-toast__icon" />
            <span className="operations-map-toast__text">
              Novo chamado: <strong>{toast.code}</strong> — {getWorkOrderPriorityLabel(toast.priority)}
            </span>
            <button
              type="button"
              className="operations-map-toast__dismiss"
              onClick={() => dismissToast(toast.key)}
              aria-label={`Dispensar aviso do chamado ${toast.code}`}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <header className="page-heading page-heading--row">
        <div>
          <span>Operação em campo</span>
          <h1>Mapa Operacional</h1>
          <p>Acompanhe a última localização conhecida dos Técnicos de Campo.</p>
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

      {workOrdersTruncated ? (
        <Alert title="Há mais chamados do que os exibidos" tone="info">
          <span>
            O mapa carrega os primeiros chamados; existem mais ordens de serviço no sistema do que as exibidas aqui.
            Use a tela de Ordens de Serviço para a lista completa.
          </span>
        </Alert>
      ) : null}

      {loading && locations.length === 0 ? <Skeleton lines={4} /> : null}
      {!loading && locations.length === 0 && !hasMapContent && source !== "fallback" ? (
        <EmptyState
          title="Nenhum técnico ou chamado no mapa"
          detail="Quando os Técnicos de Campo enviarem localização pelo aplicativo de campo, ou houver ordens de serviço abertas com endereço geolocalizado, os pontos aparecerão aqui automaticamente. Verifique se há despachos ativos — a tela se atualiza sozinha."
        />
      ) : null}
      {!loading && locations.length > 0 && workOrderContextLocations.length === 0 && workOrderContextId ? (
        <section className="ui-state ui-state--error">
          <strong>Nenhum técnico ou despacho para esta OS</strong>
          <p>O mapa não encontrou Técnicos de Campo ou despachos vinculados à OS informada no contexto atual.</p>
          <Button type="button" variant="secondary" size="sm" onClick={clearWorkOrderContext}>
            <X size={16} /> Limpar contexto da OS
          </Button>
        </section>
      ) : null}
      {!loading && workOrderContextLocations.length > 0 && filteredLocations.length === 0 ? (
        <ErrorState title="Nenhum resultado para os filtros" detail="Ajuste status, equipe, busca, filtro de localização antiga ou limpe o contexto da OS." />
      ) : null}

      {hasMapContent ? (
        <>
          {/* J-MAPAS-6 (redesign) — o MAPA é o herói: stage full-bleed (supersede o grid de 3 colunas
              do M-1, que espremia a largura). "Chamados que chegam" e "Técnicos de Campo" viram rails
              de vidro navy ancorados às bordas do mapa; Maximizar leva a tela cheia com o 4º quadrante. */}
          <OperationsMapStage
            callsCount={incomingCalls.length}
            techsCount={filteredLocations.length}
            newCallsCount={newCallIds.size}
            map={({ resizeSignal, mapPadding }) => (
              <OperationsMapCanvas
                locations={filteredLocations}
                selectedId={selectedLocation?.id}
                onSelect={(location: FieldLocationItem) => setSelectedId(location.id)}
                showDispatches={canReadDispatches}
                maintenanceVehicleIds={maintenanceVehicleIds}
                insuredVehicleIds={insuredVehicleIds}
                workOrderPins={visibleWorkOrderPins}
                selectedWorkOrderId={selectedWorkOrderPin?.id}
                onSelectWorkOrder={setSelectedWorkOrderId}
                pulsingWorkOrderIds={pulsingWorkOrderIds}
                resizeSignal={resizeSignal}
                mapPadding={mapPadding}
              />
            )}
            calls={
              <OperationsIncomingCallsList
                calls={incomingCalls}
                selectedId={selectedWorkOrderPin?.id}
                onSelect={openCallAllocation}
                newIds={newCallIds}
              />
            }
            techs={
              filteredLocations.length > 0 ? (
                <OperationsOperatorList
                  locations={filteredLocations}
                  selectedId={selectedLocation?.id}
                  onSelect={openTechAllocation}
                  onHighlight={(location) => setSelectedId(location.id)}
                  showWorkOrders={canReadWorkOrders}
                  showDispatches={canReadDispatches}
                  canCreateDispatch={canCreateDispatches}
                />
              ) : (
                <Card title="Técnicos de Campo">
                  <EmptyState
                    title="Nenhum técnico neste filtro"
                    detail="Ajuste os filtros acima ou aguarde os Técnicos de Campo enviarem posição pelo aplicativo de campo."
                  />
                </Card>
              )
            }
          />
          {/* Detalhe da seleção preservado como faixa ABAIXO do stage (sem perder nada da etapa Ω1). */}
          <section className="operations-map-detail" aria-label="Detalhes da seleção">
            {selectedWorkOrderPin ? <OperationsWorkOrderPinPanel pin={selectedWorkOrderPin} /> : null}
            <OperationsWorkOrdersWithoutLocationPanel
              workOrders={visibleWorkOrdersWithoutLocation}
              onGeocode={handleGeocodeWorkOrder}
            />
            {selectedLocation && !allocTech && !allocCall ? (
              // Evita superfícies concorrentes: com o popup de alocação aberto, o detalhe do técnico já vive no
              // popup — não repetir o painel abaixo (achado BAIXA da junta).
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
            ) : null}
            <Alert title="Privacidade operacional" tone="info">
              Localização é dado sensível. O frontend não registra coordenadas em logs e o acesso real continua protegido por RBAC/RLS no backend.
            </Alert>
            <Alert title="Limite desta etapa" tone="info">
              <span><MapIcon size={16} /> Roteirização avançada e rastreamento em tempo real serão adicionados em etapas futuras.</span>
            </Alert>
          </section>

          {/* J-MAPAS-7 (D) — popup de alocação a partir do CHAMADO clicado: detalhe honesto + lista
              ranqueada de técnicos (candidatos = TODOS os técnicos conhecidos, não só os filtrados no rail,
              para a alocação não ser estreitada por um filtro de visualização). */}
          {allocCall ? (
            <OperationsCallAllocationPopup
              call={allocCall}
              serviceAddress={callInfoById.get(allocCall.id)?.serviceAddress ?? null}
              callCoordinate={callInfoById.get(allocCall.id)?.coordinate ?? null}
              technicians={locations}
              completionByOperator={technicianPerformance.byOperator}
              performanceUnavailable={technicianPerformance.source === "fallback"}
              canCreateDispatch={canCreateDispatches}
              context={dispatchContext}
              onClose={() => setAllocCall(null)}
              onAllocated={refresh}
            />
          ) : null}
          {/* J-MAPAS-7 (E) — popup de alocação a partir do TÉCNICO clicado: dados + seletor de chamado +
              distância/tempo estimado do par. Mesma payload de createDispatch de D (fluxo reverso). */}
          {allocTech ? (
            <OperationsTechnicianAllocationPopup
              technician={allocTech}
              calls={incomingCalls}
              resolveCallCoordinate={resolveCallCoordinate}
              completionRate={technicianPerformance.byOperator.get(operatorUserIdOf(allocTech)) ?? null}
              canCreateDispatch={canCreateDispatches}
              context={dispatchContext}
              onClose={() => setAllocTech(null)}
              onAllocated={refresh}
            />
          ) : null}
        </>
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
