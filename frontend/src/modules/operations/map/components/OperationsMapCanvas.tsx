import { AlertTriangle, Map, MapPin } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import { Chip } from "../../../../components/ui";
import { readFrontendEnv } from "../../../../config/env";
import {
  formatLastSeen,
  getFieldLocationStatusLabel,
  getMarkerPosition,
  getVehicleFleetBadges,
} from "../operations-map.adapter";
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
  maintenanceVehicleIds,
  insuredVehicleIds,
}: {
  locations: readonly FieldLocationItem[];
  selectedId?: string;
  onSelect: (location: FieldLocationItem) => void;
  showDispatches?: boolean;
  maintenanceVehicleIds?: readonly string[];
  insuredVehicleIds?: readonly string[];
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
    <section className="operations-map-canvas" aria-label="Visualização operacional">
      <header>
        <div>
          <Map size={20} />
          <strong>Visualização operacional</strong>
        </div>
        <Chip tone={isApiKeyError ? "warning" : "info"}>
          {isApiKeyError ? "Google Maps indisponível" : "Modo de demonstração"}
        </Chip>
      </header>
      <p>
        {isApiKeyError
          ? "Google Maps não pôde ser carregado. Visualização operacional alternativa ativa."
          : "Visualização de mapa em modo de demonstração."}
      </p>
      <div className="operations-map-canvas__surface">
        <span className="operations-map-canvas__road operations-map-canvas__road--primary" />
        <span className="operations-map-canvas__road operations-map-canvas__road--secondary" />
        {locations.map((location) => {
          const position = getMarkerPosition(location, locations);
          const fleetBadges = getVehicleFleetBadges(location, { maintenanceVehicleIds, insuredVehicleIds });

          return (
            <div
              key={location.id}
              className="operations-map-marker-wrap"
              style={{ "--x": `${position.x}%`, "--y": `${position.y}%` } as CSSProperties}
            >
              <button
                type="button"
                className={`operations-map-marker ${selectedId === location.id ? "is-selected" : ""} ${location.isStale ? "is-stale" : ""}`}
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
                {location.isStale ? (
                  <small className="operations-map-marker__stale">Último visto {formatLastSeen(location.capturedAt)}</small>
                ) : null}
              </button>
              {fleetBadges ? (
                <span className="operations-map-marker-badges">
                  {fleetBadges.inMaintenance ? (
                    <Link
                      className="ui-chip ui-tone-warning operations-map-marker-badge"
                      to={`/fleet/maintenance?vehicle=${encodeURIComponent(fleetBadges.vehicleId)}`}
                      aria-label={`Viatura da OS de ${location.displayName} em manutenção — abrir Manutenção da frota`}
                    >
                      Em manutenção
                    </Link>
                  ) : null}
                  {fleetBadges.missingInsurance ? (
                    <Link
                      className="ui-chip ui-tone-danger operations-map-marker-badge"
                      to={`/fleet/insurance?vehicle=${encodeURIComponent(fleetBadges.vehicleId)}`}
                      aria-label={`Viatura da OS de ${location.displayName} sem seguro vigente — abrir Seguros da frota`}
                    >
                      Sem seguro
                    </Link>
                  ) : null}
                </span>
              ) : null}
            </div>
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
