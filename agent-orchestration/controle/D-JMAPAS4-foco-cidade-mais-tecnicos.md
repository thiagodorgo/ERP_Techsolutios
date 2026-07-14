# D-JMAPAS4 — Decisão: foco de câmera na "cidade com mais técnicos" por clustering (desempate proxy)

## Contexto (divergência regra-literal × custo de SKU — A2, sem consolidação silenciosa)
Regra do dono (literal): "o mapa vai FOCAR onde tem MAIS técnicos; em EMPATE de números, vai focar
em ORDEM ALFABÉTICA no NOME DA CIDADE." O Mapa Operacional (`/operations/map`, Google Maps Web
Components) hoje enquadra TODOS os pontos (técnicos + chamados). Não há campo de cidade em
`FieldLocationItem` — só GPS (lat/lng). Obter o NOME da cidade a partir de coordenada exige
**reverse geocoding = Geocoding API = SKU PAGO** (Essentials: 10k grátis/mês, depois US$ 5,00/1.000
— fonte oficial marcada 2026-07-10 UTC, ver `docs/maps/kb-mapas.md` §(a)/(f)) **e** carregar
`libraries=geocoding` (ausente; loader usa `maps,marker`). Isso é o gatilho do veto "SKU pago sem junta".

## Decisão (J-MAPAS-4 — plano do planejador-mapas)
- **Núcleo (focar onde há mais técnicos):** resolvido por **CLUSTERING GEOGRÁFICO** local, custo ZERO
  — `clusterByProximity` (union-find/single-linkage sobre haversine, limiar `FOCUS_CITY_CLUSTER_THRESHOLD_KM
  = 50 km`) + `pickFocusCluster` (maior `count`). Câmera dá `fitBounds` só no cluster vencedor. Cobre
  o demo (4 Curitiba vs 2 SP → foca Curitiba) sem chamada externa.
- **Desempate:** **PROXY DETERMINÍSTICO oeste-primeiro** (menor longitude, depois menor latitude —
  `westFirstTieBreak`), custo US$ 0. **NÃO é o "nome da cidade alfabético" literal** → esta é a
  divergência registrada. Empate é raro e não ocorre no demo (4≠2), logo nunca dispara na verificação.
- **Rejeitado:** tabela coord→cidade só-demo (hack que mente fora do seed).
- **Seam gated (futuro):** `pickFocusCluster(clusters, tieBreak)` recebe comparador injetável. A
  versão fiel (reverse-geocode SÓ dos centroides empatados, cacheado, comparar city A→Z) fica como
  dossiê **PD + junta de 5 unânime** atrás do gate de custo. Não entra neste bloco.

## Escopo do bloco
`frontend/src/modules/operations/map/map/mapMarkers.ts` (+ helpers puros), `.../components/GoogleMapsCanvas.tsx`
(só o efeito de fit), `frontend/tests/operations-map-focus-city.test.ts` (novo, 10 casos),
`frontend/package.json` (registro no `test:smoke`), `docs/maps/kb-mapas.md` §(f). Loader NÃO tocado
(sem `geocoding`). Sem prisma/migration/endpoint/KPI. Custo incremental US$ 0.

## Ratificação humana pendente
Confirmar se o **proxy oeste-primeiro** é aceitável como desempate permanente, ou se o dono exige a
versão fiel com nome alfabético (que ativa Geocoding API = requer PD + junta de 5 antes de ligar).
Enquanto não ratificado, vale o proxy (custo zero). Não reabrir sem nova evidência/decisão do dono.
