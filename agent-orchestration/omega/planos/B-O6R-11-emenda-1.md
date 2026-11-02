# B-O6R-11 — Emenda 1 ao plano do ciclo 3: reenvio de despesas e reenvio de material (D-EMENDA-ANTES-DO-CODIGO)

> **Papel:** `planejador-o6r11-emenda` (identidade nova; topo, §C7.6). **Modelo que rodou: Fable (claude-fable-5-1) — sem fallback.**
> **Data:** 2026-10-30 (São Paulo). **Ref medida:** `origin/main` `f065818590ad1782e4bfabdd8959413695bfacb8`
> (`chore(gitignore): reincluir nomes globais de agentes (B-SAN3-00b) (#476)`, 2026-10-30 10:01 -0300), por `git show`/`git grep`/`git ls-tree`;
> nunca pelo disco da sessão (§A7). Disco: 24 GB livres (acima do piso de 7,5 GB).
> **Plano original:** `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-O6R-11-plano.md` (medido na `264c3760`; a `f0658185` só acrescentou `.gitignore`, conferido em §E0). **Esta emenda não altera o plano original; ela SUBSTITUI os trechos nomeados em §E6.**
> **Esta emenda não desenvolve, não vota, não commita.**

## Fala literal do dono (30/10) e o que ela muda

- *"B-O6R-11 faça o reenvio de despesas e o material do estoque tambem é reenviado"*
- *"nada de deixar pedencias"*

O plano original deixava duas coisas como **pendência pré-existente** (§5 R6, §9 R-j e R-k, §10): (i) o replay de despesas não exclui `conflict` (`sync_replay_service.dart:147-150`), ao contrário de OS e vistoria; (ii) `inventory.material_add` não tem serviço de reenvio no app. O dono as tirou de pendência e as pôs **dentro do bloco**. As pendências `P-MOBILE-DESPESA-CONFLICT-REENVIADO` e `P-MOBILE-MATERIAL-SEM-REPLAY` **deixam de existir**.

**Leitura do planejador, declarada (§A6):** a fala admite duas leituras para despesas — **(L1)** o reenvio de despesas não repete em laço o que está em `conflict`, como OS e vistoria; **(L2)** a despesa interrompida (resgatada de `syncing`) é reenviada automaticamente, sem esperar decisão manual. Esta emenda mede qual desenho atende **as duas** sem trocar perda por lançamento em dobro.

---

## §E0 — Terreno medido (comando → saída → leitura)

EM APURAÇÃO.

| # | Comando | Saída (resumida) | Leitura |
|---|---|---|---|
| E0.1 | `df -h /c`; `git fetch origin; git rev-parse origin/main` | `24G livres`; `f065818590ad1782e4bfabdd8959413695bfacb8` | Piso de 7,5 GB respeitado. Ref julgada: `f0658185`. |
| E0.2 | `git diff --stat 264c3760 origin/main` | 3 arquivos: `.gitignore`, `pendencias.md`, `pendencias-indice.md` (+138/−12) | A `main` **não tocou `mobile/` nem `src/`** desde a ref do plano original (`264c3760`): tudo que o §0 do plano mediu em código continua valendo nesta ref. |
| E0.3 | `git show origin/main:mobile/flutter_app/lib/core/sync/sync_replay_service.dart` l.147-162 | `replayTenant`: `pendingForTenant` → filtra tipo suportado → `retryCount < maxRetry`; **sem** `.where((a) => a.status != SyncStatus.conflict)`; marca `syncing` em l.159 | Confirma 0.33 do plano: o replay de **despesas** reenvia `conflict` a cada passada. OS (`:665`) e vistoria (`:1366`) excluem. |
| E0.4 | idem, l.187-245 | servidor responde `'conflict'` → `copyWith(status: conflict, lastErrorCode: result.errorCode ?? 'CONFLICT', lastSafeError: 'Conflito remoto exige decisao manual.')`; `'processed'` → `synced` com `result_ref` no payload | O texto diz "exige decisão manual", mas o filtro de E0.3 **reenvia antes de o técnico decidir**: a cada passada a ação em `conflict` vai de novo à rede. É o laço da leitura **L1**. |
| E0.5 | `git grep -n "copyWith(status: SyncStatus.syncing)" origin/main -- mobile/flutter_app/lib` | `evidence_sync.dart:306`, `sync_engine.dart:36`, `sync_replay_service.dart:159, :675, :1389` | **5** sítios marcam `syncing` (o plano contou 3 em `core/sync` + `sync_engine`; `evidence_sync.dart:306` é o 5º e também passa pelo coordenador). O resgate P3 alcança todos, porque age sobre o status, não sobre o sítio. |
| E0.6 | `git show origin/main:mobile/flutter_app/lib/core/network/api_contracts.dart` l.63-75, l.130-136 | `ExpenseSyncActionTypes.supported = {expense_report.create, expense_item.create, expense_report.submit, expense_receipt.attach}`; `InventorySyncActionTypes.materialAdd = 'work_order_material.add'` (+ `inventory_entry.create`, `inventory_exit.create`); `InventoryApiEndpoints.sync = '/api/v1/mobile/sync/inventory-actions'` | **Correção ao plano original:** o tipo da ação de material é **`work_order_material.add`**, não `inventory.material_add` (0.34, §5 R3, §9 R-k do plano usam um nome que não existe em ref nenhuma). A emenda usa o nome real. |
| E0.7 | `git show origin/main:mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart` l.100-137 | `addSelection`: `_actionFactory.create(tenantId, type: materialAdd, payload: {'work_order_local_id': workOrderLocalId, 'sku': sku, 'quantity': qty})`; `_syncQueue.enqueue(action)` dentro de `forEach` sem `await` | Payload que o app enfileira: **`work_order_local_id` (id LOCAL da OS), `sku`, `quantity`**. Não há `item_id`, `warehouse_id` nem `work_order_id` de servidor. O QUA-005 (cherry-pick B) continua necessário e intacto. |
| E0.8 | `git show origin/main:src/modules/mobile/mobile.routes.ts` l.168-175, l.355-373 | `router.post("/mobile/sync/inventory-actions", handleAsyncRoute(... syncMobileInventoryActions(request.tenantContext, body)))` — **sem** `requirePermission`; catálogo l.370: `inventory_sync … "partial"` | Rota existe, sem guard de permissão na rota (o guard, se houver, está no serviço — E0.9). Catálogo declara `partial`. |
| E0.9 | `git show origin/main:src/modules/mobile/mobile-inventory-sync.ts` l.1-200 | `type InventoryActionType = "inventory.reserve" \| "inventory.consume" \| "inventory.shortage_report"`; `const syncReceipts = new Map<…>()` (l.99); `const inventoryByTenant = new Map<…>()` (l.100); contrato `mobile_inventory_actions_sync@2026-06-15.b098d status "partial"`; recibo por `fingerprint` + `buildReceiptKey(actor, client_action_id)` | **Três fatos que decidem o desenho do material:** (i) o backend **não conhece `work_order_material.add`**; (ii) a idempotência é **em memória** (`Map`), morre no restart; (iii) o "estoque" que ele debita é **um `Map` em memória por tenant**, não o Prisma. Reenviar material para este endpoint, hoje, **não grava nada durável** — e após restart um reenvio seria aceito de novo (baixa em dobro no `Map`, perda total no banco). |
| E0.10 | `git show origin/main:src/modules/expense-management/expense-sync.ts` l.20-55, l.95-128; `git grep -n "@@id(\[tenant_id, client_action_id\])" origin/main -- prisma/schema.prisma` | Cabeçalho: "B-O6R-03a (Ω6R-DIN-009) — sincronização de despesa ATÔMICA e sem lançamento em dobro … PK `(tenant_id, client_action_id)` serializa u1 contra u2"; `SyncActionAlreadyClaimedError` quando o INSERT do claim colide; `schema.prisma:3017 @@id([tenant_id, client_action_id])` | **Sim: o sync de despesa é duravelmente idempotente** na `main` (claim por INSERT na PK, dentro da transação do lançamento). Falta confirmar (E0.11) o que o backend **responde** no reenvio da mesma ação pelo mesmo ator: se `processed`/já aplicada (e não `conflict`), a despesa resgatada pode voltar a `pending` sem lançar em dobro. |
| E0.11 | EM APURAÇÃO (serviço + repositório de despesas; resposta ao reenvio) | | |

## RETOMADA 1 — 2026-10-30 (identidade nova `planejador-o6r11-emenda`, Fable; o arquivo acima era parcial de antecessor parado em E0.11)

Regra P3 aplicada: cada comando de E0.1–E0.10 foi **re-executado** nesta sessão sobre `origin/main` `f065818590ad1782e4bfabdd8959413695bfacb8` (`git fetch` novo; `df -h /c` → 24G livres). Resultado: **todas as 10 linhas confirmadas**; nenhuma herdada. Precisões acrescentadas:

- E0.8: a rota `POST /mobile/sync/inventory-actions` (`mobile.routes.ts:168-175`) não tem `requirePermission`, mas o serviço exige **`inventory.manage`** em `assertSyncActor` (`mobile-inventory-sync.ts:215-221`) e `tenantId`/`userId`/`roles` em `assertBaseActor` (`:223-235`). O `router.use(tenantContextMiddleware)` está em `:43`.
- E0.9: `processAction` só conhece `inventory.reserve | inventory.consume | inventory.shortage_report` (`:6`, `:101-105`); recibo em `Map` (`:99`); estoque em `Map` por tenant (`:100`); `resetMobileInventoryRuntimeForTests()` (`:202-205`) confirma que é runtime em memória.
- E0.10: `prisma/schema.prisma:3005-3023` `model MobileActionReceipt { tenant_id, client_action_id, actor_user_id, action_type, status @default("processed"), result_ref, processed_at, created_at; @@id([tenant_id, client_action_id]) }` → tabela `mobile_action_receipts`. Durável.
- Correção ao antecessor em E0.5: o 5º sítio `evidence_sync.dart:306` pertence ao `EvidenceSyncReplayService`, que **exclui `conflict`** (`:296`) como OS e vistoria. `FieldLocationSyncService` não usa a fila de `SyncAction` (`field_location_store.dart:43-44` filtra `pending|failed` do seu próprio store) — fora do resgate.

---

## RETOMADA 2 — 2026-10-31 13:13Z (10:13 SP) — identidade nova `planejador-o6r11-emenda-2`, topo, **Fable (claude-fable-5-1), sem fallback**

> Antecessor (`planejador-o6r11-emenda`, RETOMADA 1) parou pela pausa do dono em E0.11. Nada acima se herda como fato: cada
> linha E0.1–E0.10 e as 4 precisões da RETOMADA 1 são **re-executadas** aqui (P3) e o resultado vai na tabela §E0-bis. Ref
> medida: `origin/main` após `git fetch` → `f065818590ad1782e4bfabdd8959413695bfacb8` (igual à do antecessor). Disco: `df -h /c`
> → `238G 215G 24G 91%` (24 GB livres; piso 7,5 GB respeitado). Nenhum comando toca disco da sessão, Docker, base viva ou arquivo
> rastreado; só `git show`/`git grep`/`git ls-tree`/`git log`/`gh pr view` (leitura).

### §E0-bis — Re-execução (P3) e medições novas (comando → saída → leitura)

| # | Comando (na `origin/main` `f0658185`) | Saída (resumida) | Leitura |
|---|---|---|---|
| B.1 | `git diff --stat 264c3760 origin/main` | 3 arquivos: `.gitignore` (+126), `pendencias.md`, `pendencias-indice.md`; 0 em `mobile/`, 0 em `src/` | **E0.2 confirmada.** Tudo que o plano original mediu em código vale nesta ref. |
| B.2 | `git grep -n "copyWith(status: SyncStatus.syncing)" origin/main -- mobile/flutter_app/lib` | `evidence_sync.dart:306`, `sync_engine.dart:36`, `sync_replay_service.dart:159`, `:675`, `:1389` | **E0.5 confirmada: 5 sítios.** |
| B.3 | `git grep -n "SyncStatus.conflict" origin/main -- .../sync_replay_service.dart` | filtros `.where((a) => a.status != SyncStatus.conflict)` **só** em `:665` (OS) e `:1366` (vistoria); o replay de despesas (`:147-150`) não tem o filtro | **E0.3 confirmada.** |
| B.4 | `git show origin/main:.../sync_replay_service.dart` l.147-245 | `replayTenant` de despesa: `pendingForTenant` → tipo suportado → `retryCount < maxRetry`; marca `syncing` (`:159`); `sendBatch`; exceção → `failed` + `retryCount+1` + `NETWORK_ERROR`; resposta `'processed'` → `synced` (+`result_ref`); `'conflict'` → `conflict`, `lastSafeError: 'Conflito remoto exige decisao manual.'`; outro → `failed` + `retryCount+1` | **E0.4 confirmada.** Em `conflict` o `retryCount` **não** incrementa: uma despesa em `conflict` é reenviada **a cada passada, para sempre** (nunca atinge `maxRetry`). É o laço L1. |
| B.5 | `git grep -n "SyncEngine(" origin/main -- mobile/flutter_app/lib` | `sync_engine.dart:22` (ctor) e `sync_providers.dart:45` (`syncEngineProvider`, com `MockExpenseSyncApi`) | `SyncEngine` é construído mas **ninguém chama `syncEngineProvider`** fora do próprio arquivo (conferir B.17). O 5º sítio é código morto em produção; o resgate cobre pelo status, não importa. |
| B.6 | `git show origin/main:.../api_contracts.dart` l.63-75, l.118-135 | `ExpenseSyncActionTypes.supported = {expense_report.create, expense_item.create, expense_report.submit, expense_receipt.attach}`; `InventoryApiEndpoints.sync = '/api/v1/mobile/sync/inventory-actions'`, `workOrderMaterials(id) = '/api/v1/mobile/work-orders/$id/materials'`, `technicianStock`; `InventorySyncActionTypes = {inventory_entry.create, inventory_exit.create, work_order_material.add}` | **E0.6 confirmada.** O tipo de material é **`work_order_material.add`**. `expense_receipt.attach` está no app, mas o backend só conhece 3 tipos (B.9). |
| B.7 | `git show origin/main:.../prestador_repository.dart` l.100-137 | payload `{'work_order_local_id', 'sku', 'quantity'}`; `forEach` sem `await`; `loadTechnicianStock()` (l.33-60) devolve **catálogo semente hardcoded** ("Enquanto o backend não expõe `/mobile/technician/stock`") | **E0.7 confirmada.** O SKU vem de um catálogo fictício do app; não há `item_id`/`warehouse_id` reais. |
| B.8 | `git show origin/main:src/modules/mobile/mobile.routes.ts` l.43, l.167-174, l.355-373 | `router.use(tenantContextMiddleware)` (`:43`); `POST /mobile/sync/inventory-actions` → `syncMobileInventoryActions(request.tenantContext, body)` sem `requirePermission` na rota; catálogo: `inventory_sync … "partial"`, `expense_sync "POST /api/v1/mobile/sync/expense-actions" "implemented"` | **E0.8 confirmada.** |
| B.9 | `git show origin/main:src/modules/mobile/mobile-inventory-sync.ts` (712 linhas) l.5-6, l.99-105, l.131-200, l.202-221 | `InventoryActionType = "inventory.reserve" \| "inventory.consume" \| "inventory.shortage_report"`; `syncReceipts = new Map` (`:99`), `inventoryByTenant = new Map` (`:100`); recibo por `fingerprint` + `buildReceiptKey(actor, client_action_id)`; mesmo id + mesmo fingerprint → `already_applied`; mesmo id + fingerprint diferente → `conflict`; `resetMobileInventoryRuntimeForTests()` limpa os dois `Map`; `assertSyncActor` exige **`inventory.manage`** (`:215-221`) | **E0.9 confirmada, com os três fatos:** (i) `work_order_material.add` **não é conhecido** → cai em `rejected` (tipo não suportado; conferir `processAction` em B.18); (ii) idempotência **em memória**; (iii) estoque **em memória**. |
| B.10 | `git show origin/main:src/modules/expense-management/expense-sync.ts` l.20-30, l.49-57, l.96-118; `git show origin/main:prisma/schema.prisma` l.3005-3023 | cabeçalho B-O6R-03a: "ATÔMICA e sem lançamento em dobro … PK `(tenant_id, client_action_id)` serializa u1 contra u2"; `SyncActionAlreadyClaimedError` no INSERT que colide; `model MobileActionReceipt { … @@id([tenant_id, client_action_id]) @@map("mobile_action_receipts") }` | **E0.10 confirmada: idempotência de despesa é durável.** Falta B.11: o que o backend **responde** ao reenvio da mesma ação pelo mesmo ator. |
| B.61 | `git show origin/main:prisma/migrations/20260832000000_add_consumer_stock_item_and_movement_source/migration.sql` l.61-66; `git grep -n -i "source_type" origin/main -- prisma/migrations` filtrado por `check` | `ADD COLUMN "source_type" TEXT; ADD COLUMN "source_id" UUID; CREATE UNIQUE INDEX "stock_movements_source_active_key" ON "stock_movements" ("tenant_id","source_type","source_id") WHERE "source_id" IS NOT NULL`; o único CHECK de `source_type` do repositório é de `cloud_cost_imports` | **Nenhuma migração nova para o material:** `source_type` é TEXT livre; `work_order_material` entra sem tocar `prisma/**`. |
| B.62 | `git grep -n "sku" origin/main -- src/modules/inventory/inventory-prisma.repository.ts`; `inventory.repository.ts:55-92` | Prisma: `findItemById` (`:164`, `:810`), busca por `sku` só em `contains` de listagem (`:933`); interface `InventoryRepository` (`:55`) tem `findItemById`, `findExitBySource` (`:84`), `createExitForSource` (`:92`) | `findItemBySku(tenantId, sku)` **não existe** em nenhuma das 2 implementações: entra como leitura nova na interface + InMemory + Prisma (igualdade exata sobre o único composto `(tenant_id, sku)`, B.37). |
| B.63 | `inventory.service.ts:649-657, :637-639, :81-83, :574-586, :693-699`; `inventory.types.ts:46-51`; `core-saas.types.ts:35-41` | `createDefaultInventoryService(coreService?)` é **async** (Prisma em prod, InMemory se `CORE_SAAS_PERSISTENCE != "prisma"`); `new InventoryService(repo, references)`; `references.resolveWorkOrder` existe e, no default, chama `createDefaultWorkOrderService().get(actor, id)` (404 cross-tenant vira false); `assertWorkOrderReference` lança 400 `invalid_work_order_reference`; `InventoryActorContext {tenantId, userId, roles, permissions}` é subconjunto de `AuthenticatedActor` | O `mobile.routes.ts` pode `await createDefaultInventoryService(service)` e passar o `request.tenantContext` direto como ator. A validação da OS **em-tenant** já existe no serviço: basta o seam receber `workOrderId` (B.64). |
| B.64 | `inventory-prisma.repository.ts:437-470` (inner `createExitForSource`) e `:519-552` (`insertMovement`: `work_order_id: input.workOrderId ?? null`); `inventory.repository.ts:348-383` (InMemory idem via `insertMovement`) | O insert genérico **já grava `work_order_id`** quando o input traz `workOrderId`; o seam `createExitForSource` simplesmente **não o repassa** (nem o tipo `CreateStockExitForSourceInput`, `inventory.types.ts:339-348`, o declara) | Levar `workOrderId?` até o insert = 1 campo no tipo + 1 linha em cada `insertMovement(...)` dos 2 repositórios + validação no serviço quando presente. Aditivo, dentro do escritor existente. Hipótese: o guard `tests/inventory-write-paths-guard.test.ts` (escritores de `stock_movements` sob lock) passa, porque nenhum escritor novo nasce. **Comando que derruba:** `node --test --import tsx tests/inventory-write-paths-guard.test.ts` após F-M1. |
| B.65 | `git grep -n "EXPENSE_SYNC_ACTION_TYPES" origin/main -- src/modules/expense-management/expense-sync.ts` | `:202 throw new ExpenseManagementError(400, "EXPENSE_SYNC_INVALID", "unsupported_action", ...)` — lançado em `prepareSyncAction`, **antes** de qualquer transação, para o lote inteiro | **Pré-existente (B.55):** um `expense_receipt.attach` na fila faz o lote de despesas inteiro voltar **400**, vira `ApiError`, e todas as ações do lote ficam `failed` + `retryCount+1` (B.4) até `maxRetry = 5`. Não é desta emenda; vai a §E7 Q1. |
| B.66 | `git log --oneline origin/main` filtrado por `san3-16` → vazio; `git grep -n "P-MOBILE-DESPESA-CONFLICT-REENVIADO" origin/main -- pendencias.md` → vazio; `git grep -n "P-MOBILE-MATERIAL-SEM-REPLAY" origin/main -- pendencias.md` → **`:11796 ## P-MOBILE-MATERIAL-SEM-REPLAY (2026-10-25) — work_order_material.add fica pending para sempre — ALTA`** | `B-SAN3-16` não começou (`sync_replay_service.dart` sem concorrente em voo). **Correção ao plano original e ao antecessor:** `P-MOBILE-MATERIAL-SEM-REPLAY` **já existe** na `main` (origem B-SAN3-13, R2-6/M23; dono "`B-SAN3-16` ou o bloco de estoque do prestador"; encerramento: *"replay de material com efeito no backend; a ação vira `synced` e a OS drena"*). Esta emenda **FECHA** essa pendência, não "deixa de criá-la". `P-MOBILE-DESPESA-CONFLICT-REENVIADO` **não existe** e não se cria. |
| B.67 | `work_order_repository.dart:92-93, :342, :364, :1121-1122`; `drift_work_order_local_store.dart:187-235` | a purga de OS (B-SAN3-13) **retém** a OS enquanto houver ação `work_order_material.add` na fila com o seu `work_order_local_id` (ramo 1) **ou** material local com `syncStatus != synced` (ramo 5: `prestadorStore().loadMaterials(...)` com algum `m.syncStatus != synced`) | Para a OS **drenar** (critério da pendência B.66), o replay de material precisa (a) levar a ação a `synced` **e** (b) marcar a linha `work_order_materials` como `synced` (`WorkOrderMaterial.copyWith(syncStatus:)`, `prestador_models.dart:46`; `PrestadorLocalStore.saveMaterial`, `prestador_local_store.dart:5`; provider `prestadorLocalStoreProvider`, `prestador_repository.dart:149`). O atualizador de linha **não é opcional** (corrige B.53). `mergeMaterials` grava a linha `pending` ao adicionar (`prestador_models.dart:80`). |
| B.68 | `auth_notifier.dart:154-161`; `b103_work_order_sync_test.dart:869, :1038-1047`; `b090b_offline_auto_sync_test.dart:131-147` | `authenticatedApiConfigProvider` = `ApiConfig(accessToken: token da sessão ou null)`; os testes do coordenador sobrescrevem os replays existentes ou deixam o WO cair em `PendingBackendWorkOrderSyncBatchApi` (sem token = no-op) | Um provider de material **no mesmo molde do WO** (sem token = API `Pending` no-op) é seguro nos 6 testes que constroem o coordenador sem override dele. Hipótese; **comando que derruba:** `flutter test test/features/b090b_offline_auto_sync_test.dart test/features/b091_connectivity_profile_test.dart test/features/b103_work_order_sync_test.dart test/features/b105_gps_operational_map_test.dart test/features/b106_native_gps_permissions_test.dart test/features/b121_mobile_hardening_test.dart` após F-M4. Testes novos sobrescrevem `inventorySyncReplayServiceProvider` como fazem com os outros. |
| B.69 | `tests/mobile-backend-contracts.test.ts:11-25, :255, :1097, :2573-2613` | arnês em memória (`CORE_SAAS_PERSISTENCE` fixado antes dos imports; `CoreSaasRegistry` + `MemoryCoreSaasAdapter` + `InMemoryCoreSaasStore`); `authHeaders(tenant, user, role)` com `x-tenant-id`; já há casos com ator `technician`/`field_technician` (`:255`, `:1097`) | O teste de contrato do material (F-M2) nasce nesse arnês com ator `field_technician`; o item de estoque entra pelo `InventoryService` em memória (`getMemoryInventoryRepositoryForTests()`, `inventory.service.ts:641`) ou por `POST /api/v1/inventory/items` com ator `inventory`; a OS por `POST /api/v1/work-orders`. |
| B.70 | `git show origin/main:Kpis/kpis-latest.json` l.29-32 | `backend_tests 4153/4155` (marco 27/10) | **Baseline backend N_b = 4153** (2 não-verdes pré-existentes a conferir em F0 pelo `npm test`); a meta M_b fica em §E5. |

**Leitura consolidada do §E0-bis.** (i) **Despesa:** o backend é duravelmente idempotente e responde `processed` ao reenvio do
mesmo ator (B.31); o app reenvia `conflict` em laço porque só o replay de despesa não tem o filtro (B.3/B.14). Um filtro de 1
linha fecha L1; o resgate de `syncing` **para `pending`** fecha L2 sem dobro. (ii) **Material:** hoje o reenvio é impossível por
três motivos independentes — o app não tem replay (B.23), o backend não conhece o tipo e devolve `rejected` (B.18), e o técnico
recebe 403 (B.46); além disso o endpoint é em memória (B.9). O alicerce durável e idempotente **já existe** no módulo de estoque
(B.37/B.38/B.64) e não exige migração (B.61). O bloco **passa a tocar backend** (`src/modules/inventory`, `src/modules/mobile`),
sem `prisma/**` e sem catálogo de permissões (B.56). (iii) **Resgate por tipo:** só despesa e material têm recibo durável
(B.31, B.50); o resto vai para `conflict` como no plano. (iv) **Pendências:** `P-MOBILE-MATERIAL-SEM-REPLAY` existe e **fecha
aqui** (B.66/B.67); `P-MOBILE-DESPESA-CONFLICT-REENVIADO` não nasce.

---

### §E1 — Despesa: um desenho que atende L1 e L2 sem lançamento em dobro

**Fatos que decidem (arquivo:linha na `origin/main` `f0658185`):**

1. `mobile/flutter_app/lib/core/sync/sync_replay_service.dart:147-150` — o replay de despesa seleciona `pendingForTenant`
   (= `pending | failed | conflict`, `sync_queue_repository.dart:37-47`) filtrado por tipo e `retryCount < maxRetry`, **sem**
   excluir `conflict`. Em `:216-219` a resposta `'conflict'` grava `conflict` **sem** incrementar `retryCount`. Resultado: uma
   despesa que o servidor recusou com conflito **é reenviada a cada passada, para sempre**, e o texto gravado ("exige decisão
   manual") não é honrado. OS (`:665`), vistoria (`:1366`) e evidência (`evidence_sync.dart:296`) excluem `conflict`.
2. `src/modules/expense-management/expense-management.service.ts:159-300` — o reenvio da **mesma ação pelo mesmo ator** é
   resolvido **sem escrita** e devolve `status: "processed", replayed: true, resultRef` (provado em
   `tests/expense-sync-atomic-db.test.ts:221, :228, :308`); recibo durável em `mobile_action_receipts` com PK
   `(tenant_id, client_action_id)` (`prisma/schema.prisma:3005-3023`). O app mapeia `'processed'` para `synced` (`:201-208`).
3. `sync_conflict_resolver.dart:14-36` — "Minha versao" (`keepMine`) já devolve a ação a `pending` com `retryCount 0`; "Versao do
   gestor" encerra em `synced`.

**Desenho (os dois juntos, nenhum sozinho basta):**

- **L1 — fim do laço.** Em `sync_replay_service.dart:150`, entre o filtro de tipo e o de `retryCount`, entra
  `.where((a) => a.status != SyncStatus.conflict)` — **a mesma forma** de `:665`, `:1366` e `evidence_sync.dart:296`. A despesa em
  `conflict` espera a decisão do técnico na tela de Sincronização (card já existe, B.30) e volta pelo `keepMine`.
- **L2 — reenvio automático da despesa interrompida.** No resgate de `syncing` (R3 do plano), a ação de tipo
  `ExpenseSyncActionTypes.supported` vai para **`pending`** (não `conflict`), com `lastErrorCode: 'SYNC_INTERRUPTED'`,
  `lastSafeError` em PT-BR ("O envio foi interrompido e será refeito automaticamente."), `retryCount` **preservado**,
  `processedAt` limpo, payload intocado. O replay seguinte a reenvia; o backend responde `processed` (nova ou já aplicada) e o
  app marca `synced`. Lançamento em dobro é impossível pela PK (B.31). Se o servidor responder `conflict` (outro ator,
  payload diferente, recibo incompleto), a ação para em `conflict` e **não** entra em laço por causa de L1.

**Por que não trocar perda por dobro aqui:** a única rota de dobro seria o backend aceitar duas vezes o mesmo
`client_action_id`; a PK e o `resolveRecordedAction` tornam isso impossível **por construção**, e o teste de banco já o prova.
O que a emenda acrescenta no app não cria escrita nova no servidor: só decide **quando** reenviar.

**O que fica declarado e não entra:** (a) o replay de despesa sai **sem token** (`sync_providers.dart:109-112` usa
`apiConfigProvider`; `Ω6R-QUA-001`, dono `B-O6R-03b`) — hoje toda passada falha antes de chegar ao serviço; o desenho acima vale
quando o 03b ligar o token, e a **prova desta emenda usa fake de API**, nunca a rede; (b) `expense_receipt.attach` enfileirado
pelo app derruba o lote inteiro com 400 (B.55/B.65) — pergunta Q1 em §E7.

**Requisitos novos (critério · mutação · vermelho-controle):**

- **RD1 — despesa em `conflict` não é reenviada.** Teste `test/core/sync/bo6r11_despesa_conflict_nao_reenvia_test.dart`
  (2 casos, `InMemorySyncQueueRepository` + `CaptureBatchApi`): (1) fila com 1 `pending`, 1 `failed` (`retryCount 1`) e 1
  `conflict` de despesa → `replayTenant` → o lote capturado tem **exatamente** as 2 primeiras; a `conflict` continua
  `conflict`, mesmo `retryCount`; (2) depois de `resolveConflictAction(keepMine)` + `update`, a mesma ação entra no lote
  seguinte. **M-D1:** remover a linha do filtro → caso 1 vermelho. **Vermelho-controle:** caso 1 no head da `main` → vermelho
  (hoje a `conflict` vai no lote). O caso 4 de `test/core/sync/sync_replay_service_test.dart:121-144` (resposta `conflict` →
  status `conflict`) **não muda** (testa a resposta, não a elegibilidade) — hipótese; comando que derruba:
  `flutter test test/core/sync/sync_replay_service_test.dart` após F-D1.
- **RD2 — despesa resgatada de `syncing` volta a `pending` e é reenviada.** Entra no teste de integração de R3 (§E3): a
  despesa semeada em `syncing` fica `pending` com `SYNC_INTERRUPTED` e **é entregue** ao fake de despesas na mesma passada;
  uma segunda despesa semeada em `conflict` **não** é entregue (RD1 no mesmo cenário). **M-D2:** no mapa de destino, mandar
  despesa para `conflict` → a asserção "entregue" fica vermelha. Vermelho-controle: head da `main` + A + B → a despesa segue
  `syncing` e não é entregue.

### §E2 — Material (`work_order_material.add`): contrato hoje, o que o app manda, o que é preciso, e o bloco passa a tocar backend

**Contrato hoje (arquivo:linha na `origin/main` `f0658185`):**

| O quê | Onde | Fato |
|---|---|---|
| Rota | `src/modules/mobile/mobile.routes.ts:167-174` | `POST /mobile/sync/inventory-actions` → `syncMobileInventoryActions(request.tenantContext, body)`; sem `requirePermission` na rota; catálogo `:370` declara `"partial"`. |
| Tipos aceitos | `src/modules/mobile/mobile-inventory-sync.ts:6, :101-105, :290-292` | só `inventory.reserve`, `inventory.consume`, `inventory.shortage_report`; qualquer outro, inclusive `work_order_material.add`, → `rejected unsupported_action_type`. |
| Idempotência | `:99, :144-157` | `syncReceipts = new Map` por `(tenant, user, client_action_id)` + fingerprint do payload; **morre no restart**. Mesmo id + mesmo payload → `already_applied`; mesmo id + payload diferente → `conflict`. |
| "Estoque" | `:100, :481-575` | `inventoryByTenant = new Map`, semeado com 3 itens fictícios por tenant; nenhuma linha do Prisma. |
| Permissão | `:215-221`; `src/modules/core-saas/permissions/catalog.ts:919-963`; `RBAC_MATRIX.md:47` | lote exige `inventory.manage`; o `field_technician` **não** tem (tem `work_orders:update` e `work_orders:status`) → **403** para o técnico; a matriz dá a ele **consume/confirm** em "Inventory movements". |
| Tenant | `:131-135, :585-590` | sempre do ator; `tenant_id` do payload é ignorado no fingerprint. |
| Payload do app | `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart:121-131`; `core/sync/sync_action_factory.dart:25` | `{work_order_local_id, sku, quantity}`; `clientActionId` = `uuid.v4()`; SKU vem do catálogo **semente** do app (`:33-60`). |
| Replay no app | `git grep "InventorySyncActionTypes\." -- lib` | zero serviço de replay para os 3 tipos de estoque (B.23). |
| Documentação | `docs/mobile-sync-contracts.md:250-262`; `docs/api.md:185` | "sem persistencia duravel"; "exige `inventory.manage`". |

**Relação com `B-O6R-04a` e `B-O6R-04b`.** O 04a (**mergeado**, #389 `ab52ec50`) entregou o lock por item, os backstops únicos e o
EXIT idempotente por origem sobre o qual o material se apoia (B.20, B.38, B.64): dependência **satisfeita**. O 04b (**não
começou**, B.21; item 31 do gate, `PLANO_SAN3.md:290`) é dono de `inventory_entry.create`/`inventory_exit.create` (tela de
estoque do app, `features/inventory/data/inventory_repository.dart:94, :149`) e da troca do `Map` pelo Prisma para
`reserve/consume/shortage_report`. Esta emenda **não** faz o trabalho do 04b, mas deixa pronto o que ele reusa: serviço de
estoque injetado no sync mobile, permissão por ação, codec de resposta no app. A fronteira do 04b (`auto_sync_coordinator`,
`sync_providers`, `mobile-inventory-sync.ts`) passa a conter código deste bloco: o 04b parte da `main` **pós-merge** (nota em
`PLANO_SAN3.md:290`, F6b).

**Veredito.** O endpoint **não é duravelmente idempotente para nada**, e para o material **nem existe**. Reenvio automático
sem backend novo daria `rejected` em laço (até `maxRetry = 5`) — e, se o tipo fosse simplesmente acrescentado ao `Map`, **baixa em
dobro depois de um reinício** do backend. Logo **o bloco passa a tocar backend**: `src/modules/inventory` (aditivo, no seam que
já existe) e `src/modules/mobile` (o handler do tipo + a injeção do serviço). **Sem `prisma/**`** (o índice de origem existe e
`source_type` é TEXT livre, B.61) **e sem `catalog.ts`** (permissão nova exigiria migração, B.56; o técnico já tem
`work_orders:update`).

**Desenho — backend (durável, idempotente, fail-closed; tudo aditivo):**

1. `src/modules/inventory/inventory.types.ts` — `STOCK_EXIT_SOURCE_TYPES = ["fuel_log", "maintenance_item", "work_order_material"]`
   (`:320`); `STOCK_EXIT_REASON_BY_SOURCE.work_order_material = "baixa_material_os"` (`:324-327`); `CreateExitForSourceInput.workOrderId?: string`
   (`:330-336`); `CreateStockExitForSourceInput.workOrderId?: string` (`:339-348`).
2. `src/modules/inventory/inventory.repository.ts` — na interface (`:55`): `findItemBySku(tenantId: string, sku: string): Promise<InventoryItem | undefined>`
   (igualdade **exata**, a mesma do único composto `(tenant_id, sku)` do banco); no InMemory: implementação + `createExitForSource`
   (`:348-383`) repassa `workOrderId: input.workOrderId` ao `insertMovement`.
3. `src/modules/inventory/inventory-prisma.repository.ts` — `findItemBySku` no repositório de transação (`findFirst({ where: { tenant_id, sku } })`,
   mesmo `tx` com RLS de `findItemById`, `:164`) e no de fachada (`:810-811`, molde `this.tx(...)`); o `createExitForSource` interno
   (`:437-470`) repassa `workOrderId` ao `insertMovement` (`:519-552`, que já grava `work_order_id`).
4. `src/modules/inventory/inventory.service.ts` — em `createExitForSource` (`:422-466`): `workOrderId` opcional, parseado por
   `parseRequiredUuid` quando presente e validado por `assertWorkOrderReference(actor, workOrderId)` (`:574-586`, já existe)
   **antes** do fast-path de idempotência; repassado ao repositório. Novo método de leitura `findItemBySku(actor, sku)` (sem permissão
   própria — seam service→service, como o próprio `createExitForSource`, `:418`; `sku` normalizado por `parseSku`). `fuel_log` e
   `maintenance_item` seguem sem `workOrderId`: comportamento idêntico.
5. `src/modules/mobile/mobile-inventory-sync.ts` —
   - assinatura `syncMobileInventoryActions(actor, body, deps: { readonly inventory: InventoryService })`; o `Map` continua para os
     3 tipos antigos (04b);
   - `assertSyncActor` (`:215-221`): lote aceito com `inventory.manage` **ou** `work_orders:update` (alarga a união de tipos de
     `hasAnyPermission`, `:673-678`);
   - permissão **por ação**, no padrão `requireActionPermission` de `mobile-work-order-sync.ts:283-293`: `inventory.reserve|consume|shortage_report`
     → `inventory.manage` (quem só tem `work_orders:update` recebe `rejected permission_required` **por ação** — nada afrouxa para os
     tipos antigos); `work_order_material.add` → `work_orders:update`;
   - handler `addWorkOrderMaterial(actor, action, inventory)`: `client_action_id` tem de ser UUID (senão `rejected invalid_client_action_id`,
     porque vira `source_id @db.Uuid`); `sku` string não vazia; `quantity` > 0 (`parsePositiveNumber` existente); `work_order_id` UUID
     **obrigatório** (senão `rejected work_order_id_required`); `work_order_local_id` é ignorado no servidor e só ecoado;
     `item = await inventory.findItemBySku(actor, sku)` → ausente → `rejected inventory_item_not_found`; **pré-check**
     `await inventory.findExitBySource(actor, "work_order_material", client_action_id)` (`inventory.service.ts:483`) → existe → se
     `itemId` e `|quantidade_sinalizada|` batem com o pedido → `already_applied` (`result_ref: movement.id`), senão →
     `conflict idempotency_payload_mismatch`; ausente → `await inventory.createExitForSource(actor, { sourceType: "work_order_material",
     sourceId: client_action_id, itemId: item.id, quantity, workOrderId: work_order_id })` → `accepted` (`result_ref: movement.id`;
     `server_state` mínimo `{movement_id, item_id, sku, quantity}` — nunca `tenant_id`, §2.8); erros do serviço: 409
     `insufficient_balance` → `conflict insufficient_balance`; 409 baixa já estornada → `conflict baixa_reversed`; 400
     `invalid_work_order_reference` → `rejected`; 404/422 → `rejected` com o `reason`; erro que não é `InventoryError` nem route-like
     → **propaga** (500: o app marca `failed` e tenta de novo — é transitório por definição);
   - para `work_order_material.add` o `Map syncReceipts` **não é lido nem escrito**: a autoridade é o índice
     `stock_movements_source_active_key` (B.37, B.61);
   - `contract.version` → `"2026-10-31.b-o6r-11"`; `contract.status` **continua `"partial"`** (os 3 tipos antigos seguem em memória —
     dizer `implemented` seria mentir).
6. `src/modules/mobile/mobile.routes.ts` — na rota (`:167-174`): `const inventory = await resolveInventoryService();` com
   `resolveInventoryService = () => createDefaultInventoryService(service)` memoizado (a fábrica é async, `inventory.service.ts:649`);
   `feature_flags.inventory_sync.enabled` (`:273`) passa a `hasPermission(actor, "inventory.manage") || hasPermission(actor, "work_orders:update")`
   (honestidade da flag; o app não a lê — `git grep inventory_sync -- lib` vazio).
7. Documentação: `docs/mobile-sync-contracts.md` (seção do endpoint, `:250-300`: tipo novo e payload; permissão por ação;
   "material é durável e idempotente por origem; os 3 tipos antigos seguem em memória até o `B-O6R-04b`"; versão nova);
   `docs/api.md:185` (uma linha); `RBAC_MATRIX.md` (nota abaixo da tabela: o **consume/confirm** do `field_technician` em
   "Inventory movements" se materializa em `work_order_material.add` sob `work_orders:update`; `inventory.manage` continua sendo o
   que os tipos de reserva/consumo direto exigem).

**Desenho — app (Flutter):**

8. NOVO `mobile/flutter_app/lib/core/sync/inventory_sync_replay_service.dart` —
   - `abstract class InventorySyncBatchApi { Future<List<SyncActionResult>> sendBatch(List<SyncAction>) }`;
     `PendingBackendInventorySyncBatchApi` (sem token → devolve `[]`, como `PendingBackendWorkOrderSyncBatchApi`, `sync_replay_service.dart:284-290`);
     `CaptureInventoryBatchApi` (teste); `DioInventorySyncBatchApi` (POST `InventoryApiEndpoints.sync`; corpo
     `{client_batch_id, actions: [{client_action_id, type, local_created_at, payload}]}` — a forma de `WorkOrderSyncCodec.encodeRequest`, `:297-302`);
   - `InventorySyncCodec.decodeResponse`: `accepted` → `'processed'`, `already_applied` → `'ignored'`, `conflicts` → `'conflict'`,
     **`rejected` → `'conflict'`** com `errorCode = error.reason` (desvio declarado abaixo);
   - `InventorySyncReplayService.replayTenant(tenantId)`: elegíveis = `pendingForTenant` → `type == InventorySyncActionTypes.materialAdd`
     **somente** → `status != conflict` → `retryCount < maxRetry (5)` → **pronta**: `payload['work_order_local_id']` resolve a um
     `WorkOrder.serverId` não-local via `WorkOrderLocalStore.loadWorkOrders()` (molde `buildWorkOrderSyncEntityUpdater`,
     `sync_providers.dart:159-165`; predicado de local-id em `sync_replay_service.dart:617-621`); **não pronta → fica `pending`, não
     marca `syncing`** (igual a `b103WorkOrderActionReadyForBackend`, `:590-612`); antes do envio o payload ganha
     `'work_order_id': serverId` e a ação é gravada `syncing`; resposta: `processed`/`ignored` → `synced` (+`result_ref`),
     `conflict` → `conflict` com `lastErrorCode = reason` e `lastSafeError` em PT-BR por reason (tabela no arquivo:
     `inventory_item_not_found` → "Peça não cadastrada no estoque da organização (SKU <sku>). 'Versao do gestor' descarta este item.";
     `insufficient_balance` → "Estoque da base sem saldo para esta peça."; `permission_required` → "Seu perfil não pode lançar material
     nesta organização."; `work_order_id_required` / `invalid_work_order_reference` → "A ordem de serviço ainda não existe no servidor.";
     `idempotency_payload_mismatch` → "Este lançamento já foi recebido com outra quantidade."; outro → "O servidor recusou este
     material."); exceção de rede → `failed` + `retryCount+1` + `NETWORK_ERROR` (igual aos outros replays);
   - **atualizador de linha** (obrigatório, B.67): `PrestadorLocalStore.loadMaterials(workOrderLocalId)` → linha com o mesmo `sku` →
     `copyWith(syncStatus: <status final da ação>)` → `saveMaterial`.
   - **Desvio declarado** do `WorkOrderSyncCodec` (`rejected → 'failed'`, `:325-331`): para material, `rejected` é determinístico
     (mesmo payload, mesma resposta); `failed` após 5 tentativas é visível **e sem saída** (a tela não tem botão para `failed` — o
     plano original §3 F chamou isso de "encalhe com outro nome"); `conflict` é visível **e decidível** ("Minha versao" reenvia depois
     de o gestor cadastrar a peça; "Versao do gestor" descarta). P3 pede visível e decidível.
9. `mobile/flutter_app/lib/core/sync/sync_providers.dart` — `inventorySyncBatchApiProvider` (molde exato de
   `workOrderSyncBatchApiProvider`, `:121-141`: `authenticatedApiConfigProvider` sem token → `Pending…`; com token →
   `DioInventorySyncBatchApi(createAuthenticatedHttpClient(config, onRefresh, onClearSession))`) e
   `inventorySyncReplayServiceProvider` (queue, api, `DriftWorkOrderLocalStore(ref.watch(appDatabaseProvider))`,
   `ref.watch(prestadorLocalStoreProvider)` — `prestador_repository.dart:149`; o arquivo já importa `features/work_orders/...`, `:19-20`,
   então importar `features/prestador/...` segue o precedente).
10. `mobile/flutter_app/lib/core/sync/auto_sync_coordinator.dart` — **uma** chamada
    `await ref.read(inventorySyncReplayServiceProvider).replayTenant(tenantId);` **imediatamente depois** do replay de OS (`:86`,
    porque precisa do `serverId` que ele acaba de gravar) e **antes** de `downloadPendingRuns` (`:92`), em `try/catch` isolado (falha
    de material não bloqueia vistoria, evidência nem despesa). Somada à chamada do resgate (plano §4), são **duas** linhas novas nesse
    arquivo e nada mais.
11. `prestador_repository.dart` e `api_contracts.dart` — **nada além do cherry-pick B**: payload e constantes já existem.

**Custódia e SKU — leituras do planejador, declaradas (perguntas Q2/Q3 em §E7):** a baixa sai da custódia **BASE**, porque é a única
que o seam fixa (`inventory.types.ts:317`; `inventory-prisma.repository.ts:449-451`) e porque o "estoque do técnico" no app ainda é
catálogo semente (B.7; `B-SAN3-15`, que traria o estoque por custódia, não começou — B.44). SKU inexistente na organização →
`conflict` visível ("Peça não cadastrada"), **nunca** criação de item a partir do campo.

**Requisitos do material (critério · mutação · vermelho-controle):**

- **RM1 — recibo durável e idempotente no estoque (backend, memória).** `tests/b-o6r-11-material-exit-source.test.ts` (InMemory;
  molde `tests/inventory-stock-decrement.test.ts:42-43`, `new InventoryService(repo, { resolveWorkOrder })`): (1)
  `createExitForSource(work_order_material, sourceId=uuid, itemId, 2, workOrderId)` → 1 movimento `saida`, `-2`,
  `source_type/source_id`, **`work_order_id` gravado**, `reason baixa_material_os`; (2) a mesma chamada → o **mesmo** movimento,
  total 1; (3) `workOrderId` que o resolver nega → 400 `invalid_work_order_reference`, 0 movimentos; (4) saldo BASE insuficiente →
  409, 0 movimentos; (5) `findItemBySku` acha por igualdade exata e devolve `undefined` para SKU de outro tenant. **M-M1:** pular
  `assertWorkOrderReference` → (3) vermelho. **M-M2:** InMemory sem repassar `workOrderId` → (1) vermelho. Guards existentes
  **verdes**: `tests/inventory-write-paths-guard.test.ts`, `tests/inventory-stock-decrement.test.ts`, `tests/inventory.test.ts`,
  `tests/stock-custody.test.ts`.
- **RM2 — o endpoint aceita o material do técnico uma vez só, e só dele (backend, arnês de contrato em memória).**
  `tests/b-o6r-11-material-sync.test.ts` (molde `tests/mobile-backend-contracts.test.ts:11-25, :2573-2613`): ator
  `field_technician`; item com SKU `ELE-0102` criado pelo ator `inventory`; OS criada; lote com 1 `work_order_material.add`
  `{client_action_id: uuid, type, local_created_at, payload: {work_order_local_id, work_order_id, sku, quantity: 2}}` →
  `summary.accepted 1`, `result_ref` presente; **`tenant_id` no payload de outro tenant é ignorado** (movimento no tenant do ator);
  (2) o **mesmo lote de novo** → `already_applied 1`, `accepted 0`; (3) mesmo `client_action_id` com `quantity 3` → `conflicts 1`
  (`idempotency_payload_mismatch`), nenhum movimento novo; (4) SKU inexistente → `rejected inventory_item_not_found`; (5) sem
  `work_order_id` → `rejected work_order_id_required`; (6) `work_order_id` de outro tenant → `rejected invalid_work_order_reference`;
  (7) ator sem `inventory.manage` nem `work_orders:update` (ex.: `auditor`) → **403** no lote; (8) técnico mandando
  `inventory.consume` → `rejected permission_required` (não 403; os tipos antigos não afrouxam); (9) ator `inventory` mandando
  `inventory.consume` → igual a hoje (`accepted` no `Map`). `tests/mobile-backend-contracts.test.ts` **inteiro** continua verde.
  **M-M3:** permissão por ação do material trocada para `inventory.manage` → (1) vermelho. **M-M5:** remover o pré-check de
  `findExitBySource` → (3) vira `already_applied` → vermelho. (**M-M4**, ler o `Map` para o material, **não** derruba RM2 — por isso
  RM3 existe.)
- **RM3 — sobrevive ao reinício do backend (banco real; pede Docker).** `tests/b-o6r-11-material-sync-db.test.ts` (molde
  `tests/expense-sync-atomic-db.test.ts`): Postgres descartável; (1) aceita → `SELECT` em `stock_movements`: 1 linha,
  `source_type = 'work_order_material'`, `source_id = client_action_id`, `work_order_id`, `custody_type = 'base'`; (2) **nova
  instância** do serviço e do repositório (simula reinício) + reenvio → `already_applied`, ainda 1 linha; (3) 2 reenvios
  **concorrentes** da mesma ação (`Promise.all`) → 1 linha (lock + índice); (4) tenant B com o **mesmo** `client_action_id` → 2ª
  linha **no tenant B** (a origem é por tenant). **M-M4:** idempotência do material pelo `Map` em vez do índice → (2) vermelho (a
  nova instância não lembra). **Vermelho-controle:** no head da `main` o tipo é `rejected` — registra-se "não aplicável: o caminho não
  existia"; a prova negativa é M-M4.
- **RM4 — o app reenvia só material, só quando a OS tem id no servidor, e lê a resposta (Flutter).**
  `test/core/sync/bo6r11_material_replay_test.dart` (`InMemorySyncQueueRepository`, `InMemoryWorkOrderLocalStore`
  (`work_order_local_store.dart:41`), store do prestador em memória, `CaptureInventoryBatchApi`): (1) fila com
  `work_order_material.add`, `inventory_entry.create`, `inventory_exit.create` e `work_order.status_update` → **só o material** vai
  no lote; os outros continuam `pending` e **não** viram `syncing`; (2) OS sem `serverId` → nada enviado, ação `pending`; OS com
  `serverId` → enviada com `payload['work_order_id'] == serverId` e o mesmo `client_action_id`; (3) `accepted` → `synced` +
  `result_ref` + **linha de material `synced`**; `already_applied` → `synced`; `rejected inventory_item_not_found` → `conflict` com
  `lastSafeError` contendo o SKU; `conflicts insufficient_balance` → `conflict`; exceção → `failed`, `retryCount+1`; (4) ação em
  `conflict` **não** entra no lote seguinte; (5) coordenador (`ProviderContainer` com fakes, molde `b090b_offline_auto_sync_test.dart:131-147`):
  material é chamado **depois** do replay de OS e **antes** da vistoria; exceção no replay de material **não** impede a despesa.
  **M-M6:** remover o filtro de tipo → (1) vermelho. **M-M7:** remover a prontidão por `serverId` → (2) vermelho. **M-M8:**
  `rejected → failed` → (3) vermelho. **M-M9:** comentar a chamada no coordenador → (5) vermelho. **M-M10:** não atualizar a linha do
  prestador → (3) "linha synced" vermelho. **Vermelho-controle:** o arquivo **não compila** no head da `main` (o serviço não existe)
  — registra-se como tal; a regressão é a suíte inteira + os 6 testes de B.68.
- **RM5 — a OS drena quando o material sincroniza (critério de `P-MOBILE-MATERIAL-SEM-REPLAY`, B.66/B.67).** Caso extra em RM4:
  depois de (3) `accepted`, nenhuma linha de material da OS está fora de `synced` **e** nenhuma ação `work_order_material.add` da OS
  está fora de `synced` — as duas portas (ramos 1 e 5) de `work_order_repository.dart:342-364, :1121-1122`. Hipótese: existe teste de
  B-SAN3-13 que exercita o predicado e serve de molde; **comando que decide:**
  `git grep -ln "work_order_materials\|loadMaterials" origin/main -- mobile/flutter_app/test`. Se não houver, RM5 fica na asserção
  das duas portas.

---

### §E3 — Destino no resgate de `syncing`, por tipo de ação (substitui o "tudo para `conflict`" do plano §3 item 3 e §5 R3)

Regra: **`pending` só quando o reenvio é duravelmente idempotente no backend** (recibo que sobrevive ao reinício e resposta que o
app lê como sucesso); **`conflict` em todo o resto**, inclusive tipo desconhecido (fail-closed). Em ambos: `lastErrorCode:
'SYNC_INTERRUPTED'`, `retryCount` preservado, `processedAt` limpo, payload intocado; `lastSafeError` difere.

| Tipo (constante do app) | Destino | Motivo (arquivo:linha) | Texto `lastSafeError` |
|---|---|---|---|
| `expense_report.create`, `expense_item.create`, `expense_report.submit`, `expense_receipt.attach` (`ExpenseSyncActionTypes.supported`) | **`pending`** | recibo durável `mobile_action_receipts` PK `(tenant_id, client_action_id)` (`prisma/schema.prisma:3005-3023`); reenvio do mesmo ator → `processed, replayed: true` (`expense-management.service.ts:233-300`); app mapeia `processed` → `synced` (`sync_replay_service.dart:201-208`). O `receipt.attach` vai junto por ser do mesmo conjunto; se o backend o recusar (B.65) o lote cai em `failed` como hoje — Q1. | "O envio foi interrompido e será refeito automaticamente." |
| `work_order_material.add` (`InventorySyncActionTypes.materialAdd`) | **`pending`** | idempotência por origem no índice `stock_movements_source_active_key` (`migration 20260832000000:64-66`), lock por item (`inventory-prisma.repository.ts:437-470`), reenvio → `already_applied` → app `synced` (§E2). Só vale **depois** de §E2 estar no mesmo PR — por isso a constante de tipos (abaixo) nasce na fatia F4b **depois** de F-M2. Se a OS ainda não tem `serverId`, fica `pending` até lá (B.52). | idem |
| `work_order.create`, `work_order.status_update`, `work_order.assign`, `work_order.mileage`, `work_order.unable_to_start`, `work_order.approval_request`… (`WorkOrderSyncActionTypes.*`) | **`conflict`** | recibo em memória `mobile-work-order-sync.ts:71`; `work_order.create` não carimba `client_action_id` (plano 0.21): reenvio após reinício **duplica OS**. Fica para `B-O6R-11c`. | "O envio foi interrompido antes da confirmação. 'Minha versao' reenvia; 'Versao do gestor' encerra este item." |
| `checklist_run.create`, `checklist_answer.upsert`, `checklist_run.complete`, `checklist_marker.create`, `checklist_divergence.create`, `checklist_acknowledgement.create`, `checklist_attachment.attach` | **`conflict`** | recibo em memória `mobile-checklist-sync.ts:164`. | idem |
| `work_order.evidence_attach` e demais `EvidenceSyncActionTypes.supported` | **`conflict`** | recibo em memória `mobile-evidence-sync.ts:92`. | idem |
| `inventory_entry.create`, `inventory_exit.create` | **`conflict`** | sem replay no app (B.23) e sem handler no backend (B.18): nunca chegam a `syncing` legitimamente; se aparecerem, é estado inconsistente — fail-closed. Dono `B-O6R-04b`. | idem |
| qualquer outro `type` | **`conflict`** | fail-closed. | idem |

**Implementação (muda o plano §4, arquivo novo `lib/core/sync/sync_interrupted_reclaim.dart`):**
`const syncInterruptedErrorCode = 'SYNC_INTERRUPTED'`; `const syncInterruptedManualSafeError = '<texto conflict>'`;
`const syncInterruptedAutoSafeError = '<texto pending>'`; **`const durablyIdempotentActionTypes = {...ExpenseSyncActionTypes.supported,
InventorySyncActionTypes.materialAdd}`** com um comentário por tipo apontando a evidência do backend (as linhas da tabela acima);
`List<SyncAction> reclaimInterruptedSyncing(Iterable<SyncAction> actions, {Set<String> autoResendTypes = durablyIdempotentActionTypes})`
— pura: devolve só as `syncing`, cada uma com `status = autoResendTypes.contains(type) ? pending : conflict`. A chamada no
`AutoSyncCoordinator` é a do plano (topo de `_triggerSync`, após `tenantId`, `try/catch` isolado).

**Critério (teste de integração de R3, reescrito):** semear em `syncing` **5** ações — `work_order.status_update`,
`checklist_answer.upsert`, `work_order.evidence_attach`, `expense_report.create`, `work_order_material.add` (com OS local que **tem**
`serverId`) — mais 1 `pending` de OS, 1 `synced`, e 1 `expense_item.create` em `conflict`; `triggerManual()`; asserir: (a) OS,
vistoria e evidência estão `conflict` com `SYNC_INTERRUPTED` e **não** chegaram aos seus fakes; (b) despesa resgatada está
`synced` (foi `pending` → entregue ao fake de despesas, que respondeu `processed`); (c) material resgatado está `synced` (idem, fake
de estoque respondeu `accepted`) e a linha de material também; (d) a `pending` de OS foi entregue; (e) a `synced` está idêntica;
(f) a despesa semeada em `conflict` **não** foi entregue (RD1); (g) `retryCount` e `payload` das resgatadas preservados (o payload de
material ganha só `work_order_id`). **Mutações:** M6 (sem a chamada) → (a)-(c) vermelhos; M7 (tudo `pending`) → (a) vermelho; M8
(tudo `failed`) → (a) vermelho; M9 (converter também as `pending`) → (d) vermelho; **M-D2** (despesa → `conflict`) → (b) vermelho;
**M-M11** (material → `conflict`) → (c) vermelho; **M-D1** (filtro de L1 removido) → (f) vermelho. **Vermelho-controle:** head da
`main` + A + B → as 5 continuam `syncing`, nada entregue.

**Unitários da função pura (6, antes 4):** só `syncing` é convertida; campos preservados; entrada vazia; ordem; **despesa e
material → `pending`**; **OS/vistoria/evidência/desconhecido → `conflict`**.

---

### §E4 — O que muda em relação ao plano original (ponto a ponto)

1. **`sync_replay_service.dart` deixa de ser PROIBIDO para UMA linha**: inserir `.where((a) => a.status != SyncStatus.conflict)`
   em `:150` (entre o filtro de tipo e o de `retryCount`, no `SyncReplayService.replayTenant` de despesa). **Nada mais nesse
   arquivo**: o replay de material **não** entra nele — vai em arquivo próprio (`inventory_sync_replay_service.dart`) justamente para
   o arquivo de 1.500 linhas não virar escopo. A cadeira C2 confere que o diff desse arquivo é **exatamente** uma linha.
2. **Provider novo e registro no coordenador**: `inventorySyncBatchApiProvider` + `inventorySyncReplayServiceProvider` em
   `sync_providers.dart` (§E2 item 9); chamada em `auto_sync_coordinator.dart` depois do replay de OS, em `try/catch` isolado (§E2
   item 10). Com a chamada do resgate (plano §4), o coordenador ganha **duas** linhas de chamada e nada mais.
3. **Tela de Sincronização** (`shared/ui/sync_screen.dart`): **uma** mudança só de texto em `_ConflictCard` (`:216-223`): o
   parágrafo passa a ser `action.lastSafeError ?? '<texto atual: "… o gestor alterou este item. Escolha qual versao deve prevalecer.">'`.
   Motivo: para `SYNC_INTERRUPTED` e para material recusado o texto fixo mente (B.34, B.60). Nenhum layout, botão, cor ou
   componente novo; `_domainLabel` não muda (material cai em "Ordens de Servico", `:276-278` — cosmético, declarado). A condição do
   plano para P4 (reler por `clientActionId`) continua valendo separadamente.
4. **Caso (g) do R3 muda de natureza**: deixa de ser "comportamento pré-existente documentado" e vira **requisito** — a despesa
   resgatada **é** entregue (RD2) e a despesa em `conflict` **não** é (RD1). Ver o critério reescrito em §E3.
5. **Pendências**: `P-MOBILE-DESPESA-CONFLICT-REENVIADO` **não nasce** (não existe na `main`, B.66; o defeito é consertado aqui).
   `P-MOBILE-MATERIAL-SEM-REPLAY` **já existe** (`pendencias.md:11796`) e é **FECHADA por este bloco** com o PR e o teste RM5 como
   evidência. `P-MOBILE-SYNC-INTERROMPIDO-REENVIO-MANUAL` (plano §5 R6) tem o escopo **reduzido** a OS, vistoria e evidência (despesa
   e material já reenviam). `P-O6R-B11`: "MP5 resgatado para decisão manual" vira "MP5: despesa e material reenviam
   automaticamente; OS/vistoria/evidência ficam visíveis para decisão até o `B-O6R-11c`". O escopo do `B-O6R-11c` encolhe para
   OS, vistoria e evidência.
6. **O bloco toca backend** (§E2): `src/modules/inventory/{inventory.types,inventory.repository,inventory-prisma.repository,inventory.service}.ts`,
   `src/modules/mobile/{mobile-inventory-sync,mobile.routes}.ts`, testes em `tests/b-o6r-11-*.test.ts`, e documentação
   (`docs/mobile-sync-contracts.md`, `docs/api.md`, `RBAC_MATRIX.md`). O PR deixa de ser "só Flutter".
7. **Correções de nome ao plano original**: o tipo é `work_order_material.add` (não `inventory.material_add`) em 0.34, §5 R3, §9 R-k
   e §10; o 5º sítio de `syncing` (`evidence_sync.dart:306`) exclui `conflict` como OS e vistoria; o `SyncEngine` não roda em
   produção (B.32).

---

### §E5 — Escopo, fatias, meta de testes, quórum e Docker

#### E5.1 PERMITIDO — acrescentar ao §4 do plano (caminhos exatos; o que já estava lá continua)

| Caminho | O que pode mudar | Origem |
|---|---|---|
| `mobile/flutter_app/lib/core/sync/sync_replay_service.dart` | **só** a linha `.where((a) => a.status != SyncStatus.conflict)` em `replayTenant` do `SyncReplayService` (despesa), `:150`. Diff do arquivo = 1 linha. | RD1 |
| `mobile/flutter_app/lib/core/sync/sync_interrupted_reclaim.dart` | NOVO (já no plano); ganha `durablyIdempotentActionTypes`, os dois textos e o parâmetro `autoResendTypes` (§E3) | RD2/RM, R3 |
| `mobile/flutter_app/lib/core/sync/inventory_sync_replay_service.dart` | **NOVO**: API abstrata, `Pending…`, `Capture…`, `Dio…`, codec, `InventorySyncReplayService` com prontidão por `serverId` e atualizador de linha (§E2 item 8) | RM4/RM5 |
| `mobile/flutter_app/lib/core/sync/sync_providers.dart` | só `inventorySyncBatchApiProvider` e `inventorySyncReplayServiceProvider` (+ imports) | RM4 |
| `mobile/flutter_app/lib/core/sync/auto_sync_coordinator.dart` | **duas** linhas de chamada: o resgate (plano) e `inventorySyncReplayServiceProvider.replayTenant` depois do replay de OS, em `try/catch` isolado | R3, RM4 |
| `mobile/flutter_app/lib/shared/ui/sync_screen.dart` | só o texto do `_ConflictCard` (`lastSafeError ?? texto atual`), `:216-223`; **mais** a condição do plano para P4 | §E4 item 3 |
| `mobile/flutter_app/test/core/sync/bo6r11_despesa_conflict_nao_reenvia_test.dart` | NOVO (RD1) | RD1 |
| `mobile/flutter_app/test/core/sync/bo6r11_resgate_syncing_interrompido_test.dart` | NOVO (já no plano); critério reescrito em §E3 | R3 |
| `mobile/flutter_app/test/core/sync/bo6r11_material_replay_test.dart` | NOVO (RM4/RM5) | RM4 |
| `src/modules/inventory/inventory.types.ts` | `STOCK_EXIT_SOURCE_TYPES` + `work_order_material`; `STOCK_EXIT_REASON_BY_SOURCE` + 1 entrada; `workOrderId?` nos 2 tipos de input do seam. **Nada mais.** | RM1 |
| `src/modules/inventory/inventory.repository.ts` | `findItemBySku` na interface e no InMemory; `workOrderId` repassado no `createExitForSource` do InMemory | RM1 |
| `src/modules/inventory/inventory-prisma.repository.ts` | `findItemBySku` (tx + fachada); `workOrderId` repassado no `createExitForSource` interno | RM1 |
| `src/modules/inventory/inventory.service.ts` | `createExitForSource`: `workOrderId` opcional validado por `assertWorkOrderReference`; método de leitura `findItemBySku(actor, sku)` | RM1 |
| `src/modules/mobile/mobile-inventory-sync.ts` | §E2 item 5 inteiro | RM2 |
| `src/modules/mobile/mobile.routes.ts` | injeção do serviço de estoque na rota de `inventory-actions`; `feature_flags.inventory_sync.enabled` | RM2 |
| `tests/b-o6r-11-material-exit-source.test.ts`, `tests/b-o6r-11-material-sync.test.ts`, `tests/b-o6r-11-material-sync-db.test.ts` | NOVOS | RM1–RM3 |
| `docs/mobile-sync-contracts.md`, `docs/api.md`, `RBAC_MATRIX.md` | só o descrito em §E2 item 7 (texto; nenhuma linha da tabela-base da matriz muda) | registro |
| `docs/revisoes/SAN3/PLANO_SAN3.md` | além de l.115 e l.283 (plano): **nota** em l.290 (`B-O6R-04b` parte da `main` pós-merge; `mobile-inventory-sync.ts` já injeta o serviço) e em l.291 (`B-O6R-03b`: Q1, se o dono decidir) — sem reescrever as linhas | registro |
| `agent-orchestration/controle/pendencias.md` | além do plano: **fechar** `P-MOBILE-MATERIAL-SEM-REPLAY` (l.11796); **não** criar `P-MOBILE-DESPESA-CONFLICT-REENVIADO`; reduzir `P-MOBILE-SYNC-INTERROMPIDO-REENVIO-MANUAL` e `B-O6R-11c` a OS/vistoria/evidência | registro |

#### E5.2 PROIBIDO — continua tudo do §4 do plano, com estas precisões

- `prisma/**` **continua PROIBIDO**: nenhuma migração (o índice de origem existe e `source_type` é TEXT livre, B.61). Se o dev
  concluir que precisa de migração, **para** e devolve (trava de escopo do plano).
- `src/modules/core-saas/permissions/catalog.ts` e `tests/fixtures/role-catalog-contract.snapshot.json`: **PROIBIDOS** — nenhuma
  permissão nova nem redistribuição (B.56). O material usa `work_orders:update`, que o técnico já tem.
- `src/modules/expense-management/**`: PROIBIDO (o `expense_receipt.attach` é Q1/`B-O6R-03b`).
- `src/modules/work-orders/**`, `src/modules/fuel-logs/**`, `src/modules/maintenance-orders/**`: PROIBIDOS (os chamadores
  existentes do seam não mudam de comportamento — RM1 garante).
- `mobile/flutter_app/lib/features/inventory/**`: PROIBIDO (`B-O6R-04b`).
- `mobile/flutter_app/lib/features/prestador/**`: só o cherry-pick B do plano; nada mais.
- `mobile/flutter_app/lib/core/sync/sync_replay_service.dart` fora da linha `:150`; `sync_engine.dart`; `sync_models.dart`;
  `sync_action_store.dart`; `drift_sync_action_store.dart`; `app_database.dart`: PROIBIDOS (como no plano).
- `frontend/**`, `.github/**`, `Kpis/**`, `CLAUDE.md`, `AGENTS.md`, lockfiles, `pubspec.*`: PROIBIDOS.

#### E5.3 Fatias — até 45 min, UMA por vez, cada uma termina com commit + push + `## RETOMADA n` no diário (regras do plano §6 valem)

As fatias do plano **F0, F1, F2, F3, F5** ficam como estão. **F4, F6 e F7 são substituídas** por F4b, F6b e F7b. Entram **F-D1** e
**F-M1 a F-M6**. Ordem obrigatória: F0 → F1 → F2 → F3 → **F-D1 → F-M1 → F-M2 → F-M3 → F-M4 → F-M5 → F4b** → F5 → **F-M6 → F6b → F7b**.
(F4b vem **depois** de F-M2/F-M4 porque o destino `pending` do material só é honesto quando o backend e o replay existem no mesmo ramo.)

| Fatia | Tempo | O que faz | Prova registrada | Commit |
|---|---|---|---|---|
| **F0 (acréscimo)** | +10 min | além do plano: `npm ci` no worktree; `npm test` → **N_b** (esperado 4153/4155, B.70; registrar as 2 não-verdes pré-existentes por nome); `node --test --import tsx tests/mobile-backend-contracts.test.ts` verde | linha final do `npm test`; N_b | (no commit do diário de F0) |
| **F-D1** | 20 min | linha do filtro em `sync_replay_service.dart:150`; `bo6r11_despesa_conflict_nao_reenvia_test.dart` (2 casos); M-D1; vermelho-controle (caso 1 no head da `main`, worktree temporário); `flutter test test/core/sync/sync_replay_service_test.dart` verde | 2/2; M-D1 vermelho; controle vermelho; `git diff --stat` do arquivo = 1 linha | `fix(mobile): despesa em conflito espera a decisão do técnico em vez de ser reenviada em laço (B-O6R-11)` |
| **F-M1** | 45 min | backend/inventory: §E2 itens 1-4; `tests/b-o6r-11-material-exit-source.test.ts` (5 casos); M-M1, M-M2; guards `inventory-write-paths-guard`, `inventory-stock-decrement`, `inventory`, `stock-custody` verdes; `npm run check` | 5/5; M-M1/M-M2 vermelhos; 4 guards verdes | `feat(inventory): baixa de material da OS por origem idempotente, com a OS validada em-tenant (B-O6R-11)` |
| **F-M2** | 45 min | backend/mobile: §E2 itens 5-6; `tests/b-o6r-11-material-sync.test.ts` (9 casos); M-M3, M-M5; `tests/mobile-backend-contracts.test.ts` inteiro verde; `npm run check` e `npm run lint`; medir o bloco `technician:` do catálogo (Q5) | 9/9; M-M3/M-M5 vermelhos; contratos verdes | `feat(mobile-sync): material da OS aceito do técnico uma vez só, por work_orders:update (B-O6R-11)` |
| **F-M3** | 30 min | **pede Docker**: Postgres descartável (o orquestrador fornece a URL; **nunca** `erp-*`/5432 vivo); `tests/b-o6r-11-material-sync-db.test.ts` (4 casos); M-M4 | 4/4; M-M4 vermelho | `test(mobile-sync): o material sobrevive ao reinício do backend e a dois reenvios concorrentes (B-O6R-11)` |
| **F-M4** | 45 min | app: `inventory_sync_replay_service.dart` (§E2 item 8), providers (item 9), coordenador (item 10); `dart format`; `flutter analyze` 0; os 6 testes de B.68 verdes | `analyze` 0; 6 arquivos verdes | `feat(mobile): o app reenvia o material da OS quando ela já existe no servidor (B-O6R-11)` |
| **F-M5** | 45 min | `bo6r11_material_replay_test.dart` (RM4 5 casos + RM5); M-M6 a M-M10, uma por vez, revertidas por edição inversa; vermelho-controle registrado como "não compila no head" | 6/6; tabela M-M6..M-M10 | `test(mobile): replay de material — só material, só com id da OS, resposta lida, linha atualizada (B-O6R-11)` |
| **F4b** | 45 min | substitui F4: `sync_interrupted_reclaim.dart` com `durablyIdempotentActionTypes` (§E3); texto do `_ConflictCard` (§E4 item 3); chamada no topo de `_triggerSync`; `bo6r11_resgate_syncing_interrompido_test.dart` (6 unitários + 1 integração com 5 semeadas, §E3); M6-M9, M-D2, M-M11, M-D1(f); vermelho-controle | 7/7; tabela de 7 mutações; controle | `fix(mobile): ação presa em sincronizando volta — reenvio automático onde o servidor não duplica, decisão do técnico onde duplica (B-O6R-11)` |
| **F5** | 30 min | sonda P4, como no plano | | |
| **F-M6** | 30 min | `docs/mobile-sync-contracts.md`, `docs/api.md:185`, `RBAC_MATRIX.md` (nota), `PLANO_SAN3.md` l.290/291 (nota) — §E2 item 7 | `git diff --stat`; `rg "work_order_material.add" docs RBAC_MATRIX.md` com 3 ou mais ocorrências | `docs(contratos): sync de material da OS — tipo, permissão por ação, durabilidade (B-O6R-11)` |
| **F6b** | 40 min | registro do plano **mais** §E4 item 5 (fechar `P-MOBILE-MATERIAL-SEM-REPLAY`; não criar a de despesa; reduzir a de reenvio manual e o 11c); cópia desta emenda em `agent-orchestration/omega/planos/B-O6R-11-emenda-1.md` ao lado do plano; comando v2 cita a emenda | `grep -c "## P-"` antes/depois; `grep -n "P-MOBILE-MATERIAL-SEM-REPLAY" pendencias.md` mostra FECHADA | `docs(registro): B-O6R-11 ciclo 3 + emenda 1 — despesa e material reenviam; material pendente fechado (B-O6R-11)` |
| **F7b** | 40 min | bateria do plano **mais** backend: `npm run check`, `npm run lint`, `npm test` → **M_b**, `npm run build`, `node --test --import tsx tests/b-o6r-11-*.test.ts tests/mobile-backend-contracts.test.ts`, `node scripts/migration-transaction-guard.mjs` (sem migração nova → verde trivial), `git diff --check`; `git diff --name-only origin/main` cruzado com §4+§E5 (a trava §C7 item 10(2) vai acusar `src/modules/inventory`, `src/modules/mobile`, `RBAC_MATRIX.md` → junta completa, que já é o nível); corpo do PR com a tabela de mutações, N→M dos dois lados, "KPI congelado", "fecha QUA-005 e P-MOBILE-MATERIAL-SEM-REPLAY; QUA-004 → 11d; reenvio automático de OS/vistoria/evidência → 11c (reduzido); #388 fecha sem merge" | `+M_f: All tests passed!`; `npm test` verde (M_b); lista × escopo | (push + PR) |

**Total: 15 fatias, cerca de 560 min nominais** (eram 8 e 250). Fatia que estoura 45 min: grava `## RETOMADA n` (feito / falta /
próximo comando) e **para**; o orquestrador decide. Fatias não se juntam. O dev é **Codex GPT-5.6 Sol** (conta 1 ou 2) **ou
Claude Opus declarado**; este texto mais o plano são tudo o que ele leu.

#### E5.4 Meta M de testes

- **Flutter:** N = 905 (plano 0.24; F0 confirma). Casos novos: 12 aproveitados (A/B/C/D) + RD1 **2** + R3 **7** (6 unitários + 1
  integração; eram 5) + RM4/RM5 **6** + sonda P4 **1** = **28**. Meta **M_f >= 933**, zero falha, zero skip, **M_f - N = casos
  novos** (nenhum caso existente some). O caso 4 de `sync_replay_service_test.dart` continua verde (hipótese de RD1; se ficar
  vermelho é informação nova: o dev **para** e registra, não "ajusta" o teste).
- **Backend:** N_b = 4153/4155 (B.70; F0 confirma e nomeia as 2 não-verdes pré-existentes). Casos novos: RM1 **5** + RM2 **9** +
  RM3 **4** = **18**. Meta **M_b >= N_b + 18**, com as mesmas 2 não-verdes pré-existentes (nem mais nem menos) — qualquer outra
  diferença é regressão e para o bloco.
- "M >= 2N" do molde **não se aplica** a bloco de correção (declarado no plano §7); a meta honesta é cada requisito com teste que
  fica vermelho sem o conserto (RD1-RD2, RM1-RM5, R1-R4) e as duas suítes inteiras verdes.

#### E5.5 Quórum e papéis (`D-JUNTA-FLUXO-RAPIDO`, `CLAUDE.md:841-866` na `origin/main`)

- **Nível: junta completa** — inspetor de terreno + **3 cadeiras, unanimidade** — porque o bloco "pode perder dado sem volta"
  (fila do app) **e** agora "muda permissão" (a rota aceita `work_orders:update` para o material) **e** escreve estoque (dado). A
  trava automática (item 10(2)) sobre `git diff --name-only` confirma pelo caminho (`src/modules/inventory`, `src/modules/mobile`,
  `RBAC_MATRIX.md`). Não há nível acima; o fluxo do plano §8 não muda (pré-revisão → junta 1x → triagem → 1 conserto →
  conferência → merge → porteiro).
- **Esta emenda passa pelo `critico-adversarial` ANTES do dev** (`D-EMENDA-ANTES-DO-CODIGO`, `CLAUDE.md:318-324`; bloco de
  invariante → §C7.1-ter(b)). Devolução do crítico **não** aciona topo (§C7.4). O crítico ataca em especial: o mapeamento
  `rejected → conflict` (§E2 item 8); a prontidão por `serverId` (material fica `pending` enquanto a OS não sincroniza — declarado,
  visível, não é encalhe silencioso); e a afirmação de que `assertWorkOrderReference` no seam não muda `fuel_log`/`maintenance_item`
  (RM1 + guards).
- **Cadeiras (até 3 itens cada; `arquivos_medidos` declarados, item 9(0)):**

| Cadeira | Mandato | `arquivos_medidos` |
|---|---|---|
| **C1 — fila, resgate e despesa (Flutter)** | (1) R1/R2: 12 casos + M1-M5 + controles; (2) R3/RD2: integração de §E3 + M6-M9, M-D2, M-M11 + controle; (3) RD1: 2 casos + M-D1 + controle, e `git diff --stat -- sync_replay_service.dart` = 1 linha | `mobile/flutter_app/lib/core/sync/{sync_queue_repository,sync_interrupted_reclaim,auto_sync_coordinator,sync_replay_service}.dart`, `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart`, `mobile/flutter_app/test/core/sync/bo6r11_*`, `mobile/flutter_app/test/features/prestador/bo6r11_*` |
| **C2 — estoque durável, RBAC e isolamento (backend; competência de banco, perfil `agente-dba-guardiao`)** | (1) RM1/RM3 em Postgres descartável próprio: 1 linha por origem após reinício e sob concorrência; `work_order_id` e `custody_type` gravados; tenant B separado; (2) RM2: 9 casos + M-M3/M-M5, e **403/rejected** exatamente como a tabela (nada afrouxa para `inventory.*`); `catalog.ts` e `prisma/**` intocados; (3) guards de estoque verdes (`inventory-write-paths-guard`, `inventory-unique-backstops-db`, `inventory-balance-lock-race-db`) | `src/modules/inventory/**`, `src/modules/mobile/**`, `tests/b-o6r-11-*`, `tests/inventory-*`, `tests/mobile-backend-contracts.test.ts`, `prisma/**` (leitura), `src/modules/core-saas/permissions/catalog.ts` (leitura) |
| **C3 — fail-closed Dart, replay de material e escopo/registro** | (1) `dart format --set-exit-if-changed`, `flutter analyze`, suíte inteira na versão do CI; RM4/RM5 + M-M6..M-M10; os 6 testes de B.68; (2) `git diff --name-only origin/main` cruzado com §4+§E5 (nenhum PROIBIDO; `sync_models.dart` sem status novo; `pubspec` intocado); sonda P4 provada por comando; (3) registro: `P-MOBILE-MATERIAL-SEM-REPLAY` FECHADA com evidência, nenhuma `P-MOBILE-DESPESA-CONFLICT-REENVIADO`, `P-O6R-B11`/11c/PLANO_SAN3 conforme §E4 item 5; `Kpis/` intocado; promessa do PR × diff | `**` |

- **Inelegíveis:** o dev das fatias, este planejador e o antecessor, quem pré-revisou. **Pré-revisor** roda a bateria de F7b e
  **todas** as mutações (M1-M9, M-D1, M-D2, M-M1..M-M11), uma por vez, num worktree próprio com `npm ci` próprio e **sem junction**.

#### E5.6 O que pede Docker (e o que não pede)

- **Pede:** F-M3 (`tests/b-o6r-11-material-sync-db.test.ts`) e a cadeira C2 (re-executa RM3 e os `inventory-*-db`), cada um num
  **Postgres descartável próprio** (cluster por jurado, `D-INSPETOR-TERRENO-JUNTA`), **nunca** a base viva (`erp-*`, 5432). O
  orquestrador fornece a URL ao dev em F-M3; o inspetor, aos jurados. Teto de 2 trabalhos Docker ao mesmo tempo (P8(c)).
- **Não pede:** tudo o mais — RM1/RM2 em memória (`CORE_SAAS_PERSISTENCE` fixado como no arnês de contrato), Flutter inteiro com
  Drift em memória (`NativeDatabase.memory()`), mutações, vermelhos-controle.
- **Disco:** `npm ci` no worktree do bloco cerca de 0,8-1,2 GB; `flutter pub get` + `.dart_tool` cerca de 1-2 GB; Postgres
  descartável cerca de 0,3 GB. Com 24 GB livres hoje, o piso de 7,5 GB não é ameaçado; mede-se em F0 e antes de F7b.

---

### §E6 — Mapa de substituição (o que desta emenda substitui o quê no plano original; o plano não é editado)

| Plano original | Substituído por |
|---|---|
| §0.33 ("comportamento pré-existente … afeta o destino `conflict` do resgate para ações de despesa") e §0.34 (`inventory.material_add` sem replay; "enviá-la é outro bloco") | §E1 e §E2: os dois entram no bloco; nome do tipo corrigido para `work_order_material.add` |
| §2, P3 ("vira visível e decidível pelo técnico, nunca descartada nem reenviada às cegas") | P3 passa a: *"… vira **reenviada automaticamente** quando o backend é duravelmente idempotente para o tipo (despesa, material), e **visível e decidível** nos demais; nunca descartada; nunca reenviada às cegas onde o servidor pode duplicar"* |
| §3 item 3 (resgate → `conflict` para tudo; parágrafo sobre despesa e R-j) | §E3 (destino por tipo) |
| §3 opção E ("descartada: resgate para `pending`") | adotada **parcialmente**: `pending` só para despesa e material, com a prova de idempotência durável (B.31, RM1-RM3) |
| §4 PERMITIDO/PROIBIDO | §E5.1/E5.2 (acrescenta; `sync_replay_service.dart` só a linha `:150`) |
| §5 R3 (critério com 3 semeadas, caso (g) "pré-existente") | §E3 (5 semeadas; (b)/(c)/(f) são requisitos; 7 mutações) |
| §5 R6 (criar `P-MOBILE-DESPESA-CONFLICT-REENVIADO` e `P-MOBILE-MATERIAL-SEM-REPLAY`; `P-MOBILE-SYNC-INTERROMPIDO-REENVIO-MANUAL` para todo tipo; 11c para todo tipo) | §E4 item 5 |
| §6 fatias F4, F6, F7 (e total 8/250 min) | §E5.3 (F4b, F6b, F7b, F-D1, F-M1..F-M6; 15 fatias/≈560 min) |
| §7 (M ≥ 923, só Flutter) | §E5.4 (M_f ≥ 933; M_b ≥ N_b + 18) |
| §8 cadeiras C1/C2/C3 | §E5.5 (C2 vira cadeira de banco/RBAC; mandatos redistribuídos) |
| §9 R-j e R-k (riscos com "alternativa de 1 linha" e "bloco da trilha de estoque") | **fechados** por RD1 e RM1-RM5. Riscos **novos**: **R-l** a OS nunca sincroniza e o material fica `pending` para sempre (visível como Pendente; dono: o conflito da OS, 11c) — não é encalhe silencioso; **R-m** SKU do catálogo semente não existe no estoque da organização → `conflict` visível (Q3); **R-n** `assertWorkOrderReference` chama `createDefaultWorkOrderService().get` por material — custo por ação; aceitável no lote ≤ 50 (`MAX_BATCH_SIZE`), declarado; **R-o** o técnico sem `work_orders:update` (papel `technician` tem? **não medido** — comando: `git show origin/main:src/modules/core-saas/permissions/catalog.ts \| sed -n '586,634p'`) recebe `rejected permission_required` por ação, visível; **R-p** custódia BASE para peça que saiu do carro do técnico (Q2) |
| §10 linhas "Replay de despesas reenvia `conflict` (fora, salvo emenda)" e "`inventory.material_add` sem replay (fora)" | **dentro**, este bloco |
| §10 "Idempotência durável … reenvio automático das resgatadas por tipo → 11c" | 11c **reduzido** a OS, vistoria e evidência |

**Rollback (complementa o plano §9):** `git revert` do squash. Backend: sem migração; o `source_type = 'work_order_material'` gravado
continua válido no índice (TEXT livre) e aparece na listagem de movimentos como `saida` com `reason baixa_material_os` — nada a
desfazer no banco. App: ações já marcadas `pending`/`conflict` com `SYNC_INTERRUPTED` continuam decidíveis/reenviáveis com o código
antigo (status existentes); ações de material já `synced` ficam `synced`.

---

### §E7 — Perguntas ao dono (só o que não dá para medir), cada uma com recomendação

A fala do dono — *"B-O6R-11 faça o reenvio de despesas e o material do estoque tambem é reenviado"*, *"nada de deixar
pedencias"* — admite as duas leituras de despesa (L1, L2); o desenho de §E1 **atende as duas** sem dobro, então **não** há pergunta
sobre isso. As perguntas abaixo são decisões de produto que a medição não resolve.

**Q1 — `expense_receipt.attach`: o app enfileira um tipo que o backend de sync recusa, e a recusa derruba o lote inteiro.**
Fato (B.55/B.65): `ExpenseSyncActionTypes.supported` tem 4 tipos (`api_contracts.dart:71-76`); `EXPENSE_SYNC_ACTION_TYPES` do
backend tem 3 (`expense-sync.ts:32`); `prepareSyncAction` lança 400 para o lote (`:202`). Um recibo anexado offline faz **todas** as
despesas do lote voltarem `failed` até `maxRetry = 5`. Isso **não** é "reenvio de despesa" nem "material" — é um 3º item que o dono
não nomeou, e consertá-lo toca `src/modules/expense-management/**` (dinheiro) ou o conjunto de tipos do app.
**Recomendação:** fica com o **`B-O6R-03b`** (sync de RDV, que já vai ligar o token — `PLANO_SAN3.md:291`), registrado por este
bloco como pendência **nomeada e com dono** (`P-MOBILE-RECIBO-DESPESA-TIPO-NAO-ACEITO`, ALTA). Se o dono preferir "aqui", o custo
é +1 fatia no backend de despesa (aceitar o tipo ou responder `rejected` por ação em vez de 400 no lote) **e** a junta ganha uma
cadeira de dinheiro.

**Q2 — De qual custódia sai o material que o técnico lançou: BASE ou PROFISSIONAL?**
Fato: o seam só grava custódia BASE (`inventory.types.ts:317`; `inventory-prisma.repository.ts:449-451`); o "estoque do técnico" no
app ainda é catálogo semente (B.7) e o bloco que traria o estoque por custódia do profissional (`B-SAN3-15`) não começou (B.44).
**Recomendação:** **BASE agora**, declarado no contrato (`docs/mobile-sync-contracts.md`) e em `P-O6R-B11`; o `B-SAN3-15` passa a
custódia PROFISSIONAL quando o app souber de qual custódia a peça saiu. Alternativa (não recomendada): esperar o SAN3-15 — deixaria
o material sem reenvio, contra a fala do dono.

**Q3 — Material com SKU que não existe no estoque da organização: `conflict` visível ao técnico, ou outra coisa?**
Fato: o catálogo semente do app tem SKUs (`ELE-0102`…) que podem não existir em `inventory_items` do tenant; o backend responde
`rejected inventory_item_not_found` (fail-closed).
**Recomendação:** `conflict` visível ("Peça não cadastrada no estoque da organização (SKU X)"), com "Versao do gestor" descartando e
"Minha versao" reenviando depois que o gestor cadastrar a peça. **Nunca** criar item a partir do campo. Alternativa: `failed`
silencioso até `maxRetry` — é o encalhe que o plano rejeita.

**Q4 — Tamanho: o bloco vai de 8 para 15 fatias e passa a tocar backend. Um PR ou dois?**
Fato: material exige backend (§E2); dividir em 2 PRs (11 app-fila/despesa + 11-material backend+app) dobra inspetor/junta/porteiro e
cria uma janela em que o replay de material existe no app sem o backend (ou vice-versa).
**Recomendação:** **UM PR**, com as fatias na ordem de §E5.3 (backend antes do replay no app, resgate por último) e **uma** junta
completa com a C2 de banco. Risco declarado: PR grande para 3 cadeiras; mitigação é o mandato ≤ 3 itens por cadeira e o pré-revisor
rodando todas as mutações.

**Q5 — `technician` (papel distinto de `field_technician`) também lança material?**
Fato: não medi o bloco `technician:` do catálogo (`catalog.ts:586-634`) quanto a `work_orders:update`. Se não tiver, recebe
`rejected permission_required` por ação (visível). **Recomendação:** o dev mede em F-M2 (comando em §E6 R-o) e registra; a regra
"material sob `work_orders:update`" vale para quem a tiver — nenhuma redistribuição de permissão neste bloco (B.56).

---

**Fecho da RETOMADA 2 (P2).** Emenda completa: §E0-bis (B.1–B.70, todas re-executadas ou novas, nenhuma herdada), §E1 (despesa:
L1 + L2 sem dobro), §E2 (material: contrato, payload, RBAC, idempotência, 04a/04b, backend entra), §E3 (destino por tipo), §E4
(mudanças), §E5 (escopo, 15 fatias, M_f ≥ 933 / M_b ≥ N_b + 18, junta completa unânime com crítico antes do dev, Docker só em F-M3 e
C2), §E6 (substituições e riscos novos), §E7 (5 perguntas com recomendação). Modelo que rodou: **Fable (claude-fable-5-1), sem
fallback**. Nenhum commit, push, Docker, base viva ou arquivo rastreado tocado; disco 24 GB livres no fim.
