import { Battery, Clock, LocateFixed } from "lucide-react";

import { Card, Table } from "../../../../components/ui";
import {
  formatAccuracy,
  formatBattery,
  formatFieldLocationDate,
} from "../operations-map.adapter";
import type { FieldLocationItem } from "../operations-map.types";
import { OperationsOperatorStatus } from "./OperationsMapStatusBadge";

export function OperationsOperatorList({
  locations,
  selectedId,
  onSelect,
}: {
  locations: FieldLocationItem[];
  selectedId?: string;
  onSelect: (location: FieldLocationItem) => void;
}) {
  return (
    <Card title="Operadores em campo">
      <Table
        rows={locations}
        keyForRow={(location) => location.id}
        onRowClick={onSelect}
        columns={[
          {
            key: "operator",
            header: "Operador",
            render: (location) => (
              <strong className={selectedId === location.id ? "operations-map-selected-text" : undefined}>
                {location.displayName}
              </strong>
            ),
          },
          { key: "status", header: "Status", render: (location) => <OperationsOperatorStatus location={location} /> },
          { key: "team", header: "Equipe", render: (location) => location.teamName ?? "Sem equipe" },
          { key: "battery", header: "Bateria", render: (location) => formatBattery(location.batteryLevel) },
          { key: "accuracy", header: "Precisão", render: (location) => formatAccuracy(location.accuracyMeters) },
          { key: "captured", header: "Última atualização", render: (location) => formatFieldLocationDate(location.capturedAt) },
        ]}
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
