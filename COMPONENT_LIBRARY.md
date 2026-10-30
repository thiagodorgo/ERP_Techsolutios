# ERP Techsolutions — Component Library

## Purpose
Initial shared component library for React and Flutter, aligned with the ERP Techsolutions design system and the operational mission of preserving clarity, execution speed, traceability, and continuity across modules.

## Layers
### Tokens
- color tokens
- typography tokens
- spacing tokens
- border radius tokens
- elevation tokens
- status tokens
- approval-state tokens
- audit and exception tokens

### Primitives
- text
- icon
- button
- input
- checkbox
- radio
- switch
- select
- date picker
- time picker
- divider
- avatar
- tooltip

### Composites
- search bar
- filter bar
- data table
- summary card
- KPI card
- timeline row
- approval panel
- audit row
- tenant switcher
- role badge
- permission summary
- attachment block
- evidence capture block
- blocked-state banner
- escalation summary panel

### Domain components
- work order header
- work order execution checklist
- field visit timeline
- inventory movement card
- approval chain panel
- billing status panel
- tenant policy summary
- authentication context banner
- exception / escalation card
- service SLA indicator
- approval decision card
- evidence review panel
- active-tenant context bar

### Page sections
- dashboard overview section
- module header with contextual actions
- list-detail layout
- approval inbox section
- audit explorer section
- field execution section
- finance summary section
- tenant administration section
- blocked or pending resolution section

## React priorities
1. app shell and navigation
2. auth context wrappers
3. dashboard and module layout primitives
4. table, filters, and status components
5. approval and audit components
6. work-order and field-service domain components
7. tenant context, permission, and exception surfaces

### Registro — componentes React na biblioteca (por bloco)
- `DenseExpandableRow` (`frontend/src/components/dense-list/`, B-SAN3-12b) — linha de uma altura que abre o detalhe logo abaixo, no padrão `D-PADRAO-BLOCOS-CLICAVEIS`: sem botão na linha, clique/Enter/Espaço alternam, Escape fecha; texto longo corta com reticências e leva o texto inteiro no `title`. Usa as classes `.pat-ab-row`/`.pat-ab-detail-row` que já existem.
- `DenseTable` com `renderDetail` + `expandedKey` (+ `cellTitle`, coluna `width`) (B-SAN3-12b) — vira a lista `.pat-ab-table` do mesmo padrão, um detalhe aberto por vez; sem `renderDetail` nada muda para quem já a usa.
- `KpiStatCard` com `pressed` (B-SAN3-12b) — indicador que FILTRA: com `onClick`, publica `aria-pressed` (bloco clicável que leva à lista filtrada).
- `.pat-kpi-row--6` (CSS, B-SAN3-12b, E3) — grade de 6 indicadores ao lado de `--4`/`--5`; o valor do `KpiStatCard` fica a 18 px (15,5 px até 1340 px), sem quebra e com reticências, para que o dinheiro caiba inteiro a 1280, 1366 e 1440 px (números da opção A do Financeiro). As outras telas seguem a 27 px.
- `DenseTable` com `renderDetail` + coluna `align: "right"`/`tabular` (CSS, B-SAN3-12b, E3) — a lista `.pat-ab-table` passa a alinhar à direita e tabular as colunas de dinheiro, espelhando `.dense-table` (`.pat-ab-table th.dense-col-right`, `.pat-ab-row td.dense-col-right`, `…dense-col-tabular`).
- `BalanceBridge` (`frontend/src/components/charts/`, B-SAN3-12c) — ponte SVG inline do saldo por conta; recebe abertura, entradas, saídas e saldo literal já calculados pelo servidor. Entradas/Saídas são filtros acessíveis por clique, Enter e Espaço, com hover e foco visível na faixa da coluna (`.ui-balance-bridge__hit`) e estado pressionado; `labelFormat` opcional encurta o rótulo sobre a barra sem mudar o texto acessível; ausência de qualquer valor vira estado indisponível.
- `ReconcileDonut` (`frontend/src/components/charts/`, B-SAN3-12c) — rosca SVG inline com segmentos disjuntos: conciliados sem ressalva, ressalva de valor, ressalva de data e a conciliar. O total conciliado inclui ressalvas; inconsistência/ausência falha fechado. A legenda é composta por botões de filtro (`.ui-reconcile-donut__item`: rótulo, trilho proporcional e contagem) com `aria-pressed`, hover e foco visível.
- `DayBars` (`frontend/src/components/charts/`, B-SAN3-12c) — barras acionáveis de movimento diário vindas do agregado (`.ui-day-bars__day`: dia da semana, número, barras, contagem e pendências), com hover, foco visível e destaque de hoje e do fim de semana; com `rangeDates`, todo dia do período vira coluna e o dia sem bucket mostra "—", sem valor nem barra: ausência nunca vira zero.
- `ColumnBars` (`frontend/src/components/charts/DayBars.tsx`, B-SAN3-12c) — colunas acionáveis que filtram a lista (meses da conta, faixas de idade das pendências): número literal opcional, barras por tom (`inflow`, `outflow`, `age-*`) e rótulo, com `aria-pressed`, hover e foco visível. A escala é geometria; número ausente vira "—" e não desenha barra.
- `.pat-os-tab:hover` (`frontend/src/styles/app.css`, B-SAN3-12c) — as abas do padrão escurecem o texto ao passar o ponteiro; acréscimo da biblioteca que vale para toda tela que usa `.pat-os-tabs`, sem mudar o estado de repouso nem o ativo.

## Flutter priorities
1. app shell and auth context
2. offline-aware list and detail screens
3. work-order execution widgets
4. media/evidence capture widgets
5. status, approval, and sync-state widgets
6. tenant and role-aware navigation blocks
7. blocked-state, retry, and escalation widgets for field execution

## Cross-platform rules
- token names should map cleanly across React, Flutter, and Figma
- semantic state names must remain identical
- domain components should preserve the same business meaning even when UI structure differs by platform
- mobile should optimize field execution; web should optimize coordination, administration, and dense operational control
- permission, approval, exception, and audit semantics must remain consistent across platforms
- component naming should make traceability between design, requirements, and implementation easier

## Operational guidance
- component choices should reduce ambiguity in approval, ownership, and next action
- field-service components must support speed, evidence capture, and weak-connectivity realities
- admin and finance components must support dense data, clear states, and audit readiness
- tenant-sensitive and permission-sensitive context should be surfaced explicitly in relevant components

## Follow-up
This library is the baseline. Detailed per-module page/component mapping should be extended by the React and Flutter specialized skills and later decomposed into project documentation when module-level definition matures.
