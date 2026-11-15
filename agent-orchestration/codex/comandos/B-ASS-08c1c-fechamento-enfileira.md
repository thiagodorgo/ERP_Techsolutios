# B-ASS-08c1c — O fechamento que enfileira, o refechamento, a marcação imediata e a releitura no registro (item 60)

- **Tipo:** feature (bloco de DINHEIRO: cria e cancela cobrança no provedor, muda o estado da cobrança e do demonstrativo)
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-11-15
- **Branch:** `feat/billing-close-and-eager`
- **Autor (dev):** `dev-08c1c-cl` (Claude Opus 5.5, dev declarado, identidade nova). Sem cruzamento (§C7 11(2)): não havia crédito
  externo; o planejador (`plano-08c1c-op`) e o crítico (`crit-08c1c-cl`) são outras identidades Claude.
- **Plano (norma, a mais nova vence):** `plano-B-ASS-08c1c-abertura.md` → `…-emenda1.md` → `…-emenda1.1.md` → `…-emenda1.2.md`,
  sobre o plano-mãe `plano-B-ASS-08c-v2.md`, fora do repositório, na pasta do orquestrador. Críticas: `crit-08c1c-cl.json` (r1,
  VOLTA) e `crit-08c1c-cl-r2.json` (r2, APROVADO COM AJUSTES).
- **Nível de revisão:** junta completa (§C7 item 10(1)): escreve dinheiro; a trava automática também o sobe (`outbox/**`, `statements/**`).
- **KPI:** congelado (§C7 item 8(5)); PR nenhum atualiza `Kpis/*`.
- **Canal:** continua DESLIGADO por padrão. O bloco não liga nada e não fecha o item 60 (fecha depois do 08c2 e do 08c3).

## Objetivo

O último pedaço da fila de cobrança antes da nota: com o canal LIGADO, fechar o mês põe a cobrança na fila sozinho; reabrir e
refechar troca a cobrança velha pela nova; pagar à mão ou cancelar a conta cancela no provedor a cobrança que ficou aberta; e o
sistema relê a conta no instante em que grava a cobrança, para nunca deixar uma cobrança viva sobre uma conta já paga. A tabela de
cobranças passa a acompanhar o provedor, o poll-pending passa a ler a tabela, e o cliente vê o link da cobrança vigente.

## Fatias (plano §8; Emenda 1 §9)

F0 terreno e vermelho-controle · F1 alicerces · F2 a tabela acompanha o provedor · F3 o fechamento que enfileira · F4 o refechamento ·
F5 o reopen · F6 a marcação imediata · F7 a releitura no registro · F8 o claim (7 dias, parcial) · F9 poll pela tabela, recobrança,
índice vigente · F10 a visão do cliente · F11 T-LOCK-2, T13, CA-OFF · F12 contrato, documentação, registro e a bateria.

## Escopo

PERMITIDO: o §6 do plano, mais a Emenda 1 §9 (`webhooks/statement-refs.prisma.ts` só o `ON CONFLICT` do `putRefInTx`;
`webhooks/statement-refs.repository.ts` só `put`/`setExternalChargeId`) e a Emenda 1.2 §2 (só fixture e relógio de
`tests/ass-08b-channel-jobs.test.ts`, `tests/ass-08-channel-db.test.ts`, `tests/ass-08c-charge-route-db.test.ts` e
`tests/san3-05-leituras-de-plataforma-db.test.ts`). PROIBIDO: o §6 do plano (sem `prisma/**`: nenhuma migração).

## Bateria

`npm run check` · `npm run lint` · `npm run build` · `node scripts/migration-transaction-guard.mjs` · os testes do bloco em memória
e as `-db` (cada uma 3×, R2-09) num cluster descartável com `timezone = 'UTC'` · o T13 do `san3-05` · a catraca de logs do #571
(`tests/sec-log-sanitiza.guard.test.ts`) · `CORE_SAAS_PERSISTENCE=memory npm test` com o resumo TAP · `git diff --check` · 0
caminho local no diff.

## Registro

Diário do dev (P1): `revisoes/b-ass-08c1c/dev-08c1c-cl.md`, fora do repositório. Pendências fechadas e abertas: ver
`agent-orchestration/controle/pendencias.md` (entradas datadas de 2026-11-15).
