# B-114 — Web: Dashboard Operacional ligado ao /api/v1

> Autor: Claude Code. Fase 2 (Web Gestor). Liga os KPIs do dashboard às OS reais.

## Objetivo

Trocar o dashboard mock-puro por KPIs derivados das Ordens de Serviço reais
(`listWorkOrdersFromApi`), com fallback seguro para mock quando offline/erro.

## Contratos / Endpoints

- Consome `GET /api/v1/work-orders` (via `work-orders.service`, envelope `{ data }`).
- **Versão do contrato (consumo):** `web_dashboard@2026-07-02.b114`.

## Regras

- `deriveDashboardKpis` (pura): abertas, alta/urgente, em atendimento, concluídas.
- Alertas, OS-críticas e eventos seguem mock (sem endpoint dedicado ainda) — fallback seguro.
- Erro/offline → mantém mock sem quebrar a UI.

## Escopo permitido

- `frontend/src/modules/dashboard/**`
- `frontend/tests/dashboard.adapter.test.ts` · `frontend/package.json` (test:smoke)
- `agent-orchestration/**`

## Escopo proibido

- Backend `src/**` · `mobile/**` · demais módulos web · `prisma/**` · `.env` · lockfiles · KPI.

## Validações

```bash
npm --prefix frontend run check
npm --prefix frontend run build
npm --prefix frontend run test:smoke
git diff --check
```

## Limites

- Sem endpoint de summary no backend nesta rodada (agregação no front).
- OS-críticas/alertas/eventos reais ficam para blocos futuros (precisam endpoint).
- KPI publicado uma vez ao final do B-120.

## KPI (proposto, não publicado)

- Consolidado no fim do B-120.
