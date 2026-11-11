# B-SAN3-23 — OS cancelada sem item financeiro, e o cancelamento não é sobrescrito (item 23 do portão)

- **Ramo:** `fix/os-cancelada-sem-item-financeiro`
- **Papel desta execução:** DEV; não planeja, não critica e não vota.
- **Executor:** `dev-san3-23-cl`, Claude **Opus** (subagente da sessão; nível menor, declarado, §C7.6), cobrindo o Codex (Codex 1 sem cota semanal até 16/11, Codex 2 ocupado; `D-IAS-EXTERNAS-PRIMEIRO`, exceção declarada).
- **Plano canônico:** `plano-B-SAN3-23-v2.md` (Claude Opus 5.5 pela API, topo substituto declarado), mais os 8 ajustes da crítica r2 (`crit-23-r2-plano.json`, APROVADO COM AJUSTES), que viram requisito.
- **Decisão do dono:** `D-PORTAO-5-RECOMENDACOES-1111`, Q1 = **A** — a sobrescrita do cancelamento entra neste bloco (F2b): os 3 escritores de situação só gravam se a situação ainda for a que leram; senão respondem 409, a mesma resposta de hoje.
- **Diário do dev:** `docs/revisoes/SAN3/B-SAN3-23-dev.md` (comando → saída → veredito de cada fatia e de cada mutação).
- **Nível:** junta completa (escrita de dinheiro; §C7 item 10(1)). KPI congelado (§C7 item 8(5)).

## A propriedade (P-23, com o alcance corrigido pela crítica r2, C23R2-08)

A linha da OS é o ponto de serialização entre o cancelamento e **toda escrita que cria, altera ou apaga item financeiro
da OS** e **todo faturamento** (o único caminho que cria título com `work_order_id`).

1. O cancelamento é uma unidade: trava exclusiva da OS → relê a situação → no `zero`, confere "há item ativo faturado?"
   e zera → muda a situação → grava o evento. Tudo commita junto, ou nada.
2. Lançar, editar, apagar item e faturar relêem a situação sob a trava compartilhada da OS, na mesma transação e antes
   de escrever. OS `cancelled` → `422 work_order_cancelled` (o contrato de hoje).
3. Ordem total das travas: trava consultiva do período (se houver) → linha da OS → itens em `(created_at, id)`.
4. (Q1 = A) Nenhum escritor de situação (`changeStatus`, `assign`, `assignFromDispatch`) grava sobre uma situação
   diferente da que o serviço validou (CAS); em corrida, `409 invalid_status_transition`.

**Fora do alcance, declarado:** baixa, estorno, PATCH, situação e exclusão de título e cheques não passam pela trava da OS
(não criam título nem item; o invariante não sofre, medido pela crítica r2). O evento-base de comissão vira
`P-COMISSAO-GATE-SEM-TRAVA`. Despesas e avarias não olham a situação da OS (ausência de guarda, não corrida).

## Contrato público

Não muda em caminho que funciona hoje. Adições, só em corrida/espera longa e com nada persistido:
`503 WORK_ORDER_FINANCIAL_UNAVAILABLE work_order_financial_transient_conflict` (lançar, editar e apagar item) e
`503 WORK_ORDER_UNAVAILABLE work_order_cancel_transient_conflict` (cancelar). Na corrida de situação ou atribuição,
`409 invalid_status_transition`, o que a mesma operação já recebe fora de corrida.
Contrato versionado: `work_order_financial_write@2026-11-11.b-san3-23`.

## Validação

`npm run check`, `npm run lint`, `tests/b-san3-23-cancel-race-db.test.ts` (Postgres descartável, `# skipped 0`), as
regressões do §3.4 do plano, `npm test` (TAP), `npm run build`, `node scripts/migration-transaction-guard.mjs`,
`git diff --check`, e as mutações do §3.3 (com as emendas registradas no diário), uma por vez, vermelhas e revertidas.
Sem `prisma/**`, `.github/**` nem `Kpis/**`.
