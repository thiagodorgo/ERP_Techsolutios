import { Battery, Clock, Copy, Gauge, LocateFixed, Navigation, Route, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, Button, Card, Chip } from "../../../../components/ui";
import { DispatchStatusBadge } from "../../dispatches/components/DispatchStatusBadge";
import type { DispatchesApiContext } from "../../dispatches/dispatches.types";
import {
  formatAccuracy,
  formatBattery,
  formatFieldLocationDate,
  formatLastSeen,
  formatSpeed,
  getFieldLocationStatusLabel,
  getVehicleFleetBadges,
} from "../operations-map.adapter";
import type { FieldLocationItem } from "../operations-map.types";
import { OperationsDispatchActionsPanel } from "./OperationsDispatchActionsPanel";
import { OperationsOperatorStatus } from "./OperationsMapStatusBadge";
import { WorkOrderPriorityBadge } from "../../../work-orders/components/WorkOrderPriorityBadge";
import { WorkOrderStatusBadge } from "../../../work-orders/components/WorkOrderStatusBadge";

export function OperationsOperatorDetailPanel({
  location,
  maintenanceVehicleIds,
  insuredVehicleIds,
  showWorkOrder = false,
  showDispatch = false,
  canCreateDispatch = false,
  canUpdateDispatch = false,
  canCancelDispatch = false,
  canReassignDispatch = false,
  dispatchContext,
  onDispatchChanged,
}: {
  location?: FieldLocationItem;
  maintenanceVehicleIds?: readonly string[];
  insuredVehicleIds?: readonly string[];
  showWorkOrder?: boolean;
  showDispatch?: boolean;
  canCreateDispatch?: boolean;
  canUpdateDispatch?: boolean;
  canCancelDispatch?: boolean;
  canReassignDispatch?: boolean;
  dispatchContext?: DispatchesApiContext;
  onDispatchChanged?: () => Promise<void> | void;
}) {
  if (!location) {
    return (
      <Card title="Detalhe do operador">
        <section className="ui-state">
          <strong>Nenhum operador selecionado</strong>
          <p>Selecione um marcador ou uma linha da lista para ver detalhes.</p>
        </section>
      </Card>
    );
  }

  const coordinates = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  const lastSeenLabel = formatLastSeen(location.capturedAt);
  const fleetBadges = getVehicleFleetBadges(location, { maintenanceVehicleIds, insuredVehicleIds });
  const dispatchContextParams = new URLSearchParams({
    ...(location.currentWorkOrder ? { workOrderId: location.currentWorkOrder.id } : {}),
    operatorUserId: location.userId ?? location.operatorId,
  });
  const dispatchFollowParams = new URLSearchParams({
    ...(location.currentDispatch ? { dispatchId: location.currentDispatch.id, workOrderId: location.currentDispatch.workOrderId } : {}),
    operatorUserId: location.currentDispatch?.operatorUserId ?? location.userId ?? location.operatorId,
  });

  return (
    <Card title="Detalhe do operador">
      <div className="operations-operator-detail">
        <header>
          <UserRound size={22} />
          <div>
            <strong>{location.displayName}</strong>
            <span>{location.teamName ?? "Sem equipe"}</span>
          </div>
          <OperationsOperatorStatus location={location} />
        </header>
        {location.isStale ? (
          <Alert title="Localização antiga" tone="warning">
            Último visto {lastSeenLabel}. A posição exibida pode não refletir onde o operador está agora — confirme por despacho ou contato direto.
          </Alert>
        ) : null}
        <dl>
          <div>
            <dt><LocateFixed size={15} /> Coordenadas</dt>
            <dd>{coordinates}</dd>
          </div>
          <div>
            <dt><Navigation size={15} /> Status</dt>
            <dd>{getFieldLocationStatusLabel(location.status)}</dd>
          </div>
          <div>
            <dt><LocateFixed size={15} /> Precisão</dt>
            <dd>{formatAccuracy(location.accuracyMeters)}</dd>
          </div>
          <div>
            <dt><Battery size={15} /> Bateria</dt>
            <dd>{formatBattery(location.batteryLevel)}</dd>
          </div>
          <div>
            <dt><Gauge size={15} /> Velocidade</dt>
            <dd>{formatSpeed(location.speed)}</dd>
          </div>
          <div>
            <dt><Clock size={15} /> Último visto</dt>
            <dd>{lastSeenLabel}</dd>
          </div>
          <div>
            <dt><Clock size={15} /> Capturado em</dt>
            <dd>{formatFieldLocationDate(location.capturedAt)}</dd>
          </div>
          <div>
            <dt><Clock size={15} /> Recebido em</dt>
            <dd>{formatFieldLocationDate(location.receivedAt)}</dd>
          </div>
        </dl>
        <div className="operations-operator-detail__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void globalThis.navigator?.clipboard?.writeText(coordinates)}
          >
            <Copy size={16} /> Copiar coordenadas
          </Button>
          {showWorkOrder && !location.currentWorkOrder ? <Chip tone="default"><Route size={14} /> Sem OS atual</Chip> : null}
          {showDispatch && !location.currentDispatch ? <Chip tone="default"><Route size={14} /> Sem despacho</Chip> : null}
        </div>
        {showWorkOrder && location.currentWorkOrder ? (
          <section className="operations-map-work-order-panel">
            <header>
              <Route size={16} />
              <div>
                <strong>{location.currentWorkOrder.code}</strong>
                <span>{location.currentWorkOrder.title}</span>
              </div>
            </header>
            <div className="operations-map-work-order-badges">
              <WorkOrderStatusBadge status={location.currentWorkOrder.status} />
              <WorkOrderPriorityBadge priority={location.currentWorkOrder.priority} />
            </div>
            {location.currentWorkOrder.customerName ? <span>Cliente: {location.currentWorkOrder.customerName}</span> : null}
            {location.currentWorkOrder.serviceAddress ? <span>Endereço: {location.currentWorkOrder.serviceAddress}</span> : null}
            {fleetBadges ? (
              <div className="operations-map-fleet-badges">
                {fleetBadges.inMaintenance ? (
                  <Link
                    className="ui-chip ui-tone-warning operations-map-marker-badge"
                    to={`/fleet/maintenance?vehicle=${encodeURIComponent(fleetBadges.vehicleId)}`}
                    aria-label="Viatura da OS em manutenção — abrir Manutenção da frota"
                  >
                    Em manutenção
                  </Link>
                ) : null}
                {fleetBadges.missingInsurance ? (
                  <Link
                    className="ui-chip ui-tone-danger operations-map-marker-badge"
                    to={`/fleet/insurance?vehicle=${encodeURIComponent(fleetBadges.vehicleId)}`}
                    aria-label="Viatura da OS sem seguro vigente — abrir Seguros da frota"
                  >
                    Sem seguro
                  </Link>
                ) : null}
              </div>
            ) : null}
            <Link className="ui-button ui-button--secondary ui-button--sm" to={`/work-orders/${location.currentWorkOrder.id}`}>
              Abrir OS
            </Link>
          </section>
        ) : null}
        {showDispatch ? (
          <section className="operations-map-work-order-panel">
            <header>
              <Route size={16} />
              <div>
                <strong>{location.currentDispatch ? "Despacho ativo" : "Despacho"}</strong>
                {/* Sem UUID cru na UI (CLAUDE.md §3/§11): o id segue apenas no deep-link "Acompanhar despacho". */}
                <span>
                  {location.currentDispatch
                    ? location.currentWorkOrder && location.currentDispatch.workOrderId === location.currentWorkOrder.id
                      ? `Vinculado à OS ${location.currentWorkOrder.code}`
                      : "Despacho em andamento deste operador"
                    : "Nenhum despacho vinculado ao operador/OS"}
                </span>
              </div>
            </header>
            {location.currentDispatch ? (
              <>
                <div className="operations-map-work-order-badges">
                  <DispatchStatusBadge status={location.currentDispatch.status} />
                </div>
                {location.currentDispatch.observation ? <span>Observação: {location.currentDispatch.observation}</span> : null}
                <Link className="ui-button ui-button--secondary ui-button--sm" to={`/operations/dispatches?${dispatchFollowParams.toString()}`}>
                  Acompanhar despacho
                </Link>
                {dispatchContext && onDispatchChanged ? (
                  <OperationsDispatchActionsPanel
                    dispatch={location.currentDispatch}
                    context={dispatchContext}
                    canUpdate={canUpdateDispatch}
                    canCancel={canCancelDispatch}
                    canReassign={canReassignDispatch}
                    onChanged={onDispatchChanged}
                  />
                ) : null}
              </>
            ) : canCreateDispatch && location.currentWorkOrder ? (
              <Link className="ui-button ui-button--secondary ui-button--sm" to={`/operations/dispatches?${dispatchContextParams.toString()}`}>
                Criar despacho
              </Link>
            ) : (
              <span>Sem ação de despacho disponível para este perfil.</span>
            )}
          </section>
        ) : null}
      </div>
    </Card>
  );
}
