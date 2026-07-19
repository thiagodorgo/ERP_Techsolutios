import { useState } from "react";

import { readFrontendEnv } from "../../../../config/env";
import type { FieldLocationItem, OperationsMapPadding, OperationsMapWorkOrderPin } from "../operations-map.types";
import { useGoogleMapsLoader } from "../hooks/useGoogleMapsLoader";
import { GoogleMapsCanvas } from "./GoogleMapsCanvas";
import { OperationsMapLibreCanvas } from "./OperationsMapLibreCanvas";
import { OperationsMapSchematicCanvas } from "./OperationsMapSchematicCanvas";

export function OperationsMapCanvas({
  locations,
  selectedId,
  onSelect,
  showDispatches = false,
  maintenanceVehicleIds,
  insuredVehicleIds,
  workOrderPins,
  selectedWorkOrderId,
  onSelectWorkOrder,
  pulsingWorkOrderIds,
  resizeSignal,
  mapPadding,
}: {
  locations: readonly FieldLocationItem[];
  selectedId?: string;
  onSelect: (location: FieldLocationItem) => void;
  showDispatches?: boolean;
  maintenanceVehicleIds?: readonly string[];
  insuredVehicleIds?: readonly string[];
  // Ω1b — pins de chamado. Google e MapLibre exibem operadores + chamados; o esquemático
  // (sem coordenada real) segue só com operadores.
  workOrderPins?: readonly OperationsMapWorkOrderPin[];
  selectedWorkOrderId?: string;
  onSelectWorkOrder?: (id: string) => void;
  // M-5 (J-MAPAS-6) — ids de OS recém-chegadas que pulsam (alerta de OS nova). Repassado aos dois
  // canvases reais (MapLibre = camada wo-pulse; Google = classe --pulse no marcador). Já filtrado por
  // reduced-motion no hook. O esquemático de fallback ignora (sem coordenada real, sem pulso).
  pulsingWorkOrderIds?: ReadonlySet<string>;
  // J-MAPAS-6 (redesign) — repassados aos canvases reais (MapLibre/Google) para o resize do
  // container e o padding dos rails de vidro; o esquemático de fallback os ignora.
  resizeSignal?: number;
  mapPadding?: OperationsMapPadding;
}) {
  const apiKey = readFrontendEnv("VITE_GOOGLE_MAPS_API_KEY") || undefined;
  const mapsLoadState = useGoogleMapsLoader(apiKey);
  // Ω1 (J-002): fallback esquemático só quando o MapLibre não inicializa (sem WebGL / tiles fora).
  const [libreFailed, setLibreFailed] = useState(false);

  // Google Maps permanece disponível quando há chave configurada (não regride quem já usa).
  if (apiKey && mapsLoadState !== "error") {
    return (
      <GoogleMapsCanvas
        loadState={mapsLoadState}
        locations={locations}
        selectedId={selectedId}
        onSelect={onSelect}
        workOrderPins={workOrderPins}
        selectedWorkOrderId={selectedWorkOrderId}
        onSelectWorkOrder={onSelectWorkOrder}
        pulsingWorkOrderIds={pulsingWorkOrderIds}
        resizeSignal={resizeSignal}
        mapPadding={mapPadding}
      />
    );
  }

  // Sem chave Google (padrão): mapa real MapLibre + OpenFreeMap — sem chave, sem custo.
  if (!libreFailed) {
    return (
      <OperationsMapLibreCanvas
        locations={locations}
        selectedId={selectedId}
        onSelect={onSelect}
        onInitError={() => setLibreFailed(true)}
        workOrderPins={workOrderPins}
        selectedWorkOrderId={selectedWorkOrderId}
        onSelectWorkOrder={onSelectWorkOrder}
        pulsingWorkOrderIds={pulsingWorkOrderIds}
        resizeSignal={resizeSignal}
        mapPadding={mapPadding}
      />
    );
  }

  return (
    <OperationsMapSchematicCanvas
      locations={locations}
      selectedId={selectedId}
      onSelect={onSelect}
      showDispatches={showDispatches}
      maintenanceVehicleIds={maintenanceVehicleIds}
      insuredVehicleIds={insuredVehicleIds}
      isApiKeyError={Boolean(apiKey) && mapsLoadState === "error"}
    />
  );
}
