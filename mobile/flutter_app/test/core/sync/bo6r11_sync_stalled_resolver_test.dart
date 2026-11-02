import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:flutter_test/flutter_test.dart';

SyncAction _action({
  String type = WorkOrderSyncActionTypes.statusUpdate,
  SyncStatus status = SyncStatus.failed,
  int retryCount = 5,
}) {
  return SyncAction(
    clientActionId: 'stalled-$type-$retryCount',
    tenantId: 'tenant-stalled',
    type: type,
    payload: const {'value': 'preserved'},
    status: status,
    createdAt: DateTime.utc(2026, 11, 2),
    retryCount: retryCount,
    lastErrorCode: 'OLD_CODE',
    lastSafeError: 'erro anterior',
    processedAt: DateTime.utc(2026, 11, 1),
  );
}

void main() {
  test('s1 retry devolve ação encalhada à fila e limpa os erros', () {
    final result = resolveStalledAction(_action(), StalledChoice.retry);

    expect(result.status, SyncStatus.pending);
    expect(result.retryCount, 0);
    expect(result.lastErrorCode, isNull);
    expect(result.lastSafeError, isNull);
    expect(result.processedAt, isNull);
  });

  test('s2 descarte de OS encerra com marca e texto inequívocos', () {
    final resolvedAt = DateTime.utc(2026, 11, 2, 12);
    final result = resolveStalledAction(
      _action(),
      StalledChoice.discard,
      resolvedAt: resolvedAt,
    );

    expect(result.status, SyncStatus.synced);
    expect(result.lastErrorCode, syncDiscardedErrorCode);
    expect(result.lastSafeError, syncDiscardedSafeError);
    expect(result.processedAt, resolvedAt);
  });

  test('s3 ações não encalhadas permanecem byte a byte', () {
    final actions = [
      _action(retryCount: 2),
      _action(status: SyncStatus.pending),
      _action(status: SyncStatus.conflict),
    ];

    for (final action in actions) {
      expect(resolveStalledAction(action, StalledChoice.retry), same(action));
      expect(resolveStalledAction(action, StalledChoice.discard), same(action));
    }
  });

  test('s4 teto único coincide com os quatro serviços de replay', () {
    final queue = InMemorySyncQueueRepository();
    expect(
      SyncReplayService(queue: queue, api: MockExpenseSyncBatchApi()).maxRetry,
      kSyncMaxRetry,
    );
    expect(
      WorkOrderSyncReplayService(
        queue: queue,
        api: MockWorkOrderSyncBatchApi(),
      ).maxRetry,
      kSyncMaxRetry,
    );
    expect(
      ChecklistSyncReplayService(
        queue: queue,
        api: MockChecklistSyncBatchApi(),
      ).maxRetry,
      kSyncMaxRetry,
    );
    expect(
      EvidenceSyncReplayService(
        queue: queue,
        api: const PendingEvidenceSyncBatchApi(),
      ).maxRetry,
      kSyncMaxRetry,
    );
  });

  test('s5 despesa nunca pode ser descartada e falha fechado', () {
    for (final type in ExpenseSyncActionTypes.supported) {
      expect(canDiscardSyncAction(type), isFalse, reason: type);
      final action = _action(type: type);
      expect(
        resolveStalledAction(action, StalledChoice.discard),
        same(action),
        reason: type,
      );
    }
    for (final type in [
      WorkOrderSyncActionTypes.statusUpdate,
      ChecklistSyncActionTypes.answerUpsert,
      EvidenceSyncActionTypes.fieldPhoto,
      InventorySyncActionTypes.exitCreate,
      'unknown.action',
    ]) {
      expect(canDiscardSyncAction(type), isTrue, reason: type);
    }
  });
}
