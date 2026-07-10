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
  buildFieldLocationsFeatureCollection,
  interpolateCoords,
  type FieldLocationFeatureCollection,
  type LngLat,
} from "../map/mapMarkers";
import type { FieldLocationItem } from "../operations-map.types";

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
};

const EMPTY_FC: FieldLocationFeatureCollection = { type: "FeatureCollection", features: [] };

function idSetKey(locations: readonly FieldLocationItem[]): string {
  return locations
    .map((location) => location.id)
    .sort()
    .join("|");
}

export function OperationsMapLibreCanvas({ locations, selectedId, onSelect, onInitError }: Props) {
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

  locationsRef.current = locations;
  selectedRef.current = selectedId;
  onSelectRef.current = onSelect;
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
          registerLayers(map);
          registerInteractions(map);
          readyRef.current = true;
          setStatus("ready");
          applyData(true);
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
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- reação a mudanças de dados/seleção ---
  useEffect(() => {
    if (!readyRef.current) return;
    const nextKey = idSetKey(locations);
    const shouldFit = nextKey !== fitKeyRef.current;
    applyData(shouldFit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, selectedId]);

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
      {status === "ready" ? (
        <ul className="operations-map-libre__legend" aria-label="Legenda do mapa">
          <li><span className="operations-map-libre__dot" style={{ background: "#22c55e" }} /> Disponível</li>
          <li><span className="operations-map-libre__dot" style={{ background: "#38bdf8" }} /> Em rota</li>
          <li><span className="operations-map-libre__dot" style={{ background: "#6366f1" }} /> Em atendimento</li>
          <li><span className="operations-map-libre__dot" style={{ background: "#f59e0b" }} /> Antiga &gt; 3 min</li>
          <li><span className="operations-map-libre__dot" style={{ background: "#64748b" }} /> Antiga &gt; 10 min</li>
        </ul>
      ) : null}
    </section>
  );
}
