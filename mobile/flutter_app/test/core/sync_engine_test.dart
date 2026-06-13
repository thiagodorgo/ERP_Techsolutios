import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_engine.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_summary.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'enqueue stores action and idempotent replay does not duplicate',
    () async {
      final queue = InMemorySyncQueueRepository();
      final factory = SyncActionFactory();
      final action = factory.create(
        tenantId: 'tenant-a',
        type: 'expense_report.create',
        clientActionId: 'action-1',
        payload: const {'local_id': 'pc-1'},
      );

      await queue.enqueue(action);
      await queue.enqueue(action);

      final pending = await queue.pendingForTenant('tenant-a');
      expect(pending, hasLength(1));
      expect(pending.single.clientActionId, 'action-1');
    },
  );

  test('successful flush marks action as synced', () async {
    final result = await _flushWith(SyncApiResult.success);

    expect(result.status, SyncStatus.synced);
  });

  test('failed flush keeps action retryable', () async {
    final result = await _flushWith(SyncApiResult.failure);

    expect(result.status, SyncStatus.failed);
    expect(result.retryCount, 1);
  });

  test('conflict flush moves action to conflict state', () async {
    final result = await _flushWith(SyncApiResult.conflict);

    expect(result.status, SyncStatus.conflict);
  });

  test('summary counts sync statuses and keeps latest processed timestamp', () {
    final older = DateTime.utc(2026, 6, 10);
    final newer = DateTime.utc(2026, 6, 11);
    final actions = [
      _action('pending-1', SyncStatus.pending),
      _action('synced-1', SyncStatus.synced, processedAt: older),
      _action('synced-2', SyncStatus.synced, processedAt: newer),
      _action('failed-1', SyncStatus.failed),
      _action('conflict-1', SyncStatus.conflict),
      _action('syncing-1', SyncStatus.syncing),
      _action('local-1', SyncStatus.local),
    ];

    final summary = SyncQueueSummary.fromActions(actions);

    expect(summary.total, 7);
    expect(summary.pending, 1);
    expect(summary.processed, 2);
    expect(summary.failed, 1);
    expect(summary.conflicts, 1);
    expect(summary.syncing, 1);
    expect(summary.local, 1);
    expect(summary.lastProcessedAt, newer);
    expect(summary.lastSyncLabel, newer.toIso8601String());
  });
}

SyncAction _action(
  String clientActionId,
  SyncStatus status, {
  DateTime? processedAt,
}) {
  return SyncAction(
    clientActionId: clientActionId,
    tenantId: 'tenant-a',
    type: 'expense_report.create',
    payload: const {'local_id': 'pc-1'},
    status: status,
    createdAt: DateTime.utc(2026, 6, 11),
    processedAt: processedAt,
  );
}

Future<SyncAction> _flushWith(SyncApiResult apiResult) async {
  final queue = InMemorySyncQueueRepository();
  final factory = SyncActionFactory();
  final action = factory.create(
    tenantId: 'tenant-a',
    type: 'expense_report.create',
    clientActionId: 'action-1',
    payload: const {'local_id': 'pc-1'},
  );
  await queue.enqueue(action);

  final engine = SyncEngine(queue: queue, api: MockExpenseSyncApi(apiResult));

  final results = await engine.flushTenant('tenant-a');
  return results.single;
}
