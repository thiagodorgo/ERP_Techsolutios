# B-APROVACOES-DURAVEIS — as aprovações gravadas no banco, isoladas por organização (item 67 do portão)

## Papel desta execução

DEV `dev-67-cl`, Claude Opus 5.5 (subagente da sessão), nível menor declarado, identidade nova. Não planeja, não critica
e não vota. Verificador: o DeepSeek (outra casa), na pré-revisão (§C7 11(1)).

## Fontes, nesta ordem

1. A autorização de `prisma/**`: P1, opção (A), do plano do `B-SAN3-16`, aceita pelo dono na `D-DONO-1311-RECOMENDACOES`
   item (b) — 1 tabela nova, migração só aditiva, isolamento por organização. Nada além disso.
2. O plano `plano-B-APROVACOES-DURAVEIS.md` (autor `plano-67-cl`) e a emenda 1 (autor `plano-67-e1-fable`), que
   prevalece onde divergir. Os dois vivem na pasta de planos do orquestrador, fora do repositório.

## Propriedade

Toda aprovação operacional é gravada na tabela `operational_approvals`, sob `ENABLE` e `FORCE ROW LEVEL SECURITY` pela
organização. O pedido de validação da conclusão nasce na mesma transação da mudança de status para `completed`, pelas
duas portas (rota de status e fila do app). A decisão é um CAS sobre `status = 'pending_approval'`: duas decisões
simultâneas dão 1 aceita e 1 recusada com 409. Pedido, decisão e recusa por segregação de função deixam 1 linha durável
em `audit_logs` cada, com `entity = 'work_order'` e `entity_id` = id da OS quando há OS.

## Escopo

O PERMITIDO do §5.1 do plano, com os ajustes do §3.8 da emenda (a lista `SUITES` recebe as linhas no fim). PROIBIDO:
o §5.2 do plano — `ALTER`/`DROP`/dado em tabela existente, `GRANT`, `NO FORCE`, chave nova no inventário do T13
(forma C), `new PrismaPg(` em teste novo, rota ou permissão nova, `src/modules/mobile/**`, `src/modules/authority/**`,
`src/modules/notifications/**`, `frontend/**`, `mobile/flutter_app/**`, `Kpis/**`, lockfiles, `.env`, `infra/**`.

## Fatias

F0 a F6 da emenda (§5), cada uma com commit próprio. A F4c (a fronteira pelo lote do app) e a F6 esperam o
`B-SAN3-16` na `main`.

## Bateria

A do §6 do plano, com os itens 4 e 5 corrigidos pela emenda (§3.8): `npm run check`, `lint`, `build`;
`CORE_SAAS_PERSISTENCE=memory npm test`; as suítes `-db` do bloco e a lista `SUITES` do `backend-postgres` num cluster
descartável em UTC; `node scripts/migration-transaction-guard.mjs` com `violações: 0`; o gerador do T13 com +1 tabela
FORCE e o inventário com o mesmo `sha1` da `main`; os 2 instantâneos de censo iguais aos da `main`; `git diff --check`.
As 14 mutações literais, uma por vez, cada uma vermelha no teste indicado e revertida.

## Nível de revisão

Junta completa (inspetor de terreno + 3 cadeiras, unanimidade): o bloco toca `prisma/**`, o isolamento entre
organizações e a segregação de função da decisão (§C7 10(1) e 10(2)).
