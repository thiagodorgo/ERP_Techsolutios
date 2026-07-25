import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Map as MlMap, GeoJSONSource } from "maplibre-gl";

import {
  OPERATIONAL_MAP_STYLE,
  OPERATIONAL_MAP_DEFAULT_CENTER,
  OPERATIONAL_MAP_DEFAULT_ZOOM,
  OPERATIONAL_MAP_TOKENS,
} from "../../operations/map/map/mapStyle";
import type { TrackView } from "../telemetry.types";
import {
  TRACK_LINE_SOURCE_ID,
  TRACK_MARKERS_SOURCE_ID,
  TRACK_LINE_COLOR,
  TRACK_START_COLOR,
  TRACK_END_COLOR,
  buildTrackLineFeatureCollection,
  buildTrackMarkerFeatureCollection,
  computeTrackBounds,
} from "../map/trackGeometry";

/**
 * Ω4C PR-15 (Junta de Mapas J-MAPAS-9) — Canvas MÍNIMO de Rastreamento com MapLibre GL + OpenFreeMap.
 *
 * REUSA o **style module** do Mapa Operacional (`OPERATIONAL_MAP_STYLE`, tiles OpenFreeMap keyless, tokens
 * navy — importado READ-ONLY, fonte única do basemap) e o **padrão de montagem** SSR-safe do
 * `OperationsMapLibreCanvas` (dynamic `import("maplibre-gl")` + CSS DENTRO do efeito → nunca entra no grafo
 * estático; `renderToString` não instancia WebGL; falha de init → `onInitError` e a tela não quebra).
 *
 * NÃO herda as features operacionais (clustering / teardrop de OS / pulse) — só o que um trajeto precisa:
 * uma camada `line` sobre o GeoJSON LineString + markers de início/fim. Evita regressão do flagship.
 *
 * §2.8/LGPD: consome lat/lng SÓ para desenhar a polyline/markers; nenhuma coordenada em log/console/atributo
 * de texto. `points` já vem projetado pelo allowlist §2.8 (adaptTrack).
 */

const EMPTY_FC = { type: "FeatureCollection", features: [] } as unknown as GeoJSON.FeatureCollection;

type Props = {
  readonly points: readonly TrackView[];
  readonly onInitError?: () => void;
};

const sectionStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: 480,
  borderRadius: "var(--radius-md, 10px)",
  overflow: "hidden",
  background: OPERATIONAL_MAP_TOKENS.background,
};

const canvasStyle: CSSProperties = { position: "absolute", inset: 0 };

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#cbd5e1",
  fontSize: "var(--text-sm)",
  background: "rgba(15, 23, 34, 0.55)",
  pointerEvents: "none",
};

export function TrackMapCanvas({ points, onInitError }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const readyRef = useRef(false);
  const pointsRef = useRef(points);
  const onInitErrorRef = useRef(onInitError);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  pointsRef.current = points;
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
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
        map.addControl(new maplibregl.FullscreenControl(), "bottom-right");
        map.touchZoomRotate.disableRotation();

        map.on("load", () => {
          if (cancelled || !map) return;
          const activeMap = map;
          registerLayers(activeMap);
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

  // --- reação a novos pontos (troca de profissional/período) ---
  useEffect(() => {
    if (!readyRef.current) return;
    applyData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  function registerLayers(map: MlMap) {
    map.addSource(TRACK_LINE_SOURCE_ID, { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: "track-line",
      type: "line",
      source: TRACK_LINE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": TRACK_LINE_COLOR,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 16, 5],
        "line-opacity": 0.9,
      },
    });
    map.addSource(TRACK_MARKERS_SOURCE_ID, { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: "track-markers",
      type: "circle",
      source: TRACK_MARKERS_SOURCE_ID,
      paint: {
        "circle-radius": 7,
        "circle-color": ["match", ["get", "role"], "start", TRACK_START_COLOR, "end", TRACK_END_COLOR, TRACK_LINE_COLOR],
        "circle-stroke-color": "#f8fafc",
        "circle-stroke-width": 2,
      },
    });
  }

  function applyData(fit: boolean) {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const current = pointsRef.current;
    const lineFC = buildTrackLineFeatureCollection(current) as unknown as GeoJSON.FeatureCollection;
    const markersFC = buildTrackMarkerFeatureCollection(current) as unknown as GeoJSON.FeatureCollection;
    (map.getSource(TRACK_LINE_SOURCE_ID) as GeoJSONSource | undefined)?.setData(lineFC);
    (map.getSource(TRACK_MARKERS_SOURCE_ID) as GeoJSONSource | undefined)?.setData(markersFC);
    if (fit) fitToTrack(map, current);
  }

  // 0 pontos → centro default; 1 ponto (bbox degenerado) → marker + zoom; >=2 → fitBounds no trajeto.
  function fitToTrack(map: MlMap, current: readonly TrackView[]) {
    const bounds = computeTrackBounds(current);
    if (!bounds) {
      map.easeTo({ center: OPERATIONAL_MAP_DEFAULT_CENTER, zoom: OPERATIONAL_MAP_DEFAULT_ZOOM });
      return;
    }
    const [minLng, minLat] = bounds.min;
    const [maxLng, maxLat] = bounds.max;
    if (minLng === maxLng && minLat === maxLat) {
      map.easeTo({ center: [minLng, minLat], zoom: 14 });
      return;
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 64, maxZoom: 15, duration: 600 },
    );
  }

  return (
    <section className="telemetry-track-map" aria-label="Mapa de rastreamento" style={sectionStyle}>
      <div ref={containerRef} className="telemetry-track-map__canvas" role="application" aria-label="Trajeto do profissional" style={canvasStyle} />
      {status === "loading" ? (
        <div className="telemetry-track-map__overlay" role="status" style={overlayStyle}>
          Carregando mapa de rastreamento…
        </div>
      ) : null}
      {status === "error" ? (
        <div className="telemetry-track-map__overlay" role="status" style={overlayStyle}>
          Não foi possível carregar o mapa. O trajeto não é exibido para não apresentar posição incorreta.
        </div>
      ) : null}
    </section>
  );
}

export default TrackMapCanvas;
