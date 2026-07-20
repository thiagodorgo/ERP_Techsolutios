# Ata · WS-CARDS-CHARTS-F2 (backend) — agregado de série temporal de OS

- **Data:** 2026-07-19 · **Branch:** `feat/backend-work-orders-timeseries` · diretriz do dono: SEM pendência (construir o backend).

## Escopo
Novo módulo `src/modules/work-order-timeseries/` — `GET /api/v1/operations/work-orders-timeseries?days=30` (ou from/to) → por
DIA: `created`/`completed`/`cancelled`, **zero-fill** server-side (dias vazios=0, contíguos), bucketing por dia em
**America/Sao_Paulo** via `deriveBusinessDate` (reuso do Intl de `deriveCompetencia` — não TZ nova). Cada métrica no SEU timestamp;
fallback honesto p/ `created_at` em linha legada (conta, não descarta). **SEM MIGRAÇÃO**. compute PURO InMemory↔Prisma; Prisma
`withTenantRls` + `where.tenant_id`. DTO omite tenant_id (§2.8). RBAC reusa `work_orders:read`. Registrado em `src/app.ts`.

## Votos (time novo)
| Papel | Veredito |
|---|---|
| dev backend | implementado; tsc/lint/build verdes; 8 testes + 92 regressão; 0 nova falha (stash) |
| **analizador** (correção técnica) | **APROVADO** |
| **aprovador-de-acessos** (coordenador) | **APROVADO** |
| validador-mestre (regras/DoD) | **APROVADO_CONDICIONADO** |

**Resultado: 2 APROVADO + 1 APROVADO_CONDICIONADO — 0 REPROVADO, 0 BLOQUEIA. MERGE após sanar.**

Confirmações: bucketing TZ SP correto (02:00Z → dia civil anterior, testado); zero-fill contíguo cross-mês/DST-safe; métricas
independentes por timestamp + fallback honesto; refactor do business-time (deriveBusinessDate exportado) **behavior-neutral**
(regressão de competência verde, verificado por stash); paridade InMemory↔Prisma; §2.8; work_orders:read é a permissão certa
(agregado de OS, não ranking sensível — precedente audit-logs), 403 real p/ finance, isolamento cross-tenant provado.

## Condição sanada
- **MEDIA (validador) — KPI:** SANADA — `Kpis/*` backend 1268→1276 (+8).

## Condições DEFERIDAS (registradas)
- **BAIXA — `P-WOTS-SCALE`** (full-scan vs GROUP BY SQL) = otimização futura, não pendência funcional.
- **BAIXA — `P-WOTS-FRONT-ACCESS`**: o gráfico (frontend) deve tratar 403 (papel sem work_orders:read) com o estado §7 "acesso
  não permitido"/vazio honesto — a fazer no PR frontend do gráfico.
- BAIXA — premissa BR-sem-DST (documentada); helper `getMemoryWorkOrderRepositoryForTests` em caminho não-teste (padrão do repo).

## Rastreabilidade
ID: WS-CHARTS-F2-backend · PR: (após `gh pr create`) · merge_commit/approved_head null na autoria. backend 1268→1276.
Próximo: FRONTEND — gráfico temporal real no Dashboard (consome este endpoint; trata P-WOTS-FRONT-ACCESS) + fan-out dos cards clicáveis.
`.claude/skills/*` untracked EXCLUÍDOS do commit.
