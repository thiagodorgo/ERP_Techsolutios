papel: cadeira (a) B-TRC-02 ciclo 1 | identidade: jurado-trc02-a-opus (corpo jurado-trc02-a-banco-rls-arnes) | executor: subagente Claude Code (general-purpose) | modelo: Claude Opus (claude-opus-5-5; nível menor, §C7.6; substituição: nenhuma) | objeto: 38504427a7b962545e559bd4d312b520b458ac42 | mandato_md5: 21eadb0119b5c51f5a6cb57614e920b2 (declarado pelo inspetor na reinspeção: 365b2c01… — o mandato foi regravado às 05:12 depois do parecer, 05:08, pela correção R-1; a cerca do porteiro agora não está vazia, l.226-229) | corpo_md5: 147850658e1d5974b058ab147dd0ca1c (blob .claude/ 649c6f80) (carregado no prompt via git show: 147850658e1d5974b058ab147dd0ca1c) → IDENTICO, EOL-neutro

# Evidência — cadeira (a) — B-TRC-02 ciclo 1 — jurado-trc02-a-opus

## Cabeçalho de terreno (2026-10-21T08:16Z)
- objeto: 38504427a7b962545e559bd4d312b520b458ac42 (ls-remote = gh headRefOid; PR 454 OPEN, draft=false, MERGEABLE)
- c1485c94 → c1485c94f3e99a33f5b8f6aec96a12bc922a237e
- B = merge-base(origin/main, objeto) = 539b078e311a5521b0d496ba5afae8f73acc43a0 = origin/main no início; B contém 20260878 (B-SAN3-02): 1
- $SCRATCH: C:\Users\AMP\AppData\Local\Temp\claude\...\scratchpad ; diretório persistente: C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-a/ (criado vazio)
- uname: MINGW64_NT-10.0-26200 x86_64; node v20.19.5; docker server 29.6.1
- df /c: 15G livres (94%); commit livre (P8): 17,8 GB no lançamento
- docker ps -a antes: só erp-postgres (5432) e erp-redis (6379) = base viva, ignorada na contagem e nunca alvo; trabalhos de outros: 0
- worktrees w-* existentes: w-agapi2 w-plan21 w-planos w-reg21 w-trc02 (nenhum w-jtrc02-*)
- leituras: corpo (blob do objeto), mandato, parecer do inspetor (seção REINSPEÇÃO: LIBERADO COM RESSALVA, cadeira (a) = jurado-trc02-a-opus, worktree C:/Users/AMP/w-jtrc02-a-, prefixos jtrc02-a-/jtrc02_a_). Não li arquivo das cadeiras (b)/(c).

## Terreno montado (08:20Z–08:30Z)
- worktree próprio: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-jtrc02-a-1 3850442…` → HEAD 38504427, porcelain 0, `.git` presente, `.env` ausente.
- `npm ci --no-audit --no-fund` próprio → ec=0 (326 pacotes, 2 min); `prisma generate` com URL fictícia → ec=0; `fsutil reparsepoint query node_modules` → "não é ponto de nova análise" (sem junction). Disco após: 14G.
- portas: `netsh … excludedportrange` sem faixa cobrindo 47781/47791; `netstat` sem uso; docker ps: só erp-* (base viva, ignorada). Trabalhos Docker de outros: 0.
- `docker run -d --name jtrc02-a-pg -p 127.0.0.1:47781:5432 postgres:16` (senha aleatória em $SCRATCH/jtrc02-a.pw, só por ambiente) e `jtrc02-a-redis -p 127.0.0.1:47791:6379 redis:7`; `docker port` → 127.0.0.1:47781 / 127.0.0.1:47791. `SELECT version()` → PostgreSQL 16.14.
- commit livre antes dos containers: 16,6 GB.
- bancos: jtrc02_a_obj e jtrc02_a_up criados. `npx prisma migrate deploy` em jtrc02_a_obj → ec=0, 115 migrações, as do bloco: 20260879000000_vehicle_telemetry_events e 20260880000000_validate_receipt_message_kind_check. `npm run db:seed` → ec=0.
- runner persistente: C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-a/zz-jtrc02a-run.sh md5 20f97a68e39f0d7e62fdde962474143a (lê a senha de arquivo; env da forma do job backend-postgres: CORE_SAAS_PERSISTENCE=prisma, RBAC_DB_PARITY=1, LOG_LEVEL=silent, JWT_SECRET de dev; REDIS_URL=redis://127.0.0.1:47791).

## Item 1 — isolamento por construção

### 1(a) suítes do bloco sob o papel efêmero (jtrc02_a_obj, Windows node 20, REDIS_URL próprio)
- `zz-jtrc02a-run.sh … tests/traccar-event-rls-db.test.ts` → ec=0 # tests 9 # pass 9 # fail 0 # skipped 0 (G1–G9 de mérito; G9 drill SAIU para a suíte própria — divergência corpo×objeto (i) do mandato, confirmada: 9 casos, nenhum drill).
- `… tests/traccar-event-ingestion-db.test.ts` → ec=0 # tests 21 # pass 21 # fail 0 # skipped 0. E13 = caso 14 "canário — B semeada e nunca ingerida fica 0/0/0; nenhuma linha guarda coordenada ou JSON" ok; E19 = caso 20 "attributes.tenantId = B no event e na position, dispositivo de A → linha em A, B 0/0/0" ok; listByVehicle = caso 21 ok; E4 = caso 4 ok.
- `… tests/traccar-event-sample-db.test.ts` → ec=0 # tests 13 # pass 13 # fail 0 # skipped 0. F8 = caso 8 canário 0/0 ok; F11 = caso 12 (tenantId=B, amostra em A) ok; F9 = 9, F9′ = 10, F10 = 11, F12 = 13 ok; Q1=NÃO caso 3 "posição em quarentena por operador — 0 recibo, 0 localização, 0 amostra" ok.
- papel do arnês: `tests/helpers/auth-identity-fixture.ts:324 createEphemeralRole` → `CREATE ROLE … LOGIN … NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT` (sem BYPASSRLS = NOBYPASSRLS por padrão) + GRANT DML em todas as tabelas de public. (a sonda própria confirma rolsuper/rolbypassrls no catálogo, abaixo)
- veredito parcial 1(a): VERDE (9/9, 21/21, 13/13, skipped 0).

### 1(d)/1(e) parcial — inventário de DML do papel de runtime (emenda v2.2 R-S2) e upgrade a partir de B (08:35Z–08:45Z)
- `git diff --name-only c1485c94 HEAD -- scripts/db-runtime-role.sh` → 0; idem `539b078e..HEAD` → 0.
- worktree trocado para B: `git -C w-jtrc02-a-1 checkout --detach 539b078e…` (porcelain 0) → `npx prisma migrate deploy` em jtrc02_a_up → ec=0, `_prisma_migrations` 113, máx `20260878000000_invoice_complementary_title`; volta: `checkout --detach 38504427…`, HEAD 38504427, porcelain 0.
- `scripts/db-runtime-role.sh` DO OBJETO (git show HEAD:… → docker cp) aplicado no container (psql 16, setsid presente; DB_RUNTIME_ROLE=jtrc02_a_runtime, senha aleatória só por env) a jtrc02_a_up em B → ec=0, linha final `jtrc02_a_runtime|f|f|f|f|0|0|118`; senha no log: 0.
- contador próprio C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-a/zz-jtrc02a-dmlset.sql (md5 c5b4873dcc8e1302860af766eb6976e7; r/p com has_table_privilege INSERT, S com has_sequence_privilege USAGE) → B: 118 relações (118 r, 0 p, 0 S); salvo em …/jtrc02-a/dml-B.txt.
- UPGRADE REAL a partir de B: `npx prisma migrate deploy` (worktree no objeto) em jtrc02_a_up → ec=0; "115 migrations found"; Applying `20260879000000_vehicle_telemetry_events` e `20260880000000_validate_receipt_message_kind_check` (exatamente 2); nenhuma linha "modified"/"missing"/erro; `_prisma_migrations` = 115, topo 20260880, 20260879, 20260878 (B-SAN3-02 preservada).
- DML após o upgrade (default privileges do migrador): 119; `diff dml-B dml-up-obj` → `> r:vehicle_telemetry_events` (só).
- script aplicado a jtrc02_a_obj (migrado do zero) → `jtrc02_a_runtime|f|f|f|f|0|0|119`; `diff dml-B dml-obj` → `> r:vehicle_telemetry_events` (só). Diferença de conjuntos = {vehicle_telemetry_events}; objeto = B(118) + 1 = 119 = literal do objeto (l.1016, medido no mandato e a re-verificar no T14 abaixo).
- VERMELHO-CONTROLE do contador: `REVOKE INSERT ON vehicle_telemetry_events FROM jtrc02_a_runtime` (jtrc02_a_up) → contador 118, diff vazio (a tabela SAI do conjunto); restauro re-aplicando o script → `…|119`, contador 119. Acusou.
- veredito parcial: inventário de DML VERDE (B 118 → objeto 119, diferença exatamente {vehicle_telemetry_events}); upgrade a partir de B VERDE (2 aplicadas, 0 modified/missing).

### 1(b)(c)(d) — sonda própria (08:50Z–09:10Z)
- sonda: C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-a/zz-jtrc02a-sonda1.ts (md5 final 30e7bdac87d20d97511a33380c4204fe; versões anteriores 341a7bd2…/82829a82… só mudaram a extração de SQLSTATE — a 1ª rodada lia `P2010` do Prisma — e o G10, que na 1ª forma usava um recibo que JÁ tinha linha e deu 23505 antes da FK: a forma corrigida usa recibo NOVO). Saída com uuids mascarados: …/jtrc02-a/sonda1-saida.jsonl (md5 ed11fabb1b80f89dbb8ad7f6b31441e9); senha na saída: 0.
- comando: `cd w-jtrc02-a-1 && JTRC_WT=… JTRC_DB=jtrc02_a_obj JTRC_PWFILE=$SCRATCH/jtrc02-a.pw JTRC_RTPWFILE=$SCRATCH/jtrc02-a.rtpw DATABASE_URL=*** REDIS_URL=redis://127.0.0.1:47791 LOG_LEVEL=silent CORE_SAAS_PERSISTENCE=prisma JWT_SECRET=dev… timeout -k 15 600 node --import tsx zz-jtrc02a-sonda1.ts` → ec=0.
- papel: o serviço do objeto (`createTraccarIngestionService`, client = papel jtrc02_a_runtime criado/concedido pelo `scripts/db-runtime-role.sh` DO OBJETO). Catálogo: rolsuper=false, rolbypassrls=false, rolinherit=false.
- B tenta vincular o MESMO uniqueId de d1 na mesma instância → recusado 23505 (índice global `vehicle_tracking_bindings_active_device_key (instance_key, external_device_key) WHERE valid_to IS NULL`): o esquema NÃO permite vínculo de B com o uniqueId de d1 ativo; declarado.
- B povoada sob o GUC de B (pelo serviço, com o dispositivo dB de B): 9 eventos (um de cada kind do catálogo) + 1 posição com atributos cheios aceita → B(rec, loc, tel, quar) = 10/1/10/0, recibos event=9, position=1, 10 kinds distintos em vehicle_telemetry_events (9 eventos + sample).
- CONTROLE 1 (B existe e seria vista): sob o GUC de B pelo papel do runtime → tel 10, rec 10; sob o GUC de A → tel 0, rec 0. Acusou.
- tabela `entrega | desfecho | A(rec/loc/tel/quar) | B | B igual ao semeado` (B comparada por contagem E por md5 do conteúdo das linhas):
  - evento deviceOnline d1 | 204 stored | 1/0/1/0 | 10/1/10/0 | sim
  - deviceUnknown | 204 stored | 2/0/2/0 | igual | sim
  - deviceOffline | 204 stored | 3/0/3/0 | igual | sim
  - deviceMoving | 204 stored | 4/0/4/0 | igual | sim
  - deviceStopped | 204 stored | 5/0/5/0 | igual | sim
  - deviceOverspeed | 204 stored | 6/0/6/0 | igual | sim
  - ignitionOn | 204 stored | 7/0/7/0 | igual | sim
  - ignitionOff | 204 stored | 8/0/8/0 | igual | sim
  - alarm (sos) | 204 stored | 9/0/9/0 | igual | sim
  - posição com atributos d1 (com despacho) | 204 stored | 10/1/10/0 (rec+1, loc+1, tel+1 = sample) | igual | sim
  - [Q1 = NÃO] posição com atributos CHEIOS d1 FORA do despacho | 202 quarantined/no_operator_at_fix_time | 10/1/10/1 (SÓ quar +1; recibos por kind continuam event=9, position=1; samples 1 = o da entrega aceita) | igual | sim
  - evento com attributes.tenantId = B no event E na position | 204 stored | 11/1/11/1 (linha em A) | igual | sim
  - evento ignitionOn (1ª) | 204 stored | 12/1/12/1 | igual | sim
  - a mesma entrega repetida | 204 duplicate | 12/1/12/1 | igual | sim
  - evento de dispositivo não mapeado | 202 quarantined/unmapped_device | 12/1/12/2 | igual | sim
  - resumo: 15 entregas, B inalterada em 15/15; linhas de A com vínculo de outra organização: 0. A "dica envenenada" não é aceita pelo comando do evento (`traccar-event.adapter.ts:121 hintTenantId: undefined`): declarado, não medível por esse caminho.
- 1(c) EXPLAIN (VERBOSE, COSTS OFF) dentro de `withTenantRls(papel do runtime, A)`:
  - latestDeviceStatus (SQL do blob, l.118-125): `One-Time Filter: ((NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid = '<uuid>'::uuid)` presente → filtro de política no plano.
  - latestIgnition (l.128-135): o mesmo One-Time Filter com current_setting presente.
  - INSERT do evento (forma de `insertEvent`): o EXPLAIN de INSERT não exibe WITH CHECK (comportamento do PG); `pg_policies`: vehicle_telemetry_events_tenant_isolation, cmd ALL, PERMISSIVE, roles {public}, qual = with_check = `(tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid)`. Por execução: INSERT com tenant_id = B sob o GUC de A → 42501.
  - CONTROLE 2: as mesmas consultas pelo superusuário e por um papel meu `jtrc02_a_bypass LOGIN NOSUPERUSER BYPASSRLS` (sob o mesmo GUC de A) → plano SEM current_setting (só o Filter tenant/vehicle/kind). Papel bypass removido pelo nome: 0 restante. A leitura distingue.
- 1(d) G10 pela sonda (recibo NOVO de V1 sem linha, sob GUC de A, papel do runtime): recibo de V1 + vehicle_id V2 → 23503; recibo de V1 + binding_id do vínculo de V2 → 23503; controle positivo (recibo de V1 + V1 + vínculo de V1) → ACEITO; recibo que já tem linha + V2 → 23505 (a unicidade (tenant_id, receipt_id) responde antes da FK — por isso o arranjo precisa de recibo novo). `pg_constraint`: `vehicle_telemetry_events_receipt_fkey` ncols 4, alvo traccar_ingress_receipts, `FOREIGN KEY (tenant_id, receipt_id, vehicle_id, binding_id) REFERENCES traccar_ingress_receipts(tenant_id, id, vehicle_id, binding_id) ON UPDATE CASCADE ON DELETE RESTRICT`; índice referenciado `traccar_ingress_receipts_tenant_id_id_vehicle_binding_key UNIQUE (tenant_id, id, vehicle_id, binding_id)`.
- listByVehicle (mandato): sob GUC A pedindo A → 13; sob GUC B pedindo A → 0; sob GUC B pedindo B → 10; latestDeviceStatus de A sob GUC de B → undefined.
- limpeza da sonda: organizações/linhas/quarentena da instância removidas pelo id → resíduo 0/0.

### 1(d) catálogo (psql no container, jtrc02_a_obj; script …/jtrc02-a/zz-jtrc02a-catalogo.sql md5 70025df5993bd5b18a425bffdfca6af4)
- relrowsecurity=t, relforcerowsecurity=t; colunas json/jsonb/float/numeric/lat/lon: 0.
- unicidade da amostra (Q1 = NÃO): `vehicle_telemetry_events_receipt_key UNIQUE (tenant_id, receipt_id)` (sem predicado); índices parciais na tabela: 0; coluna fix_key: 0; índice com fix_key: 0; `vehicle_telemetry_events_fix_key_check`: 0.
- pg_rules nas duas tabelas: 0.
- CHECK message_kind: convalidated=t, `CHECK ((message_kind = ANY (ARRAY['position'::text, 'event'::text])))`.
- prosecdef (fora pg_catalog/information_schema) no objeto: 1 função, md5 da lista c81c938f668f8b0d546a22e29292f42f (comparação com a base em B no 1(e)).
- grants em vehicle_telemetry_events: só o dono (postgres) e jtrc02_a_runtime (DML, vindo do script); nenhum a PUBLIC.

### 1(e) — migração A atômica pelo CLI REAL, com INJEÇÃO PRÓPRIA (09:20Z–09:45Z) — divergência corpo×objeto (i): o drill é o da emenda v2.3, não o G9
- base no nível de B: jtrc02_a_bt (worktree trocado para 539b078e, `migrate deploy` ec=0, 113 migrações; volta ao objeto, HEAD 38504427, porcelain 0). prosecdef em B: 1 função, md5 c81c938f… = o do objeto → 0 função SECURITY DEFINER nova. CHECK em B: `CHECK ((message_kind = 'position'::text))`. pg_rules em B: 0.
- impressão digital do catálogo (…/jtrc02-a/zz-jtrc02a-fingerprint.sql md5 171ac32719c44b26777d67afabb90d5c; tabelas+RLS, colunas, constraints com validada, índices, políticas; sem _prisma_migrations): B = `3041 b4c6b6b369c326e1f28cdbcac92b65de`; objeto migrado do zero = upgrade a partir de B = `3079 0e6e7ac350820fe60e87d0a4cbe6f1a0`.
- injeção própria: …/jtrc02-a/zz-jtrc02a-inj.mjs (md5 final 86409dadf12c967c49bf181afd8c2772) copia prisma/migrations do worktree e põe `SELECT 1/0;` (22012) DEPOIS da k-ésima sentença DDL (BEGIN/COMMIT não contam; meu splitter conta 17 sentenças) — NÃO é a injeção do T-M(e) (`ALTER TABLE "drill_nao_existe" …`); `prisma.config.mjs` temporário com caminhos absolutos; laço …/jtrc02-a/zz-jtrc02a-injloop.sh (md5 e38d6682a506b78bf3787549ab689d90): base nova TEMPLATE jtrc02_a_bt → `npx prisma migrate deploy --config <temp>` → catálogo × B → linha de A em _prisma_migrations → `migrate resolve --rolled-back 20260879000000_vehicle_telemetry_events` → `migrate deploy` REAL → `migrate status`.
- resultado k=1..17 (…/jtrc02-a/inj-k1-17.txt): em TODOS os 17: deploy injetado ec=1 (CLI mostra "current transaction is aborted"), catálogo IGUAL ao de B, linha de A falhada (finished_at null, não rolled back), _prisma_migrations 114; resolve ec=0, deploy real ec=0, status ec=0 com "up to date", catálogo final IGUAL ao do objeto. 17/17 atômicos e convergentes.
- prova de que injeta (k=post, depois do COMMIT): deploy ec=1 com 22012/P3018/"division by zero"; catálogo `3079 e8bb1830…` = as 17 sentenças aplicadas (mesma contagem do objeto; md5 difere só porque a B — VALIDATE — não rodou: CHECK NOT VALID). Acusou.
- vermelho-controle pela MINHA injeção (…/jtrc02-a/inj-controles.txt), mutação aplicada no worktree por âncora única CRLF e restaurada (porcelain 0, hash-object = blob):
  - M-E51 (sem BEGIN/COMMIT; numstat 0 4): k=1 → catálogo ≠ B (3068 …), k=9 → ≠ B (3076), k=17 → ≠ B (3079) e a convergência QUEBRA (deploy real ec=1). Vermelho.
  - M-E51b (COMMIT antes do (3); numstat 1 2): k=15 → igual a B (dentro da transação); k=16 → ≠ B (3078); k=17 → ≠ B. Vermelho onde deve.
  - M-E51c (BEGIN depois do CREATE TABLE; numstat 1 2): k=1 → ≠ B (3068), k=2 → ≠ B. Vermelho.
- veredito parcial 1(e)-atomicidade: VERDE.

### Leituras de blob sem banco (09:50Z) — insumo dos itens 2 e 3
- 2(b) `git grep -n -E 'SAVEPOINT|ROLLBACK TO|RELEASE SAVEPOINT' <objeto> -- src`: emissores = `identity-resolver.ts` (normalize_pair_identity) e `vehicle-telemetry-prisma.repository.ts` l.39 `SAVEPOINT vehicle_sample`, l.43 `ROLLBACK TO SAVEPOINT vehicle_sample; // erro: desfaz e classifica` (UMA linha ROLLBACK TO), l.48 `RELEASE SAVEPOINT vehicle_sample`. `// skip: desfaz o recibo` 0; `divert` 0; `sample_without_operator`/`sampleWithoutOperator` 0; âncora `// erro: desfaz e classifica` 1.
- 2(b) por import do módulo do objeto (`node --import tsx -e import('./src/modules/telemetry/vehicle-telemetry-prisma.repository.ts')`): SAMPLE_DISCARD_SQLSTATES = ["22003","23514"], size 2.
- 2(a) o evento chama o MESMO `repository.lockActiveBinding` (service l.294; posição l.404) e o hook `afterBindingLocked` é disparado dentro dele (repository l.106/114).
- 2(d) ausência por migração: `git grep -i -E 'fix_key|position_sample|sample_fix_key' <objeto> -- prisma` → 0; em src (inclui SAMPLE_ON_QUARANTINE/sampleOnQuarantine) → 0; suíte I na árvore → 0; no ci.yml → 0. Histórico da A em B..objeto: 4598a012 (Q1 = SIM: 6 ocorrências fix_key/position_sample) → 498c4e26 (revert Q1 = NÃO: 0) → 46dd99d1 (transação explícita). A A do objeto não tem a Q1. Catálogo de mutações do objeto: as M-Q1-* SAÍRAM (l.116 "saem as 8 M-Q1-*"), nenhuma executável.
- 3(d) os 9 do 01 (`git rev-parse c1485c94:<f>` × `<objeto>:<f>`): dev-topology 6e68c063, forward-auth b2723bfc, ingest-listener 1103805e, ingest-logs b934998a, ingest-pool-db 6491f294, operator-at-fix-time 2cd15284, rate-limit 6d75e04e, resolution-cost e57a2bd9, rls-budget-order a17fd4fa — 9/9 IGUAIS. (15 arquivos traccar em c1485c94.)
- 3(e) R3-1 (c1485c94 × objeto): idempotency `1 1` régua 0 linhas; resolution-race `1 1` 0; quarantine `1 1` 0; position-ingestion `1 0` 0; binding-uniqueness `1 0` 0; total 5+ 3−; as 5 réguas vazias. `tests/telemetry.test.ts` sem diff desde c1485c94.
- VERMELHO-CONTROLE R3-1: no meu worktree, a l.135 de `tests/traccar-quarantine-db.test.ts` trocada → numstat `2 2`, régua 4 linhas (acusa); restauro hash-ok. Um caractere em `tests/traccar-rate-limit.test.ts` → hash-object cc1a6139 ≠ blob 6d75e04e (acusa); restauro hash-ok, porcelain 0.

> Nota de relógio: as horas "09:xxZ" escritas nas seções acima foram estimadas por mim; o `date -u` medido às 08:55Z mostra que as seções 1(d)/1(e) correram entre ~08:30Z e ~08:55Z. As horas não entram em nenhuma conclusão.

### 1(e) — drill do objeto (T-M) 3× e as pontas do down pela invocação do cabeçalho (08:40Z–09:05Z)
- `zz-jtrc02a-run.sh … tests/traccar-event-migration-drill-db.test.ts` (Windows, jtrc02_a_obj), 3 rodadas: r1 ec=1 `# tests 7 pass 6 fail 1`; r2 ec=0 `# tests 6 pass 6 fail 0 skipped 0`; r3 ec=1 `# tests 7 pass 6 fail 1`. Nas 3, T-M(a)…T-M(f) = 6/6 ok. A falha de r1 e r3 é o hook `after` do arquivo: `EBUSY: resource busy or locked, rmdir 'C:\Users\AMP\AppData\Local\Temp\trc02-mdrill-…'` (rmSync do diretório temporário, tests/…drill-db.test.ts:118) — trava de arquivo do Windows, N=2/3, forma "hookFailed" depois dos 6 casos verdes. Ambiente (Windows), não produto; a forma Linux do job (item 3) e o check-run `backend-postgres` (463/463) cobrem o mesmo arquivo em Linux. Os 2 diretórios temporários que sobraram (05:42 e 05:50 BRT = minhas rodadas) foram removidos por mim.
- texto do down EXTRAÍDO do blob (…/jtrc02-a/zz-jtrc02a-down-extrai.sh md5 5c1961a8f950e81cbc4fc61464cdf17e; saída …/down-extraido.sql md5 8cf0eb547f10281de527e9952f64c589), na ordem: (1) a guarda `SELECT CASE WHEN n = 0 THEN 'ok' ELSE ('PARE: ' || n || ' linha(s) …')::int::text END … FROM (SELECT (SELECT count(*) FROM "vehicle_telemetry_events") + (SELECT count(*) FROM "traccar_ingress_receipts" WHERE "message_kind" <> 'position') AS n) g;` (2) `DROP TABLE IF EXISTS "vehicle_telemetry_events";` (3) `DROP INDEX IF EXISTS "traccar_ingress_receipts_tenant_id_id_vehicle_binding_key";` (4) `ALTER TABLE … DROP CONSTRAINT …message_kind_check;` (5) `ALTER TABLE … ADD CONSTRAINT …message_kind_check CHECK ("message_kind" IN ('position'));` (6) `DELETE FROM "_prisma_migrations" WHERE "migration_name" IN ('20260879000000_vehicle_telemetry_events', '20260880000000_validate_receipt_message_kind_check');` — cita SÓ os dois nomes renumerados.
- pontas (…/jtrc02-a/zz-jtrc02a-pontas.sh md5 final afdd94c989a92654c3fbebc390cdb530; semeadura …/zz-jtrc02a-down-seed.sql md5 afc167a82c1dd22923d9a9019f202924; saída …/pontas.txt), base nova TEMPLATE jtrc02_a_bt + `migrate deploy` real ao objeto, depois `psql -v ON_ERROR_STOP=1 --single-transaction -f down.sql`:
  - PONTA A (1 recibo `position`, 0 telemetria): down ec=0; catálogo `3041 b4c6…` = o de B; _prisma_migrations 115 → 113, sem as duas do bloco (0) e COM `20260878000000_invoice_complementary_title` (1); o recibo `position` sobreviveu (1); tabela ausente; CHECK `true CHECK ((message_kind = 'position'::text))`. Re-up `migrate deploy` → ec=0, 2 aplicadas, catálogo `3079 0e6e…` = o do objeto (converge).
  - PONTA B (1 recibo `event`): down ec=3, `ERROR: invalid input syntax for type integer: "PARE: 1 linha(s) …"` — SQLSTATE 22P02 (a mesma expressão com VERBOSITY verbose: `ERROR: 22P02`); catálogo igual ao do objeto, 115 migrações, as duas do bloco presentes, recibo intacto, tabela presente, CHECK `{position,event}` validado. Para na guarda sem apagar nada.
  - PONTA C (1 recibo `position` + 1 amostra nele): down ec=3, 22P02, nada mudou (telemetria 1, catálogo do objeto). Em AUTOCOMMIT (forma R1, sem --single-transaction) no objeto: ec=3 na guarda, tabela presente.
- VERMELHO-CONTROLE pelo COMPORTAMENTO (pontas.sh com o texto do down lido do arquivo MUTADO do worktree; …/pontas-mut.txt):
  - M-E52 (DROP TABLE antes da guarda; numstat 1 1): em AUTOCOMMIT a ponta C perde a tabela com a amostra (`tabela_vte=0`, catálogo 3042) e só depois a guarda falha ("relation … does not exist") → dado perdido. Em --single-transaction a falha desfaz tudo (nada perdido). Vermelho pelo comportamento na forma R1.
  - M-E53 (guarda sem contar a telemetria; numstat 1 1): ponta C nas duas formas → down ec=0, a amostra some com a tabela (`tabela_vte=0`, catálogo de B). Vermelho pelo comportamento.
  - restauro de cada uma: porcelain 0, hash-ok.

### 1 — os motivos do mapa `NOVAS` (emenda v2.4; divergência corpo×objeto (iv)), lidos um a um contra o código do objeto
- comando: `git diff 539b078e 38504427 -- tests/san3-05-acessos-de-plataforma-guard.test.ts` (29+/3−, 2 hunks) e `git grep -n` dos chamadores no objeto. Sete motivos:
  1. L2 `new TraccarIngestionRepository(tx)` ×1 → ×2: service l.267 (dentro de `withTenantRlsBudget` de `eventPhaseTwo`, l.265) e l.374 (`phaseTwo`, l.373). Sustenta-se (as duas no callback com o GUC). A instância em l.533 (`this.options.client`, quarentena sem organização) e a de traccar-resolution.ts:238 são do 01, fora deste mapa.
  2. L1 `withSampleSavepoint` ×3 `$executeRaw` OPACO: l.39/43/48 = SAVEPOINT/ROLLBACK TO/RELEASE `vehicle_sample`, sem tabela; chamada só em service l.469 com o `tx` de `phaseTwoSteps` (callback de `withTenantRlsBudget`). Sustenta-se.
  3. L1 `insertEvent` → vehicle_telemetry_events: único chamador service l.345, `tx` de `eventPhaseTwoSteps` (callback, l.267). Sustenta-se.
  4. L1 `insertSample`: único chamador service l.501 `insertVehicleSample(ports.tx)` ← l.469, dentro do savepoint, mesmo `tx` do recibo. Sustenta-se.
  5–7. L1 `latestDeviceStatus`, `latestIgnition`, `listByVehicle`: `git grep '\.(latestDeviceStatus|latestIgnition|listByVehicle)\('` em src → 0 chamadores (portas de leitura para o B-TRC-04), executor = parâmetro `tx`; sob FORCE RLS sem GUC o resultado é vazio (fail-closed), e a sonda mostrou o filtro de política no plano (1(c)) e listByVehicle 0 sob o GUC de B. Sustentam-se.
- literal L0 `tabelas ENABLE=112 FORCE=112` (l.287) = 111 + vehicle_telemetry_events. Nenhum motivo recusado. (O ratchet roda no item 3.)
- veredito parcial: VERDE.

## Item 3 — CI, regressão e arnês do 01

### 3(a) check-runs do objeto (gh api … /commits/38504427…/check-runs?per_page=100 → …/jtrc02-a/check-runs.json)
- total 14 | não-verdes 0 | pendentes 0 (7 jobs × 2 gatilhos, todos completed success).
- log do `backend-postgres` (jobs 119023544559 e 119023529585, `gh api …/actions/jobs/<id>/logs` em $SCRATCH): nos dois `# tests 463 # pass 463 # fail 0 # skipped 0`; passo do guard: `testes pulados: 0`. 463 = o total do comentário do ci.yml do objeto (l.298) — divergência corpo×objeto (ii): o corpo diz 434; vale o objeto.
- log do `backend` (jobs 119023544506 e 119023529537): `# tests 3865 # pass 3863 # fail 0 # skipped 2`; os 2 `# SKIP` são os nomeados de permission-catalog-db-parity (RBAC_DB_PARITY ≠ "1"); `not ok` = 0. Presentes com `ok`: T9 do censo ("T9 — nenhum despacho novo por prefixo/sufixo/regex no `type`"), "T14a/b · o procedimento converge, é idempotente e falha fechado", "T5/T6/T9 · papel limpo passa…", e as suítes do bloco (ex.: `ok 3011 - evento: 1ª entrega…`, `ok 3049 - [T-M(a)]…`, "amostra: posição com atributos", "banco: vehicle_telemetry_events com ENABLE").
- `git diff 539b078e 38504427 -- .github/workflows/ci.yml` (diff do BLOCO, a partir de B): só comentários (o total do 01 sem o "363/363", o parágrafo do B-TRC-02 com 49 casos e "463/463") e as 4 linhas `SUITES="$SUITES tests/traccar-event-{ingestion,sample,rls,migration-drill}-db.test.ts"`. (c1485c94..objeto também traz `runs-on: ubuntu-24.04` e as 2 suítes do B-SAN3-02, que vieram da main: 2ecfb333, 079332a5.) `traccar-event-sample-quarantine-db` em SUITES: 0.

### Terreno — contagem de trabalhos Docker (P8) ao subir a forma Linux (09:03Z)
- subi `jtrc02-a-tl-{pg,redis,run}` + rede `jtrc02-a-tl-net` (…/jtrc02-a/zz-jtrc02a-linux.sh md5 c74f29dc234eef1f968592a3cc1d12c1; árvore do objeto por `git -c core.autocrlf=false archive` → tar com bytes do blob, conferido: ci.yml do tar md5 = blob, 0 byte CR em scripts/db-runtime-role.sh) → npm ci + prisma generate no container ec=0. Commit livre antes: 15,65 GB; disco 13G.
- contagem medida no ato: além dos meus (jtrc02-a-*, um trabalho) e da base viva (erp-*, ignorada), havia `jtrc02-b-*` (cadeira b, de pé desde antes) e `crit320b-pg` (trabalho de outro bloco, de pé há 6 min — nasceu DEPOIS do meu cluster). Total na máquina: 3 trabalhos. Declaro: ao subir os containers da forma Linux, já havia 2 trabalhos de outros. Os containers tl ficam OCIOSOS (sleep) e as rodadas pesadas só começam com a contagem ≤ 2 trabalhos no total ou, se não baixar, com a memória medida ≥ 4 GB antes de cada rodada e a declaração aqui (commit livre agora: 13,96 GB).

## Item 2 — idempotência, amostra que não derruba, Q1 ausente do banco (parciais já medidos na sonda 1 e nas leituras de blob acima)

### 2(b) forma própria e controles do logger (sonda 1 S8; sonda 2)
- FORMA PRÓPRIA (sonda 1, S8): pelo hook `beforeSampleInsert`, a amostra de uma posição aceita de d1 aponta para um recibo da MESMA organização, viatura e vínculo que JÁ tem amostra → FK de 4 colunas passa, a recusa é `UNIQUE (tenant_id, receipt_id)` = 23505 (fora de {23514,22003}, fora de F12) → 503 unavailable/database; A(rec/loc/tel) 12/1/12 → 12/1/12 (nada gravado); `sample_discarded` 0; `failed before commit` 1 com code 23505; 25P02 em nenhum caso da sonda (0 linhas de log com 25P02).
- sonda 2: …/jtrc02-a/zz-jtrc02a-sonda2.ts (md5 e52386d1c0d895213eb282ed6d71b624; mesmo cabeçalho/semeadura da sonda 1), saída …/sonda2-saida.jsonl; ec=0; senha 0.
  - F10 próprio (hook troca powerMv por −1, domínio): 204 stored; Δ rec/loc/tel = 1/1/0; leitor: `sample_discarded` = 23514 (1), `failed before commit` 0. CONTROLE do logger-espião: acusa 1 descarte.
  - F12(a) próprio (hook lança Error): 503; Δ 0/0/0; leitor: `failed before commit` = "Error" (1), `sample_discarded` 0. CONTROLE: acusa 1 falha antes do commit; o leitor separa as duas linhas.
  - controle positivo sem hook: 204, Δ 1/1/1, 0 descarte, 0 falha.
  - releitura `::text`: amostra com odometer 9007199254740990 lida `9007199254740990` → comparação com '9007199254740991' = false (ACUSA); com 9007199254740991 → lido igual (true). 25P02: 0.
- CONTROLE 4 da busca de resíduo: banco de controle jtrc02_a_ctlres (TEMPLATE jtrc02_a_up) com `ALTER TABLE vehicle_telemetry_events ADD COLUMN fix_key text` + índice parcial com fix_key → o meu catálogo conta fix_key_coluna 1, fix_key_indice 1, parciais 1 (ACUSA); banco removido pelo nome (0).
- 2(d) corrida sem despacho (sonda 1, S7): mesma posição com atributos cheios, viatura V3 SEM despacho, 2× em paralelo com barreira `afterBindingLocked` (o hook ALCANÇA o caminho da quarentena: 2 chegadas) → `202 quarantined/no_operator_at_fix_time | 202 quarantined/no_operator_at_fix_time`; 1 item de quarentena `no_operator_at_fix_time:2` (delivery_count 2); recibos de V3 de qualquer message_kind: 0; linhas de V3 (inclusive sample): 0; B inalterada (md5).

### 1(e) parecer do DBA (divergência corpo×objeto (iii): fora do objeto) — conferido contra a minha medida
- arquivo: C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-dba-parecer.md (179 linhas; mtime 2026-10-20T07:53:19-0300 = 10:53Z de 20/10 → ANTERIOR ao meu voto). `git ls-tree -r <objeto> agent-orchestration/omega/juntas/votos | grep -c B-TRC-02` = 0 no mandato (não está no objeto).
- identidade `dba-trc02-opus` (Claude Opus, não vota); veredito final rodada 2 sobre `46dd99d1` = FAVORÁVEL (rodada 1 sobre `0313353b` DESFAVORÁVEL por D1 = atomicidade, fechada pela emenda v2.3).
- cobre: aditiva (diff de catálogo pré×pós com uma única linha removida, o CHECK `= position` trocado por `ANY(position,event)` validado) — CONVERGE com a minha impressão digital (B 3041 → objeto 3079, o upgrade dá o mesmo md5 do objeto do zero); rollback na ordem com `_prisma_migrations` sem A/B e guarda que para com 22P02 (d1/d2) — CONVERGE com as minhas pontas A/B/C; "nenhum GRANT, REVOKE, SECURITY DEFINER… na A ou na B" e DML do runtime pelos default privileges — CONVERGE (grep 0; prosecdef B = objeto; DML 118 → 119 por default privileges); atomicidade k=1..17 no deploy real (rodada 2) — CONVERGE com a minha injeção PRÓPRIA (17/17).
- nomes e hashes: o parecer identifica a migração pelo COMMIT (`46dd99d1`) e não cita os nomes `20260879000000_*`/`20260880000000_*` nem o hash do blob. Medido: `git rev-parse 46dd99d1:<A>` = `<objeto>:<A>` = dae7fc4d695b…; `<B>` = f7c4cdaab61e… nos dois; `git diff --name-only 46dd99d1 38504427 -- prisma scripts/db-runtime-role.sh` = 0. O parecer é sobre os mesmos blobs do objeto. Nota (não bloqueia): o parecer não registra nome/hash por arquivo.
- divergências com o parecer: nenhuma de fato medido.

### 1(e) — T-M sob as mutações da emenda v2.3 (…/jtrc02-a/zz-jtrc02a-mutrun.sh md5 2e6c4520fd0b50e9b3e252165cf8bc93; aplicador …/zz-jtrc02a-mut.mjs md5 a1bbd5420addb6ba39941a638ba4c092, âncora única CRLF; TAPs em …/jtrc02-a/mut/)
- 1ª tentativa inválida (registrada): passei `--test-name-pattern` DEPOIS do arquivo → "Could not find …--test-name-pattern…" (não mediu); refeita com a opção antes do arquivo.
- M-E51 (numstat 0 4; banco novo migrado com a A mutada): T-M(e) `not ok 5` — "k=1: depois do deploy falho o catálogo é o de ANTES" (+actual −expected). Restauro hash-ok.
- M-E51b (1 2): T-M(e) `not ok 5` — "k=16: … o catálogo é o de ANTES". Restauro hash-ok.
- M-E51c (1 2): T-M(e) `not ok 5` — "k=1: …". Restauro hash-ok.
- M-E52 (1 1): T-M(c) `not ok 3` — no objeto do teste, por FORMA ("a 1ª sentença do down é a guarda", actual `DROP TABLE IF EXISTS …`). PELO COMPORTAMENTO: com as 5 asserções de forma de `downStatements` neutralizadas por mutação minha (J-SEMFORMA2, …/zz-jtrc02a-mut-proprias.json md5 bf5be1097788b1cc2c808e1b3092ae3e; check ec=0), T-M(c) segue vermelho: "down em autocommit com amostra: esperado 22P02 — … Code: `42P01` relation "vehicle_telemetry_events" does not exist" (a tabela com a amostra caiu antes da guarda). Restauro dos 2 arquivos hash-ok.
- M-E53 (1 1): T-M(c) `not ok 3` por FORMA ("a guarda conta a tabela de telemetria inteira" expected true actual false). PELO COMPORTAMENTO (J-SEMFORMA, as 2 asserções da guarda neutralizadas): T-M(c) vermelho — "down em autocommit com amostra: tinha de ser recusado pelo banco (22P02)" (o down passou e apagou a amostra). Restauro hash-ok. → o T-M(c) prende o COMPORTAMENTO, não só a forma, nas duas.
- M-E54h (arnês; 1 1; check ec=0): T-M(d) `not ok 4` (+actual −expected). Restauro hash-ok.
- veredito parcial 1(e): VERDE. (`npm run check` 39,7 s, ec=0 no objeto.)

### 2(a) E4 20× com barreira (…/jtrc02-a/zz-jtrc02a-e4x20.sh md5 57a075a77c471c396dcbc94bc7aeabad; 20 processos SEQUENCIAIS, cada um `node --test --test-name-pattern="duas entregas idênticas concorrentes"` em jtrc02_a_obj; TAPs em …/jtrc02-a/e4-objeto/)
- 20/20 rodadas `ok 4 - evento: duas entregas idênticas concorrentes com barreira no FOR SHARE — 1 recibo, 1 linha, ambas 204` (ec=0, 1 pass, 20 skipped por filtro em cada). O caso assere: códigos [204,204], kinds [duplicate, stored], 1 linha ignition_on. 503 concorrente do 01: não apareceu (0/20).
- VERMELHO-CONTROLE M-E10 (sem `ON CONFLICT … DO NOTHING` no recibo; numstat 0 1; check ec=0): as MESMAS 20 rodadas → 20/20 `not ok 4`, diff do assert `[+ 503 − 204]` (uma das duas entregas cai em 503). O contador acusa; …/jtrc02-a/e4-M-E10.txt. Restauro hash-ok, porcelain 0.
- M-E14 (índice global do recibo com tenant_id na migração do 01 + ON CONFLICT correspondente; banco novo): `ec=1 # tests 21 pass 20 fail 1`, `not ok 10 - evento: chave de OUTRA organização — 409 e quarentena idempotency_key_owned_elsewhere; A sem linha` (é o E9). Restauro dos 2 arquivos hash-ok; banco removido.

### 2(c)(d) mutações do savepoint, do domínio e do CHECK (…/jtrc02-a/mut-amostra.txt; TAPs em …/jtrc02-a/mut/)
- M-E31 (CHECK sem `power_mv >= 0`; banco novo; numstat 1 1): sample-db `fail 2` — `not ok 9` F9 ("power_mv=-1 deveria ser recusado") e `not ok 11` F10. Restauro hash-ok.
- M-E32 (âncora `// erro: desfaz e classifica` contada 1; numstat 1 1; check ec=0): `not ok 11` F10, expected 204 actual 503. Catálogo de mutações sem M-Q1-* executável (já medido). Restauro hash-ok.
- M-E46 (23503 na lista; check ec=0): `not ok 13` F12 ("recusa por integridade/isolamento … falha FECHADO"), expected 503 actual 204 — a FK de isolamento virando warn. Restauro hash-ok.
- M-E47 (sem a linha que relança; numstat 0 1; check ec=0): `not ok 13` F12, expected 503 actual 204. Restauro hash-ok.
- M-E48 (`${sample.powerMv}::smallint`; check ec=0): `not ok 9` F9 e `not ok 10` F9′ (expected 2 actual 1). B9 (host) não rodado por mim: lacuna declarada pela emenda, não achado. Restauro hash-ok.
- M-E26 (VALIDATE trocado por `SELECT 1;`; banco novo): rls-db `not ok 8` G8, expected true actual false (convalidated). Restauro hash-ok.
- G8 no objeto (1(a), caso 8 ok) + catálogo: CHECK = `ANY (ARRAY['position','event'])`, convalidated t → `'position_sample'` recusado pelo G8 do objeto.
- C5 (emenda v2.4 §3), mutação PRÓPRIA J-C5 (…/zz-jtrc02a-mut-proprias.json; `insertVehicleSample` passa `this.options.client` ao `insertSample`; check ec=0): sample-db `ec=1 # tests 13 # pass 4 # fail 9` (casos 1, 2, 6, 7, 8, 10, 11, 12…); pela sonda 2 sob a mesma mutação: posição com atributos → 503, Δ 0/0/0, `failed before commit` = 42501 (WITH CHECK sem GUC), 0 descarte, 0 25P02. Fail-closed medido. Restauro hash-ok, porcelain 0.
- veredito parcial item 2: VERDE (E4 20/20; M-E10 20/20 vermelhas; M-E14, M-E31, M-E32, M-E46, M-E47, M-E48, M-E26 e C5 vermelhas; lista {23514,22003}; forma própria 23505 → 503; 25P02 nunca; Q1 ausente no catálogo, na migração, na árvore e por execução em corrida).

### 3(b) forma Linux do job `backend-postgres`, 3× (…/jtrc02-a/linux-3x.txt)
- tabela `rodada | tests | pass | fail | skipped | duração | commit livre antes`:
  - 1 | 463 | 463 | 0 | 0 | 329 s | 14,12 GB
  - 2 | 463 | 463 | 0 | 0 | 371 s | 12,44 GB
  - 3 | 463 | 463 | 0 | 0 | 278 s | 12,14 GB
- 55 arquivos em SUITES (extraídos por awk do ci.yml do objeto), migrate deploy + db:seed por rodada em banco novo (jtrc02_a_tl_r1..3), guard de pulos `testes pulados: 0` → ec=0 nas 3. Denominador constante = 463 = comentário do ci.yml = check-run.
- P8/Docker declarado: antes da rodada 2 havia de pé, além do meu, `jtrc02-b`(+`-tl…`) e `plan-san320-pg3` (2 trabalhos de outros); antes da 3, `plan-san320-pg3`. A memória nunca ficou abaixo de 12 GB. Desvio de terreno declarado (a contagem ≤ 2 trabalhos foi excedida por trabalhos que nasceram depois do meu); nenhuma queda de VM.
- o drill (`traccar-event-migration-drill-db`) está na lista e passou nas 3 em Linux (sem o EBUSY do Windows).
