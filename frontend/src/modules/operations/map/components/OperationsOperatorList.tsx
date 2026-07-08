import { Battery, Clock, LocateFixed } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, Table } from "../../../../components/ui";
import { DispatchStatusBadge } from "../../dispatches/components/DispatchStatusBadge";
import {
  formatAccuracy,
  formatBattery,
  formatFieldLocationDate,
} from "../operations-map.adapter";
import type { FieldLocationItem } from "../operations-map.types";
import { OperationsOperatorStatus } from "./OperationsMapStatusBadge";
import { WorkOrderStatusBadge } from "../../../work-orders/components/WorkOrderStatusBadge";

export function OperationsOperatorList({
  locations,
  selectedId,
  onSelect,
  showWorkOrders = false,
  showDispatches = false,
  canCreateDispatch = false,
}: {
  locations: FieldLocationItem[];
  selectedId?: string;
  onSelect: (location: FieldLocationItem) => void;
  showWorkOrders?: boolean;
  showDispatches?: boolean;
  canCreateDispatch?: boolean;
}) {
  const columns = [
    {
      key: "operator",
      header: "Operador",
      render: (location: FieldLocationItem) => (
        <strong className={selectedId === location.id ? "operations-map-selected-text" : undefined}>
          {location.displayName}
        </strong>
      ),
    },
    { key: "status", header: "Status", render: (location: FieldLocationItem) => <OperationsOperatorStatus location={location} /> },
    ...(showWorkOrders
      ? [
          {
            key: "workOrder",
            header: "OS atual",
            render: (location: FieldLocationItem) =>
              location.currentWorkOrder ? (
                <Link
                  className="operations-map-work-order-link"
                  to={`/work-orders/${location.currentWorkOrder.id}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <span>{location.currentWorkOrder.code}</span>
                  <WorkOrderStatusBadge status={location.currentWorkOrder.status} />
                </Link>
              ) : (
                <span className="operations-map-muted">Sem OS</span>
              ),
          },
        ]
      : []),
    ...(showDispatches
      ? [
          {
            key: "dispatch",
            header: "Despacho",
            render: (location: FieldLocationItem) =>
              location.currentDispatch ? (
                <Link
                  className="operations-map-work-order-link"
                  to={`/operations/dispatches?dispatchId=${encodeURIComponent(location.currentDispatch.id)}&workOrderId=${encodeURIComponent(location.currentDispatch.workOrderId)}&operatorUserId=${encodeURIComponent(location.currentDispatch.operatorUserId)}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <span>Despacho</span>
                  <DispatchStatusBadge status={location.currentDispatch.status} />
                </Link>
              ) : canCreateDispatch && location.currentWorkOrder ? (
                <Link
                  className="operations-map-work-order-link"
                  to={`/operations/dispatches?workOrderId=${encodeURIComponent(location.currentWorkOrder.id)}&operatorUserId=${encodeURIComponent(location.userId ?? location.operatorId)}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  Criar despacho
                </Link>
              ) : (
                <span className="operations-map-muted">Sem despacho</span>
              ),
          },
        ]
      : []),
    { key: "team", header: "Equipe", render: (location: FieldLocationItem) => location.teamName ?? "Sem equipe" },
    { key: "battery", header: "Bateria", render: (location: FieldLocationItem) => formatBattery(location.batteryLevel) },
    { key: "accuracy", header: "Precisão", render: (location: FieldLocationItem) => formatAccuracy(location.accuracyMeters) },
    { key: "captured", header: "Última atualização", render: (location: FieldLocationItem) => formatFieldLocationDate(location.capturedAt) },
  ];

  return (
    <Card title="Operadores em campo">
      <Table
        rows={locations}
        keyForRow={(location) => location.id}
        onRowClick={onSelect}
        columns={columns}
      />
      <div className="operations-operator-cards">
        {locations.map((location) => (
          <button
            key={location.id}
            type="button"
            className={`operations-operator-card ${selectedId === location.id ? "is-selected" : ""}`}
            onClick={() => onSelect(location)}
          >
            <header>
              <strong>{location.displayName}</strong>
              <OperationsOperatorStatus location={location} />
            </header>
            {showWorkOrders && location.currentWorkOrder ? (
              <Link
                className="operations-map-work-order-card-link"
                to={`/work-orders/${location.currentWorkOrder.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                {location.currentWorkOrder.code}
                <WorkOrderStatusBadge status={location.currentWorkOrder.status} />
              </Link>
            ) : null}
            {showDispatches && location.currentDispatch ? (
              <Link
                className="operations-map-work-order-card-link"
                to={`/operations/dispatches?dispatchId=${encodeURIComponent(location.currentDispatch.id)}&workOrderId=${encodeURIComponent(location.currentDispatch.workOrderId)}&operatorUserId=${encodeURIComponent(location.currentDispatch.operatorUserId)}`}
                onClick={(event) => event.stopPropagation()}
              >
                Despacho
                <DispatchStatusBadge status={location.currentDispatch.status} />
              </Link>
            ) : null}
            {showDispatches && !location.currentDispatch && canCreateDispatch && location.currentWorkOrder ? (
              <Link
                className="operations-map-work-order-card-link"
                to={`/operations/dispatches?workOrderId=${encodeURIComponent(location.currentWorkOrder.id)}&operatorUserId=${encodeURIComponent(location.userId ?? location.operatorId)}`}
                onClick={(event) => event.stopPropagation()}
              >
                Criar despacho
              </Link>
            ) : null}
            <span>{location.teamName ?? "Sem equipe"}</span>
            <footer>
              <small><Battery size={14} /> {formatBattery(location.batteryLevel)}</small>
              <small><LocateFixed size={14} /> {formatAccuracy(location.accuracyMeters)}</small>
              <small><Clock size={14} /> {formatFieldLocationDate(location.capturedAt)}</small>
            </footer>
            <span className="operations-operator-card__action">Ver detalhes</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
