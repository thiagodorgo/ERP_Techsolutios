import { AlertTriangle, Map, MapPin } from "lucide-react";
import type { CSSProperties } from "react";

import { Chip } from "../../../../components/ui";
import { getFieldLocationStatusLabel, getMarkerPosition } from "../operations-map.adapter";
import { getWorkOrderStatusLabel } from "../../../work-orders/work-orders.adapter";
import type { FieldLocationItem } from "../operations-map.types";

export function OperationsMapCanvas({
  locations,
  selectedId,
  onSelect,
}: {
  locations: readonly FieldLocationItem[];
  selectedId?: string;
  onSelect: (location: FieldLocationItem) => void;
}) {
  return (
    <section className="operations-map-canvas" aria-label="Visualizacao operacional inicial">
      <header>
        <div>
          <Map size={20} />
          <strong>Visualização operacional inicial</strong>
        </div>
        <Chip tone="info">Google Maps futuro</Chip>
      </header>
      <p>Visualização operacional inicial — integração Google Maps será adicionada em etapa futura.</p>
      <div className="operations-map-canvas__surface">
        <span className="operations-map-canvas__road operations-map-canvas__road--primary" />
        <span className="operations-map-canvas__road operations-map-canvas__road--secondary" />
        {locations.map((location) => {
          const position = getMarkerPosition(location, locations);

          return (
            <button
              key={location.id}
              type="button"
              className={`operations-map-marker ${selectedId === location.id ? "is-selected" : ""} ${location.isStale ? "is-stale" : ""}`}
              style={{ "--x": `${position.x}%`, "--y": `${position.y}%` } as CSSProperties}
              onClick={() => onSelect(location)}
              aria-label={`Selecionar ${location.displayName}`}
            >
              {location.isStale ? <AlertTriangle size={15} /> : <MapPin size={15} />}
              <span>{location.displayName}</span>
              <small>
                {location.currentWorkOrder
                  ? `${location.currentWorkOrder.code} · ${getWorkOrderStatusLabel(location.currentWorkOrder.status)}`
                  : getFieldLocationStatusLabel(location.status)}
              </small>
            </button>
          );
        })}
      </div>
      <footer>
        <span><MapPin size={14} /> Atual</span>
        <span><AlertTriangle size={14} /> Localização antiga</span>
      </footer>
    </section>
  );
}
