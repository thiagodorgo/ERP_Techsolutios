# Ata · WS-CARDS-CHARTS-F2 (frontend PR1) — gráfico temporal real no Dashboard

- **Data:** 2026-07-20 · **Branch:** `feat/frontend-dashboard-timeseries-chart` · consome o agregado backend #245.

## Escopo
Card **"Volume de ordens de serviço"** (últimos 30 dias) no Dashboard Operacional consumindo
`GET /api/v1/operations/work-orders-timeseries` (#245). Novo submódulo `frontend/src/modules/dashboard/`
(types/adapter/service/hook) clonando o par `finance/dashboard/financial-summary`; `TrendChart` (SVG zero-dep, F1 #235)
com 3 séries diárias (Abertas=info/azul, Concluídas=success/verde, Canceladas=danger/vermelho). Labels dd/mm parseando o
civil `YYYY-MM-DD` **sem `new Date` ingênuo** (sem shift de fuso). RBAC reusa `work_orders:read`.

## Time novo (planejador-sênior → dev → analizador → aprovadores)
| Papel | Veredito |
|---|---|
| planejador-sênior (recon) | plano de ataque (2 PRs: gráfico agora, fan-out depois) |
| dev frontend | implementado; check/build/test:smoke verdes (597→602, +5); 0 backend tocado |
| **analizador** (correção técnica) | **APROVADO** |
| **cognicao-visual** (§11 fidelidade) | **APROVADO** |
| **coordenador-de-acessos** (cadeia de acesso) | **APROVADO** |

**Resultado: 3 APROVADO — 0 REPROVADO, 0 BLOQUEIA, 0 ALTA, 0 MEDIA. MERGE.** (Junta unânime.)

## Confirmações da junta
- **Fetch/envelope:** `apiData` desembrulha `{data}`; query `days` vs `from/to` mutuamente exclusiva;
  `ApiError.status===403` → `forbidden` distinto de erro genérico (`source:"fallback"`). Provado por teste (mock fetch 403).
- **D-007 / anti-fabricação:** `normalizeTimeseriesPoints` guarda `Array.isArray`, descarta item sem `date` string, coage
  contagem inválida/negativa/NaN→0; nenhuma soma/interpolação no front; vazio → `emptyLabel`.
- **Fuso:** `formatDiaMes` faz split de `YYYY-MM-DD` (sem `new Date(str)` → sem virada de dia UTC→local).
- **Estados §7:** pré-cheque `can("work_orders:read")` não monta o hook/fetch para papel sem permissão (evita 403 inútil);
  403 escapado → `EmptyState "Acesso não permitido"`; erro não-403 → `Alert` honesto; vazio → `emptyLabel`; loading → `Skeleton`.
- **Cadeia de acesso:** permissão do pré-cheque bate com o gate backend `requirePermission("work_orders:read")` (403 p/
  finance/inventory/support confirmado no `catalog.ts`); backend permanece autoritativo; caminho negado não vaza dado/tenant;
  o resto do Dashboard continua funcional (degradação graciosa só no card).
- **§11 fidelidade:** card usa a MESMA linguagem dos painéis irmãos (borda/raio 14/padding 20/tokens de cabeçalho); cópia
  PT-BR acentuada; cores semânticas corretas; sem andaime/badge/termo técnico; a11y (`ariaLabel` + `role="img"` do SVG).
- **Testes:** 5 subtests (normalização, não-array, mock, 403→forbidden, render 3 séries) registrados no `test:smoke`.

## Nits BAIXA (registrados, não bloqueiam)
- Markup do estado "Acesso não permitido" duplicado entre o branch `!can` (pai) e o branch `data.forbidden` (defesa em
  profundidade) — `DashboardPage.tsx`. Extração opcional; sem impacto funcional.
- Séries do gráfico usam tokens do DS (info/success) enquanto pontos dos painéis vizinhos usam hex inline no legado — o
  gráfico é o cidadão correto (§11 "nunca hex solto"); uniformizar o legado é nit opcional.
- Suíte backend local acusa 77 falhas pré-existentes (cascata de 500 por env sem JWT); 0 nova, 0 arquivo backend tocado,
  nenhum teste que lê `.tsx` por texto falhou; contrato do #245 (`tests/work-order-timeseries.test.ts`) 8/8 verde.

## Rastreabilidade
ID: WS-CHARTS-F2-frontend · PR: (após `gh pr create`) · merge_commit/approved_head null na autoria.
Backfill do #245 (backend): pr=245, merge_commit=`2ce3d5a`. frontend_smoke 597→602. Próximo: **PR2 — fan-out dos cards
clicáveis** (ClickableKpiCard) nas telas de maior valor (WorkOrders/Dispatches summary, Estoque, Remunerações, frota,
plataforma). `.claude/skills/*` untracked EXCLUÍDOS do commit.
