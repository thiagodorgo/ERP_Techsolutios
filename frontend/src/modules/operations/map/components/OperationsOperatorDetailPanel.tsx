import { Battery, Clock, Copy, LocateFixed, Navigation, Route, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Button, Card, Chip } from "../../../../components/ui";
import { DispatchStatusBadge } from "../../dispatches/components/DispatchStatusBadge";
import type { DispatchesApiContext } from "../../dispatches/dispatches.types";
import {
  formatAccuracy,
  formatBattery,
  formatFieldLocationDate,
  getFieldLocationStatusLabel,
} from "../operations-map.adapter";
import type { FieldLocationItem } from "../operations-map.types";
import { OperationsDispatchActionsPanel } from "./OperationsDispatchActionsPanel";
import { OperationsOperatorStatus } from "./OperationsMapStatusBadge";
import { WorkOrderPriorityBadge } from "../../../work-orders/components/WorkOrderPriorityBadge";
import { WorkOrderStatusBadge } from "../../../work-orders/components/WorkOrderStatusBadge";

export function OperationsOperatorDetailPanel({
  location,
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
            {location.currentWorkOrder.serviceAddress ? <span>Endereco: {location.currentWorkOrder.serviceAddress}</span> : null}
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
                <span>{location.currentDispatch?.id ?? "Nenhum despacho vinculado ao operador/OS"}</span>
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
              <span>Sem acao de despacho disponivel para este perfil.</span>
            )}
          </section>
        ) : null}
      </div>
    </Card>
  );
}
