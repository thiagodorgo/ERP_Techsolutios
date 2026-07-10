import type { StyleSpecification } from "maplibre-gl";

/**
 * Ω1 (J-002) — Estilo do Mapa Operacional.
 *
 * Fonte de tiles: OpenFreeMap (schema OpenMapTiles), planeta inteiro, **sem chave e sem custo**
 * (https://openfreemap.org — "no API key, no registration, no limit on map views/requests").
 * O estilo é 100% pintado nos tokens navy do protótipo — nenhuma "cara de Google/Mapbox".
 *
 * Obrigações legais herdadas de J-002/PD-001: exibir atribuição OSM/OMT (o TileJSON do planet já
 * traz a atribuição; o canvas mantém `AttributionControl` visível). Geocodificação (Nominatim) é
 * tratada fora daqui (dev-only, 1 req/s + cache) — este arquivo só desenha o basemap.
 */

// Tokens do basemap operacional (mesma paleta navy do protótipo do Mapa Operacional).
export const OPERATIONAL_MAP_TOKENS = {
  background: "#0f1722",
  water: "#13233a",
  waterwayLine: "#16283f",
  landcover: "#101d28",
  landuse: "#111f2b",
  park: "#12241f",
  building: "#182740",
  roadMinor: "#233247",
  roadMajor: "#2a3a52",
  roadMotorway: "#33465f",
  boundary: "#2a3a52",
  label: "#94a3b8",
  labelHalo: "#0b1420",
  roadLabel: "#6f8098",
} as const;

const OPENFREEMAP_TILEJSON = "https://tiles.openfreemap.org/planet";
const OPENFREEMAP_GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
const OMT_SOURCE = "openmaptiles";

// Rótulo multilíngue com preferência PT-BR, depois latim, depois nome local.
const LABEL_TEXT_FIELD = [
  "coalesce",
  ["get", "name:pt"],
  ["get", "name:latin"],
  ["get", "name"],
] as const;

/**
 * Constrói a especificação de estilo MapLibre do Mapa Operacional.
 * Mantida como função pura (dado JSON) para poder ser testada sem instanciar WebGL.
 */
export function buildOperationalMapStyle(): StyleSpecification {
  const t = OPERATIONAL_MAP_TOKENS;

  return {
    version: 8,
    name: "ERP Operacional (navy)",
    glyphs: OPENFREEMAP_GLYPHS,
    sources: {
      [OMT_SOURCE]: {
        type: "vector",
        url: OPENFREEMAP_TILEJSON,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": t.background },
      },
      {
        id: "landcover",
        type: "fill",
        source: OMT_SOURCE,
        "source-layer": "landcover",
        paint: { "fill-color": t.landcover, "fill-opacity": 0.5 },
      },
      {
        id: "park",
        type: "fill",
        source: OMT_SOURCE,
        "source-layer": "park",
        paint: { "fill-color": t.park, "fill-opacity": 0.45 },
      },
      {
        id: "landuse",
        type: "fill",
        source: OMT_SOURCE,
        "source-layer": "landuse",
        minzoom: 8,
        paint: { "fill-color": t.landuse, "fill-opacity": 0.4 },
      },
      {
        id: "water",
        type: "fill",
        source: OMT_SOURCE,
        "source-layer": "water",
        paint: { "fill-color": t.water },
      },
      {
        id: "waterway",
        type: "line",
        source: OMT_SOURCE,
        "source-layer": "waterway",
        minzoom: 8,
        paint: { "line-color": t.waterwayLine, "line-width": 1 },
      },
      {
        id: "building",
        type: "fill",
        source: OMT_SOURCE,
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-color": t.building,
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.6],
        },
      },
      {
        id: "road-minor",
        type: "line",
        source: OMT_SOURCE,
        "source-layer": "transportation",
        filter: ["!in", "class", "motorway", "trunk", "primary"],
        minzoom: 11,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": t.roadMinor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.4, 16, 3],
        },
      },
      {
        id: "road-major",
        type: "line",
        source: OMT_SOURCE,
        "source-layer": "transportation",
        filter: ["in", "class", "primary", "trunk"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": t.roadMajor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 16, 4.5],
        },
      },
      {
        id: "road-motorway",
        type: "line",
        source: OMT_SOURCE,
        "source-layer": "transportation",
        filter: ["==", "class", "motorway"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": t.roadMotorway,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 16, 6],
        },
      },
      {
        id: "boundary-admin",
        type: "line",
        source: OMT_SOURCE,
        "source-layer": "boundary",
        filter: ["<=", "admin_level", 4],
        paint: {
          "line-color": t.boundary,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.6, 12, 1.6],
          "line-dasharray": [2, 2],
        },
      },
      {
        id: "road-label",
        type: "symbol",
        source: OMT_SOURCE,
        "source-layer": "transportation_name",
        minzoom: 13,
        layout: {
          "symbol-placement": "line",
          "text-field": LABEL_TEXT_FIELD as unknown as string,
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
        },
        paint: {
          "text-color": t.roadLabel,
          "text-halo-color": t.labelHalo,
          "text-halo-width": 1,
        },
      },
      {
        id: "place-label",
        type: "symbol",
        source: OMT_SOURCE,
        "source-layer": "place",
        filter: ["in", "class", "city", "town", "village", "suburb", "neighbourhood"],
        layout: {
          "text-field": LABEL_TEXT_FIELD as unknown as string,
          "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 6, 11, 12, 15],
          "text-max-width": 8,
        },
        paint: {
          "text-color": t.label,
          "text-halo-color": t.labelHalo,
          "text-halo-width": 1.4,
        },
      },
    ],
  };
}

export const OPERATIONAL_MAP_STYLE = buildOperationalMapStyle();

// Centro/zoom padrão quando ainda não há pontos para enquadrar (São Paulo — sede operacional demo).
export const OPERATIONAL_MAP_DEFAULT_CENTER: [number, number] = [-46.633308, -23.55052];
export const OPERATIONAL_MAP_DEFAULT_ZOOM = 10.5;
