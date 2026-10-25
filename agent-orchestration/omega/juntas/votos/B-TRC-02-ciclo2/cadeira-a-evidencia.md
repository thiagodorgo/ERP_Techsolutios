# Evidência — cadeira (a) — B-TRC-02 ciclo 2
papel: cadeira (a) banco/RLS/migração/arnês · identidade `jurado-trc02-c2-a-api` · modelo: Claude Opus pela API (agente cercado `run-api-v3`), nível menor declarado · SUBSTITUIÇÃO: 4º sucessor da cadeira (a) — caíram `a-pro` (Gemini CLI bloqueou npm ci), `a-sol2` (Codex, limite), `a-argon` (Antigravity, sem créditos); decisão do dono 24/10: "Use o claude api para a cadeira a com teto de 4 uss".
objeto: 42800d0dcece29c7e3a39476c9b40c917a66dfd0 · terreno: /work (container) + Postgres 16/Redis 7 do container.

## Legalidade
- cmd: leitura de /entrada/anexos/insp-trc02-c2-parecer.md → `## Veredito — LIBERADO COM RESSALVA`; CI 14/14 concluídos e verdes no objeto (medido pelo inspetor; `gh api` não alcançável no container). O parecer nomeia `jurado-trc02-c2-a-pro` na cadeira (a); a sucessão até `jurado-trc02-c2-a-api` está em /entrada/anexos/00-quedas.md (P3, declarada pelo orquestrador). Meu nome não está na lista de inelegíveis do corpo (elenco TRC-01, planejadores, críticos, dev, DBA, inspetor, fábrica, b/c). `git rev-parse HEAD` = 42800d0d…; árvore limpa.
- parcial: legal, com ressalva (sucessão declarada pelo orquestrador, não pelo inspetor).

## Item 2 (parte estática) — savepoint, lista fechada, Q1 ausente na árvore
- cmd: `git grep -n -i -E 'fix_key|position_sample|sampleWithoutOperator|SAMPLE_ON_QUARANTINE|sampleOnQuarantine' $O -- src prisma tests .github` → 3 ocorrências, TODAS em tests/traccar-event-rls-db.test.ts:297/301/309 (o G8 que exige `position_sample` RECUSADO com 23514). 0 em src, prisma, .github.
- cmd: `git ls-tree -r --name-only $O tests | grep -i quarantine` → só `tests/traccar-quarantine-db.test.ts` (do 01); suíte I (`traccar-event-sample-quarantine-db`) ausente.
- cmd: `git grep -n -E 'SAVEPOINT|23514|22003|25P02' $O -- src` → emissores de SAVEPOINT só em identity-resolver.ts (pré-existente, 01/auth) e `src/modules/telemetry/vehicle-telemetry-prisma.repository.ts:39/43/48` (`withSampleSavepoint`, um único `ROLLBACK TO SAVEPOINT vehicle_sample`). Lista `SAMPLE_DISCARD_SQLSTATES = new Set(["23514","22003"])` (l.23); fora dela → `throw error` (relança). Classificação por SQLSTATE via `meta.driverAdapterError.cause.originalCode|code` (traccar-ingestion.service.ts `sqlStateOf`), nunca por mensagem.
- cmd: `git show $O:prisma/migrations/<A|B>/migration.sql | grep -c -i grant` → 0 / 0.
- parcial: VERDE (estático); comportamento no banco a medir abaixo.

## Item 1 (parte catálogo) — isolamento por construção, no banco do container após `prisma migrate deploy`
- cmd: `psql -f /saida/sondas/catalog.sql` →
  - `vehicle_telemetry_events` relrowsecurity=t relforcerowsecurity=t; `traccar_ingress_receipts` t/t.
  - 1 política `vehicle_telemetry_events_tenant_isolation`, USING e WITH CHECK = `tenant_id = NULLIF(current_setting('app.current_tenant_id', true),'')::uuid`.
  - FKs compostas: `(tenant_id, receipt_id, vehicle_id, binding_id) → traccar_ingress_receipts(tenant_id,id,vehicle_id,binding_id)` (4 colunas, G10), `(tenant_id,binding_id)→vehicle_tracking_bindings`, `(tenant_id,vehicle_id)→vehicles`, `tenant_id→tenants`; todas ON DELETE RESTRICT.
  - CHECK do recibo: `message_kind = ANY('position','event')`, convalidated=t (Q1 = NÃO; `position_sample` ausente).
  - `pg_rules` da tabela = 0; `prosecdef` em public = 1 (`auth_login_candidates`, de `20260868000000_add_auth_identities`, presente no merge-base 7ab2fe71 → pré-existente, fora do bloco; 0 `security definer` nas migrações A/B).
  - colunas `fix_key` em todo o catálogo = 0; índices da tabela: pkey, (tenant_id,id), receipt_key (tenant_id,receipt_id), 3 índices de tempo; nenhum `*_sample_fix_key`.
  - grants da tabela: `postgres` + papéis efêmeros `o6r_b01_*` criados pelas suítes em execução (default privileges; 0 GRANT nas migrações).
- parcial: VERDE.

## Item 3 — rodada 0 (descartada: forma incompleta por erro meu de ambiente)
- cmd: `/saida/sondas/run-job.sh` (SUITES extraído do ci.yml do objeto; 55 linhas) SEM o env de job do ci.yml → `# tests 463 / pass 461 / fail 0 / skipped 2 / ec=0`. Os 2 pulos são `permission-catalog-db-parity` (`RBAC_DB_PARITY não é "1"`): o env do job (`CORE_SAAS_PERSISTENCE=prisma, JWT_SECRET, LOG_LEVEL=silent, RBAC_DB_PARITY=1`) não foi exportado. Limite do meu terreno, não do objeto; rodadas 1–3 refeitas com o env do job. Denominador 463 = comentário do ci.yml.

## Item 3 (parte arnês do 01, régua R3-1)
- cmd: para cada `tests/*traccar*` de c1485c94 (15): `git diff --quiet c1485c94 $O -- f` → 9 IGUAIS (dev-topology, forward-auth, ingest-listener, ingest-logs, ingest-pool-db, operator-at-fix-time, rate-limit, resolution-cost, rls-budget-order); 6 MUDARAM: binding-uniqueness-db 1/0, idempotency-db 1/1, position-ingestion-db 1/0, quarantine-db 1/1, resolution-race-db 1/1, position-contract 2/1.
- cmd: conteúdo do diff (linhas +/-) → nos 5 arnês `-db` a ÚNICA mudança é incluir `vehicle_telemetry_events` na limpeza (DELETE antes dos recibos, exigido pela FK RESTRICT); nenhuma asserção removida/afrouxada. No contrato da posição: título atualizado + `assert.deepEqual(cmd.telemetry, {ignition:true, odometerM:99})` ACRESCENTADO (mais forte). Conforme R3-1.
- parcial: VERDE.

## Item 3 — forma `backend-postgres`, rodada 1 (env do job exportado)
- cmd: `/saida/sondas/run-job.sh 1` → `# tests 463 / pass 463 / fail 0 / skipped 0 / ec=0`. Inclui as 4 suítes do bloco (RLS 10, drill 7, ingestion 22, sample 14 chamadas test) e as 6 do 01. TAP em /saida/sondas/job-r1.tap.

## Item 3 — rodadas 2 e 3 da forma `backend-postgres`
- r2: `# tests 463 / pass 462 / fail 1 / skipped 0 / ec=1`. Falha: `not ok 332 - ingestão: tempo esgotado → 503 e, depois do fim do trabalho, quarentena interna e conflito não gravam nada` (tests/traccar-position-ingestion-db.test.ts:819, "primeira entrega gravada com sucesso 503 !== 204"; o listener tem `timeoutMs: 400` e a entrega SEM atraso estourou 400 ms sob a carga de ~55 arquivos em processos paralelos no container).
- r3: `# tests 463 / pass 463 / fail 0 / skipped 0 / ec=0`.
- re-medida da mesma forma isolada: `node --test --test-name-pattern="tempo esgotado" tests/traccar-position-ingestion-db.test.ts` 5× → 5/5 `# pass 2 # fail 0` (sentinela + o caso), nenhuma falha isolado.
- origem: `git blame -L 819 c1485c94 -- tests/traccar-position-ingestion-db.test.ts` → linha de c1485c94 (merge do B-TRC-01, 2026-10-18), anterior ao ramo; o objeto só acrescentou 1 linha de limpeza nesse arquivo. O teste e o orçamento de 400 ms são do 01; a classe (teste de tempo de parede sob carga paralela) é a mesma do "503 concorrente pré-existente" que o mandato manda re-medir. CI do objeto: `backend-postgres` verde nos 2 gatilhos (medido pelo inspetor).
- denominador 463 constante nas 4 rodadas (r0–r3) = comentário do ci.yml; skipped 0 em r1–r3.
- parcial: VERDE com 1 intermitência registrada — classifico como `pre-existente` / `nao-bloqueia` (ver achado A-1 no voto), com a ressalva honesta de que o bloco acrescenta trabalho à transação da posição (savepoint), o que pode elevar a taxa; não medi a taxa no merge-base (custo).

## Item 1 (parte papel do runtime) — EXPLAIN, 42501, inventário de DML
- cmd: `DB_RUNTIME_ROLE=jt2c2_a_runtime DB_RUNTIME_PASSWORD=<aleatória, só env> bash scripts/db-runtime-role.sh` (script DO OBJETO, inalterado desde o merge-base) → `jt2c2_a_runtime|f|f|f|f|0|0|119` (NOSUPERUSER NOBYPASSRLS; 119 relações com DML).
- cmd: `psql -f /saida/sondas/explain.sql` (SET ROLE jt2c2_a_runtime; GUC = org A; consultas de `latestDeviceStatus`/`latestIgnition` copiadas do repositório pedindo a org B) → os dois planos trazem `One-Time Filter: (NULLIF(current_setting('app.current_tenant_id', true),'')::uuid = '…0b'::uuid)` — o predicado da política injetado pelo RLS; INSERT do evento com tenant B sob GUC A → `ERROR: new row violates row-level security policy for table "vehicle_telemetry_events"` (42501). Plano do INSERT não exibe WITH CHECK (o EXPLAIN do PG não mostra WCO); a recusa na execução é a prova. Sem GUC: `count(*)` = 0 com 2 linhas existentes (admin vê 2). Vermelho-controle implícito: o mesmo SELECT como superusuário vê 2.
- cmd: `select count(*) … has_table_privilege('jt2c2_a_runtime',oid,'INSERT')` → 119; `has_table_privilege(…,'vehicle_telemetry_events','INSERT,SELECT,UPDATE,DELETE')` → t. `git diff --name-only 7ab2fe71 $O -- prisma/migrations` → só as 2 migrações do bloco; únicas `CREATE TABLE|SEQUENCE|VIEW` nelas: `CREATE TABLE "vehicle_telemetry_events"` (A); B nenhuma. Logo o conjunto cresce de 118 (literal do merge-base) exatamente por {vehicle_telemetry_events} = 119 (literal do objeto l.1016). Não refiz o banco no merge-base (custo); a diferença de conjunto é por construção da árvore de migrações.
- rollback: rodapé da A cita no DELETE de `_prisma_migrations` exatamente `20260879000000_vehicle_telemetry_events` e `20260880000000_validate_receipt_message_kind_check` (renumerados; 0 menção a 20260878); guarda é a 1ª sentença; B l.2 aponta "rollback da 20260879000000". Drill T-M(a)–(f) executado verde nas 3 rodadas da forma do job (suíte `traccar-event-migration-drill-db`).
- parcial: VERDE.

## Item 2 (dinâmico) — corrida, savepoint, G8, Q1 ausente
- cmd: `run-mutations.mjs /work db M-E10,M-E26,M-E31,M-E32,M-E46,M-E47,M-E48,M-E43,M-E49` (executor do objeto: aplica com âncora única, tsc, testes, restaura bytes por sha256; usado como roteiro, saída própria em /saida/sondas/mut.out) → 9/9 `"red":true`, ec=0:
  - M-E10 (sem ON CONFLICT do recibo): `not ok` E4 "duas entregas idênticas concorrentes…" (+ E9) — fail 2/21;
  - M-E26 (CHECK do recibo NÃO validado): `not ok` G8 — 1/9; M-E31 (CHECK power_mv sem piso): 2/13 (parser ⊆ banco);
  - M-E32 (sem ROLLBACK TO): F10 domínio vermelho — 1/13; M-E46 (23503 na lista): F12 vermelho; M-E47 (sem o relança): F12 vermelho; M-E48 (::smallint): 2/13;
  - M-E43 (arnês do idempotency sem limpar a tabela nova): after do 01 falha; M-E49 (ordem da limpeza no position-ingestion): after falha.
  - `git status --porcelain` após a rodada → 0 linhas (restauro limpo).
- cmd: 20× sequenciais `node --test --test-name-pattern="duas entregas idênticas concorrentes" tests/traccar-event-ingestion-db.test.ts` → 20/20 `ok 4 … 1 recibo, 1 linha, ambas 204`, 0 `not ok`; 503 concorrente: 0/20.
- G8 no catálogo (item 1): CHECK `message_kind IN ('position','event')`, convalidated=t; o teste G8 (RLS l.297–309) exige `position_sample` → 23514 e passou nas 3 rodadas.
- Q1 = NÃO no banco: 0 coluna `fix_key`, 0 índice `*_sample_fix_key`, 0 `position_sample` no CHECK; migração A sem fix_key/position_sample (mandato, medido); suíte I ausente da árvore e de `SUITES=`; F3-banco ("posição em quarentena por operador — 0 recibo, 0 localização, 0 amostra (Q1 = NÃO)") verde nas 3 rodadas.
- F9/F9′/F10/F12 = casos da suíte sample, verdes nas 3 rodadas; F12 cobre "integridade/isolamento ou erro sem SQLSTATE falha FECHADO — 503, nada gravado".
- NÃO MEDIDO por limite de orçamento do executor (US$ 4), não do objeto: M-E14; a forma PRÓPRIA 23505 por sonda minha (a cadeira caída do ciclo 1 mediu-a por hook — roteiro, não insumo); a sonda própria com B povoada (1(b)) — coberta só pelos canários das suítes (E-canário B 0/0/0, sample B 0/0, "attributes.tenantId = B … B 0/0/0") e pelo 42501/0-sem-GUC acima. Pela lógica do código (`if (!SAMPLE_DISCARD_SQLSTATES.has(code)) throw`) e por M-E46/M-E47, 23505 relança.
- parcial: VERDE.

## Veredito
APROVADO (com ressalva de cobertura parcial declarada e A-1 pré-existente não-bloqueante). Limpeza: nada rastreado alterado (porcelain 0); banco e Redis são do container descartável; papel `jt2c2_a_runtime` ficou só nesse banco.
