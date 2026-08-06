import { BellRing, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button, EmptyState, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import {
  buildIncomingCalls,
  buildInServiceCalls,
  filterFieldLocationsByWorkOrder,
  isInServiceWorkOrderStatus,
  resolveAssignedTechnicianName,
} from "../operations-map.adapter";
import type { FieldLocationItem, OperationsIncomingCall, OperationsInServiceCall } from "../operations-map.types";
import { useOperationsMap } from "../useOperationsMap";
import { useNewWorkOrderAlert } from "../hooks/useNewWorkOrderAlert";
import { useTechnicianPerformance } from "../hooks/useTechnicianPerformance";
import { useLegendFilter } from "../hooks/useLegendFilter";
import { useMapViewMemory } from "../hooks/useMapViewMemory";
import { getFieldLocationGroup, getWorkOrderPriorityColor, isValidMapCoordinate } from "../map/mapMarkers";
import { buildWorkOrderRouteFeatureCollection, findAssignedLocation } from "../map/routeLines";
import {
  buildAllocationCandidates,
  computeDistanceKm,
  formatEstimatedMinutes,
  formatStraightLineKm,
  operatorUserIdOf,
  type Coordinate,
} from "../allocation";
import { useAllocateDispatch } from "../hooks/useAllocateDispatch";
import { getWorkOrderPriorityLabel } from "../../../work-orders/work-orders.adapter";
import { OperationsMapCanvas } from "../components/OperationsMapCanvas";
import { OperationsMapPanelsStack } from "../components/OperationsMapPanelsStack";
import { OperationsIncomingCallsList } from "../components/OperationsIncomingCallsList";
import { OperationsInServiceList } from "../components/OperationsInServiceList";
import { OperationsOperatorList } from "../components/OperationsOperatorList";
import { OperationsMapLegendFooter } from "../components/OperationsMapLegendFooter";
import { OperationsTechnicianDetailPopover } from "../components/OperationsTechnicianDetailPopover";
import { OperationsOsMarkerPopup } from "../components/OperationsOsMarkerPopup";
import { OperationsAllocationToast } from "../components/OperationsAllocationToast";
import { geocodeWorkOrder } from "../../../work-orders/work-orders.service";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL, PR-1) — Mapa Operacional recriado "pixel a pixel" sobre o
 * protótipo do dono (`Mapa Operacional.html`): stage full-viewport com o mapa CLARO, chips de
 * estado top-left, STACK de 3 painéis de vidro navy à direita (Chamados recebidos / Em
 * Atendimento / Técnicos de campo, com pills de colapso), LEGENDA-FILTRO no rodapé (8 itens,
 * contagem no tooltip, toggle de camada), memória da visão + savenote, detail popover do
 * técnico, popup do marker com os 3 mais próximos, seleção→Alocar por linha, drag-and-drop
 * nativo OS→técnico, toast de confirmação e Esc limpando a seleção.
 *
 * Divergências A2 consolidadas em D-MAPA-PIXEL (controle/decisoes.md): SummaryCards/barra de
 * filtros/params de URL/painéis de detalhe/popups D-E saíram; ?workOrderId permanece; alerta
 * M-5 de OS nova permanece; toast com copy honesta (D-007). Toda alocação usa o endpoint REAL
 * POST /operations/dispatches via useAllocateDispatch (404/409/422 traduzidos, nunca fabricado).
 */

const ALLOCATION_TOAST_TTL_MS = 3600;
// Padding de câmera: o stack de 348px + margens vive à direita; a legenda ocupa a base.
const MAP_PADDING = { top: 24, right: 384, bottom: 48, left: 24 } as const;

export function OperationsMapPage() {
  const {
    locations,
    source,
    fallbackReason,
    workOrderPins,
    workOrdersWithoutLocation,
    loading,
    refresh,
    maintenanceVehicleIds,
    insuredVehicleIds,
  } = useOperationsMap();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Seleção de OS ("os-selected") + detalhe de técnico + pan imperativo + popup/toast.
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | undefined>(undefined);
  const [panTarget, setPanTarget] = useState<{ lng: number; lat: number; key: number } | null>(null);
  const panKeyRef = useRef(0);
  const [closePopupSignal, setClosePopupSignal] = useState(0);
  const [allocToast, setAllocToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSuccessToastRef = useRef<string | null>(null);

  const workOrderContextId = searchParams.get("workOrderId")?.trim() || undefined;
  const canReadWorkOrders = can("work_orders:read");
  const canReadDispatches = can("field_dispatch:read");
  const canCreateDispatches = can("field_dispatch:create");
  const canGeocodeWorkOrders = can("work_orders:update");

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

  // Deep-link ?workOrderId — preservado (divergência 8: os DEMAIS params de filtro saíram).
  const workOrderContextLocations = useMemo(
    () => filterFieldLocationsByWorkOrder(locations, workOrderContextId),
    [locations, workOrderContextId],
  );
  const workOrderContextLabel =
    workOrderContextLocations.find((location) => location.currentWorkOrder?.id === workOrderContextId)?.currentWorkOrder?.code ??
    workOrderContextId;
  const clearWorkOrderContext = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("workOrderId");
    setSearchParams(nextParams, { replace: true });
    setDetailId(undefined);
  }, [searchParams, setSearchParams]);

  // Ω1b — pins de chamado só quando o papel pode ler OS (backend é a autoridade; UI só esconde).
  const visibleWorkOrderPins = canReadWorkOrders ? workOrderPins ?? [] : [];
  const visibleWorkOrdersWithoutLocation = canReadWorkOrders ? workOrdersWithoutLocation ?? [] : [];

  // Split rec/atd do protótipo (J-MAPAS-10) sobre as MESMAS listas já lidas (nenhum fetch novo).
  const incomingCalls = useMemo(
    () => buildIncomingCalls(visibleWorkOrderPins, visibleWorkOrdersWithoutLocation),
    [visibleWorkOrderPins, visibleWorkOrdersWithoutLocation],
  );
  const inServiceCalls = useMemo(
    () => buildInServiceCalls(visibleWorkOrderPins, visibleWorkOrdersWithoutLocation, workOrderContextLocations),
    [visibleWorkOrderPins, visibleWorkOrdersWithoutLocation, workOrderContextLocations],
  );

  // D6 — legenda-filtro page-level: contagens reais + arrays filtrados para QUALQUER canvas.
  const legend = useLegendFilter(workOrderContextLocations, visibleWorkOrderPins);

  // Rotas tracejadas técnico→OS: só pares completos e VISÍVEIS (a rota segue o grupo da OS).
  const routes = useMemo(
    () =>
      buildWorkOrderRouteFeatureCollection(
        legend.visibleWorkOrderPins.filter((pin) => isInServiceWorkOrderStatus(pin.status)),
        legend.visibleLocations,
      ),
    [legend.visibleWorkOrderPins, legend.visibleLocations],
  );

  // D4 — memória da visão por tenant (câmera inicial salva > Brasil z4; savenote no moveend).
  const viewMemory = useMapViewMemory(activeContext?.tenantId);

  // J-MAPAS-7 — índice de conclusão (gateado por field_dispatch:create; ordenação + popup).
  const technicianPerformance = useTechnicianPerformance(dispatchContext, canCreateDispatches);

  // Coordenada do CHAMADO (LGPD §12: fica NESTE mapa auxiliar só p/ cálculo/pan — nunca em lista/log).
  const callCoordinateById = useMemo(() => {
    const map = new Map<string, Coordinate>();
    for (const pin of visibleWorkOrderPins) {
      if (isValidMapCoordinate(pin.latitude, pin.longitude)) map.set(pin.id, { lat: pin.latitude, lng: pin.longitude });
    }
    return map;
  }, [visibleWorkOrderPins]);

  const selectedCall = useMemo(
    () => incomingCalls.find((call) => call.id === selectedWorkOrderId) ?? null,
    [incomingCalls, selectedWorkOrderId],
  );
  const selectedCallCoordinate = selectedCall ? callCoordinateById.get(selectedCall.id) ?? null : null;

  const detailLocation = detailId ? workOrderContextLocations.find((location) => location.id === detailId) : undefined;
  const detailCurrentWorkOrder = useMemo(() => {
    if (!detailLocation) return null;
    if (detailLocation.currentWorkOrder) {
      return { id: detailLocation.currentWorkOrder.id, code: detailLocation.currentWorkOrder.code };
    }
    const assignedPin = visibleWorkOrderPins.find(
      (pin) => isInServiceWorkOrderStatus(pin.status) && findAssignedLocation(pin, [detailLocation]) !== null,
    );
    return assignedPin ? { id: assignedPin.id, code: assignedPin.code } : null;
  }, [detailLocation, visibleWorkOrderPins]);

  const bumpPan = useCallback((coordinate: Coordinate) => {
    panKeyRef.current += 1;
    setPanTarget({ lng: coordinate.lng, lat: coordinate.lat, key: panKeyRef.current });
  }, []);

  // M-5 — alerta de OS nova sobre a fila de RECEBIDAS (diff client-side; anti-spam; LGPD).
  const { toasts: newCallToasts, newIds: newCallIds, pulseIds: pulsingWorkOrderIds, dismissToast } =
    useNewWorkOrderAlert({ calls: incomingCalls });

  // Alocação REAL (POST /operations/dispatches) — feedback nunca fabricado.
  const allocation = useAllocateDispatch(dispatchContext, refresh);

  const showAllocationToast = useCallback((message: string, tone: "success" | "error") => {
    setAllocToast({ message, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setAllocToast(null), ALLOCATION_TOAST_TTL_MS);
  }, []);
  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const performAllocation = useCallback(
    async (workOrder: { readonly id: string; readonly code: string }, location: FieldLocationItem) => {
      if (!canCreateDispatches) return;
      if (getFieldLocationGroup(location.status) === "off") return; // protótipo: técnico "off" não recebe
      const coordinate = callCoordinateById.get(workOrder.id) ?? null;
      const km = coordinate ? computeDistanceKm(location, coordinate) : null;
      // Copy HONESTA (divergência 7): estimativa sempre rotulada; a frase de chegada do
      // protótipo é proibida pela regra ETA-honesto (J-MAPAS-7).
      pendingSuccessToastRef.current =
        km !== null
          ? `✓ ${workOrder.code} alocada para ${location.displayName} — ${formatEstimatedMinutes(km)} · ${formatStraightLineKm(km)}`
          : `✓ ${workOrder.code} alocada para ${location.displayName}`;
      await allocation.allocate(
        { workOrderId: workOrder.id, operatorUserId: operatorUserIdOf(location) },
        location.displayName,
      );
    },
    [allocation, callCoordinateById, canCreateDispatches],
  );

  // Resultado REAL da alocação → toast (sucesso com a copy honesta; erro traduzido do backend).
  useEffect(() => {
    if (!allocation.feedback) return;
    if (allocation.feedback.kind === "success") {
      showAllocationToast(pendingSuccessToastRef.current ?? allocation.feedback.message, "success");
      pendingSuccessToastRef.current = null;
      setSelectedWorkOrderId(undefined); // protótipo: alocada → seleção limpa
      setClosePopupSignal((value) => value + 1);
    } else {
      showAllocationToast(allocation.feedback.message, "error");
    }
    allocation.resetFeedback();
  }, [allocation, allocation.feedback, showAllocationToast]);

  // Esc limpa a seleção e fecha popover/popup (verbatim do protótipo).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelectedWorkOrderId(undefined);
      setDetailId(undefined);
      setClosePopupSignal((value) => value + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSelectCall = useCallback(
    (call: OperationsIncomingCall, options?: { readonly pan?: boolean }) => {
      setSelectedWorkOrderId((current) => (current === call.id ? undefined : call.id));
      if (options?.pan === false) return;
      const coordinate = callCoordinateById.get(call.id);
      if (coordinate) bumpPan(coordinate);
    },
    [bumpPan, callCoordinateById],
  );

  // Clique no MARKER de OS: seleciona só chamado RECEBIDO (protótipo); o popup abre no canvas.
  const handleSelectWorkOrderFromMap = useCallback(
    (id: string) => {
      if (incomingCalls.some((call) => call.id === id)) {
        setSelectedWorkOrderId((current) => (current === id ? undefined : id));
      }
    },
    [incomingCalls],
  );

  // Diretiva do dono (2026-08-06): o detalhe do técnico abre por HOVER (some sozinho ao sair o
  // mouse) E por CLIQUE (fica fixo até fechar manualmente). Hover nunca move o mapa; o pan só
  // acontece no clique — ação explícita do operador (o mapa não tem vida própria).
  const detailPinnedRef = useRef(false);

  const openTechnicianDetail = useCallback(
    (location: FieldLocationItem) => {
      detailPinnedRef.current = true;
      setDetailId(location.id);
      if (isValidMapCoordinate(location.latitude, location.longitude)) {
        bumpPan({ lat: location.latitude, lng: location.longitude });
      }
    },
    [bumpPan],
  );

  const hoverTechnicianDetail = useCallback((location: FieldLocationItem | null) => {
    if (location) {
      // Hover não rouba um detalhe já fixado por clique.
      if (!detailPinnedRef.current) setDetailId(location.id);
      return;
    }
    if (!detailPinnedRef.current) setDetailId(undefined);
  }, []);

  const closeTechnicianDetail = useCallback(() => {
    detailPinnedRef.current = false;
    setDetailId(undefined);
  }, []);

  const handlePanToInService = useCallback(
    (call: OperationsInServiceCall) => {
      const coordinate = callCoordinateById.get(call.id);
      if (coordinate) bumpPan(coordinate);
    },
    [bumpPan, callCoordinateById],
  );

  const handleDropAllocate = useCallback(
    (workOrderId: string, location: FieldLocationItem) => {
      const call = incomingCalls.find((item) => item.id === workOrderId);
      if (!call) return;
      void performAllocation({ id: call.id, code: call.code }, location);
    },
    [incomingCalls, performAllocation],
  );

  // Ω1b-2 — geocodificar sob demanda (CTA migrado para o card "Sem GPS"): work_orders:update.
  const handleGeocodeWorkOrder = canGeocodeWorkOrders
    ? async (id: string) => {
        const result = await geocodeWorkOrder(dispatchContext, id);
        if (result.geocoded) await refresh();
        return result;
      }
    : undefined;

  // D5.2 — popup do marker: 3 técnicos REAIS mais próximos (exclui "off", km asc, slice 3).
  const renderWorkOrderPopup = useCallback(
    (workOrderId: string): ReactNode => {
      const pin = visibleWorkOrderPins.find((item) => item.id === workOrderId);
      if (!pin) return null;
      const phase = isInServiceWorkOrderStatus(pin.status) ? "atd" : "rec";
      const candidates =
        phase === "rec"
          ? buildAllocationCandidates(
              workOrderContextLocations.filter((location) => getFieldLocationGroup(location.status) !== "off"),
              { lat: pin.latitude, lng: pin.longitude },
              technicianPerformance.byOperator,
            )
              .filter((candidate) => candidate.distanceKm !== null)
              .sort((a, b) => a.distanceKm! - b.distanceKm!)
              .slice(0, 3)
          : [];
      return (
        <OperationsOsMarkerPopup
          pin={pin}
          phase={phase}
          technicianName={phase === "atd" ? resolveAssignedTechnicianName(pin, workOrderContextLocations) : undefined}
          candidates={candidates}
          canAllocate={canCreateDispatches}
          pendingOperatorUserId={allocation.pendingOperatorUserId}
          onAllocate={(candidate) => void performAllocation({ id: pin.id, code: pin.code }, candidate.location)}
          onOpenWorkOrder={(id) => navigate(`/work-orders/${id}`)}
        />
      );
    },
    [
      allocation.pendingOperatorUserId,
      canCreateDispatches,
      navigate,
      performAllocation,
      technicianPerformance.byOperator,
      visibleWorkOrderPins,
      workOrderContextLocations,
    ],
  );

  const hasMapContent =
    workOrderContextLocations.length > 0 || visibleWorkOrderPins.length > 0 || visibleWorkOrdersWithoutLocation.length > 0;
  const showEmptyState = !loading && locations.length === 0 && !hasMapContent && source !== "fallback";
  const showContextEmptyState =
    !loading && locations.length > 0 && workOrderContextLocations.length === 0 && Boolean(workOrderContextId);
  const panelSkeleton = loading && locations.length === 0;

  return (
    <div className="operations-map-page opmap-page">
      {/* Título da tela para leitores de tela (o heading visual do shell vive na topbar/rota). */}
      <h1 className="opmap-sr-only">Mapa Operacional</h1>

      {/* M-5 — região viva do alerta de OS nova (intacta): role=status → aria-live=polite; nunca
          rouba o foco. LGPD §12: SÓ código + prioridade — NUNCA coordenada. */}
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

      <main className="opmap-stage" aria-label="Mapa operacional em tempo real">
        <div className="opmap-stage__map">
          <OperationsMapCanvas
            locations={legend.visibleLocations}
            selectedId={detailId}
            onSelect={openTechnicianDetail}
            onHoverTechnician={hoverTechnicianDetail}
            showDispatches={canReadDispatches}
            workOrderPins={legend.visibleWorkOrderPins}
            selectedWorkOrderId={selectedWorkOrderId}
            onSelectWorkOrder={handleSelectWorkOrderFromMap}
            pulsingWorkOrderIds={pulsingWorkOrderIds}
            mapPadding={MAP_PADDING}
            routes={routes}
            initialView={viewMemory.initialView}
            onMoveEnd={viewMemory.handleMoveEnd}
            panTarget={panTarget}
            renderWorkOrderPopup={renderWorkOrderPopup}
            closePopupSignal={closePopupSignal}
            maintenanceVehicleIds={maintenanceVehicleIds}
            insuredVehicleIds={insuredVehicleIds}
          />
        </div>

        {/* Diretiva do dono (2026-08-06): os chips passivos do topo-esquerdo SAÍRAM ("é para
            sair/excluir"). O que resta é o mínimo honesto (D-007/§7): erro de carga com retry e
            o contexto de OS filtrada com saída — e SÓ quando esses estados existem. */}
        {fallbackReason ? (
          <div className="opmap-error-banner" role="alert">
            <span>{fallbackReason}</span>
            <button type="button" onClick={() => void refresh()}>Tentar novamente</button>
          </div>
        ) : null}
        {workOrderContextId ? (
          <div className="opmap-context-banner">
            <span>OS filtrada: {workOrderContextLabel}</span>
            <button type="button" onClick={clearWorkOrderContext} aria-label="Limpar contexto da OS">
              <X size={12} />
            </button>
          </div>
        ) : null}

        {/* D4 — savenote da memória da visão ("✓ Visão do mapa salva", fade 1.2s). */}
        <div className="opmap-savenote" data-visible={viewMemory.savenoteVisible ? "true" : undefined} aria-hidden="true">
          ✓ Visão do mapa salva
        </div>

        {showEmptyState ? (
          <div className="opmap-empty-overlay">
            <EmptyState
              title="Nenhum técnico ou chamado no mapa"
              detail="Quando os Técnicos de Campo enviarem localização pelo aplicativo de campo, ou houver ordens de serviço abertas com endereço geolocalizado, os pontos aparecerão aqui automaticamente. Verifique se há despachos ativos — a tela se atualiza sozinha."
            />
          </div>
        ) : null}
        {showContextEmptyState ? (
          <div className="opmap-empty-overlay" role="alert">
            <strong>Nenhum técnico ou despacho para esta OS</strong>
            <p>O mapa não encontrou Técnicos de Campo ou despachos vinculados à OS informada no contexto atual.</p>
            <Button type="button" variant="secondary" size="sm" onClick={clearWorkOrderContext}>
              <X size={16} /> Limpar contexto da OS
            </Button>
          </div>
        ) : null}

        {/* Stack 348px à direita (verbatim): Recebidas / Em Atendimento / Técnicos (+ pills). */}
        <OperationsMapPanelsStack
          recCount={incomingCalls.length}
          atdCount={inServiceCalls.length}
          tecCount={workOrderContextLocations.length}
          newCallsCount={newCallIds.size}
          showWorkOrderPanels={canReadWorkOrders}
          osSelected={Boolean(selectedCall)}
          calls={
            panelSkeleton ? (
              <Skeleton lines={3} />
            ) : (
              <OperationsIncomingCallsList
                calls={incomingCalls}
                selectedId={selectedWorkOrderId}
                onSelect={handleSelectCall}
                newIds={newCallIds}
                draggableEnabled={canCreateDispatches}
                onGeocode={handleGeocodeWorkOrder}
              />
            )
          }
          inService={
            panelSkeleton ? <Skeleton lines={2} /> : <OperationsInServiceList calls={inServiceCalls} onPan={handlePanToInService} />
          }
          technicians={
            panelSkeleton ? (
              <Skeleton lines={4} />
            ) : (
              <OperationsOperatorList
                locations={workOrderContextLocations}
                selectedCallId={selectedCall?.id}
                selectedCallCoordinate={selectedCallCoordinate}
                canAllocate={canCreateDispatches}
                completionByOperator={technicianPerformance.byOperator}
                onAllocate={(location) =>
                  selectedCall ? void performAllocation({ id: selectedCall.id, code: selectedCall.code }, location) : undefined
                }
                onDropAllocate={handleDropAllocate}
                onOpenDetail={openTechnicianDetail}
                onHoverDetail={hoverTechnicianDetail}
              />
            )
          }
        />

        {/* Detail popover do técnico (270px, right 372 / top 64 — verbatim). */}
        {detailLocation ? (
          <OperationsTechnicianDetailPopover
            location={detailLocation}
            currentWorkOrder={detailCurrentWorkOrder}
            onClose={closeTechnicianDetail}
          />
        ) : null}

        {/* D6 — legenda-FILTRO no rodapé (8 itens verbatim + hint + disclaimer honesto). */}
        <OperationsMapLegendFooter entries={legend.entries} onToggle={legend.toggle} />

        {/* Toast de alocação bottom-center (copy honesta; erro real do backend em vermelho). */}
        <OperationsAllocationToast message={allocToast?.message ?? null} tone={allocToast?.tone ?? "success"} />
      </main>
    </div>
  );
}
