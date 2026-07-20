# Ata · WS-CARDS-CHARTS-F2 (frontend PR2b) — fan-out de cards clicáveis (restante das telas)

- **Data:** 2026-07-20 · **Branch:** `feat/frontend-fanout-clickable-cards-2b` · orquestrado via Workflow (plan → dev → junta).

## Escopo
**22 cards** de KPI estáticos → `ClickableKpiCard` com pop-up **honesto (D-007)** em **6 telas de DADO REAL**:
- **Estoque (4)** — `inventory-kpi-detail.ts`: Itens ativos [breakdown], Abaixo do mínimo [explain +cta same-route], Precisam
  repor [explain +cta gated `purchase_orders:read`], Movimentações [explain, source de movimentações].
- **Remunerações (3, escopo `all`)** — `commissions-kpi-detail.ts`: Total geral, Operadores, Comissões [explain] (reusa
  `operatorCount`/`commissionCount` já computados — não re-soma).
- **Multas (3)**, **Abastecimento (4)**, **Seguros (4)**, **Danos (4)** — `fines/fuel/insurance/damages-kpi-detail.ts`.

**20 explain + 2 breakdown, ZERO charts** — nenhuma série real fora do Dashboard; telas mock NÃO ganham chart enganoso.
O `source` de cada hook é threaded para o selo honesto ("Dados de exemplo" quando mock/fallback).

## Decisão honesta — telas PULADAS (D-007)
- **PlatformOverviewPage / PlatformHealthPage / PlatformTenantDetailPage** — 100% andaime hardcoded (KPIS/MRR_BARS/ACTIVITY/
  ORG_ROWS/METRICS/SERVICES/STATS constantes; sem hook/service/`/api`; TenantDetail nem lê o `:tenantId`). Envolver criaria
  pop-ups sobre números decorativos fabricados. **Registrado `P-PLATFORM-MOCK-WIRING`** (precisa wiring de backend real).
- **ManutencaoPage** — sem card de número (só abas de fluxo + filtros); nada estático para tornar clicável.

## Time (Workflow: plan → dev → junta)
| Papel | Veredito |
|---|---|
| planejador-sênior | inventário + spec por card (mock→sem chart) + telas a pular |
| dev frontend | implementado; check/build/test:smoke verdes (615→624, +9) |
| **analizador** (correção técnica) | **APROVADO** |
| **cognicao-visual** (§11) | **APROVADO** |
| **coordenador-de-acessos** | **APROVADO** |

**Resultado: 3 APROVADO — 0 REPROVADO, 0 BLOQUEIA, 0 ALTA, 0 MEDIA.** MERGE.

## Nits BAIXA — tratamento
- **fuel-kpi-detail.ts (caption km/L para 0 viaturas):** o pop-up dizia "0 viatura(s) com consumo derivado" enquanto o card
  mostra "Sem consumo derivado na janela". **CORRIGIDO** (caption condicional, bate com o card).
- **FinanceiroPage ctas sem gating (follow-up apontado pela junta, PR anterior):** **DOBRADO neste PR** — as 3 ctas
  (Ver cobranças ×2, Ver pagamentos) agora só aparecem com `can("financial_titles:read")` (permissão exata dos guards
  `/finance/charges` e `/finance/payments`). Consistente com o padrão de gating do PR2a.
- **Layout só-no-hover (grid stretch) / guard de teste assertNoChart:** cosméticos/robustos hoje; sem ação.

## Confirmações da junta
- D-007: todo número do pop-up vem de dado já carregado; ZERO aritmética nos builders (passthrough puro); nenhum chart fora
  do Dashboard; telas mock marcam `source="mock"` → modal mostra "série indisponível" honesto.
- §11: cards apenas ENVOLVIDOS (JSX interno preservado byte a byte); affordância/foco/a11y intactos; cópia PT-BR acentuada.
- Acesso: nenhum card dispara fetch (pop-up apresentacional; dados vêm dos hooks atrás do PermissionGuard da rota); cta
  cross-route gated pela permissão exata; sem vazamento inter-organização/tenant_id nas telas de plataforma (que ficaram fora).

## Rastreabilidade
ID: WS-CHARTS-F2-fanout-2b · PR: (após `gh pr create`) · merge_commit/approved_head null na autoria.
Backfill do #247 (PR2a): pr=247, merge_commit=`308c9ef`. frontend_smoke 615→624 (+9). `.claude/skills/*` untracked EXCLUÍDOS.
**Fecha o fan-out de cards clicáveis** nas telas de dado real. Plataforma fica para `P-PLATFORM-MOCK-WIRING` (wiring real).
