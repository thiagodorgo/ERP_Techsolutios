# B-ASS-08 — diário de dev (incremental, P1)

Bloco **B-ASS-08** — fluxo ponta a ponta, webhooks, fila (outbox) e habilitação; **tudo desligado**.
Identidade de dev: **Claude Opus** (DECLARADA; ordem do dono "não espere o Codex, faça você mesmo").
Ramo `feat/b-ass-08-outbox-webhooks`, worktree `C:/Users/thiag/w-ass08`, a partir de `origin/main` (B-ASS-05/06/07 mergeados, head `7d8b2b98`).

**Esta execução: F0–F9 SOMENTE** (dublê em memória; sem `prisma/**`, sem Docker, sem migração).
**F10 (migração M5) aguarda autorização NOMINAL do dono** — `prisma/**` é PROIBIDO por padrão (§C4).
F10–F14 ficam para a continuação, após o "sim" do dono.

Cruzamento de modelo (D-UM-FAZ-OUTRO-VERIFICA): o dev é Claude; a verificação/junta é de modelo diferente (Codex/DeepSeek).
Invariantes (§4.8): webhook desligado = 404 byte-a-byte antes do parser; `timingSafeEqual` (`===` proibido); o corpo do webhook nunca
decide (sempre reconsulta); organização pelo nosso `statement_id` via `billing_statement_refs`, nunca pelo payload; `fetch` nunca
dentro de `withTenantRls`; segredo/corpo nunca em log (só digest); nenhum caminho grava `enabled=true`.

| fatia | comando | saída resumida | veredito parcial |
|---|---|---|---|
| F0 | node --test traccar-forward-auth | pass 9 fail 0 | baseline N: traccar-forward-auth=9; harness OK; prisma generate exit 0; comando e diário criados |
| F1 | node --test ass-08-outbox | pass 9 fail 0 | outbox repo + dispatcher claim-chamada-registro; R-OBX-1/2/3/4; mutações OBX-4 e OBX-1 vermelhas e revertidas; guard de texto (sem fetch em tx) |
| F2 | node --test ass-08-webhook-router | pass 8 fail 0 | router do webhook: 404 padrão antes do parser, 413, 401 sem motivo, limitador por IP e teto global, replay ON CONFLICT; mutação R-WH-1 (parser antes da decisão) vermelha e revertida |
| F3 | node --test ass-08-webhook-asaas | pass 5 fail 0 | fake Asaas emite webhook assinado; adaptador real verifica (timingSafeEqual); 200/401/replay; guard R-WH-2 (timingSafeEqual presente, sem === na comparação) |
| F4 | node --test ass-08-webhook-focusnfe | pass 2 fail 0 | fake Focus NFe emite webhook (X-Webhook-Token); adaptador verifica; external_reference=ref, id ausente → sha256(corpo); 401 em segredo errado |
| F5 | node --test ass-08-reconcile-settlement | pass 8 fail 0 | reconcile por billing_statement_refs (org pelo nosso id) + reconsulta (corpo não decide) + customer-id match; settlement monotônico D6 e excedente→crédito; mutações D6 (T-WH-31) e R-WH-4 (T-WH-21) vermelhas e revertidas |
| F6 | node --test ass-08-chargeback-reversal; npm run check | pass 5 fail 0; tsc OK | chargeback/estorno: D4 (desconta 1º do crédito), D3 (disputa não derruba em dia nem cancela nota), R-CB-1 charged_back, invoice_cancel só em reversão total; mutações D4 e D3 vermelhas e revertidas |
| F7 | node --test ass-08-charges-profile; npm run check | pass 5 fail 0; tsc OK | cobranças gravadas (G11); payment do cliente sem dinheiro (deep-key scan); charge_cancel; gate de perfil (billing_profile_missing + missing[]); mutação T-CHG-3 vermelha e revertida |
| F8 | node --test ass-08-flow-e2e | pass 1 fail 0 | e2e lado pagamento com adaptador Asaas REAL contra o falso: fechado→outbox+refs→cobrança(payUrl)→payment do cliente→webhook assinado→reconcile(reconsulta paid)→paid. Perna da NOTA (invoice_issue→authorized) diferida p/ a continuação (precisa do handler invoice_issue na outbox + reconcile de nota) |
| F9 | node --test ass-08-provider-enable; npm run check | pass 4 fail 0; tsc OK | gate de habilitação G14 fail-closed (8 casos negativos + MP manual) + guard R-CFG-2 (enabled:true só no serviço); mutação R-CFG-1 vermelha e revertida. DIFERIDO: persistência enable/disable, test-connection, register-webhook, emitter, metrics (precisam de repo/porta/rota B-ASS-05/06/07 fora do PERMITIDO; pareiam com M5/F11 e rotas/F13) |

## PAUSA 2026-11-09 21:12 UTC — F0-F9 prontas; F10 (migracao M5) aguarda autorizacao NOMINAL do dono

Head: ramo feat/b-ass-08-outbox-webhooks, 10 commits sobre origin/main 7d8b2b98 (B-ASS-07). Worktree C:/Users/thiag/w-ass08.

Feito (F0-F9, duble em memoria; sem prisma, sem Docker, sem migracao):
- F0 comando + diario + N (traccar-forward-auth=9).
- F1 outbox (outbox/) + dispatcher claim-chamada-registro: R-OBX-1 (fetch nunca em transacao), R-OBX-2 (backoff 1/5/15/60, 8a->FAILED, retry), R-OBX-3 (desligado nao roda), R-OBX-4 (provedor desligado nao e alcancado). Mutacoes OBX-4 e OBX-1 provadas vermelhas.
- F2 router do webhook (webhooks/): 404 padrao ANTES do parser (R-WH-1), 413, 401 sem motivo, limitador por IP + teto global (R-WH-6), replay ON CONFLICT. Mutacao R-WH-1 provada vermelha.
- F3 fake Asaas emite webhook assinado + adaptador real verifica (timingSafeEqual); guard R-WH-2.
- F4 fake Focus NFe emite webhook (X-Webhook-Token) + adaptador verifica.
- F5 reconcile por billing_statement_refs (organizacao pelo NOSSO id, R-WH-5) + reconsulta (corpo nao decide, R-WH-4) + customer-id match; settlement monotonico (D6/R-WH-3) + excedente->credito (R-SET-1). Mutacoes D6 e R-WH-4 provadas vermelhas.
- F6 chargeback/estorno: D4/R-SET-3 (desconta 1o do credito), D3/R-CB-2 (disputa nao derruba "em dia" nem cancela nota), R-CB-1 charged_back, invoice_cancel so em reversao total (R-SET-2). Mutacoes D4 e D3 provadas vermelhas.
- F7 cobrancas gravadas (charges/, G11) + payment do cliente sem dinheiro (deep-key scan, R-CHG-1) + charge_cancel + gate de perfil (R-PRF-1). Mutacao T-CHG-3 provada vermelha.
- F8 e2e lado pagamento com adaptador Asaas REAL contra o falso (R-FLX-1 parcial; perna da nota diferida).
- F9 (nucleo) gate de habilitacao G14 fail-closed (provider-config.service.ts) + guard R-CFG-2. Mutacao R-CFG-1 provada vermelha.

Testes: tests/ass-08-*.test.ts = 47 (pass 47, fail 0). npm run check / lint (tsc) limpo. Regressao: ass-06/ass-07 (importam os fakes editados) 48/48 verdes. git diff --check limpo. Escopo 100% dentro do PERMITIDO (sem prisma, app.ts, env.ts, frontend).

Falta (continuacao, apos o "sim" do dono):
- F10 migracao M5 (prisma/schema.prisma + prisma/migrations), 6 tabelas (billing_outbox, billing_webhook_events, billing_statement_refs, subscription_statement_invoices, subscription_statement_charges, billing_invoice_sequences), com BEGIN;/COMMIT; e node scripts/migration-transaction-guard.mjs. BLOQUEADO: prisma e PROIBIDO sem autorizacao NOMINAL do dono gravada no registro (C4). Texto pronto da autorizacao: plano 3.10.
- F11 repositorios Prisma das portas + testes -db (T-OBX-db-1/2, T-WH-db-1, T-SET-db-1, T-NF-db-1) + RLS (Docker).
- F12 drill M5 (tests/ass-08-channel-migration-drill-db.test.ts) (Docker).
- F13 montagem do router em src/app.ts (ANTES de express.json/pinoHttp, git add src/app.ts), 4 jobs com hora (dispatch/reconcile/poll-pending/poll-settled), env BILLING_WEBHOOK_PUBLIC_BASE_URL, classificacao san3-05, docs (threat model, roteiro de sandbox). Tambem: perna da NOTA do e2e (invoice_issue dispatch + reconcile de nota -> authorized/invoicePdfAvailable) e a persistencia de F9 (enable/disable/test-connection/register-webhook/emitter/metrics).
- F14 bateria + PR.

Proximo comando (ao retomar, com autorizacao do dono): gravar a autorizacao nominal da M5 no registro, entao F10 - prisma/schema.prisma (6 modelos) + prisma/migrations/<carimbo>_ass08_billing_outbox/migration.sql com BEGIN;/COMMIT;, e node scripts/migration-transaction-guard.mjs.

Limpeza: nenhum artefato temporario no repo (o helper de diario vive no scratchpad da sessao). Sem build artifacts gerados (so testes via tsx).
| F10 | migration-transaction-guard.mjs; prisma validate; prisma generate; npm run check | violacoes 0; schema valid; tsc OK | AUTORIZACAO NOMINAL do dono em D-ASS08-MIGRACAO-M5 (2026-11-09, relaiada pelo caller). M5: 6 modelos no schema.prisma + migration.sql (20260900000000_ass08_billing_outbox) com BEGIN/COMMIT, CHECKs, UNIQUEs parciais, FKs compostas; RLS ENABLE+FORCE nas 3 tabelas de organizacao, 3 globais declaradas. Drill F12 criado (cita o nome da migracao; executa em CI/Postgres) |

## RETOMADA 2026-11-09 — F10 + F12 feitos e VALIDADOS em Postgres real; F11/F13 param num ponto de desenho (reportado ao orquestrador)

Autorizacao: D-ASS08-MIGRACAO-M5 (dono, 2026-11-09), relaiada pelo caller. Registrei a referencia neste diario e prossegui.

Feito e validado nesta retomada:
- F10 migracao M5: 6 models em prisma/schema.prisma + prisma/migrations/20260900000000_ass08_billing_outbox/migration.sql
  (BEGIN/COMMIT, CHECKs, UNIQUEs parciais, FKs compostas, RLS ENABLE+FORCE nas 3 tabelas de organizacao; 3 globais).
  node scripts/migration-transaction-guard.mjs = violacoes 0. prisma validate = schema valid. npm run check = OK.
- VALIDACAO EM POSTGRES 16 REAL (container descartable 127.0.0.1:55432, ja removido): a CADEIA INTEIRA (129 migracoes,
  inclusive a M5) aplica com prisma migrate deploy; e o drill F12 (tests/ass-08-channel-migration-drill-db.test.ts) passa
  4/4 — aplica as 6 tabelas, RLS FORCE so nas 3 de organizacao, down em transacao unica sem tocar preexistentes,
  atomicidade por prefixo, e isolamento por organizacao sob papel NOSUPERUSER NOBYPASSRLS. A parte irreversivel (DDL) esta
  provada correta.

PONTO DE DESENHO que interrompe F11 (reportado ao orquestrador, NAO embarcado as pressas num bloco de DINHEIRO):
  Os ports em memoria de F1-F9 (OutboxRepository, StatementChargeRepository) sao STANDALONE: mutam por id sem tenant_id,
  e o claim do outbox e global. As 3 tabelas tenant-scoped (billing_outbox, subscription_statement_invoices,
  subscription_statement_charges) tem FORCE RLS. Sob o papel de runtime (NOSUPERUSER NOBYPASSRLS):
    - toda mutacao por id e o claim precisam de contexto de organizacao (withTenantRlsBudget);
    - o claim e POR ORGANIZACAO, iterando billing_statement_refs (o proprio plano §3.8 diz isso);
    - a tela de outbox (GET /platform/billing/outbox) e leitura de PLATAFORMA sobre tabela FORCE = forEachTenantRls.
  Logo, os repos Prisma fieis exigem o modelo tenant-scoped (igual StatementRepository: transaction(tenantId, cb) + tx
  methods, ou tenantId nas mutacoes). Isso e um refactor ADITIVO porem real dos ports/dispatcher/testes de F1-F9 (ja
  commitados e verdes). Em -db com superusuario o RLS e bypassado e o bug nao apareceria; em producao (runtime role)
  apareceria — exatamente o que san3-05/runtime-role guardam. Embarcar sem isso seria RLS-inseguro.

Decisao recomendada ao orquestrador (uma linha de confirmacao destrava F11): adotar o modelo tenant-scoped para os 3
repos RLS (espelhar StatementRepository), mantendo os 3 repos GLOBAIS (webhook-events, statement-refs, invoice-sequences)
como CRUD direto. Os 3 globais nao tem o impasse e podem nascer ja. Com o ok, sigo F11 -> F13 -> F14 (PR).

F13 (apos F11) — escopo cross-cutting a planejar junto: montar o router em src/app.ts ANTES de express.json/pinoHttp
(git add src/app.ts); env BILLING_WEBHOOK_PUBLIC_BASE_URL; os 4 jobs (dispatch/reconcile/poll-pending/poll-settled) no
registro, com construcao de ports por provedor LIGADO e resolveTarget (env flag + config.enabled + cofre + adaptador);
ATUALIZAR tests/san3-05-leituras-de-plataforma-db.test.ts (classificacao do router de webhook SEM-FORCE; jobs
FORCE-PLATAFORMA); grants do papel de runtime (G-DB-ROLE) para as tabelas novas; a perna da NOTA do e2e (invoice_issue
dispatch + reconcile de nota); a persistencia de F9 (enable/disable/test-connection/register-webhook/emitter/metrics),
que precisa de superficie de repo/adaptador de B-ASS-05/06/07.

Estado: ramo feat/b-ass-08-outbox-webhooks, arvore limpa, 13 commits sobre origin/main 7d8b2b98. Sem push/PR. Docker
descartavel removido; nada de erp-*/5432/6379 tocado. KPI intocado.
| F11a | node --test ass-08 (9 arq); npm run check | pass 47 fail 0; tsc OK | ports tenant-scoped (decisao do orquestrador): tenantId nas mutacoes/leituras por id de OutboxRepository e StatementChargeRepository; o duble valida o tenant como o RLS faria; dispatcher passa row.tenantId; testes F1-F9 ajustados e verdes (nao enfraquecidos) |
| F11b | npm run check; node --test ass-08-channel-db (DATABASE_URL) | tsc OK; -db pass 5 fail 0 em Postgres real sob papel NOSUPERUSER NOBYPASSRLS | repos Prisma: outbox (claim FOR UPDATE SKIP LOCKED por organizacao via billing_statement_refs; mutacoes em withTenantRlsBudget; plataforma via forEachTenantRls), webhook-events + statement-refs (globais), charges (withTenantRls). T-OBX-db-1 (2 workers linhas distintas), T-WH-db-1 (UNIQUE), RLS com vermelho-controle (invisivel sem GUC) |
| F11c | node --test ass-08-channel-db (DATABASE_URL) | -db pass 7 fail 0 em Postgres real | numeracao duravel da DPS (R-NF-8): nextDpsNumber com UPSERT atomico ON CONFLICT DO UPDATE RETURNING (lock de linha serializa); T-NF-db-1 concorrentes 1 e 2, rollback nao consome numero |
| F13a | node --test env-billing-vault; npm run check | pass 7 fail 0; tsc OK | env BILLING_WEBHOOK_PUBLIC_BASE_URL (§3.9): default vazio; gate producao+canal ligado exige https://. Fixture PROD_BASE da B-ASS-05 ajustada (ambiente de producao completo tem a URL) + teste do gate; testes verdes, nao enfraquecidos |

## F11 COMPLETO + F13a; F13 (b-f) reportado ao orquestrador (ponto de desenho em F9-persistencia)

F11 (repos Prisma tenant-scoped, decisao do orquestrador) — FEITO e VALIDADO em Postgres 16 real sob o papel de
runtime NOSUPERUSER NOBYPASSRLS (nunca superusuario):
- ports da outbox/charges tenant-scoped (tenantId nas mutacoes/leituras por id); o duble valida o tenant como o RLS
  faria; dispatcher passa row.tenantId; testes F1-F9 ajustados e verdes (nao enfraquecidos).
- outbox.prisma (claim FOR UPDATE SKIP LOCKED por organizacao via billing_statement_refs; mutacoes em
  withTenantRlsBudget; plataforma via forEachTenantRls), webhook-events.prisma + statement-refs.prisma (globais),
  charges.prisma (withTenantRls), invoice-sequence.service (UPSERT atomico ON CONFLICT DO UPDATE RETURNING).
- tests/ass-08-channel-db.test.ts 7/7: T-WH-db-1 (UNIQUE), T-OBX-db-1 (2 workers SKIP LOCKED linhas distintas),
  RLS com VERMELHO-CONTROLE (invisivel sem GUC; A nao ve B), T-NF-db-1 (numeracao concorrente 1/2 + rollback nao
  consome). Drill M5 4/4. npm run check limpo.

F13a — env BILLING_WEBHOOK_PUBLIC_BASE_URL + gate de producao (feito, verde).

F13 (b-f) RESTANTE — camada de ligacao cross-cutting, boot/guard-critica, num bloco de DINHEIRO. Medido:
- (e) grants do papel de runtime: NAO precisa mudanca — scripts/db-runtime-role.sh usa ALTER DEFAULT PRIVILEGES, as
  6 tabelas novas (criadas pelo migrator) ja sao cobertas.
- (b) montar o router em src/app.ts ANTES de express.json/pinoHttp, com resolveTarget lazy (flag env + config.enabled +
  cofre + fabrica de adaptador: createAsaasAdapter/createFocusNfeAdapter + billingHttpClientFromEnv + VaultService) e os
  repos Prisma. Boot-critico (app.ts afeta o boot inteiro); exige smoke de boot.
- (c) 4 jobs: dispatch-outbox e reconcile-webhook (ligacao dos repos Prisma + construcao de ports por provedor LIGADO)
  + poll-pending e poll-settled, que sao LOGICA NOVA (reconsulta de eventos received sem job > 30 min via refs;
  reconsulta de confirmed por 120 dias) — nao so ligacao.
- (d) tests/san3-05-leituras-de-plataforma-db.test.ts: inventario EXATO (router de webhook SEM-FORCE / "infra, sem
  modulo"; jobs FORCE-PLATAFORMA). Guard-sensivel.
- (f) PONTO DE DESENHO (reportado, conforme instrucao "PARE e me chame"): a persistencia de F9
  (enable/disable/test-connection/register-webhook/emitter/metrics) precisa de superficie no repo de config da B-ASS-05
  (InMemoryProviderConfigRepository/Prisma) que HOJE so tem upsert+setEnabledForTests — NAO tem enable/disable/last-test
  duraveis. Usar a superficie da main significa ou estende-la (toca arquivo B-ASS-05, fora do PERMITIDO desta execucao)
  ou decidir onde a persistencia do liga/desliga mora. O gate G14 (fail-closed) ja esta pronto (F9 nucleo). A perna da
  NOTA do e2e (invoice_issue dispatch na outbox + reconcile de nota -> authorized/invoicePdfAvailable) e logica nova
  que pareia com (c).

Estado: ramo feat/b-ass-08-outbox-webhooks, arvore limpa, 18 commits sobre origin/main 7d8b2b98. Sem push/PR. Docker
descartavel removido. KPI intocado. Canal DESLIGADO.

## PARTE 1 (rumo (ii) do orquestrador) — guards que as tabelas/repos novos exigem, atualizados NESTE PR

Rumo decidido pelo orquestrador (§A6): PR da parte 1 sobre o validado (F0-F11 + F13a); a ligação (router em app.ts, 4 jobs,
perna da nota, cenários de rota/job do san3-05) vira a B-ASS-08b, em ramo empilhado.

Reprodução do job `backend` da CI (Postgres 16 + Redis 7 descartáveis em porta alta 127.0.0.1, `migrate deploy` na base,
`npm test` com DATABASE_URL + REDIS_URL): ver a linha da bateria abaixo. Sem banco/Redis, 6 testes de Redis e o
core-saas-role-authority (import de src/database/prisma.ts exige DATABASE_URL) caem por AMBIENTE — na CI eles têm os dois.

Guards atualizados, cada um com o motivo:
1. T13 (tests/san3-05-acessos-de-plataforma-guard.test.ts, NOVAS): +12 chaves, coladas da saída do gerador no head, motivo
   por chave — as 3 de billing_outbox sob o callback de withTenantRlsBudget (claim SKIP LOCKED por organização, registro por
   id, retry; setter do GUC = 1ª instrução, rls.ts l.128) e as 9 de SQL cru em tabelas GLOBAIS sem RLS (statement_refs,
   webhook_events, invoice_sequences: OPACO, nenhuma tabela FORCE tocada). Os acessos sob withTenantRls/forEachTenantRls
   (charges, enqueue/findById/listByStatement e a varredura de plataforma) não geram chave — o gerador os prova sob contexto.
2. T13 L0 exato: literal 120 → 123 — exatamente as 3 tabelas FORCE novas e os 3 models delas (medido pelo gerador com as
   fixtures c2-f2). As 3 globais da M5 não têm RLS e não entram no L0.
3. Censo do medidor (src/modules/subscription-billing/metering/censored-tables.ts, GERADO): regenerado por
   `node scripts/gen-tenant-tables.mjs` contra a base migrada → +3 (billing_outbox, subscription_statement_charges,
   subscription_statement_invoices), 118 no total. Correto por regra (R-MED-9: toda tabela FORCE com tenant_id NOT NULL é
   medida); o SQL do medidor é genérico (sum(pg_column_size(t.*)) sob RLS).
4. env (tests/env-billing-vault.test.ts): PROD_BASE ganha a URL pública do webhook (um ambiente de produção completo a tem)
   + teste do gate novo — feito em F13a.

Correção de revisão própria antes do PR: PrismaStatementRefRepository.setExternalChargeId fazia UPSERT com tenant_id zerado
quando o índice não existia (violaria a FK para tenants, ou criaria índice falso). Agora só faz UPDATE (o índice nasce no
fechamento, N1); o dublê foi alinhado ao mesmo comportamento.
5. DRIFT do Prisma (tests/cheque-title-link-migration-drill-db.test.ts, T-D(d′)/K12): as 7 FKs da M5 estavam só no SQL,
   e `prisma migrate diff` (banco → schema) as listava como drift novo. Correção: modelar as FKs como RELAÇÕES no
   schema.prisma (BillingOutbox, BillingStatementRef, SubscriptionStatementCharge, SubscriptionStatementInvoice → Tenant
   e, as compostas, → SubscriptionStatement), com as relações reversas em Tenant e SubscriptionStatement (campos virtuais,
   sem coluna — o mesmo padrão do B-ASS-03/04). Nomes das FKs = os do SQL; nenhuma migração muda. Drift 6/6 verde.
6. DRILLS das migrações anteriores (ass-02 M1, ass-04 M3): a M5 é a PRIMEIRA migração com FK para uma tabela da M3
   (subscription_statements), e o down dos drills M1/M3 derrubava essa tabela → 2BP01 ("other objects depend on it").
   Correção pelo MECANISMO JÁ EXISTENTE (`M1_DEPENDENTS`, precedente do B-ASS-04: "o rollback real é em ordem inversa"):
   no drill M1, M5 entra ANTES da M3 (M5 → M3 → M1); no drill M3, o mesmo laço `M3_DEPENDENTS = [M5]`. Nenhuma migração
   aplicada foi editada (checksum intacto).

Classificação dos vermelhos que NÃO são deste bloco (reprodução local da CI no Windows):
- san3-05-leituras-de-plataforma-db (T10–T12): passa ISOLADO → poluição de paralelismo da suíte (classe conhecida).
- san3-05-runtime-role-guard-db (T14a–d): `setsid: ausente` — util-linux não existe no Git Bash do Windows; o
  db-runtime-role.sh usa setsid para isolar o `psql \password`. Na CI (Linux) existe.
- san3-09-bootstrap-platform-admin-db (T2.1): o teste roda `node node_modules/.bin/prisma`; no Windows esse arquivo é um
  shim de shell e o Node falha com SyntaxError antes de tocar o banco. Na CI é link para o JS.
- traccar-event-migration-drill-db: EBUSY no rmdir do Temp do Windows (trava de arquivo). Na CI não ocorre.
Nenhum desses depende do código do bloco: as causas são de ferramenta do SO e acontecem antes do código de negócio.

### Bateria da parte 1 (rodada autoritativa, tudo commitado, HEAD 751ff2db)

Reprodução do job `backend` da CI: Postgres 16 + Redis 7 descartáveis (127.0.0.1, portas altas, nomes ass08pg/ass08redis —
nunca erp-*), `migrate deploy` na base, `npm test` com DATABASE_URL + REDIS_URL + CORE_SAAS_PERSISTENCE=memory:
- espelho de agentes (`sync-agent-agents --check`) = OK; `migrate deploy` = OK (129 migrações).
- `npm test`: 454 arquivos · 4795 testes · pass 4783 · fail 10 · skipped 2.
- `npm run check` / `lint` = OK; `npm run build` = OK (dist/ removido depois, §C5).
- `node scripts/migration-transaction-guard.mjs` = 0 violações; `git diff --check` = limpo.
- Escopo: `git diff --name-only origin/main...HEAD` só com arquivos do bloco + os guards desta parte (ver acima).

Os 10 vermelhos estão em 4 arquivos, NENHUM do bloco e nenhum causado pelo código do bloco:
- san3-05-leituras-de-plataforma-db (T10–T12): a diferença é em lançamentos de custo de nuvem (serviceCode AmazonS3) — a
  superfície do rateio, poluída por outras suítes em paralelo; passa ISOLADO.
- san3-05-runtime-role-guard-db (T14a–d): `setsid: ausente` (util-linux não existe no Git Bash do Windows).
- san3-09-bootstrap-platform-admin-db (T2.1): `node node_modules/.bin/prisma` — no Windows o arquivo é shim de shell.
- traccar-event-migration-drill-db: EBUSY no rmdir do Temp do Windows (o denominador cai em 1 arquivo).
Todos os vermelhos que a M5 CAUSAVA na 1ª rodada (drills M1/M3, censo do medidor, drift do Prisma) estão VERDES.

N → M: suíte do head com banco = 4795 testes; o bloco acrescenta 59 (47 sem banco + 7 -db do canal + 4 do drill M5 + 1 do
gate de env) → N (pré-existente nesta configuração) ≈ 4736 → M = 4795.
| P1-fix | CI backend do PR #522 (Linux, run 42716884706) | 4804 testes · pass 4800 · fail 2 (T14a/b + pai) | unica falha real da CI: tabelas_com_dml do db-runtime-role.sh = 139, o teste afirmava 133. +6 = as 6 tabelas da M5 (DEFAULT PRIVILEGES); posse_force e views_sobre_force seguem 0. Literal 133→139 com motivo. Localmente o T14a/b morria antes no setsid (Windows). san3-05-leituras PASSOU no Linux (a falha local era ambiente) |
| P1-fix-2 | node --test ass-08-chargeback-reversal (3 novos) + vermelho-controle no blob do HEAD | novo: pass 3/3; HEAD anterior: fail 3/3 | DEFEITO DE DINHEIRO achado na revisao propria (codigo F6 da parte 1): (a) reconsulta de estorno sem valor somava Number.MAX_SAFE_INTEGER ao reversedCents; (b) 2a reversao no mesmo pagamento (estorno do credito -> chargeback) calculava fromApplied = applied - reversed, contando como aplicado o que saiu do CREDITO -> paid_amount errado (20 em vez de 0; ou inflado). Correcao: estorno limitado ao que falta (idempotente: already_reversed), e o ja-revertido do aplicado desconta o que os creditos do pagamento absorveram (lidos sob lock). Pendencia (fora do bloco): absorcao PARCIAL de credito (reversao menor que o credito) da baixa no credito inteiro; nao alcancavel pelos fluxos deste bloco (reconsulta = reversao total); dono: rota /refund parcial (B-ASS-04) |
| J522-conserto | ver docs/revisoes/ASSINATURA/B-ASS-08-conserto-c1-dev.md | 8 suítes do bloco: 84 + channel-db 8 = 92 (pass 92 fail 0); check/lint 0; build OK; guard migração 0 violações | CONSERTO ÚNICO da junta J-522 (ciclo 1), dev Claude Fable 5 declarado: C2-01/R-OBX-5 (claim relê o demonstrativo na transação; T-OBX-13..16 + T-OBX-db-3), C1-01/R-WH-6 (janela deslizante; T-WH-26b/26c), C3-01/R-CHG-2 (requestChargeCreate + chargeCreateEligibility; T-CHG-5/6), C3-02/R-PRF-1 (resolveCustomer obrigatório, payload.customerId morto; T-PRF-2/3). 11 testes novos; 8 mutações + 3 vermelhos-controle medidos e revertidos. N (objeto, suítes do bloco) 81 → M 92 |
