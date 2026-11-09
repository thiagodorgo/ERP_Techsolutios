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
import 'package:erp_techsolutions_mobile/core/sync/sync_action_presentation.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_interrupted_reclaim.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

SyncAction _action(
  String id,
  String type,
  SyncStatus status, {
  int retryCount = 0,
  String? errorCode = 'OLD_CODE',
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: 'tenant-awaiting',
    userId: 'u-awaiting',
    type: type,
    payload: {
      'id': id,
      'nested': const {'value': 7},
    },
    status: status,
    createdAt: DateTime.utc(2026, 11, 2, 12, 0, int.parse(id)),
    retryCount: retryCount,
    lastErrorCode: errorCode,
    lastSafeError: errorCode == null ? null : 'erro anterior',
    processedAt: DateTime.utc(2026, 11, 1),
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
            action.status != SyncStatus.conflict &&
            action.retryCount < maxRetry,
      ),
    );
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

class _NoopChecklistReplay extends ChecklistSyncReplayService {
  _NoopChecklistReplay(SyncQueueRepository queue)
    : super(queue: queue, api: MockChecklistSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _NoopEvidenceReplay extends EvidenceSyncReplayService {
  _NoopEvidenceReplay(SyncQueueRepository queue)
    : super(queue: queue, api: const PendingEvidenceSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

BootstrapSession _session() => const BootstrapSession(
  activeTenant: TenantContext(
    tenantId: 'tenant-awaiting',
    displayName: 'B-O6R-11 Despesas',
  ),
  enabledModules: [],
  permissions: PermissionSet({'dashboard:read'}),
);

Future<({Map<String, SyncAction> byId, List<String> workOrderReceived})>
_runCoordinatorScenario({ExpenseSyncBatchApi? expenseApi}) async {
  final db = AppDatabase.openInMemory();
  addTearDown(db.close);
  final queue = PersistentSyncQueueRepository(DriftSyncActionStore(db));
  final workOrders = _RecordingWorkOrderReplay(queue);
  final overrides = [
    appDatabaseProvider.overrideWithValue(db),
    syncQueueRepositoryProvider.overrideWithValue(queue),
    currentSyncUserIdProvider.overrideWithValue('u-awaiting'),
    bootstrapSessionProvider.overrideWith((ref) async => _session()),
    workOrderSyncReplayServiceProvider.overrideWithValue(workOrders),
    checklistSyncReplayServiceProvider.overrideWithValue(
      _NoopChecklistReplay(queue),
    ),
    evidenceSyncReplayServiceProvider.overrideWithValue(
      _NoopEvidenceReplay(queue),
    ),
    evidenceBinaryUploadServiceProvider.overrideWithValue(
      EvidenceBinaryUploadService(
        store: InMemoryWorkOrderLocalStore(),
        blobStore: InMemoryEvidenceBlobStore(),
        api: const PendingEvidenceUploadApi(),
      ),
    ),
  ];
  if (expenseApi != null) {
    overrides.add(syncBatchApiProvider.overrideWithValue(expenseApi));
  }
  final container = ProviderContainer(overrides: overrides);
  addTearDown(container.dispose);

  final seeded = [
    _action(
      '1',
      ExpenseSyncActionTypes.reportCreate,
      SyncStatus.failed,
      retryCount: 5,
    ),
    _action(
      '2',
      ExpenseSyncActionTypes.itemCreate,
      SyncStatus.failed,
      retryCount: 2,
    ),
    _action(
      '3',
      ExpenseSyncActionTypes.reportSubmit,
      SyncStatus.syncing,
      retryCount: 3,
    ),
    _action(
      '4',
      ExpenseSyncActionTypes.receiptAttach,
      SyncStatus.syncing,
      retryCount: 4,
    ),
    _action(
      '5',
      WorkOrderSyncActionTypes.statusUpdate,
      SyncStatus.failed,
      retryCount: 2,
    ),
    _action(
      '6',
      WorkOrderSyncActionTypes.statusUpdate,
      SyncStatus.pending,
      errorCode: null,
    ),
    _action(
      '7',
      WorkOrderSyncActionTypes.statusUpdate,
      SyncStatus.syncing,
      retryCount: 1,
    ),
  ];
  for (final action in seeded) {
    await queue.enqueue(action);
  }

  await container.read(bootstrapSessionProvider.future);
  container.read(autoSyncCoordinatorProvider);
  await container.read(autoSyncCoordinatorProvider.notifier).triggerManual();

  final actions = await queue.actionsForTenant('tenant-awaiting');
  return (
    byId: {for (final action in actions) action.clientActionId: action},
    workOrderReceived: workOrders.received
        .map((action) => action.clientActionId)
        .toList(growable: false),
  );
}

void main() {
  test('r1 resgata failed e syncing dos quatro tipos de despesa', () {
    final originals = [
      _action(
        '1',
        ExpenseSyncActionTypes.reportCreate,
        SyncStatus.failed,
        retryCount: 1,
      ),
      _action(
        '2',
        ExpenseSyncActionTypes.itemCreate,
        SyncStatus.failed,
        retryCount: 3,
      ),
      _action(
        '3',
        ExpenseSyncActionTypes.reportSubmit,
        SyncStatus.failed,
        retryCount: 5,
      ),
      _action(
        '4',
        ExpenseSyncActionTypes.receiptAttach,
        SyncStatus.failed,
        retryCount: 5,
      ),
      _action(
        '5',
        ExpenseSyncActionTypes.reportCreate,
        SyncStatus.syncing,
        retryCount: 2,
      ),
      _action(
        '6',
        ExpenseSyncActionTypes.receiptAttach,
        SyncStatus.syncing,
        retryCount: 4,
      ),
    ];

    final result = reclaimExpensesAwaitingBackend(originals);

    expect(result.map((a) => a.clientActionId), ['1', '2', '3', '4', '5', '6']);
    for (var index = 0; index < originals.length; index++) {
      final before = originals[index];
      final after = result[index];
      expect(after.status, SyncStatus.pending);
      expect(after.retryCount, 0);
      expect(after.lastErrorCode, isNull);
      expect(after.lastSafeError, isNull);
      expect(after.processedAt, isNull);
      expect(after.clientActionId, before.clientActionId);
      expect(after.tenantId, before.tenantId);
      expect(after.type, before.type);
      expect(after.payload, before.payload);
      expect(after.createdAt, before.createdAt);
    }
  });

  test('r2 não resgata outros domínios nem despesa fora de failed/syncing', () {
    final actions = [
      _action('1', WorkOrderSyncActionTypes.statusUpdate, SyncStatus.failed),
      _action('2', ChecklistSyncActionTypes.answerUpsert, SyncStatus.syncing),
      _action('3', EvidenceSyncActionTypes.fieldPhoto, SyncStatus.failed),
      _action('4', 'unknown.action', SyncStatus.syncing),
      _action('5', ExpenseSyncActionTypes.reportCreate, SyncStatus.pending),
      _action('6', ExpenseSyncActionTypes.itemCreate, SyncStatus.conflict),
      _action('7', ExpenseSyncActionTypes.reportSubmit, SyncStatus.synced),
    ];

    expect(reclaimExpensesAwaitingBackend(actions), isEmpty);
  });

  test('r3 apresentação distingue canal desligado, encalhe e descarte', () {
    for (final status in [
      SyncStatus.pending,
      SyncStatus.failed,
      SyncStatus.syncing,
    ]) {
      final expense = _action(
        '${status.index + 1}',
        ExpenseSyncActionTypes.reportCreate,
        status,
        retryCount: status == SyncStatus.failed ? 5 : 0,
      );
      expect(
        presentSyncAction(expense, expenseChannelOff: true),
        SyncPresentation.awaitingBackend,
      );
    }
    expect(
      presentSyncAction(
        _action(
          '4',
          ExpenseSyncActionTypes.reportCreate,
          SyncStatus.failed,
          retryCount: 2,
        ),
        expenseChannelOff: false,
      ),
      SyncPresentation.failed,
    );
    expect(
      presentSyncAction(
        _action(
          '5',
          ExpenseSyncActionTypes.reportCreate,
          SyncStatus.failed,
          retryCount: 5,
        ),
        expenseChannelOff: false,
      ),
      SyncPresentation.stalled,
    );
    expect(
      presentSyncAction(
        _action(
          '6',
          WorkOrderSyncActionTypes.statusUpdate,
          SyncStatus.failed,
          retryCount: 5,
        ),
        expenseChannelOff: true,
      ),
      SyncPresentation.stalled,
    );
    expect(
      presentSyncAction(
        _action(
          '7',
          WorkOrderSyncActionTypes.statusUpdate,
          SyncStatus.synced,
          errorCode: syncDiscardedErrorCode,
        ),
        expenseChannelOff: false,
      ),
      SyncPresentation.discarded,
    );
    expect(
      presentSyncAction(
        _action(
          '8',
          WorkOrderSyncActionTypes.statusUpdate,
          SyncStatus.synced,
          errorCode: null,
        ),
        expenseChannelOff: false,
      ),
      SyncPresentation.synced,
    );
  });

  test('r4 contadores usam apresentação e não contam descartado', () {
    final actions = [
      _action(
        '1',
        ExpenseSyncActionTypes.reportCreate,
        SyncStatus.failed,
        retryCount: 5,
      ),
      _action(
        '2',
        ExpenseSyncActionTypes.itemCreate,
        SyncStatus.failed,
        retryCount: 2,
      ),
      _action('3', ExpenseSyncActionTypes.reportSubmit, SyncStatus.pending),
      _action('4', ExpenseSyncActionTypes.receiptAttach, SyncStatus.syncing),
      _action(
        '5',
        WorkOrderSyncActionTypes.statusUpdate,
        SyncStatus.failed,
        retryCount: 5,
      ),
      _action(
        '6',
        WorkOrderSyncActionTypes.create,
        SyncStatus.synced,
        errorCode: null,
      ),
      _action(
        '7',
        WorkOrderSyncActionTypes.assign,
        SyncStatus.synced,
        errorCode: syncDiscardedErrorCode,
      ),
      _action('8', ChecklistSyncActionTypes.answerUpsert, SyncStatus.conflict),
    ];

    final counts = SyncPresentationCounts.fromActions(
      actions,
      expenseChannelOff: true,
    );
    expect(counts.pending, 4);
    expect(counts.errors, 1);
    expect(counts.synced, 1);
    expect(counts.conflicts, 1);
  });

  test('r5 resgate do início da passada separa despesas pelo canal', () {
    final actions = [
      _action(
        '1',
        ExpenseSyncActionTypes.reportCreate,
        SyncStatus.syncing,
        retryCount: 3,
      ),
      _action(
        '2',
        ExpenseSyncActionTypes.receiptAttach,
        SyncStatus.syncing,
        retryCount: 4,
      ),
      _action(
        '3',
        WorkOrderSyncActionTypes.statusUpdate,
        SyncStatus.syncing,
        retryCount: 2,
      ),
      _action(
        '4',
        ExpenseSyncActionTypes.itemCreate,
        SyncStatus.failed,
        retryCount: 5,
      ),
      _action(
        '5',
        WorkOrderSyncActionTypes.create,
        SyncStatus.failed,
        retryCount: 2,
      ),
    ];

    final channelOff = reclaimQueueAtPassStart(
      actions,
      expenseChannelOff: true,
    );
    expect(channelOff.map((a) => a.clientActionId), ['1', '2', '3', '4']);
    expect(
      channelOff
          .where((a) => a.clientActionId != '3')
          .every(
            (a) =>
                a.status == SyncStatus.pending &&
                a.retryCount == 0 &&
                a.lastErrorCode == null,
          ),
      isTrue,
    );
    expect(
      channelOff.singleWhere((a) => a.clientActionId == '3').status,
      SyncStatus.conflict,
    );
    expect(
      channelOff.singleWhere((a) => a.clientActionId == '3').lastErrorCode,
      syncInterruptedErrorCode,
    );

    final channelOn = reclaimQueueAtPassStart(
      actions,
      expenseChannelOff: false,
    );
    expect(channelOn.map((a) => a.clientActionId), ['1', '2', '3']);
    expect(
      channelOn.singleWhere((a) => a.clientActionId == '1').status,
      SyncStatus.pending,
    );
    expect(channelOn.singleWhere((a) => a.clientActionId == '1').retryCount, 3);
    expect(
      channelOn.singleWhere((a) => a.clientActionId == '2').status,
      SyncStatus.conflict,
    );
    expect(
      channelOn.singleWhere((a) => a.clientActionId == '3').status,
      SyncStatus.conflict,
    );
    expect(
      channelOn.map((a) => a.clientActionId).toSet().length,
      channelOn.length,
    );
  });

  test('p1 canal desligado não muda fila nem consome tentativa', () async {
    final pending = _action(
      '1',
      ExpenseSyncActionTypes.reportCreate,
      SyncStatus.pending,
      errorCode: null,
    );
    final failed = _action(
      '2',
      ExpenseSyncActionTypes.itemCreate,
      SyncStatus.failed,
      retryCount: 2,
    );
    final queue = InMemorySyncQueueRepository();
    await queue.enqueue(pending);
    await queue.enqueue(failed);
    final service = SyncReplayService(
      queue: queue,
      api: const PendingBackendExpenseSyncBatchApi(),
      supportedActionTypes: ExpenseSyncActionTypes.supported,
    );

    final result = await service.replayTenant('tenant-awaiting');

    expect(service.channelOff, isTrue);
    expect(result.synced, isEmpty);
    expect(result.failed, isEmpty);
    expect(result.conflicts, isEmpty);
    expect(await queue.actionsForTenant('tenant-awaiting'), [pending, failed]);
  });

  test('p2 providers derivam canal do mesmo serviço de replay', () {
    final queue = InMemorySyncQueueRepository();
    final defaultContainer = ProviderContainer(
      overrides: [syncQueueRepositoryProvider.overrideWithValue(queue)],
    );
    addTearDown(defaultContainer.dispose);
    expect(
      defaultContainer.read(syncBatchApiProvider),
      isA<PendingBackendExpenseSyncBatchApi>(),
    );
    expect(defaultContainer.read(expenseSyncChannelOffProvider), isTrue);

    final apiOverride = ProviderContainer(
      overrides: [
        syncQueueRepositoryProvider.overrideWithValue(queue),
        syncBatchApiProvider.overrideWithValue(
          CaptureBatchApi((batch) => const []),
        ),
      ],
    );
    addTearDown(apiOverride.dispose);
    expect(apiOverride.read(expenseSyncChannelOffProvider), isFalse);

    final replayOverride = ProviderContainer(
      overrides: [
        syncQueueRepositoryProvider.overrideWithValue(queue),
        syncReplayServiceProvider.overrideWithValue(
          SyncReplayService(
            queue: queue,
            api: CaptureBatchApi((batch) => const []),
          ),
        ),
      ],
    );
    addTearDown(replayOverride.dispose);
    expect(replayOverride.read(expenseSyncChannelOffProvider), isFalse);
  });

  test('p3 coordenador limpa despesas legadas com canal desligado', () async {
    final result = await _runCoordinatorScenario();

    for (final id in ['1', '2', '3', '4']) {
      final expense = result.byId[id]!;
      expect(expense.status, SyncStatus.pending, reason: id);
      expect(expense.retryCount, 0, reason: id);
      expect(expense.lastErrorCode, isNull, reason: id);
      expect(expense.lastSafeError, isNull, reason: id);
    }
    expect(result.byId['5']!.status, SyncStatus.failed);
    expect(result.byId['5']!.retryCount, 2);
    expect(result.byId['7']!.status, SyncStatus.conflict);
    expect(result.byId['7']!.lastErrorCode, syncInterruptedErrorCode);
    expect(result.workOrderReceived, contains('6'));
    expect(
      result.byId.values.where(
        (action) =>
            ExpenseSyncActionTypes.supported.contains(action.type) &&
            (action.status == SyncStatus.syncing ||
                action.status == SyncStatus.conflict),
      ),
      isEmpty,
    );
  });

  test('p4 canal ligado preserva falha real e envia só elegíveis', () async {
    late final CaptureBatchApi capture;
    capture = CaptureBatchApi(
      (batch) => [
        for (final action in batch)
          SyncActionResult(
            clientActionId: action.clientActionId,
            status: 'processed',
          ),
      ],
    );

    final result = await _runCoordinatorScenario(expenseApi: capture);

    expect(result.byId['1']!.status, SyncStatus.failed);
    expect(result.byId['1']!.retryCount, 5);
    expect(capture.captured!.map((action) => action.clientActionId), [
      '2',
      '3',
    ]);
    final interrupted = capture.captured!.singleWhere(
      (action) => action.clientActionId == '3',
    );
    // O resgate devolve a pending; o replay marca syncing imediatamente
    // antes de entregar o lote à API.
    expect(interrupted.status, SyncStatus.syncing);
    expect(interrupted.retryCount, 3);
    expect(interrupted.lastErrorCode, syncInterruptedErrorCode);
    expect(result.byId['2']!.status, SyncStatus.synced);
    expect(result.byId['3']!.status, SyncStatus.synced);
    expect(result.byId['4']!.status, SyncStatus.conflict);
    expect(result.byId['4']!.lastErrorCode, syncInterruptedErrorCode);
  });
}
