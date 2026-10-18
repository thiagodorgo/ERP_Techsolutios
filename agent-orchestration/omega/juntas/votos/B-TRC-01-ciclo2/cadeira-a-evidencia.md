papel: cadeira (a′) ciclo 2 | executor: Codex | identidade: jurado-trc01c2-a-cdx | modelo: GPT-5.6 Sol, esforço médio (nível menor, §C7.6; substituição: nenhuma) | mandato_md5: 91dc62018ce3b621e233061f46c37795 (declarado no disparo: 91dc62018ce3b621e233061f46c37795) | corpo_md5: 1d4ef521aeab60d8a9af040225ae81f3 (recebido no prompt: 1d4ef521aeab60d8a9af040225ae81f3)

# Evidência incremental — B-TRC-01 ciclo 2, cadeira (a′)

- Objeto fixado: `2043c5840c8f60fe91538840aaefb3420a11cfe3`.
- Corpo `.agents` no objeto, MD5 EOL-neutro: `0631089c1856f76d0ad95bb7906dd2b2`.
- Plano externo, MD5 EOL-neutro: `dd6e9074fbc56395e877a396dec16d2a` (confere com o briefing).
- Parecer do inspetor lido: `LIBERADO COM RESSALVA`; nomeia esta cadeira, executor, worktree e prefixo.
- Parecer R-DBA local lido: `APROVA`, objeto idêntico; suas conclusões permanecem roteiro a reexecutar.
- A RE-VERIFICAR: nenhuma conclusão da ata do ciclo 1 foi herdada como fato.

## Item 1/3 — submedições abertas do ciclo 1

### Comandos

```text
docker exec jtrc01c2-a-pg psql -U postgres -d erp_test -c "ALTER SYSTEM SET log_statement='all'; ALTER SYSTEM SET log_line_prefix='%m %u %a %v %x '; SELECT pg_reload_conf()"
DATABASE_URL=<PG próprio 127.0.0.1:47661> REDIS_URL=redis://127.0.0.1:47671 node --test --test-reporter=tap tests/traccar-position-ingestion-db.test.ts
node <parser EOL-neutro inline> C:/Users/AMP/AppData/Local/Temp/jtrc01c2-a-cdx/position-server.log
DATABASE_URL=<PG próprio> REDIS_URL=<Redis próprio> node --test --test-reporter=tap tests/traccar-idempotency-db.test.ts
# M-B1: remover o rethrow do gancho afterReceiptInsert; M-B2a: work antes do setter; M-B2b: is_local true→false; npm run check; teste-alvo; restaurar e comparar blob
pg_dump --schema-only --no-owner --no-privileges jtrc01c2_a_base/jtrc01c2_a_rb | normalização documentada | diff
SELECT count(*) FROM pg_stat_activity WHERE usename='jtrc01c2_a_usuario_inexistente' AND pg_terminate_backend(pid);
```

### Saída resumida

- Terreno: worktree detached `C:/Users/AMP/w-jc2-a` no objeto, `.env` ausente, instalação própria por `npm ci`, PostgreSQL 16.14 em `127.0.0.1:47661` e Redis 7 em `127.0.0.1:47671`; base viva não foi usada.
- `%v`: `145/145` transações do papel efêmero que tocaram uma das tabelas-alvo tiveram `set_config('app.current_tenant_id', …)` como primeira instrução SQL depois de `BEGIN`; `0` fora de contexto. Das `33` que tocaram recibo/localização, `32/32` transações reais de ingestão emitiram, nesta ordem, tenant → `lock_timeout` → `statement_timeout`; a 33ª foi leitura de verificação pós-caso, com setter primeiro e sem orçamento porque não executou a ingestão. Em `29/29` transações de ingestão cujo SQL carregou tenant explicitamente, o valor reapareceu igual; nos três caminhos sob predicado RLS sem parâmetro tenant explícito, a comparação pelo admin e o resultado funcional confirmaram o vínculo. Dica velha/envenenada: A permaneceu com `1` recibo/localização e B com `0`; envelope com chave de organização: 422 e zero escrita. T-B2 cliente + log servidor provam as duas metades da propriedade.
- Controle vermelho `%v`: conexão `jtrc01c2_a_red`, `application_name=jtrc01c2-a-red`, executou `SELECT count(*) FROM vehicle_tracking_bindings` sem setter; o log registrou exatamente a instrução fora de contexto e o RLS retornou `0` linha.
- T-B1 isolado: `tests=9 pass=9 fail=0 skipped=0`. O caso 9 mirou exatamente `1` pid entre recibo e commit, `pg_terminate_backend=true`; log do servidor: `FATAL terminating connection due to administrator command` (classe PostgreSQL `57P01`), serviço respondeu `503/unavailable/database`, sobraram `0` recibo, `0` localização, `0` evento; retry `204` deixou `1/1`. O controle com usuário inexistente retornou `0` pid e `0` término; o caminho sem término gravou `1/1/1` no caso 1. T-B1 também integrou as três rodadas do item 3.
- M-B1: `npm run check` verde; teste `9`, `pass 6`, `fail 3`, falharam os casos 7, 8 e 9 pelas asserções de atomicidade/término. M-B2a e M-B2b: cada uma `tests 1, pass 0, fail 1`, pela asserção “setter é a primeira instrução e limites são locais”. Os três arquivos foram restaurados; `git diff --exit-code` retornou 0.
- Rollback: banco A na base `20260873`; banco B com linhas semeadas, up 74→75→76, rollback literal 76→75→74. MD5 das colunas da base antes=depois: `work_orders 0e7c3137226a063d30d8a756420ab0ba`, `field_dispatches 2e2e048290f3b62f3f297ff4fb67481f`, `field_operator_locations 5e8b2c45b750d12d3ac96428bcf01d90`; `operator_assigned_at` e `vehicle_assigned_at` ficaram nulos nas linhas antigas (opção (i) do dono). Pré-condição `source='traccar' = 0` cumprida. Dumps normalizados: `3707` linhas cada, diff `0`. Controles vermelhos: mudança em dado alterou MD5 `14c8…→e418…`; coluna extra tornou o diff do dump não vazio; ambos acusaram e foram desfeitos.
- Rollbacks literais, MD5 EOL-neutro:

```sql
-- 20260874 · md5 9e9dbde79bcc6ddfd0fce3ae64ede677
-- ROLLBACK (manual, só em ambiente SEM dado real; nunca como rollback produtivo automático), em ordem reversa:
--   DROP TRIGGER IF EXISTS "field_dispatches_operator_assigned_at" ON "field_dispatches";
--   DROP FUNCTION IF EXISTS "field_dispatch_operator_assigned_at"();
--   ALTER TABLE "field_dispatches" DROP COLUMN IF EXISTS "operator_assigned_at";
--   -- re-estreitar o CHECK SÓ depois de provar zero linhas 'traccar' (SELECT count(*) … WHERE source = 'traccar' = 0):
--   ALTER TABLE "field_operator_locations" DROP CONSTRAINT "field_operator_locations_source_check";
--   ALTER TABLE "field_operator_locations" ADD CONSTRAINT "field_operator_locations_source_check"
--     CHECK ("source" IN ('mobile', 'web', 'system'));
--   DROP TABLE IF EXISTS "traccar_quarantine_items";
--   DROP TABLE IF EXISTS "traccar_ingress_receipts";
--   DROP TABLE IF EXISTS "vehicle_tracking_bindings";

-- 20260875 · md5 12a6f79aa49533b3722ab416fe3c7b45
-- ROLLBACK: nada a desfazer aqui (um CHECK validado e um NOT VALID têm o mesmo efeito sobre escritas novas). O
-- rollback do CHECK em si está no topo da migração anterior.

-- 20260876 · md5 97ed41349867ab4b7c4acb027dbe70f6
-- ROLLBACK (manual, só em ambiente SEM dado real), em ordem reversa:
--   DROP TRIGGER IF EXISTS "work_orders_vehicle_assigned_at" ON "work_orders";
--   DROP FUNCTION IF EXISTS "work_order_vehicle_assigned_at"();
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "vehicle_assigned_at";
```

### Veredito parcial

`APROVADO`. As três lacunas de medição do ciclo 1 foram fechadas por execução; controles acusaram. Nenhum achado.

## Item 2/3 — migração `20260876…work_orders_vehicle_assigned_at`

### Comandos

```text
npx prisma migrate deploy   # duas vezes no banco descartável
npx prisma validate
psql <catálogo: information_schema.columns, pg_proc.prosecdef, pg_trigger, pg_rules, pg_class RLS/FORCE, pg_policies>
DATABASE_URL=<PG próprio> REDIS_URL=<Redis próprio> node --test --test-reporter=tap tests/san3-05-acessos-de-plataforma-guard.test.ts
docker run --rm --network container:jtrc01c2-a-pg postgres:16 scripts/db-runtime-role.sh ...
# T-C3 nas três rodadas do subset; M-C3 e M-C4 em bancos novos migrados; check + teste-alvo; restauração por blob
# controle FORCE: remover temporariamente FORCE de vehicle_tracking_bindings e executar T13; restaurar
```

### Saída resumida

- Up exclusivamente aditivo: coluna nullable `timestamptz`, função `plpgsql SECURITY INVOKER` (`prosecdef=false`), um trigger `BEFORE INSERT OR UPDATE`, `RULE=0`; segundo deploy: `No pending migrations`.
- `work_orders`: `relrowsecurity=true`, `relforcerowsecurity=true`. Digest de `pg_policies` antes de 76 e depois de 76 foi idêntico: `2876bf9d59dc30b4cd7fc5c2fcde5da9`.
- T-C3 integrou as três rodadas do subset (`20/20` em cada) e uma execução isolada (`20/20`). M-C3: `tests 20, pass 18, fail 2` (casos 11 e 13); M-C4: `tests 20, pass 19, fail 1` (caso 13). Ambas compilaram, migraram banco novo e falharam pela propriedade do gatilho; arquivo restaurado ao blob `986455…`.
- T13 inteiro: `tests 35, pass 35, fail 0, skipped 0`. A fixture controlada adiciona três tabelas sintéticas e mediu L0 `111 ENABLE/111 FORCE`; o catálogo real do objeto tem `108/108`, diferença explicada exatamente pelas três fixtures. O guard de runtime, executado em Linux no container auxiliar descartável com papel próprio, mediu `tabelas_com_dml=118`, escapes `0` (`rolsuper/funções perigosas/ownership/grants de schema = 0`). A versão Node do guard no host Windows teve 4 falhas de arnês porque `setsid` não existe; não foi usada como prova do objeto.
- Controles vermelhos: sem trigger, valor forjado persistiu (`1`); função temporária `SECURITY DEFINER` foi detectada (`1`); retirando temporariamente um `FORCE`, T13 ficou `tests 1 pass 0 fail 1`. M-C3/M-C4 acusaram como acima. Tudo restaurado, `git diff --exit-code=0`.
- Parecer R-DBA: coincide ponto a ponto com a execução própria em aditividade, up repetido, catálogo, comportamento, opção (i), rollback e dump; não foi herdado.

### Veredito parcial

`APROVADO`. Migração aditiva, sem elevação, RLS/FORCE e políticas intactos; gatilho e guards acusaram sob mutação. Nenhum achado.

## Item 3/3 — CI de banco e forma do backend

### Comandos

```text
git diff 5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91 2043c5840c8f60fe91538840aaefb3420a11cfe3 -- .github/workflows/ci.yml
# extrair literalmente SUITES do objeto e executar a lista de 49 arquivos 3x com CORE_SAAS_PERSISTENCE=prisma RBAC_DB_PARITY=1
# M-CI1: unset DATABASE_URL e executar as seis suítes Traccar; aplicar o mesmo guard skipped!=0
# controle de denominador: repetir sem traccar-binding-uniqueness-db.test.ts
npm test
gh api repos/thiagodorgo/ERP_Techsolutios/commits/2043c5840c8f60fe91538840aaefb3420a11cfe3/check-runs?per_page=100
gh run view 39087734991 --job 117557731997 --log
gh run view 39087734991 --job 117557731847 --log
```

### Saída resumida

- Diff adiciona literalmente as seis suítes: binding uniqueness (`6`), idempotency (`9`), ingest pool (`2`), position ingestion (`20`), quarantine (`6`) e resolution race (`5`): contribuição `48` testes. Lista completa do objeto: `49` arquivos.
- Execução própria exata 3×: em cada rodada `tests 389, pass 389, fail 0, skipped 0`; durações `112853/106253/106414 ms`. Check-run oficial `backend-postgres` (job `117557731847`) confirma `pass 389, fail 0, skipped 0` e guard verde.
- M-CI1 sem `DATABASE_URL`: `tests 6, pass 0, fail 0, skipped 6`; o guard devolveu EC `1`. Controle de denominador sem a suíte de binding: `48` arquivos, `tests 383`; queda exata de `6`, portanto a lista não é decorativa.
- Forma `backend`: o runner local Windows completou e produziu TAP (`3483/3474`, `fail 7`, `skipped 2`), mas as falhas foram de arnês/plataforma (`setsid`, shim Unix) e um timeout apenas sob carga total; a suíte afetada passou `20/20` isolada e nas 3 rodadas. A execução oficial Linux no mesmo objeto, job `117557731997`, fechou `tests 3493, pass 3491, fail 0, skipped 2`; os dois skips são exatamente os dois casos de paridade RBAC que declaram exigir `RBAC_DB_PARITY=1`, cobertos no job PostgreSQL.
- Objeto: `14` check-runs, `14` concluídos verdes, `0` não-verde, `0` pendente.

### Veredito parcial

`APROVADO COM AJUSTE`. A propriedade de CI está provada. Achado não grave, `ajuste`, `dentro-do-bloco`: o comentário em `.github/workflows/ci.yml:282` afirma `363/363 no total do job`, porém a lista literal do objeto executa `389/389` (a soma mudou após integração de suites da base). Comando medidor: execução literal do `SUITES` + TAP das três rodadas e job `117557731847`. Não repete classe do ciclo 1; não bloqueia no ciclo 2 porque é `ajuste`, não `bloqueia`. Dono da pendência: próximo bloco de governança/CI que tocar a lista curada.

## Fechamento do terreno e legalidade

- Pré-voo: corpo/mandato/plano com MD5 esperado; inspetor `LIBERADO COM RESSALVA`; R-DBA presente; identidade inelegível sem ocorrência; decisões e autorização nominal presentes na ref julgada. O head do ciclo 1 é ancestral (`ec=0`).
- Re-resolução final: `git ls-remote` e `gh pr view 426` = `2043c5840c8f60fe91538840aaefb3420a11cfe3`; PR aberto, não draft, base `main`, `MERGEABLE`. `origin/main=a26f8afe74b73d9379b4fae5deba312875c2427b`; merge-base continuou `c260d36201f6e835799e7f96a14bc9eb8889ca5a`. O objeto medido não andou.
- `log_statement` foi restaurado para `none` e `log_line_prefix` para `%m [%p]`; reload confirmado.
- Limpeza: removidos apenas `jtrc01c2-a-pg`, `jtrc01c2-a-redis`, `C:/Users/AMP/w-jc2-a` por `git worktree remove --force` e o scratch próprio. Resultado: containers próprios `0`, worktree ausente, scratch ausente; nenhum prune. Disco final: `14,93 GB` livres.

**VOTO: APROVADO — itens 1 e 2 sem achado; item 3 com um ajuste não grave (comentário de denominador desatualizado), sem bloqueante dentro do bloco.**
