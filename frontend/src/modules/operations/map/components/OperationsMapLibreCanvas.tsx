import { useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Map as MlMap, GeoJSONSource, MapGeoJSONFeature, Popup as MlPopup, PopupOptions } from "maplibre-gl";

import { OPERATIONAL_MAP_STYLE } from "../map/mapStyle";
import {
  OPERATIONS_MAP_SOURCE_ID,
  OPERATIONS_MAP_ANIMATION_MS,
  WORK_ORDERS_MAP_SOURCE_ID,
  WORK_ORDER_PRIORITY_HEX,
  WORK_ORDER_PRIORITY_KEY,
  buildFieldLocationsFeatureCollection,
  buildWorkOrderPinsFeatureCollection,
  interpolateCoords,
  workOrderDiamondSvg,
  type FieldLocationFeatureCollection,
  type WorkOrderPinFeatureCollection,
  type LngLat,
} from "../map/mapMarkers";
import {
  WORK_ORDER_ROUTES_SOURCE_ID,
  WORK_ORDER_ROUTE_COLOR,
  WORK_ORDER_ROUTE_DASHARRAY,
  WORK_ORDER_ROUTE_OPACITY,
  WORK_ORDER_ROUTE_WIDTH,
  type WorkOrderRouteFeatureCollection,
} from "../map/routeLines";
import type { MapViewState } from "../hooks/useMapViewMemory";
import type { FieldLocationItem, OperationsMapPadding, OperationsMapWorkOrderPin } from "../operations-map.types";
import type { WorkOrderPriority } from "../../../work-orders/work-orders.types";

/**
 * Ω1 (J-002) → J-MAPAS-10 (PLANO-MAPA-PIXEL) — Canvas real do Mapa Operacional com MapLibre GL +
 * OpenFreeMap (keyless, US$ 0). Recriação pixel do protótipo do dono:
 *   • estilo CLARO "voyager-like" próprio (D1 — CARTO rejeitado por ToS);
 *   • técnico = círculo 32px com iniciais (fundo AVC estável por id, borda 3px na cor do grupo de
 *     status; âmbar quando antiga; off esmaecido) — cluster e animação de interpolação MANTIDOS;
 *   • OS = LOSANGO 22px por prioridade (variante selecionada com anel azul); wo-selected-ring e
 *     wo-pulse (urgente/novo) mantidos;
 *   • ROTAS TRACEJADAS técnico→OS (camada wo-routes; GeoJSON montado pela página, honesto);
 *   • POPUP do marker de OS com conteúdo React (root dedicado, unmount no close — sem leak);
 *   • MEMÓRIA DA VISÃO (D4): câmera inicial = visão salva > Brasil z4; moveend → onMoveEnd.
 *     O auto-fit por mudança de conjunto e o focus-city MORRERAM (superseded pelo dono);
 *     nenhum movimento automático de câmera: só a memória da visão e o pan explícito por clique.
 *
 * O `maplibre-gl` é carregado por import() dinâmico DENTRO do efeito de montagem — testes SSR não
 * instanciam WebGL. Falha de init → onInitError → fallback esquemático (a tela nunca quebra).
 * LGPD: nenhuma coordenada é logada.
 */

type Props = {
  readonly locations: readonly FieldLocationItem[];
  readonly selectedId?: string;
  readonly onSelect: (location: FieldLocationItem) => void;
  /** Hover no pin do técnico: item ao entrar, null ao sair (detalhe efêmero; nunca move o mapa). */
  readonly onHoverTechnician?: (location: FieldLocationItem | null) => void;
  readonly onInitError?: () => void;
  readonly workOrderPins?: readonly OperationsMapWorkOrderPin[];
  readonly selectedWorkOrderId?: string;
  readonly onSelectWorkOrder?: (id: string) => void;
  // M-5 — ids de OS recém-chegadas que pulsam (alerta de OS nova); já filtrado por reduced-motion.
  readonly pulsingWorkOrderIds?: ReadonlySet<string>;
  readonly resizeSignal?: number;
  readonly mapPadding?: OperationsMapPadding;
  // J-MAPAS-10 — rotas tracejadas técnico→OS (builder puro routeLines; página monta e filtra).
  readonly routes?: WorkOrderRouteFeatureCollection;
  // J-MAPAS-10 — memória da visão: câmera inicial (salva > Brasil z4) + save no moveend.
  readonly initialView?: MapViewState;
  readonly onMoveEnd?: (view: MapViewState) => void;
  // J-MAPAS-10 — pan imperativo da página (card "Em Atendimento", detalhe do técnico). `key` muda a cada pedido.
  readonly panTarget?: { readonly lng: number; readonly lat: number; readonly key: number } | null;
  // J-MAPAS-10 — popup do marker de OS: a página fornece o conteúdo React; bump em closePopupSignal fecha.
  readonly renderWorkOrderPopup?: (workOrderId: string) => ReactNode;
  readonly closePopupSignal?: number;
};

const EMPTY_FC: FieldLocationFeatureCollection = { type: "FeatureCollection", features: [] };
const EMPTY_WO_FC: WorkOrderPinFeatureCollection = { type: "FeatureCollection", features: [] };
const EMPTY_ROUTES_FC: WorkOrderRouteFeatureCollection = { type: "FeatureCollection", features: [] };

const WORK_ORDER_PIN_LAYERS = ["wo-diamond"] as const;

export function OperationsMapLibreCanvas({
  locations,
  selectedId,
  onSelect,
  onHoverTechnician,
  onInitError,
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
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const mapPaddingRef = useRef(mapPadding);
  mapPaddingRef.current = mapPadding;

  // Estado mais recente exposto aos handlers do mapa sem re-inicializar o mapa.
  const locationsRef = useRef(locations);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHoverTechnician);
  const onInitErrorRef = useRef(onInitError);
  const prevCoordsRef = useRef<Map<string, LngLat>>(new Map());
  const animRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const workOrderPinsRef = useRef(workOrderPins);
  const selectedWorkOrderRef = useRef(selectedWorkOrderId);
  const onSelectWorkOrderRef = useRef(onSelectWorkOrder);
  const woReadyRef = useRef(false);
  const woPulseRafRef = useRef<number | null>(null);
  const pulsingWorkOrderIdsRef = useRef(pulsingWorkOrderIds);
  const routesRef = useRef(routes);
  const initialViewRef = useRef(initialView);
  const onMoveEndRef = useRef(onMoveEnd);
  const renderWorkOrderPopupRef = useRef(renderWorkOrderPopup);
  // Popup do marker de OS: instância + root React dedicado (unmount garantido no close/unmount).
  const popupRef = useRef<MlPopup | null>(null);
  const popupRootRef = useRef<Root | null>(null);
  const popupWorkOrderIdRef = useRef<string | null>(null);
  // Só o construtor de Popup é necessário fora do init (o módulo é carregado dinamicamente).
  const maplibreglRef = useRef<{ readonly Popup: new (options?: PopupOptions) => MlPopup } | null>(null);

  locationsRef.current = locations;
  selectedRef.current = selectedId;
  onSelectRef.current = onSelect;
  onHoverRef.current = onHoverTechnician;
  workOrderPinsRef.current = workOrderPins;
  selectedWorkOrderRef.current = selectedWorkOrderId;
  onSelectWorkOrderRef.current = onSelectWorkOrder;
  pulsingWorkOrderIdsRef.current = pulsingWorkOrderIds;
  onInitErrorRef.current = onInitError;
  routesRef.current = routes;
  initialViewRef.current = initialView;
  onMoveEndRef.current = onMoveEnd;
  renderWorkOrderPopupRef.current = renderWorkOrderPopup;

  // --- inicialização (uma vez) ---
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let map: MlMap | null = null;
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        await import("maplibre-gl/dist/maplibre-gl.css");
        if (cancelled || !containerRef.current) return;
        maplibreglRef.current = maplibregl;

        // D4 — câmera inicial: visão SALVA do operador > default Brasil z4. SEM auto-fit.
        const view = initialViewRef.current;
        map = new maplibregl.Map({
          container: containerRef.current,
          style: OPERATIONAL_MAP_STYLE,
          center: view ? [view.lng, view.lat] : [-52.5, -15.5],
          zoom: view ? view.z : 4,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
        mapRef.current = map;
        // Controles no canto inferior direito (retenção deliberada da entrega SPRINT POLISH:
        // Navigation+Fullscreen não existem no protótipo, mas foram pedidos/aprovados pelo dono).
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
        map.touchZoomRotate.disableRotation();

        // D4 — memória da visão: todo moveend reporta a CÂMERA (e só ela) para a página salvar.
        map.on("moveend", () => {
          if (!map || mapRef.current !== map) return;
          const center = map.getCenter();
          onMoveEndRef.current?.({ lat: center.lat, lng: center.lng, z: map.getZoom() });
        });

        map.on("load", () => {
          if (cancelled || !map) return;
          const activeMap = map;
          registerLayers(activeMap);
          registerInteractions(activeMap);
          readyRef.current = true;
          setStatus("ready");
          applyMapPadding(activeMap);
          applyData();
          // Pins de chamado: rasteriza os losangos (async), então adiciona fonte/camadas.
          void (async () => {
            await loadDiamondImages(activeMap);
            if (cancelled || mapRef.current !== activeMap) return;
            registerWorkOrderLayers(activeMap);
            registerWorkOrderInteractions(activeMap);
            woReadyRef.current = true;
            applyWorkOrderData();
            applyRoutesData();
          })();
        });
      } catch {
        if (cancelled) return;
        setStatus("error");
        onInitErrorRef.current?.();
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      woReadyRef.current = false;
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      if (woPulseRafRef.current !== null) cancelAnimationFrame(woPulseRafRef.current);
      closeWorkOrderPopup();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- reação a mudanças de dados/seleção (técnicos): SÓ repinta. Zero movimento de câmera.
  useEffect(() => {
    if (!readyRef.current) return;
    // Diretiva do dono (2026-08-06): o mapa NÃO tem vida própria. Mudar seleção (inclusive por
    // HOVER) só repinta os pins — nunca move a câmera. Todo movimento automático passa a ser
    // explícito, via `panTarget` disparado por um clique do operador.
    applyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, selectedId]);

  // --- pins de chamado (inclui o conjunto de pulso "novo" do M-5) + popup vivo ---
  useEffect(() => {
    if (!woReadyRef.current) return;
    applyWorkOrderData();
    refreshWorkOrderPopupContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderPins, selectedWorkOrderId, pulsingWorkOrderIds, renderWorkOrderPopup]);

  // --- rotas tracejadas técnico→OS ---
  useEffect(() => {
    if (!woReadyRef.current) return;
    applyRoutesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);

  // --- pan imperativo da página (card de atendimento / detalhe do técnico) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !panTarget) return;
    map.easeTo({ center: [panTarget.lng, panTarget.lat], duration: 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panTarget?.key]);

  // --- fechar o popup sob comando da página (ex.: alocação concluída, Esc) ---
  useEffect(() => {
    if (closePopupSignal === undefined) return;
    closeWorkOrderPopup();
  }, [closePopupSignal]);

  // --- resize quando o container muda de tamanho sem resize de janela ---
  useEffect(() => {
    if (resizeSignal === undefined) return;
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const timer = setTimeout(() => {
      if (mapRef.current !== map) return;
      applyMapPadding(map);
      map.resize();
    }, 220);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizeSignal]);

  // Padding de câmera persistente (setPadding) — afasta o "centro" do stack de painéis (348px à direita),
  // então os easeTo seguintes enquadram o alvo na área visível do mapa.
  function applyMapPadding(map: MlMap) {
    const padding = mapPaddingRef.current;
    if (!padding) return;
    map.setPadding({ top: padding.top, bottom: padding.bottom, left: padding.left, right: padding.right });
  }

  function registerLayers(map: MlMap) {
    map.addSource(OPERATIONS_MAP_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_FC,
      // J-MAPAS-10 (junta pixel): o protótipo NUNCA clusteriza — avatares individuais em qualquer
      // zoom, inclusive na visão default Brasil. Cluster desativado para paridade pixel.
      cluster: false,
    });

    map.addLayer({
      id: "op-clusters",
      type: "circle",
      source: OPERATIONS_MAP_SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": ["step", ["get", "point_count"], "#2563eb", 10, "#1d4ed8", 25, "#0ea5e9"],
        "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 25, 26],
        "circle-opacity": 0.9,
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
      },
    });
    map.addLayer({
      id: "op-cluster-count",
      type: "symbol",
      source: OPERATIONS_MAP_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Noto Sans Bold"],
        "text-size": 13,
      },
      paint: { "text-color": "#f8fafc" },
    });

    // Técnico = círculo 32px com iniciais (protótipo .mk-tech): anel externo r16 = BORDA 3px na cor
    // do grupo de status (âmbar quando antiga), miolo r13 = cor AVC estável do técnico. Grupo "off"
    // esmaece (opacity .75, .st-off). Nenhum hex solto: cores vêm das props do GeoJSON (fonte única).
    map.addLayer({
      id: "op-ring",
      type: "circle",
      source: OPERATIONS_MAP_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 16,
        "circle-color": ["get", "borderColor"],
        "circle-opacity": ["case", ["boolean", ["get", "off"], false], 0.75, 1],
      },
    });
    map.addLayer({
      id: "op-core",
      type: "circle",
      source: OPERATIONS_MAP_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 13,
        "circle-color": ["get", "avatarColor"],
        "circle-opacity": ["case", ["boolean", ["get", "off"], false], 0.75, 1],
      },
    });
    map.addLayer({
      id: "op-initials",
      type: "symbol",
      source: OPERATIONS_MAP_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      layout: {
        "text-field": ["get", "initials"],
        "text-font": ["Noto Sans Bold"],
        "text-size": 11,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-opacity": ["case", ["boolean", ["get", "off"], false], 0.75, 1],
      },
    });
  }

  function registerInteractions(map: MlMap) {
    const pinLayers = ["op-ring", "op-core", "op-initials"];

    const handlePinClick = (event: { features?: MapGeoJSONFeature[] }) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id !== "string") return;
      const match = locationsRef.current.find((location) => location.id === id);
      if (match) onSelectRef.current(match);
    };

    for (const layer of pinLayers) {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
    }
    // Diretiva do dono (2026-08-06): hover no técnico abre o detalhe (efêmero — some ao sair);
    // o clique fixa. `mousemove` na camada cobre a troca pin→pin sem passar por "fora".
    for (const layer of pinLayers) {
      map.on("mousemove", layer, (event: { features?: MapGeoJSONFeature[] }) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id !== "string") return;
        const match = locationsRef.current.find((location) => location.id === id);
        if (match) onHoverRef.current?.(match);
      });
      map.on("mouseleave", layer, () => {
        onHoverRef.current?.(null);
      });
    }
    for (const layer of pinLayers) {
      map.on("click", layer, handlePinClick);
    }
  }

  // === Pins de chamado (OS) — losango por prioridade (protótipo .mk-os) ===

  // Carga idempotente das 8 imagens (4 prioridades × normal/selecionada); guard hasImage cobre StrictMode.
  async function loadDiamondImages(map: MlMap) {
    const variants: readonly { readonly suffix: string; readonly selected: boolean }[] = [
      { suffix: "", selected: false },
      { suffix: "-sel", selected: true },
    ];
    await Promise.all(
      (Object.keys(WORK_ORDER_PRIORITY_HEX) as WorkOrderPriority[]).flatMap((priority) =>
        variants.map(async ({ suffix, selected }) => {
          const id = `wo-diamond-${WORK_ORDER_PRIORITY_KEY[priority]}${suffix}`;
          if (map.hasImage(id)) return;
          const image = new Image(44, 44);
          await new Promise<void>((resolve) => {
            image.onload = () => resolve();
            image.onerror = () => resolve();
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
              workOrderDiamondSvg(WORK_ORDER_PRIORITY_HEX[priority], selected),
            )}`;
          });
          if (!map.hasImage(id) && image.complete && image.naturalWidth > 0) {
            map.addImage(id, image, { pixelRatio: 2 });
          }
        }),
      ),
    );
  }

  function registerWorkOrderLayers(map: MlMap) {
    if (map.getSource(WORK_ORDERS_MAP_SOURCE_ID)) return;
    map.addSource(WORK_ORDERS_MAP_SOURCE_ID, { type: "geojson", data: EMPTY_WO_FC });
    map.addSource(WORK_ORDER_ROUTES_SOURCE_ID, { type: "geojson", data: EMPTY_ROUTES_FC });

    // Camadas de chamado ficam ABAIXO dos técnicos (o técnico é a ação; sobrepõe o chamado).
    const beforeId = map.getLayer("op-clusters") ? "op-clusters" : undefined;

    // Rota tracejada técnico→OS (protótipo: polyline dash 6/7, 2.5px, #3b82f6, .8) — abaixo dos pins.
    map.addLayer(
      {
        id: "wo-routes",
        type: "line",
        source: WORK_ORDER_ROUTES_SOURCE_ID,
        layout: { "line-cap": "round" },
        paint: {
          "line-color": WORK_ORDER_ROUTE_COLOR,
          "line-width": WORK_ORDER_ROUTE_WIDTH,
          "line-opacity": WORK_ORDER_ROUTE_OPACITY,
          "line-dasharray": [...WORK_ORDER_ROUTE_DASHARRAY],
        },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: "wo-pulse",
        type: "circle",
        // M-5 — pulsa quem é urgente (herdado) OU id recém-chegado (`pulse`).
        filter: ["==", ["get", "pulse"], true],
        source: WORK_ORDERS_MAP_SOURCE_ID,
        paint: { "circle-radius": 16, "circle-color": ["get", "priorityColor"], "circle-opacity": 0.25 },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: "wo-selected-ring",
        type: "circle",
        source: WORK_ORDERS_MAP_SOURCE_ID,
        filter: ["==", ["get", "selected"], true],
        paint: {
          "circle-radius": 18,
          "circle-color": "#2563eb",
          "circle-opacity": 0.18,
          "circle-stroke-color": "#2563eb",
          "circle-stroke-width": 1.5,
        },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: "wo-diamond",
        type: "symbol",
        source: WORK_ORDERS_MAP_SOURCE_ID,
        layout: {
          "icon-image": [
            "concat",
            "wo-diamond-",
            ["get", "priorityKey"],
            ["case", ["boolean", ["get", "selected"], false], "-sel", ""],
          ],
          "icon-anchor": "center",
          "icon-size": 1,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: "wo-label",
        type: "symbol",
        source: WORK_ORDERS_MAP_SOURCE_ID,
        minzoom: 12,
        layout: {
          "text-field": ["get", "code"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 10,
          "text-offset": [0, -2.2],
          "text-anchor": "bottom",
        },
        paint: { "text-color": "#1f2937", "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
      },
      beforeId,
    );
  }

  function registerWorkOrderInteractions(map: MlMap) {
    const handleClick = (event: { features?: MapGeoJSONFeature[] }) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id;
      if (typeof id !== "string") return;
      onSelectWorkOrderRef.current?.(id);
      // Popup ancorado no marker (protótipo bindPopup): conteúdo React vem da página.
      const pin = (workOrderPinsRef.current ?? []).find((item) => item.id === id);
      if (pin && renderWorkOrderPopupRef.current) {
        openWorkOrderPopup(map, id, [pin.longitude, pin.latitude]);
      }
    };
    for (const layer of WORK_ORDER_PIN_LAYERS) {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", layer, handleClick);
    }
  }

  // --- popup do marker de OS (root React dedicado; unmount adiado no close — leak guard) ---
  function openWorkOrderPopup(map: MlMap, workOrderId: string, lngLat: [number, number]) {
    const maplibregl = maplibreglRef.current;
    const factory = renderWorkOrderPopupRef.current;
    if (!maplibregl || !factory) return;
    closeWorkOrderPopup();

    const container = document.createElement("div");
    const root = createRoot(container);
    root.render(factory(workOrderId));
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      offset: 18,
      maxWidth: "300px",
      className: "opmap-popup",
    })
      .setLngLat(lngLat)
      .setDOMContent(container)
      .addTo(map);
    popup.on("close", () => {
      // Unmount adiado: o close pode disparar durante um render React.
      setTimeout(() => root.unmount(), 0);
      if (popupRef.current === popup) {
        popupRef.current = null;
        popupRootRef.current = null;
        popupWorkOrderIdRef.current = null;
      }
    });
    popupRef.current = popup;
    popupRootRef.current = root;
    popupWorkOrderIdRef.current = workOrderId;
  }

  function refreshWorkOrderPopupContent() {
    const workOrderId = popupWorkOrderIdRef.current;
    const root = popupRootRef.current;
    const factory = renderWorkOrderPopupRef.current;
    if (!workOrderId || !root || !factory) return;
    root.render(factory(workOrderId));
  }

  function closeWorkOrderPopup() {
    popupRef.current?.remove();
    popupRef.current = null;
    popupRootRef.current = null;
    popupWorkOrderIdRef.current = null;
  }

  function applyWorkOrderData() {
    const map = mapRef.current;
    if (!map || !woReadyRef.current) return;
    const fc = buildWorkOrderPinsFeatureCollection(
      workOrderPinsRef.current ?? [],
      selectedWorkOrderRef.current,
      pulsingWorkOrderIdsRef.current,
    );
    const source = map.getSource(WORK_ORDERS_MAP_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(fc);
    const hasPulse = fc.features.some((feature) => feature.properties.pulse);
    if (hasPulse) startWorkOrderPulse(map);
    else stopWorkOrderPulse(map);
  }

  function applyRoutesData() {
    const map = mapRef.current;
    if (!map || !woReadyRef.current) return;
    const source = map.getSource(WORK_ORDER_ROUTES_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(routesRef.current ?? EMPTY_ROUTES_FC);
  }

  // Pulso só roda com >=1 feature pulsante; destruído no unmount (cancelAnimationFrame).
  function startWorkOrderPulse(map: MlMap) {
    if (woPulseRafRef.current !== null) return;
    const period = 1400;
    let startTs: number | null = null;
    const frame = (ts: number) => {
      if (mapRef.current !== map || !map.getLayer("wo-pulse")) {
        woPulseRafRef.current = null;
        return;
      }
      if (startTs === null) startTs = ts;
      const phase = ((ts - startTs) % period) / period; // 0..1
      map.setPaintProperty("wo-pulse", "circle-radius", 14 + phase * 12);
      map.setPaintProperty("wo-pulse", "circle-opacity", 0.35 * (1 - phase));
      woPulseRafRef.current = requestAnimationFrame(frame);
    };
    woPulseRafRef.current = requestAnimationFrame(frame);
  }

  function stopWorkOrderPulse(map: MlMap) {
    if (woPulseRafRef.current !== null) {
      cancelAnimationFrame(woPulseRafRef.current);
      woPulseRafRef.current = null;
    }
    if (map.getLayer("wo-pulse")) {
      map.setPaintProperty("wo-pulse", "circle-radius", 16);
      map.setPaintProperty("wo-pulse", "circle-opacity", 0.25);
    }
  }

  function setSourceData(data: FieldLocationFeatureCollection) {
    const source = mapRef.current?.getSource(OPERATIONS_MAP_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(data);
  }

  function applyData() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const now = Date.now();
    const targetFC = buildFieldLocationsFeatureCollection(locationsRef.current, selectedRef.current, now);
    animateTo(targetFC);
  }

  function animateTo(targetFC: FieldLocationFeatureCollection) {
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    const previous = prevCoordsRef.current;
    const plan = targetFC.features.map((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const to: LngLat = [lng ?? 0, lat ?? 0];
      const from = previous.get(feature.properties.id) ?? to;
      return { feature, from, to };
    });
    const commitPrevious = () => {
      const next = new Map<string, LngLat>();
      for (const item of plan) next.set(item.feature.properties.id, item.to);
      prevCoordsRef.current = next;
    };
    const hasMotion = plan.some((item) => item.from[0] !== item.to[0] || item.from[1] !== item.to[1]);
    if (!hasMotion) {
      setSourceData(targetFC);
      commitPrevious();
      return;
    }
    const start = performance.now();
    const frame = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - start) / OPERATIONS_MAP_ANIMATION_MS);
      const features = plan.map((item) => ({
        ...item.feature,
        geometry: { type: "Point" as const, coordinates: interpolateCoords(item.from, item.to, progress) },
      }));
      setSourceData({ type: "FeatureCollection", features });
      if (progress < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        commitPrevious();
        animRef.current = null;
      }
    };
    animRef.current = requestAnimationFrame(frame);
  }

  return (
    <section className="operations-map-libre" aria-label="Mapa operacional">
      <div ref={containerRef} className="operations-map-libre__canvas" role="application" aria-label="Mapa dos Técnicos de Campo" />
      {status === "loading" ? (
        <div className="operations-map-libre__overlay" role="status">
          <span className="operations-map-libre__spinner" aria-hidden="true" />
          Carregando mapa operacional…
        </div>
      ) : null}
    </section>
  );
}
