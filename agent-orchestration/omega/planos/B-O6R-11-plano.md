# PLANO — B-O6R-11 · contratos do app de campo com a OS (`Ω6R-QUA-004` + `Ω6R-QUA-005`, `P-O6R-B11`)

> **Papel:** `planejador-mestre` · **Modelo que rodou:** Fable 5.1 (`claude-fable-5-1`) — sem fallback.
> **Corpo aplicado:** o da ref `origin/main@02bd7dab` (`MSYS_NO_PATHCONV=1 git show origin/main:.claude/agents/planejador-mestre.md`),
> não o da árvore da sessão.
> **Instância:** 2ª. A 1ª instância caiu logo no começo e deixou só o índice de seções (1,7 KB; cópia intacta em
> `PLANO-B-O6R-11.parcial-instancia1.md`). **Nada dela é fato herdado** — o índice foi reaproveitado; toda medição abaixo
> foi executada por esta instância, com comando → saída.
> **Terreno:** worktree `.claude/worktrees/b11`, branch `fix/mobile-work-order-contracts`, HEAD `3e05fb5a`
> (= `origin/main@02bd7dab` + o comando do bloco). Somente leitura para o planejador (nenhum arquivo do worktree foi
> escrito; nenhum `stash/checkout/reset/clean`).
> **Estado deste arquivo:** COMPLETO (gravado incrementalmente, P2; 15 seções; a seção 15 é o log bruto).

## 0. Índice
1. Objetivo · ator · fluxo origem→destino
2. Medição A — leituras de resposta da API que ignoram o envelope `{ data }` (grep sobre `mobile/flutter_app/lib`)
3. Medição B — enfileiramentos na fila local sem `await` (grep sobre `mobile/flutter_app/lib`)
4. Medição C — o campo que o backend lê na atribuição (`src/modules/work-orders/**`)
5. Medição D — fila local: `SyncQueueRepository` / `DriftSyncActionStore` (read-modify-write, durabilidade)
6. Fronteira: dentro × fora (pendências nomeadas com dono)
7. Contrato (rotas · payloads · envelope · códigos)
8. Modelagem (sem migração; invariantes B-108 e idempotência)
9. Conserto, ocorrência por ocorrência (arquivos exatos, regra do espelho)
10. Testes de encerramento — baseline N, meta M≥2N, vermelho-controle no head-base
11. CE-G1 / CE-G2
12. Bateria exata (forma esperada)
13. Riscos + rollback
14. Junta (unanimidade de 3) · rito · KPI
15. Registro de medições (log bruto)

## 1. Objetivo · ator · fluxo origem→destino

**Objetivo.** Fechar os dois achados do item 3 do gate (`P-O6R-B11`), sem tocar backend nem telas:

- `Ω6R-QUA-004` (componentes ainda abertos após o #351): **detalhe**, **status** e **atribuição** da OS pelo REST leem o
  envelope `{ data }` como se fosse o corpo, com parser snake_case sobre um DTO camelCase, e a atribuição envia campo que o
  backend não lê. A medição desta instância acrescenta um quarto componente **no mesmo arquivo e na mesma função**: o
  vocabulário de status do backend (`open, assigned, accepted, on_route, on_site, in_progress`) cai em `scheduled` no
  parser compartilhado pela lista **viva** do B-099 (§2, ocorrência A-08) — "status sai errado" é literalmente o achado.
- `Ω6R-QUA-005`: `PrestadorRepository.addSelection` enfileira N ações num `forEach` sem `await` sobre uma fila
  read-modify-write; retorna antes de gravar e as N gravações se sobrescrevem.

**Ator.** Técnico de campo (`field_technician`) no app: lê a OS (`work_orders:read`), muda status (`work_orders:status`,
sob escopo por objeto do 07a), lança material (fila local). A **atribuição** REST exige `work_orders:assign`, que o
técnico e o `operator` **não têm** — só `field_dispatcher`, `manager`, `tenant_admin` (§11, CE-G2). O teste de atribuição
deste bloco é de **contrato** (payload/envelope), não de papel.

**Fluxo A (REST da OS).** tela → `WorkOrderRepository` (chamador futuro — hoje **zero chamadores** em `lib/`, medido em
§15.L4) → `DioWorkOrderRemoteApi.{fetchWorkOrder, updateWorkOrderStatus, assignWorkOrder}` → Dio → backend
`work-order.routes.ts` → `controller.{get, changeStatus, assign}` → `sendResult` (`routes.ts:290`:
`result.body ?? { data: result.data }`) → `{ data: toWorkOrderDto(...) }` camelCase, **sem `tenantId`** (§2.8) → parser
do app → `WorkOrder`.

**Fluxo B (material do prestador).** `TechnicianStockScreen` → `PrestadorRepository.addSelection` →
`mergeMaterials` → `saveMaterial` ×N (Drift) → `SyncQueueRepository.enqueue` ×N →
`PersistentSyncQueueRepository` (load → dedupe → save da fila INTEIRA) → `DriftSyncActionStore.save`
(`DELETE FROM sync_actions` + INSERT ×N numa transação) → `sync_actions` (PK `client_action_id`) → replay futuro por
`/api/v1/mobile/sync/inventory-actions` (`work_order_material.add`).

## 2. Medição A — leituras de resposta da API que ignoram o envelope `{ data }`

**Comando (gerado do código, não de lista curada):**
```
rg -n "_dio\.(get|post|patch|put|delete)|\.data[!?]?\[|\.data!|resp\.data|response\.data|res\.data" mobile/flutter_app/lib -g '*.dart'
```
**Saída:** 44 linhas (§15.L1). Excluídas 5 de `snapshot.data!` (FutureBuilder, não HTTP: `technician_stock_screen:83`,
`checklist_comparison_screen:131`, `checklist_run_screen:196`, `work_order_conclusion_screen:111`,
`work_order_execute_screen:239`) e 8 que são só a chamada Dio, sem leitura (`work_order_remote_api:76,96,111,127,148,168`,
`registry_options_remote_api:32,52`). Restam **31 sítios de leitura**, cada um cruzado com a forma REAL que o backend
devolve (medida em §15.L5–L8).

| # | Sítio (arquivo:linha) | Backend devolve (medido) | O app lê | Veredito | Efeito |
|---|---|---|---|---|---|
| A-01 | `core/bootstrap/bootstrap_repository.dart:450` | `{data:{contract,mobile_app,…}}` (`mobile.routes.ts:81`) | `bootstrapSessionFromJson` desembrulha `data` (`:183-185`) | CERTO | — |
| A-02 | `bootstrap_repository.dart:473` | idem | idem | CERTO | — |
| A-03 | `core/auth/auth_repository.dart:191` | login (`auth.routes.ts:123`) | `_sessionFromJson` tolera `data` (`:249-250`) | CERTO (tolerante) | — |
| A-04 | `auth_repository.dart:210` | refresh | idem | CERTO (tolerante) | — |
| A-05 | `core/evidence/evidence_upload.dart:114` | 201 `{data:…}` (`mobile.routes.ts:189`) | `fromBody` desembrulha (`:57`) | CERTO | — |
| A-06 | `core/evidence/evidence_sync.dart:261` | `{data:…}` (`:180`) | codec desembrulha (`:90`) | CERTO | — |
| A-07 | `core/telemetry/telemetry_api.dart:40` | `{data:…}` (`:200`) | codec desembrulha (`telemetry_codec.dart:42`) | CERTO | — |
| A-08 | `features/work_orders/data/work_order_remote_api.dart:79` (lista) | `{items,pagination}` **sem** envelope (`controller.list` devolve `body`; `dto.ts:121-151`) | `data['items']` — envelope OK; **status** por `workOrderStatusFromApiValue` (`:255-264`): só `pending_approval` é traduzido; `open/assigned/accepted/on_route/on_site/in_progress` caem em `scheduled` | **ERRADO (status)** — VIVO (o pull do B-099 é o único caminho remoto de OS ligado: `workOrderRemoteApiProvider`, `work_order_repository.dart:692-696`) | toda OS do backend aparece "Agendada", salvo `paused/completed/cancelled/rejected` |
| A-09 | `work_order_remote_api.dart:99` (detalhe) | `{data: toWorkOrderDto}` camelCase, +`links`, +`checklists`, sem `tenantId` (`controller.get:52-59`) | `_workOrderFromJson(resp.data!)` — envelope inteiro; parser snake_case (`:223-253`) faz `json['tenant_id'] as String` | **ERRADO** — latente (0 chamadores) | `TypeError` (null não é String) fora do `on DioException` |
| A-10 | `work_order_remote_api.dart:115` (status) | `{data: toWorkOrderDto}` (`controller.changeStatus:139-140`) | idem A-09 | **ERRADO** — latente | idem; e o **pedido** manda `status.name` (`inService`) → `parseWorkOrderStatus` só aceita os 10 nomes do backend (`validators.ts:74-82`) → 400 `invalid_status` em 8 dos 12 valores do app |
| A-11 | `work_order_remote_api.dart:130` (timeline) | `{data:[…]}` | `resp.data?['data']` | CERTO (#351) | — |
| A-12 | `work_order_remote_api.dart:156` (assign) | `{data: toWorkOrderDto}` (`controller.assign:216-218`) | idem A-09 | **ERRADO** — latente | idem; e o **pedido** manda `user_id`+`note`; o backend lê `operatorId ?? userId` e `message` (§4) → 400 antes de qualquer efeito |
| A-13 | `work_order_remote_api.dart:168` (approval, `post<void>`) | **rota inexistente**: `approval-requests` = 0 ocorrências em `src/**` (§15.L10) | não lê | fora da propriedade (não lê envelope); 404 garantido; 0 chamadores | pendência P5 (§6) |
| A-14 | `features/work_orders/data/registry_options_remote_api.dart:36` | `{data:{items}}` | `_items` tolera `data`/`items`/lista (`:65-72`) | CERTO | — |
| A-15 | `registry_options_remote_api.dart:55` | idem | idem | CERTO | — |
| A-16 | `core/location/field_location_api.dart:40` | `sendResult` → `{data}` (`field-location.routes.ts:58-59`) | tolera `data` ou raiz (`:41-42`) | CERTO | — |
| A-17 | `features/expenses/data/expense_remote_api.dart:75` (policies) | `{items,pagination}` sem envelope (`controller.listPolicies` devolve `body`; `toListDto`, `dto.ts:91-99`) | `_policyFromJson(map)` lê `json['version'] as String` na raiz (`:178-190`) | **ERRADO** — latente (`DioExpenseRemoteApi(` nunca construído em `lib/`, §15.L9) | `TypeError` |
| A-18 | `expense_remote_api.dart:85` (categories) | `{items,pagination}` (Map) | `response.data as List<dynamic>` | **ERRADO** — latente | cast estoura |
| A-19 | `expense_remote_api.dart:98` (reports) | `{items,pagination}` (Map) | `as List<dynamic>` | **ERRADO** — latente | cast estoura |
| A-20 | `expense_remote_api.dart:116` (createReport) | 201 `{data: dto}` (`controller:54`) | `ExpenseReportCodec.fromJson(response.data as Map)` — lê a raiz (`expense_local_store.dart:106-117`, sem `data`) | **ERRADO** — latente | campos nulos → cast estoura |
| A-21 | `expense_remote_api.dart:128` (getReport) | `{data: dto}` (`:60`) | idem | **ERRADO** — latente | idem |
| A-22 | `expense_remote_api.dart:142` (patchReport) | `{data: dto}` (`:67`) | idem | **ERRADO** — latente | idem |
| A-23 | `expense_remote_api.dart:158` (createItem) | 201 `{data: itemDto}` (`:82`) | `_itemFromJson(response.data as Map)` raiz | **ERRADO** — latente | idem |
| A-24 | `expense_remote_api.dart:170` (submitReport) | `{data: dto}` (`:97`) | `fromJson` raiz | **ERRADO** — latente | idem |
| A-25 | `core/sync/sync_replay_service.dart:94` (sync despesas) | `{data: toSyncExpenseActionsDto}` (`controller:112`) | tolera `data.results`/`results` (`:95-100`) | CERTO | — |
| A-26 | `sync_replay_service.dart:573` (sync OS) | `{data:…}` (`mobile.routes.ts:144`) | codec desembrulha (`:307`) | CERTO | — |
| A-27 | `sync_replay_service.dart:1267` (sync checklist) | `{data:…}` (`:153`) | codec desembrulha (`:892`) | CERTO | — |
| A-28 | `features/checklists/data/checklist_attachment_upload.dart:103` | `sendResult` | `fromBody` desembrulha (`:52`) | CERTO | — |
| A-29 | `checklist_remote_api.dart:173` (available) | — | tolera `checklists`/`items`/`data` (`:175-177`) | CERTO | — |
| A-30 | `checklist_remote_api.dart:200` (runs) | `sendResult` (`checklist.routes.ts:116-121`) | tolera `data`/`runs`/`items` (`:201`) | CERTO | — |
| A-31 | `checklist_remote_api.dart:218` (render) | `{data:{…}}` | desembrulha (`:219-220`) | CERTO | — |
| A-32 | `checklist_remote_api.dart:256` (createRun) | `sendResult` (`checklist.routes.ts:124-127`) → `{data:…}` salvo se o controller devolver `body` (**não medido**: `controller.createChecklistRun`) | `body['runId'] as String` na raiz | **A MEDIR / provável ERRADO** — código morto (`.createRun(` = 0 chamadores em `lib/`, desde o PR-B) | pendência P2 (§6) |

**Totais da Medição A:** 31 sítios de leitura + 1 chamada sem leitura (A-13). **CERTO: 18.** **ERRADO dentro da
fronteira: 4** (A-08, A-09, A-10, A-12) — mais **2 defeitos de PEDIDO** no mesmo arquivo (corpo do PATCH `/status` com
`status.name`; corpo do POST `/assign` com `user_id`/`note`). **ERRADO fora da fronteira: 8** (A-17..A-24, todos
latentes, dono `B-O6R-03b`). **A medir: 1** (A-32, código morto). **Fora da propriedade: 1** (A-13, rota inexistente).

> **Nota de honestidade sobre o impacto.** Os três métodos REST do achado (`fetchWorkOrder`, `updateWorkOrderStatus`,
> `assignWorkOrder`) **não têm chamador em `lib/`** (§15.L4). O caminho VIVO de status e atribuição é a fila
> (`work_order.status_update` → `work_order.status_change`, `work_order.assign` → `/mobile/sync/work-order-actions`),
> que **já traduz o vocabulário** (`WorkOrderSyncCodec._backendStatus`, `sync_replay_service.dart:472-480`, privado).
> O que está vivo e errado hoje é o **status da lista** (A-08). Os blocos seguintes da frente 4 vão ligar o REST:
> `B-SAN3-13` (lista com `assignedUserId`) e `B-SAN3-26` (check-in pelo `PATCH /status` — o CE-7 nomeia o PATCH como uma
> das duas entradas). Este bloco é o pré-requisito deles; o gate o lista como item 3.

## 3. Medição B — enfileiramentos na fila local sem `await`

**Comandos:**
```
rg -n "enqueue\(|enqueueAll\(|\.forEach\(|unawaited\(|\.then\(" mobile/flutter_app/lib -g '*.dart'
rg -n "forEach\(.*async|\.map\(.*async|Future\.wait|Lock\(|Mutex|synchronized" mobile/flutter_app/lib -g '*.dart'
```
**Saída:** 31 + 2 linhas (§15.L2). Excluídas 6 declarações (`sync_queue_repository.dart:5,17,74`,
`telemetry_local_store.dart:15,49,102`). **Sítios de chamada de `enqueue`: 22.**

| # | Sítio | `await`? | Veredito |
|---|---|---|---|
| B-01..02 | `features/inventory/data/inventory_repository.dart:105,159` | sim | CERTO |
| B-03..04 | `core/telemetry/telemetry_capture_service.dart:179,250` (store de telemetria) | sim | CERTO |
| B-05..11 | `features/work_orders/data/work_order_repository.dart:259,333,391,452,497,618,660` | sim (7) | CERTO |
| **B-12** | **`features/prestador/data/prestador_repository.dart:132`**, dentro de `selection.forEach((sku, qty) { … })` (`:121-133`) | **NÃO** — `Map.forEach` recebe callback `void`; a `Future` de `enqueue` é descartada | **ERRADO** — VIVO (`TechnicianStockScreen` → `addSelection`) |
| B-13..16 | `features/expenses/data/expense_repository.dart:130,191,217,278` | sim (4) | CERTO |
| B-17..22 | `features/checklists/data/checklist_repository.dart:526,576,623,709,752,834` | sim (6) | CERTO |

Outros padrões: `prestador_models.dart:71` `selection.forEach` dentro de `mergeMaterials` — callback síncrono, sem
`Future` (CERTO); `connectivity_bridge.dart:100` `.then(` — sondagem de conectividade, não enfileira (fora da
propriedade; observação, sem pendência); `unawaited(` = 0; `forEach(.*async` / `.map(.*async` = 0; `Future.wait` só em
`home_screen:109` e `auth_token_storage:90` (não enfileiram); nenhum `Lock`/`Mutex` em `lib/core/sync`.

**Totais da Medição B:** 22 chamadas; **1 sem `await` (B-12), dentro da fronteira; 0 fora.**

**Mecanismo do dano (com a Medição D):** `addSelection` retorna e notifica antes de qualquer `save`; cada `enqueue`
faz `load()` → `save([...snapshot, ação])`; três chamadas sem await veem o MESMO snapshot e a última `save` vence →
**N SKUs viram 1**. Com `InMemorySyncActionStore` é determinístico (`load()` captura `_actions` sincronamente); com
Drift os três `load()` reais correm antes de qualquer `save` — mesmo resultado. Reinício logo após o retorno → **0**.

## 4. Medição C — o campo que o backend lê na atribuição

- Rota: `POST /api/v1/work-orders/:workOrderId/assign` — `requirePermission("work_orders:assign")`
  (`work-order.routes.ts:195-199`) → `controller.assign` (`:195-218`, devolve `{ data: toWorkOrderDto(workOrder) }`) →
  `service.assign(actor, id, body)` (`work-order.service.ts:1669-1717`).
- **Campos lidos** (`:1676-1688`): `operatorId: parseRequiredUuid(body.operatorId ?? body.userId, "operatorId")`;
  `userId: parseOptionalUuid(body.userId, "userId")`; `vehicleId ?? vehicle_id`; `teamId ?? team_id`;
  `message: optionalString(body.message) ?? "Ordem de servico atribuida."`. Transição: `assertStatusTransition(current,
  "assigned")` → **409** `invalid_status_transition` (`validators.ts:103-112`).
- **Escrita** (`work-order-prisma.repository.ts:531-537,545-547`): `assigned_operator_id = operatorId`,
  `assigned_user_id = userId ?? null`, `status = "assigned"`; `work_order_assignments.{operator_id,user_id}`.
- **O app manda** (`work_order_remote_api.dart:150-154`): `{'user_id': userId, 'note': …}` → nenhum dos dois é lido →
  `parseRequiredUuid(undefined)` → `assertNonEmptyString` → **400 `WORK_ORDER_INVALID`** antes de qualquer efeito.
- **Campo a enviar: `userId`** (camelCase). Ele preenche **os dois**: `assigned_operator_id` (pelo fallback
  `?? body.userId`) e `assigned_user_id` (o que o DTO da lista expõe como `assignedUserId`, `dto.ts:136`, e que o
  `B-SAN3-13` vai filtrar). Não enviar `operatorId` explícito: o fallback é o contrato documentado para o app
  (`service.ts:817-827`) e, quando o backend passar a resolver o perfil do operador a partir do usuário, `userId` continua
  correto. `note` → `message`.
- Comparação com a fila (vivo): `mobile-work-order-sync.ts:227-232` lê `action.payload.operator_id` (snake) e repassa
  como `operatorId`; o app põe `operator_id = wo.assignedUserId` (`work_order_repository.dart:282,303`) — o mesmo id de
  usuário. Consistente com `userId` no REST.
- **Residual fora da fronteira (backend):** `assigned_operator_id` recebe um id de USUÁRIO ("o write continua torto e é do
  `Ω6R-QUA-004`", `service.ts:827`) — `src/**` é proibido aqui → pendência P3 (§6).

## 5. Medição D — fila local (`SyncQueueRepository` / `DriftSyncActionStore`)

- `PersistentSyncQueueRepository.enqueue` (`sync_queue_repository.dart:17-34`): valida `tenantId`; `load()`; dedupe por
  `clientActionId`; `save([...actions, action])`. `update` (`:58-67`): `load()` → substitui → `save`. **Read-modify-write
  da fila inteira, sem serialização.** Leituras (`pendingForTenant`, `actionsForTenant`) só fazem `load()`.
- `DriftSyncActionStore` (`drift_sync_action_store.dart`): `load` = `SELECT … ORDER BY created_at, rowid` (`:20-25`);
  `save` = `DELETE FROM sync_actions` + INSERT ×N **numa transação** (`:30-55`) — atômica por `save`, mas `load`+`save`
  não são uma unidade. Tabela: `client_action_id TEXT NOT NULL PRIMARY KEY` (`app_database.dart:242-243`).
- Uma instância em runtime: `syncQueueRepositoryProvider` (`sync_providers.dart:32-34`), partilhada por
  `SyncReplayService`, `WorkOrderSyncReplayService`, `ChecklistSyncReplayService`, `EvidenceSyncReplayService`,
  `WorkOrderConflictResolutionService` e os repositórios de feature. Logo, além do `forEach`, **qualquer par de mutações
  concorrentes na mesma instância** (ex.: `update` do replay em segundo plano × `enqueue` do usuário) pode perder uma
  linha — a classe nomeada no achado ("vários SKUs podem sobrescrever fila"), mesmo mecanismo.
- Implementadores em teste de `SyncQueueRepository` (fakes com `implements`): 8 arquivos (`b121:87, b106:672, b091:88,
  b099:54, b105:748, b100:164, b090b:24, b103:68`). **Qualquer membro novo na interface quebra os 8** (`implements` exige
  todos os membros, inclusive os concretos). Pesou na decisão do §9.

## 6. Fronteira: dentro × fora

**Dentro (escopo permitido do comando):**
- `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart` — A-08 (vocabulário), A-09, A-10, A-12
  (envelope + casing), corpo do PATCH `/status`, corpo do POST `/assign`, tenant de sessão nos três métodos.
- `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart` — B-12.
- `mobile/flutter_app/lib/core/sync/sync_queue_repository.dart` — serialização das mutações (Medição D).
- `mobile/flutter_app/lib/core/local_db/drift_sync_action_store.dart` — **sem alteração prevista** (o `save` já é
  transacional). Fica autorizado só se o teste T2 exigir ajuste de leitura/ordem; o dev declara no PR o motivo.
- `mobile/flutter_app/test/**` — 4 arquivos novos (§10) + 2 fakes existentes que implementam `WorkOrderRemoteApi`
  (`b099_real_work_orders_pull_test.dart:17-48`, `b121_mobile_hardening_test.dart:57+`) ganham o parâmetro opcional
  `tenantId` nos três métodos.
- `agent-orchestration/**`, `Kpis/**` — registro e KPI.

**Fora — pendências nomeadas com dono.** O dev NÃO as conserta; o orquestrador as registra em
`agent-orchestration/controle/pendencias.md` (seção "Pendências abertas por `B-O6R-11`") no PR deste bloco:

| ID | O quê | Evidência | Estado | Dono |
|---|---|---|---|---|
| P1 `P-MOBILE-EXPENSE-ENVELOPE` | 8 leituras de `expense_remote_api.dart` (A-17..A-24): lista lida como `List` sobre `{items,pagination}`; `{data:{…}}` lido como corpo | §2; `DioExpenseRemoteApi(` = 0 construções em `lib/` (§15.L9) | latente | `B-O6R-03b` (`fix/mobile-rdv-sync`, fronteira `features/expenses/**`) |
| P2 `P-MOBILE-CHECKLIST-CREATE-RUN-MORTO` | `checklist_remote_api.dart:243-262` lê `runId` na raiz de um `sendResult`; método sem chamador desde o PR-B | A-32; `.createRun(` = 0 em `lib/` | código morto | a nomear pelo orquestrador (nenhum bloco SAN3 tem `features/checklists/data/**` na fronteira); sugestão: apagar no próximo bloco que tocar checklists do app; BAIXA |
| P3 `P-WO-ASSIGN-OPERATOR-ID-TORTO` | `assigned_operator_id` recebe id de usuário via fallback `operatorId ?? userId`; o backend deveria resolver o perfil do operador a partir do usuário | `work-order.service.ts:817-827,1684` | vivo (backend) | `B-O6R-07c` (dono do guard dual-match em `service.ts:812-839`); a junta ratifica |
| P4 `P-MOBILE-MATERIAL-E-FILA-NAO-ATOMICOS` | `addSelection` grava N materiais e depois N ações em transações separadas (mesmo `AppDatabase`); crash entre os dois deixa material local sem ação | `prestador_repository.dart:117-133`; `PrestadorLocalStore`/`SyncQueueRepository` não expõem transação | residual após este bloco | `B-SAN3-15` (fronteira `features/prestador/**`; troca também o catálogo semente pelo estoque real) |
| P5 `P-MOBILE-APPROVAL-REQUEST-REST-404` | `createApprovalRequest` REST (`work_order_remote_api.dart:162-180`) posta em `/work-orders/:id/approval-requests`, rota que **não existe** em `src/**`; 0 chamadores do método remoto | §15.L10 | código morto | `B-SAN3-16` (item 5 do gate: "pedir aprovação" pela fila) |
| P6 `P-MOBILE-STATUS-ACCEPTED-LOSSY` | `accepted` (backend) → `dispatched` (app): o app não distingue "atribuída" de "aceita" | vocabulários (§7) | decisão de produto | `B-SAN3-13`/`B-SAN3-14` |
| P7 `P-MOBILE-FILA-RMW-STORE` | a serialização do §9 protege UMA instância do repositório; o conserto definitivo é `append`/upsert atômico em `SyncActionStore` (`sync_action_store.dart`, fora do escopo) | Medição D | residual | `B-SAN3-16` (fila drenada; toca `sync_replay_service.dart`) |

## 7. Contrato (rotas · payloads · envelope · códigos)

**REST da OS (o que o app passa a cumprir):**

| Rota | Permissão (rota) | Pedido do app | Resposta | Códigos |
|---|---|---|---|---|
| `GET /api/v1/work-orders/:id` | `work_orders:read` (`routes.ts:120-121`) | — | 200 `{data: WorkOrderDto}` camelCase; pode trazer `links` e `checklists` (ignorados por leitura nomeada); **sem `tenantId`** | 404 `WORK_ORDER_NOT_FOUND` (cross-tenant cai aqui: `findById` tenant-scoped); 401/403 → `ApiUnauthorizedError` |
| `PATCH /api/v1/work-orders/:id/status` | `work_orders:status` (`:136-137`) + escopo por objeto do 07a (técnico só na OS atribuída → 403 `not_assigned_to_actor`) | `{status: <vocabulário do backend>}` | 200 `{data: WorkOrderDto}` | 400 `invalid_status`; **409** `invalid_status_transition` (`validators.ts:103-112`; o app já mapeia 409 → `ApiConflictError`, `http_client.dart:80`); 404; 403 |
| `POST /api/v1/work-orders/:id/assign` | `work_orders:assign` (`:196-197`) — **técnico e operator não têm** (§11) | `{userId, message?}` (`vehicleId`/`teamId` opcionais, não usados por este método) | 200 `{data: WorkOrderDto}` (status `assigned`) | 400 `invalid_uuid`/obrigatório; 409 transição; 404; 403 |
| `GET /api/v1/work-orders` (lista, já certa no envelope) | `work_orders:read` | — | 200 `{items:[…], pagination}` **sem** envelope | — |

**Tabela de status — dois sentidos (nova no `work_order_remote_api.dart`, espelho do `_backendStatus` do codec):**

| App (`WorkOrderStatus`) | → backend (PATCH) | Backend → app (parser) |
|---|---|---|
| `scheduled` | `open` | `open` → `scheduled` |
| `dispatched` | `assigned` | `assigned` → `dispatched`; `accepted` → `dispatched` (**lossy**, P6) |
| `enRoute` | `on_route` | `on_route` → `enRoute` |
| `arrived` | `on_site` | `on_site` → `arrived` |
| `inService` | `in_progress` | `in_progress` → `inService` |
| `paused` · `completed` · `cancelled` · `rejected` | idem | idem |
| `pendingApproval` · `approved` · `exception` (só no app) | **`ArgumentError` antes de qualquer pedido** — o app não pede ao backend um estado que ele não tem | `pending_approval` → `pendingApproval` (alias mantido, `:257`) |
| — | — | nome do próprio enum (`inService`, `scheduled`, …) → identidade (fixtures do B-099/B-103 e cache local continuam válidos) |
| — | — | **desconhecido → `scheduled`** (comportamento de hoje, mantido: o `b099` 2.3 o prova; muda só por decisão de produto) |

**Fila local (inalterado no contrato, provado no teste):** `SyncAction{clientActionId: uuid v4 (factory), tenantId,
type: 'work_order_material.add', payload{work_order_local_id, sku, quantity}, status: pending}`. Idempotência =
tenant + usuário + `client_action_id` (o usuário entra no replay pelo JWT; a fila do aparelho é por sessão); dedupe local
por `clientActionId` preservado. Nenhum campo de segredo/PII no payload (o `b119` #4 já prova `containsKey('token') ==
false`; o T2 repete).

## 8. Modelagem

- **Sem migração** — nem Prisma (`src/**` proibido) nem Drift (`sync_actions` já tem PK `client_action_id`; nenhuma
  coluna nova; `app_database.dart` fora do escopo e sem necessidade).
- **Sem modelo novo.** `WorkOrder` continua; o parser único `_workOrderFromRemoteJson` (já existente, tolerante camel/snake)
  passa a servir lista, detalhe, status e assign; `_workOrderFromJson` (snake-only, `:223-253`) fica **sem chamador e é
  removido**.
- **Invariantes preservados, e como se prova:** (i) B-108 — nenhum arquivo de evidência/blob é tocado; `b104`,
  `pr_b_junta_fixes` e `evidence_sync_test` seguem na suíte como regressão; (ii) idempotência — `SyncActionFactory` continua
  gerando `clientActionId`; a dedupe do `enqueue` continua e ganha teste sob o lock (T3-20); (iii) ordem do replay —
  `load()` mantém `ORDER BY created_at, rowid`; o T2-14 confere que as N ações saem na ordem de criação.
- **Dinheiro/Decimal/timestamptz/delete lógico:** não se aplicam (nenhum campo novo, nenhuma tabela nova).

## 9. Conserto, ocorrência por ocorrência (arquivos exatos; regra do espelho)

**Módulo de referência (espelho):** o próprio `work_order_remote_api.dart` — `fetchWorkOrders` (lista, com `{String?
tenantId}` e `_workOrderFromRemoteJson(json, fallbackTenantId:)`) e `fetchTimeline` (#351: desembrulha `data`, comenta o
porquê); e o teste `b127_timeline_remota_test.dart` (`_AdaptadorFalso` + `SyncTransformer`). Para a fila: o laço `for (final
material in merged) await …` que está DUAS linhas acima do `forEach` errado.

### 9.1 `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart`

1. **Interface** (`WorkOrderRemoteApi`, `:9-26`): `fetchWorkOrder(String id, {String? tenantId})`,
   `updateWorkOrderStatus(String id, WorkOrderStatus status, {String? tenantId})`,
   `assignWorkOrder(String id, String userId, {String? note, String? tenantId})`. Mesma forma de `fetchWorkOrders`.
   `PendingBackendWorkOrderRemoteApi` acompanha. **Por quê o parâmetro e não `tenantId: ''` como o timeline:** a OS é
   entidade persistida e filtrada por tenant (`actionsForTenant`, stores); um `WorkOrder` com tenant vazio é invisível —
   o chamador futuro (B-SAN3-13/26) recebe o contrato pronto em vez de lembrar de um `copyWith`.
2. **Desembrulho único**: `Map<String, dynamic> _unwrapData(Map<String, dynamic>? body)` → `body?['data']` se for `Map`,
   senão `body ?? {}` (tolerante como `registry_options._items`, mas para objeto). Usado em `fetchWorkOrder` (`:99`),
   `updateWorkOrderStatus` (`:115`) e `assignWorkOrder` (`:156`): `return _workOrderFromRemoteJson(_unwrapData(resp.data),
   fallbackTenantId: tenantId ?? '')`. Comentário no estilo do #351 dizendo o que quebrava.
3. **Remover `_workOrderFromJson`** (`:223-253`) — sem chamador após (2).
4. **Vocabulário de status, dois sentidos**, funções de topo no mesmo arquivo (públicas, para o teste de paridade):
   `String backendStatusFor(WorkOrderStatus s)` (tabela §7; `pendingApproval/approved/exception` → `throw
   ArgumentError.value(s, 'status', 'sem equivalente no backend')`) e `workOrderStatusFromApiValue` (`:255-264`) ganhando
   os ramos `open, assigned, accepted, on_route, on_site, in_progress` (+ os 4 coincidentes e `pending_approval`), mantendo
   identidade para nomes do enum e o fallback `scheduled`.
5. **PATCH `/status`** (`:113`): `data: {'status': backendStatusFor(status)}`; a validação do (4) roda ANTES do `try`
   (não é `DioException`; o `ArgumentError` sobe puro).
6. **POST `/assign`** (`:150-154`): `data: {'userId': userId, if (msg != null && msg.isNotEmpty) 'message': msg}` —
   nunca `user_id`, nunca `note`.
7. `createApprovalRequest` (`:162-180`): **não tocar** (P5 tem dono). Comentário de 1 linha apontando a pendência é aceitável.

### 9.2 `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart` (`:121-133`)

```dart
for (final entry in selection.entries) {
  if (entry.value <= 0) continue;
  final action = _actionFactory.create(
    tenantId: _session.activeTenant.tenantId,
    type: InventorySyncActionTypes.materialAdd,
    payload: {'work_order_local_id': workOrderLocalId, 'sku': entry.key, 'quantity': entry.value},
  );
  await _syncQueue.enqueue(action);
}
notifyListeners();
return merged;
```
`notifyListeners()` e o `return` só depois do último `await`. **Decisão registrada — `enqueueAll` na interface foi
considerado e rejeitado:** (a) quebraria 8 fakes de teste sem ganho de propriedade — o gate exige "retornar só depois de
gravar", que o `for-in await` cumpre; (b) atomicidade do lote não compra consistência real, porque os N materiais já foram
gravados antes, em N transações (P4, dono `B-SAN3-15`); (c) o risco de sobrescrita entre chamadores é fechado no §9.3,
que vale para todos os 22 sítios, não só para este.

### 9.3 `mobile/flutter_app/lib/core/sync/sync_queue_repository.dart` — serialização das mutações

Em `PersistentSyncQueueRepository`, um encadeamento privado de `Future` (sem dependência nova; nenhum `package:synchronized`):

```dart
Future<void> _tail = Future<void>.value();
Future<T> _serialized<T>(Future<T> Function() op) {
  final run = _tail.then((_) => op());
  _tail = run.then<void>((_) {}, onError: (_) {}); // erro de uma operação não trava a fila
  return run;
}
```
`enqueue` e `update` passam a executar o corpo atual dentro de `_serialized(...)`. Leituras ficam como estão (mínimo; o
teste T3-18 prova que `enqueue` × `update` concorrentes não se perdem). `InMemorySyncQueueRepository` não muda (sem
RMW). Comentário explicando o mecanismo medido (§5) e a pendência P7.

### 9.4 `mobile/flutter_app/lib/core/local_db/drift_sync_action_store.dart`

Sem alteração prevista. Se o dev precisar tocar, o PR diz qual asserção do T2 exigiu.

### 9.5 Testes existentes tocados (só assinatura)

- `test/features/b099_real_work_orders_pull_test.dart` `_FakeRemoteApi` (`:17-48`): os três métodos ganham `{String? tenantId}`.
- `test/features/b121_mobile_hardening_test.dart` `_TimelineRemote` (`:57+`): idem.
- Nenhum dos 8 fakes de `SyncQueueRepository` é tocado.

## 10. Testes de encerramento — baseline N, meta M≥2N, vermelho-controle no head-base

**Baseline medido (§15.L3, L11).** Suíte Flutter: **864** `test(`/`testWidgets(` em 62 arquivos (contagem estática
`rg -c "^\s*(test|testWidgets)\("`) = **864/864** do último KPI oficial (`Kpis/kpis-latest.json:17-21`, B-O6R-06).
Testes que exercem HOJE as superfícies defeituosas: REST detalhe/status/assign via `DioWorkOrderRemoteApi` com Dio real =
**0** (o `b099` 2.1, `:209-238`, assere sobre um helper `_remoteOrder`, não chama o cliente — como o achado diz);
`addSelection` enfileirando = **1** (`b119` #4, com 1 SKU e store imediato — passa por sorte de timing);
concorrência/serialização de `PersistentSyncQueueRepository` = **0** (`drift_stores_test` 6-8 exercem `save/load`;
`sync_engine_test` usa `InMemorySyncQueueRepository`). **N = 1 → M ≥ 2 é trivial; meta absoluta deste bloco: M = 21 novos
testes**, 15 deles com vermelho-controle. Suíte esperada: **864 → 885** (o dev publica o número EXECUTADO).

**Vermelho-controle no head-base — procedimento (sem `stash`, sem `checkout` na árvore do bloco):** o dev escreve os 4
arquivos de teste primeiro; num worktree temporário `git worktree add <tmp> 3e05fb5a` com `flutter pub get` PRÓPRIO
(D-JUNTA §1-ter(c): sem junction de `node_modules`/`.dart_tool`), copia só os 4 arquivos e roda
`flutter test <os 4> --reporter compact` → grava no PR a saída com as contagens vermelhas (esperado: T1 = 10 vermelhos de
compilação/asserção, T2 = 2, T3 = 2, T4 = 1). O inspetor de terreno re-executa. Depois `git worktree remove --force <tmp>`.

### T1 `test/features/work_orders/bo6r11_os_rest_envelope_e_vocabulario_test.dart` (espelho: `b127`)
Fixture = corpo EXATO de `toWorkOrderDto` (camelCase; `links`, `checklists`; sem `tenantId`) dentro de `{data: …}`.

| # | Teste | Hoje (head-base) |
|---|---|---|
| 1 | `fetchWorkOrder`: `code`, `customerName`, `serviceAddress`, `serverId == id == localId`, `assignedUserId`, `scheduledAt` (de `scheduledFor`), `updatedAt` | **VERMELHO** — `TypeError` em `json['tenant_id'] as String` |
| 2 | `fetchWorkOrder`: `in_progress→inService`, `on_route→enRoute`, `on_site→arrived`, `open→scheduled`, `assigned→dispatched`, `accepted→dispatched`, `paused/completed/cancelled/rejected` idem (laço sobre a tabela) | **VERMELHO** |
| 3 | `fetchWorkOrder(id, tenantId: 't-1')` → `tenantId == 't-1'`; sem parâmetro → `''` ("vem da sessão, nunca do corpo") | **VERMELHO** (parâmetro não existe) |
| 4 | `fetchWorkOrder` com adaptador devolvendo 404 → `ApiServerError(404)` (regressão do mapeamento de erro) | verde (documentado) |
| 5 | `updateWorkOrderStatus(id, inService)`: `RequestOptions.data == {'status': 'in_progress'}` e método PATCH na rota certa | **VERMELHO** — envia `inService` |
| 6 | os 9 status com equivalente → vocabulário do backend (tabela §7); `pendingApproval/approved/exception` → `ArgumentError` e **zero** requisições capturadas | **VERMELHO** |
| 7 | `updateWorkOrderStatus` resposta `{data:{…,status:'on_site'}}` → `WorkOrder.status == arrived` | **VERMELHO** |
| 8 | `assignWorkOrder(id,'user-7', note:'Guincho 12')`: corpo == `{'userId':'user-7','message':'Guincho 12'}`; sem `user_id`/`note`; `note` em branco → sem `message` | **VERMELHO** — corpo tem `user_id` |
| 9 | `assignWorkOrder` resposta `{data:{…,status:'assigned',assignedUserId:'user-7'}}` → `dispatched`, `assignedUserId` | **VERMELHO** |
| 10 | `fetchWorkOrders` (lista viva do B-099): `{items:[{status:'in_progress'},{status:'assigned'}],pagination}` → `inService`, `dispatched` | **VERMELHO** — ambos viram `scheduled` |
| 11 | paridade com o codec da fila: para cada `WorkOrderStatus` que `backendStatusFor` aceita, `WorkOrderSyncCodec().encodeRequest([ação statusUpdate com new_status: s.name])['actions'][0]['payload']['status'] == backendStatusFor(s)` — as duas tabelas não podem divergir | **VERMELHO** (símbolo inexistente) |
| 12 | `fetchTimeline` continua a desembrulhar `data` com o mesmo adaptador (guarda-chuva do #351 no arquivo reescrito) | verde |

### T2 `test/features/prestador/bo6r11_material_enfileira_e_sobrevive_reinicio_test.dart` (espelho: `b119` grupo 2, `drift_stores_test`)

| # | Teste | Hoje |
|---|---|---|
| 13 | 3 SKUs sobre `_StoreLento implements SyncActionStore` (`Future.delayed(5 ms)` em `load`/`save`): logo após `await addSelection`, `store.load()` tem **3** ações `work_order_material.add` com os 3 SKUs e quantidades | **VERMELHO** — 0 ou 1 |
| 14 | **O teste do gate:** 3 SKUs sobre `DriftSyncActionStore(AppDatabase.openInMemory())`; "reinício" = novo `DriftSyncActionStore(db)` + novo `PersistentSyncQueueRepository`; `pendingForTenant(tenant)` == 3, na ordem de criação, payload sem `token` | **VERMELHO** — 1 |
| 15 | seleção `{A: 0, B: 2}` → exatamente 1 ação (qty ≤ 0 não enfileira) e 1 material | verde (regressão) |
| 16 | `addSelection` 2× com a mesma seleção → 2×N ações com `clientActionId` distintos; materiais somados (comportamento documentado) | verde/indeterminado hoje → determinístico |

### T3 `test/core/sync/bo6r11_fila_serializada_test.dart`

| # | Teste | Hoje |
|---|---|---|
| 17 | dois `enqueue` disparados sem `await` entre si (`Future.wait`) sobre `_StoreLento` → `load()` == 2 | **VERMELHO** — 1 |
| 18 | `enqueue(b)` concorrente com `update(a → synced)` → `a` synced **e** `b` presente | **VERMELHO** |
| 19 | `enqueue` com `tenantId` vazio lança `ArgumentError` e o `enqueue` seguinte funciona (o encadeamento não trava após erro) | verde; protege o lock |
| 20 | dedupe por `clientActionId` sob o lock: mesma ação 2× → 1 | verde (regressão) |

### T4 `test/core/sync/bo6r11_guard_enqueue_com_await_test.dart` (CE-G1, §11)

| # | Teste | Hoje |
|---|---|---|
| 21 | varre `lib/**/*.dart` (`Directory('lib')`, cwd do `flutter test` = raiz do app); toda linha com `.enqueue(` deve conter `await ` ou `return ` antes da chamada, salvo declarações (`Future<void> enqueue(`); lista as violações com `arquivo:linha`; **default = negar** | **VERMELHO** — `prestador_repository.dart:132` |

**Mutação obrigatória (o dev executa e anota no PR):** remover o `await` de qualquer um dos 22 sítios → T4 fica vermelho;
trocar `'userId'` por `'user_id'` → T1-8 fica vermelho; trocar `'in_progress'` na tabela → T1-6 e T1-11 ficam vermelhos.

## 11. CE-G1 / CE-G2 (condições de entrada, `D-SAN3-PLANO-OPCAO-B` §5.6)

**CE-G1 — enumeração fail-closed.** (a) Fonte: os censos das Medições A e B são gerados por `rg` sobre `mobile/flutter_app/lib`
(comandos em §2/§3), não de lista curada; o guard T4-21 reproduz o censo B em tempo de teste, varrendo `lib/**`.
(b) Default do membro não previsto: **negar** — qualquer `.enqueue(` novo sem `await`/`return` reprova o guard com
`arquivo:linha`. (c) Mutação: remover um `await` → vermelho (§10). Para a propriedade A (envelope) não há guard textual
honesto — a forma certa depende de cada rota; o que fica é o teste de contrato por método (T1) e a paridade de vocabulário
com o codec (T1-11), que fica vermelha se uma das duas tabelas mudar sozinha.

**CE-G2 — papel × passo (medido em `catalog.ts`, §15.L12; matriz `RBAC_MATRIX.md:45`).**

| Passo do teste de encerramento | Rota compara | `field_technician` (`catalog.ts:895-943`) | `operator` (`:730-808`) | `field_dispatcher` (`:628-675`) | `manager` (`:414-578`) |
|---|---|---|---|---|---|
| detalhe (`GET /:id`) | `work_orders:read` | ✓ | ✓ | ✓ | ✓ |
| status (`PATCH /:id/status`) | `work_orders:status` (+ escopo por objeto 07a) | ✓ (só OS atribuída) | ✓ | ✓ | ✓ |
| atribuição (`POST /:id/assign`) | `work_orders:assign` | **✗** | **✗** | ✓ | ✓ |

Consequência escrita: o passo "atribuição" é executado, no teste, **por contrato** (adaptador falso, sem papel); no
produto só um papel com `work_orders:assign` (despacho/gestor/admin) pode chamá-lo — o app de campo não deve expor
essa ação ao técnico (hoje não expõe: 0 chamadores). Nenhum bloco anterior concede `work_orders:assign` ao técnico e este
plano **não** pede isso (a matriz dá `execute/update-assigned`, l.45). Os testes T2–T4 não têm papel (fila local).

## 12. Bateria exata (forma esperada)

```bash
cd mobile/flutter_app
flutter pub get                                   # sem alterar pubspec.lock; se aparecer modificado → reportar, não commitar
dart format --output=none --set-exit-if-changed lib test          # ec=0
flutter analyze                                                   # "No issues found!"
flutter test test/features/work_orders/bo6r11_os_rest_envelope_e_vocabulario_test.dart --reporter compact   # +12 -0
flutter test test/features/prestador/bo6r11_material_enfileira_e_sobrevive_reinicio_test.dart --reporter compact   # +4 -0
flutter test test/core/sync/bo6r11_fila_serializada_test.dart --reporter compact                             # +4 -0
flutter test test/core/sync/bo6r11_guard_enqueue_com_await_test.dart --reporter compact                      # +1 -0
# regressões dos blocos que tocam os mesmos arquivos:
flutter test test/features/b099_real_work_orders_pull_test.dart test/features/work_orders/b127_timeline_remota_test.dart \
  test/features/work_orders/b126_registry_assignment_test.dart test/features/prestador/b119_prestador_flow_test.dart \
  test/core/local_db/drift_stores_test.dart test/core/sync_engine_test.dart test/core/sync/sync_replay_service_test.dart \
  test/features/b103_work_order_sync_test.dart test/features/b121_mobile_hardening_test.dart --reporter compact   # -0
flutter test --reporter compact                   # esperado: "All tests passed!" com 885 (= 864 + 21); publicar o EXECUTADO
cd ../..
node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
git diff --check
```
CI: o job `flutter` (`.github/workflows/ci.yml:332-357`) roda exatamente `pub get → format → analyze → test`; o merge
exige esse job verde além dos demais. Flake conhecido e registrado no KPI: 1 teste de telemetria (PR-13) já falhou sob
paralelismo e passou isolado — se reaparecer, reexecutar a suíte inteira uma vez e anotar, sem excluir o teste.

## 13. Riscos + rollback

| Risco | Probabilidade / efeito | Mitigação no plano | Rollback |
|---|---|---|---|
| Mapeamento de status divergir do codec da fila (dois mapas no app) | média / status errado num dos dois caminhos | T1-11 compara `backendStatusFor` com `WorkOrderSyncCodec.encodeRequest` para todos os valores; comentário cruzado nos dois arquivos | reverter o commit; a lista volta ao comportamento de hoje (tudo `scheduled`) |
| `accepted → dispatched` esconder do técnico que a OS já foi aceita | baixa / UX | P6 com dono (`B-SAN3-13/14`) | — |
| O lock em `PersistentSyncQueueRepository` mudar timing de testes existentes (replay, conflitos) | baixa / testes flaky ou vermelhos | regressões listadas no §12 rodam antes da suíte; leituras não passam pelo lock; T3-19 prova que erro não trava o encadeamento | remover o `_serialized` (3 linhas) mantendo o `for-in await` — o gate continua fechado |
| Parâmetro `tenantId` novo quebrar fakes fora dos 2 listados | baixa / compilação | `rg "implements WorkOrderRemoteApi" test` = exatamente 2 (§15.L4) | — |
| `flutter pub get` modificar `pubspec.lock` (Flutter 3.41.6 local × lock) | média / arquivo proibido tocado | o dev **não** commita o lock; reporta no PR; se a CI precisar, é bloco próprio | `git checkout -- pubspec.lock` NO WORKTREE DO DEV (nunca na árvore principal) |
| Vermelho-controle feito por `stash`/`checkout` na árvore do bloco | — / contamina o terreno | procedimento por worktree temporário (§10); o inspetor confere | — |
| Colisão em `Kpis/*` com outro PR mergeado antes | alta (4 frentes em voo) / número defasado | o segundo a mergear absorve a `main` e **reexecuta** a suíte Flutter antes de publicar (§5.5 do SAN3, §C3.3) | — |
| Latência: N `save` da fila inteira por N SKUs | baixa (N ≤ 8 no catálogo; fila pequena) | aceito; P7 nomeia o upsert no store como conserto definitivo | — |

**Rollback geral:** um commit de feature + um de KPI/registro no PR; `git revert` do squash devolve o app ao estado do
head-base sem migração a desfazer (nenhuma existe).

## 14. Junta (unanimidade de 3) · rito · KPI

**Quórum e por quê.** `Ω6R-QUA-005` é **perda de dado** (prioridade 1 do gate) → **unanimidade de 3** (§C7.1-ter(b)); o
`PLANO_SAN3` §5.4 marca a linha como "unanimidade" (sem crítico obrigatório — o crítico ataca o plano só nos blocos de
invariante financeiro/segurança). O orquestrador pode somar o `critico-adversarial` como leitor não-votante do plano se
quiser; não é exigido.

**Composição proposta (papéis raiz existentes na base `3e05fb5a`; os especialistas `jurado-*` da sessão são untracked e não
contam como corpo da ref):**
1. `guardiao-fail-closed` — cadeira do envelope/vocabulário: T1 (default negar em status sem equivalente; parser tolerante
   sem palpite), CE-G1 (T4) e a paridade com o codec.
2. `inspetor-de-arnes-concorrente` — cadeira da fila: T2/T3 (store lento, reinício com Drift em memória, `enqueue` ×
   `update`), o mecanismo do lock e a pendência P7.
3. `validador-mestre` — cadeira do diff × plano, bateria executada (não copiada), KPI com N executado, escopo (nenhum
   arquivo fora do §6; `pubspec.lock` intocado) e as 7 pendências registradas com dono.
Suplentes: `inspetor-de-rotas` (para a cadeira 1) e `agente-dba-guardiao` (para a 2 — Drift/SQLite é banco). Se um jurado
cair, o suplente entra com o mesmo briefing (P1 do `D-JUNTA-RESILIENTE`); votos gravados incrementalmente em
`agent-orchestration/omega/juntas/votos/B-O6R-11/`.

**Inelegibilidade.** Quem desenvolver (dev distinto do planejador) não vota; o planejador não vota; quem achar defeito num
ciclo de reprovação não conserta (§C7.4-bis). Ata em `agent-orchestration/omega/juntas/J-B-O6R-11.md` com escopo de cada
achado (`dentro-do-bloco` × `pre-existente` com evidência de data — as 7 pendências do §6 já vêm datadas e com dono).

**Rito (§C2 + SAN3 "Encerramento de todo bloco").** plano (este) → dev → bateria §12 → KPI no PR → inspetor de terreno
(`LIBERADO`) → junta 3/3 → CI verde (inclui `flutter`) → squash + `--delete-branch` → `bash scripts/post-merge-cleanup.sh`
→ `porteiro-pos-merge` → backfill no PR seguinte.

**KPI (§C3, painel único).** `flutter_tests`: EXECUTADO (esperado 885/885; publicar o real, com N=1 execução e a forma
`All tests passed!`); `backend_tests` e `frontend_smoke_tests`: CARREGADOS com a nota "PR Flutter-only; `git diff
--name-only 02bd7dab...HEAD -- src/ frontend/` vazio, provado nas duas pontas"; `blocks_completed`: 163 → 164;
`status: published_per_pr`; `pr` após `gh pr create`; `merge_commit`/`approved_head` `null` na autoria. Se este for o
**primeiro PR de execução a mergear depois do #386**, carrega as dívidas do #386 (backfill do #385 já pago ali; conferir a
seção "Últimas demandas" do painel e o `roadmap` — comando do `B-SAN3-04a` descreve). O history ganha 1 entrada com
`version: "B-O6R-11"` e a descrição nomeando os 4 arquivos de código, os 21 testes e as 7 pendências abertas.

**Registro.** `agent-orchestration/codex/log-execucao.md` (entrada do bloco), `controle/pendencias.md` (P-O6R-B11 →
FECHADA com os dois achados; 7 pendências novas com dono), `docs/revisoes/O6R/achados.jsonl` **não** é do bloco (dono:
registro O6R) — anotar no PR que `QUA-004`/`QUA-005` fecham e pedir ao porteiro a atualização do registro.

## 15. Registro de medições (log bruto — comando → saída; executados por esta instância em 2026-09-18 sobre `b11@3e05fb5a`)

- **L0 terreno:** `git -C …/b11 status --porcelain --branch` → `## fix/mobile-work-order-contracts...origin/…` (limpo);
  `git log --oneline -3` → `3e05fb5a docs(b-o6r-11)…`, `02bd7dab docs(san3)…`, `15ef3fbe … (#385)`; `git rev-parse
  origin/main` → `02bd7dab2ffa…`. `pubspec.lock` não aparece modificado. `.dart_tool/` existe (pub get feito).
- **Corpo do papel:** `MSYS_NO_PATHCONV=1 git show origin/main:.claude/agents/planejador-mestre.md` (sem a variável o Git
  Bash converte `origin/main:` em caminho e falha com "ambiguous argument") → `model: fable`; fallback
  `D-FALLBACK-MODELO-FABLE-OPUS`; itens obrigatórios do plano (objetivo, ator, fluxo, contrato, modelagem, arquivos,
  N/M≥2N, riscos+rollback).
- **L1 Medição A:** `rg -n "_dio\.(get|post|patch|put|delete)|\.data[!?]?\[|\.data!|resp\.data|response\.data|res\.data"
  mobile/flutter_app/lib -g '*.dart'` → 44 linhas (§2: 5 `snapshot.data!`, 8 chamadas sem leitura, 31 leituras).
- **L2 Medição B:** `rg -n "enqueue\(|enqueueAll\(|\.forEach\(|unawaited\(|\.then\(" … lib` → 31 linhas;
  `rg -n "forEach\(.*async|\.map\(.*async|Future\.wait|Lock\(|Mutex|synchronized" … lib` → 2 (`home_screen:109`,
  `auth_token_storage:90`). 22 chamadas de `enqueue`; 1 sem `await` (`prestador_repository.dart:132`).
- **L3 baseline:** `grep -rEo "^\s*(test|testWidgets)\(" test --include=*.dart | wc -l` → **864**; 62 arquivos `*_test.dart`;
  por arquivo: b099=30, b127=6, b126=12, b119=10, drift_stores=8, sync_engine=5, b103=43. `Kpis/kpis-latest.json:17-21` →
  `flutter_tests 864/864`. History: 158 entradas; última `B-O6R-06`, `pr 385`, `blocks_completed 163`.
- **L4 chamadores/fakes:** `rg "fetchWorkOrder\b|updateWorkOrderStatus|assignWorkOrder|createApprovalRequest\(" lib` fora
  do próprio arquivo → só `work_order_repository.dart:458` e `work_order_approval_request_screen.dart:210` (método do
  REPOSITÓRIO, via fila) → **0 chamadores dos 3 métodos REST**. `rg "implements WorkOrderRemoteApi" test` → `b099:17`,
  `b121:57`. `rg "implements SyncQueueRepository" test` → 8 arquivos. `DioWorkOrderRemoteApi.create` só em
  `work_order_repository.dart:692-696`.
- **L5 backend OS:** `work-order.routes.ts:120-121` (`read`), `:136-137` (`status`), `:196-197` (`assign`), `:290`
  `sendResult` = `response.status(result.status ?? 200).json(result.body ?? { data: result.data })`; controller
  `list:24-26` (`body`), `get:56-58`, `changeStatus:139-140`, `assign:216-218` (`data`); `dto.ts:36-109`
  (`toWorkOrderDto`, camelCase, sem tenant), `:121-151` (`toWorkOrderListDto` = `{items, pagination}`).
- **L6 vocabulário:** `work-order.types.ts:6-17` `WORK_ORDER_STATUSES = [open, assigned, accepted, on_route, on_site,
  in_progress, paused, completed, cancelled, rejected]`; `validators.ts:74-82` `parseWorkOrderStatus` → 400
  `invalid_status`; `:103-112` `assertStatusTransition` → 409; app `work_order_models.dart:14-27` (12 valores);
  `sync_replay_service.dart:472-480` `_backendStatus` (scheduled→open, dispatched→assigned, enRoute→on_route,
  arrived→on_site, inService→in_progress, `_ => status`); `:366` `statusUpdate => 'work_order.status_change'`;
  `work_order_repository.dart:238-239` payload `new_status: newStatus.name`. Fixtures: b099 `'scheduled'`/`'inService'`,
  b103 `'processed'`/`'rejected'` (vocabulário do app, não do backend); b099 2.3 "status desconhecido cai para scheduled".
- **L7 assign:** `service.ts:1669-1717` (lê `operatorId ?? userId`, `userId`, `vehicleId|vehicle_id`, `teamId|team_id`,
  `message`); `:812-839` guard dual-match + "o write continua torto e é do Ω6R-QUA-004"; `validators.ts:189-203`
  `parseRequiredUuid`/`parseOptionalUuid`; `work-order-prisma.repository.ts:523-547` escreve `assigned_operator_id`,
  `assigned_user_id`, `status: "assigned"`; `mobile-work-order-sync.ts:227-232` lê `payload.operator_id`;
  `work_order_repository.dart:282,303` manda `operator_id = wo.assignedUserId`.
- **L8 outras rotas:** `mobile.routes.ts:81` (bootstrap `{data}`), `:144,153,171,180` (syncs `{data}`), `:189` (uploads
  201 `{data}`), `:200` (telemetria `{data}`); `expense-management.routes.ts:121-122` `sendResult`; controller de despesas
  `:23-24,30-31,37-38` (`body` = `toListDto` `{items,pagination}`), `:54,60,67,82,97,112` (`data`);
  `telemetry.routes.ts:71-72`, `field-location.routes.ts:58-59`; `checklist.routes.ts:116-127`; `auth.routes.ts:123`.
- **L9 vivos/mortos:** `rg "DioExpenseRemoteApi\(|PendingExpenseRemoteApi\(|expenseRemoteApiProvider" lib` → só o
  construtor (`expense_remote_api.dart:67`) → nunca construído; `rg "\.createRun\(" lib` → 0.
- **L10 approval:** `rg "approval-requests" src --include=*.ts` → **0 ocorrências**.
- **L11 decodificadores do app:** `bootstrap_repository.dart:181-192`, `auth_repository.dart:248-262`,
  `evidence_upload.dart:55-69`, `checklist_attachment_upload.dart:50-61`, `evidence_sync.dart:88-98`,
  `sync_replay_service.dart:94-100,305-315,890-900`, `telemetry_codec.dart:40-50`, `field_location_api.dart:40-47`,
  `checklist_remote_api.dart:173-177,200-201,218-220,255-257`, `registry_options_remote_api.dart:64-72`,
  `expense_remote_api.dart:75,85,98,116,128,142,158,170,178-190`, `expense_local_store.dart:106-117`.
- **L12 catálogo (CE-G2):** `catalog.ts` por papel — `field_technician` (895-943): `work_orders:read, comment, update,
  status`; `operator` (730-808): `read, comment, update, status, mileage_correct`; `field_dispatcher` (628-675): `read,
  comment, create, assign, status`; `manager` (414-578): `read, comment, create, update, assign, status, cancel,
  mileage_correct, approve`; `tenant_admin` = `TENANT_ADMIN_PERMISSIONS` (inclui `work_orders:assign`, l.27).
  `RBAC_MATRIX.md:45` (técnico = `execute/update-assigned`).
- **L13 fila:** `sync_queue_repository.dart:17-34,58-67`; `drift_sync_action_store.dart:15-56`; `app_database.dart:242-243`;
  `sync_providers.dart:28-34` (uma instância); `sync_action_factory.dart:10-32` (uuid v4, `pending`);
  `sync_action_store.dart:8-11` (interface `load/save` — fora do escopo).
- **L14 CI:** `.github/workflows/ci.yml:332-357` job `flutter`: `pub get` (345), `dart format` (349), `analyze` (353),
  `flutter test --reporter compact` (357). `scripts/kpi-freeze.mjs` existe.
- **L15 jurados na base:** `git ls-tree HEAD .claude/agents/` → raiz: agente-ci-doutor, agente-dba-guardiao,
  agente-devops-provisionador, agente-fabrica, agente-finops, agente-pesquisador-web, agente-secops, avaliador-mapas,
  cognicao-visual, coordenador-de-acessos, critico-adversarial, dev-mapas, estrategista, frontend-pixel-master,
  guardiao-fail-closed, inspetor-de-arnes-concorrente, inspetor-de-rotas, inspetor-de-terreno-da-junta,
  master-teste-telas-rotas, planejador-mapas, planejador-mestre, porteiro-pos-merge, validador-mestre; `especialistas/`:
  só `jurado-san3c2-cobertura-de-fluxo` + suplente. Os `jurado-06/07b/c5-*` da sessão são untracked.
- **Não executado por esta instância (worktree somente leitura):** `flutter test` — a contagem 864 é estática e bate com
  o KPI oficial; o dev publica a execução real. Nenhum arquivo do worktree foi escrito; nenhum `stash/checkout/reset/clean`.
- **Incidente de ferramenta:** dois appends deste plano (>12 KB e >6 KB) falharam no wrapper do Bash com "unexpected EOF"
  antes de tocar o arquivo; o arquivo foi conferido intacto em cada retomada e o texto gravado em blocos menores.
