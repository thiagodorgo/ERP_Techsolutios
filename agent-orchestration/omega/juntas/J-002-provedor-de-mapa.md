# J-002 — Provedor de tiles do Mapa Operacional

**Tema:** qual provedor de mapa usar para substituir o placeholder do `GoogleMapsCanvas`, sem chave e
sem custo, com qualidade de venda?

**Dúvida → pesquisa (regra da dúvida):** registrada em `docs/omega-pd.md#pd-001`. Fontes: openfreemap.org,
openfreemap.org/quick_start, TileJSON de `tiles.openfreemap.org/planet`, maplibre.org.

**Opções avaliadas**
1. **Google Maps JS** — exige `VITE_GOOGLE_MAPS_API_KEY` + billing. Sem chave cai no placeholder (o bug atual). ❌ custo/chave.
2. **Mapbox GL** — exige token + faturamento por load. ❌ custo/chave.
3. **MapLibre GL + OpenFreeMap** — MapLibre GL JS é o fork open-source (BSD) do Mapbox GL v1; OpenFreeMap
   serve tiles vetoriais do planeta (schema OpenMapTiles) **sem chave, sem registro, sem limite de views/requests**,
   atribuição OSM automática. Estilo pode ser 100% pintado nos tokens do DS. ✅

**Junta (≥3):** planejador-mestre · frontend-pixel-master · critico-adversarial

| Agente | Voto | Justificativa |
|---|---|---|
| planejador-mestre | MapLibre+OFM | Zero chave/custo, tiles vetoriais permitem estilo próprio nos tokens; dep única `maplibre-gl`. |
| frontend-pixel-master | MapLibre+OFM | Vetorial = controle total de cor/rótulo → dá para reproduzir o navy do protótipo sem "cara de Google". |
| critico-adversarial | MapLibre+OFM c/ travas | Aceito com: (1) atribuição OSM/OMT visível (obrigação legal); (2) fallback de estado se o tile server cair (tela não pode quebrar); (3) geocodificação via Nominatim só em dev (1 req/s + cache) — nunca em massa em prod. |

**Veredito:** **UNÂNIME 3/3 — MapLibre GL + OpenFreeMap.** Dependência `maplibre-gl` fica pré-aprovada
(única da rodada). Travas do crítico viram requisito em Ω1.

**Fatos técnicos fixados**
- Source TileJSON: `https://tiles.openfreemap.org/planet` (MapLibre resolve o template `{z}/{x}/{y}.pbf` e a atribuição).
- Camadas OpenMapTiles usadas: `water`, `waterway`, `landcover`, `landuse`, `transportation`, `transportation_name`,
  `building`, `boundary`, `place`, `poi`.
- Atribuição obrigatória: "OpenFreeMap © OpenMapTiles — Data from OpenStreetMap".
