# Redesign de LAYOUT do Mapa Operacional — mapa é o herói (feedback URGENTE do dono)

**Data:** 2026-07-19 · **Motivo:** o grid de 3 colunas [chamados|mapa|técnicos] do M-1 ESPREMEU a largura do mapa (o dono
pediu altura, ganhou altura, mas perdeu largura → mapa renderiza ~524px/45% a 1440px). Junta de layout (3 pesquisas web +
síntese frontend-pixel-master). PD-005 em docs/omega-pd.md. **Supersede o grid do M-1** (revisão por feedback do dono).

## Achado das pesquisas (Samsara/Onfleet/ServiceTitan/Uber/fleet-UX 2024-2026)
Sistemas reais NÃO usam 3 colunas. Padrão = **mapa full-bleed + UM painel master colapsável + técnicos como MARCADORES no mapa
+ detalhe em drawer/popover SOBRE o mapa**. Overlays translúcidos (glass) preservam o mapa. Alerta = toast + pin pulsante +
badge. Maximizar = mapa full + card glass no 4º quadrante. Proporção: mapa ~70-80% largura; painel ~300-360px colapsável a ~56px.

## DECISÃO (mapa = herói)
**Matar o grid.** Mapa full-bleed (100% da largura útil × `clamp(760px,82vh,960px)` de altura). Os painéis viram **overlays de
VIDRO NAVY** ancorados nas bordas do mapa (não colunas que subtraem largura). `setPadding`/`center-offset` do MapLibre mantém
os pins livres sob os overlays.

- **Chamados** = rail de vidro à ESQUERDA, **ABERTO por default** (`clamp(300px,24vw,358px)`), rolável; colapsa p/ 56px + badge.
- **Técnicos** = rail de vidro à DIREITA, **COLAPSADO por default** (status já vive nos marcadores; expande em 1 clique); reusa
  `OperationsOperatorList` (cartões compactos).
- **Detalhe da seleção** = mantém a faixa `.operations-map-detail` ABAIXO do stage (preserva OperationsOperatorDetailPanel,
  WorkOrdersWithoutLocationPanel, alertas de privacidade/limite — markers exigidos pelos testes). Seleção dá pan no mapa.
- **Legenda** = `OperationsMapLegendFooter` na base (M-2); os rails ficam `bottom: calc(var(--space-12)+40px)` p/ não cobri-la.
- **Maximizar** = o STAGE vira `position:fixed; inset:0; z-index:60` (NÃO remontar o mapa — mesma instância), colapsa os 2 rails,
  mostra as OS que chegam como **card glass no 4º QUADRANTE** (canto inf. dir.): `absolute; right:16; bottom:56; width:clamp(320px,26vw,420px);
  max-height:46%; overflow:auto; background:rgb(15 23 34/72%); backdrop-filter:blur(16px)`. **Esc** + focus-trap + legenda visível.
- **CRÍTICO:** MapLibre não redimensiona sozinho quando o container muda sem resize de janela → incrementar `resizeSignal` e
  chamar `mapRef.current?.resize()` (Libre) / `google.maps.event.trigger(innerMap,"resize")` (Google) **~220ms** após a
  transição (colapsar/maximizar). Aplicar `setPadding(mapPadding)` no fitBounds/easeTo.

## Responsividade
- ≥1400px: default (chamados aberto 358 + técnicos colapsado). 1100-1400: rails `clamp(300px,24vw,340px)`, mapa full-bleed.
- <1100px: os 2 rails default COLAPSADOS (faixa 56px sobre o mapa); expandir vira sheet ~80% por cima (mapa nunca vira coluna).
- <768px (sidebar oculta): mapa full-width `clamp(420px,60vh,640px)`; rails empilhados abaixo como cards (fallback baixo risco).

## Vidro navy / contraste / a11y / §11
- Vidro: `background:rgb(15 23 34/90%); backdrop-filter:blur(18px)(+-webkit-); border:1px solid rgb(148 163 184/22%);
  border-radius:var(--radius-8); box-shadow:0 10px 30px rgb(2 6 23/45%)`. Fallback `@supports not (backdrop-filter:blur(1px)){background:rgb(15 23 34/97%)}`.
- Recolorir conteúdo do rail p/ contraste ≥4.5:1 sobre navy: títulos `#f1f5f9`, texto `#cbd5e1`, links `#7cc4e6`, cartão de
  operador `rgb(30 41 59/70%)`; `.operations-map-rail .ui-card{background:transparent;border:0;box-shadow:none;padding:0;color:inherit}`.
- A11y: toggles = `<button>` com aria-expanded/aria-pressed + aria-label + alvo ≥44px + foco visível; maximizar = role="dialog"
  + focus-trap + Esc; `@media (prefers-reduced-motion:reduce)` desliga pulso e transições de rail.
- §11: identidade navy, PT-BR ("Chamados que chegam", "Técnicos de Campo", "Focar mapa", "Maximizar"), header/KPIs/filtros ACIMA
  do stage intactos. Divergência intencional (mapa-herói supera o PNG) registrada A2.

## Passo-a-passo (dev-mapas)
CSS (app.css): renomear `.operations-map-layout`→`.operations-map-stage` (remover grid; `position:relative;isolation:isolate`);
`.operations-map-stage__map`; criar `.operations-map-rail`(absolute, vidro, flex-column, width clamp) + `--calls{left}`/`--techs{right}`
+ `[data-collapsed=true]{width:56px}` + `__body{overflow-y:auto}` + header/toggle/badge; migrar os overrides de tabela→cartões p/
`.operations-map-rail--techs`; `.operations-map-stage--maximized{position:fixed;inset:0;z-index:60}` + `.operations-map-quadrant` +
`.operations-map-stage__maximize`; atualizar os media queries que citam `.operations-map-layout` (app.css ~:2765 e ~:2898).
TSX: novo `components/OperationsMapStage.tsx` (slots map/calls/techs; estados callsCollapsed/techsCollapsed/maximized; rails +
botão Maximizar + card 4º quadrante; Esc + focus-trap; expõe resizeSignal). Em OperationsMapPage trocar a `<section .operations-map-layout>`
pelo `<OperationsMapStage map={<OperationsMapCanvas/>} calls={<OperationsIncomingCallsList/>} techs={<OperationsOperatorList/>}/>`;
manter a faixa `.operations-map-detail` abaixo. Nos 2 canvases: aceitar `resizeSignal`+`mapPadding` e chamar resize()+setPadding.
Testes: REESCREVER operations-map-layout.test.ts (os asserts do grid 3-col vão falhar por design) → stage sem grid-3-col; rail
absolute+vidro; colapso por data-collapsed; card 4º quadrante + botão Maximizar; preservação dos markers Ω1.

## Trade-offs decididos
Vidro-sobre-bordas (endossado pelas pesquisas; setPadding evita pin oculto). Fallback se a junta vetar vidro: `grid minmax(0,1fr)
minmax(300px,360px)` (mapa 70-74% + 1 rail à direita com tabs chamados/técnicos). Técnicos colapsado por default (status já nos
marcadores; reversível por 1 flag). Detalhe abaixo (não drawer) nesta fase.

## Escopo deste PR (LAYOUT) vs blocos seguintes
Este PR entrega o CONTAINER: stage full-bleed + rails de vidro (chamados/técnicos) + MAXIMIZAR + 4º quadrante + resize. Os rails
recebem os componentes REAIS depois: **M-4** = lista de chamados com prioridade+SLA-proxy (hoje placeholder honesto no rail
esquerdo); **M-5** = alerta de OS nova (toast+badge+pulse); **M-3** = camada/realce de técnicos (redone sobre o layout novo).
Sem provider novo, sem SKU, US$0 → sem junta-5. LGPD zero-coordenada. Regra do espelho (MapLibre↔Google).
