# Plano J-MAPAS-6 — Redesign do Mapa Operacional (planejador-mapas, 2026-07-19)

Console de alocação (operador de despacho aloca chamados a técnicos). MapLibre + OpenFreeMap mantidos (regra Ω1) — **sem
provider novo, sem SKU pago, US$ 0** → **não dispara junta-5**. Junta de Mapas: planejador (feito) → dev-mapas → avaliador-mapas.

## Requisitos do dono
1. Lista de CHAMADOS QUE CHEGAM com detalhes, prioridade e SLA.
2. Técnicos: onde/como (posição + status/disponibilidade).
3. Alerta visual ao chegar OS nova.
4. Mapa com no mínimo o DOBRO da altura.
5. Ao maximizar: técnicos + OS no mapa + LISTA TRANSLÚCIDA no 4º quadrante (canto inf. direito) com as OS que chegam.
6. Legendas unidas num RODAPÉ do mapa (remover a `<ul>` flutuante + legendas soltas).

## Layout
Grid 3 colunas: `minmax(300px,340px) minmax(0,1fr) minmax(300px,340px)` (chamados | mapa | técnicos); empilha <1100px.
Altura do mapa: `clamp(760px, 82vh, 960px)` (≥2× o 480px atual; teto por viewport). `.operations-map-canvas__gmaps` acompanha
(regra do espelho). Maximizar = overlay `fixed inset:0` com técnicos+OS + lista translúcida `rgb(15 23 34 / 72%)` + `backdrop-filter`
no 4º quadrante; Esc + focus trap; rodapé de legenda visível dentro do overlay.

## Dados (Fase 1 = existentes; sem backend novo)
- Técnicos: `FieldLocationItem` (`/field-locations/latest`, `field_location:read`) — posição + status + frescor. EXISTE.
- Chamados+prioridade: `OperationsMapWorkOrderPin`/sem-localização (`/work-orders`, `selectMappableWorkOrders`). EXISTE.
- SLA: **GAP** — não há coluna de deadline. Fase 1 = proxy honesto ("agendado para"/"aberto há" + prioridade); **Fase 2** = `sla_due_at`.
- Alerta de OS nova: **GAP de UI** — Fase 1 = diff client-side dos ids entre refreshes (anti-spam).
- Despacho/frota: `currentDispatch`, `maintenanceVehicleIds`, `insuredVehicleIds`. EXISTE.
LGPD §12: NUNCA logar coordenada; posição de técnico minimizada.

## Camadas MapLibre (sem trocar provider; REGRA DO ESPELHO — replicar no GoogleMapsCanvas)
Técnicos = fonte clusterizada `field-operators` (anel por status, `getRingColor`). OS = teardrops por prioridade
(`WORK_ORDER_PRIORITY_HEX`). Alerta OS nova = reusar `wo-pulse` estendido para id novo (teto de pulsos, parar no unmount).
Legenda unificada = fonte única `MAP_LEGEND_ITEMS`, consumida pelos dois canvases (guarda de paridade em teste).

## Subdivisão em PRs (1 bloco = 1 PR)
**FASE 1 (frontend, US$ 0):**
- **M-1 · Fundação de layout + dobro de altura** (baixo risco; desbloqueia o resto). Grid 3 colunas; altura clamp(760,82vh,960);
  coluna de técnicos = `OperationsOperatorList` movida; sem dados novos. Fidelidade §11 do shell. +~6 testes.
- **M-2 · Rodapé de legenda unificado.** Remove `<ul>` flutuante; `OperationsMapLegendFooter` nos 2 canvases; guarda de paridade. +~6.
- **M-3 · Camada distinta de técnicos + disponibilidade** (toca camadas + espelho Google). +~10.
- **M-4 · Lista de chamados que chegam (prioridade + SLA-proxy)** (adapter puro; ordenação prioridade→SLA→abertura; rótulos honestos). +~14.
- **M-5 · Alerta visual de OS nova** (`useNewWorkOrderAlert` + toast/badge/pulse; debounce/teto; depende de M-4). +~10.
- **M-6 · Maximizar + lista translúcida no 4º quadrante** (overlay/z-index/Esc/focus trap; depende de M-1/M-3/M-4). +~8.

**FASE 2 (backend aditivo, US$ 0):**
- **M-7 · SLA real.** Migration **aditiva** `sla_due_at` + política por prioridade (tenant-scoped, nullable/NOT VALID); DTO de
  `/work-orders`; adapter proxy→countdown. Marcar "migração aditiva, NÃO destrutiva".

Baseline N=55 testes de mapa → meta ≥110. Cada PR: `check`/`build`/testes do bloco/regressão dos 6 arquivos de mapa +
suíte backend raiz (contratos front lidos por texto) + KPIs no próprio PR (C3).

## Arquivos-âncora (escopo)
Editar: OperationsMapPage.tsx, OperationsMapLibreCanvas.tsx, GoogleMapsCanvas.tsx, map/mapMarkers.ts, operations-map.adapter.ts,
operations-map.types.ts, OperationsOperatorList.tsx, styles/app.css.
Criar: components/OperationsIncomingCallsList.tsx, OperationsMapLegendFooter.tsx, OperationsMapMaximizeOverlay.tsx,
hooks/useNewWorkOrderAlert.ts.
PROIBIDO sem autorização: trocar maplibre-gl (PD+junta-5); prisma/migrations (exceto M-7 aditivo); ligar SKU Google; logar coordenada.

## Riscos
Muitos marcadores → clustering + GeoJSON setData (não recriar DOM) + rAF. Alerta spam → diff só de ids novos + debounce + teto +
dedup + parar pulse no unmount. Maximizar → overlay fixed independente do grid + focus trap + Esc + sem vazar map.remove().
Fidelidade §11 → o dono pediu SUPERAR o PNG; princípios (navy/PT-BR/header/KPIs/sidebar) permanecem (veto do avaliador);
divergência intencional registrada (A2). SLA → proibido "vence em" sem coluna real; Fase 1 = rótulo honesto.

KB datado em docs/maps/kb-mapas.md §(h). Preço Google re-verificado 2026-07-19 (inalterado). Próximo: dev-mapas implementa M-1.
