# B-SAN3-18 — medição (F0) e registro das mutações

- **Autor:** `dev-18-cl`, Claude Opus 5.5, subagente da sessão (dev declarado; exceção §C7 itens 6 e 11(6)). **Verificador:** a pré-revisão e a conferência, de outro modelo, pela API.
- **Ref medida (§A7):** `origin/main` `da12fec6` (#541), medida às 10:52 SP (`date`). A crítica r2 mediu em `07898adf`; entre as duas refs mudaram só `src/app.ts` (webhook do B-ASS-08b) e `prisma/seed.ts` (nome da organização demo, item 47) dentro do PERMITIDO (`git diff --stat 07898adf da12fec6 -- src/app.ts src/modules/navigation src/modules/platform src/modules/mobile prisma/seed.ts frontend/src/layouts`).
- **Como regenerar:** `node --import tsx scripts/san3-18-censo-modulos.mjs --ref da12fec6` (seções (a) a (d), abaixo, saída literal). O instantâneo rota → classe: `node --import tsx scripts/san3-18-censo-modulos.mjs --gravar tests/fixtures/san3-18-route-modules.json`.
- **Limite do (c):** a matriz página → endpoints é lida por texto das chamadas `apiRequest` dos módulos do front. Caminho montado com variável vira `:id`, e o que não começa com `/` aparece como `/api/v1/:id…` (aproximação declarada). A matriz que o teste usa como guarda é a do registro (`relatedEndpoints`, P5) e a das capacidades (`tests/fixtures/san3-18-formas/capacidades.json`, P7).

## (e) Testes com JWT que o gate deixa vermelhos (R1, R2-10)

- `grep -l createApp tests/*.test.ts | xargs grep -l -i -E "bearer|signAccessToken"` → **32** arquivos (+1 que importa `app` direto, `ass-08b-webhook-app.test.ts`) = 33; destes, **15** são `-db`.
- Sem banco (16 + 1), com o gate: todos verdes, menos `core-saas-role-authority.test.ts`, que cai por `DATABASE_URL is required` com ou sem o gate (ambiente, igual à crítica r2).
- Com Postgres 16 descartável (`dev18-pg`, 127.0.0.1:55523), os 15 `-db` + o do bloco: **4** arquivos vermelhos pelo gate (organização criada sem módulo, depois chamada com JWT) — `checklist-routes-db`, `financial-period-close-write-race-db`, `financial-title-invariants-db`, `san3-08-financeiro-cria-orcamento-db`. A F3 os provisiona (`modules: [...TODOS_OS_MODULOS]`, `tests/helpers/san3-18-modulos.ts`): 31/31. O `san3-09-bootstrap-platform-admin-db` cai no T2.1 por ambiente Windows (`node_modules/.bin/prisma` executado como JS), sem relação com o gate.
- Longe do teto de ~60 arquivos da R1.

## (f) Ator de plataforma em rota de organização (R-A9)

Medido pela crítica r2 em `07898adf` (`probe-platform.mts`, JWT `tenant_id:"platform"`, papel `platform_admin`, só rotas de módulo, sem gate): **57** rotas de módulo davam 2xx. O front de plataforma só chama `/platform/**` e o shell engole o erro de notificações e aprovações. Com o gate, todas levam 403 `platform_actor_on_tenant_route` (`tests/san3-18-module-gate.test.ts`, P1-falha (i)). Nenhum fluxo legítimo medido depende disso.

## (g) Versões de plano e assinaturas (R-A13, R2-09)

- Base descartável re-semeada (`npx prisma migrate deploy` + `npx prisma db seed` no `dev18-pg`): `subscription_plan_versions` = 0, `tenant_subscriptions` = 0 (o seed não cria versões, comentário do B-ASS-02). A organização demo nasce com as **19** chaves de `DEMO_TENANT_MODULES`.
- As bases de dev (`erp-postgres`) e de demonstração **não foram medidas**: o mandato proíbe tocar outros containers. A simulação do script nelas (`assinaturas_com_versao_sem_chaves`) fica como passo do roteiro de operação, antes do deploy.

## (h) HIPÓTESE (#527) — fechada

Medida pela crítica r2 e reconferida aqui: `acceptPasswordChangeSession` só em `src/modules/auth/routes/identity-links.routes.ts`, montado em `/api/v1/auth` ANTES do gate; o `attachAuthenticatedActor()` da montagem do gate é o padrão (recusa o escopo `password_change`), igual a toda montagem posterior. A montagem do gate não muda a troca de senha. `tests/users-acesso-seg-portao-varredura.test.ts` (A2/G1 do #527, varre toda rota com a sessão restrita) verde com o gate.

## Rota nova desde a crítica r2

`POST /api/v1/webhooks/billing/:provider` (B-ASS-08b). Classe: **NÚCLEO** (`NUCLEO_API` inclui `webhooks`), a mesma leitura do censo do 07c (classe N: infra sem módulo, montada antes de qualquer `attachAuthenticatedActor`). Leitura do dev, declarada.

## R2-01(2) — o caminho de dano (e de multa) que lança no extrato

`POST`/`PATCH /damages` e `POST`/`PATCH /fines`, com profissional responsável, lançam débito no extrato do profissional (`createForSource` em `src/modules/damages/damage.service.ts:496-512` e `src/modules/fines/fine.service.ts:450-466`) por efeito de serviço, sem exigir permissão financeira do usuário. O oráculo por permissão não as vê. A classe dessas rotas fica `{vehicles}` (é o cadastro da Frota; `{finance}` trancaria o cadastro de multa e de dano). Não é `{finance}`, logo **pede emenda** (R2-01(2)): `P-SAN3-18-EXTRATO-POR-EFEITO-SEM-FINANCEIRO`.

## Mutações (R2-05): o texto literal, registrado ANTES de aplicar

Âncora conferida no arquivo (1 ocorrência) antes de cada aplicação; o arquivo é restaurado byte a byte (sha256) depois. Roteiro: `.dev18/mutacoes.mjs` do worktree do dev (não versionado).

| # | Prop. | Arquivo | Âncora → troca | Teste-dono |
|---|---|---|---|---|
| M1 | P1 | `src/app.ts` | apagar `  app.use("/api/v1", attachAuthenticatedActor(), createModuleGate(service));` | `san3-18-module-gate` |
| M2 | P1-caixa (A1) | `src/modules/navigation/route-modules.ts` | apagar `.toLowerCase()` | `san3-18-module-gate`, `san3-18-route-module-census` |
| M3 | P1-legado (A3) | `src/modules/core-saas/middleware/tenant-context.middleware.ts` | `if (actor?.authType === "legacy_headers" && !allowsLegacyTenantHeaders()) {` → `if (false) {` | `san3-18-module-gate` |
| M4a | P1-falha (a) | `src/modules/navigation/module-gate.middleware.ts` | `if (actor.tenantId === "platform") {` → `if (false) {` | `san3-18-module-gate` |
| M4b | P1-falha (b) | idem | `error instanceof CoreSaasError && error.statusCode === 404` → `false` | `san3-18-module-gate` |
| M4c | P1-falha (c) | idem | `deny(response, 503, "SERVICE_UNAVAILABLE", "tenant_modules_unavailable", "The modules of the organization could not be read.");` → `next();` | `san3-18-module-gate` |
| M5 | P1-alias | `src/modules/platform/platform-modules.service.ts` | apagar `  "work-orders": "work_orders",` | `san3-18-module-gate` |
| M6 | P1-tenant | `src/modules/navigation/module-gate.middleware.ts` | `service.getTenantForActor(actor.tenantId, actor.tenantId)` → `service.getTenantForActor(String(request.header("x-tenant-id")), String(request.header("x-tenant-id")))` | `san3-18-module-gate` |
| M7 | P2 (i) (A12) | `tests/fixtures/san3-18-route-modules.json` | apagar ` "GET /api/v1/audit-events": "{audit}",` | `san3-18-route-module-census` |
| M8 | P2 (ii)/(iii) | — | injeção no app real por `tests/fixtures/san3-18-formas/inject.mts` (`GET /api/v1/yards/zz-novo`; `GET /api/v1/zz-sem-classe` → 403 `route_module_unclassified`), dentro do próprio teste | `san3-18-route-module-census` |
| M9 | P3-núcleo (a) (A8) | `src/modules/navigation/navigation.registry.ts` | na entrada `id: "tenant.users",`, inserir `    requiredModules: ["users"],` depois de `requiredPermissions` | `san3-18-menu-modules` |
| M10 | P3-núcleo (b) | idem | inserir `{ id:"zz", label:"zz", path:"/zz", icon:"X", group:"tenant", order:999, status:"implemented", requiredPermissions:[], tenantOnly:true }` | `san3-18-menu-modules` |
| M11 | P3-núcleo (c) (A11) | idem | inserir `    requiredModules: ["dashboard"],` na entrada `tenant.dashboard` | `san3-18-menu-modules` |
| M12 | P3-all-of (A4) | `src/modules/navigation/navigation.service.ts` | `item.requiredModules.every(` → `item.requiredModules.some(` | `san3-18-menu-modules` |
| M13 | P3-não resolvida | idem | inserir `  if (!enabledModules) { return items.map(sanitizeNavigationItem); }` no começo de `filterNavigationByTenantModules` | `san3-18-menu-modules` |
| M14 | P3-MVP (A6) | `src/modules/navigation/navigation.registry.ts` | apagar a entrada inteira com `path: "/finance?aba=rec",` | `san3-18-menu-modules` |
| M15 | P4 (a) | `src/modules/platform/platform-modules.service.ts` | apagar a linha `{ key: "work_orders", … }` | `san3-18-module-vocabulary` |
| M16 | P4 (b) (A2) | `prisma/seed.ts` | apagar `    "finance",` | `san3-18-module-vocabulary` |
| M17 | P5 (A4) | `src/modules/navigation/navigation.registry.ts` | `relatedEndpoints: ["GET /api/v1/audit-events"],` → `relatedEndpoints: ["GET /api/v1/yards"],` | `san3-18-route-module-census` |
| M18 | P6 (a) (A2) | `scripts/san3-18-provisionar-modulos.ts` | `const keysToAdd = [...ALL_MODULE_CLASSES];` → `const keysToAdd = ["patios", "telemetry", "vehicles", "master_data", "quotes", "work_orders", "logistics", "expense_management"];` | `san3-18-provision-modules-db` |
| M19 | P6 (b) | idem | `const final = [...new Set([...atual, ...canonicasDosApelidos, ...acrescentar])];` → `const final = [...new Set([...acrescentar])];` | `san3-18-provision-modules-db` |
| M20 | P6 (c) (A13) | idem | apagar a linha que imprime `assinaturas_com_versao_sem_chaves=` | `san3-18-provision-modules-db` |
| M21 | P7 (a) (A5) | `src/modules/navigation/route-modules.ts` | `{ pattern: "/mobile/evidence-uploads", modules: ["work_orders", "field_operations"] },` → `{ pattern: "/mobile/evidence-uploads", modules: ["work_orders"] },` | `san3-18-bootstrap-capabilities` |
| M22 | P7 (b) (P3(a)) | idem | apagar `  "/customers",` de `READ_CORE_PREFIXES` | `san3-18-bootstrap-capabilities` |
| M23 | A7 | `src/modules/platform/platform-tenants.service.ts` | apagar a linha do `throw` com `"module_change_requires_subscription"` | `san3-18-platform-modules-patch` |
| M24 | A10 | `tests/san3-18-superficies.test.ts` | apagar `  "src/portal-app.ts": …,` de `SUPERFICIES_FORA_DO_GATE` | `san3-18-superficies` |
| M25 | R7 (A3, R2-05) | `src/modules/navigation/module-gate.middleware.ts` | `function moduleGate(` → `function (` | `o6r07c-census-guard` |
| M26 | R2-01(4) | `src/modules/navigation/route-modules.ts` | `{ pattern: "/fuel-logs/:id/payable", modules: ["finance"] },` → `{ pattern: "/fuel-logs/:id/payable", modules: ["vehicles"] },` | `san3-18-route-module-census` (oráculo + instantâneo), `san3-18-module-gate` |

O resultado de cada mutação está no fim deste arquivo.

---

## Aceite na forma real do script (§C7.11(3))

Base descartável `dev18-pg` (Postgres 16), `migrate deploy` + `db seed`, `npx tsx scripts/san3-18-provisionar-modulos.ts` (12:31 SP):

- semente nova (demo com as 19 chaves): simulação → `organizacoes=1 incompletas_antes=0 a_alterar=0 incompletas_depois=0 assinaturas_com_versao_sem_chaves=0`, código 0;
- demo devolvida à lista de ANTES do bloco (10 chaves, com o apelido `checklists`): simulação → `incompletas_antes=1 a_alterar=1 alteradas=0`, nada gravado; `--aplicar` → `alteradas=1 incompletas_depois=0`, código 0, a demo vai a 20 chaves (as 10 de antes, o apelido inclusive, mais as 10 novas); 2ª `--aplicar` → `a_alterar=0 alteradas=0` (idempotente).
- Nesta base o script rodou como o dono do banco descartável; a prova sob papel `NOSUPERUSER NOBYPASSRLS` está em `tests/san3-18-provision-modules-db.test.ts` (3/3, `# skipped 0`).

## Saída do script (F0, seções (a) a (d))


- ref de (a) e (d): `da12fec6` = `da12fec6058876490649017e62b6e8c0e647a292`
- árvore de (b) e (c): `da12fec6058876490649017e62b6e8c0e647a292` + mudanças locais

### (a) Caminhos do item 16

- `MVP_NAV_PATHS`: 49 · entradas do registro: 37 (4 de plataforma)
- fora do registro (string exata): **27**
  - `/approvals`
  - `/cadastros/clientes`
  - `/cadastros/filiais`
  - `/cadastros/fornecedores`
  - `/cadastros/viaturas`
  - `/cadastros/equipes`
  - `/cadastros/profissionais`
  - `/cadastros/servicos`
  - `/cadastros/tabelas-valores`
  - `/cadastros/tarifas`
  - `/cadastros/tags`
  - `/cadastros/pontos-interesse`
  - `/patios/painel`
  - `/fleet/fuel`
  - `/fleet/maintenance`
  - `/fleet/fines`
  - `/fleet/insurance`
  - `/fleet/damages`
  - `/fleet/statement`
  - `/inventory`
  - `/finance/commissions`
  - `/finance?aba=rec`
  - `/finance?aba=pag`
  - `/users`
  - `/audit`
  - `/controle/usuarios/acessos`
  - `/controle/usuarios/sessoes`
- de organização sem módulo, fora do núcleo: **13**
  - `/controle/notificacoes`
  - `/operations/quotes`
  - `/telemetria/quilometragem`
  - `/telemetria/acessos`
  - `/telemetria/recusas`
  - `/telemetria/dispositivos`
  - `/telemetria/rastreamento`
  - `/patios/patios`
  - `/patios/processos`
  - `/patios/liberacoes`
  - `/patios/leiloes`
  - `/patios/perfis`
  - `/patios/tarifas`
- total do item 16: **40**

### (b) Rotas e classes

- rotas montadas: **444** · sem caminho: 0
  - `NUCLEO`: 61
  - `PLATAFORMA`: 53
  - `{approvals,work_orders}`: 4
  - `{audit}`: 1
  - `{customers}`: 2
  - `{expense_management}`: 12
  - `{field_operations}`: 12
  - `{finance}`: 69
  - `{inventory}`: 18
  - `{master_data,patios}`: 2
  - `{master_data}`: 18
  - `{notifications}`: 11
  - `{patios}`: 82
  - `{quotes}`: 11
  - `{suppliers}`: 2
  - `{telemetry}`: 6
  - `{tenant_checklist}`: 22
  - `{vehicles}`: 30
  - `{work_orders,field_operations}`: 2
  - `{work_orders}`: 26

### (c) Página → endpoints (front) e capacidade → endpoints (bootstrap)

- `/approvals` (frontend/src/modules/work-orders/approval.service.ts): `GET /api/v1/approvals/:id` {approvals,work_orders} · `GET /api/v1/approvals/pending` {approvals,work_orders} · `POST /api/v1/approvals/:id/approve` {approvals,work_orders} · `POST /api/v1/approvals/:id/reject` {approvals,work_orders}
- `/cadastros/clientes` (frontend/src/modules/registry/customers): `GET /api/v1/customers` NUCLEO · `GET /api/v1/customers/:id` NUCLEO · `PATCH /api/v1/customers/:id` {customers} · `POST /api/v1/customers` {customers}
- `/cadastros/filiais` (frontend/src/modules/registry/branches): `GET /api/v1/branches` NUCLEO · `GET /api/v1/branches/:id` NUCLEO · `PATCH /api/v1/branches/:id` {master_data} · `POST /api/v1/branches` {master_data}
- `/cadastros/fornecedores` (frontend/src/modules/registry/suppliers): `GET /api/v1/suppliers` NUCLEO · `GET /api/v1/suppliers/:id` NUCLEO · `PATCH /api/v1/suppliers/:id` {suppliers} · `POST /api/v1/suppliers` {suppliers}
- `/cadastros/viaturas` (frontend/src/modules/registry/vehicles): `GET /api/v1/vehicles` NUCLEO · `GET /api/v1/vehicles/:id` NUCLEO · `PATCH /api/v1/vehicles/:id` {master_data} · `POST /api/v1/vehicles` {master_data}
- `/cadastros/equipes` (frontend/src/modules/registry/teams): `DELETE /api/v1/teams/:id/members/:id` {master_data} · `GET /api/v1/teams` NUCLEO · `GET /api/v1/teams/:id` NUCLEO · `PATCH /api/v1/teams/:id` {master_data} · `POST /api/v1/teams` {master_data} · `POST /api/v1/teams/:id/members` {master_data}
- `/cadastros/profissionais` (frontend/src/modules/registry/operator-profiles): `GET /api/v1/operator-profiles` NUCLEO · `GET /api/v1/operator-profiles/:id` NUCLEO · `PATCH /api/v1/operator-profiles/:id` {master_data} · `POST /api/v1/operator-profiles` {master_data}
- `/cadastros/servicos` (frontend/src/modules/registry/service-catalog): `GET /api/v1/service-catalog` NUCLEO · `GET /api/v1/service-catalog/:id` NUCLEO · `PATCH /api/v1/service-catalog/:id` {master_data} · `POST /api/v1/service-catalog` {master_data}
- `/cadastros/tabelas-valores` (frontend/src/modules/registry/price-tables): `GET /api/v1/price-tables` NUCLEO · `GET /api/v1/price-tables/:id` NUCLEO · `PATCH /api/v1/price-tables/:id` {master_data,patios} · `POST /api/v1/price-tables` {master_data,patios}
- `/cadastros/tarifas` (frontend/src/modules/registry/tariffs): `GET /api/v1/tariffs` NUCLEO · `GET /api/v1/tariffs/:id` NUCLEO · `PATCH /api/v1/tariffs/:id` {master_data} · `POST /api/v1/tariffs` {master_data}
- `/cadastros/tags` (frontend/src/modules/registry/tags): `GET /api/v1/tags` NUCLEO · `GET /api/v1/tags/:id` NUCLEO · `PATCH /api/v1/tags/:id` {master_data} · `POST /api/v1/tags` {master_data}
- `/cadastros/pontos-interesse` (frontend/src/modules/registry/pois): `GET /api/v1/pois` NUCLEO · `GET /api/v1/pois/:id` NUCLEO · `PATCH /api/v1/pois/:id` {master_data} · `POST /api/v1/pois` {master_data}
- `/patios/painel` (frontend/src/modules/patios): `DELETE /api/v1/impound-processes/:id/spot` {patios} · `GET /api/v1/impound-processes` {patios} · `GET /api/v1/impound-processes/:id` {patios} · `GET /api/v1/impound-processes/:id/charges/statement` {patios} · `GET /api/v1/impound-processes/:id/checklist-runs` {patios} · `GET /api/v1/impound-processes/:id/custody-history` {patios} · `GET /api/v1/impound-processes/:id/events` {patios} · `GET /api/v1/impound-processes/:id/inspection` {patios} · `GET /api/v1/impound-processes/:id/verify` {patios} · `GET /api/v1/jurisdiction-defaults` {patios} · `GET /api/v1/jurisdiction-profiles` {patios} · `GET /api/v1/jurisdiction-profiles/:id` {patios} · `GET /api/v1/patios/dashboard/summary` {patios} · `GET /api/v1/yard-areas/:id/spots` {patios} · `GET /api/v1/yards` {patios} · `GET /api/v1/yards/:id` {patios} · `GET /api/v1/yards/:id/areas` {patios} · `GET /api/v1/yards/:id/occupancy` {patios} · `PATCH /api/v1/jurisdiction-profiles/:id` {patios} · `PATCH /api/v1/yard-areas/:id` {patios} · `PATCH /api/v1/yard-spots/:id` {patios} · `PATCH /api/v1/yards/:id` {patios} · `POST /api/v1/impound-processes` {patios} · `POST /api/v1/impound-processes/:id/charges` {patios} · `POST /api/v1/impound-processes/:id/charges/settle` {patios} · `POST /api/v1/impound-processes/:id/spot` {patios} · `POST /api/v1/impound-processes/:id/spot/move` {patios} · `POST /api/v1/impound-processes/:id/transitions` {patios} · `POST /api/v1/jurisdiction-profiles` {patios} · `POST /api/v1/yard-areas/:id/spots` {patios} · `POST /api/v1/yards` {patios} · `POST /api/v1/yards/:id/areas` {patios}
- `/fleet/fuel` (frontend/src/modules/fleet/fuel): `GET /api/v1/fuel-logs` {vehicles} · `GET /api/v1/fuel-logs/:id` {vehicles} · `PATCH /api/v1/fuel-logs/:id` {vehicles} · `POST /api/v1/fuel-logs` {vehicles}
- `/fleet/maintenance` (frontend/src/modules/fleet/maintenance): `DELETE /api/v1/maintenance-orders/:id/items/:id` {vehicles} · `GET /api/v1/maintenance-orders` {vehicles} · `GET /api/v1/maintenance-orders/:id` {vehicles} · `GET /api/v1/maintenance-orders/odometer-suggestion` {vehicles} · `PATCH /api/v1/maintenance-orders/:id` {vehicles} · `PATCH /api/v1/maintenance-orders/:id/items/:id` {vehicles} · `POST /api/v1/maintenance-orders` {vehicles} · `POST /api/v1/maintenance-orders/:id/items` {vehicles}
- `/fleet/fines` (frontend/src/modules/fleet/fines): `GET /api/v1/fines` {vehicles} · `GET /api/v1/fines/:id` {vehicles} · `PATCH /api/v1/fines/:id` {vehicles} · `POST /api/v1/fines` {vehicles}
- `/fleet/insurance` (frontend/src/modules/fleet/insurance): `GET /api/v1/insurance-policies` {vehicles} · `GET /api/v1/insurance-policies/:id` {vehicles} · `PATCH /api/v1/insurance-policies/:id` {vehicles} · `POST /api/v1/insurance-policies` {vehicles}
- `/fleet/damages` (frontend/src/modules/fleet/damages): `DELETE /api/v1/damages/:id/attachments/:id` {vehicles} · `GET /api/v1/damages` {vehicles} · `GET /api/v1/damages/:id` {vehicles} · `GET /api/v1/damages/:id/attachments` {vehicles} · `PATCH /api/v1/damages/:id` {vehicles} · `POST /api/v1/damages` {vehicles}
- `/fleet/statement` (frontend/src/modules/fleet/statement): `DELETE /api/v1/professional-statements/:id` {finance} · `GET /api/v1/professional-statements` {finance} · `POST /api/v1/professional-statements` {finance}
- `/inventory` (frontend/src/modules/inventory): `GET /api/v1/cycle-counts/:id` {inventory} · `GET /api/v1/cycle-counts:id` SEM_CLASSE · `GET /api/v1/inventory-items/:id` {inventory} · `GET /api/v1/inventory-items/:id/custody-summary` {inventory} · `GET /api/v1/inventory-items:id` SEM_CLASSE · `GET /api/v1/stock-movements:id` SEM_CLASSE · `PATCH /api/v1/cycle-counts/:id/entries/:id` {inventory} · `PATCH /api/v1/inventory-items/:id` {inventory} · `POST /api/v1/cycle-counts` {inventory} · `POST /api/v1/cycle-counts/:id/cancel` {inventory} · `POST /api/v1/cycle-counts/:id/close` {inventory} · `POST /api/v1/inventory-items` {inventory} · `POST /api/v1/inventory-items/abc-recalculate` {inventory} · `POST /api/v1/stock-movements` {inventory} · `POST /api/v1/stock-movements/:id/reverse` {inventory}
- `/finance/commissions` (frontend/src/modules/finance): `DELETE /api/v1/:id/:id/payable` SEM_CLASSE · `GET /api/v1/:id` SEM_CLASSE · `GET /api/v1/:id/:id/payable` SEM_CLASSE · `GET /api/v1/cheques` {finance} · `GET /api/v1/financial-accounts` {finance} · `GET /api/v1/financial-accounts/:id/balance` {finance} · `GET /api/v1/financial-entries/:id` {finance} · `GET /api/v1/financial-entries/aggregate` {finance} · `GET /api/v1/financial-entries/reconciliation-policy` {finance} · `GET /api/v1/financial-summary` {finance} · `GET /api/v1/financial-titles` {finance} · `GET /api/v1/financial-titles/:id` {finance} · `PATCH /api/v1/financial-entries/:id/reconcile` {finance} · `PATCH /api/v1/financial-titles/:id/status` {finance} · `POST /api/v1/:id/:id/payable` SEM_CLASSE · `POST /api/v1/cheques/:id/cancel` {finance} · `POST /api/v1/cheques/:id/unlink-title` {finance} · `POST /api/v1/commissions/settlements` {finance} · `POST /api/v1/financial-accounts` {finance} · `POST /api/v1/financial-titles` {finance} · `POST /api/v1/financial-titles/:id/pay` {finance}
- `/users` (frontend/src/modules/users): `GET /api/v1/users` NUCLEO · `PATCH /api/v1/users/:id` NUCLEO · `POST /api/v1/users` NUCLEO
- `/audit` (frontend/src/modules/audit): `GET /api/v1/audit-events` {audit}
- `/controle/usuarios/acessos` (frontend/src/modules/sessions): `GET /api/v1/sessions` NUCLEO · `GET /api/v1/sessions/access-history` NUCLEO · `POST /api/v1/sessions/:id/revoke` NUCLEO
- `/controle/usuarios/sessoes` (frontend/src/modules/sessions): `GET /api/v1/sessions` NUCLEO · `GET /api/v1/sessions/access-history` NUCLEO · `POST /api/v1/sessions/:id/revoke` NUCLEO
- `/dashboard` (frontend/src/modules/dashboard): —
- `/notifications` (frontend/src/modules/notifications): `DELETE /api/v1/notifications/scheduled/:id` {notifications} · `DELETE /api/v1/notifications/scheduled/central/:id` {notifications} · `GET /api/v1/notifications/scheduled` {notifications} · `POST /api/v1/notifications/scheduled` {notifications}
- `/work-orders` (frontend/src/modules/work-orders): `DELETE /api/v1/:id/:id` SEM_CLASSE · `DELETE /api/v1/:id/:id/tags/:id` SEM_CLASSE · `GET /api/v1/:id/map-start-points` SEM_CLASSE · `GET /api/v1/approvals/:id` {approvals,work_orders} · `GET /api/v1/approvals/pending` {approvals,work_orders} · `GET /api/v1/operations/dispatches` {field_operations} · `GET /api/v1/work-orders` {work_orders} · `GET /api/v1/work-orders/:id` {work_orders} · `GET /api/v1/work-orders/:id/audit-logs` {work_orders} · `GET /api/v1/work-orders/:id/timeline` {work_orders} · `PATCH /api/v1/:id/:id` SEM_CLASSE · `PATCH /api/v1/work-orders/:id` {work_orders} · `PATCH /api/v1/work-orders/:id/mileage` {work_orders} · `PATCH /api/v1/work-orders/:id/status` {work_orders} · `POST /api/v1/:id/:id/tags/:id` SEM_CLASSE · `POST /api/v1/:id/geocode` SEM_CLASSE · `POST /api/v1/:id/geocode-destination` SEM_CLASSE · `POST /api/v1/approvals/:id/approve` {approvals,work_orders} · `POST /api/v1/approvals/:id/reject` {approvals,work_orders} · `POST /api/v1/work-orders` {work_orders} · `POST /api/v1/work-orders/:id/assign` {work_orders} · `POST /api/v1/work-orders/:id/cancel` {work_orders} · `POST /api/v1/work-orders/:id/duplicate` {work_orders} · `POST /api/v1/work-orders/:id/geocode` {work_orders}

- capacidade `work_orders` (liga com [work_orders]): `GET /api/v1/work-orders` {work_orders} · `GET /api/v1/work-orders/:workOrderId` {work_orders} · `PATCH /api/v1/work-orders/:workOrderId/status` {work_orders}
- capacidade `work_order_sync` (liga com [work_orders]): `POST /api/v1/mobile/sync/work-order-actions` {work_orders}
- capacidade `checklists` (liga com [tenant_checklist]): `GET /api/v1/mobile/checklists/available` {tenant_checklist} · `GET /api/v1/mobile/checklist-runs` {tenant_checklist} · `POST /api/v1/mobile/checklist-runs` {tenant_checklist}
- capacidade `checklist_sync` (liga com [tenant_checklist]): `POST /api/v1/mobile/sync/checklist-actions` {tenant_checklist}
- capacidade `notifications` (liga com [notifications]): `GET /api/v1/notifications` {notifications} · `GET /api/v1/notifications/unread-count` {notifications} · `POST /api/v1/notifications/read-all` {notifications}
- capacidade `field_location` (liga com [field_operations]): `POST /api/v1/mobile/field-locations` {field_operations}
- capacidade `expense_management` (liga com [expense_management]): `GET /api/v1/expense-reports` {expense_management} · `GET /api/v1/expense-categories` {expense_management} · `GET /api/v1/expense-policies` {expense_management}
- capacidade `expense_sync` (liga com [expense_management]): `POST /api/v1/mobile/sync/expense-actions` {expense_management}
- capacidade `inventory_mobile` (liga com [inventory]): `GET /api/v1/mobile/inventory/availability` {inventory}
- capacidade `inventory_sync` (liga com [inventory]): `POST /api/v1/mobile/sync/inventory-actions` {inventory}
- capacidade `generic_evidence_upload` (liga com [work_orders] ou [field_operations]): `POST /api/v1/mobile/evidence-uploads` {work_orders,field_operations} · `POST /api/v1/mobile/sync/evidence-actions` {work_orders,field_operations}

### (d) Permissão do PermissionGuard por página

- `/dashboard`: `dashboard:read`, `dashboard:view`
- `/work-orders`: `work_orders:read`
- `/operations/dispatches`: `field_dispatch:read`
- `/operations/map`: `field_location:read`
- `/operations/quotes`: `service_quotes:read`
- `/operations/checklists`: `checklist_runs:read`, `checklist_runs:create`
- `/approvals`: `work_orders:read`
- `/cadastros/clientes`: `customers:read`
- `/cadastros/filiais`: `branches:read`
- `/cadastros/fornecedores`: `suppliers:read`
- `/cadastros/viaturas`: `vehicles:read`
- `/cadastros/equipes`: `teams:read`
- `/cadastros/profissionais`: `operator_profiles:read`
- `/cadastros/servicos`: `service_catalog:read`
- `/cadastros/tabelas-valores`: `price_tables:read`
- `/cadastros/tarifas`: `tariffs:read`
- `/cadastros/tags`: `tags:read`
- `/cadastros/pontos-interesse`: `pois:read`
- `/patios/painel`: `impound:read`
- `/patios/patios`: `yard:read`
- `/patios/processos`: `impound:read`
- `/patios/liberacoes`: `impound:read`
- `/patios/leiloes`: `impound:read`
- `/patios/perfis`: `jurisdiction:read`
- `/patios/tarifas`: `price_tables:read`
- `/fleet/fuel`: `fuel_logs:read`
- `/fleet/maintenance`: `maintenance_orders:read`
- `/fleet/fines`: `fines:read`
- `/fleet/insurance`: `insurance_policies:read`
- `/fleet/damages`: `damages:read`
- `/fleet/statement`: `professional_statements:read`
- `/inventory`: `inventory_items:read`
- `/finance/commissions`: `commissions:read`, `commissions:read_own`
- `/finance`: (sem PermissionGuard direto no App.tsx)
- `/finance?aba=rec`: (sem PermissionGuard direto no App.tsx)
- `/finance?aba=pag`: (sem PermissionGuard direto no App.tsx)
- `/users`: `users.read`, `users:read`
- `/audit`: `audit:read`, `audit.read`, `audit:view`
- `/controle/usuarios/acessos`: `audit:read`, `audit.read`, `audit:view`
- `/controle/usuarios/sessoes`: `sessions:read`
- `/telemetria/quilometragem`: `telemetry:read`
- `/telemetria/acessos`: `telemetry:read`
- `/telemetria/recusas`: `telemetry:read`
- `/telemetria/dispositivos`: `telemetry:read`
- `/telemetria/rastreamento`: `telemetry:read`
- `/notifications`: `notifications:read`
- `/controle/notificacoes`: `notifications:create`
- `/administrator/checklists`: `tenant_checklists:read`
- `/administrator/settings`: `tenant_settings:read`, `tenant.manage`, `tenant:manage`

## Resultado das mutações

Executadas de 12:06 a 12:24 SP (`date`), uma a uma, no worktree do dev, com o arquivo restaurado e conferido por sha256 depois de cada uma. **27 de 27 vermelhas** (a M8 é a injeção feita dentro do próprio teste). A M6 teve a âncora duplicada na 1ª tentativa (o comentário do gate repetia a chamada); o comentário foi reescrito e a M6 rodou com a âncora única.

- M1 P1 montagem: VERMELHO · pass 4 fail 8 · P1 — organização só com OS: Pátios 403 module_not_enabled, OS 200; com Pátios, Pátios 200 · P1-caixa (R-A1, R2-06) — maiúscula, prefixo /API/V1, barra final e HEAD têm a classe da forma canônica · P1-falha (A9) (i) — ator de plataforma numa rota de organização → 403 platform_actor_on_tenant_route · P1-falha (A9) (ii) — JWT de organização inexistente → 403 tenant_not_found
- M2 P1-caixa toLowerCase: VERMELHO · pass 17 fail 2 · P1-caixa (R-A1, R2-06) — maiúscula, prefixo /API/V1, barra final e HEAD têm a classe da forma canônica · P2 (iv) (R-A1) — todo padrão de ROUTE_MODULE_OVERRIDES tem a mesma classe em maiúsculas e com barra final
- M3 P1-legado: VERMELHO · pass 11 fail 1 · P1-legado (R-A3, R2-06) — NODE_ENV=production: a credencial legada não chega a handler nenhum do instantâneo
- M4a P1-falha plataforma: VERMELHO · pass 11 fail 1 · P1-falha (A9) (i) — ator de plataforma numa rota de organização → 403 platform_actor_on_tenant_route
- M4b P1-falha 404: VERMELHO · pass 11 fail 1 · P1-falha (A9) (ii) — JWT de organização inexistente → 403 tenant_not_found
- M4c P1-falha 503: VERMELHO · pass 11 fail 1 · P1-falha (A9) (iii) — a leitura dos módulos falha → 503 tenant_modules_unavailable, nunca passagem
- M5 P1-alias: VERMELHO · pass 11 fail 1 · P1-alias — a organização com o apelido `work-orders` usa as rotas de OS
- M6 P1-tenant: VERMELHO · pass 7 fail 5 · P1 — organização só com OS: Pátios 403 module_not_enabled, OS 200; com Pátios, Pátios 200 · P1-caixa (R-A1, R2-06) — maiúscula, prefixo /API/V1, barra final e HEAD têm a classe da forma canônica · P1-alias — a organização com o apelido `work-orders` usa as rotas de OS · P1-tenant — JWT da organização A (sem Pátios) + X-Tenant-Id de B (com Pátios) → 403: vale o ator
- M7 P2(i) instantâneo: VERMELHO · pass 4 fail 3 · P2 (i)(ii)(iii) — toda rota montada está no instantâneo com a classe do runtime, e nenhuma está sem classe · P2 (iii) — mutação: uma montagem nova sem classe (`GET /api/v1/zz-sem-classe`) acende o censo, e o gate a recusa · P2 (ii) — mutação: um endpoint novo sob um prefixo conhecido (`GET /api/v1/yards/zz-novo`) acende o censo
- M9 P3-núcleo users: VERMELHO · pass 5 fail 4 · P3-núcleo — toda entrada de organização tem requiredModules não vazio XOR está no núcleo · P3-núcleo (R-A8) — `users` e `tenant-admin` não são chave de menu · P3-não resolvida — `undefined` vale `[]`: nenhum item de módulo aparece · P3-não resolvida — GET /navigation/menu com a leitura da organização falhando → 0 itens de módulo
- M10 P3-núcleo zz: VERMELHO · pass 7 fail 2 · P3-núcleo — toda entrada de organização tem requiredModules não vazio XOR está no núcleo · P3 — com todos os módulos, nenhuma entrada de organização que o papel pode ver some
- M11 P3-núcleo dashboard (A11): VERMELHO · pass 6 fail 3 · P3-núcleo — toda entrada de organização tem requiredModules não vazio XOR está no núcleo · P3-não resolvida — `undefined` vale `[]`: nenhum item de módulo aparece · P3-não resolvida — GET /navigation/menu com a leitura da organização falhando → 0 itens de módulo
- M12 P3-all-of: VERMELHO · pass 8 fail 1 · P3-all-of (R-A4) — o mapa operacional exige Operação de Campo E OS; o mapa logístico exige Logística E Campo
- M13 P3-não resolvida: VERMELHO · pass 7 fail 2 · P3-não resolvida — `undefined` vale `[]`: nenhum item de módulo aparece · P3-não resolvida — GET /navigation/menu com a leitura da organização falhando → 0 itens de módulo
- M14 P3-MVP apagar a entrada /finance?aba=rec: VERMELHO · pass 8 fail 1 · P3-MVP (R-A6) — todo caminho do menu web (`MVP_NAV_PATHS`, string exata) está no registro
- M15 P4 catálogo work_orders: VERMELHO · pass 1 fail 3 · P4 — registro, classe de rota, semente e bootstrap só usam chaves do catálogo · P4 — o registro não tem apelido; o apelido normaliza para a canônica na leitura · P4 — o plano continua recusando apelido (422 module_unknown)
- M16 P4 seed finance (A2): VERMELHO · pass 3 fail 1 · P4 (R2-04) — ALL_MODULE_CLASSES ⊆ DEMO_TENANT_MODULES (a demo não perde área nenhuma com o gate)
- M17 P5 audit→yards: VERMELHO · pass 6 fail 1 · P5 (R-A4) — todo endpoint de entrada do menu é NÚCLEO/PLATAFORMA ou tem classe que cruza requiredModules
- M18 P6 keysToAdd: VERMELHO · pass 1 fail 2 · P6 — simulação e aplicação sob papel sem bypass: só acrescenta, menu não encolhe, contagens batem, 2ª execução muda 0 · P6 — organização que sobra incompleta → código de saída 1 e nada gravado (transação desfeita)
- M19 P6 união→atribuição: VERMELHO · pass 2 fail 1 · P6 — simulação e aplicação sob papel sem bypass: só acrescenta, menu não encolhe, contagens batem, 2ª execução muda 0
- M20 P6 sem assinaturas=: VERMELHO · pass 2 fail 1 · P6 (R2-09) — a assinatura vigente cuja versão não tem `patios` conta 1, lida com o GUC sob papel sem bypass
- M21 P7 evidência só OS: VERMELHO · pass 15 fail 1 · P7 — generic_evidence_upload com só [field_operations]: o bootstrap liga e os endpoints passam no gate
- M22 P7 leitura /customers: VERMELHO · pass 15 fail 1 · P3(a) do dono — com só OS, a leitura dos cadastros passa e a escrita exige a área
- M23 A7 throw 409: VERMELHO · pass 2 fail 1 · A7 — PATCH /platform/tenants/:id/modules → 409 module_change_requires_subscription, e a lista do console não muda
- M24 A10 portal: VERMELHO · pass 1 fail 1 · A10 — toda instância express() de src/ é o app do gate ou uma superfície nomeada, com pendência
- M25 R7 moduleGate anônima: VERMELHO · pass 29 fail 3 · T2 — toda chave do instantâneo está viva (nenhuma envelhecida) · T4 — a contagem n de cada chave é a viva (camada a mais no mesmo roteador muda a contagem) · T14 — o instantâneo commitado é o que o gerador produz no objeto (gerado == instantâneo)
- M26 R2-01 payable → vehicles: VERMELHO · pass 14 fail 5 · R2-01 (Emenda 1) — sem o Financeiro, a Frota não lança nem lê conta a pagar, e a OS não fatura · P2 (i)(ii)(iii) — toda rota montada está no instantâneo com a classe do runtime, e nenhuma está sem classe · P2 (iii) — mutação: uma montagem nova sem classe (`GET /api/v1/zz-sem-classe`) acende o censo, e o gate a recusa · P2 (ii) — mutação: um endpoint novo sob um prefixo conhecido (`GET /api/v1/yards/zz-novo`) acende o censo
