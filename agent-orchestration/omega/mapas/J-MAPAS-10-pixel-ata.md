# J-MAPAS-10 — Mapa Operacional pixel-perfect (PR-1)

> **Pedido do dono (2026-08-06, verbatim):** *"focar no mapa, a sidebar deixe de fora desta correção.
> copie pixel a pixel este prototipo"* — protótipo `Mapa Operacional.html`, desenhado por ele no Claude
> Design e importado para a raiz do repo (fonte da verdade visual, §11).
>
> **Diretivas complementares do dono, na mesma rodada (após ver a tela renderizada):**
> 1. *"existem umas legendas/objetos na parte superior esquerda, é para sair/excluir"*;
> 2. *"o mapa esta com vida propria ajustando para dar foco em uma area… DEVE sim guardar memoria da
>    ultima posição em que o operador focou, e deve ficar com esse foco ate que o operador o modifique"*;
> 3. *"informação de um tecnico aparecendo quando passado o mouse em cima (desaparece automatico) ou
>    com um clique (fecha manual)"*.

## 1. Composição da junta e vereditos

| Agente | Papel | Ciclo 1 |
|---|---|---|
| `planejador-mapas` | plano obrigatório (nenhum código de mapa sem ele) | plano emitido — `PLANO-MAPA-PIXEL.md` |
| `dev-mapas` | implementação | entregue: smoke 1052, backend 2110, suíte do mapa 125→177 |
| `avaliador-mapas` | **veto geo** | **APROVADO_CONDICIONADO** |
| `cognicao-visual` | **veto de pixel** | **REPROVADO** |

Cada achado sério passou por **refutação adversarial independente** (workflow): 0 refutados.
8 verificações caíram por limite de sessão do provedor e foram **re-verificadas pelo orquestrador**
com execução própria (render em Edge real + medição no DOM) — nenhuma foi aceita sem prova.

## 2. Decisões técnicas cravadas (D-MAPA-PIXEL)

- **Tiles do protótipo (CARTO Voyager) REJEITADOS**: verificação em carto.com/basemaps (2026-08-06) —
  *"For commercial purposes, you will need an Enterprise license"*. Ficamos em **MapLibre +
  OpenFreeMap** (keyless, comercial-ok, US$ 0) com token-set **claro** "voyager-like". O que muda a
  leitura é o mapa ser claro, não o cartógrafo. **Sem SKU, sem chave, sem dependência nova → junta-5
  e PD não disparam.**
- **Leaflet rejeitado** (dependência nova = junta-5): mapeamento função-a-função Leaflet→MapLibre.
- **Dados 100% reais (D-007)**: nada dos `TECHS`/`OSS` do protótipo. ETA/km por haversine **rotulado**
  como estimativa ("linha reta · sem trânsito"); rotas só com par técnico↔OS completo.

## 3. Achado ALTA que mudava tudo — a tela do dono não era o trabalho novo

`cognicao-visual` provou por screenshot: **com a chave Google no `.env`, o canvas renderizado era o
espelho ANTIGO** (`OperationsMapCanvas` preferia Google sempre que houvesse chave). Ou seja, o
auto-foco e os chips que o dono reclamou vinham da tela velha; o PR-1 nunca aparecia para ele.
**Correção:** MapLibre pixel-perfect vira o **default**; Google passa a exigir opt-in explícito
(`VITE_MAPS_PROVIDER=google`) até a paridade fechar no PR-2. Chave nova registrada em `config/env.ts`.

## 4. Diretivas do dono — implementação e PROVA (Edge real, 1440×900)

| Diretiva | Implementação | Prova medida |
|---|---|---|
| Chips do topo-esquerdo saem | `OperationsMapChips` desmontado da página; sobram só **banners de estado REAL** (erro de carga com "Tentar novamente"; contexto de OS filtrada com saída) | `chipsPresentes: 0` |
| Mapa sem vida própria | **Todo** movimento automático de câmera removido: auto-fit, `panToSelected`, `easeTo` por mudança de seleção e o `easeTo` de expansão de cluster. Sobrou **um único** `easeTo`: o `panTarget`, disparado só por clique do operador | `cameraEstavel: true` |
| Memória da última posição | `techsol.mapaOp.view.<tenantId>` + savenote; default Brasil z4 só na 1ª visita | chave gravada por organização |
| Detalhe por hover | `mousemove`/`mouseleave` na camada de pins + `onMouseEnter/Leave/Focus/Blur` na linha do painel; hover **nunca** move a câmera e **nunca** rouba um detalhe fixado | `popoverNoHover: 1` → `popoverSomeAoSair: true` |
| Detalhe por clique | `detailPinnedRef` fixa o popover; fecha só no ✕ | `popoverNoClique: 1` → fica ao sair o mouse → `popoverFechaManual: true` |

**Cluster desligado** junto: o protótipo nunca agrupa marcadores — e na visão default Brasil o
operador via bolhas "2"/"4" em vez dos avatares.

## 5. Demais achados aplicados

| Sev | Achado | Correção |
|---|---|---|
| MÉDIA | Borda esquerda do card selecionado virava azul (cascade invertido vs protótipo) | `.opmap-os.sel` declarado ANTES das regras de prioridade — urgente selecionado segue vermelho |
| MÉDIA | Palco com moldura de 24px, raio 8 e faixa branca de ~46px (o dono já reprovou "mapa espremido" na J-MAPAS-6) | palco **full-bleed**: página anula o padding do shell e o palco ocupa a altura restante |
| MÉDIA | Legenda quebrando em 2 linhas (protótipo: 1 linha de 27px) | itens com prioridade e `nowrap`; textos da direita cedem espaço e somem por media query; disclaimer vira `title` do hint. Medido: **26px** |
| MÉDIA | Chip "Fora de serviço" em 3 linhas | `white-space: nowrap` + `max-width` no select de ordenação |
| MÉDIA | Copy técnica e sem acento em 1º plano ("Realtime indisponivel", "SSE…") | "Tempo real indisponível/conectado", "atualização periódica" — §3/§11.3 |
| MÉDIA | Pipeline de badges de Frota órfão (fetch rodando sem consumidor) | ids repassados ao canvas — o fallback esquemático volta a exibi-los |
| BAIXA | `FullscreenControl` fora do protótipo | removido (só zoom bottom-right, verbatim) |

## 6. Pendências declaradas (PR-2 da mesma rodada)

- Espelho **GoogleMapsCanvas** sem paridade (losango, rotas, memória de visão, popup) — por isso está
  atrás de opt-in.
- Faxina: helpers/teste `focus-city`, `OperationsDispatchActionsPanel` órfão, `OperationsMapStatusBadge`.
- **e2e Playwright do mapa já estava defasada antes deste PR** (espera "Mapa placeholder", da era pré-Ω1)
  e não roda no CI — reescrever no PR-2.
- Contagem da legenda de OS = pins **mapeáveis**; pode divergir da fila quando há OS sem GPS (declarado).
- Badges de Frota fora do popover 2×3 do protótipo (o grid verbatim não os comporta).

## 7. Bateria

`npm --prefix frontend run check` verde · `test:smoke` **1052/1052** · `build` ✓ · backend
`CORE_SAAS_PERSISTENCE=memory` **2110 pass / 6 skip / 0 fail** · `git diff --check` limpo ·
guard de CSS sem `*/` órfão.

**Veredito final: APROVADO** (ciclo 2 — todos os achados sérios aplicados e provados por medição).

---

## 8. PR-2 — espelho Google + faxina (fecha as pendências do §6)

**Base:** `main` já com o PR-1 mergeado (#338, `70dbfde`). **Papel:** `dev-mapas`. **Próximo:** `avaliador-mapas`.

### 8.1 Paridade do espelho `GoogleMapsCanvas` — o que ficou EQUIVALENTE

O canvas Google deixou de ser a tela velha: passou a consumir `routes`, `initialView`, `onMoveEnd`,
`panTarget`, `renderWorkOrderPopup`, `closePopupSignal` e `onHoverTechnician`, sempre das **mesmas
fontes únicas** do MapLibre (nenhum hex/medida paralela).

| Delta do protótipo | MapLibre (default) | Espelho Google (PR-2) |
|---|---|---|
| Técnico | camadas circle r16 (borda) + r13 (avatar) + iniciais | `.opmap-gtech` 32px, `background=getAvatarColor(id)`, `border-color=getTechnicianBorderColor` (âmbar se `isStale`), iniciais `getInitials` |
| Grupo "fora de serviço" | `circle-opacity .75` | `[data-off="true"] { opacity: .75 }` |
| OS | `icon-image wo-diamond-{prio}[-sel]` (SVG 22px rotate 45) | `.opmap-gos` 22px `rotate(45deg)` radius 5 borda 2.5 branca, mesma cor por prioridade |
| Seleção da OS | `wo-selected-ring` + variante `-sel` | `outline 3px rgba(59,130,246,.65) offset 2` |
| Pulso M-5 | camada `wo-pulse` (rAF) | `.opmap-gos--pulse` (CSS, reduced-motion coberto) |
| Código da OS | `wo-label` `minzoom: 12` | `.opmap-gcode` renderizado a partir de `zoom >= 12` (estado alimentado pelo `idle`) |
| Rotas tracejadas | camada `line` + `line-dasharray [2.4, 2.8]` | `google.maps.Polyline` `strokeOpacity: 0` + `icons` (dash 6px / vão 7px = **as mesmas constantes** × largura) |
| Memória da visão | `center/zoom` iniciais + `moveend` | `element.center/zoom` no mount + listener **`idle`** (1º idle e views repetidas descartados) |
| Pan imperativo | `easeTo` + `setPadding` | `panTo` + `panBy((right-left)/2, (bottom-top)/2)` — o Google não tem padding de câmera |
| Popup do marker | `maplibregl.Popup` + `createRoot` | `InfoWindow` ancorada no `AdvancedMarkerElement` + `createRoot` (unmount adiado no `closeclick`) |
| Hover/clique do técnico | `mousemove`/`mouseleave` na camada | `mouseenter`/`mouseleave` + `gmp-click` no marker |
| Animação de posição | interpolação ease-out 550ms | rAF por marker com `interpolateCoords`/`OPERATIONS_MAP_ANIMATION_MS` |
| Câmera automática | **nenhuma** | **nenhuma** — `fitBounds`, `LatLngBounds`, focus-city e pan por seleção removidos |
| Controles | zoom bottom-right | `zoomControl` RIGHT_BOTTOM; `fullscreenControl:false` |
| Chrome passivo | inexistente | header/`Chip "Google Maps"`/subtítulo **removidos** (diretiva do dono) |

Fontes datadas (2026-08-06, docs oficiais): dashed line por `strokeOpacity: 0` + símbolo repetido
(`.../javascript/symbols`, "Last updated 2026-07-31 UTC"); `idle` = "map becomes inactive after
panning or zooming" (referência de `Map`); `InfoWindow.open({map, anchor})` aceita
`AdvancedMarkerElement` e `content` aceita `Element` ("Last updated 2026-07-31 UTC").

### 8.2 O que NÃO ficou equivalente — divergências DECLARADAS (não fingidas)

1. **Cartografia do basemap.** Com `mapId` a API **ignora `styles` em JS** (cloud-based styling), então
   o token-set claro "voyager-like" do nosso `mapStyle.ts` **não se aplica** ao Google. Os dois são
   claros; não são o mesmo mapa. Só um Map ID próprio no Cloud Console aproximaria — decisão de
   ativação, fora deste escopo.
2. **Moldura do popup.** A bolha/seta/botão-de-fechar são da `InfoWindow` do Google; só o **conteúdo**
   é o nosso (`OperationsOsMarkerPopup` dentro de `.opmap-gpopup`, com o mesmo vidro navy).
3. **Padding de câmera.** Não existe equivalente persistente do `setPadding`; o deslocamento do stack
   é emulado em pixels no `panTarget` (`panBy`). Fora do pan, o "centro" do Google é o geométrico.
4. **`moveend` × `idle`.** `idle` também dispara no assentamento do mount; o espelho descarta o
   primeiro e as views repetidas, senão o savenote acenderia sem o operador ter movido nada.

### 8.3 Decisão: o opt-in `VITE_MAPS_PROVIDER=google` **FICA** (recomendação do dev-mapas)

A paridade fechou, mas o gate **não** era só sobre paridade. Motivos registrados no código:
1. **Custo** — OpenFreeMap é US$ 0/keyless; Google Dynamic Maps é SKU **tarifado** (US$ 7,00/1.000
   após 10.000/mês). Cair no provedor pago só porque existe uma chave no ambiente = ligar serviço
   tarifado sem decisão de junta (§C7.1).
2. **Cartografia** (8.2.1) — o alvo pixel do protótipo é o basemap do MapLibre.

### 8.4 Faxina executada (todas confirmadas por grep antes da remoção)

- `clusterByProximity` · `pickFocusCluster` · `westFirstTieBreak` · `centroidOf` ·
  `FOCUS_CITY_CLUSTER_THRESHOLD_KM` · tipos `GeoPoint`/`Cluster`/`ClusterTieBreak` **removidos** de
  `mapMarkers.ts` (último consumidor era o canvas Google) + `frontend/tests/operations-map-focus-city.test.ts`
  removido do disco e do `test:smoke`. **`haversineKm` FICA** — é a base do `~km/~min` de `allocation.ts`.
- `OperationsDispatchActionsPanel.tsx` e `OperationsMapStatusBadge.tsx` **removidos** (órfãos; o
  primeiro só era exercitado por `smoke-flow`, que agora guarda a **ausência** das ações de gestão
  no mapa — elas vivem na tela Despachos, divergência 6).
- CSS órfão removido: `.operations-map-dispatch-actions*`, `.gmp-operator-pin*`, `.gmp-workorder-pin*`,
  `.operations-map-canvas__gmaps` → o espelho passou a usar `.opmap-g*`.
- Props MORTAS do GeoJSON de técnico (`ringColor`, `staleLevel`, `available`) removidas: nenhuma
  camada as lia e `staleLevel` era o último carregador das **faixas 3/10 min dentro do mapa**
  (no mapa vale o limiar único de 15 min — `isStale`). `getStaleLevel`/`STALE_*` **ficam vivos**:
  a aba "Mapa da OS" (`MapTab.tsx`) os usa — há guard anti-remoção-cega no teste de faxina.
- **Não removido (fora da lista, declarado):** `OperationsMapChips.tsx` segue no disco **sem
  consumidor** desde que o dono mandou desmontar os chips. O guard do `operations-map-layout` que
  lia esse arquivo para "provar" o botão *Tentar novamente* foi corrigido para ler a **página**
  (guard sobre arquivo não renderizado mente). Decisão de remover/re-montar: `planejador-mapas`.

### 8.5 e2e Playwright do mapa

`tests/e2e/critical-flows.spec.ts` reescrita para a tela real (palco `.opmap-stage`, stack de 3
painéis, legenda-filtro com toggle e `aria-pressed`, ausência de `.opmap-chips`, estado honesto
D-007). **Esta spec NÃO roda no CI** — por isso o teste de faxina passou a guardá-la por texto
(nada de "Mapa placeholder"/"Despachos Operacionais"; presença das âncoras da tela nova).

### 8.6 Bateria do PR-2 (execução real)

`npm --prefix frontend run check` ✓ · `test:smoke` **1059/1059** (era 1052: +16 google-canvas
reescrito, +8 faxina, −10 focus-city, −7 casos antigos do google-canvas) · `build` ✓ · backend
`CORE_SAAS_PERSISTENCE=memory` + `node --test --import tsx tests/*.test.ts` → **2110 pass / 6 skip /
0 fail** (inalterado) · `git diff --check` limpo · guard de CSS (`pattern-css-guard`) verde.
