# Plano J-MAPAS-7 — Mapa: Polish (A-C) + Alocação de técnico (D-E) — SEM PENDÊNCIAS

**Time (exigência do dono):** planejador → dev → analizador → aprovador + planejador-sênior-master-chefe; reprovação → junta
completa. Todos com pesquisa web. Planejamento feito (senior-chief + 2 pesquisadores; PD-006 em docs/omega-pd.md).

## Diretriz do dono: NADA fica pendente — o que for backend, construir agora.

## Fatos verificados no código
- **Endpoint de alocação JÁ EXISTE:** `POST /operations/dispatches` (`field-dispatch.service.ts createDispatch`), payload
  `{ workOrderId, operatorUserId, status?:"draft"|"assigned", observation? }`; 404 WORK_ORDER_NOT_FOUND / 404
  FIELD_OPERATOR_NOT_FOUND / 422 (alvo não é técnico) / 400. **SEM guard de duplicidade** (permite múltiplos) → UX sinaliza
  técnico com `currentDispatch` ativo; opcional: adicionar guard 409-idempotente no backend (recomendado p/ "sem pendência").
- **Distância:** `haversineKm` já existe (`map/mapMarkers.ts:249`) — client-side, US$ 0, honesto (linha reta).
- **RBAC:** alocar exige `field_dispatch:create` (`OperationsMapPage.tsx:94 canCreateDispatches`). UI esconde "Alocar" sem a permissão.
- **Dados:** FieldLocationItem (lat/lng/status/frescor/currentDispatch), OperationsMapWorkOrderPin (lat/lng/priority/scheduledFor),
  incomingCalls, OperationsOperatorList.

## Decisões de honestidade (sem fabricar, sem serviço pago sem PD)
- **Distância** = haversine "~X km (linha reta)" — Fase 1, grátis.
- **Tempo previsto** = **estimativa honesta rotulada** "~Y min (estimado, sem trânsito)" a partir da distância ÷ velocidade
  média urbana conservadora (~28 km/h), com disclaimer. NÃO é placeholder — é recurso completo. ETA POR ROTA REAL (Google
  Routes = US$10/1000 / OSRM self-host) = serviço pago/infra → PD-006 + **junta-5** (só se o dono quiser depois; NÃO nesta entrega).
- **Índice de conclusão de OS por técnico** = **AGREGADO BACKEND novo** (READ-ONLY, work_orders concluídas÷atribuídas por
  operador, tenant-scoped, RLS) — **SEM migração** (é leitura). CONSTRUIR agora (diretriz "sem pendência").

## SPRINTS
### SPRINT POLISH (frontend, demo-crítico) — pode ir num PR só (A+C+B)
- **A · Legenda única no rodapé:** remover o `<footer>` REDUNDANTE do `GoogleMapsCanvas.tsx` (~l.252-259: "Atual"/"Localização
  antiga" — duplica a legenda) + imports órfãos MapPin/AlertTriangle. A `OperationsMapLegendFooter` já é o elemento mais baixo
  (paridade preservada). +guard no teste legend-footer (1 bloco de legenda no GOOGLE_SRC, sem "Localização antiga").
- **C · Fullscreen NATIVO (remover maximizar tosco):** remover do `OperationsMapStage.tsx` o estado `maximized`/toggle/botão
  Maximizar/focus-trap/Esc/branch de padding/`.operations-map-quadrant`. MapLibre: `map.addControl(new
  maplibregl.FullscreenControl(), "bottom-right")`. Google: `innerMap.setOptions({ fullscreenControl:true,
  fullscreenControlOptions:{ position: RIGHT_BOTTOM } })`. CSS: remover `.operations-map-stage__maximize/--maximized/quadrant`;
  rail direito volta ao topo. REESCREVER layout tests #5/#6/#7 (sem maximize/quadrant; com FullscreenControl+RIGHT_BOTTOM).
- **B · Rail colapsado que não interfere:** colapsado vira **tab/pílula fino top-anchored** (`width:auto; height:44px;
  bottom:auto`) em vez de faixa 56px full-height; footprint ~44×64px (ícone+badge). `mapPadding` do lado colapsado cai de 72→~24px.

### SPRINT ALOCAÇÃO (frontend + 1 agregado backend) — SEM PENDÊNCIA
- **Backend:** agregado `GET /operations/technician-performance` (ou similar) — índice de conclusão de OS por operador
  (concluídas÷atribuídas), tenant-scoped, RLS, sem migração. + (recomendado) guard 409 no createDispatch p/ despacho duplicado.
- **D · rail esquerdo (chamados):** click no item → POPOVER de detalhe (cliente/endereço/prioridade/SLA-proxy) + "Alocar técnico"
  → DRAWER/painel de alocação com lista de técnicos RANQUEADA + filtros (Disponível / Mais próximo=distância asc / Maior índice
  de conclusão / [skill se houver]) → "Alocar" = `POST /operations/dispatches` (otimista + refresh SSE; honesto sobre o resultado).
- **E · rail direito (técnicos):** lista por linha (status pill + frescor); HOVER → tooltip (status/frescor/equipe/OS — NUNCA
  lat/lng, LGPD) + realça o pin; CLICK → popover com dados do técnico + SELETOR de chamado → mostra distância + tempo estimado
  do par + "Alocar" (mesma payload de D). D↔E = mesmo endpoint, clique consistente.
- UI: popover de vidro sobre o mapa (não modal full que tapa). Reusar KpiDetailModal (a11y) ou Modal do DS. a11y (foco/Esc/≥44px).

## Governança por sprint
dev-mapas (+ dev de backend p/ o agregado) → **analizador** → **aprovador** → orquestrador PR/merge. Reprovação → **junta completa**
(planejador+dev+analizador+aprovador+senior-chief) revisa o código. Sem provider novo/SKU (Fase 1); LGPD zero-coordenada; regra do espelho.
