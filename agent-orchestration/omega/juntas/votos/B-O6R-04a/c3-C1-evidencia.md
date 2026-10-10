papel: jurado-o6r04a-c2-suplente-banco-rls (C1, ciclo 3) · modelo: GPT-5.6 Sol em nível menor, substituição determinada pelo dono em 2026-10-10; modelo de topo reservado ao plano e ao replanejamento após reprovação · mandato_md5: 2bdca8340a0b4324f241a1cb9126d62b · corpo_md5: 6af1ad8f996180a6080a2f4cceca4cdf

# Evidência incremental — B-O6R-04a / PR #389 / ciclo 3 / C1

## Régua e estado inicial

- Régua do mandato, acima do corpo: no ciclo 3 somente defeito GRAVE de produto — perda de dado, vazamento entre organizações, quebra de permissão ou erro de dinheiro — comprovado por execução pode receber `gravidade: bloqueia`. Forma de guard, teste, registro, KPI ou mandato recebe `ajuste` ou `nota`.
- Item 1 — dinheiro e dado sob corrida real: **APROVADO**.
- Item 2 — isolamento entre organizações sob o papel real: **APROVADO**.
- Item 3 — perda por migração/censo somente leitura: **APROVADO**.

## Pré-voo legal — 2026-10-10T13:52:11Z

- Comando: MD5 EOL-neutro por `git show origin/fix/inventory-consistency:<arquivo>`; `gh pr view 389 --json ...`; `git fetch origin fix/inventory-consistency`; `git rev-parse origin/fix/inventory-consistency`; leitura exclusiva de `insp-c3-parecer.md`; `Get-PSDrive C`; inventário por prefixo próprio.
- Saída resumida: corpo `6af1ad8f996180a6080a2f4cceca4cdf`; mandato `2bdca8340a0b4324f241a1cb9126d62b`; head Git/GitHub `622bf8453d2d60ecb6577aa611b2d87645a689ae`; merge-base `c1cfdabe12c74b58f8393dbee4f333224c56b303`; inspetor `LIBERADO COM RESSALVA`; disco 15,10 GiB; nenhum container `j389c3-c1-*`; CI ainda `IN_PROGRESS` no novo head.
- Veredito parcial: legalidade documental conferida, mas o mérito permanece travado até todos os check-runs do SHA exato concluírem. As ressalvas de processo do inspetor não são defeito grave de produto.

## Ressalva de imagem — 2026-10-10T13:56:30Z

- Comando: `docker image inspect erp-junta-node20-pg16:local`; `docker run --name j389c3-c1-probe erp-junta-node20-pg16:local bash -lc 'node --version; psql --version; command -v postgres; postgres --version'`; remoção imediata por `docker rm -f -v j389c3-c1-probe`.
- Saída resumida: imagem Linux amd64; Node `v20.20.2`; `psql: command not found`; nenhum binário `postgres`; container de sonda removido. A premissa “a imagem traz o psql 16” não se reproduziu.
- Veredito parcial: `nota`, `escopo: pre-existente`, origem = imagem local anterior à cadeira e fora do diff do PR. Não é defeito grave de produto. A medição usará PostgreSQL 16 Linux próprio, sem porta publicada, e runner Linux próprio, todos com prefixo `j389c3-c1-*`; a versão será impressa pelo cliente do container PostgreSQL.

## Item 1 — dinheiro e dado sob corrida real — 2026-10-10T14:13:57Z

- Comando: worktree detached `C:/Users/AMP/w-ciclo3-389-c1` em `622bf8453d2d60ecb6577aa611b2d87645a689ae`; rede e containers `j389c3-c1-*` sem portas publicadas; `npm ci --no-audit --no-fund` no runner Linux; `npm run db:generate`; `npx prisma migrate deploy`; depois, com `DATABASE_URL`/`REDIS_URL` explícitas para os descartáveis: `node --test --import tsx tests/inventory-balance-lock-race-db.test.ts` e `node --test --import tsx tests/inventory-cycle-count-close-units-db.test.ts` (timeouts 900/1200 s, `ec` lido diretamente).
- Saída resumida: terreno em PostgreSQL `16.14`, Node `20.20.2`, 108 migrations aplicadas; T-A `16/16`, `fail 0`, `skip 0`, `ec=0`; T-B `22/22`, `fail 0`, `skip 0`, `ec=0`. A0/B0 provaram dois papéis efêmeros `NOSUPERUSER NOBYPASSRLS`. A1 executou `RACE_N=10`, cada arranjo com 20 débitos de 1 sobre saldo 10: exatamente 10 aceitos e saldo final 0. A2 provou espera no `FOR UPDATE` e recusa 409 sob o lock. A3–A10 cobriram transferência, ajuste, custódia, baixa por fonte, estorno e custo médio; zero `25P02`. A12/B8/B9b: zero `40P01` novo no código real. B1 executou `RACE_N=10`: 2 `close` concorrentes → 1×200 + 1×422, um ajuste, saldo 7. B15: 10 itens, total `−60`, 10 ajustes, zero duplicata; B2/B14 provaram retomada e total da sessão inteira.
- Sonda dirigida independente: `--test-name-pattern='A0|A1 [encerramento]'` e `--test-name-pattern='B0|B1 [encerramento]|B15 [S-02'`, em novas execuções contra o mesmo cluster descartável. Débitos: `2 pass/0 fail` (14 skips nominais pelo filtro), repetindo 10× o arranjo de 20 débitos; fechamento: `3 pass/0 fail` (19 skips nominais pelo filtro), repetindo B1/B15 em `RACE_N=10`. Os skips são consequência explícita do filtro e não são skips da suíte integral, que teve zero.
- Veredito parcial: **APROVADO**. Nenhum erro de dinheiro nem perda de dado observado. `gravidade: nota`; `escopo: dentro-do-bloco`; a nota registra a prova positiva, sem achado bloqueante.

## Item 2 — isolamento entre organizações sob o papel real — 2026-10-10T14:15:50Z

- Comando: contra o mesmo cluster próprio, `node --test --test-name-pattern='A0|A11' --import tsx tests/inventory-balance-lock-race-db.test.ts`; `node --test --test-name-pattern='B0|B6 [cross-tenant]' --import tsx tests/inventory-cycle-count-close-units-db.test.ts`; e `node --test --test-name-pattern='C6′|C7′' --import tsx tests/inventory-migration-drill-db.test.ts`, sempre com `DATABASE_URL` explícita, runner Linux e timeout.
- Saída resumida: A0+A11 `2 pass/0 fail`, com papéis `NOSUPERUSER NOBYPASSRLS`; a saída do contexto T1 contra item T2 retornou `undefined` (400 no serviço) e escreveu zero em T2. B0+B6 `2 pass/0 fail`: `close`, `cancel`, `recordEntry` e `get` contra sessão de outra organização retornaram 404; `open` ignorou a sessão alheia e T2 permaneceu inalterado. Isso mede seis vias: saída de estoque + `close` + `cancel` + `recordEntry` + `get` + `open`. C6′+C7′ `2 pass/0 fail`: admin contou 17 grupos; papel real `NOSUPERUSER NOBYPASSRLS` abortou o DO com `censo CEGO`, e o script recebeu `42501` na primeira consulta com nenhuma linha — nunca resposta enganosa `0|0`.
- Veredito parcial: **APROVADO**. Nenhum vazamento entre organizações nem quebra de permissão foi observado. `gravidade: nota`; `escopo: dentro-do-bloco`; prova positiva, sem achado bloqueante.

## Item 3 — perda por migração e censo somente leitura — 2026-10-10T14:18:59Z

- Comando: `node --test --import tsx tests/inventory-migration-drill-db.test.ts` contra o PostgreSQL 16 próprio (`timeout 1200`, `ec` direto). Sonda adicional: cópia do censo para o container próprio e `psql -X -v ON_ERROR_STOP=1 -U postgres -d erp_junta -c 'BEGIN TRANSACTION READ ONLY' -c <contagens antes> -f /tmp/c1-census.sql -c <contagens depois> -c <pg_stat_xact_user_tables> -c 'ROLLBACK'`.
- Saída resumida: drill `6/6`, `fail 0`, `skip 0`, `ec=0`. C4′: target migration aplicada na base própria, dois índices parciais; down → zero índices e duplicata aceita; re-up → dois índices e duplicata recusada por `23505`. C5′: 21 grupos reais (13 estornos + 8 ajustes, 2 organizações), aborto `P0001` com N real, censo listou 21 sem mutar, limpo ficou mudo, re-up verde. C6′/C7′/C8′: papel real nunca produz falso zero; recebe `censo CEGO`/`42501`. C10′: índice alheio não produz sucesso silencioso.
- Sonda adicional somente leitura: `before = after = stock_movements 0, cycle_counts 0, cycle_count_entries 0`; dentro da mesma transação, `pg_stat_xact_user_tables` publicou `n_tup_ins=0, n_tup_upd=0, n_tup_del=0` para as três tabelas; `ROLLBACK`; `ec=0`.
- Veredito parcial: **APROVADO**. Nenhuma perda de dado causada pela migração/censo e nenhuma escrita do censo foram observadas. `gravidade: nota`; `escopo: dentro-do-bloco`; prova positiva, sem achado bloqueante.

## Conferência final e teardown — 2026-10-10T14:19:31Z

- Comando: `git -C C:/Users/AMP/w-ciclo3-389-c1 rev-parse HEAD`; `git status --porcelain`; inspeção do `node_modules`; inventário por prefixo; `docker rm -f -v j389c3-c1-runner j389c3-c1-redis j389c3-c1-pg`; `docker network rm j389c3-c1-net`; `git -C <repo> worktree remove --force C:/Users/AMP/w-ciclo3-389-c1`; confirmação por `docker ps -a`, `docker network ls`, `git worktree list` e `Test-Path`.
- Saída resumida: head antes do teardown `622bf8453d2d60ecb6577aa611b2d87645a689ae`; status pristino (`0` linhas); `node_modules` era diretório normal, sem junction/symlink; 3 containers próprios removidos, rede própria removida, worktree removido pelo Git; após: container `0`, rede `0`, worktree `0`, diretório ausente; 14,59 GiB livres. Nenhum recurso `j389c3-c3-*`, nenhum `w-ciclo3-389-c3`, nenhum `w-07ca`, nenhuma porta publicada e nenhuma base viva foram alvo.
- Veredito parcial: terreno limpo. Apenas os dois caminhos de saída autorizados em `C:/Users/AMP/w-389/.../B-O6R-04a/` foram gravados; nenhum commit foi criado.

## Achados e voto

- `IMG-C1-01`: a imagem local `erp-junta-node20-pg16:local` não continha `psql`, contrariando a premissa do mandato. `gravidade: nota`; `escopo: pre-existente`; evidência de origem: `docker image inspect` + execução do binário antes da criação do terreno, imagem fora do diff do PR e anterior à cadeira. Não escondeu defeito grave: o PostgreSQL próprio forneceu `psql 16.14`, e todo mérito foi executado em Linux.
- Achados de produto graves: **0**. Ajustes de produto: **0**. Notas: **1** (terreno, pre-existente).
- CI do objeto: `14/14 completed/success` no SHA exato, medido por `gh api repos/thiagodorgo/ERP_Techsolutios/commits/622bf8453d2d60ecb6577aa611b2d87645a689ae/check-runs` às `2026-10-10T14:01:09Z`.

VOTO: APROVADO — não foi observado defeito grave de produto: corridas preservaram saldo/dinheiro e fechamento exatamente uma vez; as seis vias e o censo não vazaram entre organizações nem quebraram permissão; migração e censo não perderam nem escreveram dados.
