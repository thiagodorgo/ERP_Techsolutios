# Ata · WS-CARDS-CHARTS-F2 (frontend PR2a) — fan-out de cards clicáveis (3 superfícies operacionais)

- **Data:** 2026-07-20 · **Branch:** `feat/frontend-fanout-clickable-cards-2a` · orquestrado via Workflow (plan → dev → junta).

## Escopo
**20 cards** de KPI estáticos → `ClickableKpiCard` com pop-up temático **honesto (D-007 — só dado já carregado, nunca
fabrica/soma)** em 3 superfícies operacionais de maior valor:
- **Dashboard (9 KPIs)** — `dashboard-kpi-detail.ts`: "Concluídas"/"OS hoje" com body **chart** da série real
  (reusa `useWorkOrderTimeseries`; só quando `source==="api" && !forbidden && points>0`, senão **explain** honesto);
  abertas/andamento/atrasadas/cadastro com explain + cta.
- **Ordens de Serviço (4 cards inline do `WorkOrdersPage`)** — `work-orders-kpi-detail.ts`: breakdown "participação no total"
  a partir de `items` já contados (`total = items.length`).
- **Despachos (7 cards de `DispatchesSummaryCards`)** — `dispatches-kpi-detail.ts`: breakdown por status do `summary` já
  calculado; card Total com remainder "Rascunho" = `max(0, total − Σ5buckets)` rotulado.

**Achado do dev (validado):** `WorkOrdersSummaryCards` é **órfão** (nenhuma página o renderiza; só aparece em si mesmo).
Tornados clicáveis os **4 cards REAIS** que o usuário vê no `WorkOrdersPage`; o componente morto ficou intocado (envolver
dead code não gera valor).

## Time (Workflow: plan → dev → junta)
| Papel | Veredito |
|---|---|
| planejador-sênior (recon estruturado) | spec por card (chart/breakdown/explain) só com dado carregado |
| dev frontend | implementado; check/build/test:smoke verdes (602→611, +9) |
| **analizador** (correção técnica) | **APROVADO** (BAIXA do 403 → corrigida no ciclo de fix) |
| cognicao-visual (§11) | 1ª execução falhou no schema; **re-executada → APROVADO** |
| **coordenador-de-acessos** | 1ª: **APROVADO_CONDICIONADO (2 MEDIA)** → após fix: **APROVADO (0 condição)** |

## Ciclo de correção (2 MEDIA de acesso — sanadas)
- **MEDIA 1 (403 desnecessário):** o hook `useWorkOrderTimeseries` foi levantado ao topo do `DashboardPage` e passou a rodar
  para todos → papéis sem `work_orders:read` disparavam 403 em mount + auto-refresh (regressão do gating do #246).
  **Fix:** hook ganhou `enabled: boolean`; `DashboardPage` passa `enabled = can("work_orders:read")`; quando false o hook
  **não faz fetch** (refresh early-return cobre mount e auto-refresh), nasce `forbidden:true` (card mostra §7 "Acesso não
  permitido") e os pop-ups de chart degradam para explain. Teste dedicado prova `fetchCount === 0`.
- **MEDIA 2 (CTA para rota proibida):** CTAs anexadas só por "rota existe". **Fix:** `buildDashboardKpiDetail` recebe `can` e só
  anexa cta quando `can(<permissão exata do guard>)`: `/work-orders`→`work_orders:read`, clientes→`customers:read`,
  viaturas→`vehicles:read`, equipes→`teams:read`, serviços→`service_catalog:read` (não `services:read`). Sem permissão → cta
  omitida (pop-up sem botão). Testes provam a omissão.

**Resultado final: 3 APROVADO — 0 REPROVADO, 0 BLOQUEIA, 0 ALTA, 0 MEDIA.** MERGE.

## Nit BAIXA (registrado, não bloqueia)
- `.kpi-card-clickable` usa `border-radius:14px` vs 12px dos cards internos (2px, imperceptível). **Deixado como está:**
  o wrapper é global e o FinanceiroPage envolve cards de raio 14 — uniformizar para 12 regridiria aquela tela. Sem ação.

## Confirmações da junta
- D-007: todo número do pop-up vem de dado já carregado; chart só com `source==="api"`; breakdown/explain sempre honesto.
- §11: cards apenas ENVOLVIDOS (children preservados), sem reescrita; grade/tom/foco/a11y intactos; cópia PT-BR acentuada.
- Acesso: backend autoritativo; pop-ups só reapresentam o que a página já mostra ao papel; sem vazamento inter-papel/tenant;
  sem termo técnico/tenant_id (§2.8/§3); superfícies OS/Despachos não expõem nada além dos agregados já carregados.

## Rastreabilidade
ID: WS-CHARTS-F2-fanout-2a · PR: (após `gh pr create`) · merge_commit/approved_head null na autoria.
Backfill do #246 (PR1): pr=246, merge_commit=`59ccf60`. frontend_smoke 602→615 (+13). `.claude/skills/*` untracked EXCLUÍDOS.
Próximo: **PR2b** — mesmo fan-out em Estoque, Remunerações, frota (Multas/Abastecimento/Seguros/Danos/Manutenção) e plataforma.
