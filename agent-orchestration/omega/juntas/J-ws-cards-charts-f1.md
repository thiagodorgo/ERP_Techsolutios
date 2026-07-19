# Junta J-ws-cards-charts-f1 — WS-UI-CARDS+CHARTS Fase 1

- **Data:** 2026-07-19
- **Entrega:** UI viva (mandato do dono) — cards estáticos → clicáveis com pop-up sobre o tema; KPIs → gráficos temporais.
  Fase 1 = primitivos + flagship financeiro, **zero backend novo**.
- **Tipo:** bloco normal. **Decisão de dependência (PD-004): NÃO adicionar lib** (SVG inline) → deixou de ser decisão
  crítica, dispensou a junta-5 unânime. Maioria de ≥3.
- **Branch:** `feat/frontend-ws-cards-charts-fase1`.

## Processo
1. **PD-004** (pesquisa web ≥5 fontes, `agente-pesquisador-web`): comparou libs (Recharts/visx/Nivo/Chart.js/ECharts/uPlot/
   Tremor) × SVG inline. Recomendação: **SVG inline zero-dep** para KPI/sparkline (o pedido do dono); Recharts só sob demanda
   futura via lazy. Salvo em `docs/omega-pd.md` (PD-004) — repo mantém bundle enxuto.
2. **Design 3-lentes** (workflow): UX do pop-up + conteúdo honesto por categoria; contrato do `<TrendChart>`; estratégia de
   dados. Achado-chave: só o `cashFlow` é série REAL; demais KPIs são snapshot → NÃO fabricar série (D-007) → variantes
   `breakdown`/`explain`.
3. **Implementação** (primitivos + flagship) + 8 testes de estrutura. tsc/build/smoke verdes.
4. **Junta de avaliação** (3 agentes).

## Composição e votos
| Agente | Lente | Veredito |
|---|---|---|
| general-purpose | correção & a11y (matemática SVG, dialog, ClickableKpiCard) | **APROVADO_CONDICIONADO** |
| cognicao-visual | fidelidade §11 (cor, layout, afordância, pop-up) | **APROVADO_CONDICIONADO** |
| validador-mestre | regras/DoD/honestidade (zero dep, sem série fabricada) | **APROVADO** |

**Resultado: 1 APROVADO + 2 APROVADO_CONDICIONADO — 0 BLOQUEIA, 0 REPROVADO. Maioria → MERGE após sanar condições.**

Confirmações: dialog a11y correto (focus trap Tab/Shift+Tab, Esc com stopPropagation, backdrop por onMouseDown, retorno de
foco via cleanup, aria-labelledby); SSR-safe (document só em handler/effect — provado pelos testes); ClickableKpiCard sem
nesting interativo; matemática do TrendChart correta (span guardado, n=1, valores iguais); **zero dependência nova**;
nenhuma série fabricada (breakdown usa DirectionSummary real; selo mock/fallback suprime o gráfico).

## Condições sanadas
- **ALTA (cognicao) — cor de série:** barras usavam tokens de STATUS (`danger #DC2626` = alarme/ação destrutiva por J-002) →
  "saída" lia como erro, e a cor do protótipo não foi preservada. **Fix (D-CHART-SERIE-TOKENS, registrado em decisoes.md):**
  tokens dedicados `--color-chart-inflow #10b981` / `--color-chart-outflow #f87171` em `tokens.css`, consumidos via a prop
  `color` da série — cor do protótipo preservada, sem hex solto, sem alarme em data-viz (A2: sem consolidação silenciosa).
- **MEDIA (a11y) — barras com valor NEGATIVO não renderizavam** (colapsavam a h=0): `renderBars` corrigido (rect entre
  min/max da base) + **teste** de série com sinal.
- **MEDIA (cognicao) — sub-layout:** meses colados às barras (antes vinham depois da legenda) + legenda centralizada;
  `TrendChart` default legend também centralizada.
- **BAIXA (cognicao) — raio:** `.kpi-card-clickable` 12→14px (casa com o card interno).

## Condições DEFERIDAS (pendências)
- **BAIXA (cognicao) — header do Financeiro sem ações à direita** (§11 #4, pré-existente) → `P-FINANCE-HEADER-ACTIONS`.
- **BAIXA (a11y) — círculos de tooltip em line/area distorcem sob preserveAspectRatio=none** (LATENTE — nenhum caller usa
  line/area+tooltip hoje: finance=bar, Sparkline=area sem tooltip). Corrigir ao primeiro caller (hit-rect transparente).

## Próximo (Fase 2)
Agregado backend de série temporal (ex.: `GET /work-orders/summary/timeseries` por `created_at`) → `chart` real em 3-4 KPIs
snapshot de maior valor. Depois, fan-out dos cards clicáveis para as demais telas (o `KpiDetail` é reutilizável).

## Rastreabilidade
- ID: WS-UI-CARDS+CHARTS-F1 · PR: (após `gh pr create`) · merge_commit/approved_head: null na autoria.
- PD-004: `wf` (agente-pesquisador-web) · design: `wf_6e3858ce-07e` · junta: `wf_ca66fd73-973`.
- KPI: frontend_smoke 516→524. `.claude/skills/*` untracked EXCLUÍDOS do commit.
