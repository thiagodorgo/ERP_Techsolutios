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
