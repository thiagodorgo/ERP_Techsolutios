# Medição e Reprodução — `B-SAN3-13` (`P-MOBILE-MINHAS-OS-SEM-FILTRO` #32 · `P-MOBILE-OS-SEEDS` #33)

- **Agente:** `med-san313-argon` (Antigravity · Gemini 4 Argon)
- **Data:** 2026-10-24
- **Ref medida (`origin/main` / `HEAD`):** `7ab2fe71d0d40c2be51a790f0d20893651cdf972`
- **Worktree de leitura:** `C:/Users/AMP/w-plan21` (somente leitura)
- **Diretório externo de sondas/testes:** `C:/Users/AMP/erp-pausa-2026-10-03/planos/san313-medicao/`

```powershell
PS C:\Users\AMP\w-plan21> git -C C:/Users/AMP/w-plan21 rev-parse HEAD ; git -C C:/Users/AMP/w-plan21 status --short
7ab2fe71d0d40c2be51a790f0d20893651cdf972
```

---

## 1. No app (`mobile/flutter_app/lib/features/work_orders/**` e fila de sync): onde a lista "Minhas OS" é montada, que filtro aplica, que chamada faz ao backend (rota, parâmetros) e onde grava o cache local

### 1.1. Onde a lista "Minhas OS" (e a tela "Ordens de Serviço") é montada e que filtro aplica na UI

1. **Card/seção `"Minhas OS"` na Home (`mobile/flutter_app/lib/shared/ui/home_screen.dart`):**
   - **Disparo do carregamento:** `home_screen.dart:109-112` chama `woRepository.load()` apenas quando `woRepository.workOrders.isEmpty && !woRepository.isPulling && woRepository.lastPullError == null && woRepository.lastPulledAt == null`.
   - **Filtro aplicado:** `home_screen.dart:121-123` filtra `woRepository.workOrders` **somente por organização (`tenantId`)**, sem filtrar por `assignedUserId` (`session.user.userId`):
     ```dart
     // mobile/flutter_app/lib/shared/ui/home_screen.dart:121-127
     final allTenantOrders = woRepository.workOrders
         .where((o) => o.tenantId == session.activeTenant.tenantId)
         .toList();
     final openOrders = allTenantOrders.where((o) => !o.status.isFinal).toList();
     final todayOrders = openOrders
         .where((o) => o.scheduledAt != null && _sameDay(o.scheduledAt!, today))
         .toList();
     ```
   - **Recorte exibido em `"Minhas OS"` (`home_screen.dart:142-144` e `271-321`):**
     ```dart
     // mobile/flutter_app/lib/shared/ui/home_screen.dart:142-144
     final listOrders = (todayOrders.isNotEmpty ? todayOrders : openOrders)
         .take(5)
         .toList();
     ```
     O cabeçalho `'Minhas OS'` é renderizado em `home_screen.dart:271-278` com o botão `'Ver todas'` (`home_screen.dart:280-292`, que navega para `/work-orders`), e os cartões `_OrderCard` são renderizados em `home_screen.dart:316-321`.

2. **Tela `"Ordens de Servico"` (`mobile/flutter_app/lib/features/work_orders/ui/work_order_list_screen.dart`):**
   - **Disparo do carregamento:** `work_order_list_screen.dart:138-140` chama `repo.load()` quando `repo.workOrders.isEmpty && !repo.isPulling && repo.lastPullError == null`.
   - **Filtro aplicado:** `work_order_list_screen.dart:141` chama `_applyFilters(repo.workOrders)`, definido em `work_order_list_screen.dart:349-364`:
     ```dart
     // mobile/flutter_app/lib/features/work_orders/ui/work_order_list_screen.dart:349-364
     List<WorkOrder> _applyFilters(List<WorkOrder> all) {
       return all.where((wo) {
         if (!_matchesGroup(wo.status, _group)) return false;
         if (_priority != null && wo.priority != _priority) return false;
         if (_query.isNotEmpty) {
           final q = _query.toLowerCase();
           return wo.title.toLowerCase().contains(q) ||
               wo.code.toLowerCase().contains(q) ||
               wo.customerName.toLowerCase().contains(q) ||
               wo.serviceAddress.toLowerCase().contains(q);
         }
         return true;
       }).toList();
     }
     ```
   - Apesar de o estado vazio (`work_order_list_screen.dart:304`) exibir o texto `'Voce ainda nao possui ordens atribuidas.'`, **nenhum filtro por `assignedUserId` é aplicado**.

3. **Método `workOrdersForUser` existente no repositório, porém morto (0 chamadores):**
   - Em `mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart:88-89`, existe:
     ```dart
     List<WorkOrder> workOrdersForUser(String userId) =>
         _orders.where((o) => o.assignedUserId == userId).toList();
     ```
   - Medição de chamadores no código Flutter:
     ```powershell
     PS C:\Users\AMP\w-plan21> git -C C:/Users/AMP/w-plan21 grep -n "workOrdersForUser" mobile/flutter_app/
     mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart:88:  List<WorkOrder> workOrdersForUser(String userId) =>
     ```
     O método tem **zero** chamadores em `lib/` e em `test/`.

### 1.2. Que chamada faz ao backend (rota e parâmetros)

1. **No repositório (`mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart:110-178`):**
   - `load({bool seedIfEmpty = true})` (`work_order_repository.dart:110-133`) lê o banco local (`_localStore.loadWorkOrders()`), filtra em memória apenas por `o.tenantId == _session.activeTenant.tenantId` (`work_order_repository.dart:114-116, 124`), e se `_remoteApi != null` dispara `unawaited(_pullInBackground())` (`work_order_repository.dart:130-132`).
   - `_pullInBackground()` (`work_order_repository.dart:152-178`) chama:
     ```dart
     // mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart:158-161
     final remote = await _remoteApi!.fetchWorkOrders(
       tenantId: _session.activeTenant.tenantId,
     );
     await _upsertRemoteOrders(remote);
     ```
   - Não passa `assignedUserId`, nem `limit`, nem `offset`.

2. **No cliente HTTP (`mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart:10, 74-91`):**
   - A interface `WorkOrderRemoteApi.fetchWorkOrders({String? tenantId})` (`work_order_remote_api.dart:10`) só aceita `tenantId` (e a implementação `DioWorkOrderRemoteApi` nem usa o parâmetro `tenantId` na query, pois o interceptor de auth injeta o cabeçalho).
   - `DioWorkOrderRemoteApi.fetchWorkOrders` (`work_order_remote_api.dart:74-91`):
     ```dart
     // mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart:74-91
     @override
     Future<List<WorkOrder>> fetchWorkOrders({String? tenantId}) async {
       final response = await _dio.get<Map<String, dynamic>>(
         WorkOrderApiEndpoints.workOrders,
       );
       final data = response.data;
       if (data == null) return const [];
       final rawList = data['items'] as List<dynamic>? ?? const [];
       return rawList
           .whereType<Map<String, dynamic>>()
           .map(
             (json) => _workOrderFromRemoteJson(
               json,
               fallbackTenantId: _session.activeTenant.tenantId,
             ),
           )
           .toList();
     }
     ```
   - **Rota:** `GET /api/v1/work-orders` (`WorkOrderApiEndpoints.workOrders` em `mobile/flutter_app/lib/core/network/api_contracts.dart:26`).
   - **Parâmetros enviados:** **nenhum** (`queryParameters` ausente: não envia `assignedUserId`, `assignedOperatorId`, `limit` nem `offset`).
   - **Paginação:** ignora `data['pagination']` e lê apenas a primeira página default do backend (`limit = 20, offset = 0`, conforme `src/modules/work-orders/work-order.validators.ts:385-405`).

### 1.3. Onde grava o cache local

1. **Upsert no repositório (`mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart:181-205`):**
   ```dart
   // mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart:181-205
   Future<void> _upsertRemoteOrders(List<WorkOrder> remote) async {
     final stored = await _localStore.loadWorkOrders();
     final localByServerId = <String, WorkOrder>{
       for (final o in stored)
         if (o.serverId != null) o.serverId!: o,
     };

     for (final r in remote) {
       final existing = r.serverId != null ? localByServerId[r.serverId!] : null;
       // Preserve local orders that have pending changes not yet synced
       if (existing != null && existing.syncStatus == SyncStatus.pending) {
         continue;
       }
       final toSave = existing != null
           ? r.copyWith(localId: existing.localId)
           : r;
       await _localStore.saveWorkOrder(toSave);
     }

     final all = await _localStore.loadWorkOrders();
     _orders = all
         .where((o) => o.tenantId == _session.activeTenant.tenantId)
         .toList();
   }
   ```
2. **Persistência SQLite/Drift (`mobile/flutter_app/lib/core/local_db/drift_work_order_local_store.dart:26-66` e `app_database.dart:185-188, 255-284`):**
   - `workOrderLocalStoreProvider` (`work_order_repository.dart:687-689`) injeta `DriftWorkOrderLocalStore(ref.watch(appDatabaseProvider))`.
   - `DriftWorkOrderLocalStore.saveWorkOrder` (`drift_work_order_local_store.dart:26-66`) executa `INSERT OR REPLACE INTO work_orders (...) VALUES (...)` na tabela SQLite `work_orders` (criada em `mobile/flutter_app/lib/core/local_db/app_database.dart:255-284`, arquivo `erp_mobile.db` em `app_database.dart:185-188`).
   - Também durante o replay da fila de sync (`mobile/flutter_app/lib/core/sync/sync_providers.dart:141-214`), `buildWorkOrderSyncEntityUpdater` atualiza o registro em `DriftWorkOrderLocalStore.saveWorkOrder` quando uma ação de OS recebe `accepted`, `alreadyApplied`, `conflict` ou `failed`.

---

## 2. No backend (`src/modules/work-orders/**`): a rota de lista aceita `assignedUserId`? Ela IMPÕE "só as atribuídas" para `field_technician`, ou só oferece o filtro?

### 2.1. Inspeção estática (`file:line`)

- **Rota:** `src/modules/work-orders/work-order.routes.ts:103-109`
  ```ts
  router.get(
    "/work-orders",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    asyncHandler(async (request, response) => {
      await controller.list(request, response);
    }),
  );
  ```
  Exige apenas a permissão `work_orders:read`.
- **Controller:** `src/modules/work-orders/work-order.controller.ts:20-27`
  ```ts
  async list(request: Request, response: Response): Promise<void> {
    const actor = getWorkOrderActor(request);
    const result = await this.service.list(actor, asQueryRecord(request.query));

    response.status(200).json(toWorkOrderListDto(result.items, result.total, result.limit, result.offset));
  }
  ```
- **Service (`WorkOrderService.list`):** `src/modules/work-orders/work-order.service.ts:411-426`
  ```ts
  async list(actor: WorkOrderActorContext, query: RawRecord) {
    const filter: WorkOrderListFilter = {
      tenantId: actor.tenantId,
      status: query.status === undefined ? undefined : parseWorkOrderStatus(query.status),
      priority: query.priority === undefined ? undefined : parseWorkOrderPriority(query.priority),
      assignedOperatorId: parseOptionalUuid(query.assignedOperatorId, "assignedOperatorId"),
      assignedUserId: parseOptionalUuid(query.assignedUserId, "assignedUserId"),
      search: optionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    const result = await this.repository.list(filter);

    return { ...result, limit: filter.limit, offset: filter.offset };
  }
  ```
- **Repositórios (memória e Prisma):**
  - `src/modules/work-orders/work-order.repository.ts:291-299`:
    ```ts
    const filtered = [...this.workOrders.values()]
      .filter((workOrder) => workOrder.tenantId === input.tenantId)
      .filter((workOrder) => !input.status || workOrder.status === input.status)
      .filter((workOrder) => !input.priority || workOrder.priority === input.priority)
      .filter((workOrder) => !input.assignedOperatorId || workOrder.assignedOperatorId === input.assignedOperatorId)
      .filter((workOrder) => !input.assignedUserId || workOrder.assignedUserId === input.assignedUserId)
    ```
  - `src/modules/work-orders/work-order-prisma.repository.ts:787-794`:
    ```ts
    function buildWhere(input: WorkOrderListFilter): Prisma.WorkOrderWhereInput {
      return {
        tenant_id: input.tenantId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.assignedOperatorId ? { assigned_operator_id: input.assignedOperatorId } : {}),
        ...(input.assignedUserId ? { assigned_user_id: input.assignedUserId } : {}),
    ```

- **Resposta direta à pergunta 2:**
  1. **Aceita `assignedUserId`?** **Sim.** `WorkOrderService.list` (`src/modules/work-orders/work-order.service.ts:417`) valida `query.assignedUserId` via `parseOptionalUuid(query.assignedUserId, "assignedUserId")` (`src/modules/work-orders/work-order.validators.ts:361-373`) e filtra por `assigned_user_id` nos repositórios em memória (`work-order.repository.ts:297`) e Prisma (`work-order-prisma.repository.ts:793`).
  2. **Impõe "só as atribuídas" para `field_technician`?** **Não — apenas oferece o filtro opcional.** `WorkOrderService.list` (`work-order.service.ts:411-426`) e `WorkOrderService.get` (`work-order.service.ts:764-772`) **não** consultam `actor.roles` nem `actorMutatesAssignedOnly(actor)`. Inclusive, o comentário em `src/modules/work-orders/work-order.service.ts:809-810` registra explicitamente o comportamento atual:
     > *"Aqui a ordem EXISTE na organização do ator, ele pode LÊ-LA (`work_orders:read` é tenant-wide, e a lista do app depende disso) — o que ele não pode é MUTÁ-LA."*
  3. **Observação adicional relevante para o plano (dual-match de atribuição):** enquanto o guard de mutação `assertMutationObjectScope` (`src/modules/work-orders/work-order.service.ts:824-836`) reconhece uma OS atribuída ao técnico por **perfil** (`workOrder.assignedOperatorId === actorOperatorProfileId`) **OU** por **usuário** (`workOrder.assignedUserId === actor.userId || workOrder.assignedOperatorId === actor.userId`), o filtro `assignedUserId` em `list` compara apenas `assigned_user_id === input.assignedUserId`. Quando uma OS é atribuída via `POST /api/v1/work-orders/:id/assign` passando apenas `{ operatorId: <perfilId> }` sem `userId` (`work-order.service.ts:1712-1713`), `assigned_user_id` fica `null` e só `assigned_operator_id` é preenchido.

### 2.2. Cobertura de testes existente e execução fora do worktree

- **Busca por testes de `assignedUserId` na listagem em `tests/`:**
  ```powershell
  PS C:\Users\AMP\w-plan21> git -C C:/Users/AMP/w-plan21 grep -n "/api/v1/work-orders?" tests/ ; git -C C:/Users/AMP/w-plan21 grep -n "\.list(" tests/work-orders*
  tests/work-orders-routes.test.ts:32:    const listed = await requestJson(baseUrl, "/api/v1/work-orders?status=open", {
  tests/work-orders-list-coordinates.test.ts:33:  const result = await service.list(ctx, {});
  tests/work-orders-list-coordinates.test.ts:51:  const result = await service.list(ctx, {});
  tests/work-orders.test.ts:46:    const listA = await service.list(managerA, { limit: "20", offset: "0" });
  tests/work-orders.test.ts:47:    const listB = await service.list(managerB, { limit: "20", offset: "0" });
  tests/work-orders.test.ts:97:    await assert.rejects(() => service.list(manager, { limit: "0" }), /limit must be between 1 and 100/);
  ```
  Não há nenhum teste no repositório que passe `?assignedUserId=` para `GET /api/v1/work-orders` ou `service.list(..., { assignedUserId })`. Os testes de rotas/serviço e de escopo por objeto de OS são `tests/work-orders.test.ts`, `tests/work-orders-routes.test.ts` e `tests/o6r07a-wo-object-scope.test.ts`.

- **Execução dos testes existentes e da sonda de reprodução em `C:/Users/AMP/erp-pausa-2026-10-03/planos/san313-medicao/`:**
  ```powershell
  PS C:\Users\AMP\erp-pausa-2026-10-03\planos\san313-medicao> npx tsx --test tests/work-orders.test.ts tests/work-orders-routes.test.ts tests/o6r07a-wo-object-scope.test.ts
  TAP version 13
  # Subtest: D3 — técnico só muta a ordem atribuída a ele (update e status)
  ok 1 - D3 — técnico só muta a ordem atribuída a ele (update e status)
  # Subtest: D3 — gestão segue tenant-wide: manager muta a ordem de qualquer técnico
  ok 2 - D3 — gestão segue tenant-wide: manager muta a ordem de qualquer técnico
  # Subtest: D3 — ator com DOIS papéis: a união vence e quem tem gestão não cai no guard
  ok 3 - D3 — ator com DOIS papéis: a união vence e quem tem gestão não cai no guard
  # Subtest: D3 — 404 continua sendo do cross-tenant: o 403 novo não o substituiu
  ok 4 - D3 — 404 continua sendo do cross-tenant: o 403 novo não o substituiu
  # Subtest: D3 — a classificação de escopo é exaustiva e a união é por presença
  ok 5 - D3 — a classificação de escopo é exaustiva e a união é por presença
  # Subtest: D3/DM1 — atribuído por USER ID (a forma que o app grava): o técnico nomeado muta update E status
  ok 6 - D3/DM1 — atribuído por USER ID (a forma que o app grava): o técnico nomeado muta update E status
  # Subtest: D3/DM2 — o dual-match NÃO é permissão-a-mais: só o usuário nomeado passa, o colega segue 403
  ok 7 - D3/DM2 — o dual-match NÃO é permissão-a-mais: só o usuário nomeado passa, o colega segue 403
  # Subtest: D3/DM3 — as DUAS formas de atribuição coexistem e a fronteira 403/404 não se mexeu
  ok 8 - D3/DM3 — as DUAS formas de atribuição coexistem e a fronteira 403/404 não se mexeu
  # Subtest: work order routes enforce RBAC and expose CRUD/status/assign/timeline
  ok 9 - work order routes enforce RBAC and expose CRUD/status/assign/timeline
  # Subtest: work order routes validate payloads and block cross-tenant access
  ok 10 - work order routes validate payloads and block cross-tenant access
  # Subtest: Ω1b-2: geocode route enforces RBAC, honest disabled reason, 404/422/409 and force parsing
  ok 11 - Ω1b-2: geocode route enforces RBAC, honest disabled reason, 404/422/409 and force parsing
  # Subtest: work orders service cria, lista, atualiza, atribui, muda status e isola tenants
  ok 12 - work orders service cria, lista, atualiza, atribui, muda status e isola tenants
  # Subtest: work orders service valida payloads e filtros
  ok 13 - work orders service valida payloads e filtros
  1..13
  # tests 13
  # pass 13
  # fail 0
  ```

- **Sonda executada em `C:/Users/AMP/erp-pausa-2026-10-03/planos/san313-medicao/tests/sonda-list-assigned.test.ts` comprovando que `field_technician` lista todas as OS da organização sem filtro e até filtra pelas do colega:**
  ```powershell
  PS C:\Users\AMP\erp-pausa-2026-10-03\planos\san313-medicao> npx tsx --test tests/sonda-list-assigned.test.ts
  TAP version 13
  # Subtest: sonda B-SAN3-13: GET /api/v1/work-orders aceita assignedUserId opcional mas NAO impoe escopo para field_technician
  ok 1 - sonda B-SAN3-13: GET /api/v1/work-orders aceita assignedUserId opcional mas NAO impoe escopo para field_technician
    ---
    duration_ms: 1822.9031
    ...
  1..1
  # tests 1
  # pass 1
  # fail 0
  ```

---

## 3. As OS de seed: de onde vêm, onde são gravadas no aparelho e se algum caminho as apaga ou substitui

### 3.1. De onde vêm as OS de seed

- São geradas pela função privada `_seedOrders(BootstrapSession session)` em `mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart:743-790`, que fabrica 3 ordens fictícias com `tenantId: session.activeTenant.tenantId` e `serverId: null`:
  1. `localId: 'wo-local-1'`, `code: 'OS-1042'`, `title: 'Instalacao de ar-condicionado'`, `customerName: 'Comercial Horizonte'`, `status: WorkOrderStatus.inService`, `priority: WorkOrderPriority.high`, `syncStatus: SyncStatus.synced`, `assignedUserId: session.user.userId`, `checklistId: 'cl-seed-1'` (`work_order_repository.dart:747-762`).
  2. `localId: 'wo-local-2'`, `code: 'OS-1043'`, `title: 'Manutencao preventiva de bomba hidraulica'`, `customerName: 'Condominio Solar'`, `status: WorkOrderStatus.scheduled`, `priority: WorkOrderPriority.normal`, `syncStatus: SyncStatus.synced`, `assignedUserId: null` (`work_order_repository.dart:763-775`).
  3. `localId: 'wo-local-3'`, `code: 'OS-1044'`, `title: 'Reparo de painel eletrico'`, `customerName: 'Hospital Santa Clara'`, `status: WorkOrderStatus.pendingApproval`, `priority: WorkOrderPriority.urgent`, `syncStatus: SyncStatus.pending`, `assignedUserId: session.user.userId` (`work_order_repository.dart:776-788`).
- Além disso, o construtor de `WorkOrderRepository` (`work_order_repository.dart:46-64`) aceita `List<WorkOrder> seedWorkOrders = const []` (linha 53), usado como fallback antes de `_seedOrders(_session)` (linha 120).

### 3.2. Onde e quando são gravadas no aparelho

- Em `WorkOrderRepository.load({bool seedIfEmpty = true})` (`mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart:110-125`):
  ```dart
  // mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart:110-125
  Future<void> load({bool seedIfEmpty = true}) async {
    if (_loaded) return;
    final stored = await _localStore.loadWorkOrders();
    final tenantOrders = stored
        .where((o) => o.tenantId == _session.activeTenant.tenantId)
        .toList();

    if (stored.isEmpty && seedIfEmpty && _remoteApi == null) {
      if (_orders.isEmpty) {
        _orders = _seedOrders(_session);
      }
      await _localStore.saveWorkOrders(_orders);
    } else {
      _orders = tenantOrders;
    }
  ```
- Quando `_remoteApi == null` (o que ocorre em `workOrderRemoteApiProvider`, `work_order_repository.dart:692-699`, sempre que `!kIsRemoteAuth` ou quando `config.accessToken == null` no momento em que o provider é lido com `stored.isEmpty`), `_orders` recebe `_seedOrders(_session)` e **persiste as 3 OS no SQLite do aparelho** via `await _localStore.saveWorkOrders(_orders)` (`work_order_repository.dart:122` -> `DriftWorkOrderLocalStore.saveWorkOrders` em `mobile/flutter_app/lib/core/local_db/drift_work_order_local_store.dart:69-73` -> `saveWorkOrder` nas linhas `26-66`, gravando na tabela `work_orders` do arquivo `erp_mobile.db`, `app_database.dart:185-188, 255-284`).

### 3.3. Algum caminho as apaga ou substitui?

- **NÃO.** Uma vez gravadas na tabela SQLite `work_orders`, **nenhum caminho de produção as apaga ou substitui**:
  1. `_upsertRemoteOrders(List<WorkOrder> remote)` (`work_order_repository.dart:181-205`) indexa o cache local apenas por `serverId != null` (`localByServerId`, linhas `182-185`) e faz `saveWorkOrder(toSave)` (`INSERT OR REPLACE` pela chave primária `local_id`, `app_database.dart:256`). Como as seeds têm `serverId: null` e `localId` `'wo-local-1'`, `'wo-local-2'`, `'wo-local-3'`, enquanto as OS vindas do servidor recebem `localId: serverId ?? 'wo-remote-...'` (`work_order_remote_api.dart:196`), o upsert remoto **nunca colide com `wo-local-1..3` nem remove registros locais ausentes do retorno remoto**.
  2. Na próxima abertura do app (mesmo já autenticado com `_remoteApi != null`), `load()` lê `stored = await _localStore.loadWorkOrders()`, encontra `wo-local-1`, `wo-local-2`, `wo-local-3` no SQLite, e após `_upsertRemoteOrders(remote)` recarrega `final all = await _localStore.loadWorkOrders()` (`work_order_repository.dart:201-204`), misturando as seeds com as OS reais para sempre.
  3. O método `clearAll()` existe em `WorkOrderLocalStore` (`mobile/flutter_app/lib/features/work_orders/data/work_order_local_store.dart:13, 83-87`) e em `DriftWorkOrderLocalStore` (`mobile/flutter_app/lib/core/local_db/drift_work_order_local_store.dart:187-191`, `DELETE FROM work_orders`), mas **não tem nenhum chamador em `mobile/flutter_app/lib/`**:
     ```powershell
     PS C:\Users\AMP\w-plan21> git -C C:/Users/AMP/w-plan21 grep -n "clearAll" mobile/flutter_app/
     mobile/flutter_app/lib/core/local_db/drift_checklist_local_store.dart:332:  Future<void> clearAll() async {
     mobile/flutter_app/lib/core/local_db/drift_work_order_local_store.dart:188:  Future<void> clearAll() async {
     mobile/flutter_app/lib/features/checklists/data/checklist_local_store.dart:33:  Future<void> clearAll();
     mobile/flutter_app/lib/features/checklists/data/checklist_local_store.dart:152:  Future<void> clearAll() async {
     mobile/flutter_app/lib/features/work_orders/data/work_order_local_store.dart:13:  Future<void> clearAll();
     mobile/flutter_app/lib/features/work_orders/data/work_order_local_store.dart:84:  Future<void> clearAll() async {
     mobile/flutter_app/test/features/b097_mvp_stabilization_test.dart:171:      await store.clearAll();
     mobile/flutter_app/test/features/b097_mvp_stabilization_test.dart:172:      await clStore.clearAll();
     ```

---

## 4. O que acontece hoje com uma OS que deixa de estar atribuída ao técnico e tem ação pendente na fila offline (pode perder dado?)

A análise divide-se em **duas camadas**: (A) o que acontece no **cache local do aparelho** durante o pull (`_upsertRemoteOrders`) e (B) o que acontece no **replay da fila de sincronização** (`sync_actions` + uploads binários) contra o backend.

### 4.1. Camada A — Cache local (`work_orders`) durante o pull (`_upsertRemoteOrders`)

- **Hoje (`work_order_repository.dart:181-205`):**
  - `_upsertRemoteOrders` só faz `INSERT OR REPLACE` das OS que vieram em `remote` e **não deleta** do SQLite as OS que deixaram de vir no `GET /api/v1/work-orders`.
  - Para as OS que vêm em `remote`, a linha `191-193` protege apenas aquelas cujo próprio registro em `work_orders` está com `existing.syncStatus == SyncStatus.pending`:
    ```dart
    if (existing != null && existing.syncStatus == SyncStatus.pending) {
      continue;
    }
    ```
- **Atenção crítica sobre perda de estado local se uma futura limpeza apagar OS não atribuídas ou se a OS for sobrescrita:**
  - Nem toda ação offline ligada a uma OS marca `WorkOrder.syncStatus = SyncStatus.pending` na tabela `work_orders`!
  - **Marcam `wo.syncStatus = SyncStatus.pending`:**
    - `updateStatus` (`work_order_repository.dart:244`)
    - `assignRegistry` (`work_order_repository.dart:396`)
    - `completeWorkOrder` (`work_order_repository.dart:519`)
  - **NÃO alteram `wo.syncStatus` (a OS continua `SyncStatus.synced` na tabela `work_orders`, enquanto há trabalho offline pendente no aparelho):**
    1. `createApprovalRequest` (`work_order_repository.dart:458-501`): grava em `work_order_approvals` e enfileira `work_order.approval_request` em `sync_actions`, mas na linha `480` faz `_orders[idx] = wo.copyWith(approvalRequests: [...])` **sem mudar `syncStatus` para `pending`**.
    2. `attachEvidence` (`work_order_repository.dart:544-621`): grava em `work_order_evidence` (com `syncStatus: SyncStatus.pending`) e enfileira `evidence.work_order_*` em `sync_actions`, mas na linha `586` faz `_orders[idx] = wo.copyWith(evidence: [...])` **sem mudar `wo.syncStatus` para `pending`**.
    3. `reportUnableToStart` (`work_order_repository.dart:626-681`): enfileira `work_order.unable_to_start` em `sync_actions`, grava evento na timeline local, e **não toca em `wo.syncStatus`**.
    4. **Ações de checklist da OS** (`checklist.*` em `sync_actions` e anexos pendentes em `checklist_attachments` com `relatedEntityId == wo.serverId` ou `wo.checklistId`): ficam em tabelas próprias e **não mudam `wo.syncStatus`**.
  - Além disso, em `DriftWorkOrderLocalStore.loadWorkOrders()` (`drift_work_order_local_store.dart:76-119`), quando uma OS existe em `work_orders`, o store carrega suas `evidence` (`work_order_evidence`), `approvalRequests` (`work_order_approvals`) e `timeline` (`work_order_timeline_events`) fazendo join/filtro pelo `work_order_local_id`. Se a linha da OS em `work_orders` fosse deletada num expurgo de "OS que não são mais minhas", as evidências locais (`work_order_evidence`, inclusive com `localFilePath` ainda não enviado!), solicitações de aprovação e eventos daquela OS deixariam de ser carregados por `loadWorkOrders()`.

### 4.2. Camada B — Replay da fila offline (`sync_actions` e uploads) quando a OS foi desatribuída/reatribuída

O comportamento no replay depende do tipo da ação pendente e de o técnico ter registro em `work_order_assignments` (`hasActorBeenAssigned`, introduzido no `B-O6R-07c-b1`):

1. **`work_order.status_change` e `work_order.mileage` (`POST /api/v1/mobile/sync/work-orders`):**
   - No backend (`src/modules/mobile/mobile-work-order-sync.ts:242-259, 314-331` e `src/modules/work-orders/work-order.service.ts:816-853`):
     - `changeStatus` e `setMileage` chamam `assertMutationObjectScope`.
     - Se o técnico **já esteve atribuído** à OS (`hasActorBeenAssigned === true` em `work_order_assignments`, `work-order.service.ts:847-850`), lança `workOrderNotAssignedError(true)` (`previouslyAssigned: true`).
     - `mobile-work-order-sync.ts:314-331` captura `isPreviouslyAssignedRefusal(error)` e devolve `status: "conflict"`, `conflict_type: "assignment_changed_pending_review"`, `next_action: "await_supervisor_review"`.
     - No app (`mobile/flutter_app/lib/core/sync/sync_replay_service.dart:332-339, 755-762` e `sync_providers.dart:181-183`), a ação em `sync_actions` vai para `SyncStatus.conflict` (não é apagada e para de reenviar) e a OS local vai para `SyncStatus.conflict`.
     - **Porém**, se a atribuição anterior nunca gerou linha com `user_id` em `work_order_assignments` (ou `wasPreviouslyAssigned === false`), o backend devolve `status: "rejected"` (`reason: "not_assigned_to_actor"`). No app (`sync_replay_service.dart:325-331, 763-768`), `rejected` vira `SyncStatus.failed` com `retryCount + 1`, repetindo até `maxRetry = 5` (`sync_replay_service.dart:666`), após o que fica travada em `SyncStatus.failed` sem ir para a tela de conflitos.

2. **`evidence.work_order_photo`, `evidence.work_order_signature`, `evidence.work_order_observation` (`POST /api/v1/mobile/sync/evidence` + `POST /api/v1/mobile/evidence-uploads`):**
   - No sync de metadados (`src/modules/mobile/mobile-evidence-sync.ts:283-290, 400-418`), para `field_technician` chama `service.getForMutation(actor, workOrderId)`:
     - Se ex-técnico (`isPreviouslyAssignedRefusal`), devolve `status: "conflict"` (`assignment_changed_pending_review`). No app (`sync_replay_service.dart:930-937`), a ação em `sync_actions` vai para `SyncStatus.conflict`.
   - No upload binário multipart (`src/modules/mobile/mobile-evidence-upload.ts:130-145`), se o metadado já tinha subido antes da reatribuição e o binário sobe depois, o backend confere `getForMutation(actor, receipt.workOrderId)` e devolve HTTP `409 MOBILE_EVIDENCE_CONFLICT` (`assignment_changed_pending_review`).
   - No app (`sync_replay_service.dart:1022-1046`), `on ApiConflictError` marca a evidência como `SyncStatus.conflict` e **não apaga o arquivo local** (`deleteLocalFileIfExists` só roda em `status == 'stored'`, linha `996`). **Dado binário não se perde**, desde que a linha da OS/evidência não seja apagada do SQLite local.

3. **Ações de checklist (`checklist.item_answer`, `checklist.item_note`, `checklist.marker_create`, `checklist.divergence_create`, `checklist.acknowledgement_create`, `checklist.attachment_attach`, `checklist.complete` em `POST /api/v1/mobile/sync/checklists`):**
   - No backend (`src/modules/mobile/mobile-checklist-sync.ts:446, 473, 508, 557, 589, 630, 776-796`), `service.assertRunMutationScope(actor, runId)` verifica a OS vinculada à vistoria. Se o ator é ex-técnico (`isPreviouslyAssignedRefusal`), devolve `status: "conflict"` com `conflict_type: "assignment_changed_pending_review"`, `retriable: false`. No app (`sync_replay_service.dart:495-502`), a ação vai para `SyncStatus.conflict`.

4. **`work_order.approval_request` e `work_order.unable_to_start` (PERDA SILENCIOSA / FILA ÓRFÃ — independe até da reatribuição, agravada se a OS sumir):**
   - `createApprovalRequest` (`work_order_repository.dart:469`) enfileira `type: 'work_order.approval_request'` e `reportUnableToStart` (`work_order_repository.dart:649`) enfileira `type: 'work_order.unable_to_start'`.
   - Em `mobile/flutter_app/lib/core/sync/sync_replay_service.dart:580-586`:
     ```dart
     const Set<String> b107BackendWorkOrderActionTypes = {
       'work_order.status_change',
       'work_order.assign',
       'work_order.mileage',
     };
     ```
   - `WorkOrderSyncReplayService.replayTenant` (`sync_replay_service.dart:640-657`) filtra a fila apenas por `b107BackendWorkOrderActionTypes.contains(a.type)`!
   - Portanto, `work_order.approval_request` e `work_order.unable_to_start` **nunca são enviados pelo replay** e ficam eternamente com `status = 'pending'` na tabela `sync_actions` (defeito #5 / `B-SAN3-16`).

---

## 5. `RBAC_MATRIX.md`: o que `field_technician` pode ler sobre ordens de serviço (cite a linha)

- **`RBAC_MATRIX.md:35` (cabeçalho da matriz) e `RBAC_MATRIX.md:45` (linha de Work orders / service orders):**
  ```markdown
  35: | Domain / Capability | platform_admin | tenant_admin | manager | operator | finance | inventory | field_technician | auditor | support |
  ...
  45: | Work orders / service orders | full | full | full | create/edit | read | material-view | execute/update-assigned | read | support-view |
  ```
  Na linha **45**, a coluna de `field_technician` para `Work orders / service orders` define **`execute/update-assigned`** (enquanto `finance` e `auditor` têm `read`, `operator` tem `create/edit`, e `platform_admin`/`tenant_admin`/`manager` têm `full`).
- **`RBAC_MATRIX.md:66` (descrição dos papéis):**
  ```markdown
  66: - **field_technician** executes field work, records evidence, and updates assigned operational flows.
  ```
- **`RBAC_MATRIX.md:96` (permissões técnicas do módulo de OS):**
  ```markdown
  96: - work orders foundation uses work_orders:read, work_orders:create, work_orders:update, work_orders:assign, work_orders:status, work_orders:cancel and reserved work_orders:delete; all routes derive tenant_id from authenticated context and protect work_orders, work_order_events and work_order_assignments with RLS
  ```
- **`RBAC_MATRIX.md:117-118` (sub-recursos de OS — logs e mapa):**
  ```markdown
  117: - work_order audit-logs (leitura por OS) / aba Logs (Ω3F-8a) — GET /work-orders/:id/audit-logs gated por work_orders:read. ... Logo operator/field_technician/technician/manager/tenant_admin/super/platform (todos com work_orders:read) leem os logs da OS que já enxergam...
  118: - work_order map (Ω3F-8b, aba Mapa do Detalhe de OS) — 2 rotas, SEM permissão nova (reusa as existentes): GET /work-orders/:id/map-start-points (perm work_orders:read)...
  ```
- **Nota de governança em `docs/revisoes/SAN3/PLANO_SAN3.md:151, 525-527`:** `RBAC_MATRIX.md:45` dá a `field_technician` `execute/update-assigned` e não declara leitura tenant-wide; o §10.7 do `PLANO_SAN3.md` (`linhas 525-527`) fixa como padrão estrito que o técnico lista apenas as OS atribuídas a ele, imposto também no backend (`B-SAN3-13`).

---

## 6. Veredito por item (`ABERTO` / `FECHADO` / `PARCIAL`) com evidência e lista de arquivos que um conserto provavelmente tocaria

### 6.1. Vereditos

| Item | Pendência | Veredito | Evidência medida em `HEAD` (`7ab2fe71`) |
|---|---|---|---|
| **#32** | `P-MOBILE-MINHAS-OS-SEM-FILTRO` | **`ABERTO`** | 1. **App — UI:** `home_screen.dart:121-123` (`"Minhas OS"`) e `work_order_list_screen.dart:141, 349-364` (`"Ordens de Servico"`) filtram `woRepository.workOrders` apenas por `tenantId` (e filtros visuais de status/prioridade/busca), sem filtrar por `assignedUserId`. O método `workOrdersForUser` (`work_order_repository.dart:88-89`) tem 0 chamadores.<br>2. **App — Rede e Paginação:** `work_order_repository.dart:158-160` e `DioWorkOrderRemoteApi.fetchWorkOrders` (`work_order_remote_api.dart:74-91`) chamam `GET /api/v1/work-orders` sem nenhum query parameter (`assignedUserId`, `limit`, `offset` ausentes) e ignoram `data['pagination']`, lendo apenas os primeiros 20 itens (`limit` default do backend em `work-order.validators.ts:385-393`).<br>3. **Backend:** `WorkOrderService.list` (`src/modules/work-orders/work-order.service.ts:411-426`) aceita `assignedUserId` apenas como filtro opcional e **não impõe** escopo "só atribuídas" quando o ator é `field_technician`/`technician` (comprovado em execução por `sonda-list-assigned.test.ts`). |
| **#33** | `P-MOBILE-OS-SEEDS` | **`ABERTO`** | 1. **Geração e gravação no SQLite:** `WorkOrderRepository.load` (`work_order_repository.dart:118-122`) chama `_seedOrders(_session)` (`work_order_repository.dart:743-790`) quando `stored.isEmpty && seedIfEmpty && _remoteApi == null` e persiste `wo-local-1` (`OS-1042`), `wo-local-2` (`OS-1043`) e `wo-local-3` (`OS-1044`) na tabela SQLite `work_orders` via `_localStore.saveWorkOrders(_orders)` (`drift_work_order_local_store.dart:26-73`).<br>2. **Ausência de remoção/substituição:** `_upsertRemoteOrders` (`work_order_repository.dart:181-205`) só casa por `serverId != null` e nunca remove `wo-local-1..3` (que têm `serverId: null`) nem registros ausentes do pull remoto; `clearAll()` (`drift_work_order_local_store.dart:187-191`) tem 0 chamadores em `mobile/flutter_app/lib/`. |

### 6.2. Lista de arquivos que um conserto provavelmente tocaria (apenas lista)

**App Flutter (`mobile/flutter_app/`):**
- `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart`
- `mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart`
- `mobile/flutter_app/lib/features/work_orders/data/work_order_local_store.dart`
- `mobile/flutter_app/lib/core/local_db/drift_work_order_local_store.dart`
- `mobile/flutter_app/lib/shared/ui/home_screen.dart`
- `mobile/flutter_app/lib/features/work_orders/ui/work_order_list_screen.dart`
- `mobile/flutter_app/test/features/b099_real_work_orders_pull_test.dart`
- `mobile/flutter_app/test/features/work_orders/work_order_test.dart`

**Backend (`src/` e `tests/`):**
- `src/modules/work-orders/work-order.service.ts`
- `src/modules/work-orders/work-order.types.ts`
- `src/modules/work-orders/work-order.repository.ts`
- `src/modules/work-orders/work-order-prisma.repository.ts`
- `tests/work-orders.test.ts`
- `tests/work-orders-routes.test.ts`
- `tests/o6r07a-wo-object-scope.test.ts`
