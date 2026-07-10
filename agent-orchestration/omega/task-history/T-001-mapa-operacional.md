# T-001 — Mapa Operacional real (MapLibre GL + OpenFreeMap)

## META
Substituir o placeholder esquemático ("foto") do Mapa Operacional por um **mapa interativo real**,
sem chave e sem custo (J-002: MapLibre GL + OpenFreeMap), pintado nos tokens navy do protótipo, com
pins de técnico (círculo + iniciais + anel de status), clusterização, seleção sincronizada ao painel,
animação suave da posição, faixa de KPIs clicável que filtra o mapa, filtros na URL e estados completos.

## TOCADO (rotas · telas · funções)
- **Rota:** `/operations/map` (inalterada) — tela `OperationsMapPage`.
- **Novos arquivos**
  - `frontend/src/modules/operations/map/map/mapStyle.ts` — `buildOperationalMapStyle()`/`OPERATIONAL_MAP_STYLE`,
    `OPERATIONAL_MAP_TOKENS`, centro/zoom padrão. Fonte: `https://tiles.openfreemap.org/planet`.
  - `frontend/src/modules/operations/map/map/mapMarkers.ts` — `getStatusColor`, `getStaleLevel`,
    `getRingColor`, `getInitials`, `buildFieldLocationsFeatureCollection`, `easeOutCubic`/`lerp`/`interpolateCoords`.
  - `frontend/src/modules/operations/map/components/OperationsMapLibreCanvas.tsx` — canvas MapLibre
    (import dinâmico do `maplibre-gl` + CSS no efeito → SSR-safe). Clusterização nativa, camadas
    `op-clusters/op-cluster-count/op-ring/op-core/op-initials`, clique em cluster (zoom) e em pin (seleção),
    animação ease-out por `requestAnimationFrame`, `fitBounds` quando muda o conjunto, `easeTo` no selecionado,
    `NavigationControl`, `AttributionControl` (OSM/OMT), legenda e overlay de carregamento; `onInitError` → fallback.
  - `frontend/src/modules/operations/map/components/OperationsMapSchematicCanvas.tsx` — fallback estático
    (extraído do antigo placeholder) com pins, "localização antiga" e badges de Frota navegáveis.
- **Alterados**
  - `components/OperationsMapCanvas.tsx` — Google (se chave) → MapLibre (padrão) → esquemático (fallback).
  - `components/OperationsMapSummaryCards.tsx` — KPIs viram botões `aria-pressed` que filtram (status/antiga).
  - `pages/OperationsMapPage.tsx` — filtros na URL (`?status=&team=&stale=&q=`), handlers de KPI.
  - `frontend/package.json` — dep `maplibre-gl@^5.24.0` (pré-aprovada, J-002) + teste no `test:smoke`.
  - `frontend/src/styles/app.css` — `.operations-map-libre*` (canvas/overlay/legenda/atribuição) e `.operations-map-kpi-card`.
- **Não tocado** (fora de escopo desta fatia): `prisma/**`, backend, geocodificação de OS (Ω1b — ver abaixo),
  qualquer arquivo KPI.

## Screen-element-map — `/operations/map`
| Elemento | Origem do dado | Comportamento |
|---|---|---|
| Basemap navy | OpenFreeMap `planet` (tiles vetoriais) | estilo nos tokens `OPERATIONAL_MAP_TOKENS` |
| Pin técnico | `FieldLocationItem.latitude/longitude` | círculo + iniciais; anel = status ou âmbar/cinza (>3/>10 min) |
| Cluster | fonte GeoJSON `cluster:true` | círculo + contagem; clique = expande zoom |
| Seleção | `selectedId` | anel branco + `easeTo`; sincroniza lista + painel de detalhe |
| Animação | posição anterior→nova | `requestAnimationFrame` ease-out (550 ms) |
| Faixa de KPIs | `calculateOperationsMapSummary` | card clicável → filtro de status / localização antiga |
| Filtros | URL `?status=&team=&stale=&q=` | link direto e refresh preservam o recorte |
| Estados | — | carregando (overlay) · vazio · erro/offline (alertas da página) · sem WebGL (fallback esquemático) |
| Atribuição | TileJSON OpenFreeMap | "OpenFreeMap © OpenMapTiles — OpenStreetMap" (obrigatória, J-002) |

## RESULTADO TESTÁVEL
- `npm run check` (tsc) verde · `npm run build` verde (maplibre em **chunk lazy** — só baixa ao abrir o mapa) ·
  `npm run test:smoke` **255/255** (era 244; +11: mapStyle, mapMarkers, KPIs clicáveis, SSR-safety, fallback esquemático).
- Sem chave Google, `/operations/map` renderiza o mapa real (asserção `operations-map-libre`), não a foto.
- Fallback esquemático mantém R6.2 (badges de Frota como Links fora do botão).

## Pendência declarada (Ω1b — próxima fatia, não silenciada)
Pins de **chamado (OS)** geocodificados exigem migration aditiva em `work_orders` (lat/lng/geocoded_at/
geocode_source) + serviço Nominatim dev (1 req/s + cache) — ver `docs/omega-pd.md#pd-002`. Isolado em PR
própria por tocar `prisma/**` (gate de migration up/down separado). Esta fatia entrega o mapa dos operadores.
