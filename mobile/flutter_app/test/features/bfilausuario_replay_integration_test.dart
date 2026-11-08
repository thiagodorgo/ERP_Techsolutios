// B-FILA-USUARIO (A-F6) — integração com AutoSyncCoordinator e retenção da OS
// (RA5(1), RA5(2)).
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/location/device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-ra5';

AuthSession _authSession({required String sub}) => AuthSession(
  tokens: AuthTokens(
    accessToken: 'tok-$sub',
    refreshToken: 'ref-$sub',
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 2)),
  ),
  user: AuthUser(
    sub: sub,
    email: '$sub@erp.local',
    tenantId: _tenant,
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    permissions: const ['work_orders:read', 'work_orders:update'],
    scope: 'tenant',
  ),
);

BootstrapSession _bootstrapSession({required String userId}) =>
    BootstrapSession(
      activeTenant: const TenantContext(
        tenantId: _tenant,
        displayName: 'Organização RA5',
      ),
      enabledModules: const [],
      permissions: const PermissionSet({
        'work_orders:read',
        'work_orders:update',
      }),
      user: AuthenticatedUser(
        userId: userId,
        email: '$userId@erp.local',
        tenantRole: 'field_technician',
        tenantRoles: const ['field_technician'],
        scope: 'tenant',
      ),
    );

class _StatusRecordingQueue implements SyncQueueRepository {
  _StatusRecordingQueue(this._inner);

  final SyncQueueRepository _inner;
  final Map<String, List<SyncStatus>> recordedUpdates = {};

  List<SyncStatus> statusesFor(String clientActionId) =>
      recordedUpdates[clientActionId] ?? const <SyncStatus>[];

  @override
  Future<void> enqueue(SyncAction action) => _inner.enqueue(action);

  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) =>
      _inner.pendingForTenant(tenantId);

  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) =>
      _inner.actionsForTenant(tenantId);

  @override
  Future<void> update(SyncAction action) async {
    recordedUpdates
        .putIfAbsent(action.clientActionId, () => <SyncStatus>[])
        .add(action.status);
    await _inner.update(action);
  }
}

class _WalkingEmptyWorkOrderApi
    implements WorkOrderRemoteApi, WalkingWorkOrderRemoteApi {
  const _WalkingEmptyWorkOrderApi();

  @override
  Future<WorkOrderFetchResult> fetchAssignedOpenWorkOrders({
    String? tenantId,
  }) async => const WorkOrderFetchResult(orders: [], complete: true);

  @override
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId}) async => const [];

  @override
  Future<WorkOrder> fetchWorkOrder(String id) => throw UnimplementedError();

  @override
  Future<WorkOrder> updateWorkOrderStatus(String id, WorkOrderStatus s) =>
      throw UnimplementedError();

  @override
  Future<List<WorkOrderTimelineEvent>> fetchTimeline(String id) async =>
      const [];

  @override
  Future<WorkOrder> assignWorkOrder(String id, String userId, {String? note}) =>
      throw UnimplementedError();

  @override
  Future<void> createApprovalRequest(String id, WorkOrderApprovalRequest r) =>
      throw UnimplementedError();
}

SyncAction _seedAction({
  required String id,
  required String type,
  required String? userId,
  Map<String, Object?> payload = const {},
  SyncStatus status = SyncStatus.pending,
}) => SyncAction(
  clientActionId: id,
  tenantId: _tenant,
  type: type,
  status: status,
  payload: payload,
  createdAt: DateTime.utc(2026, 11, 8, 10),
  userId: userId,
);

WorkOrder _syncedOrder(String localId, String serverId) => WorkOrder(
  localId: localId,
  serverId: serverId,
  tenantId: _tenant,
  code: 'OS-$localId',
  title: 'Ordem $localId',
  customerName: 'Cliente RA5',
  serviceAddress: 'Rua Operacional, 100',
  status: WorkOrderStatus.scheduled,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 8, 9),
);

void main() {
  group('B-FILA-USUARIO · RA5 — integração replay e retenção', () {
    test(
      'RA5(1): sob sessão u2, triggerManual envia apenas a despesa de u2 e mantém ações de u1 e legado pending sem passar por syncing',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);

        final rawQueue = _StatusRecordingQueue(
          PersistentSyncQueueRepository(DriftSyncActionStore(db)),
        );
        final tokenStorage = InMemoryAuthTokenStorage();
        await tokenStorage.saveSession(_authSession(sub: 'u2'));

        final expenseApi = CaptureBatchApi(
          (batch) => [
            for (final a in batch)
              SyncActionResult(
                clientActionId: a.clientActionId,
                status: 'processed',
                resultRef: 'srv-${a.clientActionId}',
              ),
          ],
        );
        final workOrderApi = CaptureWorkOrderBatchApi(
          (batch) => [
            for (final a in batch)
              SyncActionResult(
                clientActionId: a.clientActionId,
                status: 'processed',
                resultRef: 'srv-${a.clientActionId}',
              ),
          ],
        );

        await rawQueue.enqueue(
          _seedAction(
            id: 'exp-u1',
            type: ExpenseSyncActionTypes.reportCreate,
            userId: 'u1',
            payload: const {'local_id': 'rep-u1', 'title': 'Despesa U1'},
          ),
        );
        await rawQueue.enqueue(
          _seedAction(
            id: 'exp-u2',
            type: ExpenseSyncActionTypes.reportCreate,
            userId: 'u2',
            payload: const {'local_id': 'rep-u2', 'title': 'Despesa U2'},
          ),
        );
        await rawQueue.enqueue(
          _seedAction(
            id: 'wo-u1',
            type: WorkOrderSyncActionTypes.statusUpdate,
            userId: 'u1',
            payload: const {
              'local_id': 'wo-u1',
              'server_id': 'srv-wo-u1',
              'new_status': 'in_service',
            },
          ),
        );
        await rawQueue.enqueue(
          _seedAction(
            id: 'exp-legacy',
            type: ExpenseSyncActionTypes.reportCreate,
            userId: null,
            payload: const {'local_id': 'rep-leg', 'title': 'Despesa Legada'},
          ),
        );

        final container = ProviderContainer(
          overrides: [
            appDatabaseProvider.overrideWithValue(db),
            syncQueueRepositoryProvider.overrideWithValue(rawQueue),
            authTokenStorageProvider.overrideWithValue(tokenStorage),
            bootstrapSessionProvider.overrideWith(
              (ref) async => _bootstrapSession(userId: 'u2'),
            ),
            syncBatchApiProvider.overrideWithValue(expenseApi),
            workOrderSyncBatchApiProvider.overrideWithValue(workOrderApi),
            checklistSyncBatchApiProvider.overrideWithValue(
              const PendingBackendChecklistSyncBatchApi(),
            ),
            evidenceSyncBatchApiProvider.overrideWithValue(
              const PendingEvidenceSyncBatchApi(),
            ),
            evidenceBinaryUploadServiceProvider.overrideWithValue(
              EvidenceBinaryUploadService(
                store: InMemoryWorkOrderLocalStore(),
                blobStore: InMemoryEvidenceBlobStore(),
                api: const PendingEvidenceUploadApi(),
              ),
            ),
            fieldLocationSyncServiceProvider.overrideWithValue(
              FieldLocationSyncService(
                store: InMemoryFieldLocationStore(),
                api: const PendingFieldLocationApi(),
                deviceLocationProvider: const PendingDeviceLocationProvider(),
              ),
            ),
          ],
        );
        addTearDown(container.dispose);

        await container.read(authStateProvider.future);
        await container.read(bootstrapSessionProvider.future);
        expect(container.read(currentSyncUserIdProvider), 'u2');

        await container
            .read(autoSyncCoordinatorProvider.notifier)
            .triggerManual();

        expect(
          expenseApi.captured?.map((a) => a.clientActionId).toList(),
          const ['exp-u2'],
        );
        expect(workOrderApi.captured, isNull);

        final byId = {
          for (final a in await rawQueue.actionsForTenant(_tenant))
            a.clientActionId: a,
        };
        expect(byId['exp-u2']!.status, SyncStatus.synced);
        expect(byId['exp-u1']!.status, SyncStatus.pending);
        expect(byId['exp-u1']!.retryCount, 0);
        expect(byId['wo-u1']!.status, SyncStatus.pending);
        expect(byId['wo-u1']!.retryCount, 0);
        expect(byId['exp-legacy']!.status, SyncStatus.pending);

        expect(rawQueue.statusesFor('exp-u1'), isEmpty);
        expect(rawQueue.statusesFor('wo-u1'), isEmpty);
        expect(rawQueue.statusesFor('exp-legacy'), isEmpty);
        expect(rawQueue.statusesFor('exp-u2'), const [
          SyncStatus.syncing,
          SyncStatus.synced,
        ]);
      },
    );

    test(
      'RA5(2): sob sessão u2, a reconciliação continua retendo a OS e a vistoria pendentes de u1 (PA3)',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);

        final tokenStorage = InMemoryAuthTokenStorage();
        await tokenStorage.saveSession(_authSession(sub: 'u2'));

        final woStore = DriftWorkOrderLocalStore(db);
        final checklistStore = DriftChecklistLocalStore(db);
        final prestadorStore = DriftPrestadorLocalStore(db);

        await woStore.saveWorkOrder(_syncedOrder('wo-u1', 'srv-wo-u1'));
        await woStore.saveWorkOrder(_syncedOrder('wo-cl-u1', 'srv-wo-cl-u1'));
        await woStore.saveWorkOrder(_syncedOrder('wo-clean', 'srv-wo-clean'));

        await checklistStore.saveRun(
          MobileChecklistRun(
            localId: 'run-u1',
            tenantId: _tenant,
            checklistId: 'cl-1',
            workOrderId: 'srv-wo-cl-u1',
            schemaVersion: '1',
            status: MobileChecklistRunStatus.inProgress,
            executedByUserId: 'u1',
            startedAt: DateTime.utc(2026, 11, 8, 9),
            syncStatus: SyncStatus.synced,
            answers: const {},
          ),
        );

        final container = ProviderContainer(
          overrides: [
            appDatabaseProvider.overrideWithValue(db),
            authTokenStorageProvider.overrideWithValue(tokenStorage),
            bootstrapSessionProvider.overrideWith(
              (ref) async => _bootstrapSession(userId: 'u2'),
            ),
            remoteAuthModeProvider.overrideWithValue(true),
            workOrderRemoteApiProvider.overrideWithValue(
              const _WalkingEmptyWorkOrderApi(),
            ),
            evidenceBlobStoreProvider.overrideWithValue(
              InMemoryEvidenceBlobStore(),
            ),
          ],
        );
        addTearDown(container.dispose);

        await container.read(authStateProvider.future);
        await container.read(bootstrapSessionProvider.future);

        final rawQueue = container.read(syncQueueRepositoryProvider);
        await rawQueue.enqueue(
          _seedAction(
            id: 'act-wo-u1',
            type: WorkOrderSyncActionTypes.statusUpdate,
            userId: 'u1',
            payload: const {
              'local_id': 'wo-u1',
              'server_id': 'srv-wo-u1',
              'new_status': 'in_service',
            },
          ),
        );
        await rawQueue.enqueue(
          _seedAction(
            id: 'act-cl-u1',
            type: ChecklistSyncActionTypes.answerUpsert,
            userId: 'u1',
            payload: const {'local_run_id': 'run-u1'},
          ),
        );

        // 1) Provider de produção (fila crua + buildWorkOrderExternalPendingWork).
        await container.read(workOrderRepositoryProvider).refresh();
        final retainedByProd =
            (await woStore.loadWorkOrders()).map((o) => o.localId).toList()
              ..sort();
        expect(retainedByProd, const ['wo-cl-u1', 'wo-u1']);

        // 2) Decorador (replaySyncQueueRepositoryProvider.actionsForTenant) — PA3 / M-A6:
        // mesmo lido através do decorador sob sessão u2, actionsForTenant devolve
        // todas as ações do tenant e retém as OS de u1.
        await woStore.saveWorkOrder(
          _syncedOrder('wo-clean-2', 'srv-wo-clean-2'),
        );
        final scopedRepo = WorkOrderRepository(
          session: _bootstrapSession(userId: 'u2'),
          syncQueue: container.read(replaySyncQueueRepositoryProvider),
          actionFactory: SyncActionFactory(),
          localStore: woStore,
          remoteApi: const _WalkingEmptyWorkOrderApi(),
          evidenceBlobStore: InMemoryEvidenceBlobStore(),
          allowSeedOrders: false,
          hasExternalPendingWork: buildWorkOrderExternalPendingWork(
            checklistStore: () => checklistStore,
            prestadorStore: () => prestadorStore,
          ),
        );
        await scopedRepo.refresh();
        final retainedByScoped =
            (await woStore.loadWorkOrders()).map((o) => o.localId).toList()
              ..sort();
        expect(retainedByScoped, const ['wo-cl-u1', 'wo-u1']);
      },
    );
  });
}
