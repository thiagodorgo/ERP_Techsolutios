# PLANO-MAPA-PIXEL — J-MAPAS-10 · Recriação "pixel a pixel" do Mapa Operacional

**Data:** 2026-08-06 · **Papel:** planejador-mapas (Junta de Mapas 1/3) · **Próximo:** dev-mapas
**Status:** PLANO REGISTRADO (sem plano = veto automático da junta; este documento é o plano)
**Fonte da verdade visual:** `Mapa Operacional.html` (raiz do repo — protótipo autocontido do dono,
Leaflet + CARTO Voyager, lido INTEIRO). **Pedido do dono (verbatim):** recriar o Mapa Operacional
**"pixel a pixel"** — **"focar no mapa, a sidebar deixe de fora desta correção"**.
**Escopo visual:** o `<main class="stage">` completo (mapa, savenote, legenda-filtro, stack de
painéis, pills, detail popover, toast, markers/popup/rotas, drag-and-drop, atalho Esc). A sidebar
e a topbar do protótipo FICAM DE FORA — o app usa as nossas.

---

## 1. Objetivo

RESKIN pixel-perfect da tela `/operations/map` + deltas de comportamento do protótipo
(memória da visão · legenda-filtro · seleção→alocar por linha · popup do marker com 3 mais
próximos · drag-and-drop nativo · rotas tracejadas · detail popover · toast), preservando as
capacidades reais já entregues (dados reais, SSE/poll, alerta de OS nova, SLA real M-7, geocode
sob demanda, gating RBAC, honestidade D-007). Custo US$ 0, zero dependência nova, zero migration.

## 2. Ator

Operador de despacho web (`tenant_admin`/`manager`/`operator`): vê o mapa com
`field_location:read`; vê chamados com `work_orders:read`; **aloca** somente com
`field_dispatch:create` (botões "Alocar", drag-and-drop e popup de alocação escondidos sem a
permissão — backend segue a autoridade final). Geocode sob demanda: `work_orders:update`.

## 3. Fluxo origem → destino

- **Origem (hoje):** J-MAPAS-6/7 (#236–#241) — mapa full-bleed navy escuro, rails de vidro
  esquerda/direita, legenda-rodapé informativa, alocação via popups D/E laterais, câmera
  focus-city (cluster da cidade com mais técnicos) + fit por mudança de conjunto.
- **Destino (protótipo):** mapa CLARO (leitura Voyager), **stack de 3 painéis à direita
  (348px)** — "Chamados recebidos" / "Em Atendimento" / "Técnicos de campo" —, **legenda-filtro**
  no rodapé (8 itens com contagem no tooltip e toggle que esconde camadas), **memória da visão**
  (localStorage + default Brasil z4 + savenote "✓ Visão do mapa salva"), marcadores estilo
  divIcon (técnico = avatar 32px colorido com borda de status; OS = losango 22px por prioridade;
  urgente pulsa), **rotas tracejadas** técnico→OS em atendimento, **seleção de OS → Alocar por
  linha com km/min**, **popup do marker com 3 técnicos mais próximos + Alocar**, **drag-and-drop
  nativo** OS→técnico, **detail popover** do técnico, **toast** de confirmação, **Esc** limpa.

## 4. Contrato & modelagem (aditiva, tenant-scoped)

**NENHUM endpoint novo. NENHUMA migration. NENHUM SKU.** Tudo é dado já servido:

| Uso | Endpoint (existente) | Permissão |
|---|---|---|
| Técnicos (posição/status/bateria/precisão/frescor) | `GET /api/v1/field-locations/latest` (+ SSE tenant-scoped) | `field_location:read` |
| Chamados (pins + fila) | `GET /api/v1/work-orders` | `work_orders:read` |
| Vínculo técnico↔OS/despacho | `GET /api/v1/operations/dispatches` | `field_dispatch:read` |
| Índice de conclusão (ordenação) | `GET technician-performance` | `field_dispatch:create` |
| Geocodificar OS sem GPS | `POST /api/v1/work-orders/:id/geocode` | `work_orders:update` |
| **ALOCAR** (todos os gestos novos) | `POST /api/v1/operations/dispatches` via `createDispatch`/`useAllocateDispatch` — payload `{workOrderId, operatorUserId}` (a MESMA verdade do #241) | `field_dispatch:create` |

**Contrato de erro da alocação (existente, mantido verbatim no hook):** `404` cross-tenant
(OS/técnico de outro tenant simplesmente não existe), `409` (técnico já tem despacho para o
chamado), `422` (alvo não é Técnico de Campo), `401/403` (permissão). Feedback nunca fabricado.

**Persistência client-side nova (única):** `localStorage["techsol.mapaOp.view.<tenantId>"]`
= `{lat, lng, z}` da **CÂMERA** (escolha do operador — nunca posição de técnico). Sufixo de
tenant para multi-org não vazar enquadramento entre organizações (divergência mínima registrada;
a chave do protótipo é `techsol.mapaOp.view`).

## 5. Decisões cravadas (D1–D7)

### D1 — Tiles: MapLibre + OpenFreeMap com ESTILO CLARO próprio ("voyager-like"). CARTO REJEITADO.
- O protótipo usa raster **CARTO Voyager** (`basemaps.cartocdn.com`). **Verificado 2026-08-06 em
  carto.com/basemaps:** *"For commercial purposes, you will need an Enterprise license"* — o
  basemap CARTO **não é grátis para o nosso uso comercial** → adotá-lo = serviço externo pago
  novo = **junta de 5 + PD**. Desnecessário: o que muda a leitura visual é o mapa ser CLARO.
- **Decisão:** manter **MapLibre GL + OpenFreeMap** (regra de ouro Ω1, keyless, comercial
  permitido — re-verificado 2026-08-06 em openfreemap.org: "completely free… no limits… no API
  keys", uso comercial: "Yes") e criar um **token-set CLARO** no NOSSO `buildOperationalMapStyle`
  (`mapStyle.ts` já é função pura nossa, testada): fundo creme/cinza-claro, água azul-claro,
  vias brancas/amarelo-suave, rótulos cinza-escuro — calibrado visualmente contra o Voyager do
  protótipo aberto no navegador. Zero dependência, zero chave, zero ToS novo.
- **Atribuição obrigatória mantida:** "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"
  (AttributionControl compact já presente).
- **Alternativas abertas no mesmo quadro (NÃO ativadas):** (i) estilos claros hospedados do
  próprio OpenFreeMap (positron/bright/liberty, keyless — fallback de esforço se o retoque de
  tokens não bater o look; perde os nossos tokens testados); (ii) CARTO Voyager **pago**
  (Enterprise — junta-5+PD); (iii) Google Dynamic Maps **US$ 7,00/1.000** após 10K grátis/mês
  (página oficial verificada 2026-08-06, marcada "Last updated 2026-07-31 UTC") — segue rejeitado
  para base de exibição.

### D2 — Leaflet × MapLibre: fica MapLibre (Leaflet = dependência nova → junta-5; rejeitado).
Mapeamento função-a-função do protótipo:

| Protótipo (Leaflet) | Recriação (MapLibre) |
|---|---|
| L.tileLayer raster Voyager | estilo vetorial claro próprio (D1) |
| L.divIcon .mk-tech (32px, bg cor do técnico, borda 3px status) | camadas circle+symbol EXISTENTES re-pintadas: circle-color = avatarColor (hash estável do id sobre a paleta AVC), circle-stroke-width 3 + circle-stroke-color = cor do grupo de status (ou âmbar "antiga"), iniciais 11px bold; MANTÉM cluster e animação de interpolação atuais |
| L.divIcon .mk-os (losango 22px, borda branca 2.5) | icon-image SVG LOSANGO por prioridade (substitui o teardrop; variante selecionada); wo-selected-ring e wo-pulse (urgente/novo) mantidos |
| L.polyline dash "6 7" peso 2.5 #3b82f6 opacidade .8 | NOVA camada line "wo-routes" (GeoJSON LineString por despacho ativo): line-width 2.5, line-dasharray [2.4, 2.8] (dash em múltiplos da largura), line-color #3b82f6, line-opacity 0.8 |
| bindPopup(osPopupHtml) | maplibregl.Popup (closeButton próprio, className custom) com conteúdo React via portal/root dedicado (unmount no close — sem leak) |
| map.panTo | map.easeTo (padding right p/ o stack) |
| L.control.zoom bottomright | NavigationControl bottom-right (existente) + FullscreenControl MANTIDO (entrega SPRINT POLISH pedida pelo dono; retenção deliberada — não existe no protótipo, registrada) |
| moveend → localStorage | idem (map.on("moveend")) |

### D3 — Dados reais × demo: NADA do TECHS/OSS hardcoded entra (D-007). Ver §9 (tabela completa).

### D4 — Memória da visão: SIM (comportamento desenhado pelo dono). O focus-city MORRE.
- Ordem de câmera no mount: **visão salva** > **default Brasil [-15.5, -52.5] z4** (verbatim do
  protótipo: "Brasil — só até o operador focar em outra área"). moveend → salva + savenote
  "✓ Visão do mapa salva" (fade 1.2s). panTo/easeTo em seleção de OS, card de atendimento e
  detalhe do técnico mantidos (o protótipo faz).
- **MORREM:** o enquadramento focus-city de J-MAPAS-4 (clusterByProximity/pickFocusCluster na
  câmera) e o fitBounds por mudança do conjunto de ids. Os botões "⌖ Operação"/"Brasil" seguem
  FORA (o protótipo os traz COMENTADOS: "desativados a pedido do operador").
- Divergência A2 registrada em agent-orchestration/controle/decisoes.md (D-MAPA-PIXEL): a regra
  J-MAPAS-4 ("focar onde tem mais técnicos") é SUPERSEDIDA por artefato mais novo do próprio
  dono. Helpers puros + testes focus-city são removidos no PR-2 (o canvas Google ainda os usa
  até o espelho).

### D5 — Alocação: endpoint real já rastreado (POST /operations/dispatches, #241). Gestos novos:
1. **Seleção de OS** (card ou marker) → estado "os-selected" → cada linha de técnico ganha botão
   **"Alocar"** + célula km/min honesta; a ordenação salta para "Distância" (regra do protótipo).
   Esc limpa a seleção.
2. **Popup do marker de OS**: 3 técnicos mais próximos (exclui grupo "off"; km asc; slice 3) com
   dot de status + nome + "~km · ~min" + **Alocar**; OS em atendimento mostra "Em atendimento
   por {nome}". Adição mínima: ação "Abrir OS" (migra do painel WorkOrderPinPanel removido).
3. **Drag-and-drop nativo HTML5** (draggable, dataTransfer "text/os", ZERO lib): arrastar card
   de OS recebida até a linha do técnico → allocate; classe .dragging no card, .droptarget verde
   na linha; linha "off" não aceita. Caminho de teclado = seleção + botão Alocar (a11y).
4. **Toast** de confirmação bottom-center (estilo verbatim), copy HONESTA (ver §8) — nunca
   "chegada estimada em X" cravado.
- **Substituem** OperationsCallAllocationPopup / OperationsTechnicianAllocationPopup /
  MapAllocationDialog (removidos). O **índice de conclusão** (backend J-MAPAS-7) NÃO morre:
  vira a 5ª opção do select de ordenação do painel Técnicos ("Índice de conclusão", visível só
  com field_dispatch:create; célula mostra % via formatCompletionRate).
- Todos os gestos de alocar gated por field_dispatch:create (sem permissão: sem "Alocar", sem
  draggable, popup só informativo).

### D6 — Legenda-filtro (8 itens, verbatim, com contagem no tooltip e toggle):

| Item (label verbatim) | Cor | Camada/grupo que esconde | Contagem (tooltip data-tip) |
|---|---|---|---|
| Disponível | #22c55e | técnicos available | "{n} disponíveis" |
| Em rota | #3b82f6 | técnicos on_route | "{n} em rota" |
| Em atendimento | #a855f7 | técnicos in_service+on_site | "{n} em atendimento" |
| Localização antiga | #f59e0b | técnicos isStale (15 min — limiar existente) | "{n} com localização antiga" |
| Fora de serviço | #64748b | técnicos offline+blocked+paused | "{n} fora de serviço" |
| OS urgente (losango) | #ef4444 | pins urgent + suas rotas | "{n} OS urgentes" |
| OS alta (losango) | #f59e0b | pins high + suas rotas | "{n} OS alta" |
| OS média/baixa (losango) | #38bdf8 | pins medium+low + suas rotas | "{n} OS média/baixa" |

- Regra do protótipo preservada: técnico visível se grupo de status ON **e** (não-antiga OU
  "antiga" ON). Rotas seguem o grupo da OS. Estado do filtro é LOCAL (não vai para a URL).
- **Arquitetura (paridade de graça):** o filtro é aplicado **na página** (filtra os arrays antes
  de entregá-los ao canvas) — MapLibre, Google e o fallback esquemático obedecem sem código de
  canvas. MAP_LEGEND_ITEMS evolui para estrutura com key de grupo + contagem + estado.
- Barra: à direita o hint verbatim "Esc limpa a seleção · arraste uma OS até um técnico para
  alocar" + disclaimer curto das estimativas ("distâncias em linha reta, tempo sem trânsito").

### D7 — Escopo do PR: DUAS fatias (risco justifica; prioridade visível primeiro).
- **PR-1 (o que o dono VÊ — caminho default):** página + painéis + legenda-filtro + canvas
  MapLibre completo (estilo claro, avatares, losangos, rotas, popup, view memory) + adapter
  split + CSS + testes. Suíte inteira verde.
- **PR-2 (espelho + faxina):** paridade do GoogleMapsCanvas (cores, losango, rotas, view
  memory), remoção dos helpers/testes focus-city, resíduos de polimento. MESMA rodada; a
  pendência de paridade fica registrada no PR-1 e FECHA no PR-2.
- Motivo de não fazer 1 PR só: o espelho Google dobra a superfície de canvas com ganho invisível
  no default (o canvas Google é env-gated por VITE_GOOGLE_MAPS_API_KEY); separar mantém o PR-1
  revisável pela junta sem diluir a bateria.

## 6. Dossiê geo (a)–(e) — verificações datadas de 2026-08-06

**(a) API/provedor:** MapLibre GL + OpenFreeMap MANTIDOS (regra de ouro Ω1). Look claro por
token-set próprio (D1). Alternativas no mesmo quadro: estilos hospedados OFM (keyless), CARTO
Voyager (REJEITADO: comercial exige Enterprise license — carto.com/basemaps, 2026-08-06), Google
Dynamic Maps (rejeitado para base; preço abaixo). Leaflet rejeitado (dependência nova).

**(b) Custo por SKU no piloto:** **US$ 0/mês.** Nenhum SKU tocado, nenhuma chave, nenhum billing.
Tabela oficial Google re-verificada 2026-08-06 via WebFetch (página marcada "Last updated
2026-07-31 UTC"): Dynamic Maps US$ 7,00/1.000 · Geocoding US$ 5,00/1.000 · Routes Compute Routes
Essentials US$ 5,00/1.000 · cota grátis 10.000/mês por SKU (Essentials) — inalterados vs KB de
2026-07-19/25. ETA/km continuam haversine local (US$ 0); ETA por rota real segue PD-006
(junta-5 + PD, NÃO entra). OpenFreeMap re-confirmado grátis/sem limite/keyless em 2026-08-06.

**(c) ToS de cache (place_id vs lat/lng):** **não se aplica** — nenhuma coordenada do Google é
buscada/persistida; todas as coordenadas são dado próprio do tenant (posição de técnico via sync
consentido; lat/lng de OS geocodificada; sem place_id, sem trava de 30 dias). OpenFreeMap: sem
restrição de cache; obrigação = atribuição (mantida).

**(d) Chave por plataforma:** **N/A** — keyless. A VITE_GOOGLE_MAPS_API_KEY do canvas Google
opcional permanece fora deste escopo (restrição por referrer HTTP, env do frontend, nunca
versionada — e segue pendente de ROTAÇÃO pelo dono desde o go-live readiness).

**(e) LGPD (item de veto do avaliador):** minimização mantida — listas/cards/toasts NUNCA
trafegam coordenada; a coordenada numérica aparece SOMENTE no detail popover do técnico
(paridade com o protótipo do dono; mesma superfície de permissão do pin — field_location:read);
**nenhuma coordenada em log/console/analytics**; localStorage guarda SÓ a câmera; payload de DnD
é só o id da OS; o popup de alocação mostra ~km/~min, nunca lat/lng.

**Conclusão:** serviço pago novo **NÃO** entra → **junta-5 + PD NÃO disparam**. Junta normal (≥3).

## 7. Arquivos exatos (regra do espelho — referência web: frontend/src/modules/operations/map/)

**CRIAR**
- components/OperationsMapPanelsStack.tsx — stack 348px direita (substitui OperationsMapStage): 3 painéis + pills de colapso + estado os-selected.
- components/OperationsInServiceList.tsx — painel "Em Atendimento" (cards com "→ {técnico}"; clique = pan).
- components/OperationsTechnicianDetailPopover.tsx — detail popover (grid 2×3 + dwarn antiga + link "OS atual").
- components/OperationsOsMarkerPopup.tsx — conteúdo React do popup do marker (3 mais próximos / em-atendimento-por / Abrir OS).
- components/OperationsMapChips.tsx — chips top-left dos estados obrigatórios §7 (fonte/realtime/atualizado/pausar-auto/OS-filtrada) no estilo .chip do protótipo.
- components/OperationsAllocationToast.tsx — toast bottom-center do protótipo (família visual compartilhada com os toasts M-5).
- hooks/useMapViewMemory.ts — persistência da câmera (key por tenant, default Brasil z4, savenote).
- hooks/useLegendFilter.ts — estado dos 8 toggles + contagens + aplicação page-level.
- map/routeLines.ts — builder PURO do GeoJSON de rotas (pares técnico-atribuído→OS de despachos ativos; sem par → sem linha).
- Testes novos: ver §10.

**ALTERAR**
- pages/OperationsMapPage.tsx — remove page-heading/SummaryCards/Filters/faixa de detalhe/alerts fixos; compõe stage full-viewport + chips + stack + legenda-filtro + popover + toasts; mantém deep-link ?workOrderId, alerta M-5, geocode CTA.
- components/OperationsMapLibreCanvas.tsx — estilo claro; avatarColor/borda-status; losangos; camada wo-routes; popup; view memory; REMOVE fit-por-conjunto e focus-city; easeTo de seleção mantido.
- map/mapStyle.ts — token-set claro (novo default desta tela); builder segue puro/testável.
- map/mapMarkers.ts — cores do protótipo (status: rota #3b82f6, atend #a855f7; prioridade OS: #ef4444/#f59e0b/#38bdf8/#64748b); grupos de status; avatarColor (hash estável do id → paleta AVC); SVG losango; MAP_LEGEND_ITEMS → estrutura de legenda-filtro. GUARD: grep consumidores de WORK_ORDER_PRIORITY_HEX/getWorkOrderPriorityColor fora do módulo mapa ANTES de mudar hex compartilhado; se houver, escopar local.
- operations-map.adapter.ts — split rec/atd (rec = open; atd = assigned/accepted/on_route/on_site/in_progress/paused não-terminais) + resolução do nome do técnico atribuído (assignedOperatorId/assignedUserId ↔ locations; fallback despacho; sem match → "—").
- operations-map.types.ts — tipos novos (grupo de status, item de legenda-filtro, chamado em atendimento).
- components/OperationsMapLegendFooter.tsx — vira legenda-FILTRO interativa (8 itens, tooltip contagem, toggle, hint verbatim).
- components/OperationsIncomingCallsList.tsx — cards .os verbatim (r1 código+badge; r2 cliente+relógio; r2 pino+endereço; borda-esquerda por prioridade; sel; "Sem GPS no mapa" + CTA "Localizar no mapa" gated) — o relógio usa o countdown REAL M-7 quando slaDueAt existe (senão "há X" — honestidade preservada).
- components/OperationsOperatorList.tsx — vira trow verbatim (dot status, nome, selo "antiga", eta visto→km·min na seleção, good ≤15/mid ≤40 min, botão go) + fchips Todos/Ativos/Fora de serviço + select Distância/Tempo/Nome/Status/Índice de conclusão + droptarget do DnD.
- components/OperationsMapCanvas.tsx (wrapper de props) · components/OperationsMapSchematicCanvas.tsx (fallback: cores/copy) · index.ts (exports) · frontend/src/styles/app.css (bloco novo .opmap-* com os tokens do §8; remove regras dos componentes mortos).
- PR-2: components/GoogleMapsCanvas.tsx (+ loader se preciso) — espelho completo; remoção de clusterByProximity/pickFocusCluster/westFirstTieBreak + teste focus-city.

**REMOVER (PR-1)**
- components/OperationsMapStage.tsx · OperationsMapSummaryCards.tsx · OperationsMapFilters.tsx · OperationsOperatorDetailPanel.tsx · OperationsWorkOrderPinPanel.tsx · OperationsWorkOrdersWithoutLocationPanel.tsx · OperationsCallAllocationPopup.tsx · OperationsTechnicianAllocationPopup.tsx · MapAllocationDialog.tsx.
- **VIVEM intactos:** useOperationsMap (dados/SSE/poll/merge honesto) · useNewWorkOrderAlert · useTechnicianPerformance · useAllocateDispatch · allocation.ts (formatters honestos) · operations-map.service.ts · technician-performance.service.ts.

## 8. Mapeamento pixel (tokens/medidas/copy VERBATIM do protótipo)

**Tokens:** --panel: rgba(13,21,38,0.78) · --panel-line: rgba(148,163,184,0.18) · txt #e2e8f0 ·
dim #94a3b8 · ok #22c55e · rota #3b82f6 · atend #a855f7 · off #64748b · warn #f59e0b · urg
#ef4444 · blue #2563eb · paleta AVC: #2563eb, #7c3aed, #0891b2, #db2777, #d97706, #059669,
#4f46e5, #b91c1c, #0d9488, #9333ea.

**Stack/painéis:** stack width 348; top 12; right 12; bottom 30; gap 8 · painel radius 12,
backdrop-blur 12px, border 1px --panel-line, shadow 0 8px 28px rgba(2,6,23,0.45) · phead padding
9px 12px, título 12.5px, cnt bg rgba(59,130,246,0.22) cor #93c5fd radius 99 · pbody padding 8,
gap 6, scrollbar 6px · pill radius 99, padding 6px 12px, 11.5px/600 (labels: "🛠 Atendimento",
"📥 Recebidas", "👤 Técnicos") · botão recolher "—".

**Card de OS:** border-left 3px por prioridade (urg/warn/#38bdf8/#64748b) · radius 9, padding
8px 10px, bg rgba(30,41,59,0.5) · selecionado: box-shadow 0 0 0 1px #3b82f6 + bg
rgba(37,99,235,0.18) · badge 9.5px/700 uppercase radius 99 ("URGENTE/ALTA/MÉDIA/BAIXA") ·
linhas "⏱ {tempo}" e "📍 {endereço}" · .dragging opacity .45.

**Linha de técnico (trow):** radius 8, padding 6px 8px · dot 9px + halo 0 0 0 3px
rgba(255,255,255,0.07) · nome 12.5px/600 ellipsis · selo "antiga" (9px, âmbar) · eta 11.5px dim
com valores bold (good #4ade80 ≤15 min; mid #fcd34d ≤40 min) · botão go bg --blue radius 7
padding 4px 9px 11px/700, visível só com OS selecionada (os-selected) · droptarget bg
rgba(34,197,94,0.16) border #22c55e · .off opacity .5 + go disabled.

**Filtros do painel Técnicos:** fchips "Todos/Ativos/Fora de serviço" (radius 99; 11px; on = bg
rgba(37,99,235,0.3) borda #3b82f6 texto #bfdbfe) + select "Distância/Tempo/Nome/Status"
(+ "Índice de conclusão" — adição registrada).

**Legenda-filtro:** barra bottom 0 full-width, padding 4px 10px, bg rgba(13,21,38,0.82),
blur 8, 10.5px · item .lg padding 2px 7px radius 99; off opacity .4 · dot 8px; item de OS =
quadrado 8px rotate(45deg) radius 2 · tooltip ::after (bottom calc(100%+9px); bg #0f172a;
radius 7; 11px) · hint direito verbatim: "Esc limpa a seleção · arraste uma OS até um técnico
para alocar".

**Markers:** técnico 32px círculo, borda 3px (status/antiga), bg cor AVC, iniciais 700 11px
brancas, st-off opacity .75 · OS losango 22px (rotate 45; radius 5; borda 2.5px branca),
selecionado outline 3px rgba(59,130,246,0.65) offset 2, urgente pulsa (1.6s ease-out; wo-pulse
MapLibre aproxima — reduced-motion desliga, M-5 mantido) · rota tracejada #3b82f6 2.5px dash
6/7 opacidade .8.

**Popup do marker:** wrapper bg --panel, blur 12, radius 10, shadow 0 8px 28px · conteúdo
12px/1.5, min-width 190 · título "{código} — {prioridade}"; sub "{cliente} · {endereço}" (11px
dim) · linhas .prow com border-top --panel-line + botão Alocar 10.5px/700.

**Detail popover:** width 270; right 372; top 64; radius 12; blur 14; shadow 0 10px 34px ·
header av 34px + nome 13px + "{equipe} · {status}" + ✕ · aviso (só antiga): "⚠ Localização
antiga — última posição {visto}. Confirme por despacho ou contato direto." · grid 2 colunas
(gap 1px, células bg rgba(13,21,38,0.6), padding 7px 12px), labels 9.5px uppercase:
**Status · Último visto · Bateria · Precisão · Coordenadas · OS atual**.

**Savenote:** "✓ Visão do mapa salva" (top 48; right 376; bg rgba(34,197,94,0.16); borda
rgba(34,197,94,0.4); cor #4ade80; radius 99; 11px), fade 1.2s pós-moveend.

**Toast:** bottom 44 centro, bg rgba(22,101,52,0.92), borda rgba(74,222,128,0.4), cor #dcfce7,
radius 10, padding 9px 16px, 12.5px/600, some em 3.6s. **Copy adaptada por honestidade
(registrado):** "✓ {código} alocada para {nome} — ~{Y} min (estimado, sem trânsito) · ~{X} km
(linha reta)" — o protótipo diz "chegada estimada em", proibido pela regra ETA-honesto
(J-MAPAS-7).

**Empty states verbatim:** "Nenhum chamado aguardando alocação 🎉" · "Nenhuma OS em atendimento"
· "Nenhum técnico neste filtro". **Títulos verbatim:** "Chamados recebidos" · "Em Atendimento" ·
"Técnicos de campo".

**Estados obrigatórios §7 (CLAUDE.md):** loading = overlay do canvas (existente) + skeleton dos
painéis; empty = empties verbatim + mapa no default Brasil; error/desatualizado = chips "Fonte:
indisponível"/"Atualizado HH:MM" + banner compacto com "Tentar novamente"; acesso = painéis de
OS escondidos sem work_orders:read, gestos de alocar sem field_dispatch:create.

## 9. Comportamento → dado real (nenhum dado fabricado — D-007)

| Protótipo | Fonte real |
|---|---|
| TECHS[] | GET /field-locations/latest → FieldLocationItem[]: nome=displayName, equipe=teamName, bateria=batteryLevel, precisão=accuracyMeters, visto=formatLastSeen(capturedAt) |
| t.st disp/rota/atend/off | grupos: disp←available · rota←on_route · atend←in_service+on_site · off←offline+blocked+paused (grupo só para mapa/filtro; o rótulo REAL — "Pausado"/"Bloqueado" — aparece no popover/painel via getFieldLocationStatusLabel) |
| t.antiga | isStale (limiar EXISTENTE de 15 min) — substitui as faixas 3/10 min do anel (registrado) |
| t.cor | hash estável de location.id → índice na paleta AVC (não por posição do array: a ordem muda entre refreshes) |
| OSS fase "rec" | chamados com OS status === "open" (split novo no adapter, sobre as MESMAS listas já lidas) |
| OSS fase "atd" | OS não-terminais assigned/accepted/on_route/on_site/in_progress/paused; técnico = assignedOperatorId/assignedUserId ↔ locations (fallback: despacho ativo); sem match → "—" |
| aberto: "há 2 h" | createdAt via formatLastSeen; com slaDueAt REAL → countdown honesto M-7 ("vence em…", data-tone) — Fase 2 preservada |
| ETA/km (haversine×1.32; comentário do dono: "no produto real: Google Distance Matrix") | haversineKm + estimateTravelMinutes (28 km/h) EXISTENTES, rótulos "~X km"/"~Y min" + disclaimer na barra da legenda; limiares visuais do protótipo (good ≤15, mid ≤40) aplicados à NOSSA estimativa; ETA por rota real = PD-006 (junta-5), NÃO entra |
| rotas tracejadas (atd) | par (posição do técnico atribuído, coordenada da OS) das MESMAS listas; qualquer lado ausente → sem linha (nunca inventa) |
| contadores rec/atd/tec | length das listas reais (pills, cnt do phead, tooltips da legenda) |
| popup 3 mais próximos | buildAllocationCandidates (existente) sobre TODOS os técnicos, exclui grupo off, km asc, slice 3 |
| allocate() | useAllocateDispatch → POST /operations/dispatches (404/409/422 traduzidos — feedback real) |
| VIEW_KEY | localStorage techsol.mapaOp.view.<tenantId> (só câmera) |
| OS sem GPS | hasLocation=false → card com "Sem GPS no mapa" + CTA "Localizar no mapa" (geocodeWorkOrder, gated work_orders:update) — migra o painel Ω1b-2 |
| alerta de OS nova (M-5) | useNewWorkOrderAlert intacto: toast (família visual do protótipo) + realce nas pills/cnt + pulso no losango novo |

## 10. Testes — baseline e meta

**Baseline REAL (contado 2026-08-06):** 11 arquivos frontend/tests/operations-map-*.test.ts(x),
**125 casos** (alert 17 · allocation 16 · calls 21 · focus-city 10 · google-canvas 7 · layout 10
· legend-footer 6 · libre 10 · technicians 11 · work-order-pins 8 · work-orders.adapter 9).

**Meta:** N = **16 comportamentos-delta** (estilo claro · avatar/borda · losango · rotas ·
legenda-filtro · split rec/atd · painéis+pills · filtros/sort do painel · seleção→Alocar · popup
do marker · DnD · view memory · popover · toast · remoções guardadas · geocode-no-card) →
**≥ 2N = ≥ 32 casos novos/reescritos**; suíte do mapa **≥ 150 casos** ao fim do PR-1 (mesmo com
remoções). Rodar TAMBÉM a suíte backend (tests/navigation-provisioning.test.ts lê
/operations/map; a rota NÃO muda) e o smoke frontend.

**Por arquivo existente (o que muda / o que prova):**

| Arquivo | Mudança |
|---|---|
| operations-map-layout.test.ts | REESCREVER: stage full-viewport sem page-heading/SummaryCards/Filters; stack 348/12/12/30; tokens de vidro exatos; pills + aria-expanded; hint verbatim; savenote presente |
| operations-map-legend-footer.test.ts | vira legenda-FILTRO: 8 labels verbatim; contagem real no data-tip; toggle esconde grupo (arrays filtrados na página); cores da fonte única; quadrado rotacionado p/ OS |
| operations-map-libre.test.ts | tokens CLAROS do novo style (OpenFreeMap sem chave mantido); auto-fit REMOVIDO; SSR-safe preservado; SummaryCards removidos (casos migram/morrem) |
| operations-map-technicians.test.ts | avatarColor estável por id; borda por grupo (#3b82f6/#a855f7); antiga por isStale 15 min; trow verbatim (dot/nm/old/eta/go); fchips; select 5 opções; gating do go |
| operations-map-calls.test.ts | split rec/atd; cards verbatim (badge/relógio/endereço); countdown M-7 preservado (guard anti-fabricação intacto); empty com 🎉 só com lista vazia; seleção → os-selected |
| operations-map-allocation.test.ts | ATUALIZAR: seleção→go allocate; formatters honestos intactos; popups D/E REMOVIDOS (guard de ausência); gating por permissão; helpers de candidatos reusados pelo popup do marker |
| operations-map-alert.test.ts | núcleo intacto (diff/dedup/teto/reduced-motion); integrações novas: realce nas pills, pulso no losango, toast reestilizado |
| operations-map-work-order-pins.test.ts | losango por prioridade (cores novas do protótipo); pulse urgente; slaDueAt fora das properties (mantido) |
| operations-map-work-orders.adapter.test.ts | split por fase + resolução de técnico atribuído; CTA geocode migrado p/ card |
| operations-map-focus-city.test.ts | PR-1: intacto (helpers ainda usados pelo Google) · PR-2: REMOVIDO junto com os helpers |
| operations-map-google-canvas.test.ts | PR-1: só ajustes de constantes compartilhadas · PR-2: espelho completo (losango/rotas/view memory/cores) |

**Novos arquivos de teste (PR-1):**
- operations-map-view-memory.test.ts — saved>default; default Brasil z4; key com tenantId; moveend→save; savenote; NUNCA posição de técnico no localStorage.
- operations-map-routes-layer.test.ts — builder puro: par completo → LineString; lado faltando → sem feature; propriedade de grupo p/ filtro; estilo dash/cor/largura.
- operations-map-dnd.test.ts — dragstart payload text/os; drop na trow → allocate(os, tec); droptarget liga/desliga; linha off rejeita; sem permissão → sem draggable.
- operations-map-marker-popup.test.ts — 3 mais próximos reais (exclui off, km asc); "Em atendimento por {nome}"; Alocar gated; Abrir OS; NENHUMA coordenada crua no HTML.
- operations-map-detail-popover.test.ts — 6 células verbatim; dwarn só antiga; coordenadas SÓ aqui; ✕ e Esc fecham; sem coordenada em console/log.

## 11. Riscos + rollback

1. **Hex compartilhado** (WORK_ORDER_PRIORITY_HEX/getWorkOrderPriorityColor podem ter consumidor
   fora do módulo mapa) → dev faz grep ANTES; se houver consumidor externo, escopa a paleta nova
   localmente e registra.
2. **Espelho Google temporariamente divergente** (PR-1→PR-2) → pendência explícita no corpo do
   PR-1; fecha na mesma rodada.
3. **Popup MapLibre com React** → root dedicado + unmount no close (leak guard testado).
4. **Primeira visita = Brasil z4** (sem saved view, técnicos podem ficar fora do enquadre) →
   comportamento DESENHADO pelo dono ("Brasil — só até o operador focar"); painéis/pills mostram
   os dados; não é bug.
5. **Remoção de funcionalidades** (SummaryCards/filtros URL/ações de despacho no mapa) →
   divergências A2 registradas (D-MAPA-PIXEL); gestão de despacho continua na tela Despachos.
6. **Testes acoplados** (contract-tests backend leem .tsx; smoke) → rodar bateria completa
   backend+frontend (memória do repo: mexer no front pode quebrar o job backend).
7. **localStorage em SSR/teste** → guard try/catch (o protótipo já faz); stub nos testes.
8. **PR grande** → fatia PR-1/PR-2 + commits ordenados (style → markers → panels → interações →
   testes) + bateria §C9 completa.

**Rollback:** revert do(s) PR(s) — frontend-only, ZERO migration, ZERO contrato novo, ZERO
dependência. A chave de localStorage órfã é inócua (ignorada pelo código antigo).

## 12. Instrução exata para o dev-mapas

1. Leia este plano INTEIRO + Mapa Operacional.html INTEIRO (abra no navegador ao lado — ele é o
   alvo pixel) + docs/maps/kb-mapas.md §(j).
2. **PR-1** em branch feat/mapa-pixel-pr1 a partir de main (git pull --rebase antes). Ordem de
   commits sugerida: (1) mapStyle claro + tokens; (2) mapMarkers cores/grupos/avatar/losango +
   routeLines.ts; (3) adapter split rec/atd; (4) painéis/pills/legenda-filtro/chips/CSS;
   (5) canvas MapLibre (rotas/popup/view-memory/remoção do auto-fit); (6) DnD + seleção→Alocar +
   toast + popover; (7) remoções + testes + KPIs.
3. **Escopo proibido:** prisma/**, migrations/**, src/** (backend), .env, lockfiles, mobile/**,
   sidebar/topbar/roteamento do app. NENHUMA dependência nova (Leaflet PROIBIDO). NENHUMA
   chamada externa nova (sem CARTO, sem Google, sem Nominatim).
4. Copy VERBATIM do §8 (inclusive emojis do protótipo); exceções de honestidade listadas
   (toast/ETA/countdown) — não "melhorar" textos por conta própria.
5. Bateria §C9 completa: npm --prefix frontend run check · build · testes do mapa · suíte
   frontend inteira · suíte backend (npm test) · smoke · git diff --check. Meta de testes do §10
   (≥32 casos novos; suíte do mapa ≥150).
6. KPIs no PRÓPRIO PR (§C3): Kpis/kpis-latest.json + history append + index.html hidratado.
7. Ata da junta em agent-orchestration/omega/mapas/J-MAPAS-10-pixel-ata.md (votos dev +
   avaliador). Corpo do PR: objetivo, prints antes/depois, pendência do espelho (PR-2), DoD.
8. **PR-2** (feat/mapa-pixel-pr2-espelho): espelho Google + remoção focus-city (helpers + teste)
   + resíduos. Só abre depois do merge do PR-1.
9. Depois de CADA merge: bash scripts/post-merge-cleanup.sh (§C5 — disco escasso).

## 13. Divergências A2 registradas (consolidadas em agent-orchestration/controle/decisoes.md — D-MAPA-PIXEL)

1. Focus-city (J-MAPAS-4) SUPERSEDED pela memória-da-visão + Brasil default (artefato mais novo
   do dono); helpers/testes saem no PR-2.
2. Cores de prioridade de OS passam às do protótipo (#ef4444/#f59e0b/#38bdf8/#64748b).
3. Status: cores do protótipo (rota #3b82f6, atend #a855f7); paused/blocked/offline agrupados
   como "Fora de serviço" NO MAPA (rótulo real preservado no popover/painel).
4. Legenda: 2 faixas de "antiga" (3/10 min) → 1 item único (limiar 15 min existente).
5. Popups D/E de alocação substituídos pelos gestos do protótipo; índice de conclusão vira opção
   de ordenação (feature preservada).
6. Ações de gestão de despacho (status/cancelar/reatribuir) saem do mapa — permanecem na tela
   Despachos; popover ganha link.
7. Toast de alocação com rótulo honesto (D-007/J-MAPAS-7 vencem copy verbatim).
8. SummaryCards/barra de filtros/params status|team|stale|q saem; ?workOrderId permanece.
9. Navigation+FullscreenControl mantidos (entrega anterior aprovada pelo dono) apesar de
   ausentes no protótipo.
10. Chips top-left: markup mínimo dos estados obrigatórios §7 usando o estilo .chip que o
    protótipo define sem markup.
11. VIEW_KEY ganha sufixo de tenant (isolamento multi-org).

---
*Registrado pela Junta de Mapas em 2026-08-06 (J-MAPAS-10 · planejador-mapas). Próximo: dev-mapas.*
