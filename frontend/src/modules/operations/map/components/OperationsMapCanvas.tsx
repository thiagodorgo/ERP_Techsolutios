import { AlertTriangle, Map, MapPin } from "lucide-react";
import type { CSSProperties } from "react";

import { Chip } from "../../../../components/ui";
import { readFrontendEnv } from "../../../../config/env";
import { getFieldLocationStatusLabel, getMarkerPosition } from "../operations-map.adapter";
import { getDispatchStatusLabel } from "../../dispatches/dispatches.adapter";
import { getWorkOrderStatusLabel } from "../../../work-orders/work-orders.adapter";
import type { FieldLocationItem } from "../operations-map.types";
import { useGoogleMapsLoader } from "../hooks/useGoogleMapsLoader";
import { GoogleMapsCanvas } from "./GoogleMapsCanvas";

export function OperationsMapCanvas({
  locations,
  selectedId,
  onSelect,
  showDispatches = false,
}: {
  locations: readonly FieldLocationItem[];
  selectedId?: string;
  onSelect: (location: FieldLocationItem) => void;
  showDispatches?: boolean;
}) {
  const apiKey = readFrontendEnv("VITE_GOOGLE_MAPS_API_KEY") || undefined;
  const mapsLoadState = useGoogleMapsLoader(apiKey);

  if (apiKey && mapsLoadState !== "error") {
    return (
      <GoogleMapsCanvas
        loadState={mapsLoadState}
        locations={locations}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    );
  }

  const isApiKeyError = Boolean(apiKey) && mapsLoadState === "error";

  return (
    <section className="operations-map-canvas" aria-label="Visualizacao operacional">
      <header>
        <div>
          <Map size={20} />
          <strong>Visualização operacional</strong>
        </div>
        <Chip tone={isApiKeyError ? "warning" : "info"}>
          {isApiKeyError ? "Google Maps indisponível" : "Mapa placeholder"}
        </Chip>
      </header>
      <p>
        {isApiKeyError
          ? "Google Maps não pôde ser carregado. Visualização operacional alternativa ativa."
          : "Configure VITE_GOOGLE_MAPS_API_KEY para ativar o mapa real."}
      </p>
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
                {showDispatches && location.currentDispatch
                  ? `Despacho · ${getDispatchStatusLabel(location.currentDispatch.status)}`
                  : location.currentWorkOrder
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
