import { useState, type ReactNode } from "react";

import { readFrontendEnv } from "../../../../config/env";
import type { FieldLocationItem, OperationsMapPadding, OperationsMapWorkOrderPin } from "../operations-map.types";
import type { WorkOrderRouteFeatureCollection } from "../map/routeLines";
import type { MapViewState } from "../hooks/useMapViewMemory";
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
  onHoverTechnician,
  workOrderPins,
  selectedWorkOrderId,
  onSelectWorkOrder,
  pulsingWorkOrderIds,
  resizeSignal,
  mapPadding,
  routes,
  initialView,
  onMoveEnd,
  panTarget,
  renderWorkOrderPopup,
  closePopupSignal,
}: {
  locations: readonly FieldLocationItem[];
  selectedId?: string;
  onSelect: (location: FieldLocationItem) => void;
  showDispatches?: boolean;
  maintenanceVehicleIds?: readonly string[];
  onHoverTechnician?: (location: FieldLocationItem | null) => void;
  insuredVehicleIds?: readonly string[];
  // Ω1b — pins de chamado. Google e MapLibre exibem operadores + chamados; o esquemático
  // (sem coordenada real) segue só com operadores.
  workOrderPins?: readonly OperationsMapWorkOrderPin[];
  selectedWorkOrderId?: string;
  onSelectWorkOrder?: (id: string) => void;
  // M-5 — ids de OS recém-chegadas que pulsam (alerta de OS nova); já filtrado por reduced-motion.
  pulsingWorkOrderIds?: ReadonlySet<string>;
  resizeSignal?: number;
  mapPadding?: OperationsMapPadding;
  // J-MAPAS-10 — deltas do protótipo no caminho MapLibre DEFAULT: rotas tracejadas, memória da
  // visão (câmera inicial + save no moveend), pan imperativo e popup React do marker de OS.
  // PENDÊNCIA registrada (PR-2): o espelho Google ainda não consome estes quatro — paridade
  // completa fecha no PR-2 da mesma rodada (plano D7).
  routes?: WorkOrderRouteFeatureCollection;
  initialView?: MapViewState;
  onMoveEnd?: (view: MapViewState) => void;
  panTarget?: { readonly lng: number; readonly lat: number; readonly key: number } | null;
  renderWorkOrderPopup?: (workOrderId: string) => ReactNode;
  closePopupSignal?: number;
}) {
  const apiKey = readFrontendEnv("VITE_GOOGLE_MAPS_API_KEY") || undefined;
  const mapsLoadState = useGoogleMapsLoader(apiKey);
  // Ω1 (J-002): fallback esquemático só quando o MapLibre não inicializa (sem WebGL / tiles fora).
  const [libreFailed, setLibreFailed] = useState(false);

  // J-MAPAS-10 (ALTA da junta + diretiva do dono): o MapLibre pixel-perfect é o canvas DEFAULT.
  // A mera presença da chave Google fazia a tela cair no espelho ANTIGO (auto-foco, chips, visual
  // velho) — o dono nunca via o trabalho novo. Google agora é opt-in explícito até a paridade
  // do PR-2: VITE_MAPS_PROVIDER=google.
  const googleOptIn = readFrontendEnv("VITE_MAPS_PROVIDER") === "google";
  if (googleOptIn && apiKey && mapsLoadState !== "error") {
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
        onHoverTechnician={onHoverTechnician}
        onInitError={() => setLibreFailed(true)}
        workOrderPins={workOrderPins}
        selectedWorkOrderId={selectedWorkOrderId}
        onSelectWorkOrder={onSelectWorkOrder}
        pulsingWorkOrderIds={pulsingWorkOrderIds}
        resizeSignal={resizeSignal}
        mapPadding={mapPadding}
        routes={routes}
        initialView={initialView}
        onMoveEnd={onMoveEnd}
        panTarget={panTarget}
        renderWorkOrderPopup={renderWorkOrderPopup}
        closePopupSignal={closePopupSignal}
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
