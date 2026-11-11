# B-ASS-09a — Rateio automático a partir da importação (item 61 do portão)

- **Tipo:** feature (bloco de DINHEIRO: grava custo por organização e tem migração)
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-11-11
- **Branch:** `feat/rateio-automatico-importacao`
- **Autor (dev):** `dev-09a-cl`, Claude Opus 5.5 (subagente da sessão), nível menor, **identidade de dev declarada**.
  Exceção declarada (§C7 itens 6 e 11(6)): o plano pede Codex (1º o Codex 2); o Codex 1 está sem cota semanal até 16/11,
  o Codex 2 está na pré-revisão do #536 e a API está no limite do dia até 21:00. Por isso a pré-revisão e a conferência
  são de outro modelo (Codex 2, ou a API depois das 21:00).
- **Plano (norma única):** `erp-pausa-2026-10-03/planos/plano-B-ASS-09a-v2.md`, inteiro, com a **Emenda 1** (requisitos
  R2-01 a R2-12 da crítica r2, `revisoes/crit-09a-r2-plano.json`). Arquivo fora do repositório. Onde este comando divergir
  do plano, vale o plano.
- **Nível de revisão:** junta completa (§C7 item 10(1)): muda cálculo e escrita de dinheiro, e toca o banco.
- **KPI:** congelado (§C7 item 8(5)).

## Objetivo

Toda importação de custo da AWS concluída cria sozinha **um rateio por mês de cobrança**, sem duplicar quando a tarefa é
reenviada, o gatilho se repete ou roda em paralelo. Um mês nunca entra duas vezes, inclusive no fim exclusivo da AWS
(meia-noite do dia 1 seguinte). Uma varredura de 6 em 6 horas completa o que o gatilho não fez.

## Perguntas do dono (§9 do plano) — recomendações adotadas por padrão, NÃO decisões do dono

- **1(a):** só importações novas (feitas depois deste bloco) ganham rateio automático.
- **2(a):** o rateio manual continua recalculando a cada clique.
- **3(a):** o rateio automático que falha não é tentado de novo sozinho.
- **P4 (aberta pela Emenda 1):** importar de novo um mês já publicado troca o número publicado daquele mês (R2-05, T9e).

## Escopo PERMITIDO (plano §4 + Emenda 1)

- `src/modules/cloud-cost-allocation/`: `cloud-cost-allocation.service.ts`, `cloud-cost-allocation.repository.ts`,
  `cloud-cost-allocation-prisma.repository.ts`, `cloud-cost-allocation.jobs.ts`, `cloud-cost-allocation.types.ts`,
  `cloud-cost-allocation.engine.ts` (só a l.112 e o tipo da regra), `cloud-cost-allocation.rules.ts` (a regra do banco e o
  mapa P8), `index.ts`; **novo** `cloud-cost-allocation.import-trigger.ts`.
- `src/modules/cloud-costs/aws-cur.service.ts`.
- `src/infra/jobs/job-worker.bootstrap.ts` (1 tique).
- `prisma/schema.prisma` (só `CloudCostAllocationRun` e o lado inverso em `CloudCostImport`) e o diretório novo
  `prisma/migrations/<ts>_ass09a_allocation_run_import_id/`.
- Testes: `tests/ass-09a-rateio-automatico.test.ts`, `tests/ass-09a-rateio-automatico-db.test.ts`,
  `tests/ass-09a-import-id-migration-drill-db.test.ts` (R2-03), `tests/san3-03-tenant-tag.test.ts`,
  `tests/cloud-cost-allocation.test.ts`, `tests/job-worker-bootstrap.test.ts`, `tests/san3-03-system-org.test.ts` e
  `tests/san3-03-system-org-db.test.ts` (R2-01, só a linha de referência "sem regra"), e as fixtures
  `tests/fixtures/aws-cur-two-months-exclusive.csv` e `tests/fixtures/aws-cur-overlapping-pairs.csv`.
- Docs e registro: `docs/cloud-cost-allocation.md`, `docs/revisoes/ASSINATURA/B-ASS-09a-dev.md`, este comando,
  `docs/revisoes/SAN3/PLANO_SAN3.md` (só a linha do bloco), `agent-orchestration/controle/pendencias.md`.
  `agent-orchestration/controle/decisoes.md` é do orquestrador (R2-06), num PR de registro na `main` antes da F6.

## Escopo PROIBIDO

- `prisma/**` fora do acima e migração existente; `.github/**`, `frontend/**`, `mobile/**`, `Kpis/*`;
  `src/modules/cloud-charges/**`, `src/modules/subscription-billing/**`; `cloud-cost-allocation.routes.ts` e
  `aws-cur.routes.ts`; `src/infra/jobs/job.types.ts` e `job.registry.ts`; `financial-period-lock.ts`, `catalog.ts`,
  `platform-permissions.ts`, `env.ts`, `package.json`, lockfiles e `.env`.
- `tests/san3-05-leituras-de-plataforma-db.test.ts`: só regressão (vermelho → para e volta ao plano).

## Fatias (plano §6)

F0 vermelho-controle e comando · F1m migração M-09a · F1 run determinística por importação e período · F2 gancho na
importação · F3 execução reivindicada · F4 varredura de recuperação · F5 suíte `-db` · F6 (depois da CE-P8) P8, P6 e
T-TAG-10b · F7 docs e registro.

## Bateria de validação

1. `npm run check` · 2. `npm run lint`
3. `node --test --import tsx tests/ass-09a-rateio-automatico.test.ts`
4. `DATABASE_URL=<cluster descartável> node --test --import tsx tests/ass-09a-rateio-automatico-db.test.ts tests/ass-09a-import-id-migration-drill-db.test.ts`
5. Regressões em memória: `tests/cloud-cost-allocation.test.ts tests/cloud-cost-allocation-routes.test.ts tests/san3-03-*.test.ts
   tests/aws-cur-cost-import.test.ts tests/aws-cur-cost-routes.test.ts tests/job-worker-bootstrap.test.ts
   tests/ass-03-rateio-banco.test.ts tests/financial-period-lock-guard.test.ts tests/o6r06-janela-reservada-guard.test.ts`;
   e as `-db` no mesmo cluster: `san3-03-import-scope-db`, `san3-03-derived-basis-db`, `o6r06-allocation-basis-rls-db`,
   `o6r06-cost-summary-sum-db`, `san3-05-leituras-de-plataforma-db`.
6. `npm test` na forma do job `backend` (`CORE_SAAS_PERSISTENCE=memory`, `DATABASE_URL` e `REDIS_URL` descartáveis).
7. `npm run build` · 8. `node scripts/migration-transaction-guard.mjs` · 9. `git diff --check`
10. Cada mutação do §3 aplicada como está escrita e revertida, com a saída vermelha no diário.
11. Limpeza §C5 (só artefatos de build; worktree e container ficam para a pré-revisão).

## Rastreabilidade

ID `B-ASS-09a` · PR # (após `gh pr create`) · merge commit e approved head (pós-merge) · status `published_per_pr`.
