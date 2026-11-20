<!-- Cópia versionada do diário do Dev A do B-ASS-08c3, pedida pelo plano do bloco (§8). O original fica fora do
repositório, na pasta do orquestrador (`revisoes/08c3/dev-08c3-a.md`). Caminhos locais trocados por `~/`; os caracteres de
controle que o PowerShell deixou no lugar de crase + letra voltaram à forma escrita (crase + f, 0, a, b, e, n, t).
Nada mais mudou. -->

# Diário — Dev A (`dev-08c3-a-dp`) — B-ASS-08c3 (mão do LIGAR)

- Data (SP): 2026-11-19
- Ramo: `feat/billing-channel-enable-a`
- Worktree: `~/w-08c3a`
- Cluster: `~/pg-08c3a` (porta 56071)
- Modelo declarado: DeepSeek Pro (nível menor, declarado)
- Co-autoria: `Co-Authored-By: DeepSeek <noreply@deepseek.com>`

## F-A0 — setup, base e recontagem de âncoras

### Comandos e saídas
- `node -v` → `v20.19.5`; `npm -v` → `11.7.0`; `git rev-parse --short=12 HEAD` → `ff572fcfae58`.
- `git diff --stat 917bc6cd..origin/main -- src/` → vazia (nenhuma mudança em `src/` desde o plano).
- `git worktree add -b feat/billing-channel-enable-a ~/w-08c3a origin/main` → criado em `ff572fcf` (marco de 19/11, #604).
- `npm ci` → 326 pacotes; aviso EBADENGINE `@prisma/streams-local@0.1.2` (bun/node>=22; CI usa Node 20, inofensivo).
- `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:56071/erp_techsolutions?schema=public npm run db:generate` → Prisma Client v7.8.0.
- Cluster: `initdb -D ~/pg-08c3a -U postgres --auth=trust -E UTF8` → ok; `postgresql.conf` com `listen_addresses=127.0.0.1`, `port=56071`, `timezone='UTC'`; `pg_ctl start` → "sistema de banco de dados está pronto"; `psql -Atc "show timezone; show port;"` → `UTC` / `56071`; base `erp_techsolutions` criada.
- Âncoras novas (todas 0 em `src`+`tests`): ORFA-TRY/ORFA-DEFER/ORFA-CAP/RETARGET-01/TRILHA-01/TRILHA-THROTTLE/CONFIRM-LOCK/CONFIRM-CODES/UNKNOWN-REREAD/CLOSE-RESOLVE-OUT/CLOSE-PIN-CHECK/ENABLE-GATE/ENABLE-TX/TEST-CONN/WH-REG/LOOKUP-ID/CREDIT-RECOMPUTE/EP-PARCIAL = 0.
- Âncoras existentes: INTX-03=4, CANCEL-TX=5, STALE-REENABLE=3, POLL-TABLE=2, SWEEP-FAILCLOSED=2 (bate com o §1.3).
- Falsos hoje: Asaas (cenários `ok/validation_400/rate_limited_429/timeout/customer_duplicate`; `POST /v3/webhooks`→200; `GET /v3/payments`; SEM 401/403/500). Focus (`rate_limited_429/validation_422/rejected/create_then_drop/…`; GET `/v2/nfsen/:ref` desconhecido → 200 `situacao_desconhecida`; SEM 401/403/500/404). → F-A1 acrescenta os cenários 401/403/500 (+404 no Focus).

### Veredito parcial
- **VERDE**: base `ff572fcf`, worktree e cluster prontos, âncoras conferidas. Próximo: F-A1.

## F-A1 — `testConnection()` nas portas/adaptadores

### Código
- Portas: `ConnectionTestResult` + `testConnection()` em `payment-provider.port.ts` e `invoice-provider.port.ts`; `InvoiceLookup.providerInvoiceId?` (para a F-A6).
- Adaptadores: `testConnection()` no Asaas (`GET /v3/payments?externalReference=<uuid>&offset=0&limit=1`) e no Focus (`GET /v2/nfsen/<uuid>`, âncora `[TEST-CONN]`); sem token no cofre → `not_configured`, 0 rede.
- Catálogo: `webhookRegistrationMode` (`manual` só no Mercado Pago). `ASAAS_WEBHOOK_EVENTS` em `providers/payment/asaas/index.ts`.
- Falsos: cenários `credential_rejected_401/403`, `provider_unavailable_500` nos dois; `not_found_404` no Focus.

### Testes e mutação
- `node --test --import tsx tests/ass-08c3-provider-test-connection.test.ts` → TCA1 + TCF1: `# pass 2 # fail 0`.
- M-TC1 (focusnfe.adapter.ts, linha `[TEST-CONN]`): âncora = 1 antes; mutação (404 sai da condição de ok) → TCF1 VERMELHO (`cenário not_found_404`); restaurada → 2/2 verdes.
- Regressão `ass-06-asaas-adapter` + `ass-07-focusnfe-adapter`: `# pass 20 # fail 0`.
- `npm run check` → limpo.

### Veredito parcial
- **VERDE**. Commit `9ca6801b`, push `origin/feat/billing-channel-enable-a`. Próximo: F-A2.

## F-A2 — repositório da configuração

### Código
- `provider-config.repository.ts`: campos novos do `ProviderConfig` (porta e dublê) e os métodos `recordTest`, `recordWebhook`, `setEnabled`, `enableLocked` no dublê. `enableLocked` decide com `(locked, peers)` (o `peers` é o estado lido no mesmo tx, para o `otherProviderEnabledForKind`).
- `vault.prisma-runtime.ts`: `ConfigRecord`/`mapConfig` com as colunas novas (`enabled_at`, `enabled_by`, `last_test_error`, `webhook_registered_*`, `webhook_external_id`, `webhook_public_url`); `recordTest`, `recordWebhook`, `setEnabled` (único escritor de `enabled`) e `enableLocked` com `SELECT … FOR UPDATE` (`[ENABLE-TX]`) no mesmo tx. O `upsert` continua sem `enabled`.
- Novo `tests/ass-08c3-enable-writers.test.ts` (EW2/EW3).

### Testes e mutações
- `node --test --import tsx tests/ass-08c3-enable-writers.test.ts` → `# pass 4 # fail 0` (EW3, EW2 chamadas, EW2 Prisma, EW2 SQL).
- M-A5a (`vault.platform.routes.ts`, rota `PUT /providers/:provider`): linha `await prisma.$executeRawUnsafe("UPDATE billing_provider_configs SET enabled = true WHERE provider = '" + provider + "'")` → EW2 VERMELHO (`vault.platform.routes.ts:72 → …`); restaurada → 4/4 verdes.
- M-A5b (mesma rota): `await runtime.configs.setEnabled(provider, true, { environment: view.environment, actorId: actorId(request), now: new Date() })` → EW2 VERMELHO (caller fora do serviço); restaurada → 4/4 verdes.
- M-EW-RAW (`vault.prisma-runtime.ts`, `upsert.update`): `enabled: true` → EW2 VERMELHO (`PrismaProviderConfigRepository.upsert`); restaurada → 4/4 verdes.
- `npm run check` → limpo (tsc sem erro).
- Regressão pura `ass-05-provider-config` + `ass-08-provider-enable` + `ass-08c-enable` → `# pass 13 # fail 0`.

### Veredito parcial
- **VERDE**. Commit 988a2e40, push origin/feat/billing-channel-enable-a. Próximo: F-A3 (o serviço).

## F-A3 — serviço da configuração

### Código
- `provider-config.service.ts`: campos `nodeEnv`/`webhookTrustedProxyHops` obrigatórios em `EnablePreconditionState` (P-557); `ProviderConfigError.details` e `fail(...details)` para a rota devolver `failed[]`; métodos `testConnection`, `registerWebhook`, `enable` (`[ENABLE-GATE]`, recusa `provider_adapter_unavailable` antes da trava, 23505/P2002 → 409) e `disable`; montador do estado em `enableLocked` (o `decide` recebe `locked`+`peers`).
- `vault.factory.ts`: injeção da `ProviderAdapterFactory` (só Asaas e Focus, via `billingHttpClientFromEnv` + `createAsaasAdapter`/`createFocusNfeAdapter`).
- P-557: forma dos 2 testes antigos (`baseState`/`readyState` ganham `nodeEnv: "test"` e `webhookTrustedProxyHops: 1`); EN6t em `src/.../provider-config.enable-state.typecheck.ts` (tsconfig só inclui `src/**`) + `tests/ass-08c3-enable-state.test.ts`.

### Testes e mutação
- `npm run check` → limpo; `ass-05-provider-config` + `ass-05-vault-service` + `ass-08-provider-enable` + `ass-08c-enable` + `ass-08c3-enable-state` → `# pass 23 # fail 0`.
- M-557 (`readonly nodeEnv: string;` → `readonly nodeEnv?: string;`) → `npm run check` VERMELHO (TS2578 `Unused '@ts-expect-error' directive` em `provider-config.enable-state.typecheck.ts:28`); restaurada → check limpo.
- **M-AD1 fica para a F-A4**: a mutação é do serviço, mas o teste-dono dela (AD1) nasce em `tests/ass-08c3-provider-routes-db.test.ts`, na F-A4. Registrado como leitura declarada (§A6); a mutação será aplicada/restaurada junto do AD1.

### Veredito parcial
- **VERDE** (com M-AD1 adiada para a F-A4). Commit d93811a4, push origin/feat/billing-channel-enable-a. Próximo: F-A4 (as 4 rotas).

## F-A4 — as 4 rotas do cofre (test-connection, register-webhook, enable, disable)

### Código
- `vault.platform.routes.ts`: 4 rotas novas sob `requirePlatformPermission("platform:billing-providers:manage")`; wrapper local `handleProviderRoute` serializa `ProviderConfigError.details` (a recusa de `enable` devolve `failed[]`) sem tocar em `core-saas/routes/http.ts`.
- Trilhas: `connection_tested`, `webhook_registered`, `webhook_register_failed`, `enabled`, `enable_refused` (só recusa de precondição), `disabled` (só quando `changed`).
- Novo `tests/ass-08c3-provider-routes-db.test.ts`: TC1, TC2, TC3, TC-OFF, WH1, WH2, WH3, AD1, PR1 pela ROTA REAL no PostgreSQL, papel efêmero NOSUPERUSER NOBYPASSRLS; provedores falsos locais com o catálogo apontado em runtime.

### Testes e mutações
- `node --test --import tsx tests/ass-08c3-provider-routes-db.test.ts` (DATABASE_URL porta 56071) → `# pass 10 # fail 0`.
- `npm run check` → limpo; `git diff --check` → limpo.
- M-A13 (`billing-http.client.ts:187`, `channelEnabled: env.BILLING_PROVIDERS_ENABLED` → `true`) → VERMELHO no caso `(c) cliente do canal: 0 conexões` de `tests/ass-08c-canal-off.test.ts` (arquivo de ninguém, não editado); restaurada. Leitura honesta: a rota TC-OFF não fica vermelha porque o serviço recusa `channel_disabled` antes do adaptador; a prova válida da mutação foi o cliente direto.
- M-WH1 (resposta de `register-webhook` com `webhookPublicUrl: outcome.provider` a mais) → WH1 VERMELHO (`data` ganhou a chave `webhookPublicUrl`); restaurada.
- M-PR1 (apagar `requirePlatformPermission(...)` da rota `enable`) → PR1 VERMELHO (ator de organização chegou ao handler: `422 !== 403`); restaurada.
- M-AD1 (`provider-config.service.ts`, `enable`: remover `if (!this.#adapter(...)) fail(422, "provider_adapter_unavailable", ...)`) → comando `node --test --import tsx --test-name-pattern "AD1|setup" tests/ass-08c3-provider-routes-db.test.ts` deu `# fail 1` (AD1: `fetch failed` + atividade assíncrona `provider_routes_probe: rede bloqueada` após o teste; duração 304s); restaurada. Conferido `git diff --stat` de volta só com `vault.platform.routes.ts` e o teste novo.

### Veredito parcial
- **VERDE**. Commit `4c08c5c5`, push `origin/feat/billing-channel-enable-a`. Próximo: F-A5.

## F-A5 — enable/disable no banco (EN1–EN8, EW1; M24, M-EN8)

### Código
- Testes do banco no mesmo arquivo `tests/ass-08c3-provider-routes-db.test.ts`: EN1 (precondições ausentes), EN2 (200 e `enabled_by` = ator), EN3 (outro de pagamento ligado → 422), EN3b (corrida G14: dono liga mercadopago sem commitar, enable espera no índice e vira 409, 1 só ligado e 0 trilha nova de `enabled`), EN4 (disable → `provider_disabled`; religar em 3 dias → 1 POST; 8 dias → `NEEDS_REVIEW stale_on_reenable`), EN5 (confirm errado → `confirm_mismatch`), EN6r (produção + saltos 0 → `webhook_proxy_hops_unset`), EN7 (deep scan de segredos/url/id/tenant nas 5 rotas e na trilha), EN8 (TOCTOU de ambiente → `last_test_environment_mismatch`) e EW1 (censo de rotas do cofre: só `enable` muda `enabled`).
- Correção na rota: `actorId(request)` passou de `request.actor?.userId` para `resolveRequestActor(request)?.userId` — o ator de cabeçalho legado (dev/teste) não popula `request.actor`, e o EN2 (`enabled_by = o ator`) ficava nulo.
- `seedStatementForProvider` ganhou o parâmetro `period` (EN4 semeia duas declarações do MESMO tenant, que violariam a única `(tenant_id, period)`).

### Testes e mutações
- `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:56071/erp_techsolutions?schema=public node --test --import tsx tests/ass-08c3-provider-routes-db.test.ts` → `# tests 20 # pass 20 # fail 0`.
- M24 (`provider-config.service.ts`): âncora `[ENABLE-GATE]` = 1 antes; mutação (apagar a linha e `if (!decision.ok)` → `if (false)`) → EN1, EN5 e EN8 VERMELHOS (`# pass 1 # fail 3`); restaurada com `git checkout`, `git diff --stat` sem o arquivo.
- M-EN8 (mesmo arquivo, montador do estado): `lastTestEnvironment: locked?.lastTestEnvironment ?? null,` → `locked?.environment ?? null,` → EN8 VERMELHO (`# fail 1`); restaurada.
- `npm run check` → limpo; `git diff --check` → limpo.

### Veredito parcial
- **VERDE**. Próximo: F-A6 (id da nota + VM1 + GS-ISO).

## F-A6 — id da nota, VM1 e GS-ISO

### Código
- `InvoiceLookup.providerInvoiceId` (porta) e `lookupFromFocus` exportada (`focusnfe.adapter.ts`): preenche `providerInvoiceId` com `body.id` quando é texto não vazio, nos estados `processing`, `authorized`, `rejected`, `cancelled` e `unknown`.
- `#applyLookup` (`invoice.dispatch.ts`): ramo `authorized` grava `markIssued(…, lookup.providerInvoiceId, …)` quando a nota ainda não tem id; ramo `processing` grava `lookup.providerInvoiceId ?? invoice.providerInvoiceId` com a âncora `[LOOKUP-ID]`.
- Falso do Focus ganhou `startFocusNfeFake(defaultScenario, { returnIdInGet })`: com `true`, o GET devolve `id`; sem, o GET continua sem `id` (o NR1 não muda).
- `tests/ass-08c3-varredura-memoria.test.ts` (VM1) e `tests/ass-08c3-gsiso-guard.test.ts` (GS-ISO-T).
- GS-ISO: `{ tenantIds }` inserido nos construtores que faltavam — `ass-08c-outbox-review-db.test.ts` (RS3c, RS7b ×2), `ass-08c-reconsulta-db.test.ts` (dispatch), `ass-08c-register-db.test.ts` (seedProcessing). **Leitura declarada (§A6):** o plano cita `register-db:79,127`; medido no HEAD, o `register-db:127` JÁ tinha `{ tenantIds: [fixture.tenantId] }`, então a inserção foi necessária apenas em 5 construtores. A GS-ISO-T confirma a propriedade (nenhum construtor sem `tenantIds`).

### Testes e mutações
- `node --test --import tsx tests/ass-08c3-provider-test-connection.test.ts` → `# tests 3 # pass 3 # fail 0` (TCA1, TCF1, LK1).
- `DATABASE_URL=…56071… node --test --import tsx tests/ass-08c-nota-retry-db.test.ts` → `# tests 4 # pass 4 # fail 0` (NR1, NR1b, NR2).
- M-LK (`invoice.dispatch.ts`): âncora `[LOOKUP-ID]` = 1 antes; mutação `lookup.providerInvoiceId ?? invoice.providerInvoiceId` → `invoice.providerInvoiceId` → NR1b VERMELHO (`provider_invoice_id` esperado `nfse_1`, obtido `null`); restaurada → NR1b verde (`# pass 4 # fail 0`).
- `node --test --import tsx tests/ass-08c3-varredura-memoria.test.ts` → `# tests 1 # pass 1 # fail 0`.
- ML6-b (`statement.repository.ts:408`): mutação `statement.paidAt.getTime() < cutoff.getTime()` → `<=` → VM1 VERMELHO (o pago 1 ms antes virou candidato); restaurada com `git checkout` → VM1 verde.
- `node --test --import tsx tests/ass-08c3-gsiso-guard.test.ts` → `# tests 1 # pass 1 # fail 0`.
- M-GS (`ass-08c-register-db.test.ts:79`): remover `{ tenantIds: [tenantId] }` → GS-ISO-T VERMELHA (`ass-08c-register-db.test.ts · (role.client)`); restaurada → GS-ISO-T verde.
- Regressão dos três `-db` tocados (`ass-08c-outbox-review-db`, `ass-08c-reconsulta-db`, `ass-08c-register-db`) → `# tests 33 # pass 33 # fail 0`.
- `npm run check` → limpo; `git diff --check` → limpo; `git status --porcelain` só com os arquivos da mão A.

### Veredito parcial
- **VERDE**. Próximo: F-A7 (bateria do sub-ramo A).

## F-A7 — bateria do sub-ramo A

### Baterias
- `npm run lint` → executa `npm run check` (alias) → limpo.
- Bateria pura do sub-ramo A + regressões não-`db` que importam `vault/` ou `providers/` (37 arquivos), com `--test-reporter=dot` → exit 0; TAP capturado: `# tests 267 # pass 267 # fail 0`.
- `-db` do A, cada um 3× contra `DATABASE_URL` da porta 56071: `ass-08c3-provider-routes-db`, `ass-08c-nota-retry-db`, `ass-08c-outbox-review-db`, `ass-08c-reconsulta-db`, `ass-08c-register-db` → 15 execuções, todas ok.
- **Limpeza de ambiente:** entre as baterias o `setup` passou a falhar com `2BP01` por um role efêmero órfão no cluster (`o6r_b01_1795100793294_40757fa3bc00d`). Removi com `DROP OWNED BY` nas bases `erp_techsolutions` / `erp_techsolutions_c3a_prov_4ccc5702` / `postgres` e `DROP ROLE`; o `nota-retry-db` voltou a `# pass 4 # fail 0`.

### Mutações do A reconferidas em bloco (todas vermelhas e restauradas)
- M-TC1 → `ass-08c3-provider-test-connection` `# pass 2 # fail 1`.
- M-A5a → `ass-08c3-enable-writers` `# pass 3 # fail 1`.
- M-A5b → `ass-08c3-enable-writers` `# pass 3 # fail 1`.
- M-EW-RAW → `ass-08c3-enable-writers` `# pass 3 # fail 1`.
- M-557 → `npm run check` rc 2 (`TS2578: Unused '@ts-expect-error' directive`).
- M-A13 → `ass-08c-canal-off` `# pass 10 # fail 1`.
- ML6-b → `ass-08c3-varredura-memoria` `# pass 0 # fail 1`.
- M-GS → `ass-08c3-gsiso-guard` `# pass 0 # fail 1`.
- M24 → `ass-08c3-provider-routes-db` `# pass 0 # fail 4`.
- M-EN8 → `ass-08c3-provider-routes-db` `# pass 0 # fail 2`.
- M-WH1 → `ass-08c3-provider-routes-db` `# pass 0 # fail 2`.
- M-PR1 → `ass-08c3-provider-routes-db` `# pass 0 # fail 2`.
- M-AD1 → `ass-08c3-provider-routes-db` `# pass 0 # fail 2`.
- M-LK → `ass-08c-nota-retry-db` `# pass 3 # fail 1`.
- Após cada uma: `git checkout -- <arquivo>`; no fim `git status --porcelain` vazio.

### Veredito final
- `npm run check` → limpo; `git diff --check` → limpo; `git status --porcelain` → vazio.
- Sub-ramo A pronto para a integração. HEAD `b3fd20ca` em `feat/billing-channel-enable-a`, empurrado. Cluster 56071 segue ligado; worktree `~/w-08c3a` fica. Sem PR (integração é do Dev B).
