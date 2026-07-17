import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, GeoJSONSource } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";

import {
  OPERATIONAL_MAP_STYLE,
  OPERATIONAL_MAP_DEFAULT_CENTER,
  OPERATIONAL_MAP_DEFAULT_ZOOM,
} from "../../operations/map/map/mapStyle";
import type { RoutePoint } from "./routeProvider";

/**
 * Ω3F-8b (J-MAPAS-5) — canvas da aba Mapa da OS. ESPELHA `OperationsMapLibreCanvas`: MapLibre GL +
 * OpenFreeMap como base (custo zero, sem chave), `maplibre-gl` carregado por `import()` DINÂMICO dentro do
 * efeito (nunca no grafo estático → testes SSR não instanciam WebGL), listeners/`map.remove()` limpos no
 * unmount. Falha de init (sem WebGL, tile server fora) → `onInitError` e o pai cai no fallback estático:
 * a tela NUNCA quebra. Desenha marcadores (partida/origem/destino) + polyline RETA (haversine no pai).
 */

export type MapRouteMarkerKind = "start" | "origin" | "destination";

export type MapRouteMarker = {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly kind: MapRouteMarkerKind;
  readonly label: string;
};

type Props = {
  readonly markers: readonly MapRouteMarker[];
  readonly routeGeometry: readonly RoutePoint[];
  readonly onInitError?: () => void;
};

const ROUTE_SOURCE_ID = "os-route-line";
const MARKERS_SOURCE_ID = "os-route-markers";

const MARKER_COLORS: Record<MapRouteMarkerKind, string> = {
  start: "#2563EB",
  origin: "#16A34A",
  destination: "#DC2626",
};

const EMPTY_MARKERS: FeatureCollection<Point, { id: string; label: string; kind: string }> = {
  type: "FeatureCollection",
  features: [],
};

function buildMarkersFC(markers: readonly MapRouteMarker[]): FeatureCollection<Point, { id: string; label: string; kind: string }> {
  const features = markers
    .filter((marker) => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude))
    .map<Feature<Point, { id: string; label: string; kind: string }>>((marker) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [marker.longitude, marker.latitude] },
      properties: { id: marker.id, label: marker.label, kind: marker.kind },
    }));
  return { type: "FeatureCollection", features };
}

function buildRouteFC(geometry: readonly RoutePoint[]): FeatureCollection<LineString> {
  if (geometry.length < 2) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: geometry.map((point) => [point.longitude, point.latitude]) },
        properties: {},
      },
    ],
  };
}

export function MapRouteCanvas({ markers, routeGeometry, onInitError }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const readyRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const markersRef = useRef(markers);
  const routeRef = useRef(routeGeometry);
  const onInitErrorRef = useRef(onInitError);
  markersRef.current = markers;
  routeRef.current = routeGeometry;
  onInitErrorRef.current = onInitError;

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
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!readyRef.current) return;
    applyData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, routeGeometry]);

  function registerLayers(map: MlMap) {
    map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: buildRouteFC([]) });
    map.addLayer({
      id: "os-route-line",
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#2563EB", "line-width": 3, "line-dasharray": [2, 1.6], "line-opacity": 0.9 },
    });

    map.addSource(MARKERS_SOURCE_ID, { type: "geojson", data: EMPTY_MARKERS });
    map.addLayer({
      id: "os-route-marker",
      type: "circle",
      source: MARKERS_SOURCE_ID,
      paint: {
        "circle-radius": 8,
        "circle-color": [
          "match",
          ["get", "kind"],
          "start",
          MARKER_COLORS.start,
          "origin",
          MARKER_COLORS.origin,
          "destination",
          MARKER_COLORS.destination,
          "#64748B",
        ],
        "circle-stroke-color": "#F8FAFC",
        "circle-stroke-width": 2,
      },
    });
    map.addLayer({
      id: "os-route-label",
      type: "symbol",
      source: MARKERS_SOURCE_ID,
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Bold"],
        "text-size": 11,
        "text-offset": [0, 1.5],
        "text-anchor": "top",
      },
      paint: { "text-color": "#E2E8F0", "text-halo-color": "#0b1420", "text-halo-width": 1.2 },
    });
  }

  function applyData(fit: boolean) {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined)?.setData(buildRouteFC(routeRef.current));
    const markersFC = buildMarkersFC(markersRef.current);
    (map.getSource(MARKERS_SOURCE_ID) as GeoJSONSource | undefined)?.setData(markersFC);
    if (fit) fitToMarkers(map, markersFC);
  }

  function fitToMarkers(map: MlMap, fc: FeatureCollection<Point, { id: string; label: string; kind: string }>) {
    const coords = fc.features.map((feature) => feature.geometry.coordinates as [number, number]);
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.easeTo({ center: coords[0]!, zoom: 13 });
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
      { padding: 72, maxZoom: 14, duration: 500 },
    );
  }

  return (
    <div className="work-order-map-canvas" style={{ position: "relative", width: "100%", height: 340, borderRadius: 12, overflow: "hidden", border: "1px solid #E2E8F0" }}>
      <div ref={containerRef} role="application" aria-label="Mapa da rota da ordem de serviço" style={{ position: "absolute", inset: 0 }} />
      {status === "loading" ? (
        <div role="status" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1722", color: "#94A3B8", fontSize: 13 }}>
          Carregando mapa…
        </div>
      ) : null}
    </div>
  );
}

export default MapRouteCanvas;
