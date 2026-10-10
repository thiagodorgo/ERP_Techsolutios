# B-O6R-03a — Plano v1: o replay de despesa do app é atômico e tem dono (`fix/expense-sync-atomic`)

> **Papel:** `planejador-mestre` · **identidade:** `planejador-b-o6r-03a` (instância nova; retomada P3 da mesma identidade após as quedas da sessão às ~16:48Z e ~16:55Z de 2026-10-10 — o esqueleto foi gravado primeiro e cada seção gravada ao terminar, a partir de medição própria).
> **Modelo que de fato rodou:** **Fable 5.1** (`claude-fable-5-1`) — o modelo de topo faz o plano inicial (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, 2026-10-10, `agent-orchestration/controle/decisoes.md:3132-3157` em `origin/main`). Não houve substituição.
> **Ref medida:** `origin/main` = `9b611468902f3984d7704ef2dd6e3ad1d0c08b3a`, idêntica ao head do ramo `fix/expense-sync-atomic` no worktree `C:/Users/AMP/w-03a` (`git rev-parse HEAD origin/main` → o mesmo SHA duas vezes; `git status --porcelain | wc -l` → 0). Toda linha de código citada foi **re-medida nesse SHA**; os números de agosto do achado estão marcados como herdados onde divergem.
> **Terreno da medição:** Windows 11, Git Bash, Node v20.19.5, `npm ci` próprio no worktree (326 pacotes, ec 0), `prisma generate` com `DATABASE_URL` só no ambiente do comando; Postgres descartável `pl03a-pg` (`postgres:16`, `127.0.0.1:58403`, 108 migrações por `prisma migrate deploy`), **removido pelo nome ao fim**; `erp-postgres`/`erp-redis` intocados. Nenhum segredo neste arquivo (a senha do container descartável é `pl03a`; não é segredo).
> **Estado:** **COMPLETO** (2026-10-10, ~17:15Z) — todas as seções gravadas (ordem: esqueleto → §1 → §2 → Veredito/§0/§3 → §4–§6 → §7/§9/§10 → §8), cada uma a partir de medição própria; o arquivo foi regravado uma vez por inteiro a partir das seções em scratchpad depois de um defeito do meu utilitário de gravação (replace por string interpretando `$` no conteúdo), conferido por unicidade de títulos. O container `pl03a-pg` foi removido pelo nome ao fim. Próximo passo: rodada 1 do crítico (§7).

## Veredito no topo

**PLANO PRONTO PARA O CRÍTICO — o bloco NÃO para.** O caminho preferido da l.243 **basta**: a chave do recibo ganha o usuário **dentro do módulo** (valor da coluna `client_action_id` = `<actor_user_id>:<id cru>`), efeito + recibo + evento passam a commitar numa **única transação** cujo **primeiro** write é o próprio recibo (a PK existente serializa o replay concorrente), e o fingerprint do payload vai para `expense_events.payload_hash` na mesma transação. Nada em `prisma/**`, `migrations/**` ou `Kpis/**`. Medições que sustentam o veredito: §1 [09]-[17]; decisão por extenso em §2.

**Decisões deste plano (o crítico ataca estas primeiro):**
- **D-03a-1 — transação única, não claim durável.** O efeito não sai do Postgres; `processing` nem cabe no CHECK ([14]).
- **D-03a-2 — payload divergente sob a mesma chave = `status: "conflict"` por ação, dentro do lote 200, sem efeito e sem escrita**, com `errorCode: "payload_mismatch"` e o `resultRef` original. Não é 409 do lote: um 409 reprovaria o lote inteiro e o app reenviaria para sempre (a fila que nunca converge, QUA-001); o app já trata `'conflict'` por item como *resolução manual* ([19]). O achado pede conflito por fingerprint e o aceite do `PLANO_SAN3` não o cita — este plano **entrega** o fingerprint, sem migração (§4.4).
- **D-03a-3 — o fingerprint é do payload NORMALIZADO** (o que o efeito consome, com chaves ordenadas), não dos bytes crus: ordem de chaves, envelope do app (`tenantId`, `retryCount`, `createdAt`) e campos desconhecidos não geram conflito; mudar `amount`, `periodStart`, `reportId`, categoria etc. gera.
- **D-03a-4 — dois defeitos pré-existentes da mesma via entram no escopo nominalmente** (`uuidPattern` que não casa UUID; agregado do evento de item), porque sem eles 2 dos 3 tipos de ação do aceite não executam ([15], [17]); cada um ganha pendência própria (§9).
- **D-03a-5 — sem guard estático**; a propriedade é garantida por construção (tipo `SyncClaim`) e provada por execução (§5).

## §0 Onde mora a propriedade? (respondido duas vezes)

**A propriedade (P-03a):** *para uma organização, um usuário e um `client_action_id`, o replay de uma ação de despesa produz **exatamente um** efeito monetário — e o recibo que o representa só existe se o efeito existir, e vice-versa. Dois usuários com o mesmo id local são duas ações. A mesma chave com payload divergente não produz segundo efeito nem o silencia: vira conflito.*

### 0.1 Primeira resposta — pelo ENUNCIADO, antes do desenho

Onde a propriedade **pode** morar, dado o que o módulo tem hoje:

| peça | onde | dentro do escopo? | prova de que existe e se comporta assim |
|---|---|---|---|
| unicidade da chave | `mobile_action_receipts_pkey (tenant_id, client_action_id)` — Postgres | fora (`prisma/**` proibido) — **pré-existente, não se toca** | [10] l.177; [13]: o 2º INSERT bloqueia e falha 23505 depois do commit do 1º |
| fronteira transacional | `withTenantRls` = `client.$transaction` (`src/database/rls.ts:29-39`) | fora do módulo, mas é o helper que **o módulo já chama** — não muda | [08]; o precedente `o6r06-usage-fault-injection` F1 prova que `work` lançar = rollback de tudo |
| composição da chave (usuário) | **ninguém** hoje: a chave é `tenant + client_action_id` (service l.169) | dentro — é o que o bloco escreve | [16-2]: u2 recebe o relatório de u1 |
| separação por organização | RLS `FORCE` + política por `app.current_tenant_id` (migração l.256-261) | fora — pré-existente | [10]; o teste A8 roda sob papel sem BYPASSRLS |
| fingerprint do payload | **ninguém** hoje; a coluna candidata existe: `expense_events.payload_hash` (`schema.prisma:2839`) | dentro | [25]: o hash atual é só `{type, clientActionId}` |
| estado "em processamento" entre transações | **não existe** e não cabe no CHECK | fora, e **desnecessário** | [14] |

Conclusão da primeira resposta: a propriedade **não mora em nenhum lugar hoje** — a unicidade existe mas protege a chave errada (sem usuário), e a fronteira transacional existe mas é aberta **quatro vezes** em vez de uma ([08]). Tudo o que falta se escreve **dentro de `src/modules/expense-management/**`**, usando o que já existe fora (PK, `$transaction`, RLS) **sem alterar nada fora**. Nenhuma dependência externa nova: nem advisory lock ([25] proíbe), nem outbox (`grep -n -i "publish\|outbox\|notification\|fetch(" src/modules/expense-management/*.ts` → 0 linhas), nem coluna.

### 0.2 Segunda resposta — pelo REMÉDIO escolhido (§4)

Depois do desenho, cada metade da propriedade tem um endereço nomeado e um teste que a executa:

| metade | mora em | provada por |
|---|---|---|
| "exatamente um efeito" sob concorrência | `claimMobileActionReceipt` = **primeiro write** da transação única; a PK serializa; o perdedor recebe `MobileActionReceiptAlreadyClaimedError` **fora** da tx e relê | T-A A1 (barreira), A5 (vencedor que falha), A6 (N=10) |
| "recibo ⇔ efeito" sob falha | `withSyncTransaction`: claim, efeito, `completeMobileActionReceipt` e `createEvent` na mesma `withTenantRls` | T-A A2/A2b/A2c (falha injetada em cada ponto) |
| "dois usuários = duas ações" | `mobileActionReceiptStorageKey(actorUserId, clientActionId)` — o único lugar que compõe a chave; `findMobileActionReceipt` **exige** `actorUserId` no tipo | T-A A3; T-B B1 |
| "payload divergente = conflito" | `syncActionFingerprint` (normalizado, chaves ordenadas) gravado em `expense_events.payload_hash` na mesma tx; `resolveReplay` compara | T-A A4/A4b; T-B B2; T-C |
| "efeito só com claim" | tipo marcado `SyncClaim`, produzido só por `claimMobileActionReceipt`, exigido por `executeSyncAction` | `npm run check` (compila) + T-A A2 (runtime) — ver §5 |
| separação por organização | inalterada (RLS) | T-A A8 sob papel sem BYPASSRLS |

Dependências **fora do escopo** de que o remédio depende — cada uma provada por comando, nenhuma por política: semântica da PK sob `READ COMMITTED` ([04], [13]); rollback do `$transaction` quando `work` lança (precedente F1 do `o6r06`, reexecutado por T-A A2); RLS por GUC ([10]); helper `withTenantRls` inalterado ([08]). O que **não** se assume: que o app mande o mesmo payload (H-2 — por isso o fingerprint é do normalizado), que não exista recibo legado (H-1 — censo), que o timeout do Prisma cubra a espera (H-4 — A9 mede).

## §1 MEDIDO × HIPÓTESE — registro de medições (comando → saída), e os comandos que derrubariam cada hipótese

Convenção: **[nn]** = medido por mim, com comando e saída; **H-n** = hipótese, com o comando que a derruba. Caminhos relativos a `C:/Users/AMP/w-03a` (head `9b611468`). Linha herdada do achado que divergiu da medida vai entre parênteses.

### 1.1 Terreno

- **[01]** `git rev-parse HEAD origin/main` → `9b611468902f3984d7704ef2dd6e3ad1d0c08b3a` ×2; `git status --porcelain | wc -l` → `0`; `git branch --show-current` → `fix/expense-sync-atomic`.
- **[02]** `npm ci --no-audit --no-fund` no worktree → `added 326 packages in 15s`, `EXIT=0`; `DATABASE_URL=<pl03a> npx prisma migrate deploy` → `All migrations have been successfully applied.` (108 linhas em `_prisma_migrations`); `DATABASE_URL=<pl03a> npx prisma generate` → `Generated Prisma Client (v7.8.0)`. Sem `DATABASE_URL` no ambiente o `generate` falha (`PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`) — passa-se a variável no comando, nunca se exporta.
- **[03]** `docker run … -p 127.0.0.1:55403:5432 postgres:16` **falhou** (`bind: … proibida pelas permissões`); `netsh interface ipv4 show excludedportrange protocol=tcp` → faixas `54861-55965` (e outras) reservadas pelo Windows. Recriado em `127.0.0.1:58403` → `READY after 2s`. **Regra para dev e jurados:** porta alta fora das faixas do `netsh … excludedportrange`.
- **[04]** `SHOW default_transaction_isolation` → `read committed`.

### 1.2 O achado e as linhas, re-medidas no head

- **[05]** `docs/revisoes/SAN3/PLANO_SAN3.md:137` (item 19, `Ω6R-DIN-009`, P0 → `B-O6R-03a`) e `:243` (fronteira `src/modules/expense-management/**` + `-db`; caminho preferido: *a chave do replay ganha o usuário dentro do módulo, sem migração*; condição de parada: *exigir mudar a chave de `MobileActionReceipt`, "compartilhada por todo sync mobile"*; aceite: *replay concorrente → 1 lançamento; 2 usuários mesma chave → 2 lançamentos*; junta *unanimidade + crítico*; dep. `B01 ✓`, `04a` — mergeado em `ab52ec50`, #389).
- **[06]** `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md:611-631` (`[Ω6R-DIN-009]`, P0, confiança 1.00): recibo depois do efeito, em outra transação; chave sem usuário nem fingerprint; teste recomendado: crash efeito→recibo, duas chamadas concorrentes, dois usuários mesma chave, mesma chave/payload diferente. `achados.jsonl:23` → `"status": "ativo"`. `PROMPTS_CORRECAO/BLOCO_03_expense_sync.md` pede *estado processing/result* e fingerprint. `pendencias.md:2883-2916` (`P-O6R-B03`): DIN-009 → `B-O6R-03a`; QUA-001 → `B-O6R-03b`.
- **[07]** `src/modules/expense-management/expense-management.service.ts:155-197` `syncExpenseActions` (herdado 155-193): l.169 `findMobileActionReceipt({ tenantId, clientActionId })` — **sem `actorUserId`**; l.181 `sanitizeJsonRecord`; l.182 `processSyncAction` (efeito); l.183-191 `createMobileActionReceipt` (`status: "processed"`); l.192 `recordEvent(actor, resultRef, "expense_report.synced_from_mobile", { type, clientActionId })`. `processSyncAction` l.199-213: 3 tipos (`expense_report.create`, `expense_item.create` com `parseRequiredUuid(payload.reportId)` l.204, `expense_report.submit` l.208); outro tipo → 400 `unsupported_action` **para o lote inteiro**.
- **[08]** `expense-management-prisma.repository.ts:150-161` `findMobileActionReceipt` por `tenant_id_client_action_id`; `:163-180` `createMobileActionReceipt` = **find-then-create** (l.164-165); `:238-280` `RlsPrismaExpenseManagementRepository`: **cada método abre a própria `withTenantRls`** (find l.269-271; create l.273-275; evento l.277-279); `src/database/rls.ts:29-39` `withTenantRls` = `client.$transaction(tx => { set_config('app.current_tenant_id', …, true); return work(tx) })`. Logo leitura, efeito, recibo e evento são **quatro ou mais transações**.
- **[09]** `prisma/schema.prisma:2853-2871` `model MobileActionReceipt` (herdado 2696-2713 e 2847-2859, ambos defasados): `client_action_id String`, `actor_user_id`, `action_type`, `status @default("processed")`, `result_ref String?`, `processed_at`; **`@@id([tenant_id, client_action_id])`** (l.2865); índices `[tenant_id, actor_user_id]`, `[tenant_id, action_type]`, `[tenant_id, status]`.
- **[10]** `prisma/migrations/20260619000000_add_expense_management_foundation/migration.sql:168-184`: `"client_action_id" TEXT NOT NULL` (l.170 — **sem limite**); `PRIMARY KEY ("tenant_id","client_action_id")` (l.177); **`CHECK ("status" IN ('processed','failed','conflict'))`** (l.178 — **não existe `processing`**); FK `(tenant_id, actor_user_id) → users` (l.205); RLS `ENABLE/FORCE` + política `tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid` (l.256-261). `pg_constraint` no `pl03a-pg` confirma as 4 restrições.

### 1.3 Quem usa a tabela — a premissa "compartilhada por todo sync mobile" não se sustenta no head

- **[11]** `grep -rln "mobileActionReceipt\|MobileActionReceipt\|mobile_action_receipts" src/ tests/ --include=*.ts` → **5 arquivos, todos em `src/modules/expense-management/`**; `tests/` → **0**. `grep -rn "mobile_action_receipts" src/` → só `expense-management.controller.ts:105` (`resourceType`, rótulo de auditoria). Os syncs de `src/modules/mobile/` (`mobile-work-order-sync.ts`, `mobile-checklist-sync.ts`, `mobile-inventory-sync.ts`, `mobile-telemetry-sync.ts`) **não** tocam a tabela. Migrações que a citam: só a de fundação.
- **[12]** `API_CONTRACTS.md:562-563` (§3.15): *"idempotência = tenant + usuário + `client_action_id`"*; `:444` lista `POST /mobile/sync/expense-actions` (`expense_sync:write`). O contrato publicado **já** inclui o usuário na chave; a implementação é que não.

### 1.4 Provas por execução no Postgres real (`pl03a-pg`)

- **[13] A PK serializa o replay concorrente; o perdedor recebe 23505 depois do commit do vencedor.** `pk-wait.sh` (scratchpad): S1 `BEGIN; INSERT mobile_action_receipts(…,'k1',…); SELECT pg_sleep(3); COMMIT;` em background; 0,7 s depois S2 `INSERT` da **mesma** PK. Saída: `S2 esperou 2743 ms` · `ERROR: 23505: duplicate key value violates unique constraint "mobile_action_receipts_pkey"` · `receipts_k1 = 1`. O 2º escritor **bloqueia** na PK até o 1º commitar e então falha — sem lock extra, sem advisory lock.
- **[14] `processing` não cabe no CHECK.** `INSERT … status='processing'` → `ERROR: 23514: … violates check constraint "mobile_action_receipts_status_check"`. O *claim durável `processing`* do achado **exigiria migração** — e o §0 mostra que não é necessário.
- **[15] A FK do evento rejeita `aggregate_id` que não seja relatório.** `INSERT expense_events(tenant_id, gen_random_uuid(), 'expense_report.synced_from_mobile', 'x')` → `ERROR: 23503 … "expense_events_tenant_id_aggregate_id_fkey"`. Modelo `schema.prisma:2834-2851` (`report ExpenseReport @relation(fields: [tenant_id, aggregate_id] … onDelete: Cascade)`; migração l.202). O serviço (l.192) passa `resultRef` como agregado — para `expense_item.create` é o **id do item** (l.205) → o evento violaria a FK **depois** de item e recibo commitados ([08]). Hoje não aparece porque o item nunca chega lá ([17]).
- **[16] Sonda `probe-fk-colisao.mts`** (scratchpad; `CORE_SAAS_PERSISTENCE=prisma`, `RlsPrismaExpenseManagementRepository(prisma)` + `ExpenseManagementService`, superusuário do container; tenant e 2 usuários criados pela sonda e removidos por tenant em ordem de FK):
  - `[1] report.create u1 → {"clientActionId":"a1","type":"expense_report.create","status":"processed","resultRef":"03369b9c-…","replayed":false}`
  - `[2] report.create u2 mesma chave → {"clientActionId":"a1",…,"resultRef":"03369b9c-…","replayed":true} | reports do tenant: 1` — **colisão entre usuários confirmada por execução**: u2 não cria nada e recebe o relatório de u1 como se fosse seu replay.
  - `[3] item.create lançou: EXPENSE_INVALID … reportId must be a valid UUID.` (stack: `parseRequiredUuid` ← `processSyncAction` `service.ts:204`); `items: 0 | receipt a2: 0 | eventos synced_from_mobile: 1`.
- **[17] Causa do [3] — o `uuidPattern` do módulo não casa UUID nenhum.** `expense-management.validators.ts:10`: `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i` — grupos `8-4-4-13` (32 hex); UUID canônico é `8-4-4-4-12` (36). `node -e 're.test("03369b9c-6ad9-4da4-879d-cd23d87b9cd2")'` → `false 36`. `sanitizeJsonRecord` **preserva** `reportId` (sonda `probe-sanitize.mts`: `sanitizado: {"reportId":"03369b9c-…",…}` e `parse lançou: reportId must be a valid UUID.`); `sensitivePayloadKeys` (l.11-25) = `apikey, authorization, clientsecret, cookie, password, privatekey, receipt, receiptbase64, receiptimage, refreshtoken, secret, token, accesstoken`. Consequência: **`expense_item.create` e `expense_report.submit` via sync são impossíveis hoje (400 sempre)**; `workOrderId` em `createReport`/`updateReport` (`parseOptionalUuid`, service l.108, 228) idem. `git log --format='%h %ad %s' --date=short -S "sensitivePayloadKeys" -- …validators.ts` → `53416072 2026-06-11 feat: add expense management backend foundation` — a regex nasce no mesmo commit: **pré-existente**, dentro do módulo e da via que este bloco reescreve.

### 1.5 O cliente (só para fixar o contrato; o código Flutter é do `03b`)

- **[18]** `mobile/flutter_app/lib/core/network/api_contracts.dart:63-76`: `ExpenseSyncActionTypes.supported = {'expense_report.create', 'expense_item.create', 'expense_report.submit', 'expense_receipt.attach'}` — o 4º **não existe no backend** ([07]) → 400 para o lote inteiro quando aparecer.
- **[19]** `mobile/flutter_app/lib/core/sync/sync_replay_service.dart:83-128` `DioExpenseSyncBatchApi`: envia `{clientActionId, tenantId, type, payload, retryCount, createdAt}`; lê `clientActionId, status, resultRef, errorCode` por item; `:185-245`: `'processed'` → `synced` e **acrescenta `result_ref` ao payload local** (l.211-213); `'conflict'` → `SyncStatus.conflict`, *"Conflito remoto exige decisao manual"* (l.215-219); outro → `failed` + `retryCount+1`. `sync_action_factory.dart:25`: `clientActionId ?? _uuid.v4()`. `sync_providers.dart:109-119` (QUA-001, do `03b`): o cliente do replay nasce de `apiConfigProvider` `const`, sem sessão.

### 1.6 Arnês, CI e precedentes de forma

- **[20]** Baseline do módulo: `node scripts/run-backend-tests.mjs tests/expense-management-routes.test.ts` → `CORE_SAAS_PERSISTENCE=memory — padrão do runner` · `# tests 6 · # pass 6 · # fail 0 · # skipped 0` (testes nas l.8, 29, 40, 90, 104, 155; o de l.104 — *"mobile sync is idempotent and ignores cross-scope tenant payload"* — é replay do **mesmo** usuário → `replayed: true`, mesmo `resultRef`).
- **[21]** Suíte inteira: herdado da C3 de `J-B-O6R-04a-ciclo3.md` em `622bf845` — `npm test` 3237 / 3233 / 2 falhas (`T15` do #405, `P-SAN3-05-T15-TETO-DE-RELOGIO`, pré-existente) / 2 skips. **O dev re-mede** no head do bloco (§10).
- **[22]** `tests/helpers/pg-barrier.ts`: `buildApplicationName` (l.33), `withApplicationName` (l.41), `assertApplicationNamePropagated` (l.51), **`waitForOwnBlockedStatement`** (l.91-113; poll 25 ms, timeout 15 s, escopada por `application_name`), `captureSettled`/`expectRejected`/`expectAllFulfilled` (l.160-199). `tests/helpers/auth-identity-fixture.ts:324-365` `createEphemeralRole(admin, url)` → papel `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT` + `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` + `.drop()` resiliente. Injeção de falha: `tests/o6r06-usage-fault-injection.test.ts` (decorator `withFailingUsageInsert`; F1: *"a falha NA MEDIÇÃO derruba a transação inteira, e o RETRY repara"*). Corrida + replay: `tests/financial-pay-title-atomic-db.test.ts` (G1 vencedor/perdedor por barreira; G2 replay → 409 sem mutação).
- **[23]** `.github/workflows/ci.yml`: job `backend` (l.31-37: `DATABASE_URL` + `CORE_SAAS_PERSISTENCE: memory`; `npm test` l.109 — as suítes `-db` rodam aqui porque gateiam por `DATABASE_URL`); job `backend-postgres` (lista `SUITES` l.190-278, última `tests/inventory-migration-drill-db.test.ts` l.278; guard de zero pulos l.280-290).
- **[24]** Porto de unidade (regra do espelho): `src/modules/financial-uow/financial-uow-prisma.ts` (`run(tenantId, work)` → `withTenantRls` → repositórios ligados à tx) e `src/modules/inventory/inventory-uow-prisma.ts` (idem + `mapTransientDbFailure` → 503). `inventory-prisma.repository.ts:1060-1064` `TRANSIENT_DB_CODES = {P2028, P2034, P2024, 40P01, 40001, 55P03}`; P2002 *"mapeado FORA da transação, nunca 25P02"* (l.317, 832, 860).
- **[25]** `pg_advisory` **proibido fora de `src/database/financial-period-lock.ts`** (l.7: *"`tests/financial-period-lock-guard.test.ts` reprova `pg_advisory` em qualquer outro arquivo"*). `canonicalJson` (`src/modules/impound/impound.hashchain.ts:34`) **rejeita número não-inteiro** (`auction.repository.ts:145,188`) — inútil para `amount: 12.5`. `hashExpensePayload` (`expense-management.repository.ts:247-249`) = `sha256(JSON.stringify(payload))`, **dependente da ordem das chaves**; único consumidor `service.ts:274`.
- **[26]** Governança na ref: `git show 9b611468:CLAUDE.md | grep -n …` → §C7 item 8 l.611; (1) l.620; (2) l.624; (5) l.644; §C7.4-bis l.450; §C7.1-bis l.393. `decisoes.md:3132-3157` `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`; `:3095` `D-GUARDA-POR-PROPRIEDADE-BLOCO-TRANSVERSAL`; `pendencias.md:10776` `P-BLOCO-GOV-GUARDA-POR-PROPRIEDADE`.
- **[27]** Nomes (inelegibilidade): `J-B-O6R-04a-ciclo2.md:17-19` (`jurado-o6r04a-c2-banco-rls`, `jurado-o6r04a-c2-fail-closed-backend`, `agente-ci-doutor`), `:42-44` (`planejador-mestre`/`planejador-retomada-b-o6r-04a`; devs `dev-integracao-b-o6r-04a`, `dev-integracao-2-b-o6r-04a`); `J-B-O6R-04a-ciclo3.md:14-18` (`jurado-o6r04a-c2-suplente-banco-rls`, `jurado-o6r04a-c2-suplente-fail-closed-backend`, `coordenador-de-acessos`); `votos/B-O6R-04a/00-critico-r1.md` (`critico-adversarial` inst. 2, Fable), `00-critico-r2.md` (Opus); 07c: `planejador-b-o6r-07c`, `critico-b-o6r-07c-r1`, `critico-b-o6r-07c-r2`. `git ls-tree origin/main .claude/agents/especialistas/`: os 4 `jurado-o6r04a-c2-*` existem na ref. `critico-adversarial.md` sem `model:`; `inspetor-de-terreno-da-junta.md` com `model: fable` (a `D-TOPO` manda nível menor, declarado).

### 1.7 Hipóteses — e o comando que derruba cada uma

- **H-1 (não há recibo legado que importe).** Recibos anteriores ao deploy ficam **invisíveis** à chave nova (§4.3); um replay deles re-executa **uma** vez. Hipótese: não há produção nem staging com dado real (go-live é fronteira humana, `docs/go-live-readiness.md`; a fila de RDV do app nunca sincronizou — QUA-001). **Derruba:** `psql "$STAGING_DATABASE_URL" -tAc "SELECT count(*) FROM mobile_action_receipts"` (e produção) — **ato do dono/orquestrador antes do deploy**, como o censo do 04a; `> 0` → o dev liga o *fallback legado* do §4.3 (desenhado, desligado por padrão). Eu **não** consultei `erp-postgres`.
- **H-2 (o app reenvia os mesmos bytes para ação pendente).** O payload local só muda **depois** de `processed`/`conflict` (l.211-213, 757-761). **Derruba:** `grep -n "payload:" mobile/flutter_app/lib/core/sync/sync_replay_service.dart` mostrando mutação fora desses ramos.
- **H-3 (nada apaga relatório/evento pelo módulo).** `grep -n -i "delete\|remove" src/modules/expense-management/*.ts` → **0** (medido). **Derruba:** `grep -rn "expenseReport.delete\|expenseEvent.delete\|DELETE FROM expense_" src/ --include=*.ts | grep -v expense-management` ≠ 0 (o dev roda e cola).
- **H-4 (o timeout padrão da tx interativa do Prisma, 5 s, cobre a espera do perdedor na PK).** O vencedor segura a tx por milissegundos; na barreira o teste solta o vencedor assim que vê o perdedor bloqueado. **Derruba:** `P2028` em qualquer corrida do T-A → o mapeamento do §4.5 (503) entra e o caso é registrado com N.
- **H-5 (`node --test` = um processo por arquivo → `application_name` por suíte).** Provado no arnês (`pg-barrier.ts:14-18`); cada suíte re-prova por `assertApplicationNamePropagated`.

## §2 A decisão da linha 243 do `PLANO_SAN3.md`, medida — a chave composta dentro do módulo basta? Exige `prisma/**`?

**Pergunta da l.243:** a chave do replay ganhar o usuário *dentro do módulo, sem migração* basta — ou exige mudar a chave de `MobileActionReceipt` / tocar `prisma/**`?

**Resposta medida: basta. O bloco NÃO para.** As quatro perguntas em que isso se decompõe, cada uma com a medição:

1. **"2 usuários com a mesma chave local → 2 lançamentos" cabe na PK atual?** Sim. A PK é `(tenant_id, client_action_id)` e `client_action_id` é `TEXT` sem limite ([09], [10]). O repositório passa a gravar e a procurar `client_action_id = "<actor_user_id>:<client_action_id cru>"` (UUID de 36 chars + `:` + até 160 chars do id cru, limite já imposto pelo validador em `service.ts:167` → ≤ 197 chars). Cada usuário tem a própria linha; a mesma PK continua a **serializar** o replay concorrente do mesmo usuário ([13]). Nada muda em `prisma/schema.prisma`; nenhuma migração. O **contrato publicado já diz isso** (`API_CONTRACTS.md:562`: *idempotência = tenant + usuário + client_action_id*, [12]) — a implementação é que alcança o contrato.
2. **Exige o estado `processing` (claim durável)?** Não — e ele **não cabe** no CHECK sem migração ([14]). O claim é a **própria linha do recibo**, inserida como **primeira escrita** da transação única (status `processed`, `result_ref` NULL até o efeito terminar), invisível fora da transação; o perdedor concorrente bloqueia nessa PK e recebe 23505 **só depois** do commit do vencedor ([13]). Claim durável entre transações só seria necessário se o efeito saísse do Postgres — e não sai: `createReport`/`addItem`/`submitReport`/`createEvent` são todos Prisma na mesma base ([07], [08]); nenhum outbox, fila ou chamada externa no módulo (`grep -n "publish\|outbox\|notification\|fetch(" src/modules/expense-management/*.ts` → 0).
3. **Exige coluna de fingerprint?** Não. O fingerprint do payload vive em `expense_events.payload_hash` do evento `expense_report.synced_from_mobile` (coluna existente, `schema.prisma:2839`), gravado **na mesma transação** que o efeito e o recibo; na réplica, o módulo procura o evento pelo agregado + hash (§4.4). Hoje esse evento já existe por ação (l.192); só o conteúdo do hash e o agregado mudam.
4. **"Compartilhada por todo sync mobile" — a premissa da parada — vale no head?** **Não** ([11]): a tabela é lida e escrita **apenas** por `src/modules/expense-management/**`; `tests/` não a cita; os quatro syncs de `src/modules/mobile/` não a tocam. Mudar o **formato do valor** da coluna dentro deste módulo não alcança nenhum outro módulo. (Se outro módulo adotar a tabela no futuro, herda a chave composta pelo mesmo repositório — fora deste bloco.)

**Logo:** `prisma/**` e `prisma/migrations/**` ficam **proibidos** neste bloco (§6) e a *trava de `prisma/`* (§6 do `PLANO_SAN3`) que o `SAN3-02` espera deste bloco **fica livre desde já**: o `03a` não a ocupa.

**O que a l.243 chamava de "arestas" — medidas, nenhuma bloqueante:**

| bloco | arquivos dele | interseção com `src/modules/expense-management/**` | nota |
|---|---|---|---|
| `B-O6R-07c` (07c-b, D2(d)) | `src/modules/mobile/mobile-work-order-sync.ts`, `work-order.service.ts`, vistoria/evidência | **nenhuma** | o lote de OS não usa `mobile_action_receipts` ([11]) |
| `B-SAN3-16` | `mobile-work-order-sync.ts` + Flutter OS (`PLANO_SAN3.md:287`) | **nenhuma** | — |
| `B-O6R-04b` | `mobile-inventory-sync.ts` + Flutter inventário (`:290`) | **nenhuma** | — |
| `B-O6R-03b` | Flutter RDV + `expense-management.routes.ts` (`:291`) | **contrato** (não arquivo de código deste bloco) | a aresta real: o `03b` consome o `status: "conflict"` por ação (§4.6), precisa tratar `expense_receipt.attach` não suportado ([18]) e o `errorCode` por item; registrado no §9 |
| `B-SAN3-02` | `work-order-financials`, `financial-titles` | **nenhuma**; dependia de `03a` só pela trava de `prisma/` | a trava fica livre (acima) |

**Recibos legados.** Linhas gravadas antes do deploy (chave crua) não são achadas pela chave nova; o replay de uma delas re-executa **uma** vez. Isso é a hipótese **H-1** (§1.7): sem produção/staging com dado real, custo zero; o censo (`SELECT count(*) FROM mobile_action_receipts`) é ato do dono antes do deploy, e o §4.3 traz o *fallback legado* pronto para ser ligado se o censo der `> 0` — sem migração em nenhum dos casos.

**O que o bloco também herda, por estar na via que reescreve (pré-existente, datado em [17], [15]):** `uuidPattern` que não casa UUID (`validators.ts:10`) e o agregado errado do evento de item (`service.ts:192/205`). Sem o primeiro, 2 dos 3 tipos de ação do aceite não executam; sem o segundo, o evento do item viola a FK na transação única e derruba a ação. Entram no escopo (§6) **nominalmente**, com pendência própria no §9 — não são "consertos de passagem": são a condição de o aceite ser executável.

## §3 O comportamento — um critério por linha, com o teste que o prova e a mutação que o deixaria vermelho

Cada linha: critério → teste que o prova (suíte · caso) → **mutação do código de produção** que o deixa vermelho. Concorrência **só por portão causal** (`waitForOwnBlockedStatement`, decorator com *gate*), nunca espera fixa; falha **injetada no ponto exato** por decorator do repositório no teste (nenhum *seam* em produção); suítes `-db` em Postgres real descartável, sob **dois papéis efêmeros sem BYPASSRLS**. Suítes: **T-A** `tests/expense-sync-atomic-db.test.ts` (Postgres); **T-B** `tests/expense-management-routes.test.ts` (memória, HTTP, estende os 6); **T-C** `tests/expense-sync-fingerprint.test.ts` (puro).

| # | critério (um por linha) | prova | mutação que deixa vermelho |
|---|---|---|---|
| C1 | **Crash entre o efeito e o recibo não duplica:** falha depois do efeito e antes de `completeMobileActionReceipt` → **nada** persiste (0 relatório/item/recibo/evento da chave); o reenvio sem falha executa **uma** vez, `replayed: false` | T-A **A2** (decorator lança em `completeMobileActionReceipt`); **A2b** (lança em `createEvent`, depois do recibo); **A2c** (lança no efeito, depois do claim) | recibo gravado em `withTenantRls` própria depois do efeito (a forma de hoje) → A2 acha efeito sem recibo; evento fora da tx → A2b acha evento órfão ou efeito sem evento |
| C2 | **Replay concorrente da mesma despesa → 1 lançamento:** dois replays do mesmo usuário e chave, o 2º só emite o INSERT depois de o 1º deter o claim (barreira) → o 2º bloqueia na PK, recebe 23505 **depois** do commit, relê e devolve `replayed: true` com o **mesmo** `resultRef`; **1** relatório; **0 × 25P02**; **0 × 40P01** | T-A **A1** (barreira: A pausado no efeito pelo gate; `waitForOwnBlockedStatement(appB, "mobile_action_receipts")`; solta A); **A6** (N = 10 paralelos × 5 rodadas sem barreira → exatamente 1 `replayed: false` por rodada) | claim removido (find-then-create de hoje) → 2 relatórios em A1; P2002 tratado **dentro** da tx (releitura na mesma tx) → `25P02` em A1; chave sem PK (não possível sem migração — é por isso que a PK é a âncora) |
| C3 | **Vencedor que falha não bloqueia o perdedor:** A detém o claim e o efeito lança (injetado) → rollback; B, que esperava na PK, prossegue e **vence** (`replayed: false`); 1 relatório, de B | T-A **A5** | claim fora da tx (o claim de A sobreviveria à falha e B ficaria `replayed` de um efeito que não existe) |
| C4 | **2 usuários com a mesma chave local → 2 lançamentos:** u1 e u2, mesmo `clientActionId` → 2 relatórios, ambos `replayed: false`, 2 recibos com `actor_user_id` distintos, e o `clientActionId` devolvido é o **cru** | T-A **A3**; T-B **B1** (HTTP, headers de dois usuários) | `mobileActionReceiptStorageKey` devolve o id cru → u2 recebe `replayed: true` (a saída [16-2]); `mapMobileActionReceiptRecord` sem o *strip* → `clientActionId` com prefixo no resultado |
| C5 | **Mesma chave, payload divergente → `status: "conflict"`, `replayed: true`, `errorCode: "payload_mismatch"`, `resultRef` do original, lote 200, nenhuma escrita** (contagens iguais antes/depois); também quando o `type` diverge | T-A **A4** (amount e periodStart diferentes; type diferente); T-B **B2** (HTTP) | `resolveReplay` ignora o evento → devolve `processed`; fingerprint que não inclui `type` ou `clientActionId` |
| C6 | **Mesma chave, mesmo payload em outra forma → `processed`, `replayed: true`:** ordem de chaves diferente, envelope do app (`tenantId`, `retryCount`, `createdAt`) e campos desconhecidos não geram conflito | T-A **A4b**; T-C (fingerprint estável) | `stableStringify` sem ordenar chaves; fingerprint dos bytes crus em vez do normalizado |
| C7 | **Os 3 tipos executam via sync e replayam:** `expense_report.create`, `expense_item.create` (item criado, `total_amount` recalculado, evento com `aggregate_id` = relatório), `expense_report.submit`; **0 × P2003**; replay de cada → `replayed: true` | T-A **A7**; T-B **B3** | `uuidPattern` revertido (`[89ab][0-9a-f]{12}$`) → 400 em item/submit; agregado = `resultRef` do item → P2003 na tx |
| C7b | **Emenda E1 (§7 item 3):** `workOrderId` inexistente ou de **outra organização** em `expense_report.create` (sync e REST) → **404 `EXPENSE_NOT_FOUND` / `work_order_not_found`**, 0 relatórios, nenhum P2003 cru | T-A **A7b**; T-B **B3b** | mapeamento do `P2003` removido → erro cru (400 com mensagem interna) |
| C8 | **Separação por organização inalterada:** recibo e relatório de T1 invisíveis sob T2 (papel sem BYPASSRLS); T2 com a mesma chave cria o próprio; `tenantId` do payload é ignorado | T-A **A8**; T-B l.104 (existente) | `withSyncTransaction` sem `withTenantRls` (tx sem GUC → a política recusa a escrita; o teste acusa) |
| C9 | **Transitório vira 503, nada gravado:** admin segura a mesma PK numa tx crua além do timeout da tx interativa → o claim recebe `P2028` → **503 `EXPENSE_SYNC_UNAVAILABLE` / `sync_busy`**, 0 recibos/relatórios; `40P01`/`40001`/`55P03` idem | T-A **A9** (~5 s; único caso lento, declarado) | mapeamento removido → erro cru (via `sendRouteError`, 400 com mensagem interna — a classe anotada no plano do 04a §13-5) |
| C10 | **Tipo não suportado continua 400 `unsupported_action` antes de qualquer transação** (inclui `expense_receipt.attach` do app, [18]) e **validação 400 acontece antes do claim** (nenhum recibo nasce de ação inválida) | T-B **B4**; T-A **A10** (payload inválido → 0 recibos) | parse movido para dentro da tx depois do claim → recibo de ação inválida (A10) |
| C11 | **O duplo em memória é honesto:** `withSyncTransaction` da `InMemoryExpenseManagementRepository` restaura o estado quando `work` lança | T-B **B5** (decorator sobre o repositório em memória) | snapshot removido → B5 acha relatório sem recibo em memória |
| C12 | **A regressão do módulo e a suíte inteira seguem verdes;** as novas suítes `-db` entram no job `backend-postgres` e **não pulam** com `DATABASE_URL` | §10 (bateria); `ci.yml` SUITES | suíte fora da lista → o guard de zero pulos não a cobre (o dev prova a linha no diff) |

**Vermelho-controle (antes de escrever o conserto):** o dev roda T-A contra o head-base `9b611468` com o código antigo e registra, com N: A1 → 2 relatórios (ou 1 por sorte — por isso A6 roda 5 rodadas); A2 → efeito sem recibo; A3 → `replayed: true` para u2 ([16-2]); A4 → `processed` silencioso; A7 → 400 `invalid_uuid` ([16-3]). Sem o vermelho medido, o verde não prova nada.

## §4 Desenho — objetivo · ator · fluxo · contrato · modelagem · arquivos tocados (regra do espelho)

### 4.1 Objetivo · ator · fluxo origem→destino

- **Objetivo:** fechar `Ω6R-DIN-009` (P0): o replay de uma ação de despesa vinda do app **não paga duas vezes**, **não troca de dono** e **não engole payload divergente** — sem migração.
- **Ator:** o técnico de campo (`field_technician`/`technician`, permissão `expense_sync:write`, `RBAC_MATRIX.md`; a permissão **não muda** — `routes.ts:110-116` fica intacto). Gestor com `expense_report:read` pode criar para outro `employeeUserId` (`resolveEmployeeUserId`, service l.255-260 — inalterado).
- **Fluxo:** fila offline do app → `POST /api/v1/mobile/sync/expense-actions` (`routes.ts:110`) → `ExpenseManagementController.syncExpenseActions` (`controller.ts:100`, inalterado) → `ExpenseManagementService.syncExpenseActions` (**reescrito**) → `RlsPrismaExpenseManagementRepository.withSyncTransaction` (**novo**) → Postgres (PK + RLS, inalterados).

### 4.2 Contrato — rota, payloads e códigos

- **Rota/permissão/request:** inalterados. `{ actions: [{ clientActionId (≤160), type, payload }] }`; o envelope do app (`tenantId`, `retryCount`, `createdAt`) segue **ignorado**; o tenant vem do ator autenticado (§B2.8).
- **Response 200:** `{ data: { results: [{ clientActionId, type, status, resultRef, replayed, errorCode }] } }`. **Campo novo `errorCode`** (`null` salvo em conflito). `status ∈ { processed, conflict }` (`MOBILE_ACTION_RECEIPT_STATUSES` já tem `conflict`; o app já o trata, [19]). Casos: 1ª execução → `processed · replayed:false · resultRef`; replay fiel → `processed · replayed:true · mesmo resultRef`; replay com payload/`type` divergente → **`conflict · replayed:true · resultRef do original · errorCode:"payload_mismatch"`**, nada escrito.
- **Códigos de erro (abortam o lote, como hoje — declarado, não alterado):** `400 EXPENSE_SYNC_INVALID` (`invalid_actions`, `invalid_action`, `unsupported_action` — inclui `expense_receipt.attach`), `400 EXPENSE_INVALID` (campos; `invalid_uuid` passa a aceitar UUID de verdade), **`404 EXPENSE_NOT_FOUND`** para relatório de **outra organização** (RLS → `getReport` → `notFound()`, service l.79), `409 EXPENSE_REPORT_LOCKED` (transição inválida: `status_not_editable`/`status_not_submittable` — códigos existentes do módulo, mantidos; a casa usa 422 para `empty_report`), `422 EXPENSE_REPORT_INVALID`, **novo `503 EXPENSE_SYNC_UNAVAILABLE` / `sync_busy`** (transitório: contenção além do timeout, deadlock — nada gravado; o app reenvia). Toda validação (400) acontece **antes** de abrir a transação: ação inválida nunca gera recibo (C10).
- **Idempotência:** tenant + usuário + `client_action_id` — exatamente o que `API_CONTRACTS.md:562` já publica. O dev acrescenta, na linha 444 de `API_CONTRACTS.md` (raiz), a nota: *"por ação: `status: conflict` + `errorCode: payload_mismatch` quando o payload diverge do recibo; `503 sync_busy` em transitório; chave = tenant + usuário + client_action_id"*.
- **Semântica do lote (inalterada, declarada):** ações independentes, **uma transação por ação**; erro na ação *k* responde o erro com as ações 1..k-1 já commitadas. Conflito **não é erro**: o lote segue.

### 4.3 Modelagem — nenhuma migração; o que muda é o VALOR gravado

- `mobile_action_receipts.client_action_id` passa a receber **`<actor_user_id>:<client_action_id cru>`** (UUID + `:` + ≤160 → ≤197 chars; coluna `TEXT`). Composto em **um** lugar: `mobileActionReceiptStorageKey(actorUserId, clientActionId)`; desfeito em **um** lugar: `mapMobileActionReceiptRecord` (`startsWith(actor_user_id + ":")` → `slice`). Nenhuma leitura ou escrita da tabela fora do repositório ([11]).
- `status` de linha **visível** é sempre `processed`; `result_ref` sempre preenchido (relatório ou item); `processed_at` `timestamptz(6)` preenchido no `complete`. Os valores `failed`/`conflict` do CHECK **não são gravados** por este bloco (conflito é resposta, não estado).
- `expense_events`: por ação de sync, **um** evento `expense_report.synced_from_mobile` com `aggregate_id` = **relatório** (para item: `normalized.reportId`; hoje l.192 grava o id do item e violaria a FK, [15]) e `payload_hash` = **fingerprint** (§4.4). Já existe um evento por ação hoje; muda o conteúdo, não a cardinalidade.
- Dinheiro, datas, delete lógico: `amount`/`advance_amount`/`total_amount` já são `Decimal` no schema e `Number(...)` no mapeamento — **pré-existente, não tocado** (fora do achado); `periodStart/End`, `spentAt` inalterados; não há delete (H-3).
- **Recibos legados (H-1):** invisíveis à chave nova. **Fallback desenhado, não entregue:** `findMobileActionReceipt` consultaria também a chave crua e aceitaria a linha **só se** `actor_user_id === actorUserId` (sem fingerprint, porque legado não tem) → `processed · replayed:true`; linha de outro usuário é ignorada (a chave nova não colide com a crua). Liga-se **apenas** se o censo do dono der `> 0` (§9, `P-O6R-B03-CENSO-RECIBOS-LEGADOS`); sem migração em nenhum caso.

### 4.4 Fingerprint — do payload NORMALIZADO, gravado na mesma transação

- `parseSyncAction(actor, type, sanitized)` → `NormalizedSyncAction` **puro** (reusa `parseCreateReportInput`/`parseCreateItemInput`/`parseRequiredUuid`): `{ type:"expense_report.create", input: CreateExpenseReportInput }` · `{ type:"expense_item.create", reportId, input: CreateExpenseItemInput }` · `{ type:"expense_report.submit", reportId }`.
- `stableStringify(v)`: objeto → chaves **ordenadas**, recursivo; array na ordem; `Date` → ISO; `undefined` omitido; número/bool/string como JSON. **Não** reusa `canonicalJson` do impound ([25] — rejeita 12.5).
- `syncActionFingerprint(type, clientActionId, normalized) = sha256(stableStringify({ v: 1, type, clientActionId, ...normalized }))` — inclui `type` e `clientActionId` (unicidade por ação mesmo com itens idênticos no mesmo relatório).
- **Réplica:** `aggregateId = type === "expense_report.create" ? existing.resultRef : normalized.reportId`; `findExpenseEvent({ tenantId, aggregateId, eventType: SYNC_EVENT_TYPE, payloadHash })` (índice `[tenant_id, aggregate_id]`, poucas linhas) → achou = `processed·replayed`; não achou = `conflict`. Divergência de `reportId` cai no agregado errado → não achou → conflito (correto).

### 4.5 O fluxo novo, passo a passo (uma ação)

```
1 parse: clientActionId, type → parseSyncAction(actor, type, sanitizeJsonRecord(payload))   // 400 aqui, antes de qualquer tx
2 fp = syncActionFingerprint(type, clientActionId, normalized)
3 fast path: existing = repo.findMobileActionReceipt({ tenantId, actorUserId, clientActionId })
     → existing ? resolveReplay(existing, …) : continua
4 try:  repo.withSyncTransaction(tenantId, async (tx) => {                 // UMA withTenantRls
          claim   = await tx.claimMobileActionReceipt({ tenantId, actorUserId, clientActionId, actionType })  // 1º write; P2002 → AlreadyClaimed
          effect  = await new ExpenseManagementService(tx).executeSyncAction(claim, actor, normalized)       // efeito + eventos de domínio, no tx
          await tx.completeMobileActionReceipt({ …chave, resultRef: effect.resultRef, processedAt: new Date() })
          await tx.createEvent({ tenantId, aggregateId: effect.aggregateReportId, eventType: SYNC_EVENT_TYPE, payloadHash: fp, actorUserId })
          return { …, status: "processed", resultRef: effect.resultRef, replayed: false }
        })
  catch MobileActionReceiptAlreadyClaimedError:   // FORA da tx (ela já deu rollback) — nunca 25P02
        existing = await repo.findMobileActionReceipt(chave)   // existe: o vencedor commitou antes do 23505
        → existing ? resolveReplay(existing, …) : throw 503 sync_busy
  catch transitório (P2028/P2034/P2024/40P01/40001/55P03): throw 503 EXPENSE_SYNC_UNAVAILABLE/sync_busy
5 resolveReplay: evento (agregado, SYNC_EVENT_TYPE, fp) existe → processed·replayed:true·resultRef
                 não existe → conflict·replayed:true·resultRef·errorCode:"payload_mismatch"   // nada escrito
```

- `executeSyncAction(claim: SyncClaim, actor, normalized)` devolve `{ resultRef, aggregateReportId }`: create → `{ report.id, report.id }`; item → `{ item.id, normalized.reportId }`; submit → `{ reportId, reportId }`. Os métodos REST (`createReport`, `addItem`, `submitReport`) e o sync passam pelas **mesmas** rotinas internas extraídas (`createReportFromInput`, `addItemToReport`, `submitReportById`), que fazem as checagens de hoje (relatório editável/submetível, `getReport` → 404) e gravam os eventos de domínio de hoje (`expense_report.created`, `expense_item.created`, `expense_report.submitted`) — **no repositório da transação**.
- **P2002 só no INSERT do claim**: capturado no repositório Prisma em volta de `mobileActionReceipt.create` e relançado como `MobileActionReceiptAlreadyClaimedError` (erro de domínio **sem** `statusCode`); outro P2002 em outro ponto propaga como hoje. A tx aborta pelo `throw`; o Prisma faz rollback.
- `withSyncTransaction` na implementação RLS: `withTenantRls(prisma, tenantId, tx => work(new PrismaExpenseManagementRepository(tx)))` com `try/catch` que aplica `isTransientDbFailure` → 503 (espelho de `inventory-uow-prisma.ts`). Na `PrismaExpenseManagementRepository` (já dentro da tx): `work(this)`. Na memória: snapshot dos 5 `Map`s → `work(this)` → em `throw` restaura e relança (C11).

### 4.6 Arquivos tocados — caminhos exatos, e o módulo de referência de cada um (regra do espelho)

| arquivo | mudança | espelho |
|---|---|---|
| `src/modules/expense-management/expense-sync.ts` **(novo)** | `SYNC_EVENT_TYPE`, tipo marcado `SyncClaim`, `mobileActionReceiptStorageKey`/`parseMobileActionReceiptStorageKey`, `stableStringify`, `syncActionFingerprint`, `NormalizedSyncAction`, `MobileActionReceiptAlreadyClaimedError`, `isTransientDbFailure` (lista de `inventory-prisma.repository.ts:1060`, duplicada e anotada como candidata a `src/database/`) | `inventory-prisma.repository.ts:1060-1064`; `financial-period-lock.ts` (erro de domínio sem status) |
| `expense-management.repository.ts` | interface: `+withSyncTransaction`, `+claimMobileActionReceipt`, `+completeMobileActionReceipt`, `+findExpenseEvent`; `findMobileActionReceipt` **exige** `actorUserId`; **remove** `createMobileActionReceipt` (o find-then-create). `InMemory…`: chave com usuário, snapshot/restore, claim lança se existir | `financial-uow.ts` (porta) |
| `expense-management-prisma.repository.ts` | idem no Prisma; `claim` = `create` puro com `catch P2002 → AlreadyClaimed`; `complete` = `update` pela chave composta; `findExpenseEvent` = `findFirst`; RLS: `withSyncTransaction` com `withTenantRls` + transitório → 503; `mapMobileActionReceiptRecord` com *strip* | `financial-uow-prisma.ts`, `inventory-uow-prisma.ts` |
| `expense-management.service.ts` | `syncExpenseActions` reescrito (§4.5); `parseSyncAction`, `executeSyncAction(claim, …)`, `resolveReplay`; extração de `createReportFromInput`/`addItemToReport`/`submitReportById`; `processSyncAction` **removido**; evento do sync com agregado = relatório | — |
| `expense-management.types.ts` | `SyncExpenseActionResult.errorCode?: string`; `ClaimMobileActionReceiptInput`/`CompleteMobileActionReceiptInput` (substituem `CreateMobileActionReceiptInput`) | — |
| `expense-management.dto.ts` | `errorCode: item.errorCode ?? null` | — |
| `expense-management.validators.ts` | `uuidPattern` → `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` (uma linha, l.10) | — |
| `index.ts` | `export * from "./expense-sync.js"` | — |
| `tests/expense-sync-atomic-db.test.ts` **(novo)** | T-A (A0–A10) | `inventory-balance-lock-race-db.test.ts`, `financial-pay-title-atomic-db.test.ts`, `o6r06-usage-fault-injection.test.ts` |
| `tests/expense-sync-fingerprint.test.ts` **(novo)** | T-C (puro) | — |
| `tests/expense-management-routes.test.ts` | +B1–B5 (memória, HTTP) | — |
| `.github/workflows/ci.yml` | **1 linha** `SUITES="$SUITES tests/expense-sync-atomic-db.test.ts"` + comentário, depois da l.278 | padrão das irmãs |
| `API_CONTRACTS.md` (raiz) | nota na l.444 (§4.2) | — |
| registro (`pendencias.md`, `REGISTRO_ACHADOS_O6R.md`) | §9 | `B-O6R-04a` (DAT-002 "fechado NA AUTORIA") |

**Não se toca:** `expense-management.controller.ts`, `expense-management.routes.ts` (do `03b`), `src/database/**`, `src/modules/mobile/**`, `prisma/**`, `mobile/**`, `frontend/**`, `Kpis/**`.

## §5 Guard — por que este bloco NÃO entrega guard estático, e o que o substitui por construção e por execução

**Decisão D-03a-5: este bloco não entrega guard estático.** Razões medidas, não de gosto:

1. **A superfície da propriedade é uma função, num módulo, com um escritor.** `mobile_action_receipts` é lida/escrita só por `src/modules/expense-management/**` ([11]); o único caminho de escrita do sync é `syncExpenseActions` ([07]). Um guard de texto ("todo caminho que escreve efeito de despesa passa pelo recibo na mesma transação") teria de reconhecer **forma** — chamadas, nomes de método, `withTenantRls` — que é exatamente a classe que custou um ciclo no #389 e dois no 07c (`D-GUARDA-POR-PROPRIEDADE-BLOCO-TRANSVERSAL`, `P-BLOCO-GOV-GUARDA-POR-PROPRIEDADE`). O bloco transversal `B-GOV-GUARDA-POR-PROPRIEDADE` é o dono dessa classe; este bloco **não** a reabre.
2. **A propriedade é garantida por construção, no tipo:**
   - `executeSyncAction(claim: SyncClaim, …)` exige um valor do tipo marcado `SyncClaim` (`{ readonly __brand: "SyncClaim"; tenantId; actorUserId; clientActionId }`), que **só** `claimMobileActionReceipt` produz — e `claimMobileActionReceipt` só existe no repositório **ligado à transação** entregue por `withSyncTransaction` (o wrapper RLS também o expõe, mas como ele abre a própria `withTenantRls`, um claim "de fora" é um claim **sem efeito dentro** — e o T-A A2 pega isso em runtime, ver mutação m2). Um tipo de ação novo **nasce dentro** de `executeSyncAction`, logo dentro do claim e da transação. Chamar o efeito sem claim **não compila** (`npm run check`).
   - `findMobileActionReceipt`/`claim`/`complete` exigem `actorUserId` no tipo — não existe assinatura sem usuário para alguém usar por engano.
3. **A propriedade é provada por execução**, que é a única forma que pega "recibo em transação separada" (T-A A2/A2b/A2c), "chave sem usuário" (A3), "fingerprint ignorado" (A4) e "25P02" (A1) — nenhum desses é visível a um guard de texto.

**Mutações do código de produção, incluindo formas que eu não escrevi, e quem as pega:**

| mutação | pega? | por quem |
|---|---|---|
| m1 · remover o *brand* `SyncClaim` (tipo vira `unknown`) | tsc **não** (brand é só compile-time); os 3 tipos existentes continuam na tx | T-A A2/A2c continuam verdes — **honesto:** o brand protege código **futuro**, os testes protegem o **atual** |
| m2 · `claimMobileActionReceipt` chamado pelo wrapper RLS (fora de `withSyncTransaction`) e o efeito dentro | sim | A2: falha depois do efeito deixa o claim commitado → reenvio devolve `replayed` de um efeito que não existe (resultRef null) |
| m3 · `withSyncTransaction` RLS implementado sem `$transaction` (`work(new Prisma…(this.prismaClient))`) | sim | A2/A2b: efeito commitado e recibo não; A1: 2 relatórios |
| m4 · efeito gravado pelo repositório **externo** (`this.repository` do serviço de fora, não o `tx`) num tipo novo | **não** (residual) | é a instância futura da classe do bloco transversal; registrada em §9 como nota para `B-GOV-GUARDA-POR-PROPRIEDADE` (propriedade candidata: "toda escrita do caminho de sync usa o cliente da transação", verificável por `pg_stat_activity`/`txid_current()` em teste de propriedade) |
| m5 · `catch` do P2002 **dentro** da tx com releitura | sim | A1: `25P02` (asserção 0 × 25P02) |
| m6 · ordem: efeito antes do claim (claim no fim) | **propriedade preservada** (perdedor roda o efeito e dá rollback) — não é defeito, é custo; A1/A6 continuam verdes | o plano exige claim-primeiro por custo (§4.5), não por propriedade — o crítico pode discordar sem reprovar |
| m7 · `status: "processing"` no claim (a sugestão do prompt) | sim | A1/A2: 23514 do CHECK ([14]) |
| m8 · fingerprint de `JSON.stringify` cru | sim | A4b/T-C: ordem de chaves gera conflito falso |
| m9 · `uuidPattern` revertido; agregado = item | sim | A7 (400; P2003) |

**O que substitui o guard, em uma frase:** o tipo impede o caminho novo sem claim; a suíte `-db` prova, por falha injetada e por barreira, que o caminho existente é uma transação só.

## §6 Escopo PERMITIDO e PROIBIDO — caminhos exatos

**PERMITIDO (e só isto):**

- `src/modules/expense-management/expense-sync.ts` (novo)
- `src/modules/expense-management/expense-management.repository.ts`
- `src/modules/expense-management/expense-management-prisma.repository.ts`
- `src/modules/expense-management/expense-management.service.ts`
- `src/modules/expense-management/expense-management.types.ts`
- `src/modules/expense-management/expense-management.dto.ts`
- `src/modules/expense-management/expense-management.validators.ts` — **só** a l.10 (`uuidPattern`)
- `src/modules/expense-management/index.ts` — **só** a linha de export
- `tests/expense-sync-atomic-db.test.ts` (novo), `tests/expense-sync-fingerprint.test.ts` (novo), `tests/expense-management-routes.test.ts` (acrescentar B1–B5; os 6 existentes **não mudam** de asserção)
- `.github/workflows/ci.yml` — **1 linha** `SUITES=` + comentário, depois da l.278 (nada mais no workflow)
- `API_CONTRACTS.md` (raiz) — a nota da l.444 (§4.2)
- registro: `agent-orchestration/controle/pendencias.md` (append), `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` (parágrafo de status sob `[Ω6R-DIN-009]`, l.611+), `docs/revisoes/SAN3/B-O6R-03a-plano.md` (este arquivo; emendas do crítico/dev por **append**), `agent-orchestration/omega/juntas/**` (ata/votos — do orquestrador)

**PROIBIDO (toque = reprovação por escopo):**

- `prisma/**` — inclusive `prisma/schema.prisma` e `prisma/migrations/**` (§2: nada exige; a trava de `prisma/` fica livre para o `SAN3-02`)
- `infra/**`, `.env*`, `package.json`, `package-lock.json`, `pubspec.yaml`/`pubspec.lock`, Figma
- `Kpis/**` (congelado — `D-GOV-PROPORCIONAL` (5))
- `mobile/**` (todo o Flutter é do `B-O6R-03b`), `frontend/**`
- `src/database/**` (`rls.ts`, `prisma.ts`, `financial-period-lock.ts`), `src/modules/mobile/**`, qualquer `src/modules/*` que não seja `expense-management`
- `src/modules/expense-management/expense-management.controller.ts` e `expense-management.routes.ts` (rotas/permissão são do `03b`; este bloco não muda permissão nem rota)
- `.claude/agents/**`, `.agents/**` (corpos de agente — do orquestrador/fábrica), `scripts/**`
- qualquer outro arquivo de `tests/` (as 40 suítes `-db` irmãs e os guards ficam intactos; se uma regressão aparecer, é achado, não conserto deste bloco)

**Regras de terreno do dev (não negociáveis):** worktree próprio em caminho curto (`C:/Users/AMP/w-<id>`), `npm ci` próprio (sem junction), `prisma generate` com `DATABASE_URL` só no comando; Postgres descartável em container com prefixo do bloco, porta alta em `127.0.0.1` **fora das faixas do `netsh … excludedportrange`** ([03]) e nunca 5432/6379/3000/5173/5050; `erp-postgres`/`erp-redis` nunca são alvo; teardown de teste **escopado por `tenant_id` em ordem de FK**, nunca wildcard; `timeout` em tudo; nada de `tail -f`; nenhum segredo no diff.

## §7 Rodada de crítico (máximo 2) — o que atacar primeiro

**Forma:** até **2 rodadas**, `critico-adversarial` em **Opus, declarado** no parecer (`D-TOPO`: o topo faz o plano; o crítico é nível menor), identidades `critico-b-o6r-03a-r1` e `-r2`, worktree **somente leitura** do ramo (prova: `git status --short | wc -l` = 0 antes e depois), cluster Postgres **próprio** (`crit-b03a-pg`, porta fora das faixas de [03]), parecer em `docs/revisoes/SAN3/B-O6R-03a-CRITICA-r1.md` (forma do 07c). Cada achado: `id · gravidade · escopo · comando → saída · motivo`; **nenhum** propõe correção (§C7.4-bis). Devolução de crítico **não** aciona o topo; o replanejamento das devoluções é desta identidade (`planejador-b-o6r-03a`), por **append** neste arquivo (`## Resposta à crítica r1`). O que sobreviver às 2 rodadas vira requisito; o resto a junta julga por execução.

**O que atacar primeiro, na ordem (cada item é uma pergunta falsificável, com o que eu já medi):**

1. **D-03a-2 — conflito dentro do lote 200.** O crítico tenta mostrar um cliente que, recebendo 200, marque a ação divergente como *sincronizada* e perca o payload novo. Medido: o app mapeia `'conflict'` → `SyncStatus.conflict` por item e **não** marca `synced` ([19] l.215-219). Se achar outro consumidor (web? `grep -rn "expense-actions" frontend/src` — eu não medi o frontend), é achado.
2. **D-03a-3 — fingerprint do normalizado.** Dois payloads **materialmente** diferentes que normalizem igual: `notes` > 500 chars (truncado por `optionalString(…, 500)`), `city` > 120, `vendorName` > 160, `policyFlags` além de 50 chaves / profundidade 5 (cortes de `sanitizeJsonValue`). Posição do plano: a normalização **é** o efeito — o que o efeito não consome não distingue ações; o crítico decide se isso é aceitável ou se o fingerprint deve ser do sanitizado **antes** do corte (então o app que reenvia o mesmo payload longo continua igual, e só o corte muda de lado). Eu aceito qualquer das duas; o que **não** aceito é fingerprint dos bytes crus (ordem de chaves e envelope gerariam conflito falso — H-2).
3. **A regex de UUID consertada ABRE caminho novo:** `workOrderId` passa a ser aceito em `createReport`/`updateReport` (REST e sync). Com um `workOrderId` inexistente ou de outra organização, o `create` bate na FK `expense_reports_tenant_id_work_order_id_fkey` (migração l.190) → `P2003` → hoje `sendRouteError` devolve **400 com mensagem interna** (classe anotada no plano do 04a §13-5). **Emenda do planejador E1, já incorporada ao mandato do dev:** o repositório Prisma mapeia `P2003` em `work_order_id` (nos dois métodos) para `ExpenseManagementError(404, "EXPENSE_NOT_FOUND", "work_order_not_found")`; casos **A7b** (T-A: `workOrderId` de outra organização → 404, 0 relatórios) e **B3b** (T-B) entram em §3/§10. O crítico confere se há **outro** parse de UUID que a correção destrava (`grep -n "parseRequiredUuid\|parseOptionalUuid" src/modules/expense-management/*.ts` → service l.108, 204, 208, 228 — eu medi só esses).
4. **O caminho do perdedor.** (a) O perdedor pode reler **nada** depois do `AlreadyClaimed`? Só se o vencedor tivesse **apagado** o recibo entre o commit e a releitura — não há delete (H-3). (b) O evento do vencedor pode estar invisível quando o perdedor compara o fingerprint? Não: recibo e evento commitam na **mesma** tx. (c) `25P02`: o `catch` do P2002 está no repositório, **dentro** do callback da tx, e **relança** — o Prisma dá rollback e o erro sai do `$transaction`; a releitura é **fora**. O crítico injeta um `findMobileActionReceipt` dentro do `catch` e exige que A1 fique vermelho.
5. **Claim-primeiro e o timeout de 5 s (H-4).** Sob carga, um vencedor lento (p. ex. `addItem` com `recalculatePersistedReport` sobre um relatório grande) pode segurar o perdedor além de 5 s → 503 em vez de `replayed`. O crítico mede a tx do efeito com 500 itens no relatório (`recalculateReport` soma em memória, `repository.ts:202-212`) e decide se 503 é aceitável (o app reenvia; o próximo replay acha o recibo) ou se o plano precisa de `maxWait/timeout` explícitos na `withSyncTransaction`.
6. **Fast path fora da tx + RLS.** A leitura rápida (§4.5 passo 3) roda em `withTenantRls` própria; o crítico tenta um ator com `tenantId` forjado no claim — não existe (`requireTenantContext`, controller l.116; o GUC vem do ator) — e um recibo de T1 lido sob T2 (A8).
7. **O duplo em memória (C11).** Snapshot raso dos `Map`s: há mutação **in place** de algum objeto guardado? `InMemory…` sempre grava objetos novos (`set(id, {...})`, repository l.112, 141, 155) — o crítico procura um `push`/atribuição em objeto já no `Map`.
8. **Escopo e forma.** Diff só no permitido (§6); 1 linha em `ci.yml`; nada em `prisma/**`; os 6 testes antigos com asserções intactas; `npm test` sem skip novo com `DATABASE_URL`.

**O que o crítico NÃO precisa atacar** (já decidido com medição, e reabrir custa um ciclo): a parada por migração (§2); advisory lock ([25]); claim durável `processing` ([14]); guard estático (§5).

## §8 Junta — 3 cadeiras, ≤3 itens cada, por execução; inelegibilidade por nome; o que o inspetor confere

**Régua:** bloco de **dinheiro** → junta completa: `inspetor-de-terreno-da-junta` + **3 cadeiras com veto + unanimidade** (`CLAUDE.md` §C7 item 8(1), l.620 da ref), **teto de 2 ciclos** (8(2), l.624: do ciclo 3 só perde dado / vaza entre organizações / quebra permissão / erra dinheiro bloqueia). **Modelos (`D-TOPO`):** inspetor e cadeiras em **Opus** (Claude) ou **GPT-5.6 Sol** (Codex), **declarados** na evidência e na ata; **toda reprovação** volta ao topo (Fable/Astra) para auditar os achados e replanejar com **identidade nova** (quem achou não planeja). Mandato forma A com pré-voo **só** para inspetor e cadeiras (8(3)); bloco P1–P7 colado verbatim em cada disparo; ≤ 2 cadeiras em paralelo (P5); evidência em `agent-orchestration/omega/juntas/votos/B-O6R-03a/<cadeira>-evidencia.md`, voto-arquivo-primeiro (P2); ata `J-B-O6R-03a-ciclo<n>.md` com **quem achou / planejou / desenvolveu / votou** (§C7.4-bis).

### 8.1 As cadeiras — identidades NOVAS criadas pela `agente-fabrica` a partir de corpos que existem na ref (`git ls-tree origin/main .claude/agents/`); o orquestrador versiona nos dois espelhos (`sync-agent-agents.mjs`, `git add -f`)

| cadeira | competência (corpo de origem, na ref) | identidade | mandato (≤ 3 itens, todos por EXECUÇÃO no cluster próprio, papel sem BYPASSRLS) |
|---|---|---|---|
| **C1 · banco e concorrência** | `agente-dba-guardiao.md` + `inspetor-de-arnes-concorrente.md` | `jurado-o6r03a-c1-banco-concorrencia` | (1) **A1/A5/A6 por sonda própria** (não só rodar o T-A): dois clientes, barreira por `application_name`, 1 relatório, 0 × 25P02, 0 × 40P01; ler em `pg_stat_activity` que o perdedor bloqueou em `mobile_action_receipts`; (2) **falha injetada** em cada um dos 3 pontos (A2/A2b/A2c) com contagens por `tenant_id` antes/depois = iguais; (3) **RLS e chave**: recibo de T1 invisível sob T2; `client_action_id` gravado = `<uuid>:<cru>` e devolvido cru; `SELECT count(*) … WHERE position(':' in client_action_id)=0` = 0 nas linhas do bloco |
| **C2 · produto fail-closed e contrato** | `guardiao-fail-closed.md` | `jurado-o6r03a-c2-produto-fingerprint` | (1) **as 9 mutações do §5 e as do §3**, executadas (não lidas): cada uma deixa o teste nomeado vermelho — e **m6** confirmada como "propriedade preservada"; (2) **fingerprint**: payload divergente → `conflict` sem escrita; mesma ação em ordem/envelope diferente → `processed`; `type` divergente → `conflict`; os cortes do item 2 do §7 medidos e a decisão do crítico aplicada; (3) **contrato**: `errorCode` no DTO, 400 antes de qualquer tx (A10), 404 cross-tenant, E1 (404 `work_order_not_found`), 503 em transitório sem escrita (A9); `API_CONTRACTS.md:444` com a nota |
| **C3 · regressão, escopo e registro** | `agente-ci-doutor.md` + `validador-mestre.md` | `jurado-o6r03a-c3-regressao-escopo-registro` | (1) **bateria do §10.2 inteira**, com `npm test` (N, skips = orçamento), tripla execução do T-A e tempo do arquivo; `backend-postgres` com a linha nova e **0 pulos**; (2) **escopo**: `git diff --name-only origin/main` ⊆ §6 permitido; proibido vazio; os 6 testes antigos com asserções intactas (diff do arquivo); nada em `prisma/**`/`Kpis/**`; (3) **registro**: §9.1–9.4 colados, `P-O6R-B03` PARCIAL, `achados.jsonl` **não** alterado, ata com os papéis — **sem cobrar KPI** |

### 8.2 Inelegíveis por nome (conferência do inspetor, item 3.4)

- Este planejador (`planejador-b-o6r-03a`); `critico-b-o6r-03a-r1`/`-r2`; o(s) dev(s) do bloco.
- **`jurado-o6r04a-*`** (todos: `jurado-o6r04a-c2-banco-rls`, `-c2-fail-closed-backend`, `-c2-suplente-banco-rls`, `-c2-suplente-fail-closed-backend`), `agente-ci-doutor` e `coordenador-de-acessos` **como identidades** (votaram no 04a — `J-B-O6R-04a-ciclo2.md:17-19`, `-ciclo3.md:14-18`); os corpos servem de origem, as identidades não votam.
- **Quem achou defeito na mesma classe** (dinheiro sem atomicidade / idempotência) — as identidades das juntas do `B-O6R-02` (ciclos 1–5) e do `B-O6R-06`, medidas por `grep` nas atas: `agente-dba-guardiao`, `inspetor-de-arnes-concorrente`, `inspetor-fixtures-financeiras-legadas`, `guardiao-fail-closed`, `agente-secops`, `agente-devops-provisionador`, `jurado-c4-*` (8), `jurado-c5-*` (3), `critico-c5-adversarial`, `jurado-06-banco-atomicidade-rls`, `jurado-06-invariante-financeiro-rateio`, `jurado-06-contrato-regressao-kpi` (`J-B-O6R-02-ciclo1..5.md`, `J-B-O6R-06.md`). Conservador de propósito: a classe é a mesma (recibo/lançamento fora da transação do efeito); o orquestrador pode **liberar por nome** quem comprovadamente só aprovou, registrando na ata.
- `porteiro-pos-merge` (não vota). A `agente-fabrica` cria os 3 corpos novos acima e **não** reaproveita identidade.

### 8.3 O que o `inspetor-de-terreno-da-junta` confere antes de liberar (fail-closed; Opus declarado)

1. **Objeto** = SHA do head do PR com check-runs **concluídos** (`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`); `cancelled`/`queued` = ausente → não libera.
2. **Terreno por jurado:** worktree próprio em caminho curto, `npm ci` próprio (sem junction), cluster Postgres **descartável por jurado** (`j03a-c<n>-pg`, porta fora das faixas de [03]), `erp-postgres`/`erp-redis` fora do alvo; árvore sem mutação viva (atenção aos 3 ` M` fantasmas por `autocrlf` — byte-idênticos não são mutação).
3. **Insumos:** este plano (versão com as respostas às críticas r1/r2 por append), `B-O6R-03a-CRITICA-r1/r2.md`, relatório do dev com o **vermelho-controle** no head-base (A1/A2/A3/A4/A7 vermelhos, com N) e a bateria do §10.2 com `ec`.
4. **Fatia S0:** `node scripts/sync-agent-agents.mjs --check` verde; os 3 corpos novos **commitados no ramo julgado** nos dois espelhos (o ignore global cobre `.claude/` e `.agents/` — `git add -f`; corpo só conta se estiver no commit).
5. **Inelegibilidade por nome** (8.2) e **modelos declarados** (Opus/Sol) nos mandatos.
6. **Afirmações herdadas marcadas**: [21] (suíte 3237) e a l.243 do `PLANO_SAN3` ("compartilhada por todo sync mobile") são **a re-verificar**, não fato.
7. Plano de perda de jurado (P3): sucessor re-executa os comandos do `<cadeira>-evidencia.md` do caído e mede a cauda; `00-quedas.md` pronto.

**Devolução esperada da junta:** `APROVADO` (3 × 0) → merge com `--match-head-commit` (SHA completo), `--delete-branch`, limpeza pós-merge (§C5), porteiro pós-merge em Opus (produto); `REPROVADO` → `R-B-O6R-03a-<ciclo>.md`, topo (Fable) audita e replaneja com identidade nova, ciclo 2 com cadeiras novas; do ciclo 3 em diante só P0 bloqueia (8(2)).

## §9 Registro — pendências a abrir e a fechar; texto pronto para colar

Regra: KPI **congelado** (`D-GOV-PROPORCIONAL` (5)) — nada em `Kpis/*`; `achados.jsonl:23` fica `ativo` até o marco de KPI (a forma do 04a para o DAT-002). O que muda no PR do bloco: `pendencias.md` (append), `REGISTRO_ACHADOS_O6R.md` (parágrafo de status), `API_CONTRACTS.md:444` (§4.2). Textos prontos para colar:

### 9.1 `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` — logo abaixo do título `### [Ω6R-DIN-009]` (l.611)

```
- Status: fechado NA AUTORIA do B-O6R-03a (PR #<n>); registro de achados e painel mudam no marco de KPI (`D-GOV-PROPORCIONAL` (5)).
  **Efeito, recibo e evento commitam numa transação só, e o recibo é o primeiro write dela.** A chave do recibo passa a
  ser tenant + usuário + client_action_id (valor da coluna `client_action_id` = `<actor_user_id>:<id cru>`, sem migração;
  a PK existente serializa o replay concorrente — o perdedor recebe 23505 depois do commit do vencedor e relê FORA da
  transação, nunca 25P02). O fingerprint do payload NORMALIZADO vai para `expense_events.payload_hash` do evento
  `expense_report.synced_from_mobile`, na mesma transação; replay com payload divergente responde `status: conflict`
  por ação, `errorCode: payload_mismatch`, sem efeito e sem escrita. Dois defeitos pré-existentes da mesma via
  (2026-06-11) fechados junto: `uuidPattern` que não casava UUID nenhum (item e submit via sync davam 400 sempre) e o
  evento do item com `aggregate_id` do item (violaria a FK na transação única).
  **Prova:** `tests/expense-sync-atomic-db.test.ts` (barreira causal, falha injetada em 3 pontos, 2 usuários, payload
  divergente, N=10 × 5 rodadas, transitório → 503), sob papéis efêmeros sem BYPASSRLS; vermelho-controle no head-base
  `9b611468`: u2 recebia o relatório de u1 como replay; crash entre efeito e recibo deixava o efeito; item via sync 400.
```

### 9.2 `agent-orchestration/controle/pendencias.md` — APPEND na entrada `## P-O6R-B03` (l.2883)

```
- **status (2026-10-<dd>): PARCIAL.** `Ω6R-DIN-009` fechado NA AUTORIA do `B-O6R-03a` (PR #<n>, head <sha>) — ver
  `REGISTRO_ACHADOS_O6R.md` [Ω6R-DIN-009]. `Ω6R-QUA-001` segue ABERTO com dono `B-O6R-03b` (Flutter). O contrato que o
  `03b` consome está em `docs/revisoes/SAN3/B-O6R-03a-plano.md` §4.2 (status `conflict` por ação, `errorCode`, 503).
```

### 9.3 `pendencias.md` — entradas NOVAS (APPEND no fim)

```
## P-O6R-B03-UUID-PATTERN-INVALIDO (2026-10-10) — o validador de UUID do módulo de despesas não casava UUID nenhum — FECHADA NA AUTORIA (B-O6R-03a)

- **status:** FECHADA NA AUTORIA do `B-O6R-03a` · **escopo:** `pre-existente` (`53416072`, 2026-06-11, fundação do módulo) · **prova:** `src/modules/expense-management/expense-management.validators.ts:10` = `/^…-[89ab][0-9a-f]{12}$/i` (grupos 8-4-4-13); `node -e 're.test("03369b9c-6ad9-4da4-879d-cd23d87b9cd2")'` → `false`. Efeito: `expense_item.create` e `expense_report.submit` via sync → 400 `invalid_uuid` sempre; `workOrderId` em `createReport`/`updateReport` idem · **conserto:** l.10 → `8-4-4-4-12`; `P2003` em `work_order_id` → 404 `work_order_not_found` (emenda E1) · **teste de encerramento:** T-A A7/A7b, T-B B3/B3b.

## P-O6R-B03-EVENTO-DE-ITEM-VIOLA-FK (2026-10-10) — o evento de sync do item apontava para o id do item, não do relatório — FECHADA NA AUTORIA (B-O6R-03a)

- **status:** FECHADA NA AUTORIA do `B-O6R-03a` · **escopo:** `pre-existente` (mesmo commit) · **prova:** `service.ts:192` grava `recordEvent(actor, resultRef, …)` com `resultRef` = id do item (l.205); `expense_events.aggregate_id` tem FK para `expense_reports` (migração l.202); `INSERT expense_events(… gen_random_uuid() …)` → `23503`. Mascarado pelo defeito anterior · **conserto:** agregado = relatório · **teste:** T-A A7 (0 × P2003).

## P-O6R-B03-CENSO-RECIBOS-LEGADOS (2026-10-10) — recibos gravados antes do deploy ficam invisíveis à chave nova — ATO DO DONO antes do deploy

- **status:** ABERTA · **dono:** ato do dono/orquestrador (como `P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD`) · **o que fazer:** antes do primeiro deploy que contenha o `B-O6R-03a`, rodar em staging e produção `SELECT count(*) FROM mobile_action_receipts WHERE position(':' in client_action_id) = 0;` · `0` → nada a fazer (hipótese H-1 do plano); `> 0` → ligar o fallback legado do plano §4.3 num PR pequeno (sem migração) antes do deploy · **bloqueia:** o deploy, não o merge · **teste de encerramento:** a contagem registrada aqui com data e ambiente.

## P-O6R-B03-APP-RECEIPT-ATTACH-NAO-SUPORTADO (2026-10-10) — o app enfileira `expense_receipt.attach`, que o backend recusa com 400 para o lote inteiro — MÉDIA

- **status:** ABERTA · **escopo:** `pre-existente` · **dono:** `B-O6R-03b` · **prova:** `mobile/flutter_app/lib/core/network/api_contracts.dart:69-75` (`receiptAttach` em `supported`); `service.ts:199-212` só aceita 3 tipos → 400 `unsupported_action` aborta o lote. Uma ação de anexo presa na fila **bloqueia todas as outras** do mesmo lote · **teste de encerramento:** o app não enfileira o tipo (ou o backend o aceita), e um lote com os 3 tipos drena.

## P-O6R-B03-CONTRATO-CONFLITO-POR-ACAO (2026-10-10) — o app precisa consumir `status: conflict` + `errorCode` do sync de despesas — MÉDIA

- **status:** ABERTA · **dono:** `B-O6R-03b` · **prova:** o app já mapeia `'conflict'` por item (`sync_replay_service.dart:215-219`) e lê `errorCode` (`:126`); falta a tela/ação de resolução manual para RDV e o tratamento do 503 `sync_busy` (reenvio) · **teste de encerramento:** teste Flutter com `conflict` + `payload_mismatch` → ação em `SyncStatus.conflict` com saída para o usuário.

## P-O6R-B03-TRANSIENT-CODES-DUPLICADOS (2026-10-10) — a lista de códigos transitórios do Postgres vive em dois módulos — BAIXA

- **status:** ABERTA · **escopo:** `pre-existente` (a lista nasce em `inventory-prisma.repository.ts:1060`, #389) · **dono:** `B-ARNES-2` (ou o bloco transversal que o orquestrador nomear) · **o que fazer:** mover `TRANSIENT_DB_CODES`/`mapTransientDbFailure` para `src/database/` e importar nos dois módulos · **bloqueia:** não.
```

### 9.4 Nota para `B-GOV-GUARDA-POR-PROPRIEDADE` (append em `P-BLOCO-GOV-GUARDA-POR-PROPRIEDADE`, `pendencias.md:10776`)

```
- (B-O6R-03a, 2026-10-10) propriedade candidata para o guard transversal: "toda escrita do caminho de sync de despesas usa o cliente da transação do claim" — a mutação m4 do plano (`docs/revisoes/SAN3/B-O6R-03a-plano.md` §5) não é pega por tipo nem por teste de instância; verificável em teste de propriedade por `txid_current()` igual em todas as escritas de uma ação.
```

### 9.5 Para a ata (o orquestrador registra; §A2)

- A premissa da l.243 do `PLANO_SAN3.md` — *`MobileActionReceipt` compartilhada por todo sync mobile* — **não vale no head** ([11]); a condição de parada não se aplica. Nenhuma linha do `PLANO_SAN3.md` é alterada por este bloco; a nota vai na ata.
- `achados.jsonl` e `Kpis/*` **não** mudam neste PR (congelamento); a consolidação é por marco.

## §10 Baseline N · meta M ≥ 2N · bateria exata · estimativa · riscos · rollback

### 10.1 Baseline N e meta M ≥ 2N

- **N (módulo, medido [20]):** `tests/expense-management-routes.test.ts` = **6** testes, 6/6 verdes em memória. **N (suíte, herdado [21]):** 3237 em `622bf845`; o dev re-mede no head-base `9b611468` **antes** de escrever código e cola `# tests / # pass / # fail / # skipped` (forma canônica: `DATABASE_URL` do container descartável no comando; `CORE_SAAS_PERSISTENCE` **não** exportado — o runner assume `memory`).
- **M (meta):** T-B 6 → **12** (B1–B5 + B3b), T-A **13** (A0–A10 + A7b, A2b/A2c contando como casos próprios), T-C **≥ 6** → **≥ 31** casos no módulo ≥ 2N = 12 ✓. Contagens **de execução**, publicadas no PR com N e forma; nenhuma copiada.

### 10.2 Bateria exata (ordem; `ec` lido do processo; tudo com `timeout`)

```
# terreno (worktree do dev, caminho curto; head-base = 9b611468)
git rev-parse HEAD origin/main; git status --porcelain | wc -l            # 0
npm ci --no-audit --no-fund; DATABASE_URL=<pl-dev> npx prisma generate; DATABASE_URL=<pl-dev> npx prisma migrate deploy
# vermelho-controle (código antigo): T-A contra o head-base, registrar A1/A2/A3/A4/A7 vermelhos com N
DATABASE_URL=<pl-dev> timeout 600 node --test --import tsx tests/expense-sync-atomic-db.test.ts
# depois do conserto
npm run check && npm run lint && npm run build
timeout 300 node scripts/run-backend-tests.mjs tests/expense-management-routes.test.ts         # 12/12, memória
timeout 300 node --test --import tsx tests/expense-sync-fingerprint.test.ts                    # ≥ 6
DATABASE_URL=<pl-dev> timeout 600 node --test --import tsx tests/expense-sync-atomic-db.test.ts # 13/13, 0 skip, 0 × 25P02, 0 × 40P01
DATABASE_URL=<pl-dev> timeout 1800 npm test                                                    # suíte inteira: N_antes + novos; skips = os 2 do orçamento
grep -n "expense-sync-atomic-db" .github/workflows/ci.yml                                      # 1 linha, depois da l.278
grep -rn "mobileActionReceipt\|mobile_action_receipts" src/ --include=*.ts | grep -v expense-management   # vazio
git diff --name-only origin/main | grep -E "^prisma/|^mobile/|^frontend/|^Kpis/|^src/database/|^src/modules/mobile/"   # vazio (escopo)
git diff --check                                                                                # vazio
docker rm -f <pl-dev>                                                                           # limpeza pelo nome; nunca prune
```
Tripla execução do T-A (3 rodadas verdes seguidas) antes de abrir o PR; o tempo do arquivo publicado (esperado < 60 s; A9 responde por ~5 s).

### 10.3 Estimativa (honesta)

- **Dev:** **M** — ~1 dia de Opus: 2–3 h de produto (porta, claim/complete, fingerprint, parse/execute, regex, mapeamentos), 3–4 h de T-A (barreira e injeção são os pontos de atrito; os precedentes estão nomeados), 1 h de T-B/T-C, 1 h de registro e bateria. Dev **distinto** deste planejador e do crítico.
- **Crítico:** 2 rodadas × ~2 h. **Junta:** inspetor ~1 h; 3 cadeiras em paralelo ≤ 2 (P5), ~2 h cada; ata ~30 min. **Total do bloco:** ~2 dias de calendário se o ciclo 1 aprovar; +1 dia por ciclo (teto 2; do ciclo 3 só P0 bloqueia).

### 10.4 Riscos — e o que pode fazer o bloco PARAR

| risco | sinal | mitigação / decisão |
|---|---|---|
| R1 · a barreira de A1 não vê o INSERT bloqueado (`query` do Prisma sem o fragmento) | `timeout esperando statement bloqueado` | o dev mede o texto em `pg_stat_activity` na 1ª rodada; fragmento alternativo `INSERT INTO "public"."mobile_action_receipts"` |
| R2 · `P2028` sob carga (H-4) | 503 em A1/A6 | §4.5 mapeia; se frequente, `timeout` explícito na `withSyncTransaction` (decisão do crítico, item 5) |
| R3 · censo de legado `> 0` (H-1) | `P-O6R-B03-CENSO-RECIBOS-LEGADOS` | fallback §4.3 num PR pequeno **antes** do deploy; não para o merge |
| R4 · a regex destrava `workOrderId` e expõe P2003 cru | A7b/B3b vermelhos | emenda E1 (404 `work_order_not_found`) — já no mandato |
| R5 · o `03b` precisa do contrato antes de o `03a` mergear | pedido do orquestrador | o contrato está fixado em §4.2; o `03b` pode partir dele |
| R6 · **PARADA:** alguém exigir `processing`/coluna de fingerprint/PK nova | pedido de migração | **o bloco para e volta ao dono** (`prisma/**` proibido; a decisão é dele, não do planejador) — o plano mostra que não é necessário ([14], §2) |
| R7 · intermitência alheia no CI (`P-O6R06-A10-LIMPEZA-FK-INTERMITENTE`, `T15` do #405) | `backend-postgres` vermelho fora do bloco | pré-existente; re-execução do job; registrado na ata com o run |
| R8 · quedas de agente (P1–P7) | silêncio > 20 min | evidência incremental; o orquestrador consulta `ListAgents` |

### 10.5 Rollback

Reverter o squash do PR. **Sem migração e sem dado novo**: as linhas de `mobile_action_receipts` gravadas com a chave composta ficam órfãs para o código antigo (que lê pela chave crua) — um replay delas **re-executaria uma vez** no código antigo; aceitável só porque o rollback é cenário de emergência e o censo (§9.3) diz quantas existem. Eventos `synced_from_mobile` com hash novo são inertes para o código antigo.
