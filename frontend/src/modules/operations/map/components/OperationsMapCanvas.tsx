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
  // J-MAPAS-10 — deltas do protótipo: rotas tracejadas, memória da visão (câmera inicial + save
  // no moveend), pan imperativo e popup React do marker de OS. PR-2 FECHOU a pendência: os DOIS
  // canvases (MapLibre default e espelho Google) consomem todos eles.
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
  // velho) — o dono nunca via o trabalho novo. O PR-2 FECHOU a paridade do espelho (losango,
  // avatar/borda, rotas tracejadas, memória da visão, pan, popup, hover/clique), e mesmo assim o
  // opt-in explícito (VITE_MAPS_PROVIDER=google) FICA — agora por dois motivos declarados:
  //   1. CUSTO: OpenFreeMap é US$ 0/keyless; Google Dynamic Maps é SKU tarifado (US$ 7,00/1.000
  //      após 10.000/mês). Cair no provedor pago só porque existe uma chave no ambiente seria
  //      ligar um serviço tarifado sem decisão — §C7.1 exige junta para isso.
  //   2. CARTOGRAFIA: com `mapId` a API ignora `styles` em JS, então o token-set claro
  //      "voyager-like" do nosso mapStyle NÃO se aplica ao Google — os dois são claros, mas o
  //      alvo pixel do protótipo é o basemap do MapLibre.
  const googleOptIn = readFrontendEnv("VITE_MAPS_PROVIDER") === "google";
  if (googleOptIn && apiKey && mapsLoadState !== "error") {
    return (
      <GoogleMapsCanvas
        loadState={mapsLoadState}
        locations={locations}
        selectedId={selectedId}
        onSelect={onSelect}
        onHoverTechnician={onHoverTechnician}
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
