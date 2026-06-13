import 'sync_models.dart';
import 'sync_queue_repository.dart';

enum SyncApiResult { success, failure, conflict }

abstract class ExpenseSyncApi {
  Future<SyncApiResult> send(SyncAction action);
}

class MockExpenseSyncApi implements ExpenseSyncApi {
  MockExpenseSyncApi(this.result);

  final SyncApiResult result;

  @override
  Future<SyncApiResult> send(SyncAction action) async {
    return result;
  }
}

class SyncEngine {
  const SyncEngine({
    required SyncQueueRepository queue,
    required ExpenseSyncApi api,
  }) : _queue = queue,
       _api = api;

  final SyncQueueRepository _queue;
  final ExpenseSyncApi _api;

  Future<List<SyncAction>> flushTenant(String tenantId) async {
    final pending = await _queue.pendingForTenant(tenantId);
    final results = <SyncAction>[];

    for (final action in pending) {
      final syncing = action.copyWith(status: SyncStatus.syncing);
      await _queue.update(syncing);

      final result = await _api.send(syncing);
      final next = switch (result) {
        SyncApiResult.success => syncing.copyWith(
          status: SyncStatus.synced,
          processedAt: DateTime.now().toUtc(),
        ),
        SyncApiResult.failure => syncing.copyWith(
          status: SyncStatus.failed,
          retryCount: syncing.retryCount + 1,
          lastErrorCode: 'sync_failed',
          lastSafeError: 'Falha segura ao sincronizar. Tente novamente.',
        ),
        SyncApiResult.conflict => syncing.copyWith(
          status: SyncStatus.conflict,
          lastErrorCode: 'sync_conflict',
          lastSafeError: 'Conflito remoto exige decisao manual.',
        ),
      };

      await _queue.update(next);
      results.add(next);
    }

    return results;
  }
}
