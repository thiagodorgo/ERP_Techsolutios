import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// B-SAN3-14 (R-A5) — A PRÉ-CARGA NO PASSE DE SYNC: a coleta e a entrega das OS
// de guincho abertas chegam ao aparelho sem depender de abrir a tela, e o
// provedor de produção monta a fonte das OS (sem ela a pré-carga seria um
// no-op silencioso). Arnês do `b090b_offline_auto_sync_test.dart`.

const _tenant = 'tenant-bsan314-sync';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Guincho'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read'}),
);

class _NullQueue implements SyncQueueRepository {
  @override
  Future<void> enqueue(SyncAction action) async {}
  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async => const [];
  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) async => const [];
  @override
  Future<void> update(SyncAction action) async {}
}

class _NoopSyncReplayService extends SyncReplayService {
  _NoopSyncReplayService()
    : super(queue: _NullQueue(), api: MockExpenseSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _NoopChecklistSyncReplayService extends ChecklistSyncReplayService {
  _NoopChecklistSyncReplayService()
    : super(queue: _NullQueue(), api: MockChecklistSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _NoopWorkOrderSyncReplayService extends WorkOrderSyncReplayService {
  _NoopWorkOrderSyncReplayService()
    : super(queue: _NullQueue(), api: MockWorkOrderSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _NoopEvidenceSyncReplayService extends EvidenceSyncReplayService {
  _NoopEvidenceSyncReplayService()
    : super(queue: _NullQueue(), api: const PendingEvidenceSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _FakeRemoteApi implements ChecklistRemoteApi {
  final List<String> fetchedWorkOrderIds = [];

  @override
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
  }) async {
    fetchedWorkOrderIds.add(workOrderId);
    return [
      RemoteChecklistRun(
        id: 'srv-e-$workOrderId',
        checklistId: 'cl-1',
        status: 'in_progress',
        kind: MobileChecklistRunKind.delivery,
      ),
    ];
  }

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId) =>
      Future.value(
        const MobileChecklistSchema(
          id: 'schema-1',
          checklistId: 'cl-1',
          version: 'v1',
          title: 'Vistoria',
          fields: [],
        ),
      );

  @override
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  }) async => const [];

  @override
  Future<String> createRun({
    required String checklistId,
    required String workOrderId,
    required String tenantId,
    required String userId,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> patchRun({
    required String runId,
    required Map<String, Object?> answers,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> completeRun(String runId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<void> createMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> createDivergence({
    required String runId,
    required String description,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> attachMetadata({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? checksum,
  }) => Future.error(const ApiNetworkError());
}

// Repositório que só conta as pré-cargas do passe.
class _SpyChecklistRepository extends ChecklistRepository {
  _SpyChecklistRepository()
    : super(
        session: _session,
        syncQueue: InMemorySyncQueueRepository(),
        actionFactory: SyncActionFactory(),
        localStore: InMemoryChecklistLocalStore(),
        remoteApi: const PendingBackendChecklistRemoteApi(),
      );

  int prefetchCalls = 0;

  @override
  Future<void> prefetchRunsForOpenTowWorkOrders() async {
    prefetchCalls++;
  }
}

WorkOrder _order(
  String id, {
  required WorkOrderServiceType type,
  required WorkOrderStatus status,
}) => WorkOrder(
  localId: id,
  serverId: id,
  tenantId: _tenant,
  code: 'OS-$id',
  title: 'OS $id',
  customerName: 'Cliente',
  serviceAddress: 'Rua 1',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 11),
  checklistId: 'cl-1',
  serviceType: type,
);

void main() {
  test('o passe de sync chama a pré-carga das OS de guincho abertas', () async {
    final spy = _SpyChecklistRepository();
    final container = ProviderContainer(
      overrides: [
        bootstrapSessionProvider.overrideWith((ref) async => _session),
        syncReplayServiceProvider.overrideWithValue(_NoopSyncReplayService()),
        workOrderSyncReplayServiceProvider.overrideWithValue(
          _NoopWorkOrderSyncReplayService(),
        ),
        checklistSyncReplayServiceProvider.overrideWithValue(
          _NoopChecklistSyncReplayService(),
        ),
        evidenceSyncReplayServiceProvider.overrideWithValue(
          _NoopEvidenceSyncReplayService(),
        ),
        evidenceBinaryUploadServiceProvider.overrideWithValue(
          EvidenceBinaryUploadService(
            store: InMemoryWorkOrderLocalStore(),
            blobStore: InMemoryEvidenceBlobStore(),
            api: const PendingEvidenceUploadApi(),
          ),
        ),
        checklistRepositoryProvider.overrideWithValue(spy),
      ],
    );
    addTearDown(container.dispose);
    await container.read(bootstrapSessionProvider.future);
    container.read(autoSyncCoordinatorProvider);

    await container.read(autoSyncCoordinatorProvider.notifier).triggerManual();

    expect(spy.prefetchCalls, 1);
    expect(container.read(autoSyncCoordinatorProvider).lastSafeError, isNull);
  });

  test('o provedor do repositório monta a fonte das OS de guincho: a pré-carga '
      'busca as execuções da OS de guincho aberta e ignora a concluída e a de '
      'prestador', () async {
    final remote = _FakeRemoteApi();
    final workOrders = InMemoryWorkOrderLocalStore([
      _order(
        'wo-aberta',
        type: WorkOrderServiceType.tow,
        status: WorkOrderStatus.inService,
      ),
      _order(
        'wo-concluida',
        type: WorkOrderServiceType.tow,
        status: WorkOrderStatus.completed,
      ),
      _order(
        'wo-prestador',
        type: WorkOrderServiceType.provider,
        status: WorkOrderStatus.inService,
      ),
    ]);
    final checklistStore = InMemoryChecklistLocalStore();
    final container = ProviderContainer(
      overrides: [
        bootstrapSessionProvider.overrideWith((ref) async => _session),
        checklistLocalStoreProvider.overrideWithValue(checklistStore),
        checklistRemoteApiProvider.overrideWithValue(remote),
        syncQueueRepositoryProvider.overrideWithValue(
          InMemorySyncQueueRepository(),
        ),
        evidenceBlobStoreProvider.overrideWithValue(
          InMemoryEvidenceBlobStore(),
        ),
        workOrderLocalStoreProvider.overrideWithValue(workOrders),
      ],
    );
    addTearDown(container.dispose);
    await container.read(bootstrapSessionProvider.future);

    await container
        .read(checklistRepositoryProvider)
        .prefetchRunsForOpenTowWorkOrders();

    expect(remote.fetchedWorkOrderIds, ['wo-aberta']);
    final runs = await checklistStore.loadRunsForWorkOrder('wo-aberta');
    expect(runs.single.kind, MobileChecklistRunKind.delivery);
    expect(runs.single.serverId, 'srv-e-wo-aberta');

    // Com a entrega já casada, o passe seguinte não busca de novo.
    await container
        .read(checklistRepositoryProvider)
        .prefetchRunsForOpenTowWorkOrders();
    expect(remote.fetchedWorkOrderIds, ['wo-aberta']);
  });
}
