import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_interrupted_reclaim.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_reclaim_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenantId = 'tenant-bo6r11-reclaim';

SyncAction _action(String id, String type, SyncStatus status) {
  return SyncAction(
    clientActionId: id,
    tenantId: _tenantId,
    type: type,
    payload: {'id': id},
    status: status,
    createdAt: DateTime.utc(2026, 11, 1, 12, 0, int.parse(id)),
    retryCount: 2,
    lastErrorCode: 'OLD_CODE',
    lastSafeError: 'old safe error',
    processedAt: DateTime.utc(2026, 11, 1),
  );
}

class _CountingQueue implements SyncQueueRepository {
  _CountingQueue(Iterable<SyncAction> actions)
    : _delegate = InMemorySyncQueueRepository() {
    _seed = Future.wait(actions.map(_delegate.enqueue));
  }

  final InMemorySyncQueueRepository _delegate;
  late final Future<void> _seed;
  int updateCalls = 0;

  Future<void> _ready() => _seed;

  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) async {
    await _ready();
    return _delegate.actionsForTenant(tenantId);
  }

  @override
  Future<void> enqueue(SyncAction action) => _delegate.enqueue(action);

  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async {
    await _ready();
    return _delegate.pendingForTenant(tenantId);
  }

  @override
  Future<void> update(SyncAction action) async {
    await _ready();
    updateCalls++;
    await _delegate.update(action);
  }
}

void main() {
  test('resgata syncing e preserva a ação que já estava pending', () async {
    final expense = _action(
      '1',
      ExpenseSyncActionTypes.reportCreate,
      SyncStatus.syncing,
    );
    final workOrder = _action(
      '2',
      WorkOrderSyncActionTypes.statusUpdate,
      SyncStatus.syncing,
    );
    final pending = _action(
      '3',
      WorkOrderSyncActionTypes.statusUpdate,
      SyncStatus.pending,
    );
    final queue = _CountingQueue([expense, workOrder, pending]);

    await SyncQueueReclaimService(queue: queue).reclaimTenant(_tenantId);

    final actions = await queue.actionsForTenant(_tenantId);
    final byId = {for (final action in actions) action.clientActionId: action};
    expect(queue.updateCalls, 2);
    expect(byId['1']?.status, SyncStatus.pending);
    expect(byId['1']?.lastErrorCode, syncInterruptedErrorCode);
    expect(byId['2']?.status, SyncStatus.conflict);
    expect(byId['2']?.lastErrorCode, syncInterruptedErrorCode);
    expect(byId['3'], pending);
  });

  test('não grava quando a fila não tem ação syncing', () async {
    final queue = _CountingQueue([
      _action('4', WorkOrderSyncActionTypes.statusUpdate, SyncStatus.pending),
      _action('5', WorkOrderSyncActionTypes.statusUpdate, SyncStatus.failed),
    ]);

    await SyncQueueReclaimService(queue: queue).reclaimTenant(_tenantId);

    expect(queue.updateCalls, 0);
  });
}
