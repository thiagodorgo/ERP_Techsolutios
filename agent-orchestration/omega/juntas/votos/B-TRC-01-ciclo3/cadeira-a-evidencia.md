papel: cadeira (a″) ciclo 3 | identidade: jurado-trc01c3-a-rls-e-regressao (instância jurado-trc01c3-a-opus) | executor: Claude Code (general-purpose limitado a Read/Grep/Glob/Bash) | modelo: Claude Opus 5.5 (nível menor, §C7.6; substituição: o mandato previa Codex GPT-5.6 Sol; o Codex bateu o limite de uso, reserva declarada pelo orquestrador no disparo — mesmo nível) | mandato_md5: bae2ba9ef73a1bfb3e4b2f5b2ff5eb3c (declarado no disparo: bae2ba9ef73a1bfb3e4b2f5b2ff5eb3c) | corpo_md5: a454ff5c98827787825ab0d141ad94c5 (.claude, blob do objeto) · 7f224a874af8c2036235837cf236ceb7 (.agents, blob do objeto; = tabela do inspetor) (recebido no prompt: o disparo manda ler o blob; esperado a454ff5c… — IGUAL)

# Evidência — cadeira (a″) RLS e regressão de banco — junta do ciclo 3 do B-TRC-01 (PR 426)

## Cabeçalho do terreno (20:01Z)
- objeto julgado: 7c220467f754341a699c18c241fa9965c1a35638 (o mandato e o disparo). Head do PR AGORA: ce20aa3fc5a4f58e1f8e446d6c6ffa265ec91b52 (ls-remote = gh headRefOid). Delta 7c220467..ce20aa3f = 1 commit `chore(junta)`, 8 arquivos, todos em agent-orchestration/ (mandatos, quedas, parecer/evidência do inspetor, R-B-TRC-01-ciclo2.md) → SÓ REGISTRO; mede-se o 7c220467.
- origin/main início: a26f8afe74b73d9379b4fae5deba312875c2427b · merge-base(objeto, origin/main) = c260d36201f6e835799e7f96a14bc9eb8889ca5a
- h2 = 2043c5840c8f60fe91538840aaefb3420a11cfe3, ancestral do objeto: ec=0 (sem rebase). `git diff --name-only 2043c584 e6b4a33a` = só agent-orchestration/ (ata e votos do ciclo 2).
- package.json/package-lock.json h2→objeto: 0 arquivos (npm ci de um worktree serve aos dois commits).
- uname: MINGW64_NT-10.0-22631 x86_64 · node v20.19.5 · df /c: 9.8G livres
- $SCRATCH = C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/jtrc01c3-a
- Docker 20:01Z (`docker ps --format '{{.Names}}'`): outros = j07cb1c2-c2-runner, j07cb1c2-c2-pg (grupo 1: outra junta), jtrc01c3-c-pg, jtrc01c3-c-redis (grupo 2: cadeira c″); base viva à parte (não conta): erp-postgres, erp-redis → 2 trabalhos de outros = SEM VAGA. Faço antes o que não precisa de banco.
- Leitura: NÃO li arquivo das cadeiras (b″)/(c″) deste ciclo (os arquivos existem na pasta; não abertos). Li: o corpo (blob do objeto), o mandato, o parecer do inspetor e 00-quedas.md.

## Legalidade
- md5 do corpo .claude no blob do objeto = a454ff5c98827787825ab0d141ad94c5 (comando: `git -C C:/Users/AMP/w-trc01 show 7c220467:.claude/agents/especialistas/jurado-trc01c3-a-rls-e-regressao.md | tr -d '\r' | md5sum`) → IGUAL ao exigido. mandato `tr -d '\r' < 00-mandatos/cadeira-a.md | md5sum` = bae2ba9e… → IGUAL.
- Inspetor: insp-trc01c3-parecer.md, instância inspetor-trc01c3-opus (o mandato nomeia inspetor-trc01c3-cdx; troca declarada na 1ª linha do parecer). Veredito LIBERADO COM RESSALVA (R-1..R-10). Nomeia a (a″) com identidade, worktree C:/Users/AMP/w-jc3-a, prefixo jtrc01c3-a-, portas 47761/47771 e md5 do corpo nos 2 espelhos (a454ff5c…/7f224a87…) e do mandato (bae2ba9e…) — todos conferidos por mim. Executor na tabela do inspetor: Codex GPT-5.6 Sol; quem roda é Claude Opus 5.5 (mesmo nível; declarado acima) — ressalva de legalidade, não impede.
- (i) diff h2→objeto sem prisma/migrations/ci.yml: o mandato mediu 0/0; re-medido abaixo no item 3(c). (ii) w-jc2-b/w-jc2-b3 declarados pelo inspetor (R-3), não tocados. (iii) mandatos marcam A RE-VERIFICAR: sim (mandato l.225-241).
- Ressalvas lidas e aplicadas: R-8 (Docker 1 vaga quando muito; conto antes de subir), R-9 (npm run db:generate com URL inerte antes de check).

## Terreno (20:02Z–)
- worktree: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-jc3-a 7c220467…` ec=0; `.git` presente; `.env` AUSENTE; HEAD=7c220467f754341a699c18c241fa9965c1a35638. `timeout -k 15 900 npm ci --no-audit --no-fund` ec=0 (326 pacotes, sem junction); `DATABASE_URL=<inerte 127.0.0.1:1> npm run db:generate` ec=0 (R-9). df /c após: 9.3G.
- Para h2 (2043c584) uso o MESMO worktree trocando de commit dentro dele (package.json/lock sem diff h2→objeto; disco < 10 GB), restaurado e provado depois — declarado.

## Item 2 — CI (parte sem banco)
### 2(a) check-runs do objeto — A RE-VERIFICAR (a ata do ciclo 2 dizia 389, o plano espera 391)
- cmd: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/7c220467…/check-runs?per_page=100` → `$S/checkruns.json`: **total 14 · não-verdes 0 · pendentes 0** (2 runs: 39155574664 e 39155578757; 7 jobs cada).
- cmd: `gh api repos/…/actions/jobs/<id>/logs` dos 2 `backend-postgres` (117758007826, 117757996307) e dos 2 `backend` (117758007776, 117757996248) → `$S/job-*.log`.
  - backend-postgres (as 2 execuções): `# tests 391 · pass 391 · fail 0 · cancelled 0 · skipped 0 · todo 0`; passo "Fail on skipped tests": `testes pulados: 0` → guard passou.
  - backend (as 2): runner `320 arquivo(s) · 3496 teste(s) · pass 3494 · fail 0 · skipped 2`; os 2 `# SKIP` são `permission-catalog-db-parity` (ok 2202, ok 2203, motivo `RBAC_DB_PARITY não é "1"`); `not ok` = 0.
- cmd: `git diff --name-only 2043c584 7c220467 -- .github/workflows/ci.yml | wc -l` = **0** (ci.yml intocado no ciclo 3).
- `SUITES=` do job `backend-postgres` no objeto (lido de `.github/workflows/ci.yml` l.125–305): 50 arquivos, dos quais 6 `tests/traccar-*-db.test.ts`/`traccar-ingest-pool-db` (binding-uniqueness, idempotency, ingest-pool, position-ingestion, quarantine, resolution-race). Env do job: CORE_SAAS_PERSISTENCE=prisma, RBAC_DB_PARITY=1, LOG_LEVEL=silent, JWT_SECRET de dev; passos: npm ci → db:generate → migrate deploy → db:seed → `node --test --import tsx $SUITES | tee postgres-subset.tap` → guard `grep '^# skipped '` = 0.
- veredito parcial 2(a): VERDE — a CI do objeto executou o `backend-postgres` com 391/391, skipped 0, guard ativo; `backend` fail 0, skipped 2 nomeados.

## Item 3 — regressão de banco (parte sem banco)
- cmd: `git diff --name-only 2043c584 HEAD -- 'tests/field-dispatch*' 'tests/work-order*' | wc -l` = **0**; `-- prisma` = **0**; `-- src/modules/field-dispatch/field-dispatch.validators.ts` = **0**. Arquivos `tests/field-dispatch*`+`tests/work-order*` no objeto: 34.
- cmd: `git grep -l -E "findOperatorsForVehicleAt|classifyOperatorsAtFixTime" HEAD -- tests src` → src: traccar-ingestion.service.ts, field-dispatch-prisma.repository.ts, field-dispatch.repository.ts; tests: san3-05-acessos-de-plataforma-guard.test.ts (inventário), traccar-operator-at-fix-time.test.ts. **Nenhum** `tests/field-dispatch*`/`tests/work-order*` chama as duas funções.
- Máquina `FIELD_DISPATCH_STATUS_TRANSITIONS` (validators.ts l.7–18, objeto): 10 estados, **28 arestas** (draft 2, assigned 5, accepted 5, on_route 4, arrived 4, in_service 4, reassigned 4, terminais 0). O "21" do plano/ata é o nº de transições EXECUTADAS pelo roteiro da (c′) (5 despachos), não o nº de arestas da máquina — declarado; meço as 28.
- Gerador T13 no objeto, argv do subteste "L0 exato" (`node scripts/san3-05-acessos-de-plataforma.mjs . --schema-extra tests/fixtures/san3-05-mutacoes/c2-f2-schema.prisma --migration-extra …/c2-f2-migration.sql --mutant …/c2-f2-reader.fixture.tsx`): ec=0, stderr 0 bytes, `tabelas ENABLE=111 FORCE=111 · acessores Prisma em FORCE=111 · OPS(derivados)=17`. Sem extras: `ENABLE=108 FORCE=108 · FORCE=108`, 62 chaves L1/L2 (`$S/keys-obj.txt`). Chaves de `findOperatorsForVehicleAt`: 2 (`RAW-SQL($queryRaw)` em `field_dispatches` e `work_orders`, `PARAMETRO(tx)`, ×1).
- T13 inteiro no objeto (sem banco; `REDIS_URL=redis://127.0.0.1:1` inerte, nunca o Redis do dono): `node --test --test-reporter=tap --import tsx tests/san3-05-acessos-de-plataforma-guard.test.ts` ec=0 → **tests 35 · pass 35 · fail 0 · skipped 0** (`$S/t13-obj.tap`).
- h2 (mesmo worktree, `git checkout -q --detach 2043c584`, porcelain 0 antes): gerador com o argv do "L0 exato" ec=0, stderr 0 → `ENABLE=111 FORCE=111 · acessores Prisma em FORCE=111 · OPS=17`; sem extras `108/108/108`; 62 chaves; `diff keys-h2 keys-obj` = **vazio** (nenhuma chave mudou de forma; a chave de `findOperatorsForVehicleAt` é a mesma — o texto do SQL não entra na chave; a propriedade — leitura no `tx` da fase 2 sob o setter — é medida no item 1(c)). Volta ao objeto: HEAD=7c220467, porcelain 0.
- **Vermelho-controle 3(2) — o gerador acusa** (sonda `$S/zz-jtrc01c3a-mut.mjs`, md5 835436f3516a6b22f26290b571de026a, âncora única): `ALTER TABLE "traccar_ingress_receipts" FORCE ROW LEVEL SECURITY;` → comentário em `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` (âncora_count=1; numstat `1 1`): gerador `ENABLE=111 FORCE=110 · acessores em FORCE=110`; T13 ec=1, **pass 33 · fail 2** (`not ok 33 - L0 exato…`). Restauro: `git checkout -- <f>`, porcelain 0, hash-object = blob → RESTAURO_OK. (A aplicação dessa migração mutada num banco novo vem no trecho com banco.)
- veredito parcial 3 (sem banco): VERDE até aqui — sem diff em prisma/testes de despacho e OS/validators; L0 111 = 111 (objeto = h2); controle acusou.

## Terreno com banco (subida 20:14:49Z)
- Docker contado ANTES de subir (`$S/docker-ps-subida.txt`, 20:14:37Z): outros = `j07cb1c2-c2-runner`, `j07cb1c2-c2-pg` (1 trabalho; a (c″) já tinha descido); base viva `erp-postgres`, `erp-redis` listada à parte e não contada → 1 trabalho de outros = vaga. Espera registrada: 20:01Z, 20:04Z, 20:06Z, 20:10Z — 2 trabalhos de outros (j07cb1c2-c2 e jtrc01c3-c) → não subi; fiz antes o que não precisa de banco.
- Portas: `netsh … excludedportrange` sem faixa cobrindo 47761/47771; `docker ps -a` e `netstat` sem uso de 4776x/4777x. `jtrc01c3-a-pg` (postgres:16 → `PostgreSQL 16.14 (Debian 16.14-1.pgdg13+1)`) em **127.0.0.1:47761**, `jtrc01c3-a-redis` (redis:7) em **127.0.0.1:47771** (`docker port` confere loopback). Superusuário `jadmin`, senha aleatória (`node -e` crypto 18 bytes) em `$S/jtrc01c3-a.pw`, passada só por ambiente (`-e POSTGRES_PASSWORD`; psql `-v pw` via `-e JPW`); wrapper `$S/withdb.sh` (md5 05553ce87960094948e6d8097b111b92) põe `DATABASE_URL=postgresql://jadmin:***@127.0.0.1:47761/<db>`, `REDIS_URL=redis://127.0.0.1:47771`, `LOG_LEVEL=silent` só no processo; nenhum `export`.
- Bancos: `jtrc01c3_a_obj` — `npx prisma migrate deploy` do objeto ec=0 → **111** aplicadas, última `20260876000000_work_orders_vehicle_assigned_at`; `jtrc01c3_a_h2` — mesmo worktree em `2043c584` (checkout dentro dele, volta provada: HEAD=7c220467, porcelain 0), migrate deploy ec=0 → **111**, mesma última.
- Papéis (`$S/roles.sql`): `jtrc01c3a_rt` LOGIN NOSUPERUSER **NOBYPASSRLS** NOINHERIT (pg_roles super=f bypassrls=f inherit=f) e `jtrc01c3a_byp` LOGIN NOSUPERUSER **BYPASSRLS** NOINHERIT (só para os controles). DML concedido como o migrador dá ao runtime, por `GRANT USAGE ON SCHEMA public` + `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` + `USAGE, SELECT ON ALL SEQUENCES` + `EXECUTE ON ALL FUNCTIONS`, nos dois bancos.
- Log do servidor no MEU cluster: `ALTER SYSTEM SET log_statement='all'`, `log_line_prefix='%m %u %a %v %x '`, `pg_reload_conf()` → `show log_statement` = all (desligo no fim).

## Item 1 — o predicado novo não cruza organização (A RE-VERIFICAR: a ata do ciclo 1 dizia "organização nunca vem do payload"; o ciclo 3 mudou a consulta → re-medido)
Sonda `$S/zz-jtrc01c3a-iso.mts` (md5 **2ef2c13c2d8d63a7edfc8cb723cf909d**; adaptada da `zz-jtrc01c2c-db.mts` da (c′) ciclo 2, original md5 2c30ca24…), chamando o código do MEU worktree no objeto; admin só semeia e conta; `jtrc01c3a_rt` ingere (serviço do objeto, `createTraccarIngestionService`) e troca viatura (A: `RlsPrismaWorkOrderRepository.assign`; B: `UPDATE` sob `withTenantRls`). Cmd: `bash $S/withdb.sh jtrc01c3_a_obj timeout -k 15 300 node --import tsx $S/zz-jtrc01c3a-iso.mts ISO` → ec=0 (`$S/item1-obj.log`).

### 1(a) O SQL que o objeto EMITE (log do servidor, `docker logs jtrc01c3-a-pg` → `$S/pg-server.log`, 1060 linhas; valores de parâmetro omitidos)
Blob do objeto (`field-dispatch-prisma.repository.ts` l.38–52) e a instrução emitida pelo `jtrc01c3a_rt` — idênticos (17 execuções da consulta no log):
```
SELECT d.operator_user_id::text AS "operatorUserId", d.operator_assigned_at AS "operatorAssignedAt", d.accepted_at AS "acceptedAt",
       wo.vehicle_assigned_at AS "vehicleAssignedAt", (wo.vehicle_assigned_at > $1) AS "vehicleAssignedAfterFix"
  FROM field_dispatches d
  JOIN work_orders wo ON wo.tenant_id = d.tenant_id AND wo.id = d.work_order_id
 WHERE d.tenant_id = $2::uuid
   AND (wo.vehicle_id = $3::uuid OR wo.vehicle_assigned_at > $4)
   AND d.accepted_at IS NOT NULL AND d.accepted_at <= $5
   AND (LEAST(d.completed_at, d.cancelled_at, d.failed_at) IS NULL OR $6 < LEAST(d.completed_at, d.cancelled_at, d.failed_at))
```
→ a perna `OR` está INTEIRA entre parênteses, em conjunção com `d.tenant_id = $2` (árvore `A AND (B OR C) AND …`); o `JOIN` amarra `wo.tenant_id = d.tenant_id`. Na transação da ingestão (vxid 4/45 no log): `BEGIN` → `set_config('app.current_tenant_id', $1, true)` (1ª instrução) → `lock_timeout` → `statement_timeout` → … → a consulta → `COMMIT`: roda DENTRO de `withTenantRlsBudget`, depois do setter, como o papel sem bypass.
- veredito parcial 1(a): VERDE.

### 1(b) B povoada para tentar a perna nova, e nunca ingerida
Semeadura: A = V1, V2; OS1 e OS2 com V1, despachos aceitos (a1, a2); d1 vinculado a V1. B = VB1/VB2/VB3; OS(i) VB1 atribuída ANTES dos instantes; OS(ii) e OS(ii-b) com a viatura TROCADA antes de cada entrega (logo `vehicle_assigned_at > at` de todo fix entregue); OS(iii) viatura nula; 4 despachos aceitos; dB vinculado a VB1 e NUNCA ingerido. (iv) OS de B com o UUID de V1: **impedida** — `violates foreign key constraint "work_orders_tenant_id_vehicle_id_fkey"` (FK composta `(tenant_id, vehicle_id) → vehicles(tenant_id, id)`).

| entrega | esperado | medido | A | B · despachos de B que a perna nova aceitaria | igual |
|---|---|---|---|---|---|
| e1 P1-antes (fix Ta, 2 OS com V1) — controle | 202/ambiguous | 202/ambiguous_operator_at_fix_time | loc=0,rec=0,quar(d1)=1 | **loc=0,rec=0,quar(dB)=0** · 2 | sim |
| e2 P1-atrasado (fix Tb antes da troca de OS1, entregue depois) | 202/operator_history_ambiguous | 202/operator_history_ambiguous | loc=0,rec=0,quar=2 | **0,0,0** · 2 | sim |
| e3 P1-pós (fix Tc depois da troca) | 204 | 204 | loc=1,rec=1,quar=2 | **0,0,0** · 2 | sim |
| e4 dica ENVENENADA d1→B (`resolver.hints.set`) | 204 | 204 | loc=2,rec=2 | **0,0,0** · 2 | sim |
| e5 `tenant_id` de B em `position.attributes` | (escrevi "rejeitado") | 204 | loc=3,rec=3 | **0,0,0** · 2 | ver nota |
| e6 `tenantId` de B em `position.attributes` | (escrevi "rejeitado") | 204 | loc=4,rec=4 | **0,0,0** · 2 | ver nota |
| e7 fix Tg | 204 | 204 | loc=5,rec=5 | **0,0,0** · 2 | sim |

Fim: `B(loc=0,rec=0,quar(dB)=0)` em **7/7** entregas. Nota e5/e6: o MEU "esperado" estava errado — o schema do objeto (`traccar-position.schema.ts` l.7–10) declara `position.attributes` IGNORADO por inteiro (a 422 por chave reservada vale no envelope, em `position` e em `device`); o medido (gravado na organização do VÍNCULO, A; B intocada) é o que a regra do dono pede. Erro da sonda, não do produto. `traccar_quarantine_items` não tem coluna de organização: contei por chave de dispositivo (dB de B = 0 em todas).
- veredito parcial 1(b): VERDE.

### 1(c) O RLS no plano de execução e a consulta executada
Execução pelo código do produto (`findOperatorsForVehicleAt` com um proxy do `tx` que só registra o resultado do `$queryRaw`), dentro de `withTenantRls`, papel `jtrc01c3a_rt`; contagem por organização pelo conjunto de usuários de A e de B (id nunca publicado):
- GUC=A, tenant=A, V1, at=Tx (B com 2 despachos tentadores em Tx): **linhas=1 de_A=1 de_B=0**, perna_nova=0 → `single`.
- GUC=A, tenant=A, viatura de B: linhas=0. Cruzado — GUC=A com predicado tenant=B (só o RLS segura): **linhas=0**; GUC=B com predicado tenant=A: **linhas=0**.
`EXPLAIN (VERBOSE, COSTS OFF)` da consulta EXATA (texto extraído do arquivo do worktree, `$S/consulta-objeto.sql`, parâmetros na ordem do template `at,tenantId,vehicleId,at,at,at`), em transação com `set_config('app.current_tenant_id', A, true)` (`$S/explain-*.txt`, ids trocados por `<A>`/`<V1>`):
- **runtime (super=f, bypassrls=f):** `Result` com **`One-Time Filter: ((NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid = '<A>'::uuid)`** sobre o `Nested Loop`; `field_dispatches d` por `Index Cond: (d.tenant_id = '<A>')`; `work_orders wo` por `Index Cond: (wo.tenant_id = '<A>')` + `Filter: ((wo.vehicle_id = '<V1>') OR (wo.vehicle_assigned_at > '<at>'))`. Sem `BitmapOr`/`Append`.
- `pg_policies`: `field_dispatches_tenant_isolation` e `work_orders_tenant_isolation`, PERMISSIVE ALL, `qual=(tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid)`; `pg_class`: as 2 tabelas rowsecurity=t force=t.
- Leitura: o planejador pôs na MESMA classe de equivalência `d.tenant_id = wo.tenant_id = $tenant = <expressão da política>`; as políticas de `d` e de `wo` viraram a `One-Time Filter` (GUC = A) + `Index Cond` por organização nas duas tabelas; a perna `OR` fica no `Filter` do `wo` já restrito a A, não num ramo separado. Nó diferente do que o corpo imagina (filtro por tabela), filtro de política PRESENTE → nota (corpo, item 1, "Não grave"), não achado.
- veredito parcial 1(c): VERDE.

### Vermelho-controle do item 1 (os três acusaram)
- **(1) B seria candidata:** GUC=B, tenant=B, V1 (UUID de A): **linhas=2 de_B=2 perna_nova=2** → `history_ambiguous`; GUC=B, viatura inexistente: linhas=2 de_B=2 perna_nova=2 (só pela perna nova); BYPASSRLS, GUC=A, predicado tenant=B: linhas=2 de_B=2. A semeadura TENTA a porta.
- **(2) o EXPLAIN acusa a ausência:** `jtrc01c3a_byp` (bypassrls=t) e `jadmin` (super=t), mesma consulta e GUC: plano **sem** `One-Time Filter`, 0 ocorrência de `current_setting` (runtime: 1). A leitura distingue.
- **(3) sem o predicado de código** — mutação restaurável no MEU worktree (`$S/zz-jtrc01c3a-mut.mjs` md5 835436f3…, âncora `WHERE d.tenant_id = ${input.tenantId}::uuid` → `WHERE true /* … */`, âncora_count=1, numstat `1 1`, `npx tsc --noEmit -p tsconfig.json` ec=0), sonda `$S/zz-jtrc01c3a-mutprobe.mts` (md5 8a9be22b5b39550e0428bce3db667081), `$S/ctl3.log`:
  - runtime NOBYPASSRLS, GUC=A: **linhas=1 de_A=1 de_B=0** → `single` (o RLS segura sozinho);
  - BYPASSRLS, GUC=A: **linhas=3 de_A=1 de_B=2 perna_nova=2** → `history_ambiguous` (a disjunção sem as duas travas VAZA B);
  - EXPLAIN do mutado sob o runtime: `Index Cond: (d.tenant_id = (NULLIF(current_setting('app.current_tenant_id'…))::uuid)` e `Index Cond: (wo.tenant_id = (NULLIF(current_setting(…))::uuid)` — a política por tabela aparece quando o predicado de código some.
  - Restauro: `git checkout -- src/modules/field-dispatch/field-dispatch-prisma.repository.ts`, porcelain 0, hash-object = blob → RESTAURO_OK.
- grep da senha em `$S/pg-server.log` e `$S/item1-obj.log` = 0.
- **veredito do item 1: VERDE** — perna OR dentro da conjunção no SQL emitido; B(loc=0,rec=0,quar=0) em 7/7 com B tentando a porta; política presente sob o runtime e ausente sob bypass/superusuário; sem o predicado de código o RLS ainda segura e só o bypass vaza. Nenhum achado grave.

## Item 3 — regressão de banco (parte com banco) (A RE-VERIFICAR: a ata do ciclo 2 dizia "field-dispatch*/work-order* sem regressão (366)")
### 3(a) Despacho e OS
- cmd: `CORE_SAAS_PERSISTENCE=memory bash $S/withdb.sh jtrc01c3_a_obj timeout -k 15 1200 node --test --test-reporter=tap --import tsx <os 34 arquivos tests/field-dispatch* + tests/work-order*>` (REDIS_URL meu, DATABASE_URL do meu `jtrc01c3_a_obj`) → ec=0, **tests 366 · pass 366 · fail 0 · cancelled 0 · skipped 0** (`$S/fdwo-obj.tap`, 0 `not ok`, 0 `# SKIP`).
- N por arquivo (34 execuções separadas, `$S/fdwo-perfile.txt`, todas ec=0, skipped 0): field-dispatch-checklist-set-port 9 · field-dispatch-multi-checklist 15 · field-dispatch-routes 2 · field-dispatch-target-role 8 · field-dispatch 4 · work-order-attachment-dto 4 · work-order-attachments-routes 12 · work-order-attachments 8 · work-order-audit-logs 8 · work-order-cancel-duplicate-routes 9 · work-order-cancel-duplicate 25 · work-order-checklist-snapshot-dto 5 · work-order-checklists-freeze-links-db 6 · work-order-checklists-junction-schema-db 18 · work-order-checklists-legacy-key-fallback 3 · work-order-checklists-sticky-db 8 · work-order-checklists-sticky 15 · work-order-comments-routes 15 · work-order-comments 21 · work-order-detail-links 5 · work-order-financials-routes 8 · work-order-financials 31 · work-order-geocode-route 13 · work-order-geocoding 10 · work-order-invoicing 16 · work-order-map 17 · work-order-mileage 24 · work-order-origin-destination 11 · work-order-registry-snapshot 14 · work-order-sla 7 · work-order-timeseries 8 · work-orders-list-coordinates 2 · work-orders-routes 3 · work-orders 2 → **soma 366**.
- **Vermelho-controle 3(3) — a regressão vê:** a mesma invocação SEM `tests/field-dispatch-checklist-set-port.test.ts` → **tests 357** (= 366 − 9), ec=0.
- Nenhum desses 34 chama `findOperatorsForVehicleAt`/`classifyOperatorsAtFixTime` (`git grep` acima).
- veredito parcial 3(a): VERDE.

### 3(b) As transições do despacho (28 arestas da máquina; o "21" era o roteiro da (c′))
- Sonda `$S/zz-jtrc01c3a-trans.sql` (md5 ac705cabf5926abb33e52b03b852a8b9; escrita por mim — o texto da `zz-jtrc01c2c-trans.sql` não está verbatim na evidência do ciclo 2, só o md5): as **28 arestas** de `FIELD_DISPATCH_STATUS_TRANSITIONS`, um despacho por aresta, ids e relógio FIXOS, reatribuição de operador nas arestas `→ reassigned`, e a **troca da viatura da OS no meio** (aresta 14, `UPDATE work_orders SET vehicle_id = VB`); `BEGIN … ROLLBACK`; como superusuário do meu cluster (os gatilhos disparam igual).
- `docker exec -i jtrc01c3-a-pg psql -U jadmin -d <db> -At < zz-jtrc01c3a-trans.sql`:
  - `jtrc01c3_a_obj`: arestas=28 aceitas=28 **recusadas=0** · fd_linhas=28 **fd_md5_sem_operator_assigned_at=913cc6f21b5c5fdd232b04b8a7e9137b** · fd_md5_completo=0fe8914d… · wo_linhas=1 wo_viatura_trocada=true **wo_md5_sem_vehicle_assigned_at=2068812c1c1717bdb92ab5ba8db1a8fa** · residuo_tenant=0
  - `jtrc01c3_a_h2`: arestas=28 aceitas=28 **recusadas=0** · **913cc6f2…** (IGUAL) · fd_md5_completo=69f19dfb… (difere só pelo `operator_assigned_at = now()`) · wo **2068812c…** (IGUAL) · residuo_tenant=0
  - A máquina no Node: `field-dispatch.validators.ts` sem diff h2→objeto (blob idêntico) → recusas iguais por construção.
- **Vermelho-controle 3(1) — o comparador acusa:** cópia `$S/zz-jtrc01c3a-trans-ctl.sql` (md5 e13e350dbc95ad3c6fa7d324d1c4dcc6) com gatilho MEU `jtrc01c3a_ctl` (`observation` := texto em `on_route`), criado DENTRO da transação: fd_md5_sem_operator_assigned_at = **63830fe9437a4b6b65b6dc8f799cd769** (DIVERGE de 913cc6f2…); depois do ROLLBACK, `pg_trigger jtrc01c3a_ctl`=0, `pg_proc`=0, tenant=0.
- veredito parcial 3(b): VERDE — 0 recusa divergente, md5 igual fora de `*_assigned_at`, inclusive com a viatura trocada no meio.

### 3(c) Nada de banco mudou
- Catálogo, `jtrc01c3_a_obj` × `jtrc01c3_a_h2` (ambos 111 migrações): tabelas `public` com ENABLE=108 e FORCE=108 nos dois, lista FORCE idêntica (`diff` vazio); md5 de `pg_policies` e4e328af… = e4e328af…; md5 dos gatilhos não internos (`pg_get_triggerdef`) 15f8c8e0… = 15f8c8e0…; md5 de `information_schema.columns` 2b96000c… = 2b96000c…. (108 no catálogo = 108 do gerador sem extras; o "L0=111" do subteste é com as 3 tabelas das fixtures C3-F2 — objeto = h2.)
- **Vermelho-controle 3(2), parte de banco:** a migração mutada (sem `FORCE` em `traccar_ingress_receipts`) aplicada num banco NOVO meu `jtrc01c3_a_mut` (migrate deploy ec=0) → **FORCE=107**, ENABLE=108, receipts_force=false; restauro provado (porcelain 0, hash-object = blob, RESTAURO_OK); `jtrc01c3_a_mut` removido pelo nome.
- `tests/san3-05-runtime-role-guard-db.test.ts` contra o MEU cluster (`jtrc01c3_a_obj`): ec=1, **tests 12 · pass 3 · fail 9** — o motivo lido é do terreno: `escape atributo/postgres não encontrado` — a suíte exige que o superusuário do cluster se chame `postgres` (o do meu cluster é `jadmin`). Vermelho pelo motivo errado (corpo, "Armadilhas"), não achado; deixou 8 papéis `s305_*` no MEU cluster (somem com o container). Na CI do objeto (job `backend`, 2 runs) os casos `T5/T6/T9` e `T8e` estão `ok`. Re-executo num cluster cujo superusuário é `postgres` (junto da forma Linux do job, abaixo).

## Normas citadas na ref julgada (§A7) — `MSYS_NO_PATHCONV=1 git show <ref>:CLAUDE.md | grep -c -F '<âncora>'`, objeto 7c220467 e origin/main a26f8afe (N iguais nas duas)
- `D-MEDIR-NA-REF-ALVO` 1/1 · `A partir do ciclo 3, só bloqueia` (§C7 item 8(2)) 1/1 · `D-GOV-PROPORCIONAL` 3/3 · `1-bis. INSPEÇÃO DE TERRENO ANTES` (l.464) e `1-ter. ESCOPO DO VEREDITO` (l.432) presentes · `4-bis. **SEPARAÇÃO DE PAPÉIS` 1/1 · `Paradas imediatas irredutíveis` 1/1 · `ESGOTADO O FABLE, CAI PARA O OPUS` 1/1 · `P7 — Pausa ordenada` 1/1 · `Limpeza pós-validação e` 1/1 · decisoes.md: `D-TRACCAR-HTTP-PRIVADO-AWS` 1/1, `janela de tempo` 1/1. Pendências do plano §4 (objeto): `P-TRC-CI-COMENTARIO-DENOMINADOR` (l.468) e `P-CI-LISTA-CURADA-6-PRE-EXISTENTES` (l.473) registradas, com dono "governança/CI".
- `tests/traccar-dev-topology.test.ts` no Windows (Docker presente; só `docker compose … config`, não sobe nada), REDIS_URL meu: **tests 12 · pass 12 · fail 0 · skipped 0** (insumo para o limite conhecido da forma Linux sem Docker).

## Item 2 — CI (parte com banco): a forma do job `backend-postgres`, em Linux meu, 3× (A RE-VERIFICAR: ata do ciclo 2 "lista curada com as 6 suítes e o guard de zero pulos"; o ciclo 3 mudou o denominador → re-medido)
- Terreno (mesmo trabalho Docker): rede `jtrc01c3-a-tl-net`; `jtrc01c3-a-tl-pg` (postgres:16, superusuário `postgres`, senha aleatória = a do meu arquivo, só por ambiente; publicado só em **127.0.0.1:47781**, para a suíte do guard do runtime que exige superusuário `postgres`); `jtrc01c3-a-tl-redis` (redis:7, sem porta publicada); runner `jtrc01c3-a-tl-run` = imagem local `erp-teste-linux:1` (Debian 13, node v20.20.2, psql 16.15, SEM docker), `--rm`. Roteiro `teste-linux.sh` NÃO usado verbatim: escrevi `$S/job.sh` (md5 final 686050011d709537b65e1e9221287e79; a 1ª versão, das 3 rodadas, tinha md5 68197f797a018ea0d4ac11b8e50d0a36 e difere só por aceitar `TARF` e o modo `once`, acrescentados depois) com o ambiente LIDO do job `backend-postgres` do ci.yml do objeto: `CORE_SAAS_PERSISTENCE=prisma`, `RBAC_DB_PARITY=1`, `LOG_LEVEL=silent`, `JWT_SECRET=dev-only-change-me`, `JWT_EXPIRES_IN=15m`, `CI=true`; passos `npm ci` → `npm run db:generate` → (por rodada: DROP/CREATE do banco) `npx prisma migrate deploy` → `npm run db:seed` → o bloco `SUITES=` **extraído por awk do próprio ci.yml do objeto** (49 linhas → 49 arquivos) → `node --test --import tsx $SUITES | tee` (pipefail) → o guard de pulos do ci.yml (`grep '^# skipped '`, vazio = falha, ≠ 0 = falha).
- Fonte: `git -c core.autocrlf=false archive 7c220467 -- . ':(exclude)frontend' ':(exclude)mobile' ':(exclude)screen-refs' ':(exclude)docs/claude-code-handoff'` → `$S/obj.tar` (3493 entradas; `src/database/rls.ts` com 0 CR; md5 de `.github/workflows/ci.yml` no tar = no blob, e8f561fd…) — LF, sem o problema do §C7.1-ter(c).

| rodada | tests | pass | fail | skipped | duração | guard |
|---|---|---|---|---|---|---|
| 1 | 391 | 391 | 0 | 0 | 108 s | 0 pulos (ec 0) |
| 2 | 391 | 391 | 0 | 0 | 93 s | 0 pulos (ec 0) |
| 3 | 391 | 391 | 0 | 0 | 100 s | 0 pulos (ec 0) |

→ denominador **constante 391**, = o `# tests 391` das 2 execuções do check-run `backend-postgres` do objeto.
- **Vermelho-controle M-CI1 — o guard morde:** mesmo comando com `env -u DATABASE_URL` só no `node --test`: ec=1, **tests 56 · pass 7 · fail 2 · skipped 47** (sentinelas `# SKIP` das suítes `-db`; os 2 `fail` são os 2 casos de `permission-catalog-db-parity` com `RBAC_DB_PARITY=1` e sem banco) → guard "PULOU 47", **ec=1**. Com a variável de volta (rodadas 1–3): 0.
- **Vermelho-controle — o denominador vê:** cópia `/out/tl-suites-menos1.sh` (no scratch, nunca no repo) sem a linha `tests/traccar-quarantine-db.test.ts` (48 linhas): **tests 385** (= 391 − 6), ec=0.
- (nota de medição: na parte sem banco escrevi "50 arquivos" no `SUITES=`; a extração por awk dá **49** — corrijo para 49.)
- **Soma por arquivo, no objeto** (49 execuções separadas em Linux, banco resetado uma vez, `$S/tl-more.out`): todas ec=0, skipped 0; checklist-routes-db 4 · permission-catalog-db-parity 2 · permission-catalog-migration-parity 3 · checklist-applicability-schema-db 11 · checklist-applicability-prisma-db 13 · work-order-checklists-junction-schema-db 18 · checklist-run-role-db 4 · impound-checklist-link-autolink 2 · checklist-template-prisma-db 5 · checklist-run-lifecycle-db 6 · checklist-run-create-concurrency-db 2 · persistent-rbac-middleware 2 · core-saas-persistence-restart-db 6 · core-saas-role-authority-db 5 · auth-identity-links-db 15 · auth-identity-revocation-db 10 · auth-identity-role-real-db 10 · auth-identity-backfill-db 6 · auth-identity-link-events-db 5 · auth-login-candidates-fn-db 11 · auth-login-anonymous-db 6 · auth-identity-exposure-scan 1 · rls-tenant-isolation 1 · impound-custody-history-db 3 · vehicle-identity-merge-db 5 · work-order-checklists-freeze-links-db 6 · work-order-checklists-sticky-db 8 · financial-period-close-write-race-db 6 · o6r06-usage-atomic-db 17 · o6r06-usage-fault-injection 6 · o6r06-cost-summary-sum-db 7 · o6r06-allocation-basis-rls-db 10 · financial-pay-title-atomic-db 4 · financial-entry-reverse-restore-db 8 · cheque-clear-bounce-atomic-db 11 · financial-title-invariants-db 15 · pg-barrier-scoped-db 2 · financial-entry-delete-reverse-race-db 9 · inventory-balance-lock-race-db 16 · inventory-cycle-count-close-units-db 22 · inventory-unique-backstops-db 8 · inventory-migration-drill-db 6 · **traccar-binding-uniqueness-db 6 · traccar-idempotency-db 9 · traccar-ingest-pool-db 2 · traccar-position-ingestion-db 22 · traccar-quarantine-db 6 · traccar-resolution-race-db 5** · expense-sync-atomic-db 24 → **soma 391** = o denominador das 3 rodadas.
- **h2** (`git -c core.autocrlf=false archive 2043c584 …` → `$S/h2.tar`, a MESMA forma, `SUITES=` extraído do ci.yml do h2, 49 arquivos): 1 rodada **tests 389 · pass 389 · fail 0 · skipped 0**, guard 0 pulos. Diferença objeto − h2 = **2** = os 2 casos `test(` NOVOS de `tests/traccar-position-ingestion-db.test.ts` (`git diff 2043c584 7c220467 -- tests/`: +2 casos novos nesse arquivo — "a OS que tinha a viatura no instante do fix e a perdeu depois…" e "OS de OUTRA viatura que trocou de viatura depois do fix…" — e 1 renomeado; o outro caso novo está em `traccar-operator-at-fix-time.test.ts`, que não é `-db` nem está na lista). Só contei; o mérito é da (c″).
- veredito parcial 2(b): VERDE — fail 0, skipped 0, denominador 391 constante nas 3, = soma por arquivo, = h2 + 2 casos `-db` novos; os dois controles acusaram.

### 2(c) A forma do job `backend` (npm test pelo runner, `DATABASE_URL`/`REDIS_URL` presentes, `CORE_SAAS_PERSISTENCE=memory`) — `$S/job-backend.sh` (md5 c42d627d0b7840d1a946f0f1ea6d6f59), Linux, banco `jtrc01c3_a_bk` no `jtrc01c3-a-tl-pg` (superusuário `postgres`)
- `sync-agent-agents --check` ec=0 · `migrate deploy` ec=0 · `npm run check` ec=0 · `npm test` ec=1 em 489 s: `[run-backend-tests] 320 arquivo(s) · 3467 teste(s) · pass 3440 · fail 25 · skipped 2` · `npm run build` ec=0.
- `skipped 2` = exatamente os 2 nomeados de `permission-catalog-db-parity` (ok 2202/2203, `# SKIP RBAC_DB_PARITY não é "1"`).
- As **25 falhas**, uma a uma, pelo motivo lido no TAP (`$S/bk-test.log`) — TODAS de terreno, nenhuma em suíte do Traccar `-db`, de despacho ou de OS:
  - 9 × `traccar-dev-topology` (2745–2754: o container não tem `docker`) → re-executada no Windows com Docker: **12/12** (acima). Limite conhecido do ciclo 2.
  - 1 × `approval-frontend-contract` e 1 × `checklist-editor-blockers-parity` (`ENOENT … frontend/src/…`: o MEU tar excluiu `frontend/`) → re-executadas no worktree completo: **1/1** e **1/1**.
  - 1 × `san3-04a-menu-front-x-catalogo` (lê `frontend/`) → re-executada: **14/14**.
  - 13 × `o6r07c-census-guard` (T0–T12 + "tempo do censo"; no Linux: `Command failed: git ls-files src` — o tar não tem `.git`). Re-execução: Windows ×3 → 15 casos, 12 pass, 3 fail, os 3 por **falha de processo do Node** no filho do censo (`FATAL ERROR: NewSpace::EnsureCurrentCapacity Allocation failed`, depois `Fatal process out of memory: Zone`; RAM do host/commit com o disco a 96%); Linux com `git init` (`$S/job-census.sh`, md5 70f54687745cd3ac1c4250930e10bfc9; `git ls-files src` = 794) → **o motor do Docker caiu** durante o `npm ci` dessa execução (`error waiting for container: unexpected EOF`, ~21:05Z; todos os containers foram a `Exited (255)`; a base viva `erp-*` voltou sozinha pela política de reinício — não a toquei). **NÃO reexecutei verde** esta suíte no meu terreno. Insumos: o check-run `backend` do objeto (2 runs) tem `fail 0` (ela passa lá); `git diff --name-only 2043c584 7c220467 -- tests/o6r07c-census-guard.test.ts tests/helpers src/app.ts src/routes` = **0** (o ciclo 3 não toca o que ela lê; o diff de `src/` são só os 3 arquivos de `field-dispatch`). Não tentei de novo no Docker para não derrubar o motor outra vez com outra junta de pé (`porteiro440-pg` subiu às 21:06Z).
- Suítes do Traccar no `npm test` Linux: presentes; as `-db` todas `ok` (as 9 `not ok` são só da topologia, acima). Guard do runtime (`san3-05-runtime-role-guard-db`) nesta forma, com superusuário `postgres`: `ok` T5/T6/T9 (papel limpo passa — **0 escape**), T8b, T8c, T8d, T8e, **T14a/b** (contém a asserção `^<papel>|f|f|f|f|0|0|118$` → **118 tabelas com DML**), T14c, T14d, T15.
- veredito parcial 2(c): VERDE no que o item vigia (as provas de banco do Traccar e os 2 pulos nomeados); **nota** de terreno: 13 casos de `o6r07c-census-guard` sem reexecução verde própria (ambiente), CI do objeto verde para eles e 0 diff nos insumos — classe não grave, escopo pré-existente/terreno, não reprova.

### Fecho do item 3(c) — tabelas_com_dml
- `RUNTIME_ROLE_GUARD_SQL` pelo teste do objeto, na forma Linux com superusuário `postgres`: **118** e 0 escape (acima). No MEU cluster (superusuário `jadmin`) a suíte dá 3/12 por motivo errado (exige o nome `postgres`) — declarado, não achado.
- **veredito do item 3: VERDE** — 366/366 sem diff (N por arquivo, controle 357); 28 arestas, 0 recusa divergente, md5 igual fora de `*_assigned_at` com troca de viatura no meio (controle divergiu); prisma sem diff, catálogo objeto = h2 (FORCE 108 = 108, políticas/gatilhos/colunas iguais), L0 111 = 111, chaves T13 iguais, T13 35/35, 118 com 0 escape; controles (gatilho, FORCE 110/107, arquivo omitido) acusaram.
- **veredito do item 2: VERDE** — check-run 391/391 skipped 0; 3× 391 constante = soma por arquivo = h2 389 + 2; M-CI1 e denominador acusaram; forma `backend` com os 2 pulos nomeados e todas as falhas atribuídas a terreno (nota acima).

## Apêndice — ferramentas desta cadeira, verbatim (para sucessor P3)

### `zz-jtrc01c3a-iso.mts` (md5 2ef2c13c2d8d63a7edfc8cb723cf909d)
````
// Sonda da cadeira (a″) ciclo 3 — item 1: o predicado novo de findOperatorsForVehicleAt não cruza organização.
// admin (superusuário do MEU cluster) só semeia e conta; jtrc01c3a_rt (LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT) ingere e troca.
// Publica desfechos e CONTAGENS; nunca coordenada, nunca id de organização. Adaptada da zz-jtrc01c2c-db.mts (c′ ciclo 2).
// Uso: node --import tsx zz-jtrc01c3a-iso.mts ISO     (DATABASE_URL admin, JTRC_PW, JSCR só por prefixo)
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const WP = "C:/Users/AMP/w-jc3-a/";
const W = "file:///" + WP;
const SCR = process.env.JSCR!;
const NUL = String.fromCharCode(0);
const { PrismaPg } = await import(W + "node_modules/@prisma/adapter-pg/dist/index.mjs");
const { PrismaClient } = await import(W + "node_modules/@prisma/client/default.js");
const rls = await import(W + "src/database/rls.ts");
const dispatch = await import(W + "src/modules/field-dispatch/field-dispatch-prisma.repository.ts");
const woRepo = await import(W + "src/modules/work-orders/work-order-prisma.repository.ts");
const service = await import(W + "src/integrations/traccar/traccar-ingestion.service.ts");
const schema = await import(W + "src/integrations/traccar/traccar-position.schema.ts");
const adapter = await import(W + "src/integrations/traccar/traccar-position.adapter.ts");
const app = await import(W + "src/integrations/traccar/traccar-ingest.app.ts");
const URL0 = process.env.DATABASE_URL!;
const asRole = (role: string) => { const u = new URL(URL0); u.username = role; u.password = process.env.JTRC_PW!; u.searchParams.set("application_name", "jtrc01c3a"); return u.toString(); };
const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL0 }) });
const rt = new PrismaClient({ adapter: new PrismaPg({ connectionString: asRole("jtrc01c3a_rt") }) });
const byp = new PrismaClient({ adapter: new PrismaPg({ connectionString: asRole("jtrc01c3a_byp") }) });
const FASE = process.argv[2] ?? "ISO";
const INSTANCE = `jtrc-c3a-${randomUUID().slice(0, 8)}`;
const FIX = JSON.parse(readFileSync(WP + "infra/traccar/fixtures/6.16.0/position-osmand.json", "utf8"));
const RELAX = { phaseTwo: { maxWait: 5_000, timeout: 10_000 }, discovery: { maxWait: 5_000, timeout: 10_000 } };
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const say = (s: string) => console.log(s);
const svc: any = service.createTraccarIngestionService({ client: rt, timeoutMs: 15_000, resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 }, budgets: RELAX, publish: (async () => ({ event: {}, published: true })) as never, logger: { info: () => undefined, warn: () => undefined, error: (o: any) => say(`[log.error] ${JSON.stringify(o)}`) } });
const st = (o: any) => `${app.traccarIngestResponse(o).status}${o.reason ? "/" + o.reason : ""}`;
const n = async (sql: string, ...v: unknown[]) => Number(((await admin.$queryRawUnsafe(sql, ...v)) as any[])[0].n);
async function newTenant(tag: string) { const s = `jtrc-c3a-${tag}-${randomUUID().slice(0, 6)}`; const r: any = await admin.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1,$1) RETURNING id`, s); return r[0].id as string; }
async function newUser(t: string, l: string) { const r: any = await admin.$queryRawUnsafe(`INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid,$2,$3) RETURNING id`, t, `Tec ${l}`, `jc3a-${l}-${randomUUID().slice(0, 6)}@example.com`); return r[0].id as string; }
async function newVehicle(t: string) { const id = randomUUID(); await admin.$executeRawUnsafe(`INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ($1::uuid,$2::uuid,$3,'sint')`, id, t, `JA${id.slice(0, 5).toUpperCase()}`); return id; }
async function newWO(t: string, v: string | null) { const r: any = await admin.$queryRawUnsafe(`INSERT INTO work_orders (tenant_id, code, title, vehicle_id) VALUES ($1::uuid,$2,'OS sint',$3::uuid) RETURNING id`, t, `JA-${randomUUID().slice(0, 8)}`, v); return r[0].id as string; }
const drepo = <T>(t: string, f: (r: any) => Promise<T>) => rls.withTenantRls(rt, t, (tx: any) => f(new dispatch.PrismaFieldDispatchRepository(tx)));
async function accepted(t: string, wo: string, op: string) { const d: any = await drepo(t, (r) => r.create({ tenantId: t, workOrderId: wo, operatorUserId: op, status: "assigned" })); await pause(40); await drepo(t, (r) => r.changeStatus({ tenantId: t, dispatchId: d.id, status: "accepted" })); await pause(40); return d.id as string; }
async function bind(t: string, v: string) { const dev = `ja${randomUUID().slice(0, 8)}`; await admin.$executeRawUnsafe(`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key, valid_from) VALUES ($1::uuid,$2::uuid,$3,$4, now() - interval '1 hour')`, t, v, INSTANCE, dev); return dev; }
async function swapP(t: string, wo: string, op: string, v: string) { const r = await new woRepo.RlsPrismaWorkOrderRepository(rt).assign({ tenantId: t, workOrderId: wo, operatorId: op, vehicleId: v, message: "jc3a troca", assignedBy: op }); if (!r) throw new Error("assign devolveu undefined"); await pause(40); }
async function swapS(t: string, wo: string, v: string | null) { await rls.withTenantRls(rt, t, (tx: any) => tx.$executeRawUnsafe(`UPDATE work_orders SET vehicle_id = $2::uuid WHERE id = $1::uuid`, wo, v)); await pause(40); }
function body(dev: string, at: Date, attrs?: Record<string, unknown>) { const b = structuredClone(FIX); b.device.uniqueId = dev; b.position.fixTime = at.toISOString(); b.position.deviceTime = at.toISOString(); if (attrs) Object.assign(b.position.attributes, attrs); return b; }
function cmd(dev: string, at: Date, attrs?: Record<string, unknown>) { return adapter.buildTraccarPositionCommand(schema.parseTraccarPositionEnvelope(body(dev, at, attrs)), { instanceKey: INSTANCE, receivedAt: new Date() }); }
async function fixNow() { await pause(40); const d = new Date(); await pause(40); return d; }
const locs = (t: string) => n(`SELECT count(*) n FROM field_operator_locations WHERE tenant_id=$1::uuid`, t);
const recs = (t: string) => n(`SELECT count(*) n FROM traccar_ingress_receipts WHERE tenant_id=$1::uuid`, t);
const quarDevs = (devs: string[]) => n(`SELECT count(*) n FROM traccar_quarantine_items WHERE instance_key=$1 AND external_device_key = ANY($2::text[])`, INSTANCE, devs);
// ---------- semeadura ----------
const TA = await newTenant("orgA"); const TB = await newTenant("orgB");
const V1 = await newVehicle(TA); const V2 = await newVehicle(TA); const a1 = await newUser(TA, "a1"); const a2 = await newUser(TA, "a2");
const OS1 = await newWO(TA, V1); const OS2 = await newWO(TA, V1); const d1 = await bind(TA, V1);
const VB1 = await newVehicle(TB); const VB2 = await newVehicle(TB); const VB3 = await newVehicle(TB);
const ub = [await newUser(TB, "b1"), await newUser(TB, "b2"), await newUser(TB, "b3"), await newUser(TB, "b4")];
const dB = await bind(TB, VB1);
const usersB = new Set(ub); const usersA = new Set([a1, a2]);
await accepted(TA, OS1, a1); await accepted(TA, OS2, a2);
// B: (i) viatura de B atribuída ANTES dos instantes; (ii) e (ii-b) viatura de B trocada DEPOIS de cada instante; (iii) viatura nula
const OSBi = await newWO(TB, VB1); const OSBii = await newWO(TB, VB2); const OSBiii = await newWO(TB, null); const OSBiib = await newWO(TB, VB3);
await accepted(TB, OSBi, ub[0]); await accepted(TB, OSBii, ub[1]); await accepted(TB, OSBiii, ub[2]); await accepted(TB, OSBiib, ub[3]);
// (iv) OS de B com vehicle_id = UUID de V1 (de A)
let ivImpedido = "?";
try { await newWO(TB, V1); ivImpedido = "NAO (inserida!)"; } catch (e: any) { const msg = String(e?.message ?? e); ivImpedido = `sim (${msg.match(/violates [a-z ]+constraint "[^"]+"/)?.[0] ?? msg.slice(0, 120)})`; }
say(`[semeadura] A: OS1 e OS2 com V1, despachos aceitos (a1,a2), d1 vinculado a V1 · B: OS(i) VB1, OS(ii) VB2, OS(iii) viatura nula, OS(ii-b) VB3, 4 despachos aceitos, dB vinculado a VB1 (nunca ingerido) · OS de B com o UUID de V1 impedida: ${ivImpedido}`);
let alt = 0;
async function tentaB() { alt++; await swapS(TB, OSBii, alt % 2 ? VB3 : VB2); await swapS(TB, OSBiib, alt % 2 ? VB2 : VB3); }
const vaaB = async (at: Date) => n(`SELECT count(*) n FROM work_orders wo JOIN field_dispatches d ON d.tenant_id=wo.tenant_id AND d.work_order_id=wo.id WHERE wo.tenant_id=$1::uuid AND wo.vehicle_assigned_at > $2::timestamptz AND d.accepted_at <= $2::timestamptz`, TB, at);
const rows: string[] = [];
async function line(id: string, esperado: string, medido: string, at: Date | null) {
  const A = `A(loc=${await locs(TA)},rec=${await recs(TA)},quar(d1)=${await quarDevs([d1])})`;
  const B = `B(loc=${await locs(TB)},rec=${await recs(TB)},quar(dB)=${await quarDevs([dB])})`;
  const tent = at ? ` · despachos de B na janela com vaa>at (a perna nova os aceitaria)=${await vaaB(at)}` : "";
  const ok = medido === esperado && /B\(loc=0,rec=0,quar\(dB\)=0\)/.test(B) ? "sim" : "NAO";
  const l = `| ${id} | ${esperado} | ${medido} | ${A} | ${B}${tent} | ${ok} |`; rows.push(l); say(l);
}
async function ing(dev: string, at: Date, attrs?: Record<string, unknown>) { let c: any; try { c = cmd(dev, at, attrs); } catch (e: any) { return `rejeitado-no-schema`; } return st(await svc.ingest(c)); }
async function captura(client: any, tenantGuc: string, input: { tenantId: string; vehicleId: string; at: Date }) {
  let got: any[] = []; let res: any;
  await rls.withTenantRls(client, tenantGuc, async (tx: any) => { const px = { $queryRaw: (...a: any[]) => tx.$queryRaw(...a).then((r: any[]) => { got = r; return r; }) }; res = await dispatch.findOperatorsForVehicleAt(px as any, input); });
  const nA = got.filter((c) => usersA.has(c.operatorUserId)).length; const nB = got.filter((c) => usersB.has(c.operatorUserId)).length;
  return { total: got.length, nA, nB, outras: got.length - nA - nB, perna: got.filter((c) => c.vehicleAssignedAfterFix === true).length, res: res?.kind ?? JSON.stringify(res) };
}
try {
  // ---------- 1(b) sequência do P1 + dica envenenada + chave de organização no payload; B tentada antes de CADA entrega ----------
  const Ta = await fixNow(); const Tb = await fixNow(); await tentaB();
  await line("e1 P1-antes (fix Ta, as 2 OS com V1) — controle", "202/ambiguous_operator_at_fix_time", await ing(d1, Ta), Ta);
  await swapP(TA, OS1, a1, V2); const Tc = await fixNow(); await tentaB();
  await line("e2 P1-atrasado (fix Tb tirado ANTES da troca de OS1, entregue depois)", "202/operator_history_ambiguous", await ing(d1, Tb), Tb);
  await tentaB();
  await line("e3 P1-pos (fix Tc depois da troca)", "204", await ing(d1, Tc), Tc);
  const Td = await fixNow(); await tentaB();
  svc.resolver.hints.set(`${INSTANCE}${NUL}${d1}`, { tenantId: TB, expiresAt: Date.now() + 600_000 });
  await line("e4 dica ENVENENADA d1→B", "204", await ing(d1, Td), Td);
  const Te = await fixNow(); await tentaB();
  await line("e5 tenant_id de B em position.attributes", "rejeitado-no-schema", await ing(d1, Te, { tenant_id: TB }), Te);
  const Tf = await fixNow(); await tentaB();
  await line("e6 tenantId de B em position.attributes", "rejeitado-no-schema", await ing(d1, Tf, { tenantId: TB }), Tf);
  const Tg = await fixNow(); await tentaB();
  await line("e7 fix Tg (204; B tentada)", "204", await ing(d1, Tg), Tg);
  // ---------- 1(c) a consulta executada pelo código do produto, papel do runtime, GUC de A ----------
  const Tx = await fixNow(); await tentaB();
  say(`[1c] despachos de B na janela com vaa>Tx (candidatos da perna nova se o filtro de organização falhasse)=${await vaaB(Tx)}`);
  const cA = await captura(rt, TA, { tenantId: TA, vehicleId: V1, at: Tx });
  say(`[1c-exec] runtime, GUC=A, tenant=A, V1: linhas=${cA.total} de_A=${cA.nA} de_B=${cA.nB} outras=${cA.outras} perna_nova=${cA.perna} classificacao=${cA.res}`);
  const cAb = await captura(rt, TA, { tenantId: TA, vehicleId: VB1, at: Tx });
  say(`[1c-exec] runtime, GUC=A, tenant=A, viatura de B (VB1): linhas=${cAb.total} de_A=${cAb.nA} de_B=${cAb.nB} perna_nova=${cAb.perna}`);
  const cX1 = await captura(rt, TA, { tenantId: TB, vehicleId: V1, at: Tx });
  say(`[1c-cruz] runtime, GUC=A, predicado tenant=B (só o RLS segura): linhas=${cX1.total} de_A=${cX1.nA} de_B=${cX1.nB}`);
  const cX2 = await captura(rt, TB, { tenantId: TA, vehicleId: V1, at: Tx });
  say(`[1c-cruz] runtime, GUC=B, predicado tenant=A: linhas=${cX2.total} de_A=${cX2.nA} de_B=${cX2.nB}`);
  // ---------- controle (1): B SERIA candidata ----------
  const cB = await captura(rt, TB, { tenantId: TB, vehicleId: V1, at: Tx });
  say(`[ctl-1] runtime, GUC=B, tenant=B, V1 (UUID de A): linhas=${cB.total} de_A=${cB.nA} de_B=${cB.nB} perna_nova=${cB.perna} classificacao=${cB.res}`);
  const cBx = await captura(rt, TB, { tenantId: TB, vehicleId: randomUUID(), at: Tx });
  say(`[ctl-1] runtime, GUC=B, tenant=B, viatura inexistente: linhas=${cBx.total} de_B=${cBx.nB} perna_nova=${cBx.perna}`);
  const cBy = await captura(byp, TA, { tenantId: TB, vehicleId: V1, at: Tx });
  say(`[ctl-1] BYPASSRLS, GUC=A, predicado tenant=B: linhas=${cBy.total} de_A=${cBy.nA} de_B=${cBy.nB} (sem RLS, o predicado decide)`);
  // ---------- 1(c) EXPLAIN (VERBOSE, COSTS OFF) da consulta EXATA do arquivo do worktree ----------
  const src = readFileSync(WP + "src/modules/field-dispatch/field-dispatch-prisma.repository.ts", "utf8");
  const m = src.match(/tx\.\$queryRaw<OperatorAtFixTimeCandidate\[\]>`([\s\S]*?)`;/);
  if (!m) throw new Error("template da consulta nao encontrado");
  const order: string[] = []; let k = 0;
  const sql = m[1].replace(/\$\{input\.(\w+)\}/g, (_s, name) => { order.push(name); return `$${++k}`; });
  writeFileSync(SCR + "/consulta-objeto.sql", sql);
  const inputX: any = { tenantId: TA, vehicleId: V1, at: Tx };
  const params = order.map((nm) => inputX[nm]);
  say(`[1c-sql] parametros na ordem do template: ${order.join(",")} (n=${order.length})`);
  async function explain(client: any, guc: string, tag: string) {
    let plan: string[] = []; let who: any;
    await client.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${guc}, true)`;
      who = (await tx.$queryRawUnsafe(`SELECT current_user::text u, (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) b, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) s`))[0];
      const r: any[] = await tx.$queryRawUnsafe(`EXPLAIN (VERBOSE, COSTS OFF) ${sql}`, ...params);
      plan = r.map((x) => x["QUERY PLAN"]);
    });
    const txt = plan.join("\n");
    writeFileSync(SCR + `/explain-${tag}.txt`, txt.replaceAll(TA, "<A>").replaceAll(TB, "<B>").replaceAll(V1, "<V1>"));
    const pol = (txt.match(/current_setting\('app\.current_tenant_id'::text, true\)/g) ?? []).length;
    const woF = plan.filter((l) => /Filter|Cond/.test(l) && /wo\./.test(l) && /current_setting/.test(l)).length;
    const dF = plan.filter((l) => /Filter|Cond/.test(l) && /\bd\./.test(l) && /current_setting/.test(l)).length;
    const orInsideWo = plan.some((l) => /Filter|Cond/.test(l) && /wo\./.test(l) && /current_setting/.test(l) && /vehicle_assigned_at > \$/.test(l) && / OR /.test(l));
    const bitmapOr = /BitmapOr|Append/.test(txt);
    say(`[explain ${tag}] papel super=${who.s} bypassrls=${who.b} · ocorrencias do GUC da politica=${pol} · linhas Filter/Cond com wo.+GUC=${woF} · com d.+GUC=${dF} · perna OR na mesma linha do filtro de wo com o GUC=${orInsideWo} · BitmapOr/Append=${bitmapOr}`);
  }
  await explain(rt, TA, "runtime-GUC-A");
  await explain(byp, TA, "bypass-GUC-A");
  await explain(admin, TA, "super-GUC-A");
  const pols: any[] = await admin.$queryRawUnsafe(`SELECT tablename::text t, policyname::text p, permissive::text pe, cmd::text c, qual::text q FROM pg_policies WHERE tablename IN ('work_orders','field_dispatches') ORDER BY 1,2`);
  for (const p of pols) say(`[pg_policies] ${p.t} ${p.p} ${p.pe} ${p.c} qual=${p.q}`);
  const force: any[] = await admin.$queryRawUnsafe(`SELECT relname::text r, relrowsecurity rs, relforcerowsecurity f FROM pg_class WHERE relname IN ('work_orders','field_dispatches') ORDER BY 1`);
  for (const f of force) say(`[pg_class] ${f.r} rowsecurity=${f.rs} force=${f.f}`);
  writeFileSync(SCR + "/ids.json", JSON.stringify({ TA, TB, V1, VB1, Tx: Tx.toISOString(), usersA: [...usersA], usersB: [...usersB] }));
} catch (e: any) { say(`ERRO NA SONDA: ${e?.name}: ${String(e?.message ?? e).slice(0, 400)}`); process.exitCode = 1; }
finally {
  const ok = rows.filter((r) => r.endsWith("| sim |")).length; say(`[fim ${FASE}] linhas=${rows.length} iguais=${ok} diferentes=${rows.length - ok} · B(loc=${await locs(TB)},rec=${await recs(TB)},quar(dB)=${await quarDevs([dB])})`);
  await rt.$disconnect().catch(() => undefined); await byp.$disconnect().catch(() => undefined); await admin.$disconnect().catch(() => undefined);
}
````

### `zz-jtrc01c3a-mutprobe.mts` (md5 8a9be22b5b39550e0428bce3db667081)
````
// Controle (3) do item 1: com o código MUTADO (sem `d.tenant_id = ${input.tenantId}::uuid`), a consulta do produto
// sob o papel do runtime e o GUC de A não devolve B (o RLS segura); sob BYPASSRLS devolve B (a disjunção sem as duas travas vaza).
import { readFileSync } from "node:fs";
const WP = "C:/Users/AMP/w-jc3-a/"; const W = "file:///" + WP; const SCR = process.env.JSCR!;
const { PrismaPg } = await import(W + "node_modules/@prisma/adapter-pg/dist/index.mjs");
const { PrismaClient } = await import(W + "node_modules/@prisma/client/default.js");
const rls = await import(W + "src/database/rls.ts");
const dispatch = await import(W + "src/modules/field-dispatch/field-dispatch-prisma.repository.ts");
const URL0 = process.env.DATABASE_URL!;
const asRole = (role: string) => { const u = new URL(URL0); u.username = role; u.password = process.env.JTRC_PW!; u.searchParams.set("application_name", "jtrc01c3a-mut"); return u.toString(); };
const rt = new PrismaClient({ adapter: new PrismaPg({ connectionString: asRole("jtrc01c3a_rt") }) });
const byp = new PrismaClient({ adapter: new PrismaPg({ connectionString: asRole("jtrc01c3a_byp") }) });
const ids = JSON.parse(readFileSync(SCR + "/ids.json", "utf8"));
const uA = new Set(ids.usersA); const uB = new Set(ids.usersB); const Tx = new Date(ids.Tx);
async function captura(client: any, guc: string, input: any) {
  let got: any[] = []; let res: any;
  await rls.withTenantRls(client, guc, async (tx: any) => { const px = { $queryRaw: (...a: any[]) => tx.$queryRaw(...a).then((r: any[]) => { got = r; return r; }) }; res = await dispatch.findOperatorsForVehicleAt(px as any, input); });
  return `linhas=${got.length} de_A=${got.filter((c) => uA.has(c.operatorUserId)).length} de_B=${got.filter((c) => uB.has(c.operatorUserId)).length} perna_nova=${got.filter((c) => c.vehicleAssignedAfterFix === true).length} classificacao=${res?.kind}`;
}
const mutado = !/WHERE d\.tenant_id = \$\{input\.tenantId\}::uuid/.test(readFileSync(WP + "src/modules/field-dispatch/field-dispatch-prisma.repository.ts", "utf8"));
console.log(`[ctl-3] codigo mutado (sem d.tenant_id no WHERE)=${mutado}`);
try {
  console.log(`[ctl-3] runtime NOBYPASSRLS, GUC=A, tenant=A, V1, at=Tx: ${await captura(rt, ids.TA, { tenantId: ids.TA, vehicleId: ids.V1, at: Tx })}`);
  console.log(`[ctl-3] BYPASSRLS,          GUC=A, tenant=A, V1, at=Tx: ${await captura(byp, ids.TA, { tenantId: ids.TA, vehicleId: ids.V1, at: Tx })}`);
  // EXPLAIN da consulta mutada sob o runtime: o filtro de política aparece por tabela quando o predicado de código some
  const src = readFileSync(WP + "src/modules/field-dispatch/field-dispatch-prisma.repository.ts", "utf8");
  const m = src.match(/tx\.\$queryRaw<OperatorAtFixTimeCandidate\[\]>`([\s\S]*?)`;/)!;
  const order: string[] = []; let k = 0; const sql = m[1].replace(/\$\{input\.(\w+)\}/g, (_s, nm) => { order.push(nm); return `$${++k}`; });
  const inp: any = { tenantId: ids.TA, vehicleId: ids.V1, at: Tx };
  let plan: string[] = [];
  await rt.$transaction(async (tx: any) => { await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${ids.TA}, true)`; plan = (await tx.$queryRawUnsafe(`EXPLAIN (VERBOSE, COSTS OFF) ${sql}`, ...order.map((nm) => inp[nm]))).map((x: any) => x["QUERY PLAN"]); });
  for (const l of plan) if (/Filter|Cond|Scan|Loop|Join|Hash|Result/.test(l)) console.log(`[ctl-3 explain runtime] ${l.replaceAll(ids.TA, "<A>").replaceAll(ids.V1, "<V1>").replace(/'20\d\d-[^']+'/g, "'<at>'").replace(/Output: .*/, "Output: …")}`);
} finally { await rt.$disconnect(); await byp.$disconnect(); }
````

### `zz-jtrc01c3a-mut.mjs` (md5 835436f3516a6b22f26290b571de026a)
````
// uso: node zz-jtrc01c3a-mut.mjs <arquivo> <ancora> <substituto>  — âncora tem de casar EXATAMENTE 1 vez
import { readFileSync, writeFileSync } from "node:fs";
const [f, a, b] = process.argv.slice(2);
const s = readFileSync(f, "utf8");
const n = s.split(a).length - 1;
console.log(`ancora_count=${n}`);
if (n !== 1) { console.error("ancora nao unica — falha fechado"); process.exit(3); }
writeFileSync(f, s.replace(a, b));
console.log("substituido");
````

### `zz-jtrc01c3a-trans.sql` (md5 ac705cabf5926abb33e52b03b852a8b9)
````
-- Cadeira (a″) ciclo 3 — as 28 arestas de FIELD_DISPATCH_STATUS_TRANSITIONS executadas no banco, relógio fixo, ids fixos,
-- + reatribuição de operador + TROCA DA VIATURA DA OS no meio; tudo em BEGIN … ROLLBACK (0 resíduo). Saída: contagens e md5.
BEGIN;
CREATE TEMP TABLE jtrc_res (k text, v text) ON COMMIT DROP;
DO $j$
DECLARE
  t uuid := 'a3c30000-0000-4000-8000-000000000001'; u1 uuid := 'a3c30000-0000-4000-8000-000000000011'; u2 uuid := 'a3c30000-0000-4000-8000-000000000012';
  va uuid := 'a3c30000-0000-4000-8000-000000000021'; vb uuid := 'a3c30000-0000-4000-8000-000000000022'; wo uuid := 'a3c30000-0000-4000-8000-000000000031';
  t0 timestamptz := '2026-01-01 10:00:00+00'; e record; i int := 0; d uuid; ok int := 0; recusa int := 0;
  edges text[][] := ARRAY[['draft','assigned'],['draft','cancelled'],
    ['assigned','accepted'],['assigned','on_route'],['assigned','reassigned'],['assigned','cancelled'],['assigned','failed'],
    ['accepted','on_route'],['accepted','arrived'],['accepted','reassigned'],['accepted','cancelled'],['accepted','failed'],
    ['on_route','arrived'],['on_route','reassigned'],['on_route','cancelled'],['on_route','failed'],
    ['arrived','in_service'],['arrived','reassigned'],['arrived','cancelled'],['arrived','failed'],
    ['in_service','completed'],['in_service','reassigned'],['in_service','cancelled'],['in_service','failed'],
    ['reassigned','accepted'],['reassigned','on_route'],['reassigned','cancelled'],['reassigned','failed']];
BEGIN
  INSERT INTO tenants (id, name, slug) VALUES (t, 'jtrc-c3a-trans', 'jtrc-c3a-trans');
  INSERT INTO users (id, tenant_id, name, email) VALUES (u1, t, 'T1', 'jc3a-t1@example.com'), (u2, t, 'T2', 'jc3a-t2@example.com');
  INSERT INTO vehicles (id, tenant_id, plate, model) VALUES (va, t, 'JCA0001', 'sint'), (vb, t, 'JCA0002', 'sint');
  INSERT INTO work_orders (id, tenant_id, code, title, vehicle_id, created_at, updated_at) VALUES (wo, t, 'JC3A-TR', 'OS trans', va, t0, t0);
  FOR i IN 1 .. array_length(edges, 1) LOOP
    d := ('a3c30000-0000-4000-8001-' || lpad(i::text, 12, '0'))::uuid;
    INSERT INTO field_dispatches (id, tenant_id, work_order_id, operator_user_id, status, created_at, updated_at)
      VALUES (d, t, wo, u1, edges[i][1], t0, t0);
    IF i = 14 THEN UPDATE work_orders SET vehicle_id = vb, updated_at = t0 + interval '1 hour' WHERE id = wo; END IF;
    BEGIN
      UPDATE field_dispatches SET status = edges[i][2], updated_at = t0 + make_interval(mins => i),
        operator_user_id = CASE WHEN edges[i][2] = 'reassigned' THEN u2 ELSE operator_user_id END,
        accepted_at = CASE WHEN edges[i][2] = 'accepted' THEN t0 + make_interval(mins => i) ELSE accepted_at END,
        on_route_at = CASE WHEN edges[i][2] = 'on_route' THEN t0 + make_interval(mins => i) ELSE on_route_at END,
        arrived_at = CASE WHEN edges[i][2] = 'arrived' THEN t0 + make_interval(mins => i) ELSE arrived_at END,
        in_service_at = CASE WHEN edges[i][2] = 'in_service' THEN t0 + make_interval(mins => i) ELSE in_service_at END,
        completed_at = CASE WHEN edges[i][2] = 'completed' THEN t0 + make_interval(mins => i) ELSE completed_at END,
        cancelled_at = CASE WHEN edges[i][2] = 'cancelled' THEN t0 + make_interval(mins => i) ELSE cancelled_at END,
        failed_at = CASE WHEN edges[i][2] = 'failed' THEN t0 + make_interval(mins => i) ELSE failed_at END
      WHERE id = d;
      ok := ok + 1;
    EXCEPTION WHEN OTHERS THEN recusa := recusa + 1; INSERT INTO jtrc_res VALUES ('recusa:' || edges[i][1] || '->' || edges[i][2], SQLSTATE);
    END;
  END LOOP;
  INSERT INTO jtrc_res VALUES ('arestas', array_length(edges, 1)::text), ('aceitas', ok::text), ('recusadas', recusa::text);
END $j$;
SELECT k || '=' || v FROM jtrc_res ORDER BY k;
SELECT 'fd_linhas=' || count(*) || ' fd_md5_sem_operator_assigned_at=' || md5(string_agg((to_jsonb(x) - 'operator_assigned_at')::text, '|' ORDER BY x.id))
  FROM field_dispatches x WHERE x.tenant_id = 'a3c30000-0000-4000-8000-000000000001';
SELECT 'fd_md5_completo=' || md5(string_agg(to_jsonb(x)::text, '|' ORDER BY x.id)) FROM field_dispatches x WHERE x.tenant_id = 'a3c30000-0000-4000-8000-000000000001';
SELECT 'wo_linhas=' || count(*) || ' wo_viatura_trocada=' || bool_and(vehicle_id = 'a3c30000-0000-4000-8000-000000000022') || ' wo_md5_sem_vehicle_assigned_at=' || md5(string_agg((to_jsonb(w) - 'vehicle_assigned_at')::text, '|' ORDER BY w.id))
  FROM work_orders w WHERE w.tenant_id = 'a3c30000-0000-4000-8000-000000000001';
ROLLBACK;
SELECT 'residuo_tenant=' || count(*) FROM tenants WHERE id = 'a3c30000-0000-4000-8000-000000000001';
````

### `job.sh` (md5 686050011d709537b65e1e9221287e79)
````
#!/usr/bin/env bash
# Forma do job backend-postgres do ci.yml do OBJETO, dentro do container Linux jtrc01c3-a-tl-run. Saída em /out (scratch).
set -u
mkdir -p /w && tar -C /w -xf /out/${TARF:-obj.tar} && cd /w || exit 2
export DATABASE_URL="postgresql://postgres:${PGPW}@jtrc01c3atlpg:5432/erp_techsolutions?schema=public"
export REDIS_URL='redis://jtrc01c3atlredis:6379' CORE_SAAS_PERSISTENCE=prisma JWT_SECRET=dev-only-change-me JWT_EXPIRES_IN=15m LOG_LEVEL=silent RBAC_DB_PARITY=1
npm ci --no-audit --no-fund > /out/tl-npmci.log 2>&1 || { echo "npm ci falhou"; exit 3; }
npm run db:generate > /out/tl-gen.log 2>&1 || { echo "generate falhou"; exit 3; }
# o bloco SUITES= exatamente como está no ci.yml do objeto (passo "Route suites against PostgreSQL")
awk '/- name: Route suites against PostgreSQL/{f=1} f && /SUITES=/{sub(/^ +/,""); print} f && /node --test/{exit}' .github/workflows/ci.yml > /out/tl-suites.sh
echo "linhas SUITES= extraidas: $(wc -l < /out/tl-suites.sh)"
. /out/tl-suites.sh
echo "arquivos em SUITES: $(echo $SUITES | wc -w)"
resetdb() { node -e '
const { Client } = require("pg"); (async () => { const c = new Client({ connectionString: process.env.DATABASE_URL.replace("/erp_techsolutions?schema=public", "/postgres") });
await c.connect(); await c.query("DROP DATABASE IF EXISTS erp_techsolutions WITH (FORCE)"); await c.query("CREATE DATABASE erp_techsolutions"); await c.end(); })().catch((e) => { console.error(e.message); process.exit(1); });' || return 1
  npx prisma migrate deploy > /out/tl-mig.log 2>&1 || return 1; npm run db:seed > /out/tl-seed.log 2>&1 || return 1; }
guard() { skipped=$(grep -E '^# skipped ' "$1" | awk '{print $3}'); test -n "$skipped" || { echo "guard: nao li pulos"; return 1; }; test "$skipped" -eq 0 || { echo "guard: PULOU $skipped"; return 1; }; echo "guard: 0 pulos"; }
sumario() { echo "$(grep -E '^# (tests|pass|fail|cancelled|skipped) ' "$1" | awk '{printf "%s=%s ",$2,$3}')"; }
MODE="${1:-runs}"
if [ "$MODE" = runs ]; then
  for r in 1 2 3; do
    resetdb || { echo "reset falhou r$r"; exit 4; }
    t0=$(date +%s); set -o pipefail; node --test --import tsx $SUITES 2>&1 | tee /out/tl-run$r.tap > /dev/null; ec=$?; set +o pipefail; t1=$(date +%s)
    echo "rodada $r: ec=$ec $(sumario /out/tl-run$r.tap) duracao=$((t1-t0))s · $(guard /out/tl-run$r.tap; echo guard_ec=$?)"
  done
  # vermelho-controle M-CI1: sem DATABASE_URL só no ambiente do node --test
  set -o pipefail; env -u DATABASE_URL node --test --import tsx $SUITES 2>&1 | tee /out/tl-mci1.tap > /dev/null; ec=$?; set +o pipefail
  echo "M-CI1 (sem DATABASE_URL): ec=$ec $(sumario /out/tl-mci1.tap) · $(guard /out/tl-mci1.tap; echo guard_ec=$?)"
  # vermelho-controle do denominador: a mesma lista SEM a linha da tests/traccar-quarantine-db.test.ts (cópia em /out, não no repo)
  grep -v 'tests/traccar-quarantine-db.test.ts' /out/tl-suites.sh > /out/tl-suites-menos1.sh; echo "linhas na copia: $(wc -l < /out/tl-suites-menos1.sh)"
  ( . /out/tl-suites-menos1.sh; resetdb; set -o pipefail; node --test --import tsx $SUITES 2>&1 | tee /out/tl-menos1.tap > /dev/null; echo "sem traccar-quarantine-db: ec=$? $(sumario /out/tl-menos1.tap)" )
fi
if [ "$MODE" = perfile ]; then
  resetdb || exit 4
  for f in $SUITES; do node --test --import tsx $f > /out/tl-pf.tap 2>&1; echo "$f ec=$? $(sumario /out/tl-pf.tap)"; done
fi
if [ "$MODE" = once ]; then
  resetdb || exit 4
  set -o pipefail; node --test --import tsx $SUITES 2>&1 | tee /out/tl-once.tap > /dev/null; ec=$?; set +o pipefail
  echo "uma rodada ($TARF): ec=$ec $(sumario /out/tl-once.tap) · $(guard /out/tl-once.tap; echo guard_ec=$?)"
fi
````

### `job-backend.sh` (md5 c42d627d0b7840d1a946f0f1ea6d6f59)
````
#!/usr/bin/env bash
# Forma do job `backend` do ci.yml do OBJETO (npm test pelo runner, DATABASE_URL e REDIS_URL presentes, CORE_SAAS_PERSISTENCE=memory).
set -u
mkdir -p /w && tar -C /w -xf /out/obj.tar && cd /w || exit 2
export DATABASE_URL="postgresql://postgres:${PGPW}@jtrc01c3atlpg:5432/jtrc01c3_a_bk?schema=public"
export REDIS_URL='redis://jtrc01c3atlredis:6379' CORE_SAAS_PERSISTENCE=memory CI=true
npm ci --no-audit --no-fund > /out/bk-npmci.log 2>&1 || { echo "npm ci falhou"; exit 3; }
node scripts/sync-agent-agents.mjs --check > /out/bk-sync.log 2>&1; echo "sync-agent-agents ec=$?"
npm run db:generate > /out/bk-gen.log 2>&1 || { echo "generate falhou"; exit 3; }
node -e 'const { Client } = require("pg"); (async () => { const c = new Client({ connectionString: process.env.DATABASE_URL.replace("/jtrc01c3_a_bk?schema=public", "/postgres") }); await c.connect(); await c.query("DROP DATABASE IF EXISTS jtrc01c3_a_bk WITH (FORCE)"); await c.query("CREATE DATABASE jtrc01c3_a_bk"); await c.end(); })().catch((e) => { console.error(e.message); process.exit(1); });' || exit 4
npx prisma migrate deploy > /out/bk-mig.log 2>&1; echo "migrate ec=$?"
npm run check > /out/bk-check.log 2>&1; echo "check ec=$?"
t0=$(date +%s); npm test > /out/bk-test.log 2>&1; ec=$?; t1=$(date +%s); echo "npm test ec=$ec duracao=$((t1-t0))s"
grep -E '^\[run-backend-tests\] [0-9]+ arquivo' /out/bk-test.log | tail -1
grep -E '^# (tests|pass|fail|cancelled|skipped) ' /out/bk-test.log | tail -5 | tr '\n' ' '; echo
echo "SKIP:"; grep -E '# SKIP' /out/bk-test.log | sed -E 's/ # SKIP.*//' | cut -c1-140
echo "NOT OK (topo):"; grep -E '^not ok' /out/bk-test.log | cut -c1-160
echo "traccar ok/not ok:"; grep -E '^(ok|not ok) .*' /out/bk-test.log | grep -c -i traccar
npm run build > /out/bk-build.log 2>&1; echo "build ec=$?"
````

### `job-census.sh` (md5 70f54687745cd3ac1c4250930e10bfc9)
````
#!/usr/bin/env bash
# Re-execução isolada, em Linux, das suítes que falharam na forma `backend` por AMBIENTE (sem .git / sem frontend no tar).
set -u
mkdir -p /w && tar -C /w -xf /out/obj.tar && cd /w || exit 2
git config --global --add safe.directory '*'; git config --global user.email t@l; git config --global user.name tl
git init -q && git add -A >/dev/null 2>&1 && git commit -qm retrato-do-objeto >/dev/null 2>&1; echo "git ls-files src: $(git ls-files src | wc -l)"
export DATABASE_URL="postgresql://postgres:${PGPW}@jtrc01c3atlpg:5432/jtrc01c3_a_bk?schema=public" REDIS_URL='redis://jtrc01c3atlredis:6379' CORE_SAAS_PERSISTENCE=memory CI=true
npm ci --no-audit --no-fund > /out/cs-npmci.log 2>&1 || exit 3; npm run db:generate > /dev/null 2>&1 || exit 3
node --test --test-reporter=tap --import tsx tests/o6r07c-census-guard.test.ts > /out/cs-census.tap 2>&1; echo "o6r07c-census-guard ec=$? $(grep -E '^# (tests|pass|fail|skipped) ' /out/cs-census.tap | awk '{printf "%s=%s ",$2,$3}')"
````

### `withdb.sh` (md5 05553ce87960094948e6d8097b111b92)
````
#!/usr/bin/env bash
# uso: withdb.sh <banco> <comando...>  — DATABASE_URL (admin jadmin), REDIS_URL, JTRC_PW, JSCR só neste processo; nada exportado no shell do chamador
S="C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/jtrc01c3-a"
PW="$(cat "$S/jtrc01c3-a.pw")"; DB="$1"; shift
DATABASE_URL="postgresql://jadmin:${PW}@127.0.0.1:47761/${DB}?schema=public" REDIS_URL="redis://127.0.0.1:47771" JTRC_PW="$PW" JSCR="$S" LOG_LEVEL=silent "$@"
````

### `roles.sql` (md5 a33d34317f723e70f14c215e4c4daca0)
````
SELECT 'CREATE ROLE jtrc01c3a_rt LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='jtrc01c3a_rt') \gexec
SELECT 'CREATE ROLE jtrc01c3a_byp LOGIN NOSUPERUSER BYPASSRLS NOINHERIT' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='jtrc01c3a_byp') \gexec
ALTER ROLE jtrc01c3a_rt PASSWORD :'pw';
ALTER ROLE jtrc01c3a_byp PASSWORD :'pw';
GRANT USAGE ON SCHEMA public TO jtrc01c3a_rt, jtrc01c3a_byp;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jtrc01c3a_rt, jtrc01c3a_byp;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jtrc01c3a_rt, jtrc01c3a_byp;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO jtrc01c3a_rt, jtrc01c3a_byp;
SELECT rolname, rolsuper, rolbypassrls, rolinherit FROM pg_roles WHERE rolname LIKE 'jtrc01c3a_%' ORDER BY 1;
````
(a cópia de controle zz-jtrc01c3a-trans-ctl.sql = a trans.sql + as 2 linhas do gatilho jtrc01c3a_ctl logo após o CREATE TEMP TABLE, gerada por node -e; md5 e13e350dbc95ad3c6fa7d324d1c4dcc6)

## Fim (21:10Z–21:20Z)
- Objeto re-resolvido no fim: head do PR = ce20aa3f (igual ao início; delta só registro) → medi 7c220467. origin/main fim = 40c3651f066278654e2c71df4c3b38e1d90994c8 (andou de a26f8afe); merge-base com o objeto continua c260d362. Origem da suíte census-guard: `git log --diff-filter=A` → 86ea8a81 (2026-10-11, B-O6R-07c-a, #414).
- **Queda do motor do Docker (~21:05Z)** durante o `npm ci` da minha re-execução Linux do census-guard: `error waiting for container: unexpected EOF`; todos os containers `Exited (255)`; `erp-*` reiniciaram sozinhos (política de reinício) — não toquei a base viva. Registro para o orquestrador (00-quedas/ata): não foi queda deste agente; o trabalho já estava medido e gravado; só a re-execução do census-guard ficou sem resultado (N-A1).
- Teardown: `docker rm -f -v jtrc01c3-a-pg jtrc01c3-a-redis jtrc01c3-a-tl-pg jtrc01c3-a-tl-redis` (tl-run era `--rm`), `docker network rm jtrc01c3-a-tl-net` → `docker ps -a --filter name=jtrc01c3-a- -q | wc -l` = 0, redes 0. `log_statement`, papéis (rt, byp e os 8 `s305_*` da suíte do guard) e bancos viviam só nesses clusters e foram destruídos com eles. Worktree: HEAD = 7c220467, porcelain 0, processos vivos com `w-jc3-a` = 0 → `git worktree remove --force C:/Users/AMP/w-jc3-a` ec=0, ausente do disco e do `worktree list`. df /c no fim: 27G livres.
- grep da senha: evidência 0, voto 0, logs e ferramentas 0. A subpasta `$S` (só a minha, `scratchpad/jtrc01c3-a`) é apagada logo após esta linha, com o arquivo da senha.
- Voto gravado em `cadeira-a-voto.json` (JSON validado por `node -e JSON.parse`): **APROVADO**, 4 notas não graves (N-A1..N-A4).
