import { Battery, Clock, Copy, LocateFixed, Navigation, Route, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Button, Card, Chip } from "../../../../components/ui";
import {
  formatAccuracy,
  formatBattery,
  formatFieldLocationDate,
  getFieldLocationStatusLabel,
} from "../operations-map.adapter";
import type { FieldLocationItem } from "../operations-map.types";
import { OperationsOperatorStatus } from "./OperationsMapStatusBadge";
import { WorkOrderPriorityBadge } from "../../../work-orders/components/WorkOrderPriorityBadge";
import { WorkOrderStatusBadge } from "../../../work-orders/components/WorkOrderStatusBadge";

export function OperationsOperatorDetailPanel({
  location,
  showWorkOrder = false,
}: {
  location?: FieldLocationItem;
  showWorkOrder?: boolean;
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
      </div>
    </Card>
  );
}
