## 7. CE-G1 e CE-G2 (§5.6 do `docs/revisoes/SAN3/PLANO_SAN3.md` `[03]`)

**CE-G1 — enumeração fail-closed.** Guards citados no teste de encerramento: T-D (D1, D2, D4, D5, D7, D8, D9) e o censo da migração (§4.1). (a) **Fonte da enumeração, gerada por script
do código real:** D1 varre `src/**`, `prisma/**`, `scripts/**` pelo padrão de escrita em `stock_movements` — **pela propriedade** (membro fora da allowlist de leitura; SQL cru em qualquer
grafia, `/i`), nunca lista curada; universo medido hoje `{ inventory-prisma.repository.ts:436 (insertMovement), prisma/seed-fleet.ts:171-173 }` `[03]`, publicado na mensagem de sucesso;
D2 enumera os métodos do repositório pelo corpo (quem chega a `insertMovement`/`avg_cost`) e classifica cada leitura como identificação ou decisão; D5 enumera as transições de
`cycle_counts.status` pelo fonte (4); D7 os wrappers por assinatura; D8 o único `cycleCount.create(`; D9 as suítes `-db` do bloco; o censo enumera os grupos duplicados pelo dado real
com a contagem completa. (b) **Default do membro não previsto: negar** — membro novo de `stockMovement.` não listado como leitura é escritor e reprova D1; método novo que chegue a
`insertMovement` sem `lockItemForUpdate` (ou com dois, ou com decisão antes) reprova D2 e o compilador nega antes (`ItemWriteLock`); transição sem precondição reprova D5; wrapper sem
mapeamento reprova D7; `createSession` sem o lock do tenant ou sem a consulta de sobreposição reprova D8; DDL em suíte irmã reprova D9; duplicata de legado aborta a migração com a
contagem real (nunca deduplica). (c) **Mutação que deixa o guard vermelho** (uma por guard, executada e registrada na ata): as 4 grafias do crítico (D1 — `[05]`); as 5 mutações de D2
(`[05]`); remover o token (D3); laço num `uow.run` único / `applyClose` / acumular `avgCost` no laço / remover `abortClose` (D4); `updateMany` de status sem `status` no `where` (D5);
`catch` de P2002 dentro da tx (D6); wrapper novo sem `mapTransientDbFailure` (D7); `createSession` sem `FOR NO KEY UPDATE` ou com `create(` antes da consulta (D8); `DROP INDEX` em T-C (D9);
no censo, o bloco `DO` extraído do `.sql` mudo sem duplicata e `P0001` com "21 grupo(s)" com 21 (C5′ — `[08]`/`[09]`).

**CE-G2 — papel × passo.** Nenhum caso `-db` atravessa uma rota: lock e CAS vivem abaixo da permissão e o ator passado ao serviço é `{ tenantId, userId, roles: [], permissions: [] }`
(o `CycleCountService` não importa `requirePermission`; a comparação é só nas rotas — v2 `[04]`, código inalterado). B12 (listagem `?status=fechando`) e as regressões em memória
(`inventory-cycle-counts-routes.test.ts:194-231`) atravessam rotas com papéis de APLICAÇÃO: `manager` tem `stock_movements:create` (`catalog.ts:534`) e `cycle_counts:create` (`:537`);
`operator` (`:775/:778`) e `inventory` (`:882/:885`) idem; `cycle_counts:read` para o GET; a rota compara **exatamente** `stock_movements:create` (`inventory.routes.ts:119,129`) e
`cycle_counts:create`/`:read` (`cycle-count.routes.ts:41,49,57,65,73,81`). Papel de **BANCO** nos drills: efêmero `NOSUPERUSER`, `rolbypassrls=false` (asserido por `pg_roles` `[04]`), com
`GRANT SELECT, INSERT, UPDATE, DELETE` — `FOR UPDATE`/`FOR SHARE`/`FOR NO KEY UPDATE` exigem `UPDATE`/`SELECT` e os têm; **`tenants` não tem RLS** (`relrowsecurity=false` `[04]`): o lock
da linha do tenant devolve 1 linha em qualquer contexto, e por isso a linha travada é sempre a do ator (`input.tenantId`), nunca um parâmetro do cliente; as policies das outras 4
tabelas valem para ALL — provado por execução (v2 `[10-PRE]`: 1/0/0 com contexto / sem / outro tenant). O drill de DDL (T-C′) roda como o dono do cluster (`CREATE DATABASE`), declarado.
