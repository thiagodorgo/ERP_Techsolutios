import type { StyleSpecification } from "maplibre-gl";

/**
 * Ω1 (J-002) → J-MAPAS-10 (PLANO-MAPA-PIXEL, D1) — Estilo do Mapa Operacional.
 *
 * Fonte de tiles: OpenFreeMap (schema OpenMapTiles), planeta inteiro, **sem chave e sem custo**
 * (https://openfreemap.org — "no API key, no registration, no limit on map views/requests").
 *
 * D1 (J-MAPAS-10): o protótipo do dono usa leitura CLARA (CARTO Voyager — REJEITADO por ToS:
 * uso comercial exige Enterprise). Este token-set recria o look "voyager-like" com recursos
 * próprios: fundo creme, água azul-claro, vias brancas/amarelo-suave, rótulos cinza-escuro.
 * Zero dependência nova, zero chave, zero ToS novo. Atribuição OSM/OMT mantida no canvas
 * (AttributionControl compact).
 */

// Tokens do basemap operacional CLARO (calibrado visualmente contra o Voyager do protótipo).
export const OPERATIONAL_MAP_TOKENS = {
  background: "#f6f2ea",
  water: "#b7d9ec",
  waterwayLine: "#a9cfe4",
  landcover: "#ebeee3",
  landuse: "#efece2",
  park: "#d5e8c9",
  building: "#e2dccd",
  roadMinor: "#ffffff",
  roadMajor: "#fbe7a3",
  roadMotorway: "#f8d98a",
  boundary: "#b9a8c9",
  label: "#3f4a5c",
  labelHalo: "#ffffff",
  roadLabel: "#6b7280",
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
    name: "ERP Operacional (claro)",
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
        paint: { "fill-color": t.landcover, "fill-opacity": 0.6 },
      },
      {
        id: "park",
        type: "fill",
        source: OMT_SOURCE,
        "source-layer": "park",
        paint: { "fill-color": t.park, "fill-opacity": 0.55 },
      },
      {
        id: "landuse",
        type: "fill",
        source: OMT_SOURCE,
        "source-layer": "landuse",
        minzoom: 8,
        paint: { "fill-color": t.landuse, "fill-opacity": 0.5 },
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
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.65],
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
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.5, 16, 3.4],
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
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.7, 16, 5],
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
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.9, 16, 6.5],
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

// D4 (J-MAPAS-10) — default de câmera: BRASIL inteiro (verbatim do protótipo do dono:
// "Brasil — só até o operador focar em outra área"). [lng, lat] na ordem MapLibre.
export const OPERATIONAL_MAP_DEFAULT_CENTER: [number, number] = [-52.5, -15.5];
export const OPERATIONAL_MAP_DEFAULT_ZOOM = 4;
