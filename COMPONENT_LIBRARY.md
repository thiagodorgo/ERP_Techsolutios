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
- `ColumnBars` (`frontend/src/components/charts/DayBars.tsx`, B-SAN3-12c) — colunas acionáveis que filtram a lista (meses da conta, faixas de idade das pendências): número literal opcional, barras por tom (`inflow`, `outflow`, `age-*`; e `agenda-*` desde o B-APAR-OS, as faixas da agenda de Ordens de Serviço) e rótulo, com `aria-pressed`, hover e foco visível. A escala é geometria; número ausente vira "—" e não desenha barra.
- `CategoryDonut` (`frontend/src/components/charts/CategoryDonut.tsx`, B-APAR-OS) — rosca SVG inline de até 5 categorias genéricas (cor e rótulo por segmento) com número central; a legenda é composta por botões que filtram (`.ui-category-donut__item`, `aria-pressed`, hover e foco visível). Contagem inválida ou mais de 5 categorias falha fechado ("Contagem indisponível"), nunca zero. Nasceu porque o `ReconcileDonut` é preso à semântica de conciliação.
- `ScatterPlot` (`frontend/src/components/charts/ScatterPlot.tsx`, B-ASS-10b) — dispersão SVG inline de pontos genéricos `{ key, x, y, tone, ariaLabel, label? }` com linhas-guia pela origem (`{ slope, label, tone }`, ex.: custo = 100 % e 80 % da assinatura) que pintam as faixas entre elas. Cada ponto é botão (`.ui-scatter__point`, Tab, Enter/Espaço, `aria-pressed`, anel de foco visível); ponto sem x vai para a faixa à esquerda (`nullLaneLabel`). A cor vem do tom que o chamador passa (a regra é do servidor); o texto de escala dos eixos é calculado no componente e marcado `data-escala`. Sem ponto desenhável → "Sem dados para comparar.". Nasceu na aparência B do Cloud Billing (`screen-refs/platform-cloud-billing-3opcoes.reference.html`).
- `StepBridge` (`frontend/src/components/charts/StepBridge.tsx`, B-ASS-10b) — ponte em degraus SVG inline: `steps[{ key, label, value, kind: "start" | "minus" | "end", displayValue, tone?, note? }]`. O valor final é o literal recebido (`displayValue`); a soma dos degraus é só geometria e nunca vira texto. Cada degrau é botão que filtra (`.ui-step-bridge__step`, `aria-pressed`, hover e foco visível na faixa); qualquer valor ausente → "Margem indisponível.". Nasceu na aparência C do Cloud Billing; o `BalanceBridge` continua como está (`P-ASS10B-PONTE-UNICA`).
- `KpiStatCard` com `footer` (B-ASS-10b) — rodapé opcional no fim do card (`.pat-kpi__footer`), para a tendência (`Sparkline`) dos indicadores grandes da aparência B do Cloud Billing; sem a prop, o card rende igual a antes.
- `MonthSeriesChart` (`frontend/src/components/charts/MonthSeriesChart.tsx`, B-ASS-10b) — série de meses SVG inline em 3 modos: `lines` (duas linhas com a faixa da diferença entre elas), `bars` (duas barras por mês) e `margin` (uma coluna por mês, verde ou vermelha, com o valor e o % em cima). Pontos `{ key, label, sublabel, a, b, state, ariaLabel, topLabel?, topSubLabel? }`: a tela passa só geometria (`a`, `b`) e os textos já formatados. Todo mês é botão (Tab, Enter/Espaço, `aria-pressed`, hover e foco visível) e nenhum é retirado: com `a` e sem `b`, o segundo valor é tracejado; mês com falha ou sem dado não desenha barra e diz isso no texto acessível. O EIXO (escala em reais, a forma curta da referência) é calculado no componente e cada `<text>` de escala é marcado `data-escala`. Nasceu nas 3 aparências do Cloud Billing ("Assinaturas × custo · 6 meses", "6 meses: assinaturas, custo e margem", "Margem mês a mês").
- `ProportionBars` e `ProportionBar` (`frontend/src/components/charts/ProportionBars.tsx`, B-ASS-10b) — barras horizontais de proporção: `ProportionBars` é a lista de linhas-botão que filtram (`{ key, label, value, displayValue, color }`, `aria-pressed`, `data-alvo`, hover e foco visível; o tamanho usa o valor absoluto; valor ausente → barra vazia); `ProportionBar` é a mini-barra inline de uma célula (valor em relação a `max`, com piso visível). A tela passa só geometria e o texto formatado; a proporção nasce no componente. Nasceu no Cloud Billing ("Para onde vai o custo", "Maior custo por organização", a coluna "%" e o "Peso no custo").
- `.pat-os-tab:hover` (`frontend/src/styles/app.css`, B-SAN3-12c) — nas aparências B e C do Financeiro (`.financeiro-b`, `.financeiro-c`), as abas do padrão escurecem o texto ao passar o ponteiro, sem mudar o estado de repouso nem o ativo. As outras telas que usam `.pat-os-tabs` não mudam.
- `RequirementChecklist` (`frontend/src/components/ui/RequirementChecklist.tsx`, B-USERS-ACESSO-SEG) — lista de requisitos que se marcam: cada item é pendente, atendido ou não atendido, com ícone (`Circle`, `CircleCheck`, `CircleX`) e o estado também em texto para o leitor de tela (`.sr-only`), nunca só a cor. Quem calcula o estado é a tela. Nasceu na aparência B da troca de senha (`screen-refs/troca-senha-3opcoes.reference.html`).
- `PasswordStrengthMeter` e `passwordStrength` (`frontend/src/components/ui/PasswordStrengthMeter.tsx`, B-USERS-ACESSO-SEG) — medidor de força de senha só visual (4 barras e "Força: fraca/razoável/boa/forte"; tamanho, maiúscula com minúscula, número e símbolo), escondido do leitor de tela; não bloqueia e não é regra: quem decide a senha é o servidor. Aparência B da troca de senha.
- `StepList` (`frontend/src/components/ui/StepList.tsx`, B-USERS-ACESSO-SEG) — indicador de etapas: lista ordenada em que cada etapa está atual (`aria-current="step"`), feita (✓, selo com "etapa concluída" para o leitor de tela e uma ação opcional no cabeçalho, com `.ui-steps__action`) ou futura (conteúdo escondido, título e nota opcionais). Aparência C da troca de senha; no app de campo, o mesmo desenho do `WorkOrderStepper`. O campo de senha dessas telas é o `PasswordInput` que já existia na biblioteca.

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
