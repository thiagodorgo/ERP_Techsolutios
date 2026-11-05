# B-ASS-02 — Relatório do dev (dev-ass02)

> Braço: dev-ass02 (nível menor declarado, identidade de dev). Plano: B-ASSINATURA-plano.md §4.2.
> Worktree: C:/Users/thiag/w-ass02 · ramo feat/b-ass-02-catalogo-planos · base origin/main = 0f2bfb73 (B-ASS-01 #498).

## F0 — medição (ref: worktree HEAD = origin/main 0f2bfb73)

- 0.4: PlatformPlan = starter | professional | enterprise (3, sem business) em src/modules/platform/platform.types.ts:3 — CONFIRMADO.
- 0.5: moduleCatalog com 19 chaves e modulesByPlan starter/professional/enterprise em src/modules/platform/platform-modules.service.ts — CONFIRMADO.
- E7: PLATFORM_PERMISSIONS = 18 entradas (platform-permissions.ts); PERMISSION_CATALOG com 12 chaves platform:* (catalog.ts); requirePlatformPermission exige papel de plataforma (PLATFORM_ROLES <- ROLE_AUTHORITY) — CONFIRMADO.
- PREMISSA FALSA: TenantRepository não tem método update; só create escreve modules (tenant.repository.ts:65). A escrita de tenants.modules do sync usará prisma.tenant.update (ou método novo no TenantRepository, que está no PERMITIDO). Marca para emenda.
- npm ci NÃO roda prisma generate (sem postinstall). Rodei DATABASE_URL=... npx prisma generate antes de medir.
- Baseline N (suítes de memória, individuais, node --test --import tsx, CORE_SAAS_PERSISTENCE=memory + DATABASE_URL dummy para core-saas-role-authority importar prisma.ts):
  - platform-tenant-detail: 7 pass
  - platform-routes: 4 pass
  - core-saas: 26 pass
  - core-saas-role-authority: 12 pass (precisa DATABASE_URL setado; sem ele o módulo prisma.ts lança)
  - san3-04a-matriz-x-catalogo-guard: 14 pass
  - permission-catalog-migration-parity: 3 pass (fonte tem 4 test( mas executa 3)
  - total memória: 66 · san3-05-leituras-de-plataforma-db: não rodado ainda (precisa Docker, F3; plano diz 2, fonte tem 14 test())
- N medido = 66 (sem a -db san3-05); plano dizia >= 52. M alvo = 26 + 7 db + drill (>=4) = 37 novos.


## F1 — domínio + motor de vigência (commit ea1179f7)

- Arquivos novos: src/modules/subscription-billing/{index.ts, plans/plan-types.ts, plans/plan-money.ts, plans/plan-versioning.ts, plans/plan-catalog.ts, plans/plans.repository.ts, plans/plans.service.ts}.
- Testes: tests/ass-02-plan-vigencia.test.ts — 10 testes (T-PL-1..7, T-PL-17..19), 10 pass.
- Vermelho-controle: mv src/modules/subscription-billing → .hold ⇒ ERR_MODULE_NOT_FOUND (1 fail). Restaurado.
- Mutações (aplicadas → vermelha → restaurada → verde):
  - R-PLAN-2: < → <= na borda ⇒ T-PL-17 vermelho (2 fails).
  - R-PLAN-2: comparar só com a vigente (resolveVersionAt) ⇒ T-PL-18 vermelho (2 fails).
  - R-PLAN-2: remover recusa de inaugural em plano com versão ⇒ T-PL-19 vermelho (1 fail).
  - R-PLAN-1: remover unknown_field do patchPlan ⇒ T-PL-1 vermelho (1 fail).
- npm run check verde. git status limpo (só arquivos novos).



## F2 — rotas + permissões + validadores (commit f9717259)

- Arquivos novos: src/modules/subscription-billing/plans/route-validators.ts (zod), src/modules/subscription-billing/subscription-billing.platform.routes.ts (todas as rotas do §3.5 do bloco: plans, plans/summary, plans/:id, plans/:id/versions, POST/PATCH plans, POST versions, tenants/:id/subscription GET/PUT/DELETE + history).
- Montagem: src/modules/platform/platform.routes.ts ganhou router.use("/billing", createSubscriptionBillingPlatformRouter()).
- Serviço de assinatura: getSubscription/getHistory passaram a validar tenant (404 tenant_not_found, nunca 403 — §3.5); getPlansSummary adicionado (orgs + contractedMonthlyAmount + versões); SubscriptionsRepository.listActiveSubscriptions adicionado.
- BUG de migração de add-ons CORRIGIDO: previousAddons era lido DEPOIS de fechá-los, então addons omitido não migrava; T-PL-21 pegou (vermelho) e a ordem foi corrigida.
- plan-versioning: resolveVersionAt/latestVersion genéricos (<T extends VersionDateRange>) para o serviço tipar SubscriptionPlanVersion (commitado aqui; era a mudança pendente pós-F1).
- Permissões (R-PLAN-9): platform:billing:read/manage em PERMISSION_CATALOG (catalog.ts) e PLATFORM_PERMISSIONS (platform-permissions.ts).
- Reconciliação (R-PLAN-3, código): PlatformPlan ganhou business; modulesByPlan.business = {inventory, integrations}. A tabela de reconciliação em docs/subscription-billing.md fica na F7.
- Testes: tests/ass-02-plans-subscription.test.ts — T-PL-8..12, T-PL-15, T-PL-16, T-PL-20..26 = 14 testes, 14 pass (node --test --import tsx, CORE_SAAS_PERSISTENCE=memory, DATABASE_URL dummy).
- Smoke HTTP descartável (não commitado): POST /plans 201 → POST /plans/:id/versions 201 → PUT /tenants/:id/subscription 200 → GET /plans 200 com currentVersion — rotas fio-a-fio OK.
- Vermelho-controle (origin/main simulado): mv src/modules/subscription-billing → .hold ⇒ ERR_MODULE_NOT_FOUND (1 fail); restaurado e git status limpo.
- Mutações (aplicadas → vermelha → restauradas via git checkout → git status limpo):
  - R-PLAN-3: remover assertKnownModules em addVersion ⇒ T-PL-8 vermelho (1 fail).
  - R-PLAN-4: remover closeSubscription (UPDATE … SET valid_to) ⇒ T-PL-11 vermelho (1 fail).
  - R-PLAN-5: pular checagem plan_without_price ⇒ T-PL-12 vermelho (1 fail).
  - R-PLAN-10: tirar checagem addon_duplicate_tracking ⇒ T-PL-22 vermelho (1 fail).
- npm run check verde. permission-catalog-migration-parity segue VERMELHO até a M1b da F3 (esperado: as 2 chaves novas ainda não têm migração).
- Pendências do bloco: M1-d aguarda autorização do dono (registrada na F7; seed dev cobre os 6 planos).

## F3 — esquema M1, permissões M1b e catálogo inicial M1-d

- M1 e M1b: commit `8b510e49`; `prisma/schema.prisma` e migrações `20260893000000_ass02_subscription_plans` / `20260894000000_ass02_platform_billing_permissions`.
- Autorização M1/M1b: fala do dono de 31/10 ~22:15, *"siga na recomendação de tudo, exceto p14"*, em resposta à P1 (§3.10 e §12.1 do plano).
- ERRATA da pendência registrada na F2: M1-d está AUTORIZADA desde 05/11 ~02:00 SP pela fala literal *"manda o deepsek fazer"* (Emenda 1 ao §4.2).
- M1-d: `20260895000000_ass02_seed_subscription_plans`; `BEGIN`/`COMMIT`; seis códigos com `ON CONFLICT (code) DO NOTHING`, sem versão, sem preço e `created_by = NULL`. Nenhum `UPDATE`, `DROP`, `RENAME` ou `ALTER TYPE`.
- Retomada medida: `npm run check` verde. As 24 provas de memória da F1/F2 deram 22 pass / 2 fail porque o parcial F4 já havia mudado a assinatura interna do repositório e os helpers T-PL-21/T-PL-23 ainda chamavam a forma antiga; o reparo fica dentro da F4 e será reexecutado antes do commit.
- `node scripts/migration-transaction-guard.mjs`: G0–G5 verdes; G6 acusa apenas a ausência esperada dos drills M1/M1b, que pertencem à F5. O drill M1-d e suas duas mutações também pertencem à F5. Veredito da fatia: esquema e migrações gravados; validação de aplicação/drills pendente de F5, conforme o plano.

## F4 — repositórios Prisma, caminho de runtime e provas de concorrência/RLS

- Retomada medida antes de editar: `npm ci` próprio; `npx prisma generate`; `npm run check` verde; F1+F2 = 22/24, com os mesmos T-PL-21/T-PL-23 vermelhos registrados no fim da F3. Causa confirmada: os helpers ainda chamavam a assinatura pré-F4 sem `tenantId`; arquivo não estava truncado.
- Compatibilidade reparada: helpers de teste passam `tenantId`; F1+F2 reexecutadas = **24/24**, fail 0.
- Runtime Prisma: `createDefaultPlansService` e `createDefaultSubscriptionsService` agora escolhem Prisma quando `CORE_SAAS_PERSISTENCE=prisma`; memória continua em dev/teste quando configurada. Repositórios novos: planos/versões globais, assinaturas/add-ons sempre sob `withTenantRls`, tenant lookup global e escrita de `tenants.modules`.
- Cluster descartável: `devass02-pg`, PostgreSQL 16, `127.0.0.1:55502`; `DATABASE_URL` apontou somente para ele. `prisma migrate deploy`/`status`: **123 migrations, schema up to date**. A porta 55502 já estava ocupada pelo próprio container autorizado; nenhuma porta/container da demo foi tocada.
- `tests/ass-02-plans-rls-db.test.ts`: **5/5**, fail 0:
  - T-PL-db-1: 2 PUTs concorrentes → exatamente 1 assinatura vigente;
  - T-PL-db-2: ENABLE + FORCE + política em ambas as tabelas tenant-scoped;
  - T-PL-db-3: papel `NOSUPERUSER NOBYPASSRLS` sem GUC → 0 linhas;
  - T-PL-db-4: GUC A não lê assinatura/add-on de B;
  - T-PL-db-7: corrida de add-ons → exatamente 1 vigente.
- Mutação literal R-PLAN-7: removida a linha `ALTER TABLE "tenant_subscriptions" FORCE ROW LEVEL SECURITY` da M1; M1 aplicada numa base separada `ass02_mut_force`; T-PL-db-2 ficou vermelho (`relforcerowsecurity: false`, 1 fail/4 skips). Linha restaurada e base temporária removida.
- `npm run check` verde; `git diff --check` verde. Próximo: commit explícito da F4; depois F5 (drills M1/M1b/M1-d + T-PL-db-5/6).

## F5 — drills de migração e sincronização de módulos

- Retomada: os três arquivos não commitados da F5 estavam truncados/derivados de outro domínio. Foram descartados e reconstruídos; os geradores temporários em `_gentests/` também foram removidos.
- `tests/ass-02-plans-migration-drill-db.test.ts`: base própria criada e derrubada pelo teste; `prisma migrate deploy`; M1 com 4 tabelas, 2 índices parciais, ENABLE+FORCE e 2 políticas; down com 4 `DROP` + 1 `DELETE` numa transação; tabela `tenants` preservada; re-up convergente; todos os prefixos `k=1..n` com sentença final quebrada deixam zero resíduo. M1b: 2 permissões e concessão idempotente a `super_admin`.
- `tests/ass-02-plans-seed-migration-drill-db.test.ts`: M1-d cria exatamente os 6 códigos sem versão/preço e com `created_by = NULL`; reaplicação dupla converge; rollback preserva plano que já ganhou versão e remove apenas os demais.
- `tests/ass-02-plans-modules-db.test.ts`: T-PL-db-5 prova a união persistida base + add-on após PUT; T-PL-db-6 prova a ressincronização quando uma versão entra hoje.
- Autorizações: M1/M1b pela fala de 31/10 ~22:15, *"siga na recomendação de tudo, exceto p14"*; M1-d pela fala de 05/11 ~02:00 SP, *"manda o deepsek fazer"*.
- Mutações literais, todas aplicadas, vermelhas e restauradas:
  - R-PLAN-3: omitir `modulesWriter.writeModules` → T-PL-db-5 vermelho (1 fail/2);
  - R-PLAN-8: remover `BEGIN;` da M1 → `migration-transaction-guard` G2 vermelho (1 violação);
  - M1-d idempotência: remover `ON CONFLICT (code) DO NOTHING` → drill vermelho por `23505`;
  - M1-d rollback: remover `NOT EXISTS` → drill vermelho por FK `23503`;
  - R-PLAN-9/M1b: trocar a chave `manage` pela `read` no INSERT → drill vermelho, catálogo com só 1 chave.
- Verde final no cluster descartável `devass02-pg`/porta 55502: `npm run check`; `migration-transaction-guard` (**123 migrações, 0 violações**); 3 arquivos, **9/9**, fail 0, skip 0; `git diff --check` verde.
- Veredito: **F5 APROVADA**. Próxima fatia sem veredito: F6.

## F6 — detalhe da organização e etiquetas da superfície de plataforma

- R-PLAN-6: `GET /platform/tenants/:tenantId/detail` agora sempre expõe `subscription`, com assinatura vigente real (`planCode`, `planName`, `validFrom`, `overrides`, `addons[]`, `modules[]`) ou `null`. Os módulos vêm da coluna efetiva `tenants.modules`; organização inexistente continua 404 e o resolver de assinatura nem é chamado.
- T-PL-13/14 adicionados a `platform-tenant-detail.test.ts`. Verde final do arquivo: **9/9** (os 7 de regressão + 2 novos), fail 0.
- Vermelho-controle na ref `origin/main`: `git show origin/main:src/modules/platform/platform-tenant-detail.dto.ts | grep subscription` não encontra o campo (`RED_CONTROL_origin_main_subscription_absent`). Mutação literal: retirar `subscription` do DTO → 7/9, com T-PL-13 e a allowlist vermelhos; linha restaurada.
- `san3-05-leituras-de-plataforma-db.test.ts`: as 11 rotas novas foram enumeradas; `plans*` está `SEM-FORCE` para as tabelas globais e `tenants/:id/subscription*` está `FORCE-POR-TENANT`. Foram adicionados cenários superusuário × papel `NOSUPERUSER NOBYPASSRLS` para GET, history, PUT e DELETE; suíte **12/12**, fail 0.
- PREMISSA FALSA: a frase resumida “`SEM-FORCE` para `plans*` — tabelas globais” não descreve todo o caminho de `/plans/summary` nem o sync condicional de `POST /plans/:id/versions`: ambos também podem ler tabelas FORCE. Comando: inspeção de `subscriptions.service.ts:getPlansSummary` e `plans.service.ts:addVersion`; saída: chamadas a `listActiveSubscriptions`/`syncVersionEnteringToday`. A lista fechada mantém a etiqueta pedida para as tabelas globais e declara na nota que a parte tenant-scoped é provada pelas suítes próprias de B-ASS-02; marcar para emenda da taxonomia, que hoje aceita uma única etiqueta por rota.
- `npm run check` verde; `git diff --check` verde. Veredito: **F6 APROVADA**. Próxima fatia sem veredito: F7.

## F7 — seed, reconciliação documental e registro

- Corrigida a divergência medida: `prisma/seed.ts` agora importa e percorre `SUBSCRIPTION_PLAN_SEEDS`; faz upsert somente do catálogo, sem criar versão ou preço. Produção continua usando M1-d via `prisma migrate deploy`.
- `tests/ass-02-plan-catalog.test.ts`: 2/2, prova quatro planos-base + dois add-ons, ausência de campo de preço, paridade dos seis códigos da M1-d e consumo da fonte única pelo seed.
- `docs/subscription-billing.md`: contrato, autoridade, RLS, vigência, módulos e tabela completa de reconciliação do mapa; lacunas permanecem explicitamente “sem chave — gate pendente (`B-SAN3-18`)”. Nenhum valor comercial foi versionado.
- `docs/platform-console.md`: catálogo/versões/assinatura marcados como backend entregue por B-ASS-02; interface administrativa permanece em bloco próprio.
- Registro criado em `agent-orchestration/codex/comandos/B-ASS-02-catalogo-planos.md`, com identidade de dev, modelo de verificação independente, autorizações das migrações e proibição de merge.
- Verde: `npm run check`; catálogo + F1/F2 = **26/26**, fail 0; `git diff --check`. Veredito: **F7 APROVADA**. Próxima fatia sem veredito: F8.

## F8 — guards de catálogo, autoridade e snapshot

- Vermelho inicial controlado: quatro arquivos somaram 55 casos, **54/55**; falhou somente o snapshot de autoridade, ainda sem as duas chaves novas.
- Snapshot regenerado de forma cirúrgica: exatamente `platform:billing:read` e `platform:billing:manage` foram inseridas, na ordem do catálogo, em `super_admin` e `platform_admin` (diff de 4 linhas; nenhum papel tenant recebeu as chaves).
- Verde final: `core-saas`, `core-saas-role-authority`, `san3-04a-matriz-x-catalogo-guard` e `permission-catalog-migration-parity` = **55/55**, fail 0.
- Mutação literal R-PLAN-9: retirar `platform:billing:manage` do snapshot de `super_admin` → `core-saas-role-authority` vermelho (11/12); linha restaurada.
- Veredito: **F8 APROVADA**. Próxima fatia sem veredito: F9.


## F9 — bateria + PR (PAUSA por guard fora do PERMITIDO)

- Retomada medida antes de confiar no parcial: `npm run check` verde; F8 reexecutada (core-saas + core-saas-role-authority + san3-04a + permission-catalog-migration-parity) = 55/55, fail 0. Nada truncado.
- Bateria (cluster descartável `devass02-pg` 127.0.0.1:55502 + `devass02-redis` 127.0.0.1:56502, já migrado 123 migrations):
  - `npm run check`: verde.
  - `npm run lint` (= check): verde.
  - `npm run build`: verde.
  - `node scripts/migration-transaction-guard.mjs`: 123 migrações, 11 novas, 0 violações.
  - `git diff --check`: verde.
  - `git diff --name-only origin/main...HEAD`: 44 arquivos, todos contidos no PERMITIDO.
- Suítes do bloco + N (memória; `node --test --import tsx`, CORE_SAAS_PERSISTENCE=memory + DATABASE_URL dummy):
  - ass-02-plan-vigencia 10 + ass-02-plans-subscription 14 + ass-02-plan-catalog 2 + platform-tenant-detail 9 + platform-routes 4 + core-saas 26 + core-saas-role-authority 12 + san3-04a 14 + permission-catalog-migration-parity 3 = **94/94, fail 0**.
- Suítes -db do bloco + N (cluster descartável): ass-02-plans-rls-db 5/5, ass-02-plans-modules-db 2/2, ass-02-plans-seed-migration-drill-db 3/3, ass-02-plans-migration-drill-db 4/4, san3-05-leituras-de-plataforma-db 12/12 = **26/26, fail 0**.
- `npm test` na forma canônica do CI `backend` (DATABASE_URL + REDIS_URL do cluster, CORE_SAAS_PERSISTENCE=memory): **4487 testes, pass 4473, fail 12, skipped 2**. Os 12 vermelhos se dividem em dois grupos:

PREMISSA FALSA: o §4.2 não listou no PERMITIDO dois guards de plataforma que a adição de 11 rotas + 1 roteador + 2 tabelas FORCE RLS torna vermelhos — inclusive no Linux da CI (não é ambiente Windows):
- `tests/o6r07c-census-guard.test.ts` (T1/T14): as 12 chaves novas (11 rotas + `ROTEADOR /api/v1/platform/billing`) saem `NAO-CLASSIFICADA` porque o instantâneo `tests/fixtures/o6r07c-classificacao-vias.json` não foi regenerado. Comando: `npm test` / `node --test --import tsx tests/o6r07c-census-guard.test.ts`; saída: "NAO-CLASSIFICADA: ROTA .../billing/plans ... ROTEADOR /api/v1/platform/billing". Arquivo fora do PERMITIDO (o §4.2 só autoriza `tests/fixtures/role-catalog-contract.snapshot.json`). O plano do B-ASS-01 incluía explicitamente censo+fixture no PERMITIDO dele — aqui ficou de fora.
- `tests/san3-05-acessos-de-plataforma-guard.test.ts` (T13): o ratchet congelado não inclui `tenant_subscriptions`/`tenant_subscription_addons` nas chaves L0 FORCE nem os acessos L1/L2 dos novos repositórios Prisma. Comando: `node --test --import tsx tests/san3-05-acessos-de-plataforma-guard.test.ts`; saída: "INVENTÁRIO SUSPEITO (ratchet: chave nova OU sumida = vermelho)". Arquivo (e o gerador `scripts/san3-05-acessos-de-plataforma.mjs`) fora do PERMITIDO.

Ambientais Windows, NÃO do bloco (pré-existentes; verdes no CI Linux — Emenda 3 C3-01 do §4.1 registra o mesmo fenômeno na origin/main):
- `tests/san3-05-runtime-role-guard-db.test.ts` (T14a/b/c/d): exige `psql (PostgreSQL) 16.` + `bash` + `setsid`; no Windows "expected 0, actual 3".
- `tests/san3-09-bootstrap-platform-admin-db.test.ts` (T2.1): executa `node_modules/.bin/prisma` (script bash) pelo Node → SyntaxError.
- `tests/traccar-event-migration-drill-db.test.ts`: hook `after` com `EBUSY: rmdir` de diretório temporário.
- `tests/db-catalog-write-guard.test.ts`: passa sozinho 5/5 (no `npm test` falha por contenção paralela no cluster único).

## PAUSA 2026-11-05 11:09 UTC

- head: `f736e5be` (F8 aprovada e commitada; F0–F8 concluídas).
- feito: F9 bateria quase completa — check/lint/build verdes, guard 0 violações, diff --check verde, suítes do bloco memória 94/94 e -db 26/26 verdes; diagnóstico completo dos 12 vermelhos do `npm test`.
- falta: regenerar `tests/fixtures/o6r07c-classificacao-vias.json` e atualizar `tests/san3-05-acessos-de-plataforma-guard.test.ts` — ambos FORA do PERMITIDO §4.2; só depois `git push` + `gh pr create`.
- próximo comando: aguardar decisão do orquestrador (emenda do PERMITIDO para incluir censo + ratchet, ou ordem de parar).

## RETOMADA 2026-11-05 ~08:20 SP — Emenda 2 ao §4.2 (guards de superfície)

- Retomada confirmada: worktree existente, ramo `feat/b-ass-02-catalogo-planos`, relatório com PAUSA na F9.
- Medido o parcial antes de confiar (o arquivo meio escrito podia estar truncado):
  - `npm run check` verde;
  - `node --test --import tsx tests/san3-05-acessos-de-plataforma-guard.test.ts` = 35/35 verde (com a contagem L0 113→115 já aplicada);
  - F8 reexecutada no início: core-saas + core-saas-role-authority + san3-04a + permission-catalog-migration-parity = 55/55.
- Emenda 2 aplicada conforme o texto do fim do plano.

### 1. Censo (`tests/fixtures/o6r07c-classificacao-vias.json`) — regenerado pelo gerador do guard

- Comando (gerador do próprio guard, nunca editado à mão):
  `node --import tsx tests/helpers/o6r07c-census.ts gravar tests/fixtures/o6r07c-classificacao-vias.json`
- Saída resumida: `camadas: ROTA 417 · ROTEADOR 76 · SUBAPP 0 · MIDDLEWARE 186 · SEM-CAMINHO 0`; `chaves vivas: 477`; `VIOLAÇÕES: 0`; `instantâneo gravado: 477 chaves`. Exit 0.
- Diff chave a chave: **12 chaves novas** (11 rotas + 1 roteador), **nenhuma chave existente mudou ou sumiu**:
  - `ROTA DELETE /api/v1/platform/billing/tenants/:tenantId/subscription` — SEM-ALCANCE-CAMPO
  - `ROTA GET /api/v1/platform/billing/plans` — LEITURA
  - `ROTA GET /api/v1/platform/billing/plans/:planId` — LEITURA
  - `ROTA GET /api/v1/platform/billing/plans/:planId/versions` — LEITURA
  - `ROTA GET /api/v1/platform/billing/plans/summary` — LEITURA
  - `ROTA GET /api/v1/platform/billing/tenants/:tenantId/subscription` — LEITURA
  - `ROTA GET /api/v1/platform/billing/tenants/:tenantId/subscription/history` — LEITURA
  - `ROTA PATCH /api/v1/platform/billing/plans/:planId` — SEM-ALCANCE-CAMPO
  - `ROTA POST /api/v1/platform/billing/plans` — SEM-ALCANCE-CAMPO
  - `ROTA POST /api/v1/platform/billing/plans/:planId/versions` — SEM-ALCANCE-CAMPO
  - `ROTA PUT /api/v1/platform/billing/tenants/:tenantId/subscription` — SEM-ALCANCE-CAMPO
  - `ROTEADOR /api/v1/platform/billing` — ROTEADOR
- Classe = a que o código tem de fato (gerada por comportamento, não escolhida): GETs são LEITURA; escritas são SEM-ALCANCE-CAMPO porque o papel de campo não alcança rota de plataforma. `arquivo:linha` do `requirePermission` e do acesso ao repositório por rota:
  - `/plans` → permissão `subscription-billing.platform.routes.ts:31`; repo `plans-prisma.repository.ts:28` (`subscriptionPlan.findMany`)
  - `/plans/summary` → `routes.ts:47`; repo `subscriptions-prisma.repository.ts:48` (`forEachTenantRls` → `tx.tenantSubscription.findMany`)
  - `/plans/:planId` → `routes.ts:57`; repo `plans-prisma.repository.ts:33` (`findUnique`) / `:38` (`findFirst`)
  - `/plans/:planId/versions` → `routes.ts:68`; repo `plans-prisma.repository.ts:71` (`subscriptionPlanVersion.findMany`)
  - `POST /plans` → `routes.ts:78`; repo `plans-prisma.repository.ts:45` (`create`)
  - `PATCH /plans/:planId` → `routes.ts:88`; repo `plans-prisma.repository.ts:59` (`update`)
  - `POST /plans/:planId/versions` → `routes.ts:102`; repo `plans-prisma.repository.ts:84` (`subscriptionPlanVersion.create`)
  - `GET /tenants/:tenantId/subscription` → `routes.ts:115`; repo `subscriptions-prisma.repository.ts:26-27` (`withTenantRls` → `tx.tenantSubscription.findFirst`)
  - `GET /tenants/:tenantId/subscription/history` → `routes.ts:125`; repo `subscriptions-prisma.repository.ts:36-37` (`withTenantRls` → `tx.tenantSubscription.findMany`)
  - `PUT /tenants/:tenantId/subscription` → `routes.ts:135`; repo `subscriptions-prisma.repository.ts:58-59` (`withTenantRls` → `tx.tenantSubscription.create`)
  - `DELETE /tenants/:tenantId/subscription` → `routes.ts:148`; repo `subscriptions-prisma.repository.ts:98-99` (`withTenantRls` → `tx.tenantSubscription.updateMany`)
  - `ROTEADOR /api/v1/platform/billing` → montagem `platform.routes.ts:45` (`router.use("/billing", createSubscriptionBillingPlatformRouter())`)
- Verde: `node --test --import tsx tests/o6r07c-census-guard.test.ts` = 32/32, fail 0.
- Mutação (Emenda 2 item 4): removida a chave `ROTA GET /api/v1/platform/billing/plans` do instantâneo → T1 vermelho (fail 1; o guard acusa a via NAO-CLASSIFICADA). Chave restaurada; snapshot volta a 477 chaves.

### 2. Ratchet semântico (`tests/san3-05-acessos-de-plataforma-guard.test.ts`)

- PREMISSA FALSA (Emenda 2, item 2, parte do ratchet): o orquestrador esperava no ratchet "as 2 tabelas mais os acessos dos repositórios de `src/modules/subscription-billing/plans/**`". Medido com o gerador do guard no head:
  - comando `node scripts/san3-05-acessos-de-plataforma.mjs`;
  - `# L0: tabelas ENABLE=112 FORCE=112` (as 2 tabelas `tenant_subscriptions`/`tenant_subscription_addons` entram na lista L0 FORCE do gerador, que não é hardcoded no teste);
  - `# INVENTÁRIO SUSPEITO (L1+L2): 73 chaves` — **zero** chave de `subscription-billing`: todo acesso a tabela FORCE dos repositórios novos roda sob `withTenantRls`/`forEachTenantRls` (SOB-CONTEXTO), então não gera chave suspeita. O congelado (ORIGIN_MAIN − SUMIDAS + NOVAS) já tem 73 chaves e bate com o head sem mexer em ORIGIN/SUMIDAS/NOVAS.
  - Consequência: a ÚNICA mudança necessária no arquivo foi a contagem `tabelas ENABLE=113 FORCE=113` → `115` no subteste "L0 exato" (linha 287), que é lógica de teste (não é dado do ratchet), consequência mecânica das 2 tabelas FORCE novas de M1. Fica registrada aqui para a pré-revisão/junta (cadeira C3) confirmarem; fora da literal "só a parte de dados", mas é o que o guard exige para voltar a verde.
- Verde: `node --test --import tsx tests/san3-05-acessos-de-plataforma-guard.test.ts` = 35/35, fail 0.
- Vermelho-controle já medido no head `30c07b5c` (F9): com 113 o subteste "L0 exato" falhava; com 115 passa.

### 3. Bateria F9 reexecutada (cluster descartável `devass02-pg` 127.0.0.1:55502 + `devass02-redis` 127.0.0.1:56502, 123 migrations aplicadas)

- `npm run check`: verde. · `npm run lint` (= check): verde. · `npm run build`: verde.
- `node scripts/migration-transaction-guard.mjs`: 123 migrações · 11 novas · 0 violações.
- `git diff --check` (working tree e `origin/main...HEAD`): verde.
- `git diff --name-only origin/main...HEAD`: 47 arquivos, todos contidos no PERMITIDO §4.2 + Emenda 2.
- Suítes do bloco + N (memória; `node --test --import tsx`, CORE_SAAS_PERSISTENCE=memory + DATABASE_URL dummy):
  ass-02-plan-vigencia 10 + ass-02-plans-subscription 14 + ass-02-plan-catalog 2 + platform-tenant-detail 9 + platform-routes 4 + core-saas 26 + core-saas-role-authority 12 + san3-04a 14 + permission-catalog-migration-parity 3 = **94/94, fail 0**.
- Suítes -db do bloco + N (cluster): ass-02-plans-rls-db 5 + ass-02-plans-modules-db 2 + ass-02-plans-seed-migration-drill-db 3 + ass-02-plans-migration-drill-db 4 + san3-05-leituras-de-plataforma-db 12 = **26/26, fail 0**.
- `npm test` (forma canônica do CI backend: DATABASE_URL + REDIS_URL do cluster, CORE_SAAS_PERSISTENCE=memory): **4487 testes · pass 4478 · fail 7 · skipped 2**. Os 2 guards de superfície do bloco voltaram a verde (antes 12 vermelhos). Os 7 vermelhos restantes são os ambientais Windows pré-existentes (verdes no CI Linux), reexecutados e confirmados um a um:
  - `san3-05-runtime-role-guard-db` (T14a/b/c/d): 4 fail — exige `psql` + `bash` + `setsid`;
  - `san3-09-bootstrap-platform-admin-db` (T2.1 + pai): 2 fail — executa `node_modules/.bin/prisma` (script bash) pelo Node;
  - `traccar-event-migration-drill-db`: 1 fail — hook `after` com `EBUSY: rmdir` (o runner registra "terminou sem registrar um único teste");
  - `db-catalog-write-guard`: passa sozinho 5/5 (no `npm test` paralelo, contenção de cluster).

### 4. CI — leitura dos check-runs (PR #504, head `f3eb1bf6`)

- `backend-postgres`: **pass** (4m47s / 4m37s, nos dois runs) — as suítes -db do bloco verdes no Linux.
- `backend`: **fail** — `# tests 4496 · pass 4492 · fail 2`; os 2 vermelhos são o guard `san3-05-runtime-role-guard-db.test.ts` T14a/b.
- `frontend`: **fail** — `not ok - T40 módulos não vaza código interno e inventário conserva 23 endpoints`.
- Demais jobs verdes: authority-portal, owner-portal, flutter, antivirus.

### 5. PREMISSA FALSA (Emenda 2 incompleta) — mais DOIS guards de superfície que o bloco quebra

A Emenda 2 cobriu o censo e o ratchet semântico, mas o bloco (11 rotas novas + 4 tabelas novas) também muda DUAS contagens duras que ficaram fora do PERMITIDO:

1. **`tests/san3-05-runtime-role-guard-db.test.ts:1016`** — T14a/b assere `121` no campo `dml` (contagem de tabelas públicas com DML do papel de runtime):
   - comando: `docker exec devass02-pg psql -U postgres -d erp_techsolutions -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public'"` → **125**;
   - origem: a M1 adiciona **4** tabelas públicas (`subscription_plans`, `subscription_plan_versions`, `tenant_subscriptions`, `tenant_subscription_addons`) → 121 + 4 = 125;
   - saída CI: `The input did not match the regular expression /^s305_runtime_…\|0\|0\|121$/m. Input: 'DO
s305_runtime_…|f|f|f|f|0|0|125'`;
   - arquivo **fora** do PERMITIDO §4.2 e da Emenda 2. O F9 classificou errado ("ambiental Windows, verde no Linux") — no Linux ele RODA e quebra na contagem.
2. **`frontend/tests/san3-06b-navegacao-plataforma.test.ts:55`** — T40 assere `endpoints sob /api/v1/platform = 23`:
   - comando: `node scripts/san3-06b-endpoints-de-plataforma.mjs .` → **34**;
   - origem: as 11 rotas novas de `/api/v1/platform/billing/*` (23 + 11 = 34);
   - arquivo em `frontend/**` — **PROIBIDO** no §4.2.

Nenhum dos dois tem veredito meu: ambos exigem tocar fora do PERMITIDO (o 2º é PROIBIDO). Sem eles, o CI `backend` e `frontend` ficam vermelhos por causa do bloco.

## PAUSA 2026-11-05 ~13:20 UTC

- head: `d69f5c47` (F0–F8 + F9: snapshots regenerados pela Emenda 2 + bateria reexecutada; PR #504 aberto; CI lido no head de código `f3eb1bf6`, commits seguintes só de relatório).
- feito: Emenda 2 aplicada (censo 12 chaves via `gravar`; ratchet semântico sem chave nova, só contagem L0 113→115); bateria F9 completa local (check/lint/build verdes, guard 0 violações, 94/94 memória, 26/26 -db, `npm test` 4487/4478/7/2 com os 7 ambientais Windows pré-existentes); push + PR #504; CI lido (`backend-postgres` verde).
- falta: autorização para atualizar 2 contagens duras fora do PERMITIDO — `tests/san3-05-runtime-role-guard-db.test.ts:1016` `121`→`125` e `frontend/tests/san3-06b-navegacao-plataforma.test.ts:55` `23`→`34` — para o CI `backend`/`frontend` voltarem verdes.
- próximo comando: aguardar emenda do orquestrador (mesma classe da Emenda 2; incluir esses dois arquivos no PERMITIDO) ou ordem de parar.

## RETOMADA 2026-11-05 ~09:35 SP — Emenda 3 ao §4.2 (duas contagens fixas)

- Retomada medida no head `af003ee3`, árvore limpa: `npm run check` verde; guards da última fatia (`o6r07c-census-guard` + `san3-05-acessos-de-plataforma-guard`) = **67/67**, fail 0.
- Só as duas asserções autorizadas pela Emenda 3 foram alteradas:
  - `tests/san3-05-runtime-role-guard-db.test.ts`: `121` → `125`;
  - `frontend/tests/san3-06b-navegacao-plataforma.test.ts`: `23` → `34`.

### Contagem runtime: 121 → 125

- Memória de commit livre antes do Docker: **15 GB** (mínimo exigido: 4 GB).
- Comando real no cluster descartável, após `npx prisma migrate deploy` das 123 migrações:
  `docker exec devass02-pg psql -U postgres -d erp_techsolutions -tAc "SELECT count(*) FROM pg_tables WHERE schemaname=current_schema();"`
- Saída: **125**.
- Diferença item a item, sem remoção: as quatro tabelas públicas novas da M1 são `subscription_plans`, `subscription_plan_versions`, `tenant_subscriptions` e `tenant_subscription_addons`; as duas últimas mantêm as políticas RLS `ENABLE + FORCE` provadas em R-PLAN-7. Logo **121 + 4 = 125**.
- Vermelho-controle: a comparação literal com `121` retorna não zero (`OLD_121_RED_CONTROL`); `125` fica verde.

### Contagem de rotas: 23 → 34

- Comando do gerador: `node scripts/san3-06b-endpoints-de-plataforma.mjs .`.
- Saída: **`endpoints sob /api/v1/platform = 34`**.
- Diferença item a item, sem rota antiga removida: as 11 entradas novas são `GET /billing/plans`, `GET /billing/plans/summary`, `GET /billing/plans/:planId`, `GET /billing/plans/:planId/versions`, `POST /billing/plans`, `PATCH /billing/plans/:planId`, `POST /billing/plans/:planId/versions`, `GET /billing/tenants/:tenantId/subscription`, `GET /billing/tenants/:tenantId/subscription/history`, `PUT /billing/tenants/:tenantId/subscription` e `DELETE /billing/tenants/:tenantId/subscription`. Logo **23 + 11 = 34**.
- Vermelho-controle literal: com a asserção antiga `23`, `san3-06b-navegacao-plataforma` fica **2/3, fail 1**, apontando a saída real 34; restaurada para 34, fica **3/3, fail 0**.

### Validação antes do commit da Emenda 3

- `npm run check`: verde.
- `npm run lint`: verde.
- `npm run build`: verde.
- `san3-06b-navegacao-plataforma`: **3/3**, fail 0.
- `o6r07c-census-guard` + `san3-05-acessos-de-plataforma-guard`: **67/67**, fail 0.
- `node scripts/migration-transaction-guard.mjs`: **123 migrações · 11 novas · 0 violações**.
- `git diff --check`: verde.
- Escopo da retomada: somente o relatório e as duas asserções nominalmente autorizadas pela Emenda 3.

### Suíte canônica local após a Emenda 3

- Forma: `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55502/erp_techsolutions?schema=public`, `REDIS_URL=redis://127.0.0.1:56502`, `CORE_SAAS_PERSISTENCE=memory`, `npm test`.
- Resumo: **4487 testes · pass 4475 · fail 10 · skipped 2**; exit 1 por ambiente Windows/execução paralela, não por uma das duas contagens alteradas.
- Falhas nomeadas:
  - `san3-05-runtime-role-guard-db`: 4 subtestes Windows (`bash`/`setsid`/processos de boot); a asserção alterada já recebeu a contagem real 125 e o aceite dessa suíte é o CI Linux;
  - `san3-09-bootstrap-platform-admin-db`: o atalho shell `node_modules/.bin/prisma` é interpretado pelo Node no Windows;
  - `traccar-event-migration-drill-db`: o drill executa `k=1..17` verde, mas o hook final falha com `EBUSY` ao remover o temporário e o runner acusa piso de denominador;
  - `o6r07c-census-guard` T6/T14: interferência da rodada paralela de mutações; a mesma suíte completa foi reexecutada isolada no mesmo head e ficou **32/32**, e junto do ratchet ficou **67/67**.
- Comparação com a F9 anterior: são as mesmas classes pré-existentes já registradas no relatório; o aceite final é o CI Linux do head após a Emenda 3, conforme o plano.

## RETOMADA 2026-11-05 ~10:35 SP — CI do head após a Emenda 3 (entrega final)

- Head julgado no CI: `ac4b0ebeb66813c6bd867d182d7900b2505192f2` (PR #504); commit de fechamento do relatório sobre esse head. Árvore limpa, push já feito; `npm run check` verde; `git diff --check` verde.
- CI do head `ac4b0ebe` lido (check-runs concluídos):
  - `backend`: **pass** — `# tests 4496 · pass 4494 · fail 0 · skipped 2`;
  - `backend-postgres`: **pass** — `# tests 503 · pass 503 · fail 0 · skipped 0`;
  - `frontend`: **pass** (a contagem `23→34` da Emenda 3 no head); `authority-portal`, `owner-portal`, `flutter`, `antivirus`: **pass**.
- As duas contagens duras da Emenda 3 voltaram verdes no CI Linux: `san3-05-runtime-role-guard-db` (121→125) e `san3-06b-navegacao-plataforma` (23→34).
- `docker` (job paralelo de espelho) seguia `pending` na leitura; não faz parte dos jobs exigidos pela entrega (`backend` e `backend-postgres`).

PRONTO PARA PRÉ-REVISÃO ac4b0ebeb66813c6bd867d182d7900b2505192f2 PR #504

## FECHAMENTO 2026-11-05 ~10:45 SP — CI do head final do relatório

- Push do commit de fechamento do relatório: head do PR = `fef7d6f1b15c039f18505cd021fb5d14260b2a0e` (fast-forward sobre `ac4b0ebe`).
- Check-runs do head `fef7d6f1` lidos, todos verdes: `backend` 4496 · 4494 pass · 0 fail · 2 skipped; `backend-postgres` 503 · 503 pass · 0 fail · 0 skipped; `frontend`, `authority-portal`, `owner-portal`, `flutter`, `antivirus`, `docker` pass.
- Head de código julgado no CI continua `ac4b0ebeb66813c6bd867d182d7900b2505192f2`; o commit final só acrescenta o relatório.

- Fechamento definitivo: o relatório foi empurrado em commits sequenciais até o head final; check-runs do head final concluídos e TODOS verdes nos dois disparos (`backend` 4496/4494/0/2, `backend-postgres` 503/503/0/0, `frontend`, `authority-portal`, `owner-portal`, `flutter`, `antivirus` e `docker`).
