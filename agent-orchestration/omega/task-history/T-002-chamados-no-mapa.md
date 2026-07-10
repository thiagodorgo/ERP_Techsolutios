# T-002 — Chamados (OS) como pins no Mapa Operacional (Ω1b-1)

## META
Renderizar as ordens de serviço abertas como **pins de chamado** no Mapa Operacional MapLibre já existente
(navy, ratificado), distintos dos pins de técnico (teardrop × puck), coloridos por prioridade, urgente
**pulsa**, clicáveis (painel do chamado → OS), + painel lateral **"Sem localização"** para OS abertas com
endereço mas sem coordenada. Sem chamadas externas nesta fatia (dados já existentes + seed).

## Divisão da fatia (junta J-005)
Ω1b foi dividido: **Ω1b-1 (esta PR) = pins de chamado** (sem migration, sem Nominatim — as colunas
`service_latitude/longitude` já existem no schema). **Ω1b-2 (próxima PR) = geocodificação sob demanda**
(migration aditiva de metadados + serviço Nominatim dev gated OFF + `POST /work-orders/:id/geocode` +
botão "Localizar no mapa"), onde entram os requisitos R3/R4/R10/R11/R12 do critico-adversarial.

## Requisitos do critico-adversarial incorporados nesta fatia
- **R1 (anti-truncamento):** o mapa carrega `/work-orders?limit=100` (não o default 20) e a página avisa
  ("Há mais chamados do que os exibidos") quando `pagination.total > carregadas`. Nunca trunca em silêncio.
- **R2 (predicado único):** `isValidMapCoordinate` (NaN/faixa/sentinela 0-0) é COMPARTILHADO entre o filtro
  de pin e a separação com/sem-localização. OS com coord inválida-porém-presente cai em "Sem localização" —
  não vira "OS fantasma".
- **R5 (WebGL/SSR):** `map.addImage` idempotente (`hasImage` guard) e o loop rAF do pulso só roda com ≥1
  urgente e é destruído no unmount (`cancelAnimationFrame`). Testes SSR intactos.
- **R6 (gate de render):** empty-state verdadeiro preservado — "Nenhum operador ou chamado no mapa" só quando
  não há operador NEM pin NEM OS sem-localização. O mapa aparece mesmo sem operador online se houver chamados.
- **R7 (seed):** nenhum teste depende do seed-fleet (auditado); OS-0002 ganhou endereço (demo "sem GPS") e
  entrou OS-0003 urgente com coordenada (demo pulso).
- **R8 (prioridade free-form):** `getWorkOrderPriorityKey/Color` caem para "media" fora do enum → o
  `icon-image` sempre resolve uma imagem registrada.

## TOCADO (rotas · telas · funções)
- **Rota:** `/operations/map` (inalterada). Novo query fetch `?limit=100`.
- **Backend:** `src/modules/work-orders/work-order.dto.ts` — `toWorkOrderListDto` passa a incluir
  `serviceLatitude`/`serviceLongitude` (era omitido; só o detalhe expunha).
- **Frontend novos:** `components/OperationsWorkOrderPinPanel.tsx`, `components/OperationsWorkOrdersWithoutLocationPanel.tsx`.
- **Frontend alterados:** `map/mapMarkers.ts` (helpers WO + `isValidMapCoordinate`), `operations-map.types.ts`
  (tipos WO pin + campos em `OperationsMapData`), `operations-map.adapter.ts` (`selectMappableWorkOrders`),
  `operations-map.service.ts` (fetch 100 + popula pins/sem-localização + truncated), `useOperationsMap.ts`
  (preserva no fallback), `components/OperationsMapLibreCanvas.tsx` (2ª fonte GeoJSON, teardrops, pulso,
  seleção, clique, legenda), `components/OperationsMapCanvas.tsx` (thread props),
  `pages/OperationsMapPage.tsx` (estado + gate + painéis), `styles/app.css`.
- **Seed:** `prisma/seed-fleet.ts` (OS-0002 endereço, OS-0003 urgente com coord).
- **Não tocado:** `prisma/schema.prisma`, migrations, backend service/repo/controller/routes (Ω1b-2), KPI.

## Screen-element-map — pins de chamado em `/operations/map`
| Elemento | Origem | Comportamento |
|---|---|---|
| Pin de chamado | `WorkOrderListItem.serviceLatitude/Longitude` | teardrop cor por prioridade; ancora a ponta na coord |
| Urgente | `priority==="urgent"` | pulso (rAF) sob o pin; só urgente anima |
| Seleção | `selectedWorkOrderId` | anel azul + painel do chamado (código, prioridade, cliente, endereço, "Abrir OS") |
| Sem localização | OS aberta + endereço + sem coord válida | painel "N sem GPS" com lista → OS |
| Truncamento | `pagination.total > carregadas` | alerta "Há mais chamados do que os exibidos" (R1) |
| Fallback | sem WebGL/Google | mostra só operadores (limitação declarada) |

## RESULTADO TESTÁVEL
- Frontend: `npm run check` verde · `build` verde · **`test:smoke` 269/269** (era 255; +15 novos: helpers WO,
  adapter split, painéis SSR, predicado 0-0, fallback prioridade; -1 copy de empty-state realinhada).
- Backend: `npm run check|lint|build` verde · `npm test` **26/26** · `work-orders*.test.ts` 9/9 ·
  novo `tests/work-orders-list-coordinates.test.ts` 2/2 · `git diff --check` limpo.

## Pendência declarada — Ω1b-2 (geocodificação)
Migration aditiva `work_orders.service_geocoded_at/service_geocode_source` + serviço Nominatim dev
(AbortController/timeout, throttle 1req/s, cache, gated OFF por env — `GEOCODING_ENABLED=false` default) +
`POST /work-orders/:id/geocode` (404 cross-tenant, 409 já geocodificado, 422 sem endereço, 502 provedor) +
botão "Localizar no mapa" no painel. Guardas R3/R4/R10/R11/R12. Ver `docs/omega-pd.md` (PD-002/PD-003).
