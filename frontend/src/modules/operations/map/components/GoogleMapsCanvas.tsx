import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { GoogleMapsLoadState } from "../hooks/useGoogleMapsLoader";
import type { MapViewState } from "../hooks/useMapViewMemory";
import type { FieldLocationItem, OperationsMapPadding, OperationsMapWorkOrderPin } from "../operations-map.types";
import { OPERATIONAL_MAP_DEFAULT_CENTER, OPERATIONAL_MAP_DEFAULT_ZOOM } from "../map/mapStyle";
import {
  OPERATIONS_MAP_ANIMATION_MS,
  getAvatarColor,
  getFieldLocationGroup,
  getInitials,
  getTechnicianBorderColor,
  getWorkOrderPriorityColor,
  interpolateCoords,
  isValidMapCoordinate,
  type LngLat,
} from "../map/mapMarkers";
import {
  WORK_ORDER_ROUTE_COLOR,
  WORK_ORDER_ROUTE_DASHARRAY,
  WORK_ORDER_ROUTE_OPACITY,
  WORK_ORDER_ROUTE_WIDTH,
  type WorkOrderRouteFeatureCollection,
} from "../map/routeLines";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL, PR-2) — ESPELHO Google do canvas MapLibre pixel-perfect.
 *
 * Web Components do Google Maps (gmp-map + gmp-advanced-marker, v=beta); o `Marker` clássico é
 * DEPRECATED e não é usado. Este arquivo fecha a PENDÊNCIA declarada no PR-1: o espelho passou a
 * consumir os MESMOS deltas do protótipo do dono, com as MESMAS fontes únicas de cor/geometria:
 *   • técnico = avatar 32px (fundo AVC estável por id + borda 3px na cor do grupo de status,
 *     âmbar quando a posição é antiga; grupo "off" esmaece) — `getAvatarColor`/`getTechnicianBorderColor`;
 *   • OS = LOSANGO 22px por prioridade (`getWorkOrderPriorityColor`), variante selecionada com
 *     anel azul e pulso para urgente/nova (M-5);
 *   • ROTAS TRACEJADAS técnico→OS: `google.maps.Polyline` com `strokeOpacity: 0` + símbolo repetido
 *     (padrão oficial de dashed line, verificado 2026-08-06 em
 *     developers.google.com/maps/documentation/javascript/symbols, "Last updated 2026-07-31 UTC");
 *     dash/gap derivados da MESMA constante do MapLibre (WORK_ORDER_ROUTE_DASHARRAY × largura);
 *   • MEMÓRIA DA VISÃO (D4): câmera inicial = visão salva > Brasil z4; `idle` (equivalente do
 *     `moveend`) reporta a câmera para a página salvar;
 *   • POPUP do marker de OS: `InfoWindow` ancorada no AdvancedMarkerElement com conteúdo React em
 *     root dedicado (unmount no close — sem leak), espelhando o `maplibregl.Popup`.
 *
 * DIRETIVAS DO DONO (2026-08-06) valem aqui igualzinho:
 *   (a) NENHUM movimento automático de câmera — o auto-fit/focus-city MORREU, seleção não move o
 *       mapa, não há clustering. O único movimento é o `panTarget`, disparado por clique do operador;
 *   (b) memória da visão por organização (a página resolve a chave por tenant);
 *   (c) detalhe do técnico por HOVER (efêmero: `onHoverTechnician(item)`/`(null)`) e por CLIQUE
 *       (fixo: `onSelect`).
 *
 * DIVERGÊNCIAS INERENTES declaradas (não dá para "fingir"): a CARTOGRAFIA do basemap é a do Google
 * (Map ID / cloud styling; com `mapId` a API ignora `styles` em JS), então o token-set claro
 * "voyager-like" do `mapStyle.ts` NÃO se aplica aqui — ambos são claros, mas não são o mesmo mapa;
 * e a moldura da InfoWindow (bolha + seta + botão de fechar) é do Google, só o CONTEÚDO é o nosso.
 *
 * LGPD: nenhuma coordenada é logada; a coordenada só existe em memória para posicionar marker/rota.
 */

// map-id do exemplo oficial (estilo default). Um Map ID próprio (Cloud Console) pode substituir depois.
const MAP_ID = "DEMO_MAP_ID";

// D4 — câmera default do protótipo (Brasil z4), da MESMA fonte única do MapLibre.
const DEFAULT_VIEW: MapViewState = {
  lat: OPERATIONAL_MAP_DEFAULT_CENTER[1],
  lng: OPERATIONAL_MAP_DEFAULT_CENTER[0],
  z: OPERATIONAL_MAP_DEFAULT_ZOOM,
};

// Espelho do `wo-label` do MapLibre (minzoom 12): o código da OS só aparece a partir deste zoom.
const WORK_ORDER_CODE_MIN_ZOOM = 12;

// Dash em PIXELS derivado da MESMA constante do MapLibre (múltiplos da largura da linha):
// 2.4 × 2.5 ≈ 6px de traço e 2.8 × 2.5 = 7px de vão — o "6 7" do protótipo Leaflet.
const ROUTE_DASH_PX = WORK_ORDER_ROUTE_DASHARRAY[0] * WORK_ORDER_ROUTE_WIDTH;
const ROUTE_GAP_PX = WORK_ORDER_ROUTE_DASHARRAY[1] * WORK_ORDER_ROUTE_WIDTH;

type Props = {
  readonly loadState: GoogleMapsLoadState;
  readonly locations: readonly FieldLocationItem[];
  readonly selectedId?: string;
  readonly onSelect: (location: FieldLocationItem) => void;
  /** Hover no pin do técnico: item ao entrar, null ao sair (detalhe efêmero; nunca move o mapa). */
  readonly onHoverTechnician?: (location: FieldLocationItem | null) => void;
  readonly workOrderPins?: readonly OperationsMapWorkOrderPin[];
  readonly selectedWorkOrderId?: string;
  readonly onSelectWorkOrder?: (id: string) => void;
  // M-5 — ids de OS recém-chegadas que pulsam; já filtrado por reduced-motion no hook.
  readonly pulsingWorkOrderIds?: ReadonlySet<string>;
  readonly resizeSignal?: number;
  readonly mapPadding?: OperationsMapPadding;
  // J-MAPAS-10 — deltas do protótipo (paridade fechada no PR-2).
  readonly routes?: WorkOrderRouteFeatureCollection;
  readonly initialView?: MapViewState;
  readonly onMoveEnd?: (view: MapViewState) => void;
  readonly panTarget?: { readonly lng: number; readonly lat: number; readonly key: number } | null;
  readonly renderWorkOrderPopup?: (workOrderId: string) => ReactNode;
  readonly closePopupSignal?: number;
};

export function GoogleMapsCanvas({
  loadState,
  locations,
  selectedId,
  onSelect,
  onHoverTechnician,
  workOrderPins = [],
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
}: Props) {
  const mapRef = useRef<GmpMapElement | null>(null);
  const [innerMap, setInnerMap] = useState<google.maps.Map | null>(null);

  // Visão inicial resolvida UMA vez (salva > Brasil z4) — a câmera viva pertence ao mapa depois disso.
  const initialViewRef = useRef<MapViewState | null>(null);
  if (initialViewRef.current === null) initialViewRef.current = initialView ?? DEFAULT_VIEW;
  const [zoom, setZoom] = useState<number>(initialViewRef.current.z);

  const mapPaddingRef = useRef(mapPadding);
  mapPaddingRef.current = mapPadding;
  const onMoveEndRef = useRef(onMoveEnd);
  onMoveEndRef.current = onMoveEnd;
  const renderWorkOrderPopupRef = useRef(renderWorkOrderPopup);
  renderWorkOrderPopupRef.current = renderWorkOrderPopup;

  // Popup do marker de OS: instância + root React dedicado (unmount garantido no close/unmount).
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const popupRootRef = useRef<Root | null>(null);
  const popupContainerRef = useRef<HTMLDivElement | null>(null);
  const popupWorkOrderIdRef = useRef<string | null>(null);

  // Rotas vivas no mapa (recriadas a cada mudança do GeoJSON; removidas no unmount).
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Só chamados com coordenada válida viram pin (predicado único; nunca a "OS fantasma" 0/0).
  const validWorkOrderPins = workOrderPins.filter((pin) => isValidMapCoordinate(pin.latitude, pin.longitude));

  // Geometria via PROPRIEDADE (objeto LatLngLiteral) — o setter dos web components rejeita a
  // string do atributo quando vem por property-assign (comportamento do React 19 com custom
  // elements).
  // Junta PR-2 (ALTA, provada em harness runtime): em React 19 um ref callback INLINE é
  // re-invocado a cada re-render (null + elemento) — sem guard, cada polling/hover/seleção
  // reaplicava a visão INICIAL e estalava a câmera do operador de volta (violando a diretiva
  // "o mapa não tem vida própria" e salvando a visão errada por cima da memória). A visão
  // inicial é aplicada EXATAMENTE UMA VEZ.
  const initialCameraAppliedRef = useRef(false);
  const attachMap = (element: GmpMapElement | null) => {
    mapRef.current = element;
    const view = initialViewRef.current;
    if (element && view && !initialCameraAppliedRef.current) {
      initialCameraAppliedRef.current = true;
      element.center = { lat: view.lat, lng: view.lng };
      element.zoom = view.z;
    }
  };

  // --- resolve o google.maps.Map interno (o web component sobe assíncrono; retry por rAF) ---
  useEffect(() => {
    if (loadState !== "ready") {
      setInnerMap(null);
      return;
    }
    let raf = 0;
    let attempts = 0;
    let cancelled = false;
    const resolveInnerMap = () => {
      if (cancelled) return;
      const resolved = mapRef.current?.innerMap;
      if (resolved) {
        setInnerMap(resolved);
        return;
      }
      if (attempts < 40) {
        attempts += 1;
        raf = requestAnimationFrame(resolveInnerMap);
      }
    };
    resolveInnerMap();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [loadState]);

  // --- controles: SÓ o zoom, no canto inferior direito (verbatim do protótipo; o fullscreen saiu) ---
  useEffect(() => {
    if (!innerMap) return;
    innerMap.setOptions({
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      clickableIcons: false,
    });
  }, [innerMap]);

  // --- D4: memória da visão. `idle` é o equivalente do `moveend` (dispara quando o mapa fica
  //     inativo após pan/zoom). O PRIMEIRO idle é o assentamento do mount — ignorado, senão a
  //     tela salvaria/piscaria o savenote sem o operador ter movido nada. Views repetidas também
  //     são descartadas (dedupe), então o savenote só acende em movimento REAL.
  useEffect(() => {
    if (!innerMap) return;
    let settled = false;
    let lastKey = "";
    const listener = innerMap.addListener("idle", () => {
      const center = innerMap.getCenter();
      const currentZoom = innerMap.getZoom();
      if (!center || typeof currentZoom !== "number") return;
      const view: MapViewState = { lat: center.lat(), lng: center.lng(), z: currentZoom };
      setZoom(currentZoom);
      const key = `${view.lat}|${view.lng}|${view.z}`;
      if (!settled) {
        settled = true;
        lastKey = key;
        return;
      }
      if (key === lastKey) return;
      lastKey = key;
      onMoveEndRef.current?.(view);
    });
    return () => listener.remove();
  }, [innerMap]);

  // --- pan imperativo da página (card de atendimento / detalhe do técnico / seleção de OS) ---
  // Espelha o `easeTo` + `setPadding` do MapLibre: o Google não tem padding persistente de câmera,
  // então o deslocamento do stack (348px à direita) é aplicado em PIXELS com panBy.
  useEffect(() => {
    if (!innerMap || !panTarget) return;
    innerMap.panTo({ lat: panTarget.lat, lng: panTarget.lng });
    const padding = mapPaddingRef.current;
    if (padding) {
      innerMap.panBy((padding.right - padding.left) / 2, (padding.bottom - padding.top) / 2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerMap, panTarget?.key]);

  // --- rotas tracejadas técnico→OS (GeoJSON puro montado pela página; honesto por construção) ---
  useEffect(() => {
    if (!innerMap) return;
    for (const polyline of polylinesRef.current) polyline.setMap(null);
    polylinesRef.current = [];

    const features = routes?.features ?? [];
    for (const feature of features) {
      const path = feature.geometry.coordinates.map(([lng, lat]) => ({ lat: lat ?? 0, lng: lng ?? 0 }));
      if (path.length < 2) continue;
      polylinesRef.current.push(
        new google.maps.Polyline({
          path,
          map: innerMap,
          clickable: false,
          // Dashed line oficial: linha invisível + símbolo repetido (dash 6px / vão 7px).
          strokeOpacity: 0,
          strokeColor: WORK_ORDER_ROUTE_COLOR,
          strokeWeight: WORK_ORDER_ROUTE_WIDTH,
          icons: [
            {
              icon: {
                path: "M 0,-1 0,1",
                scale: ROUTE_DASH_PX / 2,
                strokeColor: WORK_ORDER_ROUTE_COLOR,
                strokeOpacity: WORK_ORDER_ROUTE_OPACITY,
                strokeWeight: WORK_ORDER_ROUTE_WIDTH,
              },
              offset: "0",
              repeat: `${ROUTE_DASH_PX + ROUTE_GAP_PX}px`,
            },
          ],
        }),
      );
    }

    return () => {
      for (const polyline of polylinesRef.current) polyline.setMap(null);
      polylinesRef.current = [];
    };
  }, [innerMap, routes]);

  // --- resize quando o container muda de tamanho sem resize de janela (~220ms, regra do espelho) ---
  useEffect(() => {
    if (!innerMap || resizeSignal === undefined) return;
    const timer = setTimeout(() => {
      google.maps.event.trigger(innerMap, "resize");
    }, 220);
    return () => clearTimeout(timer);
  }, [innerMap, resizeSignal]);

  // --- popup do marker de OS (InfoWindow + root React dedicado) ---
  function closeWorkOrderPopup() {
    infoWindowRef.current?.close();
    infoWindowRef.current = null;
    const root = popupRootRef.current;
    if (root) setTimeout(() => root.unmount(), 0); // unmount adiado: o close pode vir durante um render
    popupRootRef.current = null;
    popupContainerRef.current = null;
    popupWorkOrderIdRef.current = null;
  }

  function openWorkOrderPopup(workOrderId: string, anchor: GmpAdvancedMarkerElement) {
    const factory = renderWorkOrderPopupRef.current;
    if (!innerMap || !factory) return;
    closeWorkOrderPopup();

    const container = document.createElement("div");
    container.className = "opmap-gpopup";
    const root = createRoot(container);
    root.render(factory(workOrderId));
    const infoWindow = new google.maps.InfoWindow({ content: container, maxWidth: 300 });
    infoWindow.addListener("closeclick", () => {
      if (infoWindowRef.current === infoWindow) closeWorkOrderPopup();
    });
    infoWindow.open({ map: innerMap, anchor, shouldFocus: false });

    infoWindowRef.current = infoWindow;
    popupRootRef.current = root;
    popupContainerRef.current = container;
    popupWorkOrderIdRef.current = workOrderId;
  }

  // Handler ESTÁVEL entregue aos markers: `openWorkOrderPopup` é recriado a cada render (fecha
  // sobre `innerMap`), e passá-lo direto faria cada marker re-assinar o `gmp-click` a todo render.
  const openPopupRef = useRef(openWorkOrderPopup);
  openPopupRef.current = openWorkOrderPopup;
  const handleOpenPopup = useRef((workOrderId: string, anchor: GmpAdvancedMarkerElement) => {
    openPopupRef.current(workOrderId, anchor);
  }).current;

  // Conteúdo vivo: os mesmos gatilhos do MapLibre (lista de pins, seleção, factory nova).
  useEffect(() => {
    const workOrderId = popupWorkOrderIdRef.current;
    const root = popupRootRef.current;
    const factory = renderWorkOrderPopupRef.current;
    if (!workOrderId || !root || !factory) return;
    root.render(factory(workOrderId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderPins, selectedWorkOrderId, renderWorkOrderPopup]);

  // --- fechar o popup sob comando da página (alocação concluída, Esc) ---
  useEffect(() => {
    if (closePopupSignal === undefined) return;
    closeWorkOrderPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePopupSignal]);

  // --- limpeza final: popup + rotas morrem com o componente (sem leak) ---
  useEffect(
    () => () => {
      closeWorkOrderPopup();
      for (const polyline of polylinesRef.current) polyline.setMap(null);
      polylinesRef.current = [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <section className="opmap-gmap" aria-label="Mapa operacional">
      <div className="opmap-gmap__canvas" role="application" aria-label="Mapa dos Técnicos de Campo">
        {loadState === "ready" ? (
          <gmp-map ref={attachMap} map-id={MAP_ID}>
            {locations.map((location) => (
              <TechnicianMarker
                key={location.id}
                location={location}
                onSelect={onSelect}
                onHover={onHoverTechnician}
              />
            ))}
            {validWorkOrderPins.map((pin) => (
              <WorkOrderMarker
                key={pin.id}
                pin={pin}
                isSelected={pin.id === selectedWorkOrderId}
                isPulsing={pin.priority === "urgent" || (pulsingWorkOrderIds?.has(pin.id) ?? false)}
                showCode={zoom >= WORK_ORDER_CODE_MIN_ZOOM}
                onSelectWorkOrder={onSelectWorkOrder}
                onOpenPopup={handleOpenPopup}
              />
            ))}
          </gmp-map>
        ) : null}
      </div>
      {loadState !== "ready" ? (
        <div className="opmap-gmap__overlay" role="status">
          <span className="opmap-gmap__spinner" aria-hidden="true" />
          Carregando mapa operacional…
        </div>
      ) : null}
      {/* J-MAPAS-10 — a legenda-FILTRO é page-level (D6); nenhum canvas renderiza legenda própria. */}
    </section>
  );
}

/**
 * Marcador do técnico (protótipo `.mk-tech`): avatar 32px, fundo AVC estável por id, borda 3px na
 * cor do grupo de status (âmbar quando a posição é antiga), iniciais brancas. Grupo "off" esmaece.
 * A SELEÇÃO não muda a pintura — igualzinho ao MapLibre (o feedback é o detail popover), então a
 * cor nunca mente sobre o status real.
 */
function TechnicianMarker({
  location,
  onSelect,
  onHover,
}: {
  readonly location: FieldLocationItem;
  readonly onSelect: (location: FieldLocationItem) => void;
  readonly onHover?: (location: FieldLocationItem | null) => void;
}) {
  const markerRef = useRef<GmpAdvancedMarkerElement | null>(null);
  const prevCoordRef = useRef<LngLat | null>(null);
  const rafRef = useRef<number | null>(null);

  // Posição via PROPRIEDADE (LatLngLiteral). Espelho da animação do MapLibre: a troca de posição é
  // INTERPOLADA (ease-out, mesma duração OPERATIONS_MAP_ANIMATION_MS) em vez de saltar.
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const to: LngLat = [location.longitude, location.latitude];
    const from = prevCoordRef.current;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!from || (from[0] === to[0] && from[1] === to[1])) {
      marker.position = { lat: to[1], lng: to[0] };
      prevCoordRef.current = to;
      return;
    }
    const start = performance.now();
    const frame = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - start) / OPERATIONS_MAP_ANIMATION_MS);
      const [lng, lat] = interpolateCoords(from, to, progress);
      const current = markerRef.current;
      if (current) current.position = { lat, lng };
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
        prevCoordRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [location.latitude, location.longitude]);

  // Diretiva do dono (c): HOVER abre o detalhe efêmero, CLIQUE fixa. `gmp-click` é custom event do
  // web component (React não faz bind via prop); mouseenter/mouseleave são ligados no MESMO
  // elemento por ref, para não depender de o conteúdo continuar no light DOM.
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const handleClick = () => onSelect(location);
    const handleEnter = () => onHover?.(location);
    const handleLeave = () => onHover?.(null);
    marker.addEventListener("gmp-click", handleClick);
    marker.addEventListener("mouseenter", handleEnter);
    marker.addEventListener("mouseleave", handleLeave);
    return () => {
      marker.removeEventListener("gmp-click", handleClick);
      marker.removeEventListener("mouseenter", handleEnter);
      marker.removeEventListener("mouseleave", handleLeave);
    };
  }, [location, onSelect, onHover]);

  const isOff = getFieldLocationGroup(location.status) === "off";

  return (
    <gmp-advanced-marker ref={markerRef} title={location.displayName}>
      <div
        className="opmap-gtech"
        data-off={isOff ? "true" : undefined}
        style={{ background: getAvatarColor(location.id), borderColor: getTechnicianBorderColor(location) }}
        aria-hidden
      >
        {getInitials(location.displayName)}
      </div>
    </gmp-advanced-marker>
  );
}

/**
 * Marcador da OS (protótipo `.mk-os`): LOSANGO 22px por prioridade, borda branca 2.5, anel azul
 * quando selecionado, pulso quando urgente ou recém-chegada (M-5). O código da OS aparece acima do
 * losango a partir do zoom 12 — espelho do `wo-label` (minzoom 12) do MapLibre.
 */
function WorkOrderMarker({
  pin,
  isSelected,
  isPulsing,
  showCode,
  onSelectWorkOrder,
  onOpenPopup,
}: {
  readonly pin: OperationsMapWorkOrderPin;
  readonly isSelected: boolean;
  readonly isPulsing: boolean;
  readonly showCode: boolean;
  readonly onSelectWorkOrder?: (id: string) => void;
  readonly onOpenPopup: (workOrderId: string, anchor: GmpAdvancedMarkerElement) => void;
}) {
  const markerRef = useRef<GmpAdvancedMarkerElement | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.position = { lat: pin.latitude, lng: pin.longitude }; // LatLngLiteral, nunca string
  }, [pin.latitude, pin.longitude]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const handleClick = () => {
      onSelectWorkOrder?.(pin.id);
      onOpenPopup(pin.id, marker);
    };
    marker.addEventListener("gmp-click", handleClick);
    return () => marker.removeEventListener("gmp-click", handleClick);
  }, [pin.id, onSelectWorkOrder, onOpenPopup]);

  const priorityColor = getWorkOrderPriorityColor(pin.priority);

  return (
    <gmp-advanced-marker ref={markerRef} title={`${pin.code} · ${pin.title}`}>
      <div className="opmap-gos-wrap" aria-hidden>
        {showCode ? <span className="opmap-gcode">{pin.code}</span> : null}
        <span
          className={`opmap-gos${isSelected ? " opmap-gos--selected" : ""}${isPulsing ? " opmap-gos--pulse" : ""}`}
          style={{ background: priorityColor, "--call-priority": priorityColor } as CSSProperties}
        />
      </div>
    </gmp-advanced-marker>
  );
}
