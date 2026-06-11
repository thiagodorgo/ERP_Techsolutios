import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_engine.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('enqueue stores action and idempotent replay does not duplicate', () async {
    final queue = InMemorySyncQueueRepository();
    final factory = SyncActionFactory();
    final action = factory.create(
      tenantId: 'tenant-a',
      type: 'expense_report.create',
      clientActionId: 'action-1',
      payload: const {'local_id': 'rdv-1'},
    );

    await queue.enqueue(action);
    await queue.enqueue(action);

    final pending = await queue.pendingForTenant('tenant-a');
    expect(pending, hasLength(1));
    expect(pending.single.clientActionId, 'action-1');
  });

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
}

Future<SyncAction> _flushWith(SyncApiResult apiResult) async {
  final queue = InMemorySyncQueueRepository();
  final factory = SyncActionFactory();
  final action = factory.create(
    tenantId: 'tenant-a',
    type: 'expense_report.create',
    clientActionId: 'action-1',
    payload: const {'local_id': 'rdv-1'},
  );
  await queue.enqueue(action);

  final engine = SyncEngine(
    queue: queue,
    api: MockExpenseSyncApi(apiResult),
  );

  final results = await engine.flushTenant('tenant-a');
  return results.single;
}
