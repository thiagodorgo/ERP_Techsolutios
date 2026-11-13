import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_interrupted_reclaim.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenantId = 'tenant-bo6r11';

SyncAction _action(
  String id,
  String type,
  SyncStatus status, {
  int retryCount = 0,
  DateTime? processedAt,
  Map<String, Object?> payload = const {'value': 'preserved'},
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: _tenantId,
    type: type,
    payload: payload,
    status: status,
    createdAt: DateTime.utc(2026, 10, 31, 12, 0, int.parse(id)),
    retryCount: retryCount,
    lastErrorCode: 'OLD_CODE',
    lastSafeError: 'old safe error',
    processedAt: processedAt,
  );
}

class _RecordingWorkOrderReplay extends WorkOrderSyncReplayService {
  _RecordingWorkOrderReplay(this.queue)
    : super(queue: queue, api: MockWorkOrderSyncBatchApi());

  final SyncQueueRepository queue;
  final received = <SyncAction>[];

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    received.addAll(
      (await queue.pendingForTenant(tenantId)).where(
        (action) =>
            action.type == WorkOrderSyncActionTypes.statusUpdate &&
            action.status != SyncStatus.conflict,
      ),
    );
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

class _RecordingChecklistReplay extends ChecklistSyncReplayService {
  _RecordingChecklistReplay(this.queue)
    : super(queue: queue, api: MockChecklistSyncBatchApi());

  final SyncQueueRepository queue;
  final received = <SyncAction>[];

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    received.addAll(
      (await queue.pendingForTenant(tenantId)).where(
        (action) =>
            action.type == ChecklistSyncActionTypes.answerUpsert &&
            action.status != SyncStatus.conflict,
      ),
    );
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

class _RecordingEvidenceReplay extends EvidenceSyncReplayService {
  _RecordingEvidenceReplay(this.queue)
    : super(queue: queue, api: const PendingEvidenceSyncBatchApi());

  final SyncQueueRepository queue;
  final received = <SyncAction>[];

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    received.addAll(
      (await queue.pendingForTenant(tenantId)).where(
        (action) =>
            action.type == WorkOrderSyncActionTypes.evidenceAttach &&
            action.status != SyncStatus.conflict,
      ),
    );
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

BootstrapSession _session() => const BootstrapSession(
  activeTenant: TenantContext(
    tenantId: _tenantId,
    displayName: 'B-O6R-11 Test',
  ),
  enabledModules: [],
  permissions: PermissionSet({'dashboard:read'}),
);

void main() {
  group('reclaimInterruptedSyncing', () {
    test('converte somente ações syncing', () {
      final result = reclaimInterruptedSyncing([
        _action('1', WorkOrderSyncActionTypes.statusUpdate, SyncStatus.pending),
        _action('2', WorkOrderSyncActionTypes.statusUpdate, SyncStatus.syncing),
        _action('3', WorkOrderSyncActionTypes.statusUpdate, SyncStatus.synced),
      ]);

      expect(result.map((action) => action.clientActionId), ['2']);
      expect(result.single.status, SyncStatus.conflict);
    });

    test(
      'preserva identidade, payload, criação e retry; limpa processedAt',
      () {
        final original = _action(
          '4',
          WorkOrderSyncActionTypes.statusUpdate,
          SyncStatus.syncing,
          retryCount: 3,
          processedAt: DateTime.utc(2026, 10, 30),
          payload: const {
            'nested': {'id': 7},
          },
        );

        final result = reclaimInterruptedSyncing([original]).single;

        expect(result.clientActionId, original.clientActionId);
        expect(result.tenantId, original.tenantId);
        expect(result.type, original.type);
        expect(result.payload, original.payload);
        expect(result.createdAt, original.createdAt);
        expect(result.retryCount, 3);
        expect(result.processedAt, isNull);
        expect(result.lastErrorCode, syncInterruptedErrorCode);
      },
    );

    test('entrada vazia devolve lista vazia', () {
      expect(reclaimInterruptedSyncing(const []), isEmpty);
    });

    test('preserva a ordem original das ações syncing', () {
      final result = reclaimInterruptedSyncing([
        _action('5', 'unknown.first', SyncStatus.syncing),
        _action('6', 'unknown.second', SyncStatus.syncing),
      ]);

      expect(result.map((action) => action.clientActionId), ['5', '6']);
    });

    // B-MATERIAL-REENVIO (C2 item 16, S10) — mudança de requisito declarada: o material
    // da OS passou de "falha fechado em conflict" a "volta para pending", porque o backend
    // agora baixa por origem, de forma durável e idempotente.
    test('os quatro tipos RDV e os dois de material duráveis voltam para '
        'pending', () {
      final result = reclaimInterruptedSyncing([
        _action('7', ExpenseSyncActionTypes.reportCreate, SyncStatus.syncing),
        _action('8', ExpenseSyncActionTypes.itemCreate, SyncStatus.syncing),
        _action('9', ExpenseSyncActionTypes.reportSubmit, SyncStatus.syncing),
        // B-RDV-COMPROVANTE: o comprovante interrompido tambem volta sozinho.
        _action('10', ExpenseSyncActionTypes.receiptAttach, SyncStatus.syncing),
        _action('11', InventorySyncActionTypes.materialAdd, SyncStatus.syncing),
        _action(
          '12',
          InventorySyncActionTypes.materialRemove,
          SyncStatus.syncing,
        ),
      ]);

      expect(result, hasLength(6));
      expect(
        result.every((action) => action.status == SyncStatus.pending),
        isTrue,
      );
      expect(
        result.every(
          (action) => action.lastSafeError == syncInterruptedAutoSafeError,
        ),
        isTrue,
      );
    });

    test('demais domínios e tipo desconhecido falham fechados em conflict', () {
      // B-RDV-COMPROVANTE: receiptAttach saiu desta classe — entrou em
      // kAutoResendAfterInterruption (comprovante interrompido volta a pending
      // e o replay multipart o retoma; o blob local esta preservado).
      final types = [
        WorkOrderSyncActionTypes.statusUpdate,
        ChecklistSyncActionTypes.answerUpsert,
        EvidenceSyncActionTypes.workOrderPhoto,
        'unknown.action',
      ];
      final result = reclaimInterruptedSyncing([
        for (var index = 0; index < types.length; index++)
          _action('${index + 1}', types[index], SyncStatus.syncing),
      ]);

      expect(result, hasLength(types.length));
      expect(
        result.every((action) => action.status == SyncStatus.conflict),
        isTrue,
      );
      expect(
        result.every(
          (action) => action.lastSafeError == syncInterruptedManualSafeError,
        ),
        isTrue,
      );
    });
  });

  test('coordenador resgata fila Drift antes dos replays de domínio', () async {
    final db = AppDatabase.openInMemory();
    addTearDown(db.close);
    final queue = PersistentSyncQueueRepository(DriftSyncActionStore(db));
    final workOrders = _RecordingWorkOrderReplay(queue);
    final checklists = _RecordingChecklistReplay(queue);
    final evidences = _RecordingEvidenceReplay(queue);
    final expenseApi = CaptureBatchApi(
      (batch) => [
        for (final action in batch)
          SyncActionResult(
            clientActionId: action.clientActionId,
            status: 'processed',
          ),
      ],
    );
    final expenseReplay = SyncReplayService(
      queue: queue,
      api: expenseApi,
      supportedActionTypes: ExpenseSyncActionTypes.supported,
    );

    final seeded = [
      _action(
        '1',
        WorkOrderSyncActionTypes.statusUpdate,
        SyncStatus.syncing,
        retryCount: 2,
      ),
      _action('2', ChecklistSyncActionTypes.answerUpsert, SyncStatus.syncing),
      _action('3', WorkOrderSyncActionTypes.evidenceAttach, SyncStatus.syncing),
      _action(
        '4',
        ExpenseSyncActionTypes.reportCreate,
        SyncStatus.syncing,
        retryCount: 4,
      ),
      _action('5', WorkOrderSyncActionTypes.statusUpdate, SyncStatus.pending),
      _action('6', 'already.synced', SyncStatus.synced, retryCount: 1),
      _action('7', ExpenseSyncActionTypes.itemCreate, SyncStatus.conflict),
    ];
    for (final action in seeded) {
      await queue.enqueue(action);
    }

    final container = ProviderContainer(
      overrides: [
        appDatabaseProvider.overrideWithValue(db),
        syncQueueRepositoryProvider.overrideWithValue(queue),
        bootstrapSessionProvider.overrideWith((ref) async => _session()),
        workOrderSyncReplayServiceProvider.overrideWithValue(workOrders),
        checklistSyncReplayServiceProvider.overrideWithValue(checklists),
        evidenceSyncReplayServiceProvider.overrideWithValue(evidences),
        syncReplayServiceProvider.overrideWithValue(expenseReplay),
        evidenceBinaryUploadServiceProvider.overrideWithValue(
          EvidenceBinaryUploadService(
            store: InMemoryWorkOrderLocalStore(),
            blobStore: InMemoryEvidenceBlobStore(),
            api: const PendingEvidenceUploadApi(),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);

    await container.read(bootstrapSessionProvider.future);
    container.read(autoSyncCoordinatorProvider);
    await container.read(autoSyncCoordinatorProvider.notifier).triggerManual();

    final after = await queue.actionsForTenant(_tenantId);
    final byId = {for (final action in after) action.clientActionId: action};

    for (final id in ['1', '2', '3']) {
      expect(byId[id]!.status, SyncStatus.conflict);
      expect(byId[id]!.lastErrorCode, syncInterruptedErrorCode);
    }
    expect(workOrders.received.map((action) => action.clientActionId), ['5']);
    expect(checklists.received, isEmpty);
    expect(evidences.received, isEmpty);
    expect(byId['4']!.status, SyncStatus.synced);
    expect(expenseApi.captured!.map((action) => action.clientActionId), ['4']);
    expect(byId['6'], seeded[5]);
    expect(byId['7'], seeded[6]);
    expect(byId['1']!.retryCount, 2);
    expect(byId['1']!.payload, seeded[0].payload);
    expect(byId['4']!.retryCount, 4);
    expect(byId['4']!.payload, seeded[3].payload);
    expect(
      (await queue.pendingForTenant(_tenantId)).where(
        (action) =>
            action.status == SyncStatus.conflict &&
            action.lastErrorCode == syncInterruptedErrorCode,
      ),
      hasLength(3),
    );
  });
}
