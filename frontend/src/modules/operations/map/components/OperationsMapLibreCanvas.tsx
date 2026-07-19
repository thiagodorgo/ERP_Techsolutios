import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";

import {
  OPERATIONAL_MAP_STYLE,
  OPERATIONAL_MAP_DEFAULT_CENTER,
  OPERATIONAL_MAP_DEFAULT_ZOOM,
  OPERATIONAL_MAP_TOKENS,
} from "../map/mapStyle";
import {
  OPERATIONS_MAP_SOURCE_ID,
  OPERATIONS_MAP_ANIMATION_MS,
  WORK_ORDERS_MAP_SOURCE_ID,
  WORK_ORDER_PRIORITY_HEX,
  WORK_ORDER_PRIORITY_KEY,
  buildFieldLocationsFeatureCollection,
  buildWorkOrderPinsFeatureCollection,
  interpolateCoords,
  type FieldLocationFeatureCollection,
  type WorkOrderPinFeatureCollection,
  type LngLat,
} from "../map/mapMarkers";
import type { FieldLocationItem, OperationsMapWorkOrderPin } from "../operations-map.types";
import type { WorkOrderPriority } from "../../../work-orders/work-orders.types";
import { OperationsMapLegendFooter } from "./OperationsMapLegendFooter";

/**
 * Ω1 (J-002) — Canvas real do Mapa Operacional com MapLibre GL + OpenFreeMap.
 *
 * O `maplibre-gl` (e seu CSS) é carregado por `import()` dinâmico DENTRO do efeito de montagem,
 * então nunca entra no grafo estático — testes SSR (`renderToString`, sem efeitos) não instanciam
 * WebGL. Se a inicialização falhar (sem WebGL, tile server fora), chamamos `onInitError` para o
 * componente-pai cair na visualização estática de fallback: a tela nunca quebra.
 */

type Props = {
  readonly locations: readonly FieldLocationItem[];
  readonly selectedId?: string;
  readonly onSelect: (location: FieldLocationItem) => void;
  readonly onInitError?: () => void;
  // Ω1b — pins de chamado (OS abertas com coordenada) + seleção de chamado.
  readonly workOrderPins?: readonly OperationsMapWorkOrderPin[];
  readonly selectedWorkOrderId?: string;
  readonly onSelectWorkOrder?: (id: string) => void;
};

const EMPTY_FC: FieldLocationFeatureCollection = { type: "FeatureCollection", features: [] };
const EMPTY_WO_FC: WorkOrderPinFeatureCollection = { type: "FeatureCollection", features: [] };

// Ω1b — teardrop SVG por prioridade (MapLibre rasteriza HTMLImageElement); ponta ancora na coord.
function teardropSvg(color: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 24 31">` +
    `<path d="M12 0.6C6 0.6 1.2 5.4 1.2 11.4c0 8 10.8 18.8 10.8 18.8S22.8 19.4 22.8 11.4C22.8 5.4 18 0.6 12 0.6z" ` +
    `fill="${color}" stroke="#0b1420" stroke-width="1.4"/>` +
    `<circle cx="12" cy="11.2" r="4.4" fill="#f8fafc"/></svg>`
  );
}

const WORK_ORDER_PIN_LAYERS = ["wo-teardrop"] as const;

function idSetKey(locations: readonly FieldLocationItem[]): string {
  return locations
    .map((location) => location.id)
    .sort()
    .join("|");
}

export function OperationsMapLibreCanvas({
  locations,
  selectedId,
  onSelect,
  onInitError,
  workOrderPins,
  selectedWorkOrderId,
  onSelectWorkOrder,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Estado mais recente exposto aos handlers do mapa sem re-inicializar o mapa.
  const locationsRef = useRef(locations);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onInitErrorRef = useRef(onInitError);
  const prevCoordsRef = useRef<Map<string, LngLat>>(new Map());
  const animRef = useRef<number | null>(null);
  const fitKeyRef = useRef<string>("");
  const readyRef = useRef(false);
  // Ω1b — refs dos pins de chamado.
  const workOrderPinsRef = useRef(workOrderPins);
  const selectedWorkOrderRef = useRef(selectedWorkOrderId);
  const onSelectWorkOrderRef = useRef(onSelectWorkOrder);
  const woReadyRef = useRef(false);
  const woPulseRafRef = useRef<number | null>(null);

  locationsRef.current = locations;
  selectedRef.current = selectedId;
  onSelectRef.current = onSelect;
  workOrderPinsRef.current = workOrderPins;
  selectedWorkOrderRef.current = selectedWorkOrderId;
  onSelectWorkOrderRef.current = onSelectWorkOrder;
  onInitErrorRef.current = onInitError;

  // --- inicialização (uma vez) ---
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let map: MlMap | null = null;
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        await import("maplibre-gl/dist/maplibre-gl.css");
        if (cancelled || !containerRef.current) return;

        map = new maplibregl.Map({
          container: containerRef.current,
          style: OPERATIONAL_MAP_STYLE,
          center: OPERATIONAL_MAP_DEFAULT_CENTER,
          zoom: OPERATIONAL_MAP_DEFAULT_ZOOM,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.touchZoomRotate.disableRotation();

        map.on("load", () => {
          if (cancelled || !map) return;
          const activeMap = map;
          registerLayers(activeMap);
          registerInteractions(activeMap);
          readyRef.current = true;
          setStatus("ready");
          applyData(true);
          // Pins de chamado: rasteriza os teardrops (async), então adiciona fonte/camadas.
          void (async () => {
            await loadTeardropImages(activeMap);
            if (cancelled || mapRef.current !== activeMap) return;
            registerWorkOrderLayers(activeMap);
            registerWorkOrderInteractions(activeMap);
            woReadyRef.current = true;
            applyWorkOrderData();
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
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- reação a mudanças de dados/seleção (operadores) ---
  useEffect(() => {
    if (!readyRef.current) return;
    const nextKey = idSetKey(locations);
    const shouldFit = nextKey !== fitKeyRef.current;
    applyData(shouldFit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, selectedId]);

  // --- reação a mudanças dos pins de chamado ---
  useEffect(() => {
    if (!woReadyRef.current) return;
    applyWorkOrderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderPins, selectedWorkOrderId]);

  function registerLayers(map: MlMap) {
    const t = OPERATIONAL_MAP_TOKENS;
    map.addSource(OPERATIONS_MAP_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_FC,
      cluster: true,
      clusterRadius: 46,
      clusterMaxZoom: 13,
    });

    map.addLayer({
      id: "op-clusters",
      type: "circle",
      source: OPERATIONS_MAP_SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": ["step", ["get", "point_count"], "#1f6f8f", 10, "#2a8db3", 25, "#0ea5e9"],
        "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 25, 26],
        "circle-opacity": 0.9,
        "circle-stroke-width": 2,
        "circle-stroke-color": t.background,
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

    map.addLayer({
      id: "op-ring",
      type: "circle",
      source: OPERATIONS_MAP_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 13,
        "circle-color": ["get", "ringColor"],
        "circle-stroke-color": "#f8fafc",
        "circle-stroke-width": ["case", ["boolean", ["get", "selected"], false], 3, 0],
      },
    });
    map.addLayer({
      id: "op-core",
      type: "circle",
      source: OPERATIONS_MAP_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: { "circle-radius": 10, "circle-color": t.background },
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
      paint: { "text-color": "#f8fafc" },
    });
  }

  function registerInteractions(map: MlMap) {
    const pinLayers = ["op-ring", "op-core", "op-initials"];

    map.on("click", "op-clusters", (event) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      if (clusterId === undefined) return;
      const source = map.getSource(OPERATIONS_MAP_SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) return;
      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const coordinates = (feature!.geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: coordinates, zoom: zoom + 0.25 });
      });
    });

    const handlePinClick = (event: { features?: MapGeoJSONFeature[] }) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id !== "string") return;
      const match = locationsRef.current.find((location) => location.id === id);
      if (match) onSelectRef.current(match);
    };

    for (const layer of [...pinLayers, "op-clusters"]) {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
    }
    for (const layer of pinLayers) {
      map.on("click", layer, handlePinClick);
    }
  }

  // === Ω1b — pins de chamado (OS) ===

  // R5 — carga idempotente das 4 imagens teardrop (guard hasImage cobre StrictMode/re-init).
  async function loadTeardropImages(map: MlMap) {
    await Promise.all(
      (Object.keys(WORK_ORDER_PRIORITY_HEX) as WorkOrderPriority[]).map(async (priority) => {
        const id = `wo-teardrop-${WORK_ORDER_PRIORITY_KEY[priority]}`;
        if (map.hasImage(id)) return;
        const image = new Image(34, 44);
        await new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(teardropSvg(WORK_ORDER_PRIORITY_HEX[priority]))}`;
        });
        if (!map.hasImage(id) && image.complete && image.naturalWidth > 0) {
          map.addImage(id, image, { pixelRatio: 2 });
        }
      }),
    );
  }

  function registerWorkOrderLayers(map: MlMap) {
    if (map.getSource(WORK_ORDERS_MAP_SOURCE_ID)) return;
    map.addSource(WORK_ORDERS_MAP_SOURCE_ID, { type: "geojson", data: EMPTY_WO_FC });

    // Camadas de chamado ficam ABAIXO dos operadores (o técnico é a ação; sobrepõe o chamado).
    const beforeId = map.getLayer("op-clusters") ? "op-clusters" : undefined;

    map.addLayer(
      {
        id: "wo-pulse",
        type: "circle",
        source: WORK_ORDERS_MAP_SOURCE_ID,
        filter: ["==", ["get", "urgent"], true],
        paint: { "circle-radius": 16, "circle-color": "#dc2626", "circle-opacity": 0.25 },
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
        id: "wo-teardrop",
        type: "symbol",
        source: WORK_ORDERS_MAP_SOURCE_ID,
        layout: {
          "icon-image": ["concat", "wo-teardrop-", ["get", "priorityKey"]],
          "icon-anchor": "bottom",
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
          "text-offset": [0, -2.6],
          "text-anchor": "bottom",
        },
        paint: { "text-color": "#e2e8f0", "text-halo-color": "#0b1420", "text-halo-width": 1.2 },
      },
      beforeId,
    );
  }

  function registerWorkOrderInteractions(map: MlMap) {
    const handleClick = (event: { features?: MapGeoJSONFeature[] }) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onSelectWorkOrderRef.current?.(id);
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

  function applyWorkOrderData() {
    const map = mapRef.current;
    if (!map || !woReadyRef.current) return;
    const fc = buildWorkOrderPinsFeatureCollection(workOrderPinsRef.current ?? [], selectedWorkOrderRef.current);
    const source = map.getSource(WORK_ORDERS_MAP_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(fc);
    const hasUrgent = fc.features.some((feature) => feature.properties.urgent);
    if (hasUrgent) startWorkOrderPulse(map);
    else stopWorkOrderPulse(map);
  }

  // R5 — pulso só roda com >=1 urgente visível; destruído no unmount (cancelAnimationFrame).
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

  function applyData(fit: boolean) {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const now = Date.now();
    const targetFC = buildFieldLocationsFeatureCollection(locationsRef.current, selectedRef.current, now);
    animateTo(targetFC);
    if (fit) {
      fitKeyRef.current = idSetKey(locationsRef.current);
      fitToFeatures(map, targetFC);
    } else {
      panToSelected(map, targetFC);
    }
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

  function fitToFeatures(map: MlMap, fc: FieldLocationFeatureCollection) {
    const coords: LngLat[] = fc.features.map((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      return [lng ?? 0, lat ?? 0];
    });
    if (coords.length === 0) {
      map.easeTo({ center: OPERATIONAL_MAP_DEFAULT_CENTER, zoom: OPERATIONAL_MAP_DEFAULT_ZOOM });
      return;
    }
    if (coords.length === 1) {
      map.easeTo({ center: coords[0] as [number, number], zoom: 13.5 });
      return;
    }
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 64, maxZoom: 14, duration: 600 },
    );
  }

  function panToSelected(map: MlMap, fc: FieldLocationFeatureCollection) {
    const selected = fc.features.find((feature) => feature.properties.selected);
    if (!selected) return;
    map.easeTo({ center: selected.geometry.coordinates as [number, number], duration: 400 });
  }

  return (
    <section className="operations-map-libre" aria-label="Mapa operacional">
      <div ref={containerRef} className="operations-map-libre__canvas" role="application" aria-label="Mapa dos operadores em campo" />
      {status === "loading" ? (
        <div className="operations-map-libre__overlay" role="status">
          <span className="operations-map-libre__spinner" aria-hidden="true" />
          Carregando mapa operacional…
        </div>
      ) : null}
      {/* M-2 (J-MAPAS-6) — legenda unificada no RODAPÉ do container (não mais flutuando sobre o
          canvas). Fonte única MAP_LEGEND_ITEMS; mesmo componente do canvas Google (paridade). */}
      <OperationsMapLegendFooter />
    </section>
  );
}
