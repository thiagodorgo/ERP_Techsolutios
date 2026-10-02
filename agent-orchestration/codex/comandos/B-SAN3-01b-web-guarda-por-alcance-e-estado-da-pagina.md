> Comando do bloco, colado pelo orquestrador a partir do §14 do plano (docs/revisoes/SAN3/B-SAN3-01b-plano.md, linhas 604-642). O plano e a fonte; em divergencia, vale ele.

# B-SAN3-01b — as guardas da propriedade que o B-SAN3-01 fechou (item 4 + 4 pendências)

- **Tipo:** feature de guarda (gate SAN3, bloqueante por D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA) · **Fase:** Execution ·
  **Trilha:** frontend · **Branch:** `fix/web-guarda-por-alcance-e-estado-da-pagina` · **Frente:** 3 — precede `SAN3-08`,
  `SAN3-25` e `SAN3-21` pelas travas de mesmo arquivo (o §6 não o agenda; o orquestrador recalcula)
- **Plano:** `docs/revisoes/SAN3/B-SAN3-01b-plano.md` (planejador-mestre, instância 2, **Opus** — fallback declarado; fechamento
  e commit pela instância 3, **Fable**)

## Objetivo
(i) teste vivo da WorkOrdersPage real com o hook real; (ii) G1 por alcance em qualquer profundidade + fecho + arquivo de
fronteira, e G1b para entidade inline; W1/W2 por comportamento; "Nova OS" só com work_orders:create; cabeçalhos dizem o
que o guard prova.

## Escopo PERMITIDO
frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx · frontend/tests/work-orders-page-live.test.tsx (novo) ·
frontend/tests/work-orders-honest-errors.test.tsx · SÓ comentário: frontend/src/modules/operations/dispatches/dispatches.service.ts,
frontend/src/modules/work-orders/repository.ts, frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts ·
SÓ a lista do test:smoke: frontend/package.json · Kpis/kpis-latest.json, Kpis/kpis-history.json, Kpis/kpis-history.md,
Kpis/app.js · registro (pendencias.md, pendencias-indice.md gerado, status-geral.md, log-execucao.md, este comando)

## Escopo PROIBIDO
o §6 do plano (inclui src/**, prisma/**, lockfiles, flags no comando do test:smoke, work-orders.service.ts salvo
ampliação nominal, hooks, App.tsx, tests/** da raiz, .github/**, Kpis/index.html)

## Rito (§C7)
1. Dev de identidade nova implementa só o plano. 2. Inspetor de terreno. 3. Junta unanimidade de 3: C1 guardiao-fail-closed,
C2 coordenador-de-acessos (inelegibilidade a conferir — achou o C2-05), C3 cognicao-visual. 4. CI verde → squash → §C5 → porteiro.

## Teste de encerramento (§5 + plano §7)
N-PG-PAINEL, N-BARREL2, N-LITERAL, N-W1TXT (e N-PG-KPI, N-FORA-RAIZ, N-W2TXT) VERMELHAS no bloco e no smoke; oráculo de
sítios vermelho fora dos 9 de interação; "Nova OS" × 13 papéis do catálogo; vermelho-controle no head-base do gate.

## Bateria
a do §8 do plano (cwd frontend/ para os .tsx; paridade Node 20).

## KPIs
§9 do plano: frontend_smoke_tests da execução real; blocks_completed +1; demais carregados com nota; mvp_* inalterados.
```
